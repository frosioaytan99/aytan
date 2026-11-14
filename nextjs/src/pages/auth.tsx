import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabaseClient'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  async function sendLink(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage('')
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: typeof window !== 'undefined' ? window.location.origin + '/feed' : undefined }
    })
    setBusy(false)
    setMessage(error ? error.message : 'Un lien de connexion vient de t’être envoyé. Consulte ta boîte mail.')
  }
  return <main className="auth-screen">
    <div className="auth-card">
      <Link href="/" className="brand"><span className="brand-mark">✦</span><span>aytan</span></Link>
      <span className="page-kicker">TON ESPACE COMMUNAUTAIRE</span>
      <h1>Content de te revoir !</h1>
      <p>Entre ton adresse e-mail pour recevoir un lien sécurisé et accéder à ton espace.</p>
      <form onSubmit={sendLink} className="stack-form">
        <label htmlFor="email">Adresse e-mail</label>
        <input id="email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="toi@exemple.fr"/>
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Envoi…' : 'Recevoir mon lien'}</button>
      </form>
      {message && <p className="notice" role="status">{message}</p>}
      <p className="muted-small">En continuant, tu acceptes de respecter les règles de la communauté et les autres membres.</p>
      <Link href="/" className="back-link">← Retour à l’accueil</Link>
    </div>
  </main>
}
