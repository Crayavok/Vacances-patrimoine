// Interface : écrans, navigation et graphique.
import { simuler, PARAMETRES_DEFAUT, STRATEGIES, rendementEquilibre, grilleSensibilite, tauxAssuranceSelonAge } from "./moteur.js";
import { ENVELOPPES } from "./fiscalite.js";
import { SECTIONS_PROFIL, SECTIONS_PROJETS } from "./champs.js";
import * as stock from "./stockage.js";

const VERSION = "0.1";
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const app = $("#app");

// ───────── Icônes ─────────
const svg = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const I = {
  resultat: svg('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
  personne: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>'),
  projets: svg('<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'),
  etsi: svg('<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>'),
  methode: svg('<path d="M4 4h12a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4z"/><path d="M8 9h8M8 13h6"/>'),
  soleil: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  lune: svg('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>'),
  banque: svg('<path d="M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 21h18"/>'),
  maison: svg('<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>'),
  courbe: svg('<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>'),
  immeuble: svg('<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/>'),
  alerte: svg('<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>'),
  info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'),
  copier: svg('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>'),
};

// ───────── Formats ─────────
const nf0 = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const eur = (n) => `${nf0.format(Math.round(n))} €`;
const keur = (n) => (Math.abs(n) >= 1e6 ? `${(n / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} M€` : `${nf0.format(Math.round(n / 1000))} k€`);
const pct = (x, d = 1) => `${(x * 100).toLocaleString("fr-FR", { maximumFractionDigits: d, minimumFractionDigits: d })} %`;
const num = (x) => String(x).replace(".", ",");
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// ───────── État ─────────
let params = stock.charger(PARAMETRES_DEFAUT);
const lire = (o, chemin) => chemin.split(".").reduce((x, k) => x?.[k], o);
const ecrire = (o, chemin, v) => { const k = chemin.split("."); const d = k.pop(); k.reduce((x, c) => x[c], o)[d] = v; };
const enregistrer = () => stock.enregistrer(params);

function toast(texte) {
  const t = $("#toast"); t.textContent = texte; t.classList.add("visible");
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("visible"), 2200);
}

// ───────── Champs de saisie ─────────
function champ(f) {
  const v = lire(params, f.c);
  const id = "f-" + f.c.replace(".", "-");
  const large = f.large ? " large" : "";
  if (f.type === "segment") {
    return `<div class="champ${large}"><span class="etiquette">${f.lib}</span>
      <div class="segment" data-c="${f.c}">${f.options.map(([val, lib]) => `<button type="button" data-v='${JSON.stringify(val)}' class="${val === v ? "on" : ""}">${lib}</button>`).join("")}</div>
      ${f.aide ? `<div class="aide">${f.aide}</div>` : ""}</div>`;
  }
  if (f.type === "bascule") {
    const extra = f.c === "credit.assuranceAuto" && v ? `<div class="aide">Taux retenu à ${params.profil.age} ans : ${num(tauxAssuranceSelonAge(params.profil.age).toFixed(2))} % du capital par an (assurance déléguée, non-fumeur, sans risque aggravé).</div>` : "";
    return `<div class="champ${large}"><label class="bascule"><span>${f.lib}</span><input type="checkbox" data-c="${f.c}" ${v ? "checked" : ""}></label>${extra}</div>`;
  }
  if (f.siPas && lire(params, f.siPas)) return "";
  const pre = f.preselections ? `<div class="puces" style="margin-top:4px">${f.preselections.map(([val, lib]) => `<span class="puce ${val === v ? "on" : ""}" data-c="${f.c}" data-v="${val}">${lib}</span>`).join("")}</div>` : "";
  return `<div class="champ${large}"><label for="${id}">${f.lib}</label>
    <div class="saisie"><input type="text" inputmode="decimal" id="${id}" data-c="${f.c}" value="${num(v)}" autocomplete="off"><span class="unite">${f.unite || ""}</span></div>
    ${pre}${f.aide ? `<div class="aide">${f.aide}</div>` : ""}</div>`;
}

