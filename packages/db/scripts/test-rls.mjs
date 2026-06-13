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

// --- Test 5 : clôture d'intervention (RPC) end-to-end ---
await client.query('begin');
try {
  const o = await client.query(`insert into public.organisations(raison_sociale) values('CLOT') returning id`);
  const org = o.rows[0].id;
  const c = await client.query(`insert into public.clients(organisation_id, nom) values($1,'C') returning id`, [org]);
  const s = await client.query(
    `insert into public.sites(organisation_id, client_id, adresse) values($1,$2,'A') returning id`,
    [org, c.rows[0].id],
  );
  await client.query('set local role authenticated');
  await client.query(`select set_config('request.jwt.claims', $1, true)`, [
    JSON.stringify({ org_id: org, app_role: 'admin', sub: '00000000-0000-4000-8000-00000000000c' }),
  ]);
  const i = await client.query(
    `insert into public.interventions(organisation_id, site_id, status) values($1,$2,'PLANIFIEE') returning id`,
    [org, s.rows[0].id],
  );
  const r = await client.query(`select public.rpc_clore_intervention($1, null, 2.0) as res`, [i.rows[0].id]);
  await client.query('reset role');
  const res = r.rows[0].res;
  if (res?.numero && res?.type === 'BSMV') {
    ok(`clôture RPC : bordereau ${res.numero} (EMIS) généré`);
  } else {
    ko('clôture RPC', JSON.stringify(res));
  }
} catch (e) {
  ko('clôture RPC (erreur)', e.message);
} finally {
  await client.query('rollback');
}

// --- Test 6 : facturation (RPC) end-to-end ---
await client.query('begin');
try {
  const o = await client.query(`insert into public.organisations(raison_sociale) values('FACT') returning id`);
  const org = o.rows[0].id;
  const c = await client.query(`insert into public.clients(organisation_id, nom) values($1,'C') returning id`, [org]);
  const s = await client.query(
    `insert into public.sites(organisation_id, client_id, adresse) values($1,$2,'A') returning id`,
    [org, c.rows[0].id],
  );
  await client.query('set local role authenticated');
  await client.query(`select set_config('request.jwt.claims', $1, true)`, [
    JSON.stringify({ org_id: org, app_role: 'admin', sub: '00000000-0000-4000-8000-00000000000f' }),
  ]);
  const cmd = await client.query(
    `insert into public.commandes(organisation_id, client_id, site_id) values($1,$2,$3) returning id`,
    [org, c.rows[0].id, s.rows[0].id],
  );
  await client.query(
    `insert into public.commande_lignes(organisation_id, commande_id, designation, quantite, prix_ht_cents, tva_taux, ordre)
     values ($1,$2,'Vidange',1,25000,20,0),($1,$2,'Curage',2,18000,20,1)`,
    [org, cmd.rows[0].id],
  );
  const i = await client.query(
    `insert into public.interventions(organisation_id, site_id, commande_id, status) values($1,$2,$3,'PLANIFIEE') returning id`,
    [org, s.rows[0].id, cmd.rows[0].id],
  );
  const r = await client.query(`select public.rpc_facturer_intervention($1) as res`, [i.rows[0].id]);
  await client.query('reset role');
  const res = r.rows[0].res;
  if (res?.numero?.startsWith('F-') && Number(res.ttc_cents) === 73200) {
    ok(`facturation RPC : ${res.numero} TTC ${(Number(res.ttc_cents) / 100).toFixed(2)} €`);
  } else {
    ko('facturation RPC', JSON.stringify(res));
  }
} catch (e) {
  ko('facturation RPC (erreur)', e.message);
} finally {
  await client.query('rollback');
}

// --- Test 7 : portail de réservation (anon via RPC + isolation) ---
await client.query('begin');
try {
  await client.query(
    `insert into public.organisations(id, raison_sociale, slug) values ($1,'Org A','org-a-resa'),($2,'Org B','org-b-resa')`,
    [ORG_A, ORG_B],
  );
  // anon crée une demande via la RPC (résolution par slug)
  await client.query('set local role anon');
  const ins = await client.query(
    `select public.rpc_creer_demande_reservation('org-a-resa','Prospect','0600000000',null,'1 rue', 2.5, 44.3,'FOSSE_TOUTES_EAUX','demain','msg','') as id`,
  );
  const spam = await client.query(
    `select public.rpc_creer_demande_reservation('org-a-resa','Bot','x',null,null,null,null,null,null,null,'rempli') as id`,
  );
  let anonReadBlocked = false;
  let anonN = -1;
  await client.query('savepoint sa');
  try {
    const ar = await client.query(`select count(*)::int as n from public.demandes_reservation`);
    anonN = ar.rows[0].n;
  } catch {
    anonReadBlocked = true;
    await client.query('rollback to savepoint sa');
  }
  await client.query('reset role');

  if (ins.rows[0].id) ok('réservation : anon crée une demande via RPC (slug)');
  else ko('réservation anon insert', 'aucun id renvoyé');
  if (spam.rows[0].id === null) ok('réservation : honeypot rempli => demande ignorée');
  else ko('réservation honeypot', 'non ignoré');
  if (anonReadBlocked || anonN === 0) ok('réservation : anon ne peut pas lire la table');
  else ko('réservation anon read', `${anonN} ligne(s)`);

  // Isolation : org A voit sa demande, org B non.
  await client.query('set local role authenticated');
  await client.query(`select set_config('request.jwt.claims', $1, true)`, [
    JSON.stringify({ org_id: ORG_A, app_role: 'admin', sub: '00000000-0000-4000-8000-0000000000a1' }),
  ]);
  const aSees = await client.query(`select count(*)::int as n from public.demandes_reservation`);
  await client.query(`select set_config('request.jwt.claims', $1, true)`, [
    JSON.stringify({ org_id: ORG_B, app_role: 'admin', sub: '00000000-0000-4000-8000-0000000000b1' }),
  ]);
  const bSees = await client.query(`select count(*)::int as n from public.demandes_reservation`);
  await client.query('reset role');
  if (aSees.rows[0].n === 1) ok('réservation : org A voit sa demande');
  else ko('réservation org A', aSees.rows[0].n);
  if (bSees.rows[0].n === 0) ok('réservation : org B ne voit pas la demande de A');
  else ko('réservation isolation', bSees.rows[0].n);
} catch (e) {
  ko('portail réservation (erreur)', e.message);
} finally {
  await client.query('rollback');
}

