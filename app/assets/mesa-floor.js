/* ============================================================================
   Tavolo — Mesa Floor Board screen module
   Registers: window.COV.screens['qr-pay-floor']
              window.PLAT.screens['qr-pay-floor']
              { render: function(sectionEl) }

   Self-contained — no edits to index.html or any other file.
   CSS namespace: .mesa-* (zero collision with shell classes).
   Realtime: unique channel topics via _chSeq pattern (PLAT.realtime helpers
   do not cover floor-board multi-table subscriptions, so we replicate the
   pattern directly against PLAT.client / PLAT.sb).
   ============================================================================ */
(function () {
  'use strict';

  /* --------------------------------------------------------------------------
     CSS — injected once via <style id="mesa-floor-css">
     All class names prefixed .mesa-* to avoid collision with shell selectors
     (.sidebar, .section, .nav-item, etc.)
  -------------------------------------------------------------------------- */
  var CSS = /* css */ '\n\
/* ===== MESA FLOOR BOARD MODULE ===== */\n\
\n\
/* Layout root */\n\
.mesa-floor-root {\n\
  display: flex;\n\
  flex-direction: column;\n\
  gap: var(--space-4);\n\
  min-width: 0;\n\
}\n\
\n\
/* ---- Filter / toolbar bar ---- */\n\
.mesa-filter-bar {\n\
  display: flex;\n\
  align-items: center;\n\
  gap: var(--space-3);\n\
  flex-wrap: wrap;\n\
}\n\
\n\
.mesa-seg-control {\n\
  display: flex;\n\
  background: var(--color-surface-raised);\n\
  border-radius: var(--radius-full);\n\
  padding: 3px;\n\
  gap: 2px;\n\
  flex-shrink: 0;\n\
}\n\
\n\
.mesa-seg-btn {\n\
  padding: 6px 14px;\n\
  border-radius: var(--radius-full);\n\
  font-size: 13px;\n\
  font-weight: 500;\n\
  color: var(--color-text-secondary);\n\
  background: none;\n\
  border: none;\n\
  cursor: pointer;\n\
  transition: background var(--duration-fast), color var(--duration-fast),\n\
              box-shadow var(--duration-fast);\n\
  white-space: nowrap;\n\
  min-height: 32px;\n\
}\n\
.mesa-seg-btn:hover {\n\
  color: var(--color-text-primary);\n\
}\n\
.mesa-seg-btn.active {\n\
  background: var(--color-surface);\n\
  color: var(--color-text-primary);\n\
  box-shadow: var(--shadow-sm);\n\
}\n\
.mesa-seg-btn:focus-visible {\n\
  outline: 2px solid var(--shell-copper, var(--color-primary));\n\
  outline-offset: 1px;\n\
}\n\
\n\
.mesa-live-dot {\n\
  display: inline-block;\n\
  width: 8px;\n\
  height: 8px;\n\
  border-radius: 50%;\n\
  background: var(--color-success);\n\
  margin-right: 4px;\n\
  animation: mesa-pulse-dot 3s infinite, mesa-pulse-ring 2s infinite;\n\
  flex-shrink: 0;\n\
}\n\
@keyframes mesa-pulse-dot {\n\
  0%, 100% { transform: scale(1); opacity: 1; }\n\
  50%       { transform: scale(1.3); opacity: 0.6; }\n\
}\n\
@keyframes mesa-pulse-ring {\n\
  0%   { box-shadow: 0 0 0 0 rgba(42,122,85,.5); }\n\
  70%  { box-shadow: 0 0 0 6px rgba(42,122,85,0); }\n\
  100% { box-shadow: 0 0 0 0 rgba(42,122,85,0); }\n\
}\n\
@media (prefers-reduced-motion: reduce) {\n\
  .mesa-live-dot { animation: none; }\n\
}\n\
\n\
.mesa-updated-label {\n\
  font-size: 12px;\n\
  color: var(--color-text-muted);\n\
  flex-shrink: 0;\n\
  white-space: nowrap;\n\
}\n\
\n\
/* ---- Floor grid ---- */\n\
.mesa-floor-grid {\n\
  display: grid;\n\
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));\n\
  gap: var(--space-4);\n\
}\n\
\n\
/* ---- Table cards ---- */\n\
.mesa-table-card {\n\
  background: var(--color-surface);\n\
  border-radius: var(--radius-lg);\n\
  padding: var(--space-4);\n\
  border: 2px solid var(--color-border);\n\
  box-shadow: var(--shadow-sm);\n\
  cursor: pointer;\n\
  transition: border-color var(--duration-fast), box-shadow var(--duration-fast),\n\
              transform var(--duration-fast);\n\
  min-width: 0;\n\
  /* ensure text children can shrink */\n\
}\n\
.mesa-table-card:hover {\n\
  box-shadow: var(--shadow-md);\n\
  transform: translateY(-2px);\n\
}\n\
.mesa-table-card:active {\n\
  transform: translateY(0);\n\
}\n\
.mesa-table-card:focus-visible {\n\
  outline: 2px solid var(--shell-copper, var(--color-primary));\n\
  outline-offset: 2px;\n\
}\n\
\n\
/* Status border variants — copper accent for active states */\n\
.mesa-table-card.mesa-border-available  { border-color: var(--color-border); background: var(--color-bg); }\n\
.mesa-table-card.mesa-border-seated     { border-color: var(--color-border); }\n\
.mesa-table-card.mesa-border-scanning   { border-color: #2B6CB0; }\n\
.mesa-table-card.mesa-border-paying     { border-color: var(--color-warning); }\n\
.mesa-table-card.mesa-border-paid       { border-color: var(--color-success); }\n\
.mesa-table-card.mesa-border-idle_alert { border-color: var(--color-destructive); }\n\
\n\
.mesa-card-header {\n\
  display: flex;\n\
  align-items: center;\n\
  justify-content: space-between;\n\
  margin-bottom: var(--space-2);\n\
  gap: var(--space-2);\n\
  min-width: 0;\n\
}\n\
\n\
.mesa-card-name {\n\
  font-size: 18px;\n\
  font-weight: 600;\n\
  color: var(--color-text-primary);\n\
  overflow: hidden;\n\
  text-overflow: ellipsis;\n\
  white-space: nowrap;\n\
  min-width: 0;\n\
}\n\
\n\
.mesa-card-meta {\n\
  font-size: 14px;\n\
  color: var(--color-text-secondary);\n\
  margin-bottom: 4px;\n\
  overflow: hidden;\n\
  text-overflow: ellipsis;\n\
  white-space: nowrap;\n\
  min-width: 0;\n\
}\n\
\n\
.mesa-card-time {\n\
  font-size: 12px;\n\
  color: var(--color-text-muted);\n\
  min-width: 0;\n\
}\n\
\n\
.mesa-card-tip {\n\
  font-size: 13px;\n\
  font-weight: 500;\n\
  color: var(--color-success);\n\
  margin-top: var(--space-2);\n\
}\n\
\n\
/* ---- Status badges ---- */\n\
.mesa-badge {\n\
  display: inline-flex;\n\
  align-items: center;\n\
  gap: 4px;\n\
  padding: 3px 10px;\n\
  border-radius: var(--radius-full);\n\
  font-size: 11px;\n\
  font-weight: 600;\n\
  letter-spacing: 0.06em;\n\
  text-transform: uppercase;\n\
  border: 1px solid;\n\
  white-space: nowrap;\n\
  flex-shrink: 0;\n\
}\n\
.mesa-badge-seated    { background: var(--color-surface-raised); color: var(--color-text-secondary); border-color: var(--color-border); }\n\
.mesa-badge-scanning  { background: #EBF4FF; color: #2B6CB0; border-color: #2B6CB0; }\n\
.mesa-badge-paying    { background: var(--color-warning-light); color: var(--color-warning); border-color: var(--color-warning); }\n\
.mesa-badge-paid      { background: var(--color-success-light); color: var(--color-success); border-color: var(--color-success); }\n\
.mesa-badge-idle      { background: var(--color-destructive-light); color: var(--color-destructive); border-color: var(--color-destructive); }\n\
.mesa-badge-available { background: var(--color-surface-raised); color: var(--color-text-muted); border-color: var(--color-border); }\n\
\n\
/* ---- Skeleton cards ---- */\n\
.mesa-skel-card {\n\
  height: 120px;\n\
  border-radius: var(--radius-lg);\n\
}\n\
\n\
/* ---- Empty state ---- */\n\
.mesa-empty {\n\
  text-align: center;\n\
  padding: var(--space-12) var(--space-5);\n\
  display: flex;\n\
  flex-direction: column;\n\
  align-items: center;\n\
}\n\
.mesa-empty-icon {\n\
  margin: 0 auto var(--space-4);\n\
  opacity: 0.4;\n\
}\n\
.mesa-empty-title {\n\
  font-size: 18px;\n\
  font-weight: 600;\n\
  color: var(--color-text-primary);\n\
  margin-bottom: var(--space-2);\n\
}\n\
.mesa-empty-body {\n\
  font-size: 15px;\n\
  color: var(--color-text-secondary);\n\
  max-width: 360px;\n\
  margin: 0 auto;\n\
}\n\
\n\
/* ---- Error bar ---- */\n\
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
.mesa-retry-btn:focus-visible {\n\
  outline: 2px solid var(--color-destructive);\n\
  outline-offset: 2px;\n\
}\n\
\n\
/* ========== BILL DRAWER ========== */\n\
.mesa-drawer-overlay {\n\
  position: fixed;\n\
  inset: 0;\n\
  background: var(--color-overlay);\n\
  z-index: 400;\n\
  display: none;\n\
}\n\
.mesa-drawer-overlay.open { display: block; }\n\
\n\
.mesa-drawer {\n\
  position: fixed;\n\
  top: 0;\n\
  right: 0;\n\
  width: 420px;\n\
  max-width: 100vw;\n\
  height: 100vh;\n\
  background: var(--color-surface);\n\
  z-index: 401;\n\
  box-shadow: var(--shadow-xl);\n\
  display: flex;\n\
  flex-direction: column;\n\
  overflow-y: auto;\n\
  overflow-x: hidden;\n\
  transform: translateX(100%);\n\
  transition: transform var(--duration-normal) var(--easing-decelerate);\n\
}\n\
.mesa-drawer.open {\n\
  transform: translateX(0);\n\
}\n\
\n\
.mesa-drawer-head {\n\
  padding: var(--space-5);\n\
  border-bottom: 1px solid var(--color-border);\n\
  display: flex;\n\
  align-items: center;\n\
  justify-content: space-between;\n\
  gap: var(--space-3);\n\
  flex-shrink: 0;\n\
  position: sticky;\n\
  top: 0;\n\
  background: var(--color-surface);\n\
  z-index: 10;\n\
}\n\
\n\
.mesa-drawer-title {\n\
  font-size: 18px;\n\
  font-weight: 600;\n\
  color: var(--color-text-primary);\n\
  overflow: hidden;\n\
  text-overflow: ellipsis;\n\
  white-space: nowrap;\n\
  min-width: 0;\n\
  /* copper accent on drawer title */\n\
  border-left: 3px solid var(--shell-copper, var(--color-primary));\n\
  padding-left: var(--space-3);\n\
}\n\
\n\
.mesa-drawer-close {\n\
  width: 36px;\n\
  height: 36px;\n\
  min-width: 36px;\n\
  border-radius: var(--radius-sm);\n\
  background: none;\n\
  border: 1px solid var(--color-border);\n\
  display: flex;\n\
  align-items: center;\n\
  justify-content: center;\n\
  cursor: pointer;\n\
  color: var(--color-text-secondary);\n\
  transition: background var(--duration-fast), color var(--duration-fast);\n\
  flex-shrink: 0;\n\
}\n\
.mesa-drawer-close:hover { background: var(--color-surface-raised); color: var(--color-text-primary); }\n\
.mesa-drawer-close:focus-visible { outline: 2px solid var(--shell-copper, var(--color-primary)); outline-offset: 2px; }\n\
\n\
.mesa-drawer-body {\n\
  flex: 1;\n\
  padding: var(--space-5);\n\
  overflow-y: auto;\n\
  overflow-x: hidden;\n\
}\n\
\n\
.mesa-drawer-foot {\n\
  padding: var(--space-4) var(--space-5);\n\
  border-top: 1px solid var(--color-border);\n\
  display: flex;\n\
  gap: var(--space-3);\n\
  flex-wrap: wrap;\n\
  flex-shrink: 0;\n\
}\n\
\n\
/* Bill lines */\n\
.mesa-bill-items {\n\
  max-height: 300px;\n\
  overflow-y: auto;\n\
  margin-bottom: var(--space-3);\n\
}\n\
.mesa-bill-line {\n\
  display: flex;\n\
  justify-content: space-between;\n\
  align-items: center;\n\
  gap: var(--space-2);\n\
  padding: var(--space-2) 0;\n\
  border-bottom: 1px solid var(--color-border);\n\
  font-size: 14px;\n\
  color: var(--color-text-primary);\n\
}\n\
.mesa-bill-line:last-child { border-bottom: none; }\n\
.mesa-bill-line-name { flex: 1; min-width: 0; }\n\
.mesa-bill-line-price {\n\
  font-variant-numeric: tabular-nums;\n\
  white-space: nowrap;\n\
  flex-shrink: 0;\n\
}\n\
.mesa-void-btn {\n\
  width: 28px;\n\
  height: 28px;\n\
  border-radius: var(--radius-sm);\n\
  background: none;\n\
  border: 1px solid transparent;\n\
  display: flex;\n\
  align-items: center;\n\
  justify-content: center;\n\
  cursor: pointer;\n\
  color: var(--color-destructive);\n\
  transition: background var(--duration-fast), border-color var(--duration-fast);\n\
  flex-shrink: 0;\n\
}\n\
.mesa-void-btn:hover { background: var(--color-destructive-light); border-color: rgba(181,59,47,.3); }\n\
.mesa-void-btn:focus-visible { outline: 2px solid var(--color-destructive); outline-offset: 1px; }\n\
\n\
.mesa-bill-total-row {\n\
  display: flex;\n\
  justify-content: space-between;\n\
  align-items: center;\n\
  padding: var(--space-3) 0;\n\
  font-size: 16px;\n\
  font-weight: 600;\n\
  border-top: 2px solid var(--color-border);\n\
  margin-top: var(--space-2);\n\
  font-variant-numeric: tabular-nums;\n\
}\n\
.mesa-bill-sub-row {\n\
  display: flex;\n\
  justify-content: space-between;\n\
  align-items: center;\n\
  padding: var(--space-1) 0;\n\
  font-size: 14px;\n\
  color: var(--color-text-secondary);\n\
  font-variant-numeric: tabular-nums;\n\
}\n\
.mesa-bill-tip-row {\n\
  color: var(--color-success);\n\
}\n\
.mesa-bill-status {\n\
  font-size: 13px;\n\
  color: var(--color-text-muted);\n\
  margin-top: var(--space-3);\n\
}\n\
\n\
/* Action buttons in drawer */\n\
.mesa-btn {\n\
  min-height: 40px;\n\
  padding: 0 var(--space-4);\n\
  border-radius: var(--radius-md);\n\
  font-size: 14px;\n\
  font-weight: 500;\n\
  cursor: pointer;\n\
  border: none;\n\
  transition: background var(--duration-fast), box-shadow var(--duration-fast), opacity var(--duration-fast);\n\
}\n\
.mesa-btn:focus-visible { outline: 2px solid var(--shell-copper, var(--color-primary)); outline-offset: 2px; }\n\
.mesa-btn:disabled { opacity: 0.55; cursor: not-allowed; }\n\
.mesa-btn-primary {\n\
  background: var(--shell-copper, var(--color-primary));\n\
  color: #fff;\n\
}\n\
.mesa-btn-primary:hover:not(:disabled) { background: var(--color-primary-hover); }\n\
.mesa-btn-secondary {\n\
  background: var(--color-surface-raised);\n\
  color: var(--color-text-primary);\n\
  border: 1px solid var(--color-border);\n\
}\n\
.mesa-btn-secondary:hover:not(:disabled) { background: var(--color-border); }\n\
\n\
/* Skeleton shimmer (re-declared in this namespace to avoid depending on shell) */\n\
.mesa-skeleton {\n\
  background: linear-gradient(\n\
    90deg,\n\
    var(--color-surface-raised) 25%,\n\
    var(--color-border) 50%,\n\
    var(--color-surface-raised) 75%\n\
  );\n\
  background-size: 800px 100%;\n\
  animation: mesa-shimmer 1.4s infinite linear;\n\
  border-radius: var(--radius-md);\n\
}\n\
@keyframes mesa-shimmer {\n\
  0%   { background-position: -400px 0; }\n\
  100% { background-position:  400px 0; }\n\
}\n\
@media (prefers-reduced-motion: reduce) {\n\
  .mesa-skeleton { animation: none; background: var(--color-surface-raised); }\n\
}\n\
\n\
/* ---- Responsive ---- */\n\
@media (max-width: 1023px) {\n\
  /* Drawer becomes bottom sheet */\n\
  .mesa-drawer {\n\
    width: 100%;\n\
    max-width: 100%;\n\
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;\n\
    top: auto;\n\
    bottom: 0;\n\
    height: 92vh;\n\
    transform: translateY(100%);\n\
  }\n\
  .mesa-drawer.open { transform: translateY(0); }\n\
  .mesa-floor-grid { grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); }\n\
}\n\
@media (max-width: 599px) {\n\
  .mesa-floor-grid { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }\n\
  .mesa-filter-bar { overflow-x: auto; -webkit-overflow-scrolling: touch; flex-wrap: nowrap; padding-bottom: var(--space-2); }\n\
  .mesa-seg-control { flex-shrink: 0; }\n\
  .mesa-seg-btn { padding: 5px 10px; font-size: 12px; }\n\
}\n\
@media (max-width: 374px) {\n\
  .mesa-floor-grid { grid-template-columns: 1fr; }\n\
}\n\
';

  /* --------------------------------------------------------------------------
     MODULE-LEVEL STATE
  -------------------------------------------------------------------------- */
  var _styleInjected = false;

  /* Cached restaurant row (mesa_restaurants, fetched once per page load) */
  var _restaurant = null;
  var _restaurantLoading = false;
  var _restaurantCallbacks = [];

  /* Floor data (rows from v_mesa_table_status) */
  var _floorData = [];

  /* Active realtime channels — removed before re-subscribing on re-render */
  var _channels = [];

  /* Active filter */
  var _filter = 'all';

  /* Bill drawer state */
  var _drawer = {
    open:      false,
    sessionId: null,
    tableId:   null,
    label:     null,
  };

  /* --------------------------------------------------------------------------
     INJECT STYLES — once per page
  -------------------------------------------------------------------------- */
  function injectStyles() {
    if (_styleInjected) return;
    _styleInjected = true;
    var style = document.createElement('style');
    style.id = 'mesa-floor-css';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  /* --------------------------------------------------------------------------
     PLATFORM HELPERS — proxy through PLAT / MESA shims
  -------------------------------------------------------------------------- */
  function sb() { return window.PLAT.client || window.PLAT.sb; }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function money(cents, currency) {
    return window.PLAT.utils.money(cents, currency || 'USD');
  }

  function toast(msg, kind) {
    return window.PLAT.utils.toast(msg, kind);
  }

  /* --------------------------------------------------------------------------
     RESTAURANT RESOLVER
     Fetches mesa_restaurants (limit 1 maybeSingle) — same query as
     dashboard.html initApp(). Cached at module level across re-renders.
     Returns a promise that resolves to the restaurant row (or null).
  -------------------------------------------------------------------------- */
  function getRestaurant() {
    if (_restaurant) {
      return Promise.resolve(_restaurant);
    }
    if (_restaurantLoading) {
      /* Queue callers while a fetch is in-flight */
      return new Promise(function (resolve) {
        _restaurantCallbacks.push(resolve);
      });
    }
    _restaurantLoading = true;
    return sb().from('mesa_restaurants')
      .select('*')
      .limit(1)
      .maybeSingle()
      .then(function (res) {
        _restaurantLoading = false;
        var rest = (!res.error && res.data) ? res.data : null;
        if (rest) {
          rest.service_charge_pct = parseFloat(rest.service_charge_pct) || 0;
          if (typeof rest.tip_presets === 'string') {
            try { rest.tip_presets = JSON.parse(rest.tip_presets); } catch (e) { rest.tip_presets = null; }
          }
          _restaurant = rest;
        }
        _restaurantCallbacks.forEach(function (cb) { cb(rest); });
        _restaurantCallbacks = [];
        return rest;
      })
      .catch(function (err) {
        _restaurantLoading = false;
        _restaurantCallbacks.forEach(function (cb) { cb(null); });
        _restaurantCallbacks = [];
        console.error('[mesa-floor] restaurant fetch error', err);
        return null;
      });
  }

  /* --------------------------------------------------------------------------
     UNIQUE CHANNEL TOPIC HELPER
     Replicates PLAT's _chSeq pattern. We maintain our own counter because
     PLAT.realtime does not expose a floor-board subscription variant.
  -------------------------------------------------------------------------- */
  var _chSeq = 0;
  function uniqueTopic(base) {
    return base + '_' + (++_chSeq);
  }

  /* --------------------------------------------------------------------------
     REMOVE ALL ACTIVE CHANNELS
  -------------------------------------------------------------------------- */
  function clearChannels() {
    _channels.forEach(function (ch) {
      try { sb().removeChannel(ch); } catch (e) { /* already removed */ }
    });
    _channels = [];
  }

  /* --------------------------------------------------------------------------
     STATUS HELPERS
  -------------------------------------------------------------------------- */
  function resolveStatus(row) {
    var mins   = Math.round(row.minutes_open || 0);
    var status = row.session_status || 'available';
    if (status === 'seated' && mins > 60) status = 'idle_alert';
    return status;
  }

  function badgeHtml(status) {
    var labels = {
      seated:     'Seated',
      scanning:   'Scanning',
      paying:     'Paying',
      paid:       'Paid',
      idle_alert: 'Idle alert',
      available:  'Available',
    };
    var cls = {
      seated:     'mesa-badge mesa-badge-seated',
      scanning:   'mesa-badge mesa-badge-scanning',
      paying:     'mesa-badge mesa-badge-paying',
      paid:       'mesa-badge mesa-badge-paid',
      idle_alert: 'mesa-badge mesa-badge-idle',
      available:  'mesa-badge mesa-badge-available',
    };
    var icons = {
      seated:    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
      scanning:  '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
      paying:    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
      paid:      '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
      idle_alert:'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
      available: '',
    };
    var icon = icons[status] || '';
    var label = labels[status] || status;
    return '<span class="' + (cls[status] || 'mesa-badge mesa-badge-available') + '">' +
           (icon ? icon + ' ' : '') + esc(label) + '</span>';
  }

  /* --------------------------------------------------------------------------
     SKELETON CARDS
  -------------------------------------------------------------------------- */
  function skeletonCards(n) {
    var html = '';
    for (var i = 0; i < n; i++) {
      html += '<div class="mesa-skel-card mesa-skeleton" aria-hidden="true"></div>';
    }
    return html;
  }

  /* --------------------------------------------------------------------------
     RENDER FLOOR GRID
     sectionEl — the parent <section> element owned by the shell
  -------------------------------------------------------------------------- */
  function renderGrid(sectionEl) {
    var gridEl   = sectionEl.querySelector('.mesa-floor-grid');
    var emptyEl  = sectionEl.querySelector('.mesa-floor-empty');
    if (!gridEl) return;

    var cur      = _filter;
    var filtered = _floorData.filter(function (r) {
      if (cur === 'all') return true;
      var s = resolveStatus(r);
      if (cur === 'idle_alert') return s === 'idle_alert';
      return (r.session_status || 'available') === cur || s === cur;
    });

    if (filtered.length === 0) {
      gridEl.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'flex';
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';

    var rest = _restaurant;
    var cur2 = rest ? rest.currency : 'USD';

    gridEl.innerHTML = filtered.map(function (r) {
      var status = resolveStatus(r);
      var mins   = Math.round(r.minutes_open || 0);
      var timeStr = '';
      if (r.session_id) {
        if (status === 'paid') {
          timeStr = 'Paid ' + mins + ' min ago';
        } else if (status === 'idle_alert') {
          timeStr = '<span style="color:var(--color-destructive)">Seated ' + mins + '+ min · No scan yet</span>';
        } else {
          timeStr = 'Seated ' + mins + ' min ago';
        }
      }

      var meta = '';
      if (r.party_size) meta = r.party_size + ' covers';
      if (r.server_name) meta += (meta ? '  ·  ' : '') + r.server_name;

      var tipHtml = '';
      if (r.tips_collected_cents && r.tips_collected_cents > 0) {
        tipHtml = '<p class="mesa-card-tip">Tip: ' + money(r.tips_collected_cents, cur2) + '</p>';
      }

      return '<div class="mesa-table-card mesa-border-' + esc(status) + '"' +
             ' tabindex="0" role="button"' +
             ' aria-label="' + esc(r.label || r.table_code) + ', ' + esc(status) + '"' +
             ' data-sid="'   + esc(r.session_id || '') + '"' +
             ' data-tid="'   + esc(r.table_id   || '') + '"' +
             ' data-label="' + esc(r.label || r.table_code) + '">' +
             '<div class="mesa-card-header">' +
               '<span class="mesa-card-name">' + esc(r.label || r.table_code) + '</span>' +
               badgeHtml(status) +
             '</div>' +
             (meta    ? '<p class="mesa-card-meta">' + esc(meta)    + '</p>' : '') +
             (timeStr ? '<p class="mesa-card-time">' + timeStr       + '</p>' : '') +
             tipHtml +
             '</div>';
    }).join('');

    /* Wire card interactions */
    var cards = gridEl.querySelectorAll('.mesa-table-card');
    for (var i = 0; i < cards.length; i++) {
      (function (card) {
        function handleActivate() {
          var sid   = card.dataset.sid;
          var tid   = card.dataset.tid;
          var label = card.dataset.label;
          if (sid) {
            openDrawer(sectionEl, sid, label, tid);
          } else {
            /* Available table — offer to open a session */
            if (window.confirm('Table "' + label + '" is available. Open a new session?')) {
              openNewSession(sectionEl, tid, label);
            }
          }
        }
        card.addEventListener('click', handleActivate);
        card.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleActivate();
          }
        });
      }(cards[i]));
    }
  }

  /* --------------------------------------------------------------------------
     OPEN A NEW SESSION for an available table
  -------------------------------------------------------------------------- */
  function openNewSession(sectionEl, tableId, label) {
    var rest = _restaurant;
    if (!rest) return;
    window.PLAT.data.mesa.startTableOrder(rest.id, tableId)
      .then(function (result) {
        if (result.error) {
          toast('Error opening session: ' + 'could not create session', 'err');
          return;
        }
        toast('Session opened', 'ok');
        return reloadFloor(sectionEl).then(function () {
          if (result.session_id) {
            openDrawer(sectionEl, result.session_id, label, tableId);
          }
        });
      })
      .catch(function (e) {
        toast('Error opening session', 'err');
        console.error('[mesa-floor] openNewSession error', e);
      });
  }

  /* --------------------------------------------------------------------------
     LOAD FLOOR DATA
     Queries v_mesa_table_status (same view as dashboard.html).
  -------------------------------------------------------------------------- */
  function loadFloor(sectionEl) {
    var rest = _restaurant;
    if (!rest) return Promise.resolve();

    var gridEl = sectionEl.querySelector('.mesa-floor-grid');
    if (gridEl) gridEl.innerHTML = skeletonCards(8);
    var emptyEl = sectionEl.querySelector('.mesa-floor-empty');
    if (emptyEl) emptyEl.style.display = 'none';

    return sb()
      .from('v_mesa_table_status')
      .select('*')
      .eq('restaurant_id', rest.id)
      .order('label')
      .then(function (res) {
        if (res.error) {
          toast('Failed to load floor data', 'err');
          if (gridEl) gridEl.innerHTML = buildErrorHtml('Could not load floor data.', function () { loadFloor(sectionEl); });
          console.error('[mesa-floor] loadFloor error', res.error);
          return;
        }
        _floorData = res.data || [];
        renderGrid(sectionEl);
        updateTimestamp(sectionEl);
      });
  }

  function reloadFloor(sectionEl) {
    var rest = _restaurant;
    if (!rest) return Promise.resolve();
    return sb()
      .from('v_mesa_table_status')
      .select('*')
      .eq('restaurant_id', rest.id)
      .order('label')
      .then(function (res) {
        if (!res.error) {
          _floorData = res.data || [];
          renderGrid(sectionEl);
          updateTimestamp(sectionEl);
        }
      });
  }

  /* --------------------------------------------------------------------------
     REALTIME SUBSCRIPTIONS
     Three tables mirroring dashboard.html: mesa_sessions, mesa_payments,
     mesa_order_items. Each subscription uses a unique topic via _chSeq.
  -------------------------------------------------------------------------- */
  function subscribeFloor(sectionEl) {
    var rest = _restaurant;
    if (!rest) return;
    clearChannels();

    function reload() {
      reloadFloor(sectionEl).then(function () {
        /* If the bill drawer is open, refresh it too */
        if (_drawer.open && _drawer.sessionId) {
          renderDrawerBody(sectionEl);
        }
      });
    }

    var c1 = sb()
      .channel(uniqueTopic('mesa_fl_sess_' + rest.id))
      .on('postgres_changes', {
        event:  '*',
        schema: 'public',
        table:  'mesa_sessions',
        filter: 'restaurant_id=eq.' + rest.id,
      }, reload)
      .subscribe();

    var c2 = sb()
      .channel(uniqueTopic('mesa_fl_pay_' + rest.id))
      .on('postgres_changes', {
        event:  '*',
        schema: 'public',
        table:  'mesa_payments',
        filter: 'restaurant_id=eq.' + rest.id,
      }, reload)
      .subscribe();

    var c3 = sb()
      .channel(uniqueTopic('mesa_fl_items_' + rest.id))
      .on('postgres_changes', {
        event:  '*',
        schema: 'public',
        table:  'mesa_order_items',
        filter: 'restaurant_id=eq.' + rest.id,
      }, reload)
      .subscribe();

    _channels.push(c1, c2, c3);
  }

  /* --------------------------------------------------------------------------
     TIMESTAMP HELPER
  -------------------------------------------------------------------------- */
  function updateTimestamp(sectionEl) {
    var el = sectionEl.querySelector('.mesa-updated-label');
    if (el) el.textContent = 'Updated just now';
  }

  /* --------------------------------------------------------------------------
     ERROR HTML
  -------------------------------------------------------------------------- */
  function buildErrorHtml(msg, retryFn) {
    var id = 'mesa-retry-' + Date.now();
    setTimeout(function () {
      var btn = document.getElementById(id);
      if (btn) btn.addEventListener('click', retryFn);
    }, 0);
    return '<div class="mesa-error-bar" role="alert">' +
           '<span>' + esc(msg) + '</span>' +
           '<button class="mesa-retry-btn" id="' + id + '" type="button">Retry</button>' +
           '</div>';
  }

  /* --------------------------------------------------------------------------
     BILL DRAWER — OPEN
  -------------------------------------------------------------------------- */
  function openDrawer(sectionEl, sessionId, label, tableId) {
    _drawer.open      = true;
    _drawer.sessionId = sessionId;
    _drawer.label     = label  || 'Table';
    _drawer.tableId   = tableId || null;

    var overlay  = sectionEl.querySelector('.mesa-drawer-overlay');
    var drawer   = sectionEl.querySelector('.mesa-drawer');
    var titleEl  = sectionEl.querySelector('.mesa-drawer-title');
    var bodyEl   = sectionEl.querySelector('.mesa-drawer-body');

    if (!overlay || !drawer) return;

    titleEl.textContent = label || 'Table bill';
    bodyEl.innerHTML = '<div class="mesa-skeleton" style="height:200px" aria-hidden="true"></div>';

    overlay.classList.add('open');
    drawer.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');

    /* Focus the close button */
    var closeBtn = drawer.querySelector('.mesa-drawer-close');
    if (closeBtn) setTimeout(function () { closeBtn.focus(); }, 50);

    renderDrawerBody(sectionEl);
  }

  /* --------------------------------------------------------------------------
     BILL DRAWER — CLOSE
  -------------------------------------------------------------------------- */
  function closeDrawer(sectionEl) {
    _drawer.open      = false;
    _drawer.sessionId = null;
    _drawer.label     = null;
    _drawer.tableId   = null;

    var overlay = sectionEl.querySelector('.mesa-drawer-overlay');
    var drawer  = sectionEl.querySelector('.mesa-drawer');
    if (overlay) { overlay.classList.remove('open'); overlay.setAttribute('aria-hidden', 'true'); }
    if (drawer)  drawer.classList.remove('open');
  }

  /* --------------------------------------------------------------------------
     BILL DRAWER — RENDER BODY
     Fetches:  v_mesa_session_bill (totals + server)
               mesa_order_items (line items)
               mesa_sessions (status)
     Direct PLAT.client queries — these views/tables are not exposed through
     PLAT.data.mesa helpers.
  -------------------------------------------------------------------------- */
  function renderDrawerBody(sectionEl) {
    var sessionId = _drawer.sessionId;
    var bodyEl    = sectionEl.querySelector('.mesa-drawer-body');
    if (!sessionId || !bodyEl) return;

    var rest = _restaurant;
    var cur  = rest ? rest.currency : 'USD';

    Promise.all([
      sb().from('v_mesa_session_bill').select('*').eq('session_id', sessionId).maybeSingle(),
      sb().from('mesa_order_items').select('id,name,unit_price_cents,qty,claimed_by').eq('session_id', sessionId),
      sb().from('mesa_sessions').select('id,status,order_id').eq('id', sessionId).maybeSingle(),
    ]).then(function (results) {
      var billRes  = results[0];
      var itemsRes = results[1];
      var sessRes  = results[2];

      var bill     = (!billRes.error)  ? billRes.data  : null;
      var itemsArr = (!itemsRes.error) ? (itemsRes.data || []) : [];
      var sess     = (!sessRes.error)  ? sessRes.data  : null;

      if (!bill && !sess) {
        bodyEl.innerHTML = '<p style="color:var(--color-text-secondary);padding:var(--space-4)">No session data available.</p>';
        return;
      }

      var status  = (sess && sess.status) || (bill && bill.status) || 'open';
      var orderId = sess && sess.order_id;

      /* Line items HTML */
      var itemsHtml = itemsArr.map(function (it) {
        var claimedNote = it.claimed_by
          ? ' <small style="color:var(--color-text-muted)">(' + esc(it.claimed_by) + ')</small>'
          : '';
        return '<div class="mesa-bill-line">' +
               '<span class="mesa-bill-line-name">' + esc(it.name) + claimedNote + '</span>' +
               '<span class="mesa-bill-line-price">' +
                 '<span style="font-size:13px;color:var(--color-text-muted);margin-right:4px">&times;' + esc(String(it.qty || 1)) + '</span>' +
                 money(it.unit_price_cents * (it.qty || 1), cur) +
               '</span>' +
               '<button class="mesa-void-btn" data-oid="' + esc(it.id) + '" data-name="' + esc(it.name) + '"' +
               ' aria-label="Void ' + esc(it.name) + '" type="button">' +
               '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>' +
               '</button>' +
               '</div>';
      }).join('');

      /* Summary HTML */
      var summaryHtml = '';
      if (bill) {
        summaryHtml =
          '<div class="mesa-bill-total-row"><span>Subtotal</span><span>' + money(bill.subtotal_cents, cur) + '</span></div>' +
          (bill.service_charge_cents > 0
            ? '<div class="mesa-bill-sub-row"><span>Service charge</span><span>' + money(bill.service_charge_cents, cur) + '</span></div>'
            : '') +
          (bill.tips_collected_cents > 0
            ? '<div class="mesa-bill-sub-row mesa-bill-tip-row"><span>Tips</span><span>' + money(bill.tips_collected_cents, cur) + '</span></div>'
            : '') +
          '<div class="mesa-bill-total-row" style="font-size:18px"><span>Total paid</span><span>' + money(bill.paid_cents, cur) + '</span></div>';
      }

      /* Status / server line */
      var infoLine = '<p class="mesa-bill-status">Status: <strong>' + esc(status) + '</strong>' +
                     (bill && bill.server_name ? ' &middot; Server: ' + esc(bill.server_name) : '') +
                     '</p>';

      /* Action buttons based on status */
      var footerBtns = '';
      if (status === 'open' || status === 'seated' || status === 'scanning') {
        footerBtns +=
          '<button class="mesa-btn mesa-btn-primary mesa-action-btn" data-action="paid" type="button">Mark paid</button>' +
          '<button class="mesa-btn mesa-btn-secondary mesa-action-btn" data-action="closed" type="button">Close session</button>';
      } else if (status === 'paying') {
        footerBtns +=
          '<button class="mesa-btn mesa-btn-primary mesa-action-btn" data-action="paid" type="button">Mark paid</button>';
      } else if (status === 'paid' || status === 'closed') {
        footerBtns +=
          '<button class="mesa-btn mesa-btn-secondary mesa-action-btn" data-action="open" type="button">Reopen session</button>';
      }

      bodyEl.innerHTML =
        (itemsArr.length
          ? '<div class="mesa-bill-items">' + itemsHtml + '</div>'
          : '<p style="padding:var(--space-3);color:var(--color-text-muted);font-size:14px">No items yet.</p>') +
        summaryHtml +
        infoLine +
        '<div class="mesa-drawer-foot" style="position:static;border:none;padding:var(--space-4) 0 0">' +
          footerBtns +
        '</div>';

      /* Wire void buttons */
      bodyEl.querySelectorAll('.mesa-void-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (!window.confirm('Void "' + btn.dataset.name + '"?')) return;
          sb().from('mesa_order_items').delete().eq('id', btn.dataset.oid)
            .then(function (res) {
              if (res.error) { toast('Error voiding item', 'err'); return; }
              toast('Item voided', 'ok');
              renderDrawerBody(sectionEl);
            });
        });
      });

      /* Wire session action buttons */
      bodyEl.querySelectorAll('.mesa-action-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          btn.disabled = true;
          sb().from('mesa_sessions').update({ status: btn.dataset.action }).eq('id', sessionId)
            .then(function (res) {
              btn.disabled = false;
              if (res.error) { toast('Error updating session', 'err'); return; }
              toast('Session ' + btn.dataset.action, 'ok');
              renderDrawerBody(sectionEl);
              reloadFloor(sectionEl);
            })
            .catch(function () { btn.disabled = false; });
        });
      });

    }).catch(function (e) {
      bodyEl.innerHTML = '<p style="color:var(--color-text-secondary);padding:var(--space-4)">Failed to load bill data.</p>';
      console.error('[mesa-floor] renderDrawerBody error', e);
    });
  }

  /* --------------------------------------------------------------------------
     BUILD SCAFFOLD HTML
     Creates the permanent DOM inside sectionEl. Drawer is scoped to sectionEl
     so it does not collide with any shell-level overlays.
  -------------------------------------------------------------------------- */
  function buildScaffold() {
    return [
      '<div class="mesa-floor-root">',

        /* Filter bar */
        '<div class="mesa-filter-bar" role="toolbar" aria-label="Filter tables by status">',
          '<div class="mesa-seg-control" role="group" aria-label="Status filter">',
            '<button class="mesa-seg-btn active" data-filter="all"        type="button">All</button>',
            '<button class="mesa-seg-btn"        data-filter="seated"     type="button">Seated</button>',
            '<button class="mesa-seg-btn"        data-filter="scanning"   type="button">Scanning</button>',
            '<button class="mesa-seg-btn"        data-filter="paying"     type="button">Paying</button>',
            '<button class="mesa-seg-btn"        data-filter="paid"       type="button">Paid</button>',
            '<button class="mesa-seg-btn"        data-filter="idle_alert" type="button">Idle alert</button>',
          '</div>',
          '<span style="display:flex;align-items:center;font-size:13px;font-weight:500;color:var(--color-success);flex-shrink:0">',
            '<span class="mesa-live-dot" aria-hidden="true"></span>Live',
          '</span>',
          '<span class="mesa-updated-label" aria-live="polite" aria-atomic="true">Loading&hellip;</span>',
        '</div>',

        /* Grid */
        '<div class="mesa-floor-grid" role="list" aria-label="Table status board" aria-live="polite" aria-relevant="additions removals">',
          /* populated by renderGrid() */
        '</div>',

        /* Empty state */
        '<div class="mesa-floor-empty mesa-empty" style="display:none" role="status">',
          '<div class="mesa-empty-icon" aria-hidden="true">',
            '<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">',
              '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>',
              '<rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
            '</svg>',
          '</div>',
          '<p class="mesa-empty-title">No active tables</p>',
          '<p class="mesa-empty-body">Tables appear here when diners scan in.</p>',
        '</div>',

      '</div>',

      /* Bill drawer — scoped to sectionEl, not body-level */
      '<div class="mesa-drawer-overlay" aria-hidden="true" role="presentation"></div>',
      '<aside class="mesa-drawer" role="dialog" aria-modal="true" aria-labelledby="mesa-drawer-title-id">',
        '<div class="mesa-drawer-head">',
          '<h2 class="mesa-drawer-title" id="mesa-drawer-title-id">Table bill</h2>',
          '<button class="mesa-drawer-close" type="button" aria-label="Close bill">',
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">',
              '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
            '</svg>',
          '</button>',
        '</div>',
        '<div class="mesa-drawer-body" aria-live="polite">',
          /* populated by renderDrawerBody() */
        '</div>',
      '</aside>',
    ].join('');
  }

  /* --------------------------------------------------------------------------
     WIRE SCAFFOLD — filter buttons, drawer close, keyboard trap
  -------------------------------------------------------------------------- */
  function wireScaffold(sectionEl) {
    /* Filter seg buttons */
    var segBtns = sectionEl.querySelectorAll('.mesa-seg-btn');
    for (var i = 0; i < segBtns.length; i++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          for (var j = 0; j < segBtns.length; j++) segBtns[j].classList.remove('active');
          btn.classList.add('active');
          _filter = btn.dataset.filter;
          renderGrid(sectionEl);
        });
      }(segBtns[i]));
    }

    /* Drawer close button */
    var closeBtn = sectionEl.querySelector('.mesa-drawer-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function () { closeDrawer(sectionEl); });
    }

    /* Overlay click to close */
    var overlay = sectionEl.querySelector('.mesa-drawer-overlay');
    if (overlay) {
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closeDrawer(sectionEl);
      });
    }

    /* Escape key */
    sectionEl.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && _drawer.open) {
        closeDrawer(sectionEl);
      }
    });
  }

  /* --------------------------------------------------------------------------
     RENDER — entry point called by the shell router
  -------------------------------------------------------------------------- */
  function render(sectionEl) {
    injectStyles();

    /* On every re-render: tear down existing channels first */
    clearChannels();

    /* Build scaffold once; on re-render just reload data */
    if (!sectionEl.querySelector('.mesa-floor-root')) {
      sectionEl.innerHTML = buildScaffold();
      wireScaffold(sectionEl);
    }

    /* Reset filter to 'all' on re-render (mirror dashboard.html behaviour) */
    _filter = 'all';
    var segBtns = sectionEl.querySelectorAll('.mesa-seg-btn');
    for (var i = 0; i < segBtns.length; i++) {
      segBtns[i].classList.toggle('active', segBtns[i].dataset.filter === 'all');
    }

    /* Show loading state while resolving restaurant */
    var gridEl = sectionEl.querySelector('.mesa-floor-grid');
    if (gridEl) gridEl.innerHTML = skeletonCards(8);

    /* Resolve restaurant, then load floor + subscribe */
    getRestaurant().then(function (rest) {
      if (!rest) {
        if (gridEl) gridEl.innerHTML = buildErrorHtml('No restaurant found. Please sign in to Mesa first.', function () { render(sectionEl); });
        return;
      }
      loadFloor(sectionEl).then(function () {
        subscribeFloor(sectionEl);
      });
    });
  }

  /* --------------------------------------------------------------------------
     REGISTER MODULE
     Registered on both window.COV.screens and window.PLAT.screens as required.
     Guards ensure neither namespace clobbers the other if one is absent.
  -------------------------------------------------------------------------- */
  window.COV        = window.COV        || {};
  window.COV.screens = window.COV.screens || {};
  window.COV.screens['qr-pay-floor'] = { render: render };

  /* PLAT.screens is window.COV.screens by platform.js contract
     (PLAT.screens = {}; COV delegates .screens back to PLAT.screens = {})
     but we assign both to be explicit and forward-safe. */
  if (window.PLAT) {
    window.PLAT.screens = window.PLAT.screens || {};
    window.PLAT.screens['qr-pay-floor'] = { render: render };
  }

}());
