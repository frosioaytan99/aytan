import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'

type ProfileData = {
  id: string
  display_name: string | null
  username: string | null
  bio: string | null
  is_private: boolean | null
}

export default function ProfilePage() {
  const router = useRouter()
  const [uid, setUid] = useState('')
  const [me, setMe] = useState(false)
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [privateProfile, setPrivateProfile] = useState(false)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!router.isReady) return
    let cancelled = false

    async function loadProfile() {
      setLoading(true)
      setStatus('')
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (cancelled) return
      if (authError || !user) {
        router.replace('/auth')
        return
      }

      const target = typeof router.query.id === 'string' ? router.query.id : user.id
      setUid(target)
      setMe(target === user.id)

      const { data, error } = await supabase
        .from('profiles')
        .select('id,display_name,username,bio,is_private')
        .eq('id', target)
        .maybeSingle()

      if (cancelled) return
      if (error) {
        setProfile(null)
        setStatus('Impossible de charger ce profil : ' + error.message)
      } else if (data) {
        setProfile(data as ProfileData)
        setName(data.display_name || '')
        setUsername(data.username || '')
        setBio(data.bio || '')
        setPrivateProfile(!!data.is_private)
      } else {
        setProfile(null)
        setName('')
        setUsername('')
        setBio('')
        setStatus(target === user.id
          ? 'Ton profil n’a pas encore été créé. Tu peux le compléter ci-dessous.'
          : 'Ce profil est introuvable, privé ou indisponible.')
      }
      setLoading(false)
    }

    loadProfile()
    return () => { cancelled = true }
  }, [router.isReady, router.query.id])

  async function save(e: any) {
    e.preventDefault()
    if (!uid) return
    setStatus('')
    const cleanUsername = username.trim().toLowerCase()
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: uid,
        display_name: name.trim(),
        username: cleanUsername,
        bio: bio.trim(),
        is_private: privateProfile
      }, { onConflict: 'id' })
      .select('id,display_name,username,bio,is_private')
      .single()

    if (error) {
      setStatus('Enregistrement impossible : ' + error.message)
      return
    }
    setProfile(data as ProfileData)
    setStatus('Profil enregistré !')
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <Link className="brand" href="/">weshbien2<span>.</span></Link>
        <nav>
          <Link href="/feed">Fil</Link>
          <Link href="/explore">Découvrir</Link>
          <Link href="/profile" className={me ? 'active' : ''}>Mon profil</Link>
          <Link href="/inbox">Messages</Link>
        </nav>
      </header>

      <section className="profile-wrap">
        <small>ESPACE PERSONNEL</small>
        <h1>{me ? 'Mon profil' : 'Profil membre'}</h1>

        {loading ? (
          <div className="card empty" role="status">Chargement du profil…</div>
        ) : me ? (
          <form className="card profile-form" onSubmit={save}>
            <label>Nom affiché
              <input maxLength={50} value={name} onChange={e => setName(e.target.value)} placeholder="Ton nom affiché" />
            </label>
            <label>Pseudo
              <input required pattern="[a-zA-Z0-9_]{3,24}" value={username} onChange={e => setUsername(e.target.value)} placeholder="pseudo (3 à 24 caractères)" />
            </label>
            <label>À propos de toi
              <textarea maxLength={300} value={bio} onChange={e => setBio(e.target.value)} placeholder="Présente-toi en quelques mots…" />
            </label>
            <label className="checkline">
              <input type="checkbox" checked={privateProfile} onChange={e => setPrivateProfile(e.target.checked)} />
              Rendre mon profil privé
            </label>
            <button type="submit">Enregistrer mon profil</button>
            {status && <p className="notice" role="status">{status}</p>}
          </form>
        ) : profile ? (
          <div className="card profile-form">
            <div className="avatar large">{(profile.display_name || profile.username || 'W').slice(0, 1).toUpperCase()}</div>
            <h2>{profile.display_name || profile.username || 'Membre'}</h2>
            <p>@{profile.username || 'membre'}</p>
            <p>{profile.bio || 'Ce membre n’a pas encore ajouté de présentation.'}</p>
            <Link href="/explore">Retour à la communauté</Link>
          </div>
        ) : (
          <div className="card empty">
            <p>{status || 'Ce profil ne peut pas être affiché.'}</p>
            <Link href="/explore">Retour à la communauté</Link>
          </div>
        )}
      </section>
    </main>
  )
}
