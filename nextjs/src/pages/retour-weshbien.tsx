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
          <h2 style={{ marginTop: 0 }}>2. Retrouve plusieurs amis à la fois</h2>
          <p>Colle une liste de pseudos pour rechercher en une seule fois les anciens amis qui ont déjà rejoint Weshbien2.</p>
          <Link href="/importer-amis">Importer / rechercher mes amis →</Link>
        </div>
        <div className="card" style={{ padding: 18, margin: '20px 0', textAlign: 'left' }}>
          <h2 style={{ marginTop: 0 }}>À savoir</h2>
          <p>Cet outil recherche les profils publics déjà présents sur Weshbien2. Il ne transfère pas automatiquement les anciens comptes ni les anciennes amitiés. Pour une migration complète, il faut un export officiel ou un accès autorisé aux données de Weshbien.com. Ne communique jamais ton ancien mot de passe.</p>
        </div>
        <p><Link href="/feed">← Retour à Weshbien2</Link></p>
      </section>
    </main>
  )
}
