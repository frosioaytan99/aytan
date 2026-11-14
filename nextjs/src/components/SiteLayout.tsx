import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'

export default function SiteLayout({ children, title = 'Aytan' }: { children: React.ReactNode; title?: string }) {
  const [email, setEmail] = useState('')
  const [ready, setReady] = useState(false)
  const router = useRouter()
  useEffect(() => {
    let alive = true
    supabase.auth.getUser().then(({ data }) => {
      if (alive) { setEmail(data.user?.email || ''); setReady(true) }
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email || '')
      setReady(true)
    })
    return () => { alive = false; listener.subscription.unsubscribe() }
  }, [])
  async function logout() { await supabase.auth.signOut(); router.push('/') }
  return <div className="app-shell">
    <header className="app-topbar">
      <Link href="/" className="brand"><span className="brand-mark">✦</span><span>aytan</span></Link>
      <nav className="app-nav">
        <Link className={router.pathname === '/feed' ? 'active' : ''} href="/feed">Accueil</Link>
        <Link className={router.pathname === '/members' ? 'active' : ''} href="/members">Découvrir</Link>
        <Link className={router.pathname === '/inbox' ? 'active' : ''} href="/inbox">Messages</Link>
        <Link className={router.pathname === '/profile' ? 'active' : ''} href="/profile">Mon profil</Link>
      </nav>
      <div className="app-account">{ready && (email ? <><span className="account-email">{email}</span><button className="text-button" onClick={logout}>Quitter</button></> : <Link className="btn btn-primary" href="/auth">Connexion</Link>)}</div>
    </header>
    <main className="app-content">
      {title && <div className="page-heading"><div><span className="page-kicker">BIENVENUE SUR AYTAN</span><h1>{title}</h1></div></div>}
      {children}
    </main>
    <footer className="app-footer">Aytan · Respect, échanges et sécurité.</footer>
    <nav className="mobile-nav">
      <Link href="/feed">⌂<span>Accueil</span></Link><Link href="/members">⌕<span>Découvrir</span></Link><Link href="/send">＋<span>Écrire</span></Link><Link href="/inbox">♡<span>Messages</span></Link><Link href="/profile">☺<span>Profil</span></Link>
    </nav>
  </div>
}
