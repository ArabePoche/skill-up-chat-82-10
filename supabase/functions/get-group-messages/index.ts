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

    if (req.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const url = new URL(req.url)
    const groupId = url.searchParams.get('group_id')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    if (!groupId) {
      return new Response(JSON.stringify({ error: 'group_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Vérifier si l'utilisateur est membre du groupe
    const { data: membership } = await supabaseClient
      .from('discussion_members')
      .select('joined_at, role')
      .eq('discussion_id', groupId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (!membership) {
      return new Response(JSON.stringify({ error: 'Not a member of this group' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Récupérer les informations du groupe
    const { data: group } = await supabaseClient
      .from('discussion_groups')
      .select('show_history_to_new_members')
      .eq('id', groupId)
      .single()

    if (!group) {
      return new Response(JSON.stringify({ error: 'Group not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Construire la requête pour les messages
    let messagesQuery = supabaseClient
      .from('discussion_messages')
      .select(`
        *,
        sender:profiles(id, first_name, last_name, username, avatar_url)
      `)
      .eq('discussion_id', groupId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Si show_history_to_new_members est false, filtrer les messages antérieurs à l'adhésion
    if (!group.show_history_to_new_members && membership.joined_at) {
      messagesQuery = messagesQuery.gte('created_at', membership.joined_at)
    }

    const { data: messages, error } = await messagesQuery

    if (error) {
      console.error('Error fetching messages:', error)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ messages, userRole: membership.role }), {
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
