// Tests du moteur : node --test tests/*.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { echeancier, simuler, PARAMETRES_DEFAUT, tauxAssuranceSelonAge, rendementEquilibre } from "../js/moteur.js";
import { abattementsDuree, surtaxePV, impotPlusValueImmo, impotPlacement } from "../js/fiscalite.js";

const proche = (a, b, tol = 1) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b} (±${tol})`);

test("mensualité : 200 000 € à 3,76 % sur 20 ans ≈ 1 187 € (référence Pretto, nov. 2026)", () => {
  proche(echeancier(200000, 3.76, 20, 0).mensualiteHorsAss, 1187, 1);
});

test("le capital restant dû est nul à la fin du prêt", () => {
  const e = echeancier(250000, 3.8, 20, 0.25);
  proche(e.annees.at(-1).crd, 0, 0.01);
  proche(e.annees.reduce((s, a) => s + a.principal, 0), 250000, 0.01);
});

test("abattements pour durée de détention", () => {
  assert.deepEqual(abattementsDuree(5), { ir: 0, ps: 0 });
  proche(abattementsDuree(10).ir, 0.30, 1e-9);
  proche(abattementsDuree(22).ir, 1, 1e-9);
  proche(abattementsDuree(22).ps, 0.28, 1e-9);
  proche(abattementsDuree(25).ps, 0.55, 1e-9);
  assert.equal(abattementsDuree(30).ps, 1);
});

test("surtaxe : continuité aux seuils de lissage", () => {
  assert.equal(surtaxePV(50000), 0);
  proche(surtaxePV(60000), 1200, 0.01);
  proche(surtaxePV(110000), 3300, 0.01);
  proche(surtaxePV(300000), 18000, 0.01);
});

test("plus-value exonérée après 30 ans", () => {
  const r = impotPlusValueImmo({ prixVente: 900000, fraisVente: 0, prixAchat: 200000, tauxFraisAcquisition: 0.075, annees: 30 });
  assert.equal(r.impot, 0);
});

test("placement : flat tax 31,4 % sur compte-titres, 18,6 % sur PEA après 5 ans", () => {
  proche(impotPlacement({ enveloppe: "cto", valeur: 150000, versements: 100000, annees: 10 }), 15700, 0.01);
  proche(impotPlacement({ enveloppe: "pea", valeur: 150000, versements: 100000, annees: 10 }), 9300, 0.01);
  assert.equal(impotPlacement({ enveloppe: "livret", valeur: 150000, versements: 100000, annees: 10 }), 0);
});

test("assurance vie après 8 ans : 17,2 % + 7,5 % au-delà de l'abattement", () => {
  const imp = impotPlacement({ enveloppe: "av", valeur: 150000, versements: 100000, annees: 10, couple: false });
  proche(imp, 50000 * 0.172 + (50000 - 4600) * 0.075, 0.01);
});

test("assurance emprunteur croissante avec l'âge", () => {
  assert.ok(tauxAssuranceSelonAge(30) < tauxAssuranceSelonAge(50));
  assert.ok(tauxAssuranceSelonAge(50) < tauxAssuranceSelonAge(66));
});

test("effort égal : chaque année, sortie + épargne identiques pour les trois stratégies", () => {
  const s = simuler(PARAMETRES_DEFAUT);
  for (let y = 0; y < s.horizon; y++) {
    const totaux = s.resultats.map((r) => r.flux[y].sortie + r.flux[y].epargne);
    proche(Math.max(...totaux), Math.min(...totaux), 1e-6);
  }
});

test("placement seul sans frais ni impôt : capitalisation exacte", () => {
  const p = structuredClone(PARAMETRES_DEFAUT);
  p.placement.enveloppe = "livret";
  p.placement.rendement = 0;
  const s = simuler(p);
  const placer = s.resultats.find((r) => r.id === "placer");
  const verse = placer.flux.reduce((t, f) => t + f.epargne, 0);
  proche(placer.final, p.profil.apport + verse, 0.01);
});

test("un meilleur rendement favorise « Louer + placer »", () => {
  const eq = rendementEquilibre(PARAMETRES_DEFAUT, "rs");
  const p = structuredClone(PARAMETRES_DEFAUT);
  p.placement.rendement = eq.valeur + 1;
  const s = simuler(p);
  const f = (id) => s.resultats.find((r) => r.id === id).final;
  assert.ok(f("placer") > f("rs"));
});

test("alerte d'âge en fin de prêt", () => {
  const p = structuredClone(PARAMETRES_DEFAUT);
  p.profil.age = 62; p.credit.duree = 20;
  assert.ok(simuler(p).alertes.some((a) => a.niveau === "risque" && a.texte.includes("82 ans")));
});
