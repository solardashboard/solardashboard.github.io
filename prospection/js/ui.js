// Sidebar rendering, filters, search, and toast notifications.

/** Format a k€ value: stays in k€ below 1 000, switches to M€ above. */
function formatKeuros(k, suffix = '') {
  if (!isFinite(k) || isNaN(k)) return '—';
  if (k >= 1000) return `${(k / 1000).toFixed(1).replace('.', ',')} M€${suffix}`;
  return `${Math.round(k).toLocaleString('fr')} k€${suffix}`;
}

function quartileClass(q) { return `score-q${q}`; }

// ── Advanced filter state ─────────────────────────────────────────────────
let _kwcMin = 0, _kwcMax = Infinity;

function filteredLeads() {
  return State.leads.filter(l => {
    const matchFilter = State.currentFilter === 'all'
      || (State.currentFilter === 'saved' && State.savedIds.has(l.id));
    const matchSearch = l.name.toLowerCase().includes(State.currentSearch.toLowerCase());
    const matchKwc    = l.puissance_kwc >= _kwcMin && l.puissance_kwc <= _kwcMax;
    return matchFilter && matchSearch && matchKwc;
  });
}

// ── Advanced filter panel ─────────────────────────────────────────────────
function renderFilters() {
  const panel = document.getElementById('advFilters');
  if (!panel) return;
  panel.style.display = '';

  // Puissance kWc range
  const kwcs   = State.leads.map(l => l.puissance_kwc).filter(v => v > 0);
  const kwcMin = kwcs.length ? Math.floor(Math.min(...kwcs)) : 0;
  const kwcMax = kwcs.length ? Math.ceil(Math.max(...kwcs))  : 5000;
  const step   = Math.max(1, Math.round((kwcMax - kwcMin) / 200));

  _kwcMin = kwcMin; _kwcMax = kwcMax;

  ['caRangeMin', 'caRangeMax'].forEach(id => {
    const el = document.getElementById(id);
    el.min = kwcMin; el.max = kwcMax; el.step = step;
  });
  document.getElementById('caRangeMin').value = kwcMin;
  document.getElementById('caRangeMax').value = kwcMax;
  _updateRangeLabels();
}

function _updateRangeLabels() {
  const vMin = +document.getElementById('caRangeMin').value;
  const vMax = +document.getElementById('caRangeMax').value;
  document.getElementById('caMinLabel').textContent = `${vMin.toLocaleString('fr')} kWc`;
  document.getElementById('caMaxLabel').textContent = `${vMax.toLocaleString('fr')} kWc`;
}

function _setFilterDirty(dirty) {
  const btn = document.getElementById('filterResetBtn');
  if (btn) btn.style.display = dirty ? '' : 'none';
}

function onRangeInput() {
  const rMin = document.getElementById('caRangeMin');
  const rMax = document.getElementById('caRangeMax');
  if (+rMin.value > +rMax.value) rMin.value = rMax.value;
  if (+rMax.value < +rMin.value) rMax.value = rMin.value;
  _kwcMin = +rMin.value;
  _kwcMax = +rMax.value;
  _updateRangeLabels();
  _setFilterDirty(true);
  renderList();
}

function resetFilters() {
  renderFilters();
  _setFilterDirty(false);
  renderList();
}

function toggleFilterPanel() {
  const body = document.getElementById('advFiltersBody');
  const icon = document.getElementById('filterToggleIcon');
  const open = body.style.display !== 'none';
  body.style.display = open ? 'none' : '';
  icon.textContent   = open ? '▾' : '▴';
}

function renderList() {
  const fl        = filteredLeads();
  const chip      = document.getElementById('countChip');
  const totalChip = document.getElementById('totalChip');
  const el        = document.getElementById('leadList');
  const es        = document.getElementById('emptyState');

  chip.textContent = State.leads.length === 0
    ? 'Aucun prospect'
    : `${fl.length} prospect${fl.length > 1 ? 's' : ''}`;

  if (totalChip) totalChip.style.display = 'none';

  // Sync carte : n'afficher que les markers filtrés
  syncMapToFilter(fl.map(l => l.id));

  es.classList.toggle('hidden', State.leads.length > 0);

  if (State.leads.length === 0) {
    el.innerHTML = `<div class="sidebar-empty">
      <div class="se-icon">📂</div>
      <p>Déposez un fichier GeoJSON sur la carte pour charger vos prospects.</p>
    </div>`;
    return;
  }

  if (fl.length === 0) {
    el.innerHTML = `<div class="sidebar-empty">
      <div class="se-icon">🔍</div>
      <p>Aucun résultat pour ce filtre.</p>
    </div>`;
    return;
  }

  el.innerHTML = fl.map(l => `
    <div class="lead-item ${State.selectedId === l.id ? 'selected' : ''}" onclick="selectLead(${l.id})">
      <div class="lead-score ${quartileClass(l.quartile)}">#${l.rank}</div>
      <div class="lead-info">
        <div class="lead-name">${l.name}</div>
        <div class="lead-meta">
          ${l.puissance_kwc ? l.puissance_kwc.toLocaleString('fr') + ' kWc' : '—'} · ${l.commune || '—'}
        </div>
      </div>
    </div>
  `).join('');
}

function setFilter(btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  State.currentFilter = btn.dataset.filter;
  renderList();
}

function filterLeads() {
  State.currentSearch = document.getElementById('searchInput').value;
  renderList();
}

// ── Toast ──────────────────────────────────────────────────────────────────
let _toastTimer;

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
}
