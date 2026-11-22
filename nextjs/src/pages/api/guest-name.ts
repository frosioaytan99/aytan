import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !anon || !service) return res.status(503).json({ error: 'guest_mode_not_configured' })
  const auth = req.headers.authorization || ''
  const token = typeof auth === 'string' && auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  if (!token) return res.status(401).json({ error: 'authentication_required' })
  try {
    const userClient = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data, error } = await userClient.auth.getUser(token)
    if (error || !data.user) return res.status(401).json({ error: 'invalid_session' })
    if (!data.user.is_anonymous) return res.status(403).json({ error: 'anonymous_account_required' })
    const username = typeof req.body?.username === 'string' ? req.body.username.trim().replace(/^@+/, '').toLowerCase() : ''
    const age = Number(req.body?.age)
    if (!/^[a-z0-9_]{3,20}$/.test(username) || !Number.isInteger(age) || age < 13 || age > 26) return res.status(400).json({ error: 'username_and_age_required' })
    const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: match } = await admin.from('profiles').select('id').ilike('username', username).neq('id', data.user.id).maybeSingle()
    if (match) return res.status(409).json({ error: 'username_taken' })
    const { error: updateError } = await admin.auth.admin.updateUserById(data.user.id, {
      user_metadata: { ...(data.user.user_metadata || {}), username, display_name: username, age },
    })
    if (updateError) return res.status(503).json({ error: 'guest_metadata_save_failed' })
    const { error: profileError } = await admin.from('profiles').upsert({ id: data.user.id, username, display_name: username, age, is_private: false }, { onConflict: 'id' })
    if (profileError) return res.status(503).json({ error: 'guest_profile_save_failed' })
    return res.status(200).json({ display_name: username })
  } catch {
    return res.status(500).json({ error: 'guest_setup_failed' })
  }
}
