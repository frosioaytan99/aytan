import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export const config = { api: { bodyParser: { sizeLimit: '20kb' } } }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Méthode non autorisée.' })
  }

  const apiKey = process.env.OPENAI_API_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!apiKey || !supabaseUrl || !anonKey || !serviceKey) {
    return res.status(503).json({ error: "L'assistant IA n'est pas encore configuré." })
  }

  const authorization = req.headers.authorization || ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : ''
  if (!token) return res.status(401).json({ error: 'Connecte-toi pour utiliser Weshbien IA.' })

  const messages = Array.isArray(req.body?.messages) ? req.body.messages : []
  if (!messages.length || messages.length > 12) {
    return res.status(400).json({ error: 'Conversation invalide.' })
  }
  const safeMessages = messages.map((item: any) => ({
    role: item?.role === 'assistant' ? 'assistant' : 'user',
    content: typeof item?.content === 'string' ? item.content.trim().slice(0, 3000) : '',
  })).filter((item: any) => item.content)
  if (!safeMessages.length || safeMessages[safeMessages.length - 1].role !== 'user') {
    return res.status(400).json({ error: 'Écris un message pour commencer.' })
  }

  try {
    const supabase = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data.user || data.user.is_anonymous) {
      return res.status(401).json({ error: 'Cette fonction est réservée aux comptes membres.' })
    }

    const adminDb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: settings, error: settingsError } = await adminDb
      .from('ai_assistant_settings')
      .select('enabled,model,max_tokens')
      .eq('id', true)
      .single()
    if (settingsError || !settings) return res.status(503).json({ error: "Les réglages de Weshbien IA sont indisponibles." })
    if (!settings.enabled) return res.status(503).json({ error: "Weshbien IA est temporairement désactivée par l'équipe d'administration." })

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: settings.model || 'gpt-4o-mini',
        temperature: 0.6,
        max_tokens: settings.max_tokens || 700,
        messages: [
          {
            role: 'system',
            content: "Tu es Weshbien IA, l'assistant officiel du réseau social Weshbien2. Tu réponds en français simple, amical et clair. Tu aides les membres à utiliser le site, comprendre les forums, questions, messages, communautés, profils, stories et paramètres. Tu peux aussi répondre aux questions générales. Si tu ne connais pas une fonctionnalité ou une information précise du site, dis-le clairement et n'invente pas. Tu ne peux pas consulter les comptes, les messages privés, les mots de passe ni agir comme administrateur. Pour un problème de compte ou une sanction, conseille de contacter un administrateur. Reste respectueux et ne demande jamais de mot de passe ni de code de connexion."
          },
          ...safeMessages,
        ],
      }),
    })
    if (!response.ok) {
      if (response.status === 401) return res.status(502).json({ error: "La clé OpenAI du site n'est pas valide. Un administrateur doit la vérifier dans Vercel." })
      if (response.status === 429) return res.status(502).json({ error: "Le quota ou la limite d'utilisation OpenAI est atteint. Vérifie la facturation OpenAI." })
      return res.status(502).json({ error: "OpenAI n'a pas pu répondre. Réessaie dans un instant." })
    }
    const result = await response.json()
    const answer = result?.choices?.[0]?.message?.content
    if (typeof answer !== 'string' || !answer.trim()) {
      return res.status(502).json({ error: "Je n'ai pas réussi à préparer une réponse. Réessaie." })
    }
    return res.status(200).json({ answer: answer.trim() })
  } catch {
    return res.status(500).json({ error: "Une erreur est survenue avec l'assistant IA." })
  }
}
