import { createClient } from '@/lib/supabase/server';

interface BordereauRow {
  numero: string;
  type: string;
  statut: string;
  created_at: string;
  nature_matiere: string | null;
  quantite_pompee_m3: number | null;
  quantite_depotee_m3: number | null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const statut = url.searchParams.get('statut');
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  const supabase = await createClient();
  let query = supabase
    .from('bordereaux')
    .select('numero, type, statut, created_at, nature_matiere, quantite_pompee_m3, quantite_depotee_m3')
    .order('created_at', { ascending: true })
    .limit(10000);
  if (statut) query = query.eq('statut', statut);
  if (from) query = query.gte('created_at', from);
  if (to) query = query.lte('created_at', to);

  const { data } = await query;
  const rows = (data ?? []) as BordereauRow[];

  const header = ['Numero', 'Type', 'Date', 'Statut', 'Nature', 'Pompé (m³)', 'Dépoté (m³)'];
  const csvLines = [header.join(';')];
  for (const r of rows) {
    csvLines.push(
      [
        r.numero,
        r.type,
        new Date(r.created_at).toLocaleDateString('fr-FR'),
        r.statut,
        (r.nature_matiere ?? '').replace(/;/g, ','),
        r.quantite_pompee_m3 ?? '',
        r.quantite_depotee_m3 ?? '',
      ].join(';'),
    );
  }
  const csv = '﻿' + csvLines.join('\r\n');

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="registre-bordereaux.csv"',
    },
  });
}
