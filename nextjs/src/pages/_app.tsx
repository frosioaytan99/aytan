import { useEffect, useState } from 'react'
import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { supabase } from '../lib/supabaseClient'

export default function App({ Component, pageProps }: AppProps) {
 const [notice,setNotice]=useState('')
 useEffect(()=>{
  let timer:ReturnType<typeof setTimeout>|undefined
  let channel:ReturnType<typeof supabase.channel>|null=null
  let active=true
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
   channel=supabase.channel('app-notifications-'+userId)
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:'recipient=eq.'+userId},()=>onNotice(new CustomEvent('weshbien:notify',{detail:'Nouveau message reçu'})))
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'friend_requests',filter:'recipient_id=eq.'+userId},()=>onNotice(new CustomEvent('weshbien:notify',{detail:'Nouvelle demande d’ami'})))
    .subscribe()
  }
  supabase.auth.getUser().then(({data})=>{if(active)attach(data.user?.id||null)})
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>attach(session?.user.id||null))
  return()=>{active=false;window.removeEventListener('weshbien:notify',onNotice);subscription.unsubscribe();if(channel)supabase.removeChannel(channel);if(timer)clearTimeout(timer)}
 },[])
 return <><Component {...pageProps}/>{notice&&<div className="app-toast" role="status" aria-live="polite"><span className="toast-icon">✓</span><span>{notice}</span></div>}</>
}
