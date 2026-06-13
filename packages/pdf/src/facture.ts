import { Layout, C, M, CONTENT_RIGHT, CONTENT_W, euros, showOr } from './layout.js';

export interface FactureLigneData {
  designation: string;
  quantite: number;
  puHtCents: number;
  tvaTaux: number;
}

export interface FactureData {
  numero: string;
  dateIso: string;
  echeanceIso: string | null;
  organisation: { raisonSociale: string; siret: string | null; adresse: string | null };
  client: { nom: string; adresse: string | null };
  lignes: FactureLigneData[];
  totalHtCents: number;
  totalTvaCents: number;
  totalTtcCents: number;
}

// Bords droits des colonnes numériques (Qté, PU HT, TVA, Total HT).
const COL = { qte: 330, pu: 410, tva: 470, total: CONTENT_RIGHT };

/** Génère le PDF d'une facture et renvoie le Buffer. */
export async function renderFacturePdf(data: FactureData): Promise<Buffer> {
  const L = await Layout.create();
  L.setTitle(`Facture ${data.numero}`);
  L.newPage();

  // En-tête : émetteur à gauche, facture à droite
  L.txt(data.organisation.raisonSociale, { size: 16, b: true, color: C.petrol });
  L.rtxt(`Facture ${data.numero}`, CONTENT_RIGHT, { size: 13, b: true });
  L.nl(16);
  L.txt(showOr(data.organisation.adresse), { size: 8, color: C.mute });
  L.rtxt(`Date : ${new Date(data.dateIso).toLocaleDateString('fr-FR')}`, CONTENT_RIGHT, { size: 8, color: C.mute });
  L.nl(11);
  L.txt(`SIRET ${data.organisation.siret ?? '—'}`, { size: 8, color: C.mute });
  if (data.echeanceIso) {
    L.rtxt(`Échéance : ${new Date(data.echeanceIso).toLocaleDateString('fr-FR')}`, CONTENT_RIGHT, {
      size: 8,
      color: C.mute,
    });
  }
  L.nl(30);

  // Destinataire
  L.txt('Facturé à', { size: 8, color: C.mute });
  L.nl(12);
  L.txt(data.client.nom, { size: 9, b: true });
  L.nl(11);
  L.txt(showOr(data.client.adresse), { size: 8, color: C.mute });
  L.nl(24);

  // En-tête de tableau
  L.rect(M, CONTENT_W, 18, { fill: C.head });
  L.nl(5);
  L.txt('Désignation', { x: M + 6, size: 9, b: true });
  L.rtxt('Qté', COL.qte, { size: 9, b: true });
  L.rtxt('PU HT', COL.pu, { size: 9, b: true });
  L.rtxt('TVA', COL.tva, { size: 9, b: true });
  L.rtxt('Total HT', COL.total - 4, { size: 9, b: true });
  L.nl(13);

  // Lignes
  for (const l of data.lignes) {
    L.txt(L.ellipsize(l.designation, 230, 9), { x: M + 6, size: 9 });
    L.rtxt(String(l.quantite), COL.qte, { size: 9 });
    L.rtxt(euros(l.puHtCents), COL.pu, { size: 9 });
    L.rtxt(`${l.tvaTaux} %`, COL.tva, { size: 9 });
    L.rtxt(euros(l.puHtCents * l.quantite), COL.total - 4, { size: 9 });
    L.nl(8);
    L.hline(C.line2);
    L.nl(9);
  }

  // Totaux (bloc aligné à droite)
  L.nl(8);
  const tl = CONTENT_RIGHT - 200;
  L.txt('Total HT', { x: tl, size: 9 });
  L.rtxt(euros(data.totalHtCents), CONTENT_RIGHT, { size: 9 });
  L.nl(13);
  L.txt('TVA', { x: tl, size: 9 });
  L.rtxt(euros(data.totalTvaCents), CONTENT_RIGHT, { size: 9 });
  L.nl(8);
  L.hline(C.line, 1, tl, CONTENT_RIGHT);
  L.nl(9);
  L.txt('Total TTC', { x: tl, size: 11, b: true, color: C.petrol });
  L.rtxt(euros(data.totalTtcCents), CONTENT_RIGHT, { size: 11, b: true, color: C.petrol });

  return L.toBuffer();
}
