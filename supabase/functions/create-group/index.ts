import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      status: 200,
      headers: corsHeaders 
    })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))
    if (userError || !user) {
      console.error('Auth error:', userError)
      return new Response(JSON.stringify({ error: 'Unauthorized', details: userError?.message }), {
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

    const {
      name,
      description,
      avatar_url,
      group_type = 'MIXTE',
      is_visible_in_search = true,
      join_approval_required = false,
      audience_type = 'ALL',
      show_history_to_new_members = false,
    } = await req.json()

    if (!name || name.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Name is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!['PUBLIC', 'PRIVATE', 'MIXTE'].includes(group_type)) {
      return new Response(JSON.stringify({ error: 'Invalid group_type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!['ALL', 'MEN_ONLY', 'WOMEN_ONLY'].includes(audience_type)) {
      return new Response(JSON.stringify({ error: 'Invalid audience_type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // SOLUTION ULTRA SIMPLE : Insertion directe sans select
    // 1. Créer le groupe
    const { data: insertedGroups, error: insertError } = await supabaseClient
      .from('discussion_groups')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        avatar_url: avatar_url || null,
        group_type: group_type,
        is_visible_in_search: is_visible_in_search,
        join_approval_required: join_approval_required,
        audience_type: audience_type,
        show_history_to_new_members: show_history_to_new_members,
        created_by: user.id,
        member_count: 1,
      })
      .select()

    if (insertError) {
      console.error('Error inserting group:', insertError)
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!insertedGroups || insertedGroups.length === 0) {
      return new Response(JSON.stringify({ error: 'Failed to create group' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const group = insertedGroups[0]

    // 2. Ajouter le créateur comme admin
    const { error: memberError } = await supabaseClient
      .from('discussion_members')
      .insert({
        discussion_id: group.id,
        user_id: user.id,
        role: 'ADMIN',
        is_active: true,
      })

    if (memberError) {
      console.error('Error adding member:', memberError)
      // On ne retourne pas d'erreur ici
    }

    return new Response(JSON.stringify({ group }), {
      status: 201,
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
