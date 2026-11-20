import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabaseClient'
import MemberAvatar from '../components/MemberAvatar'
import CommunityImage from '../components/CommunityImage'
import { isAllowedCommunityImage } from '../lib/communityMedia'
import { uploadModeratedCommunityImage } from '../lib/uploadModeratedCommunityImage'

type Story = { id:string; user_id:string; media_url:string; caption:string; created_at:string; expires_at:string; profile?:any }

export default function StoriesPage(){
 const [stories,setStories]=useState<Story[]>([])
 const [userId,setUserId]=useState('')
 const [caption,setCaption]=useState('')
 const [file,setFile]=useState<File|null>(null)
 const [preview,setPreview]=useState('')
 const [busy,setBusy]=useState(false)
 const [status,setStatus]=useState('')
 const [active,setActive]=useState<Story|null>(null)

 async function load(){
  const {data:{user}}=await supabase.auth.getUser()
  if(!user){window.location.href='/auth';return}
  setUserId(user.id)
  const {data,error}=await supabase.from('stories').select('id,user_id,media_url,caption,created_at,expires_at').gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false}).limit(100)
  if(error){setStatus('Chargement impossible : '+error.message);return}
  const ids=[...new Set((data||[]).map((s:any)=>s.user_id))]
  const {data:profiles}=ids.length?await supabase.from('profiles').select('id,username,display_name,avatar_url').in('id',ids):{data:[]}
  setStories((data||[]).map((s:any)=>({...s,profile:profiles?.find((p:any)=>p.id===s.user_id)})))
 }
 useEffect(()=>{load()},[])
 useEffect(()=>{
  if(!preview)return
  return()=>URL.revokeObjectURL(preview)
 },[preview])
 async function publish(e:any){
  e.preventDefault()
  if(!file||!userId)return
  if(!isAllowedCommunityImage(file)){setStatus('Choisis une image JPG, PNG, WEBP ou GIF de 8 Mo maximum.');return}
  setBusy(true);setStatus('')
  let media_url:string
  try { media_url=await uploadModeratedCommunityImage(file) }
  catch(error:any){setBusy(false);setStatus(error?.message||'La photo a été refusée ou n’a pas pu être envoyée.');return}
  // The database assigns expires_at so a client cannot extend a story's lifetime.
  const {error}=await supabase.from('stories').insert({user_id:userId,media_url,caption:caption.trim()})
  setBusy(false)
  if(error){
   await supabase.storage.from('community-private').remove([path])
   setStatus('Publication impossible : '+error.message)
   return
  }
  setCaption('');setFile(null);setPreview('');setStatus('Ta story est publiée pour 24 heures !');load()
 }
 return <main className="app-shell">
  <header className="app-header"><Link className="brand" href="/feed">weshbien2<span>.</span></Link><nav><Link href="/feed">Fil</Link><Link href="/stories" className="active">Stories</Link><Link href="/explore">Découvrir</Link><Link href="/forums">Forums</Link><Link href="/inbox">Messages</Link></nav></header>
  <div className="directory stories-page">
   <small>LES MOMENTS DE LA COMMUNAUTÉ</small><h1>Stories</h1><p>Partage un moment avec la communauté. Les stories disparaissent automatiquement après 24 heures.</p>
   <form className="card story-composer" onSubmit={publish}>
    <label>Ajouter une story</label><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={e=>{const selected=e.target.files?.[0];e.currentTarget.value='';if(!selected)return;if(!isAllowedCommunityImage(selected)){setFile(null);setPreview('');setStatus('Choisis une image JPG, PNG, WEBP ou GIF de 8 Mo maximum.');return}setFile(selected);setPreview(URL.createObjectURL(selected))}}/>
    {preview&&<img className="story-preview" src={preview} alt="Aperçu de la story"/>}
    <input value={caption} maxLength={180} onChange={e=>setCaption(e.target.value)} placeholder="Ajoute une petite légende…"/>
    <button disabled={busy||!file}>{busy?'Publication…':'Partager ma story'}</button>
   </form>
   {status&&<p className="notice">{status}</p>}
   <div className="story-grid">{stories.length===0?<div className="card empty">Aucune story pour le moment. Lance la première !</div>:stories.map(s=><button type="button" className="story-tile" key={s.id} onClick={()=>setActive(s)}>
    <CommunityImage src={s.media_url} alt={s.caption||'Story de la communauté'}/><span className="story-owner"><MemberAvatar userId={s.user_id} name={s.profile?.display_name||s.profile?.username} avatarUrl={s.profile?.avatar_url} className="avatar"/><b>{s.profile?.display_name||s.profile?.username||'Membre'}</b></span>{s.caption&&<span className="story-caption">{s.caption}</span>}
   </button>)}</div>
  </div>
  {active&&<div className="story-viewer" role="dialog" aria-modal="true" onClick={()=>setActive(null)}><button type="button" aria-label="Fermer" onClick={()=>setActive(null)}>×</button><CommunityImage src={active.media_url} alt={active.caption||'Story'}/>{active.caption&&<p>{active.caption}</p>}<small>{active.profile?.display_name||active.profile?.username||'Membre'}</small></div>}
 </main>
}
