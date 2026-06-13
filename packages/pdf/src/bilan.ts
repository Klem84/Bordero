import { Layout, C, M, CONTENT_RIGHT, CONTENT_W } from './layout.js';
import type { BilanAgregats } from '@bordero/core';

export interface BilanData {
  annee: number;
  organisation: { raisonSociale: string; siret: string | null };
  agrement: { numero: string | null; departement: string | null };
  agregats: BilanAgregats;
  generatedAtIso: string;
}

// Bords droits des deux colonnes numériques.
const COL2 = CONTENT_RIGHT; // dernière colonne (volume)
const COL1 = CONTENT_RIGHT - 100; // avant-dernière (nombre)

function sectionTitle(L: Layout, t: string): void {
  L.nl(14);
  L.txt(t, { size: 10, b: true, color: C.petrol });
  L.nl(13);
}

function headRow(L: Layout, cells: Array<[string, number | null]>): void {
  // cells: [libellé, bordDroit|null pour la 1re colonne calée à gauche]
  L.rect(M, CONTENT_W, 16, { fill: C.head });
  L.nl(4);
  for (const [txt, right] of cells) {
    if (right === null) L.txt(txt, { x: M + 4, size: 9, b: true });
    else L.rtxt(txt, right - 4, { size: 9, b: true });
  }
  L.nl(12);
}

function dataRow(L: Layout, left: string, vals: Array<[string, number]>): void {
  L.txt(L.ellipsize(left, 300, 9), { x: M + 4, size: 9 });
  for (const [txt, right] of vals) L.rtxt(txt, right - 4, { size: 9 });
  L.nl(7);
  L.hline(C.line2);
  L.nl(8);
}

/** Génère le PDF du bilan annuel préfectoral et renvoie le Buffer. */
export async function renderBilanPdf(data: BilanData): Promise<Buffer> {
  const a = data.agregats;
  const L = await Layout.create();
  L.setTitle(`Bilan ${data.annee}`);
  L.newPage();

  L.txt(`Bilan annuel d'activité ${data.annee}`, { size: 15, b: true, color: C.petrol });
  L.nl(15);
  L.txt(
    `${data.organisation.raisonSociale} · SIRET ${data.organisation.siret ?? '—'} · Agrément ${
      data.agrement.numero ?? '—'
    } (${data.agrement.departement ?? '—'})`,
    { size: 9, color: C.mute },
  );
  L.nl(10);

  sectionTitle(L, 'Installations entretenues par commune');
  headRow(L, [
    ['Commune', null],
    ['Installations', COL1],
    ['Volume (m³)', COL2],
  ]);
  for (const c of a.installationsParCommune) {
    dataRow(L, c.commune, [
      [String(c.nbInstallations), COL1],
      [c.volumeM3.toFixed(1), COL2],
    ]);
  }

  sectionTitle(L, "Quantités par filière d'élimination");
  headRow(L, [
    ['Exutoire', null],
    ['Volume (m³)', COL2],
  ]);
  for (const f of a.volumesParFiliere) {
    dataRow(L, f.exutoire, [[f.volumeM3.toFixed(1), COL2]]);
  }

  sectionTitle(L, 'Synthèse');
  dataRow(L, 'Total pompé', [[`${a.totalPompeM3.toFixed(1)} m³`, COL2]]);
  dataRow(L, 'Total dépoté', [[`${a.totalDepoteM3.toFixed(1)} m³`, COL2]]);

  // Bandeau de contrôle (vert si complet, rouge sinon)
  L.nl(8);
  const complet = a.controles.complet;
  const message = complet
    ? 'Bilan complet : tous les bordereaux sont bouclés et cohérents.'
    : `À régulariser : ${a.controles.bordereauxNonBoucles} bordereau(x) non bouclé(s), écart pompé/dépoté ${a.controles.ecartPompeDepotePct} %${a.controles.depassementQuota ? ', dépassement de quota' : ''}.`;
  L.rect(M, CONTENT_W, 24, { fill: complet ? C.okBg : C.koBg });
  L.nl(8);
  L.txt(L.ellipsize(message, CONTENT_W - 16, 8), { x: M + 8, size: 8, color: complet ? C.okFg : C.koFg });
  L.nl(20);

  L.txt(`Document généré par Bordero le ${new Date(data.generatedAtIso).toLocaleString('fr-FR')}.`, {
    size: 7,
    color: C.slate,
  });

  return L.toBuffer();
}
