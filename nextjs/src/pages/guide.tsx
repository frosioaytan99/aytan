import Head from 'next/head'
import Link from 'next/link'

const sections=[
 ['Commencer','Depuis la page d’accueil, appuie sur « Commencer » pour créer un compte ou te connecter. Une fois connecté, « Mon espace » te ramène au fil.'],
 ['Ton profil','Ouvre « Mon profil » pour ajouter une photo, une présentation, tes centres d’intérêt, tes loisirs et ta musique préférée. Tu peux aussi choisir si ton profil est public ou privé.'],
 ['Compatibilité','Les pourcentages de compatibilité sont des estimations calculées à partir des centres d’intérêt, loisirs, musique et ville renseignés par les deux membres. Ils ne garantissent pas une relation.'],
 ['Amis et abonnements','Envoie une demande d’amitié depuis un profil. Une amitié apparaît dans le fil communautaire lorsqu’elle est acceptée. Le profil affiche aussi son nombre d’amis.'],
 ['Messages','Ouvre Messages pour discuter avec tes amis, envoyer des photos et des fichiers audio, répondre, transférer ou modifier tes messages. Le bouton 😊 permet d’ajouter des emojis.'],
 ['Découvrir','Recherche des membres par pseudo ou nom. Les recherches récentes sont conservées sur ton appareil et peuvent être effacées depuis la page Découvrir.'],
 ['Photos et stories','Publie des photos dans l’espace Photos et partage des stories. Les stories actuelles expirent automatiquement après 24 heures. Ne publie que des contenus que tu as le droit de partager.'],
 ['Forums et questions','Parcours les sujets, lis les réponses et participe aux discussions. Les pages de forum indiquent leur nombre de vues.'],
 ['Espace 18+','L’accès à un espace réservé aux adultes doit rester limité aux personnes majeures. N’y publie jamais de contenu impliquant des mineurs, non consenti ou illégal.'],
 ['Notifications','Les notifications signalent les nouveautés de ton compte. Appuie sur une notification pour ouvrir la page concernée.'],
 ['Sécurité et respect','Choisis un mot de passe unique, ne le partage jamais, bloque les comptes gênants et signale les contenus problématiques. Les administrateurs et modérateurs peuvent examiner les signalements.'],
 ['Aide','Si une fonction ne marche pas, actualise la page puis réessaie. Si le problème continue, indique à l’équipe ce que tu faisais et le message d’erreur affiché.']
]
export default function GuidePage(){return <><Head><title>Mode d’emploi — Weshbien2</title><meta name="robots" content="noindex,nofollow"/></Head><main className="app-shell"><section className="directory help-guide"><small>BIENVENUE SUR WESHBien2</small><h1>Mode d’emploi complet</h1><p>Retrouve ici les explications des principaux espaces et fonctions du site.</p><div className="help-guide-grid">{sections.map(([title,body],i)=><article className="card help-guide-card" key={title}><span>{String(i+1).padStart(2,'0')}</span><h2>{title}</h2><p>{body}</p></article>)}</div><Link className="back-link" href="/feed">← Retour à mon espace</Link></section></main></>}