function section(s, ouvert) {
  const couleur = s.strat ? ` style="color:var(--s-${s.strat})"` : "";
  return `<details class="repli" ${ouvert ? "open" : ""} data-sec="${s.id}"><summary><span class="ic-sec"${couleur}>${I[s.icone]}</span><span>${s.titre}${s.sous ? `<small>${s.sous}</small>` : ""}</span></summary>
    <div class="contenu"><div class="form-grille">${s.champs.map(champ).join("")}</div></div></details>`;
}

function brancherChamps(racine, rerendre) {
  $$("input[type=text][data-c]", racine).forEach((inp) => {
    inp.addEventListener("input", () => {
      const x = parseFloat(inp.value.replace(/\s/g, "").replace(",", "."));
      if (Number.isFinite(x)) { ecrire(params, inp.dataset.c, x); enregistrer(); majResumeDirect(); }
    });
    inp.addEventListener("focus", () => inp.select());
    inp.addEventListener("change", () => { if (inp.dataset.c === "profil.age") rerendre(); });
  });
  $$(".segment[data-c] button", racine).forEach((b) => b.addEventListener("click", () => {
    ecrire(params, b.parentElement.dataset.c, JSON.parse(b.dataset.v)); enregistrer(); rerendre();
  }));
  $$("input[type=checkbox][data-c]", racine).forEach((c) => c.addEventListener("change", () => {
    ecrire(params, c.dataset.c, c.checked); enregistrer(); rerendre();
  }));
  $$(".puce[data-c]", racine).forEach((p) => p.addEventListener("click", () => {
    ecrire(params, p.dataset.c, parseFloat(p.dataset.v)); enregistrer(); rerendre();
  }));
}

function resumeDirect() {
  const s = simuler(params);
  const g = s.classement[0];
  return `<a href="#/" class="lien-ligne" id="resume-direct" style="margin-bottom:14px">
    <span class="pastille-s" style="background:var(--s-${g.id});width:12px;height:12px"></span>
    <span class="grow"><span class="tres-petit muted">En tête sur ${s.horizon} ans</span><br><b>${g.court}</b> · <span class="num">${keur(g.final)}</span></span>
    <span class="chev">›</span></a>`;
}
function majResumeDirect() {
  const el = $("#resume-direct");
  if (el) el.outerHTML = resumeDirect();
}

function pageFormulaire(titre, sousTitre, sections) {
  const ouverts = new Set($$("details.repli[open]").map((d) => d.dataset.sec));
  const premiere = ouverts.size === 0;
  const scroll = window.scrollY;
  app.innerHTML = `<div class="apparition"><h1>${titre}</h1><p class="sous-titre">${sousTitre}</p>${resumeDirect()}
    ${sections.map((s, i) => section(s, premiere ? i === 0 : ouverts.has(s.id))).join("")}
    <p class="aide mt">Les valeurs sont enregistrées automatiquement sur cet appareil.</p></div>`;
  window.scrollTo(0, scroll);
  brancherChamps(app, () => pageFormulaire(titre, sousTitre, sections));
}

