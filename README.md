# Aytan — communauté et messagerie

Aytan est une application communautaire construite avec Next.js et Supabase.

## Fonctionnalités préparées
- Page d’accueil responsive, identité visuelle Aytan.
- Connexion par lien magique Supabase Auth.
- Profils avec pseudo, présentation et photo via URL.
- Découverte et recherche de membres.
- Fil d’actualité : publications, réactions et commentaires.
- Messagerie privée et statut de lecture.
- Signalement de profils et de publications.
- Blocage de membres.
- Page de conseils de sécurité.
- Règles RLS et permissions de colonnes pour limiter l’exposition des données de profil.

## Installation
1. Créer un projet Supabase.
2. Copier `nextjs/.env.example` vers `.env.local` dans le dossier `nextjs`, puis renseigner les clés.
3. Dans Supabase SQL Editor, exécuter dans cet ordre : `sql/schema.sql`, `sql/rls_policies.sql`, puis `sql/community_schema.sql`.
4. Déployer la fonction Edge `moderate` depuis `supabase/functions/moderate` avec `supabase functions deploy moderate`, puis configurer `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` dans les secrets de la fonction et dans les variables serveur de l’hébergement Next.js.
5. Configurer dans Supabase Auth l’URL du site et les URL de redirection autorisées (dont `/feed`).
6. Installer et lancer : `cd nextjs && npm install && npm run dev`.

## Important
Le code a été préparé dans une branche de proposition GitHub ; il n'a pas été déployé sur un projet Supabase et je n'ai pas pu lancer le build dans ton environnement. Les tables et variables doivent donc être configurées avant que les fonctionnalités connectées fonctionnent.

Cette version est un socle de développement, pas une plateforme prête à accueillir des mineurs à grande échelle. Avant toute ouverture publique, il faut une vraie modération humaine avec une équipe et un processus de traitement des signalements, des tests de sécurité/RLS, des règles de confidentialité adaptées aux mineurs, des conditions d’utilisation et les procédures de protection des données. Le contrôle automatique actuel repère seulement quelques formats d’adresses e-mail et de numéros de téléphone. Il peut manquer des contenus ou produire des faux positifs : ce n’est pas une modération suffisante. Les photos sont fournies par URL : n’utilise pas de photos contenant des informations personnelles ou permettant de localiser un jeune.

Ne jamais placer une clé service role dans une variable `NEXT_PUBLIC_*`.
