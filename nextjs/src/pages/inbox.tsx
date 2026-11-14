import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import SiteLayout from '../components/SiteLayout'
import { supabase } from '../lib/supabaseClient'

type Message = {
  id: string
  sender: string
  recipient: string
  subject: string | null
  body: string
  created_at: string
  is_read: boolean
}
type Member = {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
}
type Conversation = {
  member: Member
  messages: Message[]
  lastMessage: Message
  unread: number
}

export default function InboxPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [members, setMembers] = useState<Record<string, Member>>({})
  const [uid, setUid] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)

  async function load(userId: string) {
    setLoading(true)
    const { data, error } = await supabase
      .from('messages')
      .select('id,sender,recipient,subject,body,created_at,is_read')
      .or('sender.eq.' + userId + ',recipient.eq.' + userId)
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) {
      setStatus('Impossible de charger tes messages pour le moment.')
      setLoading(false)
      return
    }

    const rows = (data || []) as Message[]
    setMessages(rows)
    const contactIds = Array.from(new Set(rows.map(message =>
      message.sender === userId ? message.recipient : message.sender
    )))

    if (contactIds.length) {
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id,username,display_name,avatar_url')
        .in('id', contactIds)

      if (!profileError) {
        const map: Record<string, Member> = {}
        ;(profiles || []).forEach((profile: Member) => { map[profile.id] = profile })
        setMembers(map)
      }
    } else {
      setMembers({})
    }
    setStatus('')
    setLoading(false)
  }

  useEffect(() => {
    let active = true
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return
      const id = data.user?.id || ''
      setUid(id)
      if (id) load(id)
      else {
        setStatus('Connecte-toi pour consulter tes messages.')
        setLoading(false)
      }
    })
    return () => { active = false }
  }, [])

  const conversations = useMemo<Conversation[]>(() => {
    const grouped = new Map<string, Message[]>()
    messages.forEach(message => {
      const contactId = message.sender === uid ? message.recipient : message.sender
      const current = grouped.get(contactId) || []
      current.push(message)
      grouped.set(contactId, current)
    })

    return Array.from(grouped.entries()).map(([contactId, items]) => {
      const ordered = [...items].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      return {
        member: members[contactId] || {
          id: contactId,
          username: null,
          display_name: 'Membre Aytan',
          avatar_url: null
        },
        messages: ordered,
        lastMessage: ordered[0],
        unread: ordered.filter(message => message.recipient === uid && !message.is_read).length
      }
    }).sort((a, b) =>
      new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime()
    )
  }, [messages, members, uid])

  const filtered = conversations.filter(conversation => {
    const name = (conversation.member.display_name || '').toLowerCase()
    const username = (conversation.member.username || '').toLowerCase()
    const term = query.trim().toLowerCase()
    return !term || name.includes(term) || username.includes(term)
  })
  const unreadTotal = conversations.reduce((total, conversation) => total + conversation.unread, 0)

  return (
    <SiteLayout title="Ma messagerie">
      <div className="inbox-toolbar">
        <div>
          <p className="muted-small">Tes conversations privées.</p>
          <strong>{unreadTotal} message{unreadTotal > 1 ? 's' : ''} non lu{unreadTotal > 1 ? 's' : ''}</strong>
        </div>
        <Link href="/send" className="btn btn-primary">＋ Nouveau message</Link>
      </div>

      {uid && (
        <div className="card-surface search-panel">
          <label htmlFor="conversation-search">Rechercher une conversation</label>
          <input
            id="conversation-search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Pseudo ou nom du membre…"
          />
        </div>
      )}

      {status && <p className="form-status" role="status">{status}</p>}

      {loading ? (
        <div className="empty-state card-surface"><p>Chargement de tes conversations…</p></div>
      ) : (
        <div className="message-list">
          {filtered.map(conversation => {
            const member = conversation.member
            const name = member.display_name || member.username || 'Membre Aytan'
            const last = conversation.lastMessage
            const sentByMe = last.sender === uid
            return (
              <article key={member.id} className={'message-row card-surface ' + (conversation.unread ? 'unread' : '')}>
                <div className="avatar">
                  {member.avatar_url
                    ? <img src={member.avatar_url} alt="" />
                    : name.slice(0, 1).toUpperCase()}
                </div>
                <div className="message-main">
                  <div className="conversation-heading">
                    <strong>{name}</strong>
                    {member.username && <small>@{member.username}</small>}
                  </div>
                  <p>{sentByMe ? 'Toi : ' : ''}{last.body}</p>
                  <small>{new Date(last.created_at).toLocaleString('fr-FR')}</small>
                </div>
                <div className="conversation-actions">
                  {conversation.unread > 0 && <span className="message-tag">{conversation.unread} non lu{conversation.unread > 1 ? 's' : ''}</span>}
                  <Link className="btn btn-plain" href={'/send?to=' + encodeURIComponent(member.username || '')}>
                    Répondre
                  </Link>
                  {member.username && <Link className="text-button" href={'/profile?id=' + encodeURIComponent(member.id)}>Profil</Link>}
                </div>
              </article>
            )
          })}
          {filtered.length === 0 && (
            <div className="empty-state card-surface">
              <h2>{query ? 'Aucune conversation trouvée' : 'Ta boîte est vide'}</h2>
              <p>{query ? 'Essaie un autre pseudo.' : 'Quand tu recevras un message, ta conversation apparaîtra ici.'}</p>
              {!query && <Link href="/members" className="btn btn-plain">Découvrir les membres</Link>}
            </div>
          )}
        </div>
      )}
    </SiteLayout>
  )
}