// ───────── Graphique en lignes (patrimoine net dans le temps) ─────────
function graphique(conteneur, resultats, H, age) {
  const W = Math.max(300, conteneur.clientWidth || 340), Ht = 230;
  const m = { g: 46, d: 92, h: 12, b: 26 };
  const toutes = resultats.flatMap((r) => r.serie.map((p) => p.patrimoine));
  let min = Math.min(0, ...toutes), max = Math.max(...toutes);
  const pasY = pasRond((max - min) / 4);
  min = Math.floor(min / pasY) * pasY; max = Math.ceil(max / pasY) * pasY;
  const x = (a) => m.g + (a / H) * (W - m.g - m.d);
  const y = (v) => m.h + (1 - (v - min) / (max - min || 1)) * (Ht - m.h - m.b);
  const pasX = H <= 10 ? 2 : H <= 20 ? 5 : 10;
  let s = `<svg viewBox="0 0 ${W} ${Ht}" height="${Ht}" role="img" aria-label="Évolution du patrimoine net pour les trois stratégies"><g class="grille">`;
  for (let v = min; v <= max + 1; v += pasY) s += `<line x1="${m.g}" x2="${W - m.d}" y1="${y(v)}" y2="${y(v)}"/>`;
  s += `</g><g class="axe">`;
  for (let v = min; v <= max + 1; v += pasY) s += `<text x="${m.g - 6}" y="${y(v) + 4}" text-anchor="end">${keur(v)}</text>`;
  for (let a = 0; a <= H; a += pasX) s += `<text x="${x(a)}" y="${Ht - 6}" text-anchor="middle">${a === 0 ? "auj." : age + a + " ans"}</text>`;
  s += `</g>`;
  for (const r of resultats) {
    s += `<path class="courbe" stroke="var(--s-${r.id})" d="${r.serie.map((p, i) => `${i ? "L" : "M"}${x(p.annee).toFixed(1)},${y(p.patrimoine).toFixed(1)}`).join("")}"/>`;
  }
  // Étiquettes directes en bout de courbe, écartées pour ne pas se chevaucher.
  const fins = resultats.map((r) => ({ r, yy: y(r.final) })).sort((a, b) => a.yy - b.yy);
  for (let i = 1; i < fins.length; i++) if (fins[i].yy - fins[i - 1].yy < 28) fins[i].yy = fins[i - 1].yy + 28;
  for (const f of fins) {
    s += `<circle class="point" cx="${x(H)}" cy="${y(f.r.final)}" r="4" fill="var(--s-${f.r.id})"/>`;
    s += `<text class="etiq" x="${x(H) + 9}" y="${f.yy - 2}">${keur(f.r.final)}</text><text class="axe" x="${x(H) + 9}" y="${f.yy + 11}" style="fill:var(--muted);font-size:10.5px">${f.r.court.replace("Louer + ", "+ ").replace("Résidence secondaire", "Rés. secondaire")}</text>`;
  }
  s += `<line class="viseur" id="viseur" y1="${m.h}" y2="${Ht - m.b}" style="display:none"/>`;
  s += resultats.map((r) => `<circle class="point" data-p="${r.id}" r="4.5" fill="var(--s-${r.id})" style="display:none"/>`).join("");
  s += `<rect x="${m.g}" y="0" width="${W - m.g - m.d}" height="${Ht}" fill="transparent" id="zone-survol"/></svg>`;
  conteneur.innerHTML = s + `<div class="infobulle" id="infobulle"></div>`;

  const zone = $("#zone-survol", conteneur), bulle = $("#infobulle", conteneur), vis = $("#viseur", conteneur);
  const montrer = (ev) => {
    const rect = conteneur.querySelector("svg").getBoundingClientRect();
    const px = ((ev.clientX - rect.left) / rect.width) * W;
    const a = Math.max(0, Math.min(H, Math.round(((px - m.g) / (W - m.g - m.d)) * H)));
    vis.setAttribute("x1", x(a)); vis.setAttribute("x2", x(a)); vis.style.display = "";
    for (const r of resultats) {
      const c = $(`circle[data-p="${r.id}"]`, conteneur);
      c.setAttribute("cx", x(a)); c.setAttribute("cy", y(r.serie[a].patrimoine)); c.style.display = "";
    }
    const tri = [...resultats].sort((p, q) => q.serie[a].patrimoine - p.serie[a].patrimoine);
    bulle.innerHTML = `<div class="muted" style="margin-bottom:4px">${a === 0 ? "Aujourd'hui" : `Dans ${a} an${a > 1 ? "s" : ""} · ${age + a} ans`}</div>` +
      tri.map((r) => `<div class="l"><span><span class="pastille-s" style="background:var(--s-${r.id})"></span>${r.court}</span><b>${keur(r.serie[a].patrimoine)}</b></div>`).join("");
    const bx = (x(a) / W) * rect.width;
    bulle.style.left = `${Math.min(Math.max(0, bx - 90), rect.width - 215)}px`;
    bulle.style.top = `-8px`;
    bulle.classList.add("visible");
  };
  const cacher = () => { bulle.classList.remove("visible"); vis.style.display = "none"; $$("circle[data-p]", conteneur).forEach((c) => (c.style.display = "none")); };
  zone.addEventListener("pointermove", montrer);
  zone.addEventListener("pointerdown", montrer);
  zone.addEventListener("pointerleave", cacher);
  zone.addEventListener("pointercancel", cacher);
}
function pasRond(v) {
  const p = Math.pow(10, Math.floor(Math.log10(Math.max(v, 1))));
  for (const k of [1, 2, 2.5, 5, 10]) if (k * p >= v) return k * p;
  return 10 * p;
}

