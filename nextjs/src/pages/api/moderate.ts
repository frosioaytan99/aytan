import { createClient } from '@supabase/supabase-js'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' })
  const { message_id } = req.body || {}
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!message_id || !token) return res.status(401).json({ error: 'authentication required' })
  if (!url || !anonKey || !serviceKey) return res.status(503).json({ error: 'moderation service not configured' })

  const userClient = createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } })
  const { data: userData, error: authError } = await userClient.auth.getUser(token)
  if (authError || !userData.user) return res.status(401).json({ error: 'invalid session' })

  const { data: ownedMessage, error: lookupError } = await userClient
    .from('messages').select('id').eq('id', message_id).eq('sender', userData.user.id).maybeSingle()
  if (lookupError || !ownedMessage) return res.status(404).json({ error: 'message not found' })

  try {
    const fnUrl = `${url.replace(/\\/+$/, '')}/functions/v1/moderate`
    const result = await fetch(fnUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({ message_id })
    })
    const body = await result.text()
    return res.status(result.status).send(body)
  } catch {
    return res.status(502).json({ error: 'moderation service unavailable' })
  }
}
