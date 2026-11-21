import { useEffect,useMemo,useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import MemberAvatar from '../components/MemberAvatar'
type Msg={id:string;sender:string;recipient:string;subject:string|null;body:string|null;created_at:string;is_read:boolean}
export default function ConversationPage(){
 const router=useRouter(),[uid,setUid]=useState(''),[other,setOther]=useState(''),[person,setPerson]=useState<any>(null),[messages,setMessages]=useState<Msg[]>([]),[body,setBody]=useState(''),[busy,setBusy]=useState(false),[status,setStatus]=useState(''),[search,setSearch]=useState('')
 async function load(a:string,b:string){
  const {data,error}=await supabase.from('messages').select('id,sender,recipient,subject,body,created_at,is_read').or('and(sender.eq.'+a+',recipient.eq.'+b+'),and(sender.eq.'+b+',recipient.eq.'+a+')').order('created_at',{ascending:true})
  if(error){setStatus('Impossible de charger cette conversation.');return}
  const rows=(data||[]) as Msg[]
  setMessages(rows)
  const unreadIds=rows.filter(m=>m.recipient===a&&!m.is_read).map(m=>m.id)
  if(unreadIds.length){const {data:updated,error:readError}=await supabase.from('messages').update({is_read:true}).in('id',unreadIds).eq('recipient',a).select('id');if(!readError){setMessages(current=>current.map(m=>unreadIds.includes(m.id)?{...m,is_read:true}:m));if(typeof window!=='undefined')window.dispatchEvent(new Event('weshbien:messages-read'))}else{setStatus('Impossible de marquer les messages comme lus. Réessaie.')}}
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
   setUid(user.id);setOther(otherId);setPerson(p);try{setHiddenIds(JSON.parse(localStorage.getItem('weshbien-hidden-messages-'+user.id)||'[]'))}catch{};await load(user.id,otherId)
  }
  init()
  return()=>{active=false}
 },[router.isReady,router.query.with])
 useEffect(()=>{
  if(!uid||!other)return
  const channel=supabase.channel('conversation-read-'+uid+'-'+other).on('postgres_changes',{event:'*',schema:'public',table:'messages'},payload=>{
   const row:any=payload.new||payload.old
   if(row&&(row.sender===uid&&row.recipient===other||row.sender===other&&row.recipient===uid))load(uid,other)
  }).subscribe()
  return()=>{supabase.removeChannel(channel)}
 },[uid,other])
 const visibleMessages=useMemo(()=>{const q=search.trim().toLocaleLowerCase('fr-FR');return q?messages.filter(m=>(m.body||m.subject||'').toLocaleLowerCase('fr-FR').includes(q)):messages},[messages,search])
 async function messageAction(action:string,m:Msg){
  setMenuFor('')
  if(action==='save'||action==='pin'){
   const key='weshbien-message-'+action+'-'+uid
   let ids:string[]=[];try{ids=JSON.parse(localStorage.getItem(key)||'[]')}catch{}
   const next=ids.includes(m.id)?ids.filter(x=>x!==m.id):[...ids,m.id]
   localStorage.setItem(key,JSON.stringify(next));setStatus(action==='save'?'Message sauvegardé sur cet appareil.':'Message épinglé sur cet appareil.');return
  }
  if(action==='forward'){
   const {error}=await supabase.from('messages').insert({sender:uid,recipient:other,subject:'Message transféré',body:'↪ Message transféré : '+(m.body||m.subject||'')})
   setStatus(error?'Transfert impossible.':'Message transféré dans cette conversation.');if(!error)await load(uid,other);return
  }
  if(action==='edit'&&m.sender===uid){
   const value=window.prompt('Modifier le message',m.body||'');if(value===null||!value.trim())return
   const {error}=await supabase.from('messages').update({body:value.trim().slice(0,3000),updated_at:new Date().toISOString()}).eq('id',m.id).eq('sender',uid)
   setStatus(error?'Modification impossible.':'Message modifié.');if(!error)await load(uid,other);return
  }
  if(action==='hide'){
   const next=[...hiddenIds,m.id];setHiddenIds(next);try{localStorage.setItem('weshbien-hidden-messages-'+uid,JSON.stringify(next))}catch{};return
  }
  if(action==='delete'&&m.sender===uid&&window.confirm('Supprimer ce message pour tous les participants ?')){
   const {error}=await supabase.from('messages').delete().eq('id',m.id).eq('sender',uid)
   setStatus(error?'Suppression impossible.':'Message supprimé pour tous.');if(!error)await load(uid,other);return
  }
  if(action==='report'&&m.sender!==uid)await reportMessage(m.id)
 }
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
 return <main className="messenger-shell">
  <header className="messenger-topbar"><Link href="/inbox" className="messenger-close" aria-label="Retour à la messagerie">×</Link><div className="messenger-brand"><b>🔒 weshbien.com</b><span>Messenger</span></div><Link href={'/profile?id='+other} className="messenger-profile-shortcut" aria-label="Voir le profil">◎</Link></header>
  <section className="messenger-window">
   <div className="messenger-personbar"><Link href="/inbox" className="messenger-back" aria-label="Retour">←</Link><MemberAvatar userId={other} name={person?.display_name||person?.username} avatarUrl={person?.avatar_url} className="messenger-avatar" imageSize={56}/><div className="messenger-person-copy"><strong>{person?.display_name||person?.username||'Conversation'}</strong><span>@{person?.username||'membre'}</span></div><Link href={'/profile?id='+other} className="messenger-more" aria-label="Options du profil">•••</Link></div>
   <div className="messenger-search"><span>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher dans cette conversation…" aria-label="Rechercher dans cette conversation"/></div>
   <div className="messenger-history" aria-live="polite">
    {visibleMessages.filter(m=>!hiddenIds.includes(m.id)).length===0?<div className="messenger-empty">{messages.length===0?'Démarre la conversation en envoyant un message.':'Aucun message à afficher.'}</div>:visibleMessages.filter(m=>!hiddenIds.includes(m.id)).map(m=><div key={m.id} className={'messenger-message-row '+(m.sender===uid?'mine':'theirs')}><div className="messenger-bubble">{m.body||m.subject}</div><div className="messenger-meta"><time>{new Date(m.created_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</time>{m.sender===uid&&<span>{m.is_read?'✓✓ Lu':'✓ Envoyé'}</span>}<button type="button" onClick={()=>setMenuFor(menuFor===m.id?'':m.id)} aria-label="Options du message">•••</button></div>{menuFor===m.id&&<div className="messenger-message-actions"><button onClick={()=>messageAction('save',m)}>♧ Sauvegarder</button><button onClick={()=>messageAction('pin',m)}>⌖ Épingler pour moi</button><button onClick={()=>messageAction('forward',m)}>↪ Transférer</button>{m.sender===uid&&<button onClick={()=>messageAction('edit',m)}>✎ Modifier</button>}<button onClick={()=>messageAction('hide',m)}>▣ Supprimer pour moi</button>{m.sender===uid?<button className="danger" onClick={()=>messageAction('delete',m)}>▤ Supprimer pour tous</button>:<button className="danger" onClick={()=>messageAction('report',m)}>⚑ Signaler</button>}</div>}</div>)}
   </div>
   {status&&<p className="messenger-status">{status}</p>}
   <form className="messenger-compose" onSubmit={send}><textarea value={body} onChange={e=>setBody(e.target.value)} maxLength={3000} placeholder="Écris ton message…" aria-label="Écris ton message" required/><button disabled={busy||!body.trim()} aria-label="Envoyer le message">{busy?'…':'➤'}</button></form>
  </section>
 </main>
}
