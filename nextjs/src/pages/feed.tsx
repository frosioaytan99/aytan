import { useEffect, useState } from 'react'
import Link from 'next/link'
import SiteLayout from '../components/SiteLayout'
import { supabase } from '../lib/supabaseClient'

type Post = { id:string; author_id:string; body:string; image_url:string|null; created_at:string; profiles?:{display_name:string|null;username:string|null;avatar_url:string|null} }
export default function FeedPage() {
  const [posts,setPosts] = useState<Post[]>([])
  const [body,setBody] = useState('')
  const [imageUrl,setImageUrl] = useState('')
  const [userId,setUserId] = useState('')
  const [status,setStatus] = useState('')
  const [busy,setBusy] = useState(false)
  async function load() {
    const {data,error}=await supabase.from('posts').select('id,author_id,body,image_url,created_at,profiles(display_name,username,avatar_url)').order('created_at',{ascending:false}).limit(40)
    if(error) setStatus('Le fil n’est pas encore configuré dans Supabase.')
    else setPosts((data||[]) as Post[])
  }
  useEffect(()=>{supabase.auth.getUser().then(({data})=>setUserId(data.user?.id||'')); load()},[])
  async function publish(e:React.FormEvent) {
    e.preventDefault(); if(!body.trim()) return
    if(!userId){setStatus('Connecte-toi pour publier.');return}
    setBusy(true);setStatus('')
    const {error}=await supabase.from('posts').insert({author_id:userId,body:body.trim(),image_url:imageUrl.trim()||null})
    setBusy(false)
    if(error)setStatus(error.message)
    else {setBody('');setImageUrl('');setStatus('Publication ajoutée.');load()}
  }
  async function report(postId:string) {
    if(!userId){setStatus('Connecte-toi pour signaler.');return}
    const reason=window.prompt('Pourquoi souhaites-tu signaler cette publication ?')
    if(!reason?.trim())return
    const {error}=await supabase.from('reports').insert({reporter_id:userId,content_type:'post',content_id:postId,reason:reason.trim()})
    setStatus(error?'Impossible d’envoyer le signalement.':'Signalement transmis à la modération.')
  }
  return <SiteLayout title="Le fil de la communauté">
    <div className="community-grid"><section className="feed-column">
      <form className="composer card-surface" onSubmit={publish}>
        <div className="composer-title"><span className="avatar">✦</span><div><strong>Quoi de neuf ?</strong><small>Partage quelque chose avec la communauté.</small></div></div>
        <textarea value={body} onChange={e=>setBody(e.target.value)} maxLength={1200} placeholder="Écris ton message…" rows={4}/>
        <input value={imageUrl} onChange={e=>setImageUrl(e.target.value)} placeholder="Lien d’une image (facultatif)"/>
        <div className="composer-bottom"><small>{body.length}/1200 · Pas d’informations personnelles sensibles.</small><button className="btn btn-primary" disabled={busy||!body.trim()}>{busy?'Publication…':'Publier'}</button></div>
        {status&&<p className="form-status">{status}</p>}
      </form>
      {posts.length===0&&<div className="empty-state card-surface"><div className="empty-icon">✦</div><h2>Le fil commence ici</h2><p>Il n’y a pas encore de publication visible. Sois le premier à partager un message positif.</p></div>}
      {posts.map(post=><article className="post-card card-surface" key={post.id}>
        <div className="post-author"><div className="avatar">{(post.profiles?.display_name||post.profiles?.username||'A').slice(0,1).toUpperCase()}</div><div><strong>{post.profiles?.display_name||post.profiles?.username||'Membre Aytan'}</strong><small>@{post.profiles?.username||'membre'} · {new Date(post.created_at).toLocaleString('fr-FR')}</small></div><button className="text-button report-button" onClick={()=>report(post.id)}>Signaler</button></div>
        <p className="post-body">{post.body}</p>
        {post.image_url&&<img className="post-image-real" src={post.image_url} alt="Image publiée par un membre" loading="lazy"/>}
      </article>)}
    </section><aside className="side-column"><div className="card-surface side-card"><span className="side-icon">🛡️</span><h3>On veille les uns sur les autres</h3><p>Ne partage jamais ton adresse, ton numéro, tes mots de passe ou ta localisation précise.</p><Link href="/safety">Voir les conseils de sécurité →</Link></div><div className="card-surface side-card"><h3>Envie de faire connaissance ?</h3><p>Découvre les membres et leurs centres d’intérêt.</p><Link href="/members" className="btn btn-plain">Découvrir les membres</Link></div></aside></div>
  </SiteLayout>
}
