import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'

type Message = { id: string; sender: string; recipient: string; subject: string | null; body: string | null; created_at: string }
type FriendInvite = { id: string; sender_id: string; recipient_id: string; status: string; profile?: { display_name: string | null; username: string | null } }

export default function InboxPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [invites, setInvites] = useState<FriendInvite[]>([])
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [inviteBusy, setInviteBusy] = useState('')

  async function loadInvites(userId: string) {
    const { data } = await supabase.from('friend_requests')
      .select('id,sender_id,recipient_id,status')
      .eq('recipient_id', userId).eq('status', 'pending').order('created_at', { ascending: false })
    const requests = (data || []) as FriendInvite[]
    const senderIds = requests.map(item => item.sender_id)
    const { data: profiles } = senderIds.length
      ? await supabase.from('profiles').select('id,display_name,username').in('id', senderIds)
      : { data: [] as any[] }
    setInvites(requests.map(item => ({ ...item, profile: profiles?.find(p => p.id === item.sender_id) })))
  }

  useEffect(() => {
    let active = true
    let channel: ReturnType<typeof supabase.channel> | null = null
    async function start() {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (!active) return
      if (userError || !user) { await router.replace('/auth'); return }
      setEmail(user.email || '')
      const { data, error: messagesError } = await supabase.from('messages').select('*')
        .or(`recipient.eq.${user.id},sender.eq.${user.id}`).order('created_at', { ascending: false })
      if (!active) return
      if (messagesError) setError('Impossible de charger les messages pour le moment.')
      setMessages((data || []) as Message[])
      await loadInvites(user.id)
      if (!active) return
      setLoading(false)
      channel = supabase.channel('member-inbox')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, async () => {
          const { data: fresh } = await supabase.from('messages').select('*')
            .or(`recipient.eq.${user.id},sender.eq.${user.id}`).order('created_at', { ascending: false })
          if (active) setMessages((fresh || []) as Message[])
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests' }, async () => {
          if (active) await loadInvites(user.id)
        }).subscribe()
    }
    start()
    return () => { active = false; if (channel) supabase.removeChannel(channel) }
  }, [router])

  async function answerInvite(invite: FriendInvite, answer: 'accepted' | 'declined') {
    if (inviteBusy) return
    setInviteBusy(invite.id)
    const { error } = await supabase.from('friend_requests')
      .update({ status: answer, updated_at: new Date().toISOString() })
      .eq('id', invite.id).eq('status', 'pending')
    if (error) setError('Impossible de traiter cette demande.')
    else setInvites(current => current.filter(item => item.id !== invite.id))
    setInviteBusy('')
  }

  async function logout() { await supabase.auth.signOut(); await router.push('/') }

  return (
    <main className="member-shell">
      <header className="member-topbar">
        <Link href="/" className="brand"><span className="brand-mark">w</span><span>weshbien2<span className="brand-dot">.</span></span></Link>
        <nav className="member-nav" aria-label="Navigation membre">
          <Link href="/inbox" className="member-nav-active">Accueil</Link><Link href="/send">Envoyer un message</Link><button type="button" onClick={logout}>Déconnexion</button>
        </nav>
      </header>
      <div className="member-content">
        <section className="member-welcome"><div><span className="member-eyebrow">TON ESPACE PERSONNEL</span><h1>Bienvenue ! 👋</h1><p>Retrouve tes conversations et tes demandes d’amis.</p>{email && <span className="member-email">{email}</span>}</div><Link href="/explore" className="member-primary">Découvrir des membres <span>→</span></Link></section>
        <section className="member-stats"><article className="member-stat"><span className="member-stat-icon">✉</span><div><strong>{messages.length}</strong><span>Message{messages.length > 1 ? 's' : ''}</span></div></article><article className="member-stat"><span className="member-stat-icon">♡</span><div><strong>{invites.length}</strong><span>Demande{invites.length > 1 ? 's' : ''} d’ami</span></div></article></section>
        {error && <p className="member-muted">{error}</p>}
        <section className="member-panel">
          <div className="member-panel-heading"><div><span className="member-eyebrow">FAIRE CONNAISSANCE</span><h2>Demandes d’amis</h2></div></div>
          {loading ? <p className="member-muted">Chargement…</p> : invites.length === 0 ? <p className="member-muted">Aucune nouvelle demande pour le moment.</p> :
            <div className="member-message-list">{invites.map(invite => <article className="member-message" key={invite.id}>
              <div className="member-message-avatar">W</div><div className="member-message-copy"><strong>{invite.profile?.display_name || invite.profile?.username || 'Membre'}</strong><p>@{invite.profile?.username || 'membre'} souhaite t’ajouter en ami.</p><div className="friend-actions"><button type="button" disabled={inviteBusy === invite.id} onClick={() => answerInvite(invite, 'accepted')}>Accepter</button><button type="button" className="friend-secondary" disabled={inviteBusy === invite.id} onClick={() => answerInvite(invite, 'declined')}>Refuser</button><Link href={'/profile?id=' + invite.sender_id}>Voir le profil</Link></div></div>
            </article>)}</div>}
        </section>
        <section className="member-panel">
          <div className="member-panel-heading"><div><span className="member-eyebrow">RESTER EN CONTACT</span><h2>Mes messages</h2></div><Link href="/send">Nouveau message +</Link></div>
          {loading ? <p className="member-muted">Chargement de tes messages…</p> : messages.length === 0 ? <div className="member-empty"><div className="member-empty-icon">✉</div><h3>Ta boîte de réception est vide</h3><p>Une fois amis, vous pourrez discuter ici.</p><Link href="/explore" className="member-secondary">Découvrir les membres</Link></div> :
            <div className="member-message-list">{messages.map(message => <article className="member-message" key={message.id}><div className="member-message-avatar">W</div><div className="member-message-copy"><strong>{message.subject || 'Message'}</strong><p>{message.body || 'Aucun contenu'}</p><small>{new Date(message.created_at).toLocaleString('fr-FR')}</small></div></article>)}</div>}
        </section>
        <footer className="member-footer"><Link href="/">weshbien2.</Link><span>Échange avec respect, protège tes informations.</span></footer>
      </div>
    </main>
  )
}
