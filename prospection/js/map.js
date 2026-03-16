// Leaflet map, marker factory, and cluster management.

let map;
let cluster;
const markerMap = {};  // id → Leaflet marker

function initMap() {
  map = L.map('map', { zoomControl: true })
          .setView(CONFIG.DEFAULT_CENTER, CONFIG.DEFAULT_ZOOM);

  L.tileLayer(CONFIG.TILE_URL, {
    attribution: CONFIG.TILE_ATTR,
    maxZoom: CONFIG.MAX_ZOOM,
  }).addTo(map);

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

function makeIcon(score, selected) {
  const color = score > 50 ? '#16a34a' : score >= 20 ? '#d97706' : '#64748b';
  const size  = selected ? 38 : 30;
  const svg   = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 30 30">
    <circle cx="15" cy="15" r="13" fill="${color}"
      fill-opacity="${selected ? 1 : 0.9}"
      stroke="${selected ? '#1e293b' : '#fff'}"
      stroke-width="${selected ? 2.5 : 1.5}"/>
    <text x="15" y="19.5" text-anchor="middle"
      font-size="11" font-family="Inter,sans-serif"
      font-weight="800" fill="#fff">${score}</text>
  </svg>`;
  return L.divIcon({ html: svg, className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
}

function initMarkers(leads) {
  cluster.clearLayers();
  Object.keys(markerMap).forEach(k => delete markerMap[k]);

  leads.forEach(lead => {
    const m = L.marker([lead.lat, lead.lng], { icon: makeIcon(lead.score, false) });
    const meta = [
      lead.commune,
      lead.puissance_kwc ? `${lead.puissance_kwc.toLocaleString('fr')} kWc` : null,
    ].filter(Boolean).join(' · ');

    m.bindPopup(`
      <div class="popup-inner">
        <strong>${lead.name}</strong>
        <div class="pop-meta">${meta}</div>
        <div class="pop-score">⚡ Score ${lead.score}/100</div>
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
    if (lead) m.setIcon(makeIcon(lead.score, lid == State.selectedId));
  });
}
