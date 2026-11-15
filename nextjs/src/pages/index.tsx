import Link from 'next/link'

export default function Home() {
  return (
    <main className="site-shell">
      <header className="topbar">
        <Link href="/" className="brand" aria-label="weshbien2, accueil">
          <span className="brand-mark">a</span>
          <span>weshbien2<span className="brand-dot">.</span></span>
        </Link>
        <nav className="top-nav" aria-label="Navigation principale">
          <Link href="/inbox">Messages</Link>
          <Link href="/auth" className="nav-login">Connexion</Link>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow"><span className="status-dot" /> TON ESPACE, TON MONDE</span>
          <h1>Les rencontres<br />commencent par un <span>bonjour.</span></h1>
          <p className="hero-text">
            Bienvenue sur weshbien2, un espace pour discuter, faire connaissance
            et partager de bons moments, à ton rythme.
          </p>
          <div className="hero-actions">
            <Link href="/auth" className="primary-link">Rejoindre weshbien2 <span>→</span></Link>
            <Link href="/inbox" className="secondary-link">Voir mes messages</Link>
          </div>
          <p className="small-note">Un profil à la fois. Des échanges respectueux avant tout.</p>
        </div>
        <div className="hero-art" aria-label="Illustration décorative">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="float-card float-card-top"><span className="bubble-icon">✦</span><span>Fais de nouvelles rencontres</span></div>
          <div className="phone-card">
            <div className="phone-top"><span /> <span /> <span /></div>
            <div className="chat-heading"><div className="avatar avatar-purple">A</div><div><strong>Une nouvelle discussion</strong><small>Un petit bonjour ?</small></div></div>
            <div className="chat-bubble bubble-left">Salut ! Ça va ?</div>
            <div className="chat-bubble bubble-right">Oui et toi ? 😊</div>
            <div className="chat-bubble bubble-left short-bubble">Super ! ✨</div>
            <div className="chat-input"><span>Écris un message…</span><b>↑</b></div>
          </div>
          <div className="float-card float-card-bottom"><span className="sparkle">✧</span><span>Sois simplement toi-même</span></div>
          <span className="decor decor-one">✳</span><span className="decor decor-two">✦</span>
        </div>
      </section>

      <section className="features" aria-label="Découvrir weshbien2">
        <div className="section-heading"><span>BIENVENUE CHEZ TOI</span><h2>Un espace fait pour échanger.</h2></div>
        <div className="feature-grid">
          <article className="feature-card"><div className="feature-icon lilac">☁</div><h3>Fais connaissance</h3><p>Découvre des personnes et commence une conversation naturellement.</p></article>
          <article className="feature-card"><div className="feature-icon peach">♡</div><h3>Discute librement</h3><p>Retrouve tes échanges dans un espace simple et agréable.</p></article>
          <article className="feature-card"><div className="feature-icon mint">✧</div><h3>Reste respectueux</h3><p>Protège tes informations personnelles et respecte les autres.</p></article>
        </div>
      </section>

      <footer className="site-footer"><Link href="/" className="footer-brand">weshbien2.</Link><span>Fait pour créer de belles conversations.</span><Link href="/auth">Commencer →</Link></footer>
    </main>
  )
}
