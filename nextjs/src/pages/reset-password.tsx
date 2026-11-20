import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) setReady(true)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (active && (event === 'PASSWORD_RECOVERY' || session)) setReady(true)
    })
    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  async function submit(e: any) {
    e.preventDefault()
    if (loading) return
    if (password.length < 8) {
      setMessage('Choisis un mot de passe de 8 caractères minimum.')
      return
    }
    if (password !== confirm) {
      setMessage('Les deux mots de passe ne correspondent pas.')
      return
    }
    setLoading(true)
    setMessage('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setMessage(`Impossible de modifier le mot de passe : ${error.message}`)
      setLoading(false)
      return
    }
    setMessage('Ton mot de passe a été modifié. Tu peux maintenant te connecter.')
    await supabase.auth.signOut()
    setLoading(false)
    setTimeout(() => router.push('/auth'), 1800)
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <Link href="/" className="brand"><span className="brand-mark">w</span><span>weshbien2<span className="brand-dot">.</span></span></Link>
        <h1>Nouveau mot de passe</h1>
        {!ready ? <p>Ouvre le lien de récupération reçu par e-mail sur cet appareil. S’il a expiré, demande-en un nouveau depuis la page de connexion.</p> : <>
          <p>Choisis un nouveau mot de passe pour ton compte Weshbien2.</p>
          <form onSubmit={submit}>
            <label className="auth-label" htmlFor="new-password">Nouveau mot de passe</label>
            <input id="new-password" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="8 caractères minimum" />
            <label className="auth-label" htmlFor="confirm-password">Confirmer le mot de passe</label>
            <input id="confirm-password" type="password" required minLength={8} autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Retape ton mot de passe" />
            <button type="submit" disabled={loading}>{loading ? 'Modification…' : 'Enregistrer le nouveau mot de passe →'}</button>
          </form>
        </>}
        {message && <p className="auth-message" role="status">{message}</p>}
        <p><Link href="/auth">← Retour à la connexion</Link></p>
      </section>
    </main>
  )
}
