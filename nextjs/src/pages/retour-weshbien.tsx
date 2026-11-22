import Link from 'next/link'

export default function RetourWeshbienPage() {
  return (
    <main className="auth-shell">
      <section className="auth-card" style={{ maxWidth: 620 }}>
        <Link href="/" className="brand"><span className="brand-mark">w</span><span>weshbien2<span className="brand-dot">.</span></span></Link>
        <p style={{ fontWeight: 800, letterSpacing: 1, marginTop: 28 }}>BIENVENUE AUX ANCIENS MEMBRES</p>
        <h1>Tu viens de Weshbien.com ?</h1>
        <p>Retrouve tes amis sur Weshbien2 et reprends contact avec eux.</p>
        <div className="card" style={{ padding: 18, margin: '20px 0', textAlign: 'left' }}>
          <h2 style={{ marginTop: 0 }}>1. Retrouve ton compte</h2>
          <p>Si tu as déjà créé un compte sur Weshbien2, connecte-toi avec ton adresse e-mail et ton mot de passe Weshbien2.</p>
          <Link href="/auth">Me connecter ou créer un compte →</Link>
        </div>
        <div className="card" style={{ padding: 18, margin: '20px 0', textAlign: 'left' }}>
          <h2 style={{ marginTop: 0 }}>2. Recherche tes anciens amis</h2>
          <p>Dans Découvrir, saisis leur ancien pseudo ou leur nom affiché. Si tes amis ont déjà rejoint Weshbien2, tu pourras ouvrir leur profil et leur envoyer une demande.</p>
          <Link href="/explore">Rechercher mes amis →</Link>
        </div>
        <div className="card" style={{ padding: 18, margin: '20px 0', textAlign: 'left' }}>
          <h2 style={{ marginTop: 0 }}>À savoir</h2>
          <p>Cette page ne transfère pas automatiquement les anciens comptes ni les anciennes listes d’amis. Pour un transfert complet, il faudra une sauvegarde officielle de Weshbien.com. Ne communique jamais ton ancien mot de passe à quelqu’un.</p>
        </div>
        <p><Link href="/feed">← Retour à Weshbien2</Link></p>
      </section>
    </main>
  )
}
