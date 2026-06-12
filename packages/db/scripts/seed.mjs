// Seed de démonstration (staging uniquement).
// Crée une organisation fictive, un utilisateur admin (login), un catalogue de
// prestations, et quelques clients/sites/ouvrages géolocalisés en Aveyron.
// Idempotent : réinitialise l'org de démo à chaque exécution.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import pg from 'pg';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const env = Object.fromEntries(
  readFileSync(resolve(root, '.env.local'), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);
const BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const SECRET = env.SUPABASE_SECRET_KEY;
const ref = BASE.replace('https://', '').replace('.supabase.co', '');

const DEMO_EMAIL = 'admin@bordero-demo.fr';
const DEMO_PASSWORD = 'BorderoDemo2026!';
const DEMO_ORG = 'dddddddd-0000-4000-8000-000000000001';

const adminHeaders = { apikey: SECRET, Authorization: `Bearer ${SECRET}`, 'Content-Type': 'application/json' };

async function ensureAuthUser() {
  // Cherche un utilisateur existant avec cet email et le supprime (reset propre).
  const list = await fetch(`${BASE}/auth/v1/admin/users?per_page=200`, { headers: adminHeaders });
  if (!list.ok) throw new Error(`admin list users: HTTP ${list.status} ${await list.text()}`);
  const { users } = await list.json();
  const existing = (users ?? []).find((u) => u.email === DEMO_EMAIL);
  if (existing) {
    await fetch(`${BASE}/auth/v1/admin/users/${existing.id}`, { method: 'DELETE', headers: adminHeaders });
  }
  const create = await fetch(`${BASE}/auth/v1/admin/users`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD, email_confirm: true }),
  });
  if (!create.ok) throw new Error(`admin create user: HTTP ${create.status} ${await create.text()}`);
  const user = await create.json();
  return user.id;
}

const client = new pg.Client({
  host: `db.${ref}.supabase.co`,
  port: 5432,
  user: 'postgres',
  password: env.SUPABASE_DB_PASSWORD,
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
});

const userId = await ensureAuthUser();
console.log('Utilisateur de démo prêt :', DEMO_EMAIL);

await client.connect();
try {
  await client.query('begin');
  // Reset de l'org de démo (cascade sur toutes les données liées).
  await client.query('delete from public.organisations where id = $1', [DEMO_ORG]);

  await client.query(
    `insert into public.organisations(id, raison_sociale, siret, adresse)
     values ($1, 'Vidanges Démo Aveyron', '90000000000017', '12 route de Rodez, 12000 Onet-le-Château')`,
    [DEMO_ORG],
  );
  await client.query(
    `insert into public.app_users(id, organisation_id, role, nom, email)
     values ($1, $2, 'admin', 'Démo Admin', $3)
     on conflict (id) do update set organisation_id = excluded.organisation_id, role = excluded.role`,
    [userId, DEMO_ORG, DEMO_EMAIL],
  );

  // Catalogue de prestations
  const prestations = [
    ['Vidange fosse toutes eaux', 25000, 30, 25, 3, 4000, 60, 'MATIERES_VIDANGE_ANC'],
    ['Curage de canalisation', 18000, 30, 25, null, null, 90, 'DECHET_NON_DANGEREUX_HORS_ANC'],
    ['Pompage bac à graisse', 15000, 30, 25, null, null, 45, 'DECHET_NON_DANGEREUX_HORS_ANC'],
    ['Nettoyage séparateur hydrocarbures', 32000, 30, 25, null, null, 120, 'DECHET_DANGEREUX'],
    ['Débouchage urgence', 12000, 50, 25, null, null, 60, 'DECHET_NON_DANGEREUX_HORS_ANC'],
  ];
  let ordre = 0;
  for (const [libelle, base, urg, we, forfait, m3sup, duree, classif] of prestations) {
    await client.query(
      `insert into public.prestations(organisation_id, libelle, prix_base_cents, majoration_urgence_pct,
         majoration_weekend_pct, volume_forfait_m3, prix_m3_supplementaire_cents, duree_standard_min,
         classification_dechet, ordre)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [DEMO_ORG, libelle, base, urg, we, forfait, m3sup, duree, classif, ordre++],
    );
  }

  // Clients + sites (géolocalisés autour de Rodez) + ouvrages
  const clients = [
    ['particulier', 'Martin Dupont', '06 12 34 56 78', null, '8 chemin des Prés, 12000 Rodez', 2.5736, 44.3506, 'FOSSE_TOUTES_EAUX', 3000],
    ['particulier', 'Sophie Laval', '06 98 76 54 32', null, '15 rue du Ségala, 12850 Onet-le-Château', 2.5489, 44.3712, 'FOSSE_SEPTIQUE', 4000],
    ['professionnel', 'Restaurant Le Causse', '05 65 11 22 33', 'contact@lecausse.fr', '3 place de la Cité, 12000 Rodez', 2.5751, 44.3491, 'BAC_A_GRAISSE', 500],
    ['professionnel', 'Garage Aveyron Auto', '05 65 44 55 66', null, "ZA de Bel Air, 12510 Olemps", 2.5402, 44.3338, 'SEPARATEUR_HYDROCARBURES', 2000],
  ];
  for (const [type, nom, tel, email, adresse, lng, lat, ouvrageType, volume] of clients) {
    const c = await client.query(
      `insert into public.clients(organisation_id, type, nom, telephone, email)
       values ($1,$2,$3,$4,$5) returning id`,
      [DEMO_ORG, type, nom, tel, email],
    );
    const cid = c.rows[0].id;
    const s = await client.query(
      `insert into public.sites(organisation_id, client_id, adresse, geom)
       values ($1,$2,$3, ST_SetSRID(ST_MakePoint($4,$5),4326)) returning id`,
      [DEMO_ORG, cid, adresse, lng, lat],
    );
    const sid = s.rows[0].id;
    const periodicite =
      ouvrageType === 'BAC_A_GRAISSE' ? 6 : ouvrageType === 'SEPARATEUR_HYDROCARBURES' ? 12 : 48;
    await client.query(
      `insert into public.ouvrages(organisation_id, site_id, type, volume_nominal_litres, periodicite_mois, date_derniere_intervention)
       values ($1,$2,$3,$4,$5, current_date - interval '40 months')`,
      [DEMO_ORG, sid, ouvrageType, volume, periodicite],
    );
  }

  await client.query('commit');
  const counts = await client.query(
    `select
       (select count(*) from public.prestations where organisation_id=$1) as prestations,
       (select count(*) from public.clients where organisation_id=$1) as clients,
       (select count(*) from public.ouvrages where organisation_id=$1) as ouvrages`,
    [DEMO_ORG],
  );
  console.log('Seed OK :', counts.rows[0]);
  console.log(`Connexion démo : ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
} catch (e) {
  await client.query('rollback');
  console.error('Seed échoué :', e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
