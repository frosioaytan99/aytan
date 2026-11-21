import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabaseClient'

const wallpapers = [
  { id: 'aurora', name: 'Aurore', group: 'Ambiance', colors: 'linear-gradient(135deg,#312e81,#0f766e,#be185d)' },
  { id: 'ocean', name: 'Océan profond', group: 'Nature', colors: 'linear-gradient(135deg,#041b3a,#075985,#082f49)' },
  { id: 'sunset', name: 'Coucher de soleil', group: 'Nature', colors: 'linear-gradient(135deg,#31104a,#a83279,#f77f5b)' },
  { id: 'forest', name: 'Forêt', group: 'Nature', colors: 'linear-gradient(135deg,#062b22,#14532d,#064e3b)' },
  { id: 'space', name: 'Galaxie', group: 'Espace', colors: 'linear-gradient(135deg,#08051f,#171044,#020617)' },
  { id: 'neon', name: 'Néon futuriste', group: 'Néon', colors: 'linear-gradient(135deg,#090018,#a21caf,#0891b2)' },
  { id: 'gold', name: 'Or lumineux', group: 'Abstrait', colors: 'linear-gradient(135deg,#241407,#713f12,#29200b)' },
  { id: 'ice', name: 'Glace', group: 'Abstrait', colors: 'linear-gradient(135deg,#0c2340,#164e63,#172554)' },
  { id: 'pink', name: 'Rêve rose', group: 'Abstrait', colors: 'linear-gradient(135deg,#3b123b,#831843,#4c1d95)' },
]

