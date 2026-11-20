import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'

type Mode = 'login' | 'signup' | 'forgot'

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [guestLoading, setGuestLoading] = useState(false)


  async function continueAsGuest() {
    if (guestLoading || loading) return
    setGuestLoading(true)
    setMessage('')
    const { data, error } = await supabase.auth.signInAnonymously()
    if (error || !data.session) {
      setMessage("Le mode invité n'est pas encore activé dans Supabase. Il faut activer les connexions anonymes dans les paramètres d'authentification.")
      setGuestLoading(false)
      return
    }
    const response = await fetch('/api/guest-name', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + data.session.access_token },
    })
    const result = await response.json().catch(() => null)
    if (!response.ok || !result?.display_name) {
      await supabase.auth.signOut()
      setMessage("Impossible de créer ton nom d'invité. Réessaie dans un instant.")
      setGuestLoading(false)
      return
    }
    await supabase.auth.refreshSession()
    await router.push('/feed')
    setGuestLoading(false)
  }

  async function submit(e: any) {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    setMessage('')
    const cleanEmail = email.trim().toLowerCase()

    if (mode === 'forgot') {
      const redirectTo = `${window.location.origin}/reset-password`
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo })
      setMessage(error ? `Impossible d'envoyer le lien : ${error.message}` : 'Si un compte existe avec cette adresse, un e-mail de récupération vient d’être envoyé. Pense à vérifier tes courriers indésirables.')
    } else if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth` },
      })
      if (error) {
        setMessage(error.message)
      } else if (data.session && data.user) {
        await supabase.from('profiles').upsert({ id: data.user.id }, { onConflict: 'id' })
        await router.push('/feed')
      } else {
        setMessage('Ton inscription est presque terminée ! Ouvre le lien envoyé par e-mail pour confirmer ton adresse et activer ton compte.')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password })
      if (error) {
        setMessage(`Connexion impossible : ${error.message}`)
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) await supabase.from('profiles').upsert({ id: user.id }, { onConflict: 'id' })
        await router.push('/feed')
      }
    }
    setLoading(false)
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <Link href="/" className="brand"><span className="brand-mark">w</span><span>weshbien2<span className="brand-dot">.</span></span></Link>
        <h1>{mode === 'login' ? 'Content de te revoir !' : mode === 'signup' ? 'Bienvenue sur weshbien2 !' : 'Récupérer mon compte'}</h1>
        <p>{mode === 'login' ? 'Connecte-toi avec ton adresse e-mail et ton mot de passe.' : mode === 'signup' ? 'Crée ton compte personnel avec une adresse e-mail et un mot de passe.' : 'Indique l’adresse e-mail de ton compte. Nous t’enverrons un lien pour choisir un nouveau mot de passe.'}</p>
        {mode !== 'forgot' && <div className="auth-tabs" role="tablist" aria-label="Connexion ou inscription">
          <button type="button" className={mode === 'login' ? 'auth-tab active' : 'auth-tab'} onClick={() => { setMode('login'); setMessage('') }}>Connexion</button>
          <button type="button" className={mode === 'signup' ? 'auth-tab active' : 'auth-tab'} onClick={() => { setMode('signup'); setMessage('') }}>Inscription</button>
        </div>}
        <form onSubmit={submit}>
          <label className="auth-label" htmlFor="auth-email">Adresse e-mail</label>
          <input id="auth-email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Ton adresse e-mail" autoComplete="email" />
          {mode !== 'forgot' && <>
            <label className="auth-label" htmlFor="auth-password">Mot de passe</label>
            <input id="auth-password" type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} placeholder="8 caractères minimum" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
          </>}
          <button type="submit" disabled={loading}>{loading ? 'Patiente…' : mode === 'login' ? 'Me connecter →' : mode === 'signup' ? 'Créer mon compte →' : 'Envoyer le lien →'}</button>
        </form>
        {mode === 'login' && <p><button type="button" className="auth-link-button" onClick={() => { setMode('forgot'); setMessage('') }}>Mot de passe oublié ?</button></p>}
        {mode === 'forgot' && <p><button type="button" className="auth-link-button" onClick={() => { setMode('login'); setMessage('') }}>← Retour à la connexion</button></p>}
        {message && <p className="auth-message" role="status">{message}</p>}
        {mode === 'login' && <button type="button" className="auth-guest-button" onClick={continueAsGuest} disabled={guestLoading || loading}>{guestLoading ? 'Préparation…' : '👀 Continuer en invité'}</button>}
        <p className="auth-footnote">Ton compte Weshbien2 est indépendant de tout autre site.</p>
        <p><Link href="/">← Retour à l'accueil</Link></p>
      </section>
    </main>
  )
}
