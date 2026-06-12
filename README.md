# Bordero

SaaS métier pour les entreprises de vidange, curage et assainissement. « Du devis au bordereau réglementaire, sans papier, depuis le camion. »

## Structure (monorepo pnpm + Turborepo)

| Espace | Contenu |
|---|---|
| `apps/web` | Back-office Next.js (à venir) |
| `apps/mobile` | App chauffeur Expo (à venir) |
| `packages/core` | Règles métier partagées : machine à états, routage documentaire, échéances |
| `packages/db` | Migrations Supabase et types générés |

## Prérequis

- Node.js >= 20 (testé sur v24)
- pnpm 9 via corepack : les commandes s'invoquent `corepack pnpm@9 <cmd>`

## Démarrage

```bash
corepack pnpm@9 install
corepack pnpm@9 test
```

## Documentation interne

Voir `CLAUDE.md` à la racine pour les conventions, le vocabulaire métier et les invariants réglementaires.
