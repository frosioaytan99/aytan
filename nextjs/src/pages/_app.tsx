import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Head from 'next/head'
import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { supabase } from '../lib/supabaseClient'
import MemberAvatar from '../components/MemberAvatar'
import AnimatedBackground from '../components/AnimatedBackground'
import PushNotifications from '../components/PushNotifications'

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

function WeshbienLogo() {
 return <span className="brand-mark brand-mark-royal" aria-hidden="true">
  <svg viewBox="0 0 1024 1024" role="presentation" focusable="false">
   <defs>
    <linearGradient id="wb-ribbon" x1="260" y1="230" x2="810" y2="760" gradientUnits="userSpaceOnUse"><stop stopColor="#F8B8FF"/><stop offset=".28" stopColor="#B52CFF"/><stop offset=".58" stopColor="#5100D8"/><stop offset=".82" stopColor="#E34BFF"/><stop offset="1" stopColor="#7B18F5"/></linearGradient>
    <linearGradient id="wb-gold" x1="180" y1="110" x2="470" y2="300" gradientUnits="userSpaceOnUse"><stop stopColor="#FFF7B8"/><stop offset=".25" stopColor="#FFC83D"/><stop offset=".58" stopColor="#E88B08"/><stop offset=".82" stopColor="#FFF0A0"/><stop offset="1" stopColor="#A95A00"/></linearGradient>
    <linearGradient id="wb-orbit" x1="140" y1="760" x2="900" y2="300" gradientUnits="userSpaceOnUse"><stop stopColor="#A000FF"/><stop offset=".48" stopColor="#F18BFF"/><stop offset="1" stopColor="#7D00FF"/></linearGradient>
    <filter id="wb-glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="13" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
   </defs>
   <circle cx="512" cy="520" r="430" fill="none" stroke="url(#wb-orbit)" strokeWidth="8" opacity=".8"/>
   <path d="M190 285 C255 220 310 235 345 315 L470 600 C492 652 524 640 553 580 L654 360 C685 292 730 292 765 360 L850 545 C880 610 925 600 950 535 L1010 365 C1030 310 1070 300 1100 330 L1000 680 C975 770 900 790 850 710 L710 490 C685 450 660 452 640 495 L510 720 C465 800 385 790 350 710 Z" transform="translate(30 0) scale(.9 1)" fill="url(#wb-ribbon)" stroke="#D98BFF" strokeWidth="5" filter="url(#wb-glow)"/>
   <path d="M145 260 C275 380 405 390 485 245 L510 120 L545 245 C625 390 750 380 875 260 L845 390 C720 485 600 465 510 350 C420 465 300 485 175 390 Z" fill="url(#wb-gold)" stroke="#FFE58A" strokeWidth="10" strokeLinejoin="round"/>
   <path d="M170 390 Q510 520 850 390 L830 430 Q510 555 190 430Z" fill="#C77A08" stroke="#FFE7A0" strokeWidth="8"/>
   <path d="M330 310 L365 255 L400 310 L365 350Z M490 270 L530 195 L570 270 L530 315Z M650 310 L685 255 L720 310 L685 350Z" fill="#7900D8" stroke="#FFE5FF" strokeWidth="9"/>
   <path d="M160 520 C70 650 190 800 360 870 C590 965 860 845 930 650 C990 480 900 330 790 275" fill="none" stroke="url(#wb-orbit)" strokeWidth="13" opacity=".9"/>
   <path d="M90 650 C280 790 650 650 930 430" fill="none" stroke="url(#wb-orbit)" strokeWidth="24" filter="url(#wb-glow)"/>
  </svg>
 </span>
}

