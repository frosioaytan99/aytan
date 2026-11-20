import { useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'

type Message = { role: 'user' | 'assistant'; content: string }

const suggestions = [
  'Comment fonctionne le forum ?',
  'Comment modifier mon profil ?',
  'Comment créer une communauté ?',
  'Comment protéger mon compte ?',
]

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Salut ! 👋 Je suis Weshbien IA. Je peux t'aider à utiliser Weshbien2, répondre à tes questions et t'expliquer les différentes fonctionnalités. Que veux-tu savoir ?" },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function send(event?: FormEvent, suggestion?: string) {
    event?.preventDefault()
    const content = (suggestion || input).trim()
    if (!content || loading) return
    const next = [...messages, { role: 'user' as const, content }]
    setMessages(next)
    setInput('')
    setError('')
    setLoading(true)
    try {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) throw new Error('Reconnecte-toi pour utiliser Weshbien IA.')
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ messages: next.slice(-12) }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || "L'assistant est indisponible.")
      setMessages(current => [...current, { role: 'assistant', content: result.answer }])
    } catch (err: any) {
      setError(err?.message || 'Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="assistant-page">
      <header className="assistant-heading">
        <span className="assistant-icon">✦</span>
        <div><small>TON ASSISTANT PERSONNEL</small><h1>Weshbien IA</h1><p>Pose tes questions, je suis là pour t'aider.</p></div>
      </header>
      <section className="assistant-chat card">
        <div className="assistant-messages" aria-live="polite">
          {messages.map((message, index) => (
            <div key={index} className={'assistant-message ' + (message.role === 'user' ? 'mine' : 'theirs')}>
              <span>{message.role === 'user' ? 'Toi' : 'Weshbien IA'}</span>
              <p>{message.content}</p>
            </div>
          ))}
          {loading && <div className="assistant-message theirs"><span>Weshbien IA</span><p>Je réfléchis…</p></div>}
        </div>
        {messages.length === 1 && <div className="assistant-suggestions">{suggestions.map(item => <button type="button" key={item} onClick={() => send(undefined, item)}>{item}</button>)}</div>}
        {error && <p className="assistant-error" role="alert">{error}</p>}
        <form className="assistant-form" onSubmit={send}>
          <textarea value={input} onChange={event => setInput(event.target.value)} placeholder="Écris ton message à Weshbien IA…" rows={2} maxLength={3000} disabled={loading} />
          <button type="submit" disabled={loading || !input.trim()}>{loading ? '…' : 'Envoyer'}</button>
        </form>
        <small className="assistant-note">Les réponses sont générées par une IA et peuvent contenir des erreurs. Ne partage jamais ton mot de passe.</small>
      </section>
    </main>
  )
}
