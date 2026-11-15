import {useEffect,useState} from 'react'
import Link from 'next/link'
import {useRouter} from 'next/router'
import {supabase} from '../lib/supabaseClient'
export default function ForumsPage(){
 const router=useRouter(),[categories,setCategories]=useState<any[]>([]),[topics,setTopics]=useState<any[]>([]),[userId,setUserId]=useState(''),[category,setCategory]=useState(''),[title,setTitle]=useState(''),[body,setBody]=useState(''),[busy,setBusy]=useState(false),[status,setStatus]=useState('')
 async function load(){
  const {data:{user}}=await supabase.auth.getUser()
  if(!user){await router.replace('/auth');return}
  setUserId(user.id)
  const {data:cats,error}=await supabase.from('forum_categories').select('*').order('name')
  if(error){setStatus('Impossible de charger les forums.');return}
  setCategories(cats||[])
  if(!category&&cats?.length)setCategory(cats[0].id)
  const {data:rows}=await supabase.from('forum_topics').select('id,category_id,author_id,title,body,created_at').order('created_at',{ascending:false}).limit(100)
  const ids=[...new Set((rows||[]).map((x:any)=>x.author_id))]
  const {data:profiles}=ids.length?await supabase.from('profiles').select('id,username,display_name').in('id',ids):{data:[] as any[]}
  const {data:replies}=rows?.length?await supabase.from('forum_replies').select('topic_id').in('topic_id',rows.map((x:any)=>x.id)):{data:[] as any[]}
  setTopics((rows||[]).map((t:any)=>({...t,profile:profiles?.find((p:any)=>p.id===t.author_id),replyCount:replies?.filter((r:any)=>r.topic_id===t.id).length||0,categoryName:cats?.find((c:any)=>c.id===t.category_id)?.name||'Discussion'})))
 }
 useEffect(()=>{load()},[])
 async function create(e:any){
  e.preventDefault();if(!title.trim()||!body.trim()||!category)return
  setBusy(true);const {error}=await supabase.from('forum_topics').insert({category_id:category,author_id:userId,title:title.trim(),body:body.trim()})
  setBusy(false);if(error){setStatus('Impossible de créer le sujet.');return}
  setTitle('');setBody('');setStatus('Sujet publié !');await load()
 }
 return <main className="app-shell"><header className="app-header"><Link className="brand" href="/">weshbien2.</Link><nav><Link href="/feed">Fil</Link><Link href="/explore">Découvrir</Link><Link href="/forums" className="active">Forums</Link><Link href="/inbox">Messages</Link></nav></header><section className="forum-page"><div className="page-intro"><small>LA COMMUNAUTÉ PREND LA PAROLE</small><h1>Les forums</h1><p>Pose tes questions, partage tes passions et échange avec les autres membres.</p></div><div className="forum-layout"><form className="card forum-create" onSubmit={create}><h2>Créer une discussion</h2><label>Rubrique<select value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Titre<input value={title} onChange={e=>setTitle(e.target.value)} maxLength={140} minLength={4} placeholder="De quoi veux-tu parler ?" required/></label><label>Ton message<textarea value={body} onChange={e=>setBody(e.target.value)} maxLength={5000} placeholder="Écris ton premier message…" required/></label><button disabled={busy||!title.trim()||!body.trim()}>{busy?'Publication…':'Publier le sujet →'}</button>{status&&<p className="notice">{status}</p>}</form><section className="forum-topics"><div className="forum-section-heading"><div><small>DERNIÈRES DISCUSSIONS</small><h2>Les sujets récents</h2></div><span>{topics.length} sujet{topics.length>1?'s':''}</span></div>{topics.length===0?<div className="card empty">Aucune discussion pour le moment. Lance le premier sujet !</div>:topics.map(t=><Link className="card forum-topic" href={'/forum?id='+t.id} key={t.id}><span className="forum-category">{t.categoryName}</span><h3>{t.title}</h3><p>{t.body.length>170?t.body.slice(0,170)+'…':t.body}</p><div><span>Par {t.profile?.display_name||t.profile?.username||'Membre'}</span><span>{t.replyCount} réponse{t.replyCount>1?'s':''}</span><time>{new Date(t.created_at).toLocaleString('fr-FR')}</time></div></Link>)}</section></div></section></main>
}