const menuItems: [string, string, string][] = [
  ['Accueil', '/feed', '⌂'], ['Weshbien IA', '/assistant', '✦'], ['18+', '/individual', '⚠'], ['Explorer', '/explore', '◉'], ['Recherche', '/search', '⌕'], ['Stories', '/stories', '◌'], ['En ligne', '/online', '●'],
  ['Amis', '/friends', '♧'], ['MeetMe', '/meetme', '♡'], ['Communautés', '/communities', '▤'], ['Photos', '/photos', '▧'],
  ['Forum', '/forums', '▤'], ['Questions', '/questions', '▣'], ['Notifications', '/notifications', '♧'], ['Sécurité du compte', '/security', '🔐'],
  ['Messages', '/inbox', '✉'], ['Équipe de modération', '/moderators', '🛡️'], ['Mon profil', '/profile', '♙'], ['Administration', '/admin', '♢'],
]
export default function App({ Component, pageProps }: AppProps) {
  const [notice, setNotice] = useState('')
  const [noticeHref, setNoticeHref] = useState('/notifications')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [unread, setUnread] = useState(0)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [signedIn, setSignedIn] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [siteStats, setSiteStats] = useState({visits:0,active:0})
  const [guestName, setGuestName] = useState('')
  const [authChecked, setAuthChecked] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const router = useRouter()
  const memberPage = router.pathname !== '/' && router.pathname !== '/auth' && router.pathname !== '/404'
  const navItems = isAdmin ? [menuItems.find(item=>item[0]==='Administration')!, ...menuItems.filter(item=>item[0]!=='Administration')] : menuItems.filter(item=>item[0]!=='Administration')

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
    let unreadRefreshTimer: ReturnType<typeof setInterval> | undefined
    let incomingPollTimer: ReturnType<typeof setInterval> | undefined
    let suspensionTimer: ReturnType<typeof setInterval> | undefined
    let presenceVisibilityHandler: (() => void) | null = null
    let messagesReadHandler: (() => void) | null = null
    let notificationsReadHandler: (() => void) | null = null
    let attachedUserId: string | null | undefined = undefined
    let channel: ReturnType<typeof supabase.channel> | null = null
    let active = true
    try {
      const saved = window.localStorage.getItem('weshbien-theme')
      const initial = saved === 'dark' ? 'dark' : 'light'
      setTheme(initial)
      document.documentElement.dataset.theme = initial
    } catch {}
    const onNotice = (event: Event) => {
      const detail = (event as CustomEvent).detail
      const message = typeof detail === 'string' ? detail : detail?.message
      if (typeof message !== 'string' || !message) return
      setNotice(message)
      setNoticeHref(typeof detail?.href === 'string' ? detail.href : '/notifications')
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
      // Supabase peut émettre INITIAL_SESSION puis getUser, et des refreshs de token.
      // Ne pas recréer les canaux/requêtes si le compte connecté n'a pas changé.
      if (attachedUserId === userId) return
      attachedUserId = userId
      if (incomingPollTimer) { clearInterval(incomingPollTimer); incomingPollTimer = undefined }
      if (unreadRefreshTimer) { clearInterval(unreadRefreshTimer); unreadRefreshTimer = undefined }
      if (channel) { supabase.removeChannel(channel); channel = null }
      if (presenceTimer) { clearInterval(presenceTimer); presenceTimer = undefined }
      if (suspensionTimer) { clearInterval(suspensionTimer); suspensionTimer = undefined }
      if (presenceVisibilityHandler) { document.removeEventListener('visibilitychange', presenceVisibilityHandler); presenceVisibilityHandler = null }
      if (messagesReadHandler) { window.removeEventListener('weshbien:messages-read', messagesReadHandler); messagesReadHandler = null }
      if (notificationsReadHandler) { window.removeEventListener('weshbien:notifications-read', notificationsReadHandler); notificationsReadHandler = null }
      if (!userId) { setUnread(0); setUnreadMessages(0); setAvatarUrl(null); setCurrentUserId(''); setIsAdmin(false); setSiteStats({visits:0,active:0}); return }
      setCurrentUserId(userId)
      supabase.from('user_roles').select('role').eq('user_id',userId).maybeSingle().then(({data})=>{if(active)setIsAdmin(data?.role==='admin')})
      checkSuspension(userId)
      suspensionTimer = setInterval(() => { if (document.visibilityState === 'visible') checkSuspension(userId) }, 60000)
      supabase.from('profiles').select('avatar_url,username').eq('id', userId).maybeSingle().then(({ data }) => {
        if (!active) return
        setAvatarUrl(data?.avatar_url || null)
        // Retirer le fond « Pluie de cœurs » du compte Aytan uniquement.
        if (String(data?.username || '').trim().toLowerCase() === 'aytan') {
          let changed = false
          try {
            if (localStorage.getItem('weshbien-wallpaper') === 'hearts') { localStorage.setItem('weshbien-wallpaper', 'aurora'); changed = true }
            if (localStorage.getItem('weshbien-dark-wallpaper') === 'hearts') { localStorage.setItem('weshbien-dark-wallpaper', 'cosmos'); changed = true }
          } catch {}
          if (changed) window.dispatchEvent(new Event('weshbien:wallpaper-change'))
        }
      })
      const refreshSiteStats = () => supabase.rpc('get_site_stats').then(({data,error}) => { if(!active||error)return; const row=Array.isArray(data)?data[0]:data; setSiteStats({visits:Number(row?.total_member_visits)||0,active:Number(row?.active_members)||0}) })
      supabase.rpc('record_site_visit').then(()=>refreshSiteStats())
      const updatePresence = () => {
        if (document.visibilityState === 'visible') {
          supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', userId).then(({ error }) => {
            if (error) console.warn('Mise à jour de présence impossible', error.message)
          })
        }
      }
      updatePresence()
      presenceTimer = setInterval(updatePresence, 60000)
      presenceVisibilityHandler = updatePresence
      document.addEventListener('visibilitychange', updatePresence)
      const refreshUnreadMessages = () => supabase.from('messages').select('id', { count: 'exact', head: true }).eq('recipient', userId).eq('is_read', false)
        .then(({ count, error }) => { if (active && !error) setUnreadMessages(count || 0) })
      refreshUnreadMessages()
      // Les changements de messages sont déjà suivis par Supabase Realtime ci-dessous.
      // On évite donc une requête COUNT toutes les 10 secondes.
      messagesReadHandler = () => refreshUnreadMessages()
      window.addEventListener('weshbien:messages-read', messagesReadHandler)
      const refreshUnreadNotifications = () => supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('is_read', false)
        .then(({ count, error }) => { if (active && !error) setUnread(count || 0) })
      notificationsReadHandler = () => refreshUnreadNotifications()
      window.addEventListener('weshbien:notifications-read', notificationsReadHandler)
      refreshUnreadNotifications()
      const seenIncoming = new Set<string>()
      const notifyIncomingMessage = async (senderId: string) => {
        const { data: profile } = await supabase.from('profiles').select('display_name,username').eq('id', senderId).maybeSingle()
        if (!active) return
        const senderName = profile?.display_name || profile?.username || 'Quelqu’un'
        onNotice(new CustomEvent('weshbien:notify', { detail: { message: senderName + ' t’a envoyé un message', href: '/conversation?with=' + encodeURIComponent(senderId) } }))
      }
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
          if (payload.eventType === 'INSERT' && row?.recipient === userId && row?.sender !== userId && row?.id && !seenIncoming.has(row.id)) {
            seenIncoming.add(row.id)
            void notifyIncomingMessage(row.sender)
          }
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: 'user_id=eq.' + userId }, payload => {
          const row: any = payload.new
          onNotice(new CustomEvent('weshbien:notify', { detail: { message: [row?.title, row?.message || row?.body].filter(Boolean).join(' — ') || 'Nouvelle notification', href: row?.link || '/notifications' } }))
          refreshUnreadNotifications()
        })