// ───────── Écran Résultat ─────────
function alerteHTML(a) {
  return `<div class="alerte ${a.niveau}">${a.niveau === "info" ? I.info : I.alerte}<div class="x" style="color:var(--text)">${a.texte}</div></div>`;
}

function carteStrategie(r, s) {
  const p = s.parametres;
  const derniere = r.serie[s.horizon];
  const lignes = [];
  lignes.push(["Effort net la 1re année", `${eur(r.effortMensuelAn1)}/mois`]);
  if (r.pret && r.pret.emprunt > 0) {
    lignes.push(["Emprunt", eur(r.pret.emprunt)]);
    lignes.push(["Mensualité (assurance comprise)", `${eur(r.pret.mensualite)}/mois`]);
    lignes.push(["Coût du crédit (intérêts + assurance)", eur(r.pret.coutTotal)]);
  }
  lignes.push(["Taux d'endettement", r.id === "placer" ? pct(r.endettement) + " (inchangé)" : pct(r.endettement)]);
  if (r.id !== "placer") lignes.push(["Immobilier net (après revente, impôt et prêt)", eur(derniere.immobilier)]);
  if (r.id !== "placer" && derniere.impotPV > 0) lignes.push(["dont impôt sur la plus-value", eur(derniere.impotPV)]);
  lignes.push([`Placements nets (${ENVELOPPES[p.placement.enveloppe].nom})`, eur(derniere.placement)]);
  const t = r.endettement;
  const badge = r.id === "placer" ? "" : t > 0.35 ? `<span class="badge mauvais">Endettement ${pct(t)}</span>` : t > 0.33 ? `<span class="badge moyen">Endettement ${pct(t)}</span>` : `<span class="badge bon">Finançable</span>`;
  return `<div class="carte strat" style="--bord-s:var(--s-${r.id})">
    <div class="tete"><h3><span class="pastille-s" style="background:var(--s-${r.id})"></span>${r.court}</h3><span class="num">${keur(r.final)}</span></div>
    <div class="badges mt">${badge}</div>
    <ul class="calcul">${lignes.map(([a, b]) => `<li>${a}<b>${b}</b></li>`).join("")}</ul></div>`;
}

function texteResume(s) {
  const p = s.parametres;
  return `Comparaison à ${s.horizon} ans (${p.profil.age} → ${p.profil.age + s.horizon} ans), effort égal de ${eur(s.budgetCommunAn1)}/mois la 1re année :\n` +
    s.classement.map((r, i) => `${i + 1}. ${r.court} : ${eur(r.final)}`).join("\n") +
    `\nHypothèses : crédit ${num(p.credit.taux)} % sur ${p.credit.duree} ans, placement ${num(p.placement.rendement)} %/an, revalorisation ${num(p.rs.revalorisation)} %/an.`;
}

