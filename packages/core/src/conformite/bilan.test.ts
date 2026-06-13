import { describe, expect, it } from 'vitest';
import { calculerBilan, communeDeAdresse, type BordereauBilan } from './bilan.js';

const rows: BordereauBilan[] = [
  { commune: 'Rodez', ouvrageId: 'o1', exutoire: 'STEP Rodez', quantitePompeeM3: 3, quantiteDepoteeM3: 3, statut: 'BOUCLE' },
  { commune: 'Rodez', ouvrageId: 'o2', exutoire: 'STEP Rodez', quantitePompeeM3: 2, quantiteDepoteeM3: 2, statut: 'BOUCLE' },
  { commune: 'Olemps', ouvrageId: 'o3', exutoire: 'Centre Agréé', quantitePompeeM3: 4, quantiteDepoteeM3: 4, statut: 'BOUCLE' },
];

describe('bilan annuel (A3)', () => {
  it('agrège les installations par commune', () => {
    const b = calculerBilan(rows, 500);
    const rodez = b.installationsParCommune.find((c) => c.commune === 'Rodez');
    expect(rodez?.nbInstallations).toBe(2);
    expect(rodez?.volumeM3).toBe(5);
  });

  it('agrège les volumes par filière', () => {
    const b = calculerBilan(rows, 500);
    expect(b.volumesParFiliere.find((f) => f.exutoire === 'STEP Rodez')?.volumeM3).toBe(5);
    expect(b.totalPompeM3).toBe(9);
  });

  it('valide la complétude quand tout est bouclé et cohérent', () => {
    const b = calculerBilan(rows, 500);
    expect(b.controles.complet).toBe(true);
    expect(b.controles.bordereauxNonBoucles).toBe(0);
  });

  it('détecte un bordereau non bouclé', () => {
    const b = calculerBilan(
      [...rows, { commune: 'Rodez', ouvrageId: 'o4', exutoire: null, quantitePompeeM3: 1, quantiteDepoteeM3: null, statut: 'EMIS' }],
      500,
    );
    expect(b.controles.bordereauxNonBoucles).toBe(1);
    expect(b.controles.complet).toBe(false);
  });

  it('détecte un dépassement de quota', () => {
    const b = calculerBilan(rows, 5);
    expect(b.controles.depassementQuota).toBe(true);
    expect(b.controles.complet).toBe(false);
  });

  it('détecte un écart pompé/dépoté supérieur à 5 %', () => {
    const b = calculerBilan(
      [{ commune: 'X', ouvrageId: 'o1', exutoire: 'E', quantitePompeeM3: 10, quantiteDepoteeM3: 8, statut: 'BOUCLE' }],
      500,
    );
    expect(b.controles.ecartPompeDepotePct).toBe(20);
    expect(b.controles.complet).toBe(false);
  });
});

describe('communeDeAdresse (A3)', () => {
  it('extrait la commune après le code postal', () => {
    expect(communeDeAdresse('8 chemin des Prés, 12000 Rodez')).toBe('Rodez');
  });
  it('tolère les communes composées', () => {
    expect(communeDeAdresse('15 rue du Ségala, 12850 Onet-le-Château')).toBe('Onet-le-Château');
    expect(communeDeAdresse('Le Bourg, 12500 Saint-Côme-d\'Olt')).toBe("Saint-Côme-d'Olt");
  });
  it('gère une zone sans numéro de rue', () => {
    expect(communeDeAdresse('ZA de Bel Air, 12510 Olemps')).toBe('Olemps');
  });
  it('renvoie null sans code postal ou adresse vide', () => {
    expect(communeDeAdresse('Lieu-dit sans code')).toBeNull();
    expect(communeDeAdresse(null)).toBeNull();
    expect(communeDeAdresse('')).toBeNull();
  });
});
