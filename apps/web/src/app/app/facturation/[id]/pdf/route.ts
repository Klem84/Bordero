import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/** Téléchargement sécurisé du PDF d'une facture via URL signée. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from('factures').select('pdf_url').eq('id', id).maybeSingle();
  const path = (data as { pdf_url: string | null } | null)?.pdf_url;
  if (!path) return new Response('PDF indisponible.', { status: 404 });

  const admin = createAdminClient();
  const { data: signed } = await admin.storage.from('documents').createSignedUrl(path, 120);
  if (!signed?.signedUrl) return new Response('Erreur de génération du lien.', { status: 500 });

  return Response.redirect(signed.signedUrl, 302);
}
