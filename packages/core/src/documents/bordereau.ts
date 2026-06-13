/**
 * Construction des données d'un bordereau (CDC §8.2) à partir des entités métier.
 * La logique de routage documentaire (RG-8.1) est appliquée ici : le type de
 * document découle de la classification de la matière.
 */

import {
  documentPourClassification,
  type DechetClassification,
  type DocumentType,
} from './routing.js';

export interface BordereauVidangeur {
  raisonSociale: string;
  siret: string | null;
  numeroAgrement: string | null;
  departement: string | null;
  immatriculation: string | null;
}

export interface BordereauInstallation {
  proprietaireNom: string;
  proprietaireAdresse: string | null;
  adresseInstallation: string;
  typeOuvrage: string | null;
  volumeLitres: number | null;
}

export interface BordereauMatiere {
  nature: string;
  quantitePompeeM3: number | null;
}

export interface BordereauDestination {
  exutoireRaisonSociale: string | null;
  exutoireAdresse: string | null;
  quantiteDepoteeM3: number | null;
}

export interface BordereauData {
  numero: string;
  documentType: DocumentType;
  dateIso: string;
  vidangeur: BordereauVidangeur;
  installation: BordereauInstallation;
  matiere: BordereauMatiere;
  destination: BordereauDestination;
}

export interface ConstruireBordereauInput {
  numero: string;
  classification: DechetClassification;
  dateIso: string;
  vidangeur: BordereauVidangeur;
  installation: BordereauInstallation;
  matiere: BordereauMatiere;
  destination: BordereauDestination;
}

export function construireDonneesBordereau(input: ConstruireBordereauInput): BordereauData {
  return {
    numero: input.numero,
    documentType: documentPourClassification(input.classification),
    dateIso: input.dateIso,
    vidangeur: input.vidangeur,
    installation: input.installation,
    matiere: input.matiere,
    destination: input.destination,
  };
}

/** Préfixe de numérotation selon le type de document (RG-8.3). */
export function prefixeNumero(documentType: DocumentType): string {
  switch (documentType) {
    case 'BSMV':
      return 'BSMV';
    case 'BSDD':
      return 'BSDD';
    case 'BON_PRESTATION':
      return 'BP';
  }
}
