import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !anon || !service) return res.status(503).json({ error: 'suspension_management_not_configured' })

  const header = req.headers.authorization || ''
  const token = typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token) return res.status(401).json({ error: 'authentication_required' })

  try {
    const authClient = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: authData, error: authError } = await authClient.auth.getUser(token)
    if (authError || !authData.user) return res.status(401).json({ error: 'invalid_session' })

    const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: role, error: roleError } = await admin.from('user_roles').select('role').eq('user_id', authData.user.id).maybeSingle()
    if (roleError) return res.status(503).json({ error: 'role_check_failed' })
    if (role?.role !== 'admin') return res.status(403).json({ error: 'admin_access_required' })

    const targetId = typeof req.body?.user_id === 'string' ? req.body.user_id.trim() : ''
    const suspended = req.body?.suspended
    if (!UUID_RE.test(targetId) || typeof suspended !== 'boolean') return res.status(400).json({ error: 'invalid_suspension_request' })
    if (targetId === authData.user.id) return res.status(400).json({ error: 'cannot_suspend_self' })

    const { data: targetRole, error: targetRoleError } = await admin.from('user_roles').select('role').eq('user_id', targetId).maybeSingle()
    if (targetRoleError) return res.status(503).json({ error: 'target_check_failed' })
    if (targetRole?.role === 'admin') return res.status(409).json({ error: 'administrator_account_is_protected' })

    const { data: target, error: targetError } = await admin.auth.admin.getUserById(targetId)
    if (targetError || !target.user) return res.status(404).json({ error: 'account_not_found' })

    if (suspended) {
      const { error } = await admin.from('account_suspensions').upsert({
        user_id: targetId,
        created_by: authData.user.id,
        reason: 'Suspension décidée par un administrateur',
      }, { onConflict: 'user_id' })
      if (error) return res.status(503).json({ error: 'suspension_record_failed' })

      const { error: banError } = await admin.auth.admin.updateUserById(targetId, { ban_duration: '876000h' })
      if (banError) return res.status(503).json({ error: 'account_ban_failed' })
      return res.status(200).json({ ok: true, user_id: targetId, suspended: true })
    }

    const { error: unbanError } = await admin.auth.admin.updateUserById(targetId, { ban_duration: 'none' })
    if (unbanError) return res.status(503).json({ error: 'account_unban_failed' })
    const { error: deleteError } = await admin.from('account_suspensions').delete().eq('user_id', targetId)
    if (deleteError) return res.status(503).json({ error: 'suspension_removal_failed' })
    return res.status(200).json({ ok: true, user_id: targetId, suspended: false })
  } catch {
    return res.status(500).json({ error: 'suspension_management_failed' })
  }
}
