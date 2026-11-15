import {useEffect,useMemo,useState} from 'react'
import Link from 'next/link'
import {supabase} from '../lib/supabaseClient'
type Profile={id:string;display_name:string|null;username:string|null;age:number|null;created_at:string|null}
type Report={id:string;reporter_id:string;content_type:string;content_id:string;reason:string;status:string;created_at:string}
export default function AdminPage(){
 const [allowed,setAllowed]=useState(false),[isAdmin,setIsAdmin]=useState(false),[reports,setReports]=useState<Report[]>([]),[accounts,setAccounts]=useState<Profile[]>([]),[suspended,setSuspended]=useState<string[]>([]),[query,setQuery]=useState(''),[status,setStatus]=useState('Vérification des droits…'),[busy,setBusy]=useState('')
 async function load(adminMode:boolean){
  const {data,error}=await supabase.from('reports').select('*').order('created_at',{ascending:false}).limit(200)
  if(error)setStatus('Lecture des signalements impossible : '+error.message);else setReports((data||[]) as Report[])
  if(adminMode){
   const p=await supabase.from('profiles').select('id,display_name,username,age,created_at').order('created_at',{ascending:false}).limit(500)
   const s=await supabase.from('account_suspensions').select('user_id')
   if(p.error)setStatus('Lecture des comptes impossible : '+p.error.message);else setAccounts((p.data||[]) as Profile[])
   if(s.error)setStatus('Lecture des suspensions impossible : '+s.error.message);else setSuspended((s.data||[]).map((x:any)=>x.user_id))
  }
 }
 useEffect(()=>{(async()=>{
  const {data:{user}}=await supabase.auth.getUser()
  if(!user){location.href='/auth';return}
  const {data:role,error}=await supabase.from('user_roles').select('role').eq('user_id',user.id).maybeSingle()
  if(error||!role||!['admin','moderator'].includes(role.role)){setStatus('Accès réservé à l’équipe de modération.');return}
  const adminMode=role.role==='admin';setIsAdmin(adminMode);setAllowed(true);await load(adminMode)
 })()},[])
 async function change(id:string,next:string){const {error}=await supabase.from('reports').update({status:next}).eq('id',id);if(error)setStatus('Modification impossible : '+error.message);else load(isAdmin)}
 async function toggleSuspension(person:Profile){
  const blocked=suspended.includes(person.id)
  if(blocked&&!window.confirm('Réactiver ce compte ?'))return
  if(!blocked&&!window.confirm('Suspendre ce compte ? La personne ne pourra plus utiliser la communauté.'))return
  setBusy(person.id)
  const {data:{user}}=await supabase.auth.getUser()
  const result=blocked?await supabase.from('account_suspensions').delete().eq('user_id',person.id):await supabase.from('account_suspensions').insert({user_id:person.id,created_by:user?.id,reason:'Suspension décidée par un administrateur'})
  if(result.error)setStatus('Action impossible : '+result.error.message)
  else{setSuspended(v=>blocked?v.filter(x=>x!==person.id):[...v,person.id]);setStatus(blocked?'Compte réactivé.':'Compte suspendu.')}
  setBusy('')
 }
 const filtered=useMemo(()=>accounts.filter(p=>(p.username||'').toLowerCase().includes(query.toLowerCase())||(p.display_name||'').toLowerCase().includes(query.toLowerCase())),[accounts,query])
 return <main className="app-shell"><header className="app-header"><Link className="brand" href="/">weshbien2<span>.</span></Link><nav><Link href="/feed">Fil</Link><Link href="/explore">Découvrir</Link><Link href="/profile">Mon profil</Link><Link href="/inbox">Messages</Link><Link href="/notifications">Notifications</Link></nav></header><section className="directory"><small>SÉCURITÉ DE LA COMMUNAUTÉ</small><h1>Administration</h1><p>{status}</p>{allowed&&<><div className="card profile-form"><h2>Signalements ({reports.length})</h2>{reports.length?reports.map(r=><article className="report-row" key={r.id}><b>{r.content_type==='profile'?'Profil':r.content_type==='post'?'Publication':'Message'}</b><span>{r.reason}</span><small>Cible : {r.content_id} · {new Date(r.created_at).toLocaleString('fr-FR')}</small><small>Statut : {r.status}</small><div className="report-actions"><button onClick={()=>change(r.id,'reviewing')}>En cours</button><button onClick={()=>change(r.id,'resolved')}>Résolu</button><button onClick={()=>change(r.id,'dismissed')}>Ignorer</button></div></article>):<p>Aucun signalement pour le moment.</p>}</div>{isAdmin&&<div className="card profile-form admin-accounts"><h2>Tous les comptes ({accounts.length})</h2><p>Recherche les profils, consulte-les et suspends ou réactive un compte.</p><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher un pseudo ou un nom…"/>{filtered.length?filtered.map(p=><article className="admin-account-row" key={p.id}><div><b>{p.display_name||p.username||'Membre'}</b><small>@{p.username||'sans pseudo'} · {p.age?p.age+' ans':'âge non renseigné'}</small><small>Inscrit le {p.created_at?new Date(p.created_at).toLocaleDateString('fr-FR'):'date inconnue'}</small></div><div className="admin-account-actions"><Link href={'/profile?id='+p.id}>Voir profil</Link><button className={suspended.includes(p.id)?'friend-secondary':'danger-action'} disabled={busy===p.id} onClick={()=>toggleSuspension(p)}>{busy===p.id?'…':suspended.includes(p.id)?'Réactiver':'Suspendre'}</button></div></article>):<p>Aucun compte trouvé.</p>}</div>}</>}</section></main>
}
