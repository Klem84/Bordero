import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@bordero/db';

/**
 * Client admin (clé secrète) — SERVEUR UNIQUEMENT.
 * Réservé aux opérations privilégiées (Storage, API admin). Ne jamais l'exposer au client.
 * Note : la clé secrète fonctionne pour Storage et l'API admin auth, mais pas pour PostgREST.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
