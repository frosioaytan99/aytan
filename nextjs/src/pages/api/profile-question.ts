import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
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
    const senderId = authData.user.id
    const recipientId = String(req.body?.recipient_id || '')
    const question = typeof req.body?.question === 'string' ? req.body.question.trim() : ''
    if (!/^[0-9a-f-]{36}$/i.test(recipientId) || recipientId === senderId) return res.status(400).json({ error: 'invalid_recipient' })
    if (question.length < 3 || question.length > 500) return res.status(400).json({ error: 'invalid_question' })

    const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: profiles, error: profileError } = await db.from('profiles').select('id,display_name,username').in('id', [senderId, recipientId])
    if (profileError || profiles?.length !== 2) return res.status(404).json({ error: 'profile_not_found' })

    const { data: blocks, error: blockError } = await db.from('blocks').select('blocker_id').or(
      'and(blocker_id.eq.' + senderId + ',blocked_id.eq.' + recipientId + '),and(blocker_id.eq.' + recipientId + ',blocked_id.eq.' + senderId + ')'
    ).limit(1)
    if (blockError) return res.status(503).json({ error: 'request_failed' })
    if (blocks?.length) return res.status(403).json({ error: 'blocked' })

    const sender = profiles.find((p: any) => p.id === senderId)
    const senderName = sender?.display_name || sender?.username || 'Un membre'
    const { error } = await db.from('notifications').insert({
      user_id: recipientId,
      actor_id: senderId,
      type: 'message',
      title: 'Question reçue',
      body: senderName + ' t’a posé une question : ' + question,
      link: '/profile?id=' + senderId
    })
    if (error) return res.status(503).json({ error: 'send_failed' })
    return res.status(200).json({ ok: true })
  } catch {
    return res.status(500).json({ error: 'unexpected_error' })
  }
}
