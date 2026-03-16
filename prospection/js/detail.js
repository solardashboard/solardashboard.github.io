// Detail panel: prospect selection, population, and save toggle.

function ignThumbnailUrl(lat, lng, px = 300) {
  const d    = CONFIG.IGN_BUFFER_DEG;
  const bbox = `${lat - d},${lng - d},${lat + d},${lng + d}`;
  return `${CONFIG.IGN_WMS}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap`
       + `&LAYERS=${CONFIG.IGN_LAYER}&STYLES=&FORMAT=image/jpeg`
       + `&CRS=EPSG:4326&BBOX=${bbox}&WIDTH=${px}&HEIGHT=${px}`;
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
  nafEl.textContent    = l.naf ? `NAF ${l.naf}` : '';
  nafEl.style.display  = l.naf ? '' : 'none';

  const statusBadge      = document.getElementById('dp-status-badge');
  statusBadge.textContent = l.statusLabel;
  statusBadge.className   = `badge-status ${statusClass(l.status)}`;

  // Potentiel solaire
  document.getElementById('dp-power').textContent       = l.puissance_kwc ? `${l.puissance_kwc.toLocaleString('fr')} kWc` : '—';
  document.getElementById('dp-production').textContent  = l.production_mwh ? `${l.production_mwh.toLocaleString('fr')} MWh` : '—';
  document.getElementById('dp-surface').textContent     = l.area           ? `${Math.round(l.area).toLocaleString('fr')} m²` : '—';
  document.getElementById('dp-consumption').textContent = l.consumption     ? l.consumption.toFixed(1) : '—';
  document.getElementById('dp-ratio').textContent       = l.ratio_autoproduction ? `×${l.ratio_autoproduction.toFixed(2)}` : '—';
  document.getElementById('dp-score').textContent       = `${l.score}/100`;

  // Toiture
  document.getElementById('dp-orientation').textContent = l.orientation;
  document.getElementById('dp-toit-type').textContent   = l.toit_plat;
  document.getElementById('dp-shadings').textContent    = l.shadings;
  document.getElementById('dp-mat').textContent         = l.mat_toit_class;

  // Contact
  document.getElementById('dp-director').textContent  = l.director_name || '—';
  document.getElementById('dp-phone').innerHTML       = l.phone    ? `<a href="tel:${l.phone}">${l.phone}</a>`   : '—';
  document.getElementById('dp-email').innerHTML       = l.email    ? `<a href="mailto:${l.email}">${l.email}</a>` : '—';
  document.getElementById('dp-website').innerHTML     = l.website  ? `<a href="https://${l.website.replace(/^https?:\/\//, '')}" target="_blank">${l.website}</a>` : '—';
  document.getElementById('dp-linkedin').innerHTML    = l.linkedin ? `<a href="${l.linkedin}" target="_blank">Voir profil</a>` : '—';

  // Action buttons
  document.getElementById('dp-btn-phone').onclick = () => l.phone && window.open(`tel:${l.phone}`);
  document.getElementById('dp-btn-email').onclick = () => l.email && window.open(`mailto:${l.email}`);

  // Thumbnail + map links
  document.getElementById('dp-thumb').src       = ignThumbnailUrl(l.lat, l.lng);
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
