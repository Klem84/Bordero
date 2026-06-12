import 'server-only';
import Stripe from 'stripe';

/**
 * Client Stripe côté serveur. En staging on n'utilise QUE des clés de test
 * (`sk_test_…`) : aucun paiement réel. La clé est lue dans l'environnement
 * (jamais exposée au client).
 */
let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY absente : encaissement Stripe indisponible.');
  }
  cached = new Stripe(key);
  return cached;
}

/** Vrai si la clé Stripe configurée est une clé de test. */
export function isStripeTestMode(): boolean {
  return (process.env.STRIPE_SECRET_KEY ?? '').startsWith('sk_test_');
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
