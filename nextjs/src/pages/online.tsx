import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabaseClient'

type Member = { id:string; username:string|null; display_name:string|null; avatar_url:string|null; bio:string|null; last_seen_at:string|null }
export default function OnlinePage() {
  const [members,setMembers] = useState<Member[]>([])
  const [loading,setLoading] = useState(true)
  const [error,setError] = useState('')
  const load = useCallback(async () => {
    const { data:{user} } = await supabase.auth.getUser()
    if (!user) { window.location.href='/auth'; return }
    const cutoff = new Date(Date.now()-5*60*1000).toISOString()
    const { data,error } = await supabase.from('profiles')
      .select('id,username,display_name,avatar_url,bio,last_seen_at')
      .neq('id',user.id).eq('is_private',false).gte('last_seen_at',cutoff)
      .order('last_seen_at',{ascending:false}).limit(100)
    if (error) setError("Impossible de charger les membres en ligne : "+error.message)
    else { setMembers(data||[]); setError('') }
    setLoading(false)
  },[])
  useEffect(()=>{
    load()
    const timer=setInterval(load,30000)
    return ()=>clearInterval(timer)
  },[load])
  return <main className="app-shell">
    <header className="app-header"><Link className="brand" href="/feed">weshbien2<span>.</span></Link><nav><Link href="/feed">Fil</Link><Link href="/explore">Découvrir</Link><Link className="active" href="/online">En ligne</Link><Link href="/inbox">Messages</Link></nav></header>
    <section className="directory">
      <small>LA COMMUNAUTÉ EN DIRECT</small>
      <h1><span style={{display:'inline-block',width:10,height:10,borderRadius:20,background:'#22c55e',marginRight:10}}/>Membres en ligne</h1>
      <p>Les membres affichés ont été actifs au cours des 5 dernières minutes. La liste s’actualise automatiquement.</p>
      {error&&<p className="notice">{error}</p>}
      {loading?<div className="card empty">Chargement des membres…</div>:members.length===0?<div className="card empty">Personne n’est actuellement affiché en ligne. Reviens dans quelques instants !</div>:
      <div className="member-grid">{members.map(member=><article className="card member-card" key={member.id}>
        <div style={{position:'relative',width:76,height:76,margin:'0 auto 12px'}}>
          {member.avatar_url?<img src={member.avatar_url} alt="" style={{width:76,height:76,borderRadius:'50%',objectFit:'cover'}}/>:<div className="avatar large">{(member.display_name||member.username||'W').slice(0,1).toUpperCase()}</div>}
          <span title="En ligne" style={{position:'absolute',right:2,bottom:3,width:15,height:15,borderRadius:'50%',background:'#22c55e',border:'3px solid white'}}/>
        </div>
        <h3>{member.display_name||member.username||'Membre'}</h3><small>@{member.username||'membre'}</small>
        <p>{member.bio||'Membre de la communauté.'}</p>
        <Link href={'/profile?id='+member.id}>Voir le profil →</Link>
      </article>)}</div>}
      <button type="button" onClick={load} style={{marginTop:18}}>Actualiser</button>
    </section>
  </main>
}