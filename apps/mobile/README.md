# Bordero — App chauffeur (Expo)

Socle de l'application terrain (M3), offline-first. La planification vient du
serveur ; l'exécution (transitions d'état, relevés) est saisie hors ligne et
synchronisée (algorithme A2, idempotent via `client_event_uuid`).

## Lancer

```bash
corepack pnpm@9 --filter @bordero/mobile start   # Expo dev server (QR code)
corepack pnpm@9 --filter @bordero/mobile typecheck
```

Variables d'environnement (fichier `apps/mobile/.env.local`, jamais commité) :

```
EXPO_PUBLIC_SUPABASE_URL=https://eygkjljrepqjffsmatnk.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<clé anon publique>
```

## Architecture

- `app/` — routes Expo Router : `login`, `(app)/index` (tournée du jour),
  `(app)/intervention/[id]` (tunnel d'état).
- `src/lib/supabase.ts` — client Supabase (session persistée AsyncStorage).
- `src/lib/db.ts` — SQLite local : cache des interventions + outbox d'événements.
- `src/lib/sync.ts` — push des transitions (RPC `rpc_sync_evenement`) + pull de la
  tournée du jour.
- `src/lib/statuts.ts`, `src/lib/theme.ts` — libellés et thème terrain (gros
  boutons, contrastes francs).
- Règles métier (machine à états) importées de `@bordero/core` : **jamais
  dupliquées**.

## Requiert une main humaine (device / EAS)

- Tester sur un vrai téléphone (Expo Go ou build de dev) : la sync, le SQLite et
  le mode hors ligne ne sont pas vérifiables sans device.
- `eas build` / soumission store : hors périmètre nocturne (aucune soumission).
- Créer un utilisateur Supabase de rôle `chauffeur` rattaché à l'org de démo
  pour tester le filtrage RLS côté terrain.
