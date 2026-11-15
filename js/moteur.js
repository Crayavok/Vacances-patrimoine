// Moteur de comparaison : calculs déterministes, sans dépendance au navigateur.
// Principe : à effort de trésorerie égal chaque année, quelle stratégie laisse le patrimoine net le plus élevé ?
import { impotPlusValueImmo, impotPlacement, REGIMES_LOCATIFS, ENVELOPPES } from "./fiscalite.js";

export const STRATEGIES = {
  rs: { nom: "Acheter une résidence secondaire", court: "Résidence secondaire" },
  placer: { nom: "Louer ses vacances et placer", court: "Louer + placer" },
  locatif: { nom: "Louer ses vacances et acheter des petites surfaces", court: "Louer + petites surfaces" },
};

/** Honoraires annuels d'un expert-comptable pour une déclaration LMNP au réel (ordre de grandeur). */
export const FRAIS_COMPTABLE_LMNP = 600;

/** Taux d'assurance emprunteur indicatif (en % du capital emprunté par an, quotité 100 %) selon l'âge. */
export function tauxAssuranceSelonAge(age) {
  if (age < 30) return 0.10;
  if (age < 40) return 0.15;
  if (age < 50) return 0.25;
  if (age < 55) return 0.35;
  if (age < 60) return 0.45;
  if (age < 65) return 0.60;
  return 0.85;
}

/** Échéancier annuel d'un prêt amortissable à mensualités constantes. */
export function echeancier(capital, tauxAnnuelPct, dureeAns, assurancePct, quotite = 1) {
  const n = Math.round(dureeAns * 12);
  const i = tauxAnnuelPct / 100 / 12;
  const mensualiteHorsAss = capital <= 0 ? 0 : i === 0 ? capital / n : (capital * i) / (1 - Math.pow(1 + i, -n));
  const assuranceMensuelle = capital <= 0 ? 0 : (capital * (assurancePct / 100) * quotite) / 12;
  const annees = [];
  let crd = capital;
  for (let a = 1; a <= dureeAns; a++) {
    let interets = 0, principal = 0;
    for (let m = 0; m < 12; m++) {
      if (crd <= 0.005) break;
      const int = crd * i;
      const princ = Math.min(crd, mensualiteHorsAss - int);
      interets += int; principal += princ; crd -= princ;
    }
    annees.push({ interets, principal, assurance: assuranceMensuelle * 12, crd: Math.max(0, crd) });
  }
  return { mensualiteHorsAss, assuranceMensuelle, mensualite: mensualiteHorsAss + assuranceMensuelle, annees,
    coutTotal: annees.reduce((s, x) => s + x.interets + x.assurance, 0) };
}

export const PARAMETRES_DEFAUT = {
  profil: { age: 45, revenusMensuels: 6500, creditsMensuels: 0, apport: 90000, horizon: 20, tmi: 30, couple: true },
  vacances: { semaines: 4, coutSemaine: 1500, inflation: 2 },
  credit: { taux: 3.8, duree: 20, assuranceAuto: true, assurance: 0.25, quotite: 100, fraisGarantie: 1.2 },
  rs: { prix: 300000, notaire: 7.5, ameublement: 15000, taxeFonciere: 1600, taxeHabitation: 1100, fonctionnement: 1800,
        entretien: 0.8, revalorisation: 1.5, fraisVente: 5,
        semainesLouees: 0, prixSemaine: 1500, fraisGestion: 25 },
  placement: { rendement: 5, enveloppe: "av" },
  locatif: { nbLots: 2, prixLot: 140000, notaire: 7.5, ameublementLot: 5000, loyerLot: 650, vacanceMois: 1,
             chargesLot: 1600, gestion: 7, revaloLoyers: 1.5, revaloBien: 1.5, regime: "lmnp-reel", fraisVente: 5 },
};

function financer(cout, apport, credit) {
  const apportUtilise = Math.min(apport, cout);
  const besoin = cout - apportUtilise;
  const emprunt = besoin > 0 ? besoin * (1 + credit.fraisGarantie / 100) : 0;
  return { apportUtilise, emprunt, reliquat: apport - apportUtilise };
}

