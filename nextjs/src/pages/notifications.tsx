import { useEffect,useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'

type Notice={id:string;actor_id:string|null;type:string;title:string;body:string;link:string;is_read:boolean;created_at:string}
type Person={id:string;display_name:string|null;username:string|null}
export default function NotificationsPage(){
 const router=useRouter()
 const [rows,setRows]=useState<Notice[]>([])
 const [people,setPeople]=useState<Person[]>([])
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState('')
 const [uid,setUid]=useState('')
 async function load(userId:string){
  const {data,error}=await supabase.from('notifications').select('id,actor_id,type,title,body,link,is_read,created_at').eq('user_id',userId).order('created_at',{ascending:false}).limit(100)
  if(error){setError('Impossible de charger les notifications.');return}
  const items=(data||[]) as Notice[];setRows(items)
  const ids=[...new Set(items.map(x=>x.actor_id).filter(Boolean) as string[])]
  const {data:profiles}=ids.length?await supabase.from('profiles').select('id,display_name,username').in('id',ids):{data:[] as any[]}
  setPeople((profiles||[]) as Person[])
 }
 useEffect(()=>{
  let active=true;let channel:ReturnType<typeof supabase.channel>|null=null
  async function start(){
   const {data:{user}}=await supabase.auth.getUser()
   if(!active)return
   if(!user){router.replace('/auth');return}
   setUid(user.id);await load(user.id)
   if(!active)return
   setLoading(false)
   channel=supabase.channel('notifications-page-'+user.id).on('postgres_changes',{event:'*',schema:'public',table:'notifications',filter:'user_id=eq.'+user.id},()=>load(user.id)).subscribe()
  }
  start();return()=>{active=false;if(channel)supabase.removeChannel(channel)}
 },[router])
 async function markAll(){
  if(!uid)return
  const {error}=await supabase.from('notifications').update({is_read:true}).eq('user_id',uid).eq('is_read',false)
  if(error)setError('Impossible de tout marquer comme lu.');else setRows(v=>v.map(x=>({...x,is_read:true})))
 }
 async function openNotice(item:Notice){
  if(!item.is_read){await supabase.from('notifications').update({is_read:true}).eq('id',item.id);setRows(v=>v.map(x=>x.id===item.id?{...x,is_read:true}:x))}
  router.push(item.link||'/notifications')
 }
 return <main className="member-shell"><header className="member-topbar"><Link href="/" className="brand"><span className="brand-mark">w</span><span>weshbien2<span className="brand-dot">.</span></span></Link><nav className="member-nav"><Link href="/feed">Fil</Link><Link href="/explore">Découvrir</Link><Link href="/forums">Forums</Link><Link href="/inbox">Messages</Link><Link href="/profile">Mon profil</Link></nav></header>
 <div className="notifications-page"><div className="notifications-heading"><div><span className="member-eyebrow">TON ESPACE PERSONNEL</span><h1>Notifications 🔔</h1><p>Retrouve ici tout ce que tu reçois sur weshbien2.</p></div><button onClick={markAll} disabled={!rows.some(x=>!x.is_read)}>Tout marquer comme lu</button></div>
 {error&&<p className="notice">{error}</p>}
 {loading?<p className="member-muted">Chargement…</p>:rows.length===0?<div className="member-empty card"><h3>Aucune notification</h3><p>Les nouveaux messages, demandes d’amis, J’aime et commentaires apparaîtront ici.</p></div>:<div className="notifications-list">{rows.map(item=>{const person=people.find(p=>p.id===item.actor_id);return <button type="button" key={item.id} className={'notification-item '+(!item.is_read?'notification-unread':'')} onClick={()=>openNotice(item)}><span className="notification-symbol">{item.type==='message'?'✉':item.type==='friend_request'?'♡':item.type==='like'?'♥':'💬'}</span><span className="notification-copy"><strong>{item.title}</strong><span>{person?(person.display_name||person.username||'Un membre')+' · ':''}{item.body}</span><small>{new Date(item.created_at).toLocaleString('fr-FR')}</small></span>{!item.is_read&&<i/>}</button>})}</div>}
 <Link className="back-link" href="/feed">← Retour au fil</Link></div></main>
}
