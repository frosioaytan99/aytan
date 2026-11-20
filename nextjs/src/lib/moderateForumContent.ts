import { supabase } from './supabaseClient'

export async function moderateForumContent(content: string): Promise<{ allowed: boolean; message?: string }> {
  const cleanContent = content.trim()
  if (!cleanContent) return { allowed: false, message: 'Écris un texte avant de publier.' }

  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    return { allowed: false, message: 'Reconnecte-toi pour publier.' }
  }

  try {
    const response = await fetch('/api/forum-moderation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ content: cleanContent }),
    })
    const result = await response.json()

    if (!response.ok) {
      return {
        allowed: false,
        message: response.status === 503
          ? 'La protection du forum n’est pas encore configurée. Réessaie plus tard.'
          : 'La vérification automatique a échoué. Ton texte n’a pas été publié ; réessaie.',
      }
    }

    return {
      allowed: result.allowed === true,
      message: result.message || (result.allowed === true ? undefined : 'Ce texte ne peut pas être publié.'),
    }
  } catch {
    return {
      allowed: false,
      message: 'Impossible de vérifier ton texte. Il n’a pas été publié ; réessaie.',
    }
  }
}
