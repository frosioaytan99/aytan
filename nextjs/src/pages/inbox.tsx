import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import MemberAvatar from '../components/MemberAvatar'

type Message = { id:string; sender:string; recipient:string; subject:string|null; body:string|null; created_at:string; is_read?:boolean; attachment_type?:'image'|'audio'|null }
type FriendInvite = { id:string; sender_id:string; recipient_id:string; status:string; profile?:{display_name:string|null;username:string|null;avatar_url?:string|null} }
type Profile = { id:string; display_name:string|null; username:string|null; avatar_url?:string|null }
type Conversation = { person:Profile; latest:Message; unread:number; count:number }

function notify(text:string) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('weshbien:notify',{detail:text}))
}

export default function InboxPage() {
 const router=useRouter()
 const [messages,setMessages]=useState<Message[]>([])
 const [invites,setInvites]=useState<FriendInvite[]>([])
 const [profiles,setProfiles]=useState<Profile[]>([])
 const [email,setEmail]=useState('')
 const [userId,setUserId]=useState('')
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState('')
 const [inviteBusy,setInviteBusy]=useState('')
 const [conversationSearch,setConversationSearch]=useState('')

 async function loadInvites(uid:string) {
  const {data}=await supabase.from('friend_requests').select('id,sender_id,recipient_id,status').eq('recipient_id',uid).eq('status','pending').order('created_at',{ascending:false})
  const rows=(data||[]) as FriendInvite[]
  const ids=rows.map(x=>x.sender_id)
  const {data:people}=ids.length?await supabase.from('profiles').select('id,display_name,username,avatar_url').in('id',ids):{data:[] as any[]}
  setInvites(rows.map(x=>({...x,profile:people?.find(p=>p.id===x.sender_id)})))
 }
 async function loadMessages(uid:string) {
  const {data,error:loadError}=await supabase.from('messages').select('id,sender,recipient,subject,body,created_at,is_read,attachment_type').or('recipient.eq.'+uid+',sender.eq.'+uid).order('created_at',{ascending:false})
  if(loadError){setError('Impossible de charger les messages pour le moment.');return}
  const rows=(data||[]) as Message[]
  setMessages(rows)
  const ids=[...new Set(rows.map(m=>m.sender===uid?m.recipient:m.sender))]
  const {data:people}=ids.length?await supabase.from('profiles').select('id,display_name,username,avatar_url').in('id',ids):{data:[] as any[]}
  setProfiles((people||[]) as Profile[])
 }
 useEffect(()=>{
  let active=true
  let channel:ReturnType<typeof supabase.channel>|null=null
  async function start(){
   const {data:{user},error:userError}=await supabase.auth.getUser()
   if(!active)return
   if(userError||!user){await router.replace('/auth');return}
   setUserId(user.id);setEmail(user.email||'')
   await Promise.all([loadMessages(user.id),loadInvites(user.id)])
   if(!active)return
   setLoading(false)
   channel=supabase.channel('inbox-live-'+user.id)
    .on('postgres_changes',{event:'*',schema:'public',table:'messages'},async payload=>{
      const row:any=payload.new||payload.old
      if(row?.sender===user.id||row?.recipient===user.id){
       
       if(active)await loadMessages(user.id)
      }
    })
    .on('postgres_changes',{event:'*',schema:'public',table:'friend_requests'},async payload=>{
      const row:any=payload.new||payload.old
      if(row?.recipient_id===user.id){
       
       if(active)await loadInvites(user.id)
      }
    }).subscribe()
  }
  start()
  return()=>{active=false;if(channel)supabase.removeChannel(channel)}
 },[router])

 const conversations=useMemo(()=>{
  const map=new Map<string,Conversation>()
  messages.forEach(m=>{
   const other=m.sender===userId?m.recipient:m.sender
   const person=profiles.find(p=>p.id===other)
   if(!person)return
   const current=map.get(other)
   if(!current)map.set(other,{person,latest:m,unread:m.recipient===userId&&!m.is_read?1:0,count:1})
   else {current.count++;if(m.recipient===userId&&!m.is_read)current.unread++}
  })
  return [...map.values()].sort((a,b)=>new Date(b.latest.created_at).getTime()-new Date(a.latest.created_at).getTime())
 },[messages,profiles,userId])

 const filteredConversations=useMemo(()=>{const q=conversationSearch.trim().toLocaleLowerCase('fr-FR');if(!q)return conversations;return conversations.filter(c=>[c.person.display_name,c.person.username,c.latest.body,c.latest.subject].filter(Boolean).join(' ').toLocaleLowerCase('fr-FR').includes(q))},[conversations,conversationSearch])

 async function answerInvite(invite:FriendInvite,answer:'accepted'|'declined'){
  if(inviteBusy)return;setInviteBusy(invite.id)
  const {error}=await supabase.from('friend_requests').update({status:answer,updated_at:new Date().toISOString()}).eq('id',invite.id).eq('status','pending')
  if(error)setError('Impossible de traiter cette demande.')
  else {setInvites(v=>v.filter(x=>x.id!==invite.id));notify(answer==='accepted'?'Demande d’ami acceptée':'Demande refusée')}
  setInviteBusy('')
 }
 async function logout(){await supabase.auth.signOut();await router.push('/')}
 return <main className="member-shell">
  <header className="member-topbar"><Link href="/" className="brand"><span className="brand-mark">w</span><span>weshbien2<span className="brand-dot">.</span></span></Link><nav className="member-nav"><Link href="/feed">Fil</Link><Link href="/explore">Découvrir</Link><Link href="/forums">Forums</Link><Link href="/inbox" className="member-nav-active">Messages</Link><button onClick={logout}>Déconnexion</button></nav></header>
  <div className="member-content">
   <section className="member-welcome"><div><span className="member-eyebrow">TON ESPACE PERSONNEL</span><h1>Ta messagerie 💬</h1><p>Toutes tes conversations, rangées par personne et par activité récente.</p>{email&&<span className="member-email">{email}</span>}</div><Link href="/group-chats" className="member-primary">Groupes de discussion →</Link><Link href="/explore" className="member-primary">Découvrir des membres →</Link></section>
   <section className="member-stats"><article className="member-stat"><span className="member-stat-icon">✉</span><div><strong>{messages.length}</strong><span>Messages</span></div></article><article className="member-stat"><span className="member-stat-icon">♡</span><div><strong>{invites.length}</strong><span>Demandes d’amis</span></div></article></section>
   {error&&<p className="notice">{error}</p>}
   <section className="member-panel"><div className="member-panel-heading"><div><span className="member-eyebrow">FAIRE CONNAISSANCE</span><h2>Demandes d’amis</h2></div></div>
    {loading?<p className="member-muted">Chargement…</p>:invites.length===0?<p className="member-muted">Aucune nouvelle demande pour le moment.</p>:<div className="member-message-list">{invites.map(invite=><article className="member-message" key={invite.id}><MemberAvatar userId={invite.sender_id} name={invite.profile?.display_name||invite.profile?.username} avatarUrl={invite.profile?.avatar_url} className="member-message-avatar"/><div className="member-message-copy"><strong>{invite.profile?.display_name||invite.profile?.username||'Membre'}</strong><p>@{invite.profile?.username||'membre'} souhaite t’ajouter en ami.</p><div className="friend-actions"><button disabled={inviteBusy===invite.id} onClick={()=>answerInvite(invite,'accepted')}>Accepter</button><button className="friend-secondary" disabled={inviteBusy===invite.id} onClick={()=>answerInvite(invite,'declined')}>Refuser</button><Link href={'/profile?id='+invite.sender_id}>Voir le profil</Link></div></div></article>)}</div>}
   </section>
   <section className="member-panel"><div className="member-panel-heading"><div><span className="member-eyebrow">RESTER EN CONTACT</span><h2>Conversations</h2><p className="member-muted">La plus récente apparaît en premier. Appuie sur une personne pour ouvrir vos messages.</p></div><Link href="/send">Nouveau message +</Link></div><input className="conversation-search" type="search" value={conversationSearch} onChange={e=>setConversationSearch(e.target.value)} placeholder="Rechercher une conversation ou un membre…" aria-label="Rechercher une conversation"/>
    {loading?<p className="member-muted">Chargement des conversations…</p>:conversations.length===0?<div className="member-empty"><div className="member-empty-icon">✉</div><h3>Aucune conversation pour le moment</h3><p>Une fois amis, vous pourrez discuter ici.</p><Link href="/explore" className="member-secondary">Découvrir les membres</Link></div>:filteredConversations.length===0?<p className="member-muted">Aucune conversation ne correspond à ta recherche.</p>:<div className="member-message-list">{filteredConversations.map(c=><Link href={'/conversation?with='+c.person.id} className="member-message conversation-row" key={c.person.id}><MemberAvatar userId={c.person.id} name={c.person.display_name||c.person.username} avatarUrl={c.person.avatar_url} className="member-message-avatar"/><div className="member-message-copy"><strong>{c.person.display_name||c.person.username||'Membre'} <small>@{c.person.username||'membre'}</small></strong><p>{c.latest.sender===userId?'Vous : ':''}{c.latest.attachment_type==='image'?'🖼️ Photo':c.latest.attachment_type==='audio'?'🎵 Musique':c.latest.body||c.latest.subject||'Message'}</p><small>{new Date(c.latest.created_at).toLocaleString('fr-FR')}</small></div><div className="conversation-meta">{c.unread>0&&<b className="unread-count">{c.unread}</b>}<span>Ouvrir →</span></div></Link>)}</div>}
   </section>
   <footer className="member-footer"><Link href="/">weshbien2.</Link><span>Échange avec respect, protège tes informations.</span></footer>
  </div>
 </main>
}
