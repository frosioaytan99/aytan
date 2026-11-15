import {useEffect,useState} from 'react'
import Link from 'next/link'
import {useRouter} from 'next/router'
import {supabase} from '../lib/supabaseClient'
export default function ForumTopicPage(){
 const router=useRouter(),[topic,setTopic]=useState<any>(null),[replies,setReplies]=useState<any[]>([]),[uid,setUid]=useState(''),[body,setBody]=useState(''),[status,setStatus]=useState(''),[busy,setBusy]=useState(false)
 async function load(id:string){
  const {data:t,error}=await supabase.from('forum_topics').select('*').eq('id',id).maybeSingle()
  if(error||!t){setStatus('Sujet introuvable.');return}
  const {data:author}=await supabase.from('profiles').select('id,username,display_name').eq('id',t.author_id).maybeSingle()
  const {data:r}=await supabase.from('forum_replies').select('*').eq('topic_id',id).order('created_at',{ascending:true})
  const ids=[...new Set((r||[]).map((x:any)=>x.author_id))]
  const {data:people}=ids.length?await supabase.from('profiles').select('id,username,display_name').in('id',ids):{data:[] as any[]}
  setTopic({...t,profile:author});setReplies((r||[]).map((x:any)=>({...x,profile:people?.find((p:any)=>p.id===x.author_id)})))
 }
 useEffect(()=>{if(!router.isReady||typeof router.query.id!=='string')return;let active=true;supabase.auth.getUser().then(({data})=>{if(!active)return;if(!data.user){router.replace('/auth');return}setUid(data.user.id);load(router.query.id as string)});return()=>{active=false}},[router.isReady,router.query.id])
 async function reply(e:any){
  e.preventDefault();if(!body.trim()||!topic||!uid)return;setBusy(true)
  const {error}=await supabase.from('forum_replies').insert({topic_id:topic.id,author_id:uid,body:body.trim()})
  setBusy(false);if(error){setStatus('Impossible de publier la réponse.');return}
  setBody('');setStatus('Réponse publiée !');await load(topic.id)
 }
 return <main className="app-shell"><header className="app-header"><Link href="/" className="brand">weshbien2.</Link><nav><Link href="/feed">Fil</Link><Link href="/forums" className="active">Forums</Link><Link href="/inbox">Messages</Link></nav></header><section className="forum-detail"><Link href="/forums" className="back-link">← Tous les forums</Link>{topic&&<article className="card forum-original"><span className="forum-category">DISCUSSION</span><h1>{topic.title}</h1><p className="forum-byline">Par {topic.profile?.display_name||topic.profile?.username||'Membre'} · {new Date(topic.created_at).toLocaleString('fr-FR')}</p><p className="forum-body">{topic.body}</p></article>}<section className="forum-replies"><h2>Réponses ({replies.length})</h2>{replies.map(r=><article className="card forum-reply" key={r.id}><b>{r.profile?.display_name||r.profile?.username||'Membre'}</b><small>{new Date(r.created_at).toLocaleString('fr-FR')}</small><p>{r.body}</p></article>)}</section><form className="card forum-reply-form" onSubmit={reply}><h2>Ta réponse</h2><textarea value={body} onChange={e=>setBody(e.target.value)} maxLength={3000} placeholder="Participe à la discussion…" required/><button disabled={busy||!body.trim()}>{busy?'Envoi…':'Répondre →'}</button>{status&&<p className="notice">{status}</p>}</form></section></main>
}
