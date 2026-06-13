import { createClient } from '@/lib/supabase/server';

interface FactureExportRow {
  numero: string | null;
  kind: string;
  statut: string;
  emise_le: string | null;
  created_at: string;
  client_id: string;
  total_ht_cents: number;
  total_tva_cents: number;
  total_ttc_cents: number;
}

const STATUT_LABEL: Record<string, string> = {
  brouillon: 'Brouillon',
  emise: 'Émise',
  envoyee: 'Envoyée',
  payee: 'Payée',
  partiellement_payee: 'Partiellement payée',
  en_retard: 'En retard',
  irrecouvrable: 'Irrécouvrable',
};

const eur = (cents: number) => (Number(cents) / 100).toFixed(2).replace('.', ',');

export async function GET(request: Request) {
  const url = new URL(request.url);
  const statut = url.searchParams.get('statut');

  const supabase = await createClient();
  let query = supabase
    .from('factures')
    .select('numero, kind, statut, emise_le, created_at, client_id, total_ht_cents, total_tva_cents, total_ttc_cents')
    .in('kind', ['facture', 'avoir'])
    .order('created_at', { ascending: true })
    .limit(10000);
  if (statut) query = query.eq('statut', statut);

  const { data } = await query;
  const rows = (data ?? []) as FactureExportRow[];

  // Noms de clients (une requête groupée).
  const clientIds = [...new Set(rows.map((r) => r.client_id).filter(Boolean))];
  const nomParClient: Record<string, string> = {};
  if (clientIds.length > 0) {
    const { data: cli } = await supabase.from('clients').select('id, nom').in('id', clientIds);
    for (const c of (cli ?? []) as { id: string; nom: string }[]) nomParClient[c.id] = c.nom;
  }

  const header = ['Numero', 'Type', 'Date', 'Statut', 'Client', 'HT (EUR)', 'TVA (EUR)', 'TTC (EUR)'];
  const lines = [header.join(';')];
  for (const r of rows) {
    const date = r.emise_le ?? r.created_at;
    lines.push(
      [
        r.numero ?? '',
        r.kind === 'avoir' ? 'Avoir' : 'Facture',
        date ? new Date(date).toLocaleDateString('fr-FR') : '',
        STATUT_LABEL[r.statut] ?? r.statut,
        (nomParClient[r.client_id] ?? '').replace(/;/g, ','),
        eur(r.total_ht_cents),
        eur(r.total_tva_cents),
        eur(r.total_ttc_cents),
      ].join(';'),
    );
  }
  const csv = '﻿' + lines.join('\r\n');

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="facturation.csv"',
    },
  });
}
