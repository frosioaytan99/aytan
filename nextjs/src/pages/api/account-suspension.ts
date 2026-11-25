import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req:NextApiRequest,res:NextApiResponse){
 res.setHeader('Cache-Control','no-store, private')
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'method_not_allowed'})}
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_URL
 const anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
 const service=process.env.SUPABASE_SERVICE_ROLE_KEY
 if(!url||!anon||!service)return res.status(503).json({error:'suspension_check_not_configured'})
 const header=req.headers.authorization||''
 const token=typeof header==='string'&&header.startsWith('Bearer ')?header.slice(7).trim():''
 if(!token)return res.status(401).json({error:'authentication_required'})
 try{
  const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
  const {data:authData,error:authError}=await auth.auth.getUser(token)
  if(authError||!authData.user)return res.status(401).json({error:'invalid_session'})
  const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}})
  const {data:row,error}=await db.from('account_suspensions').select('reason').eq('user_id',authData.user.id).maybeSingle()
  if(error)return res.status(503).json({error:'suspension_lookup_failed'})
  return res.status(200).json({suspended:!!row,reason:row?.reason||null})
 }catch{return res.status(500).json({error:'suspension_check_failed'})}
}
