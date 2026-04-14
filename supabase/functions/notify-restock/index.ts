
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function toErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

// Re-use logic for FCM (similar to send-push-notification)
async function createJWT(clientEmail: string, privateKey: string): Promise<string> {
    const header = { alg: 'RS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const payload = {
        iss: clientEmail,
        scope: 'https://www.googleapis.com/auth/firebase.messaging',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
    };

    const encoder = new TextEncoder();
    const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const unsignedToken = `${headerB64}.${payloadB64}`;

    const pemContents = privateKey.replace(/\\n/g, '\n').replace(/-----BEGIN PRIVATE KEY-----/, '').replace(/-----END PRIVATE KEY-----/, '').replace(/\s/g, '');
    const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

    const cryptoKey = await crypto.subtle.importKey(
        'pkcs8', binaryKey,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false, ['sign']
    );

    const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, encoder.encode(unsignedToken));
    const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
        .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

    return `${unsignedToken}.${signatureB64}`;
}

async function getAccessToken(clientEmail: string, privateKey: string): Promise<string> {
    const jwt = await createJWT(clientEmail, privateKey);
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Error OAuth2: ${error}`);
    }
    const data = await response.json();
    return data.access_token;
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const body = await req.json().catch(() => ({}));
        const { productId } = body;
        if (!productId) throw new Error('Product ID is required');

        console.log(`[notify-restock] Processing product ${productId}`);

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const serviceAccountJson = Deno.env.get('firebase_service_account');

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 1. Get product details
        const { data: product, error: productError } = await supabase
            .from('products')
            .select('title, image_url')
            .eq('id', productId)
            .single();

        if (productError || !product) throw new Error('Product not found');

        // 2. Get all subscribers
        const { data: subscriptions, error: subError } = await supabase
            .from('product_restock_subscriptions')
            .select('user_id')
            .eq('product_id', productId);

        console.log(`[notify-restock] Found ${subscriptions?.length || 0} subscribers for product ${productId}`);

        if (subError) throw subError;
        if (!subscriptions || subscriptions.length === 0) {
            return new Response(JSON.stringify({ success: true, message: 'No subscribers' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const userIds = subscriptions.map(s => s.user_id);

        // 3. Create in-app notifications
        const notifications = userIds.map(userId => ({
            user_id: userId,
            title: 'Produit de nouveau disponible !',
            message: `Bonne nouvelle ! Le produit "${product.title}" est de nouveau en stock. Profitez-en vite !`,
            type: 'product_restock',
            product_id: productId, // Using the new proper field
            is_read: false,
            is_for_all_admins: false,
        }));

        const { data: insertedData, error: notifyError } = await supabase
            .from('notifications')
            .insert(notifications)
            .select();

        if (notifyError) {
            console.error('[notify-restock] Error creating in-app notifications:', toErrorMessage(notifyError));
        } else {
            console.log(`[notify-restock] Created ${insertedData?.length || 0} in-app notifications`);
        }

        // 4. Send Push Notifications
        let pushSent = 0;
        if (serviceAccountJson) {
            const serviceAccount = JSON.parse(serviceAccountJson);
            const { project_id: gcpProjectId, client_email: gcpClientEmail, private_key: gcpPrivateKey } = serviceAccount;

            const { data: tokens, error: tokenError } = await supabase
                .from('push_tokens')
                .select('token, user_id')
                .in('user_id', userIds)
                .eq('is_active', true);

            if (!tokenError && tokens && tokens.length > 0) {
                const accessToken = await getAccessToken(gcpClientEmail, gcpPrivateKey);
                const fcmUrl = `https://fcm.googleapis.com/v1/projects/${gcpProjectId}/messages:send`;

                for (const tokenData of tokens) {
                    try {
                        await fetch(fcmUrl, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${accessToken}`,
                            },
                            body: JSON.stringify({
                                message: {
                                    token: tokenData.token,
                                    notification: {
                                        title: 'Réapprovisionnement !',
                                        body: `Le produit "${product.title}" est disponible.`,
                                        ...(product.image_url ? { image: product.image_url } : {}),
                                    },
                                    data: {
                                        click_action: `/marketplace/product/${productId}`,
                                        type: 'product_restock',
                                        product_id: productId,
                                    },
                                },
                            }),
                        });
                        pushSent++;
                    } catch (err) {
                        console.error('[notify-restock] Error sending push notification:', toErrorMessage(err));
                    }
                }
            }
        }

        // 5. Clean up subscriptions (optional, but requested behavior is usually one-off)
        await supabase
            .from('product_restock_subscriptions')
            .delete()
            .eq('product_id', productId);

        return new Response(
            JSON.stringify({
                success: true,
                subscribers: userIds.length,
                push_sent: pushSent,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        console.error('[notify-restock] Error:', toErrorMessage(error));
        return new Response(
            JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
