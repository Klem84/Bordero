import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { PageHeader } from '@/components/ui/page-header';
import { FlotteManager, type CamionRow } from './flotte-manager';
import { ExutoiresManager, type ExutoireRow } from './exutoires-manager';
import { AgrementsManager, type AgrementRow } from './agrements-manager';

export const metadata = { title: "Paramètres" };

export default async function ParametresPage() {
  const user = await getCurrentUser();
  const isAdmin = user?.role === 'admin';
  const supabase = await createClient();

  const [{ data: camData }, { data: exuData }, { data: agrData }] = await Promise.all([
    supabase
      .from('camions')
      .select('id, immatriculation, type, capacite_citerne_m3, controle_technique_echeance, adr_validite, actif')
      .order('immatriculation'),
    supabase
      .from('exutoires')
      .select('id, raison_sociale, type, adresse, siret, contact_responsable, tarif_depotage_m3_cents')
      .order('raison_sociale'),
    supabase
      .from('agrements')
      .select('id, departement_code, departement_libelle, numero, date_delivrance, date_echeance, quantite_max_annuelle_m3, statut')
      .order('date_echeance'),
  ]);

  const camions = (camData ?? []) as CamionRow[];
  const exutoires = (exuData ?? []) as ExutoireRow[];
  const agrements = (agrData ?? []) as AgrementRow[];

  return (
    <div className="space-y-10">
      <PageHeader title="Paramètres" subtitle="Parc de camions, exutoires et agréments de l'organisation." />
      <FlotteManager camions={camions} isAdmin={isAdmin} />
      <ExutoiresManager exutoires={exutoires} isAdmin={isAdmin} />
      <AgrementsManager agrements={agrements} isAdmin={isAdmin} />
    </div>
  );
}
