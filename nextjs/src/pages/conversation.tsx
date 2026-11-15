import { useEffect,useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import MemberAvatar from '../components/MemberAvatar'
type Msg={id:string;sender:string;recipient:string;subject:string|null;body:string|null;created_at:string;is_read:boolean}
export default function ConversationPage(){
 const router=useRouter(),[uid,setUid]=useState(''),[other,setOther]=useState(''),[person,setPerson]=useState<any>(null),[messages,setMessages]=useState<Msg[]>([]),[body,setBody]=useState(''),[busy,setBusy]=useState(false),[status,setStatus]=useState('')
 async function load(a:string,b:string){
  const {data,error}=await supabase.from('messages').select('id,sender,recipient,subject,body,created_at,is_read').or('and(sender.eq.'+a+',recipient.eq.'+b+'),and(sender.eq.'+b+',recipient.eq.'+a+')').order('created_at',{ascending:true})
  if(error){setStatus('Impossible de charger cette conversation.');return}
  const rows=(data||[]) as Msg[]
  setMessages(rows)
  const unreadIds=rows.filter(m=>m.recipient===a&&!m.is_read).map(m=>m.id)
  if(unreadIds.length){
   const {error:readError}=await supabase.from('messages').update({is_read:true}).in('id',unreadIds).eq('recipient',a)
   if(!readError)setMessages(current=>current.map(m=>unreadIds.includes(m.id)?{...m,is_read:true}:m))
  }
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
 useEffect(()=>{
  if(!uid||!other)return
  const channel=supabase.channel('conversation-read-'+uid+'-'+other)
   .on('postgres_changes',{event:'*',schema:'public',table:'messages'},payload=>{
    const row:any=payload.new||payload.old
    if(row&&(row.sender===uid&&row.recipient===other||row.sender===other&&row.recipient===uid))load(uid,other)
   }).subscribe()
  return()=>{supabase.removeChannel(channel)}
 },[uid,other])
 async function reportMessage(messageId:string){
  const reason=window.prompt('Pourquoi souhaites-tu signaler ce message ?')
  if(!reason||reason.trim().length<3)return
  const {error}=await supabase.from('reports').insert({reporter_id:uid,content_type:'message',content_id:messageId,reason:reason.trim().slice(0,1000),status:'pending'})
  setStatus(error?'Signalement impossible : '+error.message:'Message signalé. Merci.')
 }
 async function send(e:any){
  e.preventDefault();if(!body.trim()||!uid||!other||busy)return
  setBusy(true);const {error}=await supabase.from('messages').insert({sender:uid,recipient:other,subject:'Message',body:body.trim()})
  setBusy(false)
  if(error){setStatus(error.code==='42501'?'Vous devez être amis pour envoyer un message.':'Envoi impossible.');return}
  setBody('');setStatus('');await load(uid,other)
 }
 return <main className="app-shell"><header className="app-header"><Link className="brand" href="/">weshbien2.</Link><nav><Link href="/feed">Fil</Link><Link href="/forums">Forums</Link><Link href="/inbox" className="active">Messages</Link></nav></header><section className="conversation-page"><Link href="/inbox" className="back-link">← Retour aux conversations</Link><div className="conversation-heading"><MemberAvatar userId={other} name={person?.display_name||person?.username} avatarUrl={person?.avatar_url} className="avatar large"/><div><h1>{person?.display_name||person?.username||'Conversation'}</h1><small>@{person?.username||''}</small></div><Link href={'/profile?id='+other}>Voir le profil</Link></div><div className="conversation-history">{messages.length===0?<p className="empty">Démarre la conversation en envoyant un message.</p>:messages.map(m=><div key={m.id} className={'chat-line '+(m.sender===uid?'chat-mine':'chat-theirs')}><div className="chat-line-bubble">{m.body||m.subject}</div><small>{new Date(m.created_at).toLocaleString('fr-FR')}</small>{m.sender===uid&&<small className="message-read-status">{m.is_read?'✓✓ Lu':'✓ Envoyé'}</small>}{m.sender!==uid&&<button type="button" className="message-report" onClick={()=>reportMessage(m.id)}>⚑ Signaler</button>}</div>)}</div>{status&&<p className="notice">{status}</p>}<form className="conversation-compose" onSubmit={send}><textarea value={body} onChange={e=>setBody(e.target.value)} maxLength={3000} placeholder="Écris ton message…" required/><button disabled={busy||!body.trim()}>{busy?'Envoi…':'Envoyer →'}</button></form></section></main>
}
