import { useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'

export default function IndividualPage() {
  const [accepted, setAccepted] = useState(false)

  return (
    <>
      <Head>
        <title>Weshbien Individuel — Avertissement</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <main className="app-shell" style={{maxWidth:760,margin:'0 auto',padding:'32px 18px 120px'}}>
        <section className="card" style={{padding:'clamp(22px,5vw,38px)',border:'1px solid rgba(245,158,11,.45)',background:'var(--card, rgba(255,255,255,.92))'}}>
          <div style={{fontSize:42,marginBottom:12}} aria-hidden="true">⚠️</div>
          <p style={{fontWeight:800,letterSpacing:'.08em',fontSize:12,color:'#b45309'}}>ESPACE INDIVIDUEL</p>
          <h1 style={{fontSize:'clamp(26px,5vw,36px)',margin:'8px 0 14px'}}>Attention avant d’entrer</h1>
          <p style={{fontSize:16,lineHeight:1.7}}>Cet espace peut être dangereux. Les images qui y sont publiées peuvent ne pas être vérifiées automatiquement par l’intelligence artificielle. Tu peux donc rencontrer des images choquantes, inappropriées ou dérangeantes.</p>
          <p style={{fontSize:14,lineHeight:1.7}}>Ne partage aucune information personnelle. Si tu vois un contenu inquiétant ou qui enfreint les règles, ne le diffuse pas et signale-le aux administrateurs.</p>
          {!accepted ? (
            <button type="button" onClick={() => setAccepted(true)} style={{marginTop:18,width:'100%',padding:'14px 18px',border:0,borderRadius:14,background:'#b45309',color:'#fff',fontWeight:800,cursor:'pointer'}}>J’ai compris, continuer</button>
          ) : (
            <div role="status" style={{marginTop:18,padding:16,borderRadius:12,background:'rgba(245,158,11,.12)',lineHeight:1.6}}>
              <strong>Tu as confirmé avoir lu l’avertissement.</strong>
              <p style={{margin:'8px 0 0'}}>L’espace individuel est en cours de préparation. Les publications et les images y seront séparées du fil Weshbien classique.</p>
            </div>
          )}
          <p style={{marginTop:20,fontSize:13}}><Link href="/feed">← Retour à Weshbien classique</Link></p>
        </section>
      </main>
    </>
  )
}
