import Link from 'next/link'

function SparkleIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z"/></svg>
}

function ChatIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H5l-1-4.5A7.5 7.5 0 1 1 20 11.5Z"/><path d="M8 11h8M8 14h5"/></svg>
}

function UsersIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20"/><circle cx="9.5" cy="7" r="3.5"/><path d="M17 11a3.5 3.5 0 1 0-1-6.9M21 20v-1.5a4 4 0 0 0-2.8-3.8"/></svg>
}

function ShieldIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/></svg>
}

export default function Home() {
  return (
    <main className="site-shell">
      <header className="topbar">
        <Link href="/" className="brand" aria-label="Aytan, accueil">
          <span className="brand-mark"><SparkleIcon /></span>
          <span>aytan</span>
        </Link>
        <nav className="nav-links" aria-label="Navigation principale">
          <a href="#communaute">La communauté</a>
          <a href="#fonctionnalites">Fonctionnalités</a>
          <a href="#securite">Sécurité</a>
        </nav>
        <div className="nav-actions">
          <Link href="/auth" className="btn btn-plain">Connexion</Link>
          <Link href="/auth" className="btn btn-primary">Rejoindre</Link>
        </div>
      </header>

      <section className="hero" id="communaute">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> TON ESPACE, TA COMMUNAUTÉ</div>
          <h1>Fais partie de la <span>conversation.</span></h1>
          <p>Retrouve ton espace pour échanger, partager tes idées et faire vivre ta communauté, dans une ambiance simple et conviviale.</p>
          <div className="hero-buttons">
            <Link href="/auth" className="btn btn-primary">Créer mon compte <span aria-hidden="true">→</span></Link>
            <Link href="/auth" className="btn btn-plain">J'ai déjà un compte</Link>
          </div>
          <div className="hero-note"><ShieldIcon /> Un espace pensé avec la sécurité au cœur du projet</div>
        </div>

        <div className="hero-art" aria-label="Aperçu illustré de la communauté Aytan">
          <div className="float-bubble one">✨ Ça bouge ici !</div>
          <div className="phone-card">
            <div className="phone-head"><span>La communauté</span><span>•••</span></div>
            <div className="phone-avatar">
              <div className="avatar">A</div>
              <div><div className="phone-name">Alex</div><div className="phone-sub">Dans la communauté</div></div>
            </div>
            <div className="post-preview">
              <strong>Un petit moment à partager 💜</strong>
              <p>Les meilleures discussions commencent parfois par un simple bonjour.</p>
              <div className="post-image" />
            </div>
            <div className="phone-avatar">
              <div className="avatar aqua">M</div>
              <div><div className="phone-name">Maya</div><div className="phone-sub">A rejoint la discussion</div></div>
            </div>
          </div>
          <div className="float-bubble two">💬 À toi de jouer</div>
        </div>
      </section>

      <section className="section" id="fonctionnalites">
        <div className="section-heading">
          <div className="kicker">Bienvenue chez Aytan</div>
          <h2>Un espace pour se retrouver</h2>
          <p>Les outils essentiels pour faire vivre une communauté et garder le contact.</p>
        </div>
        <div className="feature-grid">
          <article className="feature-card">
            <div className="feature-icon"><UsersIcon /></div>
            <h3>Une communauté</h3>
            <p>Un espace pour découvrir les autres membres et créer du lien autour de centres d'intérêt communs.</p>
          </article>
          <article className="feature-card">
            <div className="feature-icon"><ChatIcon /></div>
            <h3>Des échanges</h3>
            <p>Retrouve l'espace de messagerie Aytan pour envoyer et consulter tes messages.</p>
          </article>
          <article className="feature-card">
            <div className="feature-icon"><SparkleIcon /></div>
            <h3>Un espace à faire grandir</h3>
            <p>Un projet communautaire qui évoluera progressivement avec de nouvelles fonctionnalités.</p>
          </article>
        </div>
      </section>

      <section className="section" id="securite">
        <div className="safety-strip">
          <div className="safety-icon"><ShieldIcon /></div>
          <div>
            <h3>La confiance avant tout</h3>
            <p>La sécurité, la confidentialité et la modération doivent accompagner chaque nouvelle fonctionnalité de la communauté.</p>
          </div>
        </div>
      </section>

      <footer className="footer">© {new Date().getFullYear()} Aytan · Une communauté à construire ensemble</footer>
    </main>
  )
}
