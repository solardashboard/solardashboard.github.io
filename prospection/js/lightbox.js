// IGN orthophoto lightbox.

function openLightbox() {
  const l = State.leads.find(x => x.id === State.selectedId);
  if (!l) return;

  document.getElementById('lb-img').src      = ignThumbnailUrl(l.lat, l.lng, 600);
  document.getElementById('lb-name').textContent = l.name;
  document.getElementById('lb-meta').textContent = [
    l.commune,
    l.puissance_kwc ? `${l.puissance_kwc.toLocaleString('fr')} kWc` : null,
    l.area ? `${Math.round(l.area).toLocaleString('fr')} m²` : null,
  ].filter(Boolean).join(' · ');
  document.getElementById('lb-score').textContent = `⚡ ${l.score}/100`;

  updateLightboxSave();
  document.getElementById('lightbox').classList.add('open');
  document.addEventListener('keydown', _onLightboxKey);
}

function closeLightbox(e) {
  const lb = document.getElementById('lightbox');
  // Allow close via backdrop click or close button; ignore clicks on inner content
  if (e && e.target !== lb && !e.target.classList.contains('lightbox-close')) return;
  lb.classList.remove('open');
  document.removeEventListener('keydown', _onLightboxKey);
}

function _onLightboxKey(e) {
  if (e.key === 'Escape') document.getElementById('lightbox').classList.remove('open');
}

function updateLightboxSave() {
  const btn = document.getElementById('lb-save');
  if (!btn || !State.selectedId) return;
  const saved     = State.savedIds.has(State.selectedId);
  btn.textContent = saved ? '⭐ Sauvegardé' : '🤍 Sauvegarder';
  btn.classList.toggle('saved', saved);
}
