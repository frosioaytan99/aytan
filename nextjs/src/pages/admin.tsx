import {useEffect,useMemo,useState} from 'react'
import Link from 'next/link'
import {supabase} from '../lib/supabaseClient'

type Profile={id:string;display_name:string|null;username:string|null;age:number|null;created_at:string|null}
type Report={id:string;reporter_id:string;content_type:string;content_id:string;reason:string;status:string;created_at:string;target_user_id?:string|null;reporter_profile?:{id:string;display_name:string|null;username:string|null;avatar_url:string|null}|null;target_profile?:{id:string;display_name:string|null;username:string|null;avatar_url:string|null}|null}
type RoleRow={user_id:string;role:'admin'|'moderator'|'member'}

function AISettingsPanel(){
 const [enabled,setEnabled]=useState(true)
 const [maxTokens,setMaxTokens]=useState(700)
 const [keyConfigured,setKeyConfigured]=useState(false)
 const [status,setStatus]=useState('Chargement des réglages IA…')
 const [busy,setBusy]=useState(false)
 useEffect(()=>{(async()=>{
  const {data:{session}}=await supabase.auth.getSession()
  if(!session?.access_token){setStatus('Session expirée. Reconnecte-toi.');return}
  const response=await fetch('/api/admin/ai-assistant-settings',{headers:{Authorization:'Bearer '+session.access_token},cache:'no-store'})
  const payload=await response.json().catch(()=>null)
  if(!response.ok){setStatus('Chargement impossible : '+(payload?.error||'erreur serveur'));return}
  setEnabled(payload.settings.enabled)
  setMaxTokens(payload.settings.max_tokens)
  setKeyConfigured(payload.api_key_configured===true)
  setStatus('Réglages chargés.')
 })()},[])
 async function save(next:{enabled:boolean;max_tokens:number}){
  setBusy(true);setStatus('Enregistrement…')
  const {data:{session}}=await supabase.auth.getSession()
  if(!session?.access_token){setStatus('Session expirée. Reconnecte-toi.');setBusy(false);return}
  const response=await fetch('/api/admin/ai-assistant-settings',{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify(next)})
  const payload=await response.json().catch(()=>null)
  if(!response.ok){setStatus('Enregistrement impossible : '+(payload?.error||'erreur serveur'))}
  else{setEnabled(payload.settings.enabled);setMaxTokens(payload.settings.max_tokens);setKeyConfigured(payload.api_key_configured===true);setStatus('Réglages de Weshbien IA enregistrés.')}
  setBusy(false)
 }
 return <div className="card profile-form"><h2>Réglages de Weshbien IA</h2><p>Configure l’aide IA directement depuis l’administration du site.</p><p><b>Clé OpenAI :</b> {keyConfigured?'Détectée sur Vercel':'Absente sur Vercel'} <small>(sa validité et son solde ne sont pas vérifiés ici)</small></p><button disabled={busy} onClick={()=>save({enabled:!enabled,max_tokens:maxTokens})}>{enabled?'Désactiver l’aide IA':'Activer l’aide IA'}</button><label style={{display:'grid',gap:6,marginTop:14,maxWidth:320}}>Longueur des réponses<select value={maxTokens} disabled={busy} onChange={e=>save({enabled,max_tokens:Number(e.target.value)})}><option value={400}>Courtes</option><option value={700}>Normales</option><option value={1200}>Détaillées</option></select></label><small>{status}</small><p><Link href="/moderation">Ouvrir le contrôle complet de la modération IA</Link></p></div>
}

