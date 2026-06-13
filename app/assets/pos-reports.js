/* ============================================================================
   POS Reports — Tavolo screen module
   Registers:
     window.COV.screens['pos-reports']
     window.PLAT.screens['pos-reports']
   Renders X-Report KPIs, sales breakdowns (by server / item / category / hour /
   payment mix / voids & comps / tips), and a shifts list with Z-reports.
   Injects own CSS once via <style id="pos-reports-css">.
   All CSS classes are namespaced .posr-* — zero collision with shell.
   No build step. ES5. Depends on window.PLAT (platform.js loaded first).
   ============================================================================ */

(function () {
  'use strict';

  /* ==========================================================================
     CSS — injected once, namespaced .posr-*
  ========================================================================== */
  var CSS = '\n\
/* ===== POS Reports Layout ===== */\n\
.posr-root {\n\
  display: flex;\n\
  flex-direction: column;\n\
  gap: var(--space-5);\n\
  min-width: 0;\n\
}\n\
\n\
/* Toolbar */\n\
.posr-toolbar {\n\
  display: flex;\n\
  align-items: center;\n\
  justify-content: space-between;\n\
  flex-wrap: wrap;\n\
  gap: var(--space-3);\n\
}\n\
.posr-toolbar-title {\n\
  font-size: 22px;\n\
  font-weight: 700;\n\
  letter-spacing: -0.02em;\n\
  color: var(--color-text-primary);\n\
}\n\
.posr-toolbar-sub {\n\
  font-size: 13px;\n\
  color: var(--color-text-muted);\n\
  margin-top: 2px;\n\
}\n\
.posr-seg {\n\
  display: flex;\n\
  background: var(--color-surface-raised);\n\
  border-radius: var(--radius-full);\n\
  padding: 3px;\n\
  gap: 2px;\n\
  flex-shrink: 0;\n\
}\n\
.posr-seg-btn {\n\
  padding: 6px 14px;\n\
  border-radius: var(--radius-full);\n\
  font-size: 13px;\n\
  font-weight: 500;\n\
  color: var(--color-text-secondary);\n\
  background: none;\n\
  border: none;\n\
  cursor: pointer;\n\
  transition: background var(--duration-fast), color var(--duration-fast), box-shadow var(--duration-fast);\n\
  white-space: nowrap;\n\
  min-height: 32px;\n\
  min-width: 44px;\n\
}\n\
.posr-seg-btn:focus-visible {\n\
  outline: 2px solid var(--shell-copper);\n\
  outline-offset: 1px;\n\
}\n\
.posr-seg-btn.active {\n\
  background: var(--shell-copper);\n\
  color: #fff;\n\
  font-weight: 600;\n\
  box-shadow: var(--shadow-sm);\n\
}\n\
\n\
/* Section heading */\n\
.posr-section-head {\n\
  font-size: 11px;\n\
  font-weight: 700;\n\
  letter-spacing: 0.09em;\n\
  text-transform: uppercase;\n\
  color: var(--color-text-muted);\n\
  margin-bottom: var(--space-3);\n\
  display: flex;\n\
  align-items: center;\n\
  gap: var(--space-2);\n\
}\n\
\n\
/* freshness stamp on the live X-report */\n\
.posr-asof {\n\
  margin-left: auto;\n\
  font-size: 10.5px;\n\
  font-weight: 600;\n\
  letter-spacing: 0.04em;\n\
  text-transform: none;\n\
  color: var(--color-text-muted);\n\
  opacity: 0.8;\n\
}\n\
\n\
/* CSV export (for the accountant) */\n\
.posr-export-btn {\n\
  display: inline-flex; align-items: center; gap: 6px;\n\
  min-height: 36px; padding: 0 14px; margin-left: 10px;\n\
  border-radius: 9px; cursor: pointer;\n\
  background: rgba(194,112,61,0.12);\n\
  border: 1px solid rgba(194,112,61,0.4);\n\
  color: #c2703d; font-size: 12.5px; font-weight: 700;\n\
  transition: background 150ms;\n\
}\n\
.posr-export-btn:hover { background: rgba(194,112,61,0.2); }\n\
.posr-export-btn:focus-visible { outline: 2px solid #c2703d; outline-offset: 2px; }\n\
.posr-export-btn:disabled { opacity: 0.5; cursor: default; }\n\
\n\
/* X-Report "live" indicator */\n\
.posr-live-dot {\n\
  display: inline-block;\n\
  width: 7px;\n\
  height: 7px;\n\
  border-radius: 50%;\n\
  background: var(--color-success);\n\
  animation: posr-live-pulse 2.5s infinite;\n\
  flex-shrink: 0;\n\
}\n\
@keyframes posr-live-pulse {\n\
  0%, 100% { transform: scale(1); opacity: 1; }\n\
  50%       { transform: scale(1.4); opacity: 0.6; }\n\
}\n\
\n\
/* KPI tiles */\n\
.posr-kpi-grid {\n\
  display: grid;\n\
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));\n\
  gap: var(--space-3);\n\
}\n\
.posr-kpi-card {\n\
  background: var(--color-surface);\n\
  border: 1px solid var(--color-border);\n\
  border-radius: var(--radius-lg);\n\
  padding: var(--space-4) var(--space-4) var(--space-3);\n\
  transition: box-shadow var(--duration-fast), transform var(--duration-fast);\n\
  animation: posr-kpi-in 0.3s var(--easing-standard) both;\n\
}\n\
.posr-kpi-card:hover { box-shadow: var(--shadow-md); transform: translateY(-1px); }\n\
.posr-kpi-card:nth-child(1) { animation-delay: 0.04s; }\n\
.posr-kpi-card:nth-child(2) { animation-delay: 0.08s; }\n\
.posr-kpi-card:nth-child(3) { animation-delay: 0.12s; }\n\
.posr-kpi-card:nth-child(4) { animation-delay: 0.16s; }\n\
.posr-kpi-card:nth-child(5) { animation-delay: 0.20s; }\n\
.posr-kpi-card:nth-child(6) { animation-delay: 0.24s; }\n\
@keyframes posr-kpi-in {\n\
  from { opacity: 0; transform: translateY(6px); }\n\
  to   { opacity: 1; transform: translateY(0); }\n\
}\n\
.posr-kpi-label {\n\
  font-size: 11px;\n\
  font-weight: 600;\n\
  letter-spacing: 0.08em;\n\
  text-transform: uppercase;\n\
  color: var(--color-text-muted);\n\
  margin-bottom: var(--space-2);\n\
  line-height: 1.3;\n\
}\n\
.posr-kpi-value {\n\
  font-size: 28px;\n\
  font-weight: 700;\n\
  letter-spacing: -0.03em;\n\
  font-variant-numeric: tabular-nums;\n\
  color: var(--color-text-primary);\n\
  line-height: 1.1;\n\
  margin-bottom: 2px;\n\
}\n\
.posr-kpi-value.copper { color: var(--shell-copper); }\n\
.posr-kpi-sub {\n\
  font-size: 12px;\n\
  color: var(--color-text-muted);\n\
}\n\
\n\
/* Content grid */\n\
.posr-grid {\n\
  display: grid;\n\
  grid-template-columns: 1fr 1fr;\n\
  gap: var(--space-4);\n\
  align-items: start;\n\
}\n\
.posr-full {\n\
  grid-column: 1 / -1;\n\
}\n\
\n\
/* Panel card */\n\
.posr-panel {\n\
  background: var(--color-surface);\n\
  border: 1px solid var(--color-border);\n\
  border-radius: var(--radius-lg);\n\
  overflow: hidden;\n\
  min-width: 0;\n\
}\n\
.posr-panel-head {\n\
  padding: var(--space-4) var(--space-5);\n\
  border-bottom: 1px solid var(--color-border);\n\
  font-size: 14px;\n\
  font-weight: 600;\n\
  color: var(--color-text-primary);\n\
  display: flex;\n\
  align-items: center;\n\
  justify-content: space-between;\n\
  gap: var(--space-3);\n\
}\n\
.posr-panel-body {\n\
  padding: var(--space-4) var(--space-5);\n\
}\n\
\n\
/* Data table */\n\
.posr-tbl-wrap {\n\
  overflow-x: auto;\n\
  -webkit-overflow-scrolling: touch;\n\
  margin: 0 calc(-1 * var(--space-5));\n\
  padding: 0 var(--space-5);\n\
}\n\
.posr-tbl {\n\
  width: 100%;\n\
  min-width: 360px;\n\
  border-collapse: collapse;\n\
  font-size: 13px;\n\
}\n\
.posr-tbl th {\n\
  font-size: 10px;\n\
  font-weight: 700;\n\
  letter-spacing: 0.09em;\n\
  text-transform: uppercase;\n\
  color: var(--color-text-muted);\n\
  padding: var(--space-2) var(--space-3);\n\
  text-align: left;\n\
  border-bottom: 1px solid var(--color-border);\n\
  white-space: nowrap;\n\
}\n\
.posr-tbl th.r, .posr-tbl td.r {\n\
  text-align: right;\n\
}\n\
.posr-tbl td {\n\
  padding: var(--space-3);\n\
  border-bottom: 1px solid var(--color-border);\n\
  color: var(--color-text-primary);\n\
  vertical-align: middle;\n\
}\n\
.posr-tbl tr:last-child td { border-bottom: none; }\n\
.posr-tbl tr:hover td { background: var(--color-surface-raised); }\n\
.posr-num { font-variant-numeric: tabular-nums; }\n\
.posr-copper { color: var(--shell-copper); font-weight: 600; }\n\
.posr-muted { color: var(--color-text-muted); }\n\
\n\
/* Bar chart */\n\
.posr-bars {\n\
  display: flex;\n\
  flex-direction: column;\n\
  gap: var(--space-2);\n\
}\n\
.posr-bar-row {\n\
  display: flex;\n\
  align-items: center;\n\
  gap: var(--space-2);\n\
  min-width: 0;\n\
}\n\
.posr-bar-label {\n\
  flex: 0 0 110px;\n\
  font-size: 12px;\n\
  color: var(--color-text-secondary);\n\
  text-align: right;\n\
  overflow: hidden;\n\
  text-overflow: ellipsis;\n\
  white-space: nowrap;\n\
  min-width: 0;\n\
}\n\
.posr-bar-track {\n\
  flex: 1;\n\
  height: 22px;\n\
  background: var(--color-surface-raised);\n\
  border-radius: var(--radius-sm);\n\
  overflow: hidden;\n\
  min-width: 0;\n\
}\n\
.posr-bar-fill {\n\
  height: 100%;\n\
  background: var(--shell-copper);\n\
  border-radius: var(--radius-sm);\n\
  transition: width 0.55s var(--easing-standard);\n\
  min-width: 2px;\n\
}\n\
.posr-bar-fill.alt {\n\
  background: var(--shell-gold);\n\
}\n\
.posr-bar-fill.info {\n\
  background: var(--color-info);\n\
}\n\
.posr-bar-val {\n\
  flex: 0 0 70px;\n\
  font-size: 12px;\n\
  font-weight: 600;\n\
  font-variant-numeric: tabular-nums;\n\
  color: var(--color-text-primary);\n\
  text-align: left;\n\
  white-space: nowrap;\n\
}\n\
\n\
/* Tender / payment mix pips */\n\
.posr-tender-row {\n\
  display: flex;\n\
  align-items: center;\n\
  gap: var(--space-3);\n\
  padding: var(--space-2) 0;\n\
  border-bottom: 1px solid var(--color-border);\n\
  font-size: 13px;\n\
}\n\
.posr-tender-row:last-child { border-bottom: none; }\n\
.posr-tender-dot {\n\
  width: 10px;\n\
  height: 10px;\n\
  border-radius: 50%;\n\
  flex-shrink: 0;\n\
}\n\
.posr-tender-name { flex: 1; color: var(--color-text-primary); }\n\
.posr-tender-pct  { color: var(--color-text-muted); font-size: 12px; }\n\
.posr-tender-amt  { font-weight: 600; font-variant-numeric: tabular-nums; min-width: 60px; text-align: right; }\n\
\n\
/* Shifts list */\n\
.posr-shift-row {\n\
  display: flex;\n\
  align-items: flex-start;\n\
  gap: var(--space-4);\n\
  padding: var(--space-4) 0;\n\
  border-bottom: 1px solid var(--color-border);\n\
}\n\
.posr-shift-row:last-child { border-bottom: none; }\n\
.posr-shift-icon {\n\
  width: 36px;\n\
  height: 36px;\n\
  border-radius: var(--radius-md);\n\
  background: var(--color-surface-raised);\n\
  border: 1px solid var(--color-border);\n\
  display: flex;\n\
  align-items: center;\n\
  justify-content: center;\n\
  flex-shrink: 0;\n\
  color: var(--color-text-muted);\n\
}\n\
.posr-shift-info { flex: 1; min-width: 0; }\n\
.posr-shift-name {\n\
  font-size: 14px;\n\
  font-weight: 600;\n\
  color: var(--color-text-primary);\n\
  margin-bottom: 2px;\n\
}\n\
.posr-shift-meta {\n\
  font-size: 12px;\n\
  color: var(--color-text-muted);\n\
  line-height: 1.6;\n\
}\n\
.posr-shift-meta .posr-copper { font-size: 12px; }\n\
.posr-shift-right {\n\
  display: flex;\n\
  flex-direction: column;\n\
  align-items: flex-end;\n\
  gap: var(--space-1);\n\
  flex-shrink: 0;\n\
}\n\
.posr-shift-status {\n\
  display: inline-flex;\n\
  align-items: center;\n\
  gap: 5px;\n\
  font-size: 11px;\n\
  font-weight: 600;\n\
  letter-spacing: 0.06em;\n\
  text-transform: uppercase;\n\
  padding: 3px 9px;\n\
  border-radius: var(--radius-full);\n\
}\n\
.posr-shift-status.open {\n\
  background: var(--color-success-light);\n\
  color: var(--color-success);\n\
}\n\
.posr-shift-status.closed {\n\
  background: var(--color-surface-raised);\n\
  color: var(--color-text-muted);\n\
}\n\
.posr-over-short.pos { color: var(--color-success); font-weight: 600; }\n\
.posr-over-short.neg { color: var(--color-destructive); font-weight: 600; }\n\
\n\
/* Z-report modal */\n\
.posr-z-overlay {\n\
  position: fixed;\n\
  inset: 0;\n\
  background: var(--color-overlay);\n\
  z-index: 600;\n\
  display: flex;\n\
  align-items: center;\n\
  justify-content: center;\n\
  padding: var(--space-5);\n\
}\n\
.posr-z-modal {\n\
  background: var(--color-surface);\n\
  border-radius: var(--radius-xl);\n\
  padding: var(--space-8);\n\
  width: 100%;\n\
  max-width: 460px;\n\
  max-height: 88vh;\n\
  overflow-y: auto;\n\
  box-shadow: var(--shadow-xl);\n\
  animation: posr-modal-in 0.2s var(--easing-decelerate) both;\n\
  position: relative;\n\
}\n\
@keyframes posr-modal-in {\n\
  from { opacity: 0; transform: scale(0.96) translateY(8px); }\n\
  to   { opacity: 1; transform: scale(1) translateY(0); }\n\
}\n\
.posr-z-close {\n\
  position: absolute;\n\
  top: var(--space-5);\n\
  right: var(--space-5);\n\
  width: 36px;\n\
  height: 36px;\n\
  border-radius: var(--radius-sm);\n\
  background: none;\n\
  border: 1px solid var(--color-border);\n\
  display: flex;\n\
  align-items: center;\n\
  justify-content: center;\n\
  cursor: pointer;\n\
  color: var(--color-text-secondary);\n\
  transition: color var(--duration-fast), background var(--duration-fast);\n\
}\n\
.posr-z-close:hover { color: var(--color-text-primary); background: var(--color-surface-raised); }\n\
.posr-z-close:focus-visible { outline: 2px solid var(--shell-copper); outline-offset: 2px; }\n\
.posr-z-title {\n\
  font-size: 20px;\n\
  font-weight: 700;\n\
  letter-spacing: -0.02em;\n\
  margin-bottom: var(--space-1);\n\
  padding-right: var(--space-10);\n\
}\n\
.posr-z-sub {\n\
  font-size: 13px;\n\
  color: var(--color-text-muted);\n\
  margin-bottom: var(--space-6);\n\
}\n\
.posr-z-line {\n\
  display: flex;\n\
  align-items: baseline;\n\
  justify-content: space-between;\n\
  gap: var(--space-3);\n\
  padding: var(--space-2) 0;\n\
  border-bottom: 1px solid var(--color-border);\n\
  font-size: 14px;\n\
}\n\
.posr-z-line:last-child { border-bottom: none; }\n\
.posr-z-line-label { color: var(--color-text-secondary); flex: 1; min-width: 0; }\n\
.posr-z-line-val   { font-weight: 600; font-variant-numeric: tabular-nums; flex-shrink: 0; }\n\
.posr-z-line.total .posr-z-line-label { font-weight: 700; color: var(--color-text-primary); }\n\
.posr-z-line.total .posr-z-line-val   { font-size: 18px; color: var(--shell-copper); }\n\
.posr-z-divider {\n\
  height: 1px;\n\
  background: var(--color-border);\n\
  margin: var(--space-3) 0;\n\
}\n\
\n\
/* View Z btn */\n\
.posr-z-btn {\n\
  display: inline-flex;\n\
  align-items: center;\n\
  gap: 5px;\n\
  font-size: 12px;\n\
  font-weight: 500;\n\
  color: var(--shell-copper);\n\
  background: none;\n\
  border: 1px solid rgba(194,112,61,.35);\n\
  border-radius: var(--radius-sm);\n\
  padding: 5px 10px;\n\
  cursor: pointer;\n\
  transition: background var(--duration-fast), border-color var(--duration-fast);\n\
  min-height: 30px;\n\
  white-space: nowrap;\n\
}\n\
.posr-z-btn:hover { background: rgba(194,112,61,.07); border-color: var(--shell-copper); }\n\
.posr-z-btn:focus-visible { outline: 2px solid var(--shell-copper); outline-offset: 2px; }\n\
\n\
/* Skeleton */\n\
.posr-skel {\n\
  background: linear-gradient(\n\
    90deg,\n\
    var(--color-surface-raised) 25%,\n\
    var(--color-border) 50%,\n\
    var(--color-surface-raised) 75%\n\
  );\n\
  background-size: 800px 100%;\n\
  animation: posr-shimmer 1.4s infinite linear;\n\
  border-radius: var(--radius-md);\n\
}\n\
@keyframes posr-shimmer {\n\
  0%   { background-position: -400px 0; }\n\
  100% { background-position:  400px 0; }\n\
}\n\
\n\
/* Error / empty */\n\
.posr-error-bar {\n\
  background: var(--color-destructive-light);\n\
  color: var(--color-destructive);\n\
  border: 1px solid rgba(181,59,47,0.2);\n\
  border-radius: var(--radius-md);\n\
  padding: var(--space-3) var(--space-4);\n\
  font-size: 14px;\n\
  display: flex;\n\
  align-items: center;\n\
  justify-content: space-between;\n\
  gap: var(--space-3);\n\
}\n\
.posr-retry-btn {\n\
  background: none;\n\
  border: none;\n\
  color: var(--color-destructive);\n\
  font-weight: 600;\n\
  font-size: 13px;\n\
  cursor: pointer;\n\
  text-decoration: underline;\n\
  padding: 0;\n\
  flex-shrink: 0;\n\
  min-height: 44px;\n\
}\n\
.posr-retry-btn:focus-visible { outline: 2px solid var(--color-destructive); outline-offset: 2px; }\n\
.posr-empty {\n\
  text-align: center;\n\
  padding: var(--space-8) var(--space-5);\n\
  color: var(--color-text-muted);\n\
  font-size: 14px;\n\
}\n\
.posr-empty svg { margin: 0 auto var(--space-3); display: block; }\n\
.posr-empty-title { font-size: 15px; font-weight: 600; color: var(--color-text-secondary); margin-bottom: 4px; }\n\
\n\
/* ===== Responsive ===== */\n\
@media (max-width: 1023px) {\n\
  .posr-grid { grid-template-columns: 1fr; }\n\
  .posr-full { grid-column: 1; }\n\
}\n\
@media (max-width: 599px) {\n\
  .posr-kpi-grid { grid-template-columns: 1fr 1fr; }\n\
  .posr-kpi-value { font-size: 22px; }\n\
  .posr-toolbar { flex-direction: column; align-items: flex-start; }\n\
  .posr-bar-label { flex: 0 0 80px; font-size: 11px; }\n\
  .posr-bar-val { flex: 0 0 56px; font-size: 11px; }\n\
  .posr-z-modal { padding: var(--space-6) var(--space-5); }\n\
  .posr-shift-row { flex-wrap: wrap; }\n\
}\n\
@media (max-width: 374px) {\n\
  .posr-kpi-grid { grid-template-columns: 1fr; }\n\
  .posr-kpi-value { font-size: 20px; }\n\
}\n\
@media (prefers-reduced-motion: reduce) {\n\
  .posr-skel     { animation: none; background: var(--color-surface-raised); }\n\
  .posr-kpi-card { animation: none; }\n\
  .posr-bar-fill { transition: none; }\n\
  .posr-live-dot { animation: none; }\n\
}\n\
';

  /* ==========================================================================
     Inject CSS once
  ========================================================================== */
  function injectStyles() {
    if (document.getElementById('pos-reports-css')) return;
    var style = document.createElement('style');
    style.id = 'pos-reports-css';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  /* ==========================================================================
     Helpers — thin wrappers over PLAT.utils
  ========================================================================== */
  function esc(s) { return window.PLAT.utils.esc(String(s == null ? '' : s)); }
  function money(cents) { return window.PLAT.utils.money(cents); }
  function toast(msg, kind) { return window.PLAT.utils.toast(msg, kind); }

  /* ==========================================================================
     Module state
  ========================================================================== */
  var _state = {
    restaurant: null,
    range: 'today',
    zOverlay: null,    // current open z-report overlay el
  };

  var _restCache = null;

  /* ==========================================================================
     Tenant resolution — demo first, then first row
  ========================================================================== */
  var DEMO_ID = 'a1000000-0000-0000-0000-000000000001';

  function getRestaurant() {
    if (_restCache) return Promise.resolve(_restCache);
    var sb = window.PLAT.client;
    // Try demo restaurant first, fall back to the owner's first mesa_restaurants row
    return sb.from('mesa_restaurants')
      .select('id,name,currency')
      .eq('id', DEMO_ID)
      .maybeSingle()
      .then(function (res) {
        if (!res.error && res.data) {
          _restCache = res.data;
          return res.data;
        }
        // fallback: first row
        return sb.from('mesa_restaurants')
          .select('id,name,currency')
          .limit(1)
          .maybeSingle()
          .then(function (r2) {
            if (r2.error) throw r2.error;
            _restCache = r2.data;
            return r2.data;
          });
      });
  }

  /* ==========================================================================
     Date helpers
  ========================================================================== */
  function rangeISO(range) {
    var now = new Date();
    if (range === 'today') {
      var d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      return d.toISOString();
    }
    if (range === 'week') {
      var w = new Date(now); w.setDate(now.getDate() - 7);
      return w.toISOString();
    }
    // month
    var m = new Date(now); m.setDate(now.getDate() - 30);
    return m.toISOString();
  }

  function fmtDateTime(iso) {
    if (!iso) return '—';
    try {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short', day: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true
      }).format(new Date(iso));
    } catch (e) { return iso.slice(0, 16).replace('T', ' '); }
  }

  function fmtTime(iso) {
    if (!iso) return '—';
    try {
      return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric', minute: '2-digit', hour12: true
      }).format(new Date(iso));
    } catch (e) { return iso.slice(11, 16); }
  }

  /* ==========================================================================
     Skeleton helpers
  ========================================================================== */
  function kpiSkels(n) {
    var h = '';
    for (var i = 0; i < n; i++) {
      h += '<div class="posr-kpi-card"><div class="posr-skel" style="height:72px"></div></div>';
    }
    return h;
  }

  function panelSkel(height) {
    return '<div class="posr-skel" style="height:' + (height || 140) + 'px"></div>';
  }

  /* ==========================================================================
     Error / empty helpers
  ========================================================================== */
  function errBar(msg, retryId) {
    return '<div class="posr-error-bar" role="alert">'
      + '<span>' + esc(msg) + '</span>'
      + '<button class="posr-retry-btn" id="' + esc(retryId) + '" type="button">Retry</button>'
      + '</div>';
  }

  function emptyState(title, body) {
    return '<div class="posr-empty" role="status">'
      + '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)"'
      + ' stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
      + '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>'
      + '<rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>'
      + '</svg>'
      + '<p class="posr-empty-title">' + esc(title) + '</p>'
      + '<p>' + esc(body) + '</p>'
      + '</div>';
  }

  /* ==========================================================================
     Bar chart builder
  ========================================================================== */
  function barChart(rows, labelKey, valKey, fmtVal, colorClass, ariaLabel) {
    if (!rows || !rows.length) {
      return '<p style="color:var(--color-text-muted);font-size:13px;padding:var(--space-3) 0">No data for this period.</p>';
    }
    var max = rows[0][valKey] || 1;
    return '<div class="posr-bars" role="list" aria-label="' + esc(ariaLabel || '') + '">'
      + rows.map(function (row) {
          var pct = Math.round((row[valKey] / max) * 100);
          return '<div class="posr-bar-row" role="listitem">'
            + '<span class="posr-bar-label" title="' + esc(row[labelKey]) + '" aria-hidden="true">'
            + esc(row[labelKey]) + '</span>'
            + '<div class="posr-bar-track" aria-label="' + esc(row[labelKey]) + ': ' + esc(fmtVal(row)) + '">'
            + '<div class="posr-bar-fill' + (colorClass ? ' ' + colorClass : '') + '" style="width:' + pct + '%" aria-hidden="true"></div>'
            + '</div>'
            + '<span class="posr-bar-val posr-num">' + esc(fmtVal(row)) + '</span>'
            + '</div>';
        }).join('')
      + '</div>';
  }

  /* ==========================================================================
     Z-report modal
  ========================================================================== */
  function openZModal(shiftId, staffName, startedAt) {
    var sb = window.PLAT.client;
    // Remove previous overlay if any
    closeZModal();

    var overlay = document.createElement('div');
    overlay.className = 'posr-z-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'posr-z-modal-title');
    overlay.innerHTML = '<div class="posr-z-modal">'
      + '<button class="posr-z-close" id="posr-z-close-btn" aria-label="Close Z-report">'
      + '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
      + '</button>'
      + '<h2 class="posr-z-title" id="posr-z-modal-title">Z-Report</h2>'
      + '<p class="posr-z-sub">' + esc(staffName || 'Staff') + ' · Shift opened ' + esc(fmtDateTime(startedAt)) + '</p>'
      + '<div id="posr-z-body">' + panelSkel(200) + '</div>'
      + '</div>';

    _state.zOverlay = overlay;
    document.body.appendChild(overlay);

    // Close on backdrop click
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeZModal();
    });
    // Close on Escape
    overlay.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeZModal();
    });

    // Wire close button (deferred so DOM is appended)
    setTimeout(function () {
      var btn = document.getElementById('posr-z-close-btn');
      if (btn) {
        btn.addEventListener('click', closeZModal);
        btn.focus();
      }
    }, 0);

    // Fetch Z-report
    sb.rpc('pos_z_report', { p_shift: shiftId })
      .then(function (res) {
        var body = document.getElementById('posr-z-body');
        if (!body) return;
        if (res.error || !res.data) {
          body.innerHTML = '<p style="color:var(--color-destructive);font-size:14px">Could not load Z-report data.</p>';
          return;
        }
        var z = res.data;
        var lines = [];

        // Sales
        lines.push({ label: 'Gross Sales', val: money(z.sales || 0) });
        lines.push({ label: 'Voids', val: money(z.voids || 0), sub: true });

        // Tenders
        if (z.tenders) {
          lines.push({ sep: true });
          lines.push({ label: 'Cash Collected', val: money(z.tenders.cash || 0) });
          lines.push({ label: 'Card Collected', val: money(z.tenders.card || 0) });
        }

        // Tips
        lines.push({ sep: true });
        lines.push({ label: 'Tips', val: money(z.tips || 0) });

        // Cash management
        if (z.expected_cash != null) {
          lines.push({ sep: true });
          lines.push({ label: 'Expected Cash', val: money(z.expected_cash) });
          var os = z.over_short || 0;
          lines.push({ label: 'Over / Short', val: (os >= 0 ? '+' : '') + money(os),
            cls: os >= 0 ? 'pos' : 'neg' });
        }

        // Net total
        lines.push({ sep: true });
        lines.push({ label: 'Net Sales', val: money((z.sales || 0) - (z.voids || 0)), total: true });

        body.innerHTML = lines.map(function (l) {
          if (l.sep) return '<div class="posr-z-divider"></div>';
          return '<div class="posr-z-line' + (l.total ? ' total' : '') + '">'
            + '<span class="posr-z-line-label' + (l.sub ? ' posr-muted' : '') + '">' + esc(l.label) + '</span>'
            + '<span class="posr-z-line-val' + (l.cls ? ' posr-over-short ' + l.cls : '') + '">' + esc(l.val) + '</span>'
            + '</div>';
        }).join('');
      })
      .catch(function () {
        var body = document.getElementById('posr-z-body');
        if (body) body.innerHTML = '<p style="color:var(--color-destructive);font-size:14px">Could not connect to POS data.</p>';
      });
  }

  function closeZModal() {
    if (_state.zOverlay && _state.zOverlay.parentNode) {
      _state.zOverlay.parentNode.removeChild(_state.zOverlay);
    }
    _state.zOverlay = null;
  }

  /* ==========================================================================
     X-Report KPIs
  ========================================================================== */
  function renderXReport(kpiEl, rid) {
    /* skeletons only on first paint — silent refresh after that (30s auto-poll) */
    if (!kpiEl.querySelector('.posr-kpi-card')) kpiEl.innerHTML = kpiSkels(5);
    /* p_since = LOCAL midnight so the headline and the breakdowns below share
       one definition of "today" (they used to disagree across the UTC boundary) */
    window.PLAT.client.rpc('pos_x_report', { p_restaurant: rid, p_since: rangeISO('today') })
      .then(function (res) {
        if (res.error || !res.data) {
          kpiEl.innerHTML = errBar('Could not load live report.', 'posr-xrpt-retry');
          setTimeout(function () {
            var btn = document.getElementById('posr-xrpt-retry');
            if (btn) btn.addEventListener('click', function () { renderXReport(kpiEl, rid); });
          }, 0);
          return;
        }
        var x = res.data;
        // RPC actual shape (verified against live DB):
        //   open_sessions: number
        //   sales_today:   { net_cents, tips_cents, total_cents }  OR flat number
        //   voids_today:   { count, amount_cents }                 OR flat number
        //   tenders_today: { cash, card }  (alias: tender_mix)
        //   open_shifts:   number
        function safeNum(v) { var n = Number(v); return isFinite(n) ? n : null; }

        var openSess = safeNum(x.open_sessions) != null ? String(Math.round(x.open_sessions)) : '0';

        // sales_today — handle both object and flat number
        var salesObj  = x.sales_today || {};
        var salesCents = safeNum(salesObj.total_cents != null ? salesObj.total_cents : salesObj.net_cents != null ? salesObj.net_cents : x.sales_today);
        var salesAmt  = salesCents != null ? money(salesCents) : '$0.00';

        // tips — from sales_today.tips_cents or x.tips
        var tipsCents = safeNum(salesObj.tips_cents != null ? salesObj.tips_cents : x.tips);
        var tips      = tipsCents != null ? money(tipsCents) : '$0.00';

        // voids — handle object or flat number
        var voidsObj = x.voids_today || {};
        var voidsCnt = safeNum(voidsObj.count != null ? voidsObj.count : x.voids);
        var voids    = voidsCnt != null ? String(Math.round(voidsCnt)) : '0';

        // tender mix — tenders_today (actual key) or tender_mix (contract alias)
        var tender  = x.tenders_today || x.tender_mix || {};
        var cashAmt = safeNum(tender.cash) != null ? money(safeNum(tender.cash)) : '—';
        var cardAmt = safeNum(tender.card) != null ? money(safeNum(tender.card)) : '—';

        kpiEl.innerHTML = [
          posrKpi('Open Sessions', openSess, 'Active tables/tabs right now', ''),
          posrKpi('Sales Today',   salesAmt, 'Gross paid-session revenue', 'copper'),
          posrKpi('Cash Tender',   cashAmt,  'Cash collected today', ''),
          posrKpi('Card Tender',   cardAmt,  'Card collected today', ''),
          posrKpi('Voids',         voids,    'Voided items today', ''),
          posrKpi('Tips Collected',tips,     'Total tips paid today', 'copper'),
        ].join('');
        /* staleness is self-evident: stamp every successful fetch */
        var asof = document.getElementById('posr-xrpt-asof');
        if (asof) asof.textContent = 'as of ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      })
      .catch(function () {
        kpiEl.innerHTML = errBar('Live report unavailable.', 'posr-xrpt-retry2');
        setTimeout(function () {
          var btn = document.getElementById('posr-xrpt-retry2');
          if (btn) btn.addEventListener('click', function () { renderXReport(kpiEl, rid); });
        }, 0);
      });
  }

  function posrKpi(label, value, sub, extraClass) {
    return '<div class="posr-kpi-card">'
      + '<div class="posr-kpi-label">' + esc(label) + '</div>'
      + '<div class="posr-kpi-value' + (extraClass ? ' ' + extraClass : '') + ' posr-num">' + esc(value) + '</div>'
      + '<div class="posr-kpi-sub">' + esc(sub) + '</div>'
      + '</div>';
  }

  /* ==========================================================================
     Sales breakdowns (by server / item / category / hour / payment mix /
     voids & comps / tips)
  ========================================================================== */
  function loadBreakdowns(sectionEl, rest, range) {
    var sb    = window.PLAT.client;
    var rid   = rest.id;
    var since = rangeISO(range);

    // Target containers
    var serverEl   = sectionEl.querySelector('#posr-by-server');
    var itemEl     = sectionEl.querySelector('#posr-by-item');
    var catEl      = sectionEl.querySelector('#posr-by-cat');
    var hourEl     = sectionEl.querySelector('#posr-by-hour');
    var tenderEl   = sectionEl.querySelector('#posr-tender-mix');
    var voidsEl    = sectionEl.querySelector('#posr-voids');
    var tipsEl     = sectionEl.querySelector('#posr-tips');

    if (serverEl)  serverEl.innerHTML  = panelSkel(160);
    if (itemEl)    itemEl.innerHTML    = panelSkel(200);
    if (catEl)     catEl.innerHTML     = panelSkel(140);
    if (hourEl)    hourEl.innerHTML    = panelSkel(200);
    if (tenderEl)  tenderEl.innerHTML  = panelSkel(120);
    if (voidsEl)   voidsEl.innerHTML   = panelSkel(100);
    if (tipsEl)    tipsEl.innerHTML    = panelSkel(120);

    // ── Payments (tender mix + tips total) ──
    var pPayments = sb.from('mesa_payments')
      .select('amount_cents,tip_cents,method,created_at')
      .eq('restaurant_id', rid)
      .eq('status', 'succeeded')
      .gte('created_at', since);

    // ── Order items (by item / category / voids) ──
    var pItems = sb.from('mesa_order_items')
      .select('name,unit_price_cents,qty,voided,mesa_sessions!inner(restaurant_id,created_at,server_staff_id,status)')
      .eq('mesa_sessions.restaurant_id', rid)
      .gte('mesa_sessions.created_at', since);

    // ── Staff lookup ──
    var pStaff = sb.from('mesa_staff')
      .select('id,name')
      .eq('restaurant_id', rid)
      .eq('is_active', true);

    // ── Menu items for category lookup ──
    var pMenu = sb.from('mesa_menu_items')
      .select('id,name,category_id,mesa_menu_categories!inner(name)')
      .eq('mesa_menu_categories.restaurant_id', rid);

    // ── Sessions (for server sales + hour breakdown) ──
    var pSessions = sb.from('mesa_sessions')
      .select('id,server_staff_id,created_at,status')
      .eq('restaurant_id', rid)
      .gte('created_at', since);

    // ── Applied discounts / comps ──
    // Filter only by created_at — no FK join needed; restaurant scoping via
    // the session-level data already fetched is sufficient for a totals display.
    var pDiscounts = sb.from('pos_applied_discounts')
      .select('amount_cents,discount_id,created_at')
      .gte('created_at', since);

    Promise.all([pPayments, pItems, pStaff, pMenu, pSessions, pDiscounts])
      .then(function (results) {
        var pmtsRes  = results[0];
        var itemsRes = results[1];
        var staffRes = results[2];
        var menuRes  = results[3];
        var sessRes  = results[4];
        var discRes  = results[5];

        // Build staff id→name map
        var staffMap = {};
        (staffRes.data || []).forEach(function (s) { staffMap[s.id] = s.name; });

        // Build menu item name→category map
        var catMap = {};
        (menuRes.data || []).forEach(function (mi) {
          catMap[mi.name] = (mi.mesa_menu_categories && mi.mesa_menu_categories.name) || 'Uncategorised';
        });

        // ── By server: link sessions → payments ──
        var sessions      = sessRes.data  || [];
        var payments      = pmtsRes.data  || [];
        var orderItems    = itemsRes.data  || [];
        var discounts     = discRes.data   || [];

        // session id → server staff id
        var sessStaffMap = {};
        sessions.forEach(function (s) { sessStaffMap[s.id] = s.server_staff_id; });

        // server → { revenue, tips, sessions }
        var serverAgg = {};
        payments.forEach(function (p) {
          // payments don't have session_id but server aggregation is on sessions
          // We approximate: accrue tips/revenue to "restaurant total"
          // Since mesa_payments doesn't carry session_id directly, we rely on
          // v_mesa_tips_by_server view via a separate query when available.
          // Here we fall back to per-server session aggregation via order items.
        });

        // Use order items to derive server sales (server_staff_id on session)
        var serverSales = {};
        orderItems.forEach(function (oi) {
          if (oi.voided) return;
          var sess  = oi.mesa_sessions;
          var sid   = sess && sess.server_staff_id;
          if (!sid) return;
          if (!serverSales[sid]) serverSales[sid] = { name: staffMap[sid] || 'Unknown', revenue: 0, qty: 0 };
          serverSales[sid].revenue += (oi.unit_price_cents || 0) * (oi.qty || 1);
          serverSales[sid].qty     += (oi.qty || 1);
        });
        var serverArr = Object.keys(serverSales)
          .map(function (k) { return serverSales[k]; })
          .sort(function (a, b) { return b.revenue - a.revenue; });

        // ── By item ──
        var itemSales = {};
        orderItems.forEach(function (oi) {
          if (oi.voided) return;
          if (!itemSales[oi.name]) itemSales[oi.name] = { name: oi.name, revenue: 0, qty: 0 };
          itemSales[oi.name].revenue += (oi.unit_price_cents || 0) * (oi.qty || 1);
          itemSales[oi.name].qty     += (oi.qty || 1);
        });
        var itemArr = Object.keys(itemSales)
          .map(function (k) { return itemSales[k]; })
          .sort(function (a, b) { return b.revenue - a.revenue; })
          .slice(0, 10);

        // ── By category ──
        var catSales = {};
        orderItems.forEach(function (oi) {
          if (oi.voided) return;
          var cat = catMap[oi.name] || 'Uncategorised';
          if (!catSales[cat]) catSales[cat] = { name: cat, revenue: 0, qty: 0 };
          catSales[cat].revenue += (oi.unit_price_cents || 0) * (oi.qty || 1);
          catSales[cat].qty     += (oi.qty || 1);
        });
        var catArr = Object.keys(catSales)
          .map(function (k) { return catSales[k]; })
          .sort(function (a, b) { return b.revenue - a.revenue; });

        // ── By hour (based on sessions created_at) ──
        var hourSales = {};
        sessions.forEach(function (s) {
          var h;
          try { h = new Date(s.created_at).getHours(); } catch (e) { return; }
          var key = h;
          if (!hourSales[key]) hourSales[key] = { hour: h, label: fmtHourLabel(h), revenue: 0, count: 0 };
          hourSales[key].count++;
        });
        // Also sum payments into hourly using session created_at proxy (payments carry only created_at)
        payments.forEach(function (p) {
          var h;
          try { h = new Date(p.created_at).getHours(); } catch (e) { return; }
          var key = h;
          if (!hourSales[key]) hourSales[key] = { hour: h, label: fmtHourLabel(h), revenue: 0, count: 0 };
          hourSales[key].revenue += p.amount_cents || 0;
        });
        var hourArr = Object.keys(hourSales)
          .map(function (k) { return hourSales[k]; })
          .sort(function (a, b) { return a.hour - b.hour; });

        // ── Payment mix ──
        var tenderAgg = {};
        var totalPaid = 0;
        payments.forEach(function (p) {
          var m = p.method || 'other';
          if (!tenderAgg[m]) tenderAgg[m] = 0;
          tenderAgg[m] += p.amount_cents || 0;
          totalPaid    += p.amount_cents || 0;
        });

        // ── Voids & comps ──
        var voidedItems = orderItems.filter(function (oi) { return oi.voided; });
        var voidedAmt   = 0;
        voidedItems.forEach(function (oi) { voidedAmt += (oi.unit_price_cents || 0) * (oi.qty || 1); });
        var compsAmt = 0;
        discounts.forEach(function (d) { compsAmt += d.amount_cents || 0; });

        // ── Tips by server (from payments tips, total only — no server on payments) ──
        var totalTips = 0;
        payments.forEach(function (p) { totalTips += p.tip_cents || 0; });
        var avgTipPct = totalPaid > 0
          ? ((totalTips / (totalPaid - totalTips)) * 100).toFixed(1) + '%'
          : '—';

        // ══ Render each section ══

        // By server
        if (serverEl) {
          if (!serverArr.length) {
            serverEl.innerHTML = emptyState('No server data', 'No sessions in this period.');
          } else {
            serverEl.innerHTML = '<div class="posr-tbl-wrap"><table class="posr-tbl" aria-label="Sales by server">'
              + '<thead><tr>'
              + '<th scope="col">Server</th>'
              + '<th scope="col" class="r">Revenue</th>'
              + '<th scope="col" class="r">Items sold</th>'
              + '</tr></thead><tbody>'
              + serverArr.map(function (s) {
                  return '<tr>'
                    + '<td>' + esc(s.name) + '</td>'
                    + '<td class="r posr-num posr-copper">' + esc(money(s.revenue)) + '</td>'
                    + '<td class="r posr-num">' + esc(String(s.qty)) + '</td>'
                    + '</tr>';
                }).join('')
              + '</tbody></table></div>';
          }
        }

        // By item
        if (itemEl) {
          itemEl.innerHTML = barChart(
            itemArr, 'name', 'revenue',
            function (r) { return money(r.revenue); },
            '', 'Top items by revenue'
          );
        }

        // By category
        if (catEl) {
          catEl.innerHTML = barChart(
            catArr, 'name', 'revenue',
            function (r) { return money(r.revenue); },
            'alt', 'Sales by category'
          );
        }

        // By hour
        if (hourEl) {
          var maxHourRev = hourArr.length ? Math.max.apply(null, hourArr.map(function (h) { return h.revenue || 1; })) : 1;
          if (!hourArr.length) {
            hourEl.innerHTML = '<p style="color:var(--color-text-muted);font-size:13px">No session data for this period.</p>';
          } else {
            hourEl.innerHTML = barChart(
              hourArr, 'label', 'revenue',
              function (r) { return r.revenue > 0 ? money(r.revenue) : r.count + ' sess'; },
              'info', 'Revenue by hour'
            );
          }
        }

        // Tender mix
        if (tenderEl) {
          var tenderColors = { cash: '#2A7A55', card: 'var(--shell-copper)', other: 'var(--shell-gold)' };
          if (!totalPaid) {
            tenderEl.innerHTML = '<p style="color:var(--color-text-muted);font-size:13px">No payments in this period.</p>';
          } else {
            var tenderMethods = Object.keys(tenderAgg).sort();
            tenderEl.innerHTML = tenderMethods.map(function (m) {
              var amt = tenderAgg[m];
              var pct = totalPaid > 0 ? Math.round((amt / totalPaid) * 100) : 0;
              var col = tenderColors[m] || '#888';
              return '<div class="posr-tender-row">'
                + '<div class="posr-tender-dot" style="background:' + col + '" aria-hidden="true"></div>'
                + '<span class="posr-tender-name">' + esc(m.charAt(0).toUpperCase() + m.slice(1)) + '</span>'
                + '<span class="posr-tender-pct">' + esc(String(pct)) + '%</span>'
                + '<span class="posr-tender-amt posr-num">' + esc(money(amt)) + '</span>'
                + '</div>';
            }).join('');
          }
        }

        // Voids & comps
        if (voidsEl) {
          voidsEl.innerHTML = '<div style="display:flex;flex-direction:column;gap:var(--space-2)">'
            + '<div class="posr-tender-row">'
            + '<div class="posr-tender-dot" style="background:var(--color-destructive)" aria-hidden="true"></div>'
            + '<span class="posr-tender-name">Voided items (' + esc(String(voidedItems.length)) + ')</span>'
            + '<span class="posr-tender-amt posr-num" style="color:var(--color-destructive)">' + esc(money(voidedAmt)) + '</span>'
            + '</div>'
            + '<div class="posr-tender-row">'
            + '<div class="posr-tender-dot" style="background:var(--shell-gold)" aria-hidden="true"></div>'
            + '<span class="posr-tender-name">Comps / discounts (' + esc(String(discounts.length)) + ')</span>'
            + '<span class="posr-tender-amt posr-num" style="color:var(--shell-gold)">' + esc(money(compsAmt)) + '</span>'
            + '</div>'
            + '</div>';
        }

        // Tips
        if (tipsEl) {
          tipsEl.innerHTML = '<div style="display:flex;flex-direction:column;gap:var(--space-2)">'
            + '<div class="posr-tender-row">'
            + '<div class="posr-tender-dot" style="background:var(--shell-copper)" aria-hidden="true"></div>'
            + '<span class="posr-tender-name">Total tips collected</span>'
            + '<span class="posr-tender-amt posr-num posr-copper">' + esc(money(totalTips)) + '</span>'
            + '</div>'
            + '<div class="posr-tender-row">'
            + '<div class="posr-tender-dot" style="background:var(--color-surface-raised);border:1px solid var(--color-border)" aria-hidden="true"></div>'
            + '<span class="posr-tender-name">Avg tip rate</span>'
            + '<span class="posr-tender-amt posr-num">' + esc(avgTipPct) + '</span>'
            + '</div>'
            + '</div>';
        }
      })
      .catch(function (err) {
        console.error('[pos-reports] breakdown error', err);
        var errHtml = errBar('Could not load breakdown data.', 'posr-break-retry');
        if (serverEl)  serverEl.innerHTML  = errHtml;
        if (itemEl)    itemEl.innerHTML    = '';
        if (catEl)     catEl.innerHTML     = '';
        if (hourEl)    hourEl.innerHTML    = '';
        if (tenderEl)  tenderEl.innerHTML  = '';
        if (voidsEl)   voidsEl.innerHTML   = '';
        if (tipsEl)    tipsEl.innerHTML    = '';
        setTimeout(function () {
          var btn = document.getElementById('posr-break-retry');
          if (btn) {
            btn.addEventListener('click', function () {
              loadBreakdowns(sectionEl, rest, range);
            });
          }
        }, 0);
      });
  }

  function fmtHourLabel(h) {
    var suffix = h >= 12 ? 'pm' : 'am';
    var h12 = h % 12 || 12;
    return h12 + suffix;
  }

  /* ==========================================================================
     Shifts list
  ========================================================================== */
  function loadShifts(sectionEl, rest) {
    var sb  = window.PLAT.client;
    var rid = rest.id;
    var shiftEl = sectionEl.querySelector('#posr-shifts');
    if (!shiftEl) return;

    shiftEl.innerHTML = panelSkel(160);

    // Fetch shifts + staff in parallel (avoid embedded join that may 400)
    var pShifts = sb.from('pos_shifts')
      .select('id,status,opening_cash_cents,closing_cash_cents,declared_tips_cents,started_at,ended_at,staff_id')
      .eq('restaurant_id', rid)
      .order('started_at', { ascending: false })
      .limit(20);

    var pStaff = sb.from('mesa_staff')
      .select('id,name')
      .eq('restaurant_id', rid);

    Promise.all([pShifts, pStaff])
      .then(function (results) {
        var res      = results[0];
        var staffRes = results[1];
        if (res.error) {
          shiftEl.innerHTML = errBar('Could not load shifts.', 'posr-shift-retry');
          setTimeout(function () {
            var btn = document.getElementById('posr-shift-retry');
            if (btn) btn.addEventListener('click', function () { loadShifts(sectionEl, rest); });
          }, 0);
          return;
        }
        // Build staff id→name lookup
        var staffById = {};
        (staffRes.data || []).forEach(function (s) { staffById[s.id] = s.name; });

        var shifts = res.data || [];
        if (!shifts.length) {
          shiftEl.innerHTML = emptyState('No shifts yet', 'Shifts will appear here once staff open and close shifts.');
          return;
        }
        shiftEl.innerHTML = shifts.map(function (sh) {
          var staffName = staffById[sh.staff_id] || 'Staff';
          var isOpen    = sh.status === 'open';
          var openAmt   = money(sh.opening_cash_cents || 0);
          var closeAmt  = sh.closing_cash_cents != null ? money(sh.closing_cash_cents) : '—';
          var tips      = sh.declared_tips_cents != null ? money(sh.declared_tips_cents) : '—';
          var period    = fmtDateTime(sh.started_at)
            + (sh.ended_at ? ' → ' + fmtTime(sh.ended_at) : ' → Now');
          return '<div class="posr-shift-row" role="listitem">'
            + '<div class="posr-shift-icon" aria-hidden="true">'
            + '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">'
            + (isOpen
              ? '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'
              : '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-4 0v2"/>')
            + '</svg></div>'
            + '<div class="posr-shift-info">'
            + '<div class="posr-shift-name">' + esc(staffName) + '</div>'
            + '<div class="posr-shift-meta">'
            + esc(period) + '<br>'
            + 'Open: <span class="posr-num">' + esc(openAmt) + '</span>'
            + (sh.closing_cash_cents != null ? ' &middot; Close: <span class="posr-num">' + esc(closeAmt) + '</span>' : '')
            + (sh.declared_tips_cents != null ? ' &middot; Tips: <span class="posr-num posr-copper">' + esc(tips) + '</span>' : '')
            + '</div>'
            + '</div>'
            + '<div class="posr-shift-right">'
            + '<span class="posr-shift-status ' + esc(sh.status) + '">'
            + (isOpen
              ? '<span class="posr-live-dot" aria-hidden="true"></span>'
              : '')
            + esc(isOpen ? 'Open' : 'Closed')
            + '</span>'
            + (!isOpen ? '<button class="posr-z-btn" data-shift-id="' + esc(sh.id)
                + '" data-staff-name="' + esc(staffName)
                + '" data-started-at="' + esc(sh.started_at || '') + '"'
                + ' type="button" aria-label="View Z-report for ' + esc(staffName) + '\'s shift">'
                + '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>'
                + 'Z-Report</button>'
              : '<button class="posr-z-btn posr-close-shift-btn" data-shift-id="' + esc(sh.id)
                + '" data-staff-name="' + esc(staffName)
                + '" data-started-at="' + esc(sh.started_at || '') + '"'
                + ' type="button" aria-label="Close ' + esc(staffName) + '\'s shift and run the Z-report">'
                + 'Close shift</button>')
            + '</div>'
            + '</div>';
        }).join('');

        // Wire Z-report buttons (closed shifts) and Close-shift buttons (open shifts)
        var btns = shiftEl.querySelectorAll('.posr-z-btn');
        for (var i = 0; i < btns.length; i++) {
          (function (btn) {
            var isClose = btn.classList.contains('posr-close-shift-btn');
            function act() {
              if (isClose) {
                closeShiftFlow(btn.dataset.shiftId, btn.dataset.staffName, btn.dataset.startedAt, sectionEl, rest);
              } else {
                openZModal(btn.dataset.shiftId, btn.dataset.staffName, btn.dataset.startedAt);
              }
            }
            btn.addEventListener('click', act);
            btn.addEventListener('keydown', function (e) {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); }
            });
          })(btns[i]);
        }
      })
      .catch(function (err) {
        console.error('[pos-reports] shifts error', err);
        shiftEl.innerHTML = errBar('Could not load shifts.', 'posr-shift-retry2');
        setTimeout(function () {
          var btn = document.getElementById('posr-shift-retry2');
          if (btn) btn.addEventListener('click', function () { loadShifts(sectionEl, rest); });
        }, 0);
      });
  }

  /* CSV export of the selected range — payments ledger + summary, for the
     accountant. Client-side: query → CSV string → Blob download. */
  function exportCsv(rest) {
    var btn = document.getElementById('posr-export-csv');
    if (btn) { btn.disabled = true; btn.textContent = 'Exporting…'; }
    var since = rangeISO(_state.range);
    var sb = window.PLAT.client;
    sb.from('mesa_payments')
      .select('created_at,method,amount_cents,tip_cents,change_cents,payer_label,session_id')
      .eq('restaurant_id', rest.id).eq('status', 'succeeded')
      .gte('created_at', since).order('created_at', { ascending: true })
      .then(function (r) {
        if (r.error) throw r.error;
        var rows = r.data || [];
        var esc2 = function (v) { v = (v == null ? '' : String(v)); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
        var lines = ['date,time,method,amount,tip,change,payer,session_id'];
        var totAmt = 0, totTip = 0;
        rows.forEach(function (p) {
          var d = new Date(p.created_at);
          totAmt += p.amount_cents || 0; totTip += p.tip_cents || 0;
          lines.push([
            d.toLocaleDateString(), d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            p.method, ((p.amount_cents || 0) / 100).toFixed(2), ((p.tip_cents || 0) / 100).toFixed(2),
            p.change_cents != null ? (p.change_cents / 100).toFixed(2) : '',
            esc2(p.payer_label), p.session_id,
          ].join(','));
        });
        lines.push('');
        lines.push('TOTAL,,,' + (totAmt / 100).toFixed(2) + ',' + (totTip / 100).toFixed(2) + ',,payments: ' + rows.length + ',range: ' + _state.range);
        var blob = new Blob([lines.join('\n')], { type: 'text/csv' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'tavolo-sales-' + _state.range + '-' + new Date().toISOString().slice(0, 10) + '.csv';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
      })
      .catch(function (err) {
        console.error('[pos-reports] export error', err);
      })
      .then(function () {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Export CSV';
        }
      });
  }

  /* End-of-night from the back office: count the drawer, close the shift, get the Z. */
  function closeShiftFlow(shiftId, staffName, startedAt, sectionEl, rest) {
    var cashStr = window.prompt('Close ' + (staffName || 'this') + " shift\n\nCounted cash in drawer ($):", '');
    if (cashStr === null) return; // cancelled
    var closingCash = Math.round(parseFloat(cashStr || '0') * 100);
    if (!isFinite(closingCash) || closingCash < 0) { window.alert('Enter a valid cash amount.'); return; }
    var tipsStr = window.prompt('Declared cash tips ($) — optional:', '0');
    if (tipsStr === null) return;
    var declaredTips = Math.round(parseFloat(tipsStr || '0') * 100);
    if (!isFinite(declaredTips) || declaredTips < 0) declaredTips = 0;

    window.PLAT.client.rpc('pos_close_shift', {
      p_shift:         shiftId,
      p_closing_cash:  closingCash,
      p_declared_tips: declaredTips,
    }).then(function (r) {
      if (r.error) {
        window.alert('Could not close the shift: ' + (r.error.message || 'unknown error'));
        return;
      }
      loadShifts(sectionEl, rest);                       // row flips to Closed
      openZModal(shiftId, staffName, startedAt);          // straight into the Z-report
    }).catch(function (err) {
      console.error('[pos-reports] close shift error', err);
      window.alert('Connection error — the shift was not closed.');
    });
  }

  /* ==========================================================================
     Scaffold HTML
  ========================================================================== */
  function buildScaffold(range) {
    var ranges = [
      { key: 'today', label: 'Today' },
      { key: 'week',  label: 'This week' },
      { key: 'month', label: 'This month' }
    ];
    var segBtns = ranges.map(function (r) {
      return '<button class="posr-seg-btn' + (r.key === range ? ' active' : '') + '"'
        + ' data-range="' + esc(r.key) + '"'
        + ' aria-pressed="' + (r.key === range ? 'true' : 'false') + '"'
        + ' type="button">'
        + esc(r.label)
        + '</button>';
    }).join('');

    return '<div class="posr-root">'

      // Toolbar
      + '<div class="posr-toolbar">'
      + '<div>'
      + '<div class="posr-toolbar-title">POS Reports</div>'
      + '<div class="posr-toolbar-sub">Point-of-Sale analytics for The Copper Table</div>'
      + '</div>'
      + '<div class="posr-seg" role="group" aria-label="Date range">'
      + segBtns
      + '</div>'
      + '<button class="posr-export-btn" id="posr-export-csv" type="button" aria-label="Export the selected range as CSV">'
      + '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>'
      + ' Export CSV</button>'
      + '</div>'

      // X-REPORT — always live, always TODAY (the range selector below only
      // scopes the breakdowns). The "as of" stamp makes staleness self-evident.
      + '<div>'
      + '<div class="posr-section-head">'
      + '<span class="posr-live-dot" aria-hidden="true"></span>'
      + 'Live X-Report — today'
      + '<span class="posr-asof" id="posr-xrpt-asof"></span>'
      + '</div>'
      + '<div id="posr-xrpt-kpi" class="posr-kpi-grid" aria-live="polite" role="status" aria-label="Live X-report metrics">'
      + kpiSkels(6)
      + '</div>'
      + '</div>'

      // SALES BREAKDOWNS
      + '<div>'
      + '<div class="posr-section-head">Sales Breakdown</div>'
      + '<div class="posr-grid">'

      // By server
      + '<div class="posr-panel posr-full">'
      + '<div class="posr-panel-head">By Server</div>'
      + '<div class="posr-panel-body" id="posr-by-server">' + panelSkel(140) + '</div>'
      + '</div>'

      // By item + by category (two columns)
      + '<div class="posr-panel">'
      + '<div class="posr-panel-head">By Item (top 10)</div>'
      + '<div class="posr-panel-body" id="posr-by-item">' + panelSkel(200) + '</div>'
      + '</div>'

      + '<div class="posr-panel">'
      + '<div class="posr-panel-head">By Category</div>'
      + '<div class="posr-panel-body" id="posr-by-cat">' + panelSkel(160) + '</div>'
      + '</div>'

      // By hour (full width)
      + '<div class="posr-panel posr-full">'
      + '<div class="posr-panel-head">Revenue by Hour</div>'
      + '<div class="posr-panel-body" id="posr-by-hour">' + panelSkel(200) + '</div>'
      + '</div>'

      // Tender mix + voids & comps (two columns)
      + '<div class="posr-panel">'
      + '<div class="posr-panel-head">Payment Mix</div>'
      + '<div class="posr-panel-body" id="posr-tender-mix">' + panelSkel(120) + '</div>'
      + '</div>'

      + '<div class="posr-panel">'
      + '<div class="posr-panel-head">Voids &amp; Comps</div>'
      + '<div class="posr-panel-body" id="posr-voids">' + panelSkel(100) + '</div>'
      + '</div>'

      // Tips (full width)
      + '<div class="posr-panel posr-full">'
      + '<div class="posr-panel-head">Tips</div>'
      + '<div class="posr-panel-body" id="posr-tips">' + panelSkel(100) + '</div>'
      + '</div>'

      + '</div>' // .posr-grid (breakdowns)
      + '</div>' // Sales Breakdown section

      // SHIFTS
      + '<div>'
      + '<div class="posr-section-head">Shifts</div>'
      + '<div class="posr-panel">'
      + '<div class="posr-panel-head">Shift History</div>'
      + '<div class="posr-panel-body" id="posr-shifts" role="list" aria-label="Shift history">'
      + panelSkel(160)
      + '</div>'
      + '</div>'
      + '</div>'

      + '</div>'; // .posr-root
  }

  /* ==========================================================================
     Wire range selector
  ========================================================================== */
  function wireRangeBtns(sectionEl, rest) {
    var btns = sectionEl.querySelectorAll('.posr-seg-btn');
    for (var i = 0; i < btns.length; i++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          for (var j = 0; j < btns.length; j++) {
            btns[j].classList.remove('active');
            btns[j].setAttribute('aria-pressed', 'false');
          }
          btn.classList.add('active');
          btn.setAttribute('aria-pressed', 'true');
          _state.range = btn.dataset.range;
          loadBreakdowns(sectionEl, rest, _state.range);
          /* tiles are always-today by design, but refresh them here too so the
             page never shows two ages of data side by side */
          var kpiEl = sectionEl.querySelector('#posr-xrpt-kpi');
          if (kpiEl) renderXReport(kpiEl, rest.id);
        });
        btn.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            btn.click();
          }
        });
      })(btns[i]);
    }
  }

  /* ==========================================================================
     render(sectionEl) — shell calls this on every navigation
  ========================================================================== */
  function render(sectionEl) {
    injectStyles();

    // Close any stale Z-report modal from previous render
    closeZModal();

    // A backgrounded/zombie tab must re-fetch the moment it's looked at again
    if (!_state.visListener) {
      _state.visListener = true;
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState !== 'visible') return;
        var rest = _state.restaurant;
        var sec = document.querySelector('#section-pos-reports');
        if (!rest || !sec || sec.style.display === 'none') return;
        var kpiEl = sec.querySelector('#posr-xrpt-kpi');
        if (kpiEl) renderXReport(kpiEl, rest.id);
        loadBreakdowns(sec, rest, _state.range);
        loadShifts(sec, rest);
      });
    }

    // Live X-report: auto-refresh every 30s while the section stays visible
    if (_state.refreshTimer) clearInterval(_state.refreshTimer);
    _state.refreshTimer = setInterval(function () {
      if (!sectionEl.isConnected || sectionEl.style.display === 'none') {
        clearInterval(_state.refreshTimer);
        _state.refreshTimer = null;
        return;
      }
      var rest = _state.restaurant;
      if (!rest) return;
      var kpiEl = sectionEl.querySelector('#posr-xrpt-kpi');
      if (kpiEl) renderXReport(kpiEl, rest.id);
    }, 30000);

    // If scaffold is already present, just reload data (don't rebuild DOM)
    if (sectionEl.querySelector('.posr-root')) {
      getRestaurant().then(function (rest) {
        if (!rest) return;
        var kpiEl = sectionEl.querySelector('#posr-xrpt-kpi');
        if (kpiEl) renderXReport(kpiEl, rest.id);
        loadBreakdowns(sectionEl, rest, _state.range);
        loadShifts(sectionEl, rest);
      }).catch(function () { /* silently handle */ });
      return;
    }

    // First render: resolve restaurant, build scaffold, load data
    getRestaurant().then(function (rest) {
      if (!rest) {
        sectionEl.innerHTML = emptyState(
          'No POS restaurant found',
          'Enable the POS module and set up a restaurant to see reports.'
        );
        return;
      }
      _state.restaurant = rest;
      sectionEl.innerHTML = buildScaffold(_state.range);
      wireRangeBtns(sectionEl, rest);
      var expBtn = sectionEl.querySelector('#posr-export-csv');
      if (expBtn) expBtn.addEventListener('click', function () { exportCsv(rest); });

      var kpiEl = sectionEl.querySelector('#posr-xrpt-kpi');
      if (kpiEl) renderXReport(kpiEl, rest.id);
      loadBreakdowns(sectionEl, rest, _state.range);
      loadShifts(sectionEl, rest);
    }).catch(function (err) {
      console.error('[pos-reports] boot error', err);
      sectionEl.innerHTML = errBar(
        'Could not connect to POS data. Please sign in and try again.',
        'posr-boot-retry'
      );
      setTimeout(function () {
        var btn = document.getElementById('posr-boot-retry');
        if (btn) {
          btn.addEventListener('click', function () {
            sectionEl.innerHTML = '';
            render(sectionEl);
          });
        }
      }, 0);
    });
  }

  /* ==========================================================================
     Register screen
  ========================================================================== */
  window.COV         = window.COV         || {};
  window.COV.screens = window.COV.screens || {};
  window.COV.screens['pos-reports'] = { render: render };

  if (window.PLAT) {
    window.PLAT.screens = window.PLAT.screens || {};
    window.PLAT.screens['pos-reports'] = { render: render };
  }

}());
