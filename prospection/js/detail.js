// Detail panel: prospect selection, population, and save toggle.

// ── IGN image helpers ─────────────────────────────────────────────────────

/** Compute a square bbox for the WMS request.
 *  If a polygon bbox is provided, it expands around it with padding and
 *  squares it so the resulting image has no distortion. */
function _computeImgBbox(lat, lng, polygonBbox) {
  const pad = CONFIG.IGN_BUFFER_DEG;
  if (polygonBbox) {
    let { minLat, maxLat, minLng, maxLng } = polygonBbox;
    minLat -= pad; maxLat += pad;
    minLng -= pad; maxLng += pad;
    // Expand the smaller dimension to make the bbox square
    const dLat = maxLat - minLat;
    const dLng = maxLng - minLng;
    if (dLat > dLng) { const d = (dLat - dLng) / 2; minLng -= d; maxLng += d; }
    else              { const d = (dLng - dLat) / 2; minLat -= d; maxLat += d; }
    return { minLat, maxLat, minLng, maxLng };
  }
  return { minLat: lat - pad, maxLat: lat + pad, minLng: lng - pad, maxLng: lng + pad };
}

function ignThumbnailUrl(lat, lng, px = 300, polygonBbox = null) {
  const { minLat, maxLat, minLng, maxLng } = _computeImgBbox(lat, lng, polygonBbox);
  const bbox = `${minLat},${minLng},${maxLat},${maxLng}`;
  return `${CONFIG.IGN_WMS}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap`
       + `&LAYERS=${CONFIG.IGN_LAYER}&STYLES=&FORMAT=image/jpeg`
       + `&CRS=EPSG:4326&BBOX=${bbox}&WIDTH=${px}&HEIGHT=${px}`;
}

/** Project polygon ring onto canvas and draw it. */
function drawPolygon(canvasId, polygonRing, lat, lng, polygonBbox, px) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !polygonRing) { if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height); return; }
  canvas.width = px; canvas.height = px;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, px, px);

  const { minLat, maxLat, minLng, maxLng } = _computeImgBbox(lat, lng, polygonBbox);
  const dLng = maxLng - minLng;
  const dLat = maxLat - minLat;

  const project = ([lng, lat]) => [
    ((lng - minLng) / dLng) * px,
    ((maxLat - lat)  / dLat) * px,
  ];

  ctx.beginPath();
  polygonRing.forEach(([lng, lat], i) => {
    const [x, y] = project([lng, lat]);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle   = 'rgba(245,158,11,0.18)';
  ctx.fill();
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth   = 2.5;
  ctx.stroke();
}

function selectLead(id) {
  State.selectedId = id;
  const l = State.leads.find(l => l.id === id);
  if (!l) return;

  refreshMarkers();
  map.setView([l.lat, l.lng], 19, { animate: true });

  // Header
  document.getElementById('dp-name').textContent    = l.name;
  document.getElementById('dp-address').textContent =
    [l.rue, l.code_postal, l.commune].filter(Boolean).join(', ') || '—';

  const nafEl = document.getElementById('dp-naf');
  const sector = nafToSector(l.naf);
  nafEl.textContent   = sector || (l.naf ? `NAF ${l.naf}` : '');
  nafEl.style.display = (sector || l.naf) ? '' : 'none';

  // Potentiel économique
  document.getElementById('dp-ca').textContent      = l.ca_potentiel  ? `${Math.round(l.ca_potentiel).toLocaleString('fr')} k€` : '—';
  document.getElementById('dp-payback').textContent = l.payback_years ? `${l.payback_years} ans`                                 : '—';

  // Potentiel solaire
  document.getElementById('dp-power').textContent       = l.puissance_kwc  ? `${l.puissance_kwc.toLocaleString('fr')} kWc`  : '—';
  document.getElementById('dp-production').textContent  = l.production_mwh ? `${l.production_mwh.toLocaleString('fr')} MWh` : '—';
  document.getElementById('dp-surface').textContent     = l.area           ? `${Math.round(l.area).toLocaleString('fr')} m²` : '—';
  document.getElementById('dp-consumption').textContent = l.consumption    ? `${l.consumption.toFixed(1)} MWh`               : '—';

  // Toiture
  document.getElementById('dp-orientation').textContent = l.orientation    || '—';
  document.getElementById('dp-toit-type').textContent   = l.toit_plat      || '—';
  document.getElementById('dp-mat').textContent         = l.mat_toit_class || '—';

  // Contact
  document.getElementById('dp-director').textContent  = l.director_name || '—';
  document.getElementById('dp-phone').innerHTML       = l.phone    ? `<a href="tel:${l.phone}">${l.phone}</a>`   : '—';
  document.getElementById('dp-email').innerHTML       = l.email    ? `<a href="mailto:${l.email}">${l.email}</a>` : '—';
  document.getElementById('dp-website').innerHTML     = l.website  ? `<a href="https://${l.website.replace(/^https?:\/\//, '')}" target="_blank">${l.website}</a>` : '—';
  document.getElementById('dp-linkedin').innerHTML    = l.linkedin ? `<a href="${l.linkedin}" target="_blank">Voir profil</a>` : '—';

  // Action buttons
  document.getElementById('dp-btn-phone').onclick = () => l.phone && window.open(`tel:${l.phone}`);
  document.getElementById('dp-btn-email').onclick = () => l.email && window.open(`mailto:${l.email}`);

  // Thumbnail + polygon overlay + map links
  document.getElementById('dp-thumb').src       = ignThumbnailUrl(l.lat, l.lng, 300, l.polygonBbox);
  drawPolygon('dp-canvas', l.polygonRing, l.lat, l.lng, l.polygonBbox, 300);
  document.getElementById('dp-gmaps').href      = `https://www.google.com/maps/search/?api=1&query=${l.lat},${l.lng}`;
  document.getElementById('dp-streetview').href = `https://www.google.com/maps?q=&layer=c&cbll=${l.lat},${l.lng}`;

  updateSaveButton();
  document.getElementById('detailPanel').classList.add('visible');
  renderList();
}

function closeDetail() {
  State.selectedId = null;
  document.getElementById('detailPanel').classList.remove('visible');
  refreshMarkers();
  renderList();
}

// ── Save ──────────────────────────────────────────────────────────────────
function toggleSave() {
  if (!State.selectedId) return;
  State.savedIds.has(State.selectedId)
    ? State.savedIds.delete(State.selectedId)
    : State.savedIds.add(State.selectedId);
  updateSaveButton();
  updateLightboxSave();
  renderList();
}

function updateSaveButton() {
  const btn = document.getElementById('dp-btn-save');
  if (!btn || !State.selectedId) return;
  const saved      = State.savedIds.has(State.selectedId);
  btn.textContent  = saved ? '⭐ Sauvegardé' : '🤍 Sauvegarder';
  btn.classList.toggle('saved', saved);
}
