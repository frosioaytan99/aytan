import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const PREFIX = 'private-media:'
const BUCKET = 'community-private'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method_not_allowed' })
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !anon || !service) return res.status(503).json({ error: 'storage_not_configured' })
  const auth = req.headers.authorization || ''
  const token = typeof auth === 'string' && auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  if (!token) return res.status(401).json({ error: 'authentication_required' })

  const photoUrl = typeof req.body?.photo_url === 'string' ? req.body.photo_url : ''
  const isManagedStoragePhoto = photoUrl.startsWith(PREFIX)
  const suppliedOwnerId = typeof req.body?.owner_id === 'string' ? req.body.owner_id : ''
  if (!photoUrl || photoUrl.length > 2048) return res.status(400).json({ error: 'invalid_photo_reference' })

  let ownerId = suppliedOwnerId
  let storagePath = ''
  if (isManagedStoragePhoto) {
    storagePath = photoUrl.slice(PREFIX.length)
    const parts = storagePath.split('/')
    if (storagePath.length > 512 || parts.length < 2 || !UUID.test(parts[0]) || parts.some(part => !part || part === '.' || part === '..')) {
      return res.status(400).json({ error: 'invalid_photo_path' })
    }
    ownerId = parts[0]
  } else if (!UUID.test(ownerId)) {
    return res.status(400).json({ error: 'invalid_owner_id' })
  }

  try {
    const authClient = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: authData, error: authError } = await authClient.auth.getUser(token)
    if (authError || !authData.user || authData.user.is_anonymous) return res.status(401).json({ error: 'invalid_session' })
    const requesterId = authData.user.id
    const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: roleRow, error: roleError } = await admin.from('user_roles').select('role').eq('user_id', requesterId).eq('role', 'admin').maybeSingle()
    if (roleError) return res.status(500).json({ error: 'role_check_failed' })
    const isAdmin = Boolean(roleRow)
    if (ownerId !== requesterId && !isAdmin) return res.status(403).json({ error: 'not_photo_owner' })

    const [profileResult, postsResult] = await Promise.all([
      admin.from('profiles').select('id,gallery_urls,avatar_url').eq('id', ownerId).maybeSingle(),
      admin.from('posts').select('id,image_url,image_urls').eq('author_id', ownerId),
    ])
    if (profileResult.error || postsResult.error) return res.status(500).json({ error: 'ownership_check_failed' })
    const profile = profileResult.data
    const gallery = profile?.gallery_urls || []
    const inGallery = gallery.includes(photoUrl)
    const isAvatar = profile?.avatar_url === photoUrl
    const matchingPosts = (postsResult.data || []).filter((post: any) => post.image_url === photoUrl || (post.image_urls || []).includes(photoUrl))
    if (!inGallery && !isAvatar && matchingPosts.length === 0) return res.status(404).json({ error: 'photo_not_found_or_not_owned' })

    if (inGallery) {
      const { error } = await admin.from('profiles').update({ gallery_urls: gallery.filter((item: string) => item !== photoUrl) }).eq('id', ownerId)
      if (error) return res.status(500).json({ error: 'gallery_update_failed' })
    }
    if (isAvatar) {
      const { error } = await admin.from('profiles').update({ avatar_url: null }).eq('id', ownerId)
      if (error) return res.status(500).json({ error: 'avatar_update_failed' })
    }
    for (const post of matchingPosts) {
      const remaining = (post.image_urls || (post.image_url ? [post.image_url] : [])).filter((item: string) => item !== photoUrl)
      const { error } = await admin.from('posts').update({ image_urls: remaining, image_url: remaining[0] || null }).eq('id', post.id).eq('author_id', ownerId)
      if (error) return res.status(500).json({ error: 'post_update_failed' })
    }
    const { error: commentError } = await admin.from('photo_comments').delete().eq('photo_url', photoUrl).eq('owner_id', ownerId)
    if (commentError) return res.status(500).json({ error: 'comments_cleanup_failed' })

    // Legacy/external image URLs can be detached from the profile, but only managed
    // private-media objects can be physically removed from this Supabase bucket.
    if (isManagedStoragePhoto) {
      const { error: storageError } = await admin.storage.from(BUCKET).remove([storagePath])
      if (storageError) return res.status(500).json({ error: 'storage_delete_failed', message: 'La photo a été retirée du site, mais son fichier n’a pas pu être effacé du stockage.' })
    }
    return res.status(200).json({ success: true, storageDeleted: isManagedStoragePhoto })
  } catch {
    return res.status(500).json({ error: 'photo_delete_failed' })
  }
}
