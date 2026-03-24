// proposal.js — génère un .docx de proposition commerciale depuis le sizer
// Dépend de : docx (bundlé localement via js/docx.iife.js), State

// ── Helpers client ──────────────────────────────────────────────────────────

function _clientName()  { return (window.CLIENT && window.CLIENT.name)        || 'SolarDashboard'; }
function _clientColor() { return (window.CLIENT && window.CLIENT.accentColor) || 'F59E0B'; }

// Génère un fond pastel à partir d'une couleur hex (éclaircit vers blanc)
function _kpiBackground(hex) {
  try {
    const r = parseInt(hex.slice(0,2),16), g = parseInt(hex.slice(2,4),16), b = parseInt(hex.slice(4,6),16);
    const mix = (c) => Math.round(c * 0.12 + 255 * 0.88).toString(16).padStart(2,'0');
    return mix(r) + mix(g) + mix(b);
  } catch { return 'FEF9EE'; }
}

// ── Graphe break-even ────────────────────────────────────────────────────────

function _hexToRGB(hex) {
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

async function _drawBreakevenChart(ctx, accentHex) {
  const W = 840, H = 390;
  const PAD = { top: 54, right: 46, bottom: 64, left: 78 };
  const CW = W - PAD.left - PAD.right;
  const CH = H - PAD.top - PAD.bottom;

  // ── Données ────────────────────────────────────────────────────────────────
  const DEGR    = 0.005;
  const nYears  = 25;
  const autoEff = ctx.autoconsoEff / 100;

  // Économies annuelles cumulées
  const cumSav = [0];
  for (let t = 1; t <= nYears; t++) {
    const save = ctx.prodMWh * Math.pow(1 - DEGR, t - 1) * autoEff
               * ctx.prixElec * Math.pow(1 + ctx.hausse, t - 1);
    cumSav.push(cumSav[t - 1] + save);
  }

  const investE = ctx.investE;
  const pb      = ctx.payback;
  const maxVal  = Math.max(cumSav[nYears], investE) * 1.12;
  const baseY   = PAD.top + CH;
  const toY     = (v) => PAD.top + CH * (1 - Math.min(v, maxVal) / maxVal);

  // Géométrie des barres (1 par an)
  const slotW = CW / nYears;
  const barW  = Math.max(slotW * 0.68, 8);
  const barX  = (t) => PAD.left + (t - 1) * slotW + (slotW - barW) / 2;

  const ac  = _hexToRGB(accentHex);
  const css = (a = 1) => `rgba(${ac.r},${ac.g},${ac.b},${a})`;

  // ── Canvas ─────────────────────────────────────────────────────────────────
  const canvas = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;
  const g = canvas.getContext('2d');

  g.fillStyle = '#FFFFFF';
  g.fillRect(0, 0, W, H);

  // ── Grille ─────────────────────────────────────────────────────────────────
  g.font = '11px Arial, sans-serif';
  for (let i = 1; i <= 4; i++) {
    const v = (i / 4) * maxVal;
    const y = toY(v);
    g.strokeStyle = '#F3F4F6'; g.lineWidth = 1; g.setLineDash([]);
    g.beginPath(); g.moveTo(PAD.left, y); g.lineTo(PAD.left + CW, y); g.stroke();
    const lbl = v >= 1e6 ? `${(v / 1e6).toFixed(1)}\u00a0M\u20ac` : `${Math.round(v / 1000)}\u00a0k\u20ac`;
    g.fillStyle = '#9CA3AF'; g.textAlign = 'right';
    g.fillText(lbl, PAD.left - 8, y + 4);
  }

  // ── Barres ─────────────────────────────────────────────────────────────────
  for (let t = 1; t <= nYears; t++) {
    const x   = barX(t);
    const top = toY(cumSav[t]);
    const h   = baseY - top;
    // Avant remboursement : accent pâle — après : plein
    g.fillStyle = (pb && t >= pb) ? css(1) : css(0.22);
    g.fillRect(x, top, barW, h);
  }

  // ── Ligne investissement (seuil de remboursement) ──────────────────────────
  if (investE > 0 && investE < maxVal) {
    const yInv = toY(investE);
    g.save();
    g.setLineDash([5, 4]); g.strokeStyle = '#EF4444'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(PAD.left, yInv); g.lineTo(PAD.left + CW, yInv); g.stroke();
    g.restore();
    // Étiquette à droite de la ligne
    const invStr = investE >= 1e6
      ? `${(investE / 1e6).toFixed(1)}\u00a0M\u20ac`
      : `${Math.round(investE / 1000)}\u00a0k\u20ac`;
    g.save();
    g.font = '10px Arial, sans-serif'; g.fillStyle = '#EF4444'; g.textAlign = 'right';
    g.fillText(`Invest.\u00a0${invStr}`, PAD.left + CW - 2, yInv - 5);
    g.restore();
  }

  // ── Annotation payback ─────────────────────────────────────────────────────
  if (pb && pb <= nYears) {
    const cx  = barX(pb) + barW / 2;
    const top = toY(cumSav[pb]);
    const lbl = `\u2714\u00a0Remboursé an\u00a0${pb}`;
    g.save();
    g.font = 'bold 11px Arial, sans-serif';
    const tw = g.measureText(lbl).width;
    // Boîte au-dessus de la barre
    const bx = Math.min(Math.max(cx - tw / 2 - 6, PAD.left), PAD.left + CW - tw - 12);
    const by = top - 28;
    g.fillStyle = css(0.10); g.fillRect(bx, by, tw + 12, 18);
    g.fillStyle = css(1); g.textAlign = 'left';
    g.fillText(lbl, bx + 6, by + 13);
    // Petite flèche vers le bas
    g.strokeStyle = css(0.4); g.lineWidth = 1; g.setLineDash([3, 3]);
    g.beginPath(); g.moveTo(cx, by + 18); g.lineTo(cx, top - 2); g.stroke();
    g.restore();
  }

  // ── Total an 25 ────────────────────────────────────────────────────────────
  const total = cumSav[nYears];
  if (total > 0) {
    const totalStr = total >= 1e6
      ? `${(total / 1e6).toFixed(1)}\u00a0M\u20ac`
      : `${Math.round(total / 1000)}\u00a0k\u20ac`;
    const cx  = barX(nYears) + barW / 2;
    const top = toY(total);
    g.save();
    g.font = 'bold 13px Arial, sans-serif';
    g.fillStyle = css(1); g.textAlign = 'center';
    g.fillText(totalStr, cx, top - 7);
    g.restore();
  }

  // ── Axe X ──────────────────────────────────────────────────────────────────
  g.font = '11px Arial, sans-serif'; g.fillStyle = '#9CA3AF'; g.textAlign = 'center';
  for (let t = 1; t <= nYears; t += 4) {
    g.fillText(`An\u00a0${t}`, barX(t) + barW / 2, H - PAD.bottom + 18);
  }

  // ── Axes ───────────────────────────────────────────────────────────────────
  g.strokeStyle = '#E5E7EB'; g.lineWidth = 1; g.setLineDash([]);
  g.beginPath();
  g.moveTo(PAD.left, PAD.top); g.lineTo(PAD.left, PAD.top + CH);
  g.lineTo(PAD.left + CW, PAD.top + CH); g.stroke();

  // ── Titre ──────────────────────────────────────────────────────────────────
  g.fillStyle = '#1F2937'; g.textAlign = 'left'; g.setLineDash([]);
  g.font = 'bold 13px Arial, sans-serif';
  g.fillText('\u00c9conomies cumul\u00e9es sur 25\u00a0ans', PAD.left, 30);

  // ── Légende ────────────────────────────────────────────────────────────────
  const legY = H - 14;
  g.save();
  g.fillStyle = css(0.22); g.fillRect(PAD.left, legY - 8, 14, 10);
  g.fillStyle = '#6B7280'; g.font = '11px Arial, sans-serif'; g.textAlign = 'left';
  g.fillText('Remboursement en cours', PAD.left + 20, legY);
  g.fillStyle = css(1); g.fillRect(PAD.left + 220, legY - 8, 14, 10);
  g.fillStyle = '#6B7280';
  g.fillText('Gains nets', PAD.left + 240, legY);
  // Ligne rouge = investissement
  g.strokeStyle = '#EF4444'; g.lineWidth = 1.5; g.setLineDash([4, 3]);
  g.beginPath(); g.moveTo(PAD.left + 340, legY - 3); g.lineTo(PAD.left + 356, legY - 3); g.stroke();
  g.setLineDash([]);
  g.fillStyle = '#6B7280';
  g.fillText('Montant investi', PAD.left + 362, legY);
  g.restore();

  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

// ── Collecte du contexte ────────────────────────────────────────────────────

function getLeadContext(lead) {
  if (!lead) return null;

  // Lecture de l'état courant du sizer (DOM → valeurs)
  const kwc       = parseFloat(document.getElementById('sizerPuissance').value) || 0;
  const consoMwh  = parseFloat(document.getElementById('sizerConso').value)     || 0;
  const prixElec  = parseFloat(document.getElementById('sizerPrixElec').value)  || 0;
  const autoconso = parseFloat(document.getElementById('sizerAutoconso').value) / 100;
  const hausse    = parseFloat(document.getElementById('sizerHausse').value)    / 100;

  // Reproduction de l'algo calcSizing
  const ca_k    = kwc * 1.1;
  const investE = ca_k * 1000;

  const prodMWh = (lead.production_mwh > 0 && lead.puissance_kwc > 0)
    ? lead.production_mwh * (kwc / lead.puissance_kwc)
    : kwc * 1.1;

  const autoconsoEff = (consoMwh > 0 && prodMWh > 0)
    ? Math.min(autoconso, consoMwh / prodMWh)
    : autoconso;

  const DEGR = 0.005;
  let cumul = 0, payback = null;
  for (let t = 0; t < 50; t++) {
    cumul += prodMWh * Math.pow(1 - DEGR, t) * autoconsoEff * prixElec * Math.pow(1 + hausse, t);
    if (cumul >= investE) { payback = t + 1; break; }
  }

  const ecoAn1 = prodMWh * autoconsoEff * prixElec;

  return {
    // Informations prospect
    nomProspect:  lead.name     || '',
    commune:      lead.commune  || '',
    adresse:      lead.address  || '',
    surface:      lead.area     ? Math.round(lead.area) : null,
    orientation:  lead.orientation || '',
    toitType:     lead.toit_plat ? 'Toiture plate' : 'Toiture inclinée',
    materiau:     lead.materiau || '',
    naf:          lead.naf     || '',
    secteur:      lead.secteur || lead.naf_label || '',

    // Inputs sizer
    kwc,
    consoMwh,
    prixElec,
    autoconsoPct: Math.round(autoconso * 100),
    hausse,

    // Résultats calculés
    ca_k,
    investE,
    prodMWh:      Math.round(prodMWh),
    payback,
    ecoAn1:       Math.round(ecoAn1),
    autoconsoEff: Math.round(autoconsoEff * 100),
  };
}

// ── Génération du document ──────────────────────────────────────────────────

async function generateProposal() {
  // Vérifie que la lib docx est chargée
  if (typeof docx === 'undefined') {
    alert('La bibliothèque docx n\'est pas encore chargée. Vérifie ta connexion internet et réessaie.');
    return;
  }

  const lead = State.leads.find(x => x.id === State.selectedId);
  if (!lead) return;

  // Feedback visuel sur le bouton
  const btn = document.querySelector('.sizer-proposal-btn');
  const originalText = btn ? btn.innerHTML : '';
  if (btn) { btn.innerHTML = '⏳ Génération…'; btn.disabled = true; }

  const ctx = getLeadContext(lead);

  const {
    Document, Packer, Paragraph, TextRun,
    Table, TableRow, TableCell,
    Header, Footer,
    AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign,
    PageNumber, TabStopType, TabStopPosition,
    ImageRun,
  } = docx;

  // ── Palette ──────────────────────────────────────────────────────────────
  const AMBER          = _clientColor();
  const DARK           = '1F2937';
  const MUTED          = '6B7280';
  const LIGHT          = _kpiBackground(AMBER);
  const PROPOSAL_COMPANY = _clientName();

  const today = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  // A4 avec marges 1,2" = 1728 DXA → largeur utile = 11906 - 2*1728 = 8450
  const CW = 8450;

  const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' };
  const cellBorders = {
    top: cellBorder, bottom: cellBorder,
    left: cellBorder, right: cellBorder,
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  function spacer(before = 120) {
    return new Paragraph({
      spacing: { before, after: 0 },
      children: [new TextRun('')],
    });
  }

  function sectionTitle(text) {
    return new Paragraph({
      spacing: { before: 400, after: 140 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 10, color: AMBER, space: 6 } },
      children: [new TextRun({ text, bold: true, size: 26, font: 'Arial', color: DARK })],
    });
  }

  function keyValue(label, value) {
    return new Paragraph({
      spacing: { before: 60, after: 60 },
      children: [
        new TextRun({ text: label + '\u00a0: ', size: 22, font: 'Arial', color: MUTED }),
        new TextRun({ text: String(value || '—'), size: 22, font: 'Arial', bold: true, color: DARK }),
      ],
    });
  }

  // Tableau KPI : grande valeur colorée + libellé
  function kpiTable(items) {
    const n     = items.length;
    const base  = Math.floor(CW / n);
    const extra = CW - base * n;
    const widths = items.map((_, i) => (i < extra ? base + 1 : base));

    return new Table({
      width: { size: CW, type: WidthType.DXA },
      columnWidths: widths,
      rows: [new TableRow({
        children: items.map((item, i) => new TableCell({
          borders: cellBorders,
          width: { size: widths[i], type: WidthType.DXA },
          shading: { fill: LIGHT, type: ShadingType.CLEAR },
          margins: { top: 220, bottom: 220, left: 180, right: 180 },
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 0, after: 40 },
              children: [new TextRun({
                text: item.value,
                bold: true, size: 52, font: 'Arial', color: AMBER,
              })],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 0, after: 0 },
              children: [new TextRun({
                text: item.label, size: 19, font: 'Arial', color: MUTED,
              })],
            }),
            ...(item.sub ? [new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 20, after: 0 },
              children: [new TextRun({
                text: item.sub, size: 17, font: 'Arial', color: MUTED, italics: true,
              })],
            })] : []),
          ],
        })),
      })],
    });
  }

  // Tableau d'hypothèses : deux colonnes, lignes alternées
  function hypothesisTable(rows) {
    const COL1 = Math.round(CW * 0.62);
    const COL2 = CW - COL1;
    return new Table({
      width: { size: CW, type: WidthType.DXA },
      columnWidths: [COL1, COL2],
      rows: rows.map((row, i) => new TableRow({
        children: [
          new TableCell({
            borders: cellBorders,
            width: { size: COL1, type: WidthType.DXA },
            shading: { fill: i % 2 === 0 ? 'F9FAFB' : 'FFFFFF', type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 160, right: 80 },
            children: [new Paragraph({
              children: [new TextRun({ text: row[0], size: 20, font: 'Arial', color: MUTED })],
            })],
          }),
          new TableCell({
            borders: cellBorders,
            width: { size: COL2, type: WidthType.DXA },
            shading: { fill: i % 2 === 0 ? 'F9FAFB' : 'FFFFFF', type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 80, right: 160 },
            children: [new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [new TextRun({
                text: row[1], size: 20, font: 'Arial', bold: true, color: DARK,
              })],
            })],
          }),
        ],
      })),
    });
  }

  // ── Valeurs formatées ─────────────────────────────────────────────────────
  const caStr      = ctx.ca_k > 0   ? `${Math.round(ctx.ca_k).toLocaleString('fr')} k\u20ac` : '—';
  const paybackStr = ctx.payback     ? `${ctx.payback} ans` : '> 50 ans';
  const ecoStr     = ctx.ecoAn1 > 0 ? `${Math.round(ctx.ecoAn1 / 1000).toLocaleString('fr')} k\u20ac/an` : '—';
  const prodStr    = ctx.prodMWh > 0 ? `${ctx.prodMWh.toLocaleString('fr')} MWh/an` : '—';

  // ── Graphe break-even ─────────────────────────────────────────────────────
  const chartBlob = await _drawBreakevenChart(ctx, AMBER);
  const chartData = await chartBlob.arrayBuffer();

  // ── Document ──────────────────────────────────────────────────────────────
  const doc = new Document({
    styles: {
      default: { document: { run: { font: 'Arial', size: 22 } } },
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, right: 1728, bottom: 1440, left: 1728 },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            spacing: { after: 0 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: AMBER, space: 6 } },
            tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
            children: [
              new TextRun({ text: PROPOSAL_COMPANY, bold: true, size: 22, font: 'Arial', color: AMBER }),
              new TextRun({ text: '\t' }),
              new TextRun({ text: 'Proposition commerciale — confidentiel', size: 18, font: 'Arial', color: MUTED }),
            ],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'E5E7EB', space: 4 } },
            tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
            children: [
              new TextRun({ text: `${PROPOSAL_COMPANY} \u00b7 ${today}`, size: 18, font: 'Arial', color: MUTED }),
              new TextRun({ text: '\t' }),
              new TextRun({ text: 'Page ', size: 18, font: 'Arial', color: MUTED }),
              new TextRun({ children: [PageNumber.CURRENT], size: 18, font: 'Arial', color: MUTED }),
            ],
          })],
        }),
      },

      children: [

        // ── Titre ────────────────────────────────────────────────────────────
        spacer(280),
        new Paragraph({
          spacing: { before: 0, after: 80 },
          children: [new TextRun({
            text: 'PROPOSITION COMMERCIALE',
            bold: true, size: 48, font: 'Arial', color: DARK,
          })],
        }),
        new Paragraph({
          spacing: { before: 0, after: 60 },
          children: [new TextRun({
            text: `Installation photovoltaïque\u00a0— ${ctx.nomProspect || 'Prospect'}`,
            size: 26, font: 'Arial', color: MUTED,
          })],
        }),
        new Paragraph({
          spacing: { before: 0, after: 480 },
          children: [new TextRun({
            text: today, size: 20, font: 'Arial', color: MUTED,
          })],
        }),

        // ── Impact financier ─────────────────────────────────────────────────
        sectionTitle('Impact financier'),
        spacer(160),
        kpiTable([
          { label: 'Investissement estimé', value: caStr },
          { label: 'Retour sur investissement', value: paybackStr },
          { label: 'Économie annuelle', value: ecoStr },
        ]),
        spacer(240),
        new Paragraph({
          spacing: { before: 0, after: 0 },
          children: [new ImageRun({
            type: 'png',
            data: chartData,
            transformation: { width: 590, height: 274 },
            altText: {
              title: 'Seuil de rentabilité',
              description: 'Dépenses cumulées avec et sans panneaux solaires',
              name: 'breakeven-chart',
            },
          })],
        }),

        // ── Contexte site ────────────────────────────────────────────────────
        sectionTitle('Contexte du site'),
        keyValue('Entreprise', ctx.nomProspect),
        keyValue('Commune', ctx.commune),
        ...(ctx.surface   ? [keyValue('Surface de toiture', `${ctx.surface.toLocaleString('fr')} m\u00b2`)] : []),
        ...(ctx.orientation ? [keyValue('Orientation', ctx.orientation)] : []),
        keyValue('Type de toiture', ctx.toitType),
        ...(ctx.materiau  ? [keyValue('Mat\u00e9riau', ctx.materiau)] : []),
        ...(ctx.secteur   ? [keyValue("Secteur d\u2019activit\u00e9", ctx.secteur)] : []),

        // ── Installation proposée ─────────────────────────────────────────────
        sectionTitle('Installation propos\u00e9e'),
        keyValue('Puissance install\u00e9e', ctx.kwc > 0 ? `${ctx.kwc} kWc` : '—'),
        keyValue('Production annuelle estim\u00e9e', prodStr),
        keyValue('Autoconsommation effective', `${ctx.autoconsoEff}\u00a0%`),

        // ── Hypothèses ────────────────────────────────────────────────────────
        sectionTitle('Hypoth\u00e8ses de calcul'),
        spacer(120),
        hypothesisTable([
          ["Prix de l\u2019\u00e9lectricit\u00e9",                              `${ctx.prixElec} \u20ac/MWh`],
          ["Hausse annuelle du prix de l\u2019\u00e9lectricit\u00e9",           `${(ctx.hausse * 100).toFixed(1).replace('.', ',')} %/an`],
          ["Taux d\u2019autoconsommation cible",                                `${ctx.autoconsoPct}\u00a0%`],
          ["Consommation annuelle du site",                                      ctx.consoMwh > 0 ? `${ctx.consoMwh.toLocaleString('fr')} MWh/an` : '—'],
          ["D\u00e9gradation annuelle des panneaux",                            "0,5\u00a0%/an"],
          ["Formule d\u2019investissement",                                      "1\u00a0100\u00a0\u20ac/kWc"],
        ]),
        spacer(80),

        // ── Prochaines étapes ─────────────────────────────────────────────────
        sectionTitle('Prochaines \u00e9tapes'),
        spacer(80),
        new Paragraph({
          spacing: { before: 60, after: 60 },
          children: [new TextRun({
            text: '[ \u00c0 compl\u00e9ter par le commercial avant envoi ]',
            size: 22, font: 'Arial', color: MUTED, italics: true,
          })],
        }),

      ],
    }],
  });

  // ── Téléchargement ────────────────────────────────────────────────────────
  try {
    const blob = await Packer.toBlob(doc);
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    const safe = (ctx.nomProspect || 'prospect').replace(/[^a-zA-Z0-9\u00C0-\u024F]/g, '_').toLowerCase();
    a.download = `proposition_${safe}_${new Date().toISOString().slice(0, 10)}.docx`;
    a.href = url;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (btn) { btn.innerHTML = '✅ Téléchargé !'; setTimeout(() => { btn.innerHTML = originalText; btn.disabled = false; }, 2500); }
  } catch (err) {
    console.error('generateProposal error:', err);
    alert('Erreur lors de la génération : ' + err.message);
    if (btn) { btn.innerHTML = originalText; btn.disabled = false; }
  }
}
