// ── Clarity tracking helper ───────────────────────────────────────────────
// Fires a named Clarity event + optional string tag.
// Safe to call before Clarity loads (queued internally by the SDK).
function _track(event, tagKey, tagValue) {
  if (typeof clarity !== 'function') return;
  clarity('event', event);
  if (tagKey && tagValue !== undefined) clarity('set', tagKey, String(tagValue));
}

const CONFIG = {
  PASSWORD:       'solardashboard2026',
  // Basemaps
  TILE_CARTO_URL:  'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  TILE_CARTO_ATTR: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/">CARTO</a>',
  TILE_SAT_URL:    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  TILE_SAT_ATTR:   '© <a href="https://www.esri.com/">Esri</a> & GIS community',
  TILE_REF_URL:    'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
  TILE_REF_ATTR:   '© <a href="https://www.esri.com/">Esri</a> & GIS community',
  MAX_ZOOM:        19,
  DEFAULT_CENTER:  [46.6, 2.5],
  DEFAULT_ZOOM:    6,
  IGN_WMS:         'https://data.geopf.fr/wms-r',
  IGN_LAYER:       'ORTHOIMAGERY.ORTHOPHOTOS',
  IGN_BUFFER_DEG:  0.0015, // ~150m radius around centroid
};
