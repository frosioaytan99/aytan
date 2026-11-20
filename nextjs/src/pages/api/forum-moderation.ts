import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'



export const config = {
  api: { bodyParser: { sizeLimit: '12kb' } },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const apiKey = process.env.OPENAI_API_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!apiKey || !supabaseUrl || !anonKey) {
    return res.status(503).json({ error: 'moderation_not_configured' })
  }

  const authorization = req.headers.authorization
  const accessToken = typeof authorization === 'string' && authorization.startsWith('Bearer ')
    ? authorization.slice(7).trim()
    : ''
  if (!accessToken) return res.status(401).json({ error: 'authentication_required' })

  const content = typeof req.body?.content === 'string' ? req.body.content.trim() : ''
  if (!content || content.length > 6000) {
    return res.status(400).json({ error: 'invalid_content' })
  }

  try {
    const supabase = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data, error } = await supabase.auth.getUser(accessToken)
    if (error || !data.user) return res.status(401).json({ error: 'invalid_session' })

    const adminDb = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY || '', {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(503).json({ error: 'moderation_not_configured' })
    }
    const { data: settings, error: settingsError } = await adminDb
      .from('ai_moderation_settings')
      .select('enabled,blocked_categories')
      .eq('id', true)
      .single()
    if (settingsError || !settings) return res.status(503).json({ error: 'moderation_settings_unavailable' })

    if (!settings.enabled) {
      await adminDb.from('ai_moderation_logs').insert({
        user_id: data.user.id, content, allowed: true, flagged: false,
        categories: {}, category_scores: {}, decision: 'automatic',
      })
      return res.status(200).json({ allowed: true, moderation_paused: true })
    }

    const moderationResponse = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'omni-moderation-latest',
        input: content,
      }),
    })

    if (!moderationResponse.ok) {
      return res.status(502).json({ error: 'moderation_service_unavailable' })
    }

    const result = await moderationResponse.json()
    const moderation = result?.results?.[0]
    if (!moderation) return res.status(502).json({ error: 'moderation_result_unavailable' })

    const categories = moderation.categories || {}
    const categoryScores = moderation.category_scores || {}
    const blockedCategories = Array.isArray(settings.blocked_categories) ? settings.blocked_categories : []
    const flagged = moderation.flagged === true
    const blocked = blockedCategories.some((category: string) => categories[category] === true)

    await adminDb.from('ai_moderation_logs').insert({
      user_id: data.user.id,
      content,
      allowed: !blocked,
      flagged,
      categories,
      category_scores: categoryScores,
      decision: 'automatic',
    })

    return res.status(200).json({
      allowed: !blocked,
      message: blocked
        ? 'Ton texte a été bloqué par la modération automatique. Tu peux le modifier ou contacter un modérateur.'
        : undefined,
    })
  } catch {
    return res.status(500).json({ error: 'moderation_request_failed' })
  }
}
