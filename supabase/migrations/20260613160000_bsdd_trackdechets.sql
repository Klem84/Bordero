-- Lot 2 — suivi de la dématérialisation Trackdéchets des bordereaux de déchets
-- dangereux (BSDD). Le bordereau BSDD existe déjà localement (rpc_clore_intervention
-- crée un type 'BSDD'); on y attache l'identifiant et le statut renvoyés par
-- l'API Trackdéchets. Mode dégradé : si l'organisation n'a pas configuré de jeton,
-- le bordereau reste 'NON_TRANSMIS' et peut être transmis plus tard.

alter table public.bordereaux
  add column if not exists trackdechets_id text,
  add column if not exists trackdechets_readable_id text,
  add column if not exists trackdechets_statut text,
  add column if not exists trackdechets_transmis_le timestamptz;

-- Statut de transmission lisible (NON_TRANSMIS par défaut pour un BSDD non encore
-- envoyé). Les bordereaux non-BSDD restent à null.
comment on column public.bordereaux.trackdechets_statut is
  'Statut Trackdéchets (DRAFT/SEALED/SENT/... ) ou NON_TRANSMIS si pas encore transmis. Null pour les non-BSDD.';