/** Lance la simulation complète. */
export function simuler(entree) {
  const p = structuredClone(entree);
  const { profil, vacances, credit, rs, placement, locatif } = p;
  const H = Math.max(1, Math.round(profil.horizon));
  const inf = vacances.inflation / 100;
  const r = placement.rendement / 100;
  const tmi = profil.tmi / 100;
  const tauxAss = credit.assuranceAuto ? tauxAssuranceSelonAge(profil.age) : credit.assurance;
  const quotite = credit.quotite / 100;

  // ── Acquisitions ──
  const coutRS = rs.prix * (1 + rs.notaire / 100) + rs.ameublement;
  const finRS = financer(coutRS, profil.apport, credit);
  const pretRS = echeancier(finRS.emprunt, credit.taux, credit.duree, tauxAss, quotite);

  const prixLoc = locatif.nbLots * locatif.prixLot;
  const mobilierLoc = locatif.nbLots * locatif.ameublementLot;
  const meuble = locatif.regime !== "nu-micro";
  const coutLoc = prixLoc * (1 + locatif.notaire / 100) + (meuble ? mobilierLoc : 0);
  const finLoc = financer(coutLoc, profil.apport, credit);
  const pretLoc = echeancier(finLoc.emprunt, credit.taux, credit.duree, tauxAss, quotite);
  const regime = REGIMES_LOCATIFS[locatif.regime];

  const etat = {
    rs: { V: finRS.reliquat, C: finRS.reliquat },
    placer: { V: profil.apport, C: profil.apport },
    locatif: { V: finLoc.reliquat, C: finLoc.reliquat, amortCumul: 0, ardReport: 0 },
  };
  const series = { rs: [], placer: [], locatif: [] };
  const flux = { rs: [], placer: [], locatif: [] };
  for (const k in series) series[k].push({ annee: 0, patrimoine: profil.apport });

  let totalVacances = 0, totalLoyersNets = 0, totalImpotsLoc = 0;
  for (let y = 1; y <= H; y++) {
    const coefInf = Math.pow(1 + inf, y - 1);
    const coutVacances = vacances.semaines * vacances.coutSemaine * coefInf;

    // Résidence secondaire
    const anRS = pretRS.annees[y - 1];
    const creditRS = anRS ? anRS.interets + anRS.principal + anRS.assurance : 0;
    const brutSaison = rs.semainesLouees * rs.prixSemaine * coefInf;
    const impotSaison = brutSaison * 0.7 * (tmi + 0.186); // meublé de tourisme non classé : abattement 30 %
    const netSaison = brutSaison * (1 - rs.fraisGestion / 100) - impotSaison;
    const chargesRS = (rs.taxeFonciere + rs.taxeHabitation + rs.fonctionnement + rs.prix * rs.entretien / 100) * coefInf;
    const sortieRS = creditRS + chargesRS - netSaison;

    // Louer + placer
    const sortiePlacer = coutVacances;

    // Louer + petites surfaces
    const anLoc = pretLoc.annees[y - 1];
    const creditLoc = anLoc ? anLoc.interets + anLoc.principal + anLoc.assurance : 0;
    const loyers = locatif.nbLots * locatif.loyerLot * (12 - locatif.vacanceMois) * Math.pow(1 + locatif.revaloLoyers / 100, y - 1);
    const comptable = locatif.regime === "lmnp-reel" ? FRAIS_COMPTABLE_LMNP * coefInf : 0;
    const chargesLoc = locatif.nbLots * locatif.chargesLot * coefInf + loyers * locatif.gestion / 100 + comptable;
    let impotLoc;
    if (regime.abattement !== null) {
      impotLoc = loyers * (1 - regime.abattement) * (tmi + regime.ps);
    } else {
      // LMNP au réel : charges, intérêts, assurance et amortissements déductibles ; l'amortissement ne crée pas de déficit.
      const avantAmort = loyers - chargesLoc - (anLoc ? anLoc.interets + anLoc.assurance : 0);
      const amortImmo = (prixLoc * 0.85) / 30;
      const amortAnnee = amortImmo + (y <= 7 ? mobilierLoc / 7 : 0) + etat.locatif.ardReport;
      const amortUtilise = Math.max(0, Math.min(amortAnnee, avantAmort));
      etat.locatif.ardReport = amortAnnee - amortUtilise;
      // Seuls les amortissements du bâti sont réintégrés dans la plus-value (loi de finances 2025).
      etat.locatif.amortCumul += amortUtilise * (amortImmo / amortAnnee);
      impotLoc = Math.max(0, avantAmort - amortUtilise) * (tmi + regime.ps);
    }
    const sortieLoc = coutVacances + creditLoc + chargesLoc + impotLoc - loyers;

    const sorties = { rs: sortieRS, placer: sortiePlacer, locatif: sortieLoc };
    const effortCommun = Math.max(sortieRS, sortiePlacer, sortieLoc);
    totalVacances += coutVacances;
    totalLoyersNets += loyers - chargesLoc - impotLoc;
    totalImpotsLoc += impotLoc;

    // Ce qui n'est pas dépensé est placé (versement en fin d'année).
    for (const k of Object.keys(sorties)) {
      const e = etat[k];
      const verse = effortCommun - sorties[k];
      e.V = e.V * (1 + r) + verse;
      e.C += verse;
      flux[k].push({ annee: y, sortie: sorties[k], epargne: verse });
    }

    // Patrimoine net si tout était revendu et retiré cette année-là.
    const netPlac = (k) => etat[k].V - impotPlacement({ enveloppe: placement.enveloppe, valeur: etat[k].V, versements: etat[k].C, annees: y, couple: profil.couple });
    const valRS = rs.prix * Math.pow(1 + rs.revalorisation / 100, y);
    const ventRS = valRS * rs.fraisVente / 100;
    const pvRS = impotPlusValueImmo({ prixVente: valRS, fraisVente: ventRS, prixAchat: rs.prix, tauxFraisAcquisition: rs.notaire / 100, annees: y });
    const immoRS = valRS - ventRS - pvRS.impot - (anRS ? anRS.crd : 0);

    const valLot = locatif.prixLot * Math.pow(1 + locatif.revaloBien / 100, y);
    const ventLot = valLot * locatif.fraisVente / 100;
    const pvLot = impotPlusValueImmo({ prixVente: valLot, fraisVente: ventLot, prixAchat: locatif.prixLot,
      tauxFraisAcquisition: locatif.notaire / 100, annees: y, amortissements: etat.locatif.amortCumul / locatif.nbLots });
    const immoLoc = locatif.nbLots * (valLot - ventLot - pvLot.impot) - (anLoc ? anLoc.crd : 0);

    series.rs.push({ annee: y, patrimoine: immoRS + netPlac("rs"), immobilier: immoRS, placement: netPlac("rs"), impotPV: pvRS.impot });
    series.placer.push({ annee: y, patrimoine: netPlac("placer"), immobilier: 0, placement: netPlac("placer"), impotPV: 0 });
    series.locatif.push({ annee: y, patrimoine: immoLoc + netPlac("locatif"), immobilier: immoLoc, placement: netPlac("locatif"), impotPV: pvLot.impot * locatif.nbLots });
  }

  // ── Endettement (norme HCSF : 35 % maximum, 25 ans maximum ; 70 % des loyers retenus) ──
  const rev = profil.revenusMensuels;
  const loyersMensuels = locatif.nbLots * locatif.loyerLot;
  const endettement = {
    rs: (profil.creditsMensuels + pretRS.mensualite) / rev,
    placer: profil.creditsMensuels / rev,
    locatif: (profil.creditsMensuels + pretLoc.mensualite) / (rev + 0.7 * loyersMensuels),
  };

  const resultats = Object.keys(STRATEGIES).map((id) => ({
    id, ...STRATEGIES[id],
    serie: series[id], flux: flux[id],
    final: series[id][H].patrimoine,
    effortMensuelAn1: flux[id][0].sortie / 12,
    endettement: endettement[id],
    pret: id === "rs" ? { ...pretRS, emprunt: finRS.emprunt, cout: coutRS } : id === "locatif" ? { ...pretLoc, emprunt: finLoc.emprunt, cout: coutLoc } : null,
  }));
  const classement = [...resultats].sort((a, b) => b.final - a.final);

  return {
    parametres: p, horizon: H, tauxAssurance: tauxAss, resultats, classement,
    budgetCommunAn1: Math.max(...resultats.map((x) => x.flux[0].sortie)) / 12,
    totalVacances, totalLoyersNets, totalImpotsLoc,
    alertes: alertes(p, { pretRS, pretLoc, endettement, tauxAss, H, loyersMensuels, resultats, regime }),
  };
}

