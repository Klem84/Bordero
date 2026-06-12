import { NextResponse, type NextRequest } from 'next/server';
import { enregistrerPaiementSession } from '../actions';

// Retour de Stripe Checkout (mode test) : vérifie l'état réel de la session,
// enregistre le paiement (idempotent), puis redirige vers la facturation.
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session_id');
  if (!sessionId) {
    return NextResponse.redirect(new URL('/app/facturation?stripe=erreur', req.url));
  }
  const res = await enregistrerPaiementSession(sessionId);
  const target = res.ok
    ? `/app/facturation?stripe=paye&numero=${encodeURIComponent(res.numero ?? '')}`
    : '/app/facturation?stripe=echec';
  return NextResponse.redirect(new URL(target, req.url));
}
