import Link from 'next/link'

export default function Home() {
  return (
    <main style={{padding:20}}>
      <h1>Aytan — Messagerie pour ados</h1>
      <nav>
        <ul>
          <li><Link href="/auth">Se connecter / S'inscrire</Link></li>
          <li><Link href="/inbox">Inbox</Link></li>
          <li><Link href="/send">Envoyer un message</Link></li>
        </ul>
      </nav>
    </main>
  )
}
