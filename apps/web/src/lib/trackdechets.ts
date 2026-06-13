import type { CreateFormInput } from '@bordero/core';

export interface TrackdechetsResult {
  transmis: boolean;
  id?: string;
  readableId?: string;
  statut?: string;
  /** Code d'erreur lisible quand non transmis. */
  erreur?: string;
}

const MUTATION_CREATE_FORM = `
  mutation CreerBsdd($input: CreateFormInput!) {
    createForm(createFormInput: $input) {
      id
      readableId
      status
    }
  }
`;

/**
 * Transmet un BSDD à Trackdéchets via la mutation createForm.
 *
 * Garde-fou : sans jeton (TRACKDECHETS_TOKEN), on ne tente rien et on renvoie un
 * résultat « non transmis » (mode dégradé). L'URL par défaut cible le bac à sable
 * Trackdéchets ; la prod se configure via TRACKDECHETS_API_URL.
 */
export async function creerBsddTrackdechets(input: CreateFormInput): Promise<TrackdechetsResult> {
  const token = process.env.TRACKDECHETS_TOKEN;
  const apiUrl = process.env.TRACKDECHETS_API_URL ?? 'https://api.sandbox.trackdechets.beta.gouv.fr/';
  if (!token) {
    return { transmis: false, erreur: 'NON_CONFIGURE' };
  }

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query: MUTATION_CREATE_FORM, variables: { input } }),
      // Borne le temps d'attente : une API lente ne doit pas bloquer la clôture.
      signal: AbortSignal.timeout(10000),
    });
    const json = (await res.json()) as {
      data?: { createForm?: { id: string; readableId: string; status: string } };
      errors?: Array<{ message: string }>;
    };
    if (json.errors?.length) {
      return { transmis: false, erreur: json.errors.map((e) => e.message).join(' ; ').slice(0, 300) };
    }
    const form = json.data?.createForm;
    if (!form?.id) {
      return { transmis: false, erreur: 'Réponse Trackdéchets inattendue' };
    }
    return { transmis: true, id: form.id, readableId: form.readableId, statut: form.status };
  } catch (e) {
    return { transmis: false, erreur: (e as Error).message.slice(0, 300) };
  }
}
