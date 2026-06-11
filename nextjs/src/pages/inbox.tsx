import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function InboxPage() {
  const [messages, setMessages] = useState<any[]>([])

  useEffect(() => {
    let uid: string | null = null
    supabase.auth.getUser().then(r => {
      uid = r.data.user?.id ?? null
      if (uid) load(uid)
    })

    async function load(uid: string) {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`recipient.eq.${uid},sender.eq.${uid}`)
        .order('created_at', { ascending: false })
      setMessages(data || [])
    }

    const channel = supabase
      .channel('public:messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, payload => {
        const m = payload.new
        setMessages(prev => [m, ...prev.filter(x => x.id !== m.id)])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <div style={{padding:20}}>
      <h2>Inbox</h2>
      {messages.map(m => (
        <div key={m.id} style={{border:'1px solid #eee', padding:10, marginBottom:8}}>
          <strong>{m.subject}</strong>
          <p>{m.body}</p>
          <small>{new Date(m.created_at).toLocaleString()}</small>
        </div>
      ))}
    </div>
  )
}
