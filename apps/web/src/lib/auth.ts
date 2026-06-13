import { createClient } from './supabase/server';

export interface CurrentUser {
  id: string;
  email: string | null;
  orgId: string | null;
  role: string | null;
}

/**
 * Renvoie l'utilisateur courant avec son organisation et son rôle, lus depuis
 * les claims du JWT (injectés par le hook custom_access_token côté base).
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  let orgId: string | null = null;
  let role: string | null = null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const part = session?.access_token?.split('.')[1];
  if (part) {
    try {
      const payload = JSON.parse(Buffer.from(part, 'base64').toString('utf8'));
      orgId = payload.org_id ?? null;
      role = payload.app_role ?? null;
    } catch {
      // jeton illisible : on laisse null
    }
  }
  return { id: user.id, email: user.email ?? null, orgId, role };
}
