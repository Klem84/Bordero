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

// --- Test 3 : numérotation continue (RG-8.3) ---
await client.query('begin');
try {
  const o = await client.query(`insert into public.organisations(raison_sociale) values('NUM') returning id`);
  const org = o.rows[0].id;
  const nums = [];
  for (let i = 0; i < 3; i++) {
    const r = await client.query(`select public.prochain_numero($1,'BSMV',2026) as n`, [org]);
    nums.push(r.rows[0].n);
  }
  if (nums.join(',') === '1,2,3') ok('numérotation continue : 1, 2, 3 sans trou');
  else ko('numérotation continue', nums.join(','));
} catch (e) {
  ko('numérotation (erreur)', e.message);
} finally {
  await client.query('rollback');
}

// --- Test 4 : immuabilité du bordereau (RG-2.1) ---
await client.query('begin');
try {
  const o = await client.query(`insert into public.organisations(raison_sociale) values('IMM') returning id`);
  const org = o.rows[0].id;
  const b = await client.query(
    `insert into public.bordereaux(organisation_id, type, numero, statut) values($1,'BSMV','BSMV-2026-00001','EMIS') returning id`,
    [org],
  );
  const bid = b.rows[0].id;
  // transition illégale directe EMIS -> BOUCLE
  let illegalRejected = false;
  await client.query('savepoint s1');
  try {
    await client.query(`update public.bordereaux set statut='BOUCLE' where id=$1`, [bid]);
  } catch {
    illegalRejected = true;
    await client.query('rollback to savepoint s1');
  }
  if (illegalRejected) ok('bordereau : transition illégale EMIS → BOUCLE rejetée');
  else ko('bordereau transition', 'EMIS → BOUCLE acceptée');
  // parcours légal jusqu'à BOUCLE
  await client.query(`update public.bordereaux set statut='SIGNE_CLIENT' where id=$1`, [bid]);
  await client.query(`update public.bordereaux set statut='DEPOSE' where id=$1`, [bid]);
  await client.query(`update public.bordereaux set statut='BOUCLE' where id=$1`, [bid]);
  // UPDATE d'un bordereau bouclé -> rejet
  let updRejected = false;
  await client.query('savepoint s2');
  try {
    await client.query(`update public.bordereaux set nature_matiere='x' where id=$1`, [bid]);
  } catch {
    updRejected = true;
    await client.query('rollback to savepoint s2');
  }
  if (updRejected) ok('bordereau bouclé : UPDATE rejeté (immuable)');
  else ko('bordereau immuable (update)', 'UPDATE accepté');
  // DELETE d'un bordereau -> rejet
  let delRejected = false;
  await client.query('savepoint s3');
  try {
    await client.query(`delete from public.bordereaux where id=$1`, [bid]);
  } catch {
    delRejected = true;
    await client.query('rollback to savepoint s3');
  }
  if (delRejected) ok('bordereau : DELETE rejeté (jamais de suppression physique)');
  else ko('bordereau immuable (delete)', 'DELETE accepté');
} catch (e) {
  ko('immuabilité bordereau (erreur)', e.message);
} finally {
  await client.query('rollback');
}

await client.end();

if (failures.length) {
  console.log(`\n❌ ${failures.length} test(s) en échec`);
  process.exit(1);
}
console.log('\n✅ Tests de sécurité DB : tous passés');
