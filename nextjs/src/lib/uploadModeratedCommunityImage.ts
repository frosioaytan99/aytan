import { supabase } from './supabaseClient'

export async function uploadModeratedCommunityImage(file: File): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Connecte-toi pour envoyer une photo.')

  const image = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Lecture de la photo impossible.'))
    reader.onerror = () => reject(new Error('Lecture de la photo impossible.'))
    reader.readAsDataURL(file)
  })

  const response = await fetch('/api/image-moderation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
    body: JSON.stringify({ image }),
  })
  const result = await response.json().catch(() => null)
  if (!response.ok) throw new Error(result?.message || (result?.error === 'photo_moderation_paused'
    ? 'La vérification des photos est temporairement indisponible. Réessaie plus tard.'
    : 'La photo n’a pas pu être vérifiée ou envoyée. Réessaie.'))
  if (typeof result?.image_url !== 'string') throw new Error('Le serveur n’a pas confirmé l’envoi de la photo.')
  return result.image_url
}
