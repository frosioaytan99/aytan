import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
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
    const { data: role, error: roleError } = await db.from('user_roles').select('role').eq('user_id', authData.user.id).maybeSingle()
    if (roleError) return res.status(503).json({ error: 'role_check_failed' })
    if (!role || !['admin', 'moderator'].includes(role.role)) return res.status(403).json({ error: 'staff_access_required' })

    const { data: reports, error: reportsError } = await db.from('reports')
      .select('id,reporter_id,content_type,content_id,reason,status,created_at')
      .order('created_at', { ascending: false }).limit(200)
    if (reportsError) return res.status(503).json({ error: 'reports_read_failed' })

    const postIds = (reports || []).filter(r => r.content_type === 'post').map(r => r.content_id)
    const { data: posts, error: postsError } = postIds.length
      ? await db.from('posts').select('id,author_id').in('id', postIds)
      : { data: [], error: null }
    if (postsError) return res.status(503).json({ error: 'reported_posts_read_failed' })

    const postAuthors = new Map<string, string>((posts || []).map(p => [p.id, p.author_id] as [string, string]))
    const profileIds = Array.from(new Set((reports || []).flatMap(r => [
      r.reporter_id,
      r.content_type === 'profile' ? r.content_id : r.content_type === 'post' ? postAuthors.get(r.content_id) : null
    ]).filter((id): id is string => typeof id === 'string' && id.length > 0)))

    const { data: profiles, error: profilesError } = profileIds.length
      ? await db.from('profiles').select('id,display_name,username,avatar_url').in('id', profileIds)
      : { data: [], error: null }
    if (profilesError) return res.status(503).json({ error: 'profiles_read_failed' })

    const byId = new Map<string, { id: string; display_name: string | null; username: string | null; avatar_url: string | null }>((profiles || []).map(p => [p.id, p] as [string, { id: string; display_name: string | null; username: string | null; avatar_url: string | null }]))
    const enriched = (reports || []).map(report => {
      const targetId = report.content_type === 'profile'
        ? report.content_id
        : report.content_type === 'post' ? postAuthors.get(report.content_id) || null : null
      return {
        ...report,
        reporter_profile: byId.get(report.reporter_id) || null,
        target_user_id: targetId,
        target_profile: targetId ? byId.get(targetId) || null : null,
      }
    })
    return res.status(200).json({ reports: enriched })
  } catch {
    return res.status(500).json({ error: 'reports_read_failed' })
  }
}
