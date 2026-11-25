import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export const config = { api: { bodyParser: { sizeLimit: '1kb' } } }

export default async function handler(req:NextApiRequest,res:NextApiResponse){
 res.setHeader('Cache-Control','no-store')
 if(req.method!=='GET'&&req.method!=='POST'){res.setHeader('Allow','GET, POST');return res.status(405).json({error:'method_not_allowed'})}
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_URL
 const anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
 const service=process.env.SUPABASE_SERVICE_ROLE_KEY
 if(!url||!anon||!service)return res.status(503).json({error:'transfer_access_not_configured'})
 const header=req.headers.authorization||''
 const token=typeof header==='string'&&header.startsWith('Bearer ')?header.slice(7).trim():''
 if(!token)return res.status(401).json({error:'authentication_required'})
 try{
  const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
  const {data,error}=await auth.auth.getUser(token)
  if(error||!data.user)return res.status(401).json({error:'invalid_session'})
  if(data.user.is_anonymous)return res.status(403).json({error:'registered_account_required'})
  const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}})
  const {data:profile,error:profileError}=await db.from('profiles').select('age').eq('id',data.user.id).maybeSingle()
  if(profileError)return res.status(503).json({error:'profile_check_failed'})
  const eligible=Number(profile?.age)>=18
  if(req.method==='GET'){
   const {data:access,error:accessError}=await db.from('photo_transfer_access').select('status').eq('user_id',data.user.id).maybeSingle()
   if(accessError)return res.status(503).json({error:'access_status_read_failed'})
   return res.status(200).json({status:access?.status||'none',eligible})
  }
  if(!eligible)return res.status(403).json({error:'adult_access_required',eligible:false})
  const {data:suspension,error:suspensionError}=await db.from('account_suspensions').select('user_id').eq('user_id',data.user.id).maybeSingle()
  if(suspensionError)return res.status(503).json({error:'account_status_check_failed'})
  if(suspension)return res.status(403).json({error:'account_suspended'})
  const {data:current,error:currentError}=await db.from('photo_transfer_access').select('status').eq('user_id',data.user.id).maybeSingle()
  if(currentError)return res.status(503).json({error:'access_status_read_failed'})
  if(current?.status==='approved'||current?.status==='pending')return res.status(200).json({status:current.status})
  const {error:writeError}=await db.from('photo_transfer_access').upsert({user_id:data.user.id,status:'pending',requested_at:new Date().toISOString(),reviewed_at:null,reviewed_by:null},{onConflict:'user_id'})
  if(writeError)return res.status(503).json({error:'request_submit_failed'})
  return res.status(200).json({ok:true,status:'pending'})
 }catch{return res.status(500).json({error:'transfer_access_request_failed'})}
}
