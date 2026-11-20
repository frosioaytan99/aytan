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

      <style jsx>{`
        .assistant-page{max-width:900px;margin:34px auto;padding:0 18px 110px;color:var(--ink)}
        .assistant-heading{display:flex;align-items:center;gap:16px;margin-bottom:22px}
        .assistant-icon{width:54px;height:54px;border-radius:17px;background:#eeeaff;color:#7057d9;display:grid;place-items:center;font-size:28px}
        .assistant-heading small{font-size:10px;letter-spacing:1.4px;font-weight:800;color:#7057d9}
        .assistant-heading h1{font:800 29px Manrope;margin:4px 0}
        .assistant-heading p{margin:0;color:var(--muted);font-size:13px}
        .assistant-chat{padding:20px;border:1px solid var(--line);border-radius:20px;background:var(--card,#fff);box-shadow:0 12px 35px #33265d09}
        .assistant-messages{display:grid;gap:14px;min-height:240px;max-height:55vh;overflow:auto;padding:4px 2px 18px}
        .assistant-message{max-width:85%;padding:12px 15px;border-radius:15px}
        .assistant-message.theirs{justify-self:start;background:var(--paper,#f8f7fc)}
        .assistant-message.mine{justify-self:end;background:#7057d9;color:white}
        .assistant-message span{font-size:10px;font-weight:800;opacity:.7}
        .assistant-message p{white-space:pre-wrap;line-height:1.6;font-size:13px;margin:5px 0 0}
        .assistant-suggestions{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 16px}
        .assistant-suggestions button{border:1px solid var(--line);border-radius:999px;background:var(--card,#fff);color:var(--ink);padding:9px 12px;font-size:11px}
        .assistant-form{display:flex;gap:10px;align-items:stretch;border-top:1px solid var(--line);padding-top:16px}
        .assistant-form textarea{flex:1;min-width:0;resize:vertical;border:1px solid var(--line);border-radius:12px;padding:12px;background:var(--card,#fff);color:var(--ink)}
        .assistant-form button{border:0;border-radius:12px;background:#7057d9;color:white;padding:0 19px;font-weight:800}
        .assistant-form button:disabled{opacity:.5}
        .assistant-error{font-size:12px;color:#a33;padding:10px;background:#fff1ef;border-radius:9px}
        .assistant-note{display:block;color:var(--muted);font-size:10px;line-height:1.5;margin-top:12px}
        @media(max-width:550px){.assistant-page{margin:22px auto}.assistant-chat{padding:13px}.assistant-message{max-width:94%}.assistant-form{flex-direction:column}.assistant-form button{min-height:44px}}
      `}</style>
    </main>
  )
}
