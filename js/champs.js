// Description des champs de saisie, regroupés par écran et par section.
// type : "nombre" (par défaut), "segment", "bascule".

export const SECTIONS_PROFIL = [
  {
    id: "profil", titre: "Votre situation", icone: "personne", champs: [
      { c: "profil.age", lib: "Âge", unite: "ans", min: 18, max: 90, pas: 1, aide: "Fixe le coût de l'assurance emprunteur et l'âge en fin de prêt." },
      { c: "profil.couple", lib: "Foyer", type: "segment", options: [[false, "Seul"], [true, "Couple"]] },
      { c: "profil.revenusMensuels", lib: "Revenus nets du foyer", unite: "€/mois", min: 0, pas: 100 },
      { c: "profil.creditsMensuels", lib: "Crédits en cours", unite: "€/mois", min: 0, pas: 50, aide: "Mensualités déjà payées (résidence principale, auto…)." },
      { c: "profil.apport", lib: "Épargne disponible", unite: "€", min: 0, pas: 1000, aide: "Apport mobilisable, identique pour les trois options." },
      { c: "profil.horizon", lib: "Horizon", unite: "ans", min: 1, max: 40, pas: 1, aide: "Durée de la comparaison." },
      { c: "profil.tmi", lib: "Tranche marginale d'imposition", type: "segment", large: true, options: [[0, "0 %"], [11, "11 %"], [30, "30 %"], [41, "41 %"], [45, "45 %"]] },
    ],
  },
  {
    id: "vacances", titre: "Vos vacances", icone: "soleil", champs: [
      { c: "vacances.semaines", lib: "Semaines par an", unite: "sem.", min: 0, max: 52, pas: 1 },
      { c: "vacances.coutSemaine", lib: "Location d'une semaine", unite: "€", min: 0, pas: 50, aide: "Prix d'une location équivalente au bien envisagé." },
      { c: "vacances.inflation", lib: "Inflation annuelle", unite: "%", min: -2, max: 10, pas: 0.1, aide: "Appliquée aux locations de vacances et aux charges." },
    ],
  },
  {
    id: "credit", titre: "Crédit immobilier", icone: "banque", champs: [
      { c: "credit.taux", lib: "Taux du crédit", unite: "%", min: 0, max: 10, pas: 0.05, aide: "Moyenne novembre 2026 : environ 3,7 à 3,9 % sur 20–25 ans." },
      { c: "credit.duree", lib: "Durée", type: "segment", options: [[10, "10 ans"], [15, "15 ans"], [20, "20 ans"], [25, "25 ans"]], large: true },
      { c: "credit.assuranceAuto", lib: "Assurance emprunteur calculée selon l'âge", type: "bascule", large: true },
      { c: "credit.assurance", lib: "Taux d'assurance", unite: "%/an", min: 0, max: 3, pas: 0.01, siPas: "credit.assuranceAuto" },
      { c: "credit.quotite", lib: "Quotité assurée totale", unite: "%", min: 0, max: 200, pas: 10, aide: "200 % pour deux emprunteurs couverts chacun à 100 %." },
      { c: "credit.fraisGarantie", lib: "Frais de garantie", unite: "%", min: 0, max: 5, pas: 0.1, aide: "Caution ou hypothèque, en % du prêt." },
    ],
  },
];

