import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { PageHeader } from '@/components/ui/page-header';
import { FlotteManager, type CamionRow } from './flotte-manager';

export default async function ParametresPage() {
  const user = await getCurrentUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from('camions')
    .select('id, immatriculation, type, capacite_citerne_m3, controle_technique_echeance, adr_validite, actif')
    .order('immatriculation');
  const camions = (data ?? []) as CamionRow[];

  return (
    <div>
      <PageHeader title="Paramètres" subtitle="Parc de camions et configuration de l'organisation." />
      <FlotteManager camions={camions} isAdmin={user?.role === 'admin'} />
    </div>
  );
}
