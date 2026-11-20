import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const CATEGORIES = [
  'harassment','harassment/threatening','hate','hate/threatening',
  'violence','violence/graphic','sexual','sexual/minors',
  'self-harm','self-harm/intent','self-harm/instructions',
  'illicit','illicit/violent',
]
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store')
  if (!['GET','PATCH','POST'].includes(req.method || '')) {
    res.setHeader('Allow','GET, PATCH, POST')
    return res.status(405).json({error:'method_not_allowed'})
  }
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const service=process.env.SUPABASE_SERVICE_ROLE_KEY
  if(!url||!anon||!service) return res.status(503).json({error:'moderation_console_not_configured'})
  const auth=req.headers.authorization || ''
  const token=typeof auth==='string'&&auth.startsWith('Bearer ')?auth.slice(7).trim():''
  if(!token)return res.status(401).json({error:'authentication_required'})
  try{
    const authClient=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}})
    const {data:authData,error:authError}=await authClient.auth.getUser(token)
    if(authError||!authData.user)return res.status(401).json({error:'invalid_session'})
    const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}})
    const {data:role,error:roleError}=await db.from('user_roles').select('role').eq('user_id',authData.user.id).maybeSingle()
    if(roleError)return res.status(503).json({error:'role_check_failed'})
    if(!['admin','moderator'].includes(role?.role||''))return res.status(403).json({error:'moderator_access_required'})

    if(req.method==='GET'){
      const [{data:settings,error:settingsError},{data:logs,error:logsError}]=await Promise.all([
        db.from('ai_moderation_settings').select('*').eq('id',true).single(),
        db.from('ai_moderation_logs').select('id,user_id,content,allowed,flagged,categories,category_scores,decision,reviewed_by,reviewed_at,created_at').order('created_at',{ascending:false}).limit(100)
      ])
      if(settingsError||logsError)return res.status(503).json({error:'moderation_data_read_failed'})
      const all=logs||[]
      return res.status(200).json({
        settings,
        logs:all,
        stats:{analyzed:all.length,blocked:all.filter(x=>!x.allowed).length,flagged:all.filter(x=>x.flagged).length,approved:all.filter(x=>x.decision==='approved').length}
      })
    }

    if(req.method==='PATCH'){
      const enabled=req.body?.enabled
      const blockedCategories=req.body?.blocked_categories
      if(typeof enabled!=='boolean'||!Array.isArray(blockedCategories)||blockedCategories.some((x:any)=>typeof x!=='string'||!CATEGORIES.includes(x))) {
        return res.status(400).json({error:'invalid_settings'})
      }
      const {data,error}=await db.from('ai_moderation_settings').upsert({
        id:true,enabled,blocked_categories:Array.from(new Set(blockedCategories)),updated_by:authData.user.id,updated_at:new Date().toISOString()
      },{onConflict:'id'}).select('*').single()
      if(error)return res.status(503).json({error:'settings_save_failed'})
      return res.status(200).json({ok:true,settings:data})
    }

    const logId=typeof req.body?.log_id==='string'?req.body.log_id:''
    const decision=req.body?.decision
    if(!UUID_RE.test(logId)||!['approved','rejected'].includes(decision))return res.status(400).json({error:'invalid_review'})
    const {data:log,error:logError}=await db.from('ai_moderation_logs').select('id').eq('id',logId).maybeSingle()
    if(logError)return res.status(503).json({error:'review_lookup_failed'})
    if(!log)return res.status(404).json({error:'moderation_log_not_found'})
    const {error:updateError}=await db.from('ai_moderation_logs').update({
      allowed:decision==='approved',decision,reviewed_by:authData.user.id,reviewed_at:new Date().toISOString()
    }).eq('id',logId)
    if(updateError)return res.status(503).json({error:'review_save_failed'})
    return res.status(200).json({ok:true,log_id:logId,decision})
  }catch{
    return res.status(500).json({error:'moderation_console_failed'})
  }
}
