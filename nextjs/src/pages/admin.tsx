import {useEffect,useMemo,useState} from 'react'
import Link from 'next/link'
import {supabase} from '../lib/supabaseClient'

type Profile={id:string;display_name:string|null;username:string|null;age:number|null;created_at:string|null}
type Report={id:string;reporter_id:string;content_type:string;content_id:string;reason:string;status:string;created_at:string}
type RoleRow={user_id:string;role:'admin'|'moderator'|'member'}

export default function AdminPage(){
 const [allowed,setAllowed]=useState(false),[isAdmin,setIsAdmin]=useState(false),[reports,setReports]=useState<Report[]>([]),[accounts,setAccounts]=useState<Profile[]>([]),[suspended,setSuspended]=useState<string[]>([]),[roles,setRoles]=useState<Record<string,string>>({}),[query,setQuery]=useState(''),[status,setStatus]=useState('Vérification des droits…'),[busy,setBusy]=useState(''),[emails,setEmails]=useState<Record<string,string>>({}),[blockedEmails,setBlockedEmails]=useState<{email:string;reason:string;created_at:string}[]>([]),[emailInput,setEmailInput]=useState(''),[emailReason,setEmailReason]=useState('')

 async function load(adminMode:boolean){
  const {data,error}=await supabase.from('reports').select('*').order('created_at',{ascending:false}).limit(200)
  if(error)setStatus('Lecture des signalements impossible : '+error.message);else setReports((data||[]) as Report[])
  if(adminMode){
   const p=await supabase.from('profiles').select('id,display_name,username,age,created_at').order('created_at',{ascending:false}).limit(500)
   const s=await supabase.from('account_suspensions').select('user_id')
   if(p.error)setStatus('Lecture des comptes impossible : '+p.error.message);else setAccounts((p.data||[]) as Profile[])
   if(s.error)setStatus('Lecture des suspensions impossible : '+s.error.message);else setSuspended((s.data||[]).map((x:any)=>x.user_id))

   const {data:{session}}=await supabase.auth.getSession()
   if(!session?.access_token){setStatus('Session expirée. Reconnecte-toi.');return}
   const response=await fetch('/api/admin/roles',{headers:{Authorization:'Bearer '+session.access_token}})
   const payload=await response.json().catch(()=>null)
   if(!response.ok||!Array.isArray(payload?.roles)){
    setStatus('Lecture des rôles impossible : '+(payload?.error||'erreur serveur'))
   }else{
    setRoles(Object.fromEntries((payload.roles as RoleRow[]).map(item=>[item.user_id,item.role])))
   }
   const emailResponse=await fetch('/api/admin/email-controls',{headers:{Authorization:'Bearer '+session.access_token}})
   const emailPayload=await emailResponse.json().catch(()=>null)
   if(emailResponse.ok){setEmails(emailPayload.emails||{});setBlockedEmails(emailPayload.blocked||[])}else{setStatus('Lecture des adresses e-mail impossible : '+(emailPayload?.error||'erreur serveur'))}
  }
 }

 useEffect(()=>{(async()=>{
  const {data:{user}}=await supabase.auth.getUser()
  if(!user){location.href='/auth';return}
  const {data:role,error}=await supabase.from('user_roles').select('role').eq('user_id',user.id).maybeSingle()
  if(error||!role||!['admin','moderator'].includes(role.role)){setStatus('Accès réservé à l’équipe de modération.');return}
  const adminMode=role.role==='admin'
  setIsAdmin(adminMode);setAllowed(true);await load(adminMode)
 })()},[])

 async function change(id:string,next:string){
  const {error}=await supabase.from('reports').update({status:next}).eq('id',id)
  if(error)setStatus('Modification impossible : '+error.message);else load(isAdmin)
 }

 async function toggleModerator(person:Profile){
  const currentRole=roles[person.id]||'member'
  const nextRole=currentRole==='moderator'?'member':'moderator'
  const action=nextRole==='moderator'?'nommer cette personne modératrice':'retirer son rôle de modérateur'
  if(!window.confirm('Confirmer : '+action+' ?'))return
  setBusy(person.id)
  const {data:{session}}=await supabase.auth.getSession()
  if(!session?.access_token){setStatus('Session expirée. Reconnecte-toi.');setBusy('');return}
  const response=await fetch('/api/admin/roles',{
   method:'POST',
   headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},
   body:JSON.stringify({user_id:person.id,role:nextRole})
  })
  const payload=await response.json().catch(()=>null)
  if(!response.ok){
   setStatus('Modification du rôle impossible : '+(payload?.error||'erreur serveur'))
  }else{
   setRoles(v=>({...v,[person.id]:nextRole}))
   setStatus(nextRole==='moderator'?'Rôle de modérateur attribué.':'Rôle de modérateur retiré.')
  }
  setBusy('')
 }

 async function toggleEmailBlock(email:string,blocked:boolean){
  if(!window.confirm(blocked?'Interdire cette adresse e-mail et bloquer les comptes déjà associés ?':'Autoriser à nouveau cette adresse e-mail pour les prochaines inscriptions ?'))return
  setBusy(email)
  const {data:{session}}=await supabase.auth.getSession()
  if(!session?.access_token){setStatus('Session expirée. Reconnecte-toi.');setBusy('');return}
  const response=await fetch('/api/admin/email-controls',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({email,blocked,reason:emailReason})})
  const payload=await response.json().catch(()=>null)
  if(!response.ok){setStatus('Action impossible : '+(payload?.error||'erreur serveur'))}
  else{setStatus(blocked?'Adresse interdite. '+(payload.affected_accounts||0)+' compte(s) déjà associé(s) ont été bloqués.':'Adresse autorisée pour les nouvelles inscriptions. Les suspensions déjà posées restent actives.');setEmailInput('');setEmailReason('');const refresh=await fetch('/api/admin/email-controls',{headers:{Authorization:'Bearer '+session.access_token}});const data=await refresh.json().catch(()=>null);if(refresh.ok)setBlockedEmails(data.blocked||[])}
  setBusy('')
 }

 async function toggleSuspension(person:Profile){
  const blocked=suspended.includes(person.id)
  if(blocked&&!window.confirm('Réactiver ce compte ?'))return
  if(!blocked&&!window.confirm('Suspendre ce compte ? La personne sera déconnectée et ne pourra plus se connecter tant que la restriction sera active.'))return
  setBusy(person.id)
  const {data:{session}}=await supabase.auth.getSession()
  if(!session?.access_token){setStatus('Session expirée. Reconnecte-toi.');setBusy('');return}
  const response=await fetch('/api/admin/suspensions',{
   method:'POST',
   headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},
   body:JSON.stringify({user_id:person.id,suspended:!blocked})
  })
  const payload=await response.json().catch(()=>null)
  if(!response.ok){
   setStatus('Action impossible : '+(payload?.error||'erreur serveur'))
  }else{
   setSuspended(v=>blocked?v.filter(x=>x!==person.id):[...v,person.id])
   setStatus(blocked?'Compte réactivé.':'Compte suspendu et connexion bloquée.')
  }
  setBusy('')
 }

 const filtered=useMemo(()=>accounts.filter(p=>(p.username||'').toLowerCase().includes(query.toLowerCase())||(p.display_name||'').toLowerCase().includes(query.toLowerCase())||(emails[p.id]||'').toLowerCase().includes(query.toLowerCase())),[accounts,query,emails])
 return <main className="app-shell"><header className="app-header"><Link className="brand" href="/">weshbien2<span>.</span></Link><nav><Link href="/feed">Fil</Link><Link href="/explore">Découvrir</Link><Link href="/profile">Mon profil</Link><Link href="/inbox">Messages</Link><Link href="/notifications">Notifications</Link><Link href="/moderation">Contrôle IA</Link></nav></header><section className="directory"><small>SÉCURITÉ DE LA COMMUNAUTÉ</small><h1>Administration</h1><p>{status}</p>{allowed&&<><div className="card profile-form"><h2>Signalements ({reports.length})</h2>{reports.length?reports.map(r=><article className="report-row" key={r.id}><b>{r.content_type==='profile'?'Profil':r.content_type==='post'?'Publication':'Message'}</b><span>{r.reason}</span><small>Cible : {r.content_id} · {new Date(r.created_at).toLocaleString('fr-FR')}</small><small>Statut : {r.status}</small><div className="report-actions"><button onClick={()=>change(r.id,'reviewing')}>En cours</button><button onClick={()=>change(r.id,'resolved')}>Résolu</button><button onClick={()=>change(r.id,'dismissed')}>Ignorer</button></div></article>):<p>Aucun signalement pour le moment.</p>}</div>{isAdmin&&<div className="card profile-form admin-accounts"><h2>Tous les comptes ({accounts.length})</h2><p>Recherche les profils, consulte les adresses e-mail et gère les rôles, suspensions et interdictions d’adresse.</p><div className="email-block-form"><h3>Interdire une adresse e-mail</h3><input type="email" value={emailInput} onChange={e=>setEmailInput(e.target.value)} placeholder="adresse@exemple.com"/><input value={emailReason} onChange={e=>setEmailReason(e.target.value)} placeholder="Motif (facultatif)"/><button className="danger-action" disabled={!emailInput.trim()||busy===emailInput} onClick={()=>toggleEmailBlock(emailInput.trim().toLowerCase(),true)}>Interdire cette adresse</button><small>Une adresse interdite ne pourra plus être utilisée pour créer ou modifier un compte. Les comptes existants associés sont également bloqués.</small></div><div className="email-block-list"><h3>Adresses interdites ({blockedEmails.length})</h3>{blockedEmails.length?blockedEmails.map(item=><div className="email-block-row" key={item.email}><span><b>{item.email}</b><small>{item.reason}</small></span><button disabled={busy===item.email} onClick={()=>toggleEmailBlock(item.email,false)}>Autoriser</button></div>):<p>Aucune adresse interdite.</p>}</div><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher un pseudo ou un nom…"/>{filtered.length?filtered.map(p=><article className="admin-account-row" key={p.id}><div><b>{p.display_name||p.username||'Membre'}</b><small>@{p.username||'sans pseudo'} · {p.age?p.age+' ans':'âge non renseigné'}</small><small>Adresse e-mail : {emails[p.id]||'Aucune adresse associée'}</small><small>Inscrit le {p.created_at?new Date(p.created_at).toLocaleDateString('fr-FR'):'date inconnue'}</small><small>Rôle : {roles[p.id]==='admin'?'Administrateur':roles[p.id]==='moderator'?'Modérateur':'Membre'}</small></div><div className="admin-account-actions"><Link href={'/profile?id='+p.id}>Voir profil</Link>{roles[p.id]!=='admin'&&<button disabled={busy===p.id} onClick={()=>toggleModerator(p)}>{busy===p.id?'…':roles[p.id]==='moderator'?'Retirer modérateur':'Nommer modérateur'}</button>}<button className={suspended.includes(p.id)?'friend-secondary':'danger-action'} disabled={busy===p.id} onClick={()=>toggleSuspension(p)}>{busy===p.id?'…':suspended.includes(p.id)?'Réactiver':'Suspendre'}</button></div></article>):<p>Aucun compte trouvé.</p>}</div>}</>}</section></main>
}
