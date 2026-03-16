// Entry point: password gate, drag & drop, and app initialisation.

// ── Password gate ──────────────────────────────────────────────────────────
(function () {
  if (sessionStorage.getItem('sd_auth') === '1') {
    document.getElementById('gate').classList.add('hidden');
  }
})();

function checkPassword() {
  const inp = document.getElementById('gateInput');
  const err = document.getElementById('gateError');
  if (inp.value === CONFIG.PASSWORD) {
    sessionStorage.setItem('sd_auth', '1');
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
