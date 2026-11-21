import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabaseClient'
import MemberAvatar from '../components/MemberAvatar'

type PhotoItem = { key:string; url:string; ownerId:string; ownerName:string; avatar:string|null; createdAt:string; source:'post'|'gallery'; postId?:string; caption?:string }
export default function PhotosPage(){
 const [items,setItems]=useState<PhotoItem[]>([])
 const [userId,setUserId]=useState('')
 const [loading,setLoading]=useState(true)
 const [busy,setBusy]=useState('')
 const [status,setStatus]=useState('')
 const [selected,setSelected]=useState<PhotoItem|null>(null)
 const load=useCallback(async()=>{
  setLoading(true);setStatus('')
  const {data:{user}}=await supabase.auth.getUser()
  if(!user){window.location.href='/auth';return}
  setUserId(user.id)
  const [profilesResult,postsResult]=await Promise.all([
   supabase.from('profiles').select('id,username,display_name,avatar_url,gallery_urls,created_at,is_private').or('is_private.eq.false,id.eq.'+user.id).limit(500),
   supabase.from('posts').select('id,author_id,body,image_url,image_urls,created_at').order('created_at',{ascending:false}).limit(150)
  ])
  if(profilesResult.error||postsResult.error){setStatus('Impossible de charger toutes les photos. '+(profilesResult.error?.message||postsResult.error?.message||''));setLoading(false);return}
  const profiles=profilesResult.data||[]
  const byId=new Map(profiles.map((p:any)=>[p.id,p]))
  const photos:PhotoItem[]=[]
  for(const p of profiles as any[]){
   for(const [index,url] of (p.gallery_urls||[]).entries()){
    if(typeof url==='string'&&url)photos.push({key:'gallery-'+p.id+'-'+index+'-'+url,url,ownerId:p.id,ownerName:p.display_name||p.username||'Membre',avatar:p.avatar_url,createdAt:p.created_at||new Date().toISOString(),source:'gallery'})
   }
  }
  for(const post of postsResult.data||[]){
   const urls=post.image_urls?.length?post.image_urls:(post.image_url?[post.image_url]:[])
   const author:any=byId.get(post.author_id)
   if(!author)continue
   urls.forEach((url:string,index:number)=>{if(url)photos.push({key:'post-'+post.id+'-'+index,url,ownerId:post.author_id,ownerName:author.display_name||author.username||'Membre',avatar:author.avatar_url,createdAt:post.created_at,source:'post',postId:post.id,caption:post.body})})
  }
  photos.sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime())
  setItems(photos);setLoading(false)
 },[])
 useEffect(()=>{load()},[load])
 async function remove(item:PhotoItem){
  if(item.ownerId!==userId||busy)return
  if(!window.confirm('Supprimer cette photo ? Cette action est définitive pour la publication ou la galerie.'))return
  setBusy(item.key);setStatus('')
  if(item.source==='post'&&item.postId){
   const {error}=await supabase.from('posts').delete().eq('id',item.postId).eq('author_id',userId)
   if(error){setStatus('Suppression impossible : '+error.message);setBusy('');return}
  }else{
   const {data,error}=await supabase.from('profiles').select('gallery_urls').eq('id',userId).single()
   if(error){setStatus('Impossible de retrouver ta galerie : '+error.message);setBusy('');return}
   const next=(data?.gallery_urls||[]).filter((url:string)=>url!==item.url)
   const result=await supabase.from('profiles').update({gallery_urls:next}).eq('id',userId)
   if(result.error){setStatus('Suppression impossible : '+result.error.message);setBusy('');return}
  }
  setItems(current=>current.filter(photo=>photo.key!==item.key&&!(item.source==='post'&&photo.postId===item.postId)))
  setSelected(null);setBusy('')
 }
 return <main className="app-shell"><header className="app-header"><Link className="brand" href="/feed">weshbien2<span>.</span></Link><nav><Link href="/feed">Fil</Link><Link href="/explore">Découvrir</Link><Link className="active" href="/photos">Photos</Link><Link href="/online">En ligne</Link></nav></header>
 <section className="directory"><small>GALERIE DE LA COMMUNAUTÉ</small><h1>📸 Photos</h1><p>Retrouve les photos partagées par les membres. Appuie sur une photo pour l’agrandir.</p>
 {status&&<p className="notice" role="status">{status}</p>}
 {loading?<div className="card empty">Chargement des photos…</div>:items.length===0?<div className="card empty"><h3>Pas encore de photos</h3><p>Les photos publiées et les galeries des membres apparaîtront ici.</p><Link href="/feed">Partager une photo →</Link></div>:
 <div className="photo-wall">{items.map(item=><article className="photo-tile" key={item.key}><button type="button" className="photo-open" onClick={()=>setSelected(item)} aria-label="Agrandir la photo"><img src={item.url} alt={'Photo partagée par '+item.ownerName} loading="lazy"/><span className="photo-zoom">⌕</span></button><div className="photo-meta"><Link href={'/profile?id='+item.ownerId}><MemberAvatar userId={item.ownerId} name={item.ownerName} avatarUrl={item.avatar} className="avatar photo-owner-avatar"/><span>{item.ownerName}</span></Link>{item.ownerId===userId&&<button type="button" className="photo-delete" disabled={busy===item.key} onClick={()=>remove(item)}>{busy===item.key?'…':'🗑 Supprimer'}</button>}</div></article>)}</div>}
 </section>
 {selected&&<div className="photo-lightbox" role="dialog" aria-modal="true" aria-label="Photo agrandie" onClick={()=>setSelected(null)}><button type="button" className="photo-close" onClick={()=>setSelected(null)} aria-label="Fermer">×</button><div className="photo-lightbox-content" onClick={e=>e.stopPropagation()}><img src={selected.url} alt={'Photo partagée par '+selected.ownerName}/><div className="photo-lightbox-footer"><span>{selected.ownerName}{selected.caption?' · '+selected.caption:''}</span>{selected.ownerId===userId&&<button type="button" className="photo-delete" disabled={!!busy} onClick={()=>remove(selected)}>🗑 Supprimer ma photo</button>}</div></div></div>}
 <style jsx>{`
 .photo-wall{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px;margin-top:24px}
 .photo-tile{min-width:0;overflow:hidden;border:1px solid var(--border,#ddd);border-radius:18px;background:var(--card,#fff);box-shadow:0 8px 24px #0000000d}
 .photo-open{position:relative;display:block;width:100%;height:210px;padding:0;border:0;background:#111;cursor:zoom-in;overflow:hidden}
 .photo-open img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .25s ease}.photo-open:hover img{transform:scale(1.04)}
 .photo-zoom{position:absolute;right:10px;bottom:10px;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:#0009;color:white;font-size:22px}
 .photo-meta{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px}.photo-meta a{display:flex;align-items:center;gap:8px;min-width:0;text-decoration:none;color:inherit;font-weight:600;font-size:13px}.photo-owner-avatar{width:30px;height:30px;min-width:30px}
 .photo-delete{border:0;border-radius:10px;padding:8px 10px;background:#fee2e2;color:#991b1b;font-size:12px;font-weight:700;cursor:pointer}.photo-delete:disabled{opacity:.55}
 .photo-lightbox{position:fixed;inset:0;z-index:2000;background:#000e;display:flex;align-items:center;justify-content:center;padding:22px}
 .photo-lightbox-content{max-width:min(100%,1000px);max-height:92vh;display:flex;flex-direction:column;gap:10px}.photo-lightbox-content img{max-width:100%;max-height:78vh;object-fit:contain;border-radius:12px}
 .photo-lightbox-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;color:white;font-size:14px}.photo-close{position:absolute;right:18px;top:12px;border:0;background:#ffffff22;color:white;font-size:36px;width:46px;height:46px;border-radius:50%;cursor:pointer}
 @media(max-width:520px){.photo-wall{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.photo-open{height:160px}.photo-meta{padding:8px}.photo-meta a{font-size:11px}.photo-delete{font-size:10px;padding:7px}}
 `}</style>
 </main>
}
