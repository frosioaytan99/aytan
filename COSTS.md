COSTS - Aytan

Résumé
- Pour 2 comptes en usage prototype léger, le coût est très probablement 0 € si vous restez dans les quotas gratuits (Supabase free tier + hébergement frontend gratuit).
- Ce fichier décrit les principaux postes de coûts, seuils à surveiller et actions pour contrôler les dépenses.

Principaux postes de coûts
1) Supabase (Postgres, Storage, Realtime, Edge Functions)
   - Free tier couvre un petit nombre d'utilisateurs, faible stockage (<1–5 GB) et faibles requêtes/Edge invocations.
   - Coûts démarrent quand : stockage total > quota gratuit, beaucoup d'egress (downloads), ou invocations Edge/Fn élevées.
2) API de modération externe (ex: OpenAI, Perspective API)
   - Facturation par requête. Même faible coût unitaire devient significatif à volume élevé.
3) Stockage des pièces jointes
   - Facturation par GB stocké et egress. Limitez taille et durée de rétention.
4) Hébergement frontend et domaine
   - Vercel/Netlify/Supabase Hosting ont plans gratuits ; nom de domaine ~10–20€/an.
5) E-mails transactionnels
   - Mailgun/SendGrid ont paliers gratuits, facturation au-delà.

Estimation simple (prototype, paramètres utilisés)
- Utilisateurs actifs : 2
- Messages par utilisateur / jour : 10 → 20 messages/jour → ~600 messages/mois
- % messages avec pièce jointe : 10% → 60 pièces jointes/mois
- Taille moyenne pièce jointe : 1 MB → stockage ≈ 60 MB/mois
- Modération : pas d'API payante externe
=> Coût estimé : 0 € / mois (reste probablement dans free tiers)

Exemples de coûts rapides
- API modération à 0,001 €/requête → 600 req/mois ≈ 0,60 €/mois
- Si stockage passe à 50 GB (hors free tier) → dizaines d'€/mois selon provider
- Utilisateurs en centaines → fonctions/DB/egress / stockage deviennent majeurs (dizaines à centaines €/mois)

Bonnes pratiques pour limiter les coûts
- Fixer limites côté backend:
  - Taille max attachement (ex: 5 MB)
  - Nombre max messages par minute par utilisateur
  - Rétention automatique (supprimer attachments après N jours)
- Mettre en cache et batcher les appels à l'API de modération
- Utiliser signed URLs pour éviter accès publics et limiter egress
- Activer alerts/budgets dans Supabase et sur l'hébergeur (moniteur de facturation)
- Prévoir quotas gratuits/plan payant progressif pour la montée en charge

Alertes et monitoring recommandés
- Créer alarmes lorsque :
  - Stockage utilisé > 70% du quota gratuit
  - Nombre d'invocations Edge > 70% du quota gratuit
  - MAU > 100 (repensez plan)
- Lier ces alertes à email/Slack et configurer revue mensuelle des usages

Actions que je peux faire pour vous
- Ajouter des règles RLS / limitions (déjà présentes) et un middleware de rate-limiting.
- Ajouter un script de seed pour 2 comptes de test (dev) et documenter comment les utiliser.
- Estimer coûts mensuels pour des paliers (2, 100, 1000 MAU) si vous fournissez messages/jour et attachements.
- Mettre en place une GitHub Action qui vérifie un seuil de coût (ex: lecture d'une métrique) et ouvre une issue si dépassé.

Si vous voulez, je peux maintenant :
- 1) créer un script de seed pour 2 comptes dans nextjs/ (dev)
- 2) ajouter des alertes/CI (workflow) pour surveillance des coûts
- 3) produire une estimation chiffrée pour d'autres paliers (donnez-moi les paramètres)

