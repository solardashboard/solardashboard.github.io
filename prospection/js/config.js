// ── Clarity tracking helper ───────────────────────────────────────────────
// Fires a named Clarity event + optional string tag.
// Safe to call before Clarity loads (queued internally by the SDK).
function _track(event, tagKey, tagValue) {
  if (typeof clarity !== 'function') return;
  clarity('event', event);
  if (tagKey && tagValue !== undefined) clarity('set', tagKey, String(tagValue));
}

// ── Clients ─────────────────────────────────────────────────────────────────
// Chaque entrée = un mot de passe → config client.
// accentColor : hex sans #, utilisé dans l'UI et dans la proposition .docx.
// logoUrl     : URL publique du logo (PNG/SVG), null si non disponible.
const CLIENTS = {
  'solardashboard2026': {
    id:          'admin',
    name:        'SolarDashboard',
    accentColor: 'F59E0B',   // amber par défaut
    logoUrl:     null,
    website:     null,
  },
  'demovoltare': {
    id:          'voltare',
    name:        'Voltare',
    accentColor: '16A34A',   // vert — à affiner avec leur charte
    logoUrl:     'https://www.voltare.fr/wp-content/uploads/2022/04/logo-voltare.png',
    website:     'https://www.voltare.fr',
  },
  'demosolarock': {
    id:          'solarock',
    name:        'SolaRock',
    accentColor: 'F59E0B',   // amber — à personnaliser
    logoUrl:     null,
    website:     null,
  },
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
