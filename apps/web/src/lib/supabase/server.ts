import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@bordero/db';

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Client Supabase pour les composants serveur et les Server Actions.
 * Utilise la clé publishable : la RLS multi-tenant s'applique selon le JWT de l'utilisateur.
 */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Appelé depuis un Server Component : la session est rafraîchie par le middleware.
          }
        },
      },
    },
  );
}
