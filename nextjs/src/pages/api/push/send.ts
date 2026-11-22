import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const webpush = require('web-push')

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const expected = process.env.WEB_PUSH_TRIGGER_SECRET
  if (!expected || req.headers['x-weshbien-push-secret'] !== expected) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const record = req.body?.record
  if (!record?.recipient || !record?.sender) return res.status(400).json({ error: 'Invalid message event' })
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY
  const privateKey = process.env.WEB_PUSH_PRIVATE_KEY
  const contact = process.env.WEB_PUSH_CONTACT || 'mailto:admin@weshbien2.fr'
  if (!supabaseUrl || !serviceKey || !publicKey || !privateKey) {
    return res.status(503).json({ error: 'Push notifications are not configured' })
  }

  try {
    webpush.setVapidDetails(contact, publicKey, privateKey)
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const [{ data: subscriptions, error }, { data: profile }] = await Promise.all([
      admin.from('push_subscriptions').select('id,subscription').eq('user_id', record.recipient),
      admin.from('profiles').select('display_name,username').eq('id', record.sender).maybeSingle()
    ])
    if (error) throw error
    const sender = profile?.display_name || profile?.username || 'Quelqu’un'
    const body = String(record.body || (record.attachment_type === 'image' ? 'T’a envoyé une photo' : 'T’a envoyé un message')).slice(0, 140)
    const payload = JSON.stringify({
      title: sender + ' t’a envoyé un message',
      body,
      url: '/conversation?with=' + encodeURIComponent(record.sender),
      tag: 'weshbien-message-' + record.sender
    })
    const results = await Promise.all((subscriptions || []).map(async (row: any) => {
      try {
        await webpush.sendNotification(row.subscription, payload)
        return true
      } catch (error: any) {
        if (error?.statusCode === 404 || error?.statusCode === 410) {
          await admin.from('push_subscriptions').delete().eq('id', row.id)
        } else {
          console.warn('Web push delivery failed', error?.statusCode || error?.message)
        }
        return false
      }
    }))
    return res.status(200).json({ sent: results.filter(Boolean).length })
  } catch (error: any) {
    console.error('Push notification error', error?.message || error)
    return res.status(500).json({ error: 'Push delivery failed' })
  }
}
