import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export const PRIVATE_MEDIA_PREFIX = 'private-media:'
const PRIVATE_BUCKET = 'community-private'
const MAX_IMAGE_BYTES = 3 * 1024 * 1024
const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isAllowedCommunityImage(file: File) {
  return Boolean(IMAGE_EXTENSIONS[file.type]) && file.size > 0 && file.size <= MAX_IMAGE_BYTES
}

export function communityImageExtension(file: File) {
  return IMAGE_EXTENSIONS[file.type] || 'jpg'
}

/** Resolve private-media references only after Supabase RLS authorizes a short-lived signed URL. */
export function useCommunityMedia(source?: string | null) {
  const [url, setUrl] = useState('')

  useEffect(() => {
    let active = true
    let refreshTimer: ReturnType<typeof setTimeout> | undefined

    if (!source) {
      setUrl('')
      return () => { active = false }
    }

    if (!source.startsWith(PRIVATE_MEDIA_PREFIX)) {
      setUrl(source)
      return () => { active = false }
    }

    const path = source.slice(PRIVATE_MEDIA_PREFIX.length)
    const parts = path.split('/')
    if (
      path.length > 512 ||
      parts.length < 2 ||
      !UUID_PATTERN.test(parts[0]) ||
      parts.some(part => !part || part === '.' || part === '..')
    ) {
      setUrl('')
      return () => { active = false }
    }

    setUrl('')
    const refresh = async () => {
      const { data, error } = await supabase.storage
        .from(PRIVATE_BUCKET)
        .createSignedUrl(path, 15 * 60)
      if (!active) return
      setUrl(error ? '' : data?.signedUrl || '')
      if (!error) refreshTimer = setTimeout(refresh, 12 * 60 * 1000)
    }

    void refresh()
    return () => {
      active = false
      if (refreshTimer) clearTimeout(refreshTimer)
    }
  }, [source])

  return url
}
