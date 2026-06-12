/* ============================================================================
   Tavolo POS — Staff screen module
   Registers:
     window.COV.screens['pos-staff']
     window.PLAT.screens['pos-staff']
   Usage: shell calls render(sectionEl) when the section is activated.

   Features:
     - Staff CRUD: add / edit / delete from mesa_staff
     - Fields: name, role (server/bartender/cashier/manager/owner), PIN (4–6 digit),
       is_active toggle
     - PIN shown masked (●●●●) with a per-row reveal toggle (eye icon)
     - Helper text explaining PINs are used for POS terminal login
     - Role badges with distinct Midnight & Copper colour coding
     - Loading / empty / error states; no raw errors in DOM
     - Fully keyboard-accessible; 44 px minimum touch targets
     - All classes namespaced .posstaff-* to avoid collision

   CSS: injected once via <style id="posstaff-css">
   Does NOT depend on qr_pay being on. Restaurant resolved from
   mesa_restaurants limit 1 (owner RLS).
============================================================================ */
(function () {
  'use strict';

  /* ==========================================================================
     CONSTANTS
  ========================================================================== */
  var RESTAURANT_ID = 'a1000000-0000-0000-0000-000000000001';
  var ROLES = ['server', 'bartender', 'cashier', 'manager', 'owner'];

  /* ==========================================================================
     CSS
  ========================================================================== */
  var CSS = [
    /* Root */
    '.posstaff-root{display:flex;flex-direction:column;gap:var(--space-5);min-width:0}',

    /* Toolbar */
    '.posstaff-toolbar{display:flex;align-items:center;justify-content:space-between;gap:var(--space-3);flex-wrap:wrap}',
    '.posstaff-toolbar-title{font-size:22px;font-weight:600;letter-spacing:-0.01em;color:var(--color-text-primary);flex-shrink:0;min-width:0}',
    '.posstaff-toolbar-actions{display:flex;gap:var(--space-3);flex-shrink:0;flex-wrap:wrap}',

    /* Info banner */
    '.posstaff-pin-banner{background:var(--color-primary-light);border:1px solid rgba(194,112,61,.25);border-radius:var(--radius-md);padding:var(--space-3) var(--space-4);font-size:13px;color:var(--color-primary);display:flex;align-items:flex-start;gap:var(--space-2);line-height:1.5}',
    '.posstaff-pin-banner svg{flex-shrink:0;margin-top:1px}',

    /* Buttons */
    '.posstaff-btn{display:inline-flex;align-items:center;justify-content:center;gap:var(--space-2);min-height:44px;padding:0 var(--space-5);border-radius:var(--radius-md);font-size:14px;font-weight:500;cursor:pointer;border:1px solid transparent;transition:background var(--duration-fast),color var(--duration-fast),transform var(--duration-fast),border-color var(--duration-fast);white-space:nowrap;text-decoration:none}',
    '.posstaff-btn:active{transform:scale(.97)}',
    '.posstaff-btn:focus-visible{outline:2px solid var(--color-primary);outline-offset:2px}',
    '.posstaff-btn-primary{background:var(--color-primary);color:#fff}',
    '.posstaff-btn-primary:hover{background:var(--color-primary-hover,var(--color-primary))}',
    '.posstaff-btn-secondary{background:var(--color-surface);color:var(--color-text-primary);border-color:var(--color-border)}',
    '.posstaff-btn-secondary:hover{background:var(--color-surface-raised)}',
    '.posstaff-btn:disabled{opacity:0.55;cursor:not-allowed}',

    /* Icon button */
    '.posstaff-icon-btn{width:36px;height:36px;min-height:44px;min-width:44px;padding:0;border-radius:var(--radius-sm);background:none;border:1px solid var(--color-border);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--color-text-secondary);transition:color var(--duration-fast),background var(--duration-fast),transform var(--duration-fast)}',
    '.posstaff-icon-btn:hover{color:var(--color-text-primary);background:var(--color-surface-raised)}',
    '.posstaff-icon-btn:active{transform:scale(.92)}',
    '.posstaff-icon-btn:focus-visible{outline:2px solid var(--color-primary);outline-offset:2px}',
    '.posstaff-icon-btn-danger{color:var(--color-destructive);border-color:rgba(181,59,47,.3)}',
    '.posstaff-icon-btn-danger:hover{background:var(--color-destructive-light);color:var(--color-destructive)}',

    /* Card / table wrapper */
    '.posstaff-card{background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-lg);overflow:hidden}',
    '.posstaff-data-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}',
    '.posstaff-table{width:100%;border-collapse:collapse;min-width:520px}',
    '.posstaff-table th{font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--color-text-muted);padding:var(--space-3) var(--space-4);text-align:left;border-bottom:1px solid var(--color-border)}',
    '.posstaff-table td{padding:var(--space-3) var(--space-4);border-bottom:1px solid var(--color-border);font-size:14px;color:var(--color-text-primary);vertical-align:middle}',
    '.posstaff-table tr:last-child td{border-bottom:none}',
    '.posstaff-table tr:hover td{background:var(--color-surface-raised)}',

    /* Avatar */
    '.posstaff-avatar{width:32px;height:32px;border-radius:50%;background:var(--color-primary-light);display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:var(--color-primary);flex-shrink:0}',
    '.posstaff-name-cell{display:flex;align-items:center;gap:var(--space-2);min-width:0}',
    '.posstaff-name-text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}',

    /* Role badges */
    '.posstaff-role{display:inline-flex;align-items:center;padding:2px 8px;border-radius:var(--radius-full);font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;flex-shrink:0;border:1px solid transparent}',
    '.posstaff-role-server{background:var(--color-surface-raised);border-color:var(--color-border);color:var(--color-text-secondary)}',
    '.posstaff-role-bartender{background:rgba(43,108,176,.08);border-color:rgba(43,108,176,.25);color:#2B6CB0}',
    '.posstaff-role-cashier{background:rgba(42,122,85,.08);border-color:rgba(42,122,85,.25);color:var(--color-success)}',
    '.posstaff-role-manager{background:#fef3c7;border-color:#d97706;color:#92400e}',
    '.posstaff-role-owner{background:var(--color-primary-light);border-color:rgba(194,112,61,.35);color:var(--color-primary)}',

    /* Active badge */
    '.posstaff-active-badge{display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:500}',
    '.posstaff-active-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}',
    '.posstaff-active-on{color:var(--color-success)}.posstaff-active-on .posstaff-active-dot{background:var(--color-success)}',
    '.posstaff-active-off{color:var(--color-text-muted)}.posstaff-active-off .posstaff-active-dot{background:var(--color-border)}',

    /* PIN cell */
    '.posstaff-pin-cell{display:flex;align-items:center;gap:var(--space-2);white-space:nowrap;font-family:var(--font-mono,monospace);font-size:13px;letter-spacing:0.1em}',
    '.posstaff-pin-toggle{background:none;border:none;padding:4px;display:flex;align-items:center;cursor:pointer;color:var(--color-text-muted);min-height:36px;min-width:36px;border-radius:var(--radius-sm);justify-content:center;flex-shrink:0}',
    '.posstaff-pin-toggle:hover{color:var(--color-text-primary);background:var(--color-surface-raised)}',
    '.posstaff-pin-toggle:focus-visible{outline:2px solid var(--color-primary);outline-offset:2px}',

    /* Actions cell */
    '.posstaff-actions-cell{display:flex;align-items:center;gap:var(--space-1);white-space:nowrap}',

    /* Status bar / error / empty / skeleton */
    '.posstaff-status-bar{background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-md);padding:var(--space-4) var(--space-5);display:flex;align-items:center;gap:var(--space-3)}',
    '.posstaff-spinner{width:20px;height:20px;border:2px solid var(--color-border);border-top-color:var(--color-primary);border-radius:50%;animation:posstaff-spin 0.75s linear infinite;flex-shrink:0}',
    '@keyframes posstaff-spin{to{transform:rotate(360deg)}}',
    '@media (prefers-reduced-motion:reduce){.posstaff-spinner{animation:none;border-top-color:var(--color-primary)}}',
    '.posstaff-status-text{font-size:14px;color:var(--color-text-secondary)}',
    '.posstaff-error-bar{background:var(--color-destructive-light);color:var(--color-destructive);border:1px solid rgba(181,59,47,.2);border-radius:var(--radius-md);padding:var(--space-3) var(--space-4);font-size:14px;display:flex;align-items:center;justify-content:space-between;gap:var(--space-3)}',
    '.posstaff-retry-btn{background:none;border:none;color:var(--color-destructive);font-weight:600;font-size:13px;cursor:pointer;text-decoration:underline;padding:0;min-height:44px;flex-shrink:0}',
    '.posstaff-retry-btn:focus-visible{outline:2px solid var(--color-destructive);outline-offset:2px}',
    '.posstaff-empty{text-align:center;padding:var(--space-12) var(--space-5);display:flex;flex-direction:column;align-items:center;gap:var(--space-3)}',
    '.posstaff-empty-title{font-size:18px;font-weight:600;color:var(--color-text-primary);margin:0}',
    '.posstaff-empty-body{font-size:14px;color:var(--color-text-secondary);max-width:360px;margin:0;line-height:1.6}',
    '.posstaff-skel-row td{padding:var(--space-3) var(--space-4);border-bottom:1px solid var(--color-border)}',
    '.posstaff-skel-cell{display:inline-block;height:14px;border-radius:var(--radius-sm);background:linear-gradient(90deg,var(--color-surface-raised) 25%,var(--color-border) 50%,var(--color-surface-raised) 75%);background-size:800px 100%;animation:posstaff-shimmer 1.4s infinite linear}',
    '@keyframes posstaff-shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}',
    '@media (prefers-reduced-motion:reduce){.posstaff-skel-cell{animation:none;background:var(--color-surface-raised)}}',

    /* Form fields */
    '.posstaff-field{display:flex;flex-direction:column;gap:var(--space-1);margin-bottom:var(--space-4)}',
    '.posstaff-field:last-of-type{margin-bottom:0}',
    '.posstaff-label{font-size:13px;font-weight:500;color:var(--color-text-primary)}',
    '.posstaff-hint{font-size:12px;color:var(--color-text-muted);line-height:1.4}',
    '.posstaff-input{width:100%;min-height:44px;padding:var(--space-2) var(--space-4);background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-md);font-size:14px;color:var(--color-text-primary);transition:border-color var(--duration-fast),box-shadow var(--duration-fast);box-sizing:border-box}',
    '.posstaff-input:focus{outline:none;border-color:var(--color-primary);box-shadow:0 0 0 3px var(--color-primary-light)}',
    '.posstaff-input::placeholder{color:var(--color-text-muted)}',
    '.posstaff-select{appearance:none;-webkit-appearance:none;cursor:pointer}',
    '.posstaff-pin-input-wrap{position:relative}',
    '.posstaff-pin-input-wrap .posstaff-input{padding-right:48px;font-family:var(--font-mono,monospace);letter-spacing:0.12em}',
    '.posstaff-pin-reveal{position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--color-text-muted);padding:4px;display:flex;align-items:center;justify-content:center;min-width:36px;min-height:36px;border-radius:var(--radius-sm)}',
    '.posstaff-pin-reveal:hover{color:var(--color-text-primary)}',
    '.posstaff-pin-reveal:focus-visible{outline:2px solid var(--color-primary);outline-offset:2px}',
    '.posstaff-toggle-row{display:flex;align-items:center;gap:var(--space-3);min-height:44px}',
    '.posstaff-toggle-label{font-size:14px;color:var(--color-text-primary)}',

    /* Modal */
    '.posstaff-modal-overlay{position:fixed;inset:0;background:var(--color-overlay,rgba(28,23,20,.48));z-index:500;display:none;align-items:center;justify-content:center;padding:var(--space-4)}',
    '.posstaff-modal-overlay.posstaff-open{display:flex}',
    '.posstaff-modal{background:var(--color-surface);border-radius:var(--radius-xl);padding:var(--space-7);width:100%;max-width:440px;box-shadow:var(--shadow-xl);animation:posstaff-modal-in .2s var(--easing-decelerate,ease-out) both;min-width:0}',
    '@keyframes posstaff-modal-in{from{opacity:0;transform:scale(.95) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}',
    '.posstaff-modal-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-5)}',
    '.posstaff-modal-title{font-size:20px;font-weight:600;color:var(--color-text-primary);margin:0;min-width:0}',
    '.posstaff-modal-foot{display:flex;gap:var(--space-3);margin-top:var(--space-5)}',

    /* Responsive */
    '@media (max-width:599px){.posstaff-toolbar{flex-direction:column;align-items:flex-start}.posstaff-toolbar-actions{width:100%}}',
    '@media (max-width:1023px){.posstaff-modal{max-width:calc(100vw - 32px)}}',
    '@media (max-width:599px){.posstaff-modal-overlay{align-items:flex-end;padding:0}.posstaff-modal{border-radius:var(--radius-xl) var(--radius-xl) 0 0;max-width:100%;max-height:92vh;overflow-y:auto}}',
  ].join('\n');

  function injectStyles() {
    if (document.getElementById('posstaff-css')) return;
    var s = document.createElement('style');
    s.id = 'posstaff-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ==========================================================================
     UTILS
  ========================================================================== */
  function esc(s) {
    if (window.PLAT && window.PLAT.utils && window.PLAT.utils.esc) {
      return window.PLAT.utils.esc(s);
    }
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function toast(msg, kind) {
    if (window.PLAT && window.PLAT.utils && window.PLAT.utils.toast) {
      window.PLAT.utils.toast(msg, kind);
    }
  }

  function getSb() {
    return (window.PLAT && window.PLAT.client) || null;
  }

  function initials(name) {
    if (!name) return '?';
    var parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  function maskPin(pin) {
    if (!pin) return '—';
    return Array(String(pin).length).fill('●').join('');
  }

  function validatePin(pin) {
    return /^\d{4,6}$/.test(String(pin).trim());
  }

  /* ==========================================================================
     MODULE STATE
  ========================================================================== */
  var _state = {
    staff:      [],
    loading:    true,
    error:      null,
    restaurant: null,
  };
  // Track which rows have PIN revealed: Set of staff IDs
  var _revealed = {};

  /* ==========================================================================
     TENANT
  ========================================================================== */
  function loadRestaurant(cb) {
    if (_state.restaurant) { cb(null, _state.restaurant); return; }
    var sb = getSb();
    if (!sb) { cb(new Error('Supabase client not available'), null); return; }
    sb.from('mesa_restaurants')
      .select('*')
      .eq('id', RESTAURANT_ID)
      .maybeSingle()
      .then(function (res) {
        if (res.error) { cb(res.error, null); return; }
        _state.restaurant = res.data;
        cb(null, _state.restaurant);
      })
      .catch(function (err) { cb(err, null); });
  }

  /* ==========================================================================
     RENDER — entry point
  ========================================================================== */
  function render(sectionEl) {
    injectStyles();

    if (!sectionEl.querySelector('.posstaff-root')) {
      sectionEl.innerHTML = buildScaffold();
      wireModal(sectionEl);
      wireAddBtn(sectionEl);
    }

    loadAll(sectionEl);
  }

  /* ==========================================================================
     SCAFFOLD
  ========================================================================== */
  function buildScaffold() {
    return [
      '<div class="posstaff-root">',

        /* Live region */
        '<div role="status" aria-live="polite" aria-atomic="true" id="posstaff-live"',
          ' style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0"></div>',

        /* Toolbar */
        '<div class="posstaff-toolbar">',
          '<h2 class="posstaff-toolbar-title">Staff</h2>',
          '<div class="posstaff-toolbar-actions">',
            '<button class="posstaff-btn posstaff-btn-primary" id="posstaff-add-btn" type="button"',
              ' aria-label="Add staff member">',
              svgPlus(), ' Add staff member',
            '</button>',
          '</div>',
        '</div>',

        /* PIN info banner */
        '<div class="posstaff-pin-banner" role="note">',
          svgInfo(),
          '<span>Staff PINs (4–6 digits) are how team members log into the POS terminal. '
            + 'Keep them confidential — only share with the individual staff member.</span>',
        '</div>',

        /* Table card */
        '<div class="posstaff-card" id="posstaff-table-card">',
          '<div class="posstaff-data-wrap">',
            '<table class="posstaff-table" id="posstaff-table" aria-label="Staff members">',
              '<thead>',
                '<tr>',
                  '<th scope="col">Name</th>',
                  '<th scope="col">Role</th>',
                  '<th scope="col">POS PIN</th>',
                  '<th scope="col">Status</th>',
                  '<th scope="col"><span class="sr-only">Actions</span></th>',
                '</tr>',
              '</thead>',
              '<tbody id="posstaff-tbody">',
                buildSkeletonRows(4),
              '</tbody>',
            '</table>',
          '</div>',
        '</div>',

        /* Empty state */
        '<div id="posstaff-empty" class="posstaff-empty" style="display:none" role="status">',
          '<svg width="56" height="56" viewBox="0 0 24 24" fill="none"',
            ' stroke="var(--color-text-muted)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"',
            ' aria-hidden="true">',
            '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>',
            '<circle cx="9" cy="7" r="4"/>',
            '<path d="M23 21v-2a4 4 0 0 0-3-3.87"/>',
            '<path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
          '</svg>',
          '<p class="posstaff-empty-title">No staff yet</p>',
          '<p class="posstaff-empty-body">Add your team so they can log into the POS terminal using their PIN.</p>',
          '<button class="posstaff-btn posstaff-btn-primary posstaff-add-trigger" type="button">',
            svgPlus(), ' Add staff member',
          '</button>',
        '</div>',

        /* Error bar */
        '<div id="posstaff-error" class="posstaff-error-bar" role="alert" style="display:none">',
          '<span id="posstaff-error-msg"></span>',
          '<button class="posstaff-retry-btn" id="posstaff-retry" type="button">Retry</button>',
        '</div>',

      '</div>',

      /* ADD / EDIT MODAL */
      '<div class="posstaff-modal-overlay" id="posstaff-modal" role="dialog" aria-modal="true"',
        ' aria-labelledby="posstaff-modal-title">',
        '<div class="posstaff-modal" role="document">',
          '<div class="posstaff-modal-head">',
            '<h3 class="posstaff-modal-title" id="posstaff-modal-title">Add staff member</h3>',
            '<button class="posstaff-icon-btn" id="posstaff-modal-close" type="button" aria-label="Close">',
              svgClose(),
            '</button>',
          '</div>',
          '<input type="hidden" id="posstaff-staff-id">',
          '<div class="posstaff-field">',
            '<label class="posstaff-label" for="posstaff-name">Full name</label>',
            '<input class="posstaff-input" id="posstaff-name" type="text"',
              ' placeholder="e.g. Alex Chen" autocomplete="off">',
          '</div>',
          '<div class="posstaff-field">',
            '<label class="posstaff-label" for="posstaff-role">Role</label>',
            '<select class="posstaff-input posstaff-select" id="posstaff-role">',
              '<option value="server">Server</option>',
              '<option value="bartender">Bartender</option>',
              '<option value="cashier">Cashier</option>',
              '<option value="manager">Manager</option>',
              '<option value="owner">Owner</option>',
            '</select>',
          '</div>',
          '<div class="posstaff-field">',
            '<label class="posstaff-label" for="posstaff-pin">POS PIN</label>',
            '<div class="posstaff-pin-input-wrap">',
              '<input class="posstaff-input" id="posstaff-pin" type="password"',
                ' inputmode="numeric" pattern="\\d{4,6}" maxlength="6"',
                ' placeholder="4–6 digits" autocomplete="new-password">',
              '<button type="button" class="posstaff-pin-reveal" id="posstaff-pin-reveal-modal"',
                ' aria-label="Show PIN" aria-pressed="false">',
                svgEyeClosed(),
              '</button>',
            '</div>',
            '<span class="posstaff-hint">4–6 digits — used to log into the POS terminal</span>',
          '</div>',
          '<div class="posstaff-field">',
            '<div class="posstaff-toggle-row">',
              '<input type="checkbox" id="posstaff-active" checked',
                ' style="width:18px;height:18px;cursor:pointer;accent-color:var(--color-primary)">',
              '<label for="posstaff-active" class="posstaff-toggle-label">Active (can log into POS)</label>',
            '</div>',
          '</div>',
          '<div class="posstaff-modal-foot">',
            '<button class="posstaff-btn posstaff-btn-primary" id="posstaff-modal-save" type="button" style="flex:1">',
              'Add staff member',
            '</button>',
            '<button class="posstaff-btn posstaff-btn-secondary" id="posstaff-modal-cancel" type="button">Cancel</button>',
          '</div>',
        '</div>',
      '</div>',
    ].join('');
  }

  /* ==========================================================================
     LOAD ALL
  ========================================================================== */
  function loadAll(sectionEl) {
    var tbody   = sectionEl.querySelector('#posstaff-tbody');
    var errorEl = sectionEl.querySelector('#posstaff-error');
    var emptyEl = sectionEl.querySelector('#posstaff-empty');
    var card    = sectionEl.querySelector('#posstaff-table-card');

    if (tbody)   tbody.innerHTML   = buildSkeletonRows(4);
    if (errorEl) errorEl.style.display = 'none';
    if (emptyEl) emptyEl.style.display = 'none';
    if (card)    card.style.display    = '';
    announce(sectionEl, 'Loading staff…');
    _state.loading = true;
    _state.error   = null;

    loadRestaurant(function (rErr, restaurant) {
      if (rErr || !restaurant) {
        _state.loading = false;
        _state.error   = 'Could not load restaurant data.';
        showError(sectionEl, _state.error, function () { loadAll(sectionEl); });
        if (tbody) tbody.innerHTML = '';
        if (card)  card.style.display = 'none';
        console.error('[pos-staff] restaurant error', rErr);
        return;
      }

      var sb = getSb();
      if (!sb) {
        _state.loading = false;
        _state.error   = 'Database client not available.';
        showError(sectionEl, _state.error, function () { loadAll(sectionEl); });
        if (tbody) tbody.innerHTML = '';
        if (card)  card.style.display = 'none';
        return;
      }

      sb.from('mesa_staff')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('name')
        .then(function (res) {
          _state.loading = false;
          if (res.error) {
            _state.error = 'Could not load staff.';
            showError(sectionEl, _state.error, function () { loadAll(sectionEl); });
            if (tbody) tbody.innerHTML = '';
            if (card)  card.style.display = 'none';
            console.error('[pos-staff] staff fetch error', res.error);
            return;
          }
          _state.staff = res.data || [];
          renderTable(sectionEl);
        })
        .catch(function (err) {
          _state.loading = false;
          _state.error   = 'Unexpected error loading staff.';
          showError(sectionEl, _state.error, function () { loadAll(sectionEl); });
          if (tbody) tbody.innerHTML = '';
          if (card)  card.style.display = 'none';
          console.error('[pos-staff] load exception', err);
        });
    });
  }

  /* ==========================================================================
     RENDER TABLE
  ========================================================================== */
  function renderTable(sectionEl) {
    var tbody   = sectionEl.querySelector('#posstaff-tbody');
    var emptyEl = sectionEl.querySelector('#posstaff-empty');
    var errorEl = sectionEl.querySelector('#posstaff-error');
    var card    = sectionEl.querySelector('#posstaff-table-card');

    if (!tbody) return;
    if (errorEl) errorEl.style.display = 'none';

    if (!_state.staff.length) {
      if (emptyEl) emptyEl.style.display = 'flex';
      if (card)    card.style.display    = 'none';
      tbody.innerHTML = '';
      announce(sectionEl, 'No staff found. Use Add staff member to create one.');
      // Wire empty-state add button
      var emptyAddBtn = sectionEl.querySelector('.posstaff-add-trigger');
      if (emptyAddBtn) {
        // Remove old listeners by cloning
        var newBtn = emptyAddBtn.cloneNode(true);
        emptyAddBtn.parentNode.replaceChild(newBtn, emptyAddBtn);
        newBtn.addEventListener('click', function () { openModal(sectionEl, null); });
      }
      return;
    }

    if (emptyEl) emptyEl.style.display = 'none';
    if (card)    card.style.display    = '';

    tbody.innerHTML = _state.staff.map(function (s) {
      var init    = initials(s.name);
      var roleKey = (s.role || 'server').toLowerCase();
      var pinMasked = maskPin(s.pin);
      var isRevealed = !!_revealed[s.id];

      return '<tr>'
        + '<td>'
          + '<div class="posstaff-name-cell">'
            + '<span class="posstaff-avatar" aria-hidden="true">' + esc(init) + '</span>'
            + '<span class="posstaff-name-text">' + esc(s.name || '—') + '</span>'
          + '</div>'
        + '</td>'
        + '<td>'
          + '<span class="posstaff-role posstaff-role-' + esc(roleKey) + '">' + esc(s.role || 'server') + '</span>'
        + '</td>'
        + '<td>'
          + '<div class="posstaff-pin-cell">'
            + '<span id="posstaff-pin-val-' + esc(s.id) + '">'
              + (isRevealed ? esc(String(s.pin || '—')) : esc(pinMasked))
            + '</span>'
            + '<button type="button" class="posstaff-pin-toggle"'
              + ' data-action="toggle-pin"'
              + ' data-sid="' + esc(s.id) + '"'
              + ' aria-label="' + (isRevealed ? 'Hide' : 'Show') + ' PIN for ' + esc(s.name) + '"'
              + ' aria-pressed="' + (isRevealed ? 'true' : 'false') + '">'
              + (isRevealed ? svgEyeOpen() : svgEyeClosed())
            + '</button>'
          + '</div>'
        + '</td>'
        + '<td>'
          + '<span class="posstaff-active-badge ' + (s.is_active ? 'posstaff-active-on' : 'posstaff-active-off') + '">'
            + '<span class="posstaff-active-dot" aria-hidden="true"></span>'
            + (s.is_active ? 'Active' : 'Inactive')
          + '</span>'
        + '</td>'
        + '<td>'
          + '<div class="posstaff-actions-cell">'
            + '<button class="posstaff-icon-btn" type="button"'
              + ' data-action="edit"'
              + ' data-sid="' + esc(s.id) + '"'
              + ' aria-label="Edit ' + esc(s.name) + '">'
              + svgEdit()
            + '</button>'
            + '<button class="posstaff-icon-btn posstaff-icon-btn-danger" type="button"'
              + ' data-action="delete"'
              + ' data-sid="' + esc(s.id) + '"'
              + ' data-name="' + esc(s.name || '') + '"'
              + ' aria-label="Delete ' + esc(s.name) + '">'
              + svgTrash()
            + '</button>'
          + '</div>'
        + '</td>'
        + '</tr>';
    }).join('');

    announce(sectionEl, _state.staff.length + ' staff member' + (_state.staff.length !== 1 ? 's' : '') + ' loaded.');

    wireTableButtons(sectionEl);
  }

  /* ==========================================================================
     TABLE BUTTONS — edit / delete / toggle-pin
  ========================================================================== */
  function wireTableButtons(sectionEl) {
    sectionEl.querySelectorAll('[data-action]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var action = btn.dataset.action;
        var sid    = btn.dataset.sid;

        if (action === 'toggle-pin') {
          _revealed[sid] = !_revealed[sid];
          renderTable(sectionEl);
        } else if (action === 'edit') {
          var s = _state.staff.find(function (x) { return x.id === sid; });
          if (s) openModal(sectionEl, s);
        } else if (action === 'delete') {
          doDelete(sectionEl, sid, btn.dataset.name);
        }
      });
      btn.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); btn.click(); }
      });
    });
  }

  /* ==========================================================================
     MODAL — open / close / wire
  ========================================================================== */
  function openModal(sectionEl, staffRow) {
    var overlay    = sectionEl.querySelector('#posstaff-modal');
    var titleEl    = sectionEl.querySelector('#posstaff-modal-title');
    var saveBtn    = sectionEl.querySelector('#posstaff-modal-save');
    var idInp      = sectionEl.querySelector('#posstaff-staff-id');
    var nameInp    = sectionEl.querySelector('#posstaff-name');
    var roleInp    = sectionEl.querySelector('#posstaff-role');
    var pinInp     = sectionEl.querySelector('#posstaff-pin');
    var activeInp  = sectionEl.querySelector('#posstaff-active');
    var pinReveal  = sectionEl.querySelector('#posstaff-pin-reveal-modal');

    if (!overlay) return;

    // Reset PIN field to password type and update reveal button state
    if (pinInp) { pinInp.type = 'password'; }
    if (pinReveal) {
      pinReveal.setAttribute('aria-pressed', 'false');
      pinReveal.setAttribute('aria-label', 'Show PIN');
      pinReveal.innerHTML = svgEyeClosed();
    }

    if (staffRow) {
      if (titleEl)   titleEl.textContent   = 'Edit staff member';
      if (saveBtn)   saveBtn.textContent   = 'Save changes';
      if (idInp)     idInp.value           = staffRow.id || '';
      if (nameInp)   nameInp.value         = staffRow.name || '';
      if (roleInp)   roleInp.value         = staffRow.role || 'server';
      if (pinInp)    pinInp.value          = staffRow.pin  || '';
      if (activeInp) activeInp.checked     = staffRow.is_active !== false;
    } else {
      if (titleEl)   titleEl.textContent   = 'Add staff member';
      if (saveBtn)   saveBtn.textContent   = 'Add staff member';
      if (idInp)     idInp.value           = '';
      if (nameInp)   nameInp.value         = '';
      if (roleInp)   roleInp.value         = 'server';
      if (pinInp)    pinInp.value          = '';
      if (activeInp) activeInp.checked     = true;
    }

    overlay.classList.add('posstaff-open');
    setTimeout(function () { if (nameInp) nameInp.focus(); }, 50);
  }

  function closeModal(sectionEl) {
    var overlay = sectionEl.querySelector('#posstaff-modal');
    if (overlay) overlay.classList.remove('posstaff-open');
  }

  function wireAddBtn(sectionEl) {
    var addBtn = sectionEl.querySelector('#posstaff-add-btn');
    if (addBtn) addBtn.addEventListener('click', function () { openModal(sectionEl, null); });
  }

  function wireModal(sectionEl) {
    var overlay   = sectionEl.querySelector('#posstaff-modal');
    var closeBtn  = sectionEl.querySelector('#posstaff-modal-close');
    var cancelBtn = sectionEl.querySelector('#posstaff-modal-cancel');
    var saveBtn   = sectionEl.querySelector('#posstaff-modal-save');
    var nameInp   = sectionEl.querySelector('#posstaff-name');
    var pinInp    = sectionEl.querySelector('#posstaff-pin');
    var pinReveal = sectionEl.querySelector('#posstaff-pin-reveal-modal');

    function doClose() { closeModal(sectionEl); }

    if (closeBtn)  closeBtn.addEventListener('click',  doClose);
    if (cancelBtn) cancelBtn.addEventListener('click', doClose);
    if (overlay) {
      overlay.addEventListener('click',   function (e) { if (e.target === overlay) doClose(); });
      overlay.addEventListener('keydown', function (e) { if (e.key === 'Escape') doClose(); });
    }

    // PIN visibility toggle in modal
    if (pinReveal && pinInp) {
      pinReveal.addEventListener('click', function () {
        var visible = pinInp.type !== 'password';
        pinInp.type = visible ? 'password' : 'text';
        pinReveal.setAttribute('aria-pressed', String(!visible));
        pinReveal.setAttribute('aria-label', (!visible ? 'Hide' : 'Show') + ' PIN');
        pinReveal.innerHTML = !visible ? svgEyeOpen() : svgEyeClosed();
      });
    }

    // Enter in name / PIN submits
    if (nameInp) nameInp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); if (saveBtn) saveBtn.click(); }
    });
    if (pinInp) pinInp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); if (saveBtn) saveBtn.click(); }
    });

    if (saveBtn) saveBtn.addEventListener('click', function () { doSave(sectionEl); });
  }

  /* ==========================================================================
     SAVE (add or update)
  ========================================================================== */
  function doSave(sectionEl) {
    var idInp     = sectionEl.querySelector('#posstaff-staff-id');
    var nameInp   = sectionEl.querySelector('#posstaff-name');
    var roleInp   = sectionEl.querySelector('#posstaff-role');
    var pinInp    = sectionEl.querySelector('#posstaff-pin');
    var activeInp = sectionEl.querySelector('#posstaff-active');
    var saveBtn   = sectionEl.querySelector('#posstaff-modal-save');

    var id       = idInp     ? idInp.value.trim()             : '';
    var name     = nameInp   ? nameInp.value.trim()           : '';
    var role     = roleInp   ? roleInp.value                  : 'server';
    var pin      = pinInp    ? pinInp.value.trim()            : '';
    var isActive = activeInp ? activeInp.checked              : true;

    if (!name) {
      toast('Enter a name.', 'err');
      if (nameInp) nameInp.focus();
      return;
    }

    // PIN validation — required for new, optional for edit (blank = keep existing)
    if (!id && !pin) {
      toast('Enter a PIN for the new staff member.', 'err');
      if (pinInp) pinInp.focus();
      return;
    }
    if (pin && !validatePin(pin)) {
      toast('PIN must be 4–6 digits.', 'err');
      if (pinInp) pinInp.focus();
      return;
    }

    var sb = getSb();
    if (!sb) { toast('Database client unavailable.', 'err'); return; }

    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving…'; }

    loadRestaurant(function (err, restaurant) {
      if (err || !restaurant) {
        toast('Could not load restaurant.', 'err');
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = id ? 'Save changes' : 'Add staff member';
        }
        return;
      }

      var payload = { name: name, role: role, is_active: isActive };
      if (pin) payload.pin = pin;

      var promise;
      if (id) {
        promise = sb.from('mesa_staff').update(payload).eq('id', id).select('*').single();
      } else {
        payload.restaurant_id = restaurant.id;
        promise = sb.from('mesa_staff').insert(payload).select('*').single();
      }

      promise.then(function (res) {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = id ? 'Save changes' : 'Add staff member';
        }
        if (res.error) {
          toast('Error saving staff member.', 'err');
          console.error('[pos-staff] save error', res.error);
          return;
        }
        if (id) {
          _state.staff = _state.staff.map(function (s) { return s.id === id ? res.data : s; });
          toast('Staff member updated.', 'ok');
        } else {
          _state.staff.push(res.data);
          _state.staff.sort(function (a, b) { return a.name.localeCompare(b.name); });
          toast(name + ' added.', 'ok');
        }
        closeModal(sectionEl);
        renderTable(sectionEl);
      }).catch(function (err) {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = id ? 'Save changes' : 'Add staff member';
        }
        toast('Unexpected error.', 'err');
        console.error('[pos-staff] save exception', err);
      });
    });
  }

  /* ==========================================================================
     DELETE
  ========================================================================== */
  function doDelete(sectionEl, sid, name) {
    if (!window.confirm('Remove "' + name + '" from the team? This cannot be undone.')) return;
    var sb = getSb();
    if (!sb) { toast('Database client unavailable.', 'err'); return; }

    sb.from('mesa_staff').delete().eq('id', sid)
      .then(function (res) {
        if (res.error) {
          toast('Error removing staff member.', 'err');
          console.error('[pos-staff] delete error', res.error);
          return;
        }
        _state.staff = _state.staff.filter(function (s) { return s.id !== sid; });
        delete _revealed[sid];
        renderTable(sectionEl);
        toast((name || 'Staff member') + ' removed.', 'ok');
      })
      .catch(function (err) {
        toast('Unexpected error.', 'err');
        console.error('[pos-staff] delete exception', err);
      });
  }

  /* ==========================================================================
     ERROR / STATUS HELPERS
  ========================================================================== */
  function showError(sectionEl, msg, retryFn) {
    var errorEl = sectionEl.querySelector('#posstaff-error');
    var msgEl   = sectionEl.querySelector('#posstaff-error-msg');
    var retryEl = sectionEl.querySelector('#posstaff-retry');
    if (!errorEl) return;
    if (msgEl)   msgEl.textContent  = msg;
    errorEl.style.display = 'flex';
    if (retryEl) retryEl.onclick = retryFn;
  }

  function announce(sectionEl, msg) {
    var el = sectionEl.querySelector('#posstaff-live');
    if (el) el.textContent = msg;
  }

  /* ==========================================================================
     SKELETON
  ========================================================================== */
  function buildSkeletonRows(n) {
    var html = '';
    for (var i = 0; i < n; i++) {
      html += '<tr class="posstaff-skel-row" aria-hidden="true">'
        + '<td><div class="posstaff-skel-cell" style="width:120px"></div></td>'
        + '<td><div class="posstaff-skel-cell" style="width:60px"></div></td>'
        + '<td><div class="posstaff-skel-cell" style="width:50px"></div></td>'
        + '<td><div class="posstaff-skel-cell" style="width:50px"></div></td>'
        + '<td><div class="posstaff-skel-cell" style="width:60px"></div></td>'
        + '</tr>';
    }
    return html;
  }

  /* ==========================================================================
     SVG ICONS
  ========================================================================== */
  function svgPlus() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
      + ' stroke-width="2" stroke-linecap="round" aria-hidden="true">'
      + '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
  }
  function svgClose() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
      + ' stroke-width="2" stroke-linecap="round" aria-hidden="true">'
      + '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  }
  function svgEdit() {
    return '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
      + ' stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
      + '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>'
      + '<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
  }
  function svgTrash() {
    return '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
      + ' stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
      + '<polyline points="3 6 5 6 21 6"/>'
      + '<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>'
      + '<path d="M10 11v6"/><path d="M14 11v6"/>'
      + '<path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>';
  }
  function svgEyeOpen() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
      + ' stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
      + '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>'
      + '<circle cx="12" cy="12" r="3"/></svg>';
  }
  function svgEyeClosed() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
      + ' stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
      + '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>'
      + '<path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>'
      + '<line x1="1" y1="1" x2="23" y2="23"/></svg>';
  }
  function svgInfo() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
      + ' stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
      + '<circle cx="12" cy="12" r="10"/>'
      + '<line x1="12" y1="8" x2="12" y2="12"/>'
      + '<line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
  }

  /* ==========================================================================
     REGISTER MODULE
  ========================================================================== */
  window.COV           = window.COV           || {};
  window.COV.screens   = window.COV.screens   || {};
  window.PLAT          = window.PLAT          || {};
  window.PLAT.screens  = window.PLAT.screens  || {};

  var screenDef = { render: render };

  window.COV.screens['pos-staff']  = screenDef;
  window.PLAT.screens['pos-staff'] = screenDef;

  console.info('[tavolo] pos-staff.js ready — screen "pos-staff" registered');

}());