// --- Test 8 : optimisation de tournée (rejet inter-organisations) ---
await client.query('begin');
try {
  const o = await client.query(`insert into public.organisations(raison_sociale) values('OPT') returning id`);
  const org = o.rows[0].id;
  const cam = await client.query(
    `insert into public.camions(organisation_id, immatriculation, type, capacite_citerne_m3) values($1,'AA-001-AA','citerne_simple',8) returning id`,
    [org],
  );
  const t = await client.query(
    `insert into public.tournees(organisation_id, camion_id, date_tournee) values($1,$2,current_date) returning id`,
    [org, cam.rows[0].id],
  );
  const c = await client.query(`insert into public.clients(organisation_id, nom) values($1,'C') returning id`, [org]);
  const s = await client.query(
    `insert into public.sites(organisation_id, client_id, adresse) values($1,$2,'A') returning id`,
    [org, c.rows[0].id],
  );
  const i = await client.query(
    `insert into public.interventions(organisation_id, site_id, tournee_id, status, ordre_passage) values($1,$2,$3,'PLANIFIEE',1) returning id`,
    [org, s.rows[0].id, t.rows[0].id],
  );
  await client.query('set local role authenticated');
  await client.query(`select set_config('request.jwt.claims', $1, true)`, [
    JSON.stringify({ org_id: ORG_B, app_role: 'admin', sub: '00000000-0000-4000-8000-0000000000c2' }),
  ]);
  let rejected = false;
  await client.query('savepoint so');
  try {
    await client.query(`select public.rpc_optimiser_tournee($1, array[$2]::uuid[])`, [t.rows[0].id, i.rows[0].id]);
  } catch {
    rejected = true;
    await client.query('rollback to savepoint so');
  }
  await client.query('reset role');
  if (rejected) ok('2-opt : optimiser la tournée d’une autre organisation est rejeté');
  else ko('2-opt cross-org', 'acceptée');
} catch (e) {
  ko('2-opt cross-org (erreur)', e.message);
} finally {
  await client.query('rollback');
}

// --- Test 9 : traitement d'une demande (cloisonnement) ---
await client.query('begin');
try {
  const o = await client.query(
    `insert into public.organisations(raison_sociale, slug) values('TRAIT','traite-slug') returning id`,
  );
  const org = o.rows[0].id;
  const d = await client.query(
    `insert into public.demandes_reservation(organisation_id, contact_nom, statut) values($1,'X','nouvelle') returning id`,
    [org],
  );
  await client.query('set local role authenticated');
  await client.query(`select set_config('request.jwt.claims', $1, true)`, [
    JSON.stringify({ org_id: ORG_B, app_role: 'admin', sub: '00000000-0000-4000-8000-0000000000d3' }),
  ]);
  await client.query(`select public.rpc_traiter_demande($1,'traitee')`, [d.rows[0].id]);
  await client.query('reset role');
  const after = await client.query(`select statut from public.demandes_reservation where id=$1`, [d.rows[0].id]);
  if (after.rows[0].statut === 'nouvelle') ok('réservation : org B ne peut pas traiter la demande de A');
  else ko('traiter cross-org', after.rows[0].statut);
} catch (e) {
  ko('traiter cross-org (erreur)', e.message);
} finally {
  await client.query('rollback');
}

// --- Test 10 : traitement d'une demande réservé au bureau (rôle) ---
await client.query('begin');
try {
  const o = await client.query(
    `insert into public.organisations(raison_sociale, slug) values('ROLE','role-slug') returning id`,
  );
  const org = o.rows[0].id;
  const d = await client.query(
    `insert into public.demandes_reservation(organisation_id, contact_nom, statut) values($1,'X','nouvelle') returning id`,
    [org],
  );
  await client.query('set local role authenticated');
  // Chauffeur de la MÊME organisation : ne doit pas pouvoir traiter.
  await client.query(`select set_config('request.jwt.claims', $1, true)`, [
    JSON.stringify({ org_id: org, app_role: 'chauffeur', sub: '00000000-0000-4000-8000-0000000000e4' }),
  ]);
  let rejected = false;
  await client.query('savepoint sr');
  try {
    await client.query(`select public.rpc_traiter_demande($1,'traitee')`, [d.rows[0].id]);
  } catch {
    rejected = true;
    await client.query('rollback to savepoint sr');
  }
  await client.query('reset role');
  const after = await client.query(`select statut from public.demandes_reservation where id=$1`, [d.rows[0].id]);
  if (rejected && after.rows[0].statut === 'nouvelle') {
    ok('réservation : un chauffeur ne peut pas traiter une demande (rôle bureau requis)');
  } else {
    ko('traiter rôle', `rejected=${rejected} statut=${after.rows[0].statut}`);
  }
} catch (e) {
  ko('traiter rôle (erreur)', e.message);
} finally {
  await client.query('rollback');
}

await client.end();

if (failures.length) {
  console.log(`\n❌ ${failures.length} test(s) en échec`);
  process.exit(1);
}
console.log('\n✅ Tests de sécurité DB : tous passés');
