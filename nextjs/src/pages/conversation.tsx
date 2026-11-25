import { useEffect,useMemo,useRef,useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import { uploadModeratedCommunityImage } from '../lib/uploadModeratedCommunityImage'
import MemberAvatar from '../components/MemberAvatar'

type Msg={id:string;sender:string;recipient:string;subject:string|null;body:string|null;created_at:string;is_read:boolean;reply_to_id?:string|null;attachment_path?:string|null;attachment_type?:'image'|'audio'|'video'|null;attachment_url?:string|null}
type Reaction={id:string;message_id:string;user_id:string;emoji:string}
function spotifyEmbedUrl(value:string|null|undefined):string|null{
 if(!value)return null
 const match=value.match(/https?:\/\/(?:open\.)?spotify\.com\/(track|album|playlist|episode|show)\/([A-Za-z0-9]+)(?:\?[^\s]*)?/i)
 return match?'https://open.spotify.com/embed/'+match[1].toLowerCase()+'/'+match[2]+'?utm_source=generator':null
}
export default function ConversationPage(){
 const historyRef=useRef<HTMLDivElement|null>(null),preserveScrollRef=useRef(false),previousScrollHeightRef=useRef(0),messageInputRef=useRef<HTMLTextAreaElement|null>(null),cameraVideoRef=useRef<HTMLVideoElement|null>(null),cameraStreamRef=useRef<MediaStream|null>(null),imageInputRef=useRef<HTMLInputElement|null>(null),cameraInputRef=useRef<HTMLInputElement|null>(null),audioInputRef=useRef<HTMLInputElement|null>(null),videoInputRef=useRef<HTMLInputElement|null>(null),hasInitialScroll=useRef(false),typingChannelRef=useRef<ReturnType<typeof supabase.channel>|null>(null),typingStopTimer=useRef<ReturnType<typeof setTimeout>|null>(null),lastTypingSent=useRef(0),voiceRecorderRef=useRef<MediaRecorder|null>(null),voiceChunksRef=useRef<Blob[]>([]),signedUrlCacheRef=useRef<Map<string,{url:string;expiresAt:number}>>(new Map())
 const router=useRouter(),[uid,setUid]=useState(''),[other,setOther]=useState(''),[person,setPerson]=useState<any>(null),[publishing18,setPublishing18]=useState(''),[transferAccess,setTransferAccess]=useState<'loading'|'none'|'pending'|'approved'|'rejected'|'restricted'>('loading'),[requestingTransfer,setRequestingTransfer]=useState(false),[hasOlderMessages,setHasOlderMessages]=useState(false),[loadingOlderMessages,setLoadingOlderMessages]=useState(false),[presenceLastSeen,setPresenceLastSeen]=useState<string|null>(null),[messages,setMessages]=useState<Msg[]>([]),[reactions,setReactions]=useState<Reaction[]>([]),[body,setBody]=useState(''),[replyTo,setReplyTo]=useState<Msg|null>(null),[busy,setBusy]=useState(false),[status,setStatus]=useState(''),[search,setSearch]=useState(''),[menuFor,setMenuFor]=useState(''),[hiddenIds,setHiddenIds]=useState<string[]>([]),[uploading,setUploading]=useState(false),[editingId,setEditingId]=useState(''),[editDraft,setEditDraft]=useState(''),[emojiOpen,setEmojiOpen]=useState(false),[otherTyping,setOtherTyping]=useState(false),[attachmentMenuOpen,setAttachmentMenuOpen]=useState(false),[recordingVoice,setRecordingVoice]=useState(false),[cameraOpen,setCameraOpen]=useState(false)
 async function load(a:string,b:string,before?:string){
  let query=supabase.from('messages').select('id,sender,recipient,subject,body,created_at,is_read,reply_to_id,attachment_path,attachment_type').or('and(sender.eq.'+a+',recipient.eq.'+b+'),and(sender.eq.'+b+',recipient.eq.'+a+')')
  if(before)query=query.lt('created_at',before)
  const {data,error}=await query.order('created_at',{ascending:false}).limit(100)
  if(error){setStatus('Impossible de charger cette conversation.');return}
  const rows=((data||[]) as Msg[]).reverse()
  setHasOlderMessages((data||[]).length===100)
  const attachmentRows=rows.filter(m=>m.attachment_path)
  if(attachmentRows.length){
   const results=await Promise.all(attachmentRows.map(async m=>{
    const cached=signedUrlCacheRef.current.get(m.attachment_path!)
    if(cached&&cached.expiresAt>Date.now()+60000)return {path:m.attachment_path,url:cached.url,error:null}
    let signedUrl:string|null=null
    let lastError:any=null
    const {data:urlData,error:urlError}=await supabase.storage.from('chat-attachments').createSignedUrl(m.attachment_path!,60*60*24*7)
    signedUrl=urlData?.signedUrl||null
    lastError=urlError
    if(signedUrl)signedUrlCacheRef.current.set(m.attachment_path!,{url:signedUrl,expiresAt:Date.now()+7*24*60*60*1000})
    return {path:m.attachment_path,url:signedUrl,error:lastError}
   }))
   const urlByPath=new Map(results.map(item=>[item.path,item.url]))
   rows.forEach(m=>{if(m.attachment_path)m.attachment_url=urlByPath.get(m.attachment_path)||null})
   if(results.some(item=>item.error||!item.url))setStatus('Une photo ou pièce jointe ne peut pas être chargée. Vérifie que vous êtes toujours amis et que personne n’a bloqué l’autre.')
   else if(status.startsWith('Une photo')||status.startsWith('Une pièce jointe'))setStatus('')
  }
  if(before)setMessages(current=>[...rows.filter(row=>!current.some(item=>item.id===row.id)),...current])
  else setMessages(rows)
  const unreadIds=rows.filter(m=>m.recipient===a&&!m.is_read).map(m=>m.id)
  if(unreadIds.length){const {data:updated,error:readError}=await supabase.from('messages').update({is_read:true}).in('id',unreadIds).eq('recipient',a).select('id');if(!readError){setMessages(current=>current.map(m=>unreadIds.includes(m.id)?{...m,is_read:true}:m));if(typeof window!=='undefined')window.dispatchEvent(new Event('weshbien:messages-read'))}else{setStatus('Impossible de marquer les messages comme lus. Réessaie.')}}
 }
 async function loadOlderMessages(){
  if(!uid||!other||!messages.length||loadingOlderMessages)return
  const el=historyRef.current
  if(el){previousScrollHeightRef.current=el.scrollHeight;preserveScrollRef.current=true}
  setLoadingOlderMessages(true)
  await load(uid,other,messages[0].created_at)
  setLoadingOlderMessages(false)
 }

 useEffect(()=>{
  if(!router.isReady||typeof router.query.with!=='string')return
  let active=true
  async function init(){
   const {data:{user}}=await supabase.auth.getUser()
   if(!user){await router.replace('/auth');return}
   const otherId=router.query.with as string
   if(otherId===user.id){setStatus('Conversation invalide.');return}
   const {data:p}=await supabase.from('profiles').select('id,username,display_name,avatar_url,last_seen_at').eq('id',otherId).maybeSingle()
   if(!active)return
   if(!p){setStatus('Ce profil est introuvable ou inaccessible.');return}
   setUid(user.id);setOther(otherId);setPerson(p);setPresenceLastSeen(p.last_seen_at||null);try{setHiddenIds(JSON.parse(localStorage.getItem('weshbien-hidden-messages-'+user.id)||'[]'))}catch{};const {data:{session}}=await supabase.auth.getSession();if(session?.access_token){const accessResponse=await fetch('/api/photo-transfer-access',{headers:{Authorization:'Bearer '+session.access_token},cache:'no-store'});const accessPayload=await accessResponse.json().catch(()=>null);setTransferAccess(accessPayload?.eligible===false?'restricted':(['pending','approved','rejected'].includes(accessPayload?.status)?accessPayload.status:'none'))}else setTransferAccess('none');await load(user.id,otherId)
  }
  init()
  return()=>{active=false}
 },[router.isReady,router.query.with])
 useEffect(()=>{
  if(!other)return
  let active=true
  const refreshPresence=async()=>{const {data}=await supabase.from('profiles').select('last_seen_at').eq('id',other).maybeSingle();if(active&&data)setPresenceLastSeen(data.last_seen_at||null)}
  const timer=setInterval(refreshPresence,30000)
  return()=>{active=false;clearInterval(timer)}
 },[other])
 const presenceLabel=()=>{if(!presenceLastSeen)return 'Hors ligne';const elapsed=Date.now()-new Date(presenceLastSeen).getTime();if(!Number.isFinite(elapsed)||elapsed<0)return 'Hors ligne';if(elapsed<=120000)return '● En ligne';const minutes=Math.floor(elapsed/60000);if(minutes<60)return 'Actif il y a '+minutes+' min';const hours=Math.floor(minutes/60);if(hours<24)return 'Actif il y a '+hours+' h';return 'Vu le '+new Date(presenceLastSeen).toLocaleDateString('fr-FR')}
 useEffect(()=>{
  if(!uid||!other)return
  let fallbackTimer:ReturnType<typeof setInterval>|null=null
  const startFallback=()=>{if(!fallbackTimer)fallbackTimer=setInterval(()=>{void load(uid,other)},30000)}
  const stopFallback=()=>{if(fallbackTimer){clearInterval(fallbackTimer);fallbackTimer=null}}
  const channel=supabase.channel('conversation-read-'+[uid,other].sort().join('-'))
   .on('broadcast',{event:'typing'},({payload})=>{if(payload?.user_id!==other)return;setOtherTyping(!!payload.is_typing);if(typingStopTimer.current)clearTimeout(typingStopTimer.current);if(payload.is_typing)typingStopTimer.current=setTimeout(()=>setOtherTyping(false),2800)})
   .on('postgres_changes',{event:'*',schema:'public',table:'message_reactions'},()=>load(uid,other))
   .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages'},payload=>{
    const row:any=payload.new
    if(row&&(row.sender===uid&&row.recipient===other||row.sender===other&&row.recipient===uid))void load(uid,other)
   }).subscribe((state)=>{
    if(state==='SUBSCRIBED')stopFallback()
    else startFallback()
   })
  typingChannelRef.current=channel
  startFallback()
  return()=>{if(typingStopTimer.current)clearTimeout(typingStopTimer.current);stopFallback();typingChannelRef.current=null;setOtherTyping(false);supabase.removeChannel(channel)}
 },[uid,other])
 const visibleMessages=useMemo(()=>{const q=search.trim().toLocaleLowerCase('fr-FR');return q?messages.filter(m=>(m.body||m.subject||'').toLocaleLowerCase('fr-FR').includes(q)):messages},[messages,search])
 useEffect(()=>{
  const el=historyRef.current
  if(!el)return
  requestAnimationFrame(()=>{if(preserveScrollRef.current){el.scrollTop+=el.scrollHeight-previousScrollHeightRef.current;preserveScrollRef.current=false}else{el.scrollTop=el.scrollHeight}})
  hasInitialScroll.current=true
 },[visibleMessages.length])
 async function toggleReaction(m:Msg,emoji:string){
  if(!uid)return
  const existing=reactions.find(r=>r.message_id===m.id&&r.user_id===uid)
  if(existing?.emoji===emoji){
   const {error}=await supabase.from('message_reactions').delete().eq('id',existing.id).eq('user_id',uid)
   if(error){setStatus('Impossible de retirer la réaction.');return}
   setReactions(current=>current.filter(r=>r.id!==existing.id));return
  }
  const {data,error}=await supabase.from('message_reactions').upsert({message_id:m.id,user_id:uid,emoji},{onConflict:'message_id,user_id'}).select('id,message_id,user_id,emoji').single()
  if(error){setStatus('Impossible d’ajouter la réaction : '+error.message);return}
  setReactions(current=>[...current.filter(r=>r.message_id!==m.id||r.user_id!==uid),data as Reaction])
 }
 async function messageAction(action:string,m:Msg){
  setMenuFor('')
  if(action==='save'||action==='pin'){
   const key='weshbien-message-'+action+'-'+uid
   let ids:string[]=[];try{ids=JSON.parse(localStorage.getItem(key)||'[]')}catch{}
   const next=ids.includes(m.id)?ids.filter(x=>x!==m.id):[...ids,m.id]
   localStorage.setItem(key,JSON.stringify(next));setStatus(action==='save'?'Message sauvegardé sur cet appareil.':'Message épinglé sur cet appareil.');return
  }
  if(action==='reply'){setReplyTo(m);setBody('');setMenuFor('');setStatus('');return}
  if(action==='forward'){
   const {error}=await supabase.from('messages').insert({sender:uid,recipient:other,subject:'Message transféré',body:'↪ Message transféré : '+(m.body||m.subject||'')})
   setStatus(error?'Transfert impossible.':'Message transféré dans cette conversation.');if(!error)await load(uid,other);return
  }
  if(action==='edit'&&m.sender===uid){setEditingId(m.id);setEditDraft(m.body||'');setStatus('');return}
  if(action==='hide'){
   const next=[...hiddenIds,m.id];setHiddenIds(next);try{localStorage.setItem('weshbien-hidden-messages-'+uid,JSON.stringify(next))}catch{};return
  }
  if(action==='delete'&&m.sender===uid&&window.confirm('Supprimer ce message pour tous les participants ?')){
   const {error}=await supabase.from('messages').delete().eq('id',m.id).eq('sender',uid)
   setStatus(error?'Suppression impossible.':'Message supprimé pour tous.');if(!error)await load(uid,other);return
  }
  if(action==='report'&&m.sender!==uid)await reportMessage(m.id)
 }
 async function saveMessageEdit(){
  const value=editDraft.trim();if(!editingId||!value||!uid)return
  setBusy(true);const {data,error}=await supabase.from('messages').update({body:value.slice(0,3000),updated_at:new Date().toISOString()}).eq('id',editingId).eq('sender',uid).select('id,body').maybeSingle()
  setBusy(false)
  if(error){setStatus('Modification impossible : '+error.message);return}
  if(!data){setStatus('Modification refusée : vérifie que tu es bien l’auteur du message.');return}
  setMessages(current=>current.map(item=>item.id===editingId?{...item,body:data.body}:item));setEditingId('');setEditDraft('');setStatus('Message modifié.')
 }
 async function reportMessage(messageId:string){
  const reason=window.prompt('Pourquoi souhaites-tu signaler ce message ?')
  if(!reason||reason.trim().length<3)return
  const {error}=await supabase.from('reports').insert({reporter_id:uid,content_type:'message',content_id:messageId,reason:reason.trim().slice(0,1000),status:'pending'})
  setStatus(error?'Signalement impossible : '+error.message:'Message signalé. Merci.')
 }
 async function sendAttachment(file:File,type:'image'|'audio'|'video'){
  if(!uid||!other||uploading)return
  const allowed=type==='image'?['image/jpeg','image/png','image/webp','image/gif']:type==='video'?['video/mp4','video/webm','video/quicktime','video/3gpp']:['audio/mpeg','audio/mp4','audio/aac','audio/ogg','audio/wav','audio/webm','audio/x-m4a']
  const max=type==='image'?8*1024*1024:type==='video'?50*1024*1024:15*1024*1024
  if(!allowed.includes(file.type)){setStatus(type==='image'?'Format photo non accepté.':type==='video'?'Format vidéo non accepté.':'Format audio non accepté.');return}
  if(file.size>max){setStatus(type==='image'?'Photo trop volumineuse (8 Mo maximum).':type==='video'?'Vidéo trop volumineuse (50 Mo maximum).':'Fichier audio trop volumineux (15 Mo maximum).');return}
  setUploading(true);setStatus(type==='image'?'Vérification de la photo par l’IA…':'Envoi du fichier…')
  if(type==='image'){
   try{await uploadModeratedCommunityImage(file,'private_message')}
   catch(error:any){setUploading(false);setStatus(error?.message||'La photo a été refusée ou n’a pas pu être vérifiée.');return}
  }
  setStatus('Envoi du fichier…')
  const ext=file.name.split('.').pop()?.toLowerCase()||(type==='image'?'jpg':type==='video'?'mp4':'mp3')
  const path=uid+'/'+other+'/'+Date.now()+'-'+Math.random().toString(36).slice(2)+'.'+ext
  const {error:uploadError}=await supabase.storage.from('chat-attachments').upload(path,file,{contentType:file.type,upsert:false})
  if(uploadError){setUploading(false);setStatus("Envoi impossible : "+uploadError.message);return}
  const {error}=await supabase.from('messages').insert({sender:uid,recipient:other,subject:type==='image'?'Photo':type==='video'?'Vidéo':file.name.startsWith('vocal-')?'Vocal':'Musique',body:null,attachment_path:path,attachment_type:type})
  if(error){await supabase.storage.from('chat-attachments').remove([path]);setUploading(false);setStatus("Envoi impossible : "+error.message);return}
  setUploading(false);setStatus('');await load(uid,other)
 }

 async function requestPhotoTransferAccess(){
  if(requestingTransfer||transferAccess==='restricted')return
  setRequestingTransfer(true);setStatus('Envoi de la demande…')
  try{
   const {data:{session}}=await supabase.auth.getSession()
   if(!session?.access_token)throw new Error('Session expirée. Reconnecte-toi.')
   const response=await fetch('/api/photo-transfer-access',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({request:true})})
   const payload=await response.json().catch(()=>null)
   if(!response.ok)throw new Error(payload?.error==='adult_access_required'?'Le transfert vers cet espace est réservé aux membres de 18 ans et plus.':payload?.error==='account_suspended'?'Un compte suspendu ne peut pas demander cet accès.':payload?.error||'Demande impossible.')
   setTransferAccess(payload.status||'pending');setStatus(payload.status==='approved'?'Accès déjà autorisé.':'Demande envoyée à l’administration.')
  }catch(error:any){setStatus(error?.message||'Demande impossible.')}
  finally{setRequestingTransfer(false)}
 }
 async function sharePhotoTo18(m:Msg){
  if(!uid||m.sender!==uid||m.attachment_type!=='image'||!m.attachment_path||publishing18)return
  if(transferAccess!=='approved'){setStatus('Tu dois d’abord obtenir l’autorisation de l’administration.');return}
  const confirmed=window.confirm('Transférer cette photo dans l’espace Individuel (18+) sous le nom « Membre anonyme » ? Confirme que tu as le droit de partager cette image et que toutes les personnes reconnaissables ont donné leur accord. Les modérateurs pourront toujours voir le compte auteur.')
  if(!confirmed){setStatus('Transfert annulé.');return}
  setPublishing18(m.id);setStatus('Préparation du transfert anonyme…')
  let uploadedPath=''
  try{
   const {data:file,error:downloadError}=await supabase.storage.from('chat-attachments').download(m.attachment_path)
   if(downloadError||!file)throw downloadError||new Error('Photo introuvable dans la conversation.')
   const safeType=file.type||'image/jpeg'
   const extension=safeType==='image/png'?'png':safeType==='image/webp'?'webp':safeType==='image/gif'?'gif':'jpg'
   uploadedPath=uid+'/individual/'+Date.now()+'-'+Math.random().toString(36).slice(2,10)+'.'+extension
   const {error:uploadError}=await supabase.storage.from('community-private').upload(uploadedPath,file,{contentType:safeType,upsert:false})
   if(uploadError)throw uploadError
   const {error:insertError}=await supabase.from('individual_posts').insert({author_id:uid,body:'',image_urls:['private-media:'+uploadedPath],is_anonymous:true})
   if(insertError)throw insertError
   setStatus('Photo transférée anonymement dans l’espace Individuel. Les modérateurs conservent l’accès au compte auteur.')
  }catch(error:any){
   if(uploadedPath)await supabase.storage.from('community-private').remove([uploadedPath])
   setStatus(error?.message||'Le transfert n’a pas pu être envoyé.')
  }finally{setPublishing18('')}
 }
 async function startVoiceRecording(){
  if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'){setStatus('Ton navigateur ne permet pas l’enregistrement vocal.');return}
  try{
   const stream=await navigator.mediaDevices.getUserMedia({audio:true})
   const preferred=['audio/webm;codecs=opus','audio/ogg;codecs=opus','audio/webm'].find(type=>MediaRecorder.isTypeSupported(type))
   const recorder=new MediaRecorder(stream,preferred?{mimeType:preferred}:undefined)
   voiceChunksRef.current=[]
   recorder.ondataavailable=event=>{if(event.data.size)voiceChunksRef.current.push(event.data)}
   recorder.onerror=()=>{stream.getTracks().forEach(track=>track.stop());setRecordingVoice(false);setStatus('L’enregistrement vocal a échoué.')}
   recorder.onstop=()=>{stream.getTracks().forEach(track=>track.stop());setRecordingVoice(false);const blob=new Blob(voiceChunksRef.current,{type:recorder.mimeType||'audio/webm'});voiceChunksRef.current=[];if(!blob.size){setStatus('Le vocal est vide. Réessaie.');return}const ext=blob.type.includes('ogg')?'ogg':'webm';const file=new File([blob],'vocal-'+Date.now()+'.'+ext,{type:blob.type||'audio/webm'});void sendAttachment(file,'audio')}
   voiceRecorderRef.current=recorder;recorder.start(250);setRecordingVoice(true);setAttachmentMenuOpen(false);setStatus('Enregistrement en cours… Appuie sur « Arrêter le vocal » pour l’envoyer.')
  }catch(error:any){setStatus(error?.name==='NotAllowedError'?'Autorise l’accès au micro pour enregistrer un vocal.':'Impossible d’accéder au micro. Vérifie les autorisations de ton navigateur.')}
 }
 function stopVoiceRecording(){if(voiceRecorderRef.current?.state==='recording')voiceRecorderRef.current.stop();voiceRecorderRef.current=null}
 async function startCamera(){
  setAttachmentMenuOpen(false)
  if(!navigator.mediaDevices?.getUserMedia){setStatus('La caméra directe n’est pas disponible dans ce navigateur. Utilise Photo pour choisir une image.');return}
  try{
   const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false})
   cameraStreamRef.current=stream
   setCameraOpen(true)
   setStatus('')
  }catch(error:any){
   setStatus(error?.name==='NotAllowedError'?'Autorise l’accès à la caméra dans ton navigateur.':'Impossible d’ouvrir la caméra. Vérifie les autorisations du site.')
  }
 }
 useEffect(()=>{
  if(cameraOpen&&cameraVideoRef.current&&cameraStreamRef.current){
   cameraVideoRef.current.srcObject=cameraStreamRef.current
   void cameraVideoRef.current.play().catch(()=>setStatus('Impossible de démarrer l’aperçu caméra.'))
  }else if(!cameraOpen&&cameraStreamRef.current){
   cameraStreamRef.current.getTracks().forEach(track=>track.stop())
   cameraStreamRef.current=null
  }
 },[cameraOpen])
 useEffect(()=>()=>{if(cameraStreamRef.current)cameraStreamRef.current.getTracks().forEach(track=>track.stop())},[])
 function closeCamera(){setCameraOpen(false)}
 function captureCameraPhoto(){
  const video=cameraVideoRef.current
  if(!video||!video.videoWidth||!video.videoHeight){setStatus('La caméra n’est pas encore prête.');return}
  // Downscale camera frames before moderation/upload: some phones produce
  // very large JPEGs that exceed the API's base64 request limit.
  const maxDimension=1600
  const scale=Math.min(1,maxDimension/Math.max(video.videoWidth,video.videoHeight))
  const canvas=document.createElement('canvas')
  canvas.width=Math.max(1,Math.round(video.videoWidth*scale))
  canvas.height=Math.max(1,Math.round(video.videoHeight*scale))
  const context=canvas.getContext('2d')
  if(!context){setStatus('Capture impossible.');return}
  context.drawImage(video,0,0,canvas.width,canvas.height)
  setStatus('Préparation de la photo…')
  canvas.toBlob(blob=>{
   if(!blob){setStatus('La photo n’a pas pu être créée. Réessaie.');return}
   if(blob.size>8*1024*1024){setStatus('La photo est trop volumineuse. Réessaie.');return}
   const file=new File([blob],'photo-'+Date.now()+'.jpg',{type:'image/jpeg',lastModified:Date.now()})
   setCameraOpen(false)
   void sendAttachment(file,'image')
  },'image/jpeg',0.82)
 }

 function addSpotifyLink(){
  const value=window.prompt('Colle le lien Spotify de la musique, de l’album ou de la playlist :')
  if(!value)return
  if(!spotifyEmbedUrl(value)){setStatus('Lien Spotify non reconnu. Colle un lien open.spotify.com valide.');return}
  setBody(current=>(current.trim()?current.trim()+'\\n':'')+value.trim())
  setStatus('Lien Spotify ajouté. Envoie le message pour partager le lecteur.')
 }
 async function send(e:any){
  e.preventDefault();if(!body.trim()||!uid||!other||busy)return
  setBusy(true);const quoted=replyTo?'↪ Réponse à '+(replyTo.sender===uid?'ton message':'son message')+' : « '+(replyTo.body||replyTo.subject||'').replace(/\s+/g,' ').slice(0,240)+' »\n\n':'';const {data,error}=await supabase.from('messages').insert({sender:uid,recipient:other,subject:'Message',body:quoted+body.trim(),reply_to_id:replyTo?.id||null}).select('id,sender,recipient,subject,body,created_at,is_read,reply_to_id,attachment_path,attachment_type').single()
  setBusy(false)
  if(error){setStatus(error.code==='42501'?'Vous devez être amis pour envoyer un message.':'Envoi impossible : '+error.message);return}
  if(data)setMessages(current=>current.some(item=>item.id===data.id)?current:[...current,data as Msg].sort((a,b)=>new Date(a.created_at).getTime()-new Date(b.created_at).getTime()))
  setBody('');setReplyTo(null);setStatus('');void load(uid,other);requestAnimationFrame(()=>messageInputRef.current?.focus())
 }
 return <main className="messenger-shell">
  <header className="messenger-topbar"><Link href="/inbox" className="messenger-close" aria-label="Retour à la messagerie">×</Link><div className="messenger-brand"><b>🔒 weshbien.com</b><span>Messenger</span></div><Link href={'/profile?id='+other} className="messenger-profile-shortcut" aria-label="Voir le profil">◎</Link></header>
  <section className="messenger-window">
   <div className="messenger-personbar"><Link href="/inbox" className="messenger-back" aria-label="Retour">←</Link><MemberAvatar userId={other} name={person?.display_name||person?.username} avatarUrl={person?.avatar_url} className="messenger-avatar" imageSize={56}/><div className="messenger-person-copy"><strong>{person?.display_name||person?.username||'Conversation'}</strong><span>@{person?.username||'membre'} · {presenceLabel()}</span></div><Link href={'/profile?id='+other} className="messenger-more" aria-label="Options du profil">•••</Link></div>
   <div className="messenger-search"><span>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher dans cette conversation…" aria-label="Rechercher dans cette conversation"/></div>
   <div ref={historyRef} className="messenger-history" aria-live="polite">
    {hasOlderMessages&&<button type="button" disabled={loadingOlderMessages} onClick={()=>void loadOlderMessages()} style={{display:'block',margin:'10px auto',padding:'8px 14px',borderRadius:10}}>{loadingOlderMessages?'Chargement…':'Charger les messages plus anciens'}</button>}
    {visibleMessages.filter(m=>!hiddenIds.includes(m.id)).length===0?<div className="messenger-empty">{messages.length===0?'Démarre la conversation en envoyant un message.':'Aucun message à afficher.'}</div>:visibleMessages.filter(m=>!hiddenIds.includes(m.id)).map(m=><div id={'message-'+m.id} key={m.id} className={'messenger-message-row '+(m.sender===uid?'mine':'theirs')}><div className="messenger-bubble">{m.reply_to_id&&<button type="button" className="messenger-reply-link" onClick={()=>{const target=document.getElementById('message-'+m.reply_to_id);if(target){target.scrollIntoView({behavior:'smooth',block:'center'});target.classList.add('messenger-message-highlight');window.setTimeout(()=>target.classList.remove('messenger-message-highlight'),1800)}}}>↩ Réponse de : {(messages.find(x=>x.id===m.reply_to_id)?.body||messages.find(x=>x.id===m.reply_to_id)?.subject||'Voir le message d’origine').replace(/\s+/g,' ').slice(0,110)} · Voir le message</button>}{m.attachment_type==='image'&&!m.attachment_url?<div style={{padding:10,opacity:.8}}>📷 Photo envoyée mais impossible à charger. Réessaie d’ouvrir la discussion.</div>:m.attachment_type==='image'&&m.attachment_url?<a href={m.attachment_url} target="_blank" rel="noreferrer"><img src={m.attachment_url} alt="Photo envoyée" loading="lazy" decoding="async" onError={async()=>{const {data,error}=await supabase.storage.from('chat-attachments').createSignedUrl(m.attachment_path!,60*60*24);if(data?.signedUrl)setMessages(current=>current.map(item=>item.id===m.id?{...item,attachment_url:data.signedUrl}:item));else setStatus('Impossible d’afficher cette photo : '+(error?.message||'accès au fichier refusé.'))}} style={{display:'block',maxWidth:'min(100%,280px)',maxHeight:360,borderRadius:12,objectFit:'contain'}}/></a>:m.attachment_type==='video'&&m.attachment_url?<div style={{width:'min(100%,320px)'}}><video controls playsInline preload="metadata" src={m.attachment_url} style={{display:'block',width:'100%',maxHeight:360,borderRadius:12,background:'#000'}}/><div style={{fontSize:12,marginTop:5}}>🎬 Vidéo</div></div>:m.attachment_type==='video'&&!m.attachment_url?<div style={{padding:10,opacity:.8}}>🎬 Vidéo envoyée mais impossible à charger. Réessaie d’ouvrir la discussion.</div>:m.attachment_type==='audio'&&m.attachment_url?<div style={{minWidth:220}}><div style={{marginBottom:8}}>{m.subject==='Vocal'?'🎙️ Message vocal':'🎵 Musique'}</div><audio controls preload="none" src={m.attachment_url} style={{maxWidth:'100%'}}/></div>:(editingId===m.id?<div className="message-edit-box"><textarea value={editDraft} onChange={e=>setEditDraft(e.target.value)} maxLength={3000}/><div>{['😀','😂','🥰','😍','😊','😉','😎','😭','😡','❤️','🔥','👍','👎','🙏','🎉','💯'].map(emoji=><button type="button" key={emoji} onClick={()=>setEditDraft(v=>v+emoji)}>{emoji}</button>)}</div><button type="button" disabled={busy||!editDraft.trim()} onClick={saveMessageEdit}>Enregistrer</button><button type="button" onClick={()=>{setEditingId('');setEditDraft('')}}>Annuler</button></div>:(spotifyEmbedUrl(m.body)?<div style={{width:'min(100%,352px)'}}><iframe title="Lecteur Spotify" src={spotifyEmbedUrl(m.body)!} width="100%" height="152" style={{border:0,borderRadius:12}} allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"/><a href={m.body||'#'} target="_blank" rel="noreferrer" style={{fontSize:12}}>Ouvrir dans Spotify ↗</a></div>:(m.body||m.subject)))}</div><div className="messenger-reactions">{['❤️','😂','😍','👍','😢','🔥','👏','😮'].map(emoji=>{const group=reactions.filter(r=>r.message_id===m.id&&r.emoji===emoji);const mine=group.some(r=>r.user_id===uid);return group.length>0||emoji==='❤️'||emoji==='😂'||emoji==='👍'?<button type="button" key={emoji} onClick={()=>toggleReaction(m,emoji)} aria-label={'Réagir avec '+emoji} title={group.map(r=>r.user_id===uid?'Toi':'Membre').join(', ')} style={{border:mine?'1px solid #7c6cff':'1px solid #8885',borderRadius:18,padding:'3px 7px',margin:'3px 3px 0 0',background:mine?'#7c6cff22':'transparent',cursor:'pointer'}}>{emoji}{group.length>0?' '+group.length:''}</button>:null})}</div><div className="messenger-meta"><time>{new Date(m.created_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</time>{m.sender===uid&&<span>{m.is_read?'✓✓ Lu':'✓ Envoyé'}</span>}<button type="button" onClick={()=>setMenuFor(menuFor===m.id?'':m.id)} aria-label="Options du message">•••</button></div>{m.sender===uid&&m.attachment_type==='image'&&<div style={{margin:'6px 0 2px'}}>{transferAccess==='approved'?<button type="button" disabled={publishing18===m.id} onClick={(event)=>{event.preventDefault();event.stopPropagation();void sharePhotoTo18(m)}} style={{padding:'7px 10px',borderRadius:10,border:'1px solid #b45309',background:'transparent',color:'inherit',fontWeight:700,cursor:'pointer'}}>{publishing18===m.id?'Publication…':'↗ Envoyer dans l’espace Individuel en anonyme'}</button>:transferAccess==='pending'?<small>⌛ Demande d’accès au transfert en attente</small>:transferAccess==='restricted'?<small>🔒 Transfert réservé aux membres de 18 ans et plus</small>:<button type="button" disabled={requestingTransfer||transferAccess==='loading'} onClick={()=>void requestPhotoTransferAccess()} style={{padding:'7px 10px',borderRadius:10,border:'1px solid #8888',background:'transparent',color:'inherit',fontWeight:700,cursor:'pointer'}}>{requestingTransfer?'Demande…':transferAccess==='loading'?'Vérification…':transferAccess==='rejected'?'↻ Redemander l’accès au transfert':'Demander l’accès au transfert anonyme'}</button>}</div>}{menuFor===m.id&&<div className="messenger-message-actions"><button onClick={()=>messageAction('save',m)}>♧ Sauvegarder</button><button onClick={()=>messageAction('pin',m)}>⌖ Épingler pour moi</button><button onClick={()=>messageAction('reply',m)}>↩ Répondre</button><button onClick={()=>messageAction('forward',m)}>↪ Transférer</button>{m.sender===uid&&<button onClick={()=>messageAction('edit',m)}>✎ Modifier</button>}<button onClick={()=>messageAction('hide',m)}>▣ Supprimer pour moi</button>{m.sender===uid?<button className="danger" onClick={()=>messageAction('delete',m)}>▤ Supprimer pour tous</button>:<button className="danger" onClick={()=>messageAction('report',m)}>⚑ Signaler</button>}</div>}</div>)}
    {otherTyping&&<div className="messenger-typing" role="status" aria-live="polite">{person?.display_name||person?.username||'Cette personne'} est en train d’écrire<span className="typing-dots"><i></i><i></i><i></i></span></div>}
   </div>
   {status&&<p className="messenger-status">{status}</p>}
   <form className="messenger-compose" onSubmit={send}>
    <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={e=>{const file=e.target.files?.[0];if(file)sendAttachment(file,'image');e.currentTarget.value=''}}/>
    <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" hidden onChange={e=>{const file=e.target.files?.[0];if(file)sendAttachment(file,'image');e.currentTarget.value=''}}/>
    <input ref={audioInputRef} type="file" accept="audio/*" hidden onChange={e=>{const file=e.target.files?.[0];if(file)sendAttachment(file,'audio');e.currentTarget.value=''}}/>
    <input ref={videoInputRef} type="file" accept="video/mp4,video/webm,video/quicktime,video/3gpp" hidden onChange={e=>{const file=e.target.files?.[0];if(file)sendAttachment(file,'video');e.currentTarget.value=''}}/>
    <div className="messenger-attachment-wrap">
     <button type="button" className="messenger-plus-button" disabled={busy||uploading} onClick={()=>setAttachmentMenuOpen(value=>!value)} aria-label="Ajouter une pièce jointe" aria-expanded={attachmentMenuOpen} title="Ajouter">＋</button>
     {attachmentMenuOpen&&<div className="messenger-attachment-menu" role="menu">
      <button type="button" role="menuitem" disabled={busy||uploading} onClick={startCamera}>📷 <span>Prendre une photo</span></button>
      <button type="button" role="menuitem" disabled={busy||uploading} onClick={()=>{setAttachmentMenuOpen(false);imageInputRef.current?.click()}}>🖼️ <span>Photo</span></button>
      <button type="button" role="menuitem" disabled={busy||uploading} onClick={()=>{setAttachmentMenuOpen(false);audioInputRef.current?.click()}}>🎵 <span>Audio</span></button>
      <button type="button" role="menuitem" disabled={busy||uploading} onClick={()=>{setAttachmentMenuOpen(false);videoInputRef.current?.click()}}>🎬 <span>Vidéo</span></button>
      <button type="button" role="menuitem" disabled={busy||uploading||recordingVoice} onClick={()=>{setAttachmentMenuOpen(false);addSpotifyLink()}}>🟢 <span>Spotify</span></button>
      <button type="button" role="menuitem" disabled={busy||uploading} onClick={recordingVoice?stopVoiceRecording:startVoiceRecording}>{recordingVoice?'⏹️':'🎙️'} <span>{recordingVoice?'Arrêter le vocal':'Enregistrer un vocal'}</span></button>
     </div>}
    </div>
    {replyTo&&<div className="messenger-reply-preview"><span>Réponse à : {(replyTo.body||replyTo.subject||'Message').slice(0,100)}</span><button type="button" onClick={()=>setReplyTo(null)} aria-label="Annuler la réponse">×</button></div>}{emojiOpen&&<div className="message-emoji-picker">{['😀','😂','🥰','😍','😊','😉','😎','😭','😡','❤️','🔥','👍','👎','🙏','🎉','💯','✨','🤔','🙌','💬'].map(emoji=><button type="button" key={emoji} onClick={()=>setBody(v=>v+emoji)}>{emoji}</button>)}</div>}<button type="button" onClick={()=>setEmojiOpen(v=>!v)} aria-label="Ajouter un emoji" title="Ajouter un emoji">😊</button><textarea ref={messageInputRef} value={body} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();if(body.trim()&&!busy)void send(e)}}} onChange={e=>{const value=e.target.value;setBody(value);const channel=typingChannelRef.current;if(channel){const now=Date.now();if(now-lastTypingSent.current>900){lastTypingSent.current=now;channel.send({type:'broadcast',event:'typing',payload:{user_id:uid,is_typing:true}})}if(typingStopTimer.current)clearTimeout(typingStopTimer.current);typingStopTimer.current=setTimeout(()=>{channel.send({type:'broadcast',event:'typing',payload:{user_id:uid,is_typing:false}})},2200)}}} maxLength={3000} placeholder="Écris ton message… (Entrée pour envoyer, Maj+Entrée pour aller à la ligne)" aria-label="Écris ton message"/><button disabled={busy||uploading||!body.trim()} aria-label="Envoyer le message">{busy||uploading?'…':'➤'}</button></form>
   {cameraOpen&&<div role="dialog" aria-modal="true" aria-label="Prendre une photo" style={{position:'fixed',inset:0,zIndex:10000,background:'#000',display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center',padding:16}}>
    <video ref={cameraVideoRef} autoPlay playsInline muted style={{width:'100%',maxWidth:560,maxHeight:'75vh',objectFit:'contain',borderRadius:14,background:'#111'}}/>
    <div style={{display:'flex',gap:14,marginTop:18}}>
     <button type="button" onClick={closeCamera} style={{padding:'12px 18px',borderRadius:24}}>Annuler</button>
     <button type="button" onClick={captureCameraPhoto} style={{padding:'12px 22px',borderRadius:24,fontWeight:700}}>📸 Capturer</button>
    </div>
   </div>}
  </section>
 </main>
}
