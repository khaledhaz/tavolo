/* ============================================================================
   Tavolo — POS Menu Manager screen module
   Registers: window.COV.screens['pos-menu'] = window.PLAT.screens['pos-menu']
              = { render(sectionEl) }
   Tables:    mesa_menu_categories, mesa_menu_items,
              pos_modifier_groups, pos_modifiers, pos_item_modifier_groups
   Two tabs: "Menu" (categories + items + modifier-group attachments)
             "Modifiers" (modifier groups + options CRUD)
   CSS:       All classes namespaced .posmenu-*
   ============================================================================ */
(function () {
  'use strict';

  /* ==========================================================================
     CSS — injected once
  ========================================================================== */
  var CSS = '\
/* ====== ROOT ====== */\
.posmenu-root {\
  display: flex;\
  flex-direction: column;\
  gap: var(--space-5);\
  min-width: 0;\
}\
.posmenu-header {\
  display: flex;\
  align-items: center;\
  justify-content: space-between;\
  flex-wrap: wrap;\
  gap: var(--space-3);\
}\
.posmenu-title {\
  font-size: 22px;\
  font-weight: 600;\
  letter-spacing: -0.01em;\
  color: var(--color-text-primary);\
}\
\
/* ====== TABS ====== */\
.posmenu-tabs {\
  display: flex;\
  background: var(--color-surface-raised);\
  border-radius: var(--radius-full);\
  padding: 3px;\
  gap: 2px;\
  width: fit-content;\
}\
.posmenu-tab {\
  padding: 8px 20px;\
  border-radius: var(--radius-full);\
  font-size: 14px;\
  font-weight: 500;\
  color: var(--color-text-secondary);\
  background: none;\
  border: none;\
  cursor: pointer;\
  transition: background var(--duration-fast), color var(--duration-fast), box-shadow var(--duration-fast);\
  white-space: nowrap;\
  min-height: 40px;\
}\
.posmenu-tab:focus-visible {\
  outline: 2px solid var(--color-primary);\
  outline-offset: 1px;\
}\
.posmenu-tab.active {\
  background: var(--shell-copper, var(--color-primary));\
  color: #fff;\
  font-weight: 600;\
  box-shadow: var(--shadow-sm);\
}\
.posmenu-panel { display: none; }\
.posmenu-panel.active { display: block; }\
\
/* ====== TWO-PANEL LAYOUT (left list + right content) ====== */\
.posmenu-layout {\
  display: flex;\
  gap: var(--space-4);\
  min-height: 400px;\
  align-items: flex-start;\
  min-width: 0;\
}\
.posmenu-left {\
  width: 260px;\
  min-width: 200px;\
  flex-shrink: 0;\
  background: var(--color-surface);\
  border: 1px solid var(--color-border);\
  border-radius: var(--radius-lg);\
  overflow: hidden;\
}\
.posmenu-left-head {\
  padding: var(--space-4);\
  border-bottom: 1px solid var(--color-border);\
  font-size: 15px;\
  font-weight: 600;\
  color: var(--color-text-primary);\
}\
.posmenu-list {\
  padding: var(--space-2);\
}\
.posmenu-list-item {\
  display: flex;\
  align-items: center;\
  justify-content: space-between;\
  min-height: 48px;\
  padding: 0 var(--space-3);\
  border-radius: var(--radius-md);\
  cursor: pointer;\
  font-size: 14px;\
  color: var(--color-text-primary);\
  transition: background var(--duration-fast);\
  border: none;\
  background: none;\
  width: 100%;\
  text-align: left;\
  gap: var(--space-2);\
}\
.posmenu-list-item:hover { background: var(--color-surface-raised); }\
.posmenu-list-item.active {\
  background: var(--color-primary-light);\
  color: var(--color-primary);\
  border-left: 3px solid var(--color-primary);\
  padding-left: calc(var(--space-3) - 3px);\
}\
.posmenu-list-item:focus-visible {\
  outline: 2px solid var(--color-primary);\
  outline-offset: -2px;\
}\
.posmenu-list-name {\
  flex: 1;\
  overflow: hidden;\
  text-overflow: ellipsis;\
  white-space: nowrap;\
  min-width: 0;\
}\
.posmenu-list-meta {\
  display: flex;\
  align-items: center;\
  gap: var(--space-1);\
  flex-shrink: 0;\
}\
.posmenu-list-count {\
  font-size: 11px;\
  color: var(--color-text-muted);\
}\
.posmenu-add-wrap {\
  padding: var(--space-3);\
  border-top: 1px solid var(--color-border);\
}\
\
/* ====== RIGHT PANEL ====== */\
.posmenu-right {\
  flex: 1;\
  min-width: 0;\
  overflow: hidden;\
  background: var(--color-surface);\
  border: 1px solid var(--color-border);\
  border-radius: var(--radius-lg);\
}\
.posmenu-right-head {\
  padding: var(--space-4);\
  border-bottom: 1px solid var(--color-border);\
  display: flex;\
  align-items: center;\
  justify-content: space-between;\
  gap: var(--space-3);\
  flex-wrap: wrap;\
}\
.posmenu-right-title {\
  font-size: 17px;\
  font-weight: 600;\
  color: var(--color-text-primary);\
  overflow: hidden;\
  text-overflow: ellipsis;\
  white-space: nowrap;\
  min-width: 0;\
}\
.posmenu-right-body {\
  overflow-x: auto;\
  -webkit-overflow-scrolling: touch;\
}\
\
/* ====== DATA TABLE ====== */\
.posmenu-table {\
  width: 100%;\
  border-collapse: collapse;\
  min-width: 420px;\
  table-layout: fixed;\
}\
.posmenu-table th {\
  font-size: 11px;\
  font-weight: 600;\
  letter-spacing: 0.08em;\
  text-transform: uppercase;\
  color: var(--color-text-muted);\
  padding: var(--space-3) var(--space-4);\
  text-align: left;\
  border-bottom: 1px solid var(--color-border);\
}\
.posmenu-table td {\
  padding: var(--space-3) var(--space-4);\
  border-bottom: 1px solid var(--color-border);\
  font-size: 14px;\
  color: var(--color-text-primary);\
  vertical-align: middle;\
}\
.posmenu-table tr:last-child td { border-bottom: none; }\
.posmenu-table tbody tr:hover td { background: var(--color-surface-raised); }\
.posmenu-item-thumb {\
  width: 48px;\
  height: 48px;\
  border-radius: var(--radius-sm);\
  object-fit: cover;\
  border: 1px solid var(--color-border);\
  display: block;\
}\
.posmenu-item-thumb-ph {\
  width: 48px;\
  height: 48px;\
  border-radius: var(--radius-sm);\
  background: var(--color-surface-raised);\
  border: 1px solid var(--color-border);\
  display: flex;\
  align-items: center;\
  justify-content: center;\
  color: var(--color-text-muted);\
  flex-shrink: 0;\
}\
.posmenu-item-name {\
  font-size: 14px;\
  font-weight: 500;\
  overflow: hidden;\
  text-overflow: ellipsis;\
  white-space: nowrap;\
  min-width: 0;\
}\
.posmenu-item-desc {\
  font-size: 12px;\
  color: var(--color-text-muted);\
  overflow: hidden;\
  display: -webkit-box;\
  -webkit-line-clamp: 1;\
  -webkit-box-orient: vertical;\
  min-width: 0;\
}\
.posmenu-price {\
  font-weight: 600;\
  font-variant-numeric: tabular-nums;\
  white-space: nowrap;\
}\
.posmenu-allergen-chip {\
  display: inline-flex;\
  align-items: center;\
  padding: 1px 7px;\
  border-radius: var(--radius-full);\
  font-size: 11px;\
  font-weight: 500;\
  background: var(--color-surface-raised);\
  border: 1px solid var(--color-border);\
  color: var(--color-text-secondary);\
  margin: 1px 2px 1px 0;\
}\
.posmenu-mod-tag {\
  display: inline-flex;\
  align-items: center;\
  padding: 1px 8px;\
  border-radius: var(--radius-full);\
  font-size: 11px;\
  font-weight: 500;\
  background: rgba(194,112,61,.10);\
  border: 1px solid rgba(194,112,61,.25);\
  color: var(--shell-copper, var(--color-primary));\
  margin: 1px 2px 1px 0;\
  white-space: nowrap;\
}\
\
/* ====== TOGGLE ====== */\
.posmenu-toggle {\
  position: relative;\
  width: 44px;\
  height: 24px;\
  flex-shrink: 0;\
  display: inline-flex;\
}\
.posmenu-toggle input {\
  opacity: 0;\
  width: 0;\
  height: 0;\
  position: absolute;\
}\
.posmenu-toggle-track {\
  position: absolute;\
  inset: 0;\
  background: var(--color-border);\
  border-radius: var(--radius-full);\
  cursor: pointer;\
  transition: background var(--duration-fast);\
}\
.posmenu-toggle input:checked + .posmenu-toggle-track { background: var(--color-success); }\
.posmenu-toggle-thumb {\
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
.posmenu-toggle input:checked ~ .posmenu-toggle-thumb { transform: translateX(20px); }\
.posmenu-toggle input:focus-visible + .posmenu-toggle-track {\
  outline: 2px solid var(--color-primary);\
  outline-offset: 2px;\
}\
\
/* ====== ICON BUTTONS ====== */\
.posmenu-icon-btn {\
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
  flex-shrink: 0;\
}\
.posmenu-icon-btn:hover {\
  color: var(--color-text-primary);\
  background: var(--color-surface-raised);\
}\
.posmenu-icon-btn:active { transform: scale(0.92); }\
.posmenu-icon-btn:focus-visible {\
  outline: 2px solid var(--color-primary);\
  outline-offset: 2px;\
}\
.posmenu-icon-btn.danger { color: var(--color-destructive); border-color: transparent; }\
.posmenu-icon-btn.danger:hover { background: var(--color-destructive-light); border-color: var(--color-destructive); }\
.posmenu-actions-cell {\
  white-space: nowrap;\
  display: flex;\
  gap: var(--space-1);\
  align-items: center;\
}\
\
/* ====== EMPTY / ERROR / SKELETON ====== */\
.posmenu-empty {\
  display: flex;\
  flex-direction: column;\
  align-items: center;\
  justify-content: center;\
  padding: var(--space-12) var(--space-5);\
  text-align: center;\
}\
.posmenu-empty-icon {\
  width: 56px;\
  height: 56px;\
  border-radius: var(--radius-xl);\
  background: var(--color-surface-raised);\
  border: 1px solid var(--color-border);\
  display: flex;\
  align-items: center;\
  justify-content: center;\
  margin: 0 auto var(--space-4);\
}\
.posmenu-empty-title {\
  font-size: 16px;\
  font-weight: 600;\
  color: var(--color-text-primary);\
  margin-bottom: var(--space-2);\
}\
.posmenu-empty-body {\
  font-size: 14px;\
  color: var(--color-text-secondary);\
  max-width: 300px;\
  line-height: 1.6;\
}\
.posmenu-skeleton {\
  background: linear-gradient(90deg, var(--color-surface-raised) 25%, var(--color-border) 50%, var(--color-surface-raised) 75%);\
  background-size: 800px 100%;\
  animation: posmenu-shimmer 1.4s infinite linear;\
  border-radius: var(--radius-md);\
}\
@keyframes posmenu-shimmer {\
  0%   { background-position: -400px 0; }\
  100% { background-position:  400px 0; }\
}\
@media (prefers-reduced-motion: reduce) {\
  .posmenu-skeleton { animation: none; background: var(--color-surface-raised); }\
}\
.posmenu-error-bar {\
  background: var(--color-destructive-light);\
  color: var(--color-destructive);\
  border: 1px solid rgba(181,59,47,.2);\
  border-radius: var(--radius-md);\
  padding: var(--space-3) var(--space-4);\
  font-size: 14px;\
  margin: var(--space-4);\
}\
\
/* ====== DRAWER ====== */\
.posmenu-drawer-overlay {\
  position: fixed;\
  inset: 0;\
  background: var(--color-overlay);\
  z-index: 400;\
  display: none;\
}\
.posmenu-drawer-overlay.open { display: block; }\
.posmenu-drawer {\
  position: fixed;\
  top: 0;\
  right: 0;\
  width: 440px;\
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
.posmenu-drawer.open { transform: translateX(0); }\
.posmenu-drawer-head {\
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
.posmenu-drawer-title {\
  font-size: 18px;\
  font-weight: 600;\
  color: var(--color-text-primary);\
}\
.posmenu-drawer-body {\
  padding: var(--space-5);\
  flex: 1;\
  overflow-y: auto;\
  display: flex;\
  flex-direction: column;\
  gap: var(--space-4);\
}\
.posmenu-drawer-foot {\
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
.posmenu-field {\
  display: flex;\
  flex-direction: column;\
  gap: var(--space-1);\
}\
.posmenu-label {\
  font-size: 13px;\
  font-weight: 500;\
  color: var(--color-text-secondary);\
}\
.posmenu-input {\
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
.posmenu-input:focus {\
  outline: none;\
  border-color: var(--color-primary);\
  box-shadow: 0 0 0 3px var(--color-primary-light);\
}\
.posmenu-input::placeholder { color: var(--color-text-muted); }\
.posmenu-textarea {\
  min-height: 72px;\
  resize: vertical;\
  line-height: 1.5;\
}\
.posmenu-avail-row {\
  display: flex;\
  align-items: center;\
  gap: var(--space-3);\
}\
.posmenu-avail-label {\
  font-size: 14px;\
  font-weight: 500;\
  color: var(--color-text-primary);\
}\
.posmenu-row-2 {\
  display: grid;\
  grid-template-columns: 1fr 1fr;\
  gap: var(--space-3);\
}\
\
/* ====== MODAL ====== */\
.posmenu-modal-overlay {\
  position: fixed;\
  inset: 0;\
  background: var(--color-overlay);\
  z-index: 500;\
  display: none;\
  align-items: center;\
  justify-content: center;\
  padding: var(--space-4);\
}\
.posmenu-modal-overlay.open { display: flex; }\
.posmenu-modal {\
  background: var(--color-surface);\
  border-radius: var(--radius-xl);\
  padding: var(--space-6) var(--space-7);\
  width: 100%;\
  max-width: 400px;\
  box-shadow: var(--shadow-xl);\
}\
.posmenu-modal-head {\
  display: flex;\
  align-items: center;\
  justify-content: space-between;\
  margin-bottom: var(--space-5);\
}\
.posmenu-modal-title {\
  font-size: 17px;\
  font-weight: 600;\
  color: var(--color-text-primary);\
}\
.posmenu-modal-foot {\
  display: flex;\
  gap: var(--space-3);\
  margin-top: var(--space-5);\
}\
\
/* ====== MODIFIER OPTION ROWS (inline mini-table inside group) ====== */\
.posmenu-opts-section {\
  border-top: 1px solid var(--color-border);\
  padding: var(--space-3) var(--space-4);\
  background: var(--color-surface-raised);\
}\
.posmenu-opts-title {\
  font-size: 12px;\
  font-weight: 600;\
  letter-spacing: 0.06em;\
  text-transform: uppercase;\
  color: var(--color-text-muted);\
  margin-bottom: var(--space-2);\
}\
.posmenu-opt-row {\
  display: flex;\
  align-items: center;\
  gap: var(--space-3);\
  padding: var(--space-2) 0;\
  border-bottom: 1px solid var(--color-border);\
  font-size: 14px;\
}\
.posmenu-opt-row:last-child { border-bottom: none; }\
.posmenu-opt-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\
.posmenu-opt-price {\
  font-variant-numeric: tabular-nums;\
  font-weight: 500;\
  color: var(--color-text-secondary);\
  white-space: nowrap;\
  flex-shrink: 0;\
}\
\
/* ====== BADGE ====== */\
.posmenu-badge {\
  display: inline-flex;\
  align-items: center;\
  padding: 2px 8px;\
  border-radius: var(--radius-full);\
  font-size: 11px;\
  font-weight: 600;\
  letter-spacing: 0.04em;\
}\
.posmenu-badge-req {\
  background: rgba(194,112,61,.12);\
  color: var(--shell-copper, #c2703d);\
  border: 1px solid rgba(194,112,61,.25);\
}\
.posmenu-badge-opt {\
  background: var(--color-surface-raised);\
  color: var(--color-text-muted);\
  border: 1px solid var(--color-border);\
}\
\
/* ====== PHOTO ====== */\
.posmenu-photo-preview-wrap {\
  position: relative;\
  width: fit-content;\
  margin-bottom: var(--space-2);\
}\
.posmenu-photo-preview {\
  width: 110px;\
  height: 110px;\
  object-fit: cover;\
  border-radius: var(--radius-md);\
  border: 1px solid var(--color-border);\
  display: block;\
}\
.posmenu-photo-remove {\
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
  padding: 0;\
}\
.posmenu-photo-remove:focus-visible {\
  outline: 2px solid var(--color-primary);\
  outline-offset: 2px;\
}\
\
/* ====== MODIFIER ATTACH CHECKLIST (inside item drawer) ====== */\
.posmenu-modcheck-list {\
  display: flex;\
  flex-direction: column;\
  gap: var(--space-2);\
  max-height: 220px;\
  overflow-y: auto;\
  border: 1px solid var(--color-border);\
  border-radius: var(--radius-md);\
  padding: var(--space-2);\
}\
.posmenu-modcheck-item {\
  display: flex;\
  align-items: center;\
  gap: var(--space-2);\
  padding: var(--space-2) var(--space-2);\
  border-radius: var(--radius-sm);\
  cursor: pointer;\
  transition: background var(--duration-fast);\
}\
.posmenu-modcheck-item:hover { background: var(--color-surface-raised); }\
.posmenu-modcheck-item input[type="checkbox"] {\
  width: 18px;\
  height: 18px;\
  accent-color: var(--shell-copper, var(--color-primary));\
  cursor: pointer;\
  flex-shrink: 0;\
}\
.posmenu-modcheck-label {\
  font-size: 14px;\
  color: var(--color-text-primary);\
  flex: 1;\
  min-width: 0;\
}\
.posmenu-modcheck-sub {\
  font-size: 11px;\
  color: var(--color-text-muted);\
  white-space: nowrap;\
}\
\
/* ====== TOAST ====== */\
#posmenu-toast {\
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
#posmenu-toast .posmenu-toast-item {\
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
  white-space: nowrap;\
}\
#posmenu-toast .posmenu-toast-item.ok  { background: var(--color-success); }\
#posmenu-toast .posmenu-toast-item.err { background: var(--color-destructive); }\
#posmenu-toast .posmenu-toast-item.visible { opacity: 1; transform: translateY(0); }\
\
/* ====== RESPONSIVE ====== */\
@media (max-width: 1023px) {\
  .posmenu-layout { flex-direction: column; }\
  .posmenu-left { width: 100%; }\
  .posmenu-right { min-width: 0; }\
}\
@media (max-width: 599px) {\
  .posmenu-header { flex-direction: column; align-items: flex-start; }\
  .posmenu-tabs { width: 100%; }\
  .posmenu-tab { flex: 1; text-align: center; }\
  .posmenu-drawer { width: 100%; border-radius: var(--radius-xl) var(--radius-xl) 0 0; top: auto; bottom: 0; height: 92vh; }\
  .posmenu-drawer.open  { transform: translateY(0); }\
  .posmenu-drawer:not(.open) { transform: translateY(100%); }\
  .posmenu-drawer-overlay.open { display: flex; align-items: flex-end; }\
  .posmenu-modal { max-width: calc(100vw - 32px); }\
  .posmenu-modal-foot { flex-wrap: wrap; }\
  .posmenu-modal-foot .btn { flex: 1; min-width: 80px; }\
  .posmenu-row-2 { grid-template-columns: 1fr; }\
}\
';

  /* ==========================================================================
     MODULE STATE
  ========================================================================== */
  var _styleInjected = false;
  var _rid = 'a1000000-0000-0000-0000-000000000001'; /* demo restaurant — overridden once auth resolves */

  /* Shared restaurant row */
  var _restRow   = null;
  var _restReady = false;
  var _restError = null;

  /* Menu tab state */
  var _categories  = [];
  var _items       = [];         /* items for selected category */
  var _currentCat  = null;       /* selected category id */
  var _modGroups   = [];         /* all pos_modifier_groups for this restaurant */

  /* Item drawer state */
  var _drawerItem     = null;    /* null = add mode; row = edit mode */
  var _drawerPhotoUrl = '';
  var _drawerModIds   = {};      /* groupId → bool; which groups are attached to this item */

  /* Modifiers tab state */
  var _currentGroup = null;      /* selected modifier group id */
  var _groupOptions = [];        /* pos_modifiers for selected group */

  /* ==========================================================================
     UTILS
  ========================================================================== */
  var _esc = (window.PLAT && window.PLAT.utils && window.PLAT.utils.esc) || function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var _money = (window.PLAT && window.PLAT.utils && window.PLAT.utils.money) || function (cents, cur) {
    var syms = { USD: '$', GBP: '£', EUR: '€', AED: 'AED ', SAR: 'SAR ' };
    var sym = syms[cur || 'USD'] || ((cur || '') + ' ');
    return sym + (Number(cents || 0) / 100).toFixed(2);
  };
  function _client() { return window.PLAT && window.PLAT.client; }

  /* ==========================================================================
     TOAST
  ========================================================================== */
  function _toast(msg, kind) {
    var host = document.getElementById('posmenu-toast');
    if (!host) {
      host = document.createElement('div');
      host.id = 'posmenu-toast';
      host.setAttribute('role', 'status');
      host.setAttribute('aria-live', 'polite');
      document.body.appendChild(host);
    }
    var item = document.createElement('div');
    item.className = 'posmenu-toast-item' + (kind ? ' ' + kind : '');
    item.textContent = msg;
    host.appendChild(item);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { item.classList.add('visible'); });
    });
    setTimeout(function () {
      item.style.transition = 'opacity .25s, transform .25s';
      item.style.opacity = '0';
      item.style.transform = 'translateY(12px)';
      setTimeout(function () { if (item.parentNode) item.parentNode.removeChild(item); }, 270);
    }, 3000);
  }

  /* ==========================================================================
     STYLE INJECTION
  ========================================================================== */
  function _injectStyles() {
    if (_styleInjected) return;
    _styleInjected = true;
    if (document.getElementById('posmenu-css')) return;
    var s = document.createElement('style');
    s.id = 'posmenu-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ==========================================================================
     RESTAURANT RESOLUTION (cached)
  ========================================================================== */
  function _resolveRest(cb) {
    if (_restReady) { cb(_restRow, _restError); return; }
    var sb = _client();
    if (!sb) { _restReady = true; _restError = 'Supabase client not available.'; cb(null, _restError); return; }
    sb.from('mesa_restaurants').select('*').limit(1).maybeSingle()
      .then(function (res) {
        _restReady = true;
        if (res.error || !res.data) {
          _restError = 'Could not load restaurant.';
          console.error('[pos-menu] restaurant fetch error', res.error);
          cb(null, _restError);
        } else {
          _restRow = res.data;
          _rid = res.data.id;
          cb(res.data, null);
        }
      })
      .catch(function (err) {
        _restReady = true;
        _restError = 'Could not load restaurant.';
        console.error('[pos-menu] restaurant fetch throw', err);
        cb(null, _restError);
      });
  }

  /* ==========================================================================
     ICONS
  ========================================================================== */
  function _svgEdit(size) {
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none"'
      + ' stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
      + '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>'
      + '<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>'
      + '</svg>';
  }
  function _svgTrash(size) {
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none"'
      + ' stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
      + '<polyline points="3 6 5 6 21 6"/>'
      + '<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>'
      + '<path d="M10 11v6"/><path d="M14 11v6"/>'
      + '<path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>'
      + '</svg>';
  }
  function _svgClose(size) {
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none"'
      + ' stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true">'
      + '<line x1="18" y1="6" x2="6" y2="18"/>'
      + '<line x1="6" y1="6" x2="18" y2="18"/>'
      + '</svg>';
  }
  function _svgMenu(size) {
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none"'
      + ' stroke="var(--color-text-muted)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
      + '<line x1="8" y1="6" x2="21" y2="6"/>'
      + '<line x1="8" y1="12" x2="21" y2="12"/>'
      + '<line x1="8" y1="18" x2="21" y2="18"/>'
      + '<line x1="3" y1="6" x2="3.01" y2="6"/>'
      + '<line x1="3" y1="12" x2="3.01" y2="12"/>'
      + '<line x1="3" y1="18" x2="3.01" y2="18"/>'
      + '</svg>';
  }
  function _svgSliders(size) {
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none"'
      + ' stroke="var(--color-text-muted)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
      + '<line x1="4" y1="21" x2="4" y2="14"/>'
      + '<line x1="4" y1="10" x2="4" y2="3"/>'
      + '<line x1="12" y1="21" x2="12" y2="12"/>'
      + '<line x1="12" y1="8" x2="12" y2="3"/>'
      + '<line x1="20" y1="21" x2="20" y2="16"/>'
      + '<line x1="20" y1="12" x2="20" y2="3"/>'
      + '<line x1="1" y1="14" x2="7" y2="14"/>'
      + '<line x1="9" y1="8" x2="15" y2="8"/>'
      + '<line x1="17" y1="16" x2="23" y2="16"/>'
      + '</svg>';
  }
  function _svgImage(size) {
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none"'
      + ' stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
      + '<rect x="3" y="3" width="18" height="18" rx="2"/>'
      + '<circle cx="8.5" cy="8.5" r="1.5"/>'
      + '<polyline points="21 15 16 10 5 21"/>'
      + '</svg>';
  }
  function _svgPlus(size) {
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none"'
      + ' stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">'
      + '<line x1="12" y1="5" x2="12" y2="19"/>'
      + '<line x1="5" y1="12" x2="19" y2="12"/>'
      + '</svg>';
  }

  /* ==========================================================================
     ERROR HTML
  ========================================================================== */
  function _errorHtml(msg) {
    return '<div class="posmenu-error-bar" role="alert"><span>' + _esc(msg) + '</span></div>';
  }

  /* ==========================================================================
     SKELETON HELPERS
  ========================================================================== */
  function _listSkeletons(n) {
    var html = '';
    for (var i = 0; i < n; i++) {
      html += '<div aria-hidden="true" style="display:flex;align-items:center;gap:var(--space-2);padding:var(--space-3)">'
        + '<div class="posmenu-skeleton" style="height:13px;flex:1;border-radius:3px"></div>'
        + '</div>';
    }
    return html;
  }

  /* ============================================================================
     ██████████████████  MENU TAB  ██████████████████
  ============================================================================ */

  /* ---------- MODIFIER GROUPS LOAD (shared by both tabs) ---------- */
  function _loadModGroups(cb) {
    var sb = _client();
    if (!sb) { if (cb) cb([]); return; }
    sb.from('pos_modifier_groups').select('*').eq('restaurant_id', _rid)
      .order('sort', { ascending: true }).order('name', { ascending: true })
      .then(function (res) {
        _modGroups = (res.data || []);
        if (cb) cb(_modGroups);
      })
      .catch(function () { if (cb) cb([]); });
  }

  /* ---------- CATEGORY LIST ---------- */
  function _renderCatList(sectionEl) {
    var listEl = sectionEl.querySelector('#pm-cat-list');
    if (!listEl) return;
    if (!_categories.length) {
      listEl.innerHTML = '<p style="padding:var(--space-4);font-size:14px;color:var(--color-text-muted)">No categories yet.</p>';
      return;
    }
    var html = _categories.map(function (c) {
      var count = _items.filter(function (i) { return i.category_id === c.id; }).length;
      var active = _currentCat === c.id ? ' active' : '';
      return '<div class="posmenu-list-item' + active + '" role="button" tabindex="0"'
        + ' data-cid="' + _esc(c.id) + '"'
        + ' aria-label="' + _esc(c.name) + ', ' + count + ' items' + (active ? ', selected' : '') + '">'
        + '<span class="posmenu-list-name">' + _esc(c.name) + '</span>'
        + '<span class="posmenu-list-meta">'
        + '<span class="posmenu-list-count">' + count + '</span>'
        + '<button class="posmenu-icon-btn" data-cid="' + _esc(c.id) + '" aria-label="Edit category ' + _esc(c.name) + '"'
        + ' style="width:28px;height:28px;flex-shrink:0">' + _svgEdit(13) + '</button>'
        + '</span>'
        + '</div>';
    }).join('');
    listEl.innerHTML = html;

    listEl.querySelectorAll('.posmenu-list-item').forEach(function (el) {
      function selectThis() { _selectCat(sectionEl, el.dataset.cid); }
      el.addEventListener('click', function (e) {
        if (e.target.closest('.posmenu-icon-btn')) return;
        selectThis();
      });
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectThis(); }
      });
    });
    listEl.querySelectorAll('.posmenu-icon-btn[data-cid]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var cat = _categories.find(function (c) { return c.id === btn.dataset.cid; });
        if (cat) _openCatModal(sectionEl, cat);
      });
    });
  }

  /* ---------- SELECT CATEGORY ---------- */
  function _selectCat(sectionEl, cid) {
    _currentCat = cid;
    var cat = _categories.find(function (c) { return c.id === cid; }) || null;
    var titleEl = sectionEl.querySelector('#pm-items-title');
    if (titleEl) titleEl.textContent = cat ? cat.name : 'Items';
    var addBtn = sectionEl.querySelector('#pm-add-item-btn');
    if (addBtn) addBtn.style.display = 'inline-flex';
    _renderCatList(sectionEl);

    var bodyEl = sectionEl.querySelector('#pm-items-body');
    if (bodyEl) bodyEl.innerHTML = '<div style="padding:var(--space-4)" aria-hidden="true">'
      + '<div class="posmenu-skeleton" style="height:52px;margin-bottom:8px;border-radius:var(--radius-md)"></div>'
      + '<div class="posmenu-skeleton" style="height:52px;margin-bottom:8px;border-radius:var(--radius-md)"></div>'
      + '<div class="posmenu-skeleton" style="height:52px;border-radius:var(--radius-md)"></div>'
      + '</div>';

    var sb = _client();
    if (!sb) { if (bodyEl) bodyEl.innerHTML = _errorHtml('Client not ready.'); return; }
    sb.from('mesa_menu_items').select('*').eq('category_id', cid)
      .order('sort', { ascending: true }).order('name', { ascending: true })
      .then(function (res) {
        if (res.error) { if (bodyEl) bodyEl.innerHTML = _errorHtml('Could not load items.'); return; }
        _items = res.data || [];
        _renderItemsTable(sectionEl);
        _renderCatList(sectionEl);
      })
      .catch(function () { if (bodyEl) bodyEl.innerHTML = _errorHtml('Could not load items.'); });
  }

  /* ---------- ITEMS TABLE ---------- */
  function _renderItemsTable(sectionEl) {
    var bodyEl = sectionEl.querySelector('#pm-items-body');
    if (!bodyEl) return;
    var cur = (_restRow && _restRow.currency) || 'USD';

    if (!_items.length) {
      bodyEl.innerHTML = '<div class="posmenu-empty">'
        + '<div class="posmenu-empty-icon" aria-hidden="true">' + _svgMenu(24) + '</div>'
        + '<p class="posmenu-empty-title">No items yet</p>'
        + '<p class="posmenu-empty-body">Add your first item to this category.</p>'
        + '</div>';
      return;
    }

    var sb = _client();

    /* Load which modifier groups are attached to all items in this category */
    var itemIds = _items.map(function (i) { return i.id; });
    var attachedPromise = sb
      ? sb.from('pos_item_modifier_groups').select('menu_item_id,group_id').in('menu_item_id', itemIds)
        .then(function (r) { return r.data || []; })
        .catch(function () { return []; })
      : Promise.resolve([]);

    attachedPromise.then(function (links) {
      /* Build a map: itemId → [groupId, …] */
      var itemGroupMap = {};
      links.forEach(function (lnk) {
        if (!itemGroupMap[lnk.menu_item_id]) itemGroupMap[lnk.menu_item_id] = [];
        itemGroupMap[lnk.menu_item_id].push(lnk.group_id);
      });

      var rows = _items.map(function (item) {
        var allergens = (item.allergens || []).map(function (a) {
          return '<span class="posmenu-allergen-chip">' + _esc(a) + '</span>';
        }).join('');

        var attachedGroups = itemGroupMap[item.id] || [];
        var modTags = attachedGroups.map(function (gid) {
          var grp = _modGroups.find(function (g) { return g.id === gid; });
          return grp ? '<span class="posmenu-mod-tag">' + _esc(grp.name) + '</span>' : '';
        }).join('');

        var thumbHtml = item.photo_url
          ? '<img class="posmenu-item-thumb" src="' + _esc(item.photo_url) + '" alt="' + _esc(item.name) + '">'
          : '<div class="posmenu-item-thumb-ph" aria-hidden="true">' + _svgImage(18) + '</div>';

        return '<tr>'
          + '<td style="width:56px;padding:var(--space-3) var(--space-4)">' + thumbHtml + '</td>'
          + '<td style="min-width:0;max-width:240px">'
          +   '<div class="posmenu-item-name">' + _esc(item.name) + '</div>'
          +   (item.description ? '<div class="posmenu-item-desc">' + _esc(item.description) + '</div>' : '')
          +   (allergens ? '<div style="margin-top:3px">' + allergens + '</div>' : '')
          +   (modTags ? '<div style="margin-top:3px">' + modTags + '</div>' : '')
          + '</td>'
          + '<td style="width:80px"><span class="posmenu-price">' + _money(item.price_cents, cur) + '</span></td>'
          + '<td style="width:80px">'
          +   '<label class="posmenu-toggle" aria-label="Toggle availability for ' + _esc(item.name) + '">'
          +     '<input type="checkbox"' + (item.is_available ? ' checked' : '') + ' data-iid="' + _esc(item.id) + '">'
          +     '<span class="posmenu-toggle-track"></span>'
          +     '<span class="posmenu-toggle-thumb"></span>'
          +   '</label>'
          + '</td>'
          + '<td style="width:76px">'
          +   '<div class="posmenu-actions-cell">'
          +     '<button class="posmenu-icon-btn pm-edit-item" data-iid="' + _esc(item.id) + '"'
          +       ' aria-label="Edit ' + _esc(item.name) + '">' + _svgEdit(15) + '</button>'
          +     '<button class="posmenu-icon-btn danger pm-del-item" data-iid="' + _esc(item.id) + '"'
          +       ' data-name="' + _esc(item.name) + '"'
          +       ' aria-label="Delete ' + _esc(item.name) + '">' + _svgTrash(15) + '</button>'
          +   '</div>'
          + '</td>'
          + '</tr>';
      }).join('');

      bodyEl.innerHTML = '<div style="overflow-x:auto">'
        + '<table class="posmenu-table">'
        + '<thead><tr>'
        + '<th scope="col"></th>'
        + '<th scope="col">Item</th>'
        + '<th scope="col">Price</th>'
        + '<th scope="col">Avail.</th>'
        + '<th scope="col">Actions</th>'
        + '</tr></thead>'
        + '<tbody>' + rows + '</tbody>'
        + '</table></div>';

      /* Wire toggles */
      bodyEl.querySelectorAll('input[type="checkbox"][data-iid]').forEach(function (inp) {
        inp.addEventListener('change', function () {
          var newVal = inp.checked;
          var sbC = _client();
          if (!sbC) { inp.checked = !newVal; return; }
          sbC.from('mesa_menu_items').update({ is_available: newVal }).eq('id', inp.dataset.iid)
            .then(function (r) {
              if (r.error) { _toast('Failed to update availability.', 'err'); inp.checked = !newVal; return; }
              var found = _items.find(function (i) { return i.id === inp.dataset.iid; });
              if (found) found.is_available = newVal;
            });
        });
      });

      /* Wire edit buttons */
      bodyEl.querySelectorAll('.pm-edit-item').forEach(function (btn) {
        btn.addEventListener('click', function () { _openItemDrawer(sectionEl, btn.dataset.iid); });
      });

      /* Wire delete buttons */
      bodyEl.querySelectorAll('.pm-del-item').forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (!confirm('Delete "' + btn.dataset.name + '"? This cannot be undone.')) return;
          var sbC = _client();
          if (!sbC) { _toast('Client not ready.', 'err'); return; }
          sbC.from('mesa_menu_items').delete().eq('id', btn.dataset.iid)
            .then(function (r) {
              if (r.error) { _toast('Error deleting item.', 'err'); return; }
              _items = _items.filter(function (i) { return i.id !== btn.dataset.iid; });
              _renderItemsTable(sectionEl);
              _renderCatList(sectionEl);
              _toast('Item deleted.', 'ok');
            });
        });
      });
    });
  }

  /* ---------- CATEGORY MODAL ---------- */
  function _openCatModal(sectionEl, cat) {
    var overlay = sectionEl.querySelector('#pm-cat-modal-overlay');
    if (!overlay) return;
    var idInp   = sectionEl.querySelector('#pm-cat-id');
    var nameInp = sectionEl.querySelector('#pm-cat-name');
    var title   = sectionEl.querySelector('#pm-cat-modal-title');
    var delBtn  = sectionEl.querySelector('#pm-cat-del-btn');
    if (cat) {
      if (idInp)   idInp.value   = cat.id;
      if (nameInp) nameInp.value = cat.name;
      if (title)   title.textContent = 'Edit category';
      if (delBtn)  delBtn.style.display = 'inline-flex';
    } else {
      if (idInp)   idInp.value   = '';
      if (nameInp) nameInp.value = '';
      if (title)   title.textContent = 'Add category';
      if (delBtn)  delBtn.style.display = 'none';
    }
    overlay.classList.add('open');
    setTimeout(function () { if (nameInp) nameInp.focus(); }, 50);
  }
  function _closeCatModal(sectionEl) {
    var overlay = sectionEl.querySelector('#pm-cat-modal-overlay');
    if (overlay) overlay.classList.remove('open');
  }
  function _wireCatModal(sectionEl) {
    var overlay    = sectionEl.querySelector('#pm-cat-modal-overlay');
    var saveBtn    = sectionEl.querySelector('#pm-cat-save-btn');
    var delBtn     = sectionEl.querySelector('#pm-cat-del-btn');
    var cancelBtn  = sectionEl.querySelector('#pm-cat-cancel-btn');
    var closeBtn   = sectionEl.querySelector('#pm-cat-modal-close');
    var nameInp    = sectionEl.querySelector('#pm-cat-name');
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
        var id   = sectionEl.querySelector('#pm-cat-id').value;
        var name = (sectionEl.querySelector('#pm-cat-name').value || '').trim();
        if (!name) { _toast('Enter a category name.', 'err'); return; }
        var sb = _client();
        if (!sb) { _toast('Client not ready.', 'err'); return; }
        saveBtn.disabled = true;
        if (!id) {
          sb.from('mesa_menu_categories')
            .insert({ restaurant_id: _rid, name: name, sort: _categories.length })
            .select('*').single()
            .then(function (r) {
              saveBtn.disabled = false;
              if (r.error) { _toast('Error adding category.', 'err'); return; }
              _categories.push(r.data);
              _closeCatModal(sectionEl);
              _renderCatList(sectionEl);
              _selectCat(sectionEl, r.data.id);
              _toast('Category added.', 'ok');
            });
        } else {
          sb.from('mesa_menu_categories').update({ name: name }).eq('id', id)
            .then(function (r) {
              saveBtn.disabled = false;
              if (r.error) { _toast('Error renaming category.', 'err'); return; }
              var c = _categories.find(function (c) { return c.id === id; });
              if (c) c.name = name;
              _closeCatModal(sectionEl);
              _renderCatList(sectionEl);
              if (_currentCat === id) {
                var titleEl = sectionEl.querySelector('#pm-items-title');
                if (titleEl) titleEl.textContent = name;
              }
              _toast('Category renamed.', 'ok');
            });
        }
      });
    }
    if (delBtn) {
      delBtn.addEventListener('click', function () {
        var id  = sectionEl.querySelector('#pm-cat-id').value;
        if (!id) return;
        var cat = _categories.find(function (c) { return c.id === id; });
        var lbl = cat ? cat.name : 'this category';
        if (!confirm('Delete "' + lbl + '"? All items in it will also be deleted.')) return;
        var sb = _client();
        if (!sb) { _toast('Client not ready.', 'err'); return; }
        delBtn.disabled = true;
        /* Delete items first (no ON DELETE CASCADE on the FK), then the category */
        sb.from('mesa_menu_items').delete().eq('category_id', id)
          .then(function () {
            return sb.from('mesa_menu_categories').delete().eq('id', id);
          })
          .then(function (r) {
            delBtn.disabled = false;
            if (r.error) { _toast('Error deleting category.', 'err'); return; }
            _categories = _categories.filter(function (c) { return c.id !== id; });
            _items = _items.filter(function (i) { return i.category_id !== id; });
            if (_currentCat === id) _currentCat = null;
            _closeCatModal(sectionEl);
            _renderCatList(sectionEl);
            if (_categories.length) {
              _selectCat(sectionEl, _categories[0].id);
            } else {
              _renderEmptyItems(sectionEl);
              var addBtn = sectionEl.querySelector('#pm-add-item-btn');
              if (addBtn) addBtn.style.display = 'none';
            }
            _toast('Category deleted.', 'ok');
          })
          .catch(function () {
            delBtn.disabled = false;
            _toast('Error deleting category.', 'err');
          });
      });
    }
  }

  function _renderEmptyItems(sectionEl) {
    var bodyEl  = sectionEl.querySelector('#pm-items-body');
    var titleEl = sectionEl.querySelector('#pm-items-title');
    if (titleEl) titleEl.textContent = 'Select a category';
    if (bodyEl) {
      bodyEl.innerHTML = '<div class="posmenu-empty">'
        + '<div class="posmenu-empty-icon" aria-hidden="true">' + _svgMenu(24) + '</div>'
        + '<p class="posmenu-empty-title">Select a category</p>'
        + '<p class="posmenu-empty-body">Choose a category from the left to manage its items.</p>'
        + '</div>';
    }
  }

  /* ---------- ITEM DRAWER ---------- */
  function _openItemDrawer(sectionEl, itemId) {
    var item = itemId ? _items.find(function (i) { return i.id === itemId; }) : null;
    _drawerItem     = item || null;
    _drawerPhotoUrl = item ? (item.photo_url || '') : '';
    _drawerModIds   = {};

    var titleEl     = sectionEl.querySelector('#pm-drawer-title');
    var nameInp     = sectionEl.querySelector('#pm-item-name');
    var descInp     = sectionEl.querySelector('#pm-item-desc');
    var priceInp    = sectionEl.querySelector('#pm-item-price');
    var allergenInp = sectionEl.querySelector('#pm-item-allergens');
    var availInp    = sectionEl.querySelector('#pm-item-avail');
    var pasteInp    = sectionEl.querySelector('#pm-item-paste-url');
    var fileInp     = sectionEl.querySelector('#pm-item-file');
    var prevWrap    = sectionEl.querySelector('#pm-photo-preview-wrap');
    var prevImg     = sectionEl.querySelector('#pm-photo-preview');

    if (titleEl)     titleEl.textContent  = item ? 'Edit item' : 'Add item';
    if (nameInp)     nameInp.value        = item ? item.name : '';
    if (descInp)     descInp.value        = item ? (item.description || '') : '';
    if (priceInp)    priceInp.value       = item ? (item.price_cents / 100).toFixed(2) : '';
    if (allergenInp) allergenInp.value    = item ? (item.allergens || []).join(', ') : '';
    if (availInp)    availInp.checked     = item ? item.is_available : true;
    if (pasteInp)    pasteInp.value       = _drawerPhotoUrl;
    if (fileInp)     fileInp.value        = '';

    if (prevWrap && prevImg) {
      if (_drawerPhotoUrl) {
        prevImg.src             = _drawerPhotoUrl;
        prevWrap.style.display  = 'block';
      } else {
        prevImg.src             = '';
        prevWrap.style.display  = 'none';
      }
    }

    /* Load existing modifier group attachments for this item */
    var modListEl = sectionEl.querySelector('#pm-mod-checklist');
    if (modListEl) {
      if (!_modGroups.length) {
        modListEl.innerHTML = '<p style="padding:var(--space-3);font-size:13px;color:var(--color-text-muted)">No modifier groups yet. Create some in the Modifiers tab.</p>';
      } else {
        /* We'll render after fetching current links (if editing) */
        modListEl.innerHTML = _listSkeletons(2);
      }
    }

    var overlay = sectionEl.querySelector('#pm-drawer-overlay');
    var drawer  = sectionEl.querySelector('#pm-drawer');
    if (overlay) overlay.classList.add('open');
    if (drawer)  drawer.classList.add('open');
    if (nameInp) setTimeout(function () { nameInp.focus(); }, 60);

    /* Fetch existing group links */
    if (item && _modGroups.length) {
      var sb = _client();
      if (sb) {
        sb.from('pos_item_modifier_groups').select('group_id').eq('menu_item_id', item.id)
          .then(function (r) {
            (r.data || []).forEach(function (lnk) { _drawerModIds[lnk.group_id] = true; });
            _renderModChecklist(sectionEl);
          })
          .catch(function () { _renderModChecklist(sectionEl); });
      } else {
        _renderModChecklist(sectionEl);
      }
    } else {
      _renderModChecklist(sectionEl);
    }
  }

  function _renderModChecklist(sectionEl) {
    var modListEl = sectionEl.querySelector('#pm-mod-checklist');
    if (!modListEl) return;
    if (!_modGroups.length) {
      modListEl.innerHTML = '<p style="padding:var(--space-3);font-size:13px;color:var(--color-text-muted)">No modifier groups yet. Create some in the Modifiers tab.</p>';
      return;
    }
    modListEl.innerHTML = _modGroups.map(function (g) {
      var chk = _drawerModIds[g.id] ? ' checked' : '';
      var sub = (g.required ? 'Required' : 'Optional')
        + (g.min_select || g.max_select
          ? ' · ' + (g.min_select || 0) + '–' + (g.max_select || '∞')
          : '');
      return '<label class="posmenu-modcheck-item">'
        + '<input type="checkbox" data-gid="' + _esc(g.id) + '"' + chk + '>'
        + '<span class="posmenu-modcheck-label">' + _esc(g.name) + '</span>'
        + '<span class="posmenu-modcheck-sub">' + _esc(sub) + '</span>'
        + '</label>';
    }).join('');

    /* Track changes live */
    modListEl.querySelectorAll('input[type="checkbox"]').forEach(function (inp) {
      inp.addEventListener('change', function () {
        _drawerModIds[inp.dataset.gid] = inp.checked;
      });
    });
  }

  function _closeItemDrawer(sectionEl) {
    var overlay = sectionEl.querySelector('#pm-drawer-overlay');
    var drawer  = sectionEl.querySelector('#pm-drawer');
    if (overlay) overlay.classList.remove('open');
    if (drawer)  drawer.classList.remove('open');
    _drawerItem     = null;
    _drawerPhotoUrl = '';
    _drawerModIds   = {};
  }

  function _wireItemDrawer(sectionEl) {
    var overlay     = sectionEl.querySelector('#pm-drawer-overlay');
    var closeBtn    = sectionEl.querySelector('#pm-drawer-close');
    var cancelBtn   = sectionEl.querySelector('#pm-drawer-cancel');
    var saveBtn     = sectionEl.querySelector('#pm-drawer-save');
    var fileInp     = sectionEl.querySelector('#pm-item-file');
    var pasteInp    = sectionEl.querySelector('#pm-item-paste-url');
    var removeBtn   = sectionEl.querySelector('#pm-photo-remove');
    var prevWrap    = sectionEl.querySelector('#pm-photo-preview-wrap');
    var prevImg     = sectionEl.querySelector('#pm-photo-preview');

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
        if (!file.type.startsWith('image/')) { _toast('Images only.', 'err'); fileInp.value = ''; return; }
        if (file.size > 5 * 1024 * 1024) { _toast('Image must be under 5 MB.', 'err'); fileInp.value = ''; return; }
        var sb = _client();
        if (!sb) { _toast('Cannot upload: client not ready.', 'err'); fileInp.value = ''; return; }
        var safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        var path = 'menu/' + _rid + '/' + Date.now() + '-' + safeName;
        _toast('Uploading…');
        if (saveBtn) saveBtn.disabled = true;
        sb.storage.from('mesa-media').upload(path, file, { upsert: true })
          .then(function (r) {
            if (saveBtn) saveBtn.disabled = false;
            if (r.error) { _toast('Upload failed.', 'err'); fileInp.value = ''; return; }
            var url = sb.storage.from('mesa-media').getPublicUrl(path).data.publicUrl;
            _drawerPhotoUrl = url;
            if (pasteInp) pasteInp.value = url;
            if (prevImg)  prevImg.src = url;
            if (prevWrap) prevWrap.style.display = 'block';
            _toast('Photo uploaded.', 'ok');
          })
          .catch(function () {
            if (saveBtn) saveBtn.disabled = false;
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
        if (url) { if (prevImg) prevImg.src = url; if (prevWrap) prevWrap.style.display = 'block'; }
        else { if (prevWrap) prevWrap.style.display = 'none'; if (prevImg) prevImg.src = ''; }
      });
    }

    /* Photo: remove */
    if (removeBtn) {
      removeBtn.addEventListener('click', function () {
        _drawerPhotoUrl = '';
        if (pasteInp) pasteInp.value = '';
        if (fileInp)  fileInp.value  = '';
        if (prevImg)  prevImg.src    = '';
        if (prevWrap) prevWrap.style.display = 'none';
      });
    }

    /* Save item */
    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        var name = (sectionEl.querySelector('#pm-item-name').value || '').trim();
        if (!name) { _toast('Item name is required.', 'err'); sectionEl.querySelector('#pm-item-name').focus(); return; }
        var priceVal   = parseFloat(sectionEl.querySelector('#pm-item-price').value) || 0;
        var priceCents = Math.round(priceVal * 100);
        var allergens  = (sectionEl.querySelector('#pm-item-allergens').value || '')
          .split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        var isAvail    = sectionEl.querySelector('#pm-item-avail').checked;
        var desc       = (sectionEl.querySelector('#pm-item-desc').value || '').trim() || null;
        var photoUrl   = _drawerPhotoUrl || null;
        var sb         = _client();
        if (!sb) { _toast('Client not ready.', 'err'); return; }

        saveBtn.disabled = true;
        var origText = saveBtn.textContent;
        saveBtn.textContent = 'Saving…';

        var payload = {
          restaurant_id: _rid,
          category_id:   _currentCat,
          name:          name,
          description:   desc,
          price_cents:   priceCents,
          allergens:     allergens,
          is_available:  isAvail,
          photo_url:     photoUrl,
        };

        var id = _drawerItem ? _drawerItem.id : null;
        var q  = id
          ? sb.from('mesa_menu_items').update(payload).eq('id', id).select('*').single()
          : sb.from('mesa_menu_items').insert(Object.assign({ sort: _items.length }, payload)).select('*').single();

        q.then(function (r) {
          saveBtn.disabled = false;
          saveBtn.textContent = origText;
          if (r.error) { _toast('Error saving item.', 'err'); return; }
          var savedId = r.data.id;
          if (id) {
            _items = _items.map(function (i) { return i.id === id ? r.data : i; });
          } else {
            _items.push(r.data);
          }

          /* Sync modifier group attachments */
          _syncItemModGroups(savedId, function () {
            _renderItemsTable(sectionEl);
            _renderCatList(sectionEl);
            _closeItemDrawer(sectionEl);
            _toast('Item saved.', 'ok');
          });
        }).catch(function (err) {
          saveBtn.disabled = false;
          saveBtn.textContent = origText;
          console.error('[pos-menu] item save error', err);
          _toast('Error saving item.', 'err');
        });
      });
    }
  }

  /* Sync pos_item_modifier_groups for a saved item */
  function _syncItemModGroups(itemId, cb) {
    var sb = _client();
    if (!sb || !_modGroups.length) { if (cb) cb(); return; }

    /* Delete all existing links then re-insert the checked ones */
    sb.from('pos_item_modifier_groups').delete().eq('menu_item_id', itemId)
      .then(function () {
        var toInsert = [];
        Object.keys(_drawerModIds).forEach(function (gid) {
          if (_drawerModIds[gid]) {
            toInsert.push({ menu_item_id: itemId, group_id: gid });
          }
        });
        if (!toInsert.length) { if (cb) cb(); return; }
        sb.from('pos_item_modifier_groups').insert(toInsert)
          .then(function () { if (cb) cb(); })
          .catch(function () { if (cb) cb(); });
      })
      .catch(function () { if (cb) cb(); });
  }

  /* ---------- CATEGORIES LOAD ---------- */
  function _loadCategories(sectionEl) {
    var sb = _client();
    if (!sb) return;
    var catListEl = sectionEl.querySelector('#pm-cat-list');
    if (catListEl) catListEl.innerHTML = _listSkeletons(4);
    _renderEmptyItems(sectionEl);

    sb.from('mesa_menu_categories').select('*').eq('restaurant_id', _rid)
      .order('sort', { ascending: true }).order('name', { ascending: true })
      .then(function (r) {
        if (r.error) { if (catListEl) catListEl.innerHTML = _errorHtml('Could not load categories.'); return; }
        _categories = r.data || [];
        _items      = [];
        _currentCat = null;
        _renderCatList(sectionEl);
        if (_categories.length) {
          _selectCat(sectionEl, _categories[0].id);
        } else {
          _renderEmptyItems(sectionEl);
          var addBtn = sectionEl.querySelector('#pm-add-item-btn');
          if (addBtn) addBtn.style.display = 'none';
        }
      })
      .catch(function () {
        if (catListEl) catListEl.innerHTML = _errorHtml('Could not load categories.');
      });
  }

  /* ============================================================================
     ██████████████████  MODIFIERS TAB  ██████████████████
  ============================================================================ */

  /* ---------- MODIFIER GROUP LIST ---------- */
  function _renderGroupList(sectionEl) {
    var listEl = sectionEl.querySelector('#pm-grp-list');
    if (!listEl) return;
    if (!_modGroups.length) {
      listEl.innerHTML = '<p style="padding:var(--space-4);font-size:14px;color:var(--color-text-muted)">No groups yet.</p>';
      return;
    }
    var html = _modGroups.map(function (g) {
      var active = _currentGroup === g.id ? ' active' : '';
      var sub = (g.required ? 'Required' : 'Optional')
        + (g.max_select ? ' · pick ≤' + g.max_select : '');
      return '<div class="posmenu-list-item' + active + '" role="button" tabindex="0"'
        + ' data-gid="' + _esc(g.id) + '"'
        + ' aria-label="' + _esc(g.name) + (active ? ', selected' : '') + '">'
        + '<span class="posmenu-list-name">' + _esc(g.name)
        +   '<br><span style="font-size:11px;color:var(--color-text-muted)">' + _esc(sub) + '</span>'
        + '</span>'
        + '<span class="posmenu-list-meta">'
        + '<button class="posmenu-icon-btn" data-gid="' + _esc(g.id) + '" aria-label="Edit group ' + _esc(g.name) + '"'
        + ' style="width:28px;height:28px;flex-shrink:0">' + _svgEdit(13) + '</button>'
        + '</span>'
        + '</div>';
    }).join('');
    listEl.innerHTML = html;

    listEl.querySelectorAll('.posmenu-list-item').forEach(function (el) {
      function selectThis() { _selectGroup(sectionEl, el.dataset.gid); }
      el.addEventListener('click', function (e) {
        if (e.target.closest('.posmenu-icon-btn')) return;
        selectThis();
      });
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectThis(); }
      });
    });
    listEl.querySelectorAll('.posmenu-icon-btn[data-gid]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var grp = _modGroups.find(function (g) { return g.id === btn.dataset.gid; });
        if (grp) _openGroupModal(sectionEl, grp);
      });
    });
  }

  /* ---------- SELECT MODIFIER GROUP ---------- */
  function _selectGroup(sectionEl, gid) {
    _currentGroup = gid;
    var grp = _modGroups.find(function (g) { return g.id === gid; }) || null;
    var titleEl = sectionEl.querySelector('#pm-opts-title');
    if (titleEl) titleEl.textContent = grp ? grp.name : 'Options';
    var addOptBtn = sectionEl.querySelector('#pm-add-opt-btn');
    if (addOptBtn) addOptBtn.style.display = 'inline-flex';
    _renderGroupList(sectionEl);

    var bodyEl = sectionEl.querySelector('#pm-opts-body');
    if (bodyEl) bodyEl.innerHTML = '<div style="padding:var(--space-4)" aria-hidden="true">'
      + '<div class="posmenu-skeleton" style="height:40px;margin-bottom:8px;border-radius:var(--radius-md)"></div>'
      + '<div class="posmenu-skeleton" style="height:40px;border-radius:var(--radius-md)"></div>'
      + '</div>';

    var sb = _client();
    if (!sb) { if (bodyEl) bodyEl.innerHTML = _errorHtml('Client not ready.'); return; }
    sb.from('pos_modifiers').select('*').eq('group_id', gid)
      .order('sort', { ascending: true }).order('name', { ascending: true })
      .then(function (r) {
        if (r.error) { if (bodyEl) bodyEl.innerHTML = _errorHtml('Could not load options.'); return; }
        _groupOptions = r.data || [];
        _renderOptionsTable(sectionEl);
      })
      .catch(function () { if (bodyEl) bodyEl.innerHTML = _errorHtml('Could not load options.'); });
  }

  /* ---------- OPTIONS TABLE ---------- */
  function _renderOptionsTable(sectionEl) {
    var bodyEl = sectionEl.querySelector('#pm-opts-body');
    if (!bodyEl) return;
    var cur = (_restRow && _restRow.currency) || 'USD';

    if (!_groupOptions.length) {
      bodyEl.innerHTML = '<div class="posmenu-empty">'
        + '<div class="posmenu-empty-icon" aria-hidden="true">' + _svgSliders(22) + '</div>'
        + '<p class="posmenu-empty-title">No options yet</p>'
        + '<p class="posmenu-empty-body">Add options like "Rare", "Medium", "Cheese +$1.50".</p>'
        + '</div>';
      return;
    }

    var rows = _groupOptions.map(function (opt) {
      var delta = opt.price_delta_cents;
      var deltaStr = delta === 0 ? '' : (delta > 0 ? '+' : '') + _money(delta, cur);
      return '<tr>'
        + '<td style="min-width:0">'
        +   '<div class="posmenu-item-name">' + _esc(opt.name) + '</div>'
        + '</td>'
        + '<td style="width:100px"><span class="posmenu-price">' + _esc(deltaStr) + '</span></td>'
        + '<td style="width:80px">'
        +   '<label class="posmenu-toggle" aria-label="Toggle availability for ' + _esc(opt.name) + '">'
        +     '<input type="checkbox"' + (opt.is_available ? ' checked' : '') + ' data-oid="' + _esc(opt.id) + '">'
        +     '<span class="posmenu-toggle-track"></span>'
        +     '<span class="posmenu-toggle-thumb"></span>'
        +   '</label>'
        + '</td>'
        + '<td style="width:80px">'
        +   '<div class="posmenu-actions-cell">'
        +     '<button class="posmenu-icon-btn pm-edit-opt" data-oid="' + _esc(opt.id) + '"'
        +       ' aria-label="Edit option ' + _esc(opt.name) + '">' + _svgEdit(15) + '</button>'
        +     '<button class="posmenu-icon-btn danger pm-del-opt" data-oid="' + _esc(opt.id) + '"'
        +       ' data-name="' + _esc(opt.name) + '" aria-label="Delete option ' + _esc(opt.name) + '">' + _svgTrash(15) + '</button>'
        +   '</div>'
        + '</td>'
        + '</tr>';
    }).join('');

    bodyEl.innerHTML = '<div style="overflow-x:auto">'
      + '<table class="posmenu-table">'
      + '<thead><tr>'
      + '<th scope="col">Option name</th>'
      + '<th scope="col">Price delta</th>'
      + '<th scope="col">Avail.</th>'
      + '<th scope="col">Actions</th>'
      + '</tr></thead>'
      + '<tbody>' + rows + '</tbody>'
      + '</table></div>';

    /* Wire toggles */
    bodyEl.querySelectorAll('input[type="checkbox"][data-oid]').forEach(function (inp) {
      inp.addEventListener('change', function () {
        var newVal = inp.checked;
        var sb = _client();
        if (!sb) { inp.checked = !newVal; return; }
        sb.from('pos_modifiers').update({ is_available: newVal }).eq('id', inp.dataset.oid)
          .then(function (r) {
            if (r.error) { _toast('Failed to update.', 'err'); inp.checked = !newVal; return; }
            var o = _groupOptions.find(function (o) { return o.id === inp.dataset.oid; });
            if (o) o.is_available = newVal;
          });
      });
    });

    /* Wire edit buttons */
    bodyEl.querySelectorAll('.pm-edit-opt').forEach(function (btn) {
      btn.addEventListener('click', function () { _openOptModal(sectionEl, btn.dataset.oid); });
    });

    /* Wire delete buttons */
    bodyEl.querySelectorAll('.pm-del-opt').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!confirm('Delete option "' + btn.dataset.name + '"?')) return;
        var sb = _client();
        if (!sb) { _toast('Client not ready.', 'err'); return; }
        sb.from('pos_modifiers').delete().eq('id', btn.dataset.oid)
          .then(function (r) {
            if (r.error) { _toast('Error deleting option.', 'err'); return; }
            _groupOptions = _groupOptions.filter(function (o) { return o.id !== btn.dataset.oid; });
            _renderOptionsTable(sectionEl);
            _toast('Option deleted.', 'ok');
          });
      });
    });
  }

  /* ---------- GROUP MODAL (add/edit/delete a modifier group) ---------- */
  function _openGroupModal(sectionEl, grp) {
    var overlay  = sectionEl.querySelector('#pm-grp-modal-overlay');
    if (!overlay) return;
    var idInp    = sectionEl.querySelector('#pm-grp-id');
    var nameInp  = sectionEl.querySelector('#pm-grp-name');
    var reqInp   = sectionEl.querySelector('#pm-grp-required');
    var minInp   = sectionEl.querySelector('#pm-grp-min');
    var maxInp   = sectionEl.querySelector('#pm-grp-max');
    var title    = sectionEl.querySelector('#pm-grp-modal-title');
    var delBtn   = sectionEl.querySelector('#pm-grp-del-btn');
    if (grp) {
      if (idInp)   idInp.value   = grp.id;
      if (nameInp) nameInp.value = grp.name;
      if (reqInp)  reqInp.checked = !!grp.required;
      if (minInp)  minInp.value  = grp.min_select || 0;
      if (maxInp)  maxInp.value  = grp.max_select || '';
      if (title)   title.textContent = 'Edit modifier group';
      if (delBtn)  delBtn.style.display = 'inline-flex';
    } else {
      if (idInp)   idInp.value   = '';
      if (nameInp) nameInp.value = '';
      if (reqInp)  reqInp.checked = false;
      if (minInp)  minInp.value  = '0';
      if (maxInp)  maxInp.value  = '';
      if (title)   title.textContent = 'Add modifier group';
      if (delBtn)  delBtn.style.display = 'none';
    }
    overlay.classList.add('open');
    setTimeout(function () { if (nameInp) nameInp.focus(); }, 50);
  }
  function _closeGroupModal(sectionEl) {
    var overlay = sectionEl.querySelector('#pm-grp-modal-overlay');
    if (overlay) overlay.classList.remove('open');
  }
  function _wireGroupModal(sectionEl) {
    var overlay   = sectionEl.querySelector('#pm-grp-modal-overlay');
    var saveBtn   = sectionEl.querySelector('#pm-grp-save-btn');
    var delBtn    = sectionEl.querySelector('#pm-grp-del-btn');
    var cancelBtn = sectionEl.querySelector('#pm-grp-cancel-btn');
    var closeBtn  = sectionEl.querySelector('#pm-grp-modal-close');
    var nameInp   = sectionEl.querySelector('#pm-grp-name');
    function doClose() { _closeGroupModal(sectionEl); }
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
        var id      = sectionEl.querySelector('#pm-grp-id').value;
        var name    = (sectionEl.querySelector('#pm-grp-name').value || '').trim();
        var req     = sectionEl.querySelector('#pm-grp-required').checked;
        var minSel  = parseInt(sectionEl.querySelector('#pm-grp-min').value, 10) || 0;
        var maxStr  = sectionEl.querySelector('#pm-grp-max').value.trim();
        var maxSel  = maxStr ? (parseInt(maxStr, 10) || null) : null;
        if (!name) { _toast('Enter a group name.', 'err'); return; }
        var sb = _client();
        if (!sb) { _toast('Client not ready.', 'err'); return; }
        saveBtn.disabled = true;
        var payload = {
          restaurant_id: _rid,
          name:          name,
          required:      req,
          min_select:    minSel,
          max_select:    maxSel,
          sort:          id ? undefined : _modGroups.length,
        };
        if (id) delete payload.sort;
        var q = id
          ? sb.from('pos_modifier_groups').update(payload).eq('id', id).select('*').single()
          : sb.from('pos_modifier_groups').insert(Object.assign({ sort: _modGroups.length }, payload)).select('*').single();
        q.then(function (r) {
          saveBtn.disabled = false;
          if (r.error) { _toast('Error saving group.', 'err'); return; }
          if (id) {
            _modGroups = _modGroups.map(function (g) { return g.id === id ? r.data : g; });
          } else {
            _modGroups.push(r.data);
            _currentGroup = r.data.id;
          }
          _closeGroupModal(sectionEl);
          _renderGroupList(sectionEl);
          _selectGroup(sectionEl, id || r.data.id);
          _toast('Group saved.', 'ok');
        }).catch(function () { saveBtn.disabled = false; _toast('Error saving group.', 'err'); });
      });
    }
    if (delBtn) {
      delBtn.addEventListener('click', function () {
        var id  = sectionEl.querySelector('#pm-grp-id').value;
        if (!id) return;
        var grp = _modGroups.find(function (g) { return g.id === id; });
        var lbl = grp ? grp.name : 'this group';
        if (!confirm('Delete modifier group "' + lbl + '"? All its options will also be deleted.')) return;
        var sb = _client();
        if (!sb) { _toast('Client not ready.', 'err'); return; }
        delBtn.disabled = true;
        sb.from('pos_modifier_groups').delete().eq('id', id)
          .then(function (r) {
            delBtn.disabled = false;
            if (r.error) { _toast('Error deleting group.', 'err'); return; }
            _modGroups = _modGroups.filter(function (g) { return g.id !== id; });
            if (_currentGroup === id) {
              _currentGroup = null;
              _groupOptions = [];
              _renderEmptyOpts(sectionEl);
              var addOptBtn = sectionEl.querySelector('#pm-add-opt-btn');
              if (addOptBtn) addOptBtn.style.display = 'none';
            }
            _closeGroupModal(sectionEl);
            _renderGroupList(sectionEl);
            _toast('Group deleted.', 'ok');
          }).catch(function () { delBtn.disabled = false; _toast('Error deleting group.', 'err'); });
      });
    }
  }

  function _renderEmptyOpts(sectionEl) {
    var bodyEl  = sectionEl.querySelector('#pm-opts-body');
    var titleEl = sectionEl.querySelector('#pm-opts-title');
    if (titleEl) titleEl.textContent = 'Select a group';
    if (bodyEl) {
      bodyEl.innerHTML = '<div class="posmenu-empty">'
        + '<div class="posmenu-empty-icon" aria-hidden="true">' + _svgSliders(22) + '</div>'
        + '<p class="posmenu-empty-title">Select a group</p>'
        + '<p class="posmenu-empty-body">Choose a modifier group from the left to manage its options.</p>'
        + '</div>';
    }
  }

  /* ---------- OPTION MODAL (add/edit a single pos_modifier) ---------- */
  function _openOptModal(sectionEl, optId) {
    var opt = optId ? _groupOptions.find(function (o) { return o.id === optId; }) : null;
    var overlay  = sectionEl.querySelector('#pm-opt-modal-overlay');
    if (!overlay) return;
    var idInp    = sectionEl.querySelector('#pm-opt-id');
    var nameInp  = sectionEl.querySelector('#pm-opt-name');
    var deltaInp = sectionEl.querySelector('#pm-opt-delta');
    var availInp = sectionEl.querySelector('#pm-opt-avail');
    var title    = sectionEl.querySelector('#pm-opt-modal-title');
    if (opt) {
      if (idInp)    idInp.value    = opt.id;
      if (nameInp)  nameInp.value  = opt.name;
      if (deltaInp) deltaInp.value = (opt.price_delta_cents / 100).toFixed(2);
      if (availInp) availInp.checked = opt.is_available !== false;
      if (title)    title.textContent = 'Edit option';
    } else {
      if (idInp)    idInp.value    = '';
      if (nameInp)  nameInp.value  = '';
      if (deltaInp) deltaInp.value = '0.00';
      if (availInp) availInp.checked = true;
      if (title)    title.textContent = 'Add option';
    }
    overlay.classList.add('open');
    setTimeout(function () { if (nameInp) nameInp.focus(); }, 50);
  }
  function _closeOptModal(sectionEl) {
    var overlay = sectionEl.querySelector('#pm-opt-modal-overlay');
    if (overlay) overlay.classList.remove('open');
  }
  function _wireOptModal(sectionEl) {
    var overlay   = sectionEl.querySelector('#pm-opt-modal-overlay');
    var saveBtn   = sectionEl.querySelector('#pm-opt-save-btn');
    var cancelBtn = sectionEl.querySelector('#pm-opt-cancel-btn');
    var closeBtn  = sectionEl.querySelector('#pm-opt-modal-close');
    var nameInp   = sectionEl.querySelector('#pm-opt-name');
    function doClose() { _closeOptModal(sectionEl); }
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
        var id        = sectionEl.querySelector('#pm-opt-id').value;
        var name      = (sectionEl.querySelector('#pm-opt-name').value || '').trim();
        var deltaVal  = parseFloat(sectionEl.querySelector('#pm-opt-delta').value) || 0;
        var deltaCents = Math.round(deltaVal * 100);
        var isAvail   = sectionEl.querySelector('#pm-opt-avail').checked;
        if (!name) { _toast('Enter an option name.', 'err'); return; }
        if (!_currentGroup) { _toast('No group selected.', 'err'); return; }
        var sb = _client();
        if (!sb) { _toast('Client not ready.', 'err'); return; }
        saveBtn.disabled = true;
        var payload = {
          group_id:          _currentGroup,
          name:              name,
          price_delta_cents: deltaCents,
          is_available:      isAvail,
        };
        var q = id
          ? sb.from('pos_modifiers').update(payload).eq('id', id).select('*').single()
          : sb.from('pos_modifiers').insert(Object.assign({ sort: _groupOptions.length }, payload)).select('*').single();
        q.then(function (r) {
          saveBtn.disabled = false;
          if (r.error) { _toast('Error saving option.', 'err'); return; }
          if (id) {
            _groupOptions = _groupOptions.map(function (o) { return o.id === id ? r.data : o; });
          } else {
            _groupOptions.push(r.data);
          }
          _closeOptModal(sectionEl);
          _renderOptionsTable(sectionEl);
          _toast('Option saved.', 'ok');
        }).catch(function () { saveBtn.disabled = false; _toast('Error saving option.', 'err'); });
      });
    }
  }

  /* ---------- MODIFIER GROUPS LOAD ---------- */
  function _loadModGroups2(sectionEl) {
    var listEl = sectionEl.querySelector('#pm-grp-list');
    if (listEl) listEl.innerHTML = _listSkeletons(3);
    _renderEmptyOpts(sectionEl);
    _loadModGroups(function () {
      _renderGroupList(sectionEl);
      if (_modGroups.length) {
        _selectGroup(sectionEl, _modGroups[0].id);
      } else {
        var addOptBtn = sectionEl.querySelector('#pm-add-opt-btn');
        if (addOptBtn) addOptBtn.style.display = 'none';
      }
    });
  }

  /* ============================================================================
     SCAFFOLD HTML
  ============================================================================ */
  function _buildScaffold() {
    return [
      '<div class="posmenu-root">',

        /* Header with tab switcher */
        '<div class="posmenu-header">',
          '<h2 class="posmenu-title">Menu &amp; Modifiers</h2>',
          '<div class="posmenu-tabs" role="tablist" aria-label="Menu manager sections">',
            '<button class="posmenu-tab active" id="pm-tab-menu" role="tab"',
              ' aria-selected="true" aria-controls="pm-panel-menu">Menu</button>',
            '<button class="posmenu-tab" id="pm-tab-mods" role="tab"',
              ' aria-selected="false" aria-controls="pm-panel-mods">Modifiers</button>',
          '</div>',
        '</div>',

        /* ── MENU PANEL ── */
        '<div id="pm-panel-menu" class="posmenu-panel active" role="tabpanel" aria-labelledby="pm-tab-menu">',
          '<div class="posmenu-layout">',

            /* Category left panel */
            '<div class="posmenu-left">',
              '<div class="posmenu-left-head">Categories</div>',
              '<div id="pm-cat-list" class="posmenu-list" role="list" aria-label="Menu categories"></div>',
              '<div class="posmenu-add-wrap">',
                '<button class="btn btn-secondary btn-block" id="pm-add-cat-btn"',
                  ' style="border-radius:var(--radius-md);min-height:44px">+ Add category</button>',
              '</div>',
            '</div>',

            /* Items right panel */
            '<div class="posmenu-right">',
              '<div class="posmenu-right-head">',
                '<span class="posmenu-right-title" id="pm-items-title">Select a category</span>',
                '<button class="btn btn-primary" id="pm-add-item-btn"',
                  ' style="display:none;border-radius:var(--radius-md);min-height:44px">+ Add item</button>',
              '</div>',
              '<div id="pm-items-body" class="posmenu-right-body"></div>',
            '</div>',

          '</div>',
        '</div>',

        /* ── MODIFIERS PANEL ── */
        '<div id="pm-panel-mods" class="posmenu-panel" role="tabpanel" aria-labelledby="pm-tab-mods">',
          '<div class="posmenu-layout">',

            /* Modifier groups left panel */
            '<div class="posmenu-left">',
              '<div class="posmenu-left-head">Modifier Groups</div>',
              '<div id="pm-grp-list" class="posmenu-list" role="list" aria-label="Modifier groups"></div>',
              '<div class="posmenu-add-wrap">',
                '<button class="btn btn-secondary btn-block" id="pm-add-grp-btn"',
                  ' style="border-radius:var(--radius-md);min-height:44px">+ Add group</button>',
              '</div>',
            '</div>',

            /* Options right panel */
            '<div class="posmenu-right">',
              '<div class="posmenu-right-head">',
                '<span class="posmenu-right-title" id="pm-opts-title">Select a group</span>',
                '<button class="btn btn-primary" id="pm-add-opt-btn"',
                  ' style="display:none;border-radius:var(--radius-md);min-height:44px">+ Add option</button>',
              '</div>',
              '<div id="pm-opts-body" class="posmenu-right-body"></div>',
            '</div>',

          '</div>',
        '</div>',

      '</div>',/* /posmenu-root */

      /* ─── Category modal ─── */
      '<div class="posmenu-modal-overlay" id="pm-cat-modal-overlay"',
        ' role="dialog" aria-modal="true" aria-labelledby="pm-cat-modal-title">',
        '<div class="posmenu-modal">',
          '<div class="posmenu-modal-head">',
            '<h3 class="posmenu-modal-title" id="pm-cat-modal-title">Add category</h3>',
            '<button class="posmenu-icon-btn" id="pm-cat-modal-close" aria-label="Close">' + _svgClose(16) + '</button>',
          '</div>',
          '<input type="hidden" id="pm-cat-id">',
          '<div class="posmenu-field">',
            '<label class="posmenu-label" for="pm-cat-name">Category name</label>',
            '<input class="posmenu-input" id="pm-cat-name" type="text" placeholder="e.g. Starters" autocomplete="off">',
          '</div>',
          '<div class="posmenu-modal-foot">',
            '<button class="btn btn-primary" id="pm-cat-save-btn"',
              ' style="flex:1;border-radius:var(--radius-md);min-height:44px">Save</button>',
            '<button class="btn" id="pm-cat-del-btn"',
              ' style="border-radius:var(--radius-md);min-height:44px;background:var(--color-destructive-light);',
              'color:var(--color-destructive);border:1px solid var(--color-destructive);display:none">Delete</button>',
            '<button class="btn btn-secondary" id="pm-cat-cancel-btn"',
              ' style="border-radius:var(--radius-md);min-height:44px">Cancel</button>',
          '</div>',
        '</div>',
      '</div>',

      /* ─── Modifier group modal ─── */
      '<div class="posmenu-modal-overlay" id="pm-grp-modal-overlay"',
        ' role="dialog" aria-modal="true" aria-labelledby="pm-grp-modal-title">',
        '<div class="posmenu-modal">',
          '<div class="posmenu-modal-head">',
            '<h3 class="posmenu-modal-title" id="pm-grp-modal-title">Add modifier group</h3>',
            '<button class="posmenu-icon-btn" id="pm-grp-modal-close" aria-label="Close">' + _svgClose(16) + '</button>',
          '</div>',
          '<input type="hidden" id="pm-grp-id">',
          '<div class="posmenu-field">',
            '<label class="posmenu-label" for="pm-grp-name">Group name</label>',
            '<input class="posmenu-input" id="pm-grp-name" type="text" placeholder="e.g. Steak Temperature" autocomplete="off">',
          '</div>',
          '<div class="posmenu-row-2" style="margin-top:var(--space-3)">',
            '<div class="posmenu-field">',
              '<label class="posmenu-label" for="pm-grp-min">Min selections</label>',
              '<input class="posmenu-input" id="pm-grp-min" type="number" min="0" step="1" value="0">',
            '</div>',
            '<div class="posmenu-field">',
              '<label class="posmenu-label" for="pm-grp-max">Max selections</label>',
              '<input class="posmenu-input" id="pm-grp-max" type="number" min="1" step="1" placeholder="Unlimited">',
            '</div>',
          '</div>',
          '<div class="posmenu-avail-row" style="margin-top:var(--space-3)">',
            '<label class="posmenu-toggle" aria-label="Mark as required">',
              '<input type="checkbox" id="pm-grp-required">',
              '<span class="posmenu-toggle-track"></span>',
              '<span class="posmenu-toggle-thumb"></span>',
            '</label>',
            '<span class="posmenu-avail-label">Required (guest must pick)</span>',
          '</div>',
          '<div class="posmenu-modal-foot">',
            '<button class="btn btn-primary" id="pm-grp-save-btn"',
              ' style="flex:1;border-radius:var(--radius-md);min-height:44px">Save</button>',
            '<button class="btn" id="pm-grp-del-btn"',
              ' style="border-radius:var(--radius-md);min-height:44px;background:var(--color-destructive-light);',
              'color:var(--color-destructive);border:1px solid var(--color-destructive);display:none">Delete</button>',
            '<button class="btn btn-secondary" id="pm-grp-cancel-btn"',
              ' style="border-radius:var(--radius-md);min-height:44px">Cancel</button>',
          '</div>',
        '</div>',
      '</div>',

      /* ─── Option modal (pos_modifiers) ─── */
      '<div class="posmenu-modal-overlay" id="pm-opt-modal-overlay"',
        ' role="dialog" aria-modal="true" aria-labelledby="pm-opt-modal-title">',
        '<div class="posmenu-modal">',
          '<div class="posmenu-modal-head">',
            '<h3 class="posmenu-modal-title" id="pm-opt-modal-title">Add option</h3>',
            '<button class="posmenu-icon-btn" id="pm-opt-modal-close" aria-label="Close">' + _svgClose(16) + '</button>',
          '</div>',
          '<input type="hidden" id="pm-opt-id">',
          '<div class="posmenu-field">',
            '<label class="posmenu-label" for="pm-opt-name">Option name</label>',
            '<input class="posmenu-input" id="pm-opt-name" type="text" placeholder="e.g. Rare, Cheese, Large" autocomplete="off">',
          '</div>',
          '<div class="posmenu-field" style="margin-top:var(--space-3)">',
            '<label class="posmenu-label" for="pm-opt-delta">Price delta (dollars, e.g. 1.50 or -0.50)</label>',
            '<input class="posmenu-input" id="pm-opt-delta" type="number" step="0.01" value="0.00" placeholder="0.00">',
          '</div>',
          '<div class="posmenu-avail-row" style="margin-top:var(--space-3)">',
            '<label class="posmenu-toggle" aria-label="Option available">',
              '<input type="checkbox" id="pm-opt-avail" checked>',
              '<span class="posmenu-toggle-track"></span>',
              '<span class="posmenu-toggle-thumb"></span>',
            '</label>',
            '<span class="posmenu-avail-label">Available</span>',
          '</div>',
          '<div class="posmenu-modal-foot">',
            '<button class="btn btn-primary" id="pm-opt-save-btn"',
              ' style="flex:1;border-radius:var(--radius-md);min-height:44px">Save</button>',
            '<button class="btn btn-secondary" id="pm-opt-cancel-btn"',
              ' style="border-radius:var(--radius-md);min-height:44px">Cancel</button>',
          '</div>',
        '</div>',
      '</div>',

      /* ─── Item add/edit drawer ─── */
      '<div class="posmenu-drawer-overlay" id="pm-drawer-overlay"></div>',
      '<aside class="posmenu-drawer" id="pm-drawer" role="dialog" aria-modal="true" aria-labelledby="pm-drawer-title">',
        '<div class="posmenu-drawer-head">',
          '<h3 class="posmenu-drawer-title" id="pm-drawer-title">Add item</h3>',
          '<button class="posmenu-icon-btn" id="pm-drawer-close" aria-label="Close item editor">' + _svgClose(16) + '</button>',
        '</div>',
        '<div class="posmenu-drawer-body">',

          '<div class="posmenu-field">',
            '<label class="posmenu-label" for="pm-item-name">Item name *</label>',
            '<input class="posmenu-input" id="pm-item-name" type="text" placeholder="e.g. Grilled Salmon" autocomplete="off">',
          '</div>',

          '<div class="posmenu-field">',
            '<label class="posmenu-label" for="pm-item-desc">Description</label>',
            '<textarea class="posmenu-input posmenu-textarea" id="pm-item-desc" rows="2" placeholder="Short description…"></textarea>',
          '</div>',

          '<div class="posmenu-field">',
            '<label class="posmenu-label" for="pm-item-price">Price (dollars)</label>',
            '<input class="posmenu-input" id="pm-item-price" type="number" min="0" step="0.01" placeholder="0.00">',
          '</div>',

          '<div class="posmenu-field">',
            '<label class="posmenu-label">Photo</label>',
            '<div id="pm-photo-preview-wrap" style="display:none;position:relative;width:fit-content;margin-bottom:var(--space-2)">',
              '<img id="pm-photo-preview" src="" alt="Item photo preview" class="posmenu-photo-preview">',
              '<button type="button" id="pm-photo-remove" class="posmenu-photo-remove" aria-label="Remove photo">&#x2715;</button>',
            '</div>',
            '<input id="pm-item-file" type="file" accept="image/*" class="posmenu-input"',
              ' style="padding:var(--space-2)" aria-label="Upload photo from device">',
            '<input id="pm-item-paste-url" class="posmenu-input" type="url"',
              ' placeholder="Or paste an image URL…" style="margin-top:var(--space-2)">',
          '</div>',

          '<div class="posmenu-field">',
            '<label class="posmenu-label" for="pm-item-allergens">Allergens (comma-separated)</label>',
            '<input class="posmenu-input" id="pm-item-allergens" type="text"',
              ' placeholder="e.g. gluten, dairy, nuts" autocomplete="off">',
          '</div>',

          '<div class="posmenu-avail-row">',
            '<label class="posmenu-toggle" aria-label="Mark item as available">',
              '<input type="checkbox" id="pm-item-avail" checked>',
              '<span class="posmenu-toggle-track"></span>',
              '<span class="posmenu-toggle-thumb"></span>',
            '</label>',
            '<span class="posmenu-avail-label">Available</span>',
          '</div>',

          '<div class="posmenu-field">',
            '<label class="posmenu-label">Modifier groups</label>',
            '<div id="pm-mod-checklist" class="posmenu-modcheck-list" role="group" aria-label="Attach modifier groups"></div>',
          '</div>',

        '</div>',/* /drawer-body */
        '<div class="posmenu-drawer-foot">',
          '<button class="btn btn-primary" id="pm-drawer-save"',
            ' style="flex:1;border-radius:var(--radius-md);min-height:44px">Save item</button>',
          '<button class="btn btn-secondary" id="pm-drawer-cancel"',
            ' style="border-radius:var(--radius-md);min-height:44px">Cancel</button>',
        '</div>',
      '</aside>',

    ].join('');
  }

  /* ==========================================================================
     WIRE SCAFFOLD TOP-LEVEL EVENTS
  ========================================================================== */
  function _wireScaffold(sectionEl) {
    /* Tab switching */
    var tabMenu = sectionEl.querySelector('#pm-tab-menu');
    var tabMods = sectionEl.querySelector('#pm-tab-mods');
    var panelMenu = sectionEl.querySelector('#pm-panel-menu');
    var panelMods = sectionEl.querySelector('#pm-panel-mods');

    function switchTab(active, inactive, activePanel, inactivePanel) {
      active.classList.add('active');
      active.setAttribute('aria-selected', 'true');
      inactive.classList.remove('active');
      inactive.setAttribute('aria-selected', 'false');
      activePanel.classList.add('active');
      inactivePanel.classList.remove('active');
    }

    if (tabMenu && tabMods && panelMenu && panelMods) {
      tabMenu.addEventListener('click', function () {
        switchTab(tabMenu, tabMods, panelMenu, panelMods);
      });
      tabMenu.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tabMenu.click(); }
      });
      tabMods.addEventListener('click', function () {
        switchTab(tabMods, tabMenu, panelMods, panelMenu);
      });
      tabMods.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tabMods.click(); }
      });
    }

    /* Menu tab: add category */
    var addCatBtn = sectionEl.querySelector('#pm-add-cat-btn');
    if (addCatBtn) {
      addCatBtn.addEventListener('click', function () { _openCatModal(sectionEl, null); });
    }

    /* Menu tab: add item */
    var addItemBtn = sectionEl.querySelector('#pm-add-item-btn');
    if (addItemBtn) {
      addItemBtn.addEventListener('click', function () { _openItemDrawer(sectionEl, null); });
    }

    /* Modifiers tab: add group */
    var addGrpBtn = sectionEl.querySelector('#pm-add-grp-btn');
    if (addGrpBtn) {
      addGrpBtn.addEventListener('click', function () { _openGroupModal(sectionEl, null); });
    }

    /* Modifiers tab: add option */
    var addOptBtn = sectionEl.querySelector('#pm-add-opt-btn');
    if (addOptBtn) {
      addOptBtn.addEventListener('click', function () { _openOptModal(sectionEl, null); });
    }

    _wireCatModal(sectionEl);
    _wireItemDrawer(sectionEl);
    _wireGroupModal(sectionEl);
    _wireOptModal(sectionEl);
  }

  /* ==========================================================================
     RENDER — entry-point called by the shell on each navigation
  ========================================================================== */
  function render(sectionEl) {
    _injectStyles();

    /* Build scaffold once per sectionEl lifetime */
    if (!sectionEl.querySelector('.posmenu-root')) {
      sectionEl.innerHTML = _buildScaffold();
      _wireScaffold(sectionEl);
    }

    /* If already loaded for this session, just re-render */
    if (_restReady && _restRow) {
      _renderCatList(sectionEl);
      _renderGroupList(sectionEl);
      if (_currentCat) {
        _renderItemsTable(sectionEl);
      } else if (_categories.length) {
        _selectCat(sectionEl, _categories[0].id);
      } else {
        _renderEmptyItems(sectionEl);
      }
      if (_currentGroup) {
        _renderOptionsTable(sectionEl);
      } else if (_modGroups.length) {
        _selectGroup(sectionEl, _modGroups[0].id);
      } else {
        _renderEmptyOpts(sectionEl);
      }
      return;
    }

    if (_restReady && !_restRow) {
      sectionEl.innerHTML = '<div class="posmenu-root">' + _errorHtml('Restaurant not configured. Complete onboarding first.') + '</div>';
      return;
    }

    /* First render: resolve restaurant then load data */
    _resolveRest(function (rest, err) {
      if (err || !rest) {
        sectionEl.innerHTML = '<div class="posmenu-root">' + _errorHtml(err || 'Restaurant not configured.') + '</div>';
        return;
      }
      /* Load modifier groups first (needed for item drawer checklist), then categories */
      _loadModGroups(function () {
        _loadCategories(sectionEl);
        _loadModGroups2(sectionEl);
      });
    });
  }

  /* ==========================================================================
     REGISTER MODULE
  ========================================================================== */
  window.COV  = window.COV  || {};
  window.PLAT = window.PLAT || {};
  window.COV.screens  = window.COV.screens  || {};
  window.PLAT.screens = window.PLAT.screens || {};

  var screenObj = { render: render };
  window.COV.screens['pos-menu']  = screenObj;
  window.PLAT.screens['pos-menu'] = screenObj;

}());
