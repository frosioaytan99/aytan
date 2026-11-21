import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import CommunityImage from './CommunityImage'

type Props = { userId?:string|null; name?:string|null; avatarUrl?:string|null; className?:string; imageSize?:number }
type AvatarStatus = { online:boolean; unread:boolean; expiresAt:number }
const statusCache = new Map<string, AvatarStatus>()
const pendingStatus = new Map<string, Promise<AvatarStatus>>()
let currentUserPromise: ReturnType<typeof supabase.auth.getUser> | null = null

async function getAvatarStatus(userId:string):Promise<AvatarStatus>{
 const cached=statusCache.get(userId)
 if(cached&&cached.expiresAt>Date.now())return cached
 const pending=pendingStatus.get(userId)
 if(pending)return pending
 const request=(async()=>{
  if(!currentUserPromise)currentUserPromise=supabase.auth.getUser()
  const [{data:profile},{data:{user}}]=await Promise.all([
   supabase.from('profiles').select('last_seen_at').eq('id',userId).maybeSingle(),
   currentUserPromise
  ])
  const seen=profile?.last_seen_at?new Date(profile.last_seen_at).getTime():0
  let unread=false
  if(user&&user.id!==userId){
   const {count}=await supabase.from('messages').select('id',{count:'exact',head:true}).eq('sender',userId).eq('recipient',user.id).eq('is_read',false)
   unread=(count||0)>0
  }
  const result={online:!!seen&&Date.now()-seen<=5*60*1000,unread,expiresAt:Date.now()+45000}
  statusCache.set(userId,result)
  return result
 })()
 pendingStatus.set(userId,request)
 try{return await request}finally{pendingStatus.delete(userId)}
}

export default function MemberAvatar({userId,name,avatarUrl,className='avatar',imageSize}:Props) {
 const [online,setOnline]=useState(false)
 const [unread,setUnread]=useState(false)
 useEffect(()=>{
  if(!userId){setOnline(false);setUnread(false);return}
  let active=true
  getAvatarStatus(userId).then(status=>{
   if(active){setOnline(status.online);setUnread(status.unread)}
  }).catch(()=>{if(active){setOnline(false);setUnread(false)}})
  return()=>{active=false}
 },[userId])
 const style=imageSize?{width:imageSize,height:imageSize,objectFit:'cover' as const}:undefined
 return <span className="member-avatar-wrap">
  <span className={className}>{avatarUrl?<CommunityImage src={avatarUrl} alt={name||'Photo de profil'} style={style} fallback={(name||'Membre').slice(0,1).toUpperCase()}/>:((name||'Membre').slice(0,1).toUpperCase())}</span>
  {online&&<i className="member-presence-dot" title="En ligne" aria-label="En ligne"/>}
  {unread&&<i className="member-unread-dot" title="Message non lu" aria-label="Message non lu"/>}
 </span>
}
