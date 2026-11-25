import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const PAGE_SIZE=25

export default async function handler(req:NextApiRequest,res:NextApiResponse){
 res.setHeader('Cache-Control','no-store, private')
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'method_not_allowed'})}
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_URL
 const anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
 const service=process.env.SUPABASE_SERVICE_ROLE_KEY
 if(!url||!anon||!service)return res.status(503).json({error:'archive_not_configured'})
 const header=req.headers.authorization||''
 const token=typeof header==='string'&&header.startsWith('Bearer ')?header.slice(7).trim():''
 if(!token)return res.status(401).json({error:'authentication_required'})
 try{
  const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
  const {data:authData,error:authError}=await auth.auth.getUser(token)
  if(authError||!authData.user)return res.status(401).json({error:'invalid_session'})
  const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}})
  const {data:role,error:roleError}=await db.from('user_roles').select('role').eq('user_id',authData.user.id).maybeSingle()
  if(roleError)return res.status(503).json({error:'role_check_failed'})
  if(!['admin','moderator'].includes(role?.role||''))return res.status(403).json({error:'moderator_access_required'})

  const downloadId=typeof req.query.download==='string'?req.query.download:''
  if(downloadId){
   if(!UUID_RE.test(downloadId))return res.status(400).json({error:'invalid_photo_id'})
   const {data:log,error:logError}=await db.from('ai_moderation_logs').select('image_path').eq('id',downloadId).maybeSingle()
   if(logError)return res.status(503).json({error:'archive_lookup_failed'})
   if(!log?.image_path)return res.status(404).json({error:'photo_not_found'})
   const {data:file,error:fileError}=await db.storage.from('community-private').download(log.image_path)
   if(fileError||!file)return res.status(404).json({error:'photo_file_not_found'})
   const bytes=Buffer.from(await file.arrayBuffer())
   const ext=(log.image_path.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg'
   const mime=file.type||'application/octet-stream'
   res.setHeader('Content-Type',mime)
   res.setHeader('Content-Length',String(bytes.length))
   res.setHeader('Content-Disposition',`attachment; filename="weshbien-photo-${downloadId}.${ext}"`)
   return res.status(200).send(bytes)
  }

  const rawPage=Number(req.query.page||0)
  const page=Number.isFinite(rawPage)?Math.max(0,Math.min(100000,Math.floor(rawPage))):0
  const from=page*PAGE_SIZE
  const {data:rows,error,count}=await db.from('ai_moderation_logs')
   .select('id,user_id,content,allowed,flagged,decision,created_at,image_path,categories',{count:'exact'})
   .not('image_path','is',null)
   .order('created_at',{ascending:false})
   .range(from,from+PAGE_SIZE-1)
  if(error)return res.status(503).json({error:'archive_read_failed'})
  const photos=await Promise.all((rows||[]).map(async row=>{
   const {data}=await db.storage.from('community-private').createSignedUrl(row.image_path,900)
   return {...row,image_url:data?.signedUrl||null}
  }))
  return res.status(200).json({photos,total:count||0,page,page_size:PAGE_SIZE})
 }catch{
  return res.status(500).json({error:'archive_request_failed'})
 }
}
