import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
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

    // Validation
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

    // Créer le groupe en utilisant la fonction SQL
    const { data: groupId, error: createError } = await supabaseClient.rpc('create_group', {
      p_name: name.trim(),
      p_description: description?.trim() || null,
      p_avatar_url: avatar_url || null,
      p_group_type: group_type,
      p_is_visible_in_search: is_visible_in_search,
      p_join_approval_required: join_approval_required,
      p_audience_type: audience_type,
      p_show_history_to_new_members: show_history_to_new_members,
      p_created_by: user.id,
    })

    if (createError) {
      console.error('Error creating group:', createError)
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Récupérer le groupe créé
    const { data: group, error: fetchError } = await supabaseClient
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single()

    if (fetchError) {
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
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
