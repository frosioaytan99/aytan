import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabaseClient'
import MemberAvatar from '../components/MemberAvatar'
import CommunityImage from '../components/CommunityImage'
import { isAllowedCommunityImage } from '../lib/communityMedia'
import { uploadModeratedCommunityImage } from '../lib/uploadModeratedCommunityImage'

type Comment = { id:string; post_id:string; author_id:string; body:string; created_at:string; profile?:any }
type FeedPhotoComment = {id:string;photo_url:string;owner_id:string;author_id:string;body:string;created_at:string;profile?:any}
type Post = { id:string; author_id:string; body:string; image_url:string|null; image_urls?:string[]|null; created_at:string; profile?:any; likes:number; liked:boolean; comments:Comment[] }
export default function FeedPage(){
 const [posts,setPosts]=useState<Post[]>([]),[newMembers,setNewMembers]=useState<any[]>([]),[newForums,setNewForums]=useState<any[]>([]),[newGroups,setNewGroups]=useState<any[]>([]),[publicGroupMessages,setPublicGroupMessages]=useState<any[]>([]),[newFriends,setNewFriends]=useState<any[]>([]),[activeTab,setActiveTab]=useState<'for-you'|'following'>('for-you'),[userId,setUserId]=useState(''),[body,setBody]=useState(''),[photoFiles,setPhotoFiles]=useState<File[]>([]),[photoPreviews,setPhotoPreviews]=useState<string[]>([]),[commentDrafts,setCommentDrafts]=useState<Record<string,string>>({}),[busy,setBusy]=useState(false),[status,setStatus]=useState(''),[isAdmin,setIsAdmin]=useState(false),[selectedPhoto,setSelectedPhoto]=useState<{url:string;post:Post}|null>(null),[photoComments,setPhotoComments]=useState<FeedPhotoComment[]>([]),[photoDraft,setPhotoDraft]=useState(''),[photoCommentBusy,setPhotoCommentBusy]=useState(false),[photoActionBusy,setPhotoActionBusy]=useState(false)
 async function load(){
  const {data:{user}}=await supabase.auth.getUser(); if(!user){location.href='/auth';return} setUserId(user.id)
  const {data:adminRole}=await supabase.from('user_roles').select('role').eq('user_id',user.id).eq('role','admin').maybeSingle()
  setIsAdmin(Boolean(adminRole))
  const empty:any[]=[]
  const membersPromise=supabase.from('profiles').select('id,username,display_name,avatar_url,bio,city,created_at').neq('id',user.id).eq('is_private',false).order('created_at',{ascending:false}).limit(12)
  const forumsPromise=supabase.from('forum_topics').select('id,title,created_at').order('created_at',{ascending:false}).limit(5)
  const groupsPromise=supabase.from('communities').select('id,name,description,created_at').eq('is_private',false).order('created_at',{ascending:false}).limit(5)
  const friendsPromise=supabase.rpc('get_public_friendship_activity')
  const followsPromise=activeTab==='following'?supabase.from('profile_follows').select('followed_id').eq('follower_id',user.id):Promise.resolve({data:empty})
  const [membersResult,forumsResult,groupsResult,friendsResult,followsResult]=await Promise.all([membersPromise,forumsPromise,groupsPromise,friendsPromise,followsPromise])
  setNewMembers(membersResult.data||[])
  setNewForums(forumsResult.data||[])
  setNewGroups(groupsResult.data||[])
  const followed=(followsResult.data||[]).map((x:any)=>x.followed_id)
  let postQuery=supabase.from('posts').select('*').order('created_at',{ascending:false}).limit(50)
  if(activeTab==='following')postQuery=followed.length?postQuery.in('author_id',followed):postQuery.eq('author_id','00000000-0000-0000-0000-000000000000')
  const {data,error}=await postQuery
  if(error){setStatus('Impossible de charger le fil : '+error.message);return}
  const rows=data||[],postIds=rows.map((p:any)=>p.id),authorIds=rows.map((p:any)=>p.author_id)
  const [likesResult,commentsResult]=await Promise.all([
   postIds.length?supabase.from('post_likes').select('post_id,user_id').in('post_id',postIds):Promise.resolve({data:empty}),
   postIds.length?supabase.from('post_comments').select('id,post_id,author_id,body,created_at').in('post_id',postIds).order('created_at',{ascending:true}):Promise.resolve({data:empty})
  ])
  const likes=likesResult.data||[],comments=commentsResult.data||[]
  const allProfileIds=[...new Set([...authorIds,...comments.map((c:any)=>c.author_id)])]
  const [profilesResult,publicGroupsResult]=await Promise.all([
   allProfileIds.length?supabase.from('profiles').select('id,username,display_name,avatar_url,bio').in('id',allProfileIds):Promise.resolve({data:empty}),
   supabase.from('communities').select('id,name').eq('is_private',false).limit(500)
  ])
  const profiles=profilesResult.data||[]
  setPosts(rows.map((p:any)=>({...p,profile:profiles.find((x:any)=>x.id===p.author_id),likes:likes.filter((x:any)=>x.post_id===p.id).length,liked:likes.some((x:any)=>x.post_id===p.id&&x.user_id===user.id),comments:comments.filter((c:any)=>c.post_id===p.id).map((c:any)=>({...c,profile:profiles.find((x:any)=>x.id===c.author_id)}))})))
  const allPublicGroups=publicGroupsResult.data||[]
  const publicIds=allPublicGroups.map((g:any)=>g.id)
  const groupMessagesResult=publicIds.length?await supabase.from('community_messages').select('id,community_id,user_id,body,created_at').in('community_id',publicIds).order('created_at',{ascending:false}).limit(8):{data:empty}
  const groupMessages=groupMessagesResult.data||[]
  const messageAuthors=[...new Set(groupMessages.map((m:any)=>m.user_id))]
  const friends=friendsResult.data||[]
  const friendIds=[...new Set(friends.flatMap((f:any)=>[f.sender_id,f.recipient_id]))]
  const [messageProfilesResult,friendProfilesResult]=await Promise.all([
   messageAuthors.length?supabase.from('profiles').select('id,username,display_name').in('id',messageAuthors):Promise.resolve({data:empty}),
   friendIds.length?supabase.from('profiles').select('id,username,display_name,avatar_url').in('id',friendIds):Promise.resolve({data:empty})
  ])
  const messageProfiles=messageProfilesResult.data||[]
  const friendProfiles=friendProfilesResult.data||[]
  setPublicGroupMessages(groupMessages.map((m:any)=>{const author=messageProfiles.find((p:any)=>p.id===m.user_id);return {...m,groupName:allPublicGroups.find((g:any)=>g.id===m.community_id)?.name,author:author?.display_name||author?.username||'Membre'}}))
  setNewFriends(friends.map((friend:any)=>({...friend,sender:friendProfiles.find((p:any)=>p.id===friend.sender_id),recipient:friendProfiles.find((p:any)=>p.id===friend.recipient_id)})).filter((friend:any)=>friend.sender&&friend.recipient))
 }
 useEffect(()=>{load()},[activeTab])
 async function publish(e:any){
  e.preventDefault()
  if((!body.trim()&&!photoFiles.length)||!userId)return
  if(photoFiles.length>10){setStatus('Tu peux ajouter jusqu’à 10 photos par publication.');return}
  const invalid=photoFiles.find(file=>!isAllowedCommunityImage(file))
  if(invalid){setStatus('Chaque image doit être au format JPG, PNG, WEBP ou GIF et peser 8 Mo maximum.');return}
  setBusy(true)
  let image_urls:string[]=[]
  try { for (const file of photoFiles) image_urls.push(await uploadModeratedCommunityImage(file)) }
  catch(error:any){setBusy(false);setStatus(error?.message||'Une photo a été refusée ou n’a pas pu être envoyée.');return}
  const {error}=await supabase.from('posts').insert({author_id:userId,body:body.trim(),image_url:image_urls[0]||null,image_urls})
  setBusy(false)
  if(error){setStatus('Publication impossible : '+error.message);return}
  setBody('');setPhotoFiles([]);setPhotoPreviews([]);setStatus('Publication ajoutée !');load()
 }
 async function like(p:Post){const q=p.liked?supabase.from('post_likes').delete().eq('post_id',p.id).eq('user_id',userId):supabase.from('post_likes').insert({post_id:p.id,user_id:userId});const {error}=await q;if(error){setStatus('Action impossible : '+error.message);return}load()}
 async function openFeedPhoto(url:string,post:Post){
  setSelectedPhoto({url,post});setPhotoDraft('');setPhotoComments([])
  const {data,error}=await supabase.from('photo_comments').select('id,photo_url,owner_id,author_id,body,created_at').eq('photo_url',url).order('created_at',{ascending:true})
  if(error){setStatus('Impossible de charger les commentaires : '+error.message);return}
  const rows=data||[],ids=[...new Set(rows.map((x:any)=>x.author_id))]
  const {data:profiles}=ids.length?await supabase.from('profiles').select('id,username,display_name,avatar_url').in('id',ids):{data:[]}
  setPhotoComments(rows.map((x:any)=>({...x,profile:(profiles||[]).find((p:any)=>p.id===x.author_id)})))
 }
 async function sendFeedPhotoComment(e:any){
  e.preventDefault();const text=photoDraft.trim();if(!selectedPhoto||!text||!userId||photoCommentBusy)return
  setPhotoCommentBusy(true)
  const {data,error}=await supabase.from('photo_comments').insert({photo_url:selectedPhoto.url,owner_id:selectedPhoto.post.author_id,author_id:userId,body:text}).select('id,photo_url,owner_id,author_id,body,created_at').single()
  if(error){setStatus('Commentaire impossible : '+error.message);setPhotoCommentBusy(false);return}
  const {data:profile}=await supabase.from('profiles').select('id,username,display_name,avatar_url').eq('id',userId).maybeSingle()
  setPhotoComments(current=>[...current,{...data,profile}]);setPhotoDraft('');setPhotoCommentBusy(false)
 }
 async function deleteFeedPhotoComment(comment:FeedPhotoComment){
  if(comment.author_id!==userId)return
  const {error}=await supabase.from('photo_comments').delete().eq('id',comment.id).eq('author_id',userId)
  if(error){setStatus('Impossible de supprimer le commentaire : '+error.message);return}
  setPhotoComments(current=>current.filter(x=>x.id!==comment.id))
 }
 async function reportFeedPhoto(){
  if(!selectedPhoto)return
  const reason=window.prompt('Pourquoi souhaites-tu signaler cette photo ?')
  if(!reason||reason.trim().length<3)return
  const {error}=await supabase.from('reports').insert({reporter_id:userId,content_type:'photo',content_id:selectedPhoto.url,reason:reason.trim().slice(0,1000),status:'pending'})
  setStatus(error?'Signalement impossible : '+error.message:'Photo signalée. Merci.')
 }
 async function deleteFeedPhoto(){
  if(!selectedPhoto||!(selectedPhoto.post.author_id===userId||isAdmin)||photoActionBusy)return
  if(!window.confirm('Supprimer définitivement cette photo ?'))return
  setPhotoActionBusy(true)
  const {data:{session}}=await supabase.auth.getSession()
  if(!session?.access_token){setStatus('Reconnecte-toi pour supprimer cette photo.');setPhotoActionBusy(false);return}
  const response=await fetch('/api/delete-community-photo',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({photo_url:selectedPhoto.url})})
  const result=await response.json().catch(()=>null)
  if(!response.ok){setStatus(result?.message||'Suppression impossible : '+(result?.error||'erreur serveur'));setPhotoActionBusy(false);return}
  setPosts(current=>current.map(post=>post.id!==selectedPhoto.post.id?post:{...post,image_urls:(post.image_urls||[]).filter(url=>url!==selectedPhoto.url),image_url:post.image_url===selectedPhoto.url?null:post.image_url}))
  setSelectedPhoto(null);setPhotoActionBusy(false);setStatus('Photo supprimée.')
 }
 async function reportPost(postId:string){
  const reason=window.prompt('Pourquoi souhaites-tu signaler cette publication ?')
  if(!reason||reason.trim().length<3)return
  const {error}=await supabase.from('reports').insert({reporter_id:userId,content_type:'post',content_id:postId,reason:reason.trim().slice(0,1000),status:'pending'})
  setStatus(error?'Signalement impossible : '+error.message:'Publication signalée. Merci.')
 }
 async function comment(e:any,postId:string){e.preventDefault();const text=(commentDrafts[postId]||'').trim();if(!text||!userId)return;const {error}=await supabase.from('post_comments').insert({post_id:postId,author_id:userId,body:text});if(error){setStatus('Commentaire impossible : '+error.message);return}setCommentDrafts(v=>({...v,[postId]:''}));load()}
 return <main className="app-shell"><div className="app-layout"><aside className="side-card"><b>Ton espace</b><Link href="/feed">🏠 Fil d’actualité</Link><Link href="/explore">🔎 Découvrir</Link><Link href="/questions">❔ Questions</Link><Link href="/forums">💬 Forums</Link><Link href="/profile">👤 Mon profil</Link><Link href="/inbox">✉️ Messages</Link><Link href="/admin">🛡️ Modération</Link></aside><section className="feed-column home-feed-column"><section className="home-discovery"><div className="home-kicker">✧ Nouveaux profils</div><h1>Ils viennent d’arriver</h1><div className="home-newcomers">{newMembers.map(member=><article className="home-member-card" key={member.id}><div className="home-member-cover"><MemberAvatar userId={member.id} name={member.display_name||member.username} avatarUrl={member.avatar_url} className="avatar large"/><strong>{member.display_name||member.username||'Membre'}</strong></div><div className="home-member-details"><span className="home-member-city">⌖ {member.city||'Nouveau membre'}</span><p>{member.bio||'Nouveau profil sur Weshbien, prêt à rejoindre la communauté.'}</p><Link href={'/profile?id='+member.id}>♙ Voir profil</Link></div></article>)}{newMembers.length===0&&<p className="home-muted">Les nouveaux profils apparaîtront ici.</p>}</div><div className="home-feed-tabs"><button type="button" className={activeTab==='for-you'?'active':''} onClick={()=>setActiveTab('for-you')}>✧ Pour toi</button><button type="button" className={activeTab==='following'?'active':''} onClick={()=>setActiveTab('following')}>♧ Abonnements</button></div><h2>Quoi de neuf ?</h2><p className="home-muted">Tes abonnements passent devant, avec juste assez de découverte pour garder un fil vivant.</p><button type="button" className="home-refresh" onClick={()=>load()}>⟳ Actualiser</button></section><section className="community-activity-feed"><div className="activity-heading"><div><div className="home-kicker">✧ LA VIE DE LA COMMUNAUTÉ</div><h2>Les nouveautés</h2><p>Tout ce qui bouge dans ta communauté, au même endroit.</p></div><span className="activity-live"><i/> EN DIRECT</span></div>
  {newForums.map((f:any)=><article className="card post community-activity-post" key={'forum-'+f.id}><div className="post-author"><span className="activity-icon">✦</span><div><b>Nouveau sujet dans les forums</b><small>{new Date(f.created_at).toLocaleString('fr-FR')}</small></div></div><p className="post-body"><Link href={'/forum?id='+f.id}>{f.title}</Link></p></article>)}
  {newGroups.map((g:any)=><article className="card post community-activity-post" key={'group-'+g.id}><div className="post-author"><span className="activity-icon">♧</span><div><b>Nouveau groupe public</b><small>{new Date(g.created_at).toLocaleString('fr-FR')}</small></div></div><p className="post-body"><Link href="/communities">{g.name}</Link></p>{g.description&&<p>{g.description}</p>}</article>)}
  {publicGroupMessages.map((m:any)=><article className="card post community-activity-post" key={'message-'+m.id}><div className="post-author"><span className="activity-icon">☷</span><div><b>{m.author}</b><small>Dans le groupe public <Link href="/communities">{m.groupName}</Link> · {new Date(m.created_at).toLocaleString('fr-FR')}</small></div></div><p className="post-body">{m.body.slice(0,500)}</p></article>)}
  {newFriends.map((f:any)=><article className="card post community-activity-post" key={'friend-'+f.id}><div className="post-author"><span className="activity-icon">♡</span><div><b>Nouvelle amitié</b><small>{new Date(f.updated_at).toLocaleString('fr-FR')}</small></div></div><p className="post-body"><Link href={'/profile?id='+f.sender.id}>{f.sender.display_name||f.sender.username||'Membre'}</Link> est devenu ami avec <Link href={'/profile?id='+f.recipient.id}>{f.recipient.display_name||f.recipient.username||'Membre'}</Link>.</p></article>)}
  {!newForums.length&&!newGroups.length&&!publicGroupMessages.length&&!newFriends.length&&<div className="card empty"><p>Pas encore de nouveauté dans la communauté.</p></div>}
 </section><form className="composer card" onSubmit={publish}><label htmlFor="post-body">Quoi de neuf ?</label><textarea id="post-body" maxLength={1200} value={body} onChange={e=>setBody(e.target.value)} placeholder="Écris quelque chose de positif…"/><label className="post-photo-picker">📷 Ajouter des photos (10 max)<input type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" onChange={e=>{const files=Array.from(e.target.files||[]);e.currentTarget.value='';if(!files.length)return;if(files.length>10){setStatus('Tu peux sélectionner jusqu’à 10 photos.');return}const invalid=files.find(file=>!isAllowedCommunityImage(file));if(invalid){setStatus('Chaque image doit peser 8 Mo maximum.');return}setPhotoFiles(files);setPhotoPreviews(files.map(file=>URL.createObjectURL(file)))}}/></label>{photoPreviews.length>0&&<div className="post-photo-preview-grid">{photoPreviews.map((preview,index)=><div key={preview}><img src={preview} alt={'Aperçu photo '+(index+1)}/><button type="button" onClick={()=>{setPhotoFiles(files=>files.filter((_,i)=>i!==index));setPhotoPreviews(items=>items.filter((_,i)=>i!==index))}}>Retirer</button></div>)}</div>}<small>{photoFiles.length}/10 photos · 8 Mo maximum chacune</small><div className="composer-bottom"><small>{body.length}/1200</small><button disabled={busy||(!body.trim()&&!photoFiles.length)}>{busy?'Publication…':'Publier →'}</button></div></form>{status&&<p className="notice">{status}</p>}{posts.length===0?<div className="card empty"><h3>Le fil est encore calme</h3><p>Sois la première personne à publier quelque chose !</p></div>:posts.map(p=><article className="card post" key={p.id}><div className="post-author"><Link href={'/profile?id='+p.author_id} className="post-profile-link"><MemberAvatar userId={p.author_id} name={p.profile?.display_name||p.profile?.username} avatarUrl={p.profile?.avatar_url} className="avatar"/><div><b>{p.profile?.display_name||p.profile?.username||'Membre'}</b><small>@{p.profile?.username||'membre'}</small></div></Link><small>{new Date(p.created_at).toLocaleString('fr-FR')}</small></div><p className="post-body">{p.body}</p>{(p.image_urls?.length?p.image_urls:(p.image_url?[p.image_url]:[])).map((url:string,index:number)=><button type="button" key={url} className="feed-photo-open" onClick={()=>openFeedPhoto(url,p)} aria-label="Ouvrir la photo et ses commentaires"><CommunityImage className="post-image" src={url} alt={'Photo '+(index+1)+' de la publication'}/><span>Voir la photo et les options</span></button>)}<div className="post-actions"><button onClick={()=>like(p)} type="button">{p.liked?'♥':'♡'} {p.likes} J’aime</button><span>{p.comments.length} commentaire{p.comments.length>1?'s':''}</span><button type="button" onClick={()=>reportPost(p.id)}>⚑ Signaler</button></div><section className="comments"><div className="comments-list">{p.comments.map(c=><div className="comment" key={c.id}><Link href={'/profile?id='+c.author_id} className="comment-profile-link"><MemberAvatar userId={c.author_id} name={c.profile?.display_name||c.profile?.username} avatarUrl={c.profile?.avatar_url} className="avatar comment-author-avatar"/><b>{c.profile?.display_name||c.profile?.username||'Membre'}</b></Link><p>{c.body}</p><small>{new Date(c.created_at).toLocaleString('fr-FR')}</small></div>)}</div><form className="comment-form" onSubmit={e=>comment(e,p.id)}><input aria-label="Écrire un commentaire" maxLength={500} value={commentDrafts[p.id]||''} onChange={e=>setCommentDrafts(v=>({...v,[p.id]:e.target.value}))} placeholder="Écrire un commentaire…"/><button type="submit" disabled={!(commentDrafts[p.id]||'').trim()}>Envoyer</button></form></section></article>)}</section><aside className="right-card"><b>Bienvenue !</b><p>Prends le temps de faire connaissance. Ne partage jamais tes mots de passe ni tes informations privées.</p><Link href="/explore">Découvrir les membres →</Link></aside></div>{selectedPhoto&&<div role="dialog" aria-modal="true" aria-label="Photo et commentaires" onClick={()=>setSelectedPhoto(null)} style={{position:'fixed',inset:0,zIndex:99999,background:'rgba(0,0,0,.88)',display:'flex',alignItems:'center',justifyContent:'center',padding:12,overflowY:'auto'}}><section onClick={e=>e.stopPropagation()} style={{width:'min(100%,760px)',maxHeight:'94vh',overflowY:'auto',background:'var(--card,#fff)',color:'var(--text,inherit)',borderRadius:18,padding:16,position:'relative'}}><button type="button" onClick={()=>setSelectedPhoto(null)} aria-label="Fermer" style={{float:'right',zIndex:2}}>✕ Fermer</button><div style={{clear:'both'}}/><CommunityImage src={selectedPhoto.url} alt="Photo publiée dans le fil" className="post-image"/><p><b>{selectedPhoto.post.profile?.display_name||selectedPhoto.post.profile?.username||'Membre'}</b></p><h3>Commentaires sur la photo</h3><div style={{display:'grid',gap:10}}>{photoComments.map(comment=><div key={comment.id} className="comment"><b>{comment.profile?.display_name||comment.profile?.username||'Membre'}</b><p>{comment.body}</p><small>{new Date(comment.created_at).toLocaleString('fr-FR')}</small>{comment.author_id===userId&&<button type="button" onClick={()=>deleteFeedPhotoComment(comment)}>Supprimer mon commentaire</button>}</div>)}{photoComments.length===0&&<p>Aucun commentaire pour le moment.</p>}</div><form onSubmit={sendFeedPhotoComment} style={{display:'flex',gap:8,marginTop:14}}><input aria-label="Commenter la photo" maxLength={500} value={photoDraft} onChange={e=>setPhotoDraft(e.target.value)} placeholder="Écrire un commentaire…" style={{flex:1,minWidth:0}}/><button type="submit" disabled={photoCommentBusy||!photoDraft.trim()}>{photoCommentBusy?'Envoi…':'Envoyer'}</button></form><div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:16}}><button type="button" onClick={reportFeedPhoto}>⚑ Signaler la photo</button>{(selectedPhoto.post.author_id===userId||isAdmin)&&<button type="button" disabled={photoActionBusy} onClick={deleteFeedPhoto}>🗑 Supprimer la photo</button>}</div></section></div>}</main>
}
