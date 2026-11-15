import { useEffect, useState } from 'react'
import '../styles/globals.css'
import type { AppProps } from 'next/app'

export default function App({ Component, pageProps }: AppProps) {
 const [notice,setNotice]=useState('')
 useEffect(()=>{
  let timer:ReturnType<typeof setTimeout>|undefined
  const onNotice=(event:Event)=>{
   const message=(event as CustomEvent).detail
   if(typeof message!=='string'||!message)return
   setNotice(message)
   if(timer)clearTimeout(timer)
   timer=setTimeout(()=>setNotice(''),5000)
  }
  window.addEventListener('weshbien:notify',onNotice)
  return()=>{window.removeEventListener('weshbien:notify',onNotice);if(timer)clearTimeout(timer)}
 },[])
 return <><Component {...pageProps}/>{notice&&<div className="app-toast" role="status" aria-live="polite"><span className="toast-icon">✓</span><span>{notice}</span></div>}</>
}
