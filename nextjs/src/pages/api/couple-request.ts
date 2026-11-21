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
    const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })
    const uid = authData.user.id
    const action = req.body?.action
    if (action === 'request') {
      const recipient = String(req.body?.recipient_id || '')
      if (!/^[0-9a-f-]{36}$/i.test(recipient) || recipient === uid) return res.status(400).json({ error: 'invalid_recipient' })
      const { data: people, error: peopleError } = await db.from('profiles').select('id,age').in('id', [uid, recipient])
      if (peopleError || people?.length !== 2) return res.status(404).json({ error: 'profile_not_found' })
      if (people.some((p:any) => !p.age || p.age < 18)) return res.status(403).json({ error: 'adults_only' })
      const { data: existing } = await db.from('couple_requests').select('id,status,sender_id,recipient_id').or('and(sender_id.eq.'+uid+',recipient_id.eq.'+recipient+'),and(sender_id.eq.'+recipient+',recipient_id.eq.'+uid+')').maybeSingle()
      if (existing?.status === 'accepted') return res.status(409).json({ error: 'already_couple' })
      if (existing?.status === 'pending') return res.status(409).json({ error: 'request_exists' })
      const { data: row, error } = await db.from('couple_requests').insert({ sender_id: uid, recipient_id: recipient }).select('id').single()
      if (error || !row) return res.status(503).json({ error: 'request_failed' })
      const { data: profile } = await db.from('profiles').select('display_name,username').eq('id', uid).maybeSingle()
      const senderName = profile?.display_name || profile?.username || 'Un membre'
      await db.from('notifications').insert({ user_id: recipient, actor_id: uid, type: 'couple_request', title: 'Demande pour être en couple 💞', body: senderName+' souhaite être en couple avec toi.', link: '/notifications?couple_request='+row.id })
      return res.status(200).json({ ok: true, request_id: row.id })
    }
    if (action === 'respond') {
      const requestId = String(req.body?.request_id || '')
      const answer = req.body?.answer
      if (!/^[0-9a-f-]{36}$/i.test(requestId) || !['accepted','declined'].includes(answer)) return res.status(400).json({ error: 'invalid_response' })
      const { data: request, error: requestError } = await db.from('couple_requests').select('*').eq('id', requestId).eq('recipient_id', uid).eq('status','pending').maybeSingle()
      if (requestError || !request) return res.status(404).json({ error: 'request_not_found' })
      if (answer === 'accepted') {
        const { data: ages } = await db.from('profiles').select('id,age').in('id',[uid,request.sender_id])
        if (!ages || ages.length !== 2 || ages.some((p:any)=>!p.age || p.age < 18)) return res.status(403).json({ error: 'adults_only' })
        const { data: active } = await db.from('couple_requests').select('id').eq('status','accepted').or('sender_id.eq.'+uid+',recipient_id.eq.'+uid+',sender_id.eq.'+request.sender_id+',recipient_id.eq.'+request.sender_id).limit(1)
        if (active?.length) return res.status(409).json({ error: 'already_in_couple' })
      }
      const { error } = await db.from('couple_requests').update({ status: answer, updated_at: new Date().toISOString() }).eq('id',requestId).eq('recipient_id',uid).eq('status','pending')
      if (error) return res.status(503).json({ error: 'response_failed' })
      const { data: profile } = await db.from('profiles').select('display_name,username').eq('id',uid).maybeSingle()
      const name = profile?.display_name || profile?.username || 'Un membre'
      await db.from('notifications').insert({ user_id: request.sender_id, actor_id: uid, type: 'couple_response', title: answer === 'accepted' ? 'Demande acceptée 💞' : 'Demande refusée', body: answer === 'accepted' ? name+' a accepté ta demande.' : name+' a refusé ta demande.', link: '/profile?id='+uid })
      return res.status(200).json({ ok: true, status: answer })
    }
    return res.status(400).json({ error: 'invalid_action' })
  } catch {
    return res.status(500).json({ error: 'unexpected_error' })
  }
}
