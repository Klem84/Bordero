import { createClient } from '@/lib/supabase/server';

interface ClientExportRow {
  nom: string;
  type: string;
  telephone: string | null;
  email: string | null;
  siret: string | null;
}

const TYPE_LABEL: Record<string, string> = {
  particulier: 'Particulier',
  professionnel: 'Professionnel',
  collectivite: 'Collectivité',
  syndic: 'Syndic',
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const recherche = (url.searchParams.get('q') ?? '').trim();

  const supabase = await createClient();
  let query = supabase
    .from('clients')
    .select('nom, type, telephone, email, siret')
    .order('nom', { ascending: true })
    .limit(10000);
  if (recherche) {
    const motif = `%${recherche.replace(/[%,]/g, ' ')}%`;
    query = query.or(`nom.ilike.${motif},email.ilike.${motif},telephone.ilike.${motif}`);
  }
  const { data } = await query;
  const rows = (data ?? []) as ClientExportRow[];

  const header = ['Nom', 'Type', 'Telephone', 'Email', 'SIRET'];
  const lines = [header.join(';')];
  for (const r of rows) {
    lines.push(
      [
        (r.nom ?? '').replace(/;/g, ','),
        TYPE_LABEL[r.type] ?? r.type,
        r.telephone ?? '',
        r.email ?? '',
        r.siret ?? '',
      ].join(';'),
    );
  }
  const csv = '﻿' + lines.join('\r\n');

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="clients.csv"',
    },
  });
}