.subscribe()
    }
    supabase.auth.getUser().then(({ data }) => {
      if (active) { setSignedIn(!!data.user); setGuestName(data.user?.is_anonymous ? String(data.user.user_metadata?.display_name || 'Invité') : ''); document.documentElement.dataset.guest = data.user?.is_anonymous ? 'true' : 'false'; attach(data.user?.id || null) }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if(event==='SIGNED_IN'&&session?.user&&!session.user.is_anonymous){const ua=navigator.userAgent||'';const device_type=/ipad|tablet/i.test(ua)?'Tablette':/mobile|android|iphone|ipod/i.test(ua)?'Mobile':/windows|macintosh|linux/i.test(ua)?'Ordinateur':'Autre';const browser=/edg\//i.test(ua)?'Edge':/firefox\//i.test(ua)?'Firefox':/chrome\//i.test(ua)?'Chrome':/safari\//i.test(ua)?'Safari':'Navigateur inconnu';supabase.from('account_login_history').insert({user_id:session.user.id,device_type,browser}).then(()=>{})}
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
      if (notificationsReadHandler) window.removeEventListener('weshbien:notifications-read', notificationsReadHandler)
      subscription.unsubscribe()
      if (channel) supabase.removeChannel(channel)
      if (timer) clearTimeout(timer)
      if (presenceTimer) clearInterval(presenceTimer)
      if (suspensionTimer) clearInterval(suspensionTimer)
      if (incomingPollTimer) clearInterval(incomingPollTimer)
      if (unreadRefreshTimer) clearInterval(unreadRefreshTimer)
    }
  }, [])
  useEffect(() => {
    const protectHiddenScreen = () => {
      document.documentElement.dataset.privacyHidden = document.visibilityState === 'hidden' ? 'true' : 'false'
    }
    document.addEventListener('visibilitychange', protectHiddenScreen)
    window.addEventListener('pagehide', protectHiddenScreen)
    window.addEventListener('pageshow', protectHiddenScreen)
    protectHiddenScreen()
    return () => {
      document.removeEventListener('visibilitychange', protectHiddenScreen)
      window.removeEventListener('pagehide', protectHiddenScreen)
      window.removeEventListener('pageshow', protectHiddenScreen)
      delete document.documentElement.dataset.privacyHidden
    }
  }, [])
  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next); document.documentElement.dataset.theme = next
    try { window.localStorage.setItem('weshbien-theme', next) } catch {}
  }
  return <>
    <Head><meta name="google-site-verification" content="MiAGQqrXcSge5uV8DQyKa41fieTb7QCnMuOUDyTwAF8" /><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" /><link rel="manifest" href="/manifest.json" /><meta name="theme-color" content="#7c3aed" /></Head>
    <AnimatedBackground />
    {signedIn && router.pathname === '/conversation' && <div className="private-chat-watermark" aria-hidden="true"><span>WESHBIEN2 • MESSAGE PRIVÉ • NE PAS DIFFUSER</span></div>}
    <div className="global-tools global-tools-top">
      {signedIn && <PushNotifications />}
      {guestName && <span className="guest-name-label">{guestName} · Consultation seule</span>}
      <button type="button" onClick={toggleTheme} aria-label="Changer le thème">{theme === 'dark' ? '☀️ Mode clair' : '🌙 Mode sombre'}</button>
    </div>
    {memberPage && signedIn && <>
      <aside className="desktop-community-header" aria-label="Menu principal">
        <Link prefetch={false} href="/feed" className="desktop-brand" aria-label="Weshbien2, accueil"><WeshbienLogo /><span>weshbien2.</span></Link>
        <div className="desktop-menu-caption">MENU PRINCIPAL</div>
        <nav className="desktop-community-nav" aria-label="Navigation principale">
          {navItems.map(([label,href,icon])=><Link prefetch={false} key={label} href={href} className={router.pathname===href?'active':''}><span aria-hidden="true">{icon}</span><span className="desktop-nav-label">{label}</span>{label==='Messages'&&unreadMessages>0&&<b className="desktop-nav-count">{unreadMessages>99?'99+':unreadMessages}</b>}{label==='Notifications'&&unread>0&&<b className="desktop-nav-count">{unread>99?'99+':unread}</b>}</Link>)}
        </nav>
        <div className="desktop-header-actions">
          <Link prefetch={false} href="/profile" className="desktop-profile-link" aria-label="Mon profil" title="Mon profil">{currentUserId?<MemberAvatar userId={currentUserId} name="Mon profil" avatarUrl={avatarUrl} className="account-avatar-image"/>:<NavIcon name="profile"/>}<span>Mon profil</span></Link>
          <Link prefetch={false} href="/settings" className="desktop-settings-link">⚙️ <span>Paramètres</span></Link>
          <button type="button" onClick={toggleTheme} aria-label="Changer le thème" title="Changer le thème">{theme==='dark'?'☀️':'🌙'} <span>{theme==='dark'?'Mode clair':'Mode sombre'}</span></button>
        </div>
      </aside>
      <header className="mobile-community-header">
        <button type="button" className="mobile-menu-trigger" onClick={() => setMenuOpen(true)} aria-label="Ouvrir le menu">☰</button>
        <Link prefetch={false} href="/feed" className="mobile-brand"><WeshbienLogo /></Link>{guestName && <span className="guest-name-label">{guestName}</span>}<span className="mobile-header-spacer" />
<Link prefetch={false} href="/feed" className="mobile-home-button" aria-label="Accueil" title="Accueil"><NavIcon name="home"/></Link>
<Link prefetch={false} href="/notifications" className="mobile-notification-button" aria-label="Notifications"><NavIcon name="bell"/>{unread > 0 && <span className="mobile-notification-count">{unread > 99 ? '99+' : unread}</span>}</Link>
        <Link prefetch={false} href="/inbox" className="mobile-chat-button" aria-label="Messages"><NavIcon name="chat"/>{unreadMessages > 0 && <i aria-hidden="true"/>}</Link>
        <div className="account-menu-wrap" style={{position:'relative'}}>
          <button type="button" className="mobile-user-dot" onClick={() => setAccountMenuOpen(value => !value)} aria-label="Ouvrir le menu du compte" aria-expanded={accountMenuOpen} style={{padding:0,overflow:'hidden',borderRadius:'50%',border:'2px solid var(--accent,#7c3aed)',background:'var(--surface,#fff)',width:28,height:28,minWidth:28,minHeight:28,display:'grid',placeItems:'center',cursor:'pointer'}}>
            {currentUserId ? <MemberAvatar userId={currentUserId} name="Mon profil" avatarUrl={avatarUrl} className="account-avatar-image"/> : <NavIcon name="profile" />}
          </button>
          {accountMenuOpen && <div role="menu" style={{position:'absolute',right:0,top:'calc(100% + 10px)',zIndex:1000,minWidth:180,padding:8,borderRadius:14,background:'var(--card,#fff)',border:'1px solid var(--border,#ddd)',boxShadow:'0 12px 32px #0002',display:'grid',gap:4}}>
            <Link prefetch={false} role="menuitem" href="/profile" onClick={() => setAccountMenuOpen(false)} style={{padding:'11px 12px',borderRadius:9,textDecoration:'none',color:'inherit'}}>👤 Profil</Link>
            <Link prefetch={false} role="menuitem" href="/settings" onClick={() => setAccountMenuOpen(false)} style={{padding:'11px 12px',borderRadius:9,textDecoration:'none',color:'inherit'}}>⚙️ Paramètres</Link>
            <button role="menuitem" type="button" onClick={async () => { setAccountMenuOpen(false); await supabase.auth.signOut(); await router.replace('/auth') }} style={{padding:'11px 12px',border:0,borderRadius:9,textAlign:'left',background:'transparent',color:'inherit',cursor:'pointer'}}>↪ Déconnexion</button>
          </div>}
        </div>
      </header>
      <nav className="mobile-bottom-nav" aria-label="Navigation mobile">
        <Link prefetch={false} className={router.pathname === '/feed' ? 'selected' : ''} href="/feed"><span><NavIcon name="home"/></span>Accueil</Link>
        <Link prefetch={false} className={router.pathname === '/explore' ? 'selected' : ''} href="/explore"><span><NavIcon name="explore"/></span>Explorer</Link>
        <Link prefetch={false} className={router.pathname === '/online' ? 'selected' : ''} href="/online"><span><NavIcon name="explore"/></span>En ligne</Link>
        <Link prefetch={false} className={router.pathname === '/individual' ? 'selected' : ''} href="/individual"><span aria-hidden="true">⚠️</span>18+</Link>
        <Link prefetch={false} className={router.pathname === '/inbox' || router.pathname === '/conversation' ? 'selected' : ''} href="/inbox"><span><NavIcon name="chat"/>{unreadMessages > 0 && <i className="chat-unread-dot" aria-label="Messages non lus"/>}</span>Chat</Link>
        <Link prefetch={false} className={router.pathname === '/profile' ? 'selected' : ''} href="/profile"><span><NavIcon name="profile"/></span>Profil</Link>
      </nav>
      {menuOpen && <div className="mobile-drawer-backdrop" onClick={() => setMenuOpen(false)}>
        <aside className="mobile-drawer" onClick={event => event.stopPropagation()}>
          <div className="mobile-drawer-heading"><span className="brand"><WeshbienLogo />weshbien2.</span><button type="button" onClick={() => setMenuOpen(false)} aria-label="Fermer">×</button></div>
          <small>NAVIGATION</small>
          {navItems.map(([label, href, icon]) => <Link prefetch={false} key={label} href={href} onClick={() => setMenuOpen(false)}><span>{icon}</span>{label}{label === 'Notifications' && unread > 0 && <b className="drawer-count-badge">{unread > 99 ? '99+' : unread}</b>}{label === 'Messages' && unreadMessages > 0 && <b className="drawer-count-badge">{unreadMessages > 99 ? '99+' : unreadMessages}</b>}</Link>)}
          <button className="drawer-theme" type="button" onClick={toggleTheme}>{theme === 'dark' ? '☀️ Mode clair' : '🌙 Mode sombre'}</button>
        </aside>
      </div>}
    </>}
    {(!memberPage || authChecked) ? <Component {...pageProps} /> : <main className="auth-shell"><section className="auth-card"><p>Vérification de ta connexion…</p></section></main>}
    <footer className="global-footer"><span>© Weshbien2</span><span>👁 {siteStats.visits.toLocaleString("fr-FR")} visites membres</span><span>🟢 {siteStats.active} membre{siteStats.active>1?"s":""} en ligne</span><Link prefetch={false} href="/guide">Mode d’emploi complet</Link><Link prefetch={false} href="/moderators">Équipe de modération</Link><Link prefetch={false} href="/profile">Mon profil</Link></footer>
    {notice && <div className="app-toast" role="status" aria-live="polite"><span className="toast-icon" aria-hidden="true">ⓘ</span><div className="toast-content"><span className="toast-message">{notice}</span><button type="button" className="toast-view" onClick={() => { setNotice(''); void router.push(noticeHref) }}>Voir</button></div><button type="button" className="toast-close" aria-label="Fermer la notification" onClick={() => setNotice('')}>×</button></div>}
  </>
}
