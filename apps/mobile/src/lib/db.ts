import * as SQLite from 'expo-sqlite';
import type { InterventionState } from '@bordero/core';

/**
 * Base SQLite locale : source de vérité de l'EXÉCUTION terrain (offline-first,
 * CDC §invariant 6). Deux tables : un cache des interventions du jour (lecture)
 * et une file d'attente d'événements (outbox) à synchroniser vers le serveur.
 * Chaque événement porte un `client_event_uuid` qui garantit l'idempotence de
 * la synchronisation (algorithme A2).
 */
export interface LocalIntervention {
  id: string;
  status: InterventionState;
  date_prevue: string | null;
  urgence: number;
  ordre_passage: number | null;
  client_nom: string | null;
  site_adresse: string | null;
  fenetre: string | null;
  updated_at: string;
}

export interface OutboxEvent {
  client_event_uuid: string;
  intervention_id: string;
  type: string;
  status_from: string | null;
  status_to: string | null;
  payload: string;
  created_at: string;
  synced: number;
}

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('bordero.db');
  }
  return dbPromise;
}

export async function initDb(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
    pragma journal_mode = WAL;
    create table if not exists interventions (
      id text primary key,
      status text not null,
      date_prevue text,
      urgence integer not null default 0,
      ordre_passage integer,
      client_nom text,
      site_adresse text,
      fenetre text,
      updated_at text not null
    );
    create table if not exists outbox (
      client_event_uuid text primary key,
      intervention_id text not null,
      type text not null,
      status_from text,
      status_to text,
      payload text not null default '{}',
      created_at text not null,
      synced integer not null default 0
    );
  `);
}

export async function upsertInterventions(rows: LocalIntervention[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const r of rows) {
      await db.runAsync(
        `insert into interventions (id, status, date_prevue, urgence, ordre_passage, client_nom, site_adresse, fenetre, updated_at)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?)
         on conflict(id) do update set
           status = excluded.status,
           date_prevue = excluded.date_prevue,
           urgence = excluded.urgence,
           ordre_passage = excluded.ordre_passage,
           client_nom = excluded.client_nom,
           site_adresse = excluded.site_adresse,
           fenetre = excluded.fenetre,
           updated_at = excluded.updated_at`,
        [
          r.id,
          r.status,
          r.date_prevue,
          r.urgence,
          r.ordre_passage,
          r.client_nom,
          r.site_adresse,
          r.fenetre,
          r.updated_at,
        ],
      );
    }
  });
}

export async function getInterventionsDuJour(dateIso: string): Promise<LocalIntervention[]> {
  const db = await getDb();
  return db.getAllAsync<LocalIntervention>(
    `select * from interventions where date_prevue = ? order by ordre_passage asc, urgence desc`,
    [dateIso],
  );
}

export async function getIntervention(id: string): Promise<LocalIntervention | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<LocalIntervention>(
    `select * from interventions where id = ?`,
    [id],
  );
  return row ?? null;
}

/** Met à jour le statut localement et empile l'événement de transition. */
export async function appliquerStatutLocal(params: {
  interventionId: string;
  from: InterventionState;
  to: InterventionState;
  payload?: Record<string, unknown>;
}): Promise<void> {
  const db = await getDb();
  const nowIso = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync(`update interventions set status = ?, updated_at = ? where id = ?`, [
      params.to,
      nowIso,
      params.interventionId,
    ]);
    await db.runAsync(
      `insert into outbox (client_event_uuid, intervention_id, type, status_from, status_to, payload, created_at, synced)
       values (?, ?, 'transition', ?, ?, ?, ?, 0)`,
      [
        uuidV4(),
        params.interventionId,
        params.from,
        params.to,
        JSON.stringify(params.payload ?? {}),
        nowIso,
      ],
    );
  });
}

/** Empile un relevé terrain (volume pompé, observations, prochaine vidange). */
export async function enregistrerReleveLocal(params: {
  interventionId: string;
  ouvrageId: string | null;
  volumeM3: number | null;
  observations: string | null;
  prochaineDate: string | null;
}): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `insert into outbox (client_event_uuid, intervention_id, type, status_from, status_to, payload, created_at, synced)
     values (?, ?, 'releve', null, null, ?, ?, 0)`,
    [
      uuidV4(),
      params.interventionId,
      JSON.stringify({
        ouvrage_id: params.ouvrageId,
        volume_m3: params.volumeM3,
        observations: params.observations,
        prochaine_date: params.prochaineDate,
      }),
      new Date().toISOString(),
    ],
  );
}

/** Empile la signature / preuve d'intervention (nom du signataire ou client absent). */
export async function enregistrerSignatureLocal(params: {
  interventionId: string;
  signataireNom: string | null;
  clientAbsent: boolean;
}): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `insert into outbox (client_event_uuid, intervention_id, type, status_from, status_to, payload, created_at, synced)
     values (?, ?, 'signature', null, null, ?, ?, 0)`,
    [
      uuidV4(),
      params.interventionId,
      JSON.stringify({ signataire_nom: params.signataireNom, client_absent: params.clientAbsent }),
      new Date().toISOString(),
    ],
  );
}

export async function getEvenementsEnAttente(): Promise<OutboxEvent[]> {
  const db = await getDb();
  return db.getAllAsync<OutboxEvent>(
    `select * from outbox where synced = 0 order by created_at asc`,
  );
}

export async function marquerSynchronise(uuids: string[]): Promise<void> {
  if (uuids.length === 0) return;
  const db = await getDb();
  const placeholders = uuids.map(() => '?').join(',');
  await db.runAsync(`update outbox set synced = 1 where client_event_uuid in (${placeholders})`, uuids);
}

export async function compterEnAttente(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>(`select count(*) as n from outbox where synced = 0`);
  return row?.n ?? 0;
}

/** UUID v4 (suffisant pour une clé d'idempotence locale). */
export function uuidV4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
