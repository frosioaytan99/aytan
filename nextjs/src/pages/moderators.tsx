import { useEffect, useState } from 'react'
import Link from 'next/link'
import Head from 'next/head'
import { supabase } from '../lib/supabaseClient'
import MemberAvatar from '../components/MemberAvatar'

type TeamMember = { id: string; display_name: string | null; username: string | null; avatar_url: string | null; role: 'admin' | 'moderator' }

export default function ModerationTeam() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { if (active) { setError('Connecte-toi pour consulter l’équipe.'); setLoading(false) }; return }
      const response = await fetch('/api/moderators', { headers: { Authorization: 'Bearer ' + session.access_token } })
      const result = await response.json().catch(() => ({}))
      if (!active) return
      if (!response.ok) setError('Impossible de charger l’équipe de modération pour le moment.')
      else setMembers(Array.isArray(result.members) ? result.members : [])
      setLoading(false)
    }
    load().catch(() => { if (active) { setError('Impossible de charger l’équipe de modération.'); setLoading(false) } })
    return () => { active = false }
  }, [])
  return <main className="app-shell">
    <Head><title>Équipe de modération — Weshbien2</title><meta name="description" content="Découvre les administrateurs et modérateurs de la communauté Weshbien2." /></Head>
    <header className="app-header"><Link className="brand" href="/feed">weshbien2<span>.</span></Link><nav><Link href="/feed">Fil</Link><Link href="/explore">Découvrir</Link><Link href="/profile">Mon profil</Link></nav></header>
    <section className="profile-wrap">
      <small>LA COMMUNAUTÉ</small>
      <h1>Équipe de modération</h1>
      <p>Voici les personnes qui veillent au bon fonctionnement de Weshbien2.</p>
      {loading ? <div className="card empty">Chargement de l’équipe…</div> : error ? <div className="card empty" role="status">{error}</div> : members.length === 0 ? <div className="card empty">Aucun membre de l’équipe n’est affiché pour le moment.</div> :
        <div className="moderation-team-grid">
          {members.map(member => <Link href={'/profile?id=' + member.id} className="card moderation-team-member" key={member.id}>
            <MemberAvatar userId={member.id} name={member.display_name || member.username || 'Membre'} avatarUrl={member.avatar_url} className="avatar large" />
            <div style={{display:'flex',alignItems:'center',flexWrap:'wrap',columnGap:10,rowGap:4,minWidth:0}}>
              <strong>{member.display_name || member.username || 'Membre'}</strong>
              <span className={'moderation-role-pill ' + member.role} style={{display:'inline-flex',alignItems:'center',whiteSpace:'nowrap',margin:0}}>{member.role === 'admin' ? '🛡️ Administrateur' : '🔧 Modérateur'}</span>
              <p style={{flexBasis:'100%',margin:'2px 0 0'}}>@{member.username || 'membre'}</p>
            </div>
          </Link>)}
        </div>}
    </section>
  </main>
}
