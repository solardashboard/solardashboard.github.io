// Auth Supabase — remplace le password-gate CLIENTS codé en dur (config.js).
//
// Modèle : le login est fixé par l'admin (immuable côté user), le mot de
// passe est choisi par l'user. Deux façons d'obtenir ses leads, selon le
// profil (voir supabase/migrations) :
//  - profiles.depts renseigné -> table "leads", filtrée par la RLS
//    (départements + top N par score, réglable en SQL sans re-export)
//  - sinon -> ancien modèle fichier : profiles.scope_key pointe vers
//    "{scope_key}.geojson" dans le bucket Storage "leads"

const supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

function _loginToEmail(login) {
  const trimmed = login.trim();
  return trimmed.includes('@') ? trimmed : `${trimmed}@${SUPABASE_CONFIG.loginDomain}`;
}

// Charge le client (branding) + son geojson depuis Storage, pour l'user
// actuellement authentifié. Retourne true si l'auth est valide (même si le
// fichier leads est absent/vide — l'user garde alors le drag&drop en secours).
async function _loadClientAndLeads() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return false;

  const { data: profile, error: profileErr } = await supabaseClient
    .from('profiles')
    .select('scope_key, is_admin, depts, clients ( scope_key, name, accent_color, logo_url, website )')
    .eq('id', user.id)
    .single();

  if (profileErr || !profile || (!profile.is_admin && !profile.clients)) {
    showToast("❌ Aucun profil associé à ce compte — contacte l'admin.");
    await supabaseClient.auth.signOut();
    return false;
  }

  if (profile.is_admin) return _loadAllClients();

  const c = profile.clients;
  applyClient({
    id:          profile.scope_key,
    name:        c.name,
    accentColor: c.accent_color,
    logoUrl:     c.logo_url,
    website:     c.website,
  });

  // Deux modèles possibles selon le client :
  // - depts renseigné -> table "leads", filtrée dynamiquement par la RLS
  //   (dept + top N par score, réglable en SQL sans re-export)
  // - sinon -> ancien modèle fichier ("{scope_key}.geojson" dans Storage)
  if (profile.depts && profile.depts.length) {
    return _loadLeadsFromTable(profile.scope_key);
  }

  const { data: file, error: fileErr } = await supabaseClient
    .storage.from('leads')
    .download(`${profile.scope_key}.geojson`);

  if (fileErr || !file) {
    showToast('⚠️ Pas de leads chargés côté serveur — dépose un .geojson manuellement.');
    return true;
  }

  try {
    loadGeoJSON(JSON.parse(await file.text()), `${profile.scope_key}.geojson`);
  } catch {
    showToast('❌ Fichier leads invalide côté serveur.');
  }
  return true;
}

// Charge les leads depuis la table "leads" — la RLS ne renvoie déjà que les
// lignes autorisées pour l'user (ses depts, top N par score), donc un simple
// select() suffit, pas de filtre côté client.
async function _loadLeadsFromTable(label) {
  const { data: rows, error } = await supabaseClient.from('leads').select('properties, geometry');
  if (error || !rows) {
    showToast('⚠️ Impossible de charger les leads depuis la base.');
    return true;
  }
  const features = rows.map(r => ({ type: 'Feature', properties: r.properties, geometry: r.geometry }));
  loadGeoJSON({ type: 'FeatureCollection', features }, `${label}.geojson`);
  return true;
}

// Compte admin (is_admin=true) : fusionne les deux sources —
// tous les .geojson du bucket "leads" (anciens clients fichier) +
// toute la table "leads" (nouveaux clients dept-based, la RLS admin
// n'applique aucune restriction de dept/rang).
async function _loadAllClients() {
  applyClient({
    id: 'admin', name: 'Admin (tous les clients)',
    accentColor: 'F59E0B', logoUrl: null, website: null,
  });

  const allFeatures = [];

  const { data: files } = await supabaseClient.storage.from('leads').list();
  for (const f of (files || []).filter(f => f.name.endsWith('.geojson'))) {
    const { data: file, error: fileErr } = await supabaseClient.storage.from('leads').download(f.name);
    if (fileErr || !file) continue;
    try {
      const geo = JSON.parse(await file.text());
      if (geo.type === 'FeatureCollection') allFeatures.push(...geo.features);
    } catch { /* fichier invalide, on l'ignore */ }
  }

  const { data: rows } = await supabaseClient.from('leads').select('properties, geometry');
  if (rows) allFeatures.push(...rows.map(r => ({ type: 'Feature', properties: r.properties, geometry: r.geometry })));

  if (!allFeatures.length) {
    showToast('⚠️ Aucun lead trouvé (ni fichiers, ni table).');
    return true;
  }

  loadGeoJSON({ type: 'FeatureCollection', features: allFeatures }, 'tous les clients');
  return true;
}

// ── Password gate (branché sur les inputs #gateLogin / #gateInput) ────────
async function checkPassword() {
  const loginInp = document.getElementById('gateLogin');
  const pwdInp   = document.getElementById('gateInput');
  const err      = document.getElementById('gateError');
  const btn      = document.getElementById('gateBtn');

  const login    = loginInp.value.trim();
  const password = pwdInp.value.trim();
  if (!login || !password) return;

  btn.disabled = true;
  const { error } = await supabaseClient.auth.signInWithPassword({
    email:    _loginToEmail(login),
    password,
  });
  btn.disabled = false;

  if (error) {
    err.textContent = 'Login ou mot de passe incorrect.';
    [loginInp, pwdInp].forEach(i => i.classList.add('error'));
    pwdInp.value = '';
    setTimeout(() => [loginInp, pwdInp].forEach(i => i.classList.remove('error')), 400);
    return;
  }

  err.textContent = '';
  const ok = await _loadClientAndLeads();
  if (ok) document.getElementById('gate').classList.add('hidden');
}

async function logout() {
  await supabaseClient.auth.signOut();
  location.reload();
}

// ── Changement de mot de passe (self-service, pas d'email requis) ─────────
// Le login est un email fictif (@leads.solardashboard.app) : le flow
// "mot de passe oublié" par email ne marche pas. Un user connecté peut en
// revanche changer son mot de passe directement via updateUser().
function openPasswordPanel() {
  document.getElementById('pwdPanel').classList.remove('hidden');
}
function closePasswordPanel() {
  document.getElementById('pwdPanel').classList.add('hidden');
  document.getElementById('pwdNew').value = '';
  document.getElementById('pwdConfirm').value = '';
  document.getElementById('pwdError').textContent = '';
}
async function changePassword() {
  const pw1 = document.getElementById('pwdNew').value.trim();
  const pw2 = document.getElementById('pwdConfirm').value.trim();
  const err = document.getElementById('pwdError');
  const btn = document.getElementById('pwdBtn');

  if (pw1.length < 8)   { err.textContent = 'Minimum 8 caractères.'; return; }
  if (pw1 !== pw2)      { err.textContent = 'Les deux mots de passe ne correspondent pas.'; return; }

  btn.disabled = true;
  const { error } = await supabaseClient.auth.updateUser({ password: pw1 });
  btn.disabled = false;

  if (error) { err.textContent = 'Erreur — réessaie ou contacte l\'admin.'; return; }

  closePasswordPanel();
  showToast('✅ Mot de passe mis à jour.');
}

// ── Init : reprendre une session déjà active (Supabase persiste en local) ─
(async function initAuth() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return;
  const ok = await _loadClientAndLeads();
  if (ok) document.getElementById('gate').classList.add('hidden');
})();
