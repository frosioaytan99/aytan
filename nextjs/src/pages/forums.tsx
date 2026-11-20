import {useEffect,useState} from 'react'
import Link from 'next/link'
import {useRouter} from 'next/router'
import {supabase} from '../lib/supabaseClient'
import { moderateForumContent } from '../lib/moderateForumContent'
export default function ForumsPage(){
 const router=useRouter(),[questions,setQuestions]=useState<any[]>([]),[qTitle,setQTitle]=useState(''),[qBody,setQBody]=useState(''),[categories,setCategories]=useState<any[]>([]),[topics,setTopics]=useState<any[]>([]),[userId,setUserId]=useState(''),[category,setCategory]=useState(''),[title,setTitle]=useState(''),[body,setBody]=useState(''),[busy,setBusy]=useState(false),[status,setStatus]=useState(''),[pollQuestion,setPollQuestion]=useState(''),[pollOptions,setPollOptions]=useState(['','']),[withPoll,setWithPoll]=useState(false)
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
  const topicIds=(rows||[]).map((x:any)=>x.id)
  const {data:viewRows}=topicIds.length?await supabase.from('forum_topic_views').select('topic_id').in('topic_id',topicIds):{data:[] as any[]}
  const {data:polls}=topicIds.length?await supabase.from('forum_polls').select('id,topic_id').in('topic_id',topicIds):{data:[] as any[]}
  setTopics((rows||[]).map((t:any)=>({...t,profile:profiles?.find((p:any)=>p.id===t.author_id),replyCount:replies?.filter((r:any)=>r.topic_id===t.id).length||0,viewCount:viewRows?.filter((v:any)=>v.topic_id===t.id).length||0,categoryName:cats?.find((c:any)=>c.id===t.category_id)?.name||'Discussion',hasPoll:polls?.some((p:any)=>p.topic_id===t.id)})))
  const {data:qs}=await supabase.from('questions').select('id,author_id,title,body,created_at').order('created_at',{ascending:false}).limit(100)
  const qids=(qs||[]).map((q:any)=>q.id), qauthors=[...new Set((qs||[]).map((q:any)=>q.author_id))]
  const {data:answers}=qids.length?await supabase.from('question_answers').select('question_id').in('question_id',qids):{data:[] as any[]}
  const {data:qpeople}=qauthors.length?await supabase.from('profiles').select('id,username,display_name').in('id',qauthors):{data:[] as any[]}
  setQuestions((qs||[]).map((q:any)=>({...q,profile:qpeople?.find((p:any)=>p.id===q.author_id),answerCount:(answers||[]).filter((a:any)=>a.question_id===q.id).length})))
 }
 useEffect(()=>{load()},[])
 async function createQuestion(e:any){
  e.preventDefault();if(!qTitle.trim()||!qBody.trim()||!userId)return
  setBusy(true);const moderation=await moderateForumContent(qTitle.trim()+'\n\n'+qBody.trim())
  if(!moderation.allowed){setBusy(false);setStatus(moderation.message||'Cette question ne peut pas être publiée.');return}
  const {error}=await supabase.from('questions').insert({author_id:userId,title:qTitle.trim(),body:qBody.trim()})
  setBusy(false);if(error){setStatus('Impossible de publier la question.');return}
  setQTitle('');setQBody('');setStatus('Question publiée dans le forum !');await load()
 }
 async function create(e:any){
  e.preventDefault();if(!title.trim()||!body.trim()||!category)return
  const cleanOptions=pollOptions.map(x=>x.trim()).filter(Boolean)
  if(withPoll&&(!pollQuestion.trim()||cleanOptions.length<2)){setStatus('Un sondage doit avoir une question et au moins 2 choix.');return}
  setBusy(true)
  const moderation=await moderateForumContent(title.trim()+'\n\n'+body.trim())
  if(!moderation.allowed){setBusy(false);setStatus(moderation.message||'Ce sujet ne peut pas être publié.');return}
  const {data:newTopic,error}=await supabase.from('forum_topics').insert({category_id:category,author_id:userId,title:title.trim(),body:body.trim()}).select('id').single()
  if(error||!newTopic){setBusy(false);setStatus('Impossible de créer le sujet.');return}
  if(withPoll){
   const {error:pollError}=await supabase.from('forum_polls').insert({topic_id:newTopic.id,author_id:userId,question:pollQuestion.trim(),options:cleanOptions})
   if(pollError){setBusy(false);setStatus('Discussion créée, mais le sondage n’a pas pu être ajouté.');await load();return}
  }
  setBusy(false);setTitle('');setBody('');setWithPoll(false);setPollQuestion('');setPollOptions(['','']);setStatus(withPoll?'Discussion et sondage publiés !':'Sujet publié !');await load()
 }
 return <main className="app-shell"><header className="app-header"><Link className="brand" href="/">weshbien2.</Link><nav><Link href="/feed">Fil</Link><Link href="/explore">Découvrir</Link><Link href="#questions">Questions</Link><Link href="/forums" className="active">Forums</Link><Link href="/inbox">Messages</Link></nav></header><section className="forum-page"><div className="page-intro"><small>LA COMMUNAUTÉ PREND LA PAROLE</small><h1>Les forums</h1><p>Pose tes questions, partage tes passions et échange avec les autres membres.</p></div><section id="questions" className="forum-questions" style={{marginBottom:28}}>
  <div className="forum-section-heading"><div><small>ENTRAIDE ENTRE MEMBRES</small><h2>Questions de la communauté</h2></div><span>{questions.length} question{questions.length>1?'s':''}</span></div>
  <form className="card forum-create" onSubmit={createQuestion} style={{marginBottom:18}}>
   <h3>Poser une question</h3><input value={qTitle} onChange={e=>setQTitle(e.target.value)} maxLength={160} minLength={5} placeholder="Ta question en quelques mots…" required/>
   <textarea value={qBody} onChange={e=>setQBody(e.target.value)} maxLength={3000} placeholder="Ajoute des détails…" required/>
   <button disabled={!qTitle.trim()||!qBody.trim()}>Publier la question →</button>
  </form>
  <div className="forum-topics">{questions.length===0?<div className="card empty">Aucune question pour le moment.</div>:questions.map(q=><article className="card forum-topic" key={'q-'+q.id}>
   <span className="forum-category">QUESTION</span><h3>{q.title}</h3><p>{q.body}</p>
   <div><span>Par {q.profile?.display_name||q.profile?.username||'Membre'}</span><span>{q.answerCount} réponse{q.answerCount===1?'':'s'}</span><time>{new Date(q.created_at).toLocaleString('fr-FR')}</time></div>
   <Link href="/questions">Voir et répondre →</Link>
  </article>)}</div>
 </section><div className="forum-layout"><form className="card forum-create" onSubmit={create}><h2>Créer une discussion</h2><label>Rubrique<select value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Titre<input value={title} onChange={e=>setTitle(e.target.value)} maxLength={140} minLength={4} placeholder="De quoi veux-tu parler ?" required/></label><label>Ton message<textarea value={body} onChange={e=>setBody(e.target.value)} maxLength={5000} placeholder="Écris ton premier message…" required/></label>
  <div className="poll-create-toggle"><label><input type="checkbox" checked={withPoll} onChange={e=>setWithPoll(e.target.checked)}/> Ajouter un sondage à cette discussion</label></div>
  {withPoll&&<div className="poll-create-fields"><label>Question du sondage<input value={pollQuestion} onChange={e=>setPollQuestion(e.target.value)} maxLength={240} placeholder="Que veux-tu demander ?" required/></label><div className="poll-options-editor">{pollOptions.map((option,i)=><div className="poll-option-input" key={i}><input value={option} onChange={e=>setPollOptions(old=>old.map((v,j)=>j===i?e.target.value:v))} maxLength={100} placeholder={'Choix '+(i+1)} required={i<2}/>{pollOptions.length>2&&<button type="button" onClick={()=>setPollOptions(old=>old.filter((_,j)=>j!==i))} aria-label="Supprimer ce choix">×</button>}</div>)}</div>{pollOptions.length<8&&<button type="button" className="poll-add-option" onClick={()=>setPollOptions(old=>[...old,''])}>+ Ajouter un choix</button>}</div>}
  <button disabled={busy||!title.trim()||!body.trim()}>{busy?'Publication…':'Publier le sujet →'}</button>{status&&<p className="notice">{status}</p>}</form><section className="forum-topics"><div className="forum-section-heading"><div><small>DERNIÈRES DISCUSSIONS</small><h2>Les sujets récents</h2></div><span>{topics.length} sujet{topics.length>1?'s':''}</span></div>{topics.length===0?<div className="card empty">Aucune discussion pour le moment. Lance le premier sujet !</div>:topics.map(t=><Link className="card forum-topic" href={'/forum?id='+t.id} key={t.id}><span className="forum-category">{t.categoryName}</span>{t.hasPoll&&<span className="poll-label">SONDAGE</span>}<h3>{t.title}</h3><p>{t.body.length>170?t.body.slice(0,170)+'…':t.body}</p><div><span>Par {t.profile?.display_name||t.profile?.username||'Membre'}</span><span>💬 {t.replyCount} réponse{t.replyCount>1?'s':''}</span><span>👁 {t.viewCount} vue{t.viewCount>1?'s':''}</span><time>{new Date(t.created_at).toLocaleString('fr-FR')}</time></div></Link>)}</section></div></section></main>
}
