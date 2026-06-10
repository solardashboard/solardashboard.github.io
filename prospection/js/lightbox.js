// IGN orthophoto lightbox + sizing tool.

function openLightbox(openSizer = false) {
  const l = State.leads.find(x => x.id === State.selectedId);
  if (!l) return;

  // Image
  document.getElementById('lb-img').src = ignThumbnailUrl(l.lat, l.lng, 600, l.polygonBbox);
  drawPolygon('lb-canvas', l.polygonRing, l.lat, l.lng, l.polygonBbox, 600);

  // Info bar
  document.getElementById('lb-name').textContent = l.name;
  document.getElementById('lb-meta').textContent = [
    l.commune,
    l.puissance_kwc ? `${l.puissance_kwc.toLocaleString('fr')} kWc` : null,
    l.area ? `${Math.round(l.area).toLocaleString('fr')} m²` : null,
  ].filter(Boolean).join(' · ');
  document.getElementById('lb-score').textContent = `🏆 #${l.rank}`;

  // Contact links + liens géo
  const contacts = [];
  if (l.contact_name)  contacts.push(`<span class="lb-contact-link">👤 ${l.contact_name}</span>`);
  if (l.contact_phone) contacts.push(`<a href="tel:${l.contact_phone}" class="lb-contact-link">📞 ${l.contact_phone}</a>`);
  if (l.contact_email) contacts.push(`<a href="mailto:${l.contact_email}" class="lb-contact-link">✉️ ${l.contact_email}</a>`);
  contacts.push(`<a href="https://www.google.com/maps/search/?api=1&query=${l.lat},${l.lng}" target="_blank" class="lb-contact-link">📍 Google Maps</a>`);
  contacts.push(`<a href="https://www.google.com/maps?q=&layer=c&cbll=${l.lat},${l.lng}" target="_blank" class="lb-contact-link">🚶 Street View</a>`);
  document.getElementById('lb-contacts').innerHTML = contacts.join('');

  // Pre-fill sizer with lead data
  document.getElementById('sizerConso').value     = l.consumption   ? Math.round(l.consumption)  : 200;
  document.getElementById('sizerSurface').value   = l.area          ? Math.round(l.area)         : '';
  document.getElementById('sizerPuissance').value = l.puissance_kwc ? l.puissance_kwc            : '';
  document.getElementById('sizerPrixElec').value  = 160;

  document.getElementById('sizerAutoconso').value          = 60;
  document.getElementById('sizerAutoconsoVal').textContent = '60%';

  document.getElementById('sizerHausse').value          = 3;
  document.getElementById('sizerHausseVal').textContent = '3,0%';

  // Sizer panel : ouvert si demandé, fermé sinon
  document.getElementById('lbInner').classList.toggle('sizer-open', openSizer);
  document.getElementById('lbSizerBtn').classList.toggle('active', openSizer);
  calcSizing();

  _track('lightbox_ouverte');
  updateLightboxSave();
  document.getElementById('lightbox').classList.add('open');
  document.addEventListener('keydown', _onLightboxKey);
}

function closeLightbox(e) {
  const lb = document.getElementById('lightbox');
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

// ── Sizing tool ───────────────────────────────────────────────────────────

function toggleSizer() {
  const inner = document.getElementById('lbInner');
  const btn   = document.getElementById('lbSizerBtn');
  const open  = inner.classList.toggle('sizer-open');
  btn.classList.toggle('active', open);
  if (open) { _track('dimensionnement_ouvert'); calcSizing(); }
}

function calcSizing(source) {
  const l = State.leads.find(x => x.id === State.selectedId);
  if (!l) return;

  // Surface → puissance (sens unique)
  if (source === 'surface') {
    const surface = parseFloat(document.getElementById('sizerSurface').value) || 0;
    const derived = surface > 0 ? Math.round(surface * 0.8 / 6.5 * 10) / 10 : '';
    document.getElementById('sizerPuissance').value = derived;
  }

  const kwc        = parseFloat(document.getElementById('sizerPuissance').value)  || 0;
  const consoMwh   = parseFloat(document.getElementById('sizerConso').value)      || 0;
  const prixElec   = parseFloat(document.getElementById('sizerPrixElec').value)   || 0;

  // Tarif S21 auto-sélectionné selon puissance (en vigueur juil. 2026)
  const rachatAuto = kwc >= 100 ? 95 : 11;
  const rachatEl   = document.getElementById('sizerPrixRachat');
  if (rachatEl && (source === 'surface' || source === undefined || !rachatEl.dataset.userEdited)) {
    rachatEl.value = rachatAuto;
    rachatEl.dataset.userEdited = '';
  }
  const prixRachat = parseFloat(rachatEl?.value) || rachatAuto;
  const autoconso  = parseFloat(document.getElementById('sizerAutoconso').value) / 100;
  const hausse     = parseFloat(document.getElementById('sizerHausse').value)    / 100;

  document.getElementById('sizerAutoconsoVal').textContent = Math.round(autoconso * 100) + '%';
  document.getElementById('sizerHausseVal').textContent    = (hausse * 100).toFixed(1).replace('.', ',') + '%';

  if (kwc <= 0 || prixElec <= 0) {
    ['srCA', 'srPayback', 'srProd', 'srEco'].forEach(id =>
      document.getElementById(id).textContent = '—');
    return;
  }

  // CA : 1 100 €/kWc
  const ca_k    = kwc * 1.1;
  const investE = ca_k * 1000;

  const prodMWh = (l.production_mwh > 0 && l.puissance_kwc > 0)
    ? l.production_mwh * (kwc / l.puissance_kwc)
    : kwc * 1.1;

  const autoconsoEff = (consoMwh > 0 && prodMWh > 0)
    ? Math.min(autoconso, consoMwh / prodMWh)
    : autoconso;

  // Payback cumulatif avec autoconso + revente surplus (−2%/an)
  const DEGR        = 0.005;
  const RACHAT_DEGR = 0.02;
  let cumul = 0, payback = null;
  for (let t = 0; t < 50; t++) {
    const prod_t      = prodMWh * Math.pow(1 - DEGR, t);
    const eco_auto    = prod_t * autoconsoEff * prixElec * Math.pow(1 + hausse, t);
    const eco_surplus = prod_t * (1 - autoconsoEff) * prixRachat * Math.pow(1 - RACHAT_DEGR, t);
    cumul += eco_auto + eco_surplus;
    if (cumul >= investE) { payback = t + 1; break; }
  }

  // Économie + revente année 1
  const ecoAn1 = prodMWh * autoconsoEff * prixElec
               + prodMWh * (1 - autoconsoEff) * prixRachat;

  document.getElementById('srCA').textContent      = formatKeuros(ca_k);
  document.getElementById('srPayback').textContent = payback ? `${payback} ans` : '> 50 ans';
  document.getElementById('srProd').textContent    = `${Math.round(prodMWh).toLocaleString('fr')} MWh/an`;
  document.getElementById('srEco').textContent     = formatKeuros(ecoAn1 / 1000, '/an');

}
