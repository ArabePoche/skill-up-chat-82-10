import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { group_id } = await req.json()

    if (!group_id) {
      return new Response(JSON.stringify({ error: 'group_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Récupérer le groupe
    const { data: group, error: groupError } = await supabaseClient
      .from('discussion_groups')
      .select('*')
      .eq('id', group_id)
      .single()

    if (groupError || !group) {
      return new Response(JSON.stringify({ error: 'Group not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Vérifier si l'utilisateur peut rejoindre selon le genre
    const { data: canJoin } = await supabaseClient.rpc('can_join_discussion_by_gender', {
      p_discussion_id: group_id,
      p_user_id: user.id,
    })

    if (!canJoin) {
      return new Response(JSON.stringify({ error: 'You cannot join this group based on gender restrictions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Vérifier si déjà membre
    const { data: existingMember } = await supabaseClient
      .from('discussion_members')
      .select('*')
      .eq('discussion_id', group_id)
      .eq('user_id', user.id)
      .single()

    if (existingMember) {
      if (existingMember.is_active) {
        return new Response(JSON.stringify({ error: 'Already a member' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      } else {
        // Réactiver le membre
        const { error: reactivateError } = await supabaseClient
          .from('discussion_members')
          .update({ is_active: true, joined_at: new Date().toISOString() })
          .eq('id', existingMember.id)

        if (reactivateError) {
          return new Response(JSON.stringify({ error: reactivateError.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        return new Response(JSON.stringify({ message: 'Rejoined group successfully' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // Vérifier si le groupe nécessite une approbation
    if (group.group_type === 'PRIVATE' || (group.group_type === 'MIXTE' && group.join_approval_required)) {
      // Créer une demande d'adhésion
      const { error: requestError } = await supabaseClient
        .from('discussion_join_requests')
        .insert({
          discussion_id: group_id,
          user_id: user.id,
          status: 'PENDING',
        })

      if (requestError) {
        return new Response(JSON.stringify({ error: requestError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ message: 'Join request sent for approval' }), {
        status: 202,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Ajouter directement comme membre
    const { error: memberError } = await supabaseClient
      .from('discussion_members')
      .insert({
        discussion_id: group_id,
        user_id: user.id,
        role: 'MEMBER',
      })

    if (memberError) {
      return new Response(JSON.stringify({ error: memberError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ message: 'Joined group successfully' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
