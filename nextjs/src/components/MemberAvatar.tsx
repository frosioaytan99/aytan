import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import CommunityImage from './CommunityImage'

type Props = { userId?:string|null; name?:string|null; avatarUrl?:string|null; className?:string; imageSize?:number }

export default function MemberAvatar({userId,name,avatarUrl,className='avatar',imageSize}:Props) {
 const [online,setOnline]=useState(false)
 const [unread,setUnread]=useState(false)
 useEffect(()=>{
  if(!userId)return
  let active=true
  const refresh=async()=>{
   const [{data:profile},{data:{user}}]=await Promise.all([
    supabase.from('profiles').select('last_seen_at').eq('id',userId).maybeSingle(),
    supabase.auth.getUser()
   ])
   if(!active)return
   const seen=profile?.last_seen_at?new Date(profile.last_seen_at).getTime():0
   setOnline(!!seen&&Date.now()-seen<=5*60*1000)
   if(user&&user.id!==userId){
    const {count}=await supabase.from('messages').select('id',{count:'exact',head:true}).eq('sender',userId).eq('recipient',user.id).eq('is_read',false)
    if(active)setUnread((count||0)>0)
   }else if(active)setUnread(false)
  }
  refresh()
  const timer=setInterval(refresh,30000)
  return()=>{active=false;clearInterval(timer)}
 },[userId])
 const style=imageSize?{width:imageSize,height:imageSize,objectFit:'cover' as const}:undefined
 return <span className="member-avatar-wrap">
  <span className={className}>{avatarUrl?<CommunityImage src={avatarUrl} alt={name||'Photo de profil'} style={style} fallback={(name||'Membre').slice(0,1).toUpperCase()}/>:((name||'Membre').slice(0,1).toUpperCase())}</span>
  {online&&<i className="member-presence-dot" title="En ligne" aria-label="En ligne"/>}
  {unread&&<i className="member-unread-dot" title="Message non lu" aria-label="Message non lu"/>}
 </span>
}
