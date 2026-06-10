/* ============================================================================
   Mesa — Team & Staff screen module for Tavolo
   Registers: window.COV.screens['qr-staff'] = PLAT.screens['qr-staff'] = { render(sectionEl) }
   Owns:      assets/mesa-staff.js  (this file only — no edits to index.html or any other file)

   Features:
     - Tenant resolution: mesa_restaurants SELECT limit 1 maybeSingle, cached per session
     - Staff CRUD list (mesa_staff table): add / edit / delete with confirmation
     - Tip-earnings KPI cards (last 30 days): total tips, avg per server, top earner
     - Server performance table driven by v_mesa_tips_by_server (same query as dashboard.html)
     - KPI count-up animation (respects prefers-reduced-motion)
     - Full loading / empty / error states for every async operation
     - Own modal for add/edit staff (no DOM outside sectionEl — modal appended to sectionEl)
     - CSS injected once under <style id="mesa-staff-css">; all classes namespaced .mesa-*

   Queries used:
     1. sb.from('mesa_restaurants').select('*').limit(1).maybeSingle()
     2. sb.from('mesa_staff').select('*').eq('restaurant_id', rid).order('name')
     3. sb.from('v_mesa_tips_by_server').select('*').eq('restaurant_id', rid).gte('day', since)
     4. sb.from('mesa_staff').insert(...)
     5. sb.from('mesa_staff').update(...).eq('id', id)
     6. sb.from('mesa_staff').delete().eq('id', id)

   CSS prefix: .mesa-*   (zero collision with shell classes)
   Not ported: The onboarding wizard, floor board, settings, QR-tables, and
               analytics sections — those remain in their own modules.
               KPI currency-symbol lookup is local (no MESA.money dep assumed);
               PLAT.utils.money is used when available, falls back to a local impl.
============================================================================ */
(function () {
  'use strict';

  /* ---- CSS ---------------------------------------------------------------- */
  var CSS = '\n' +
    /* Root layout */
    '.mesa-staff-root { display: flex; flex-direction: column; gap: var(--space-5); min-width: 0; }\n' +

    /* Section header */
    '.mesa-staff-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-3); }\n' +
    '.mesa-staff-title { font-size: 22px; font-weight: 600; letter-spacing: -0.01em; color: var(--color-text-primary); }\n' +

    /* KPI grid */
    '.mesa-kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-4); }\n' +
    '.mesa-kpi-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-5); }\n' +
    '.mesa-kpi-label { font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--color-text-muted); margin-bottom: var(--space-2); }\n' +
    '.mesa-kpi-value { font-size: 28px; font-weight: 600; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; color: var(--color-text-primary); line-height: 1.1; }\n' +

    /* Card wrapper */
    '.mesa-staff-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow: hidden; }\n' +

    /* Data table */
    '.mesa-data-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }\n' +
    '.mesa-data-table { width: 100%; border-collapse: collapse; min-width: 480px; }\n' +
    '.mesa-data-table th { font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--color-text-muted); padding: var(--space-3) var(--space-4); text-align: left; border-bottom: 1px solid var(--color-border); }\n' +
    '.mesa-data-table td { padding: var(--space-3) var(--space-4); border-bottom: 1px solid var(--color-border); font-size: 14px; color: var(--color-text-primary); vertical-align: middle; }\n' +
    '.mesa-data-table tr:last-child td { border-bottom: none; }\n' +
    '.mesa-data-table tr:hover td { background: var(--color-surface-raised); }\n' +
    '.mesa-num { font-variant-numeric: tabular-nums; }\n' +

    /* Avatar chip */
    '.mesa-avatar { width: 32px; height: 32px; border-radius: 50%; background: var(--color-primary-light); display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; color: var(--color-primary); flex-shrink: 0; }\n' +
    '.mesa-staff-name-cell { display: flex; align-items: center; gap: var(--space-2); min-width: 0; }\n' +
    '.mesa-staff-name-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }\n' +
    '.mesa-role-badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: var(--radius-full); font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; background: var(--color-surface-raised); border: 1px solid var(--color-border); color: var(--color-text-secondary); margin-left: var(--space-2); flex-shrink: 0; }\n' +

    /* Icon buttons */
    '.mesa-icon-btn { width: 32px; height: 32px; min-width: 44px; min-height: 44px; border-radius: var(--radius-sm); background: none; border: 1px solid var(--color-border); display: inline-flex; align-items: center; justify-content: center; cursor: pointer; color: var(--color-text-secondary); transition: color var(--duration-fast), background var(--duration-fast); }\n' +
    '.mesa-icon-btn:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }\n' +
    '.mesa-icon-btn:hover { color: var(--color-text-primary); background: var(--color-surface-raised); }\n' +
    '.mesa-icon-btn:active { transform: scale(0.92); }\n' +
    '.mesa-icon-btn.danger { color: var(--color-destructive); }\n' +
    '.mesa-icon-btn.danger:hover { background: var(--color-destructive-light); }\n' +
    '.mesa-actions-cell { display: flex; align-items: center; gap: 4px; white-space: nowrap; }\n' +

    /* Payout info banner */
    '.mesa-info-banner { background: var(--color-info-light, #EBF4FF); border: 1px solid var(--color-info, #2B6CB0); border-radius: var(--radius-lg); padding: var(--space-4); font-size: 14px; color: var(--color-info, #2B6CB0); }\n' +

    /* Empty state */
    '.mesa-empty { text-align: center; padding: var(--space-12) var(--space-5); }\n' +
    '.mesa-empty-icon { width: 64px; height: 64px; border-radius: var(--radius-xl); background: var(--color-surface-raised); border: 1px solid var(--color-border); display: flex; align-items: center; justify-content: center; margin: 0 auto var(--space-4); }\n' +
    '.mesa-empty-title { font-size: 16px; font-weight: 600; color: var(--color-text-primary); margin-bottom: var(--space-2); }\n' +
    '.mesa-empty-body { font-size: 14px; color: var(--color-text-secondary); max-width: 320px; margin: 0 auto var(--space-5); line-height: 1.6; }\n' +

    /* Error bar */
    '.mesa-error-bar { background: var(--color-destructive-light); color: var(--color-destructive); border: 1px solid rgba(181,59,47,.2); border-radius: var(--radius-md); padding: var(--space-3) var(--space-4); font-size: 14px; display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); }\n' +
    '.mesa-retry-btn { background: none; border: none; color: var(--color-destructive); font-weight: 600; font-size: 13px; cursor: pointer; text-decoration: underline; padding: 0; min-height: 44px; }\n' +
    '.mesa-retry-btn:focus-visible { outline: 2px solid var(--color-destructive); outline-offset: 2px; }\n' +

    /* Skeleton */
    '.mesa-skeleton-row td { padding: var(--space-3) var(--space-4); border-bottom: 1px solid var(--color-border); }\n' +
    '.mesa-skel { display: inline-block; border-radius: var(--radius-sm); }\n' +

    /* Primary button */
    '.mesa-btn-primary { min-height: 44px; padding: 0 var(--space-5); background: var(--color-primary); color: #fff; border: none; border-radius: var(--radius-md); font-size: 14px; font-weight: 600; cursor: pointer; transition: background var(--duration-fast), opacity var(--duration-fast); white-space: nowrap; display: inline-flex; align-items: center; gap: var(--space-2); }\n' +
    '.mesa-btn-primary:hover { background: var(--color-primary-hover, #a83f20); }\n' +
    '.mesa-btn-primary:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 3px; }\n' +
    '.mesa-btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }\n' +

    /* Secondary button */
    '.mesa-btn-secondary { min-height: 44px; padding: 0 var(--space-5); background: var(--color-surface); color: var(--color-text-primary); border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 14px; font-weight: 500; cursor: pointer; transition: background var(--duration-fast); white-space: nowrap; }\n' +
    '.mesa-btn-secondary:hover { background: var(--color-surface-raised); }\n' +
    '.mesa-btn-secondary:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 3px; }\n' +

    /* Modal overlay */
    '.mesa-modal-overlay { position: fixed; inset: 0; background: var(--color-overlay, rgba(0,0,0,.45)); z-index: 500; display: none; align-items: center; justify-content: center; padding: var(--space-4); }\n' +
    '.mesa-modal-overlay.open { display: flex; }\n' +
    '.mesa-modal { background: var(--color-surface); border-radius: var(--radius-xl); padding: var(--space-8); width: 100%; max-width: 440px; box-shadow: var(--shadow-xl); }\n' +
    '.mesa-modal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-5); }\n' +
    '.mesa-modal-title { font-size: 18px; font-weight: 600; color: var(--color-text-primary); }\n' +
    '.mesa-modal-close { width: 36px; height: 36px; min-width: 44px; min-height: 44px; border-radius: var(--radius-sm); background: none; border: 1px solid var(--color-border); display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--color-text-secondary); }\n' +
    '.mesa-modal-close:hover { background: var(--color-surface-raised); }\n' +
    '.mesa-modal-close:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }\n' +
    '.mesa-modal-body { display: flex; flex-direction: column; gap: var(--space-4); }\n' +
    '.mesa-modal-foot { display: flex; gap: var(--space-3); margin-top: var(--space-5); }\n' +

    /* Form fields */
    '.mesa-field { display: flex; flex-direction: column; gap: var(--space-2); }\n' +
    '.mesa-label { font-size: 13px; font-weight: 500; color: var(--color-text-primary); }\n' +
    '.mesa-input { width: 100%; min-height: 44px; padding: var(--space-2) var(--space-4); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 14px; color: var(--color-text-primary); }\n' +
    '.mesa-input:focus { outline: none; border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-light); }\n' +
    '.mesa-input::placeholder { color: var(--color-text-muted); }\n' +
    '.mesa-select { appearance: none; -webkit-appearance: none; width: 100%; min-height: 44px; padding: var(--space-2) var(--space-4); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 14px; color: var(--color-text-primary); cursor: pointer; }\n' +
    '.mesa-select:focus { outline: none; border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-light); }\n' +

    /* Responsive */
    '@media (max-width: 1023px) { .mesa-kpi-grid { grid-template-columns: repeat(3, 1fr); } }\n' +
    '@media (max-width: 599px) {\n' +
    '  .mesa-kpi-grid { grid-template-columns: 1fr 1fr; }\n' +
    '  .mesa-kpi-value { font-size: 22px; }\n' +
    '  .mesa-modal { padding: var(--space-6) var(--space-5); }\n' +
    '  .mesa-modal-overlay { align-items: flex-end; padding: 0; }\n' +
    '  .mesa-modal { border-radius: var(--radius-xl) var(--radius-xl) 0 0; max-width: 100%; margin: 0; max-height: 92vh; overflow-y: auto; }\n' +
    '}\n' +
    '@media (max-width: 374px) { .mesa-kpi-grid { grid-template-columns: 1fr; } }\n' +
    '@media (prefers-reduced-motion: reduce) { * { transition-duration: .01ms !important; animation-duration: .01ms !important; } }\n';

  /* ---- inject styles once ------------------------------------------------- */
  function injectStyles() {
    if (document.getElementById('mesa-staff-css')) return;
    var style = document.createElement('style');
    style.id = 'mesa-staff-css';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  /* ---- grab platform utils ------------------------------------------------ */
  function getPLAT() { return window.PLAT || {}; }
  function getSb()   { return (getPLAT().client || getPLAT().sb || window.MESA && window.MESA.sb || null); }

  function esc(s) {
    var u = getPLAT().utils;
    if (u && u.esc) return u.esc(s);
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function toast(msg, kind) {
    var u = getPLAT().utils;
    if (u && u.toast) { u.toast(msg); return; }
    if (window.MESA && window.MESA.toast) { window.MESA.toast(msg, kind); return; }
    console.info('[mesa-staff] toast:', msg);
  }

  /* Local money formatter — used only when PLAT.utils.money is absent */
  var CUR_SYM = { USD: '$', GBP: '£', EUR: '€', AED: 'AED ', SAR: 'SAR ', AUD: 'A$', CAD: 'C$' };
  function money(cents, currency) {
    var u = getPLAT().utils;
    if (u && u.money) return u.money(cents, currency);
    var sym = CUR_SYM[currency || 'USD'] || (currency ? currency + ' ' : '$');
    var v = (Number(cents || 0) / 100).toLocaleString(undefined, {
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    });
    return sym + v;
  }

  function currencyPrefix(cur) {
    var map = { GBP: '£', USD: '$', EUR: '€' };
    return map[cur] || '';
  }

  /* ---- module state ------------------------------------------------------- */
  var _rest  = null;   /* cached mesa_restaurants row */
  var _staff = [];     /* current staff list */
  var _tipMap = {};    /* { serverName: { tips, sessions, rev } } */

  /* ---- tenant resolution -------------------------------------------------- */
  async function loadRestaurant() {
    if (_rest) return _rest;
    var sb = getSb();
    if (!sb) throw new Error('Supabase client not available');
    var res = await sb.from('mesa_restaurants').select('*').limit(1).maybeSingle();
    if (res.error) throw res.error;
    _rest = res.data;
    return _rest;
  }

  /* ---- tip data ----------------------------------------------------------- */
  async function loadTipData(rid) {
    var sb = getSb();
    var since = new Date();
    since.setDate(since.getDate() - 30);
    var sinceStr = since.toISOString().slice(0, 10);
    var res = await sb.from('v_mesa_tips_by_server')
      .select('*')
      .eq('restaurant_id', rid)
      .gte('day', sinceStr);
    if (res.error) throw res.error;
    var rows = res.data || [];
    var map = {};
    rows.forEach(function (t) {
      var k = t.server_name || '—';
      if (!map[k]) map[k] = { tips: 0, sessions: 0, rev: 0 };
      map[k].tips    += (t.total_tip_cents     || 0);
      map[k].sessions += (t.sessions_served    || 0);
      map[k].rev     += (t.total_revenue_cents || 0);
    });
    return map;
  }

  /* ---- KPI count-up ------------------------------------------------------- */
  function animateCountUp(el, endVal, prefix, suffix, decimals) {
    if (typeof endVal !== 'number' || !isFinite(endVal)) return;
    var duration = 700;
    var startTime = null;
    var fmt = function (n) { return (prefix || '') + n.toFixed(decimals || 0) + (suffix || ''); };
    function step(ts) {
      if (!startTime) startTime = ts;
      var progress = Math.min((ts - startTime) / duration, 1);
      var ease = 1 - Math.pow(1 - progress, 3);
      el.textContent = fmt(endVal * ease);
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = fmt(endVal);
    }
    requestAnimationFrame(step);
  }

  function runKpiCountUps(container) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var els = (container || document).querySelectorAll('.mesa-kpi-value[data-cu]');
    for (var i = 0; i < els.length; i++) {
      var el  = els[i];
      var val = parseFloat(el.dataset.cu);
      if (!isNaN(val)) animateCountUp(el, val, el.dataset.pre || '', el.dataset.suf || '', parseInt(el.dataset.dec || '0') || 0);
    }
  }

  /* ---- avatar initials ---------------------------------------------------- */
  function initials(name) {
    if (!name) return '?';
    var parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  /* ---- build scaffold ----------------------------------------------------- */
  function buildScaffold() {
    return [
      '<div class="mesa-staff-root">',

        /* header */
        '<div class="mesa-staff-header">',
          '<h2 class="mesa-staff-title">Team &amp; Tips</h2>',
          '<button class="mesa-btn-primary" id="ms-add-btn">',
            svgIcon('add-user'),
            'Add team member',
          '</button>',
        '</div>',

        /* KPI row — live region so count-ups are not announced letter by letter */
        '<div class="mesa-kpi-grid" id="ms-kpi" aria-live="polite" aria-atomic="true" role="status">',
          buildKpiSkeletons(),
        '</div>',

        /* Staff table card */
        '<div class="mesa-staff-card">',
          '<div class="mesa-data-wrap">',
            '<table class="mesa-data-table" id="ms-table">',
              '<thead>',
                '<tr>',
                  '<th scope="col">Server</th>',
                  '<th scope="col">Sessions served</th>',
                  '<th scope="col">Tips earned</th>',
                  '<th scope="col">Avg tip %</th>',
                  '<th scope="col"><span class="sr-only">Actions</span></th>',
                '</tr>',
              '</thead>',
              '<tbody id="ms-tbody">',
                buildSkeletonRows(3),
              '</tbody>',
            '</table>',
          '</div>',
        '</div>',

        /* Empty state — hidden until needed */
        '<div id="ms-empty" class="mesa-empty" style="display:none" role="status">',
          '<div class="mesa-empty-icon" aria-hidden="true">',
            svgIcon('users'),
          '</div>',
          '<p class="mesa-empty-title">No team members yet</p>',
          '<p class="mesa-empty-body">Add your team to track tip performance and session counts.</p>',
          '<button class="mesa-btn-primary ms-add-trigger">',
            svgIcon('add-user'),
            'Add team member',
          '</button>',
        '</div>',

        /* Error bar — hidden until needed */
        '<div id="ms-error" class="mesa-error-bar" role="alert" style="display:none">',
          '<span id="ms-error-msg"></span>',
          '<button class="mesa-retry-btn" id="ms-retry">Retry</button>',
        '</div>',

        /* Payout info banner */
        '<div class="mesa-info-banner" role="note">',
          'Payout processing is coming soon. Use this summary to pay your team manually.',
        '</div>',

      '</div>',

      /* Add/Edit modal — appended inside sectionEl to scope focus */
      '<div class="mesa-modal-overlay" id="ms-modal" role="dialog" aria-modal="true" aria-labelledby="ms-modal-title">',
        '<div class="mesa-modal">',
          '<div class="mesa-modal-head">',
            '<h3 class="mesa-modal-title" id="ms-modal-title">Add team member</h3>',
            '<button class="mesa-modal-close" id="ms-modal-close" aria-label="Close">',
              svgIcon('x'),
            '</button>',
          '</div>',
          '<div class="mesa-modal-body">',
            '<input type="hidden" id="ms-staff-id">',
            '<div class="mesa-field">',
              '<label class="mesa-label" for="ms-staff-name">Full name</label>',
              '<input id="ms-staff-name" class="mesa-input" type="text" placeholder="e.g. Alex Chen" autocomplete="off">',
            '</div>',
            '<div class="mesa-field">',
              '<label class="mesa-label" for="ms-staff-role">Role</label>',
              '<select id="ms-staff-role" class="mesa-select mesa-input">',
                '<option value="server">Server</option>',
                '<option value="bartender">Bartender</option>',
                '<option value="manager">Manager</option>',
              '</select>',
            '</div>',
          '</div>',
          '<div class="mesa-modal-foot">',
            '<button class="mesa-btn-primary" id="ms-modal-save" style="flex:1">Add to team</button>',
            '<button class="mesa-btn-secondary" id="ms-modal-cancel">Cancel</button>',
          '</div>',
        '</div>',
      '</div>',

    ].join('');
  }

  /* ---- small SVG icons ---------------------------------------------------- */
  function svgIcon(name) {
    var icons = {
      'add-user': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>',
      'users':    '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
      'edit':     '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
      'trash':    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>',
      'x':        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    };
    return icons[name] || '';
  }

  /* ---- skeleton builders -------------------------------------------------- */
  function buildKpiSkeletons() {
    var html = '';
    for (var i = 0; i < 3; i++) {
      html += '<div class="mesa-kpi-card" aria-hidden="true">'
        + '<div class="skeleton" style="height:10px;width:60%;border-radius:3px;margin-bottom:8px"></div>'
        + '<div class="skeleton" style="height:28px;width:70%;border-radius:3px"></div>'
        + '</div>';
    }
    return html;
  }

  function buildSkeletonRows(n) {
    var html = '';
    for (var i = 0; i < n; i++) {
      html += '<tr class="mesa-skeleton-row" aria-hidden="true">'
        + '<td><div class="mesa-skel skeleton" style="height:14px;width:120px"></div></td>'
        + '<td><div class="mesa-skel skeleton" style="height:14px;width:40px"></div></td>'
        + '<td><div class="mesa-skel skeleton" style="height:14px;width:60px"></div></td>'
        + '<td><div class="mesa-skel skeleton" style="height:14px;width:40px"></div></td>'
        + '<td><div class="mesa-skel skeleton" style="height:14px;width:60px"></div></td>'
        + '</tr>';
    }
    return html;
  }

  /* ---- render KPI cards --------------------------------------------------- */
  function renderKpi(sectionEl, tipMap, currency) {
    var kpiEl = sectionEl.querySelector('#ms-kpi');
    if (!kpiEl) return;

    var serverKeys = Object.keys(tipMap);
    var totalTips = serverKeys.reduce(function (s, k) { return s + tipMap[k].tips; }, 0);
    var topEntry  = serverKeys.length
      ? serverKeys.reduce(function (best, k) { return tipMap[k].tips > tipMap[best].tips ? k : best; }, serverKeys[0])
      : null;
    var avgTip = _staff.length ? Math.round(totalTips / _staff.length) : 0;
    var cur = currency || 'USD';
    var pre = currencyPrefix(cur);

    var defs = [
      { label: 'Tips this period (30 d)',  value: money(totalTips, cur), raw: totalTips / 100, pre: pre, suf: '', dec: 2 },
      { label: 'Avg per server',           value: money(avgTip, cur),    raw: avgTip / 100,    pre: pre, suf: '', dec: 2 },
      { label: 'Top earner',               value: topEntry ? esc(topEntry) : '—', raw: null },
    ];

    kpiEl.innerHTML = defs.map(function (k) {
      var cuAttrs = (k.raw !== null && k.raw !== undefined && isFinite(k.raw))
        ? ' data-cu="' + k.raw + '" data-pre="' + esc(k.pre) + '" data-suf="' + esc(k.suf) + '" data-dec="' + k.dec + '"'
        : '';
      return '<div class="mesa-kpi-card">'
        + '<p class="mesa-kpi-label">' + esc(k.label) + '</p>'
        + '<p class="mesa-kpi-value mesa-num"' + cuAttrs + '>' + k.value + '</p>'
        + '</div>';
    }).join('');

    runKpiCountUps(kpiEl);
  }

  /* ---- render staff table ------------------------------------------------- */
  function renderTable(sectionEl, currency) {
    var tbodyEl  = sectionEl.querySelector('#ms-tbody');
    var emptyEl  = sectionEl.querySelector('#ms-empty');
    var errorEl  = sectionEl.querySelector('#ms-error');
    var tableEl  = sectionEl.querySelector('#ms-table');

    if (!tbodyEl) return;
    errorEl.style.display = 'none';

    if (!_staff.length) {
      emptyEl.style.display = 'block';
      tableEl.style.display = 'none';
      tbodyEl.innerHTML     = '';
      return;
    }

    emptyEl.style.display = 'none';
    tableEl.style.display = '';

    var cur = currency || 'USD';
    tbodyEl.innerHTML = _staff.map(function (s) {
      var td     = _tipMap[s.name] || { tips: 0, sessions: 0, rev: 0 };
      var avgPct = td.rev ? ((td.tips / td.rev) * 100).toFixed(1) + '%' : '—';
      var init   = initials(s.name);

      return '<tr>'
        + '<td>'
          + '<div class="mesa-staff-name-cell">'
            + '<span class="mesa-avatar" aria-hidden="true">' + esc(init) + '</span>'
            + '<span class="mesa-staff-name-text">' + esc(s.name || '—') + '</span>'
            + '<span class="mesa-role-badge">' + esc(s.role || 'server') + '</span>'
          + '</div>'
        + '</td>'
        + '<td class="mesa-num">' + esc(String(td.sessions)) + '</td>'
        + '<td class="mesa-num">' + money(td.tips, cur) + '</td>'
        + '<td class="mesa-num">' + esc(avgPct) + '</td>'
        + '<td>'
          + '<div class="mesa-actions-cell">'
            + '<button class="mesa-icon-btn ms-edit-btn"'
              + ' data-sid="'  + esc(s.id)            + '"'
              + ' data-name="' + esc(s.name           || '') + '"'
              + ' data-role="' + esc(s.role           || 'server') + '"'
              + ' aria-label="Edit ' + esc(s.name) + '">'
              + svgIcon('edit')
            + '</button>'
            + '<button class="mesa-icon-btn danger ms-del-btn"'
              + ' data-sid="'  + esc(s.id)   + '"'
              + ' data-name="' + esc(s.name  || '') + '"'
              + ' aria-label="Remove ' + esc(s.name) + '">'
              + svgIcon('trash')
            + '</button>'
          + '</div>'
        + '</td>'
        + '</tr>';
    }).join('');

    wireTableButtons(sectionEl, currency);
  }

  /* ---- wire table action buttons ------------------------------------------ */
  function wireTableButtons(sectionEl, currency) {
    var sb = getSb();

    /* Delete buttons */
    var delBtns = sectionEl.querySelectorAll('.ms-del-btn');
    for (var i = 0; i < delBtns.length; i++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          var name = btn.dataset.name;
          var sid  = btn.dataset.sid;
          if (!confirm('Remove "' + name + '" from the team?')) return;
          (async function () {
            var res = await sb.from('mesa_staff').delete().eq('id', sid);
            if (res.error) { toast('Error removing team member', 'err'); return; }
            _staff = _staff.filter(function (s) { return s.id !== sid; });
            delete _tipMap[name];
            renderKpi(sectionEl, _tipMap, currency);
            renderTable(sectionEl, currency);
            toast(name + ' removed', 'ok');
          })();
        });
      }(delBtns[i]));
    }

    /* Edit buttons */
    var editBtns = sectionEl.querySelectorAll('.ms-edit-btn');
    for (var j = 0; j < editBtns.length; j++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          openModal(sectionEl, currency, {
            id:   btn.dataset.sid,
            name: btn.dataset.name,
            role: btn.dataset.role || 'server',
          });
        });
      }(editBtns[j]));
    }
  }

  /* ---- modal: open -------------------------------------------------------- */
  function openModal(sectionEl, currency, staffRow) {
    var modal     = sectionEl.querySelector('#ms-modal');
    var titleEl   = sectionEl.querySelector('#ms-modal-title');
    var saveBtn   = sectionEl.querySelector('#ms-modal-save');
    var idInput   = sectionEl.querySelector('#ms-staff-id');
    var nameInput = sectionEl.querySelector('#ms-staff-name');
    var roleInput = sectionEl.querySelector('#ms-staff-role');

    if (staffRow) {
      titleEl.textContent      = 'Edit team member';
      saveBtn.textContent      = 'Save changes';
      idInput.value            = staffRow.id || '';
      nameInput.value          = staffRow.name || '';
      roleInput.value          = staffRow.role || 'server';
    } else {
      titleEl.textContent = 'Add team member';
      saveBtn.textContent = 'Add to team';
      idInput.value       = '';
      nameInput.value     = '';
      roleInput.value     = 'server';
    }

    modal.classList.add('open');
    /* Delay focus into the modal to let the display change settle */
    setTimeout(function () { nameInput.focus(); }, 50);
  }

  /* ---- modal: close ------------------------------------------------------- */
  function closeModal(sectionEl) {
    var modal = sectionEl.querySelector('#ms-modal');
    modal.classList.remove('open');
  }

  /* ---- modal: save -------------------------------------------------------- */
  function wireModal(sectionEl, currency) {
    var modal    = sectionEl.querySelector('#ms-modal');
    var closeBtn = sectionEl.querySelector('#ms-modal-close');
    var cancelBtn = sectionEl.querySelector('#ms-modal-cancel');
    var saveBtn  = sectionEl.querySelector('#ms-modal-save');
    var nameInput = sectionEl.querySelector('#ms-staff-name');
    var sb = getSb();

    function doClose() { closeModal(sectionEl); }

    closeBtn.addEventListener('click', doClose);
    cancelBtn.addEventListener('click', doClose);

    /* Close on overlay click */
    modal.addEventListener('click', function (e) {
      if (e.target === modal) doClose();
    });

    /* Escape key */
    modal.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') doClose();
    });

    /* Enter in name field submits */
    nameInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); saveBtn.click(); }
    });

    saveBtn.addEventListener('click', function () {
      var name = nameInput.value.trim();
      if (!name) { toast('Enter a name', 'err'); nameInput.focus(); return; }
      var role = sectionEl.querySelector('#ms-staff-role').value;
      var id   = sectionEl.querySelector('#ms-staff-id').value;

      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving…';

      (async function () {
        try {
          if (id) {
            /* Update */
            var res = await sb.from('mesa_staff').update({ name: name, role: role }).eq('id', id).select('*').single();
            if (res.error) throw res.error;
            var updated = res.data;
            _staff = _staff.map(function (s) { return s.id === id ? updated : s; });
            toast('Team member updated', 'ok');
          } else {
            /* Insert */
            var ins = await sb.from('mesa_staff').insert({
              restaurant_id: _rest.id,
              name:          name,
              role:          role,
              is_active:     true,
            }).select('*').single();
            if (ins.error) throw ins.error;
            _staff.push(ins.data);
            toast(name + ' added to team', 'ok');
          }
          doClose();
          /* Reload tip data so the new server picks up existing earnings */
          _tipMap = await loadTipData(_rest.id);
          renderKpi(sectionEl, _tipMap, currency);
          renderTable(sectionEl, currency);
        } catch (err) {
          toast('Error saving team member', 'err');
          console.error('[mesa-staff] save error', err);
        } finally {
          saveBtn.disabled = false;
          var titleEl = sectionEl.querySelector('#ms-modal-title');
          saveBtn.textContent = titleEl && titleEl.textContent === 'Edit team member'
            ? 'Save changes'
            : 'Add to team';
        }
      })();
    });
  }

  /* ---- error display ------------------------------------------------------ */
  function showError(sectionEl, msg, retryFn) {
    var errorEl = sectionEl.querySelector('#ms-error');
    var msgEl   = sectionEl.querySelector('#ms-error-msg');
    var retryEl = sectionEl.querySelector('#ms-retry');
    if (!errorEl) return;
    msgEl.textContent = msg;
    errorEl.style.display = 'flex';
    retryEl.onclick = retryFn;
  }

  /* ---- main load ---------------------------------------------------------- */
  async function loadAll(sectionEl) {
    var tbodyEl = sectionEl.querySelector('#ms-tbody');
    var kpiEl   = sectionEl.querySelector('#ms-kpi');
    var errorEl = sectionEl.querySelector('#ms-error');

    /* Show loading state */
    if (tbodyEl) tbodyEl.innerHTML = buildSkeletonRows(3);
    if (kpiEl)   kpiEl.innerHTML   = buildKpiSkeletons();
    if (errorEl) errorEl.style.display = 'none';

    var rest, tipMap, staffRows;

    try {
      rest = await loadRestaurant();
    } catch (e) {
      console.error('[mesa-staff] restaurant load error', e);
      showError(sectionEl, 'Could not load restaurant data.', function () { loadAll(sectionEl); });
      if (tbodyEl) tbodyEl.innerHTML = '';
      return;
    }

    if (!rest) {
      showError(sectionEl, 'No Mesa restaurant found for this account.', function () { loadAll(sectionEl); });
      if (tbodyEl) tbodyEl.innerHTML = '';
      return;
    }

    var currency = rest.currency || 'USD';

    try {
      var sb = getSb();
      var results = await Promise.all([
        sb.from('mesa_staff').select('*').eq('restaurant_id', rest.id).order('name'),
        loadTipData(rest.id),
      ]);
      var staffRes = results[0];
      if (staffRes.error) throw staffRes.error;
      staffRows = staffRes.data || [];
      tipMap    = results[1];
    } catch (e) {
      console.error('[mesa-staff] data load error', e);
      showError(sectionEl, 'Could not load team data.', function () { loadAll(sectionEl); });
      if (tbodyEl) tbodyEl.innerHTML = '';
      return;
    }

    _staff  = staffRows;
    _tipMap = tipMap;

    renderKpi(sectionEl, _tipMap, currency);
    renderTable(sectionEl, currency);
  }

  /* ========================================================================
     RENDER — entry point called by the shell
  ======================================================================== */
  function render(sectionEl) {
    injectStyles();

    /* Build scaffold once */
    if (!sectionEl.querySelector('.mesa-staff-root')) {
      sectionEl.innerHTML = buildScaffold();

      /* Wire "Add team member" header button */
      sectionEl.querySelector('#ms-add-btn').addEventListener('click', function () {
        openModal(sectionEl, (_rest && _rest.currency) || 'USD', null);
      });

      /* Wire empty-state trigger button */
      var emptyAddBtn = sectionEl.querySelector('.ms-add-trigger');
      if (emptyAddBtn) {
        emptyAddBtn.addEventListener('click', function () {
          openModal(sectionEl, (_rest && _rest.currency) || 'USD', null);
        });
      }

      wireModal(sectionEl, (_rest && _rest.currency) || 'USD');
    }

    loadAll(sectionEl);
  }

  /* ========================================================================
     REGISTER MODULE
  ======================================================================== */
  window.PLAT = window.PLAT || {};
  window.PLAT.screens = window.PLAT.screens || {};
  window.COV = window.COV || {};
  window.COV.screens = window.COV.screens || {};

  var screenDef = { render: render };

  window.PLAT.screens['qr-staff'] = screenDef;
  window.COV.screens['qr-staff']  = screenDef;

  console.info('[tavolo] mesa-staff.js ready — screen "qr-staff" registered');

}());
