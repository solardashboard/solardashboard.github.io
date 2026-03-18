// Sidebar rendering, filters, search, and toast notifications.

function quartileClass(q) { return `score-q${q}`; }
function statusClass(s)   { return { new: 's-new', contact: 's-contact', signed: 's-signed', lost: 's-lost' }[s] || 's-new'; }

function filteredLeads() {
  return State.leads.filter(l => {
    const matchFilter = State.currentFilter === 'all'
      || (State.currentFilter === 'saved' && State.savedIds.has(l.id));
    const matchSearch = l.name.toLowerCase().includes(State.currentSearch.toLowerCase());
    return matchFilter && matchSearch;
  });
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
