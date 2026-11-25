import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
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
   const {data:rows,error:readError}=await db.from('photo_moderation_bypass_users').select('user_id,created_at').order('created_at',{ascending:false}).limit(1000)
   if(readError)return res.status(503).json({error:'bypass_list_read_failed'})
   return res.status(200).json({users:rows||[]})
  }
  const userId=typeof req.body?.user_id==='string'?req.body.user_id.trim():'',enabled=req.body?.enabled
  if(!UUID_RE.test(userId)||typeof enabled!=='boolean')return res.status(400).json({error:'invalid_request'})
  if(userId===data.user.id)return res.status(400).json({error:'cannot_change_own_setting'})
  const {data:profile,error:profileError}=await db.from('profiles').select('id').eq('id',userId).maybeSingle()
  if(profileError)return res.status(503).json({error:'target_check_failed'})
  if(!profile)return res.status(404).json({error:'profile_not_found'})
  const {data:targetRole,error:targetRoleError}=await db.from('user_roles').select('role').eq('user_id',userId).maybeSingle()
  if(targetRoleError)return res.status(503).json({error:'target_role_check_failed'})
  if(targetRole?.role==='admin')return res.status(409).json({error:'administrator_excluded'})
  if(enabled){
   const {error:writeError}=await db.from('photo_moderation_bypass_users').upsert({user_id:userId,granted_by:data.user.id},{onConflict:'user_id'})
   if(writeError)return res.status(503).json({error:'bypass_enable_failed'})
  }else{
   const {error:writeError}=await db.from('photo_moderation_bypass_users').delete().eq('user_id',userId)
   if(writeError)return res.status(503).json({error:'bypass_disable_failed'})
  }
  return res.status(200).json({ok:true,user_id:userId,enabled})
 }catch{return res.status(500).json({error:'photo_bypass_admin_failed'})}
}