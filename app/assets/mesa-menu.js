/* ============================================================================
   Tavolo — Mesa Menu Management screen module
   Registers: window.COV.screens['qr-menu'] = PLAT.screens['qr-menu']
              = { render(sectionEl) }
   Tables:    mesa_menu_categories, mesa_menu_items
   Storage:   mesa-media bucket (path: menu/<rid>/<ts>-<name>)
   ============================================================================ */
(function () {
  'use strict';

  /* ==========================================================================
     CSS — injected once, all classes namespaced .mesa-*
  ========================================================================== */
  var CSS = '\
/* ====== MESA-MENU LAYOUT ====== */\
.mesa-menu-root {\
  display: flex;\
  flex-direction: column;\
  gap: var(--space-5);\
  min-width: 0;\
}\
.mesa-menu-header {\
  display: flex;\
  align-items: center;\
  justify-content: space-between;\
  flex-wrap: wrap;\
  gap: var(--space-3);\
}\
.mesa-menu-title {\
  font-size: 22px;\
  font-weight: 600;\
  letter-spacing: -0.01em;\
  color: var(--color-text-primary);\
}\
\
/* ====== TWO-PANEL LAYOUT ====== */\
.mesa-menu-layout {\
  display: flex;\
  gap: var(--space-4);\
  min-height: 400px;\
  align-items: flex-start;\
  min-width: 0;\
}\
\
/* ====== CATEGORY PANEL ====== */\
.mesa-cat-panel {\
  width: 240px;\
  min-width: 200px;\
  flex-shrink: 0;\
  background: var(--color-surface);\
  border: 1px solid var(--color-border);\
  border-radius: var(--radius-lg);\
  overflow: hidden;\
}\
.mesa-cat-panel-head {\
  padding: var(--space-4);\
  border-bottom: 1px solid var(--color-border);\
  font-size: 15px;\
  font-weight: 600;\
  color: var(--color-text-primary);\
}\
.mesa-cat-list {\
  padding: var(--space-2);\
}\
.mesa-cat-item {\
  display: flex;\
  align-items: center;\
  justify-content: space-between;\
  min-height: 48px;\
  padding: 0 var(--space-3);\
  border-radius: var(--radius-md);\
  cursor: pointer;\
  font-size: 15px;\
  color: var(--color-text-primary);\
  transition: background var(--duration-fast);\
  border: none;\
  background: none;\
  width: 100%;\
  text-align: left;\
  gap: var(--space-2);\
}\
.mesa-cat-item:hover { background: var(--color-surface-raised); }\
.mesa-cat-item.active {\
  background: var(--color-primary-light);\
  color: var(--color-primary);\
  border-left: 3px solid var(--color-primary);\
  padding-left: calc(var(--space-3) - 3px);\
}\
.mesa-cat-item:focus-visible {\
  outline: 2px solid var(--color-primary);\
  outline-offset: -2px;\
}\
.mesa-cat-name {\
  flex: 1;\
  overflow: hidden;\
  text-overflow: ellipsis;\
  white-space: nowrap;\
  min-width: 0;\
}\
.mesa-cat-meta {\
  display: flex;\
  align-items: center;\
  gap: var(--space-2);\
  flex-shrink: 0;\
}\
.mesa-cat-count {\
  font-size: 12px;\
  color: var(--color-text-muted);\
}\
.mesa-cat-edit-btn {\
  width: 28px;\
  height: 28px;\
  border-radius: var(--radius-sm);\
  background: none;\
  border: 1px solid transparent;\
  display: flex;\
  align-items: center;\
  justify-content: center;\
  cursor: pointer;\
  color: var(--color-text-secondary);\
  transition: background var(--duration-fast), color var(--duration-fast);\
  flex-shrink: 0;\
  padding: 0;\
}\
.mesa-cat-edit-btn:hover {\
  background: var(--color-surface-raised);\
  color: var(--color-text-primary);\
  border-color: var(--color-border);\
}\
.mesa-cat-edit-btn:focus-visible {\
  outline: 2px solid var(--color-primary);\
  outline-offset: 2px;\
}\
.mesa-add-cat-wrap {\
  padding: var(--space-3);\
  border-top: 1px solid var(--color-border);\
}\
\
/* ====== ITEMS PANEL ====== */\
.mesa-items-panel {\
  flex: 1;\
  min-width: 0;\
  /* prevent flex child from blowing past container width */\
  overflow: hidden;\
  background: var(--color-surface);\
  border: 1px solid var(--color-border);\
  border-radius: var(--radius-lg);\
}\
.mesa-items-panel-head {\
  padding: var(--space-4);\
  border-bottom: 1px solid var(--color-border);\
  display: flex;\
  align-items: center;\
  justify-content: space-between;\
  gap: var(--space-3);\
  flex-wrap: wrap;\
}\
.mesa-items-panel-title {\
  font-size: 17px;\
  font-weight: 600;\
  color: var(--color-text-primary);\
  overflow: hidden;\
  text-overflow: ellipsis;\
  white-space: nowrap;\
  min-width: 0;\
}\
.mesa-items-body {\
  overflow-x: auto;\
  -webkit-overflow-scrolling: touch;\
}\
\
/* ====== DATA TABLE ====== */\
.mesa-table {\
  width: 100%;\
  border-collapse: collapse;\
  min-width: 460px;\
  table-layout: fixed;\
}\
.mesa-table th {\
  font-size: 11px;\
  font-weight: 600;\
  letter-spacing: 0.08em;\
  text-transform: uppercase;\
  color: var(--color-text-muted);\
  padding: var(--space-3) var(--space-4);\
  text-align: left;\
  border-bottom: 1px solid var(--color-border);\
}\
.mesa-table td {\
  padding: var(--space-3) var(--space-4);\
  border-bottom: 1px solid var(--color-border);\
  font-size: 14px;\
  color: var(--color-text-primary);\
  vertical-align: middle;\
}\
.mesa-table tr:last-child td { border-bottom: none; }\
.mesa-table tbody tr:hover td { background: var(--color-surface-raised); }\
.mesa-item-thumb {\
  width: 52px;\
  height: 52px;\
  border-radius: var(--radius-sm);\
  object-fit: cover;\
  border: 1px solid var(--color-border);\
  display: block;\
}\
.mesa-item-thumb-placeholder {\
  width: 52px;\
  height: 52px;\
  border-radius: var(--radius-sm);\
  background: var(--color-surface-raised);\
  border: 1px solid var(--color-border);\
  display: flex;\
  align-items: center;\
  justify-content: center;\
  color: var(--color-text-muted);\
  flex-shrink: 0;\
}\
.mesa-item-name {\
  font-size: 15px;\
  font-weight: 500;\
  color: var(--color-text-primary);\
  overflow: hidden;\
  text-overflow: ellipsis;\
  white-space: nowrap;\
}\
.mesa-item-desc {\
  font-size: 12px;\
  color: var(--color-text-muted);\
  overflow: hidden;\
  display: -webkit-box;\
  -webkit-line-clamp: 2;\
  -webkit-box-orient: vertical;\
  margin-top: 2px;\
}\
.mesa-item-name-cell {\
  min-width: 0;\
  max-width: 260px;\
}\
.mesa-item-price {\
  font-weight: 600;\
  font-variant-numeric: tabular-nums;\
  white-space: nowrap;\
}\
.mesa-allergen-chip {\
  display: inline-flex;\
  align-items: center;\
  padding: 2px 8px;\
  border-radius: var(--radius-full);\
  font-size: 11px;\
  font-weight: 500;\
  background: var(--color-surface-raised);\
  border: 1px solid var(--color-border);\
  color: var(--color-text-secondary);\
  margin: 2px 2px 2px 0;\
}\
\
/* ====== TOGGLE ====== */\
.mesa-toggle-wrap {\
  display: inline-flex;\
  align-items: center;\
  gap: var(--space-2);\
  cursor: pointer;\
}\
.mesa-toggle {\
  position: relative;\
  width: 44px;\
  height: 24px;\
  flex-shrink: 0;\
}\
.mesa-toggle input {\
  opacity: 0;\
  width: 0;\
  height: 0;\
  position: absolute;\
}\
.mesa-toggle-track {\
  position: absolute;\
  inset: 0;\
  background: var(--color-border);\
  border-radius: var(--radius-full);\
  cursor: pointer;\
  transition: background var(--duration-fast);\
}\
.mesa-toggle input:checked + .mesa-toggle-track { background: var(--color-success); }\
.mesa-toggle-thumb {\
  position: absolute;\
  width: 18px;\
  height: 18px;\
  border-radius: 50%;\
  background: #fff;\
  top: 3px;\
  left: 3px;\
  transition: transform var(--duration-fast);\
  pointer-events: none;\
  box-shadow: var(--shadow-sm);\
}\
.mesa-toggle input:checked ~ .mesa-toggle-thumb { transform: translateX(20px); }\
.mesa-toggle input:focus-visible + .mesa-toggle-track {\
  outline: 2px solid var(--color-primary);\
  outline-offset: 2px;\
}\
\
/* ====== ICON BUTTONS ====== */\
.mesa-icon-btn {\
  width: 34px;\
  height: 34px;\
  border-radius: var(--radius-sm);\
  background: none;\
  border: 1px solid var(--color-border);\
  display: inline-flex;\
  align-items: center;\
  justify-content: center;\
  cursor: pointer;\
  color: var(--color-text-secondary);\
  transition: color var(--duration-fast), background var(--duration-fast), transform var(--duration-fast);\
  padding: 0;\
  min-width: 34px;\
}\
.mesa-icon-btn:hover {\
  color: var(--color-text-primary);\
  background: var(--color-surface-raised);\
}\
.mesa-icon-btn:active { transform: scale(0.92); }\
.mesa-icon-btn:focus-visible {\
  outline: 2px solid var(--color-primary);\
  outline-offset: 2px;\
}\
.mesa-icon-btn.danger { color: var(--color-destructive); }\
.mesa-icon-btn.danger:hover { background: var(--color-destructive-light); }\
.mesa-actions-cell {\
  white-space: nowrap;\
  display: flex;\
  gap: var(--space-1);\
  align-items: center;\
  width: 80px;\
  flex-shrink: 0;\
}\
\
/* ====== EMPTY & ERROR STATES ====== */\
.mesa-empty {\
  display: flex;\
  flex-direction: column;\
  align-items: center;\
  justify-content: center;\
  padding: var(--space-12) var(--space-5);\
  text-align: center;\
}\
.mesa-empty-icon {\
  width: 64px;\
  height: 64px;\
  border-radius: var(--radius-xl);\
  background: var(--color-surface-raised);\
  border: 1px solid var(--color-border);\
  display: flex;\
  align-items: center;\
  justify-content: center;\
  margin: 0 auto var(--space-4);\
}\
.mesa-empty-title {\
  font-size: 17px;\
  font-weight: 600;\
  color: var(--color-text-primary);\
  margin-bottom: var(--space-2);\
}\
.mesa-empty-body {\
  font-size: 14px;\
  color: var(--color-text-secondary);\
  max-width: 320px;\
  line-height: 1.6;\
}\
.mesa-skeleton {\
  background: linear-gradient(90deg, var(--color-surface-raised) 25%, var(--color-border) 50%, var(--color-surface-raised) 75%);\
  background-size: 800px 100%;\
  animation: mesa-shimmer 1.4s infinite linear;\
  border-radius: var(--radius-md);\
}\
@keyframes mesa-shimmer {\
  0%   { background-position: -400px 0; }\
  100% { background-position:  400px 0; }\
}\
@media (prefers-reduced-motion: reduce) {\
  .mesa-skeleton { animation: none; background: var(--color-surface-raised); }\
}\
.mesa-error-bar {\
  background: var(--color-destructive-light);\
  color: var(--color-destructive);\
  border: 1px solid rgba(181,59,47,.2);\
  border-radius: var(--radius-md);\
  padding: var(--space-3) var(--space-4);\
  font-size: 14px;\
  display: flex;\
  align-items: center;\
  justify-content: space-between;\
  gap: var(--space-3);\
}\
.mesa-retry-btn {\
  background: none;\
  border: none;\
  color: var(--color-destructive);\
  font-weight: 600;\
  font-size: 13px;\
  cursor: pointer;\
  text-decoration: underline;\
  padding: 0;\
  flex-shrink: 0;\
}\
\
/* ====== ADD/EDIT ITEM DRAWER ====== */\
.mesa-drawer-overlay {\
  position: fixed;\
  inset: 0;\
  background: var(--color-overlay);\
  z-index: 400;\
  display: none;\
}\
.mesa-drawer-overlay.open { display: block; }\
.mesa-drawer {\
  position: fixed;\
  top: 0;\
  right: 0;\
  width: 400px;\
  max-width: 100vw;\
  height: 100vh;\
  background: var(--color-surface);\
  z-index: 401;\
  box-shadow: var(--shadow-xl);\
  display: flex;\
  flex-direction: column;\
  overflow-y: auto;\
  overflow-x: hidden;\
  transform: translateX(100%);\
  transition: transform var(--duration-normal) var(--easing-decelerate);\
}\
.mesa-drawer.open { transform: translateX(0); }\
.mesa-drawer-head {\
  padding: var(--space-5);\
  border-bottom: 1px solid var(--color-border);\
  display: flex;\
  align-items: center;\
  justify-content: space-between;\
  flex-shrink: 0;\
  position: sticky;\
  top: 0;\
  background: var(--color-surface);\
  z-index: 10;\
}\
.mesa-drawer-title {\
  font-size: 18px;\
  font-weight: 600;\
  color: var(--color-text-primary);\
}\
.mesa-drawer-body {\
  padding: var(--space-5);\
  flex: 1;\
  overflow-y: auto;\
  display: flex;\
  flex-direction: column;\
  gap: var(--space-4);\
}\
.mesa-drawer-foot {\
  padding: var(--space-4) var(--space-5);\
  border-top: 1px solid var(--color-border);\
  display: flex;\
  gap: var(--space-3);\
  flex-shrink: 0;\
  background: var(--color-surface);\
  position: sticky;\
  bottom: 0;\
}\
\
/* ====== FORM FIELDS ====== */\
.mesa-field {\
  display: flex;\
  flex-direction: column;\
  gap: var(--space-1);\
}\
.mesa-label {\
  font-size: 13px;\
  font-weight: 500;\
  color: var(--color-text-secondary);\
}\
.mesa-input {\
  width: 100%;\
  min-height: 44px;\
  padding: var(--space-2) var(--space-3);\
  background: var(--color-surface);\
  border: 1px solid var(--color-border);\
  border-radius: var(--radius-md);\
  font-size: 14px;\
  color: var(--color-text-primary);\
  font-family: var(--font-sans);\
  transition: border-color var(--duration-fast), box-shadow var(--duration-fast);\
  box-sizing: border-box;\
}\
.mesa-input:focus {\
  outline: none;\
  border-color: var(--color-primary);\
  box-shadow: 0 0 0 3px var(--color-primary-light);\
}\
.mesa-input::placeholder { color: var(--color-text-muted); }\
.mesa-textarea {\
  min-height: 80px;\
  resize: vertical;\
  line-height: 1.5;\
}\
.mesa-photo-preview-wrap {\
  position: relative;\
  width: fit-content;\
  margin-bottom: var(--space-2);\
}\
.mesa-photo-preview {\
  width: 120px;\
  height: 120px;\
  object-fit: cover;\
  border-radius: var(--radius-md);\
  border: 1px solid var(--color-border);\
  display: block;\
}\
.mesa-photo-remove {\
  position: absolute;\
  top: -8px;\
  right: -8px;\
  width: 24px;\
  height: 24px;\
  border-radius: 50%;\
  background: var(--color-destructive);\
  color: #fff;\
  border: none;\
  cursor: pointer;\
  font-size: 13px;\
  display: flex;\
  align-items: center;\
  justify-content: center;\
  line-height: 1;\
  padding: 0;\
}\
.mesa-photo-remove:focus-visible {\
  outline: 2px solid var(--color-primary);\
  outline-offset: 2px;\
}\
.mesa-avail-row {\
  display: flex;\
  flex-direction: row;\
  align-items: center;\
  gap: var(--space-3);\
}\
.mesa-avail-label {\
  font-size: 14px;\
  font-weight: 500;\
  color: var(--color-text-primary);\
}\
\
/* ====== CATEGORY MODAL ====== */\
.mesa-modal-overlay {\
  position: fixed;\
  inset: 0;\
  background: var(--color-overlay);\
  z-index: 500;\
  display: none;\
  align-items: center;\
  justify-content: center;\
  padding: var(--space-4);\
}\
.mesa-modal-overlay.open { display: flex; }\
.mesa-modal {\
  background: var(--color-surface);\
  border-radius: var(--radius-xl);\
  padding: var(--space-6) var(--space-7);\
  width: 100%;\
  max-width: 380px;\
  box-shadow: var(--shadow-xl);\
}\
.mesa-modal-head {\
  display: flex;\
  align-items: center;\
  justify-content: space-between;\
  margin-bottom: var(--space-5);\
}\
.mesa-modal-title {\
  font-size: 17px;\
  font-weight: 600;\
  color: var(--color-text-primary);\
}\
.mesa-modal-foot {\
  display: flex;\
  gap: var(--space-3);\
  margin-top: var(--space-5);\
}\
\
/* ====== TOAST (scoped host) ====== */\
#mesa-menu-toast {\
  position: fixed;\
  bottom: 80px;\
  left: 50%;\
  transform: translateX(-50%);\
  z-index: 9999;\
  display: flex;\
  flex-direction: column;\
  align-items: center;\
  gap: 8px;\
  pointer-events: none;\
}\
#mesa-menu-toast .mesa-toast-item {\
  background: var(--color-text-primary);\
  color: #fff;\
  padding: 10px 20px;\
  border-radius: var(--radius-full);\
  font-size: 14px;\
  font-weight: 500;\
  box-shadow: var(--shadow-lg);\
  opacity: 0;\
  transform: translateY(12px);\
  transition: opacity .25s ease, transform .25s ease;\
  pointer-events: none;\
}\
#mesa-menu-toast .mesa-toast-item.ok  { background: var(--color-success); }\
#mesa-menu-toast .mesa-toast-item.err { background: var(--color-destructive); }\
#mesa-menu-toast .mesa-toast-item.visible { opacity: 1; transform: translateY(0); }\
\
/* ====== RESPONSIVE ====== */\
@media (max-width: 1023px) {\
  .mesa-menu-layout { flex-direction: column; }\
  .mesa-cat-panel { width: 100%; }\
  .mesa-items-panel { min-width: 0; }\
}\
@media (max-width: 599px) {\
  .mesa-menu-header { flex-direction: column; align-items: flex-start; }\
  .mesa-drawer { width: 100%; border-radius: var(--radius-xl) var(--radius-xl) 0 0; top: auto; bottom: 0; height: 92vh; }\
  .mesa-drawer.open  { transform: translateY(0); }\
  .mesa-drawer:not(.open) { transform: translateY(100%); }\
  .mesa-drawer-overlay.open { display: flex; align-items: flex-end; }\
  .mesa-modal { max-width: calc(100vw - 32px); }\
  .mesa-modal-foot { flex-wrap: wrap; }\
  .mesa-modal-foot .btn { flex: 1; min-width: 80px; }\
}\
@media (max-width: 374px) {\
  .mesa-cat-panel { width: 100%; }\
}\
';

  /* ==========================================================================
     MODULE STATE  (kept module-level; persists across re-renders in the tab)
  ========================================================================== */
  var _styleInjected = false;

  /* Mesa restaurant row is fetched once per browser session (not per render)   */
  var _mesaRest   = null;     /* resolved mesa_restaurants row or null          */
  var _restReady  = false;    /* true once the first fetch attempt has settled  */
  var _restError  = null;     /* non-null string if fetch failed                */

  var _categories = [];       /* mesa_menu_categories rows                      */
  var _items      = [];       /* mesa_menu_items rows for the selected category */
  var _currentCat = null;     /* selected category id                           */

  /* Item-drawer state */
  var _drawerItem = null;     /* null = add mode; row object = edit mode        */
  var _drawerPhotoUrl = '';   /* live URL (either uploaded or pasted)           */

  /* ==========================================================================
     UTILS — pull from PLAT/MESA shim; self-contained fallbacks
  ========================================================================== */
  var _esc   = (window.PLAT && window.PLAT.utils && window.PLAT.utils.esc)   || function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var _money = (window.PLAT && window.PLAT.utils && window.PLAT.utils.money) || function (cents, cur) {
    var syms = { USD: '$', GBP: '£', EUR: '€', AED: 'AED ', SAR: 'SAR ' };
    var sym  = syms[cur || 'USD'] || ((cur || '') + ' ');
    return sym + (Number(cents || 0) / 100).toFixed(2);
  };

  function _client() {
    return window.PLAT && window.PLAT.client;
  }

  /* ==========================================================================
     TOAST (scoped — uses or creates #mesa-menu-toast)
  ========================================================================== */
  function _toast(msg, kind) {
    var host = document.getElementById('mesa-menu-toast');
    if (!host) {
      host = document.createElement('div');
      host.id = 'mesa-menu-toast';
      host.setAttribute('role', 'status');
      host.setAttribute('aria-live', 'polite');
      document.body.appendChild(host);
    }
    var item = document.createElement('div');
    item.className = 'mesa-toast-item' + (kind ? ' ' + kind : '');
    item.textContent = msg;
    host.appendChild(item);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { item.classList.add('visible'); });
    });
    setTimeout(function () {
      item.style.transition = 'opacity .25s, transform .25s';
      item.style.opacity    = '0';
      item.style.transform  = 'translateY(12px)';
      setTimeout(function () { if (item.parentNode) item.parentNode.removeChild(item); }, 270);
    }, 3000);
  }

  /* ==========================================================================
     STYLE INJECTION
  ========================================================================== */
  function _injectStyles() {
    if (_styleInjected) return;
    _styleInjected = true;
    if (document.getElementById('mesa-menu-css')) return;
    var s = document.createElement('style');
    s.id = 'mesa-menu-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ==========================================================================
     MESA RESTAURANT RESOLUTION
     Resolved once; subsequent render() calls use the cached result.
  ========================================================================== */
  function _resolveMesaRest(cb) {
    if (_restReady) { cb(_mesaRest, _restError); return; }
    var sb = _client();
    if (!sb) { _restReady = true; _restError = 'Supabase client not available.'; cb(null, _restError); return; }
    sb.from('mesa_restaurants').select('*').limit(1).maybeSingle()
      .then(function (res) {
        _restReady = true;
        if (res.error) {
          _restError = 'Could not load restaurant settings.';
          console.error('[mesa-menu] mesa_restaurants fetch error', res.error);
          cb(null, _restError);
        } else {
          _mesaRest = res.data || null;
          _restError = null;
          cb(_mesaRest, null);
        }
      })
      .catch(function (err) {
        _restReady = true;
        _restError = 'Could not load restaurant settings.';
        console.error('[mesa-menu] mesa_restaurants fetch throw', err);
        cb(null, _restError);
      });
  }

  /* ==========================================================================
     SKELETON HELPERS
  ========================================================================== */
  function _catSkeletons(n) {
    var html = '';
    for (var i = 0; i < n; i++) {
      html += '<div aria-hidden="true" style="display:flex;align-items:center;gap:var(--space-2);padding:var(--space-3) var(--space-3);">'
            + '<div class="mesa-skeleton" style="height:14px;flex:1;border-radius:3px;"></div>'
            + '</div>';
    }
    return html;
  }

  function _itemSkeletons(n) {
    var html = '<div aria-hidden="true" style="overflow-x:auto"><table class="mesa-table"><thead><tr>'
             + '<th></th><th>Item</th><th>Price</th><th>Available</th><th>Actions</th>'
             + '</tr></thead><tbody>';
    for (var i = 0; i < n; i++) {
      html += '<tr>'
            + '<td><div class="mesa-skeleton" style="width:52px;height:52px;border-radius:var(--radius-sm)"></div></td>'
            + '<td><div class="mesa-skeleton" style="height:14px;width:70%;margin-bottom:6px;border-radius:3px"></div>'
            +     '<div class="mesa-skeleton" style="height:11px;width:45%;border-radius:3px"></div></td>'
            + '<td><div class="mesa-skeleton" style="height:13px;width:48px;border-radius:3px"></div></td>'
            + '<td><div class="mesa-skeleton" style="height:22px;width:44px;border-radius:var(--radius-full)"></div></td>'
            + '<td><div style="display:flex;gap:4px">'
            +   '<div class="mesa-skeleton" style="width:34px;height:34px;border-radius:var(--radius-sm)"></div>'
            +   '<div class="mesa-skeleton" style="width:34px;height:34px;border-radius:var(--radius-sm)"></div>'
            + '</div></td>'
            + '</tr>';
    }
    html += '</tbody></table></div>';
    return html;
  }

  /* ==========================================================================
     RENDER CATEGORY LIST (left panel)
  ========================================================================== */
  function _renderCatList(sectionEl) {
    var listEl = sectionEl.querySelector('#mm-cat-list');
    if (!listEl) return;

    if (!_categories.length) {
      listEl.innerHTML = '<p style="padding:var(--space-4);font-size:14px;color:var(--color-text-muted)">No categories yet.</p>';
      return;
    }

    var html = _categories.map(function (c) {
      var count   = _items.filter(function (i) { return i.category_id === c.id; }).length;
      var active  = (_currentCat === c.id) ? ' active' : '';
      return '<div class="mesa-cat-item' + active + '" role="button" tabindex="0"'
           + ' data-cid="' + _esc(c.id) + '"'
           + ' aria-label="' + _esc(c.name) + ', ' + count + ' items' + (active ? ', selected' : '') + '">'
           + '<span class="mesa-cat-name">' + _esc(c.name) + '</span>'
           + '<span class="mesa-cat-meta">'
           + '<span class="mesa-cat-count">' + count + '</span>'
           + '<button class="mesa-cat-edit-btn" data-cid="' + _esc(c.id) + '"'
           + ' aria-label="Edit category ' + _esc(c.name) + '">'
           + _svgEdit(13) + '</button>'
           + '</span>'
           + '</div>';
    }).join('');

    listEl.innerHTML = html;

    /* Wire cat item clicks */
    listEl.querySelectorAll('.mesa-cat-item').forEach(function (el) {
      function selectThis() { _selectCat(sectionEl, el.dataset.cid); }
      el.addEventListener('click', function (e) {
        if (e.target.closest('.mesa-cat-edit-btn')) return;
        selectThis();
      });
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectThis(); }
      });
    });

    /* Wire edit buttons */
    listEl.querySelectorAll('.mesa-cat-edit-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var cat = _categories.find(function (c) { return c.id === btn.dataset.cid; });
        if (cat) _openCatModal(sectionEl, cat);
      });
    });
  }

  /* ==========================================================================
     SELECT CATEGORY — fetch items then render
  ========================================================================== */
  function _selectCat(sectionEl, cid) {
    _currentCat = cid;
    var cat = _categories.find(function (c) { return c.id === cid; }) || null;

    /* Update panel heading */
    var titleEl = sectionEl.querySelector('#mm-items-title');
    if (titleEl) titleEl.textContent = cat ? cat.name : 'Items';

    /* Show "Add item" button */
    var addBtn = sectionEl.querySelector('#mm-add-item-btn');
    if (addBtn) addBtn.style.display = 'inline-flex';

    /* Update active highlight in cat list */
    _renderCatList(sectionEl);

    /* Show skeleton while loading */
    var bodyEl = sectionEl.querySelector('#mm-items-body');
    if (bodyEl) bodyEl.innerHTML = _itemSkeletons(4);

    var sb = _client();
    if (!sb) { if (bodyEl) bodyEl.innerHTML = _errorHtml('Client not ready.'); return; }

    sb.from('mesa_menu_items').select('*').eq('category_id', cid)
      .order('sort', { ascending: true }).order('name', { ascending: true })
      .then(function (res) {
        if (res.error) {
          _toast('Failed to load items.', 'err');
          if (bodyEl) bodyEl.innerHTML = _errorHtml('Could not load items.');
          return;
        }
        _items = res.data || [];
        _renderItemsTable(sectionEl);
        _renderCatList(sectionEl); /* refresh counts */
      })
      .catch(function (err) {
        console.error('[mesa-menu] item load error', err);
        if (bodyEl) bodyEl.innerHTML = _errorHtml('Could not load items.');
      });
  }

  /* ==========================================================================
     RENDER ITEMS TABLE
  ========================================================================== */
  function _renderItemsTable(sectionEl) {
    var bodyEl = sectionEl.querySelector('#mm-items-body');
    if (!bodyEl) return;
    var cur = (_mesaRest && _mesaRest.currency) || 'GBP';

    if (!_items.length) {
      bodyEl.innerHTML = '<div class="mesa-empty">'
        + '<div class="mesa-empty-icon" aria-hidden="true">' + _svgMenu(28) + '</div>'
        + '<p class="mesa-empty-title">No items yet</p>'
        + '<p class="mesa-empty-body">Add your first item to this category.</p>'
        + '</div>';
      return;
    }

    var rows = _items.map(function (item) {
      var allergens = (item.allergens || []).map(function (a) {
        return '<span class="mesa-allergen-chip">' + _esc(a) + '</span>';
      }).join('');

      var thumbHtml = item.photo_url
        ? '<img class="mesa-item-thumb" src="' + _esc(item.photo_url) + '" alt="' + _esc(item.name) + '">'
        : '<div class="mesa-item-thumb-placeholder" aria-hidden="true">' + _svgImage(20) + '</div>';

      return '<tr>'
        + '<td style="width:60px;padding:var(--space-3) var(--space-4)">' + thumbHtml + '</td>'
        + '<td class="mesa-item-name-cell">'
        +   '<div class="mesa-item-name">' + _esc(item.name) + '</div>'
        +   (item.description ? '<div class="mesa-item-desc">' + _esc(item.description) + '</div>' : '')
        +   (allergens ? '<div style="margin-top:4px">' + allergens + '</div>' : '')
        + '</td>'
        + '<td class="mesa-item-price">' + _money(item.price_cents, cur) + '</td>'
        + '<td>'
        +   '<label class="mesa-toggle" aria-label="Toggle availability for ' + _esc(item.name) + '">'
        +     '<input type="checkbox"' + (item.is_available ? ' checked' : '') + ' data-iid="' + _esc(item.id) + '">'
        +     '<span class="mesa-toggle-track"></span>'
        +     '<span class="mesa-toggle-thumb"></span>'
        +   '</label>'
        + '</td>'
        + '<td>'
        +   '<div class="mesa-actions-cell">'
        +     '<button class="mesa-icon-btn mm-edit-item" data-iid="' + _esc(item.id) + '"'
        +       ' aria-label="Edit ' + _esc(item.name) + '">' + _svgEdit(15) + '</button>'
        +     '<button class="mesa-icon-btn danger mm-del-item" data-iid="' + _esc(item.id) + '"'
        +       ' data-name="' + _esc(item.name) + '"'
        +       ' aria-label="Delete ' + _esc(item.name) + '">' + _svgTrash(15) + '</button>'
        +   '</div>'
        + '</td>'
        + '</tr>';
    }).join('');

    bodyEl.innerHTML = '<div class="mesa-items-body" style="overflow-x:auto">'
      + '<table class="mesa-table">'
      + '<thead><tr>'
      + '<th scope="col"></th>'
      + '<th scope="col">Item</th>'
      + '<th scope="col">Price</th>'
      + '<th scope="col">Available</th>'
      + '<th scope="col">Actions</th>'
      + '</tr></thead>'
      + '<tbody>' + rows + '</tbody>'
      + '</table></div>';

    /* Wire availability toggles */
    bodyEl.querySelectorAll('input[type="checkbox"][data-iid]').forEach(function (inp) {
      inp.addEventListener('change', function () {
        var newVal = inp.checked;
        var sb = _client();
        if (!sb) { inp.checked = !newVal; return; }
        sb.from('mesa_menu_items').update({ is_available: newVal }).eq('id', inp.dataset.iid)
          .then(function (res) {
            if (res.error) {
              _toast('Failed to update availability.', 'err');
              inp.checked = !newVal;
              return;
            }
            var found = _items.find(function (i) { return i.id === inp.dataset.iid; });
            if (found) found.is_available = newVal;
          });
      });
    });

    /* Wire edit buttons */
    bodyEl.querySelectorAll('.mm-edit-item').forEach(function (btn) {
      btn.addEventListener('click', function () { _openItemDrawer(sectionEl, btn.dataset.iid); });
    });

    /* Wire delete buttons */
    bodyEl.querySelectorAll('.mm-del-item').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!confirm('Delete "' + btn.dataset.name + '"? This cannot be undone.')) return;
        var sb = _client();
        if (!sb) { _toast('Client not ready.', 'err'); return; }
        sb.from('mesa_menu_items').delete().eq('id', btn.dataset.iid)
          .then(function (res) {
            if (res.error) { _toast('Error deleting item.', 'err'); return; }
            _items = _items.filter(function (i) { return i.id !== btn.dataset.iid; });
            _renderItemsTable(sectionEl);
            _renderCatList(sectionEl);
            _toast('Item deleted.', 'ok');
          });
      });
    });
  }

  /* ==========================================================================
     CATEGORY MODAL — add / rename / delete
  ========================================================================== */
  function _openCatModal(sectionEl, cat) {
    var overlay = sectionEl.querySelector('#mm-cat-modal-overlay');
    if (!overlay) return;

    var idInp   = sectionEl.querySelector('#mm-cat-id');
    var nameInp = sectionEl.querySelector('#mm-cat-name');
    var title   = sectionEl.querySelector('#mm-cat-modal-title');
    var delBtn  = sectionEl.querySelector('#mm-cat-del-btn');

    if (cat) {
      idInp.value   = cat.id;
      nameInp.value = cat.name;
      if (title)   title.textContent = 'Edit category';
      if (delBtn)  delBtn.style.display = 'inline-flex';
    } else {
      idInp.value   = '';
      nameInp.value = '';
      if (title)   title.textContent = 'Add category';
      if (delBtn)  delBtn.style.display = 'none';
    }
    overlay.classList.add('open');
    setTimeout(function () { nameInp.focus(); }, 50);
  }

  function _closeCatModal(sectionEl) {
    var overlay = sectionEl.querySelector('#mm-cat-modal-overlay');
    if (overlay) overlay.classList.remove('open');
  }

  function _wireCatModal(sectionEl) {
    var overlay = sectionEl.querySelector('#mm-cat-modal-overlay');
    var saveBtn = sectionEl.querySelector('#mm-cat-save-btn');
    var delBtn  = sectionEl.querySelector('#mm-cat-del-btn');
    var cancelBtn = sectionEl.querySelector('#mm-cat-cancel-btn');
    var closeBtn  = sectionEl.querySelector('#mm-cat-modal-close');
    var nameInp   = sectionEl.querySelector('#mm-cat-name');

    function doClose() { _closeCatModal(sectionEl); }

    if (closeBtn)  closeBtn.addEventListener('click', doClose);
    if (cancelBtn) cancelBtn.addEventListener('click', doClose);
    if (overlay) {
      overlay.addEventListener('click', function (e) { if (e.target === overlay) doClose(); });
      overlay.addEventListener('keydown', function (e) { if (e.key === 'Escape') doClose(); });
    }

    if (nameInp) {
      nameInp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); if (saveBtn) saveBtn.click(); }
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        var id   = sectionEl.querySelector('#mm-cat-id').value;
        var name = (sectionEl.querySelector('#mm-cat-name').value || '').trim();
        if (!name) { _toast('Enter a category name.', 'err'); return; }
        var rid  = _mesaRest ? _mesaRest.id : null;
        if (!rid) { _toast('Restaurant not loaded.', 'err'); return; }
        var sb   = _client();
        if (!sb) { _toast('Client not ready.', 'err'); return; }

        saveBtn.disabled = true;

        if (!id) {
          /* INSERT */
          sb.from('mesa_menu_categories')
            .insert({ restaurant_id: rid, name: name, sort: _categories.length })
            .select('*').single()
            .then(function (res) {
              saveBtn.disabled = false;
              if (res.error) { _toast('Error adding category.', 'err'); return; }
              _categories.push(res.data);
              _closeCatModal(sectionEl);
              _renderCatList(sectionEl);
              _selectCat(sectionEl, res.data.id);
              _toast('Category added.', 'ok');
            });
        } else {
          /* UPDATE */
          sb.from('mesa_menu_categories').update({ name: name }).eq('id', id)
            .then(function (res) {
              saveBtn.disabled = false;
              if (res.error) { _toast('Error renaming category.', 'err'); return; }
              var c = _categories.find(function (c) { return c.id === id; });
              if (c) c.name = name;
              _closeCatModal(sectionEl);
              _renderCatList(sectionEl);
              /* Refresh panel title if this is the selected cat */
              if (_currentCat === id) {
                var titleEl = sectionEl.querySelector('#mm-items-title');
                if (titleEl) titleEl.textContent = name;
              }
              _toast('Category renamed.', 'ok');
            });
        }
      });
    }

    if (delBtn) {
      delBtn.addEventListener('click', function () {
        var id  = sectionEl.querySelector('#mm-cat-id').value;
        if (!id) return;
        var cat = _categories.find(function (c) { return c.id === id; });
        var lbl = cat ? cat.name : 'this category';
        if (!confirm('Delete "' + lbl + '"? All items in it will also be deleted.')) return;
        var sb = _client();
        if (!sb) { _toast('Client not ready.', 'err'); return; }
        delBtn.disabled = true;
        sb.from('mesa_menu_categories').delete().eq('id', id)
          .then(function (res) {
            delBtn.disabled = false;
            if (res.error) { _toast('Error deleting category.', 'err'); return; }
            _categories = _categories.filter(function (c) { return c.id !== id; });
            _items      = _items.filter(function (i) { return i.category_id !== id; });
            if (_currentCat === id) _currentCat = null;
            _closeCatModal(sectionEl);
            _renderCatList(sectionEl);
            if (_categories.length) {
              _selectCat(sectionEl, _categories[0].id);
            } else {
              _renderEmptyItems(sectionEl);
              var addBtn = sectionEl.querySelector('#mm-add-item-btn');
              if (addBtn) addBtn.style.display = 'none';
            }
            _toast('Category deleted.', 'ok');
          });
      });
    }
  }

  /* ==========================================================================
     ITEMS PANEL — "select a category" empty placeholder
  ========================================================================== */
  function _renderEmptyItems(sectionEl) {
    var bodyEl = sectionEl.querySelector('#mm-items-body');
    if (!bodyEl) return;
    var titleEl = sectionEl.querySelector('#mm-items-title');
    if (titleEl) titleEl.textContent = 'Select a category';
    bodyEl.innerHTML = '<div class="mesa-empty">'
      + '<div class="mesa-empty-icon" aria-hidden="true">' + _svgMenu(28) + '</div>'
      + '<p class="mesa-empty-title">Select a category</p>'
      + '<p class="mesa-empty-body">Choose a category from the left to manage its items.</p>'
      + '</div>';
  }

  /* ==========================================================================
     ITEM DRAWER — add / edit
  ========================================================================== */
  function _openItemDrawer(sectionEl, itemId) {
    var item = itemId ? _items.find(function (i) { return i.id === itemId; }) : null;
    _drawerItem     = item || null;
    _drawerPhotoUrl = item ? (item.photo_url || '') : '';

    var titleEl     = sectionEl.querySelector('#mm-drawer-title');
    var nameInp     = sectionEl.querySelector('#mm-item-name');
    var descInp     = sectionEl.querySelector('#mm-item-desc');
    var priceInp    = sectionEl.querySelector('#mm-item-price');
    var allergensInp = sectionEl.querySelector('#mm-item-allergens');
    var availInp    = sectionEl.querySelector('#mm-item-avail');
    var pasteInp    = sectionEl.querySelector('#mm-item-paste-url');
    var fileInp     = sectionEl.querySelector('#mm-item-file');
    var previewWrap = sectionEl.querySelector('#mm-photo-preview-wrap');
    var previewImg  = sectionEl.querySelector('#mm-photo-preview');

    if (titleEl)  titleEl.textContent = item ? 'Edit item' : 'Add item';
    if (nameInp)  nameInp.value       = item ? item.name : '';
    if (descInp)  descInp.value       = item ? (item.description || '') : '';
    if (priceInp) priceInp.value      = item ? (item.price_cents / 100).toFixed(2) : '';
    if (allergensInp) allergensInp.value = item ? (item.allergens || []).join(', ') : '';
    if (availInp) availInp.checked    = item ? item.is_available : true;
    if (pasteInp) pasteInp.value      = _drawerPhotoUrl;
    if (fileInp)  fileInp.value       = '';

    if (previewWrap && previewImg) {
      if (_drawerPhotoUrl) {
        previewImg.src              = _drawerPhotoUrl;
        previewWrap.style.display   = 'block';
      } else {
        previewImg.src              = '';
        previewWrap.style.display   = 'none';
      }
    }

    var overlay = sectionEl.querySelector('#mm-drawer-overlay');
    var drawer  = sectionEl.querySelector('#mm-drawer');
    if (overlay) overlay.classList.add('open');
    if (drawer)  drawer.classList.add('open');
    if (nameInp) setTimeout(function () { nameInp.focus(); }, 60);
  }

  function _closeItemDrawer(sectionEl) {
    var overlay = sectionEl.querySelector('#mm-drawer-overlay');
    var drawer  = sectionEl.querySelector('#mm-drawer');
    if (overlay) overlay.classList.remove('open');
    if (drawer)  drawer.classList.remove('open');
    _drawerItem     = null;
    _drawerPhotoUrl = '';
  }

  function _wireItemDrawer(sectionEl) {
    var overlay     = sectionEl.querySelector('#mm-drawer-overlay');
    var closeBtn    = sectionEl.querySelector('#mm-drawer-close');
    var cancelBtn   = sectionEl.querySelector('#mm-drawer-cancel');
    var saveBtn     = sectionEl.querySelector('#mm-drawer-save');
    var fileInp     = sectionEl.querySelector('#mm-item-file');
    var pasteInp    = sectionEl.querySelector('#mm-item-paste-url');
    var removeBtn   = sectionEl.querySelector('#mm-photo-remove');
    var previewWrap = sectionEl.querySelector('#mm-photo-preview-wrap');
    var previewImg  = sectionEl.querySelector('#mm-photo-preview');

    function doClose() { _closeItemDrawer(sectionEl); }

    if (closeBtn)  closeBtn.addEventListener('click', doClose);
    if (cancelBtn) cancelBtn.addEventListener('click', doClose);
    if (overlay) {
      overlay.addEventListener('click', function (e) { if (e.target === overlay) doClose(); });
      overlay.addEventListener('keydown', function (e) { if (e.key === 'Escape') doClose(); });
    }

    /* Photo: file upload */
    if (fileInp) {
      fileInp.addEventListener('change', function () {
        var file = fileInp.files && fileInp.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
          _toast('Images only (jpg, png, webp…)', 'err');
          fileInp.value = '';
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          _toast('Image must be under 5 MB.', 'err');
          fileInp.value = '';
          return;
        }
        var sb  = _client();
        var rid = _mesaRest ? _mesaRest.id : null;
        if (!sb || !rid) { _toast('Cannot upload: client or restaurant not ready.', 'err'); fileInp.value = ''; return; }

        var safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        var path = 'menu/' + rid + '/' + Date.now() + '-' + safeName;

        _toast('Uploading…');
        saveBtn.disabled = true;

        sb.storage.from('mesa-media').upload(path, file, { upsert: true })
          .then(function (res) {
            saveBtn.disabled = false;
            if (res.error) { _toast('Upload failed: ' + res.error.message, 'err'); fileInp.value = ''; return; }
            var url = sb.storage.from('mesa-media').getPublicUrl(path).data.publicUrl;
            _drawerPhotoUrl = url;
            if (pasteInp)   pasteInp.value        = url;
            if (previewImg) previewImg.src         = url;
            if (previewWrap) previewWrap.style.display = 'block';
            _toast('Photo uploaded.', 'ok');
          })
          .catch(function (err) {
            saveBtn.disabled = false;
            console.error('[mesa-menu] photo upload error', err);
            _toast('Upload error.', 'err');
            fileInp.value = '';
          });
      });
    }

    /* Photo: paste URL */
    if (pasteInp) {
      pasteInp.addEventListener('input', function () {
        var url = pasteInp.value.trim();
        _drawerPhotoUrl = url;
        if (url) {
          if (previewImg)  previewImg.src         = url;
          if (previewWrap) previewWrap.style.display = 'block';
        } else {
          if (previewWrap) previewWrap.style.display = 'none';
          if (previewImg)  previewImg.src = '';
        }
      });
    }

    /* Photo: remove */
    if (removeBtn) {
      removeBtn.addEventListener('click', function () {
        _drawerPhotoUrl = '';
        if (pasteInp)    pasteInp.value             = '';
        if (fileInp)     fileInp.value              = '';
        if (previewImg)  previewImg.src             = '';
        if (previewWrap) previewWrap.style.display  = 'none';
      });
    }

    /* Save */
    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        var name = (sectionEl.querySelector('#mm-item-name').value || '').trim();
        if (!name) { _toast('Item name is required.', 'err'); sectionEl.querySelector('#mm-item-name').focus(); return; }

        var priceVal   = parseFloat(sectionEl.querySelector('#mm-item-price').value) || 0;
        var priceCents = Math.round(priceVal * 100);
        var allergens  = (sectionEl.querySelector('#mm-item-allergens').value || '')
          .split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        var isAvail    = sectionEl.querySelector('#mm-item-avail').checked;
        var desc       = (sectionEl.querySelector('#mm-item-desc').value || '').trim() || null;
        var photoUrl   = _drawerPhotoUrl || null;

        if (priceVal === 0) _toast('Warning: price is set to zero.', 'warn');

        var rid = _mesaRest ? _mesaRest.id : null;
        if (!rid) { _toast('Restaurant not loaded.', 'err'); return; }
        var sb  = _client();
        if (!sb) { _toast('Client not ready.', 'err'); return; }

        saveBtn.disabled = true;
        var origText = saveBtn.textContent;
        saveBtn.textContent = 'Saving…';

        var payload = {
          restaurant_id: rid,
          category_id:   _currentCat,
          name:          name,
          description:   desc,
          price_cents:   priceCents,
          allergens:     allergens,  /* NOT NULL text[] column — empty array, never null */
          is_available:  isAvail,
          photo_url:     photoUrl,
        };

        var id = _drawerItem ? _drawerItem.id : null;
        var q  = id
          ? sb.from('mesa_menu_items').update(payload).eq('id', id).select('*').single()
          : sb.from('mesa_menu_items').insert(Object.assign({ sort: _items.length }, payload)).select('*').single();

        q.then(function (res) {
          saveBtn.disabled = false;
          saveBtn.textContent = origText;
          if (res.error) { _toast('Error saving item.', 'err'); return; }
          if (id) {
            _items = _items.map(function (i) { return i.id === id ? res.data : i; });
          } else {
            _items.push(res.data);
          }
          _renderItemsTable(sectionEl);
          _renderCatList(sectionEl);
          _closeItemDrawer(sectionEl);
          _toast('Item saved.', 'ok');
        }).catch(function (err) {
          saveBtn.disabled = false;
          saveBtn.textContent = origText;
          console.error('[mesa-menu] item save error', err);
          _toast('Error saving item.', 'err');
        });
      });
    }
  }

  /* ==========================================================================
     SCAFFOLD HTML
  ========================================================================== */
  function _buildScaffold() {
    return [
      '<div class="mesa-menu-root">',
        '<div class="mesa-menu-header">',
          '<h2 class="mesa-menu-title">Menu</h2>',
        '</div>',

        /* Loading bar (shown during mesa restaurant fetch) */
        '<div id="mm-loading" role="status" aria-live="polite" aria-label="Loading menu" style="display:none">',
          '<div style="display:flex;gap:var(--space-4)">',
            '<div style="width:280px;flex-shrink:0"><div class="mesa-skeleton" style="height:320px;border-radius:var(--radius-lg)"></div></div>',
            '<div style="flex:1"><div class="mesa-skeleton" style="height:320px;border-radius:var(--radius-lg)"></div></div>',
          '</div>',
        '</div>',

        /* Error bar (shown if mesa restaurant fetch fails) */
        '<div id="mm-error" role="alert" style="display:none"></div>',

        /* Two-panel layout */
        '<div class="mesa-menu-layout" id="mm-layout" style="display:none">',

          /* Category panel */
          '<div class="mesa-cat-panel">',
            '<div class="mesa-cat-panel-head">Categories</div>',
            '<div id="mm-cat-list" class="mesa-cat-list" aria-label="Menu categories" role="list"></div>',
            '<div class="mesa-add-cat-wrap">',
              '<button class="btn btn-secondary btn-block" id="mm-add-cat-btn"',
                ' style="border-radius:var(--radius-md);min-height:44px">',
                '+ Add category',
              '</button>',
            '</div>',
          '</div>',

          /* Items panel */
          '<div class="mesa-items-panel">',
            '<div class="mesa-items-panel-head">',
              '<span class="mesa-items-panel-title" id="mm-items-title">Select a category</span>',
              '<button class="btn btn-primary" id="mm-add-item-btn"',
                ' style="display:none;border-radius:var(--radius-md);min-height:44px">',
                '+ Add item',
              '</button>',
            '</div>',
            '<div id="mm-items-body"></div>',
          '</div>',

        '</div>',/* /mm-layout */

      '</div>',/* /mesa-menu-root */

      /* ---- Category modal ---- */
      '<div class="mesa-modal-overlay" id="mm-cat-modal-overlay"',
        ' role="dialog" aria-modal="true" aria-labelledby="mm-cat-modal-title">',
        '<div class="mesa-modal">',
          '<div class="mesa-modal-head">',
            '<h3 class="mesa-modal-title" id="mm-cat-modal-title">Add category</h3>',
            '<button class="mesa-icon-btn" id="mm-cat-modal-close" aria-label="Close">',
              _svgClose(16),
            '</button>',
          '</div>',
          '<input type="hidden" id="mm-cat-id">',
          '<div class="mesa-field">',
            '<label class="mesa-label" for="mm-cat-name">Category name</label>',
            '<input class="mesa-input" id="mm-cat-name" type="text" placeholder="e.g. Starters" autocomplete="off">',
          '</div>',
          '<div class="mesa-modal-foot">',
            '<button class="btn btn-primary" id="mm-cat-save-btn"',
              ' style="flex:1;border-radius:var(--radius-md);min-height:44px">Save</button>',
            '<button class="btn" id="mm-cat-del-btn"',
              ' style="border-radius:var(--radius-md);min-height:44px;background:var(--color-destructive-light);',
              'color:var(--color-destructive);border:1px solid var(--color-destructive);display:none">Delete</button>',
            '<button class="btn btn-secondary" id="mm-cat-cancel-btn"',
              ' style="border-radius:var(--radius-md);min-height:44px">Cancel</button>',
          '</div>',
        '</div>',
      '</div>',

      /* ---- Item add/edit drawer ---- */
      '<div class="mesa-drawer-overlay" id="mm-drawer-overlay"></div>',
      '<aside class="mesa-drawer" id="mm-drawer" role="dialog" aria-modal="true" aria-labelledby="mm-drawer-title">',
        '<div class="mesa-drawer-head">',
          '<h3 class="mesa-drawer-title" id="mm-drawer-title">Add item</h3>',
          '<button class="mesa-icon-btn" id="mm-drawer-close" aria-label="Close item editor">',
            _svgClose(16),
          '</button>',
        '</div>',
        '<div class="mesa-drawer-body">',

          '<div class="mesa-field">',
            '<label class="mesa-label" for="mm-item-name">Item name *</label>',
            '<input class="mesa-input" id="mm-item-name" type="text" placeholder="e.g. Grilled Salmon" autocomplete="off">',
          '</div>',

          '<div class="mesa-field">',
            '<label class="mesa-label" for="mm-item-desc">Description (optional)</label>',
            '<textarea class="mesa-input mesa-textarea" id="mm-item-desc" rows="3"',
              ' placeholder="Short description…"></textarea>',
          '</div>',

          '<div class="mesa-field">',
            '<label class="mesa-label" for="mm-item-price">Price</label>',
            '<input class="mesa-input" id="mm-item-price" type="number" min="0" step="0.01" placeholder="0.00">',
          '</div>',

          '<div class="mesa-field">',
            '<label class="mesa-label">Photo</label>',
            /* Preview */
            '<div id="mm-photo-preview-wrap" style="display:none;margin-bottom:var(--space-2);position:relative;width:fit-content">',
              '<img id="mm-photo-preview" src="" alt="Item photo preview" class="mesa-photo-preview">',
              '<button type="button" id="mm-photo-remove" class="mesa-photo-remove" aria-label="Remove photo">&#x2715;</button>',
            '</div>',
            /* File input */
            '<input id="mm-item-file" type="file" accept="image/*" class="mesa-input"',
              ' style="padding:var(--space-2)" aria-label="Upload photo from device">',
            /* URL input */
            '<input id="mm-item-paste-url" class="mesa-input" type="url"',
              ' placeholder="Or paste an image URL…" style="margin-top:var(--space-2)">',
          '</div>',

          '<div class="mesa-field">',
            '<label class="mesa-label" for="mm-item-allergens">Allergens (comma-separated)</label>',
            '<input class="mesa-input" id="mm-item-allergens" type="text"',
              ' placeholder="e.g. gluten, dairy, nuts" autocomplete="off">',
          '</div>',

          '<div class="mesa-avail-row">',
            '<label class="mesa-toggle" aria-label="Mark item as available">',
              '<input type="checkbox" id="mm-item-avail" checked>',
              '<span class="mesa-toggle-track"></span>',
              '<span class="mesa-toggle-thumb"></span>',
            '</label>',
            '<span class="mesa-avail-label">Available</span>',
          '</div>',

        '</div>',/* /drawer-body */
        '<div class="mesa-drawer-foot">',
          '<button class="btn btn-primary" id="mm-drawer-save"',
            ' style="flex:1;border-radius:var(--radius-md);min-height:44px">Save item</button>',
          '<button class="btn btn-secondary" id="mm-drawer-cancel"',
            ' style="border-radius:var(--radius-md);min-height:44px">Cancel</button>',
        '</div>',
      '</aside>',
    ].join('');
  }

  /* ==========================================================================
     WIRE TOP-LEVEL SCAFFOLD EVENTS (once per scaffold build)
  ========================================================================== */
  function _wireScaffold(sectionEl) {
    /* Add category button */
    var addCatBtn = sectionEl.querySelector('#mm-add-cat-btn');
    if (addCatBtn) {
      addCatBtn.addEventListener('click', function () { _openCatModal(sectionEl, null); });
    }

    /* Add item button */
    var addItemBtn = sectionEl.querySelector('#mm-add-item-btn');
    if (addItemBtn) {
      addItemBtn.addEventListener('click', function () { _openItemDrawer(sectionEl, null); });
    }

    _wireCatModal(sectionEl);
    _wireItemDrawer(sectionEl);
  }

  /* ==========================================================================
     LOAD CATEGORIES
  ========================================================================== */
  function _loadCategories(sectionEl) {
    var sb  = _client();
    var rid = _mesaRest ? _mesaRest.id : null;
    if (!sb || !rid) {
      var errEl = sectionEl.querySelector('#mm-error');
      if (errEl) { errEl.style.display = ''; errEl.innerHTML = _errorHtml('Restaurant not loaded.'); }
      return;
    }

    /* Show layout, load skeleton cats */
    var loadingEl = sectionEl.querySelector('#mm-loading');
    var layoutEl  = sectionEl.querySelector('#mm-layout');
    var errEl     = sectionEl.querySelector('#mm-error');

    if (loadingEl) loadingEl.style.display = 'none';
    if (errEl)     errEl.style.display     = 'none';
    if (layoutEl)  layoutEl.style.display  = '';

    var catListEl = sectionEl.querySelector('#mm-cat-list');
    if (catListEl) catListEl.innerHTML = _catSkeletons(4);

    /* Show item skeleton too */
    _renderEmptyItems(sectionEl);

    sb.from('mesa_menu_categories').select('*').eq('restaurant_id', rid)
      .order('sort', { ascending: true }).order('name', { ascending: true })
      .then(function (res) {
        if (res.error) {
          _toast('Failed to load categories.', 'err');
          if (catListEl) catListEl.innerHTML = _errorHtml('Could not load categories.');
          return;
        }
        _categories  = res.data || [];
        _items       = [];
        _currentCat  = null;
        _renderCatList(sectionEl);
        if (_categories.length) {
          _selectCat(sectionEl, _categories[0].id);
        } else {
          _renderEmptyItems(sectionEl);
          var addItemBtn = sectionEl.querySelector('#mm-add-item-btn');
          if (addItemBtn) addItemBtn.style.display = 'none';
        }
      })
      .catch(function (err) {
        console.error('[mesa-menu] category load error', err);
        if (catListEl) catListEl.innerHTML = _errorHtml('Could not load categories.');
      });
  }

  /* ==========================================================================
     ERROR HTML HELPER
  ========================================================================== */
  function _errorHtml(msg) {
    return '<div class="mesa-error-bar" role="alert">'
         + '<span>' + _esc(msg) + '</span>'
         + '</div>';
  }

  /* ==========================================================================
     ICONS (inline SVGs)
  ========================================================================== */
  function _svgEdit(size) {
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none"'
         + ' stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"'
         + ' aria-hidden="true">'
         + '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>'
         + '<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>'
         + '</svg>';
  }

  function _svgTrash(size) {
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none"'
         + ' stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"'
         + ' aria-hidden="true">'
         + '<polyline points="3 6 5 6 21 6"/>'
         + '<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>'
         + '<path d="M10 11v6"/><path d="M14 11v6"/>'
         + '<path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>'
         + '</svg>';
  }

  function _svgClose(size) {
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none"'
         + ' stroke="currentColor" stroke-width="1.75" stroke-linecap="round"'
         + ' aria-hidden="true">'
         + '<line x1="18" y1="6" x2="6" y2="18"/>'
         + '<line x1="6" y1="6" x2="18" y2="18"/>'
         + '</svg>';
  }

  function _svgMenu(size) {
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none"'
         + ' stroke="var(--color-text-muted)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"'
         + ' aria-hidden="true">'
         + '<line x1="8" y1="6" x2="21" y2="6"/>'
         + '<line x1="8" y1="12" x2="21" y2="12"/>'
         + '<line x1="8" y1="18" x2="21" y2="18"/>'
         + '<line x1="3" y1="6" x2="3.01" y2="6"/>'
         + '<line x1="3" y1="12" x2="3.01" y2="12"/>'
         + '<line x1="3" y1="18" x2="3.01" y2="18"/>'
         + '</svg>';
  }

  function _svgImage(size) {
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none"'
         + ' stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"'
         + ' aria-hidden="true">'
         + '<rect x="3" y="3" width="18" height="18" rx="2"/>'
         + '<circle cx="8.5" cy="8.5" r="1.5"/>'
         + '<polyline points="21 15 16 10 5 21"/>'
         + '</svg>';
  }

  /* ==========================================================================
     RENDER — entry-point called by the shell on every navigation
  ========================================================================== */
  function render(sectionEl) {
    _injectStyles();

    /* Build scaffold once per sectionEl lifetime */
    if (!sectionEl.querySelector('.mesa-menu-root')) {
      sectionEl.innerHTML = _buildScaffold();
      _wireScaffold(sectionEl);
    }

    /* If already loaded for this session keep state, just re-render panels */
    if (_restReady && _mesaRest) {
      var layoutEl = sectionEl.querySelector('#mm-layout');
      if (layoutEl) layoutEl.style.display = '';
      _renderCatList(sectionEl);
      if (_currentCat) {
        _renderItemsTable(sectionEl);
      } else if (_categories.length) {
        _selectCat(sectionEl, _categories[0].id);
      } else {
        _renderEmptyItems(sectionEl);
      }
      return;
    }

    if (_restReady && !_mesaRest) {
      /* Mesa not configured — show informative empty state */
      var loadingEl = sectionEl.querySelector('#mm-loading');
      var errEl     = sectionEl.querySelector('#mm-error');
      if (loadingEl) loadingEl.style.display = 'none';
      if (errEl) {
        errEl.style.display = '';
        errEl.innerHTML = '<div class="mesa-empty">'
          + '<div class="mesa-empty-icon" aria-hidden="true">' + _svgMenu(28) + '</div>'
          + '<p class="mesa-empty-title">Mesa restaurant not set up</p>'
          + '<p class="mesa-empty-body">Sign in to the Mesa dashboard and complete onboarding to manage your digital menu here.</p>'
          + '</div>';
      }
      return;
    }

    /* First render: show loading skeleton, then resolve mesa restaurant */
    var loadingEl2 = sectionEl.querySelector('#mm-loading');
    var errEl2     = sectionEl.querySelector('#mm-error');
    var layoutEl2  = sectionEl.querySelector('#mm-layout');
    if (loadingEl2) loadingEl2.style.display = '';
    if (errEl2)     errEl2.style.display     = 'none';
    if (layoutEl2)  layoutEl2.style.display  = 'none';

    _resolveMesaRest(function (rest, err) {
      if (err || !rest) {
        if (loadingEl2) loadingEl2.style.display = 'none';
        if (errEl2) {
          errEl2.style.display = '';
          errEl2.innerHTML = _errorHtml(err || 'Mesa restaurant not configured.');
        }
        return;
      }
      _loadCategories(sectionEl);
    });
  }

  /* ==========================================================================
     REGISTER MODULE
     Pattern from guests.js: write to both window.COV.screens AND window.PLAT.screens
     (they are the same object — index.html does `window.COV.screens = window.PLAT.screens`)
  ========================================================================== */
  window.COV  = window.COV  || {};
  window.PLAT = window.PLAT || {};
  window.COV.screens  = window.COV.screens  || {};
  window.PLAT.screens = window.PLAT.screens || {};

  var screenObj = { render: render };
  window.COV.screens['qr-menu']  = screenObj;
  window.PLAT.screens['qr-menu'] = screenObj;

}());
