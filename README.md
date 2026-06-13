# Bordero

SaaS métier pour les entreprises de vidange, curage et assainissement. « Du devis au bordereau réglementaire, sans papier, depuis le camion. »

Stack : Next.js (App Router, React 19) + Supabase (PostgreSQL/RLS, Auth, Storage) + Expo (app chauffeur) + Stripe (paiement, mode test). Région UE.

## Structure (monorepo pnpm + Turborepo)

| Espace | Contenu |
|---|---|
| `apps/web` | Back-office Next.js (tableau de bord, clients, planning, conformité, facturation, récurrence, paramètres). |
| `apps/mobile` | App chauffeur Expo, offline-first (**hors workspace pnpm**, voir ci-dessous). |
| `packages/core` | Règles métier partagées et testées (machine à états, routage documentaire RG-8.1, échéances A4, tarification, quota/bilan, optimisation de tournée 2-opt, mapping BSDD Trackdéchets). |
| `packages/db` | Migrations Supabase, types générés, scripts (seed, SQL, tests RLS). |

## Prérequis

- Node.js >= 20 (testé sur v24).
- pnpm 9 via corepack : toutes les commandes s'invoquent `corepack pnpm@9 <cmd>`.
- Secrets dans `.env.local` à la racine (gitignoré) : URL/clés Supabase, mot de passe DB, clés Stripe **test**, token Mapbox public.

## Démarrage (back-office web)

```bash
corepack pnpm@9 install
corepack pnpm@9 --filter web dev      # http://localhost:3000
```

Connexion de démonstration : `admin@bordero-demo.fr` / `BorderoDemo2026!`.
Réinitialiser les données de démo : `node packages/db/scripts/seed.mjs`.

## App chauffeur (Expo)

L'app mobile utilise React 18.3 (RN 0.76) et est volontairement **exclue du workspace pnpm** (sinon conflit de `@types/react` avec le web en React 19). Elle s'installe et se vérifie isolément :

```bash
cd apps/mobile
corepack pnpm@9 install --ignore-workspace
npx tsc --noEmit                      # typecheck
corepack pnpm@9 start                 # Expo (nécessite un téléphone / Expo Go)
```

Variables : `apps/mobile/.env.local` avec `EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

## Tests et build

```bash
corepack pnpm@9 -r test                       # tests unitaires (core, pdf)
corepack pnpm@9 --filter @bordero/db test:rls # sécurité multi-tenant (RLS, immuabilité, numérotation)
corepack pnpm@9 --filter web build            # build de production
```

## Base de données (Supabase staging)

```bash
# Appliquer les migrations (connexion directe ; le mot de passe est dans .env.local)
corepack pnpm@9 exec supabase db push --db-url "postgresql://postgres:<MDP>@db.<ref>.supabase.co:5432/postgres"
# Régénérer les types TypeScript
SUPABASE_ACCESS_TOKEN=<token> corepack pnpm@9 exec supabase gen types typescript --project-id <ref> --schema public > packages/db/src/types.ts
```

SQL ad hoc : `node packages/db/scripts/sql.mjs "<sql>"`.

## Lot 2 (réservation, BSDD, optimisation de tournée)

- **Portail public de réservation** : page `/reserver/<slug>` (hors authentification) où un prospect dépose une demande d'intervention. Insertion via RPC `anon` (aucune table exposée), atterrissage en back-office sous `/app/reservations`. Démo : `/reserver/vidanges-demo-aveyron`.
- **Optimisation de tournée (2-opt)** : bouton « Optimiser l'ordre » sur le planning. Distances de trajet réelles via l'API Matrix Mapbox (token `NEXT_PUBLIC_MAPBOX_TOKEN`), repli automatique sur le vol d'oiseau. L'algorithme vit dans `@bordero/core` (`optimiserTournee`).
- **Trackdéchets (BSDD)** : à la clôture d'un déchet dangereux, transmission au registre national via l'API Trackdéchets (`createForm`). Nécessite `TRACKDECHETS_TOKEN` ; sans jeton, mode dégradé (bordereau « non transmis », retransmissible depuis le registre). Voir `.env.example`.

> Génération PDF (bordereaux, factures, bilans) : **pdf-lib** (pur JS), choisi car `@react-pdf/renderer` échoue dans le runtime serveur de Next. Fonctions dans `packages/pdf`.

## Documentation interne

- `CLAUDE.md` — conventions, vocabulaire métier, invariants réglementaires non négociables.
- `PRODUCT.md` / `DESIGN.md` — direction produit et système visuel.
- `MORNING-REPORT.md` — journal d'avancement et état des lieux détaillé.
