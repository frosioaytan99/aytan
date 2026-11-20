import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method_not_allowed' })
  }
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
    const current = data.user.user_metadata?.display_name
    if (typeof current === 'string' && /^Guest\d+$/.test(current)) return res.status(200).json({ display_name: current })

    const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: number, error: numberError } = await admin.rpc('allocate_guest_number')
    if (numberError || typeof number !== 'number') return res.status(503).json({ error: 'guest_name_unavailable' })
    const displayName = 'Guest' + number
    const { error: updateError } = await admin.auth.admin.updateUserById(data.user.id, {
      user_metadata: { ...(data.user.user_metadata || {}), display_name: displayName },
    })
    if (updateError) return res.status(503).json({ error: 'guest_name_save_failed' })
    return res.status(200).json({ display_name: displayName })
  } catch {
    return res.status(500).json({ error: 'guest_setup_failed' })
  }
}
