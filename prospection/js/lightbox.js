// IGN orthophoto lightbox + sizing tool.

function openLightbox() {
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

  // Contact links
  const contacts = [];
  if (l.phone)    contacts.push(`<a href="tel:${l.phone}" class="lb-contact-link">📞 ${l.phone}</a>`);
  if (l.email)    contacts.push(`<a href="mailto:${l.email}" class="lb-contact-link">✉️ ${l.email}</a>`);
  if (l.linkedin) contacts.push(`<a href="${l.linkedin}" target="_blank" class="lb-contact-link">in Profil LinkedIn</a>`);
  document.getElementById('lb-contacts').innerHTML = contacts.join('');

  // Pre-fill sizer with lead data
  document.getElementById('sizerConso').value     = l.consumption   ? Math.round(l.consumption)  : 200;
  document.getElementById('sizerSurface').value   = l.area          ? Math.round(l.area)         : '';
  document.getElementById('sizerPuissance').value = l.puissance_kwc ? l.puissance_kwc            : '';
  document.getElementById('sizerPrixElec').value  = 160;

  const autoconsoNaf = nafToAutoconso(l.naf);
  document.getElementById('sizerAutoconso').value          = Math.round(autoconsoNaf * 100);
  document.getElementById('sizerAutoconsoVal').textContent = Math.round(autoconsoNaf * 100) + '%';

  document.getElementById('sizerHausse').value          = 3;
  document.getElementById('sizerHausseVal').textContent = '3,0%';

  // Close sizer panel on each open
  document.getElementById('lbInner').classList.remove('sizer-open');
  document.getElementById('lbSizerBtn').classList.remove('active');
  calcSizing();

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
  if (open) calcSizing();
}

function calcSizing() {
  const l = State.leads.find(x => x.id === State.selectedId);
  if (!l) return;

  const kwc       = parseFloat(document.getElementById('sizerPuissance').value) || 0;
  const prixElec  = parseFloat(document.getElementById('sizerPrixElec').value)  || 0;
  const autoconso = parseFloat(document.getElementById('sizerAutoconso').value) / 100; // fraction
  const hausse    = parseFloat(document.getElementById('sizerHausse').value)    / 100; // fraction

  document.getElementById('sizerAutoconsoVal').textContent = Math.round(autoconso * 100) + '%';
  document.getElementById('sizerHausseVal').textContent    = (hausse * 100).toFixed(1).replace('.', ',') + '%';

  if (kwc <= 0 || prixElec <= 0) {
    ['srCA', 'srPayback', 'srProd', 'srEco'].forEach(id =>
      document.getElementById(id).textContent = '—');
    return;
  }

  // CA : 1 100 €/kWc (formule du modèle)
  const ca_k    = kwc * 1.1;           // k€
  const investE = ca_k * 1000;         // €

  // Production : proportionnelle à la puissance saisie
  // On utilise la production réelle du site si disponible, sinon 1 100 kWh/kWc/an
  const prodMWh = (l.production_mwh > 0 && l.puissance_kwc > 0)
    ? l.production_mwh * (kwc / l.puissance_kwc)
    : kwc * 1.1;

  // Payback cumulatif (même algo que le modèle Python) :
  //   Σ production × (1−0.5%)^t × autoconso × prix_elec × (1+hausse)^t ≥ invest
  const DEGR = 0.005;
  let cumul = 0, payback = null;
  for (let t = 0; t < 50; t++) {
    cumul += prodMWh * Math.pow(1 - DEGR, t) * autoconso * prixElec * Math.pow(1 + hausse, t);
    if (cumul >= investE) { payback = t + 1; break; }
  }

  // Économie année 1
  const ecoAn1 = prodMWh * autoconso * prixElec;

  document.getElementById('srCA').textContent      = `${Math.round(ca_k).toLocaleString('fr')} k€`;
  document.getElementById('srPayback').textContent = payback ? `${payback} ans` : '> 50 ans';
  document.getElementById('srProd').textContent    = `${Math.round(prodMWh).toLocaleString('fr')} MWh/an`;
  document.getElementById('srEco').textContent     = `${(ecoAn1 / 1000).toFixed(1)} k€/an`;
}