export default function SettingsPage() {
  const [theme, setTheme] = useState<'light'|'dark'>('light')
  const [wallpaper, setWallpaper] = useState('aurora')
  const [status, setStatus] = useState('')
  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')
    try { setWallpaper(localStorage.getItem('weshbien-wallpaper') || 'aurora') } catch {}
  }, [])
  function chooseWallpaper(id: string) {
    setWallpaper(id)
    try { localStorage.setItem('weshbien-wallpaper', id) } catch {}
    document.body.dataset.wallpaper = id
    window.dispatchEvent(new Event('weshbien:wallpaper-change'))
    setStatus('Fond animé appliqué sur cet appareil.')
  }
  function changeTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.dataset.theme = next
    try { localStorage.setItem('weshbien-theme', next) } catch {}
  }
  async function logout() {
    const { error } = await supabase.auth.signOut()
    if (error) setStatus('Déconnexion impossible : ' + error.message)
    else window.location.href = '/auth'
  }
  return <main className="app-shell"><section className="profile-wrap wallpaper-settings">
    <small>ESPACE PERSONNEL</small><h1>Paramètres</h1>
    <div className="card profile-form settings-main-card">
      <h2>Mon compte</h2>
      <Link href="/profile">👤 Modifier mon profil</Link>
      <button type="button" onClick={changeTheme}>{theme === 'dark' ? '☀️ Passer en mode clair' : '🌙 Passer en mode sombre'}</button>
      <button type="button" className="friend-secondary" onClick={logout}>↪ Déconnexion</button>
    </div>
    <div className="wallpaper-heading"><div><span>PERSONNALISATION</span><h2>Fonds d’écran animés</h2><p>Choisis une ambiance et change-la quand tu veux.</p></div><b>9 ambiances</b></div>
    <div className="wallpaper-grid">
      {wallpapers.map(item => <button type="button" key={item.id} onClick={() => chooseWallpaper(item.id)} className={'wallpaper-option' + (wallpaper === item.id ? ' selected' : '')} aria-pressed={wallpaper === item.id}>
        <span className="wallpaper-preview" style={{ background: item.colors }}><i/><i/><i/></span>
        <span className="wallpaper-option-copy"><strong>{item.name}</strong><small>{item.group}</small></span>
        <span className="wallpaper-check">{wallpaper === item.id ? '✓' : '+'}</span>
      </button>)}
    </div>
    <p className="wallpaper-status" role="status">{status || 'Ton choix est enregistré sur cet appareil.'}</p>
    <div className="wallpaper-library-link"><strong>Tu veux encore plus de vidéos 4K ?</strong><p>La bibliothèque externe propose des boucles vidéo 4K à découvrir. Les vidéos 4K sont volumineuses : elles seront chargées uniquement après ton choix pour préserver la fluidité du site.</p><a href="https://movietools.info/free-video-loops/" target="_blank" rel="noreferrer">Découvrir la bibliothèque de fonds vidéo 4K ↗</a></div>
  </section>
  <style jsx global>{`
    .wallpaper-settings{max-width:1050px!important}
    .settings-main-card{display:grid;gap:12px;margin:18px 0 32px;padding:22px}
    .settings-main-card h2{margin:0 0 4px}
    .settings-main-card>a{color:var(--accent,#7c3aed);font-weight:700}
    .settings-main-card button{width:100%;padding:12px 15px;border:1px solid var(--border,#e5e1ed);border-radius:13px;background:var(--surface,#fff);color:var(--text,#29263a);text-align:left;font:inherit;font-weight:700}
    .wallpaper-heading{display:flex;align-items:end;justify-content:space-between;gap:12px;margin:26px 0 16px}
    .wallpaper-heading span{font-size:11px;letter-spacing:1.5px;font-weight:800;color:var(--accent,#7c3aed)}
    .wallpaper-heading h2{margin:6px 0;font-size:clamp(24px,4vw,32px)}
    .wallpaper-heading p{margin:0;color:var(--muted,#777)}
    .wallpaper-heading>b{white-space:nowrap;padding:8px 12px;border-radius:99px;background:var(--surface,#fff);font-size:12px}
    .wallpaper-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
    .wallpaper-option{position:relative;display:flex;flex-direction:column;gap:10px;min-width:0;padding:9px;border:2px solid var(--border,#e5e1ed);border-radius:18px;background:var(--card,#fff);color:var(--text,#29263a);text-align:left;cursor:pointer;overflow:hidden}
    .wallpaper-option.selected{border-color:var(--accent,#7c3aed);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent,#7c3aed) 15%,transparent)}
    .wallpaper-preview{position:relative;display:block;overflow:hidden;height:110px;border-radius:12px;background-size:200% 200%;animation:wallpaperPreviewMove 8s ease-in-out infinite alternate}
    .wallpaper-preview i{position:absolute;width:80px;height:80px;border-radius:50%;filter:blur(18px);background:#ffffff66;animation:wallpaperOrb 7s ease-in-out infinite alternate}
    .wallpaper-preview i:nth-child(1){left:8%;top:20%}.wallpaper-preview i:nth-child(2){right:10%;top:10%;animation-delay:-2s}.wallpaper-preview i:nth-child(3){left:45%;bottom:-30%;animation-delay:-4s}
    @keyframes wallpaperPreviewMove{from{background-position:0% 50%;transform:scale(1)}to{background-position:100% 50%;transform:scale(1.04)}}
    @keyframes wallpaperOrb{from{transform:translate(-10px,-8px)}to{transform:translate(24px,14px)}}
    .wallpaper-option-copy{display:flex;flex-direction:column;gap:3px;padding:0 3px 2px}.wallpaper-option-copy strong{font-size:14px}.wallpaper-option-copy small{color:var(--muted,#777)}
    .wallpaper-check{position:absolute;right:15px;top:15px;width:25px;height:25px;display:grid;place-items:center;border-radius:50%;background:#fff;color:#6d28d9;font-weight:900;box-shadow:0 2px 8px #0003}
    .wallpaper-status{min-height:22px;color:var(--accent,#7c3aed);font-size:13px;font-weight:700}
    .wallpaper-library-link{margin:26px 0;padding:20px;border:1px solid var(--border,#e5e1ed);border-radius:18px;background:var(--card,#fff)}
    .wallpaper-library-link p{color:var(--muted,#777);line-height:1.55}
    .wallpaper-library-link a{color:var(--accent,#7c3aed);font-weight:800}
    @media(max-width:650px){.wallpaper-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.wallpaper-preview{height:90px}.wallpaper-option{padding:7px;border-radius:15px}.wallpaper-option-copy strong{font-size:13px}.wallpaper-heading{align-items:start;flex-direction:column}}
  `}</style>
  </main>
}
