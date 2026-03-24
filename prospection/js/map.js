// Leaflet map, marker factory, and cluster management.

let map;
let cluster;
const markerMap = {};  // id → Leaflet marker
let polygonLayer = null; // couche polygone active sur la carte

function initMap() {
  map = L.map('map', { zoomControl: true })
          .setView(CONFIG.DEFAULT_CENTER, CONFIG.DEFAULT_ZOOM);

  // ── Basemaps ────────────────────────────────────────────────────────────
  const cartoLight = L.tileLayer(CONFIG.TILE_CARTO_URL, {
    attribution: CONFIG.TILE_CARTO_ATTR,
    maxZoom: CONFIG.MAX_ZOOM,
    subdomains: 'abcd',
  });

  const esriSat = L.tileLayer(CONFIG.TILE_SAT_URL, {
    attribution: CONFIG.TILE_SAT_ATTR,
    maxZoom: CONFIG.MAX_ZOOM,
  });

  // Overlay routes + labels + admin (transparent, se superpose au sat)
  const esriRef = L.tileLayer(CONFIG.TILE_REF_URL, {
    attribution: CONFIG.TILE_REF_ATTR,
    maxZoom: CONFIG.MAX_ZOOM,
    opacity: 0.85,
  });

  // Satellite actif par défaut + overlay routes/admin
  esriSat.addTo(map);
  esriRef.addTo(map);

  // ── Contrôle de couches ──────────────────────────────────────────────────
  const baseMaps = {
    '🛰️ Satellite': esriSat,
    '🗺️ Plan (clair)': cartoLight,
  };
  const overlays = {
    '🛣️ Routes & admin': esriRef,
  };
  L.control.layers(baseMaps, overlays, { position: 'topleft', collapsed: true }).addTo(map);

  // Masquer automatiquement l'overlay routes si on passe en mode Plan
  map.on('baselayerchange', (e) => {
    if (e.name === '🗺️ Plan (clair)') {
      if (map.hasLayer(esriRef)) map.removeLayer(esriRef);
    } else {
      if (!map.hasLayer(esriRef)) esriRef.addTo(map);
    }
  });

  cluster = L.markerClusterGroup({
    maxClusterRadius: 50,
    iconCreateFunction(c) {
      const n = c.getChildCount();
      return L.divIcon({
        html: `<div style="width:42px;height:42px;border-radius:50%;background:rgba(245,158,11,0.85);
                      display:flex;align-items:center;justify-content:center;
                      font-weight:800;font-size:0.9rem;color:#0f172a;
                      border:2px solid rgba(255,255,255,0.3)">${n}</div>`,
        className: '',
        iconSize: [42, 42],
        iconAnchor: [21, 21],
      });
    },
  });

  map.addLayer(cluster);
}

function _quartileColor(q) {
  return q === 4 ? '#16a34a' : q === 3 ? '#4ade80' : q === 2 ? '#86efac' : '#64748b';
}

function makeIcon(quartile, rank, selected) {
  const color = _quartileColor(quartile);
  const size  = selected ? 38 : 30;
  const svg   = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 30 30">
    <circle cx="15" cy="15" r="13" fill="${color}"
      fill-opacity="${selected ? 1 : 0.9}"
      stroke="${selected ? '#1e293b' : '#fff'}"
      stroke-width="${selected ? 2.5 : 1.5}"/>
    <text x="15" y="19.5" text-anchor="middle"
      font-size="11" font-family="Inter,sans-serif"
      font-weight="800" fill="${quartile <= 2 ? '#0f172a' : '#fff'}">${rank}</text>
  </svg>`;
  return L.divIcon({ html: svg, className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
}

function initMarkers(leads) {
  cluster.clearLayers();
  Object.keys(markerMap).forEach(k => delete markerMap[k]);

  leads.forEach(lead => {
    const m = L.marker([lead.lat, lead.lng], { icon: makeIcon(lead.quartile, lead.rank, false) });
    const meta = [
      lead.commune,
      lead.puissance_kwc ? `${lead.puissance_kwc.toLocaleString('fr')} kWc` : null,
    ].filter(Boolean).join(' · ');

    m.bindPopup(`
      <div class="popup-inner">
        <strong>${lead.name}</strong>
        <div class="pop-meta">${meta}</div>
        <div class="pop-score">🏆 Rang #${lead.rank}</div>
      </div>
    `, { offset: [0, -4] });

    m.on('click', () => selectLead(lead.id));
    markerMap[lead.id] = m;
    cluster.addLayer(m);
  });
}

function refreshMarkers() {
  Object.entries(markerMap).forEach(([lid, m]) => {
    const lead = State.leads.find(l => l.id == lid);
    if (lead) m.setIcon(makeIcon(lead.quartile, lead.rank, lid == State.selectedId));
  });
}

function syncMapToFilter(visibleIds) {
  const visible = new Set(visibleIds.map(Number));
  Object.entries(markerMap).forEach(([lid, m]) => {
    const show = visible.has(Number(lid));
    if (show && !cluster.hasLayer(m)) cluster.addLayer(m);
    else if (!show && cluster.hasLayer(m)) cluster.removeLayer(m);
  });
}

// ── Polygon surface ────────────────────────────────────────────────────────

function clearPolygon() {
  if (polygonLayer) { map.removeLayer(polygonLayer); polygonLayer = null; }
  const card  = document.getElementById('dp-card-polygon');
  const label = document.getElementById('dp-polygon-label');
  if (card)  card.classList.remove('active');
  if (label) label.textContent = 'Polygone';
}

function togglePolygon(lead) {
  if (polygonLayer) { clearPolygon(); return; }
  if (!lead || !lead.polygonRing || lead.polygonRing.length < 3) return;

  // GeoJSON ring = [lng, lat] → Leaflet veut [lat, lng]
  const latLngs = lead.polygonRing.map(([lng, lat]) => [lat, lng]);
  polygonLayer = L.polygon(latLngs, {
    color:       '#f59e0b',
    weight:      2.5,
    opacity:     1,
    fillColor:   '#f59e0b',
    fillOpacity: 0.22,
  }).addTo(map);

  map.fitBounds(polygonLayer.getBounds(), { padding: [80, 80], maxZoom: 19 });

  const card  = document.getElementById('dp-card-polygon');
  const label = document.getElementById('dp-polygon-label');
  if (card)  card.classList.add('active');
  if (label) label.textContent = 'Masquer';
}
