import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function SendPage() {
  const [recipient, setRecipient] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [status, setStatus] = useState('')

  async function send(e: any) {
    e.preventDefault()
    const user = await supabase.auth.getUser()
    const sender = user.data.user?.id
    if (!sender) return setStatus('Non authentifié')

    const { data, error } = await supabase
      .from('messages')
      .insert([{ sender, recipient, subject, body }])
      .select()
      .single()

    if (error) {
      setStatus(error.message)
      return
    }

    // call server-side API to trigger moderation (server must have SERVICE_ROLE_KEY set)
    await fetch('/api/moderate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message_id: data.id })
    })

    setStatus('Message envoyé')
    setSubject('')
    setBody('')
  }

  return (
    <div style={{padding:20}}>
      <h2>Envoyer un message</h2>
      <form onSubmit={send}>
        <input value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="recipient user id" />
        <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="sujet" />
        <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="message" />
        <button>Envoyer</button>
      </form>
      {status && <p>{status}</p>}
    </div>
  )
}
