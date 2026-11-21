import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return res.status(503).json({ error: 'role_lookup_not_configured' })

  const authorization = req.headers.authorization
  const accessToken = typeof authorization === 'string' && authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : ''
  if (!accessToken) return res.status(401).json({ error: 'authentication_required' })

  const targetId = typeof req.query.user_id === 'string' ? req.query.user_id.trim() : ''
  if (!UUID_RE.test(targetId)) return res.status(400).json({ error: 'invalid_user_id' })

  try {
    const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: authData, error: authError } = await authClient.auth.getUser(accessToken)
    if (authError || !authData.user) return res.status(401).json({ error: 'invalid_session' })

    const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data, error } = await adminClient.from('user_roles').select('role').eq('user_id', targetId).maybeSingle()
    if (error) return res.status(503).json({ error: 'role_lookup_failed' })
    const role = data?.role === 'admin' ? 'admin' : data?.role === 'moderator' ? 'moderator' : 'member'
    return res.status(200).json({ role })
  } catch {
    return res.status(500).json({ error: 'role_lookup_failed' })
  }
}
