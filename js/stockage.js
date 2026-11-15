// Enregistrement des hypothèses sur l'appareil (localStorage), fusionné avec les valeurs par défaut.
const CLE = "vp-parametres-v1";
const CLE_THEME = "vp-theme";

function fusion(defaut, sauve) {
  if (typeof defaut !== "object" || defaut === null) return sauve ?? defaut;
  const out = {};
  for (const k of Object.keys(defaut)) {
    const v = sauve?.[k];
    out[k] = typeof defaut[k] === "object" && defaut[k] !== null ? fusion(defaut[k], v) : (typeof v === typeof defaut[k] ? v : defaut[k]);
  }
  return out;
}

export function charger(defaut) {
  try { return fusion(defaut, JSON.parse(localStorage.getItem(CLE) || "{}")); }
  catch { return structuredClone(defaut); }
}
export function enregistrer(p) {
  try { localStorage.setItem(CLE, JSON.stringify(p)); } catch { /* stockage indisponible */ }
}
export function theme() {
  try { return localStorage.getItem(CLE_THEME) || "sombre"; } catch { return "sombre"; }
}
export function enregistrerTheme(t) {
  try { localStorage.setItem(CLE_THEME, t); } catch { /* ignoré */ }
}
