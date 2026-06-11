import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  async function sendLink(e: any) {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) setMessage(error.message)
    else setMessage('Vérifiez votre email pour le lien magique.')
  }

  return (
    <div style={{padding:20}}>
      <h2>Authentification</h2>
      <form onSubmit={sendLink}>
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="email" />
        <button>Envoyer lien</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  )
}
