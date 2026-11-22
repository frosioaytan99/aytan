import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabaseClient'
import MemberAvatar from '../components/MemberAvatar'

type Member = { id:string; username:string|null; display_name:string|null; avatar_url:string|null; bio:string|null; city:string|null; interests:string|null; last_seen_at:string|null }
type RequestRow = { id:string; sender_id:string; recipient_id:string; status:string }

export default function MeetMePage(){
  const [uid,setUid]=useState('')
  const [members,setMembers]=useState<Member[]>([])
  const [requests,setRequests]=useState<RequestRow[]>([])
  const [term,setTerm]=useState('')
  const [activeOnly,setActiveOnly]=useState(false)
  const [scope,setScope]=useState('all')
  const [loading,setLoading]=useState(true)
  const [refreshing,setRefreshing]=useState(false)
  const [busy,setBusy]=useState('')
  const [status,setStatus]=useState('')

  const load=useCallback(async()=>{
    setRefreshing(true)
    try{
      const {data:{user}}=await supabase.auth.getUser()
      if(!user){window.location.href='/auth';return}
      setUid(user.id)
      const [people,friendRows]=await Promise.all([
        supabase.from('profiles').select('id,username,display_name,avatar_url,bio,city,interests,last_seen_at').neq('id',user.id).eq('is_private',false).order('last_seen_at',{ascending:false,nullsFirst:false}).limit(150),
        supabase.from('friend_requests').select('id,sender_id,recipient_id,status').or('sender_id.eq.'+user.id+',recipient_id.eq.'+user.id)
      ])
      if(people.error)throw people.error
      if(friendRows.error)throw friendRows.error
      setMembers((people.data||[]) as Member[])
      setRequests((friendRows.data||[]) as RequestRow[])
      setStatus('')
    }catch(e:any){setStatus('Impossible de charger MeetMe : '+(e?.message||'erreur inconnue'))}
    finally{setLoading(false);setRefreshing(false)}
  },[])

  useEffect(()=>{void load();const timer=setInterval(()=>void load(),60000);return()=>clearInterval(timer)},[load])

  const visible=useMemo(()=>{
    const q=term.trim().toLocaleLowerCase('fr-FR')
    const cutoff=Date.now()-5*60*1000
    return members.filter(p=>{
      const online=!!p.last_seen_at&&new Date(p.last_seen_at).getTime()>=cutoff
      if(activeOnly&&!online)return false
      if(scope==='online'&&!online)return false
      if(scope==='recent'&&(!p.last_seen_at||Date.now()-new Date(p.last_seen_at).getTime()>24*60*60*1000))return false
      return !q||[p.username,p.display_name,p.bio,p.city,p.interests].some(v=>(v||'').toLocaleLowerCase('fr-FR').includes(q))
    }).sort((a,b)=>new Date(b.last_seen_at||0).getTime()-new Date(a.last_seen_at||0).getTime())
  },[members,term,activeOnly,scope])

  async function addFriend(target:string){
    const existing=requests.find(r=>(r.sender_id===uid&&r.recipient_id===target)||(r.sender_id===target&&r.recipient_id===uid))
    if(existing){setStatus(existing.status==='accepted'?'Vous êtes déjà amis.':existing.status==='pending'?(existing.sender_id===uid?'Demande déjà envoyée.':'Cette personne t’a déjà envoyé une demande.'):'Une demande existe déjà.');return}
    setBusy(target);setStatus('')
    const {data,error}=await supabase.from('friend_requests').insert({sender_id:uid,recipient_id:target}).select('id,sender_id,recipient_id,status').single()
    if(error)setStatus('Impossible d’envoyer la demande : '+error.message)
    else{setRequests(v=>[...v,data as RequestRow,...v]);setStatus('Demande d’amitié envoyée.')}
    setBusy('')
  }

  function relation(target:string){
    return requests.find(r=>(r.sender_id===uid&&r.recipient_id===target)||(r.sender_id===target&&r.recipient_id===uid))
  }

  return <main className="app-shell">
    <header className="app-header"><Link className="brand" href="/feed">weshbien2<span>.</span></Link><nav><Link href="/feed">Accueil</Link><Link href="/explore">Explorer</Link><Link className="active" href="/meetme">MeetMe</Link><Link href="/friends">Amis</Link><Link href="/inbox">Messages</Link></nav></header>
    <section className="directory" style={{maxWidth:1050}}>
      <small>FAIS DE NOUVELLES RENCONTRES</small>
      <h1>♡ MeetMe</h1>
      <p>Découvre les membres de Weshbien, consulte leur profil et fais connaissance.</p>
      <form className="search-row" onSubmit={e=>e.preventDefault()}><input value={term} onChange={e=>setTerm(e.target.value)} placeholder="Rechercher un utilisateur…" aria-label="Rechercher un utilisateur"/><button type="button" onClick={()=>void load()} disabled={refreshing}>{refreshing?'Actualisation…':'Actualiser'}</button></form>
      <div className="card" style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap',padding:14,margin:'14px 0 20px'}}>
        <label style={{fontWeight:700}}>Trier :</label>
        <select value={scope} onChange={e=>setScope(e.target.value)} style={{minHeight:42,padding:'0 12px',borderRadius:10,border:'1px solid var(--border,#ddd)',background:'var(--card,#fff)',color:'inherit'}}><option value="all">Tous</option><option value="online">En ligne</option><option value="recent">Actifs récemment</option></select>
        <label style={{display:'inline-flex',gap:8,alignItems:'center',fontWeight:700}}><input type="checkbox" checked={activeOnly} onChange={e=>setActiveOnly(e.target.checked)}/> Actifs seulement</label>
        <span style={{marginLeft:'auto',fontSize:13,opacity:.7}}>{visible.length} profil{visible.length>1?'s':''}</span>
      </div>
      {status&&<p className="notice" role="status">{status}</p>}
      {loading?<div className="card empty">Chargement des profils…</div>:visible.length===0?<div className="card empty"><h3>Aucun profil trouvé</h3><p>Essaie une autre recherche ou désactive le filtre des membres actifs.</p></div>:
      <div className="member-grid">{visible.map(p=>{
        const r=relation(p.id),online=!!p.last_seen_at&&Date.now()-new Date(p.last_seen_at).getTime()<5*60*1000
        return <article className="card member-card" key={p.id} style={{position:'relative'}}>
          <div style={{position:'relative',width:82,margin:'0 auto 12px'}}><MemberAvatar userId={p.id} name={p.display_name||p.username} avatarUrl={p.avatar_url} className="avatar large"/>{online&&<span title="En ligne maintenant" style={{position:'absolute',right:3,bottom:3,width:13,height:13,borderRadius:'50%',background:'#22c55e',border:'2px solid var(--card,#fff)'}}/>}</div>
          <h3>{p.display_name||p.username||'Membre'}</h3><small>@{p.username||'membre'}</small>
          <p>{p.bio||'Membre de la communauté.'}</p>
          {p.city&&<small>📍 {p.city}</small>}
          <div style={{display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap',marginTop:12}}>
            <Link href={'/profile?id='+p.id} style={{padding:'9px 13px',borderRadius:12,textDecoration:'none',fontWeight:700,background:'var(--surface,#f5f3ff)',color:'inherit'}}>Voir le profil</Link>
            {r?.status==='accepted'?<Link href={'/conversation?with='+p.id} style={{padding:'9px 13px',borderRadius:12,textDecoration:'none',fontWeight:700,background:'#6d28d9',color:'#fff'}}>Message</Link>:r?.status==='pending'?<span style={{padding:'9px 10px',fontSize:12,fontWeight:700}}>{r.sender_id===uid?'Demande envoyée':'Demande reçue'}</span>:<button type="button" disabled={busy===p.id} onClick={()=>void addFriend(p.id)} style={{padding:'9px 13px',border:0,borderRadius:12,fontWeight:700,background:'#6d28d9',color:'#fff'}}>{busy===p.id?'Envoi…':'＋ Ajouter'}</button>}
          </div>
        </article>
      })}</div>}
    </section>
  </main>
}
