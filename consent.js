/**
 * consent.js — Bannière RGPD + chargement conditionnel de Microsoft Clarity
 * Remplacer CLARITY_PROJECT_ID par votre vrai Project ID Clarity.
 */

(function () {
  const CLARITY_PROJECT_ID = 'vxxfd2px13'; // ← à remplacer
  const STORAGE_KEY = 'rgpd_consent';

  /* ── Détection localhost (dev) ── */
  const IS_DEV = ['localhost', '127.0.0.1', ''].includes(window.location.hostname);

  /* ── Charge le script Clarity ── */
  function loadClarity() {
    if (IS_DEV) return;                        // pas de tracking en local
    if (typeof clarity === 'function') return; // déjà chargé
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', CLARITY_PROJECT_ID);
  }

  /* ── Injecte les styles de la bannière ── */
  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #rgpd-banner {
        position: fixed;
        bottom: 0; left: 0; right: 0;
        z-index: 99999;
        background: #1e293b;
        border-top: 1px solid rgba(245,158,11,0.25);
        padding: 1rem 1.5rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        flex-wrap: wrap;
        font-family: 'Inter', system-ui, sans-serif;
        font-size: 0.85rem;
        color: #cbd5e1;
        box-shadow: 0 -4px 24px rgba(0,0,0,0.4);
        animation: slideUp 0.3s ease;
      }
      @keyframes slideUp {
        from { transform: translateY(100%); opacity: 0; }
        to   { transform: translateY(0);    opacity: 1; }
      }
      #rgpd-banner .rgpd-text {
        flex: 1;
        min-width: 220px;
        line-height: 1.55;
      }
      #rgpd-banner .rgpd-text a {
        color: #f59e0b;
        text-decoration: underline;
        text-underline-offset: 2px;
      }
      #rgpd-banner .rgpd-text strong {
        color: #f1f5f9;
        font-weight: 700;
      }
      #rgpd-banner .rgpd-actions {
        display: flex;
        gap: 0.6rem;
        flex-shrink: 0;
      }
      .rgpd-btn {
        padding: 0.5rem 1.1rem;
        border-radius: 8px;
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
        border: none;
        transition: opacity 0.15s, transform 0.15s;
        font-family: inherit;
      }
      .rgpd-btn:hover { opacity: 0.88; transform: translateY(-1px); }
      .rgpd-btn-accept {
        background: linear-gradient(135deg, #f59e0b, #d97706);
        color: #0f172a;
      }
      .rgpd-btn-refuse {
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.12);
        color: #94a3b8;
      }
    `;
    document.head.appendChild(style);
  }

  /* ── Affiche la bannière ── */
  function showBanner() {
    injectStyles();

    // Cherche le lien legal.html (relatif selon la page courante)
    const isInSubfolder = window.location.pathname.includes('/prospection');
    const legalHref = isInSubfolder ? '../legal.html' : 'legal.html';

    const banner = document.createElement('div');
    banner.id = 'rgpd-banner';
    banner.innerHTML = `
      <div class="rgpd-text">
        <strong>🍪 Mesure d'audience</strong> — Nous utilisons Microsoft Clarity pour analyser
        l'utilisation du site (enregistrements de session, carte de chaleur).
        Aucune donnée personnelle n'est vendue.
        <a href="${legalHref}" target="_blank">Mentions légales</a>
      </div>
      <div class="rgpd-actions">
        <button class="rgpd-btn rgpd-btn-refuse" id="rgpd-refuse">Refuser</button>
        <button class="rgpd-btn rgpd-btn-accept" id="rgpd-accept">Accepter</button>
      </div>
    `;
    document.body.appendChild(banner);

    document.getElementById('rgpd-accept').addEventListener('click', function () {
      localStorage.setItem(STORAGE_KEY, 'accepted');
      banner.remove();
      loadClarity();
    });

    document.getElementById('rgpd-refuse').addEventListener('click', function () {
      localStorage.setItem(STORAGE_KEY, 'refused');
      banner.remove();
    });
  }

  /* ── Point d'entrée ── */
  function init() {
    const consent = localStorage.getItem(STORAGE_KEY);
    if (consent === 'accepted') {
      loadClarity();
    } else if (consent === 'refused') {
      // rien
    } else {
      // Première visite : affiche la bannière dès que le DOM est prêt
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', showBanner);
      } else {
        showBanner();
      }
    }
  }

  init();
})();
