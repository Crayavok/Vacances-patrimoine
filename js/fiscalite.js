// Fiscalité française applicable en 2026 (règles simplifiées, voir docs/METHODE.md).

// Prélèvements sociaux depuis le 1er janvier 2026 (LFSS 2026) :
// 18,6 % sur dividendes, plus-values mobilières, PEA, comptes-titres et loyers meublés (LMNP) ;
// 17,2 % maintenus sur revenus fonciers (location nue), plus-values immobilières et assurance vie.
export const PS_CAPITAL = 0.186;
export const PS_FONCIER = 0.172;
export const PFU_IR = 0.128;

/** Abattements pour durée de détention d'une plus-value immobilière (taux entre 0 et 1). */
export function abattementsDuree(annees) {
  const a = Math.floor(annees);
  let ir = 0, ps = 0;
  if (a >= 22) ir = 1;
  else if (a >= 6) ir = 0.06 * (a - 5);
  if (a >= 30) ps = 1;
  else if (a >= 23) ps = 0.0165 * 16 + 0.016 + 0.09 * (a - 22);
  else if (a === 22) ps = 0.0165 * 16 + 0.016;
  else if (a >= 6) ps = 0.0165 * (a - 5);
  return { ir: Math.min(1, ir), ps: Math.min(1, ps) };
}

/** Taxe sur les plus-values immobilières élevées (art. 1609 nonies G du CGI), avec lissage. */
export function surtaxePV(pv) {
  if (pv <= 50000) return 0;
  const paliers = [
    [60000, 0.02, (p) => 0.02 * p - (60000 - p) / 20],
    [100000, 0.02, null],
    [110000, 0.03, (p) => 0.03 * p - (110000 - p) / 10],
    [150000, 0.03, null],
    [160000, 0.04, (p) => 0.04 * p - (160000 - p) * 0.15],
    [200000, 0.04, null],
    [210000, 0.05, (p) => 0.05 * p - (210000 - p) * 0.2],
    [250000, 0.05, null],
    [260000, 0.06, (p) => 0.06 * p - (260000 - p) * 0.25],
  ];
  for (const [plafond, taux, lissage] of paliers) {
    if (pv <= plafond) return Math.max(0, lissage ? lissage(pv) : taux * pv);
  }
  return 0.06 * pv;
}

/**
 * Impôt sur la plus-value lors de la revente d'un bien (résidence secondaire ou locatif).
 * Forfaits : frais d'acquisition = max(frais réels, 7,5 %) ; travaux = 15 % au-delà de 5 ans de détention.
 * amortissements : montants déduits en LMNP au réel, réintégrés depuis la loi de finances 2025.
 */
export function impotPlusValueImmo({ prixVente, fraisVente, prixAchat, tauxFraisAcquisition, annees, amortissements = 0 }) {
  const fraisAcq = prixAchat * Math.max(tauxFraisAcquisition, 0.075);
  const travaux = annees > 5 ? prixAchat * 0.15 : 0;
  const pv = prixVente - fraisVente - (prixAchat + fraisAcq + travaux) + amortissements;
  if (pv <= 0) return { pv: Math.max(pv, 0), impot: 0 };
  const ab = abattementsDuree(annees);
  const baseIR = pv * (1 - ab.ir);
  const basePS = pv * (1 - ab.ps);
  const impot = baseIR * 0.19 + basePS * PS_FONCIER + surtaxePV(baseIR);
  return { pv, impot };
}

export const ENVELOPPES = {
  av: { nom: "Assurance vie", plafond: null },
  pea: { nom: "PEA", plafond: 150000 },
  cto: { nom: "Compte-titres", plafond: null },
  livret: { nom: "Livrets réglementés", plafond: 22950 + 12000 },
};

/** Impôt dû sur les gains d'un placement capitalisé, en cas de retrait total. */
export function impotPlacement({ enveloppe, valeur, versements, annees, couple }) {
  const gain = Math.max(0, valeur - versements);
  if (gain === 0) return 0;
  switch (enveloppe) {
    case "livret":
      return 0;
    case "pea":
      return annees >= 5 ? gain * PS_CAPITAL : gain * (PFU_IR + PS_CAPITAL);
    case "av": {
      if (annees < 8) return gain * (PFU_IR + PS_FONCIER);
      const abattement = couple ? 9200 : 4600;
      const seuil = couple ? 300000 : 150000;
      const part = versements > seuil ? seuil / versements : 1;
      const tauxIR = part * 0.075 + (1 - part) * PFU_IR;
      return gain * PS_FONCIER + Math.max(0, gain - abattement) * tauxIR;
    }
    case "cto":
    default:
      return gain * (PFU_IR + PS_CAPITAL);
  }
}

export const REGIMES_LOCATIFS = {
  "nu-micro": { nom: "Location nue – micro-foncier", abattement: 0.3, ps: PS_FONCIER, plafond: 15000 },
  "meuble-micro": { nom: "Meublé (LMNP) – micro-BIC", abattement: 0.5, ps: PS_CAPITAL, plafond: 77700 },
  "lmnp-reel": { nom: "Meublé (LMNP) – régime réel", abattement: null, ps: PS_CAPITAL, plafond: null },
};
