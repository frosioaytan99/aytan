import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'method_not_allowed' })
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !anon || !service) return res.status(503).json({ error: 'not_configured' })
  const header = req.headers.authorization || ''
  const token = typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token) return res.status(401).json({ error: 'authentication_required' })
  try {
    const auth = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: authData, error: authError } = await auth.auth.getUser(token)
    if (authError || !authData.user) return res.status(401).json({ error: 'invalid_session' })
    const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: roles, error: rolesError } = await db.from('user_roles').select('user_id,role').in('role', ['admin', 'moderator'])
    if (rolesError) return res.status(503).json({ error: 'team_lookup_failed' })
    const ids = (roles || []).map(row => row.user_id)
    if (!ids.length) return res.status(200).json({ members: [] })
    const { data: profiles, error: profilesError } = await db.from('profiles').select('id,display_name,username,avatar_url').in('id', ids)
    if (profilesError) return res.status(503).json({ error: 'profile_lookup_failed' })
    const members = (profiles || []).map(profile => {
      const role = roles?.find(row => row.user_id === profile.id)?.role
      return { ...profile, role: role === 'admin' ? 'admin' : 'moderator' }
    }).sort((a, b) => (a.role === b.role ? String(a.display_name || a.username || '').localeCompare(String(b.display_name || b.username || ''), 'fr') : a.role === 'admin' ? -1 : 1))
    return res.status(200).json({ members })
  } catch {
    return res.status(500).json({ error: 'team_lookup_failed' })
  }
}
