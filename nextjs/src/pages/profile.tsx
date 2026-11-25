import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import MemberAvatar from '../components/MemberAvatar'
import CommunityImage from '../components/CommunityImage'
import { isAllowedCommunityImage } from '../lib/communityMedia'
import { uploadModeratedCommunityImage } from '../lib/uploadModeratedCommunityImage'
import { calculateCompatibility } from '../lib/compatibility'

type ProfileData = { id:string; display_name:string|null; username:string|null; bio:string|null; interests:string|null; avatar_url?:string|null; is_private:boolean|null; age?:number|null; city?:string|null; favorite_music?:string|null; hobbies?:string|null; gender?:string|null; gallery_urls?:string[]|null; last_seen_at?:string|null }
type FriendRequest = { id:string; sender_id:string; recipient_id:string; status:'pending'|'accepted'|'declined' }

export default function ProfilePage() {
 const router=useRouter()
 const [uid,setUid]=useState('')
 const [me,setMe]=useState(false)
 const [profile,setProfile]=useState<ProfileData|null>(null)
 const [profileRole,setProfileRole]=useState<'admin'|'moderator'|'member'>('member')
 const [profileBadges,setProfileBadges]=useState<any[]>([])
 const [profileBadges,setProfileBadges]=useState<Array<{id:string;name:string;description:string;emoji:string}>>([])
 const [name,setName]=useState('')
 const [username,setUsername]=useState('')
 const [bio,setBio]=useState('')
 const [interests,setInterests]=useState('')
 const [age,setAge]=useState('')
 const [city,setCity]=useState('')
 const [favoriteMusic,setFavoriteMusic]=useState('')
 const [hobbies,setHobbies]=useState('')
 const [gender,setGender]=useState('')
 const [galleryUrls,setGalleryUrls]=useState<string[]>([])
 const [profilePhotoUrls,setProfilePhotoUrls]=useState<string[]>([])
 const [galleryBusy,setGalleryBusy]=useState(false)
 const [avatarUrl,setAvatarUrl]=useState('')
 const [photoBusy,setPhotoBusy]=useState(false)
 const [liked,setLiked]=useState(false)
 const [likeCount,setLikeCount]=useState(0)
 const [status,setStatus]=useState('')
 const [loading,setLoading]=useState(true)
 const [currentUser,setCurrentUser]=useState('')
 const [friendRequest,setFriendRequest]=useState<FriendRequest|null>(null)
 const [friendCount,setFriendCount]=useState(0)
 const [compatibility,setCompatibility]=useState<number|null>(null)
 const [profileViews,setProfileViews]=useState(0)
 const [friendBusy,setFriendBusy]=useState(false)
 const [coupleStatus,setCoupleStatus]=useState('')
 const [blocked,setBlocked]=useState(false)
 const [following,setFollowing]=useState(false)
 const [followerCount,setFollowerCount]=useState(0)
 const [activeProfileTab,setActiveProfileTab]=useState<'about'|'photos'>('about')

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
   if(target!==user.id)await supabase.from('profile_views').insert({profile_id:target,viewer_id:user.id})
   const {data:viewTotal}=await supabase.rpc('get_profile_view_count',{target_profile:target});setProfileViews(Number(viewTotal)||0)
   setCompatibility(null)
   const {data:publicFriendCount,error:friendCountError}=await supabase.rpc('get_public_friend_count',{target_profile:target})
   if(!cancelled)setFriendCount(friendCountError?0:Number(publicFriendCount)||0)
   const {data:{session}}=await supabase.auth.getSession()
   if(session?.access_token){const roleResponse=await fetch('/api/member-role?user_id='+encodeURIComponent(target),{headers:{Authorization:'Bearer '+session.access_token},cache:'no-store'});const rolePayload=await roleResponse.json().catch(()=>null);setProfileRole(roleResponse.ok&&['admin','moderator'].includes(rolePayload?.role)?rolePayload.role:'member')}else setProfileRole('member')
   const {data,error}=await supabase.from('profiles').select('id,display_name,username,bio,interests,avatar_url,is_private,age,city,favorite_music,hobbies,gender,gallery_urls,last_seen_at').eq('id',target).maybeSingle()
   const {data:earned}=await supabase.from('user_badges').select('badge_id,badges(id,name,description,emoji)').eq('user_id',target)
   if(!cancelled)setProfileBadges((earned||[]).map((x:any)=>Array.isArray(x.badges)?x.badges[0]:x.badges).filter(Boolean))
   const {data:badgeRows}=await supabase.from('user_badges').select('badge_id,badges(id,name,description,emoji)').eq('user_id',target)
   if(!cancelled)setProfileBadges((badgeRows||[]).map((row:any)=>Array.isArray(row.badges)?row.badges[0]:row.badges).filter(Boolean))
   if(cancelled)return
   if(error){setProfile(null);setStatus('Impossible de charger ce profil : '+error.message)}
   else if(data){
    if(target!==user.id){const {data:ownProfile}=await supabase.from('profiles').select('interests,hobbies,favorite_music,city').eq('id',user.id).maybeSingle();setCompatibility(ownProfile?calculateCompatibility(ownProfile,data):null)}
    setProfile(data as ProfileData);setName(data.display_name||'');setUsername(data.username||'');setBio(data.bio||'');setInterests(data.interests||'');setAvatarUrl(data.avatar_url||'');setAge(data.age?String(data.age):'');setCity(data.city||'');setFavoriteMusic(data.favorite_music||'');setHobbies(data.hobbies||'');setGender(data.gender||'');setGalleryUrls(data.gallery_urls||[])
    const {data:photoPosts}=await supabase.from('posts').select('image_url,image_urls').eq('author_id',target).order('created_at',{ascending:false}).limit(200)
    const postPhotoUrls=(photoPosts||[]).flatMap((post:any)=>post.image_urls?.length?post.image_urls:(post.image_url?[post.image_url]:[])).filter((url:any)=>typeof url==='string'&&url)
    setProfilePhotoUrls([...new Set([...(data.gallery_urls||[]),...postPhotoUrls])])
    if(target!==user.id){await loadFriendState(user.id,target);const likes=await supabase.from('profile_likes').select('id',{count:'exact',head:true}).eq('to_user_id',target);const mine=await supabase.from('profile_likes').select('id').eq('from_user_id',user.id).eq('to_user_id',target).maybeSingle();setLikeCount(likes.count||0);setLiked(!!mine.data);const follows=await supabase.from('profile_follows').select('id',{count:'exact',head:true}).eq('followed_id',target);const mineFollow=await supabase.from('profile_follows').select('id').eq('follower_id',user.id).eq('followed_id',target).maybeSingle();setFollowerCount(follows.count||0);setFollowing(!!mineFollow.data)}
   }else{setProfile(null);setName('');setUsername('');setBio('');setInterests('');setGalleryUrls([]);setProfilePhotoUrls([]);setAge('');setCity('');setFavoriteMusic('');setHobbies('');setGender('');setStatus(target===user.id?'Ton profil n’a pas encore été créé. Tu peux le compléter ci-dessous.':'Ce profil est introuvable ou indisponible.')}
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
  if(!isAllowedCommunityImage(file)){setStatus('Choisis une image JPG, PNG, WEBP ou GIF de 8 Mo maximum.');return}
  setPhotoBusy(true);setStatus('')
  let url:string
  try { url=await uploadModeratedCommunityImage(file) }
  catch(error:any){setStatus(error?.message||'La photo a été refusée ou n’a pas pu être envoyée.');setPhotoBusy(false);return}
  const {error}=await supabase.from('profiles').upsert({id:uid,avatar_url:url},{onConflict:'id'})
  if(error)setStatus('Photo envoyée mais profil non actualisé : '+error.message)
  else{setAvatarUrl(url);setStatus('Photo de profil mise à jour !')}
  setPhotoBusy(false)
 }
 async function removeAvatar(){
  if(!avatarUrl||!uid||!window.confirm('Supprimer ta photo de profil ?'))return
  setPhotoBusy(true);setStatus('')
  const {error}=await supabase.from('profiles').update({avatar_url:null}).eq('id',uid)
  if(error)setStatus('Impossible de supprimer la photo : '+error.message)
  else{setAvatarUrl('');setProfile(current=>current?{...current,avatar_url:null}:current);setStatus('Photo de profil supprimée.')}
  setPhotoBusy(false)
 }
 async function uploadGalleryPhoto(file?:File){
  if(!file||!uid)return
  if(!isAllowedCommunityImage(file)){setStatus('Choisis une image JPG, PNG, WEBP ou GIF de 8 Mo maximum.');return}
  setGalleryBusy(true);setStatus('')
  let url:string
  try { url=await uploadModeratedCommunityImage(file) }
  catch(error:any){setStatus(error?.message||'La photo a été refusée ou n’a pas pu être envoyée.');setGalleryBusy(false);return}
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
  e.preventDefault()
  if(!age.trim()||!Number.isInteger(Number(age))||Number(age)<13||Number(age)>26){setStatus('Ton âge est obligatoire (de 13 à 26 ans).');return};if(!uid)return
  setStatus('')
  const parsedAge=age.trim()===''?null:Number(age)
  if(parsedAge!==null&&(!Number.isInteger(parsedAge)||parsedAge<13||parsedAge>26)){setStatus('L’âge doit être compris entre 13 et 26 ans.');return}
  const {data,error}=await supabase.from('profiles').upsert({id:uid,display_name:name.trim(),username:username.trim().toLowerCase(),bio:bio.trim(),interests:interests.trim(),avatar_url:avatarUrl||null,is_private:false,age:parsedAge,city:city.trim(),favorite_music:favoriteMusic.trim(),hobbies:hobbies.trim(),gender:gender||null,gallery_urls:galleryUrls},{onConflict:'id'}).select('id,display_name,username,bio,interests,avatar_url,is_private,age,city,favorite_music,hobbies,gender,gallery_urls').single()
  if(error){setStatus('Enregistrement impossible : '+error.message);return}
  setProfile(data as ProfileData);setStatus('Profil enregistré !')
 }
 async function toggleFollow(){
  if(!currentUser||!uid||friendBusy||blocked)return
  setFriendBusy(true);setStatus('')
  if(following){
   const {error}=await supabase.from('profile_follows').delete().eq('follower_id',currentUser).eq('followed_id',uid)
   if(error)setStatus('Impossible de ne plus suivre ce profil : '+error.message)
   else{setFollowing(false);setFollowerCount(v=>Math.max(0,v-1))}
  }else{
   const {error}=await supabase.from('profile_follows').insert({follower_id:currentUser,followed_id:uid})
   if(error)setStatus('Impossible de suivre ce profil : '+error.message)
   else{setFollowing(true);setFollowerCount(v=>v+1)}
  }
  setFriendBusy(false)
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
  else{setFriendRequest(data as FriendRequest);if(answer==='accepted')setFriendCount(v=>v+1)}
  setFriendBusy(false)
 }
 async function removeFriend(){
  if(!friendRequest||friendRequest.status!=='accepted'||friendBusy)return
  if(!window.confirm('Retirer cette personne de tes amis ?'))return
  setFriendBusy(true);const {error}=await supabase.from('friend_requests').delete().eq('id',friendRequest.id)
  if(error)setStatus('Impossible de retirer cet ami : '+error.message)
  else{setFriendRequest(null);setFriendCount(v=>Math.max(0,v-1));setStatus('Cette personne a été retirée de tes amis.')}
  setFriendBusy(false)
 }
 async function requestCouple(){
  if(!currentUser||!uid||friendBusy)return
  setFriendBusy(true);setStatus('')
  const {data:{session}}=await supabase.auth.getSession()
  const response=await fetch('/api/couple-request',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+(session?.access_token||'')},body:JSON.stringify({action:'request',recipient_id:uid})})
  const result=await response.json().catch(()=>({}))
  setStatus(response.ok?'Demande envoyée ! La personne recevra une notification pour accepter ou refuser.':result.error==='request_exists'?'Une demande est déjà en attente.':result.error==='already_couple'?'Vous êtes déjà en couple.':'Impossible d’envoyer la demande.')
  setCoupleStatus(response.ok?'pending':coupleStatus);setFriendBusy(false)
 }
 async function cancelCouple(){
  if(!currentUser||!uid||friendBusy)return
  if(!window.confirm('Annuler ta demande pour être en couple ?'))return
  setFriendBusy(true);setStatus('')
  const {data:{session}}=await supabase.auth.getSession()
  const response=await fetch('/api/couple-request',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+(session?.access_token||'')},body:JSON.stringify({action:'cancel',recipient_id:uid})})
  const result=await response.json().catch(()=>({}))
  if(response.ok){setCoupleStatus('');setStatus('Ta demande de couple a été annulée.')}
  else setStatus(result.error==='pending_request_not_found'?'Aucune demande en attente à annuler.':'Impossible d’annuler la demande.')
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
  <header className="app-header"><Link className="brand" href="/feed" aria-label="Retour au fil d’actualité">weshbien2<span>.</span></Link><nav><Link href="/feed">Fil</Link><Link href="/explore">Découvrir</Link><Link href="/forums">Forums</Link><Link href="/notifications">Notifications</Link><Link href="/profile" className={me?'active':''}>Mon profil</Link><Link href="/inbox">Messages</Link></nav></header>
  <section className="profile-wrap"><small>ESPACE PERSONNEL</small><div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap',margin:'8px 0 14px'}}><h1 style={{margin:0}}>{me?'Mon profil':'Profil membre'}</h1>{profileRole!=='member'&&<span style={{display:'inline-flex',alignItems:'center',gap:6,padding:'5px 10px',borderRadius:999,background:profileRole==='admin'?'#fef3c7':'#dbeafe',color:profileRole==='admin'?'#92400e':'#1e40af',fontWeight:800,fontSize:13,whiteSpace:'nowrap'}}>{profileRole==='admin'?'🛡️ Administrateur':'🔧 Modérateur'}</span>}</div>
   {loading?<div className="card empty" role="status">Chargement du profil…</div>:me?(
    <form className="card profile-form" onSubmit={save}>
     <p className="profile-friend-count">👁 {profileViews} vue{profileViews>1?"s":""} · ♡ {friendCount} ami{friendCount>1?"s":""}</p>
     <div className="profile-photo-editor"><MemberAvatar userId={uid} name={name||username} avatarUrl={avatarUrl} className="avatar profile-avatar-preview"/><label className="photo-upload-button">📷 {photoBusy?'Envoi…':'Ajouter une photo'}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={photoBusy} onChange={e=>uploadAvatar(e.target.files?.[0])}/></label>{avatarUrl&&<button type="button" className="friend-secondary" disabled={photoBusy} onClick={removeAvatar}>🗑️ Supprimer ma photo</button>}<small>JPG, PNG, WEBP ou GIF · 8 Mo maximum</small></div>
     <label>Nom affiché<input maxLength={50} value={name} onChange={e=>setName(e.target.value)} placeholder="Ton nom affiché"/></label>
     <label>Pseudo<input required pattern="[a-zA-Z0-9_]{3,24}" value={username} onChange={e=>setUsername(e.target.value)} placeholder="pseudo (3 à 24 caractères)"/></label>
     <label>Âge (obligatoire)<input type="number" min="13" max="26" required value={age} onChange={e=>setAge(e.target.value)} placeholder="Ton âge"/></label>
     <label>Genre (facultatif)<select value={gender} onChange={e=>setGender(e.target.value)}><option value="">Ne pas préciser</option><option>Homme</option><option>Femme</option><option>Homme trans</option><option>Femme trans</option><option>Non-binaire</option><option>Genderfluid</option><option>Agenre</option><option>Bigenre</option><option>Demigenre</option><option>Pangenre</option><option>Androgyne</option><option>Neutrois</option><option>Queer</option><option>En questionnement</option><option>Autre</option><option>Préfère ne pas préciser</option></select></label>
     <label>Ville (facultatif)<input maxLength={80} value={city} onChange={e=>setCity(e.target.value)} placeholder="Ta ville"/></label>
     <label>À propos de toi<textarea maxLength={300} value={bio} onChange={e=>setBio(e.target.value)} placeholder="Présente-toi en quelques mots…"/></label>
     <label>Centres d’intérêt<input maxLength={180} value={interests} onChange={e=>setInterests(e.target.value)} placeholder="Musique, sport, jeux vidéo…"/></label>
     <label>Loisirs et passions<input maxLength={180} value={hobbies} onChange={e=>setHobbies(e.target.value)} placeholder="Danse, dessin, football…"/></label>
     <label>Musique préférée<input maxLength={120} value={favoriteMusic} onChange={e=>setFavoriteMusic(e.target.value)} placeholder="Tes artistes ou styles préférés…"/></label>
     <section className="profile-gallery-editor"><h3>Ma galerie photo ({galleryUrls.length})</h3><label className="photo-upload-button">🖼️ {galleryBusy?'Envoi…':'Ajouter une photo à la galerie'}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={galleryBusy} onChange={e=>{uploadGalleryPhoto(e.target.files?.[0]);e.currentTarget.value=''}}/></label><div className="profile-gallery-grid">{galleryUrls.map(url=><div className="profile-gallery-thumb" key={url}><CommunityImage src={url} alt="Photo de ma galerie"/><button type="button" onClick={()=>removeGalleryPhoto(url)}>🗑️ Supprimer</button></div>)}</div><small>Ajoute tes photos · 8 Mo maximum chacune</small></section>
     <button type="submit">Enregistrer mon profil</button>{status&&<p className="notice" role="status">{status}</p>}
    </form>
   ):profile?(
    <div className="card profile-form profile-public-card">
     <div className="profile-cover"></div>
     <div className="profile-identity"><MemberAvatar userId={profile.id} name={profile.display_name||profile.username} avatarUrl={profile.avatar_url} className="avatar large profile-avatar-preview"/><div className="profile-identity-copy"><h2>{profile.display_name||profile.username||'Membre'}</h2><p>@{profile.username||'membre'}</p>{profileBadges.length>0&&<div style={{display:'flex',flexWrap:'wrap',gap:6,margin:'8px 0'}}>{profileBadges.map((b:any)=><span key={b.id} title={b.description}>{b.emoji} {b.name}</span>)}</div>}{profileRole!=='member'&&<span style={{display:'inline-flex',alignItems:'center',gap:5,margin:'3px 0 7px',padding:'4px 9px',borderRadius:999,background:profileRole==='admin'?'#fef3c7':'#dbeafe',color:profileRole==='admin'?'#92400e':'#1e40af',fontWeight:800,fontSize:12}}>{profileRole==='admin'?'🛡️ Administrateur':'🔧 Modérateur'}</span>}<small>{followerCount} abonné{followerCount>1?'s':''}</small><small>👁 {profileViews} vue{profileViews>1?"s":""}</small><small>✨ Compatibilité estimée : {compatibility===null?'à compléter':compatibility+'%'}</small><small>♡ {friendCount} ami{friendCount>1?"s":""}</small></div><div className="profile-identity-actions"><button type="button" className="profile-follow-button" disabled={friendBusy||blocked} onClick={toggleFollow}>{following?'✓ Abonné':'＋ Suivre'}</button>{!blocked&&friendRequest?.status==='accepted'?<Link className="profile-add-friend-button" href={'/conversation?with='+profile.id}>Message</Link>:!blocked&&friendRequest?.status==='pending'&&friendRequest.sender_id===currentUser?<button type="button" className="profile-add-friend-button" disabled>Demande envoyée ✓</button>:!blocked&&friendRequest?.status==='pending'?<div className="friend-actions profile-friend-actions"><button type="button" disabled={friendBusy} onClick={()=>answerFriendRequest('accepted')}>Accepter</button><button type="button" className="friend-secondary" disabled={friendBusy} onClick={()=>answerFriendRequest('declined')}>Refuser</button></div>:!blocked&&friendRequest?.status==='declined'?<span className="profile-friend-status">Demande refusée</span>:!blocked?<button type="button" className="profile-add-friend-button" disabled={friendBusy} onClick={sendFriendRequest}>＋ Ajouter en ami</button>:null}</div></div>
     {!blocked&&<button type="button" className="profile-add-friend-button" disabled={friendBusy} onClick={coupleStatus==='pending'?cancelCouple:requestCouple}>{coupleStatus==='pending'?'Annuler ma demande ✕':'💞 Proposer d’être en couple'}</button>}
     {!blocked&&<Link className="profile-add-friend-button" href={'/ask-question?to='+encodeURIComponent(profile.id)}>❓ Poser une question</Link>}
     <div className="profile-public-tabs" role="tablist" aria-label="Sections du profil"><button type="button" role="tab" aria-selected={activeProfileTab==='about'} className={activeProfileTab==='about'?'active':''} onClick={()=>setActiveProfileTab('about')}>À propos</button><button type="button" role="tab" aria-selected={activeProfileTab==='photos'} className={activeProfileTab==='photos'?'active':''} onClick={()=>setActiveProfileTab('photos')}>Photos ({profilePhotoUrls.length})</button></div>
     {activeProfileTab==='about'&&<section id="profile-about" className="profile-about-section"><h3>À propos</h3><p>{profile.bio||'Ce membre n’a pas encore ajouté de présentation.'}</p><div className="profile-details-grid">{profile.age&&<p><strong>Âge</strong><span>{profile.age} ans</span></p>}{profile.gender&&<p><strong>Genre</strong><span>{profile.gender}</span></p>}{profile.city&&<p><strong>Ville</strong><span>{profile.city}</span></p>}{profile.interests&&<p><strong>Centres d’intérêt</strong><span>{profile.interests}</span></p>}{profile.hobbies&&<p><strong>Loisirs et passions</strong><span>{profile.hobbies}</span></p>}{profile.favorite_music&&<p><strong>Musique préférée</strong><span>{profile.favorite_music}</span></p>}</div>{profile.last_seen_at&&<p className="profile-last-seen"><strong>Dernière connexion :</strong> {new Date(profile.last_seen_at).toLocaleString('fr-FR',{dateStyle:'medium',timeStyle:'short'})}</p>}</section>}
     {activeProfileTab==='photos'&&<section id="profile-photos" className="profile-gallery-view"><h3>Ses photos</h3>{profilePhotoUrls.length>0?<div className="profile-gallery-grid">{profilePhotoUrls.map(url=><CommunityImage key={url} src={url} alt="Photo du membre"/>)}</div>:<p className="profile-empty-photos">Ce membre n’a pas encore ajouté de photos.</p>}</section>}<p className="profile-likes-count">♡ {likeCount} {likeCount===1?'like':'likes'}</p>
     {!blocked&&<button type="button" className="profile-like-button" disabled={friendBusy} onClick={toggleLike}>{liked?'♥ Tu aimes ce profil':'♡ J’aime ce profil'}</button>}{blocked&&<p className="notice">Cette personne est bloquée. Elle ne peut plus t’envoyer de messages.</p>}{friendRequest?.status==='accepted'&&<button type="button" className="friend-secondary profile-remove-friend" disabled={friendBusy} onClick={removeFriend}>Retirer des amis</button>}
     <button type="button" className={blocked?'friend-secondary':'danger-action'} disabled={friendBusy} onClick={toggleBlock}>{blocked?'Débloquer cette personne':'Bloquer cette personne'}</button>
     <button type="button" className="friend-secondary" onClick={reportProfile}>⚑ Signaler ce profil</button>{status&&<p className="notice" role="status">{status}</p>}<Link href="/explore">Retour à la communauté</Link>
    </div>
   ):<div className="card empty"><p>{status||'Ce profil ne peut pas être affiché.'}</p><Link href="/explore">Retour à la communauté</Link></div>}
  </section>
 </main>
}
