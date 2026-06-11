# Aytan — Messagerie pour ados

Ce dépôt contient un scaffold minimal pour une application de messagerie destinée aux adolescents, utilisant Supabase (Auth, Postgres, Realtime, Storage, Edge Functions) pour le backend et Next.js + Tailwind pour le frontend.

Contenu ajouté:
- sql/schema.sql — schéma de base (profiles, messages, moderation_logs)
- sql/rls_policies.sql — règles RLS et policies
- functions/moderate.ts — Edge Function d'exemple pour modération automatique
- nextjs/ — app Next.js minimale (src/, package.json, config Tailwind)

Instructions rapides:
1. Créez un projet Supabase et notez SUPABASE_URL et les keys.
2. Dans Supabase SQL Editor: collez sql/schema.sql puis sql/rls_policies.sql.
3. Créez un bucket "attachments" en mode private.
4. Déployez la fonction Edge `moderate` dans Supabase et définissez la variable SERVICE_ROLE_KEY (secret).
5. Dans le frontend, définissez NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY et SUPABASE_SERVICE_ROLE_KEY (pour l'API server-side).
6. npm install && npm run dev

Sécurité: ne mettez jamais la SERVICE_ROLE_KEY dans le frontend. Utilisez l'API server ou les Edge Functions pour les opérations privilégiées.