export default function AdminPage(){
 const [allowed,setAllowed]=useState(false),[isAdmin,setIsAdmin]=useState(false),[isEmailOwner,setIsEmailOwner]=useState(false),[reports,setReports]=useState<Report[]>([]),[accounts,setAccounts]=useState<Profile[]>([]),[suspended,setSuspended]=useState<string[]>([]),[suspensionReasons,setSuspensionReasons]=useState<Record<string,string>>({}),[roles,setRoles]=useState<Record<string,string>>({}),[query,setQuery]=useState(''),[status,setStatus]=useState('Vérification des droits…'),[busy,setBusy]=useState(''),[emails,setEmails]=useState<Record<string,string>>({}),[blockedEmails,setBlockedEmails]=useState<{email:string;reason:string;created_at:string}[]>([]),[emailInput,setEmailInput]=useState(''),[emailReason,setEmailReason]=useState(''),[photoBypass,setPhotoBypass]=useState<string[]>([])

 async function load(adminMode:boolean){
  const {data:{session}}=await supabase.auth.getSession()
  if(!session?.access_token){setStatus('Session expirée. Reconnecte-toi.');return}
  const reportsResponse=await fetch('/api/admin/reports',{headers:{Authorization:'Bearer '+session.access_token},cache:'no-store'})
  const reportsPayload=await reportsResponse.json().catch(()=>null)
  if(!reportsResponse.ok)setStatus('Lecture des signalements impossible : '+(reportsPayload?.error||'erreur serveur'))
  else setReports(Array.isArray(reportsPayload?.reports)?reportsPayload.reports as Report[]:[])
  if(adminMode){
   const p=await supabase.from('profiles').select('id,display_name,username,age,created_at').order('created_at',{ascending:false}).limit(500)
   const s=await supabase.from('account_suspensions').select('user_id,reason')
   if(p.error)setStatus('Lecture des comptes impossible : '+p.error.message);else setAccounts((p.data||[]) as Profile[])
   if(s.error)setStatus('Lecture des suspensions impossible : '+s.error.message);else {setSuspended((s.data||[]).map((x:any)=>x.user_id));setSuspensionReasons(Object.fromEntries((s.data||[]).map((x:any)=>[x.user_id,x.reason])))}

   const {data:{session}}=await supabase.auth.getSession()
   if(!session?.access_token){setStatus('Session expirée. Reconnecte-toi.');return}
   const legacyMigration=await fetch('/api/admin/suspensions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({migrate_legacy_bans:true})})
   if(!legacyMigration.ok)setStatus('Migration des anciennes suspensions impossible. Les comptes déjà bannis peuvent encore voir le message générique de connexion.')
   const response=await fetch('/api/admin/roles',{headers:{Authorization:'Bearer '+session.access_token}})
   const payload=await response.json().catch(()=>null)
   if(!response.ok||!Array.isArray(payload?.roles)){
    setStatus('Lecture des rôles impossible : '+(payload?.error||'erreur serveur'))
   }else{
    setRoles(Object.fromEntries((payload.roles as RoleRow[]).map(item=>[item.user_id,item.role])))
   }
      const bypassResponse=await fetch('/api/admin/photo-moderation-bypass',{headers:{Authorization:'Bearer '+session.access_token},cache:'no-store'})
   const bypassPayload=await bypassResponse.json().catch(()=>null)
   if(bypassResponse.ok&&Array.isArray(bypassPayload?.users))setPhotoBypass(bypassPayload.users.map((item:any)=>item.user_id))
   else setStatus('Lecture des autorisations photo impossible : '+(bypassPayload?.error||'erreur serveur'))
if(session.user.id==='928fbdab-d471-4bfd-a98e-21d05f86a825'){
    const emailResponse=await fetch('/api/admin/email-controls',{headers:{Authorization:'Bearer '+session.access_token}})
    const emailPayload=await emailResponse.json().catch(()=>null)
    if(emailResponse.ok){setEmails(emailPayload.emails||{});setBlockedEmails(emailPayload.blocked||[])}else{setStatus('Lecture des adresses e-mail impossible : '+(emailPayload?.error||'erreur serveur'))}
   }
  }
 }

 useEffect(()=>{(async()=>{
  const {data:{user}}=await supabase.auth.getUser()
  if(!user){location.href='/auth';return}
  setIsEmailOwner(user.id==='928fbdab-d471-4bfd-a98e-21d05f86a825')
  const {data:role,error}=await supabase.from('user_roles').select('role').eq('user_id',user.id).maybeSingle()
  if(error||!role||!['admin','moderator'].includes(role.role)){setStatus('Accès réservé à l’équipe de modération.');return}
  const adminMode=role.role==='admin'
  setIsAdmin(adminMode);setAllowed(true);await load(adminMode)
 })()},[])

 async function change(id:string,next:string){
  const {error}=await supabase.from('reports').update({status:next}).eq('id',id)
  if(error)setStatus('Modification impossible : '+error.message)
  else{
   setReports(current=>current.map(report=>report.id===id?{...report,status:next}:report))
   setStatus(next==='reviewing'?'Signalement pris en charge. Il reste visible dans la liste.':next==='dismissed'?'Signalement ignoré.':'Signalement marqué comme résolu.')
  }
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

 async function togglePhotoBypass(person:Profile){
  const enabled=!photoBypass.includes(person.id)
  if(!window.confirm(enabled?'Autoriser ce membre à envoyer des photos sans blocage automatique de l’IA ? Les photos resteront enregistrées pour contrôle des modérateurs.':'Retirer cette autorisation de contournement ?'))return
  setBusy(person.id)
  const {data:{session}}=await supabase.auth.getSession()
  if(!session?.access_token){setStatus('Session expirée. Reconnecte-toi.');setBusy('');return}
  const response=await fetch('/api/admin/photo-moderation-bypass',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({user_id:person.id,enabled})})
  const payload=await response.json().catch(()=>null)
  if(!response.ok)setStatus('Modification impossible : '+(payload?.error||'erreur serveur'))
  else{setPhotoBypass(current=>enabled?[...current,person.id]:current.filter(id=>id!==person.id));setStatus(enabled?'Autorisation de contournement activée. Les photos restent journalisées.':'Autorisation de contournement retirée.')}
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
  const reason=blocked?'':(window.prompt('Indique la raison de la suspension (elle sera affichée à la prochaine connexion) :')||'').trim()
  if(!blocked&&reason.length<3){setStatus('Suspension annulée : indique une raison d’au moins 3 caractères.');return}
  if(blocked&&!window.confirm('Réactiver ce compte ?'))return
  setBusy(person.id)
  const {data:{session}}=await supabase.auth.getSession()
  if(!session?.access_token){setStatus('Session expirée. Reconnecte-toi.');setBusy('');return}
  const response=await fetch('/api/admin/suspensions',{
   method:'POST',
   headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},
   body:JSON.stringify({user_id:person.id,suspended:!blocked,reason})
  })
  const payload=await response.json().catch(()=>null)
  if(!response.ok){
   setStatus('Action impossible : '+(payload?.error||'erreur serveur'))
  }else{
   setSuspended(v=>blocked?v.filter(x=>x!==person.id):[...v,person.id])
   setSuspensionReasons(v=>{const next={...v};if(blocked)delete next[person.id];else next[person.id]=reason;return next})
   setStatus(blocked?'Compte réactivé.':'Compte suspendu. La raison sera affichée après une connexion avec ses identifiants.')
  }
  setBusy('')
 }

 const pendingReports=reports.filter(r=>!['resolved','dismissed'].includes(r.status))
 const filtered=useMemo(()=>accounts.filter(p=>(p.username||'').toLowerCase().includes(query.toLowerCase())||(p.display_name||'').toLowerCase().includes(query.toLowerCase())||(emails[p.id]||'').toLowerCase().includes(query.toLowerCase())),[accounts,query,emails])
 return <main className="app-shell"><header className="app-header"><Link className="brand" href="/">weshbien2<span>.</span></Link><nav><Link href="/feed">Fil</Link><Link href="/explore">Découvrir</Link><Link href="/profile">Mon profil</Link><Link href="/inbox">Messages</Link><Link href="/notifications">Notifications</Link><Link href="/moderation">Contrôle IA</Link></nav></header><section className="directory"><small>SÉCURITÉ DE LA COMMUNAUTÉ</small><h1>Administration</h1>{isAdmin&&<AISettingsPanel/>}<p>{status}</p>{allowed&&<><div className="card profile-form"><h2>Signalements à traiter ({pendingReports.length})</h2>{pendingReports.length?pendingReports.map(r=><article className="report-row" key={r.id}><b>{r.content_type==='profile'?'Profil':r.content_type==='post'?'Publication':r.content_type==='photo'?'Photo': 'Message'}</b><span>{r.reason}</span><small>{new Date(r.created_at).toLocaleString('fr-FR')}</small><div className="report-identity"><b>Signalé par :</b> {r.reporter_profile?.display_name||r.reporter_profile?.username||'Profil introuvable'} {r.reporter_profile?.username&&<small>@{r.reporter_profile.username}</small>} <Link href={'/profile?id='+r.reporter_id}>Voir le profil</Link></div><div className="report-identity"><b>Compte signalé :</b> {r.target_profile?.display_name||r.target_profile?.username||(r.target_user_id?'Profil introuvable':'Auteur non identifié pour ce type de contenu')} {r.target_profile?.username&&<small>@{r.target_profile.username}</small>} {r.target_user_id&&<Link href={'/profile?id='+r.target_user_id}>Voir le profil</Link>}</div>{r.content_type==='post'&&<small>Publication signalée : {r.content_id}</small>}{r.content_type==='photo'&&<p><Link href="/photos">📸 Ouvrir la galerie pour examiner et supprimer la photo</Link></p>}<small>Statut : {r.status==='reviewing'?'En cours':r.status==='resolved'?'Résolu':r.status==='dismissed'?'Ignoré':'Nouveau'}</small><div className="report-actions"><button onClick={()=>change(r.id,'reviewing')}>En cours</button><button onClick={()=>change(r.id,'resolved')}>Résolu</button><button onClick={()=>change(r.id,'dismissed')}>Ignorer</button></div></article>):<p>Aucun signalement pour le moment.</p>}</div>{isAdmin&&<div className="card profile-form admin-accounts"><h2>Tous les comptes ({accounts.length})</h2><p>Recherche les profils et gère les rôles et suspensions.</p>{isEmailOwner&&<><p>Tu es le seul compte autorisé à consulter les adresses e-mail et à gérer les interdictions d’adresse.</p><div className="email-block-form"><h3>Interdire une adresse e-mail</h3><input type="email" value={emailInput} onChange={e=>setEmailInput(e.target.value)} placeholder="adresse@exemple.com"/><input value={emailReason} onChange={e=>setEmailReason(e.target.value)} placeholder="Motif (facultatif)"/><button className="danger-action" disabled={!emailInput.trim()||busy===emailInput} onClick={()=>toggleEmailBlock(emailInput.trim().toLowerCase(),true)}>Interdire cette adresse</button><small>Une adresse interdite ne pourra plus être utilisée pour créer ou modifier un compte. Les comptes existants associés sont également bloqués.</small></div><div className="email-block-list"><h3>Adresses interdites ({blockedEmails.length})</h3>{blockedEmails.length?blockedEmails.map(item=><div className="email-block-row" key={item.email}><span><b>{item.email}</b><small>{item.reason}</small></span><button disabled={busy===item.email} onClick={()=>toggleEmailBlock(item.email,false)}>Autoriser</button></div>):<p>Aucune adresse interdite.</p>}</div></>}<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher un pseudo ou un nom…"/>{filtered.length?filtered.map(p=><article className="admin-account-row" key={p.id}><div><b>{p.display_name||p.username||'Membre'}</b><small>@{p.username||'sans pseudo'} · {p.age?p.age+' ans':'âge non renseigné'}</small>{isEmailOwner&&<small>Adresse e-mail : {emails[p.id]||'Aucune adresse associée'}</small>}<small>Inscrit le {p.created_at?new Date(p.created_at).toLocaleDateString('fr-FR'):'date inconnue'}</small>{suspended.includes(p.id)&&<small>Motif de suspension : {suspensionReasons[p.id]||'Non précisé'}</small>}</div><div className="admin-account-actions"><span className={'admin-role-badge '+(roles[p.id]==='admin'?'admin':roles[p.id]==='moderator'?'moderator':'member')}>{roles[p.id]==='admin'?'Administrateur':roles[p.id]==='moderator'?'Modérateur':'Membre'}</span><Link href={'/profile?id='+p.id}>Voir profil</Link><button disabled={busy===p.id||roles[p.id]==='admin'} onClick={()=>togglePhotoBypass(p)}>{busy===p.id?'…':photoBypass.includes(p.id)?'Retirer bypass photo':'Autoriser bypass photo'}</button>{roles[p.id]!=='admin'&&<button disabled={busy===p.id} onClick={()=>toggleModerator(p)}>{busy===p.id?'…':roles[p.id]==='moderator'?'Retirer modérateur':'Nommer modérateur'}</button>}<button className={suspended.includes(p.id)?'friend-secondary':'danger-action'} disabled={busy===p.id} onClick={()=>toggleSuspension(p)}>{busy===p.id?'…':suspended.includes(p.id)?'Réactiver':'Suspendre'}</button></div></article>):<p>Aucun compte trouvé.</p>}</div>}</>}</section></main>
}
