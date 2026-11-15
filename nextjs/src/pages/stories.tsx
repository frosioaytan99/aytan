import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabaseClient'
import MemberAvatar from '../components/MemberAvatar'

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
 async function publish(e:any){
  e.preventDefault()
  if(!file||!userId)return
  if(!file.type.startsWith('image/')){setStatus('Choisis une image.');return}
  if(file.size>8*1024*1024){setStatus('Image trop lourde : 8 Mo maximum.');return}
  setBusy(true);setStatus('')
  const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')
  const path=userId+'/story-'+Date.now()+'.'+ext
  const {error:uploadError}=await supabase.storage.from('community-photos').upload(path,file,{contentType:file.type})
  if(uploadError){setBusy(false);setStatus('Envoi impossible : '+uploadError.message);return}
  const media_url=supabase.storage.from('community-photos').getPublicUrl(path).data.publicUrl
  const {error}=await supabase.from('stories').insert({user_id:userId,media_url,caption:caption.trim(),expires_at:new Date(Date.now()+24*60*60*1000).toISOString()})
  setBusy(false)
  if(error){setStatus('Story envoyée mais publication impossible : '+error.message);return}
  setCaption('');setFile(null);setPreview('');setStatus('Ta story est publiée pour 24 heures !');load()
 }
 return <main className="app-shell">
  <header className="app-header"><Link className="brand" href="/feed">weshbien2<span>.</span></Link><nav><Link href="/feed">Fil</Link><Link href="/stories" className="active">Stories</Link><Link href="/explore">Découvrir</Link><Link href="/forums">Forums</Link><Link href="/inbox">Messages</Link></nav></header>
  <div className="directory stories-page">
   <small>LES MOMENTS DE LA COMMUNAUTÉ</small><h1>Stories</h1><p>Partage un moment avec la communauté. Les stories disparaissent automatiquement après 24 heures.</p>
   <form className="card story-composer" onSubmit={publish}>
    <label>Ajouter une story</label><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={e=>{const f=e.target.files?.[0];if(!f)return;if(!f.type.startsWith('image/')||f.size>8*1024*1024){setStatus('Choisis une image de 8 Mo maximum.');return}setFile(f);setPreview(URL.createObjectURL(f))}}/>
    {preview&&<img className="story-preview" src={preview} alt="Aperçu de la story"/>}
    <input value={caption} maxLength={180} onChange={e=>setCaption(e.target.value)} placeholder="Ajoute une petite légende…"/>
    <button disabled={busy||!file}>{busy?'Publication…':'Partager ma story'}</button>
   </form>
   {status&&<p className="notice">{status}</p>}
   <div className="story-grid">{stories.length===0?<div className="card empty">Aucune story pour le moment. Lance la première !</div>:stories.map(s=><button type="button" className="story-tile" key={s.id} onClick={()=>setActive(s)}>
    <img src={s.media_url} alt={s.caption||'Story de la communauté'}/><span className="story-owner"><MemberAvatar userId={s.user_id} name={s.profile?.display_name||s.profile?.username} avatarUrl={s.profile?.avatar_url} className="avatar"/><b>{s.profile?.display_name||s.profile?.username||'Membre'}</b></span>{s.caption&&<span className="story-caption">{s.caption}</span>}
   </button>)}</div>
  </div>
  {active&&<div className="story-viewer" role="dialog" aria-modal="true" onClick={()=>setActive(null)}><button type="button" aria-label="Fermer" onClick={()=>setActive(null)}>×</button><img src={active.media_url} alt={active.caption||'Story'}/>{active.caption&&<p>{active.caption}</p>}<small>{active.profile?.display_name||active.profile?.username||'Membre'}</small></div>}
 </main>
}
