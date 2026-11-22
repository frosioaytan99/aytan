import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'

type LegacyMember = { username: string; display_name: string | null; avatar_url: string | null }

function parseCsv(text: string): LegacyMember[] {
  const rows: string[][] = []
  let row: string[] = [], cell = '', quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '"' && quoted && text[i + 1] === '"') { cell += '"'; i++ }
    else if (ch === '"') quoted = !quoted
    else if (ch === ',' && !quoted) { row.push(cell); cell = '' }
    else if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(cell); if (row.some(v => v.trim())) rows.push(row)
      row = []; cell = ''
    } else cell += ch
  }
  row.push(cell); if (row.some(v => v.trim())) rows.push(row)
  if (!rows.length) return []
  const headers = rows.shift()!.map(v => v.trim().toLowerCase().replace(/^\uFEFF/, ''))
  const userIndex = headers.findIndex(v => ['username', 'pseudo', 'identifiant', 'login'].includes(v))
  if (userIndex < 0) throw new Error('Colonne obligatoire manquante : username (ou pseudo).')
  const displayIndex = headers.findIndex(v => ['display_name', 'nom', 'nom_affiche'].includes(v))
  const avatarIndex = headers.findIndex(v => ['avatar_url', 'photo', 'photo_profil'].includes(v))
  return rows.map(r => ({
    username: (r[userIndex] || '').trim().replace(/^@+/, '').toLowerCase(),
    display_name: displayIndex >= 0 ? (r[displayIndex] || '').trim().slice(0, 80) || null : null,
    avatar_url: avatarIndex >= 0 && /^https:\/\//i.test((r[avatarIndex] || '').trim()) ? (r[avatarIndex] || '').trim().slice(0, 1000) : null,
  })).filter(v => /^[a-z0-9_]{3,20}$/.test(v.username))
}

export default function ImporterComptesPage() {
  const [members, setMembers] = useState<LegacyMember[]>([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [authorized, setAuthorized] = useState<boolean | null>(null)

  async function loadFile(file?: File) {
    if (!file) return
    setMessage('')
    try {
      const parsed = parseCsv(await file.text())
      const unique = Array.from(new Map(parsed.map(m => [m.username, m])).values())
      setMembers(unique)
      setMessage(unique.length + ' profil(s) valides trouvés dans le fichier.')
    } catch (e: any) { setMessage(e.message || 'Fichier CSV illisible.') }
  }

  async function importMembers() {
    if (busy || !members.length) return
    setBusy(true); setMessage('Vérification des droits…')
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) { window.location.href = '/auth'; return }
    const { data: role, error: roleError } = await supabase.from('user_roles').select('role').eq('user_id', auth.user.id).maybeSingle()
    if (roleError || role?.role !== 'admin') { setAuthorized(false); setMessage('Accès réservé à un administrateur.'); setBusy(false); return }
    setAuthorized(true)
    let imported = 0
    for (let i = 0; i < members.length; i += 100) {
      const batch = members.slice(i, i + 100).map(m => ({ ...m, imported_by: auth.user!.id }))
      const { error } = await supabase.from('legacy_member_imports').upsert(batch, { onConflict: 'username', ignoreDuplicates: true })
      if (error) { setMessage('Import interrompu après ' + imported + ' profil(s) : ' + error.message); setBusy(false); return }
      imported += batch.length
    }
    setMessage(imported + ' profil(s) ajouté(s) à la liste de migration. Aucun compte ni mot de passe n’a été créé.')
    setBusy(false)
  }

  return <main className="app-shell">
    <header className="app-header"><Link className="brand" href="/">weshbien2<span>.</span></Link><nav><Link href="/settings">Paramètres</Link></nav></header>
    <section className="directory" style={{ maxWidth: 850, margin: '0 auto' }}>
      <small>MIGRATION DES ANCIENS MEMBRES</small>
      <h1>Importer les profils de Weshbien.com</h1>
      <p>Cette page reçoit un export CSV fourni par l’administrateur de l’ancien site. Elle prépare une liste de profils à migrer ; elle ne crée pas de comptes actifs.</p>
      <section className="card" style={{ padding: 18, marginBottom: 16 }}>
        <h2>1. Préparer le fichier CSV</h2>
        <p>Colonnes acceptées : <strong>username</strong> (obligatoire), <strong>display_name</strong> et <strong>avatar_url</strong> (facultatives). Exemple :</p>
        <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>username,display_name,avatar_url\nlea_22,Léa,https://exemple.fr/photo.jpg</pre>
        <p><small>N’ajoute pas d’e-mails, de mots de passe, de messages privés, ni de données sensibles. N’importe que les informations que tu es autorisé à transférer.</small></p>
      </section>
      <section className="card" style={{ padding: 18 }}>
        <h2>2. Charger et vérifier</h2>
        <input type="file" accept=".csv,text/csv" onChange={e => loadFile(e.target.files?.[0])} />
        <p>{members.length} profil(s) prêt(s) à importer.</p>
        {members.length > 0 && <div style={{ maxHeight: 260, overflow: 'auto' }}>
          {members.slice(0, 30).map(m => <p key={m.username}>@{m.username}{m.display_name ? ' — ' + m.display_name : ''}</p>)}
          {members.length > 30 && <small>Et {members.length - 30} autres…</small>}
        </div>}
        <button type="button" disabled={busy || !members.length} onClick={importMembers}>{busy ? 'Importation…' : 'Importer les profils préparés'}</button>
        {message && <p role="status" className="notice">{message}</p>}
        {authorized === false && <p>Connecte-toi avec un compte administrateur pour continuer.</p>}
      </section>
      <section className="card" style={{ padding: 18, marginTop: 16 }}>
        <strong>Étape suivante</strong>
        <p>Une fois les données officielles obtenues, les profils seront en attente de vérification. Chaque ancien membre devra confirmer son identité et créer ses propres accès Weshbien2 avant activation.</p>
      </section>
    </section>
  </main>
}
