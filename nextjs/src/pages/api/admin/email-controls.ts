import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function getAdmin(req: NextApiRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !anon || !service) throw new Error('not_configured')
  const header = req.headers.authorization || ''
  const token = typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token) throw new Error('unauthorized')
  const auth = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await auth.auth.getUser(token)
  if (error || !data.user) throw new Error('unauthorized')
  const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: role, error: roleError } = await db.from('user_roles').select('role').eq('user_id', data.user.id).maybeSingle()
  if (roleError || role?.role !== 'admin') throw new Error('forbidden')
  return { db, user: data.user }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store')
  try {
    const { db, user } = await getAdmin(req)
    if (req.method === 'GET') {
      const [{ data: blocked, error: blockedError }, { data: users, error: usersError }] = await Promise.all([
        db.from('blocked_emails').select('email,reason,created_at').order('created_at', { ascending: false }),
        db.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      ])
      if (blockedError || usersError) return res.status(503).json({ error: 'email_data_unavailable' })
      const emails: Record<string, string> = {}
      for (const account of users.users) if (account.email) emails[account.id] = account.email
      return res.status(200).json({ emails, blocked: blocked || [] })
    }
    if (req.method === 'POST') {
      const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
      const blocked = req.body?.blocked
      const reason = typeof req.body?.reason === 'string' && req.body.reason.trim()
        ? req.body.reason.trim().slice(0, 500)
        : 'Adresse bloquée par un administrateur'
      if (!EMAIL_RE.test(email) || typeof blocked !== 'boolean') return res.status(400).json({ error: 'invalid_email_request' })
      if (blocked) {
        const { error } = await db.from('blocked_emails').upsert({ email, reason, created_by: user.id }, { onConflict: 'email' })
        if (error) return res.status(503).json({ error: 'email_block_failed' })
        const { data, error: listError } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 })
        if (listError) return res.status(503).json({ error: 'account_lookup_failed' })
        const matches = data.users.filter(account => account.email?.trim().toLowerCase() === email)
        for (const account of matches) {
          const { error: banError } = await db.auth.admin.updateUserById(account.id, { ban_duration: '876000h' })
          if (banError) return res.status(503).json({ error: 'existing_account_block_failed' })
        }
        return res.status(200).json({ ok: true, blocked: true, affected_accounts: matches.length })
      }
      const { error } = await db.from('blocked_emails').delete().eq('email', email)
      if (error) return res.status(503).json({ error: 'email_unblock_failed' })
      return res.status(200).json({ ok: true, blocked: false })
    }
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'method_not_allowed' })
  } catch (error: any) {
    const code = error?.message
    return res.status(code === 'unauthorized' ? 401 : code === 'forbidden' ? 403 : 503)
      .json({ error: code === 'unauthorized' ? 'authentication_required' : code === 'forbidden' ? 'admin_access_required' : 'email_management_not_configured' })
  }
}
