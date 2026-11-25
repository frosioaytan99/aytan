import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'

type Community={id:string;name:string;description:string;created_by:string;created_at:string;members:number;joined:boolean}
type Message={id:string;user_id:string;body:string;created_at:string;username?:string}
export default function CommunitiesPage(){
 const router=useRouter()
 const [userId,setUserId]=useState('')
 const [items,setItems]=useState<Community[]>([])
 const [selected,setSelected]=useState('')
 const [messages,setMessages]=useState<Message[]>([])
 const [name,setName]=useState('')
 const [description,setDescription]=useState('')
 const [draft,setDraft]=useState('')
 const [busy,setBusy]=useState(false)
 const [status,setStatus]=useState('')
 const [inviteUsername,setInviteUsername]=useState('')
 const [incomingInvites,setIncomingInvites]=useState<any[]>([])
 const [isPrivate,setIsPrivate]=useState(false)
 async function load(){
  const {data:{user}}=await supabase.auth.getUser()
  if(!user){router.replace('/auth');return}
  setUserId(user.id)
  const {data:pending}=await supabase.from('community_invites').select('id,community_id,communities(name)').eq('invited_user_id',user.id).eq('status','pending')
  setIncomingInvites((pending||[]).map((x:any)=>({...x,community:Array.isArray(x.communities)?x.communities[0]:x.communities})))
  const {data,error}=await supabase.from('communities').select('id,name,description,created_by,created_at').order('created_at',{ascending:false}).limit(100)
  if(error){setStatus('Chargement impossible : '+error.message);return}
  const ids=(data||[]).map((x:any)=>x.id)
  const {data:members}=ids.length?await supabase.from('community_members').select('community_id,user_id').in('community_id',ids):{data:[]}
  setItems((data||[]).map((x:any)=>({...x,members:members?.filter((m:any)=>m.community_id===x.id).length||0,joined:!!members?.some((m:any)=>m.community_id===x.id&&m.user_id===user.id)})))
  if(!selected&&data?.[0])setSelected(data[0].id)
 }
 async function loadMessages(id:string){
  const {data,error}=await supabase.from('community_messages').select('id,user_id,body,created_at').eq('community_id',id).order('created_at',{ascending:true}).limit(100)
  if(error){setStatus('Messages indisponibles : '+error.message);return}
  const ids=[...new Set((data||[]).map((m:any)=>m.user_id))]
  const {data:profiles}=ids.length?await supabase.from('profiles').select('id,username,display_name').in('id',ids):{data:[]}
  setMessages((data||[]).map((m:any)=>({...m,username:profiles?.find((p:any)=>p.id===m.user_id)?.display_name||profiles?.find((p:any)=>p.id===m.user_id)?.username||'Membre'})))
 }
 useEffect(()=>{load()},[])
 useEffect(()=>{if(selected&&items.some(x=>x.id===selected&&x.joined))loadMessages(selected)},[selected,items])
 async function create(e:any){
  e.preventDefault();if(!name.trim()||!userId)return
  setBusy(true)
  const {data,error}=await supabase.from('communities').insert({name:name.trim(),description:description.trim(),created_by:userId,is_private:isPrivate}).select('id').single()
  if(error){setStatus('Création impossible : '+error.message);setBusy(false);return}
  const join=await supabase.from('community_members').insert({community_id:data.id,user_id:userId,role:'member'})
  setBusy(false)
  if(join.error){setStatus('Groupe créé, mais impossible de le rejoindre : '+join.error.message);return}
  setName('');setDescription('');setIsPrivate(false);setStatus('Communauté créée !');await load();setSelected(data.id)
 }
 async function join(c:Community){
  const {error}=await supabase.from('community_members').insert({community_id:c.id,user_id:userId})
  if(error){setStatus('Impossible de rejoindre : '+error.message);return}
  setStatus('Tu as rejoint '+c.name+' !');await load()
 }
 async function leave(c:Community){
  const {error}=await supabase.from('community_members').delete().eq('community_id',c.id).eq('user_id',userId)
  if(error){setStatus('Impossible de quitter : '+error.message);return}
  setSelected('');setMessages([]);await load()
 }
 async function send(e:any){
  e.preventDefault();if(!draft.trim()||!selected)return
  const {error}=await supabase.from('community_messages').insert({community_id:selected,user_id:userId,body:draft.trim()})
  if(error){setStatus('Envoi impossible : '+error.message);return}
  setDraft('');loadMessages(selected)
 }
 const current=items.find(x=>x.id===selected)
 return <main className="app-shell"><header className="app-header"><Link className="brand" href="/feed">weshbien2<span>.</span></Link><nav><Link href="/feed">Fil</Link><Link href="/stories">Stories</Link><Link href="/communities" className="active">Communautés</Link><Link href="/forums">Forums</Link><Link href="/inbox">Messages</Link></nav></header>
 <div className="directory communities-page"><small>REJOINS TA COMMUNAUTÉ</small><h1>Communautés</h1><p>Crée des groupes publics autour de tes passions et discute avec leurs membres.</p>
 <form className="card community-create" onSubmit={create}><h3>Créer une communauté</h3><input value={name} onChange={e=>setName(e.target.value)} maxLength={60} placeholder="Nom du groupe" required/><textarea value={description} onChange={e=>setDescription(e.target.value)} maxLength={400} placeholder="De quoi parle ton groupe ?"/><label style={{display:"flex",alignItems:"center",gap:8}}><input type="checkbox" checked={isPrivate} onChange={e=>setIsPrivate(e.target.checked)}/> Communauté privée (accès sur invitation)</label><button disabled={busy||name.trim().length<3}>{busy?'Création…':'Créer le groupe'}</button></form>
 {status&&<p className="notice">{status}</p>}{incomingInvites.length>0&&<section className="card"><h2>Invitations reçues</h2>{incomingInvites.map(inv=><div key={inv.id} style={{display:'flex',gap:8,alignItems:'center',justifyContent:'space-between'}}><span>{inv.community?.name||'Communauté privée'}</span><button type="button" onClick={async()=>{const {error}=await supabase.rpc('respond_community_invite',{p_invite_id:inv.id,p_accept:true});setStatus(error?error.message:'Tu as rejoint la communauté !');if(!error){setIncomingInvites(v=>v.filter(x=>x.id!==inv.id));await load()}}}>Accepter</button><button type="button" onClick={async()=>{const {error}=await supabase.rpc('respond_community_invite',{p_invite_id:inv.id,p_accept:false});if(error)setStatus(error.message);setIncomingInvites(v=>v.filter(x=>x.id!==inv.id))}}>Refuser</button></div>)}</section>}
 <div className="community-layout"><section className="community-list"><h2>Groupes à découvrir</h2>{items.length===0?<div className="card empty">Aucun groupe pour le moment.</div>:items.map(c=><article className={'card community-card '+(selected===c.id?'selected':'')} key={c.id}><button className="community-select" type="button" onClick={()=>setSelected(c.id)}><b>{c.name}</b><small>{c.members} membre{c.members>1?'s':''}</small><p>{c.description||'Aucune description pour le moment.'}</p></button>{c.joined?<button type="button" className="community-leave" onClick={()=>leave(c)}>Quitter</button>:<button type="button" className="community-join" onClick={()=>join(c)}>Rejoindre</button>}</article>)}</section>
 <section className="card community-chat"><h2>{current?.name||'Discussion du groupe'}</h2>{current?.joined&&current.created_by===userId&&<form className="community-send" onSubmit={async e=>{e.preventDefault();const {data:p}=await supabase.from('profiles').select('id').eq('username',inviteUsername.trim().replace(/^@/, '')).maybeSingle();if(!p){setStatus('Pseudo introuvable.');return}const {error}=await supabase.rpc('invite_community_member',{p_community_id:current.id,p_user_id:p.id});setStatus(error?error.message:'Invitation envoyée !');if(!error)setInviteUsername('')}}><input value={inviteUsername} onChange={e=>setInviteUsername(e.target.value)} placeholder="Pseudo à inviter"/><button disabled={!inviteUsername.trim()}>Inviter</button></form>}{!current||!current.joined?<div className="empty">Rejoins un groupe pour participer à la discussion.</div>:<><div className="community-messages">{messages.map(m=><article key={m.id} className="community-message"><b>{m.username}</b><p>{m.body}</p><small>{new Date(m.created_at).toLocaleString('fr-FR')}</small></article>)}</div><form className="community-send" onSubmit={send}><input value={draft} onChange={e=>setDraft(e.target.value)} maxLength={1500} placeholder="Écrire au groupe…"/><button disabled={!draft.trim()}>Envoyer</button></form></>}</section></div>
 </div></main>
}
