import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return res.status(503).json({ error: 'moderation_not_configured' })
  }

  const authorization = req.headers.authorization
  const accessToken = typeof authorization === 'string' && authorization.startsWith('Bearer ')
    ? authorization.slice(7).trim()
    : ''

  if (!accessToken) return res.status(401).json({ error: 'authentication_required' })

  const messageId = typeof req.body?.message_id === 'string' ? req.body.message_id.trim() : ''
  if (!UUID_RE.test(messageId)) return res.status(400).json({ error: 'invalid_message_id' })

  try {
    const userClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: userData, error: userError } = await userClient.auth.getUser(accessToken)
    if (userError || !userData.user) return res.status(401).json({ error: 'invalid_session' })

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: role, error: roleError } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .maybeSingle()

    if (roleError) return res.status(503).json({ error: 'role_check_failed' })
    if (!role || !['admin', 'moderator'].includes(role.role)) {
      return res.status(403).json({ error: 'moderator_access_required' })
    }

    const functionUrl = `${supabaseUrl.replace(/\/+$/, '')}/functions/v1/moderate`
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ message_id: messageId }),
    })

    const result = await response.text()
    return res.status(response.status).send(result)
  } catch {
    return res.status(500).json({ error: 'moderation_request_failed' })
  }
}
