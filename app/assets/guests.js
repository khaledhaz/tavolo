/* ============================================================================
   Coverly — Guest CRM screen module
   Registers: window.COV.screens.guests = { render(sectionEl) }
   Owns:      assets/guests.js  (this file only — no edits to index.html or data.js)
   ============================================================================ */
(function () {
  'use strict';

  /* ---- Design tokens used inline (mirrors tokens.css) ---- */
  var CSS = `
/* ===== GUEST CRM LAYOUT ===== */
.gcr-root {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-5);
  min-width: 0;
}

/* Toolbar */
.gcr-toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}
.gcr-search-wrap {
  position: relative;
  flex: 1;
  min-width: 180px;
  min-width: 0;
}
.gcr-search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: var(--color-text-muted);
}
.gcr-search {
  width: 100%;
  min-height: 44px;
  padding: var(--space-2) var(--space-4) var(--space-2) 42px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  font-size: 14px;
  color: var(--color-text-primary);
  transition: border-color var(--duration-fast), box-shadow var(--duration-fast);
}
.gcr-search:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-light);
}
.gcr-search::placeholder { color: var(--color-text-muted); }

.gcr-sort {
  min-height: 44px;
  padding: 0 var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  font-size: 13px;
  color: var(--color-text-secondary);
  cursor: pointer;
  flex-shrink: 0;
}
.gcr-count {
  font-size: 13px;
  color: var(--color-text-muted);
  flex-shrink: 0;
  white-space: nowrap;
}

/* Guest list */
.gcr-list {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.gcr-list-inner {
  display: flex;
  flex-direction: column;
}
.gcr-guest-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  transition: background var(--duration-fast);
  min-width: 0;
}
.gcr-guest-row:last-child { border-bottom: none; }
.gcr-guest-row:hover { background: var(--color-surface-raised); }
.gcr-guest-row:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: -2px;
}
.gcr-avatar {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  background: var(--color-primary-light);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 600;
  flex-shrink: 0;
}
.gcr-avatar.vip {
  background: var(--color-accent-light);
  color: var(--color-accent-hover);
}
.gcr-guest-info {
  flex: 1;
  min-width: 0;
}
.gcr-guest-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
  min-width: 0;
}
.gcr-guest-name-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
.gcr-vip-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px;
  background: var(--color-accent-light);
  color: var(--color-accent-hover);
  border: 1px solid rgba(232,160,64,.3);
  border-radius: var(--radius-full);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  flex-shrink: 0;
}
.gcr-guest-sub {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.gcr-tag-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}
.gcr-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: 11px;
  font-weight: 500;
  line-height: 1.4;
  background: var(--color-surface-raised);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
}
.gcr-chip.allergy {
  background: var(--color-destructive-light);
  color: var(--color-destructive);
  border-color: rgba(181,59,47,.2);
}
.gcr-chip.seating {
  background: var(--color-info-light);
  color: var(--color-info);
  border-color: rgba(43,108,176,.2);
}
.gcr-guest-stats {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
  text-align: right;
  min-width: 56px;
}
.gcr-stat-visits {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
}
.gcr-stat-nsr {
  font-size: 11px;
  color: var(--color-text-muted);
}
.gcr-stat-nsr.high { color: var(--color-destructive); }
.gcr-chevron {
  color: var(--color-text-muted);
  flex-shrink: 0;
  margin-left: var(--space-2);
}

/* Skeleton rows */
.gcr-skel-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--color-border);
}
.gcr-skel-row:last-child { border-bottom: none; }
.gcr-skel-avatar {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}
.gcr-skel-lines {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* Empty + error states */
.gcr-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-12) var(--space-5);
  text-align: center;
  color: var(--color-text-muted);
}
.gcr-empty-icon {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-xl);
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--space-4);
}
.gcr-empty-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
}
.gcr-empty-body {
  font-size: 14px;
  color: var(--color-text-secondary);
  max-width: 320px;
  line-height: 1.6;
}
.gcr-error-bar {
  background: var(--color-destructive-light);
  color: var(--color-destructive);
  border: 1px solid rgba(181,59,47,.2);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}
.gcr-retry-btn {
  background: none;
  border: none;
  color: var(--color-destructive);
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
  flex-shrink: 0;
}

/* ===== GUEST PROFILE DRAWER ===== */
.gcr-drawer-overlay {
  position: fixed;
  inset: 0;
  background: var(--color-overlay);
  z-index: 400;
  display: none;
  align-items: flex-start;
  justify-content: flex-end;
}
.gcr-drawer-overlay.open {
  display: flex;
}
.gcr-drawer {
  background: var(--color-surface);
  width: 100%;
  max-width: 480px;
  height: 100vh;
  overflow-y: auto;
  overflow-x: hidden;
  box-shadow: var(--shadow-xl);
  display: flex;
  flex-direction: column;
  animation: gcr-drawer-in var(--duration-normal) var(--easing-decelerate) both;
}
@keyframes gcr-drawer-in {
  from { transform: translateX(100%); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
}

.gcr-drawer-head {
  padding: var(--space-5) var(--space-6);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-shrink: 0;
  position: sticky;
  top: 0;
  background: var(--color-surface);
  z-index: 10;
}
.gcr-drawer-avatar {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-full);
  background: var(--color-primary-light);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  flex-shrink: 0;
}
.gcr-drawer-avatar.vip {
  background: var(--color-accent-light);
  color: var(--color-accent-hover);
}
.gcr-drawer-title-wrap {
  flex: 1;
  min-width: 0;
}
.gcr-drawer-name {
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
  min-width: 0;
}
.gcr-drawer-name-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
.gcr-drawer-sub {
  font-size: 13px;
  color: var(--color-text-muted);
  margin-top: 2px;
}
.gcr-close-btn {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  background: none;
  border: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--color-text-secondary);
  flex-shrink: 0;
  transition: background var(--duration-fast), color var(--duration-fast);
}
.gcr-close-btn:hover {
  background: var(--color-surface-raised);
  color: var(--color-text-primary);
}

.gcr-drawer-body {
  flex: 1;
  padding: var(--space-5) var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

/* Drawer sections */
.gcr-section-title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  margin-bottom: var(--space-3);
}
.gcr-field-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  margin-bottom: var(--space-3);
}
.gcr-field-row:last-child { margin-bottom: 0; }
.gcr-field-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-muted);
}
.gcr-field-value {
  font-size: 14px;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.gcr-field-value.empty { color: var(--color-text-muted); font-style: italic; }

/* VIP toggle */
.gcr-vip-toggle {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  width: 100%;
  text-align: left;
  transition: background var(--duration-fast);
}
.gcr-vip-toggle:hover { background: var(--color-accent-light); border-color: rgba(232,160,64,.3); }
.gcr-vip-toggle.active {
  background: var(--color-accent-light);
  border-color: rgba(232,160,64,.4);
}
.gcr-vip-toggle-icon {
  font-size: 20px;
  flex-shrink: 0;
  width: 28px;
  text-align: center;
}
.gcr-vip-toggle-text {
  flex: 1;
  min-width: 0;
}
.gcr-vip-toggle-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
}
.gcr-vip-toggle-sub {
  font-size: 11px;
  color: var(--color-text-muted);
}

/* Stats row */
.gcr-stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-3);
}
.gcr-stat-card {
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  text-align: center;
}
.gcr-stat-num {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-primary);
  line-height: 1;
  margin-bottom: 4px;
}
.gcr-stat-num.red { color: var(--color-destructive); }
.gcr-stat-lbl {
  font-size: 11px;
  color: var(--color-text-muted);
  font-weight: 500;
  line-height: 1.3;
}

/* Tags editor */
.gcr-tags-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  min-height: 44px;
  align-items: flex-start;
}
.gcr-tag-chip-edit {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 500;
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
}
.gcr-tag-chip-edit.allergy {
  background: var(--color-destructive-light);
  color: var(--color-destructive);
  border-color: rgba(181,59,47,.2);
}
.gcr-tag-chip-edit.seating {
  background: var(--color-info-light);
  color: var(--color-info);
  border-color: rgba(43,108,176,.2);
}
.gcr-tag-remove {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: rgba(0,0,0,.12);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 0;
  line-height: 1;
  font-size: 10px;
  color: inherit;
  transition: background var(--duration-fast);
}
.gcr-tag-remove:hover { background: rgba(0,0,0,.25); }
.gcr-tag-add-row {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-2);
  align-items: center;
  flex-wrap: wrap;
}
.gcr-tag-input {
  flex: 1;
  min-width: 120px;
  min-height: 36px;
  padding: var(--space-2) var(--space-3);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 13px;
  color: var(--color-text-primary);
  transition: border-color var(--duration-fast);
}
.gcr-tag-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-light);
}
.gcr-tag-input::placeholder { color: var(--color-text-muted); }
.gcr-tag-add-btn {
  min-height: 36px;
  padding: 0 var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary);
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: background var(--duration-fast);
}
.gcr-tag-add-btn:hover { background: var(--color-surface-raised); }
.gcr-tag-presets {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-2);
}
.gcr-tag-preset {
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-size: 11px;
  font-weight: 500;
  background: var(--color-surface-raised);
  border: 1px dashed var(--color-border-strong);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: background var(--duration-fast), color var(--duration-fast);
}
.gcr-tag-preset:hover {
  background: var(--color-primary-light);
  color: var(--color-primary);
  border-color: var(--color-primary);
}

/* Notes editor */
.gcr-notes-area {
  width: 100%;
  min-height: 96px;
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 14px;
  color: var(--color-text-primary);
  resize: vertical;
  line-height: 1.5;
  font-family: var(--font-sans);
  transition: border-color var(--duration-fast);
}
.gcr-notes-area:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-light);
}
.gcr-notes-area::placeholder { color: var(--color-text-muted); }
.gcr-save-btn {
  min-height: 36px;
  padding: 0 var(--space-5);
  background: var(--color-primary);
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background var(--duration-fast);
  margin-top: var(--space-2);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.gcr-save-btn:hover { background: var(--color-primary-hover); }
.gcr-save-btn:disabled { opacity: 0.55; cursor: not-allowed; }

/* Visit history */
.gcr-history-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.gcr-history-row {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--color-border);
}
.gcr-history-row:last-child { border-bottom: none; }
.gcr-history-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-primary);
  flex-shrink: 0;
  margin-top: 5px;
}
.gcr-history-dot.nosh { background: var(--color-destructive); }
.gcr-history-info {
  flex: 1;
  min-width: 0;
}
.gcr-history-date {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary);
}
.gcr-history-meta {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-top: 1px;
}
.gcr-history-status {
  flex-shrink: 0;
}

/* Responsive: full-screen drawer on phones */
@media (max-width: 599px) {
  .gcr-drawer {
    max-width: 100%;
    border-radius: 0;
  }
  .gcr-drawer-body {
    padding: var(--space-4) var(--space-5);
  }
  .gcr-drawer-head {
    padding: var(--space-4) var(--space-5);
  }
  .gcr-stats-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-2);
  }
  .gcr-stat-num { font-size: 18px; }
  .gcr-guest-row {
    padding: var(--space-3) var(--space-4);
  }
  /* hide numeric stats on narrow phones; info is in aria-label & profile */
  .gcr-guest-stats {
    display: none;
  }
}
@media (max-width: 374px) {
  .gcr-stats-grid { grid-template-columns: 1fr 1fr; }
}
`;

  /* ---- inject styles once ---- */
  var _styleInjected = false;
  function injectStyles() {
    if (_styleInjected) return;
    _styleInjected = true;
    var style = document.createElement('style');
    style.id = 'gcr-styles';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  /* ---- utils from COV ---- */
  function esc(s) { return window.COV.utils.esc(s); }
  function toast(msg, kind) { return window.COV.utils.toast(msg, kind); }
  function fmtDate(iso, tz) { return window.COV.utils.formatDate(iso, tz, { dateStyle: 'medium', timeStyle: 'short' }); }
  function fmtDateOnly(iso, tz) { return window.COV.utils.formatDate(iso, tz, { dateStyle: 'medium', timeStyle: undefined }); }

  /* ---- state local to this module ---- */
  var _state = {
    guests:      [],   // current list
    loading:     true,
    error:       null,
    query:       '',
    sort:        'visits', // 'visits' | 'recency'
    searchTimer: null,
    // drawer
    drawerGuest:        null,
    drawerHistory:      [],
    drawerHistoryLoading: false,
    drawerSaving:       false,
    drawerTagDraft:     '',
  };

  /* ---- tag chip classification ---- */
  function tagClass(tag) {
    var t = String(tag).toLowerCase();
    if (t.startsWith('allergy:') || t.startsWith('allergy ') || t === 'allergy') return 'allergy';
    if (t.startsWith('seating:') || t === 'window-seat' || t === 'outdoor' || t === 'booth' ||
        t.startsWith('seat') || t.startsWith('pref:')) return 'seating';
    return '';
  }

  /* ---- tag display formatter ----
     Turns "seating:window" → "Seating · window", "allergy:nuts" → "Allergy · nuts".
     Known prefix map keeps display consistent; unknown tags are title-cased as-is.
     The underlying stored value is NEVER changed — only the display label differs.  */
  var TAG_PREFIX_MAP = {
    seating:  'Seating',
    allergy:  'Allergy',
    diet:     'Diet',
    pref:     'Preference',
  };

  function formatTagDisplay(tag) {
    var t = String(tag);
    var colonIdx = t.indexOf(':');
    if (colonIdx > 0) {
      var prefix = t.slice(0, colonIdx).toLowerCase();
      var value  = t.slice(colonIdx + 1);
      var label  = TAG_PREFIX_MAP[prefix] || (prefix.charAt(0).toUpperCase() + prefix.slice(1));
      /* Capitalise first letter of value */
      var valDisplay = value.charAt(0).toUpperCase() + value.slice(1);
      return label + ' · ' + valDisplay;
    }
    /* No colon — title-case the whole tag */
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  function isVip(guest) {
    return Array.isArray(guest.tags) && guest.tags.some(function (t) { return t === 'VIP'; });
  }

  /* ---- visit-history: filter client-side from reservations ---- */
  async function loadHistory(guestId, restaurantId) {
    /* data.reservations has no byGuest helper — use listByDate-style query client-side.
       We query directly via data layer using the Supabase client exposed as window.COV.sb. */
    var sb = window.COV.sb;
    if (!sb) return [];
    var res = await sb.from('cov_reservations')
      .select('id, starts_at, party_size, status, cov_tables(id, label)')
      .eq('restaurant_id', restaurantId)
      .eq('guest_id', guestId)
      .order('starts_at', { ascending: false })
      .limit(50);
    if (res.error) throw res.error;
    return res.data || [];
  }

  /* ========================================
     RENDER — section root
  ======================================== */
  function render(sectionEl) {
    injectStyles();

    var rest = window.COV.state.restaurant;
    if (!rest) {
      sectionEl.innerHTML = '<div class="gcr-empty"><div class="gcr-empty-title">Not signed in</div></div>';
      return;
    }

    // Build scaffold once; subsequent calls just reload list
    if (!sectionEl.querySelector('.gcr-root')) {
      sectionEl.innerHTML = buildScaffold();
      wireScaffold(sectionEl, rest);
    }

    loadGuests(sectionEl, rest, false);
  }

  /* ========================================
     SCAFFOLD HTML
  ======================================== */
  function buildScaffold() {
    return [
      '<div class="gcr-root">',
        '<div class="gcr-toolbar">',
          '<div class="gcr-search-wrap">',
            '<svg class="gcr-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none"',
              ' stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">',
              '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
            '<input class="gcr-search" id="gcr-search" type="search" placeholder="Search by name, phone or email"',
              ' aria-label="Search guests" autocomplete="off">',
          '</div>',
          '<select class="gcr-sort" id="gcr-sort" aria-label="Sort guests">',
            '<option value="visits">Most visited</option>',
            '<option value="recency">Most recent</option>',
            '<option value="noshow">No-show rate</option>',
          '</select>',
          '<span class="gcr-count" id="gcr-count" aria-live="polite" aria-atomic="true"></span>',
        '</div>',
        '<div class="gcr-list" id="gcr-list" role="list" aria-label="Guest list">',
          buildSkeletonRows(6),
        '</div>',
      '</div>',
      /* Drawer */
      '<div class="gcr-drawer-overlay" id="gcr-drawer-overlay" role="dialog" aria-modal="true" aria-labelledby="gcr-drawer-guestname">',
        '<div class="gcr-drawer" id="gcr-drawer">',
          '<div class="gcr-drawer-head">',
            '<div class="gcr-drawer-avatar" id="gcr-drawer-avatar" aria-hidden="true">?</div>',
            '<div class="gcr-drawer-title-wrap">',
              '<div class="gcr-drawer-name" id="gcr-drawer-name">',
                '<span class="gcr-drawer-name-text" id="gcr-drawer-guestname">Guest</span>',
              '</div>',
              '<div class="gcr-drawer-sub" id="gcr-drawer-sub"></div>',
            '</div>',
            '<button class="gcr-close-btn" id="gcr-drawer-close" aria-label="Close guest profile">',
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">',
                '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
            '</button>',
          '</div>',
          '<div class="gcr-drawer-body" id="gcr-drawer-body">',
            '<div role="status" aria-live="polite" id="gcr-drawer-status"></div>',
          '</div>',
        '</div>',
      '</div>',
    ].join('');
  }

  /* ========================================
     WIRE scaffold events
  ======================================== */
  function wireScaffold(sectionEl, rest) {
    var searchEl = sectionEl.querySelector('#gcr-search');
    var sortEl   = sectionEl.querySelector('#gcr-sort');

    searchEl.addEventListener('input', function () {
      clearTimeout(_state.searchTimer);
      _state.query = searchEl.value.trim();
      _state.searchTimer = setTimeout(function () {
        loadGuests(sectionEl, rest, true);
      }, 280);
    });

    sortEl.addEventListener('change', function () {
      _state.sort = sortEl.value;
      renderList(sectionEl, rest);
    });

    /* Drawer close */
    var overlay = sectionEl.querySelector('#gcr-drawer-overlay');
    var closeBtn = sectionEl.querySelector('#gcr-drawer-close');

    closeBtn.addEventListener('click', function () { closeDrawer(sectionEl); });
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeDrawer(sectionEl);
    });
    overlay.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeDrawer(sectionEl);
    });
  }

  /* ========================================
     LOAD GUESTS
  ======================================== */
  async function loadGuests(sectionEl, rest, isSearch) {
    var listEl   = sectionEl.querySelector('#gcr-list');
    var countEl  = sectionEl.querySelector('#gcr-count');

    if (!isSearch) {
      listEl.innerHTML = buildSkeletonRows(6);
      listEl.setAttribute('aria-busy', 'true');
      countEl.textContent = '';
    }

    try {
      var guests;
      if (_state.query) {
        guests = await window.COV.data.guests.search(rest.id, _state.query);
      } else {
        guests = await window.COV.data.guests.list(rest.id, { limit: 100 });
      }
      _state.guests = guests || [];
      _state.error  = null;
    } catch (e) {
      _state.error = 'Could not load guests.';
      listEl.setAttribute('aria-busy', 'false');
      listEl.innerHTML = buildErrorHtml(_state.error, function () { loadGuests(sectionEl, rest, false); });
      countEl.textContent = '';
      console.error('[coverly/guests] load error', e);
      return;
    }

    listEl.setAttribute('aria-busy', 'false');
    renderList(sectionEl, rest);
  }

  /* ========================================
     RENDER LIST
  ======================================== */
  function renderList(sectionEl, rest) {
    var listEl  = sectionEl.querySelector('#gcr-list');
    var countEl = sectionEl.querySelector('#gcr-count');

    var sorted = sortGuests(_state.guests.slice(), _state.sort);
    countEl.textContent = sorted.length + ' guest' + (sorted.length !== 1 ? 's' : '');

    if (!sorted.length) {
      listEl.innerHTML = buildEmptyHtml(_state.query);
      return;
    }

    listEl.innerHTML = '<div class="gcr-list-inner">' +
      sorted.map(function (g) { return buildGuestRow(g); }).join('') +
    '</div>';

    /* Wire row clicks */
    listEl.querySelectorAll('.gcr-guest-row').forEach(function (row) {
      var gid = row.dataset.guestId;
      function open() {
        var guest = _state.guests.find(function (g) { return g.id === gid; });
        if (guest) openDrawer(sectionEl, rest, guest);
      }
      row.addEventListener('click', open);
      row.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
      });
    });
  }

  /* ========================================
     SORT
  ======================================== */
  function sortGuests(arr, mode) {
    if (mode === 'recency') {
      return arr.sort(function (a, b) {
        var da = a.last_visit_at ? new Date(a.last_visit_at) : new Date(a.created_at || 0);
        var db = b.last_visit_at ? new Date(b.last_visit_at) : new Date(b.created_at || 0);
        return db - da;
      });
    }
    if (mode === 'noshow') {
      return arr.sort(function (a, b) {
        var rateA = (a.total_visits || 0) > 0 ? (a.no_show_count || 0) / a.total_visits : 0;
        var rateB = (b.total_visits || 0) > 0 ? (b.no_show_count || 0) / b.total_visits : 0;
        return rateB - rateA;
      });
    }
    /* default: most visited */
    return arr.sort(function (a, b) { return (b.total_visits || 0) - (a.total_visits || 0); });
  }

  /* ========================================
     BUILD GUEST ROW HTML
  ======================================== */
  function buildGuestRow(g) {
    var vip     = isVip(g);
    var initials = avatarInitials(g.name);
    var tags    = (g.tags || []).filter(function (t) { return t !== 'VIP'; });
    var noShowRate = (g.total_visits > 0) ? Math.round((g.no_show_count || 0) / g.total_visits * 100) : 0;

    var chipHtml = tags.slice(0, 4).map(function (t) {
      return '<span class="gcr-chip ' + tagClass(t) + '">' + esc(formatTagDisplay(t)) + '</span>';
    }).join('');

    return [
      '<div class="gcr-guest-row" data-guest-id="' + esc(g.id) + '"',
        ' role="listitem" tabindex="0"',
        ' aria-label="' + esc(g.name) + (vip ? ', VIP' : '') + ', ' + esc(String(g.total_visits || 0)) + ' visits">',
        '<div class="gcr-avatar' + (vip ? ' vip' : '') + '" aria-hidden="true">' + esc(initials) + '</div>',
        '<div class="gcr-guest-info">',
          '<div class="gcr-guest-name">',
            '<span class="gcr-guest-name-text">' + esc(g.name || 'Unknown') + '</span>',
            vip ? '<span class="gcr-vip-badge" aria-label="VIP guest">★ VIP</span>' : '',
          '</div>',
          '<div class="gcr-guest-sub">' + esc(g.phone || g.email || 'No contact info') + '</div>',
          chipHtml ? '<div class="gcr-tag-chips" aria-label="Tags">' + chipHtml + '</div>' : '',
        '</div>',
        '<div class="gcr-guest-stats">',
          '<div class="gcr-stat-visits">' + esc(String(g.total_visits || 0)) + 'v</div>',
          '<div class="gcr-stat-nsr' + (noShowRate >= 30 ? ' high' : '') + '">' +
            esc(String(noShowRate)) + '% NS</div>',
        '</div>',
        '<svg class="gcr-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"',
          ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">',
          '<polyline points="9 18 15 12 9 6"/></svg>',
      '</div>',
    ].join('');
  }

  /* ========================================
     DRAWER — OPEN
  ======================================== */
  async function openDrawer(sectionEl, rest, guest) {
    _state.drawerGuest = guest;
    _state.drawerTagDraft = '';

    var overlay  = sectionEl.querySelector('#gcr-drawer-overlay');
    var avatarEl = sectionEl.querySelector('#gcr-drawer-avatar');
    var nameEl   = sectionEl.querySelector('#gcr-drawer-guestname');
    var subEl    = sectionEl.querySelector('#gcr-drawer-sub');
    var bodyEl   = sectionEl.querySelector('#gcr-drawer-body');

    var vip = isVip(guest);
    avatarEl.textContent = avatarInitials(guest.name);
    avatarEl.className   = 'gcr-drawer-avatar' + (vip ? ' vip' : '');
    nameEl.textContent   = guest.name || 'Unknown';
    subEl.textContent    = guest.phone || guest.email || '';

    /* Inject VIP badge next to name */
    var nameContainer = sectionEl.querySelector('#gcr-drawer-name');
    var existingBadge = nameContainer.querySelector('.gcr-vip-badge');
    if (existingBadge) existingBadge.remove();
    if (vip) {
      var badge = document.createElement('span');
      badge.className = 'gcr-vip-badge';
      badge.setAttribute('aria-label', 'VIP guest');
      badge.textContent = '★ VIP';
      nameContainer.appendChild(badge);
    }

    overlay.classList.add('open');
    sectionEl.querySelector('#gcr-drawer-close').focus();

    /* Render profile body (skeleton first) */
    bodyEl.innerHTML = '<div role="status" aria-live="polite" id="gcr-drawer-status"></div>' + buildDrawerSkeleton();

    /* Load history async */
    _state.drawerHistoryLoading = true;
    try {
      var history = await loadHistory(guest.id, rest.id);
      _state.drawerHistory = history;
    } catch (e) {
      _state.drawerHistory = [];
      console.error('[coverly/guests] history load error', e);
    }
    _state.drawerHistoryLoading = false;

    /* Re-fetch fresh guest data */
    try {
      var fresh = await window.COV.data.guests.get(guest.id);
      if (fresh) {
        _state.drawerGuest = fresh;
        /* Patch in-memory list too */
        var idx = _state.guests.findIndex(function (g) { return g.id === fresh.id; });
        if (idx !== -1) _state.guests[idx] = fresh;
      }
    } catch (e) { /* use cached */ }

    renderDrawerBody(sectionEl, rest);
  }

  /* ========================================
     DRAWER — CLOSE
  ======================================== */
  function closeDrawer(sectionEl) {
    var overlay = sectionEl.querySelector('#gcr-drawer-overlay');
    overlay.classList.remove('open');
    _state.drawerGuest = null;
    _state.drawerHistory = [];
  }

  /* ========================================
     DRAWER — RENDER BODY
  ======================================== */
  function renderDrawerBody(sectionEl, rest) {
    var bodyEl = sectionEl.querySelector('#gcr-drawer-body');
    var guest  = _state.drawerGuest;
    if (!guest) return;

    var vip  = isVip(guest);
    var tags = (guest.tags || []).filter(function (t) { return t !== 'VIP'; });
    var nsRate = (guest.total_visits > 0) ?
      Math.round((guest.no_show_count || 0) / guest.total_visits * 100) : 0;
    var lastVisitStr = guest.last_visit_at
      ? fmtDateOnly(guest.last_visit_at, rest.timezone)
      : 'Never';

    /* avatar + VIP refresh */
    var avatarEl = sectionEl.querySelector('#gcr-drawer-avatar');
    var nameContainer = sectionEl.querySelector('#gcr-drawer-name');
    avatarEl.className = 'gcr-drawer-avatar' + (vip ? ' vip' : '');
    var existingBadge = nameContainer.querySelector('.gcr-vip-badge');
    if (existingBadge) existingBadge.remove();
    if (vip) {
      var badge = document.createElement('span');
      badge.className = 'gcr-vip-badge';
      badge.setAttribute('aria-label', 'VIP guest');
      badge.textContent = '★ VIP';
      nameContainer.appendChild(badge);
    }

    bodyEl.innerHTML = [
      '<div role="status" aria-live="polite" id="gcr-drawer-status"></div>',

      /* Stats */
      '<section aria-label="Visit statistics">',
        '<p class="gcr-section-title">Statistics</p>',
        '<div class="gcr-stats-grid">',
          statCard(String(guest.total_visits || 0), 'Total visits', ''),
          statCard(String(guest.no_show_count || 0), 'No-shows', (guest.no_show_count || 0) > 0 ? 'red' : ''),
          statCard(nsRate + '%', 'NS rate', nsRate >= 30 ? 'red' : ''),
        '</div>',
        '<div style="margin-top:var(--space-3);font-size:12px;color:var(--color-text-muted)">Last visit: ' + esc(lastVisitStr) + '</div>',
      '</section>',

      /* Contact */
      '<section aria-label="Contact information">',
        '<p class="gcr-section-title">Contact</p>',
        fieldRow('Phone', guest.phone || '', 'No phone on record'),
        fieldRow('Email', guest.email || '', 'No email on record'),
      '</section>',

      /* VIP toggle */
      '<section aria-label="VIP status">',
        '<p class="gcr-section-title">VIP</p>',
        '<button class="gcr-vip-toggle' + (vip ? ' active' : '') + '" id="gcr-vip-toggle"',
          ' aria-pressed="' + vip + '" aria-label="' + (vip ? 'Remove VIP status' : 'Grant VIP status') + '">',
          '<span class="gcr-vip-toggle-icon" aria-hidden="true">' + (vip ? '★' : '☆') + '</span>',
          '<span class="gcr-vip-toggle-text">',
            '<div class="gcr-vip-toggle-label">' + (vip ? 'VIP — remove' : 'Mark as VIP') + '</div>',
            '<div class="gcr-vip-toggle-sub">Auto-granted at ' +
              esc(String(window.COV.state.restaurant.vip_threshold || 5)) + ' visits. Toggle manually.</div>',
          '</span>',
        '</button>',
      '</section>',

      /* Tags */
      '<section aria-label="Tags and preferences">',
        '<p class="gcr-section-title">Tags &amp; allergies</p>',
        '<div class="gcr-tags-wrap" id="gcr-tags-wrap" aria-label="Current tags">',
          tags.length ? tags.map(function (t) { return buildEditableChip(t); }).join('') : '',
        '</div>',
        '<div class="gcr-tag-add-row">',
          '<input class="gcr-tag-input" id="gcr-tag-input" type="text"',
            ' placeholder="e.g. allergy:nuts" aria-label="New tag" maxlength="50">',
          '<button class="gcr-tag-add-btn" id="gcr-tag-add-btn" type="button">Add tag</button>',
        '</div>',
        '<div class="gcr-tag-presets" aria-label="Quick-add preset tags">',
          quickPreset('allergy:nuts'), quickPreset('allergy:dairy'), quickPreset('allergy:gluten'),
          quickPreset('window-seat'), quickPreset('outdoor'), quickPreset('booth'), quickPreset('quiet'),
        '</div>',
      '</section>',

      /* Notes */
      '<section aria-label="Host notes">',
        '<p class="gcr-section-title">Notes</p>',
        '<textarea class="gcr-notes-area" id="gcr-notes-area" aria-label="Host notes for this guest"',
          ' placeholder="e.g. anniversary on June 10, prefers sparkling water…">',
          esc(guest.notes || ''),
        '</textarea>',
        '<button class="gcr-save-btn" id="gcr-notes-save" type="button">',
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"',
            ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">',
            '<polyline points="20 6 9 17 4 12"/></svg>',
          'Save notes',
        '</button>',
      '</section>',

      /* Visit history */
      '<section aria-label="Visit history">',
        '<p class="gcr-section-title">Visit history</p>',
        '<div id="gcr-history-wrap">',
          buildHistoryHtml(_state.drawerHistory, rest.timezone),
        '</div>',
      '</section>',

    ].join('');

    wireDrawerEvents(sectionEl, rest);
  }

  /* ========================================
     DRAWER — WIRE EVENTS
  ======================================== */
  function wireDrawerEvents(sectionEl, rest) {
    var bodyEl = sectionEl.querySelector('#gcr-drawer-body');

    /* VIP toggle */
    var vipBtn = bodyEl.querySelector('#gcr-vip-toggle');
    if (vipBtn) {
      vipBtn.addEventListener('click', function () {
        toggleVip(sectionEl, rest);
      });
    }

    /* Tag remove buttons */
    bodyEl.querySelectorAll('.gcr-tag-remove').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var tag = btn.dataset.tag;
        if (tag) removeTag(sectionEl, rest, tag);
      });
    });

    /* Tag add */
    var tagInput = bodyEl.querySelector('#gcr-tag-input');
    var tagAddBtn = bodyEl.querySelector('#gcr-tag-add-btn');
    if (tagAddBtn && tagInput) {
      tagAddBtn.addEventListener('click', function () {
        var val = tagInput.value.trim();
        if (val) { addTag(sectionEl, rest, val); tagInput.value = ''; }
      });
      tagInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          var val = tagInput.value.trim();
          if (val) { addTag(sectionEl, rest, val); tagInput.value = ''; }
        }
      });
    }

    /* Preset chips */
    bodyEl.querySelectorAll('.gcr-tag-preset').forEach(function (btn) {
      btn.addEventListener('click', function () {
        addTag(sectionEl, rest, btn.dataset.tag);
      });
    });

    /* Notes save */
    var notesArea = bodyEl.querySelector('#gcr-notes-area');
    var saveBtn   = bodyEl.querySelector('#gcr-notes-save');
    if (saveBtn && notesArea) {
      saveBtn.addEventListener('click', function () {
        saveNotes(sectionEl, rest, notesArea.value);
      });
    }
  }

  /* ========================================
     ACTIONS
  ======================================== */
  async function toggleVip(sectionEl, rest) {
    var guest  = _state.drawerGuest;
    if (!guest) return;
    var vip    = isVip(guest);
    var tags   = (guest.tags || []).slice();
    if (vip) {
      tags = tags.filter(function (t) { return t !== 'VIP'; });
    } else {
      if (!tags.includes('VIP')) tags.push('VIP');
    }
    await patchGuest(sectionEl, rest, guest, { tags: tags });
  }

  async function addTag(sectionEl, rest, tag) {
    var guest = _state.drawerGuest;
    if (!guest) return;
    var tags = (guest.tags || []).slice();
    if (tags.includes(tag)) { toast('Tag already added', 'warn'); return; }
    tags.push(tag);
    await patchGuest(sectionEl, rest, guest, { tags: tags });
  }

  async function removeTag(sectionEl, rest, tag) {
    var guest = _state.drawerGuest;
    if (!guest) return;
    var tags = (guest.tags || []).filter(function (t) { return t !== tag; });
    await patchGuest(sectionEl, rest, guest, { tags: tags });
  }

  async function saveNotes(sectionEl, rest, notes) {
    var guest   = _state.drawerGuest;
    if (!guest) return;
    var saveBtn = sectionEl.querySelector('#gcr-notes-save');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving…'; }
    try {
      await patchGuest(sectionEl, rest, guest, { notes: notes }, true);
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg> Save notes';
      }
    } catch (e) {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg> Save notes';
      }
    }
  }

  async function patchGuest(sectionEl, rest, guest, patch, silent) {
    try {
      var updated = await window.COV.data.guests.update(guest.id, patch);
      _state.drawerGuest = updated;
      /* Patch list cache */
      var idx = _state.guests.findIndex(function (g) { return g.id === updated.id; });
      if (idx !== -1) _state.guests[idx] = updated;
      if (!silent) toast('Saved', 'ok');
      renderDrawerBody(sectionEl, rest);
      /* Refresh list row in background */
      var rowEl = sectionEl.querySelector('[data-guest-id="' + guest.id + '"]');
      if (rowEl) {
        rowEl.outerHTML = buildGuestRow(updated);
        /* re-wire new row */
        var newRow = sectionEl.querySelector('[data-guest-id="' + guest.id + '"]');
        if (newRow) {
          newRow.addEventListener('click', function () { openDrawer(sectionEl, rest, updated); });
          newRow.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDrawer(sectionEl, rest, updated); }
          });
        }
      }
    } catch (e) {
      toast('Could not save. Please try again.', 'err');
      console.error('[coverly/guests] patch error', e);
      throw e;
    }
  }

  /* ========================================
     BUILD HTML HELPERS
  ======================================== */
  function buildSkeletonRows(n) {
    var rows = '';
    for (var i = 0; i < n; i++) {
      rows += [
        '<div class="gcr-skel-row" aria-hidden="true">',
          '<div class="gcr-skel-avatar skeleton"></div>',
          '<div class="gcr-skel-lines">',
            '<div class="skeleton" style="height:13px;width:55%;border-radius:var(--radius-sm)"></div>',
            '<div class="skeleton" style="height:11px;width:38%;border-radius:var(--radius-sm);margin-top:4px"></div>',
          '</div>',
        '</div>',
      ].join('');
    }
    return rows;
  }

  function buildDrawerSkeleton() {
    return [
      '<div aria-hidden="true" style="display:flex;flex-direction:column;gap:var(--space-5)">',
        '<div>',
          '<div class="skeleton" style="height:10px;width:30%;margin-bottom:10px;border-radius:3px"></div>',
          '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-3)">',
            '<div class="skeleton" style="height:72px;border-radius:var(--radius-md)"></div>',
            '<div class="skeleton" style="height:72px;border-radius:var(--radius-md)"></div>',
            '<div class="skeleton" style="height:72px;border-radius:var(--radius-md)"></div>',
          '</div>',
        '</div>',
        '<div>',
          '<div class="skeleton" style="height:10px;width:20%;margin-bottom:10px;border-radius:3px"></div>',
          '<div class="skeleton" style="height:48px;border-radius:var(--radius-md);margin-bottom:8px"></div>',
          '<div class="skeleton" style="height:48px;border-radius:var(--radius-md)"></div>',
        '</div>',
        '<div>',
          '<div class="skeleton" style="height:10px;width:25%;margin-bottom:10px;border-radius:3px"></div>',
          '<div class="skeleton" style="height:80px;border-radius:var(--radius-md)"></div>',
        '</div>',
      '</div>',
    ].join('');
  }

  function buildEmptyHtml(query) {
    if (query) {
      return [
        '<div class="gcr-empty">',
          '<div class="gcr-empty-icon" aria-hidden="true">',
            '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)"',
              ' stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">',
              '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
          '</div>',
          '<div class="gcr-empty-title">No guests found</div>',
          '<p class="gcr-empty-body">No guests match &ldquo;' + esc(query) + '&rdquo;. Check the spelling or try their phone number.</p>',
        '</div>',
      ].join('');
    }
    return [
      '<div class="gcr-empty">',
        '<div class="gcr-empty-icon" aria-hidden="true">',
          '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)"',
            ' stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">',
            '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>',
            '<circle cx="9" cy="7" r="4"/>',
            '<path d="M23 21v-2a4 4 0 0 0-3-3.87"/>',
            '<path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
        '</div>',
        '<div class="gcr-empty-title">No guests yet</div>',
        '<p class="gcr-empty-body">Guest profiles are created automatically when you take reservations. Book a reservation to get started.</p>',
      '</div>',
    ].join('');
  }

  function buildErrorHtml(msg, retryFn) {
    var id = 'gcr-retry-' + Date.now();
    /* Wire retry after render */
    setTimeout(function () {
      var btn = document.getElementById(id);
      if (btn) btn.addEventListener('click', retryFn);
    }, 0);
    return [
      '<div class="gcr-error-bar" role="alert">',
        '<span>' + esc(msg) + '</span>',
        '<button class="gcr-retry-btn" id="' + id + '" type="button">Retry</button>',
      '</div>',
    ].join('');
  }

  function buildHistoryHtml(history, tz) {
    if (!history || !history.length) {
      return '<p style="font-size:13px;color:var(--color-text-muted)">No reservations on record yet.</p>';
    }
    return '<div class="gcr-history-list" role="list">' +
      history.map(function (r) {
        var table = r.cov_tables || {};
        var isNS  = r.status === 'no_show';
        var dateStr = fmtDate(r.starts_at, tz);
        return [
          '<div class="gcr-history-row" role="listitem">',
            '<div class="gcr-history-dot' + (isNS ? ' nosh' : '') + '" aria-hidden="true"></div>',
            '<div class="gcr-history-info">',
              '<div class="gcr-history-date">' + esc(dateStr) + '</div>',
              '<div class="gcr-history-meta">',
                'Party of ' + esc(String(r.party_size || '?')) +
                (table.label ? ' &middot; ' + esc(table.label) : ''),
              '</div>',
            '</div>',
            '<div class="gcr-history-status">',
              '<span class="badge badge-' + esc(r.status || 'booked') + '">' + esc(r.status || '') + '</span>',
            '</div>',
          '</div>',
        ].join('');
      }).join('') +
    '</div>';
  }

  function buildEditableChip(tag) {
    var cls = tagClass(tag);
    return [
      '<span class="gcr-tag-chip-edit ' + cls + '">',
        esc(tag),
        '<button class="gcr-tag-remove" data-tag="' + esc(tag) + '"',
          ' aria-label="Remove tag ' + esc(tag) + '" type="button">×</button>',
      '</span>',
    ].join('');
  }

  function quickPreset(tag) {
    return '<button class="gcr-tag-preset" data-tag="' + esc(tag) + '" type="button">' + esc(tag) + '</button>';
  }

  function statCard(num, lbl, mod) {
    return [
      '<div class="gcr-stat-card">',
        '<div class="gcr-stat-num' + (mod ? ' ' + mod : '') + '">' + esc(num) + '</div>',
        '<div class="gcr-stat-lbl">' + esc(lbl) + '</div>',
      '</div>',
    ].join('');
  }

  function fieldRow(label, value, emptyMsg) {
    var hasVal = value && value.trim();
    return [
      '<div class="gcr-field-row">',
        '<div class="gcr-field-label">' + esc(label) + '</div>',
        '<div class="gcr-field-value' + (hasVal ? '' : ' empty') + '">',
          esc(hasVal ? value : emptyMsg),
        '</div>',
      '</div>',
    ].join('');
  }

  function avatarInitials(name) {
    if (!name) return '?';
    var parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  /* ========================================
     REGISTER MODULE
  ======================================== */
  window.COV = window.COV || {};
  window.COV.screens = window.COV.screens || {};
  window.COV.screens.guests = {
    render: render,
  };

}());
