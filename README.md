# Aytan — communauté et messagerie

Aytan est une application communautaire construite avec Next.js et Supabase.

## Fonctionnalités présentes dans l’interface
- Page d’accueil responsive.
- Connexion par lien magique Supabase Auth.
- Profil membre (pseudo, nom affiché, bio et lien d’avatar).
- Fil de publications.
- Découverte et recherche de membres.
- Messagerie privée simple.
- Signalement de publications.
- Page de conseils de sécurité.

## Installation
1. Créer un projet Supabase.
2. Exécuter `sql/schema.sql`, puis `sql/rls_policies.sql`.
3. Exécuter `sql/community_schema.sql`.
4. Configurer `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` dans l’environnement Next.js.
5. Dans Supabase Auth, configurer l’URL du site et les URL de redirection autorisées (dont `/feed`).
6. Installer et lancer : `cd nextjs && npm install && npm run dev`.

## Important avant toute ouverture publique
Cette version est un socle fonctionnel, pas une plateforme prête à accueillir des mineurs à grande échelle. Il faut encore mettre en place une vraie modération humaine, un traitement des signalements, des tests de sécurité/RLS, les règles de confidentialité adaptées aux mineurs, les conditions d’utilisation et les procédures de protection des données. Ne jamais placer une clé service role dans une variable `NEXT_PUBLIC_*`.