function alertes(p, c) {
  const a = [];
  const { profil, credit, locatif, placement } = p;
  const fin = profil.age + credit.duree;
  for (const [id, lib] of [["rs", "résidence secondaire"], ["locatif", "petites surfaces"]]) {
    const t = c.endettement[id];
    const pret = id === "rs" ? c.pretRS : c.pretLoc;
    if (pret.mensualite > 0 && t > 0.35)
      a.push({ niveau: "risque", texte: `Endettement de ${(t * 100).toFixed(1)} % pour l'option ${lib} : au-delà de 35 %, les banques refusent en général le prêt (norme HCSF).` });
  }
  if (credit.duree > 25) a.push({ niveau: "risque", texte: "Durée de prêt supérieure à 25 ans : hors de la norme HCSF, sauf exception." });
  if (fin > 80) a.push({ niveau: "risque", texte: `Le prêt se terminerait à ${fin} ans : la plupart des banques et assureurs refusent au-delà de 75 à 80 ans.` });
  else if (fin > 70) a.push({ niveau: "vigilance", texte: `Fin du prêt à ${fin} ans : l'assurance emprunteur sera plus chère et parfois limitée (garanties réduites après 65–70 ans).` });
  if (profil.age >= 55) a.push({ niveau: "vigilance", texte: `À ${profil.age} ans, un questionnaire de santé et des surprimes sont probables : taux d'assurance retenu ${c.tauxAss.toFixed(2).replace(".", ",")} %/an.` });
  if (c.H < 6) a.push({ niveau: "vigilance", texte: "Horizon court : les frais d'achat et de revente de l'immobilier sont rarement amortis en moins de 6 ans." });
  const budget = Math.max(...c.resultats.map((x) => x.flux[0].sortie)) / 12;
  if (budget > profil.revenusMensuels * 0.45)
    a.push({ niveau: "vigilance", texte: `Le budget mensuel commun (${Math.round(budget)} €) dépasse 45 % des revenus : vérifiez votre reste à vivre.` });
  if (c.regime.plafond && locatif.nbLots * locatif.loyerLot * 12 > c.regime.plafond)
    a.push({ niveau: "vigilance", texte: `Loyers supérieurs au plafond du régime micro (${c.regime.plafond.toLocaleString("fr-FR")} €) : le régime réel s'appliquera.` });
  const env = ENVELOPPES[placement.enveloppe];
  if (env.plafond && c.resultats.some((x) => x.flux.reduce((s, f) => s + f.epargne, 0) + profil.apport > env.plafond))
    a.push({ niveau: "vigilance", texte: `Les versements dépasseraient le plafond du ${env.nom} (${env.plafond.toLocaleString("fr-FR")} €) : le surplus devrait aller sur une autre enveloppe.` });
  if (profil.apport < p.rs.prix * p.rs.notaire / 100)
    a.push({ niveau: "vigilance", texte: "L'apport ne couvre pas les frais de notaire de la résidence secondaire : les banques l'exigent souvent." });
  return a;
}

