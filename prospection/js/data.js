// GeoJSON parsing, score computation, and data loading.

// ── Geometry helpers ──────────────────────────────────────────────────────
function _polygonCentroid(ring) {
  // ring: [[lng, lat], ...] — handles closed rings (first == last)
  const n = (ring[0][0] === ring[ring.length-1][0] && ring[0][1] === ring[ring.length-1][1])
    ? ring.length - 1 : ring.length;
  let sumLng = 0, sumLat = 0;
  for (let i = 0; i < n; i++) { sumLng += ring[i][0]; sumLat += ring[i][1]; }
  return [sumLng / n, sumLat / n]; // [lng, lat]
}

function _polygonBbox(ring) {
  const lngs = ring.map(c => c[0]);
  const lats  = ring.map(c => c[1]);
  return { minLng: Math.min(...lngs), maxLng: Math.max(...lngs),
           minLat: Math.min(...lats), maxLat: Math.max(...lats) };
}

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
  const p   = feature.properties || {};
  const geo = feature.geometry;

  // Support Point, Polygon and MultiPolygon
  let lng, lat, polygonRing = null, polygonBbox = null;
  if (geo.type === 'Point') {
    [lng, lat] = geo.coordinates;
  } else if (geo.type === 'Polygon') {
    polygonRing = geo.coordinates[0];
    [lng, lat]  = _polygonCentroid(polygonRing);
    polygonBbox = _polygonBbox(polygonRing);
  } else if (geo.type === 'MultiPolygon') {
    polygonRing = geo.coordinates[0][0];
    [lng, lat]  = _polygonCentroid(polygonRing);
    polygonBbox = _polygonBbox(polygonRing);
  } else {
    return null; // unsupported geometry, skip
  }
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
    puissance_kwc:        parseFloat(p.puissance_kwc)        || 0,
    production_mwh:       parseFloat(p.production_mwh)       || 0,
    area:                 parseFloat(p.area)                  || 0,
    consumption:          parseFloat(p.consumption)          || 0,
    ratio_autoproduction: parseFloat(p.ratio_autoproduction) || 0,
    priorite_score:       parseFloat(p.priorite_score)       || 0,
    // Roof
    orientation:    (p.orientation    && p.orientation    !== 'nsp') ? p.orientation    : '—',
    toit_plat:      (p.toit_plat === 'True' || p.toit_plat === true) ? 'Plat' : (p.toit_plat && p.toit_plat !== 'False' && p.toit_plat !== false) ? 'Pentu' : '—',
    mat_toit_class: (p.mat_toit_class && p.mat_toit_class !== 'nsp') ? p.mat_toit_class : '—',
    // Economics
    ca_potentiel:  parseFloat(p.CA_potentiel_k_euros) || 0,
    payback_years: parseFloat(p.payback_years)        || 0,
    // Contact
    phone:        p.phone         || p.telephone || '',
    email:        p.email         || '',
    website:      p.website       || p.site      || '',
    linkedin:     p.linkedin      || '',
    director_name:p.director_name || p.directeur || '',
    // Status
    status,
    statusLabel: STATUS_LABELS[status],
    // Geometry
    polygonRing,  // [[lng,lat],...] or null
    polygonBbox,  // {minLat,maxLat,minLng,maxLng} or null
    score: 0,
  };
}

function _computeScores(leads) {
  // Sort by priorite_score descending, assign rank and quartile (4=best, 1=lowest)
  const sorted = [...leads].sort((a, b) => b.priorite_score - a.priorite_score);
  const n = sorted.length;
  return sorted.map((l, i) => ({
    ...l,
    rank:     i + 1,
    quartile: n <= 1 ? 4
            : i < n * 0.25 ? 4
            : i < n * 0.5  ? 3
            : i < n * 0.75 ? 2
            : 1,
  }));
}

function loadGeoJSON(geojson, filename) {
  if (geojson.type !== 'FeatureCollection') {
    showToast('❌ Le fichier doit être un FeatureCollection');
    return;
  }

  const SUPPORTED = ['Point', 'Polygon', 'MultiPolygon'];
  const points = geojson.features.filter(f => SUPPORTED.includes(f.geometry?.type));
  if (!points.length) {
    showToast('❌ Aucune géométrie supportée (Point, Polygon, MultiPolygon)');
    return;
  }

  State.leads = _computeScores(points.map(_parseFeature).filter(Boolean));

  closeDetail();
  renderFilters();
  initMarkers(State.leads);

  const bounds = L.latLngBounds(State.leads.map(l => [l.lat, l.lng]));
  map.fitBounds(bounds, { padding: [40, 40] });

  renderList();
  showToast(`✅ ${State.leads.length} prospects chargés depuis ${filename}`);
}
