import { useEffect,useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
type Msg={id:string;sender:string;recipient:string;subject:string|null;body:string|null;created_at:string}
export default function ConversationPage(){
 const router=useRouter(),[uid,setUid]=useState(''),[other,setOther]=useState(''),[person,setPerson]=useState<any>(null),[messages,setMessages]=useState<Msg[]>([]),[body,setBody]=useState(''),[busy,setBusy]=useState(false),[status,setStatus]=useState('')
 async function load(a:string,b:string){
  const {data,error}=await supabase.from('messages').select('id,sender,recipient,subject,body,created_at').or('and(sender.eq.'+a+',recipient.eq.'+b+'),and(sender.eq.'+b+',recipient.eq.'+a+')').order('created_at',{ascending:true})
  if(error){setStatus('Impossible de charger cette conversation.');return}
  setMessages((data||[]) as Msg[])
  await supabase.from('messages').update({is_read:true}).eq('recipient',a).eq('sender',b).eq('is_read',false)
 }
 useEffect(()=>{
  if(!router.isReady||typeof router.query.with!=='string')return
  let active=true
  async function init(){
   const {data:{user}}=await supabase.auth.getUser()
   if(!user){await router.replace('/auth');return}
   const otherId=router.query.with as string
   if(otherId===user.id){setStatus('Conversation invalide.');return}
   const {data:p}=await supabase.from('profiles').select('id,username,display_name,avatar_url').eq('id',otherId).maybeSingle()
   if(!active)return
   if(!p){setStatus('Ce profil est introuvable ou inaccessible.');return}
   setUid(user.id);setOther(otherId);setPerson(p);await load(user.id,otherId)
  }
  init()
  return()=>{active=false}
 },[router.isReady,router.query.with])
 async function send(e:any){
  e.preventDefault();if(!body.trim()||!uid||!other||busy)return
  setBusy(true);const {error}=await supabase.from('messages').insert({sender:uid,recipient:other,subject:'Message',body:body.trim()})
  setBusy(false)
  if(error){setStatus(error.code==='42501'?'Vous devez être amis pour envoyer un message.':'Envoi impossible.');return}
  setBody('');setStatus('');await load(uid,other)
 }
 return <main className="app-shell"><header className="app-header"><Link className="brand" href="/">weshbien2.</Link><nav><Link href="/feed">Fil</Link><Link href="/forums">Forums</Link><Link href="/inbox" className="active">Messages</Link></nav></header><section className="conversation-page"><Link href="/inbox" className="back-link">← Retour aux conversations</Link><div className="conversation-heading"><div className="avatar large">{(person?.display_name||person?.username||'W').slice(0,1).toUpperCase()}</div><div><h1>{person?.display_name||person?.username||'Conversation'}</h1><small>@{person?.username||''}</small></div><Link href={'/profile?id='+other}>Voir le profil</Link></div><div className="conversation-history">{messages.length===0?<p className="empty">Démarre la conversation en envoyant un message.</p>:messages.map(m=><div key={m.id} className={'chat-line '+(m.sender===uid?'chat-mine':'chat-theirs')}><div className="chat-line-bubble">{m.body||m.subject}</div><small>{new Date(m.created_at).toLocaleString('fr-FR')}</small></div>)}</div>{status&&<p className="notice">{status}</p>}<form className="conversation-compose" onSubmit={send}><textarea value={body} onChange={e=>setBody(e.target.value)} maxLength={3000} placeholder="Écris ton message…" required/><button disabled={busy||!body.trim()}>{busy?'Envoi…':'Envoyer →'}</button></form></section></main>
}
