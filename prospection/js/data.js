// GeoJSON parsing, score computation, and data loading.

const STATUS_MAP = {
  new: 'new', nouveau: 'new',
  contact: 'contact', 'en cours': 'contact',
  signed: 'signed', signé: 'signed',
  perdu: 'lost', lost: 'lost',
};

const STATUS_LABELS = {
  new: 'Nouveau', contact: 'En cours', signed: 'Signé', lost: 'Perdu',
};

function _parseFeature(feature, index) {
  const p          = feature.properties || {};
  const [lng, lat] = feature.geometry.coordinates;
  const rawStatus  = (p.status || p.statut || 'new').toLowerCase();
  const status     = STATUS_MAP[rawStatus] || 'new';

  return {
    id:   index + 1,
    name: p.nom || p.name || `Point ${index + 1}`,
    lat,  lng,
    // Address
    rue:         p.rue          || '',
    code_postal: p.code_postal  || '',
    commune:     p.nom_commune  || p.commune || '',
    // Business
    naf: p.naf || '',
    // Solar potential
    puissance_kwc:       parseFloat(p.puissance_kwc)       || 0,
    production_mwh:      parseFloat(p.production_mwh)      || 0,
    area:                parseFloat(p.area)                 || 0,
    consumption:         parseFloat(p.consumption)         || 0,
    ratio_autoproduction:parseFloat(p.ratio_autoproduction)|| 0,
    // Roof
    orientation:    p.orientation   || '—',
    toit_plat:      (p.toit_plat === 'True' || p.toit_plat === true) ? 'Plat' : (p.toit_plat ? 'Pentu' : '—'),
    shadings:       p.shadings       || '—',
    mat_toit_class: p.mat_toit_class || '—',
    // Contact
    phone:        p.phone         || p.telephone || '',
    email:        p.email         || '',
    website:      p.website       || p.site      || '',
    linkedin:     p.linkedin      || '',
    director_name:p.director_name || p.directeur || '',
    // Status
    status,
    statusLabel: STATUS_LABELS[status],
    score: 0,   // computed after parsing all features
  };
}

function _computeScores(leads) {
  const maxP = Math.max(...leads.map(l => l.puissance_kwc), 1);
  return leads.map(l => ({
    ...l,
    score: Math.max(10, Math.min(99, Math.round((l.puissance_kwc / maxP) * 89) + 10)),
  }));
}

function loadGeoJSON(geojson, filename) {
  if (geojson.type !== 'FeatureCollection') {
    showToast('❌ Le fichier doit être un FeatureCollection');
    return;
  }

  const points = geojson.features.filter(f => f.geometry?.type === 'Point');
  if (!points.length) {
    showToast('❌ Aucun Point trouvé dans le GeoJSON');
    return;
  }

  State.leads = _computeScores(points.map(_parseFeature))
    .sort((a, b) => b.score - a.score);

  closeDetail();
  initMarkers(State.leads);

  const bounds = L.latLngBounds(State.leads.map(l => [l.lat, l.lng]));
  map.fitBounds(bounds, { padding: [40, 40] });

  renderList();
  showToast(`✅ ${State.leads.length} prospects chargés depuis ${filename}`);
}
