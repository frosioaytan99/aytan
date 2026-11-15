import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'

export default function SendPage() {
  const router = useRouter()
  const [recipient, setRecipient] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!router.isReady || typeof router.query.to !== 'string') return
    let active = true
    supabase.from('profiles').select('id,username').eq('id', router.query.to).maybeSingle()
      .then(({ data }) => { if (active && data?.username) setRecipient(data.username) })
    return () => { active = false }
  }, [router.isReady, router.query.to])

  async function send(e: any) {
    e.preventDefault()
    setBusy(true); setStatus('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { await router.push('/auth'); setBusy(false); return }
    const { data: profile, error: lookup } = await supabase.from('profiles').select('id,username')
      .eq('username', recipient.trim().replace(/^@/, '').toLowerCase()).maybeSingle()
    if (lookup || !profile) { setStatus('Aucun membre trouvé avec ce pseudo.'); setBusy(false); return }
    const { error } = await supabase.from('messages').insert({
      sender: user.id, recipient: profile.id, subject: subject.trim() || 'Message', body: body.trim()
    })
    setBusy(false)
    if (error) {
      setStatus(error.code === '42501' ? 'Vous devez être amis pour pouvoir envoyer un message.' : 'Envoi impossible : ' + error.message)
      return
    }
    setStatus('Message envoyé !'); setSubject(''); setBody('')
  }

  return <main className="app-shell">
    <header className="app-header"><Link className="brand" href="/">weshbien2<span>.</span></Link><nav><Link href="/feed">Fil</Link><Link href="/explore">Découvrir</Link><Link href="/profile">Mon profil</Link><Link href="/inbox">Messages</Link></nav></header>
    <section className="profile-wrap"><small>MESSAGERIE PRIVÉE</small><h1>Écrire un message</h1>
      <p className="friend-hint">Tu peux écrire uniquement aux personnes qui ont accepté ta demande d’ami.</p>
      <form className="card profile-form" onSubmit={send}>
        <label>Pseudo du destinataire<input required value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="@pseudo" /></label>
        <label>Objet<input maxLength={100} value={subject} onChange={e => setSubject(e.target.value)} placeholder="Un petit bonjour" /></label>
        <label>Ton message<textarea required maxLength={3000} value={body} onChange={e => setBody(e.target.value)} placeholder="Écris ton message…" /></label>
        <button disabled={busy}>{busy ? 'Envoi…' : 'Envoyer le message →'}</button>
        {status && <p className="notice" role="status">{status}</p>}
      </form>
    </section>
  </main>
}
