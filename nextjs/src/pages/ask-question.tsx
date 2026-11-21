import {useEffect,useState} from 'react'
import Link from 'next/link'
import {useRouter} from 'next/router'
import {supabase} from '../lib/supabaseClient'
import {moderateForumContent} from '../lib/moderateForumContent'
import MemberAvatar from '../components/MemberAvatar'

export default function AskQuestionPage(){
 const router=useRouter()
 const [recipient,setRecipient]=useState<any>(null)
 const [currentUser,setCurrentUser]=useState('')
 const [question,setQuestion]=useState('')
 const [busy,setBusy]=useState(false)
 const [status,setStatus]=useState('')
 const [blocked,setBlocked]=useState(false)
 const [loading,setLoading]=useState(true)
 useEffect(()=>{
  if(!router.isReady)return
  let cancelled=false
  async function load(){
   const {data:{user}}=await supabase.auth.getUser()
   if(!user){await router.replace('/auth');return}
   if(cancelled)return
   setCurrentUser(user.id)
   const target=typeof router.query.to==='string'?router.query.to:''
   if(!target||target===user.id){setStatus('Ce profil ne peut pas recevoir de question.');setLoading(false);return}
   const {data:person,error}=await supabase.from('profiles').select('id,display_name,username,avatar_url').eq('id',target).maybeSingle()
   if(cancelled)return
   if(error||!person){setStatus('Ce profil est indisponible.');setLoading(false);return}
   const {data:blocks}=await supabase.from('blocks').select('blocker_id,blocked_id').or(`and(blocker_id.eq.${user.id},blocked_id.eq.${target}),and(blocker_id.eq.${target},blocked_id.eq.${user.id})`)
   if(cancelled)return
   if(blocks?.length){setBlocked(true);setStatus('Vous ne pouvez pas vous envoyer de question.')}
   else setRecipient(person)
   setLoading(false)
  }
  load()
  return()=>{cancelled=true}
 },[router.isReady,router.query.to])
 async function send(e:any){
  e.preventDefault()
  const clean=question.trim()
  if(clean.length<3||clean.length>500||!recipient||!currentUser||busy||blocked)return
  setBusy(true);setStatus('')
  const moderation=await moderateForumContent(clean)
  if(!moderation.allowed){setStatus(moderation.message||'Cette question ne peut pas être envoyée.');setBusy(false);return}
  const {data:{session}}=await supabase.auth.getSession()
  const response=await fetch('/api/profile-question',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+(session?.access_token||'')},body:JSON.stringify({recipient_id:recipient.id,question:clean})})
  const result=await response.json().catch(()=>({}))
  if(response.ok){setQuestion('');setStatus('Ta question a été envoyée !')}
  else setStatus(result.error==='blocked'?'Vous ne pouvez pas vous envoyer de question.':result.error==='invalid_question'?'Ta question doit contenir entre 3 et 500 caractères.':result.error==='profile_not_found'?'Ce profil est indisponible.':'Impossible d’envoyer la question. Réessaie.')
  setBusy(false)
 }
 return <main className="app-shell">
  <header className="app-header"><Link className="brand" href="/feed">weshbien2<span>.</span></Link><nav><Link href="/feed">Fil</Link><Link href="/explore">Découvrir</Link><Link href="/forums">Forums</Link><Link href="/notifications">Notifications</Link><Link href="/profile">Mon profil</Link><Link href="/inbox">Messages</Link></nav></header>
  <section className="forum-page">
   <div className="page-intro"><small>ÉCHANGE ENTRE MEMBRES</small><h1>Poser une question</h1><p>Envoie une question privée à un membre de la communauté.</p></div>
   {loading?<div className="card empty">Chargement…</div>:recipient&&!blocked?<form className="card forum-create" onSubmit={send} style={{maxWidth:680,margin:'0 auto'}}>
    <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}><MemberAvatar userId={recipient.id} name={recipient.display_name||recipient.username} avatarUrl={recipient.avatar_url} className="avatar"/><div><strong>{recipient.display_name||recipient.username||'Membre'}</strong><div><small>@{recipient.username||'membre'}</small></div></div></div>
    <label>Ta question<textarea value={question} onChange={e=>setQuestion(e.target.value)} maxLength={500} minLength={3} required rows={6} placeholder="Écris ta question ici…"/></label>
    <small>{question.length}/500 caractères · Ta question sera envoyée en privé sous forme de notification.</small>
    <button type="submit" disabled={busy||question.trim().length<3}>{busy?'Envoi…':'Envoyer la question →'}</button>
    {status&&<p className="notice" role="status">{status}</p>}
    <Link href={'/profile?id='+recipient.id}>Retour au profil</Link>
   </form>:<div className="card empty"><p>{status||'Ce profil est indisponible.'}</p><Link href="/explore">Retour à la communauté</Link></div>}
  </section>
 </main>
}
