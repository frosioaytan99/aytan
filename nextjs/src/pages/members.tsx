import { useEffect,useState } from 'react'
import Link from 'next/link'
import SiteLayout from '../components/SiteLayout'
import { supabase } from '../lib/supabaseClient'
type Member={id:string;username:string|null;display_name:string|null;bio:string|null;avatar_url:string|null}
export default function MembersPage(){
 const [members,setMembers]=useState<Member[]>([]);const [query,setQuery]=useState('');const [status,setStatus]=useState('')
 useEffect(()=>{supabase.from('profiles').select('id,username,display_name,bio,avatar_url').order('created_at',{ascending:false}).limit(60).then(({data,error})=>{if(error)setStatus('La liste des membres sera disponible après installation du schéma communautaire.');else setMembers((data||[]) as Member[])})},[])
 const filtered=members.filter(m=>(m.username||'').toLowerCase().includes(query.toLowerCase())||(m.display_name||'').toLowerCase().includes(query.toLowerCase()))
 return <SiteLayout title="Découvrir les membres"><div className="card-surface search-panel"><label htmlFor="member-search">Trouver un membre</label><input id="member-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher un pseudo ou un prénom…"/></div>
 {status&&<p className="form-status">{status}</p>}<div className="member-grid">{filtered.map(m=><article className="member-card card-surface" key={m.id}><div className="avatar member-avatar">{m.avatar_url?<img src={m.avatar_url} alt="Photo de profil"/>:(m.display_name||m.username||'A').slice(0,1).toUpperCase()}</div><h2>{m.display_name||m.username||'Membre Aytan'}</h2><p className="member-handle">@{m.username||'membre'}</p><p>{m.bio||'Membre de la communauté Aytan.'}</p><Link className="btn btn-plain" href={'/profile?id='+m.id}>Voir le profil</Link></article>)}</div>{!status&&filtered.length===0&&<div className="empty-state card-surface"><h2>Aucun membre trouvé</h2><p>Essaie un autre pseudo ou reviens un peu plus tard.</p></div>}</SiteLayout>
}
