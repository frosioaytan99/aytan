import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { supabase } from '../lib/supabaseClient'

export default function App({ Component, pageProps }: AppProps) {
 const [notice,setNotice]=useState('')
 const [theme,setTheme]=useState<'light'|'dark'>('light')
 const [unread,setUnread]=useState(0)
 const [menuOpen,setMenuOpen]=useState(false)
 const [signedIn,setSignedIn]=useState(false)
 const router=useRouter()
 const memberPage=router.pathname!=='/'&&router.pathname!=='/auth'&&router.pathname!=='/404'
 useEffect(()=>{
  let timer:ReturnType<typeof setTimeout>|undefined
  let channel:ReturnType<typeof supabase.channel>|null=null
  let active=true
  try {
   const saved=window.localStorage.getItem('weshbien-theme')
   const initial=saved==='dark'?'dark':'light'
   setTheme(initial)
   document.documentElement.dataset.theme=initial
  } catch {}
  const onNotice=(event:Event)=>{
   const message=(event as CustomEvent).detail
   if(typeof message!=='string'||!message)return
   setNotice(message)
   if(timer)clearTimeout(timer)
   timer=setTimeout(()=>setNotice(''),5000)
  }
  window.addEventListener('weshbien:notify',onNotice)
  const attach=(userId:string|null)=>{
   if(channel){supabase.removeChannel(channel);channel=null}
   if(!userId)return
   supabase.from('notifications').select('id',{count:'exact',head:true}).eq('user_id',userId).eq('is_read',false).then(({count})=>{if(active)setUnread(count||0)})
   channel=supabase.channel('app-notifications-'+userId)
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:'user_id=eq.'+userId},payload=>{
      const row:any=payload.new
      onNotice(new CustomEvent('weshbien:notify',{detail:[row?.title,row?.message||row?.body].filter(Boolean).join(' — ')||'Nouvelle notification'}))
      setUnread(v=>v+1)
    })
    .on('postgres_changes',{event:'UPDATE',schema:'public',table:'notifications',filter:'user_id=eq.'+userId},()=>supabase.from('notifications').select('id',{count:'exact',head:true}).eq('user_id',userId).eq('is_read',false).then(({count})=>{if(active)setUnread(count||0)}))
    .subscribe()
  }
  supabase.auth.getUser().then(({data})=>{if(active){setSignedIn(!!data.user);attach(data.user?.id||null)}})
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{setSignedIn(!!session?.user);attach(session?.user.id||null)})
  return()=>{active=false;window.removeEventListener('weshbien:notify',onNotice);subscription.unsubscribe();if(channel)supabase.removeChannel(channel);if(timer)clearTimeout(timer)}
 },[])
 function toggleTheme(){
  const next=theme==='dark'?'light':'dark'
  setTheme(next)
  document.documentElement.dataset.theme=next
  try{window.localStorage.setItem('weshbien-theme',next)}catch{}
 }
 return <><div className="global-tools global-tools-top"><Link href="/notifications" className="global-notifications" aria-label="Notifications">♧ Notifications{unread>0&&<b>{unread>99?'99+':unread}</b>}</Link><button type="button" onClick={toggleTheme} aria-label="Changer le thème">{theme==='dark'?'☀️ Mode clair':'🌙 Mode sombre'}</button></div>{memberPage&&signedIn&&<><header className="mobile-community-header"><button type="button" className="mobile-menu-trigger" onClick={()=>setMenuOpen(true)} aria-label="Ouvrir le menu">☰</button><Link href="/feed" className="mobile-brand"><span className="brand-mark">w</span></Link><span className="mobile-header-spacer"/><Link href="/notifications" className="mobile-header-icon" aria-label="Notifications">♧{unread>0&&<i>{unread>9?'9+':unread}</i>}</Link><Link href="/inbox" className="mobile-header-icon" aria-label="Messages">♡</Link><Link href="/profile" className="mobile-user-dot">W</Link></header><nav className="mobile-bottom-nav" aria-label="Navigation mobile"><Link className={router.pathname==='/feed'?'selected':''} href="/feed"><span>⌂</span>Accueil</Link><Link className={router.pathname==='/explore'?'selected':''} href="/explore"><span>◉</span>Explorer</Link><Link className={router.pathname==='/questions'?'selected':''} href="/questions"><span>▣</span>Questions</Link><Link className={router.pathname==='/inbox'||router.pathname==='/conversation'?'selected':''} href="/inbox"><span>▢{unread>0&&<i/>}</span>Chat</Link><Link className={router.pathname==='/profile'?'selected':''} href="/profile"><span>♙</span>Profil</Link></nav>{menuOpen&&<div className="mobile-drawer-backdrop" onClick={()=>setMenuOpen(false)}><aside className="mobile-drawer" onClick={e=>e.stopPropagation()}><div className="mobile-drawer-heading"><span className="brand"><span className="brand-mark">w</span>weshbien2.</span><button onClick={()=>setMenuOpen(false)} aria-label="Fermer">×</button></div><small>NAVIGATION</small>{[['Accueil','/feed','⌂'],['Explorer','/explore','◉'],['En ligne','/online','◉'],['Amis','/friends','♧'],['MeetMe','/explore','♡'],['Photos','/feed','▧'],['Forum','/forums','▤'],['Blog','/questions','▣'],['Notifications','/notifications','♧'],['Messages','/inbox','✉'],['Mon profil','/profile','♙'],['Administration','/admin','♢']].map(([label,href,icon])=><Link key={label} href={href} onClick={()=>setMenuOpen(false)}><span>{icon}</span>{label}</Link>)}<button className="drawer-theme" onClick={toggleTheme}>{theme==='dark'?'☀️ Mode clair':'🌙 Mode sombre'}</button></aside></div></> }<Component {...pageProps}/>{notice&&<div className="app-toast" role="status" aria-live="polite"><span className="toast-icon">✓</span><span>{notice}</span></div>}</>
}
