import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

function decodeKey(value: string) {
  const padding = '='.repeat((4 - value.length % 4) % 4)
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  return Uint8Array.from(raw, char => char.charCodeAt(0))
}

export default function PushNotifications() {
  const [state, setState] = useState<'loading'|'off'|'on'|'unsupported'|'denied'|'facebook-unsupported'>('loading')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    async function check() {
      const inFacebook = /FBAN|FBAV|FB_IAB|FB4A/i.test(navigator.userAgent || '')
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        if (active) setState(inFacebook ? 'facebook-unsupported' : 'unsupported')
        return
      }
      try {
        const registration = await navigator.serviceWorker.register('/sw.js')
        const subscription = await registration.pushManager.getSubscription()
        if (active) setState(subscription ? 'on' : Notification.permission === 'denied' ? 'denied' : 'off')
      } catch {
        if (active) setState(inFacebook ? 'facebook-unsupported' : 'unsupported')
      }
    }
    void check()
    return () => { active = false }
  }, [])

  async function enable() {
    if (busy) return
    setBusy(true)
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        setState('unsupported'); return
      }
      const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY
      if (!publicKey) throw new Error('Les notifications push ne sont pas encore configurées.')
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { setState(permission === 'denied' ? 'denied' : 'off'); return }
      const registration = await navigator.serviceWorker.register('/sw.js')
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeKey(publicKey) as BufferSource
      })
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) throw new Error('Reconnecte-toi pour activer les notifications.')
      const { error } = await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        endpoint: subscription.endpoint,
        subscription: subscription.toJSON(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'endpoint' })
      if (error) throw error
      setState('on')
    } catch (error: any) {
      console.error('Activation des notifications impossible', error)
      window.dispatchEvent(new CustomEvent('weshbien:notify', { detail: { message: error?.message || 'Impossible d’activer les notifications.', href: '/settings' } }))
    } finally {
      setBusy(false)
    }
  }

  if (state === 'loading' || state === 'unsupported') return null
  if (state === 'facebook-unsupported') return <div role="status" style={{maxWidth:320,padding:'9px 12px',borderRadius:12,background:'var(--surface,#fff)',color:'var(--text,#222)',fontSize:13,lineHeight:1.4,boxShadow:'0 2px 10px #0001'}}>ℹ️ Le navigateur Facebook ne prend pas en charge les notifications push sur cet appareil. Les notifications resteront visibles quand tu ouvres Weshbien2.</div>
  return <div style={{display:'grid',gap:5,justifyItems:'start'}}><button
    type="button"
    onClick={enable}
    disabled={busy || state === 'on' || state === 'denied'}
    title={state === 'on' ? 'Notifications activées' : state === 'denied' ? 'Autorise les notifications dans les paramètres du navigateur' : 'Recevoir les messages même quand Weshbien2 est fermé'}
    style={{border:0,borderRadius:999,padding:'8px 12px',fontWeight:700,cursor:state==='on'||state==='denied'?'default':'pointer',background:state==='on'?'#dcfce7':'var(--surface,#fff)',color:state==='on'?'#166534':'var(--text,#222)',boxShadow:'0 2px 10px #0001'}}
  >
    {busy ? 'Activation…' : state === 'on' ? '🔔 Notifications activées' : state === 'denied' ? '🔕 Notifications bloquées' : '🔔 Activer les notifications'}
  </button>{/FBAN|FBAV|FB_IAB|FB4A/i.test(typeof navigator !== 'undefined' ? navigator.userAgent || '' : '') && state !== 'on' && <small style={{maxWidth:280,fontSize:11,color:'var(--muted,#777)'}}>Tu es dans Facebook : même si l’activation réussit, Facebook peut suspendre les notifications en arrière-plan.</small>}</div>
}
