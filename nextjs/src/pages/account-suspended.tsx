import Link from 'next/link'

export default function AccountSuspendedPage() {
  return <main className="auth-shell">
    <section className="auth-card">
      <div className="brand"><span className="brand-mark">w</span><span>weshbien2<span className="brand-dot">.</span></span></div>
      <h1>Compte temporairement restreint</h1>
      <p>L’accès à ton compte Weshbien2 est suspendu pour le moment. Tu ne peux pas te connecter ni utiliser les fonctionnalités du site tant que cette restriction est active.</p>
      <p>Si tu penses qu’il s’agit d’une erreur, contacte l’équipe de modération.</p>
      <Link href="/auth">Retour à la connexion</Link>
    </section>
  </main>
}
