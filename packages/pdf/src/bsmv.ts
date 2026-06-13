import { Layout, C, M, CONTENT_RIGHT, CONTENT_W, showOr } from './layout.js';
import type { BordereauData } from '@bordero/core';

const VOLETS = ['Volet propriétaire', 'Volet vidangeur (registre)', "Volet filière d'élimination"];

const ROW_H = 11;
const PAD = 8;

function section(L: Layout, titre: string, lignes: Array<[string, string | number | null | undefined]>): void {
  const top = L.y;
  L.nl(PAD);
  L.txt(titre.toUpperCase(), { x: M + PAD, size: 8, b: true, color: C.petrol });
  L.nl(ROW_H + 1);
  for (const [label, value] of lignes) {
    L.txt(label, { x: M + PAD, size: 9, color: C.mute });
    L.txt(showOr(value), { x: M + PAD + 135, size: 9, b: true });
    L.nl(ROW_H);
  }
  L.nl(PAD - ROW_H + 2);
  L.rect(M, CONTENT_W, top - L.y, { yTop: top, border: C.line, borderW: 1 });
  L.nl(10);
}

/** Génère le PDF d'un bordereau BSMV (3 volets) et renvoie le Buffer. */
export async function renderBsmvPdf(data: BordereauData): Promise<Buffer> {
  const L = await Layout.create();
  L.setTitle(data.numero);
  const dateLisible = new Date(data.dateIso).toLocaleString('fr-FR');

  for (const volet of VOLETS) {
    L.newPage();

    L.txt('Bordereau de suivi des matières de vidange', { size: 14, b: true, color: C.petrol });
    L.rtxt(data.numero, CONTENT_RIGHT, { size: 11, b: true });
    L.nl(15);
    L.txt('Arrêté du 7 septembre 2009 modifié', { size: 8, color: C.mute });
    L.rtxt(dateLisible, CONTENT_RIGHT, { size: 8, color: C.mute });
    L.nl(12);
    L.txt(volet, { size: 8, b: true, color: C.petrol });
    L.nl(18);

    section(L, 'Vidangeur agréé', [
      ['Raison sociale', data.vidangeur.raisonSociale],
      ['SIRET', data.vidangeur.siret],
      ["N° d'agrément", data.vidangeur.numeroAgrement],
      ['Département', data.vidangeur.departement],
      ['Immatriculation', data.vidangeur.immatriculation],
    ]);
    section(L, 'Installation vidangée', [
      ['Propriétaire', data.installation.proprietaireNom],
      ['Adresse propriétaire', data.installation.proprietaireAdresse],
      ['Adresse installation', data.installation.adresseInstallation],
      ["Type d'ouvrage", data.installation.typeOuvrage],
      ['Volume (litres)', data.installation.volumeLitres],
    ]);
    section(L, 'Matières', [
      ['Nature', data.matiere.nature],
      ['Quantité pompée (m³)', data.matiere.quantitePompeeM3],
    ]);
    section(L, "Destination (filière d'élimination)", [
      ['Exutoire', data.destination.exutoireRaisonSociale],
      ['Adresse', data.destination.exutoireAdresse],
      ['Quantité dépotée (m³)', data.destination.quantiteDepoteeM3],
    ]);

    // Cartouches de signature
    L.nl(14);
    const colW = CONTENT_W / 3;
    const labels = ['Le propriétaire', 'Le vidangeur', "La filière d'élimination"];
    const sigTop = L.y;
    labels.forEach((_, i) => {
      const x = M + i * colW;
      L.page.drawLine({ start: { x, y: sigTop }, end: { x: x + colW - 14, y: sigTop }, thickness: 1, color: C.slate });
    });
    L.nl(12);
    labels.forEach((lab, i) => {
      L.txt(lab, { x: M + i * colW, size: 8 });
    });

    // Pied de page centré
    const footer = `Bordero — document réglementaire, conservation 10 ans. ${data.numero}`;
    const fx = (CONTENT_RIGHT + M) / 2 - L.widthOf(footer, 7) / 2;
    L.page.drawText(footer, { x: fx, y: 28, size: 7, color: C.slate });
  }

  return L.toBuffer();
}
