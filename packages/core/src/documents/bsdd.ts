/**
 * Mapping Bordero -> Trackdéchets BSDD (CDC lot 2, RG-8.1 pour les déchets
 * dangereux). Construit l'objet `CreateFormInput` attendu par la mutation
 * `createForm` de l'API Trackdéchets à partir des entités métier.
 *
 * Fonction pure et testable : l'appel réseau réel (et le jeton) vivent côté
 * application. Le code déchet et l'opération de traitement par défaut visent le
 * cas courant du séparateur à hydrocarbures (13 05 02* boues de déshuileurs),
 * surchargeables.
 */

export interface BsddSociete {
  siret: string | null;
  nom: string;
  adresse: string | null;
  contact: string | null;
  telephone: string | null;
  email: string | null;
}

export interface ConstruireBsddInput {
  /** Référence interne Bordero (BSDD-AAAA-NNNNN), reportée en clientReference. */
  reference: string;
  /** Code déchet (nomenclature). Défaut : 13 05 02* (boues de déshuileurs). */
  codeDechet?: string;
  natureDechet: string;
  /** Quantité estimée, en tonnes (Trackdéchets raisonne en tonnes). */
  quantiteTonnes: number | null;
  /** Code opération de traitement (D/R). Défaut : D15 (entreposage). */
  operationTraitement?: string;
  /** Producteur du déchet (propriétaire de l'installation). */
  producteur: BsddSociete;
  /** Transporteur agréé (l'entreprise de vidange). */
  transporteur: BsddSociete & { recepisse?: string | null; departement?: string | null };
  /** Destinataire / exutoire (installation de traitement). */
  destinataire: BsddSociete;
  /** Conditionnement transporté. Défaut : CITERNE. */
  conditionnement?: 'CITERNE' | 'BENNE' | 'GRV' | 'FUT' | 'AUTRE';
}

interface BsddCompanyInput {
  siret: string | null;
  name: string;
  address: string | null;
  contact: string | null;
  phone: string | null;
  mail: string | null;
}

export interface CreateFormInput {
  /** Référence libre du producteur, on y met notre numéro interne. */
  customId: string;
  emitter: { type: 'PRODUCER'; company: BsddCompanyInput };
  recipient: { processingOperation: string; company: BsddCompanyInput };
  transporter: {
    company: BsddCompanyInput;
    receipt: string | null;
    department: string | null;
    isExemptedOfReceipt: boolean;
  };
  wasteDetails: {
    code: string;
    name: string;
    packagingInfos: Array<{ type: string; quantity: number }>;
    quantity: number | null;
    quantityType: 'ESTIMATED' | 'REAL';
    consistence: 'LIQUID' | 'SOLID' | 'DOUBLEUX' | 'GASEOUS';
  };
}

const CONDITIONNEMENT_TRACKDECHETS: Record<NonNullable<ConstruireBsddInput['conditionnement']>, string> = {
  CITERNE: 'CITERNE',
  BENNE: 'BENNE',
  GRV: 'GRV',
  FUT: 'FUT',
  AUTRE: 'AUTRE',
};

const societe = (s: BsddSociete): BsddCompanyInput => ({
  siret: s.siret,
  name: s.nom,
  address: s.adresse,
  contact: s.contact,
  phone: s.telephone,
  mail: s.email,
});

/** Construit l'entrée de la mutation createForm de Trackdéchets. */
export function construireBsddInput(input: ConstruireBsddInput): CreateFormInput {
  const conditionnement = input.conditionnement ?? 'CITERNE';
  return {
    customId: input.reference,
    emitter: { type: 'PRODUCER', company: societe(input.producteur) },
    recipient: {
      processingOperation: input.operationTraitement ?? 'D15',
      company: societe(input.destinataire),
    },
    transporter: {
      company: societe(input.transporteur),
      receipt: input.transporteur.recepisse ?? null,
      department: input.transporteur.departement ?? null,
      isExemptedOfReceipt: !input.transporteur.recepisse,
    },
    wasteDetails: {
      code: input.codeDechet ?? '13 05 02*',
      name: input.natureDechet,
      packagingInfos: [{ type: CONDITIONNEMENT_TRACKDECHETS[conditionnement], quantity: 1 }],
      quantity: input.quantiteTonnes,
      quantityType: 'ESTIMATED',
      consistence: 'LIQUID',
    },
  };
}

/** Détermine si un input BSDD est transmissible (champs minimaux requis par Trackdéchets). */
export function bsddTransmissible(input: ConstruireBsddInput): { ok: boolean; manque: string[] } {
  const manque: string[] = [];
  if (!input.producteur.siret) manque.push('SIRET du producteur');
  if (!input.transporteur.siret) manque.push('SIRET du transporteur');
  if (!input.destinataire.siret) manque.push('SIRET du destinataire');
  if (input.quantiteTonnes == null) manque.push('quantité');
  return { ok: manque.length === 0, manque };
}
