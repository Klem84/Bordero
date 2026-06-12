import { calculerBilan, type BilanAgregats, type BordereauBilan } from '@bordero/core';
import { createClient } from '@/lib/supabase/server';

export interface BilanAssemble {
  agregats: BilanAgregats;
  agrement: { numero: string | null; departement: string | null };
  organisation: { raisonSociale: string; siret: string | null };
  quotaMaxM3: number | null;
}

interface BordRow {
  quantite_pompee_m3: number | null;
  quantite_depotee_m3: number | null;
  statut: string;
  exutoire_id: string | null;
}

export async function assembleBilan(orgId: string, annee: number): Promise<BilanAssemble> {
  const supabase = await createClient();
  const start = `${annee}-01-01`;
  const end = `${annee + 1}-01-01`;

  const { data: bordData } = await supabase
    .from('bordereaux')
    .select('quantite_pompee_m3, quantite_depotee_m3, statut, exutoire_id')
    .gte('created_at', start)
    .lt('created_at', end);
  const bords = (bordData ?? []) as BordRow[];

  const exIds = [...new Set(bords.map((b) => b.exutoire_id).filter(Boolean))] as string[];
  const exMap: Record<string, string> = {};
  if (exIds.length > 0) {
    const { data: exData } = await supabase.from('exutoires').select('id, raison_sociale').in('id', exIds);
    for (const e of (exData ?? []) as { id: string; raison_sociale: string }[]) {
      exMap[e.id] = e.raison_sociale;
    }
  }

  const rows: BordereauBilan[] = bords.map((b) => ({
    commune: null,
    ouvrageId: null,
    exutoire: b.exutoire_id ? (exMap[b.exutoire_id] ?? null) : null,
    quantitePompeeM3: Number(b.quantite_pompee_m3 ?? 0),
    quantiteDepoteeM3: b.quantite_depotee_m3 == null ? null : Number(b.quantite_depotee_m3),
    statut: b.statut,
  }));

  const { data: agrData } = await supabase
    .from('agrements')
    .select('numero, departement_code, quantite_max_annuelle_m3')
    .eq('statut', 'actif')
    .limit(1)
    .maybeSingle();
  const agr = agrData as { numero: string; departement_code: string; quantite_max_annuelle_m3: number | null } | null;

  const { data: orgData } = await supabase
    .from('organisations')
    .select('raison_sociale, siret')
    .eq('id', orgId)
    .maybeSingle();
  const org = orgData as { raison_sociale: string; siret: string | null } | null;

  const quotaMaxM3 = agr?.quantite_max_annuelle_m3 == null ? null : Number(agr.quantite_max_annuelle_m3);

  return {
    agregats: calculerBilan(rows, quotaMaxM3),
    agrement: { numero: agr?.numero ?? null, departement: agr?.departement_code ?? null },
    organisation: { raisonSociale: org?.raison_sociale ?? '', siret: org?.siret ?? null },
    quotaMaxM3,
  };
}
