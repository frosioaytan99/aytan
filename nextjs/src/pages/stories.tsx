import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabaseClient'
import MemberAvatar from '../components/MemberAvatar'
import CommunityImage from '../components/CommunityImage'
import { isAllowedCommunityImage, PRIVATE_MEDIA_PREFIX } from '../lib/communityMedia'
import { uploadModeratedCommunityImage } from '../lib/uploadModeratedCommunityImage'

type Story = { id:string; user_id:string; media_url:string; caption:string; created_at:string; expires_at:string; profile?:any }
type MemberStatus = {id:string;user_id:string;mood:string;body:string;created_at:string;expires_at:string;profile?:any}

export default function StoriesPage(){
 const [stories,setStories]=useState<Story[]>([])
 const [memberStatuses,setMemberStatuses]=useState<MemberStatus[]>([])
 const [mood,setMood]=useState('😊')
 const [statusText,setStatusText]=useState('')
 const [statusMusic,setStatusMusic]=useState('')
 const [statusBusy,setStatusBusy]=useState(false)
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
  const {data:statusRows}=await supabase.from('member_statuses').select('id,user_id,mood,body,created_at,expires_at').gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false}).limit(100)
  const ids=[...new Set([...(data||[]).map((s:any)=>s.user_id),...(statusRows||[]).map((s:any)=>s.user_id)])]
  const {data:profiles}=ids.length?await supabase.from('profiles').select('id,username,display_name,avatar_url').in('id',ids):{data:[]}
  setStories((data||[]).map((s:any)=>({...s,profile:profiles?.find((p:any)=>p.id===s.user_id)})))
  setMemberStatuses((statusRows||[]).map((s:any)=>({...s,profile:profiles?.find((p:any)=>p.id===s.user_id)})))
 }
 useEffect(()=>{load()},[])
 useEffect(()=>{
  if(!preview)return
  return()=>URL.revokeObjectURL(preview)
 },[preview])
  function spotifyStatusEmbed(value:string){const match=value.match(/https?:[/][/](?:open[.])?spotify[.]com[/](track|album|playlist)[/]([A-Za-z0-9]+)/i);return match?{url:`https://open.spotify.com/embed/${match[1]}/${match[2]}`,link:`https://open.spotify.com/${match[1]}/${match[2]}`}:null}
  function statusParts(value:string){const marker='|SPOTIFY|';const index=value.indexOf(marker);return index<0?{body:value,music:null}:{body:value.slice(0,index),music:spotifyStatusEmbed(value.slice(index+marker.length).trim())}}
 async function publishStatus(e:any){e.preventDefault();if(!userId||(!statusText.trim()&&!statusMusic.trim())||statusBusy)return;const music=statusMusic.trim();if(music&&!spotifyStatusEmbed(music)){setStatus('Ajoute un lien Spotify valide vers un titre, un album ou une playlist.');return}setStatusBusy(true);const body=[statusText.trim().slice(0,240),music?'|SPOTIFY|'+music:''].filter(Boolean).join(' ');const {error}=await supabase.from('member_statuses').insert({user_id:userId,mood,body});setStatusBusy(false);if(error){setStatus('Impossible de publier ton statut : '+error.message);return}setStatusText('');setStatusMusic('');setStatus('Ton humeur est publiée pour 24 heures !');await load()}
 async function deleteStatus(id:string){const {error}=await supabase.from('member_statuses').delete().eq('id',id).eq('user_id',userId);if(error){setStatus('Impossible de supprimer le statut : '+error.message);return}setMemberStatuses(current=>current.filter(item=>item.id!==id))}
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
   await supabase.storage.from('community-private').remove([media_url.slice(PRIVATE_MEDIA_PREFIX.length)])
   setStatus('Publication impossible : '+error.message)
   return
  }
  setCaption('');setFile(null);setPreview('');setStatus('Ta story est publiée pour 24 heures !');load()
 }
 return <main className="app-shell">
  <header className="app-header"><Link className="brand" href="/feed">weshbien2<span>.</span></Link><nav><Link href="/feed">Fil</Link><Link href="/stories" className="active">Stories</Link><Link href="/explore">Découvrir</Link><Link href="/forums">Forums</Link><Link href="/inbox">Messages</Link></nav></header>
  <div className="directory stories-page">
   <small>LES MOMENTS DE LA COMMUNAUTÉ</small><h1>Stories</h1><p>Partage un moment avec la communauté. Les stories disparaissent automatiquement après 24 heures.</p>
   <form className="card story-composer mood-status-composer" onSubmit={publishStatus}><label>Comment tu te sens aujourd’hui ?</label><div className="mood-picker">{['😊','😐','😔','😴','🔥','❤️','🤩','😎'].map(item=><button type="button" key={item} className={mood===item?'selected':''} onClick={()=>setMood(item)} aria-pressed={mood===item}>{item}</button>)}</div><input value={statusText} maxLength={240} onChange={e=>setStatusText(e.target.value)} placeholder="Dis à la communauté comment tu vas…"/><input value={statusMusic} onChange={e=>setStatusMusic(e.target.value)} placeholder="Lien Spotify (facultatif)"/><small>Ajoute un titre, un album ou une playlist Spotify à ton statut.</small><button disabled={statusBusy||(!statusText.trim()&&!statusMusic.trim())}>{statusBusy?'Publication…':'Partager mon humeur pendant 24 h'}</button></form>
   {memberStatuses.length>0&&<section className="member-status-wall"><h2>Humeurs du jour</h2><div>{memberStatuses.map(item=><article className="card member-status-card" key={item.id}><span>{item.mood}</span><div><b>{item.profile?.display_name||item.profile?.username||'Membre'}</b><p>{statusParts(item.body).body}</p>{statusParts(item.body).music&&<div className="status-music"><iframe src={statusParts(item.body).music.url} title="Musique Spotify du statut" width="100%" height="152" frameBorder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"/><a href={statusParts(item.body).music.link} target="_blank" rel="noreferrer">Ouvrir dans Spotify</a></div>}<small>Expire le {new Date(item.expires_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</small></div>{item.user_id===userId&&<button type="button" onClick={()=>deleteStatus(item.id)}>×</button>}</article>)}</div></section>}
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
