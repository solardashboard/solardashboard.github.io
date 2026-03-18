// Sidebar rendering, filters, search, and toast notifications.

function quartileClass(q) { return `score-q${q}`; }
function statusClass(s)   { return { new: 's-new', contact: 's-contact', signed: 's-signed', lost: 's-lost' }[s] || 's-new'; }

// ── Advanced filter state ─────────────────────────────────────────────────
let _caMin = 0, _caMax = Infinity;
let _activeSectors = null; // null = all; otherwise Set of active sector names

function _leadSector(l) { return nafToSector(l.naf) || 'Autre'; }

function filteredLeads() {
  return State.leads.filter(l => {
    const matchFilter  = State.currentFilter === 'all'
      || (State.currentFilter === 'saved' && State.savedIds.has(l.id));
    const matchSearch  = l.name.toLowerCase().includes(State.currentSearch.toLowerCase());
    const matchCA      = l.ca_potentiel >= _caMin && l.ca_potentiel <= _caMax;
    const matchSector  = !_activeSectors || _activeSectors.has(_leadSector(l));
    return matchFilter && matchSearch && matchCA && matchSector;
  });
}

// ── Advanced filter panel ─────────────────────────────────────────────────
function renderFilters() {
  const panel = document.getElementById('advFilters');
  if (!panel) return;
  panel.style.display = '';

  // CA range — use raw values from leads
  const cas   = State.leads.map(l => l.ca_potentiel).filter(v => v > 0);
  const caMin = cas.length ? Math.floor(Math.min(...cas)) : 0;
  const caMax = cas.length ? Math.ceil(Math.max(...cas))  : 10000;
  const step  = Math.max(1, Math.round((caMax - caMin) / 200));

  _caMin = caMin; _caMax = caMax;

  ['caRangeMin', 'caRangeMax'].forEach(id => {
    const el = document.getElementById(id);
    el.min = caMin; el.max = caMax; el.step = step;
  });
  document.getElementById('caRangeMin').value = caMin;
  document.getElementById('caRangeMax').value = caMax;
  _updateRangeLabels();

  // Sectors — all unique, sorted, all checked by default
  const sectors = [...new Set(State.leads.map(_leadSector))].sort((a, b) => a.localeCompare(b, 'fr'));
  _activeSectors = new Set(sectors);

  document.getElementById('sectorList').innerHTML = sectors.map(s => `
    <label class="sector-check">
      <input type="checkbox" value="${s}" checked onchange="onSectorChange(this)" />
      <span>${s}</span>
    </label>`).join('');

  // Reset toggle-all button label
  const btn = document.querySelector('.sector-toggle-all');
  if (btn) btn.textContent = 'Tout désélect.';
}

function _updateRangeLabels() {
  const vMin = +document.getElementById('caRangeMin').value;
  const vMax = +document.getElementById('caRangeMax').value;
  document.getElementById('caMinLabel').textContent = vMin.toLocaleString('fr') + ' k€';
  document.getElementById('caMaxLabel').textContent = vMax.toLocaleString('fr') + ' k€';
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
  _caMin = +rMin.value;
  _caMax = +rMax.value;
  _updateRangeLabels();
  _setFilterDirty(true);
  renderList();
}

function onSectorChange(cb) {
  if (cb.checked) _activeSectors.add(cb.value);
  else            _activeSectors.delete(cb.value);
  _setFilterDirty(true);
  renderList();
}

function toggleAllSectors(btn) {
  const checks = document.querySelectorAll('#sectorList input[type=checkbox]');
  const allChecked = [...checks].every(c => c.checked);
  checks.forEach(c => {
    c.checked = !allChecked;
    if (c.checked) _activeSectors.add(c.value);
    else           _activeSectors.delete(c.value);
  });
  btn.textContent = allChecked ? 'Tout sélect.' : 'Tout désélect.';
  _setFilterDirty(true);
  renderList();
}

function resetFilters() {
  // Re-run renderFilters which resets everything to defaults
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

  const totalCA = State.leads.reduce((sum, l) => sum + (l.ca_potentiel || 0), 0);
  if (totalCA > 0 && totalChip) {
    totalChip.textContent  = `${Math.round(totalCA).toLocaleString('fr')} k€`;
    totalChip.style.display = '';
  } else if (totalChip) {
    totalChip.style.display = 'none';
  }

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
