import { useEffect,useMemo,useRef,useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import MemberAvatar from '../components/MemberAvatar'
type Msg={id:string;sender:string;recipient:string;subject:string|null;body:string|null;created_at:string;is_read:boolean;attachment_path?:string|null;attachment_type?:'image'|'audio'|null;attachment_url?:string|null}
type Reaction={id:string;message_id:string;user_id:string;emoji:string}
export default function ConversationPage(){
 const historyRef=useRef<HTMLDivElement|null>(null),imageInputRef=useRef<HTMLInputElement|null>(null),audioInputRef=useRef<HTMLInputElement|null>(null),hasInitialScroll=useRef(false),typingChannelRef=useRef<ReturnType<typeof supabase.channel>|null>(null),typingStopTimer=useRef<ReturnType<typeof setTimeout>|null>(null),lastTypingSent=useRef(0)
 const router=useRouter(),[uid,setUid]=useState(''),[other,setOther]=useState(''),[person,setPerson]=useState<any>(null),[presenceLastSeen,setPresenceLastSeen]=useState<string|null>(null),[messages,setMessages]=useState<Msg[]>([]),[reactions,setReactions]=useState<Reaction[]>([]),[body,setBody]=useState(''),[replyTo,setReplyTo]=useState<Msg|null>(null),[busy,setBusy]=useState(false),[status,setStatus]=useState(''),[search,setSearch]=useState(''),[menuFor,setMenuFor]=useState(''),[hiddenIds,setHiddenIds]=useState<string[]>([]),[uploading,setUploading]=useState(false),[editingId,setEditingId]=useState(''),[editDraft,setEditDraft]=useState(''),[emojiOpen,setEmojiOpen]=useState(false),[otherTyping,setOtherTyping]=useState(false)
 async function load(a:string,b:string){
  const {data,error}=await supabase.from('messages').select('id,sender,recipient,subject,body,created_at,is_read,attachment_path,attachment_type').or('and(sender.eq.'+a+',recipient.eq.'+b+'),and(sender.eq.'+b+',recipient.eq.'+a+')').order('created_at',{ascending:true})
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
   const {data:p}=await supabase.from('profiles').select('id,username,display_name,avatar_url,last_seen_at').eq('id',otherId).maybeSingle()
   if(!active)return
   if(!p){setStatus('Ce profil est introuvable ou inaccessible.');return}
   setUid(user.id);setOther(otherId);setPerson(p);setPresenceLastSeen(p.last_seen_at||null);try{setHiddenIds(JSON.parse(localStorage.getItem('weshbien-hidden-messages-'+user.id)||'[]'))}catch{};await load(user.id,otherId)
  }
  init()
  return()=>{active=false}
 },[router.isReady,router.query.with])
 useEffect(()=>{
  if(!other)return
  let active=true
  const refreshPresence=async()=>{const {data}=await supabase.from('profiles').select('last_seen_at').eq('id',other).maybeSingle();if(active&&data)setPresenceLastSeen(data.last_seen_at||null)}
  const timer=setInterval(refreshPresence,30000)
  return()=>{active=false;clearInterval(timer)}
 },[other])
 const presenceLabel=()=>{if(!presenceLastSeen)return 'Hors ligne';const elapsed=Date.now()-new Date(presenceLastSeen).getTime();if(!Number.isFinite(elapsed)||elapsed<0)return 'Hors ligne';if(elapsed<=120000)return '● En ligne';const minutes=Math.floor(elapsed/60000);if(minutes<60)return 'Actif il y a '+minutes+' min';const hours=Math.floor(minutes/60);if(hours<24)return 'Actif il y a '+hours+' h';return 'Vu le '+new Date(presenceLastSeen).toLocaleDateString('fr-FR')}
 useEffect(()=>{
  if(!uid||!other)return
  const channel=supabase.channel('conversation-read-'+[uid,other].sort().join('-'))
   .on('broadcast',{event:'typing'},({payload})=>{if(payload?.user_id!==other)return;setOtherTyping(!!payload.is_typing);if(typingStopTimer.current)clearTimeout(typingStopTimer.current);if(payload.is_typing)typingStopTimer.current=setTimeout(()=>setOtherTyping(false),2800)})
   .on('postgres_changes',{event:'*',schema:'public',table:'message_reactions'},()=>load(uid,other)).on('postgres_changes',{event:'*',schema:'public',table:'messages'},payload=>{
   const row:any=payload.new||payload.old
   if(row&&(row.sender===uid&&row.recipient===other||row.sender===other&&row.recipient===uid))load(uid,other)
  }).subscribe()
  typingChannelRef.current=channel
  return()=>{if(typingStopTimer.current)clearTimeout(typingStopTimer.current);typingChannelRef.current=null;setOtherTyping(false);supabase.removeChannel(channel)}
 },[uid,other])
 const visibleMessages=useMemo(()=>{const q=search.trim().toLocaleLowerCase('fr-FR');return q?messages.filter(m=>(m.body||m.subject||'').toLocaleLowerCase('fr-FR').includes(q)):messages},[messages,search])
 useEffect(()=>{
  const el=historyRef.current
  if(!el)return
  const nearBottom=el.scrollHeight-el.scrollTop-el.clientHeight<160
  if(!hasInitialScroll.current||nearBottom){
   requestAnimationFrame(()=>{el.scrollTop=el.scrollHeight})
   hasInitialScroll.current=true
  }
 },[visibleMessages.length])
 async function toggleReaction(m:Msg,emoji:string){
  if(!uid)return
  const existing=reactions.find(r=>r.message_id===m.id&&r.user_id===uid)
  if(existing?.emoji===emoji){
   const {error}=await supabase.from('message_reactions').delete().eq('id',existing.id).eq('user_id',uid)
   if(error){setStatus('Impossible de retirer la réaction.');return}
   setReactions(current=>current.filter(r=>r.id!==existing.id));return
  }
  const {data,error}=await supabase.from('message_reactions').upsert({message_id:m.id,user_id:uid,emoji},{onConflict:'message_id,user_id'}).select('id,message_id,user_id,emoji').single()
  if(error){setStatus('Impossible d’ajouter la réaction : '+error.message);return}
  setReactions(current=>[...current.filter(r=>r.message_id!==m.id||r.user_id!==uid),data as Reaction])
 }
 async function messageAction(action:string,m:Msg){
  setMenuFor('')
  if(action==='save'||action==='pin'){
   const key='weshbien-message-'+action+'-'+uid
   let ids:string[]=[];try{ids=JSON.parse(localStorage.getItem(key)||'[]')}catch{}
   const next=ids.includes(m.id)?ids.filter(x=>x!==m.id):[...ids,m.id]
   localStorage.setItem(key,JSON.stringify(next));setStatus(action==='save'?'Message sauvegardé sur cet appareil.':'Message épinglé sur cet appareil.');return
  }
  if(action==='reply'){setReplyTo(m);setBody('');setMenuFor('');setStatus('');return}
  if(action==='forward'){
   const {error}=await supabase.from('messages').insert({sender:uid,recipient:other,subject:'Message transféré',body:'↪ Message transféré : '+(m.body||m.subject||'')})
   setStatus(error?'Transfert impossible.':'Message transféré dans cette conversation.');if(!error)await load(uid,other);return
  }
  if(action==='edit'&&m.sender===uid){setEditingId(m.id);setEditDraft(m.body||'');setStatus('');return}
  if(action==='hide'){
   const next=[...hiddenIds,m.id];setHiddenIds(next);try{localStorage.setItem('weshbien-hidden-messages-'+uid,JSON.stringify(next))}catch{};return
  }
  if(action==='delete'&&m.sender===uid&&window.confirm('Supprimer ce message pour tous les participants ?')){
   const {error}=await supabase.from('messages').delete().eq('id',m.id).eq('sender',uid)
   setStatus(error?'Suppression impossible.':'Message supprimé pour tous.');if(!error)await load(uid,other);return
  }
  if(action==='report'&&m.sender!==uid)await reportMessage(m.id)
 }
 async function saveMessageEdit(){
  const value=editDraft.trim();if(!editingId||!value||!uid)return
  setBusy(true);const {data,error}=await supabase.from('messages').update({body:value.slice(0,3000),updated_at:new Date().toISOString()}).eq('id',editingId).eq('sender',uid).select('id,body').maybeSingle()
  setBusy(false)
  if(error){setStatus('Modification impossible : '+error.message);return}
  if(!data){setStatus('Modification refusée : vérifie que tu es bien l’auteur du message.');return}
  setMessages(current=>current.map(item=>item.id===editingId?{...item,body:data.body}:item));setEditingId('');setEditDraft('');setStatus('Message modifié.')
 }
 async function reportMessage(messageId:string){
  const reason=window.prompt('Pourquoi souhaites-tu signaler ce message ?')
  if(!reason||reason.trim().length<3)return
  const {error}=await supabase.from('reports').insert({reporter_id:uid,content_type:'message',content_id:messageId,reason:reason.trim().slice(0,1000),status:'pending'})
  setStatus(error?'Signalement impossible : '+error.message:'Message signalé. Merci.')
 }
 async function sendAttachment(file:File,type:'image'|'audio'){
  if(!uid||!other||uploading)return
  const allowed=type==='image'?['image/jpeg','image/png','image/webp','image/gif']:['audio/mpeg','audio/mp4','audio/aac','audio/ogg','audio/wav','audio/webm','audio/x-m4a']
  const max=type==='image'?8*1024*1024:15*1024*1024
  if(!allowed.includes(file.type)){setStatus(type==='image'?'Format photo non accepté.':'Format audio non accepté.');return}
  if(file.size>max){setStatus(type==='image'?'Photo trop volumineuse (8 Mo maximum).':'Musique trop volumineuse (15 Mo maximum).');return}
  setUploading(true);setStatus('Envoi du fichier…')
  const ext=file.name.split('.').pop()?.toLowerCase()||(type==='image'?'jpg':'mp3')
  const path=uid+'/'+other+'/'+Date.now()+'-'+Math.random().toString(36).slice(2)+'.'+ext
  const {error:uploadError}=await supabase.storage.from('chat-attachments').upload(path,file,{contentType:file.type,upsert:false})
  if(uploadError){setUploading(false);setStatus("Envoi impossible : "+uploadError.message);return}
  const {error}=await supabase.from('messages').insert({sender:uid,recipient:other,subject:type==='image'?'Photo':'Musique',body:null,attachment_path:path,attachment_type:type})
  if(error){await supabase.storage.from('chat-attachments').remove([path]);setUploading(false);setStatus("Envoi impossible : "+error.message);return}
  setUploading(false);setStatus('');await load(uid,other)
 }
 async function send(e:any){
  e.preventDefault();if(!body.trim()||!uid||!other||busy)return
  setBusy(true);const quoted=replyTo?'↪ Réponse à '+(replyTo.sender===uid?'ton message':'son message')+' : « '+(replyTo.body||replyTo.subject||'').replace(/\s+/g,' ').slice(0,240)+' »\n\n':'';const {error}=await supabase.from('messages').insert({sender:uid,recipient:other,subject:'Message',body:quoted+body.trim()})
  setBusy(false)
  if(error){setStatus(error.code==='42501'?'Vous devez être amis pour envoyer un message.':'Envoi impossible.');return}
  setBody('');setReplyTo(null);setStatus('');await load(uid,other)
 }
 return <main className="messenger-shell">
  <header className="messenger-topbar"><Link href="/inbox" className="messenger-close" aria-label="Retour à la messagerie">×</Link><div className="messenger-brand"><b>🔒 weshbien.com</b><span>Messenger</span></div><Link href={'/profile?id='+other} className="messenger-profile-shortcut" aria-label="Voir le profil">◎</Link></header>
  <section className="messenger-window">
   <div className="messenger-personbar"><Link href="/inbox" className="messenger-back" aria-label="Retour">←</Link><MemberAvatar userId={other} name={person?.display_name||person?.username} avatarUrl={person?.avatar_url} className="messenger-avatar" imageSize={56}/><div className="messenger-person-copy"><strong>{person?.display_name||person?.username||'Conversation'}</strong><span>@{person?.username||'membre'} · {presenceLabel()}</span></div><Link href={'/profile?id='+other} className="messenger-more" aria-label="Options du profil">•••</Link></div>
   {otherTyping&&<div className="messenger-typing" role="status" aria-live="polite">{person?.display_name||person?.username||'Cette personne'} est en train d’écrire<span className="typing-dots"><i></i><i></i><i></i></span></div>}
   <div className="messenger-search"><span>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher dans cette conversation…" aria-label="Rechercher dans cette conversation"/></div>
   <div ref={historyRef} className="messenger-history" aria-live="polite">
    {visibleMessages.filter(m=>!hiddenIds.includes(m.id)).length===0?<div className="messenger-empty">{messages.length===0?'Démarre la conversation en envoyant un message.':'Aucun message à afficher.'}</div>:visibleMessages.filter(m=>!hiddenIds.includes(m.id)).map(m=><div key={m.id} className={'messenger-message-row '+(m.sender===uid?'mine':'theirs')}><div className="messenger-bubble">{m.attachment_type==='image'&&m.attachment_url?<a href={m.attachment_url} target="_blank" rel="noreferrer"><img src={m.attachment_url} alt="Photo envoyée" style={{display:'block',maxWidth:'min(100%,280px)',maxHeight:360,borderRadius:12,objectFit:'contain'}}/></a>:m.attachment_type==='audio'&&m.attachment_url?<div style={{minWidth:220}}><div style={{marginBottom:8}}>🎵 Musique</div><audio controls preload="none" src={m.attachment_url} style={{maxWidth:'100%'}}/></div>:(editingId===m.id?<div className="message-edit-box"><textarea value={editDraft} onChange={e=>setEditDraft(e.target.value)} maxLength={3000}/><div>{['😀','😂','🥰','😍','😊','😉','😎','😭','😡','❤️','🔥','👍','👎','🙏','🎉','💯'].map(emoji=><button type="button" key={emoji} onClick={()=>setEditDraft(v=>v+emoji)}>{emoji}</button>)}</div><button type="button" disabled={busy||!editDraft.trim()} onClick={saveMessageEdit}>Enregistrer</button><button type="button" onClick={()=>{setEditingId('');setEditDraft('')}}>Annuler</button></div>:(m.body||m.subject))}</div><div className="messenger-reactions">{['❤️','😂','😍','👍','😢','🔥','👏','😮'].map(emoji=>{const group=reactions.filter(r=>r.message_id===m.id&&r.emoji===emoji);const mine=group.some(r=>r.user_id===uid);return group.length>0||emoji==='❤️'||emoji==='😂'||emoji==='👍'?<button type="button" key={emoji} onClick={()=>toggleReaction(m,emoji)} aria-label={'Réagir avec '+emoji} title={group.map(r=>r.user_id===uid?'Toi':'Membre').join(', ')} style={{border:mine?'1px solid #7c6cff':'1px solid #8885',borderRadius:18,padding:'3px 7px',margin:'3px 3px 0 0',background:mine?'#7c6cff22':'transparent',cursor:'pointer'}}>{emoji}{group.length>0?' '+group.length:''}</button>:null})}</div><div className="messenger-meta"><time>{new Date(m.created_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</time>{m.sender===uid&&<span>{m.is_read?'✓✓ Lu':'✓ Envoyé'}</span>}<button type="button" onClick={()=>setMenuFor(menuFor===m.id?'':m.id)} aria-label="Options du message">•••</button></div>{menuFor===m.id&&<div className="messenger-message-actions"><button onClick={()=>messageAction('save',m)}>♧ Sauvegarder</button><button onClick={()=>messageAction('pin',m)}>⌖ Épingler pour moi</button><button onClick={()=>messageAction('reply',m)}>↩ Répondre</button><button onClick={()=>messageAction('forward',m)}>↪ Transférer</button>{m.sender===uid&&<button onClick={()=>messageAction('edit',m)}>✎ Modifier</button>}<button onClick={()=>messageAction('hide',m)}>▣ Supprimer pour moi</button>{m.sender===uid?<button className="danger" onClick={()=>messageAction('delete',m)}>▤ Supprimer pour tous</button>:<button className="danger" onClick={()=>messageAction('report',m)}>⚑ Signaler</button>}</div>}</div>)}
   </div>
   {status&&<p className="messenger-status">{status}</p>}
   <form className="messenger-compose" onSubmit={send}>
    <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={e=>{const file=e.target.files?.[0];if(file)sendAttachment(file,'image');e.currentTarget.value=''}}/>
    <input ref={audioInputRef} type="file" accept="audio/*" hidden onChange={e=>{const file=e.target.files?.[0];if(file)sendAttachment(file,'audio');e.currentTarget.value=''}}/>
    <button type="button" disabled={busy||uploading} onClick={()=>imageInputRef.current?.click()} aria-label="Envoyer une image" title="Envoyer une image">🖼️</button>
    <button type="button" disabled={busy||uploading} onClick={()=>audioInputRef.current?.click()} aria-label="Envoyer une musique" title="Envoyer une musique">🎵</button>
    {replyTo&&<div className="messenger-reply-preview"><span>Réponse à : {(replyTo.body||replyTo.subject||'Message').slice(0,100)}</span><button type="button" onClick={()=>setReplyTo(null)} aria-label="Annuler la réponse">×</button></div>}{emojiOpen&&<div className="message-emoji-picker">{['😀','😂','🥰','😍','😊','😉','😎','😭','😡','❤️','🔥','👍','👎','🙏','🎉','💯','✨','🤔','🙌','💬'].map(emoji=><button type="button" key={emoji} onClick={()=>setBody(v=>v+emoji)}>{emoji}</button>)}</div>}<button type="button" onClick={()=>setEmojiOpen(v=>!v)} aria-label="Ajouter un emoji" title="Ajouter un emoji">😊</button><textarea value={body} onChange={e=>{const value=e.target.value;setBody(value);const channel=typingChannelRef.current;if(channel){const now=Date.now();if(now-lastTypingSent.current>900){lastTypingSent.current=now;channel.send({type:'broadcast',event:'typing',payload:{user_id:uid,is_typing:true}})}if(typingStopTimer.current)clearTimeout(typingStopTimer.current);typingStopTimer.current=setTimeout(()=>{channel.send({type:'broadcast',event:'typing',payload:{user_id:uid,is_typing:false}})},2200)}}} maxLength={3000} placeholder="Écris ton message…" aria-label="Écris ton message"/><button disabled={busy||uploading||!body.trim()} aria-label="Envoyer le message">{busy||uploading?'…':'➤'}</button></form>
  </section>
 </main>
}
