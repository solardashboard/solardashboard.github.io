// CSV export — saved leads only.

function exportCSV() {
  const toExport = State.leads.filter(l => State.savedIds.has(l.id));

  if (!toExport.length) {
    showToast('⚠️ Aucun prospect sauvegardé — utilisez ⭐ sur une fiche');
    return;
  }

  const headers = [
    'Nom', 'Rue', 'Code postal', 'Commune', 'NAF',
    'Puissance kWc', 'Production MWh', 'Surface m2', 'Ratio autoprod',
    'Orientation', 'Toit plat', 'Ombrages', 'Matériau',
    'Directeur', 'Téléphone', 'Email', 'Site web', 'LinkedIn',
    'Score', 'Lat', 'Lng',
  ];

  const rows = toExport.map(l => [
    l.name, l.rue, l.code_postal, l.commune, l.naf,
    l.puissance_kwc, l.production_mwh, Math.round(l.area),
    l.ratio_autoproduction, l.orientation, l.toit_plat,
    l.shadings, l.mat_toit_class,
    l.director_name, l.phone, l.email, l.website, l.linkedin,
    l.score, l.lat, l.lng,
  ]);

  const csv = [headers, ...rows]
    .map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';'))
    .join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = `prospects_sauvegardés_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();

  _track('csv_exporte', 'leads_exportes', toExport.length);
  showToast(`✅ ${toExport.length} prospect(s) exporté(s)`);
}
