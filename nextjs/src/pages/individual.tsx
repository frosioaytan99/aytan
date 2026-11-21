import { useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { supabase } from '../lib/supabaseClient'
import MemberAvatar from '../components/MemberAvatar'
import CommunityImage from '../components/CommunityImage'
import { isAllowedCommunityImage, communityImageExtension } from '../lib/communityMedia'

type Comment = { id:string; post_id:string; author_id:string; body:string; created_at:string; profile?:any }
type Post = { id:string; author_id:string; body:string; image_urls:string[]; created_at:string; profile?:any; likes:number; liked:boolean; comments:Comment[] }

export default function IndividualPage() {
  const [accepted,setAccepted]=useState(false)
  const [activeTab,setActiveTab]=useState<'fil'|'reglement'>('fil')
  const [posts,setPosts]=useState<Post[]>([])
  const [userId,setUserId]=useState('')
  const [body,setBody]=useState('')
  const [files,setFiles]=useState<File[]>([])
  const [previews,setPreviews]=useState<string[]>([])
  const [drafts,setDrafts]=useState<Record<string,string>>({})
  const [busy,setBusy]=useState(false)
  const [status,setStatus]=useState('')
  const [loading,setLoading]=useState(true)

  async function loadFeed(){
    const {data:{user}}=await supabase.auth.getUser()
    if(!user){window.location.href='/auth';return}
    setUserId(user.id)
    const {data,error}=await supabase.from('individual_posts').select('*').order('created_at',{ascending:false}).limit(50)
    if(error){setStatus('Impossible de charger le fil : '+error.message);setLoading(false);return}
    const rows=data||[],ids=rows.map((p:any)=>p.id)
    const {data:likes}=ids.length?await supabase.from('individual_post_likes').select('post_id,user_id').in('post_id',ids):{data:[]}
    const {data:comments}=ids.length?await supabase.from('individual_post_comments').select('id,post_id,author_id,body,created_at').in('post_id',ids).order('created_at',{ascending:true}):{data:[]}
    const authorIds=[...new Set([...rows.map((p:any)=>p.author_id),...(comments||[]).map((c:any)=>c.author_id)])]
    const {data:profiles}=authorIds.length?await supabase.from('profiles').select('id,username,display_name,avatar_url').in('id',authorIds):{data:[]}
    setPosts(rows.map((p:any)=>({...p,profile:profiles?.find((x:any)=>x.id===p.author_id),likes:likes?.filter((x:any)=>x.post_id===p.id).length||0,liked:!!likes?.some((x:any)=>x.post_id===p.id&&x.user_id===user.id),comments:(comments||[]).filter((c:any)=>c.post_id===p.id).map((c:any)=>({...c,profile:profiles?.find((x:any)=>x.id===c.author_id)}))})))
    setLoading(false)
  }

  useEffect(()=>{if(accepted)void loadFeed()},[accepted])

  function acceptWarning(){
    setAccepted(true)
  }

  async function publish(e:any){
    e.preventDefault()
    if((!body.trim()&&!files.length)||!userId)return
    if(files.length>10){setStatus('Tu peux ajouter jusqu’à 10 images.');return}
    if(files.some(f=>!isAllowedCommunityImage(f))){setStatus('Images JPG, PNG, WEBP ou GIF uniquement, 8 Mo maximum chacune.');return}
    setBusy(true);setStatus('')
    const urls:string[]=[]
    try{
      for(const file of files){
        const path=userId+'/individual/'+Date.now()+'-'+Math.random().toString(36).slice(2,10)+'.'+communityImageExtension(file)
        const {error}=await supabase.storage.from('community-private').upload(path,file,{contentType:file.type,upsert:false})
        if(error)throw error
        urls.push('private-media:'+path)
      }
      const {error}=await supabase.from('individual_posts').insert({author_id:userId,body:body.trim(),image_urls:urls})
      if(error)throw error
      setBody('');setFiles([]);previews.forEach(URL.revokeObjectURL);setPreviews([])
      setStatus('Publication ajoutée dans Individuel.')
      await loadFeed()
    }catch(err:any){setStatus(err?.message||'La publication n’a pas pu être envoyée.')}
    finally{setBusy(false)}
  }

  async function toggleLike(post:Post){
    const query=post.liked
      ?supabase.from('individual_post_likes').delete().eq('post_id',post.id).eq('user_id',userId)
      :supabase.from('individual_post_likes').insert({post_id:post.id,user_id:userId})
    const {error}=await query
    if(error){setStatus('Action impossible : '+error.message);return}
    await loadFeed()
  }

  async function addComment(e:any,postId:string){
    e.preventDefault();const text=(drafts[postId]||'').trim();if(!text)return
    const {error}=await supabase.from('individual_post_comments').insert({post_id:postId,author_id:userId,body:text})
    if(error){setStatus('Commentaire impossible : '+error.message);return}
    setDrafts(v=>({...v,[postId]:''}));await loadFeed()
  }

  async function reportPost(postId:string){
    const reason=window.prompt('Pourquoi souhaites-tu signaler cette publication ?')
    if(!reason||reason.trim().length<3)return
    const {error}=await supabase.from('reports').insert({reporter_id:userId,content_type:'individual_post',content_id:postId,reason:reason.trim().slice(0,1000),status:'pending'})
    setStatus(error?'Signalement impossible : '+error.message:'Signalement envoyé aux administrateurs. Merci.')
  }

  if(!accepted)return (
    <>
      <Head><title>Weshbien Individuel — Avertissement</title><meta name="robots" content="noindex,nofollow"/></Head>
      <main className="app-shell" style={{maxWidth:760,margin:'0 auto',padding:'32px 18px 120px'}}>
        <section className="card" style={{padding:'clamp(22px,5vw,38px)',border:'1px solid rgba(245,158,11,.45)'}}>
          <div style={{fontSize:42,marginBottom:12}} aria-hidden="true">⚠️</div>
          <p style={{fontWeight:800,letterSpacing:'.08em',fontSize:12,color:'#b45309'}}>18+</p>
          <h1 style={{fontSize:'clamp(26px,5vw,36px)',margin:'8px 0 14px'}}>Conditions d’utilisation avant d’entrer</h1>
          <p style={{fontSize:16,lineHeight:1.7}}>Cet espace est ouvert à tous les membres après lecture et acceptation des conditions. Il sert à partager des photos inhabituelles ou susceptibles de surprendre, choquer ou déranger. Contrairement au fil classique, les images n’y sont pas vérifiées automatiquement par une intelligence artificielle.</p>
          <p style={{fontSize:14,lineHeight:1.7}}>Les contenus signalés peuvent être examinés et retirés par les administrateurs.</p>
          <button type="button" onClick={acceptWarning} style={{marginTop:18,width:'100%',padding:'14px 18px',border:0,borderRadius:14,background:'#b45309',color:'#fff',fontWeight:800,cursor:'pointer'}}>J’ai lu et j’accepte les conditions</button>
          <p style={{marginTop:20,fontSize:13}}><Link href="/feed">← Retour à Weshbien classique</Link></p>
        </section>
      </main>
    </>
  )

  return (
    <>
      <Head><title>Weshbien Individuel</title><meta name="robots" content="noindex,nofollow"/></Head>
      <main className="app-shell">
        <header className="app-header"><Link className="brand" href="/">weshbien2<span>.</span></Link><nav><Link href="/feed">Classique</Link><Link href="/individual" className="active">⚠️ Individuel</Link><Link href="/profile">Mon profil</Link><Link href="/inbox">Messages</Link></nav></header>
        <div className="app-layout">
          <aside className="side-card"><b>Ton espace</b><Link href="/feed">🏠 Weshbien classique</Link><Link href="/individual">⚠️ Individuel</Link><Link href="/profile">👤 Mon profil</Link><Link href="/inbox">✉️ Messages</Link></aside>
          <section className="feed-column">
            <div className="page-intro"><small>ESPACE INDIVIDUEL · PHOTOS INHABITUELLES · SANS VÉRIFICATION IA</small><h1>Weshbien Individuel ⚠️</h1><p>Un espace ouvert aux membres après lecture des conditions, pour les photos qui peuvent être inhabituelles ou dérangeantes. Les contenus interdits restent interdits.</p></div>
            <div role="tablist" aria-label="Navigation Individuel" style={{display:'flex',gap:8,marginBottom:16}}>
              <button type="button" role="tab" aria-selected={activeTab==='fil'} onClick={()=>setActiveTab('fil')} style={{padding:'10px 16px',borderRadius:12,border:0,fontWeight:700,background:activeTab==='fil'?'#6d28d9':'var(--card,#fff)',color:activeTab==='fil'?'#fff':'inherit'}}>Publications</button>
              <button type="button" role="tab" aria-selected={activeTab==='reglement'} onClick={()=>setActiveTab('reglement')} style={{padding:'10px 16px',borderRadius:12,border:'1px solid rgba(245,158,11,.5)',fontWeight:700,background:activeTab==='reglement'?'#b45309':'var(--card,#fff)',color:activeTab==='reglement'?'#fff':'inherit'}}>📜 Règlement</button>
            </div>
            {activeTab==='reglement'?<section className="card" style={{padding:20,lineHeight:1.65}}>
              <h2>Règlement de l’espace Individuel</h2>
              <p><b>Accès :</b> cet espace est ouvert à tous les membres après lecture et acceptation des conditions. Il peut contenir des photos inhabituelles, choquantes ou dérangeantes. N’y accède pas si tu ne souhaites pas voir ce type de contenu.</p>
              <h3>Images et contenus +18</h3>
              <p>Cet espace est réservé aux adultes. Les photos de mineurs et les contenus sexuels impliquant des mineurs y sont interdits.</p>
              <h3>Contenus strictement interdits</h3>
              <ul><li>Toute représentation sexuelle impliquant un mineur, réelle ou fictive.</li><li>Exploitation, coercition, violence sexuelle ou partage intime sans consentement.</li><li>Menaces, harcèlement, haine, incitation à la violence ou activités illégales.</li><li>Images intimes d’une personne publiées sans son accord.</li></ul>
              <h3>Avant de publier</h3>
              <ul><li>Publie uniquement des images que tu as le droit de partager.</li><li>Ne divulgue pas d’adresse, de numéro, de document ou d’information privée.</li><li>Préviens clairement si une image peut choquer et évite les contenus graphiques.</li><li>Ne contourne pas les signalements et respecte les autres membres.</li></ul>
              <h3>Modération et signalements</h3>
              <p>Les images de cet espace ne sont pas vérifiées automatiquement par IA. Les protections techniques restent actives. Les membres peuvent signaler un contenu ; les administrateurs peuvent l’examiner, le retirer et prendre des mesures sur le compte en cas d’abus.</p>
              <p><b>Important :</b> l’absence de vérification IA ne signifie pas l’absence de règles ni une autorisation de publier n’importe quel contenu. Tous les membres peuvent accéder à cet espace après avoir lu et accepté ces conditions.</p>
              <button type="button" onClick={()=>setActiveTab('fil')} style={{padding:'11px 16px',border:0,borderRadius:12,background:'#6d28d9',color:'#fff',fontWeight:700}}>Retour aux publications</button>
            </section>:<>

            <div className="card" style={{padding:14,marginBottom:16,border:'1px solid rgba(245,158,11,.4)'}}><b>Rappel sécurité</b><p style={{margin:'6px 0 0',fontSize:13}}>Les images ne sont pas analysées par IA dans cet espace. Les signalements restent actifs et les contenus interdits peuvent être supprimés.</p></div>
            <form className="composer card" onSubmit={publish}>
              <label htmlFor="individual-post-body">Publier dans Individuel</label>
              <textarea id="individual-post-body" maxLength={1200} value={body} onChange={e=>setBody(e.target.value)} placeholder="Écris ton message…"/>
              <label className="post-photo-picker">📷 Ajouter des images (10 max)<input type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" onChange={e=>{const selected=Array.from(e.target.files||[]);e.currentTarget.value='';if(!selected.length)return;if(selected.length>10||selected.some(f=>!isAllowedCommunityImage(f))){setStatus('JPG, PNG, WEBP ou GIF uniquement, 8 Mo maximum par image et 10 images maximum.');return}previews.forEach(URL.revokeObjectURL);setFiles(selected);setPreviews(selected.map(f=>URL.createObjectURL(f)))}}/></label>
              {previews.length>0&&<div className="post-photo-preview-grid">{previews.map((src,i)=><div key={src}><img src={src} alt={'Aperçu '+(i+1)}/><button type="button" onClick={()=>{setFiles(v=>v.filter((_,n)=>n!==i));URL.revokeObjectURL(previews[i]);setPreviews(v=>v.filter((_,n)=>n!==i))}}>Retirer</button></div>)}</div>}
              <small>{files.length}/10 images · 8 Mo maximum chacune · aucune vérification IA</small>
              <div className="composer-bottom"><small>{body.length}/1200</small><button disabled={busy||(!body.trim()&&!files.length)}>{busy?'Envoi…':'Publier →'}</button></div>
            </form>
            {status&&<p className="notice" role="status">{status}</p>}
            {loading?<div className="card empty">Chargement de l’espace Individuel…</div>:posts.length===0?<div className="card empty"><h3>Pas encore de publication</h3><p>Les publications de cet espace apparaîtront ici, indépendamment du fil classique.</p></div>:posts.map(p=><article className="card post" key={p.id}>
              <div className="post-author"><Link href={'/profile?id='+p.author_id} className="post-profile-link"><MemberAvatar userId={p.author_id} name={p.profile?.display_name||p.profile?.username} avatarUrl={p.profile?.avatar_url} className="avatar"/><div><b>{p.profile?.display_name||p.profile?.username||'Membre'}</b><small>@{p.profile?.username||'membre'}</small></div></Link><small>{new Date(p.created_at).toLocaleString('fr-FR')}</small></div>
              {p.body&&<p className="post-body">{p.body}</p>}
              {(p.image_urls||[]).map((url,index)=><CommunityImage key={url} className="post-image individual-post-image" style={{display:'block',width:'100%',maxWidth:'280px',height:'180px',maxHeight:'180px',objectFit:'contain',margin:'10px auto'}} src={url} alt={'Image '+(index+1)+' de la publication'}/>)}
              <div className="post-actions"><button type="button" onClick={()=>toggleLike(p)}>{p.liked?'♥':'♡'} {p.likes} J’aime</button><span>{p.comments.length} commentaire{p.comments.length>1?'s':''}</span><button type="button" onClick={()=>reportPost(p.id)}>⚑ Signaler</button></div>
              <section className="comments"><div className="comments-list">{p.comments.map(c=><div className="comment" key={c.id}><Link href={'/profile?id='+c.author_id} className="comment-profile-link"><MemberAvatar userId={c.author_id} name={c.profile?.display_name||c.profile?.username} avatarUrl={c.profile?.avatar_url} className="avatar comment-author-avatar"/><b>{c.profile?.display_name||c.profile?.username||'Membre'}</b></Link><p>{c.body}</p><small>{new Date(c.created_at).toLocaleString('fr-FR')}</small></div>)}</div><form className="comment-form" onSubmit={e=>addComment(e,p.id)}><input aria-label="Écrire un commentaire" maxLength={500} value={drafts[p.id]||''} onChange={e=>setDrafts(v=>({...v,[p.id]:e.target.value}))} placeholder="Écrire un commentaire…"/><button type="submit" disabled={!(drafts[p.id]||'').trim()}>Envoyer</button></form></section>
            </article>)}
            </>}
          </section>
          <aside className="right-card"><b>Un espace à part</b><p>Les publications et images ici sont stockées séparément du fil Weshbien classique. Utilise le bouton Signaler en cas de problème.</p><Link href="/feed">Retour au fil classique →</Link></aside>
        </div>
      </main>
    </>
  )
}
