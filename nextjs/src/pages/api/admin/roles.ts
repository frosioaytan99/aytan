import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const config = {
  api: { bodyParser: { sizeLimit: '1kb' } },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return res.status(503).json({ error: 'role_management_not_configured' })
  }

  const authorization = req.headers.authorization
  const accessToken = typeof authorization === 'string' && authorization.startsWith('Bearer ')
    ? authorization.slice(7).trim()
    : ''

  if (!accessToken) return res.status(401).json({ error: 'authentication_required' })

  try {
    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: authData, error: authError } = await authClient.auth.getUser(accessToken)

    if (authError || !authData.user) {
      return res.status(401).json({ error: 'invalid_session' })
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: callerRole, error: callerRoleError } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', authData.user.id)
      .maybeSingle()

    if (callerRoleError) return res.status(503).json({ error: 'role_check_failed' })
    if (callerRole?.role !== 'admin') {
      return res.status(403).json({ error: 'admin_access_required' })
    }

    if (req.method === 'GET') {
      const { data: roles, error } = await adminClient
        .from('user_roles')
        .select('user_id,role')
        .limit(1000)

      if (error) return res.status(503).json({ error: 'roles_read_failed' })
      return res.status(200).json({ roles: roles || [] })
    }

    const targetId = typeof req.body?.user_id === 'string' ? req.body.user_id.trim() : ''
    const nextRole = req.body?.role

    if (!UUID_RE.test(targetId) || !['moderator', 'member'].includes(nextRole)) {
      return res.status(400).json({ error: 'invalid_role_request' })
    }
    if (targetId === authData.user.id) {
      return res.status(400).json({ error: 'cannot_change_own_role' })
    }

    const { data: targetProfile, error: profileError } = await adminClient
      .from('profiles')
      .select('id')
      .eq('id', targetId)
      .maybeSingle()

    if (profileError) return res.status(503).json({ error: 'target_check_failed' })
    if (!targetProfile) return res.status(404).json({ error: 'profile_not_found' })

    const { data: currentRole, error: currentRoleError } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', targetId)
      .maybeSingle()

    if (currentRoleError) return res.status(503).json({ error: 'target_role_check_failed' })
    if (currentRole?.role === 'admin') {
      return res.status(409).json({ error: 'administrator_role_is_protected' })
    }

    if (nextRole === 'moderator') {
      const { error } = await adminClient
        .from('user_roles')
        .upsert({ user_id: targetId, role: 'moderator' }, { onConflict: 'user_id' })

      if (error) return res.status(503).json({ error: 'moderator_assignment_failed' })
    } else if (currentRole?.role === 'moderator') {
      const { error } = await adminClient
        .from('user_roles')
        .delete()
        .eq('user_id', targetId)
        .eq('role', 'moderator')

      if (error) return res.status(503).json({ error: 'moderator_removal_failed' })
    }

    return res.status(200).json({ ok: true, user_id: targetId, role: nextRole })
  } catch {
    return res.status(500).json({ error: 'role_management_failed' })
  }
}
