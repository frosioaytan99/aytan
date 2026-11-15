import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabaseClient'
import MemberAvatar from '../components/MemberAvatar'

export default function SearchPage(){
 const [term,setTerm]=useState('')
 const [busy,setBusy]=useState(false)
 const [status,setStatus]=useState('')
 const [members,setMembers]=useState<any[]>([])
 const [posts,setPosts]=useState<any[]>([])
 const [topics,setTopics]=useState<any[]>([])
 async function search(e:any){
  e.preventDefault();const q=term.trim();if(q.length<2){setStatus('Écris au moins 2 caractères.');return}
  setBusy(true);setStatus('')
  const {data:{user}}=await supabase.auth.getUser()
  if(!user){window.location.href='/auth';return}
  const pattern='%'+q.replace(/[%_,]/g,'')+'%'
  const [p,po,t]=await Promise.all([
   supabase.from('profiles').select('id,username,display_name,bio,avatar_url,is_private').or('is_private.eq.false,id.eq.'+user.id).or('username.ilike.'+pattern+',display_name.ilike.'+pattern+',bio.ilike.'+pattern).limit(20),
   supabase.from('posts').select('id,author_id,body,image_url,created_at').ilike('body',pattern).order('created_at',{ascending:false}).limit(20),
   supabase.from('forum_topics').select('id,title,body,author_id,created_at').or('title.ilike.'+pattern+',body.ilike.'+pattern).order('created_at',{ascending:false}).limit(20)
  ])
  if(p.error||po.error||t.error)setStatus('Certains résultats n’ont pas pu être chargés.')
  const postIds=(po.data||[]).map((x:any)=>x.author_id),topicIds=(t.data||[]).map((x:any)=>x.author_id)
  const ids=[...new Set([...postIds,...topicIds])]
  const {data:authors}=ids.length?await supabase.from('profiles').select('id,username,display_name,avatar_url').in('id',ids):{data:[]}
  setMembers(p.data||[])
  setPosts((po.data||[]).map((x:any)=>({...x,author:authors?.find((a:any)=>a.id===x.author_id)})))
  setTopics((t.data||[]).map((x:any)=>({...x,author:authors?.find((a:any)=>a.id===x.author_id)})))
  setBusy(false)
 }
 return <main className="app-shell"><header className="app-header"><Link className="brand" href="/feed">weshbien2<span>.</span></Link><nav><Link href="/feed">Fil</Link><Link href="/stories">Stories</Link><Link href="/communities">Communautés</Link><Link href="/forums">Forums</Link><Link href="/inbox">Messages</Link></nav></header>
 <div className="directory search-page"><small>RETROUVE CE QUI T’INTÉRESSE</small><h1>Recherche</h1><p>Retrouve des membres, des publications et des discussions du forum.</p>
 <form className="search-row" onSubmit={search}><input value={term} onChange={e=>setTerm(e.target.value)} placeholder="Pseudo, mot-clé, sujet…" aria-label="Rechercher"/><button disabled={busy||term.trim().length<2}>{busy?'Recherche…':'Rechercher'}</button></form>{status&&<p className="notice">{status}</p>}
 {members.length+posts.length+topics.length>0&&<div className="search-results">
 <section><h2>Membres ({members.length})</h2>{members.map(m=><Link className="card search-result member-result" href={'/profile?id='+m.id} key={m.id}><MemberAvatar userId={m.id} name={m.display_name||m.username} avatarUrl={m.avatar_url} className="avatar"/><span><b>{m.display_name||m.username||'Membre'}</b><small>@{m.username||'membre'}</small><p>{m.bio||''}</p></span></Link>)}</section>
 <section><h2>Publications ({posts.length})</h2>{posts.map(p=><Link className="card search-result" href="/feed" key={p.id}><b>{p.author?.display_name||p.author?.username||'Membre'}</b><p>{p.body}</p><small>{new Date(p.created_at).toLocaleDateString('fr-FR')}</small></Link>)}</section>
 <section><h2>Forums ({topics.length})</h2>{topics.map(t=><Link className="card search-result" href={'/forum?id='+t.id} key={t.id}><b>{t.title}</b><p>{t.body}</p><small>Par {t.author?.display_name||t.author?.username||'Membre'}</small></Link>)}</section>
 </div>}
 </div></main>
}
