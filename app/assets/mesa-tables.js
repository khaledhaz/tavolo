/* ============================================================================
   Tavolo — Mesa Tables & QR screen module
   Registers:
     window.COV.screens['qr-tables']
     window.PLAT.screens['qr-tables']
   Usage: screen shell calls render(sectionEl) when the section is activated.
   ============================================================================ */
(function () {
  'use strict';

  /* ==========================================================================
     QR LIBRARY — lazy-load once
     CDN: https://cdn.jsdelivr.net/gh/davidshimjs/qrcodejs/qrcode.min.js
     Guard: document.getElementById('mesa-qr-lib-script') prevents double-load.
  ========================================================================== */
  var QR_CDN = 'https://cdn.jsdelivr.net/gh/davidshimjs/qrcodejs/qrcode.min.js';
  var _qrLibReady   = false;   // true once window.QRCode is callable
  var _qrLibPending = false;   // true while the <script> is loading
  var _qrLibCallbacks = [];    // queued callbacks waiting for load

  function loadQrLib(cb) {
    if (_qrLibReady) { cb(); return; }
    _qrLibCallbacks.push(cb);
    if (_qrLibPending) return;
    if (document.getElementById('mesa-qr-lib-script')) {
      // Script tag injected by someone else; poll until QRCode is available
      _qrLibPending = true;
      var poll = setInterval(function () {
        if (window.QRCode) {
          clearInterval(poll);
          _qrLibReady = true;
          _qrLibPending = false;
          _qrLibCallbacks.forEach(function (fn) { fn(); });
          _qrLibCallbacks = [];
        }
      }, 50);
      return;
    }
    _qrLibPending = true;
    var script = document.createElement('script');
    script.id  = 'mesa-qr-lib-script';
    script.src = QR_CDN;
    script.onload = function () {
      _qrLibReady = true;
      _qrLibPending = false;
      _qrLibCallbacks.forEach(function (fn) { fn(); });
      _qrLibCallbacks = [];
    };
    script.onerror = function () {
      _qrLibPending = false;
      console.error('[mesa-tables] Failed to load QR library from ' + QR_CDN);
      _qrLibCallbacks.forEach(function (fn) { fn(); }); // proceed anyway; QRs will silently skip
      _qrLibCallbacks = [];
    };
    document.head.appendChild(script);
  }

  /* ==========================================================================
     CSS — injected once into <head> via <style id="mesa-tables-css">
     All classes are .mesa-* to prevent collision with shell styles.
  ========================================================================== */
  var CSS = '\
/* ===== Mesa Tables & QR — scoped to .mesa-* ===== */\n\
.mesa-root {\n\
  display: flex;\n\
  flex-direction: column;\n\
  gap: var(--space-5);\n\
  min-width: 0;\n\
}\n\
\n\
/* Toolbar */\n\
.mesa-toolbar {\n\
  display: flex;\n\
  align-items: center;\n\
  justify-content: space-between;\n\
  gap: var(--space-3);\n\
  flex-wrap: wrap;\n\
}\n\
.mesa-toolbar-title {\n\
  font-size: 22px;\n\
  font-weight: 600;\n\
  letter-spacing: -0.01em;\n\
  color: var(--color-text-primary);\n\
  flex-shrink: 0;\n\
  min-width: 0;\n\
}\n\
.mesa-toolbar-actions {\n\
  display: flex;\n\
  gap: var(--space-3);\n\
  flex-shrink: 0;\n\
  flex-wrap: wrap;\n\
}\n\
\n\
/* Buttons */\n\
.mesa-btn {\n\
  display: inline-flex;\n\
  align-items: center;\n\
  justify-content: center;\n\
  gap: var(--space-2);\n\
  min-height: 44px;\n\
  padding: 0 var(--space-5);\n\
  border-radius: var(--radius-md);\n\
  font-size: 14px;\n\
  font-weight: 500;\n\
  cursor: pointer;\n\
  border: 1px solid transparent;\n\
  transition: background var(--duration-fast), color var(--duration-fast),\n\
              box-shadow var(--duration-fast), transform var(--duration-fast),\n\
              border-color var(--duration-fast);\n\
  white-space: nowrap;\n\
  text-decoration: none;\n\
}\n\
.mesa-btn:active { transform: scale(.97); }\n\
.mesa-btn:focus-visible {\n\
  outline: 2px solid var(--color-primary);\n\
  outline-offset: 2px;\n\
}\n\
.mesa-btn-primary {\n\
  background: var(--color-primary);\n\
  color: #fff;\n\
}\n\
.mesa-btn-primary:hover { background: var(--color-primary-hover, var(--color-primary)); }\n\
.mesa-btn-secondary {\n\
  background: var(--color-surface);\n\
  color: var(--color-text-primary);\n\
  border-color: var(--color-border);\n\
}\n\
.mesa-btn-secondary:hover { background: var(--color-surface-raised); }\n\
.mesa-btn-danger {\n\
  background: var(--color-destructive-light);\n\
  color: var(--color-destructive);\n\
  border-color: var(--color-destructive);\n\
}\n\
.mesa-btn-danger:hover { background: var(--color-destructive); color: #fff; }\n\
.mesa-btn:disabled { opacity: 0.55; cursor: not-allowed; }\n\
\n\
.mesa-icon-btn {\n\
  width: 36px;\n\
  height: 36px;\n\
  min-height: 36px;\n\
  padding: 0;\n\
  border-radius: var(--radius-sm);\n\
  background: none;\n\
  border: 1px solid var(--color-border);\n\
  display: flex;\n\
  align-items: center;\n\
  justify-content: center;\n\
  cursor: pointer;\n\
  color: var(--color-text-secondary);\n\
  transition: color var(--duration-fast), background var(--duration-fast),\n\
              transform var(--duration-fast);\n\
}\n\
.mesa-icon-btn:hover { color: var(--color-text-primary); background: var(--color-surface-raised); }\n\
.mesa-icon-btn:active { transform: scale(.92); }\n\
.mesa-icon-btn:focus-visible {\n\
  outline: 2px solid var(--color-primary);\n\
  outline-offset: 2px;\n\
}\n\
.mesa-icon-btn-danger {\n\
  color: var(--color-destructive);\n\
  border-color: rgba(181,59,47,.3);\n\
}\n\
.mesa-icon-btn-danger:hover {\n\
  background: var(--color-destructive-light);\n\
  color: var(--color-destructive);\n\
}\n\
\n\
/* QR grid */\n\
.mesa-qr-grid {\n\
  display: grid;\n\
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));\n\
  gap: var(--space-4);\n\
  padding-bottom: 48px;\n\
}\n\
.mesa-qr-card {\n\
  background: var(--color-surface);\n\
  border: 1px solid var(--color-border);\n\
  border-radius: var(--radius-lg);\n\
  padding: var(--space-5);\n\
  text-align: center;\n\
  display: flex;\n\
  flex-direction: column;\n\
  align-items: center;\n\
  gap: var(--space-2);\n\
}\n\
.mesa-qr-card-title {\n\
  font-size: 16px;\n\
  font-weight: 600;\n\
  color: var(--color-text-primary);\n\
  margin: 0;\n\
}\n\
.mesa-qr-card-seats {\n\
  font-size: 12px;\n\
  color: var(--color-text-muted);\n\
  margin: 0;\n\
}\n\
.mesa-qr-img {\n\
  width: 120px;\n\
  height: 120px;\n\
  margin: var(--space-1) auto;\n\
  border: 1px solid var(--color-border);\n\
  border-radius: var(--radius-sm);\n\
  display: flex;\n\
  align-items: center;\n\
  justify-content: center;\n\
  overflow: hidden;\n\
  flex-shrink: 0;\n\
}\n\
.mesa-qr-img > canvas,\n\
.mesa-qr-img > img {\n\
  width: 120px !important;\n\
  height: 120px !important;\n\
  display: block;\n\
}\n\
.mesa-qr-code-text {\n\
  font-family: var(--font-mono, monospace);\n\
  font-size: 12px;\n\
  color: var(--color-text-muted);\n\
  margin: 0;\n\
  word-break: break-all;\n\
}\n\
.mesa-qr-actions {\n\
  display: flex;\n\
  justify-content: center;\n\
  gap: var(--space-2);\n\
  margin-top: var(--space-1);\n\
}\n\
\n\
/* Status / empty / error */\n\
.mesa-status-bar {\n\
  background: var(--color-surface);\n\
  border: 1px solid var(--color-border);\n\
  border-radius: var(--radius-md);\n\
  padding: var(--space-4) var(--space-5);\n\
  display: flex;\n\
  align-items: center;\n\
  gap: var(--space-3);\n\
}\n\
.mesa-status-spinner {\n\
  width: 20px;\n\
  height: 20px;\n\
  border: 2px solid var(--color-border);\n\
  border-top-color: var(--color-primary);\n\
  border-radius: 50%;\n\
  animation: mesa-spin 0.75s linear infinite;\n\
  flex-shrink: 0;\n\
}\n\
@keyframes mesa-spin { to { transform: rotate(360deg); } }\n\
@media (prefers-reduced-motion: reduce) {\n\
  .mesa-status-spinner { animation: none; border-top-color: var(--color-primary); }\n\
}\n\
.mesa-status-text {\n\
  font-size: 14px;\n\
  color: var(--color-text-secondary);\n\
}\n\
.mesa-error-bar {\n\
  background: var(--color-destructive-light);\n\
  color: var(--color-destructive);\n\
  border: 1px solid rgba(181,59,47,.2);\n\
  border-radius: var(--radius-md);\n\
  padding: var(--space-3) var(--space-4);\n\
  font-size: 14px;\n\
  display: flex;\n\
  align-items: center;\n\
  justify-content: space-between;\n\
  gap: var(--space-3);\n\
}\n\
.mesa-retry-btn {\n\
  background: none;\n\
  border: none;\n\
  color: var(--color-destructive);\n\
  font-weight: 600;\n\
  font-size: 13px;\n\
  cursor: pointer;\n\
  text-decoration: underline;\n\
  padding: 0;\n\
  flex-shrink: 0;\n\
}\n\
.mesa-retry-btn:focus-visible { outline: 2px solid var(--color-destructive); outline-offset: 2px; }\n\
.mesa-empty {\n\
  text-align: center;\n\
  padding: var(--space-12) var(--space-5);\n\
  display: flex;\n\
  flex-direction: column;\n\
  align-items: center;\n\
  gap: var(--space-3);\n\
}\n\
.mesa-empty-title {\n\
  font-size: 18px;\n\
  font-weight: 600;\n\
  color: var(--color-text-primary);\n\
  margin: 0;\n\
}\n\
.mesa-empty-body {\n\
  font-size: 14px;\n\
  color: var(--color-text-secondary);\n\
  max-width: 320px;\n\
  margin: 0;\n\
  line-height: 1.6;\n\
}\n\
\n\
/* Skeleton */\n\
.mesa-skel-grid {\n\
  display: grid;\n\
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));\n\
  gap: var(--space-4);\n\
}\n\
.mesa-skel-card {\n\
  height: 240px;\n\
  border-radius: var(--radius-lg);\n\
  background: linear-gradient(90deg, var(--color-surface-raised) 25%, var(--color-border) 50%, var(--color-surface-raised) 75%);\n\
  background-size: 800px 100%;\n\
  animation: mesa-shimmer 1.4s infinite linear;\n\
}\n\
@keyframes mesa-shimmer {\n\
  0%   { background-position: -400px 0; }\n\
  100% { background-position:  400px 0; }\n\
}\n\
@media (prefers-reduced-motion: reduce) {\n\
  .mesa-skel-card { animation: none; background: var(--color-surface-raised); }\n\
}\n\
\n\
/* Form fields */\n\
.mesa-field {\n\
  display: flex;\n\
  flex-direction: column;\n\
  gap: var(--space-1);\n\
  margin-bottom: var(--space-4);\n\
}\n\
.mesa-field:last-of-type { margin-bottom: 0; }\n\
.mesa-label {\n\
  font-size: 13px;\n\
  font-weight: 500;\n\
  color: var(--color-text-primary);\n\
}\n\
.mesa-input {\n\
  width: 100%;\n\
  min-height: 44px;\n\
  padding: var(--space-2) var(--space-4);\n\
  background: var(--color-surface);\n\
  border: 1px solid var(--color-border);\n\
  border-radius: var(--radius-md);\n\
  font-size: 14px;\n\
  color: var(--color-text-primary);\n\
  transition: border-color var(--duration-fast), box-shadow var(--duration-fast);\n\
  box-sizing: border-box;\n\
}\n\
.mesa-input:focus {\n\
  outline: none;\n\
  border-color: var(--color-primary);\n\
  box-shadow: 0 0 0 3px var(--color-primary-light);\n\
}\n\
.mesa-input::placeholder { color: var(--color-text-muted); }\n\
\n\
/* Modal overlay */\n\
.mesa-modal-overlay {\n\
  position: fixed;\n\
  inset: 0;\n\
  background: var(--color-overlay);\n\
  z-index: 500;\n\
  display: none;\n\
  align-items: center;\n\
  justify-content: center;\n\
  padding: var(--space-4);\n\
  transition: opacity .15s ease;\n\
  opacity: 0;\n\
  pointer-events: none;\n\
}\n\
.mesa-modal-overlay.mesa-open {\n\
  display: flex;\n\
  opacity: 1;\n\
  pointer-events: auto;\n\
}\n\
.mesa-modal {\n\
  background: var(--color-surface);\n\
  border-radius: var(--radius-xl);\n\
  padding: var(--space-7);\n\
  width: 100%;\n\
  max-width: 400px;\n\
  box-shadow: var(--shadow-xl);\n\
  transition: transform .2s var(--easing-decelerate, ease-out), opacity .2s ease;\n\
  transform: scale(.95) translateY(8px);\n\
  opacity: 0;\n\
  min-width: 0;\n\
}\n\
.mesa-modal-overlay.mesa-open .mesa-modal {\n\
  transform: scale(1) translateY(0);\n\
  opacity: 1;\n\
}\n\
.mesa-modal-head {\n\
  display: flex;\n\
  align-items: center;\n\
  justify-content: space-between;\n\
  margin-bottom: var(--space-5);\n\
}\n\
.mesa-modal-title {\n\
  font-size: 20px;\n\
  font-weight: 600;\n\
  color: var(--color-text-primary);\n\
  margin: 0;\n\
  min-width: 0;\n\
}\n\
.mesa-modal-foot {\n\
  display: flex;\n\
  gap: var(--space-3);\n\
  margin-top: var(--space-5);\n\
}\n\
\n\
/* Print */\n\
@media print {\n\
  .mesa-toolbar-actions { display: none !important; }\n\
  .mesa-qr-actions      { display: none !important; }\n\
  .mesa-qr-grid {\n\
    display: grid;\n\
    grid-template-columns: repeat(3, 1fr);\n\
    gap: 16px;\n\
    page-break-inside: avoid;\n\
  }\n\
  .mesa-qr-card {\n\
    border: 1px solid #ccc;\n\
    break-inside: avoid;\n\
    page-break-inside: avoid;\n\
  }\n\
}\n\
\n\
/* Responsive */\n\
@media (max-width: 599px) {\n\
  .mesa-qr-grid { grid-template-columns: 1fr 1fr; }\n\
  .mesa-skel-grid { grid-template-columns: 1fr 1fr; }\n\
  .mesa-toolbar { flex-direction: column; align-items: flex-start; }\n\
  .mesa-toolbar-actions { width: 100%; }\n\
  .mesa-toolbar-actions .mesa-btn { flex: 1; }\n\
}\n\
@media (max-width: 374px) {\n\
  .mesa-qr-grid { grid-template-columns: 1fr; }\n\
  .mesa-skel-grid { grid-template-columns: 1fr; }\n\
}\n\
@media (max-width: 1023px) {\n\
  .mesa-modal {\n\
    max-width: calc(100vw - 32px);\n\
  }\n\
}\n\
';

  function injectStyles() {
    if (document.getElementById('mesa-tables-css')) return;
    var style = document.createElement('style');
    style.id   = 'mesa-tables-css';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  /* ==========================================================================
     UTILS — thin wrappers around PLAT
  ========================================================================== */
  function esc(s) {
    return window.PLAT ? window.PLAT.utils.esc(s) : String(s == null ? '' : s)
      .replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
  }

  function toast(msg, kind) {
    if (window.PLAT && window.PLAT.utils && window.PLAT.utils.toast) {
      window.PLAT.utils.toast(msg, kind);
    }
  }

  function getClient() {
    return window.PLAT && window.PLAT.client ? window.PLAT.client : null;
  }

  /* ==========================================================================
     TENANT — fetch mesa_restaurants, limit 1, cached
  ========================================================================== */
  var _tenantCache = null;

  function getTenant(cb) {
    if (_tenantCache !== null) { cb(null, _tenantCache); return; }
    var sb = getClient();
    if (!sb) { cb(new Error('Supabase client not available'), null); return; }
    sb.from('mesa_restaurants').select('*').limit(1).maybeSingle()
      .then(function (res) {
        if (res.error) { cb(res.error, null); return; }
        _tenantCache = res.data;   // may be null if no restaurant yet
        cb(null, _tenantCache);
      })
      .catch(function (err) { cb(err, null); });
  }

  /* ==========================================================================
     UNIQUE CODE GENERATOR — 'T-XXXXX'
  ========================================================================== */
  function genCode() {
    return 'T-' + Math.random().toString(36).substr(2, 5).toUpperCase();
  }

  /* ==========================================================================
     QR URL — relative to deployed app so it works at any origin
     e.g. https://khaledhaz.github.io/tavolo/app/pay.html?code=T-AB12C
  ========================================================================== */
  function makePayUrl(tableCode) {
    return new URL('pay.html?code=' + encodeURIComponent(tableCode), window.location.href).toString();
  }

  /* ==========================================================================
     MODULE STATE
  ========================================================================== */
  var _state = {
    tables:  [],
    loading: true,
    error:   null,
  };

  /* ==========================================================================
     RENDER — entry point called by the shell
  ========================================================================== */
  function render(sectionEl) {
    injectStyles();

    // Build scaffold once; reuse on subsequent activations
    if (!sectionEl.querySelector('.mesa-root')) {
      sectionEl.innerHTML = buildScaffold();
      wireModal(sectionEl);
      wireEditModal(sectionEl);
    }

    loadAndRender(sectionEl);
  }

  /* ==========================================================================
     SCAFFOLD
  ========================================================================== */
  function buildScaffold() {
    return [
      '<div class="mesa-root">',

        /* Toolbar */
        '<div class="mesa-toolbar">',
          '<h2 class="mesa-toolbar-title">Tables &amp; QR codes</h2>',
          '<div class="mesa-toolbar-actions">',
            '<button class="mesa-btn mesa-btn-secondary" id="mesa-print-btn" type="button"',
              ' aria-label="Print all QR cards">',
              svgPrint(), ' Print QR cards',
            '</button>',
            '<button class="mesa-btn mesa-btn-primary" id="mesa-add-btn" type="button"',
              ' aria-label="Add new table">',
              svgPlus(), ' Add table',
            '</button>',
          '</div>',
        '</div>',

        /* Live region for status announcements */
        '<div role="status" aria-live="polite" aria-atomic="true" id="mesa-live-region"',
          ' class="mesa-sr-only" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0"></div>',

        /* Grid (filled by loadAndRender) */
        '<div id="mesa-grid-wrap">',
          buildSkeletonGrid(6),
        '</div>',

      '</div>',

      /* ADD TABLE MODAL */
      '<div class="mesa-modal-overlay" id="mesa-add-modal" role="dialog" aria-modal="true"',
        ' aria-labelledby="mesa-add-modal-title">',
        '<div class="mesa-modal" role="document">',
          '<div class="mesa-modal-head">',
            '<h3 class="mesa-modal-title" id="mesa-add-modal-title">Add tables</h3>',
            '<button class="mesa-icon-btn" id="mesa-add-modal-close" type="button" aria-label="Close add-table dialog">',
              svgClose(),
            '</button>',
          '</div>',
          '<div class="mesa-field">',
            '<label class="mesa-label" for="mesa-table-label">Table name or number</label>',
            '<input class="mesa-input" id="mesa-table-label" type="text"',
              ' placeholder="e.g. Table 5 or Patio A" autocomplete="off">',
          '</div>',
          '<div class="mesa-field">',
            '<label class="mesa-label" for="mesa-table-count">How many tables? (1–50)</label>',
            '<input class="mesa-input" id="mesa-table-count" type="number" min="1" max="50" value="1">',
          '</div>',
          '<div class="mesa-field">',
            '<label class="mesa-label" for="mesa-table-seats">Seats per table</label>',
            '<input class="mesa-input" id="mesa-table-seats" type="number" min="1" max="50" value="4">',
          '</div>',
          '<div class="mesa-modal-foot">',
            '<button class="mesa-btn mesa-btn-primary" id="mesa-add-save-btn" type="button" style="flex:1">',
              'Generate QR codes',
            '</button>',
            '<button class="mesa-btn mesa-btn-secondary" id="mesa-add-cancel-btn" type="button">Cancel</button>',
          '</div>',
        '</div>',
      '</div>',

      /* EDIT TABLE MODAL */
      '<div class="mesa-modal-overlay" id="mesa-edit-modal" role="dialog" aria-modal="true"',
        ' aria-labelledby="mesa-edit-modal-title">',
        '<div class="mesa-modal" role="document">',
          '<div class="mesa-modal-head">',
            '<h3 class="mesa-modal-title" id="mesa-edit-modal-title">Edit table</h3>',
            '<button class="mesa-icon-btn" id="mesa-edit-modal-close" type="button" aria-label="Close edit-table dialog">',
              svgClose(),
            '</button>',
          '</div>',
          '<input type="hidden" id="mesa-edit-id">',
          '<div class="mesa-field">',
            '<label class="mesa-label" for="mesa-edit-label">Table name</label>',
            '<input class="mesa-input" id="mesa-edit-label" type="text" placeholder="e.g. Table 5">',
          '</div>',
          '<div class="mesa-field">',
            '<label class="mesa-label" for="mesa-edit-seats">Seats</label>',
            '<input class="mesa-input" id="mesa-edit-seats" type="number" min="1" max="50" value="4">',
          '</div>',
          '<div class="mesa-modal-foot">',
            '<button class="mesa-btn mesa-btn-primary" id="mesa-edit-save-btn" type="button" style="flex:1">Save</button>',
            '<button class="mesa-btn mesa-btn-secondary" id="mesa-edit-cancel-btn" type="button">Cancel</button>',
          '</div>',
        '</div>',
      '</div>',

    ].join('');
  }

  /* ==========================================================================
     LOAD & RENDER
  ========================================================================== */
  function loadAndRender(sectionEl) {
    var wrap = sectionEl.querySelector('#mesa-grid-wrap');
    if (!wrap) return;
    wrap.innerHTML = buildSkeletonGrid(6);
    announceStatus(sectionEl, 'Loading tables…');
    _state.loading = true;
    _state.error   = null;

    getTenant(function (tenantErr, restaurant) {
      if (tenantErr) {
        _state.loading = false;
        _state.error   = 'Could not connect to the database.';
        wrap.innerHTML = buildErrorHtml(_state.error, function () { loadAndRender(sectionEl); });
        announceStatus(sectionEl, 'Failed to load tables.');
        console.error('[mesa-tables] tenant fetch error', tenantErr);
        return;
      }

      if (!restaurant) {
        _state.loading = false;
        wrap.innerHTML = buildEmptyHtml('No restaurant found for your account.', null);
        announceStatus(sectionEl, 'No restaurant found.');
        return;
      }

      var sb = getClient();
      if (!sb) {
        _state.loading = false;
        wrap.innerHTML = buildErrorHtml('Database client not available.', function () { loadAndRender(sectionEl); });
        return;
      }

      sb.from('mesa_tables')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('label')
        .then(function (res) {
          _state.loading = false;
          if (res.error) {
            _state.error = 'Could not load tables.';
            wrap.innerHTML = buildErrorHtml(_state.error, function () { loadAndRender(sectionEl); });
            announceStatus(sectionEl, 'Failed to load tables.');
            console.error('[mesa-tables] tables fetch error', res.error);
            return;
          }
          _state.tables    = res.data || [];
          _state.error     = null;
          renderGrid(sectionEl, restaurant);
        })
        .catch(function (err) {
          _state.loading = false;
          _state.error   = 'Unexpected error loading tables.';
          wrap.innerHTML = buildErrorHtml(_state.error, function () { loadAndRender(sectionEl); });
          console.error('[mesa-tables] unexpected error', err);
        });
    });
  }

  /* ==========================================================================
     RENDER GRID
  ========================================================================== */
  function renderGrid(sectionEl, restaurant) {
    var wrap = sectionEl.querySelector('#mesa-grid-wrap');
    if (!wrap) return;

    if (!_state.tables.length) {
      wrap.innerHTML = buildEmptyHtml(
        'No tables yet',
        'Add your first table to get a QR code.',
        function () { openAddModal(sectionEl, restaurant); }
      );
      announceStatus(sectionEl, 'No tables found. Use Add table to create one.');
      return;
    }

    // Build card HTML
    var html = '<div class="mesa-qr-grid" role="list" aria-label="Tables and QR codes">';
    _state.tables.forEach(function (t) {
      var safeId    = 'mesa-qr-' + t.id.replace(/[^a-zA-Z0-9_-]/g, '_');
      var seatsText = t.seats ? t.seats + ' seat' + (t.seats !== 1 ? 's' : '') : '';
      html += [
        '<article class="mesa-qr-card" role="listitem"',
          ' aria-label="' + esc(t.label) + (seatsText ? ', ' + esc(seatsText) : '') + '">',
          '<h3 class="mesa-qr-card-title">' + esc(t.label) + '</h3>',
          seatsText
            ? '<p class="mesa-qr-card-seats">' + esc(seatsText) + '</p>'
            : '',
          '<div class="mesa-qr-img" id="' + esc(safeId) + '" aria-label="QR code for ' + esc(t.label) + '"></div>',
          '<p class="mesa-qr-code-text">' + esc(t.table_code) + '</p>',
          '<div class="mesa-qr-actions">',
            '<button class="mesa-icon-btn" type="button"',
              ' data-action="edit" data-tid="' + esc(t.id) + '"',
              ' data-label="' + esc(t.label) + '" data-seats="' + esc(String(t.seats || 4)) + '"',
              ' aria-label="Edit ' + esc(t.label) + '">',
              svgEdit(),
            '</button>',
            '<button class="mesa-icon-btn" type="button"',
              ' data-action="download" data-tid="' + esc(t.id) + '"',
              ' data-qr-id="' + esc(safeId) + '"',
              ' data-label="' + esc(t.label) + '"',
              ' aria-label="Download QR code for ' + esc(t.label) + '">',
              svgDownload(),
            '</button>',
            '<button class="mesa-icon-btn mesa-icon-btn-danger" type="button"',
              ' data-action="delete" data-tid="' + esc(t.id) + '"',
              ' data-label="' + esc(t.label) + '"',
              ' aria-label="Delete ' + esc(t.label) + '">',
              svgTrash(),
            '</button>',
          '</div>',
        '</article>',
      ].join('');
    });
    html += '</div>';
    wrap.innerHTML = html;

    announceStatus(sectionEl, _state.tables.length + ' table' + (_state.tables.length !== 1 ? 's' : '') + ' loaded.');

    // Wire card action buttons
    wrap.querySelectorAll('[data-action]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var action = btn.dataset.action;
        var tid    = btn.dataset.tid;
        if (action === 'edit') {
          openEditModal(sectionEl, restaurant, tid, btn.dataset.label, btn.dataset.seats);
        } else if (action === 'delete') {
          doDeleteTable(sectionEl, restaurant, tid, btn.dataset.label);
        } else if (action === 'download') {
          doDownloadQr(btn.dataset.qrId, btn.dataset.label);
        }
      });
      // Keyboard: Enter and Space
      btn.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          btn.click();
        }
      });
    });

    // Lazy-load QR library then generate all QR codes
    loadQrLib(function () {
      if (!window.QRCode) return;
      _state.tables.forEach(function (t) {
        var safeId  = 'mesa-qr-' + t.id.replace(/[^a-zA-Z0-9_-]/g, '_');
        var el      = document.getElementById(safeId);
        if (!el) return;
        el.innerHTML = ''; // clear any stale content
        try {
          new window.QRCode(el, {
            text:         makePayUrl(t.table_code),
            width:        120,
            height:       120,
            correctLevel: window.QRCode.CorrectLevel.M,
          });
        } catch (e) {
          console.warn('[mesa-tables] QR render failed for', t.table_code, e);
        }
      });
    });
  }

  /* ==========================================================================
     ADD TABLE MODAL
  ========================================================================== */
  function openAddModal(sectionEl, restaurant) {
    var overlay = sectionEl.querySelector('#mesa-add-modal');
    if (!overlay) return;
    sectionEl.querySelector('#mesa-table-label').value = '';
    sectionEl.querySelector('#mesa-table-count').value = '1';
    sectionEl.querySelector('#mesa-table-seats').value = '4';
    overlay.classList.add('mesa-open');
    setTimeout(function () {
      var inp = sectionEl.querySelector('#mesa-table-label');
      if (inp) inp.focus();
    }, 50);
  }

  function closeAddModal(sectionEl) {
    var overlay = sectionEl.querySelector('#mesa-add-modal');
    if (overlay) overlay.classList.remove('mesa-open');
  }

  function wireModal(sectionEl) {
    /* Add button in toolbar */
    var addBtn = sectionEl.querySelector('#mesa-add-btn');
    if (addBtn) {
      addBtn.addEventListener('click', function () {
        getTenant(function (err, restaurant) {
          if (err || !restaurant) { toast('Could not load restaurant data.', 'err'); return; }
          openAddModal(sectionEl, restaurant);
        });
      });
    }

    /* Print button */
    var printBtn = sectionEl.querySelector('#mesa-print-btn');
    if (printBtn) {
      printBtn.addEventListener('click', function () { window.print(); });
    }

    /* Modal close / cancel */
    var closeBtn  = sectionEl.querySelector('#mesa-add-modal-close');
    var cancelBtn = sectionEl.querySelector('#mesa-add-cancel-btn');
    var overlay   = sectionEl.querySelector('#mesa-add-modal');

    if (closeBtn)  closeBtn.addEventListener('click',  function () { closeAddModal(sectionEl); });
    if (cancelBtn) cancelBtn.addEventListener('click', function () { closeAddModal(sectionEl); });
    if (overlay) {
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closeAddModal(sectionEl);
      });
    }

    /* Keyboard Escape on overlay */
    if (overlay) {
      overlay.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeAddModal(sectionEl);
      });
    }

    /* Save */
    var saveBtn = sectionEl.querySelector('#mesa-add-save-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        getTenant(function (err, restaurant) {
          if (err || !restaurant) { toast('Could not load restaurant data.', 'err'); return; }
          doAddTables(sectionEl, restaurant);
        });
      });
    }

    /* Enter key in inputs submits */
    ['#mesa-table-label', '#mesa-table-count', '#mesa-table-seats'].forEach(function (sel) {
      var inp = sectionEl.querySelector(sel);
      if (inp) {
        inp.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            var sb = sectionEl.querySelector('#mesa-add-save-btn');
            if (sb) sb.click();
          }
        });
      }
    });
  }

  function doAddTables(sectionEl, restaurant) {
    var labelInput = sectionEl.querySelector('#mesa-table-label');
    var countInput = sectionEl.querySelector('#mesa-table-count');
    var seatsInput = sectionEl.querySelector('#mesa-table-seats');
    var saveBtn    = sectionEl.querySelector('#mesa-add-save-btn');

    var labelBase = labelInput ? labelInput.value.trim() : '';
    var count     = Math.max(1, Math.min(50, parseInt((countInput && countInput.value) || '1') || 1));
    var seats     = Math.max(1, Math.min(50, parseInt((seatsInput && seatsInput.value) || '4') || 4));

    if (!labelBase) { toast('Enter a table name.', 'err'); if (labelInput) labelInput.focus(); return; }

    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Generating…'; }

    var inserts = [];
    for (var i = 0; i < count; i++) {
      var label = count > 1 ? labelBase + ' ' + (i + 1) : labelBase;
      inserts.push({
        restaurant_id: restaurant.id,
        label:         label,
        table_code:    genCode(),
        seats:         seats,
        is_active:     true,
      });
    }

    var sb = getClient();
    if (!sb) { toast('Database client unavailable.', 'err'); return; }

    sb.from('mesa_tables').insert(inserts).select('*')
      .then(function (res) {
        if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Generate QR codes'; }
        if (res.error) { toast('Error adding tables.', 'err'); console.error(res.error); return; }
        _state.tables = _state.tables.concat(res.data || []);
        closeAddModal(sectionEl);
        renderGrid(sectionEl, restaurant);
        toast(count + ' table' + (count > 1 ? 's' : '') + ' added.', 'ok');
      })
      .catch(function (err) {
        if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Generate QR codes'; }
        toast('Unexpected error.', 'err');
        console.error('[mesa-tables] add error', err);
      });
  }

  /* ==========================================================================
     EDIT TABLE MODAL
  ========================================================================== */
  function openEditModal(sectionEl, restaurant, tid, label, seats) {
    var overlay = sectionEl.querySelector('#mesa-edit-modal');
    if (!overlay) return;
    var idInp    = sectionEl.querySelector('#mesa-edit-id');
    var labelInp = sectionEl.querySelector('#mesa-edit-label');
    var seatsInp = sectionEl.querySelector('#mesa-edit-seats');
    if (idInp)    idInp.value    = tid;
    if (labelInp) labelInp.value = label || '';
    if (seatsInp) seatsInp.value = seats  || '4';
    overlay.classList.add('mesa-open');
    setTimeout(function () { if (labelInp) labelInp.focus(); }, 50);
  }

  function closeEditModal(sectionEl) {
    var overlay = sectionEl.querySelector('#mesa-edit-modal');
    if (overlay) overlay.classList.remove('mesa-open');
  }

  function wireEditModal(sectionEl) {
    var closeBtn  = sectionEl.querySelector('#mesa-edit-modal-close');
    var cancelBtn = sectionEl.querySelector('#mesa-edit-cancel-btn');
    var overlay   = sectionEl.querySelector('#mesa-edit-modal');
    var saveBtn   = sectionEl.querySelector('#mesa-edit-save-btn');

    if (closeBtn)  closeBtn.addEventListener('click',  function () { closeEditModal(sectionEl); });
    if (cancelBtn) cancelBtn.addEventListener('click', function () { closeEditModal(sectionEl); });
    if (overlay) {
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closeEditModal(sectionEl);
      });
      overlay.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeEditModal(sectionEl);
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        getTenant(function (err, restaurant) {
          if (err || !restaurant) { toast('Could not load restaurant data.', 'err'); return; }
          doSaveEdit(sectionEl, restaurant);
        });
      });
    }

    ['#mesa-edit-label', '#mesa-edit-seats'].forEach(function (sel) {
      var inp = sectionEl.querySelector(sel);
      if (inp) {
        inp.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            var sb = sectionEl.querySelector('#mesa-edit-save-btn');
            if (sb) sb.click();
          }
        });
      }
    });
  }

  function doSaveEdit(sectionEl, restaurant) {
    var idInp    = sectionEl.querySelector('#mesa-edit-id');
    var labelInp = sectionEl.querySelector('#mesa-edit-label');
    var seatsInp = sectionEl.querySelector('#mesa-edit-seats');
    var saveBtn  = sectionEl.querySelector('#mesa-edit-save-btn');

    var id    = idInp    ? idInp.value.trim()                                       : '';
    var label = labelInp ? labelInp.value.trim()                                    : '';
    var seats = Math.max(1, Math.min(50, parseInt((seatsInp && seatsInp.value) || '4') || 4));

    if (!label) { toast('Enter a table name.', 'err'); if (labelInp) labelInp.focus(); return; }

    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving…'; }

    var sb = getClient();
    if (!sb) { toast('Database client unavailable.', 'err'); return; }

    sb.from('mesa_tables').update({ label: label, seats: seats }).eq('id', id).select('*').single()
      .then(function (res) {
        if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save'; }
        if (res.error) { toast('Error saving table.', 'err'); console.error(res.error); return; }
        _state.tables = _state.tables.map(function (t) {
          return t.id === id ? res.data : t;
        });
        closeEditModal(sectionEl);
        renderGrid(sectionEl, restaurant);
        toast('Table updated.', 'ok');
      })
      .catch(function (err) {
        if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save'; }
        toast('Unexpected error.', 'err');
        console.error('[mesa-tables] edit error', err);
      });
  }

  /* ==========================================================================
     DELETE TABLE
  ========================================================================== */
  function doDeleteTable(sectionEl, restaurant, tid, label) {
    if (!window.confirm('Delete "' + label + '"? This cannot be undone.')) return;
    var sb = getClient();
    if (!sb) { toast('Database client unavailable.', 'err'); return; }
    sb.from('mesa_tables').delete().eq('id', tid)
      .then(function (res) {
        if (res.error) { toast('Error deleting table.', 'err'); console.error(res.error); return; }
        _state.tables = _state.tables.filter(function (t) { return t.id !== tid; });
        renderGrid(sectionEl, restaurant);
        toast('Table deleted.', 'ok');
      })
      .catch(function (err) {
        toast('Unexpected error.', 'err');
        console.error('[mesa-tables] delete error', err);
      });
  }

  /* ==========================================================================
     DOWNLOAD QR
  ========================================================================== */
  function doDownloadQr(safeId, label) {
    var container = document.getElementById(safeId);
    if (!container) { toast('QR not ready.', 'err'); return; }
    var canvas = container.querySelector('canvas');
    if (!canvas) { toast('QR not ready yet. Please wait a moment and try again.', 'err'); return; }
    var a = document.createElement('a');
    a.href     = canvas.toDataURL('image/png');
    a.download = (label || 'qr').replace(/\s+/g, '-') + '.png';
    a.click();
  }

  /* ==========================================================================
     HTML BUILDERS
  ========================================================================== */
  function buildSkeletonGrid(n) {
    var html = '<div class="mesa-skel-grid" aria-hidden="true" aria-busy="true">';
    for (var i = 0; i < n; i++) {
      html += '<div class="mesa-skel-card"></div>';
    }
    return html + '</div>';
  }

  function buildErrorHtml(msg, retryFn) {
    var btnId = 'mesa-retry-' + Date.now();
    setTimeout(function () {
      var btn = document.getElementById(btnId);
      if (btn && retryFn) btn.addEventListener('click', retryFn);
    }, 0);
    return [
      '<div class="mesa-error-bar" role="alert">',
        '<span>Unable to load tables — please try again.</span>',
        '<button class="mesa-retry-btn" id="' + btnId + '" type="button">Retry</button>',
      '</div>',
    ].join('');
  }

  function buildEmptyHtml(title, body, addFn) {
    var btnId = addFn ? 'mesa-empty-add-' + Date.now() : null;
    if (btnId) {
      setTimeout(function () {
        var btn = document.getElementById(btnId);
        if (btn) btn.addEventListener('click', addFn);
      }, 0);
    }
    return [
      '<div class="mesa-empty">',
        '<svg aria-hidden="true" width="64" height="64" viewBox="0 0 24 24" fill="none"',
          ' stroke="var(--color-text-muted)" stroke-width="1.5"',
          ' stroke-linecap="round" stroke-linejoin="round">',
          '<rect x="5" y="2" width="14" height="20" rx="2"/>',
          '<line x1="12" y1="18" x2="12.01" y2="18" stroke-width="2.5"/>',
        '</svg>',
        '<p class="mesa-empty-title">' + esc(title) + '</p>',
        body ? '<p class="mesa-empty-body">' + esc(body) + '</p>' : '',
        addFn
          ? '<button class="mesa-btn mesa-btn-primary" id="' + esc(btnId) + '" type="button">'
              + svgPlus() + ' Add table</button>'
          : '',
      '</div>',
    ].join('');
  }

  function announceStatus(sectionEl, msg) {
    var el = sectionEl.querySelector('#mesa-live-region');
    if (el) el.textContent = msg;
  }

  /* ==========================================================================
     INLINE SVG ICONS
  ========================================================================== */
  function svgPlus() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
      + ' stroke-width="2" stroke-linecap="round" aria-hidden="true">'
      + '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
  }
  function svgPrint() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
      + ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
      + '<polyline points="6 9 6 2 18 2 18 9"/>'
      + '<path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>'
      + '<rect x="6" y="14" width="12" height="8"/></svg>';
  }
  function svgEdit() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
      + ' stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
      + '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>'
      + '<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
  }
  function svgDownload() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
      + ' stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
      + '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>'
      + '<polyline points="7 10 12 15 17 10"/>'
      + '<line x1="12" y1="15" x2="12" y2="3"/></svg>';
  }
  function svgTrash() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
      + ' stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
      + '<polyline points="3 6 5 6 21 6"/>'
      + '<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>'
      + '<path d="M10 11v6"/><path d="M14 11v6"/>'
      + '<path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>';
  }
  function svgClose() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
      + ' stroke-width="2" stroke-linecap="round" aria-hidden="true">'
      + '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  }

  /* ==========================================================================
     REGISTER MODULE
     Registers under both window.COV.screens and window.PLAT.screens per the
     platform convention. The shell accesses either alias indifferently.
  ========================================================================== */
  var screen = { render: render };

  window.COV             = window.COV             || {};
  window.COV.screens     = window.COV.screens     || {};
  window.PLAT            = window.PLAT            || {};
  window.PLAT.screens    = window.PLAT.screens    || {};

  window.COV.screens['qr-tables']  = screen;
  window.PLAT.screens['qr-tables'] = screen;

}());
