import type { CSSProperties } from 'react'
import { useCommunityMedia } from '../lib/communityMedia'

type Props = {
  src?: string | null
  alt: string
  className?: string
  style?: CSSProperties
  fallback?: string
}

export default function CommunityImage({ src, alt, className, style, fallback }: Props) {
  const resolvedUrl = useCommunityMedia(src)
  if (!resolvedUrl) return fallback || null
  return <img src={resolvedUrl} alt={alt} className={className} style={style} loading="lazy" decoding="async" />
}
