import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabaseClient'

export default function SettingsPage() {
  const [theme, setTheme] = useState<'light'|'dark'>('light')
  const [status, setStatus] = useState('')
  useEffect(() => {
    const current = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
    setTheme(current)
  }, [])
  function changeTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.dataset.theme = next
    try { localStorage.setItem('weshbien-theme', next) } catch {}
  }
  async function logout() {
    const { error } = await supabase.auth.signOut()
    if (error) setStatus('Déconnexion impossible : ' + error.message)
    else window.location.href = '/auth'
  }
  return <main className="app-shell"><section className="profile-wrap">
    <small>ESPACE PERSONNEL</small><h1>Paramètres</h1>
    <div className="card profile-form" style={{display:'grid',gap:16}}>
      <h2>Mon compte</h2>
      <Link href="/profile">👤 Modifier mon profil</Link>
      <button type="button" onClick={changeTheme}> {theme === 'dark' ? '☀️ Passer en mode clair' : '🌙 Passer en mode sombre'} </button>
      <button type="button" className="friend-secondary" onClick={logout}>↪ Déconnexion</button>
      {status && <p role="status">{status}</p>}
    </div>
  </section></main>
}
