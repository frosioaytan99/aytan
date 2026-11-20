import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store')
  if (!['GET', 'PATCH'].includes(req.method || '')) {
    res.setHeader('Allow', 'GET, PATCH')
    return res.status(405).json({ error: 'method_not_allowed' })
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !anon || !service) return res.status(503).json({ error: 'assistant_settings_not_configured' })
  const header = req.headers.authorization || ''
  const token = typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token) return res.status(401).json({ error: 'authentication_required' })
  try {
    const auth = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data, error } = await auth.auth.getUser(token)
    if (error || !data.user) return res.status(401).json({ error: 'invalid_session' })
    const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: role, error: roleError } = await db.from('user_roles').select('role').eq('user_id', data.user.id).maybeSingle()
    if (roleError) return res.status(503).json({ error: 'role_check_failed' })
    if (role?.role !== 'admin') return res.status(403).json({ error: 'admin_access_required' })

    if (req.method === 'GET') {
      const { data: settings, error: settingsError } = await db.from('ai_assistant_settings').select('enabled,model,max_tokens,updated_at').eq('id', true).single()
      if (settingsError || !settings) return res.status(503).json({ error: 'assistant_settings_read_failed' })
      return res.status(200).json({ settings, api_key_configured: Boolean(process.env.OPENAI_API_KEY) })
    }

    const enabled = req.body?.enabled
    const maxTokens = req.body?.max_tokens
    if (typeof enabled !== 'boolean' || ![400, 700, 1200].includes(maxTokens)) {
      return res.status(400).json({ error: 'invalid_assistant_settings' })
    }
    const { data: settings, error: saveError } = await db.from('ai_assistant_settings').upsert({
      id: true, enabled, model: 'gpt-4o-mini', max_tokens: maxTokens,
      updated_by: data.user.id, updated_at: new Date().toISOString(),
    }, { onConflict: 'id' }).select('enabled,model,max_tokens,updated_at').single()
    if (saveError || !settings) return res.status(503).json({ error: 'assistant_settings_save_failed' })
    return res.status(200).json({ ok: true, settings, api_key_configured: Boolean(process.env.OPENAI_API_KEY) })
  } catch {
    return res.status(500).json({ error: 'assistant_settings_failed' })
  }
}