export const SECTIONS_PROJETS = [
  {
    id: "rs", titre: "Résidence secondaire", sous: "Acheter son lieu de vacances", icone: "maison", strat: "rs", champs: [
      { c: "rs.prix", lib: "Prix du bien", unite: "€", min: 0, pas: 5000 },
      { c: "rs.notaire", lib: "Frais de notaire", unite: "%", min: 0, max: 12, pas: 0.1, aide: "≈ 7,5 % dans l'ancien, 2,5 % dans le neuf." },
      { c: "rs.ameublement", lib: "Travaux et ameublement", unite: "€", min: 0, pas: 1000 },
      { c: "rs.taxeFonciere", lib: "Taxe foncière", unite: "€/an", min: 0, pas: 100 },
      { c: "rs.taxeHabitation", lib: "Taxe d'habitation", unite: "€/an", min: 0, pas: 100, aide: "Toujours due pour une résidence secondaire, majorée dans certaines communes." },
      { c: "rs.fonctionnement", lib: "Assurance, énergie, abonnements", unite: "€/an", min: 0, pas: 100 },
      { c: "rs.entretien", lib: "Entretien et gros travaux", unite: "% du prix/an", min: 0, max: 5, pas: 0.1 },
      { c: "rs.revalorisation", lib: "Revalorisation du bien", unite: "%/an", min: -5, max: 10, pas: 0.1 },
      { c: "rs.fraisVente", lib: "Frais de revente", unite: "%", min: 0, max: 10, pas: 0.5, aide: "Honoraires d'agence à la revente." },
      { c: "rs.semainesLouees", lib: "Semaines louées à des tiers", unite: "sem./an", min: 0, max: 48, pas: 1, aide: "Location saisonnière quand vous n'y êtes pas." },
      { c: "rs.prixSemaine", lib: "Loyer d'une semaine", unite: "€", min: 0, pas: 50 },
      { c: "rs.fraisGestion", lib: "Frais de plateforme et ménage", unite: "%", min: 0, max: 50, pas: 1 },
    ],
  },
  {
    id: "placement", titre: "Placement financier", sous: "Louer ses vacances et placer", icone: "courbe", strat: "placer", champs: [
      { c: "placement.enveloppe", lib: "Enveloppe", type: "segment", large: true, options: [["av", "Assurance vie"], ["pea", "PEA"], ["cto", "Compte-titres"], ["livret", "Livret"]] },
      { c: "placement.rendement", lib: "Rendement annuel moyen", unite: "%", min: -5, max: 15, pas: 0.1, large: true,
        preselections: [[1.7, "Livret A 1,7 %"], [2.9, "Fonds euros 2,9 %"], [4, "Prudent 4 %"], [5, "Équilibré 5 %"], [7, "Actions 7 %"]],
        aide: "Net de frais de gestion, avant impôt. Historiquement ≈ 7 %/an pour les actions mondiales sur longue période, avec de fortes variations." },
    ],
  },
  {
    id: "locatif", titre: "Petites surfaces à louer", sous: "Louer ses vacances et investir", icone: "immeuble", strat: "locatif", champs: [
      { c: "locatif.nbLots", lib: "Nombre de logements", unite: "lots", min: 1, max: 10, pas: 1 },
      { c: "locatif.prixLot", lib: "Prix par logement", unite: "€", min: 0, pas: 5000 },
      { c: "locatif.notaire", lib: "Frais de notaire", unite: "%", min: 0, max: 12, pas: 0.1 },
      { c: "locatif.regime", lib: "Régime fiscal", type: "segment", large: true, options: [["nu-micro", "Nu micro"], ["meuble-micro", "Meublé micro"], ["lmnp-reel", "LMNP réel"]],
        aide: "LMNP réel : amortissements déductibles (impôt souvent nul pendant des années) mais réintégrés dans la plus-value à la revente." },
      { c: "locatif.ameublementLot", lib: "Mobilier par logement", unite: "€", min: 0, pas: 500, aide: "Seulement en meublé." },
      { c: "locatif.loyerLot", lib: "Loyer par logement", unite: "€/mois", min: 0, pas: 10, aide: "Hors charges récupérables." },
      { c: "locatif.vacanceMois", lib: "Vacance locative", unite: "mois/an", min: 0, max: 12, pas: 0.5 },
      { c: "locatif.chargesLot", lib: "Charges par logement", unite: "€/an", min: 0, pas: 100, aide: "Taxe foncière, copropriété non récupérable, assurance PNO, entretien." },
      { c: "locatif.gestion", lib: "Gestion locative", unite: "% loyers", min: 0, max: 15, pas: 0.5 },
      { c: "locatif.revaloLoyers", lib: "Hausse des loyers", unite: "%/an", min: -2, max: 6, pas: 0.1 },
      { c: "locatif.revaloBien", lib: "Revalorisation des biens", unite: "%/an", min: -5, max: 10, pas: 0.1 },
      { c: "locatif.fraisVente", lib: "Frais de revente", unite: "%", min: 0, max: 10, pas: 0.5 },
    ],
  },
];
