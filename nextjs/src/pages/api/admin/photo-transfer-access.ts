import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export const config={api:{bodyParser:{sizeLimit:'1kb'}}}
export default async function handler(req:NextApiRequest,res:NextApiResponse){
 res.setHeader('Cache-Control','no-store')
 if(req.method!=='GET'&&req.method!=='POST'){res.setHeader('Allow','GET, POST');return res.status(405).json({error:'method_not_allowed'})}
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_URL,anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,service=process.env.SUPABASE_SERVICE_ROLE_KEY
 if(!url||!anon||!service)return res.status(503).json({error:'admin_api_not_configured'})
 const header=req.headers.authorization||'',token=typeof header==='string'&&header.startsWith('Bearer ')?header.slice(7).trim():''
 if(!token)return res.status(401).json({error:'authentication_required'})
 try{
  const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
  const {data,error}=await auth.auth.getUser(token)
  if(error||!data.user)return res.status(401).json({error:'invalid_session'})
  const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}})
  const {data:role,error:roleError}=await db.from('user_roles').select('role').eq('user_id',data.user.id).maybeSingle()
  if(roleError)return res.status(503).json({error:'role_check_failed'})
  if(role?.role!=='admin')return res.status(403).json({error:'admin_access_required'})
  if(req.method==='GET'){
   const {data:rows,error:readError}=await db.from('photo_transfer_access').select('user_id,status,requested_at,reviewed_at,reviewed_by').order('requested_at',{ascending:false}).limit(500)
   if(readError)return res.status(503).json({error:'transfer_access_read_failed'})
   const ids=(rows||[]).map((row:any)=>row.user_id)
   const {data:profiles,error:profilesError}=ids.length?await db.from('profiles').select('id,username,display_name,age').in('id',ids):{data:[],error:null}
   if(profilesError)return res.status(503).json({error:'transfer_profiles_read_failed'})
   const byId=new Map((profiles||[]).map((profile:any)=>[profile.id,profile]))
   return res.status(200).json({requests:(rows||[]).map((row:any)=>({...row,profile:byId.get(row.user_id)||null}))})
  }
  const userId=typeof req.body?.user_id==='string'?req.body.user_id.trim():''
  const action=req.body?.action
  if(!UUID_RE.test(userId)||!['approve','reject','grant','revoke'].includes(action))return res.status(400).json({error:'invalid_request'})
  const {data:profile,error:profileError}=await db.from('profiles').select('id,age').eq('id',userId).maybeSingle()
  if(profileError)return res.status(503).json({error:'target_check_failed'})
  if(!profile)return res.status(404).json({error:'profile_not_found'})
  if((action==='approve'||action==='grant')&&Number(profile.age)<18)return res.status(403).json({error:'adult_access_required'})
  if(action==='revoke'){
   const {error:deleteError}=await db.from('photo_transfer_access').delete().eq('user_id',userId)
   if(deleteError)return res.status(503).json({error:'transfer_access_revoke_failed'})
   return res.status(200).json({ok:true,user_id:userId,status:'none'})
  }
  const nextStatus=action==='reject'?'rejected':'approved'
  const {error:writeError}=await db.from('photo_transfer_access').upsert({user_id:userId,status:nextStatus,reviewed_at:new Date().toISOString(),reviewed_by:data.user.id},{onConflict:'user_id'})
  if(writeError)return res.status(503).json({error:'transfer_access_update_failed'})
  return res.status(200).json({ok:true,user_id:userId,status:nextStatus})
 }catch{return res.status(500).json({error:'transfer_access_admin_failed'})}
}