/** Rendement annuel du placement à partir duquel « Louer + placer » égale la stratégie donnée. */
export function rendementEquilibre(entree, autre = "rs") {
  const ecart = (r) => {
    const p = structuredClone(entree);
    p.placement.rendement = r;
    const s = simuler(p);
    const get = (id) => s.resultats.find((x) => x.id === id).final;
    return get("placer") - get(autre);
  };
  let lo = -3, hi = 20;
  if (ecart(lo) > 0) return { valeur: lo, borne: "inf" };
  if (ecart(hi) < 0) return { valeur: hi, borne: "sup" };
  for (let k = 0; k < 40; k++) {
    const mid = (lo + hi) / 2;
    if (ecart(mid) > 0) hi = mid; else lo = mid;
  }
  return { valeur: (lo + hi) / 2, borne: null };
}

/** Grille de sensibilité : gagnant selon le rendement du placement et la revalorisation de l'immobilier. */
export function grilleSensibilite(entree, rendements = [2, 3, 4, 5, 6, 7], revalos = [0, 1, 2, 3]) {
  return revalos.map((g) => rendements.map((rd) => {
    const p = structuredClone(entree);
    p.placement.rendement = rd;
    p.rs.revalorisation = g;
    p.locatif.revaloBien = g;
    const s = simuler(p);
    return { rendement: rd, revalo: g, gagnant: s.classement[0].id, ecart: s.classement[0].final - s.classement[1].final };
  }));
}
