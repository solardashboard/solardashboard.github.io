// Entry point: password gate, drag & drop, and app initialisation.

// ── Client actif ────────────────────────────────────────────────────────────
// Exposé globalement pour proposal.js et les autres modules.
window.CLIENT = null;

function applyClient(client) {
  window.CLIENT = client;

  // Couleur accent : surcharge les CSS variables --sun et --sun-dark
  const hex = '#' + client.accentColor;
  document.documentElement.style.setProperty('--sun', hex);
  // Variante sombre : multiplie chaque canal par 0.85
  const r = parseInt(client.accentColor.slice(0, 2), 16);
  const g = parseInt(client.accentColor.slice(2, 4), 16);
  const b = parseInt(client.accentColor.slice(4, 6), 16);
  const darker = '#' + [r, g, b].map(c => Math.round(c * 0.85).toString(16).padStart(2, '0')).join('');
  document.documentElement.style.setProperty('--sun-dark', darker);

  // Topbar : badge client
  const badge = document.getElementById('clientBadge');
  if (badge) {
    badge.textContent = client.name;
    badge.style.display = 'inline-flex';
    badge.style.color   = hex;
  }
}

// ── Password gate ──────────────────────────────────────────────────────────
(function () {
  const savedClient = sessionStorage.getItem('sd_client');
  if (savedClient) {
    const client = CLIENTS[savedClient];
    if (client) {
      applyClient(client);
      document.getElementById('gate').classList.add('hidden');
    }
  }
})();

function checkPassword() {
  const inp    = document.getElementById('gateInput');
  const err    = document.getElementById('gateError');
  const pwd    = inp.value.trim();
  const client = CLIENTS[pwd];

  if (client) {
    sessionStorage.setItem('sd_client', pwd);
    applyClient(client);
    document.getElementById('gate').classList.add('hidden');
  } else {
    err.textContent = 'Mot de passe incorrect.';
    inp.classList.add('error');
    inp.value = '';
    setTimeout(() => inp.classList.remove('error'), 400);
  }
}

// ── Drag & drop (whole page) ───────────────────────────────────────────────
const _dropOverlay = document.getElementById('dropOverlay');
const _sidebar     = document.querySelector('.sidebar');

function _showDropZone() {
  _dropOverlay.classList.add('active');
  _sidebar.classList.add('drop-target');
}

function _hideDropZone() {
  _dropOverlay.classList.remove('active');
  _sidebar.classList.remove('drop-target');
}

function _handleFile(file) {
  if (!file) return;
  if (!file.name.endsWith('.geojson') && !file.name.endsWith('.json')) {
    showToast('❌ Format non supporté — utilisez un fichier .geojson');
    return;
  }
  const reader   = new FileReader();
  reader.onload  = ev => {
    try   { loadGeoJSON(JSON.parse(ev.target.result), file.name); }
    catch { showToast('❌ JSON invalide'); }
  };
  reader.readAsText(file);
}

document.addEventListener('dragenter', e => { e.preventDefault(); _showDropZone(); });
document.addEventListener('dragleave', e => {
  if (e.relatedTarget && document.contains(e.relatedTarget)) return;
  _hideDropZone();
});
document.addEventListener('dragover', e => e.preventDefault());
document.addEventListener('drop', e => {
  e.preventDefault();
  _hideDropZone();
  _handleFile(e.dataTransfer.files[0]);
});

// ── Init ──────────────────────────────────────────────────────────────────
initMap();
renderList();
