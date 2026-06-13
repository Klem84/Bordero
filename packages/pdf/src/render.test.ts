import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { construireDonneesBordereau, type ConstruireBordereauInput } from '@bordero/core';
import { renderBsmvPdf, renderFacturePdf, type FactureData } from './index.js';

const bordereau: ConstruireBordereauInput = {
  numero: 'BSMV-2026-00001',
  classification: 'MATIERES_VIDANGE_ANC',
  dateIso: '2026-06-12T10:00:00.000Z',
  vidangeur: { raisonSociale: 'Vidanges Démo', siret: '90000000000017', numeroAgrement: 'AG-12-001', departement: '12', immatriculation: 'AA-123-BB' },
  installation: { proprietaireNom: 'Martin Dupont', proprietaireAdresse: 'Rodez', adresseInstallation: 'Rodez', typeOuvrage: 'FOSSE_TOUTES_EAUX', volumeLitres: 3000 },
  matiere: { nature: 'Matières de vidange', quantitePompeeM3: 2.5 },
  destination: { exutoireRaisonSociale: 'STEP Rodez', exutoireAdresse: 'Rodez', quantiteDepoteeM3: null },
};

const facture: FactureData = {
  numero: 'F-2026-00001',
  dateIso: '2026-06-12T10:00:00.000Z',
  echeanceIso: '2026-07-12T10:00:00.000Z',
  organisation: { raisonSociale: 'Vidanges Démo', siret: '90000000000017', adresse: 'Rodez' },
  client: { nom: 'Martin Dupont', adresse: 'Rodez' },
  lignes: [{ designation: 'Vidange fosse', quantite: 1, puHtCents: 25000, tvaTaux: 20 }],
  totalHtCents: 25000,
  totalTvaCents: 5000,
  totalTtcCents: 30000,
};

const isPdf = (buf: Buffer) => buf.subarray(0, 4).toString('latin1') === '%PDF';

describe('génération PDF', () => {
  it('produit un BSMV PDF valide', async () => {
    const buf = await renderBsmvPdf(construireDonneesBordereau(bordereau));
    expect(buf.length).toBeGreaterThan(1000);
    expect(isPdf(buf)).toBe(true);
  }, 30000);

  it('produit une facture PDF valide', async () => {
    const buf = await renderFacturePdf(facture);
    expect(buf.length).toBeGreaterThan(1000);
    expect(isPdf(buf)).toBe(true);
  }, 30000);

  it('le BSMV fait 3 volets (3 pages)', async () => {
    const buf = await renderBsmvPdf(construireDonneesBordereau(bordereau));
    const doc = await PDFDocument.load(buf);
    expect(doc.getPageCount()).toBe(3);
  }, 30000);

  it('le BSDD est un exemplaire interne (1 page) titré déchets dangereux', async () => {
    const buf = await renderBsmvPdf(
      construireDonneesBordereau({ ...bordereau, classification: 'DECHET_DANGEREUX' }),
    );
    const doc = await PDFDocument.load(buf);
    expect(doc.getPageCount()).toBe(1);
    expect(doc.getTitle()).toContain('déchets dangereux');
  }, 30000);

  it('le bon de prestation fait 1 page', async () => {
    const buf = await renderBsmvPdf(
      construireDonneesBordereau({ ...bordereau, classification: 'DECHET_NON_DANGEREUX_HORS_ANC' }),
    );
    const doc = await PDFDocument.load(buf);
    expect(doc.getPageCount()).toBe(1);
  }, 30000);
});
