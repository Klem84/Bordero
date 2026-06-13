// Rendu PDF en pur JavaScript via pdf-lib (sans React). Choisi à la place de
// @react-pdf/renderer car ce dernier échoue dans le runtime serveur de Next.js
// (condition react-server : voir l'historique). pdf-lib fonctionne partout, y
// compris en environnement serverless (Vercel).
export { renderBsmvPdf } from './bsmv.js';
export { renderFacturePdf, type FactureData, type FactureLigneData } from './facture.js';
export { renderBilanPdf, type BilanData } from './bilan.js';
