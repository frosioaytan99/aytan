import {useCallback,useEffect,useState} from 'react'
import Link from 'next/link'
import {supabase} from '../lib/supabaseClient'

type Settings={enabled:boolean;blocked_categories:string[]}
type Log={id:string;user_id:string|null;content:string;allowed:boolean;flagged:boolean;categories:Record<string,boolean>;category_scores:Record<string,number>;decision:string;created_at:string;reviewed_at:string|null}
const LABELS:Record<string,string>={
 harassment:'Harcèlement', 'harassment/threatening':'Menaces et harcèlement',
 hate:'Haine', 'hate/threatening':'Menaces haineuses', violence:'Violence',
 'violence/graphic':'Violence graphique', sexual:'Contenu sexuel',
 'sexual/minors':'Contenu sexuel impliquant des mineurs', 'self-harm':'Automutilation',
 'self-harm/intent':'Intention d’automutilation','self-harm/instructions':'Instructions d’automutilation',
 illicit:'Activités illicites','illicit/violent':'Activités illicites violentes'
}
const CATEGORIES=Object.keys(LABELS)

export default function ModerationPage(){
 const [settings,setSettings]=useState<Settings>({enabled:true,blocked_categories:CATEGORIES})
 const [logs,setLogs]=useState<Log[]>([])
 const [stats,setStats]=useState({analyzed:0,blocked:0,flagged:0,approved:0})
 const [status,setStatus]=useState('Chargement du centre de contrôle…')
 const [busy,setBusy]=useState(false)
 const [filter,setFilter]=useState('all')
 const [allowed,setAllowed]=useState(false)

 const request=useCallback(async(method:'GET'|'PATCH'|'POST',body?:any)=>{
  const {data:{session}}=await supabase.auth.getSession()
  if(!session?.access_token)throw new Error('Session expirée. Reconnecte-toi.')
  const response=await fetch('/api/admin/ai-moderation',{method,headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:body?JSON.stringify(body):undefined})
  const payload=await response.json().catch(()=>null)
  if(!response.ok)throw new Error(payload?.error||'Erreur serveur')
  return payload
 },[])

 const load=useCallback(async()=>{
  try{
   const {data:{user}}=await supabase.auth.getUser()
   if(!user){location.href='/auth';return}
   const {data:role}=await supabase.from('user_roles').select('role').eq('user_id',user.id).maybeSingle()
   if(!role||!['admin','moderator'].includes(role.role)){setStatus('Accès réservé aux administrateurs et modérateurs.');return}
   setAllowed(true)
   const data=await request('GET')
   setSettings({enabled:data.settings.enabled,blocked_categories:data.settings.blocked_categories||[]})
   setLogs(data.logs||[])
   setStats(data.stats||{analyzed:0,blocked:0,flagged:0,approved:0})
   setStatus('Centre de contrôle de l’IA prêt.')
  }catch(e:any){setStatus(e.message||'Impossible de charger les réglages.')}
 },[request])

 useEffect(()=>{load()},[load])

 async function save(next:Settings){
  setBusy(true);setStatus('Enregistrement des réglages…')
  try{const data=await request('PATCH',{enabled:next.enabled,blocked_categories:next.blocked_categories});setSettings({enabled:data.settings.enabled,blocked_categories:data.settings.blocked_categories});setStatus('Réglages enregistrés.')}
  catch(e:any){setStatus('Enregistrement impossible : '+e.message)}
  setBusy(false)
 }
 async function review(log:Log,decision:'approved'|'rejected'){
  setBusy(true)
  try{await request('POST',{log_id:log.id,decision});setLogs(v=>v.map(x=>x.id===log.id?{...x,allowed:decision==='approved',decision,reviewed_at:new Date().toISOString()}:x));setStatus(decision==='approved'?'Décision marquée comme approuvée dans le journal.':'Décision marquée comme rejetée dans le journal.')}
  catch(e:any){setStatus('Révision impossible : '+e.message)}
  setBusy(false)
 }
 const visible=logs.filter(log=>filter==='all'||(filter==='blocked'&&!log.allowed)||(filter==='allowed'&&log.allowed)||(filter==='flagged'&&log.flagged))
 return <main className="app-shell"><header className="app-header"><Link className="brand" href="/">weshbien2<span>.</span></Link><nav><Link href="/admin">Administration</Link><Link href="/feed">Fil</Link></nav></header><section className="directory">
 <small>SÉCURITÉ DE LA COMMUNAUTÉ</small><h1>Centre de contrôle de l’IA</h1><p>{status}</p>
 {allowed&&<>
 <div className="card profile-form"><h2>État de la modération automatique</h2><p>{settings.enabled?'L’IA analyse les textes des forums et les photos envoyées dans le fil, les stories et les profils.':'La modération automatique des textes et des photos est en pause.'}</p><button disabled={busy} onClick={()=>save({...settings,enabled:!settings.enabled})}>{settings.enabled?'Mettre l’IA en pause':'Réactiver la modération IA'}</button></div>
 <div className="card profile-form"><h2>Règles de détection</h2><p>Coche les catégories que l’IA doit bloquer automatiquement.</p><div className="moderation-category-list">{CATEGORIES.map(category=><label key={category} className="moderation-category"><input type="checkbox" checked={settings.blocked_categories.includes(category)} disabled={busy} onChange={e=>{const next=e.target.checked?[...settings.blocked_categories,category]:settings.blocked_categories.filter(x=>x!==category);save({...settings,blocked_categories:next})}}/><span>{LABELS[category]}</span></label>)}</div></div>
 <div className="admin-stats-grid">{[['Analysés',stats.analyzed],['Bloqués',stats.blocked],['Signalés par l’IA',stats.flagged],['Approuvés après revue',stats.approved]].map(([label,value])=><div className="card" key={String(label)}><small>{label}</small><h2>{value}</h2></div>)}</div>
 <div className="card profile-form"><h2>Historique des analyses</h2><p>Les 100 dernières analyses effectuées par l’IA.</p><div className="report-actions">{[['all','Tout'],['blocked','Bloqués'],['allowed','Autorisés'],['flagged','Signalés']].map(([key,label])=><button key={key} onClick={()=>setFilter(key)} aria-pressed={filter===key}>{label}</button>)}</div>
 {visible.length===0?<p>Aucune analyse dans cette catégorie.</p>:visible.map(log=><article className="report-row" key={log.id}><b>{log.allowed?'Contenu autorisé':'Contenu bloqué'}{log.flagged?' · Signalé par l’IA':''}</b><small>{new Date(log.created_at).toLocaleString('fr-FR')} · {log.user_id?'Utilisateur : '+log.user_id:'Utilisateur inconnu'}</small><p className="moderation-log-content">{log.content}</p><small>Catégories : {Object.entries(log.categories||{}).filter(([,v])=>v).map(([k])=>LABELS[k]||k).join(', ')||'Aucune'}</small><small>Décision : {log.decision==='automatic'?'Automatique':log.decision==='approved'?'Approuvée par un modérateur':'Rejetée par un modérateur'}</small>{log.decision==='automatic'&&<div className="report-actions"><button disabled={busy} onClick={()=>review(log,'approved')}>Marquer comme approuvé</button><button disabled={busy} onClick={()=>review(log,'rejected')}>Confirmer le blocage</button></div>}</article>)}
 </div>
 <p><small>Important : les actions de revue enregistrent la décision du modérateur dans l’historique. Elles ne republient pas automatiquement un texte déjà bloqué.</small></p>
 </>}
 </section></main>
}
