// proposal.js — génère un .docx de proposition commerciale depuis le sizer
// Dépend de : docx (CDN UMD), State, calcSizing logic

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
