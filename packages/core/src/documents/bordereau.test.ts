import { describe, expect, it } from 'vitest';
import { construireDonneesBordereau, prefixeNumero, type ConstruireBordereauInput } from './bordereau.js';

const base: ConstruireBordereauInput = {
  numero: 'BSMV-2026-00001',
  classification: 'MATIERES_VIDANGE_ANC',
  dateIso: '2026-06-12T10:00:00.000Z',
  vidangeur: {
    raisonSociale: 'Vidanges Démo',
    siret: '90000000000017',
    numeroAgrement: 'AG-12-001',
    departement: '12',
    immatriculation: 'AA-123-BB',
  },
  installation: {
    proprietaireNom: 'Martin Dupont',
    proprietaireAdresse: '8 chemin des Prés, 12000 Rodez',
    adresseInstallation: '8 chemin des Prés, 12000 Rodez',
    typeOuvrage: 'FOSSE_TOUTES_EAUX',
    volumeLitres: 3000,
  },
  matiere: { nature: 'Matières de vidange', quantitePompeeM3: 2.5 },
  destination: { exutoireRaisonSociale: 'STEP Rodez', exutoireAdresse: 'Rodez', quantiteDepoteeM3: null },
};

describe('construction des données de bordereau (RG-8.1)', () => {
  it('route une matière ANC vers un BSMV', () => {
    expect(construireDonneesBordereau(base).documentType).toBe('BSMV');
  });

  it('route un déchet dangereux vers un BSDD', () => {
    expect(construireDonneesBordereau({ ...base, classification: 'DECHET_DANGEREUX' }).documentType).toBe('BSDD');
  });

  it('route un déchet non dangereux vers un bon de prestation', () => {
    expect(
      construireDonneesBordereau({ ...base, classification: 'DECHET_NON_DANGEREUX_HORS_ANC' }).documentType,
    ).toBe('BON_PRESTATION');
  });

  it('conserve le numéro et les entités', () => {
    const d = construireDonneesBordereau(base);
    expect(d.numero).toBe('BSMV-2026-00001');
    expect(d.vidangeur.numeroAgrement).toBe('AG-12-001');
    expect(d.matiere.quantitePompeeM3).toBe(2.5);
  });
});

describe('préfixe de numérotation', () => {
  it('mappe chaque type de document', () => {
    expect(prefixeNumero('BSMV')).toBe('BSMV');
    expect(prefixeNumero('BSDD')).toBe('BSDD');
    expect(prefixeNumero('BON_PRESTATION')).toBe('BP');
  });
});
