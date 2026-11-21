import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Head from 'next/head'
import { Analytics } from '@vercel/analytics/next'
import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { supabase } from '../lib/supabaseClient'
import MemberAvatar from '../components/MemberAvatar'
import AnimatedBackground from '../components/AnimatedBackground'

function NavIcon({name}:{name:string}) {
 const common={width:22,height:22,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:1.8,strokeLinecap:"round" as const,strokeLinejoin:"round" as const, "aria-hidden":true as const}
 const paths:Record<string,any> = {
  home:<><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9"/><path d="M9 20v-6h6v6"/></>,
  explore:<><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2.2 5-4.8 2 2-4.8z"/></>,
  questions:<><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 8.7 3.9a8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"/></>,
  chat:<><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 8.7 3.9a8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"/></>,
  profile:<><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  bell:<><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>
 }
 return <svg {...common}>{paths[name]||paths.explore}</svg>
}
const menuItems: [string, string, string][] = [
  ['Accueil', '/feed', '⌂'], ['Weshbien IA', '/assistant', '✦'], ['18+', '/individual', '⚠'], ['Explorer', '/explore', '◉'], ['Recherche', '/search', '⌕'], ['Stories', '/stories', '◌'], ['En ligne', '/online', '●'],
  ['Amis', '/friends', '♧'], ['MeetMe', '/explore', '♡'], ['Communautés', '/communities', '▤'], ['Photos', '/photos', '▧'],
  ['Forum', '/forums', '▤'], ['Blog', '/questions', '▣'], ['Notifications', '/notifications', '♧'],
  ['Messages', '/inbox', '✉'], ['Équipe de modération', '/moderators', '🛡️'], ['Mon profil', '/profile', '♙'], ['Administration', '/admin', '♢'],
]
export default function App({ Component, pageProps }: AppProps) {
  const [notice, setNotice] = useState('')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [unread, setUnread] = useState(0)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [signedIn, setSignedIn] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState('')
  const [guestName, setGuestName] = useState('')
  const [authChecked, setAuthChecked] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const router = useRouter()
  const memberPage = router.pathname !== '/' && router.pathname !== '/auth' && router.pathname !== '/404'

  useEffect(() => {
    if (!router.isReady) return
    const publicPaths = ['/', '/auth', '/404', '/reset-password', '/account-suspended']
    if (publicPaths.includes(router.pathname)) {
      setAuthChecked(true)
      return
    }
    let active = true
    setAuthChecked(false)
    const redirectToLogin = () => {
      const next = encodeURIComponent(router.asPath || '/feed')
      router.replace('/auth?next=' + next)
    }
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      if (!data.session) redirectToLogin()
      else setAuthChecked(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active || event !== 'SIGNED_OUT' || publicPaths.includes(router.pathname)) return
      setAuthChecked(false)
      redirectToLogin()
    })
    return () => { active = false; subscription.unsubscribe() }
  }, [router.isReady, router.asPath, router.pathname])


  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    let presenceTimer: ReturnType<typeof setInterval> | undefined
    let suspensionTimer: ReturnType<typeof setInterval> | undefined
    let presenceVisibilityHandler: (() => void) | null = null
    let messagesReadHandler: (() => void) | null = null
    let channel: ReturnType<typeof supabase.channel> | null = null
    let active = true
    try {
      const saved = window.localStorage.getItem('weshbien-theme')
      const initial = saved === 'dark' ? 'dark' : 'light'
      setTheme(initial)
      document.documentElement.dataset.theme = initial
    } catch {}
    const onNotice = (event: Event) => {
      const message = (event as CustomEvent).detail
      if (typeof message !== 'string' || !message) return
      setNotice(message)
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => setNotice(''), 10000)
    }
    window.addEventListener('weshbien:notify', onNotice)

    const checkSuspension = async (userId: string) => {
      const { data, error } = await supabase.rpc('is_user_suspended', { target_id: userId })
      if (active && !error && data === true) {
        await supabase.auth.signOut({ scope: 'local' })
        await router.replace('/account-suspended')
      }
    }
    const attach = (userId: string | null) => {
      if (channel) { supabase.removeChannel(channel); channel = null }
      if (presenceTimer) { clearInterval(presenceTimer); presenceTimer = undefined }
      if (suspensionTimer) { clearInterval(suspensionTimer); suspensionTimer = undefined }
      if (presenceVisibilityHandler) { document.removeEventListener('visibilitychange', presenceVisibilityHandler); presenceVisibilityHandler = null }
      if (messagesReadHandler) { window.removeEventListener('weshbien:messages-read', messagesReadHandler); messagesReadHandler = null }
      if (!userId) { setUnread(0); setUnreadMessages(0); setAvatarUrl(null); setCurrentUserId(''); return }
      setCurrentUserId(userId)
      checkSuspension(userId)
      suspensionTimer = setInterval(() => { if (document.visibilityState === 'visible') checkSuspension(userId) }, 60000)
      supabase.from('profiles').select('avatar_url').eq('id', userId).maybeSingle().then(({ data }) => { if (active) setAvatarUrl(data?.avatar_url || null) })
      const updatePresence = () => {
        if (document.visibilityState === 'visible') {
          supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', userId).then(() => {})
        }
      }
      updatePresence()
      presenceTimer = setInterval(updatePresence, 60000)
      presenceVisibilityHandler = updatePresence
      document.addEventListener('visibilitychange', updatePresence)
      const refreshUnreadMessages = () => supabase.from('messages').select('id', { count: 'exact', head: true }).eq('recipient', userId).eq('is_read', false)
        .then(({ count, error }) => { if (active && !error) setUnreadMessages(count || 0) })
      refreshUnreadMessages()
      messagesReadHandler = () => refreshUnreadMessages()
      window.addEventListener('weshbien:messages-read', messagesReadHandler)
      const refreshUnreadNotifications = () => supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('is_read', false)
        .then(({ count, error }) => { if (active && !error) setUnread(count || 0) })
      const onNotificationsRead = () => refreshUnreadNotifications()
      window.addEventListener('weshbien:notifications-read', onNotificationsRead)
      refreshUnreadNotifications()
      let moderatorRoleChecked = false
      let isModerator = false
      const checkModeratorRole = async () => {
        if (moderatorRoleChecked) return isModerator
        const { data } = await supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle()
        isModerator = data?.role === 'moderator' || data?.role === 'admin'
        moderatorRoleChecked = true
        return isModerator
      }
      channel = supabase.channel('app-notifications-' + userId)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reports' }, async payload => {
          const report: any = payload.new
          if (!report?.id || !(await checkModeratorRole())) return
          const title = 'Nouveau signalement'
          const kind = report.content_type === 'photo' ? 'une photo' : report.content_type === 'profile' ? 'un profil' : report.content_type === 'post' ? 'une publication' : 'un contenu'
          const body = 'Un membre a signalé ' + kind + '. Motif : ' + String(report.reason || 'Non précisé').slice(0, 220)
          const { error } = await supabase.from('notifications').insert({ user_id: userId, actor_id: report.reporter_id || null, type: 'report', title, body, link: '/admin' })
          if (error) console.warn('Notification de signalement non enregistrée', error.message)
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, payload => {
          const row: any = payload.new || payload.old
          if (row?.recipient === userId || row?.sender === userId) refreshUnreadMessages()
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: 'user_id=eq.' + userId }, payload => {
          const row: any = payload.new
          onNotice(new CustomEvent('weshbien:notify', { detail: [row?.title, row?.message || row?.body].filter(Boolean).join(' — ') || 'Nouvelle notification' }))
          refreshUnreadNotifications()
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: 'user_id=eq.' + userId }, () => {
          refreshUnreadNotifications()
        }).subscribe()
    }
    supabase.auth.getUser().then(({ data }) => {
      if (active) { setSignedIn(!!data.user); setGuestName(data.user?.is_anonymous ? String(data.user.user_metadata?.display_name || 'Invité') : ''); document.documentElement.dataset.guest = data.user?.is_anonymous ? 'true' : 'false'; attach(data.user?.id || null) }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session?.user)
      setGuestName(session?.user?.is_anonymous ? String(session.user.user_metadata?.display_name || 'Invité') : '')
      document.documentElement.dataset.guest = session?.user?.is_anonymous ? 'true' : 'false'
      attach(session?.user.id || null)
    })
    return () => {
      active = false
      window.removeEventListener('weshbien:notify', onNotice)
      if (presenceVisibilityHandler) document.removeEventListener('visibilitychange', presenceVisibilityHandler)
      if (messagesReadHandler) window.removeEventListener('weshbien:messages-read', messagesReadHandler)
      subscription.unsubscribe()
      if (channel) supabase.removeChannel(channel)
      if (timer) clearTimeout(timer)
      if (presenceTimer) clearInterval(presenceTimer)
      if (suspensionTimer) clearInterval(suspensionTimer)
    }
  }, [])
  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next); document.documentElement.dataset.theme = next
    try { window.localStorage.setItem('weshbien-theme', next) } catch {}
  }
  return <>
    <Head><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" /></Head>
    <Analytics />
    <AnimatedBackground />
    <div className="global-tools global-tools-top">
      {guestName && <span className="guest-name-label">{guestName} · Consultation seule</span>}
      <button type="button" onClick={toggleTheme} aria-label="Changer le thème">{theme === 'dark' ? '☀️ Mode clair' : '🌙 Mode sombre'}</button>
    </div>
    {memberPage && signedIn && <>
      <header className="mobile-community-header">
        <button type="button" className="mobile-menu-trigger" onClick={() => setMenuOpen(true)} aria-label="Ouvrir le menu">☰</button>
        <Link href="/feed" className="mobile-brand"><span className="brand-mark">w</span></Link>{guestName && <span className="guest-name-label">{guestName}</span>}<span className="mobile-header-spacer" />
<Link href="/feed" className="mobile-home-button" aria-label="Accueil" title="Accueil"><NavIcon name="home"/></Link>
<Link href="/notifications" className="mobile-notification-button" aria-label="Notifications"><NavIcon name="bell"/>{unread > 0 && <span className="mobile-notification-count">{unread > 99 ? '99+' : unread}</span>}</Link>
        <div className="account-menu-wrap" style={{position:'relative'}}>
          <button type="button" className="mobile-user-dot" onClick={() => setAccountMenuOpen(value => !value)} aria-label="Ouvrir le menu du compte" aria-expanded={accountMenuOpen} style={{padding:0,overflow:'hidden',borderRadius:'50%',border:'2px solid var(--accent,#7c3aed)',background:'var(--surface,#fff)',width:28,height:28,minWidth:28,minHeight:28,display:'grid',placeItems:'center',cursor:'pointer'}}>
            {currentUserId ? <MemberAvatar userId={currentUserId} name="Mon profil" avatarUrl={avatarUrl} className="account-avatar-image"/> : <NavIcon name="profile" />}
          </button>
          {accountMenuOpen && <div role="menu" style={{position:'absolute',right:0,top:'calc(100% + 10px)',zIndex:1000,minWidth:180,padding:8,borderRadius:14,background:'var(--card,#fff)',border:'1px solid var(--border,#ddd)',boxShadow:'0 12px 32px #0002',display:'grid',gap:4}}>
            <Link role="menuitem" href="/profile" onClick={() => setAccountMenuOpen(false)} style={{padding:'11px 12px',borderRadius:9,textDecoration:'none',color:'inherit'}}>👤 Profil</Link>
            <Link role="menuitem" href="/settings" onClick={() => setAccountMenuOpen(false)} style={{padding:'11px 12px',borderRadius:9,textDecoration:'none',color:'inherit'}}>⚙️ Paramètres</Link>
            <button role="menuitem" type="button" onClick={async () => { setAccountMenuOpen(false); await supabase.auth.signOut(); await router.replace('/auth') }} style={{padding:'11px 12px',border:0,borderRadius:9,textAlign:'left',background:'transparent',color:'inherit',cursor:'pointer'}}>↪ Déconnexion</button>
          </div>}
        </div>
      </header>
      <header className="desktop-community-header">
        <Link href="/feed" className="desktop-brand"><span className="brand-mark">w</span><span>weshbien2.</span></Link>
        <nav className="desktop-community-nav" aria-label="Navigation principale">
          {menuItems.map(([label, href]) => <Link key={label} href={href} className={router.pathname === href ? 'active' : ''}>{label}{label === 'Notifications' && unread > 0 ? <b className="desktop-nav-count">{unread > 99 ? '99+' : unread}</b> : null}{label === 'Messages' && unreadMessages > 0 ? <b className="desktop-nav-count">{unreadMessages > 99 ? '99+' : unreadMessages}</b> : null}</Link>)}
        </nav>
        <div className="desktop-header-actions">
          <button type="button" onClick={toggleTheme} aria-label="Changer le thème">{theme === 'dark' ? '☀️' : '🌙'}</button>
          <Link href="/profile" className="desktop-profile-link"><MemberAvatar userId={currentUserId} name="Mon profil" avatarUrl={avatarUrl} className="account-avatar-image"/></Link>
          <button type="button" onClick={async () => { await supabase.auth.signOut(); await router.replace('/auth') }} aria-label="Déconnexion">↪</button>
        </div>
      </header>
      <nav className="mobile-bottom-nav" aria-label="Navigation mobile">
        <Link className={router.pathname === '/feed' ? 'selected' : ''} href="/feed"><span><NavIcon name="home"/></span>Accueil</Link>
        <Link className={router.pathname === '/explore' ? 'selected' : ''} href="/explore"><span><NavIcon name="explore"/></span>Explorer</Link>
        <Link className={router.pathname === '/online' ? 'selected' : ''} href="/online"><span><NavIcon name="explore"/></span>En ligne</Link>
        <Link className={router.pathname === '/individual' ? 'selected' : ''} href="/individual"><span aria-hidden="true">⚠️</span>18+</Link>
        <Link className={router.pathname === '/inbox' || router.pathname === '/conversation' ? 'selected' : ''} href="/inbox"><span><NavIcon name="chat"/>{unreadMessages > 0 && <b className="nav-count-badge">{unreadMessages > 99 ? '99+' : unreadMessages}</b>}</span>Chat</Link>
        <Link className={router.pathname === '/profile' ? 'selected' : ''} href="/profile"><span><NavIcon name="profile"/></span>Profil</Link>
      </nav>
      {menuOpen && <div className="mobile-drawer-backdrop" onClick={() => setMenuOpen(false)}>
        <aside className="mobile-drawer" onClick={event => event.stopPropagation()}>
          <div className="mobile-drawer-heading"><span className="brand"><span className="brand-mark">w</span>weshbien2.</span><button type="button" onClick={() => setMenuOpen(false)} aria-label="Fermer">×</button></div>
          <small>NAVIGATION</small>
          {menuItems.map(([label, href, icon]) => <Link key={label} href={href} onClick={() => setMenuOpen(false)}><span>{icon}</span>{label}{label === 'Notifications' && unread > 0 && <b className="drawer-count-badge">{unread > 99 ? '99+' : unread}</b>}{label === 'Messages' && unreadMessages > 0 && <b className="drawer-count-badge">{unreadMessages > 99 ? '99+' : unreadMessages}</b>}</Link>)}
          <button className="drawer-theme" type="button" onClick={toggleTheme}>{theme === 'dark' ? '☀️ Mode clair' : '🌙 Mode sombre'}</button>
        </aside>
      </div>}
    </>}
    {(!memberPage || authChecked) ? <Component {...pageProps} /> : <main className="auth-shell"><section className="auth-card"><p>Vérification de ta connexion…</p></section></main>}
    {notice && <button type="button" className="app-toast" role="status" aria-live="polite" onClick={() => { setNotice(''); router.push('/notifications') }}><span className="toast-icon">✓</span><span>{notice}<small>Appuie pour ouvrir tes notifications</small></span></button>}
  </>
}
