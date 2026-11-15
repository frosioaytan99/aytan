import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: any) {
    e.preventDefault()
    if (loading) return

    setLoading(true)
    setMessage('')
    const cleanEmail = email.trim().toLowerCase()

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
      })

      if (error) {
        setMessage(error.message)
      } else if (data.session) {
        await router.push('/inbox')
      } else {
        setMessage("Ton compte a été créé, mais Supabase demande encore une confirmation par e-mail. Désactive « Confirm email » dans Authentication > Providers > Email pour permettre l'accès immédiat.")
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      })

      if (error) {
        setMessage(`Connexion impossible : ${error.message}`)
      } else {
        await router.push('/inbox')
      }
    }

    setLoading(false)
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <Link href="/" className="brand"><span className="brand-mark">w</span><span>weshbien2<span className="brand-dot">.</span></span></Link>
        <h1>{mode === 'login' ? 'Content de te revoir !' : 'Bienvenue sur weshbien2 !'}</h1>
        <p>{mode === 'login' ? 'Connecte-toi avec ton adresse e-mail et ton mot de passe.' : 'Crée ton compte avec une adresse e-mail et un mot de passe.'}</p>

        <div className="auth-tabs" role="tablist" aria-label="Connexion ou inscription">
          <button type="button" className={mode === 'login' ? 'auth-tab active' : 'auth-tab'} onClick={() => { setMode('login'); setMessage('') }}>Connexion</button>
          <button type="button" className={mode === 'signup' ? 'auth-tab active' : 'auth-tab'} onClick={() => { setMode('signup'); setMessage('') }}>Inscription</button>
        </div>

        <form onSubmit={submit}>
          <label className="auth-label" htmlFor="auth-email">Adresse e-mail</label>
          <input id="auth-email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Ton adresse e-mail" autoComplete="email" />
          <label className="auth-label" htmlFor="auth-password">Mot de passe</label>
          <input id="auth-password" type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} placeholder="8 caractères minimum" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
          <button type="submit" disabled={loading}>{loading ? 'Patiente…' : mode === 'login' ? 'Me connecter →' : 'Créer mon compte →'}</button>
        </form>

        {message && <p className="auth-message" role="status">{message}</p>}
        <p className="auth-footnote">Aucun code ni lien de validation ne sera demandé lorsque la confirmation d’e-mail est désactivée.</p>
        <p><Link href="/">← Retour à l'accueil</Link></p>
      </section>
    </main>
  )
}
