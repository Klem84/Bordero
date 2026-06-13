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
  // Reset de l'org de démo (cascade sur toutes les données liées). Les triggers
  // d'immuabilité (RG-2.1) bloquent la suppression des bordereaux/factures émis :
  // on les désactive le temps du reset (connexion postgres superuser). Les triggers
  // FK système restent actifs, donc le ON DELETE CASCADE fonctionne.
  await client.query('alter table public.bordereaux disable trigger user');
  await client.query('alter table public.factures disable trigger user');
  await client.query('alter table public.facture_lignes disable trigger user');
  await client.query('delete from public.organisations where id = $1', [DEMO_ORG]);
  await client.query('alter table public.bordereaux enable trigger user');
  await client.query('alter table public.factures enable trigger user');
  await client.query('alter table public.facture_lignes enable trigger user');

  await client.query(
    `insert into public.organisations(id, raison_sociale, siret, adresse, slug)
     values ($1, 'Vidanges Démo Aveyron', '90000000000017', '12 route de Rodez, 12000 Onet-le-Château', 'vidanges-demo-aveyron')`,
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
  const prestationIds = {};
  for (const [libelle, base, urg, we, forfait, m3sup, duree, classif] of prestations) {
    const p = await client.query(
      `insert into public.prestations(organisation_id, libelle, prix_base_cents, majoration_urgence_pct,
         majoration_weekend_pct, volume_forfait_m3, prix_m3_supplementaire_cents, duree_standard_min,
         classification_dechet, ordre)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id`,
      [DEMO_ORG, libelle, base, urg, we, forfait, m3sup, duree, classif, ordre++],
    );
    prestationIds[libelle] = p.rows[0].id;
  }

  // Clients + sites (géolocalisés autour de Rodez) + ouvrages
  const clients = [
    ['particulier', 'Martin Dupont', '06 12 34 56 78', null, '8 chemin des Prés, 12000 Rodez', 2.5736, 44.3506, 'FOSSE_TOUTES_EAUX', 3000],
    ['particulier', 'Sophie Laval', '06 98 76 54 32', null, '15 rue du Ségala, 12850 Onet-le-Château', 2.5489, 44.3712, 'FOSSE_SEPTIQUE', 4000],
    ['professionnel', 'Restaurant Le Causse', '05 65 11 22 33', 'contact@lecausse.fr', '3 place de la Cité, 12000 Rodez', 2.5751, 44.3491, 'BAC_A_GRAISSE', 500],
    ['professionnel', 'Garage Aveyron Auto', '05 65 44 55 66', null, "ZA de Bel Air, 12510 Olemps", 2.5402, 44.3338, 'SEPARATEUR_HYDROCARBURES', 2000],
  ];
  const demoClients = [];
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
    // Date de dernière intervention calée pour que l'échéance (= dernière +
    // périodicité, posée par le trigger) illustre la récurrence : en retard,
    // proche, ou à jour selon l'ouvrage.
    const addMonths = (d, n) => {
      const x = new Date(d);
      x.setMonth(x.getMonth() + n);
      return x;
    };
    const addDays = (d, n) => {
      const x = new Date(d);
      x.setDate(x.getDate() + n);
      return x;
    };
    const isoDay = (d) => d.toISOString().slice(0, 10);
    const now0 = new Date();
    const echCible = {
      BAC_A_GRAISSE: addMonths(now0, -4), // en retard
      SEPARATEUR_HYDROCARBURES: addMonths(now0, -6), // en retard
      FOSSE_TOUTES_EAUX: addDays(now0, 25), // proche (sous 6 semaines)
      FOSSE_SEPTIQUE: addMonths(now0, 18), // à jour
    };
    const derniere = isoDay(addMonths(echCible[ouvrageType] ?? addMonths(now0, -4), -periodicite));
    const o = await client.query(
      `insert into public.ouvrages(organisation_id, site_id, type, volume_nominal_litres, periodicite_mois, date_derniere_intervention)
       values ($1,$2,$3,$4,$5,$6) returning id`,
      [DEMO_ORG, sid, ouvrageType, volume, periodicite, derniere],
    );
    demoClients.push({ cid, sid, oid: o.rows[0].id, nom, ouvrageType });
  }

  // Parc de camions (capacité citerne pour le planning)
  const camions = [
    ['AV-742-RZ', 'hydrocureur', 12],
    ['BX-318-VG', 'citerne_simple', 8],
    ['CD-905-AY', 'combine', 6],
  ];
  const camionIds = [];
  for (const [immat, typeCam, capacite] of camions) {
    const cam = await client.query(
      `insert into public.camions(organisation_id, immatriculation, type, capacite_citerne_m3,
         controle_technique_echeance, adr_validite, actif)
       values ($1,$2,$3,$4, current_date + interval '8 months', current_date + interval '14 months', true)
       returning id`,
      [DEMO_ORG, immat, typeCam, capacite],
    );
    camionIds.push(cam.rows[0].id);
  }

  // Exutoire (filière d'élimination) pour la clôture des bordereaux
  const exutoireRes = await client.query(
    `insert into public.exutoires(organisation_id, raison_sociale, type, adresse)
     values ($1,'STEP de Rodez Agglomération','station_epuration','Route de Sébazac, 12000 Rodez')
     returning id`,
    [DEMO_ORG],
  );
  const exutoireId = exutoireRes.rows[0].id;

  // Interventions de démonstration pour le planning.
  // Quelques-unes en file d'attente (BROUILLON, sans tournée), d'autres déjà
  // affectées aux tournées du jour et du lendemain.
  const fmtDate = (d) => d.toISOString().slice(0, 10);
  const _today = new Date();
  const _tomorrow = new Date();
  _tomorrow.setDate(_tomorrow.getDate() + 1);
  const TODAY = fmtDate(_today);
  const TOMORROW = fmtDate(_tomorrow);

  const presta = (libelle) => prestationIds[libelle];
  const prestaForOuvrage = (t) =>
    t === 'BAC_A_GRAISSE'
      ? 'Pompage bac à graisse'
      : t === 'SEPARATEUR_HYDROCARBURES'
        ? 'Nettoyage séparateur hydrocarbures'
        : 'Vidange fosse toutes eaux';

  async function creerIntervention({ dc, urgence = false, date = null, camionIdx = null, ordrePassage = null }) {
    const cmd = await client.query(
      `insert into public.commandes(organisation_id, client_id, site_id, urgence)
       values ($1,$2,$3,$4) returning id`,
      [DEMO_ORG, dc.cid, dc.sid, urgence],
    );
    const cmdId = cmd.rows[0].id;
    const libelle = prestaForOuvrage(dc.ouvrageType);
    await client.query(
      `insert into public.commande_lignes(organisation_id, commande_id, prestation_id, designation, quantite, prix_ht_cents)
       values ($1,$2,$3,$4,1,25000)`,
      [DEMO_ORG, cmdId, presta(libelle), libelle],
    );

    let tourneeId = null;
    if (date && camionIdx != null) {
      const t = await client.query(
        `insert into public.tournees(organisation_id, camion_id, date_tournee)
         values ($1,$2,$3)
         on conflict (organisation_id, camion_id, date_tournee) do update set updated_at = now()
         returning id`,
        [DEMO_ORG, camionIds[camionIdx], date],
      );
      tourneeId = t.rows[0].id;
    }
    const status = tourneeId ? 'PLANIFIEE' : 'BROUILLON';
    const intv = await client.query(
      `insert into public.interventions(organisation_id, commande_id, site_id, status, urgence,
         tournee_id, camion_id, date_prevue, ordre_passage)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id`,
      [
        DEMO_ORG,
        cmdId,
        dc.sid,
        status,
        urgence,
        tourneeId,
        tourneeId ? camionIds[camionIdx] : null,
        date,
        ordrePassage,
      ],
    );
    await client.query(
      `insert into public.intervention_ouvrages(organisation_id, intervention_id, ouvrage_id)
       values ($1,$2,$3)`,
      [DEMO_ORG, intv.rows[0].id, dc.oid],
    );
    return intv.rows[0].id;
  }

  // File d'attente (à planifier)
  await creerIntervention({ dc: demoClients[0], urgence: true });
  await creerIntervention({ dc: demoClients[2] });
  await creerIntervention({ dc: demoClients[3] });
  // Tournée du jour, camion 1 (demoClients[1] = Onet-le-Château, relié à un bordereau)
  const intvOnet = await creerIntervention({ dc: demoClients[1], date: TODAY, camionIdx: 0, ordrePassage: 1 });
  await creerIntervention({ dc: demoClients[2], date: TODAY, camionIdx: 0, ordrePassage: 2 });
  // Tournée du jour, camion 2 (demoClients[3] = Olemps)
  const intvOlemps = await creerIntervention({ dc: demoClients[3], date: TODAY, camionIdx: 1, ordrePassage: 1 });
  // Tournée du lendemain, camion 1 (demoClients[0] = Rodez)
  const intvRodez = await creerIntervention({ dc: demoClients[0], date: TOMORROW, camionIdx: 0, ordrePassage: 1 });

  // Agrément préfectoral actif (Aveyron)
  await client.query(
    `insert into public.agrements(organisation_id, departement_code, departement_libelle, numero,
       date_delivrance, date_echeance, quantite_max_annuelle_m3, statut)
     values ($1,'12','Aveyron','AG-12-001','2022-01-01','2032-01-01',500,'actif')`,
    [DEMO_ORG],
  );

  // Bordereaux bouclés de démo (alimentent le registre, la jauge de quota et le
  // bilan annuel). Reliés à une intervention/site pour que le bilan agrège par
  // commune réelle (Onet-le-Château, Olemps, Rodez) et par filière (exutoire).
  const bsmv = [
    ['BSMV-2026-90001', 2.5, intvOnet],
    ['BSMV-2026-90002', 4.0, intvOlemps],
    ['BSMV-2026-90003', 3.5, intvRodez],
  ];
  for (const [numero, q, intId] of bsmv) {
    await client.query(
      `insert into public.bordereaux(organisation_id, intervention_id, exutoire_id, type, numero, statut, nature_matiere, quantite_pompee_m3, quantite_depotee_m3)
       values ($1,$2,$3,'BSMV',$4,'BOUCLE','Matières de vidange ANC',$5,$5)`,
      [DEMO_ORG, intId, exutoireId, numero, q],
    );
  }

  // Scénario déchets dangereux (BSDD / Trackdéchets, lot 2) : on dote le garage
  // et l'exutoire d'un SIRET, et on émet un bordereau BSDD non encore transmis.
  await client.query(
    `update public.clients set siret = '34326262100025' where organisation_id = $1 and nom = 'Garage Aveyron Auto'`,
    [DEMO_ORG],
  );
  await client.query(`update public.exutoires set siret = '20000012300017' where organisation_id = $1`, [DEMO_ORG]);
  await client.query(
    `insert into public.bordereaux(organisation_id, intervention_id, exutoire_id, type, numero, statut, nature_matiere, quantite_pompee_m3, trackdechets_statut)
     values ($1, $2, $3, 'BSDD', 'BSDD-2026-90001', 'EMIS', 'Boues de séparateur à hydrocarbures', 1.2, 'NON_TRANSMIS')`,
    [DEMO_ORG, intvOlemps, exutoireId],
  );

  // Tâches bureau de démo (alimentent « Tâches à faire » du tableau de bord ;
  // en réel, créées par les relances de récurrence).
  await client.query(
    `insert into public.taches(organisation_id, type, libelle, statut, echeance, lien_type, lien_id)
     values
       ($1,'relance','Relancer Restaurant Le Causse — entretien bac à graisse','a_faire', current_date - interval '2 days','ouvrage',$2),
       ($1,'relance','Relancer Garage Aveyron Auto — séparateur hydrocarbures','a_faire', current_date + interval '5 days','ouvrage',$3)`,
    [DEMO_ORG, demoClients[2].oid, demoClients[3].oid],
  );

  // Demandes de réservation entrantes (portail public, lot 2).
  await client.query(
    `insert into public.demandes_reservation(organisation_id, contact_nom, contact_telephone, contact_email, adresse, geom, type_ouvrage, creneau_souhaite, message, source, statut)
     values
       ($1,'Boulangerie du Centre','06 22 33 44 55',null,'5 place du Bourg, 12000 Rodez', ST_SetSRID(ST_MakePoint(2.5749,44.3495),4326),'BAC_A_GRAISSE','cette semaine si possible','Bac à graisse qui déborde, intervention rapide souhaitée.','portail','nouvelle'),
       ($1,'Mairie de Sébazac',null,'technique@sebazac.fr','Place de la Mairie, 12740 Sébazac-Concourès', ST_SetSRID(ST_MakePoint(2.5847,44.4060),4326),'SEPARATEUR_HYDROCARBURES','courant du mois','Entretien annuel du séparateur du centre technique municipal.','portail','nouvelle')`,
    [DEMO_ORG],
  );

  // Facture émise de démo (pour démontrer l'encaissement Stripe en mode test).
  // Chemin conforme à l'immuabilité : brouillon -> lignes -> totaux -> émission.
  {
    const numero = 'F-2026-90001';
    const fac = await client.query(
      `insert into public.factures(organisation_id, client_id, numero, statut, echeance)
       values ($1,$2,$3,'brouillon', current_date + interval '30 days') returning id`,
      [DEMO_ORG, demoClients[2].cid, numero],
    );
    const facId = fac.rows[0].id;
    await client.query(
      `insert into public.facture_lignes(organisation_id, facture_id, designation, quantite, pu_ht_cents, tva_taux, ordre)
       values ($1,$2,'Pompage bac à graisse',1,15000,20,0)`,
      [DEMO_ORG, facId],
    );
    await client.query(
      `update public.factures set total_ht_cents=15000, total_tva_cents=3000, total_ttc_cents=18000 where id=$1`,
      [facId],
    );
    await client.query(`update public.factures set statut='emise', emise_le=now() where id=$1`, [facId]);
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
