import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabaseClient'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function sendLink(e: any) {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    setMessage('')
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim() })
    if (error) setMessage(error.message)
    else setMessage('Vérifie ta boîte mail pour retrouver ton lien de connexion.')
    setLoading(false)
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <Link href="/" className="brand"><span className="brand-mark">a</span><span>aytan<span className="brand-dot">.</span></span></Link>
        <h1>Content de te revoir !</h1>
        <p>Entre ton adresse e-mail pour recevoir ton lien de connexion Aytan.</p>
        <form onSubmit={sendLink}>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Ton adresse e-mail" autoComplete="email" />
          <button type="submit" disabled={loading}>{loading ? 'Envoi en cours…' : 'Recevoir mon lien →'}</button>
        </form>
        {message && <p className="auth-message" role="status">{message}</p>}
        <p><Link href="/">← Retour à l'accueil</Link></p>
      </section>
    </main>
  )
}
