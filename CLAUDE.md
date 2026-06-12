# Bordero — Guide du dépôt (contexte permanent)

SaaS métier pour les entreprises françaises de vidange, curage et assainissement (1 à 49 salariés). Promesse : « du devis au bordereau réglementaire, sans papier, depuis le camion ». Nom de code historique des specs : « VidangePro ». Nom commercial et nom de code : **Bordero**.

Documents de référence (dossier separé, hors dépôt) : Cahier des charges fonctionnel v1.0, Dossier d'architecture technique v1.0 (plan MVP 12 semaines), Plan marketing v1.0. Toute exigence y est référencée (RG-x.x, écrans, algorithmes A1-A4). La traçabilité specs → code est maintenue sur le board Monday « Bordero — Dev ».

## Stack

- **Back-office web** : Next.js (App Router) + Tailwind + shadcn/ui, hébergé sur Vercel.
- **App chauffeur** : React Native + Expo (EAS), offline-first, SQLite local.
- **Backend** : Supabase (PostgreSQL + RLS multi-tenant, Auth, Storage, Edge Functions, pg_cron). Région UE.
- **Services** : Resend (email), Brevo (SMS), Mapbox (cartes/routage/matrices), Stripe (paiement), Sentry + PostHog (monitoring).

## Monorepo (pnpm workspaces + Turborepo)

- `apps/web` — back-office Next.js.
- `apps/mobile` — app chauffeur Expo.
- `packages/core` — types, schémas Zod, **règles métier partagées** : machine à états de l'intervention (§3.3), routage documentaire (RG-8.1), calculs d'échéances (A4), périodicités d'entretien. **Une règle métier n'est jamais écrite deux fois** : elle vit ici, consommée par le web et le mobile.
- `packages/db` — migrations Supabase, types générés.

Le gestionnaire de paquets est pnpm (via corepack : `corepack pnpm@9 <cmd>`). pnpm n'a pas pu être activé en global (Node dans `Program Files`, droits admin requis) ; utiliser corepack.

## Invariants non négociables

1. **Multi-tenant strict** : chaque table porte `organisation_id NOT NULL`. Le cloisonnement est garanti par les politiques RLS PostgreSQL (claim JWT `org_id`), pas seulement par le code. Tout accès croisé entre organisations doit échouer (test pgTAP en CI : c'est le test de sécurité le plus important du projet).
2. **Immuabilité réglementaire** : bordereaux et factures émis sont append-only. Aucune suppression physique d'un bordereau : seul un statut `ANNULÉ` avec motif obligatoire. Triggers PostgreSQL interdisant UPDATE/DELETE hors transitions autorisées + table `audit_log` alimentée par trigger (horodatage, utilisateur, avant/après).
3. **Numérotation continue** (RG-8.3) : format `BSMV-AAAA-NNNNN` / `F-AAAA-NNNNN`, séquence continue par organisation et par année, sans trou. Hors-ligne : plages de 30 numéros pré-allouées par camion et par jour. La continuité prime sur l'esthétique.
4. **Machine à états en base** : colonne `status` contrainte par CHECK ; transitions valides imposées par trigger. Le code applicatif ne peut pas produire d'état illégal.
5. **Logique sensible côté serveur uniquement** : numérotation, génération PDF, transitions réglementaires, envois SMS/email. Jamais dans le client.
6. **Offline-first** : le serveur est la source de vérité de la **planification** ; le terminal chauffeur est la source de vérité de l'**exécution** (volumes, photos, signatures). Conflits résolus côté serveur (algorithme A2).

## Vocabulaire métier (à respecter dans le code ET l'UI)

Interface 100 % français. Employer les termes du métier, jamais le jargon SaaS générique :

- **Intervention** (jamais « ticket » ni « job »).
- **Ouvrage** (jamais « asset ») : fosse, bac à graisse, séparateur hydrocarbures, poste de relevage, cuve, canalisation.
- **Bordereau** : BSMV (matières de vidange ANC, 3 volets) ou BSDD (déchets dangereux, via Trackdéchets).
- **Exutoire** / filière d'élimination : où l'on dépote.
- **Dépotage** : vidage de la citerne à l'exutoire.
- **Agrément** préfectoral : autorisation 10 ans avec quantité maximale annuelle.
- **Registre**, **bilan annuel** préfectoral.

## Périmètre

MVP (12 semaines) : M1 clients/devis, M2 dispatch, M3 app chauffeur offline, M4 conformité (BSMV/registre/bilan/agréments), M5 facturation, M6 récurrence A4 + espace documents client.

Décalé en **lot 2 (S13-S16)** : portail public de réservation, intégration Trackdéchets (BSDD), optimisation de tournée 2-opt complète. Le routage documentaire est néanmoins codé dès le MVP (champ classification + bon de prestation pour les non-dangereux).

Discipline : toute idée nouvelle va au backlog Lot 2, jamais dans le sprint courant. Seul arbitre du MVP = les critères d'acceptation §15.3 du CDC.

## Méthode de travail

- Sprints d'une semaine, un livrable démontrable le vendredi.
- Chaque fonctionnalité livrée **avec ses tests** (filet de sécurité du développeur solo).
- Définition de « Fait » : code fusionné + tests verts en CI + déployé en staging + critère d'acceptation du CDC vérifié.

## Style d'écriture (préférence du porteur)

Dans tout texte produit (UI, emails, docs, commits, commentaires) : ne jamais utiliser le tiret long « — », le tiret moyen « – », ni le double tiret « -- » comme ponctuation. Préférer virgules, parenthèses, deux-points, point-virgules, ou phrases séparées. Le trait d'union reste autorisé dans les mots composés et les identifiants.
