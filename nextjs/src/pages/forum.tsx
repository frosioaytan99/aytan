import {useEffect,useState} from 'react'
import Link from 'next/link'
import {useRouter} from 'next/router'
import {supabase} from '../lib/supabaseClient'
export default function ForumTopicPage(){
 const router=useRouter(),[topic,setTopic]=useState<any>(null),[replies,setReplies]=useState<any[]>([]),[uid,setUid]=useState(''),[body,setBody]=useState(''),[status,setStatus]=useState(''),[busy,setBusy]=useState(false),[poll,setPoll]=useState<any>(null),[votes,setVotes]=useState<any[]>([]),[selected,setSelected]=useState<number|null>(null),[voted,setVoted]=useState(false),[viewCount,setViewCount]=useState(0)
 async function load(id:string,userId:string){
  const {data:t,error}=await supabase.from('forum_topics').select('*').eq('id',id).maybeSingle()
  if(error||!t){setStatus('Sujet introuvable.');return}
  await supabase.from('forum_topic_views').upsert({topic_id:id,user_id:userId},{onConflict:'topic_id,user_id',ignoreDuplicates:true})
  const {count:views}=await supabase.from('forum_topic_views').select('id',{count:'exact',head:true}).eq('topic_id',id)
  setViewCount(views||0)
  const {data:author}=await supabase.from('profiles').select('id,username,display_name').eq('id',t.author_id).maybeSingle()
  const {data:r}=await supabase.from('forum_replies').select('*').eq('topic_id',id).order('created_at',{ascending:true})
  const ids=[...new Set((r||[]).map((x:any)=>x.author_id))]
  const {data:people}=ids.length?await supabase.from('profiles').select('id,username,display_name').in('id',ids):{data:[] as any[]}
  setTopic({...t,profile:author});setReplies((r||[]).map((x:any)=>({...x,profile:people?.find((p:any)=>p.id===x.author_id)})))
  const {data:p}=await supabase.from('forum_polls').select('*').eq('topic_id',id).maybeSingle()
  setPoll(p||null)
  if(p){
   const {data:v}=await supabase.from('forum_poll_votes').select('id,user_id,option_index').eq('poll_id',p.id)
   setVotes(v||[]);const mine=(v||[]).find((x:any)=>x.user_id===userId)
   setVoted(!!mine);setSelected(mine?mine.option_index:null)
  }else{setVotes([]);setVoted(false);setSelected(null)}
 }
 useEffect(()=>{if(!router.isReady||typeof router.query.id!=='string')return;let active=true;supabase.auth.getUser().then(({data})=>{if(!active)return;if(!data.user){router.replace('/auth');return}setUid(data.user.id);load(router.query.id as string,data.user.id)});return()=>{active=false}},[router.isReady,router.query.id])
 async function reply(e:any){
  e.preventDefault();if(!body.trim()||!topic||!uid)return;setBusy(true)
  const {error}=await supabase.from('forum_replies').insert({topic_id:topic.id,author_id:uid,body:body.trim()})
  setBusy(false);if(error){setStatus('Impossible de publier la réponse.');return}
  setBody('');setStatus('Réponse publiée !');await load(topic.id,uid)
 }
 async function vote(){
  if(!poll||selected===null||voted)return
  setBusy(true);const {error}=await supabase.from('forum_poll_votes').insert({poll_id:poll.id,user_id:uid,option_index:selected})
  setBusy(false);if(error){setStatus('Ton vote n’a pas pu être enregistré.');return}
  setStatus('Ton vote a bien été pris en compte !');await load(topic.id,uid)
 }
 const total=votes.length
 return <main className="app-shell"><header className="app-header"><Link href="/" className="brand">weshbien2.</Link><nav><Link href="/feed">Fil</Link><Link href="/questions">Questions</Link><Link href="/forums" className="active">Forums</Link><Link href="/inbox">Messages</Link></nav></header><section className="forum-detail"><Link href="/forums" className="back-link">← Tous les forums</Link>{topic&&<article className="card forum-original"><span className="forum-category">DISCUSSION</span><h1>{topic.title}</h1><p className="forum-byline">Par {topic.profile?.display_name||topic.profile?.username||'Membre'} · {new Date(topic.created_at).toLocaleString('fr-FR')} · 👁 {viewCount} vue{viewCount>1?'s':''} · 💬 {replies.length} réponse{replies.length>1?'s':''}</p><p className="forum-body">{topic.body}</p></article>}
 {poll&&<section className="card forum-poll"><div className="poll-heading"><span className="poll-label">SONDAGE</span><span>{total} vote{total>1?'s':''}</span></div><h2>{poll.question}</h2><div className="poll-vote-options">{poll.options.map((option:string,index:number)=>{const count=votes.filter((v:any)=>v.option_index===index).length;const percent=total?Math.round(count/total*100):0;return <div className="poll-vote-row" key={index}><label className={voted?'poll-result-option':''}><input type="radio" name="poll-choice" checked={selected===index} disabled={voted} onChange={()=>setSelected(index)}/><span>{option}</span></label>{voted&&<div className="poll-result-track"><div style={{width:percent+'%'}}/></div>}{voted&&<small>{count} · {percent}%</small>}</div>})}</div>{!voted?<button onClick={vote} disabled={busy||selected===null}>{busy?'Enregistrement…':'Voter'}</button>:<p className="poll-thanks">Merci pour ton vote ! Les résultats sont maintenant visibles.</p>}</section>}
 <section className="forum-replies"><h2>Réponses ({replies.length})</h2>{replies.map(r=><article className="card forum-reply" key={r.id}><b>{r.profile?.display_name||r.profile?.username||'Membre'}</b><small>{new Date(r.created_at).toLocaleString('fr-FR')}</small><p>{r.body}</p></article>)}</section><form className="card forum-reply-form" onSubmit={reply}><h2>Ta réponse</h2><textarea value={body} onChange={e=>setBody(e.target.value)} maxLength={3000} placeholder="Participe à la discussion…" required/><button disabled={busy||!body.trim()}>{busy?'Envoi…':'Répondre →'}</button>{status&&<p className="notice">{status}</p>}</form></section></main>
}
