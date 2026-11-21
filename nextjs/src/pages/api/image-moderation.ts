import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export const config = {
  api: { bodyParser: { sizeLimit: '12mb' } },
}

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  const openaiKey = process.env.OPENAI_API_KEY
  if (!url || !anon || !service || !openaiKey) {
    return res.status(503).json({ error: 'image_moderation_not_configured' })
  }

  const auth = req.headers.authorization || ''
  const token = typeof auth === 'string' && auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  if (!token) return res.status(401).json({ error: 'authentication_required' })

  const dataUrl = typeof req.body?.image === 'string' ? req.body.image : ''
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/)
  if (!match) return res.status(400).json({ error: 'invalid_image' })

  const mime = match[1]
  const bytes = Buffer.from(match[2], 'base64')
  if (!bytes.length || bytes.length > 8 * 1024 * 1024) {
    return res.status(413).json({ error: 'image_too_large' })
  }

  try {
    const authClient = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: authData, error: authError } = await authClient.auth.getUser(token)
    if (authError || !authData.user) return res.status(401).json({ error: 'invalid_session' })
    if (authData.user.is_anonymous) return res.status(403).json({ error: 'guest_uploads_not_allowed' })

    const adminDb = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: settings, error: settingsError } = await adminDb
      .from('ai_moderation_settings').select('enabled').eq('id', true).single()
    if (settingsError || !settings) return res.status(503).json({ error: 'moderation_settings_unavailable' })
    if (!settings.enabled) return res.status(503).json({ error: 'photo_moderation_paused' })

    const moderationResponse = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model: 'omni-moderation-latest',
        input: [{ type: 'image_url', image_url: { url: dataUrl } }],
      }),
    })
    if (!moderationResponse.ok) return res.status(502).json({ error: 'moderation_service_unavailable' })
    const payload = await moderationResponse.json()
    const result = payload?.results?.[0]
    if (!result) return res.status(502).json({ error: 'moderation_result_unavailable' })

    const categories = result.categories || {}
    const scores = result.category_scores || {}
    const blocked = categories.sexual === true || categories['sexual/minors'] === true

    // Keep the original image in the private bucket so an authorized moderator
    // can inspect exactly what the model analyzed. The path is never exposed to members.
    const ext = MIME_EXTENSIONS[mime]
    const path = `${authData.user.id}/image-${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`
    const { error: uploadError } = await adminDb.storage.from('community-private').upload(path, bytes, {
      contentType: mime,
      upsert: false,
    })
    if (uploadError) return res.status(500).json({ error: 'image_evidence_storage_failed' })

    const { error: logError } = await adminDb.from('ai_moderation_logs').insert({
      user_id: authData.user.id,
      content: '[Photo analysée par l’IA]',
      image_path: path,
      allowed: !blocked,
      flagged: result.flagged === true,
      categories,
      category_scores: scores,
      decision: 'automatic',
    })
    if (logError) {
      await adminDb.storage.from('community-private').remove([path])
      return res.status(500).json({ error: 'moderation_log_save_failed' })
    }

    if (blocked) {
      return res.status(400).json({
        error: 'explicit_image_blocked',
        message: 'Cette photo semble contenir du contenu sexuel explicite. Elle ne peut pas être publiée sur Weshbien2.',
      })
    }

    return res.status(200).json({ image_url: 'private-media:' + path })
  } catch {
    return res.status(500).json({ error: 'image_moderation_failed' })
  }
}
