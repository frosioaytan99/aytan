import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabaseClient'
import MemberAvatar from '../components/MemberAvatar'
import CommunityImage from '../components/CommunityImage'
import { isAllowedCommunityImage } from '../lib/communityMedia'
import { uploadModeratedCommunityImage } from '../lib/uploadModeratedCommunityImage'

type PhotoComment = { id:string; photo_url:string; owner_id:string; author_id:string; body:string; created_at:string; profile?:any }
type PhotoItem = { key:string; url:string; ownerId:string; ownerName:string; avatar:string|null; createdAt:string; source:'post'|'gallery'|'avatar'; postId?:string; caption?:string; comments:PhotoComment[] }
export default function PhotosPage(){
 const [items,setItems]=useState<PhotoItem[]>([])
 const [userId,setUserId]=useState('')
 const [isAdmin,setIsAdmin]=useState(false)
 const [loading,setLoading]=useState(true)
 const [busy,setBusy]=useState('')
 const [commentBusy,setCommentBusy]=useState(false)
 const [uploadBusy,setUploadBusy]=useState(false)
 const [draft,setDraft]=useState('')
 const [status,setStatus]=useState('')
 const [selected,setSelected]=useState<PhotoItem|null>(null)
 const load=useCallback(async()=>{
  setLoading(true);setStatus('')
  const {data:{user}}=await supabase.auth.getUser()
  if(!user){window.location.href='/auth';return}
  setUserId(user.id)
  const {data:adminRole}=await supabase.from('user_roles').select('role').eq('user_id',user.id).eq('role','admin').maybeSingle()
  setIsAdmin(Boolean(adminRole))
  const [profilesResult,postsResult]=await Promise.all([
   (adminRole?supabase.from('profiles').select('id,username,display_name,avatar_url,gallery_urls,created_at,is_private').limit(500):supabase.from('profiles').select('id,username,display_name,avatar_url,gallery_urls,created_at,is_private').or('is_private.eq.false,id.eq.'+user.id).limit(500)),
   supabase.from('posts').select('id,author_id,body,image_url,image_urls,created_at').order('created_at',{ascending:false}).limit(150)
  ])
  if(profilesResult.error||postsResult.error){setStatus('Impossible de charger toutes les photos. '+(profilesResult.error?.message||postsResult.error?.message||''));setLoading(false);return}
  const profiles=profilesResult.data||[]
  const byId=new Map(profiles.map((p:any)=>[p.id,p]))
  const photos:PhotoItem[]=[]
  for(const p of profiles as any[]){
   if(typeof p.avatar_url==='string'&&p.avatar_url)photos.push({key:'avatar-'+p.id+'-'+p.avatar_url,url:p.avatar_url,ownerId:p.id,ownerName:p.display_name||p.username||'Membre',avatar:p.avatar_url,createdAt:p.created_at||new Date().toISOString(),source:'avatar',comments:[]})
   for(const [index,url] of (p.gallery_urls||[]).entries()){
    if(typeof url==='string'&&url)photos.push({key:'gallery-'+p.id+'-'+index+'-'+url,url,ownerId:p.id,ownerName:p.display_name||p.username||'Membre',avatar:p.avatar_url,createdAt:p.created_at||new Date().toISOString(),source:'gallery',comments:[]})
   }
  }
  for(const post of postsResult.data||[]){
   const urls=post.image_urls?.length?post.image_urls:(post.image_url?[post.image_url]:[])
   const author:any=byId.get(post.author_id)
   if(!author)continue
   urls.forEach((url:string,index:number)=>{if(url)photos.push({key:'post-'+post.id+'-'+index,url,ownerId:post.author_id,ownerName:author.display_name||author.username||'Membre',avatar:author.avatar_url,createdAt:post.created_at,source:'post',postId:post.id,caption:post.body,comments:[]})})
  }
  photos.sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime())
  const urls=[...new Set(photos.map(photo=>photo.url))]
  if(urls.length){
   const {data:commentsData,error:commentsError}=await supabase.from('photo_comments').select('id,photo_url,owner_id,author_id,body,created_at').in('photo_url',urls).order('created_at',{ascending:true})
   if(commentsError){setStatus('Les photos sont chargées, mais les commentaires sont indisponibles : '+commentsError.message)}
   else{
    const comments=commentsData||[]
    const authorIds=[...new Set(comments.map((c:any)=>c.author_id))]
    const {data:commentProfiles}=authorIds.length?await supabase.from('profiles').select('id,username,display_name,avatar_url').in('id',authorIds):{data:[]}
    for(const photo of photos)photo.comments=comments.filter((c:any)=>c.photo_url===photo.url).map((c:any)=>({...c,profile:(commentProfiles||[]).find((p:any)=>p.id===c.author_id)}))
   }
  }
  setItems(photos)
  setSelected(current=>current?photos.find(photo=>photo.key===current.key)||null:null)
  setLoading(false)
 },[])
 useEffect(()=>{load()},[load])
 async function addPhoto(file?:File){
  if(!file||!userId||uploadBusy)return
  if(!isAllowedCommunityImage(file)){setStatus('Choisis une image JPG, PNG, WEBP ou GIF de 8 Mo maximum.');return}
  setUploadBusy(true);setStatus('')
  try{
   const {data:profile,error:profileError}=await supabase.from('profiles').select('gallery_urls').eq('id',userId).maybeSingle()
   if(profileError)throw profileError
   const current=Array.isArray(profile?.gallery_urls)?profile.gallery_urls:[]
   if(current.length>=12)throw new Error('Ta galerie est pleine : 12 photos maximum.')
   const url=await uploadModeratedCommunityImage(file)
   const {error}=await supabase.from('profiles').update({gallery_urls:[...current,url]}).eq('id',userId)
   if(error)throw error
   setStatus('Photo ajoutée à ta galerie !')
   await load()
  }catch(error:any){setStatus(error?.message||'Impossible d’ajouter cette photo.')}
  finally{setUploadBusy(false)}
 }
 async function remove(item:PhotoItem){
  if((item.ownerId!==userId&&!isAdmin)||busy)return
  if(!window.confirm('Effacer définitivement cette photo des serveurs ?'))return
  setBusy(item.key);setStatus('')
  const {data:{session}}=await supabase.auth.getSession()
  if(!session?.access_token){setStatus('Reconnecte-toi pour supprimer cette photo.');setBusy('');return}
  const response=await fetch('/api/delete-community-photo',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({photo_url:item.url,owner_id:item.ownerId})})
  const result=await response.json().catch(()=>null)
  if(!response.ok){const detail=result?.details?` — ${result.details}${result.code?` (${result.code})`:''}`:'';setStatus((result?.message||'Suppression impossible : '+(result?.error||'erreur serveur'))+detail);setBusy('');return}
  setItems(current=>current.filter(photo=>photo.url!==item.url))
  setSelected(null);setBusy('')
 }
 async function sendComment(e:any){
  e.preventDefault()
  const text=draft.trim()
  if(!selected||!text||!userId||commentBusy)return
  setCommentBusy(true);setStatus('')
  const {data,error}=await supabase.from('photo_comments').insert({photo_url:selected.url,owner_id:selected.ownerId,author_id:userId,body:text}).select('id,photo_url,owner_id,author_id,body,created_at').single()
  if(error){setStatus('Commentaire impossible : '+error.message);setCommentBusy(false);return}
  const {data:profile}=await supabase.from('profiles').select('id,username,display_name,avatar_url').eq('id',userId).maybeSingle()
  const comment={...data,profile}
  setItems(current=>current.map(photo=>photo.url===selected.url?{...photo,comments:[...photo.comments,comment]}:photo))
  setSelected(current=>current&&current.url===selected.url?{...current,comments:[...current.comments,comment]}:current)
  setDraft('');setCommentBusy(false)
 }
 async function deleteComment(comment:PhotoComment){
  if(comment.author_id!==userId)return
  const {error}=await supabase.from('photo_comments').delete().eq('id',comment.id).eq('author_id',userId)
  if(error){setStatus('Impossible de supprimer le commentaire : '+error.message);return}
  setItems(current=>current.map(photo=>({...photo,comments:photo.comments.filter(c=>c.id!==comment.id)})))
  setSelected(current=>current?{...current,comments:current.comments.filter(c=>c.id!==comment.id)}:null)
 }
 return <main className="app-shell"><header className="app-header"><Link className="brand" href="/feed">weshbien2<span>.</span></Link><nav><Link href="/feed">Fil</Link><Link href="/explore">Découvrir</Link><Link className="active" href="/photos">Photos</Link><Link href="/online">En ligne</Link></nav></header>
 <section className="directory"><small>GALERIE DE LA COMMUNAUTÉ</small><h1>📸 Photos</h1><p>Retrouve les photos partagées par les membres. Appuie sur une photo pour l’agrandir et laisser un commentaire.</p><label className="photo-add-button">{uploadBusy?'Ajout en cours…':'＋ Ajouter une photo'}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploadBusy} onChange={e=>{const file=e.currentTarget.files?.[0];e.currentTarget.value='';void addPhoto(file)}}/></label>
 {status&&<p className="notice" role="status">{status}</p>}
 {loading?<div className="card empty">Chargement des photos…</div>:items.length===0?<div className="card empty"><h3>Pas encore de photos</h3><p>Les photos publiées et les galeries des membres apparaîtront ici.</p><Link href="/feed">Partager une photo →</Link></div>:
 <div className="photo-wall">{items.map(item=><article className="photo-tile" key={item.key}><button type="button" className="photo-open" onClick={()=>{setSelected(item);setDraft('')}} aria-label="Agrandir la photo"><CommunityImage src={item.url} alt={'Photo partagée par '+item.ownerName} className="photo-thumb-image"/><span className="photo-zoom">⌕</span></button><div className="photo-meta"><Link href={'/profile?id='+item.ownerId}><MemberAvatar userId={item.ownerId} name={item.ownerName} avatarUrl={item.avatar} className="avatar photo-owner-avatar"/><span>{item.ownerName}</span></Link><span className="photo-comment-count">💬 {item.comments.length}</span>{(item.ownerId===userId||isAdmin)&&<button type="button" className="photo-delete" disabled={busy===item.key} onClick={()=>remove(item)}>{busy===item.key?'…':item.ownerId===userId?'🗑 Supprimer':'🛡️ Modérer'}</button>}</div></article>)}</div>}
 </section>
 {selected&&<div className="photo-lightbox" role="dialog" aria-modal="true" aria-label="Photo agrandie" onClick={()=>setSelected(null)}><button type="button" className="photo-close" onClick={()=>setSelected(null)} aria-label="Fermer">×</button><div className="photo-lightbox-content" onClick={e=>e.stopPropagation()}><CommunityImage src={selected.url} alt={'Photo partagée par '+selected.ownerName} className="photo-large-image"/><div className="photo-lightbox-footer"><span>{selected.ownerName}{selected.caption?' · '+selected.caption:''}</span>{(selected.ownerId===userId||isAdmin)&&<button type="button" className="photo-delete" disabled={!!busy} onClick={()=>remove(selected)}>{selected.ownerId===userId?'🗑 Supprimer ma photo':'🛡️ Supprimer cette photo'}</button>}</div><section className="photo-comments"><h3>💬 Commentaires ({selected.comments.length})</h3><div className="photo-comment-list">{selected.comments.map(comment=><article className="photo-comment" key={comment.id}><div><b>{comment.profile?.display_name||comment.profile?.username||'Membre'}</b><small>{new Date(comment.created_at).toLocaleString('fr-FR')}</small><p>{comment.body}</p></div>{comment.author_id===userId&&<button type="button" onClick={()=>deleteComment(comment)} aria-label="Supprimer mon commentaire">🗑</button>}</article>)}{selected.comments.length===0&&<p className="photo-no-comments">Pas encore de commentaire. Lance la discussion !</p>}</div><form className="photo-comment-form" onSubmit={sendComment}><input value={draft} onChange={e=>setDraft(e.target.value)} maxLength={500} placeholder="Écrire un commentaire…" aria-label="Écrire un commentaire"/><button type="submit" disabled={!draft.trim()||commentBusy}>{commentBusy?'Envoi…':'Envoyer'}</button></form></section></div></div>}
 <style jsx>{`
 .photo-add-button{display:inline-flex;align-items:center;justify-content:center;margin:10px 0 6px;padding:11px 17px;border:0;border-radius:12px;background:#6d4aff;color:#fff;font-weight:800;cursor:pointer}.photo-add-button input{display:none}.photo-add-button:has(input:disabled){opacity:.65;cursor:wait}\n .photo-wall{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px;margin-top:24px}
 .photo-tile{min-width:0;overflow:hidden;border:1px solid var(--border,#ddd);border-radius:18px;background:var(--card,#fff);box-shadow:0 8px 24px #0000000d}
 .photo-open{position:relative;display:block;width:100%;height:210px;padding:0;border:0;background:#111;cursor:zoom-in;overflow:hidden}
 .photo-open :global(.photo-thumb-image){width:100%;height:100%;object-fit:cover;display:block;transition:transform .25s ease}.photo-open:hover :global(.photo-thumb-image){transform:scale(1.04)}
 .photo-zoom{position:absolute;right:10px;bottom:10px;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:#0009;color:white;font-size:22px}
 .photo-meta{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px}.photo-meta a{display:flex;align-items:center;gap:8px;min-width:0;text-decoration:none;color:inherit;font-weight:600;font-size:13px}.photo-owner-avatar{width:30px;height:30px;min-width:30px}.photo-comment-count{font-size:12px;white-space:nowrap}
 .photo-delete{border:0;border-radius:10px;padding:8px 10px;background:#fee2e2;color:#991b1b;font-size:12px;font-weight:700;cursor:pointer}.photo-delete:disabled{opacity:.55}
 .photo-lightbox{position:fixed;inset:0;z-index:2000;background:#000e;display:flex;align-items:center;justify-content:center;padding:22px;overflow:auto}
 .photo-lightbox-content{width:min(100%,900px);max-height:94vh;display:flex;flex-direction:column;gap:10px;overflow:auto}.photo-lightbox-content :global(.photo-large-image){max-width:100%;max-height:55vh;object-fit:contain;border-radius:12px;align-self:center}
 .photo-lightbox-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;color:white;font-size:14px}
 .photo-comments{background:#fff;color:#171717;border-radius:16px;padding:14px;max-height:34vh;overflow:auto}.photo-comments h3{font-size:16px;margin:0 0 10px}.photo-comment-list{display:flex;flex-direction:column;gap:9px}.photo-comment{display:flex;justify-content:space-between;gap:12px;padding:9px;background:#f5f5f7;border-radius:10px}.photo-comment b{font-size:13px}.photo-comment small{display:block;color:#777;font-size:11px}.photo-comment p{margin:4px 0 0;font-size:14px;white-space:pre-wrap;overflow-wrap:anywhere}.photo-comment>button{border:0;background:transparent;cursor:pointer}.photo-no-comments{color:#777;font-size:13px}.photo-comment-form{display:flex;gap:8px;margin-top:12px}.photo-comment-form input{flex:1;min-width:0;border:1px solid #ddd;border-radius:10px;padding:11px}.photo-comment-form button{border:0;border-radius:10px;background:#6d4aff;color:white;font-weight:700;padding:0 14px}.photo-comment-form button:disabled{opacity:.5}
 .photo-close{position:fixed;right:18px;top:12px;z-index:2;border:0;background:#ffffff22;color:white;font-size:36px;width:46px;height:46px;border-radius:50%;cursor:pointer}
 @media(max-width:520px){.photo-wall{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.photo-open{height:160px}.photo-meta{padding:8px;gap:5px}.photo-meta a{font-size:11px}.photo-delete{font-size:10px;padding:7px}.photo-lightbox{padding:12px}.photo-lightbox-content :global(.photo-large-image){max-height:43vh}.photo-comments{max-height:42vh;padding:11px}.photo-comment-form input{font-size:14px}}
 `}</style>
 </main>
}
