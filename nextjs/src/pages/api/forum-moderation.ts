import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const BLOCKED_CATEGORIES = [
  'harassment',
  'harassment/threatening',
  'hate',
  'hate/threatening',
  'violence',
  'violence/graphic',
  'sexual',
  'sexual/minors',
  'self-harm',
  'self-harm/intent',
  'self-harm/instructions',
  'illicit',
  'illicit/violent',
]

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
    const blocked = BLOCKED_CATEGORIES.some((category) => categories[category] === true)

    return res.status(200).json({
      allowed: !blocked,
      message: blocked
        ? 'Ton texte contient peut-être des propos insultants, haineux, menaçants ou dangereux. Modifie-le avant de publier.'
        : undefined,
    })
  } catch {
    return res.status(500).json({ error: 'moderation_request_failed' })
  }
}
