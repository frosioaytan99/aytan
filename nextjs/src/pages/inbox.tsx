import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'

type Message = {
  id: string
  sender: string
  recipient: string
  subject: string | null
  body: string | null
  created_at: string
}

export default function InboxPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    let channel: ReturnType<typeof supabase.channel> | null = null

    async function start() {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (!active) return
      if (userError || !user) {
        await router.replace('/auth')
        return
      }
      setEmail(user.email || '')

      const { data, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .or(`recipient.eq.${user.id},sender.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (!active) return
      if (messagesError) setError("Impossible de charger les messages pour le moment.")
      setMessages((data || []) as Message[])
      setLoading(false)

      channel = supabase
        .channel('member-inbox')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, async () => {
          const { data: fresh } = await supabase
            .from('messages')
            .select('*')
            .or(`recipient.eq.${user.id},sender.eq.${user.id}`)
            .order('created_at', { ascending: false })
          if (active) setMessages((fresh || []) as Message[])
        })
        .subscribe()
    }

    start()
    return () => {
      active = false
      if (channel) supabase.removeChannel(channel)
    }
  }, [router])

  async function logout() {
    await supabase.auth.signOut()
    await router.push('/')
  }

  return (
    <main className="member-shell">
      <header className="member-topbar">
        <Link href="/" className="brand"><span className="brand-mark">w</span><span>weshbien2<span className="brand-dot">.</span></span></Link>
        <nav className="member-nav" aria-label="Navigation membre">
          <Link href="/inbox" className="member-nav-active">Accueil</Link>
          <Link href="/send">Envoyer un message</Link>
          <button type="button" onClick={logout}>Déconnexion</button>
        </nav>
      </header>

      <div className="member-content">
        <section className="member-welcome">
          <div>
            <span className="member-eyebrow">TON ESPACE PERSONNEL</span>
            <h1>Bienvenue ! 👋</h1>
            <p>Ravi de te retrouver sur weshbien2. Ici, tu peux retrouver tes conversations.</p>
            {email && <span className="member-email">{email}</span>}
          </div>
          <Link href="/send" className="member-primary">Écrire un message <span>→</span></Link>
        </section>

        <section className="member-stats" aria-label="Résumé du compte">
          <article className="member-stat"><span className="member-stat-icon">✉</span><div><strong>{messages.length}</strong><span>Message{messages.length > 1 ? 's' : ''}</span></div></article>
          <article className="member-stat"><span className="member-stat-icon">♡</span><div><strong>Ton espace</strong><span>Personnel et privé</span></div></article>
        </section>

        <section className="member-panel">
          <div className="member-panel-heading"><div><span className="member-eyebrow">RESTER EN CONTACT</span><h2>Mes messages</h2></div><Link href="/send">Nouveau message +</Link></div>
          {loading ? <p className="member-muted">Chargement de tes messages…</p> :
            error ? <p className="member-muted">{error}</p> :
            messages.length === 0 ? (
              <div className="member-empty">
                <div className="member-empty-icon">✉</div>
                <h3>Ta boîte de réception est vide</h3>
                <p>Quand tu recevras des messages, ils apparaîtront ici.</p>
                <Link href="/send" className="member-secondary">Envoyer ton premier message</Link>
              </div>
            ) : (
              <div className="member-message-list">
                {messages.map(message => (
                  <article className="member-message" key={message.id}>
                    <div className="member-message-avatar">W</div>
                    <div className="member-message-copy"><strong>{message.subject || 'Message'}</strong><p>{message.body || 'Aucun contenu'}</p><small>{new Date(message.created_at).toLocaleString('fr-FR')}</small></div>
                  </article>
                ))}
              </div>
            )
          }
        </section>
        <footer className="member-footer"><Link href="/">weshbien2.</Link><span>Échange avec respect, protège tes informations.</span></footer>
      </div>
    </main>
  )
}
