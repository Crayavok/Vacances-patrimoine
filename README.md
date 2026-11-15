# Vacances & Patrimoine

Louer son lieu de vacances, acheter une résidence secondaire, placer son argent ou acheter des petites surfaces à louer : quelle option laisse le plus de patrimoine ?

**Application en ligne :** https://crayavok.github.io/vacances-patrimoine/

## Installer sur iPhone
1. Ouvrir l'adresse ci-dessus dans **Safari**.
2. Toucher **Partager**, puis **Sur l'écran d'accueil**.
3. L'application s'ouvre ensuite en plein écran et fonctionne hors ligne.

## Version 0.1 : ce qui fonctionne
- **Trois stratégies comparées à effort égal** : résidence secondaire ; louer ses vacances et placer ; louer ses vacances et acheter des petites surfaces. Chaque année, l'option la plus coûteuse fixe le budget et les autres placent la différence.
- **Profil** : âge, revenus, crédits en cours, épargne disponible, tranche d'imposition, foyer seul ou en couple, horizon.
- **Crédit** : taux, durée, assurance emprunteur calculée selon l'âge, quotité, frais de garantie.
- **Endettement** : norme HCSF (35 %, 25 ans), 70 % des loyers retenus, alertes sur l'âge en fin de prêt.
- **Fiscalité 2026** : prélèvements sociaux à 18,6 % ou 17,2 % selon le revenu, flat tax 31,4 %, PEA, assurance vie, livrets ; plus-values immobilières avec abattements et surtaxe ; micro-foncier, micro-BIC et LMNP au réel (amortissements réintégrés à la revente).
- **Résultat** : classement, graphique du patrimoine net année par année, détail par option, seuils de bascule (rendement à partir duquel placer devient plus intéressant).
- **Et si ?** : curseurs (taux, rendement, revalorisation, horizon) et grille « qui gagne selon le marché ».
- Données enregistrées uniquement sur l'appareil, thème sombre ou clair.

Simulation indicative : ne constitue pas un conseil en investissement. Voir [docs/METHODE.md](docs/METHODE.md).

## Structure
```
index.html          Page de l'application
css/app.css         Thème (repris d'Auto Intelligence) et mise en page
js/app.js           Écrans, navigation, graphique
js/moteur.js        Moteur de comparaison (crédit, flux annuels, patrimoine net, alertes)
js/fiscalite.js     Règles fiscales 2026
js/champs.js        Description des champs de saisie
js/stockage.js      Enregistrement sur l'appareil
tests/              Tests du moteur : node --test tests/*.mjs
sw.js               Fonctionnement hors ligne
```
