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
  const [selectedFileName, setSelectedFileName] = useState('Aucun fichier choisi')

  async function copyText(value: string, success: string) {
    try {
      await navigator.clipboard.writeText(value)
      setMessage(success)
    } catch {
      setMessage('Copie impossible sur ce navigateur. Tu peux sélectionner le texte manuellement.')
    }
  }

  async function loadCsvFile(e: any) {
    const file = e.target.files?.[0] as File | undefined
    if (!file) return
    setSelectedFileName(file.name)
    if (file.size > 2 * 1024 * 1024) { setMessage('Le fichier est trop volumineux (maximum 2 Mo).'); e.target.value = ''; return }
    try {
      setRaw(await file.text())
      setMessage('Fichier chargé. Vérifie la liste puis appuie sur « Rechercher mes amis ».')
    } catch { setMessage('Impossible de lire ce fichier. Essaie avec un fichier CSV ou TXT.') }
    e.target.value = ''
  }
  function copyInvitation() {
    const invitation = 'Salut ! Je suis sur Weshbien2, le nouveau site pour retrouver la communauté. Rejoins-nous ici : https://weshbien2-production.up.railway.app/auth\nCrée ton propre compte, puis recherche mon pseudo pour me retrouver. Ne partage jamais ton ancien mot de passe.'
    void copyText(invitation, 'Message d’invitation copié. Tu peux l’envoyer à tes anciens amis !')
  }

  async function searchFriends(e: any) {
    e.preventDefault()
    if (busy) return
    const lines = raw.split(/\r?\n/).map(x => x.trim()).filter(Boolean)
    const hasHeader = /^(username|pseudo|identifiant|login)(,|;|$)/i.test(lines[0] || '')
    const sourceLines = hasHeader ? lines.slice(1) : lines
    const values = sourceLines.flatMap(line => line.includes(',') ? [line.split(',')[0].replace(/^"|"$/g, '')] : line.split(/[;\t ]+/))
    const names = Array.from(new Set(values.map(x => x.trim().replace(/^@+/, '').toLowerCase()).filter(x => /^[a-z0-9_]{3,20}$/.test(x))))
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

  const bookmarklet = "javascript:(()=>{const s=document.createElement('script');s.src='https://weshbien2-production.up.railway.app/weshbien-extracteur.js';document.body.appendChild(s)})()"

  return <main className="app-shell">
    <header className="app-header"><Link className="brand" href="/">weshbien2<span>.</span></Link><nav><Link href="/feed">Fil</Link><Link href="/explore">Découvrir</Link><Link href="/profile">Mon profil</Link></nav></header>
    <section className="directory" style={{ maxWidth: 850, margin: '0 auto' }}>
      <small>ANCIENS MEMBRES</small>
      <h1>Retrouver mes amis de Weshbien.com</h1>
      <p>Colle ici les pseudos ou le contenu du CSV exporté depuis Weshbien.com. Tu peux faire plusieurs lots de 500 pseudos maximum.</p>
      <section className="card" style={{ padding: 16, marginBottom: 18 }}>
        <h2>Depuis Facebook : méthode sans extracteur</h2>
        <ol>
          <li>Dans le navigateur Facebook, ouvre Weshbien.com et affiche ta liste d’amis.</li>
          <li>Essaie de sélectionner les pseudos visibles en maintenant le doigt sur le texte, puis copie-les.</li>
          <li>Reviens sur cette page Weshbien2 et colle les pseudos dans la zone « Liste des pseudos ».</li>
          <li>Appuie sur « Rechercher mes amis ».</li>
        </ol>
        <p><small>Le navigateur intégré de Facebook bloque souvent les favoris qui exécutent du code. Cette méthode manuelle ne lit que les pseudos visibles et copiables. Si Facebook ne permet pas de sélectionner la liste, l’extraction automatique ne pourra pas fonctionner dans ce navigateur.</small></p>
        <details style={{ marginTop: 12 }}>
          <summary>Autre méthode : extracteur dans un navigateur compatible</summary>
          <p>Sur Chrome ou Edge, tu peux utiliser le favori Extracteur Weshbien après avoir ouvert ta liste d’amis.</p>
          <button type="button" onClick={() => { navigator.clipboard?.writeText(bookmarklet).then(() => setMessage('Code de favori copié.')); }} style={{ marginTop: 8 }}>Copier le code de l’extracteur</button>
        </details>
      </section>
      <form onSubmit={searchFriends} className="card" style={{ padding: 18 }}>
        <h2>Importer facilement ton fichier</h2>
        <label htmlFor="friends-csv-file">1. Choisis le fichier CSV téléchargé depuis Weshbien.com</label>
        <div className="friends-file-picker"><label htmlFor="friends-csv-file" className="friends-file-button">Choisir un fichier</label><span className="friends-file-name">{selectedFileName}</span><input id="friends-csv-file" type="file" accept=".csv,.txt,text/csv,text/plain,*/*" onChange={loadCsvFile} /></div>
        <p style={{ textAlign: 'center', margin: '8px 0' }}>ou colle directement les pseudos ci-dessous</p>
        <label htmlFor="old-friends-list">2. Liste des pseudos</label>
        <textarea id="old-friends-list" value={raw} onChange={e => setRaw(e.target.value)} rows={8} placeholder={'username,display_name,avatar_url\nOriana66,Oriana,\nCharli012,Charlie,\n'} style={{ width: '100%', marginTop: 10, padding: 12, borderRadius: 12 }} />
        <button type="submit" disabled={busy} style={{ marginTop: 12 }}>{busy ? 'Recherche…' : 'Rechercher mes amis'}</button>
      </form>
      {message && <p role="status" className="notice">{message}</p>}
      {matches.length > 0 && <><h2>Membres retrouvés</h2><div className="member-grid">{matches.map(p => <article className="card member-card" key={p.id}><h3>{p.display_name || p.username || 'Membre'}</h3><small>@{p.username}</small><p><Link href={'/profile?id=' + p.id}>Voir le profil →</Link></p></article>)}</div></>}
      {notFound.length > 0 && <section className="card" style={{ padding: 16, marginTop: 20 }}><h2>Pseudos non retrouvés ({notFound.length})</h2><p>Ces personnes n’ont peut-être pas encore rejoint Weshbien2, utilisent un autre pseudo ou ont un profil privé.</p><p style={{ overflowWrap: 'anywhere' }}>{notFound.join(', ')}</p><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}><button type="button" onClick={() => void copyText(notFound.join('\n'), 'Liste des pseudos non retrouvés copiée.')}>Copier les pseudos</button><button type="button" onClick={copyInvitation}>Copier le message pour les inviter</button></div></section>}
      <section className="card" style={{ padding: 16, marginTop: 20 }}><h2>Faire revenir les anciens membres</h2><p>Tu peux envoyer une invitation à tes amis pour qu’ils créent leur propre compte sur Weshbien2 et te retrouvent.</p><button type="button" onClick={copyInvitation}>Copier le message d’invitation</button></section>
      <section className="card" style={{ padding: 16, marginTop: 20 }}><strong>Important</strong><p>Cet outil recherche uniquement les profils publics déjà présents sur Weshbien2. Il ne copie pas les comptes ni les données privées de Weshbien.com et ne crée pas automatiquement d’amitiés. Les anciens membres devront rejoindre Weshbien2 et accepter les demandes d’amitié.</p></section>
      <p><Link href="/retour-weshbien">← Retour à la page des anciens membres</Link></p>
    </section>
  </main>
}
