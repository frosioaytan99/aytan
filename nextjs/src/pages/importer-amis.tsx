import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabaseClient'

type Match = { id: string; username: string | null; display_name: string | null; avatar_url?: string | null }

export default function ImportAmisPage() {
  const [raw, setRaw] = useState('')
  const [matches, setMatches] = useState<Match[]>([])
  const [notFound, setNotFound] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function searchFriends(e: any) {
    e.preventDefault()
    if (busy) return
    const names = Array.from(new Set(raw.split(/[\n,;\t ]+/).map(x => x.trim().replace(/^@+/, '').toLowerCase()).filter(x => /^[a-z0-9_]{3,20}$/.test(x))))
    if (!names.length) { setMessage('Colle les pseudos de tes amis, séparés par des espaces ou des retours à la ligne.'); return }
    if (names.length > 500) { setMessage('Limite de 500 pseudos par recherche. Fais plusieurs lots.'); return }
    setBusy(true); setMessage('Recherche des membres publics sur Weshbien2…'); setMatches([]); setNotFound([])
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) { window.location.href = '/auth'; return }
    const found: Match[] = []
    for (let i = 0; i < names.length; i += 100) {
      const batch = names.slice(i, i + 100)
      const { data, error } = await supabase.from('profiles').select('id,username,display_name,avatar_url').in('username', batch).eq('is_private', false)
      if (error) { setMessage('Recherche impossible : ' + error.message); setBusy(false); return }
      found.push(...((data || []) as Match[]))
    }
    const foundNames = new Set(found.map(p => (p.username || '').toLowerCase()))
    setMatches(found)
    setNotFound(names.filter(n => !foundNames.has(n)))
    setMessage(found.length + ' membre(s) retrouvé(s) sur ' + names.length + ' pseudo(s). Aucun lien d’amitié n’a été modifié.')
    setBusy(false)
  }

  return <main className="app-shell">
    <header className="app-header"><Link className="brand" href="/">weshbien2<span>.</span></Link><nav><Link href="/feed">Fil</Link><Link href="/explore">Découvrir</Link><Link href="/profile">Mon profil</Link></nav></header>
    <section className="directory" style={{ maxWidth: 850, margin: '0 auto' }}>
      <small>ANCIENS MEMBRES</small>
      <h1>Retrouver mes amis de Weshbien.com</h1>
      <p>Colle ici les pseudos de tes anciens amis, séparés par des espaces, des virgules ou un retour à la ligne. Tu peux faire plusieurs lots de 500 pseudos maximum.</p>
      <form onSubmit={searchFriends} className="card" style={{ padding: 18 }}>
        <label htmlFor="old-friends-list">Liste des pseudos</label>
        <textarea id="old-friends-list" value={raw} onChange={e => setRaw(e.target.value)} rows={8} placeholder={'exemple\nOriana66\nCharli012\neremrem'} style={{ width: '100%', marginTop: 10, padding: 12, borderRadius: 12 }} />
        <button type="submit" disabled={busy} style={{ marginTop: 12 }}>{busy ? 'Recherche…' : 'Rechercher mes amis'}</button>
      </form>
      {message && <p role="status" className="notice">{message}</p>}
      {matches.length > 0 && <><h2>Membres retrouvés</h2><div className="member-grid">{matches.map(p => <article className="card member-card" key={p.id}><h3>{p.display_name || p.username || 'Membre'}</h3><small>@{p.username}</small><p><Link href={'/profile?id=' + p.id}>Voir le profil →</Link></p></article>)}</div></>}
      {notFound.length > 0 && <section className="card" style={{ padding: 16, marginTop: 20 }}><h2>Pseudos non retrouvés ({notFound.length})</h2><p>Ces personnes n’ont peut-être pas encore rejoint Weshbien2, utilisent un autre pseudo ou ont un profil privé.</p><p style={{ overflowWrap: 'anywhere' }}>{notFound.join(', ')}</p></section>}
      <section className="card" style={{ padding: 16, marginTop: 20 }}><strong>Important</strong><p>Cet outil recherche uniquement les profils publics déjà présents sur Weshbien2. Il ne copie pas les comptes ni les données privées de Weshbien.com et ne crée pas automatiquement d’amitiés. Les anciens membres devront rejoindre Weshbien2 et accepter les demandes d’amitié.</p></section>
      <p><Link href="/retour-weshbien">← Retour à la page des anciens membres</Link></p>
    </section>
  </main>
}
