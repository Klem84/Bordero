// Tests de sécurité base de données (à exécuter contre staging).
// 1) Isolation multi-tenant RLS : un membre de l'org A ne voit pas les données de l'org B.
//    C'est le test de sécurité le plus important du projet (dossier technique §4.2).
// 2) Machine à états de l'intervention : transitions illégales rejetées par trigger.
// Tout est exécuté dans des transactions annulées (rollback) : rien n'est persisté.
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
const ref = env.NEXT_PUBLIC_SUPABASE_URL.replace('https://', '').replace('.supabase.co', '');

const ORG_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ORG_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const client = new pg.Client({
  host: `db.${ref}.supabase.co`,
  port: 5432,
  user: 'postgres',
  password: env.SUPABASE_DB_PASSWORD,
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
});

const failures = [];
const ok = (name) => console.log(`  ✓ ${name}`);
const ko = (name, detail) => {
  failures.push(name);
  console.log(`  ✗ ${name} — ${detail}`);
};

await client.connect();

// --- Test 1 : isolation RLS ---
await client.query('begin');
try {
  await client.query(
    `insert into public.organisations(id, raison_sociale) values ($1,'Org A'),($2,'Org B')`,
    [ORG_A, ORG_B],
  );
  await client.query(
    `insert into public.clients(organisation_id, nom) values ($1,'Client de A'),($2,'Client de B')`,
    [ORG_A, ORG_B],
  );
  await client.query('set local role authenticated');
  await client.query(`select set_config('request.jwt.claims', $1, true)`, [
    JSON.stringify({ org_id: ORG_A, app_role: 'admin', sub: '00000000-0000-4000-8000-000000000001' }),
  ]);
  const r = await client.query(
    `select count(*)::int as n, coalesce(string_agg(nom, ','), '') as noms from public.clients`,
  );
  await client.query('reset role');
  if (r.rows[0].n === 1 && r.rows[0].noms === 'Client de A') {
    ok("isolation RLS : l'org A ne voit que ses propres clients");
  } else {
    ko('isolation RLS', JSON.stringify(r.rows[0]));
  }
} catch (e) {
  ko('isolation RLS (erreur)', e.message);
} finally {
  await client.query('rollback');
}

// --- Test 2 : machine à états ---
await client.query('begin');
try {
  const seed = await client.query(
    `with o as (insert into public.organisations(raison_sociale) values('FSM') returning id),
          c as (insert into public.clients(organisation_id, nom) select id,'C' from o returning id, organisation_id),
          s as (insert into public.sites(organisation_id, client_id, adresse) select organisation_id, id, 'A' from c returning id, organisation_id)
     insert into public.interventions(organisation_id, site_id, status)
       select organisation_id, id, 'BROUILLON' from s returning id`,
  );
  const intId = seed.rows[0].id;
  await client.query(`update public.interventions set status='PLANIFIEE' where id=$1`, [intId]);
  ok('machine à états : BROUILLON → PLANIFIEE acceptée');
  let rejected = false;
  try {
    await client.query(`update public.interventions set status='CLOTUREE' where id=$1`, [intId]);
  } catch {
    rejected = true;
  }
  if (rejected) ok('machine à états : PLANIFIEE → CLOTUREE (illégale) rejetée');
  else ko('machine à états', 'transition illégale acceptée');
} catch (e) {
  ko('machine à états (erreur)', e.message);
} finally {
  await client.query('rollback');
}

await client.end();

if (failures.length) {
  console.log(`\n❌ ${failures.length} test(s) en échec`);
  process.exit(1);
}
console.log('\n✅ Tests de sécurité DB : tous passés');
