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
    const search = url.searchParams.get('search') || ''
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    // Récupérer le profil de l'utilisateur pour vérifier le genre
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('gender')
      .eq('id', user.id)
      .single()

    let query = supabaseClient
      .from('groups')
      .select(`
        *,
        group_members!inner(user_id, role)
      `)
      .eq('group_type', 'PUBLIC')
      .gte('member_count', 1)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1)

    // Filtre de recherche textuelle
    if (search) {
      query = query.textSearch('name', search)
    }

    const { data: groups, error } = await query

    if (error) {
      console.error('Error searching groups:', error)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Filtrer par genre côté serveur
    const filteredGroups = groups?.filter(group => {
      if (group.audience_type === 'ALL') return true
      if (!profile?.gender) return false
      if (group.audience_type === 'MEN_ONLY') return profile.gender === 'male'
      if (group.audience_type === 'WOMEN_ONLY') return profile.gender === 'female'
      return true
    }) || []

    // Vérifier si l'utilisateur est déjà membre
    const groupIds = filteredGroups.map(g => g.id)
    const { data: memberships } = await supabaseClient
      .from('group_members')
      .select('group_id')
      .eq('user_id', user.id)
      .in('group_id', groupIds)

    const membershipSet = new Set(memberships?.map(m => m.group_id) || [])

    const groupsWithMembership = filteredGroups.map(group => ({
      ...group,
      is_member: membershipSet.has(group.id),
    }))

    return new Response(JSON.stringify({ groups: groupsWithMembership }), {
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
