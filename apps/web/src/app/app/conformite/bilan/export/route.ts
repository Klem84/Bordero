import { renderBilanPdf } from '@bordero/pdf';
import { getCurrentUser } from '@/lib/auth';
import { assembleBilan } from '@/lib/bilan';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const annee = Number(url.searchParams.get('annee') ?? new Date().getFullYear());
  const user = await getCurrentUser();
  if (!user?.orgId) return new Response('Non autorisé.', { status: 401 });

  const { agregats, agrement, organisation } = await assembleBilan(user.orgId, annee);
  const pdf = await renderBilanPdf({
    annee,
    organisation,
    agrement,
    agregats,
    generatedAtIso: new Date().toISOString(),
  });

  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="bilan-${annee}.pdf"`,
    },
  });
}
