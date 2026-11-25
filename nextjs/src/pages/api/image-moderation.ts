import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

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
  if (!url || !anon || !service) {
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

    // Private-message photos must fail closed: never send them while AI moderation is paused.
    if (!settings.enabled && req.body?.purpose === 'private_message') {
      return res.status(503).json({ error: 'photo_moderation_paused', message: 'La vérification IA des photos est temporairement indisponible. La photo n’a pas été envoyée.' })
    }

    // Accept other uploads while AI moderation is paused, store them privately, and log them for moderator review.
    if (!settings.enabled) {
      const ext = MIME_EXTENSIONS[mime]
      const path = `${authData.user.id}/image-${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`
      const { error: uploadError } = await adminDb.storage.from('community-private').upload(path, bytes, { contentType: mime, upsert: false })
      if (uploadError) return res.status(500).json({ error: 'image_evidence_storage_failed' })
      const { error: logError } = await adminDb.from('ai_moderation_logs').insert({
        user_id: authData.user.id,
        content: '[Photo envoyée pendant la pause de l’IA]',
        image_path: path,
        allowed: true,
        flagged: false,
        categories: {},
        category_scores: {},
        decision: 'automatic',
      })
      if (logError) {
        await adminDb.storage.from('community-private').remove([path])
        return res.status(500).json({ error: 'moderation_log_save_failed' })
      }
      return res.status(200).json({ image_url: 'private-media:' + path })
    }

    if (!openaiKey) return res.status(503).json({ error: 'image_moderation_not_configured' })

    // Animated GIFs are decoded and every frame is checked. The moderation API
    // receives still images, so checking only the GIF container could miss explicit
    // content that appears briefly during playback.
    const frames: Buffer[] = []
    if (mime === 'image/gif') {
      let metadata: sharp.Metadata
      try {
        metadata = await sharp(bytes, { animated: true, limitInputPixels: 40_000_000 }).metadata()
      } catch {
        return res.status(400).json({ error: 'gif_decode_failed', message: 'Ce GIF ne peut pas être analysé en toute sécurité. Essaie un autre fichier.' })
      }
      const frameCount = metadata.pages || 1
      if (frameCount > 120) {
        return res.status(400).json({ error: 'gif_too_many_frames', message: 'Ce GIF contient trop d’images pour être vérifié. Envoie un GIF plus court.' })
      }
      try {
        for (let frame = 0; frame < frameCount; frame++) {
          const still = await sharp(bytes, { page: frame, limitInputPixels: 40_000_000 })
            .resize({ width: 768, height: 768, fit: 'inside', withoutEnlargement: true })
            .png()
            .toBuffer()
          frames.push(still)
        }
      } catch {
        return res.status(400).json({ error: 'gif_decode_failed', message: 'Ce GIF ne peut pas être analysé en toute sécurité. Essaie un autre fichier.' })
      }
    } else {
      frames.push(bytes)
    }

    const allResults: any[] = []
    for (let offset = 0; offset < frames.length; offset += 8) {
      const batch = frames.slice(offset, offset + 8)
      const moderationResponse = await fetch('https://api.openai.com/v1/moderations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model: 'omni-moderation-latest',
          input: batch.map(frame => ({
            type: 'image_url',
            image_url: { url: 'data:image/png;base64,' + frame.toString('base64') },
          })),
        }),
      })
      if (!moderationResponse.ok) return res.status(502).json({ error: 'moderation_service_unavailable' })
      const payload = await moderationResponse.json()
      if (!Array.isArray(payload?.results) || payload.results.length !== batch.length) {
        return res.status(502).json({ error: 'moderation_result_unavailable' })
      }
      allResults.push(...payload.results)
    }

    const categories: Record<string, boolean> = {}
    const scores: Record<string, number> = {}
    let flagged = false
    let blocked = false
    for (const result of allResults) {
      flagged = flagged || result?.flagged === true
      for (const [key, value] of Object.entries(result?.categories || {})) {
        categories[key] = categories[key] || value === true
      }
      for (const [key, value] of Object.entries(result?.category_scores || {})) {
        if (typeof value === 'number') scores[key] = Math.max(scores[key] || 0, value)
      }
      const frameCategories = result?.categories || {}
      if (
        frameCategories.sexual === true ||
        frameCategories['sexual/minors'] === true ||
        frameCategories.violence === true ||
        frameCategories['violence/graphic'] === true ||
        frameCategories['self-harm/intent'] === true ||
        frameCategories['self-harm/instructions'] === true
      ) blocked = true
    }
    categories.gif = mime === 'image/gif'
    scores.frames_analyzed = allResults.length
    const result = { flagged, categories, category_scores: scores }

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
      content: mime === 'image/gif' ? '[GIF animé analysé image par image par l’IA]' : '[Photo analysée par l’IA]',
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
        message: 'Cette image ou ce GIF semble contenir du contenu sexuel, violent ou dangereux. Il ne peut pas être envoyé sur Weshbien2.',
      })
    }

    return res.status(200).json({ image_url: 'private-media:' + path })
  } catch {
    return res.status(500).json({ error: 'image_moderation_failed' })
  }
}
