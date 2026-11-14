import { useEffect,useState } from 'react'
import Link from 'next/link'
import SiteLayout from '../components/SiteLayout'
import { supabase } from '../lib/supabaseClient'
type Message={id:string;sender:string;recipient:string;subject:string|null;body:string;created_at:string;is_read:boolean}
export default function InboxPage(){
 const [messages,setMessages]=useState<Message[]>([]);const [uid,setUid]=useState('');const [status,setStatus]=useState('')
 async function load(userId:string){const {data,error}=await supabase.from('messages').select('id,sender,recipient,subject,body,created_at,is_read').or('sender.eq.'+userId+',recipient.eq.'+userId).order('created_at',{ascending:false}).limit(80);if(error)setStatus(error.message);else setMessages((data||[]) as Message[])}
 useEffect(()=>{supabase.auth.getUser().then(({data})=>{const id=data.user?.id||'';setUid(id);if(id)load(id);else setStatus('Connecte-toi pour consulter tes messages.')})},[])
 async function markRead(m:Message){if(m.recipient!==uid||m.is_read)return;await supabase.from('messages').update({is_read:true}).eq('id',m.id);setMessages(old=>old.map(x=>x.id===m.id?{...x,is_read:true}:x))}
 return <SiteLayout title="Ma messagerie"><div className="inbox-toolbar"><p className="muted-small">Tes conversations privées.</p><Link href="/send" className="btn btn-primary">＋ Nouveau message</Link></div>{status&&<p className="form-status">{status}</p>}<div className="message-list">{messages.map(m=><article key={m.id} className={'message-row card-surface '+(!m.is_read&&m.recipient===uid?'unread':'')} onClick={()=>markRead(m)}><div className="avatar">{m.sender===uid?'↗':'↙'}</div><div className="message-main"><strong>{m.sender===uid?'Message envoyé':'Message reçu'}</strong><p>{m.body}</p><small>{new Date(m.created_at).toLocaleString('fr-FR')}</small></div><span className="message-tag">{m.sender===uid?'Envoyé':m.is_read?'Lu':'Nouveau'}</span></article>)}</div>{uid&&messages.length===0&&<div className="empty-state card-surface"><h2>Ta boîte est vide</h2><p>Quand tu recevras un message, il apparaîtra ici.</p></div>}</SiteLayout>
}
