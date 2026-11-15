import Link from 'next/link'

export default function Home() {
  return (
    <main className="site-shell">
      <header className="topbar">
        <Link href="/" className="brand" aria-label="weshbien2, accueil">
          <span className="brand-mark">w</span><span>weshbien2<span className="brand-dot">.</span></span>
        </Link>
        <nav className="top-nav" aria-label="Navigation principale">
          <Link href="/feed">Fil d’actualité</Link>
          <Link href="/questions">Questions</Link>
          <Link href="/explore">Découvrir</Link>
          <Link href="/inbox">Messages</Link>
          <Link href="/auth" className="nav-login">Connexion</Link>
        </nav>
      </header>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow"><span className="status-dot" /> LE RÉSEAU POUR FAIRE CONNAISSANCE</span>
          <h1>Des gens, des<br/><span>histoires</span>, du lien.</h1>
          <p className="hero-text">Rencontre une communauté, partage tes moments et échange avec des personnes qui ont envie de discuter. Ici, chacun avance à son rythme.</p>
          <div className="hero-actions">
            <Link href="/auth" className="primary-link">Rejoindre la communauté <b>→</b></Link>
            <Link href="/explore" className="secondary-link">Découvrir les membres</Link>
          </div>
          <p className="small-note">♡ Un espace pour échanger dans le respect de chacun.</p>
        </div>
        <div className="hero-art" aria-label="Aperçu des conversations">
          <div className="orbit orbit-one"/><div className="orbit orbit-two"/>
          <div className="float-card float-card-top"><span className="bubble-icon">✦</span><span>Une nouvelle rencontre</span></div>
          <div className="phone-card">
            <div className="phone-top"><span/><span/><span/></div>
            <div className="chat-heading"><div className="avatar avatar-purple">W</div><div><strong>Les conversations</strong><small>Un endroit pour se retrouver</small></div></div>
            <div className="chat-bubble bubble-left">Salut, tu vas bien ?</div>
            <div className="chat-bubble bubble-right">Oui super, et toi ? 😊</div>
            <div className="chat-bubble bubble-left short-bubble">Ravi de faire ta connaissance !</div>
            <div className="chat-input"><span>Écris un message…</span><b>↑</b></div>
          </div>
          <div className="float-card float-card-bottom"><span className="sparkle">♡</span><span>Partage tes idées et tes moments</span></div>
          <span className="decor decor-one">✳</span><span className="decor decor-two">✦</span>
        </div>
      </section>
      <section className="features" aria-label="Découvrir weshbien2">
        <div className="section-heading"><span>TOUT AU MÊME ENDROIT</span><h2>Ta communauté, à ta façon.</h2></div>
        <div className="feature-grid">
          <article className="feature-card"><div className="feature-icon lilac">⌕</div><h3>Découvrir</h3><p>Explore les profils et trouve des personnes avec qui échanger.</p><Link href="/explore">Voir les membres →</Link></article>
          <article className="feature-card"><div className="feature-icon peach">♡</div><h3>Partager</h3><p>Publie tes idées, réagis aux posts et participe aux conversations.</p><Link href="/feed">Ouvrir le fil →</Link></article>
          <article className="feature-card"><div className="feature-icon mint">✉</div><h3>Discuter</h3><p>Ajoute des amis et retrouve tes échanges dans ta messagerie.</p><Link href="/inbox">Voir les messages →</Link></article>
        </div>
      </section>
      <section className="landing-cta">
        <div><span>PRÊT À NOUS REJOINDRE ?</span><h2>La prochaine belle rencontre commence ici.</h2></div>
        <Link href="/auth">Créer mon compte <b>→</b></Link>
      </section>
      <footer className="site-footer"><Link href="/" className="footer-brand">weshbien2.</Link><span>Un réseau pour discuter, partager et se respecter.</span><Link href="/auth">Nous rejoindre →</Link></footer>
    </main>
  )
}