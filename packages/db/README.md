# @bordero/db

Schéma PostgreSQL, migrations Supabase et types générés.

À venir au Sprint 1 (socle données) :

- `supabase/migrations/` : migrations SQL versionnées (tables, contraintes CHECK, triggers d'immuabilité et d'audit, machine à états en base).
- politiques RLS multi-tenant + tests pgTAP (accès croisé entre organisations rejeté).
- `src/types.ts` : types TypeScript générés depuis le schéma (`supabase gen types`).

Voir `CLAUDE.md` à la racine pour les invariants réglementaires (immuabilité, numérotation continue, multi-tenant).
