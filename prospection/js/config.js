// ── Tracking helper ─────────────────────────────────────────────────────────
// Fires a named event : Clarity (comme avant) + une ligne dans la table
// Supabase "events" (tracking interne, lié au compte/client précis).
function _track(event, tagKey, tagValue) {
  if (typeof clarity === 'function') {
    clarity('event', event);
    if (tagKey && tagValue !== undefined) clarity('set', tagKey, String(tagValue));
  }
  _logEventToSupabase(event, tagKey, tagValue);
}

// Best-effort, ne bloque et ne casse jamais l'UI (pas encore connecté,
// supabaseClient pas encore chargé, offline, etc. -> on ignore l'erreur).
async function _logEventToSupabase(event, tagKey, tagValue) {
  if (typeof supabaseClient === 'undefined') return;
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;
    await supabaseClient.from('events').insert({
      user_id:    user.id,
      scope_key:  window.CLIENT ? window.CLIENT.id : null,
      event_type: event,
      payload:    tagKey ? { [tagKey]: tagValue } : null,
    });
  } catch { /* silencieux */ }
}

// ── Supabase ────────────────────────────────────────────────────────────────
// Les clients et leurs leads (geojson) sont maintenant côté Supabase, pas
// codés en dur ici. Voir supabase/schema.sql pour le modèle (tables
// clients/profiles + RLS storage) et supabase/README.md pour le setup.
const SUPABASE_CONFIG = {
  url:     'https://occceleohepinqnrbvxj.supabase.co',
  anonKey: 'sb_publishable__RddFnBkyRwZSrDcxHgDAA_5egPKgPy',
  // Login "métier" (ex: "voltare") converti en email pour Supabase Auth,
  // qui exige un format email. Transparent pour l'utilisateur : il ne voit
  // jamais ce domaine, il tape juste son login.
  loginDomain: 'leads.solardashboard.app',
};

const CONFIG = {
  // Basemaps
  TILE_CARTO_URL:  'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  TILE_CARTO_ATTR: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/">CARTO</a>',
  TILE_SAT_URL:    'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&STYLE=normal&FORMAT=image/jpeg',
  TILE_SAT_ATTR:   '© <a href="https://www.ign.fr/">IGN</a> — Géoportail France',
  TILE_REF_URL:    'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
  TILE_REF_ATTR:   '© <a href="https://www.esri.com/">Esri</a> & GIS community',
  MAX_ZOOM:        19,
  DEFAULT_CENTER:  [46.6, 2.5],
  DEFAULT_ZOOM:    6,
  IGN_WMS:         'https://data.geopf.fr/wms-r',
  IGN_LAYER:       'ORTHOIMAGERY.ORTHOPHOTOS',
  IGN_BUFFER_DEG:  0.0015, // ~150m radius around centroid
};
