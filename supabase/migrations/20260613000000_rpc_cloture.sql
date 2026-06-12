-- RPC de clôture d'intervention : réserve un numéro et crée le bordereau (RG-8.1, RG-8.3).
-- SECURITY DEFINER pour la numérotation (verrou compteur), mais contrôle d'organisation
-- explicite via current_org_id() (le hook de token alimente les claims du JWT de l'appelant).

create or replace function public.rpc_clore_intervention(
  p_intervention_id uuid,
  p_exutoire_id uuid default null,
  p_quantite_m3 numeric default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_int public.interventions;
  v_classif public.dechet_classification;
  v_type public.bordereau_type;
  v_prefix text;
  v_type_doc text;
  v_numero text;
  v_agrement uuid;
  v_bordereau_id uuid;
  v_nature text;
begin
  v_org := public.current_org_id();
  if v_org is null then
    raise exception 'Session non authentifiée';
  end if;

  select * into v_int from public.interventions
    where id = p_intervention_id and organisation_id = v_org;
  if not found then
    raise exception 'Intervention introuvable dans votre organisation';
  end if;

  -- Avance l'intervention jusqu'à TERMINEE via des transitions valides (RG-3.1).
  if v_int.status = 'BROUILLON' then
    update public.interventions set status = 'PLANIFIEE' where id = p_intervention_id;
    v_int.status := 'PLANIFIEE';
  end if;
  if v_int.status = 'PLANIFIEE' then
    update public.interventions set status = 'EN_ROUTE' where id = p_intervention_id;
    v_int.status := 'EN_ROUTE';
  end if;
  if v_int.status = 'EN_ROUTE' then
    update public.interventions set status = 'SUR_SITE' where id = p_intervention_id;
    v_int.status := 'SUR_SITE';
  end if;
  if v_int.status = 'SUR_SITE' then
    update public.interventions set status = 'TERMINEE', terminee_a = now() where id = p_intervention_id;
  elsif v_int.status <> 'TERMINEE' then
    raise exception 'Intervention dans un état non clôturable (%)', v_int.status;
  end if;

  -- Classification (depuis le premier ouvrage relevé, sinon défaut ANC).
  select classification_dechet into v_classif
    from public.intervention_ouvrages
    where intervention_id = p_intervention_id
    order by created_at asc limit 1;
  v_classif := coalesce(v_classif, 'MATIERES_VIDANGE_ANC');

  -- Routage documentaire (RG-8.1).
  if v_classif = 'MATIERES_VIDANGE_ANC' then
    v_type := 'BSMV'; v_prefix := 'BSMV'; v_type_doc := 'BSMV'; v_nature := 'Matières de vidange ANC';
  elsif v_classif = 'DECHET_DANGEREUX' then
    v_type := 'BSDD'; v_prefix := 'BSDD'; v_type_doc := 'BSDD'; v_nature := 'Déchet dangereux';
  else
    v_type := 'BON_PRESTATION'; v_prefix := 'BP'; v_type_doc := 'BON_PRESTATION'; v_nature := 'Déchet non dangereux';
  end if;

  v_numero := public.reserver_numero(v_org, v_type_doc, v_prefix, extract(year from now())::int);

  -- Agrément actif du département (best effort).
  select id into v_agrement from public.agrements
    where organisation_id = v_org and statut = 'actif' limit 1;

  insert into public.bordereaux (
    organisation_id, intervention_id, exutoire_id, agrement_id, type, numero, statut,
    nature_matiere, quantite_pompee_m3
  ) values (
    v_org, p_intervention_id, p_exutoire_id, v_agrement, v_type, v_numero, 'EMIS',
    v_nature, p_quantite_m3
  ) returning id into v_bordereau_id;

  return jsonb_build_object('bordereau_id', v_bordereau_id, 'numero', v_numero, 'type', v_type::text);
end $$;

grant execute on function public.rpc_clore_intervention to authenticated;
