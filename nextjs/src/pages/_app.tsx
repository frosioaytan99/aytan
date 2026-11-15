import { useEffect, useState } from 'react'
import Link from 'next/link'
import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { supabase } from '../lib/supabaseClient'

export default function App({ Component, pageProps }: AppProps) {
 const [notice,setNotice]=useState('')
 const [theme,setTheme]=useState<'light'|'dark'>('light')
 const [unread,setUnread]=useState(0)
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
      onNotice(new CustomEvent('weshbien:notify',{detail:row?.title||'Nouvelle notification'}))
      setUnread(v=>v+1)
    })
    .on('postgres_changes',{event:'UPDATE',schema:'public',table:'notifications',filter:'user_id=eq.'+userId},()=>supabase.from('notifications').select('id',{count:'exact',head:true}).eq('user_id',userId).eq('is_read',false).then(({count})=>{if(active)setUnread(count||0)}))
    .subscribe()
  }
  supabase.auth.getUser().then(({data})=>{if(active)attach(data.user?.id||null)})
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>attach(session?.user.id||null))
  return()=>{active=false;window.removeEventListener('weshbien:notify',onNotice);subscription.unsubscribe();if(channel)supabase.removeChannel(channel);if(timer)clearTimeout(timer)}
 },[])
 function toggleTheme(){
  const next=theme==='dark'?'light':'dark'
  setTheme(next)
  document.documentElement.dataset.theme=next
  try{window.localStorage.setItem('weshbien-theme',next)}catch{}
 }
 return <><Component {...pageProps}/><div className="global-tools"><Link href="/notifications" className="global-notifications" aria-label="Notifications">♧ Notifications{unread>0&&<b>{unread>99?'99+':unread}</b>}</Link><button type="button" onClick={toggleTheme} aria-label="Changer le thème">{theme==='dark'?'☀️ Mode clair':'🌙 Mode sombre'}</button></div>{notice&&<div className="app-toast" role="status" aria-live="polite"><span className="toast-icon">✓</span><span>{notice}</span></div>}</>
}
