// NAF code → sector label (matched on the 2-digit division prefix).

const NAF_SECTORS = {
  '01': 'Agriculture',
  '02': 'Sylviculture',
  '03': 'Pêche & aquaculture',
  '05': 'Extraction de charbon',
  '06': 'Extraction d\'hydrocarbures',
  '07': 'Extraction de minerais',
  '08': 'Autres industries extractives',
  '09': 'Services extraction',
  '10': 'Industrie alimentaire',
  '11': 'Boissons',
  '12': 'Tabac',
  '13': 'Textile',
  '14': 'Habillement',
  '15': 'Cuir & chaussure',
  '16': 'Bois & papier',
  '17': 'Papier & carton',
  '18': 'Imprimerie',
  '19': 'Raffinage de pétrole',
  '20': 'Chimie',
  '21': 'Pharmacie',
  '22': 'Caoutchouc & plastique',
  '23': 'Minéraux non métalliques',
  '24': 'Métallurgie',
  '25': 'Fabrication métallique',
  '26': 'Électronique & informatique',
  '27': 'Équipements électriques',
  '28': 'Machines & équipements',
  '29': 'Automobile',
  '30': 'Autres matériels de transport',
  '31': 'Meubles',
  '32': 'Autres industries',
  '33': 'Réparation industrielle',
  '35': 'Énergie',
  '36': 'Eau',
  '37': 'Assainissement',
  '38': 'Collecte & traitement des déchets',
  '39': 'Dépollution',
  '41': 'Promotion immobilière',
  '42': 'Génie civil',
  '43': 'Travaux spécialisés',
  '45': 'Commerce automobile',
  '46': 'Commerce de gros',
  '47': 'Commerce de détail',
  '49': 'Transport terrestre',
  '50': 'Transport maritime',
  '51': 'Transport aérien',
  '52': 'Logistique & entreposage',
  '53': 'Courrier & livraison',
  '55': 'Hébergement',
  '56': 'Restauration',
  '58': 'Édition',
  '59': 'Production audiovisuelle',
  '60': 'Audiovisuel',
  '61': 'Télécommunications',
  '62': 'Informatique & logiciels',
  '63': 'Services d\'information',
  '64': 'Finance & banque',
  '65': 'Assurance',
  '66': 'Auxiliaires financiers',
  '68': 'Immobilier',
  '69': 'Juridique & comptabilité',
  '70': 'Direction d\'entreprises',
  '71': 'Architecture & ingénierie',
  '72': 'Recherche & développement',
  '73': 'Publicité & marketing',
  '74': 'Activités spécialisées',
  '75': 'Vétérinaires',
  '77': 'Location & crédit-bail',
  '78': 'Emploi & RH',
  '79': 'Tourisme & voyages',
  '80': 'Sécurité & surveillance',
  '81': 'Services aux bâtiments',
  '82': 'Services administratifs',
  '84': 'Administration publique',
  '85': 'Enseignement',
  '86': 'Santé humaine',
  '87': 'Hébergement médico-social',
  '88': 'Action sociale',
  '90': 'Arts & spectacles',
  '91': 'Bibliothèques & musées',
  '92': 'Jeux & paris',
  '93': 'Sports & loisirs',
  '94': 'Organisations associatives',
  '95': 'Réparation informatique',
  '96': 'Services personnels',
};

/** Returns a human-readable sector label for a NAF code, or null if not found. */
function nafToSector(nafCode) {
  if (!nafCode) return null;
  const prefix = nafCode.replace('.', '').substring(0, 2);
  return NAF_SECTORS[prefix] || null;
}

// ── Taux d'autoconsommation par code NAF exact ────────────────────────────
// Correspondance issue du modèle de scoring. Défaut : 0.60.

const NAF_AUTOCONSO = {
  // Industrie manufacturière — process continu
  '28.25Z': 0.80, '28.92Z': 0.80, '22.29A': 0.75, '22.23Z': 0.75,
  '20.14Z': 0.80, '11.02B': 0.75, '01.21Z': 0.65, '01.30Z': 0.60,
  '01.61Z': 0.65,
  // Logistique / entrepôts
  '52.10B': 0.65, '49.10Z': 0.55, '49.39A': 0.55, '49.31Z': 0.55,
  '51.3A':  0.60, '50.1Z':  0.55,
  // Commerce / distribution
  '46.34Z': 0.70, '46.21Z': 0.70, '47.11D': 0.75, '47.25Z': 0.70,
  // Immobilier / bureaux
  '68.20A': 0.60, '68.20B': 0.55, '68.31Z': 0.60, '70.10Z': 0.60,
  '70.2A':  0.60,
  // Santé / médico-social — 24/7
  '86.10Z': 0.40, '87.10A': 0.40, '87.90B': 0.45,
  // Enseignement — vacances scolaires
  '85.10Z': 0.35, '85.20Z': 0.35,
  // Hôtellerie
  '55.10Z': 0.45,
  // Services financiers
  '64.11Z': 0.55, '64.19Z': 0.55, '64.20Z': 0.55, '66.19A': 0.55,
  // BTP / ingénierie
  '42.99Z': 0.60, '43.12B': 0.60, '71.20B': 0.60, '74.1J':  0.60,
  // Autres
  '59.14Z': 0.50, '72.11Z': 0.65, '80.1Z':  0.55, '84.11Z': 0.50,
  '84.25Z': 0.50, '91.01Z': 0.45, '94.91Z': 0.45, '94.99Z': 0.50,
  '37.00Z': 0.70,
};

const NAF_AUTOCONSO_DEFAULT = 0.60;

/** Returns the autoconsommation rate (0–1) for a NAF code. Defaults to 0.60. */
function nafToAutoconso(nafCode) {
  if (!nafCode) return NAF_AUTOCONSO_DEFAULT;
  return NAF_AUTOCONSO[nafCode] ?? NAF_AUTOCONSO_DEFAULT;
}