function pageResultat() {
  const s = simuler(params);
  const p = s.parametres;
  const [g, d2, d3] = s.classement;
  const eqRS = rendementEquilibre(params, "rs");
  const eqLoc = rendementEquilibre(params, "locatif");
  const ecart = g.final - d2.final;
  const max = g.final;
  const seuilTexte = (eq, autre) => eq.borne === "inf" ? `« Louer + placer » bat ${autre} même avec un placement à −3 %/an.`
    : eq.borne === "sup" ? `${autre} reste devant même avec un placement à 20 %/an.`
    : `Au-dessus de <b>${num(eq.valeur.toFixed(1))} %/an</b>, placer rapporte plus que ${autre}. Vous avez retenu ${num(p.placement.rendement)} %.`;

  app.innerHTML = `<div class="apparition">
    <div class="carte verdict"><span class="barre-gagnant" style="background:var(--s-${g.id})"></span>
      <div class="surtitre">Le plus avantageux à ${p.profil.age + s.horizon} ans</div>
      <div class="gagnant">${g.nom}</div>
      <div class="montant">${eur(g.final)}</div>
      <div class="muted petit">de patrimoine net, soit <b style="color:var(--text)">${eur(ecart)}</b> de plus que « ${d2.court} » (${pct(ecart / Math.max(1, Math.abs(d2.final)), 0)}).</div>
      <div class="podium">${s.classement.map((r, i) => `<div class="ligne"><span class="rang">${i + 1}</span><span>${r.court}</span><b class="num">${keur(r.final)}</b>
        <div class="piste"><span style="width:${Math.max(2, (Math.max(0, r.final) / max) * 100)}%;background:var(--s-${r.id})"></span></div></div>`).join("")}</div>
    </div>

    <h2>Évolution du patrimoine net</h2>
    <div class="carte">
      <div class="legende" style="margin:0 0 10px">${s.resultats.map((r) => `<span><i style="background:var(--s-${r.id})"></i>${r.court}</span>`).join("")}</div>
      <div class="graphe" id="graphe"></div>
      <p class="aide">Valeur si tout était revendu et retiré l'année indiquée : frais de revente, impôt sur les plus-values et capital restant dû déduits. Touchez le graphique pour lire une année.</p>
      <details class="mt"><summary class="petit" style="cursor:pointer;color:var(--accent-2)">Voir le tableau année par année</summary>
        <div class="table-defile mt"><table class="comparatif" style="min-width:420px"><thead><tr><th>Année</th>${s.resultats.map((r) => `<td><span class="pastille-s" style="background:var(--s-${r.id})"></span>${r.court}</td>`).join("")}</tr></thead>
        <tbody>${s.resultats[0].serie.map((_, a) => `<tr><th>${a === 0 ? "Auj." : `${a} (${p.profil.age + a} ans)`}</th>${s.resultats.map((r) => `<td class="num">${eur(r.serie[a].patrimoine)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
      </details>
    </div>

    <h2>À effort égal</h2>
    <div class="carte"><p class="petit mb0" style="margin-top:0">Chaque option mobilise la même épargne de départ (<b>${eur(p.profil.apport)}</b>) et le même budget : <b>${eur(s.budgetCommunAn1)}/mois</b> la première année. Ce qu'une option ne dépense pas (en crédit, charges ou locations de vacances) est placé au même rendement, pour une comparaison équitable.</p>
      <ul class="calcul">
        <li>Locations de vacances évitées ou payées sur ${s.horizon} ans<b>${eur(s.totalVacances)}</b></li>
        <li>Assurance emprunteur retenue<b>${num(s.tauxAssurance.toFixed(2))} %/an</b></li>
      </ul>
    </div>

    ${s.alertes.length ? `<h2>Points d'attention</h2>${s.alertes.map(alerteHTML).join("")}` : ""}

    <h2>Détail par option</h2>
    ${s.classement.map((r) => carteStrategie(r, s)).join("")}

    <h2>Seuils de bascule</h2>
    <div class="carte"><div class="seuil"><span class="ic-sec c-rs" style="width:34px;height:34px;display:grid;place-items:center;border-radius:10px;background:var(--surface-2)">${I.maison}</span><div class="petit">${seuilTexte(eqRS, "la résidence secondaire")}</div></div></div>
    <div class="carte"><div class="seuil"><span class="ic-sec c-locatif" style="width:34px;height:34px;display:grid;place-items:center;border-radius:10px;background:var(--surface-2)">${I.immeuble}</span><div class="petit">${seuilTexte(eqLoc, "les petites surfaces")}</div></div></div>

    <div class="rangee-btns mt-l"><button class="btn btn-plein" id="btn-copier">${I.copier}Copier le résumé</button></div>
    <p class="aide mt">Simulation indicative, ne constitue pas un conseil financier ou fiscal. Rendements et revalorisations ne sont jamais garantis.</p>
  </div>`;
  graphique($("#graphe"), s.resultats, s.horizon, p.profil.age);
  $("#btn-copier").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(texteResume(s)); toast("Résumé copié"); } catch { toast("Copie impossible sur cet appareil"); }
  });
}

// ───────── Écran « Et si ? » ─────────
const variations = { taux: null, rendement: null, revalo: null, horizon: null };
function paramsVaries() {
  const p = structuredClone(params);
  if (variations.taux !== null) p.credit.taux = variations.taux;
  if (variations.rendement !== null) p.placement.rendement = variations.rendement;
  if (variations.revalo !== null) { p.rs.revalorisation = variations.revalo; p.locatif.revaloBien = variations.revalo; }
  if (variations.horizon !== null) p.profil.horizon = variations.horizon;
  return p;
}
function pageEtSi() {
  const p = paramsVaries();
  const curseurs = [
    ["taux", "Taux du crédit", p.credit.taux, 1, 7, 0.05, "%"],
    ["rendement", "Rendement du placement", p.placement.rendement, 0, 10, 0.1, "%/an"],
    ["revalo", "Revalorisation de l'immobilier", p.rs.revalorisation, -3, 6, 0.1, "%/an"],
    ["horizon", "Horizon", p.profil.horizon, 3, 35, 1, "ans"],
  ];
  app.innerHTML = `<div class="apparition"><h1>Et si ?</h1><p class="sous-titre">Faites varier les hypothèses clés et voyez si le classement change. Vos réglages ne sont pas modifiés.</p>
    <div class="carte grille">${curseurs.map(([k, lib, v, mi, ma, pas, u]) => `<div class="curseur"><div class="haut"><span>${lib}</span><b id="v-${k}">${num(v)} ${u}</b></div>
      <input type="range" data-k="${k}" min="${mi}" max="${ma}" step="${pas}" value="${v}" aria-label="${lib}"></div>`).join("")}
      <div class="rangee-btns"><button class="btn" id="btn-reinit" style="flex:1">Revenir à mes valeurs</button><button class="btn btn-principal" id="btn-appliquer" style="flex:1">Appliquer</button></div>
    </div>
    <div id="etsi-res"></div>
    <h2>Qui gagne, selon le marché ?</h2>
    <p class="sous-titre petit">Option en tête selon le rendement du placement (colonnes) et la revalorisation de l'immobilier (lignes), avec vos autres hypothèses. Case entourée : la plus proche de vos réglages.</p>
    <div class="carte" id="grille-sens"></div>
    <div class="legende">${Object.entries(STRATEGIES).map(([id, st]) => `<span><i style="background:var(--s-${id})"></i>${lettre(id)} = ${st.court}</span>`).join("")}</div>
  </div>`;
  const maj = () => {
    const pv = paramsVaries();
    const s = simuler(pv);
    const max = s.classement[0].final;
    $("#etsi-res").innerHTML = `<div class="carte mt"><div class="surtitre muted tres-petit" style="font-weight:700;letter-spacing:.08em;text-transform:uppercase">À ${pv.profil.age + s.horizon} ans</div>
      <div class="podium">${s.classement.map((r, i) => `<div class="ligne"><span class="rang">${i + 1}</span><span>${r.court}</span><b class="num">${keur(r.final)}</b>
      <div class="piste"><span style="width:${Math.max(2, (Math.max(0, r.final) / max) * 100)}%;background:var(--s-${r.id})"></span></div></div>`).join("")}</div></div>`;
    const rend = [1, 2, 3, 4, 5, 6, 7, 8], rev = [-1, 0, 1, 2, 3, 4];
    const g = grilleSensibilite(pv, rend, rev);
    const proche = (liste, v) => liste.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));
    const rc = proche(rend, pv.placement.rendement), gc = proche(rev, pv.rs.revalorisation);
    $("#grille-sens").innerHTML = `<table class="sensib"><thead><tr><th></th>${rend.map((r) => `<th>${r} %</th>`).join("")}</tr></thead><tbody>
      ${g.map((ligne, i) => `<tr><th>${rev[i] > 0 ? "+" : ""}${rev[i]} %</th>${ligne.map((c) => `<td class="${c.gagnant}${c.rendement === rc && c.revalo === gc ? " actuel" : ""}" title="${STRATEGIES[c.gagnant].court}">${lettre(c.gagnant)}</td>`).join("")}</tr>`).join("")}
      </tbody></table><div class="aide mt">Colonnes : rendement du placement · lignes : revalorisation annuelle de l'immobilier.</div>`;
  };
  $$("input[type=range]").forEach((r) => r.addEventListener("input", () => {
    const k = r.dataset.k; variations[k] = parseFloat(r.value);
    const u = curseurs.find((c) => c[0] === k)[6];
    $("#v-" + k).textContent = `${num(r.value)} ${u}`;
    clearTimeout(maj.t); maj.t = setTimeout(maj, 60);
  }));
  $("#btn-reinit").addEventListener("click", () => { for (const k in variations) variations[k] = null; pageEtSi(); });
  $("#btn-appliquer").addEventListener("click", () => { params = paramsVaries(); enregistrer(); for (const k in variations) variations[k] = null; toast("Hypothèses mises à jour"); location.hash = "#/"; });
  maj();
}
const lettre = (id) => ({ rs: "R", placer: "P", locatif: "L" }[id]);

// ───────── Écran Méthode ─────────
function pageMethode() {
  app.innerHTML = `<div class="apparition prose"><h1>Méthode</h1><p class="sous-titre">Comment l'application compare les trois options.</p>
  <div class="carte">
    <h3>Le principe : à effort égal</h3>
    <p>Dans les trois cas, vous partez en vacances le même nombre de semaines, avec la même épargne de départ. Chaque année, l'option la plus coûteuse fixe le budget ; les autres placent la différence au rendement choisi. On compare ensuite le <b>patrimoine net</b> à l'horizon, comme si tout était revendu : frais d'agence, impôt sur la plus-value, impôt sur les gains des placements et capital restant dû sont déduits.</p>
    <h3>Les trois options</h3>
    <ul>
      <li><b>Résidence secondaire</b> : achat à crédit, frais de notaire, taxes foncière et d'habitation, fonctionnement et entretien. Location saisonnière facultative (meublé de tourisme non classé, micro-BIC avec abattement de 30 %).</li>
      <li><b>Louer + placer</b> : vous louez vos vacances et placez l'épargne et l'économie mensuelle.</li>
      <li><b>Louer + petites surfaces</b> : vous louez vos vacances et achetez à crédit des logements loués à l'année. 70 % des loyers sont pris en compte pour l'endettement, comme le font les banques.</li>
    </ul>
    <h3>Crédit, âge et endettement</h3>
    <ul>
      <li>Prêt amortissable à mensualités constantes ; assurance calculée sur le capital initial.</li>
      <li>Taux d'assurance selon l'âge (désactivable) : de 0,10 % avant 30 ans à 0,85 % après 65 ans.</li>
      <li>Norme HCSF : 35 % d'endettement et 25 ans maximum. Alerte si le prêt se termine après 70 ou 80 ans.</li>
    </ul>
    <h3>Fiscalité 2026 retenue</h3>
    <ul>
      <li>Prélèvements sociaux : 18,6 % sur dividendes, plus-values mobilières, PEA, compte-titres et LMNP ; 17,2 % maintenus sur revenus fonciers, plus-values immobilières et assurance vie.</li>
      <li>Compte-titres : flat tax de 31,4 %. PEA après 5 ans : 18,6 %. Assurance vie après 8 ans : 17,2 % + 7,5 % après abattement (4 600 € ou 9 200 €). Livrets : exonérés.</li>
      <li>Plus-values immobilières : 19 % + 17,2 %, abattements pour durée de détention (exonération à 22 et 30 ans), forfaits de 7,5 % (frais d'achat) et 15 % (travaux, après 5 ans), surtaxe au-delà de 50 000 €.</li>
      <li>Location : micro-foncier (abattement 30 %), micro-BIC meublé (50 %) ou LMNP au réel (charges, intérêts et amortissements déductibles ; amortissements du bâti réintégrés dans la plus-value depuis 2025 ; 600 €/an de comptable).</li>
    </ul>
    <h3>Limites</h3>
    <ul>
      <li>Calcul annuel, rendements constants : la réalité est plus irrégulière, surtout en bourse.</li>
      <li>Le plaisir, la liberté ou la contrainte d'un bien ne sont pas chiffrés.</li>
      <li>Pas de prise en compte de l'IFI, des droits de succession, des plafonds de niches fiscales ni de votre situation fiscale complète.</li>
    </ul>
    <h3>Sources des valeurs par défaut (novembre 2026)</h3>
    <ul>
      <li>Taux de crédit : baromètres Pretto et Meilleurtaux, novembre 2026 (≈ 3,8 % sur 20–25 ans).</li>
      <li>Prélèvements sociaux : LFSS 2026 (service-public.gouv.fr).</li>
      <li>Livret A à 1,7 % depuis le 1er août 2026 ; fonds euros ≈ 2,6 % en 2025 (ACPR), 2,8–2,9 % attendus en 2026.</li>
    </ul>
  </div>
  <div class="carte mt"><h3>Vos données</h3><p>Tout est calculé et enregistré sur votre iPhone. Rien n'est envoyé.</p>
    <button class="btn btn-plein" id="btn-defaut">Revenir aux valeurs par défaut</button></div>
  <p class="aide mt">Version ${VERSION} · Simulation indicative, ne constitue pas un conseil en investissement.</p></div>`;
  let confirme = false;
  $("#btn-defaut").addEventListener("click", (e) => {
    if (!confirme) { confirme = true; e.target.textContent = "Touchez à nouveau pour confirmer"; return; }
    params = structuredClone(PARAMETRES_DEFAUT); enregistrer(); toast("Valeurs par défaut rétablies"); location.hash = "#/profil";
  });
}

// ───────── Navigation ─────────
const ROUTES = {
  "": ["resultat", pageResultat],
  profil: ["profil", () => pageFormulaire("Profil", "Votre situation, vos vacances et les conditions de crédit.", SECTIONS_PROFIL)],
  projets: ["projets", () => pageFormulaire("Options", "Les trois façons de profiter de vos vacances.", SECTIONS_PROJETS)],
  etsi: ["etsi", pageEtSi],
  methode: ["methode", pageMethode],
};
let routeCourante = null;
function router() {
  const cle = location.hash.replace(/^#\/?/, "");
  const [onglet, rendu] = ROUTES[cle] || ROUTES[""];
  if (routeCourante !== cle) window.scrollTo(0, 0);
  routeCourante = cle;
  $$(".onglets a").forEach((a) => a.classList.toggle("actif", a.dataset.onglet === onglet));
  rendu();
}

function appliquerTheme(t) {
  document.documentElement.dataset.theme = t;
  $("#btn-theme").innerHTML = t === "clair" ? I.lune : I.soleil;
  $('meta[name="theme-color"]').setAttribute("content", t === "clair" ? "#f4f6fa" : "#0a0c11");
}

function demarrer() {
  for (const a of $$(".onglets a")) $(".ic", a).innerHTML = I[a.dataset.onglet === "profil" ? "personne" : a.dataset.onglet];
  appliquerTheme(stock.theme());
  $("#btn-theme").addEventListener("click", () => {
    const t = document.documentElement.dataset.theme === "clair" ? "sombre" : "clair";
    stock.enregistrerTheme(t); appliquerTheme(t);
    if (!location.hash || location.hash === "#/") pageResultat();
  });
  window.addEventListener("hashchange", router);
  let largeur = window.innerWidth;
  window.addEventListener("resize", () => { if (Math.abs(window.innerWidth - largeur) > 40 && $("#graphe")) { largeur = window.innerWidth; pageResultat(); } });
  router();
  if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
}
demarrer();
