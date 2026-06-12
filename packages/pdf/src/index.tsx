import { renderToBuffer } from '@react-pdf/renderer';
import type { BordereauData } from '@bordero/core';
import { BsmvDocument } from './bsmv.js';
import { FactureDocument, type FactureData } from './facture.js';
import { BilanDocument, type BilanData } from './bilan.js';

/** Génère le PDF d'un bordereau BSMV (3 volets) et renvoie le Buffer. */
export async function renderBsmvPdf(data: BordereauData): Promise<Buffer> {
  return renderToBuffer(<BsmvDocument data={data} />);
}

/** Génère le PDF d'une facture et renvoie le Buffer. */
export async function renderFacturePdf(data: FactureData): Promise<Buffer> {
  return renderToBuffer(<FactureDocument data={data} />);
}

/** Génère le PDF du bilan annuel préfectoral et renvoie le Buffer. */
export async function renderBilanPdf(data: BilanData): Promise<Buffer> {
  return renderToBuffer(<BilanDocument data={data} />);
}

export type { FactureData, FactureLigneData } from './facture.js';
export type { BilanData } from './bilan.js';
