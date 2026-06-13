/**
 * Optimisation de l'ordre de passage d'une tournée (CDC lot 2, algorithme 2-opt).
 *
 * Heuristique en deux temps, sur la distance géodésique (haversine) entre les
 * points : construction par plus proche voisin, puis amélioration locale 2-opt
 * (on inverse les segments tant que la distance totale décroît). Le résultat
 * n'est jamais pire que l'ordre fourni (l'ordre initial est toujours candidat).
 *
 * Pas de dépendance externe (Mapbox) : la distance à vol d'oiseau est un bon
 * proxy pour ordonner une tournée locale, et garde l'algorithme testable et
 * exécutable hors ligne. Une matrice routière réelle pourra être injectée plus
 * tard via le paramètre `distance`.
 */

export interface PointTournee {
  id: string;
  lat: number;
  lng: number;
}

export interface OptionsTournee {
  /** Point de départ (dépôt). Fixé en tête, jamais réordonné. */
  depart?: { lat: number; lng: number };
  /** Distance personnalisée (mètres) entre deux points. Défaut : haversine. */
  distance?: (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => number;
}

export interface ResultatTournee {
  /** Identifiants des arrêts dans l'ordre optimisé. */
  ordreIds: string[];
  /** Distance totale optimisée, en mètres. */
  distanceM: number;
  /** Distance totale de l'ordre initial fourni, en mètres. */
  distanceInitialeM: number;
  /** Gain relatif (0 à 1) par rapport à l'ordre initial. */
  ameliorationPct: number;
}

const R_TERRE_M = 6_371_000;
const rad = (d: number) => (d * Math.PI) / 180;

/** Distance géodésique (haversine) entre deux coordonnées, en mètres. */
export function distanceHaversineM(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_TERRE_M * Math.asin(Math.min(1, Math.sqrt(s)));
}

function longueurChemin(
  seq: Array<{ lat: number; lng: number }>,
  d: (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => number,
): number {
  let total = 0;
  for (let i = 0; i < seq.length - 1; i++) total += d(seq[i]!, seq[i + 1]!);
  return total;
}

function plusProcheVoisin<T extends { lat: number; lng: number }>(
  depart: { lat: number; lng: number },
  points: T[],
  d: (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => number,
): T[] {
  const restants = [...points];
  const ordre: T[] = [];
  let courant: { lat: number; lng: number } = depart;
  while (restants.length > 0) {
    let meilleur = 0;
    let meilleureDist = Infinity;
    for (let k = 0; k < restants.length; k++) {
      const dd = d(courant, restants[k]!);
      if (dd < meilleureDist) {
        meilleureDist = dd;
        meilleur = k;
      }
    }
    const [choisi] = restants.splice(meilleur, 1);
    ordre.push(choisi!);
    courant = choisi!;
  }
  return ordre;
}

/**
 * 2-opt sur un chemin ouvert. Le premier élément (indice 0) est fixe (dépôt ou
 * premier arrêt). On inverse `seq[i..j]` tant qu'une inversion raccourcit le
 * chemin. Modifie `seq` en place.
 */
function deuxOpt<T extends { lat: number; lng: number }>(
  seq: T[],
  d: (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => number,
): T[] {
  const n = seq.length;
  let ameliore = true;
  while (ameliore) {
    ameliore = false;
    for (let i = 1; i < n - 1; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = seq[i - 1]!;
        const b = seq[i]!;
        const c = seq[j]!;
        const apres = j + 1 < n ? seq[j + 1]! : null;
        const avant = d(a, b) + (apres ? d(c, apres) : 0);
        const nouveau = d(a, c) + (apres ? d(b, apres) : 0);
        if (nouveau + 1e-6 < avant) {
          let lo = i;
          let hi = j;
          while (lo < hi) {
            const t = seq[lo]!;
            seq[lo] = seq[hi]!;
            seq[hi] = t;
            lo++;
            hi--;
          }
          ameliore = true;
        }
      }
    }
  }
  return seq;
}

/**
 * Réordonne les arrêts d'une tournée pour minimiser la distance parcourue.
 * Renvoie l'ordre optimisé et le gain par rapport à l'ordre initial.
 */
export function optimiserTournee(stops: PointTournee[], options: OptionsTournee = {}): ResultatTournee {
  const d = options.distance ?? distanceHaversineM;
  const depot = options.depart ?? null;

  const sequence = (arr: PointTournee[]): PointTournee[] => (depot ? [{ id: '', ...depot }, ...arr] : arr);
  const longueurAvecDepot = (arr: PointTournee[]) => longueurChemin(sequence(arr), d);

  const distanceInitialeM = longueurAvecDepot(stops);

  if (stops.length <= 2) {
    return {
      ordreIds: stops.map((s) => s.id),
      distanceM: distanceInitialeM,
      distanceInitialeM,
      ameliorationPct: 0,
    };
  }

  // Candidat A : 2-opt à partir de l'ordre fourni (garantit un résultat <= initial).
  const seqA = deuxOpt(sequence(stops), d);

  // Candidat B : 2-opt à partir d'une construction plus proche voisin.
  const ancre = depot ?? stops[0]!;
  const nn = depot ? plusProcheVoisin(ancre, stops, d) : [stops[0]!, ...plusProcheVoisin(ancre, stops.slice(1), d)];
  const seqB = deuxOpt(depot ? [{ id: '', ...depot }, ...nn] : nn, d);

  const meilleur = longueurChemin(seqA, d) <= longueurChemin(seqB, d) ? seqA : seqB;
  const distanceMeilleur = longueurChemin(meilleur, d);

  // Garantie « jamais pire que l'ordre initial » dans la métrique réelle. Le
  // gain calculé pendant le 2-opt suppose une distance symétrique ; avec une
  // matrice routière asymétrique (Mapbox), une inversion localement améliorante
  // peut augmenter le coût réel. On retombe alors sur l'ordre fourni.
  if (distanceInitialeM <= distanceMeilleur) {
    return { ordreIds: stops.map((s) => s.id), distanceM: distanceInitialeM, distanceInitialeM, ameliorationPct: 0 };
  }

  const ordreIds = meilleur.filter((p) => p.id !== '').map((p) => p.id);
  return {
    ordreIds,
    distanceM: distanceMeilleur,
    distanceInitialeM,
    ameliorationPct: distanceInitialeM > 0 ? (distanceInitialeM - distanceMeilleur) / distanceInitialeM : 0,
  };
}
