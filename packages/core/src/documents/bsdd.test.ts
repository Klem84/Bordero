import { describe, expect, it } from 'vitest';
import { construireBsddInput, bsddTransmissible, type ConstruireBsddInput } from './bsdd.js';

const base: ConstruireBsddInput = {
  reference: 'BSDD-2026-00001',
  natureDechet: 'Boues de séparateur à hydrocarbures',
  quantiteTonnes: 1.2,
  producteur: {
    siret: '11111111100011',
    nom: 'Garage Aveyron Auto',
    adresse: 'ZA de Bel Air, 12510 Olemps',
    contact: 'Gérant',
    telephone: '0565445566',
    email: null,
  },
  transporteur: {
    siret: '90000000000017',
    nom: 'Vidanges Démo Aveyron',
    adresse: 'Onet-le-Château',
    contact: null,
    telephone: null,
    email: null,
    recepisse: 'REC-12-2024',
    departement: '12',
  },
  destinataire: {
    siret: '22222222200022',
    nom: 'STEP de Rodez',
    adresse: 'Rodez',
    contact: null,
    telephone: null,
    email: null,
  },
};

describe('construireBsddInput', () => {
  it('mappe producteur, transporteur et destinataire vers la structure Trackdéchets', () => {
    const out = construireBsddInput(base);
    expect(out.customId).toBe('BSDD-2026-00001');
    expect(out.emitter.type).toBe('PRODUCER');
    expect(out.emitter.company.siret).toBe('11111111100011');
    expect(out.transporter.company.siret).toBe('90000000000017');
    expect(out.recipient.company.name).toBe('STEP de Rodez');
  });

  it('applique les défauts métier (code déchet, opération, conditionnement)', () => {
    const out = construireBsddInput(base);
    expect(out.wasteDetails.code).toBe('13 05 02*');
    expect(out.recipient.processingOperation).toBe('D15');
    expect(out.wasteDetails.packagingInfos[0]!.type).toBe('CITERNE');
    expect(out.wasteDetails.quantity).toBe(1.2);
    expect(out.wasteDetails.quantityType).toBe('ESTIMATED');
  });

  it('respecte les surcharges (code, opération, conditionnement)', () => {
    const out = construireBsddInput({
      ...base,
      codeDechet: '13 02 05*',
      operationTraitement: 'R13',
      conditionnement: 'FUT',
    });
    expect(out.wasteDetails.code).toBe('13 02 05*');
    expect(out.recipient.processingOperation).toBe('R13');
    expect(out.wasteDetails.packagingInfos[0]!.type).toBe('FUT');
  });

  it('marque le récépissé exempté quand absent', () => {
    const sansRecepisse = { ...base, transporteur: { ...base.transporteur, recepisse: null } };
    const out = construireBsddInput(sansRecepisse);
    expect(out.transporter.isExemptedOfReceipt).toBe(true);
    expect(out.transporter.receipt).toBeNull();
  });

  it('détecte un BSDD transmissible (tous SIRET + quantité présents)', () => {
    expect(bsddTransmissible(base)).toEqual({ ok: true, manque: [] });
  });

  it('liste les champs manquants quand non transmissible', () => {
    const incomplet: ConstruireBsddInput = {
      ...base,
      quantiteTonnes: null,
      producteur: { ...base.producteur, siret: null },
    };
    const r = bsddTransmissible(incomplet);
    expect(r.ok).toBe(false);
    expect(r.manque).toContain('SIRET du producteur');
    expect(r.manque).toContain('quantité');
  });
});
