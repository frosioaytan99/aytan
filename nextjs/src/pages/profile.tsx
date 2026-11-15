import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import MemberAvatar from '../components/MemberAvatar'

type ProfileData = { id:string; display_name:string|null; username:string|null; bio:string|null; interests:string|null; avatar_url?:string|null; is_private:boolean|null; age?:number|null; city?:string|null; favorite_music?:string|null; hobbies?:string|null; gallery_urls?:string[]|null; last_seen_at?:string|null }
type FriendRequest = { id:string; sender_id:string; recipient_id:string; status:'pending'|'accepted'|'declined' }

export default function ProfilePage() {
 const router=useRouter()
 const [uid,setUid]=useState('')
 const [me,setMe]=useState(false)
 const [profile,setProfile]=useState<ProfileData|null>(null)
 const [name,setName]=useState('')
 const [username,setUsername]=useState('')
 const [bio,setBio]=useState('')
 const [interests,setInterests]=useState('')
 const [age,setAge]=useState('')
 const [city,setCity]=useState('')
 const [favoriteMusic,setFavoriteMusic]=useState('')
 const [hobbies,setHobbies]=useState('')
 const [galleryUrls,setGalleryUrls]=useState<string[]>([])
 const [galleryBusy,setGalleryBusy]=useState(false)
 const [avatarUrl,setAvatarUrl]=useState('')
 const [photoBusy,setPhotoBusy]=useState(false)
 const [liked,setLiked]=useState(false)
 const [likeCount,setLikeCount]=useState(0)
 const [privateProfile,setPrivateProfile]=useState(false)
 const [status,setStatus]=useState('')
 const [loading,setLoading]=useState(true)
 const [currentUser,setCurrentUser]=useState('')
 const [friendRequest,setFriendRequest]=useState<FriendRequest|null>(null)
 const [friendBusy,setFriendBusy]=useState(false)
 const [blocked,setBlocked]=useState(false)

 async function loadFriendState(userId:string,targetId:string){
  const {data,error}=await supabase.from('friend_requests').select('id,sender_id,recipient_id,status').or(`and(sender_id.eq.${userId},recipient_id.eq.${targetId}),and(sender_id.eq.${targetId},recipient_id.eq.${userId})`).maybeSingle()
  if(!error)setFriendRequest(data as FriendRequest|null)
  const {data:block}=await supabase.from('blocks').select('blocker_id').eq('blocker_id',userId).eq('blocked_id',targetId).maybeSingle()
  setBlocked(!!block)
 }
 useEffect(()=>{
  if(!router.isReady)return
  let cancelled=false
  async function loadProfile(){
   setLoading(true);setStatus('')
   const {data:{user},error:authError}=await supabase.auth.getUser()
   if(cancelled)return
   if(authError||!user){router.replace('/auth');return}
   const target=typeof router.query.id==='string'?router.query.id:user.id
   setUid(target);setCurrentUser(user.id);setMe(target===user.id)
   const {data,error}=await supabase.from('profiles').select('id,display_name,username,bio,interests,avatar_url,is_private,age,city,favorite_music,hobbies,gallery_urls,last_seen_at').eq('id',target).maybeSingle()
   if(cancelled)return
   if(error){setProfile(null);setStatus('Impossible de charger ce profil : '+error.message)}
   else if(data){
    setProfile(data as ProfileData);setName(data.display_name||'');setUsername(data.username||'');setBio(data.bio||'');setInterests(data.interests||'');setAvatarUrl(data.avatar_url||'');setPrivateProfile(!!data.is_private);setAge(data.age?String(data.age):'');setCity(data.city||'');setFavoriteMusic(data.favorite_music||'');setHobbies(data.hobbies||'');setGalleryUrls(data.gallery_urls||[])
    if(target!==user.id){await loadFriendState(user.id,target);const likes=await supabase.from('profile_likes').select('id',{count:'exact',head:true}).eq('to_user_id',target);const mine=await supabase.from('profile_likes').select('id').eq('from_user_id',user.id).eq('to_user_id',target).maybeSingle();setLikeCount(likes.count||0);setLiked(!!mine.data)}
   }else{setProfile(null);setName('');setUsername('');setBio('');setInterests('');setGalleryUrls([]);setAge('');setCity('');setFavoriteMusic('');setHobbies('');setStatus(target===user.id?'Ton profil n’a pas encore été créé. Tu peux le compléter ci-dessous.':'Ce profil est introuvable, privé ou indisponible.')}
   if(!cancelled)setLoading(false)
  }
  loadProfile()
  return()=>{cancelled=true}
 },[router.isReady,router.query.id])

 async function reportProfile(){
  const reason=window.prompt('Pourquoi souhaites-tu signaler ce profil ?')
  if(!reason||reason.trim().length<3)return
  const {data:{user}}=await supabase.auth.getUser()
  if(!user)return
  const {error}=await supabase.from('reports').insert({reporter_id:user.id,content_type:'profile',content_id:uid,reason:reason.trim().slice(0,1000),status:'pending'})
  setStatus(error?'Signalement impossible : '+error.message:'Profil signalé. Merci de nous aider à protéger la communauté.')
 }
 async function uploadAvatar(file?:File){
  if(!file||!uid)return
  if(!file.type.startsWith('image/')){setStatus('Choisis un fichier image.');return}
  if(file.size>8*1024*1024){setStatus('Photo trop lourde : 8 Mo maximum.');return}
  setPhotoBusy(true);setStatus('')
  const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')
  const path=uid+'/avatar-'+Date.now()+'.'+ext
  const {error:uploadError}=await supabase.storage.from('community-photos').upload(path,file,{contentType:file.type})
  if(uploadError){setStatus('Envoi impossible : '+uploadError.message);setPhotoBusy(false);return}
  const url=supabase.storage.from('community-photos').getPublicUrl(path).data.publicUrl
  const {error}=await supabase.from('profiles').upsert({id:uid,avatar_url:url},{onConflict:'id'})
  if(error)setStatus('Photo envoyée mais profil non actualisé : '+error.message)
  else{setAvatarUrl(url);setStatus('Photo de profil mise à jour !')}
  setPhotoBusy(false)
 }
 async function uploadGalleryPhoto(file?:File){
  if(!file||!uid)return
  if(!file.type.startsWith('image/')){setStatus('Choisis un fichier image.');return}
  if(file.size>8*1024*1024){setStatus('Photo trop lourde : 8 Mo maximum.');return}
  if(galleryUrls.length>=6){setStatus('Tu peux ajouter jusqu’à 6 photos dans ta galerie.');return}
  setGalleryBusy(true);setStatus('')
  const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')
  const path=uid+'/gallery-'+Date.now()+'.'+ext
  const {error:uploadError}=await supabase.storage.from('community-photos').upload(path,file,{contentType:file.type})
  if(uploadError){setStatus('Envoi impossible : '+uploadError.message);setGalleryBusy(false);return}
  const url=supabase.storage.from('community-photos').getPublicUrl(path).data.publicUrl
  const next=[...galleryUrls,url]
  const {error}=await supabase.from('profiles').upsert({id:uid,gallery_urls:next},{onConflict:'id'})
  if(error)setStatus('Photo envoyée mais galerie non actualisée : '+error.message)
  else{setGalleryUrls(next);setStatus('Photo ajoutée à ta galerie !')}
  setGalleryBusy(false)
 }
 async function removeGalleryPhoto(url:string){
  if(!window.confirm('Retirer cette photo de ta galerie ?'))return
  const next=galleryUrls.filter(item=>item!==url)
  const {error}=await supabase.from('profiles').update({gallery_urls:next}).eq('id',uid)
  if(error)setStatus('Impossible de retirer la photo : '+error.message)
  else{setGalleryUrls(next);setStatus('Photo retirée de ta galerie.')}
 }
 async function save(e:any){
  e.preventDefault();if(!uid)return
  setStatus('')
  const parsedAge=age.trim()===''?null:Number(age)
  if(parsedAge!==null&&(!Number.isInteger(parsedAge)||parsedAge<13||parsedAge>26)){setStatus('L’âge doit être compris entre 13 et 26 ans.');return}
  const {data,error}=await supabase.from('profiles').upsert({id:uid,display_name:name.trim(),username:username.trim().toLowerCase(),bio:bio.trim(),interests:interests.trim(),avatar_url:avatarUrl||null,is_private:privateProfile,age:parsedAge,city:city.trim(),favorite_music:favoriteMusic.trim(),hobbies:hobbies.trim(),gallery_urls:galleryUrls},{onConflict:'id'}).select('id,display_name,username,bio,interests,avatar_url,is_private,age,city,favorite_music,hobbies,gallery_urls').single()
  if(error){setStatus('Enregistrement impossible : '+error.message);return}
  setProfile(data as ProfileData);setStatus('Profil enregistré !')
 }
 async function toggleLike(){
  if(!currentUser||!uid||friendBusy)return
  setFriendBusy(true);setStatus('')
  if(liked){
   const {error}=await supabase.from('profile_likes').delete().eq('from_user_id',currentUser).eq('to_user_id',uid)
   if(error)setStatus('Impossible de retirer le like : '+error.message)
   else{setLiked(false);setLikeCount(v=>Math.max(0,v-1))}
  }else{
   const {error}=await supabase.from('profile_likes').insert({from_user_id:currentUser,to_user_id:uid})
   if(error)setStatus('Impossible d’aimer ce profil : '+error.message)
   else{setLiked(true);setLikeCount(v=>v+1)}
  }
  setFriendBusy(false)
 }
 async function sendFriendRequest(){
  if(!currentUser||!uid||friendBusy)return
  setFriendBusy(true);setStatus('')
  const {data,error}=await supabase.from('friend_requests').insert({sender_id:currentUser,recipient_id:uid}).select('id,sender_id,recipient_id,status').single()
  if(error)setStatus(error.code==='23505'?'Une demande existe déjà entre vous.':'Demande impossible : '+error.message)
  else setFriendRequest(data as FriendRequest)
  setFriendBusy(false)
 }
 async function answerFriendRequest(answer:'accepted'|'declined'){
  if(!friendRequest||friendBusy)return
  setFriendBusy(true);setStatus('')
  const {data,error}=await supabase.from('friend_requests').update({status:answer,updated_at:new Date().toISOString()}).eq('id',friendRequest.id).eq('status','pending').select('id,sender_id,recipient_id,status').single()
  if(error)setStatus('Action impossible : '+error.message)
  else setFriendRequest(data as FriendRequest)
  setFriendBusy(false)
 }
 async function removeFriend(){
  if(!friendRequest||friendRequest.status!=='accepted'||friendBusy)return
  if(!window.confirm('Retirer cette personne de tes amis ?'))return
  setFriendBusy(true);const {error}=await supabase.from('friend_requests').delete().eq('id',friendRequest.id)
  if(error)setStatus('Impossible de retirer cet ami : '+error.message)
  else{setFriendRequest(null);setStatus('Cette personne a été retirée de tes amis.')}
  setFriendBusy(false)
 }
 async function toggleBlock(){
  if(!currentUser||!uid||friendBusy)return
  const action=blocked?'débloquer':'bloquer'
  if(!window.confirm('Veux-tu vraiment '+action+' cette personne ?'))return
  setFriendBusy(true);setStatus('')
  if(blocked){
   const {error}=await supabase.from('blocks').delete().eq('blocker_id',currentUser).eq('blocked_id',uid)
   if(error)setStatus('Impossible de débloquer : '+error.message)
   else{setBlocked(false);setStatus('Cette personne est débloquée.')}
  }else{
   const {error}=await supabase.from('blocks').insert({blocker_id:currentUser,blocked_id:uid})
   if(error)setStatus('Impossible de bloquer : '+error.message)
   else{
    setBlocked(true)
    if(friendRequest?.status==='accepted')await supabase.from('friend_requests').delete().eq('id',friendRequest.id)
    setFriendRequest(null);setStatus('Cette personne est bloquée et retirée de tes amis.')
   }
  }
  setFriendBusy(false)
 }
 return <main className="app-shell">
  <header className="app-header"><Link className="brand" href="/">weshbien2<span>.</span></Link><nav><Link href="/feed">Fil</Link><Link href="/explore">Découvrir</Link><Link href="/forums">Forums</Link><Link href="/notifications">Notifications</Link><Link href="/profile" className={me?'active':''}>Mon profil</Link><Link href="/inbox">Messages</Link></nav></header>
  <section className="profile-wrap"><small>ESPACE PERSONNEL</small><h1>{me?'Mon profil':'Profil membre'}</h1>
   {loading?<div className="card empty" role="status">Chargement du profil…</div>:me?(
    <form className="card profile-form" onSubmit={save}>
     <div className="profile-photo-editor"><MemberAvatar userId={uid} name={name||username} avatarUrl={avatarUrl} className="avatar profile-avatar-preview"/><label className="photo-upload-button">📷 {photoBusy?'Envoi…':'Ajouter une photo'}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={photoBusy} onChange={e=>uploadAvatar(e.target.files?.[0])}/></label><small>JPG, PNG, WEBP ou GIF · 8 Mo maximum</small></div>
     <label>Nom affiché<input maxLength={50} value={name} onChange={e=>setName(e.target.value)} placeholder="Ton nom affiché"/></label>
     <label>Pseudo<input required pattern="[a-zA-Z0-9_]{3,24}" value={username} onChange={e=>setUsername(e.target.value)} placeholder="pseudo (3 à 24 caractères)"/></label>
     <label>Âge (facultatif)<input type="number" min="13" max="26" value={age} onChange={e=>setAge(e.target.value)} placeholder="Ton âge"/></label>
     <label>Ville (facultatif)<input maxLength={80} value={city} onChange={e=>setCity(e.target.value)} placeholder="Ta ville"/></label>
     <label>À propos de toi<textarea maxLength={300} value={bio} onChange={e=>setBio(e.target.value)} placeholder="Présente-toi en quelques mots…"/></label>
     <label>Centres d’intérêt<input maxLength={180} value={interests} onChange={e=>setInterests(e.target.value)} placeholder="Musique, sport, jeux vidéo…"/></label>
     <label>Loisirs et passions<input maxLength={180} value={hobbies} onChange={e=>setHobbies(e.target.value)} placeholder="Danse, dessin, football…"/></label>
     <label>Musique préférée<input maxLength={120} value={favoriteMusic} onChange={e=>setFavoriteMusic(e.target.value)} placeholder="Tes artistes ou styles préférés…"/></label>
     <section className="profile-gallery-editor"><h3>Ma galerie photo ({galleryUrls.length}/6)</h3><label className="photo-upload-button">🖼️ {galleryBusy?'Envoi…':'Ajouter une photo à la galerie'}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={galleryBusy||galleryUrls.length>=6} onChange={e=>{uploadGalleryPhoto(e.target.files?.[0]);e.currentTarget.value=''}}/></label><div className="profile-gallery-grid">{galleryUrls.map(url=><div className="profile-gallery-thumb" key={url}><img src={url} alt="Photo de ma galerie"/><button type="button" onClick={()=>removeGalleryPhoto(url)}>Retirer</button></div>)}</div><small>Jusqu’à 6 photos · 8 Mo maximum chacune</small></section>
     <label className="checkline"><input type="checkbox" checked={privateProfile} onChange={e=>setPrivateProfile(e.target.checked)}/>Rendre mon profil privé</label>
     <button type="submit">Enregistrer mon profil</button>{status&&<p className="notice" role="status">{status}</p>}
    </form>
   ):profile?(
    <div className="card profile-form">
     <MemberAvatar userId={profile.id} name={profile.display_name||profile.username} avatarUrl={profile.avatar_url} className="avatar large profile-avatar-preview"/>
     <h2>{profile.display_name||profile.username||'Membre'}</h2><p>@{profile.username||'membre'}</p>{profile.last_seen_at&&<p className="profile-last-seen"><strong>Dernière connexion :</strong> {new Date(profile.last_seen_at).toLocaleString('fr-FR',{dateStyle:'medium',timeStyle:'short'})}</p>}<p>{profile.bio||'Ce membre n’a pas encore ajouté de présentation.'}</p>{profile.age&&<p><strong>Âge :</strong> {profile.age} ans</p>}{profile.city&&<p><strong>Ville :</strong> {profile.city}</p>}{profile.interests&&<p><strong>Centres d’intérêt :</strong> {profile.interests}</p>}{profile.hobbies&&<p><strong>Loisirs et passions :</strong> {profile.hobbies}</p>}{profile.favorite_music&&<p><strong>Musique préférée :</strong> {profile.favorite_music}</p>}{profile.gallery_urls&&profile.gallery_urls.length>0&&<section className="profile-gallery-view"><h3>Ses photos</h3><div className="profile-gallery-grid">{profile.gallery_urls.map(url=><a href={url} target="_blank" rel="noreferrer" key={url}><img src={url} alt="Photo de galerie"/></a>)}</div></section>}<p className="profile-likes-count">♡ {likeCount} {likeCount===1?'like':'likes'}</p>
     {!blocked&&<button type="button" className="profile-like-button" disabled={friendBusy} onClick={toggleLike}>{liked?'♥ Tu aimes ce profil':'♡ J’aime ce profil'}</button>}{blocked?<p className="notice">Cette personne est bloquée. Elle ne peut plus t’envoyer de messages.</p>:friendRequest?.status==='accepted'?<><Link className="member-primary" href={'/send?to='+profile.id}>Envoyer un message →</Link><button type="button" className="friend-secondary" disabled={friendBusy} onClick={removeFriend}>Retirer des amis</button></>:friendRequest?.status==='pending'&&friendRequest.sender_id===currentUser?<button type="button" disabled>Demande envoyée ✓</button>:friendRequest?.status==='pending'?<div className="friend-actions"><p>Cette personne souhaite t’ajouter en ami.</p><button type="button" disabled={friendBusy} onClick={()=>answerFriendRequest('accepted')}>Accepter</button><button type="button" className="friend-secondary" disabled={friendBusy} onClick={()=>answerFriendRequest('declined')}>Refuser</button></div>:friendRequest?.status==='declined'?<p className="notice">Demande refusée.</p>:<button type="button" disabled={friendBusy} onClick={sendFriendRequest}>＋ Ajouter en ami</button>}
     <button type="button" className={blocked?'friend-secondary':'danger-action'} disabled={friendBusy} onClick={toggleBlock}>{blocked?'Débloquer cette personne':'Bloquer cette personne'}</button>
     <button type="button" className="friend-secondary" onClick={reportProfile}>⚑ Signaler ce profil</button>{status&&<p className="notice" role="status">{status}</p>}<Link href="/explore">Retour à la communauté</Link>
    </div>
   ):<div className="card empty"><p>{status||'Ce profil ne peut pas être affiché.'}</p><Link href="/explore">Retour à la communauté</Link></div>}
  </section>
 </main>
}
