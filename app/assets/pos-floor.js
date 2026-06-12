/* ============================================================================
   Tavolo POS — Floor & Tables screen module
   Registers:
     window.COV.screens['pos-floor']
     window.PLAT.screens['pos-floor']
   Usage: shell calls render(sectionEl) when the section is activated.

   Features:
     - Table CRUD: add / edit / delete from mesa_tables
     - Virtual tables (table_code ending -VIRTUAL) shown read-only
     - Live floor status: reads open mesa_sessions to show Occupied / Open /
       Needs Bus states per table; polls every 15 s (or realtime fallback)
     - Midnight & Copper brand tokens throughout
     - Loading / empty / error states; no raw errors in DOM
     - Fully keyboard-accessible; 44 px minimum touch targets
     - All classes namespaced .posfloor-* to avoid collision

   CSS: injected once via <style id="posfloor-css">
   Does NOT depend on qr_pay being on. Restaurant resolved from
   mesa_restaurants limit 1 (owner RLS).
============================================================================ */
(function () {
  'use strict';

  /* ==========================================================================
     CONSTANTS
  ========================================================================== */
  var RESTAURANT_ID = 'a1000000-0000-0000-0000-000000000001';
  var POLL_INTERVAL = 15000; // 15 s

  /* ==========================================================================
     CSS — injected once into <head> via <style id="posfloor-css">
     All classes prefixed .posfloor-* for strict isolation.
  ========================================================================== */
  var CSS = [
    /* Root */
    '.posfloor-root{display:flex;flex-direction:column;gap:var(--space-5);min-width:0}',

    /* Toolbar */
    '.posfloor-toolbar{display:flex;align-items:center;justify-content:space-between;gap:var(--space-3);flex-wrap:wrap}',
    '.posfloor-toolbar-title{font-size:22px;font-weight:600;letter-spacing:-0.01em;color:var(--color-text-primary);flex-shrink:0;min-width:0}',
    '.posfloor-toolbar-actions{display:flex;gap:var(--space-3);flex-shrink:0;flex-wrap:wrap}',
    '.posfloor-refresh-meta{font-size:12px;color:var(--color-text-muted);align-self:center;white-space:nowrap}',

    /* Section sub-header */
    '.posfloor-section-head{display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-3)}',
    '.posfloor-section-label{font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--color-text-muted)}',
    '.posfloor-divider{flex:1;height:1px;background:var(--color-border)}',

    /* Buttons */
    '.posfloor-btn{display:inline-flex;align-items:center;justify-content:center;gap:var(--space-2);min-height:44px;padding:0 var(--space-5);border-radius:var(--radius-md);font-size:14px;font-weight:500;cursor:pointer;border:1px solid transparent;transition:background var(--duration-fast),color var(--duration-fast),box-shadow var(--duration-fast),transform var(--duration-fast),border-color var(--duration-fast);white-space:nowrap;text-decoration:none}',
    '.posfloor-btn:active{transform:scale(.97)}',
    '.posfloor-btn:focus-visible{outline:2px solid var(--color-primary);outline-offset:2px}',
    '.posfloor-btn-primary{background:var(--color-primary);color:#fff}',
    '.posfloor-btn-primary:hover{background:var(--color-primary-hover,var(--color-primary))}',
    '.posfloor-btn-secondary{background:var(--color-surface);color:var(--color-text-primary);border-color:var(--color-border)}',
    '.posfloor-btn-secondary:hover{background:var(--color-surface-raised)}',
    '.posfloor-btn-danger{background:var(--color-destructive-light);color:var(--color-destructive);border-color:var(--color-destructive)}',
    '.posfloor-btn-danger:hover{background:var(--color-destructive);color:#fff}',
    '.posfloor-btn:disabled{opacity:0.55;cursor:not-allowed}',

    /* Icon button */
    '.posfloor-icon-btn{width:36px;height:36px;min-height:44px;min-width:44px;padding:0;border-radius:var(--radius-sm);background:none;border:1px solid var(--color-border);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--color-text-secondary);transition:color var(--duration-fast),background var(--duration-fast),transform var(--duration-fast)}',
    '.posfloor-icon-btn:hover{color:var(--color-text-primary);background:var(--color-surface-raised)}',
    '.posfloor-icon-btn:active{transform:scale(.92)}',
    '.posfloor-icon-btn:focus-visible{outline:2px solid var(--color-primary);outline-offset:2px}',
    '.posfloor-icon-btn-danger{color:var(--color-destructive);border-color:rgba(181,59,47,.3)}',
    '.posfloor-icon-btn-danger:hover{background:var(--color-destructive-light);color:var(--color-destructive)}',

    /* Floor grid */
    '.posfloor-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:var(--space-4);padding-bottom:var(--space-10)}',

    /* Table card */
    '.posfloor-card{background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-lg);padding:var(--space-5);display:flex;flex-direction:column;gap:var(--space-3);position:relative;transition:box-shadow var(--duration-fast),border-color var(--duration-fast)}',
    '.posfloor-card:hover{box-shadow:var(--shadow-md)}',

    /* Card status strip */
    '.posfloor-status-strip{position:absolute;top:0;left:0;right:0;height:4px;border-radius:var(--radius-lg) var(--radius-lg) 0 0;transition:background var(--duration-fast)}',
    '.posfloor-status-open .posfloor-status-strip{background:var(--color-border)}',
    '.posfloor-status-occupied .posfloor-status-strip{background:var(--color-primary)}',
    '.posfloor-status-needs-bus .posfloor-status-strip{background:var(--color-warning)}',
    '.posfloor-status-readonly{opacity:.65}',

    /* Card header row */
    '.posfloor-card-head{display:flex;align-items:center;justify-content:space-between;gap:var(--space-2);min-width:0}',
    '.posfloor-card-label{font-size:16px;font-weight:600;color:var(--color-text-primary);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',

    /* Status badge */
    '.posfloor-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:var(--radius-full);font-size:11px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;flex-shrink:0;white-space:nowrap}',
    '.posfloor-badge-open{background:var(--color-surface-raised);color:var(--color-text-muted);border:1px solid var(--color-border)}',
    '.posfloor-badge-occupied{background:var(--color-primary-light);color:var(--color-primary);border:1px solid rgba(194,112,61,.3)}',
    '.posfloor-badge-needs-bus{background:var(--color-warning-light);color:var(--color-warning);border:1px solid rgba(196,124,32,.3)}',
    '.posfloor-badge-readonly{background:var(--color-surface-raised);color:var(--color-text-muted);border:1px solid var(--color-border)}',

    /* Card meta */
    '.posfloor-card-meta{font-size:13px;color:var(--color-text-secondary);line-height:1.5}',
    '.posfloor-card-meta strong{color:var(--color-text-primary);font-weight:500}',

    /* Card actions */
    '.posfloor-card-actions{display:flex;gap:var(--space-2);margin-top:auto;flex-wrap:wrap}',

    /* Status / empty / error */
    '.posfloor-status-bar{background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-md);padding:var(--space-4) var(--space-5);display:flex;align-items:center;gap:var(--space-3)}',
    '.posfloor-spinner{width:20px;height:20px;border:2px solid var(--color-border);border-top-color:var(--color-primary);border-radius:50%;animation:posfloor-spin 0.75s linear infinite;flex-shrink:0}',
    '@keyframes posfloor-spin{to{transform:rotate(360deg)}}',
    '@media (prefers-reduced-motion:reduce){.posfloor-spinner{animation:none;border-top-color:var(--color-primary)}}',
    '.posfloor-status-text{font-size:14px;color:var(--color-text-secondary)}',
    '.posfloor-error-bar{background:var(--color-destructive-light);color:var(--color-destructive);border:1px solid rgba(181,59,47,.2);border-radius:var(--radius-md);padding:var(--space-3) var(--space-4);font-size:14px;display:flex;align-items:center;justify-content:space-between;gap:var(--space-3)}',
    '.posfloor-retry-btn{background:none;border:none;color:var(--color-destructive);font-weight:600;font-size:13px;cursor:pointer;text-decoration:underline;padding:0;min-height:44px;flex-shrink:0}',
    '.posfloor-retry-btn:focus-visible{outline:2px solid var(--color-destructive);outline-offset:2px}',
    '.posfloor-empty{text-align:center;padding:var(--space-12) var(--space-5);display:flex;flex-direction:column;align-items:center;gap:var(--space-3)}',
    '.posfloor-empty-title{font-size:18px;font-weight:600;color:var(--color-text-primary);margin:0}',
    '.posfloor-empty-body{font-size:14px;color:var(--color-text-secondary);max-width:320px;margin:0;line-height:1.6}',

    /* Skeleton */
    '.posfloor-skel-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:var(--space-4)}',
    '.posfloor-skel-card{height:160px;border-radius:var(--radius-lg);background:linear-gradient(90deg,var(--color-surface-raised) 25%,var(--color-border) 50%,var(--color-surface-raised) 75%);background-size:800px 100%;animation:posfloor-shimmer 1.4s infinite linear}',
    '@keyframes posfloor-shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}',
    '@media (prefers-reduced-motion:reduce){.posfloor-skel-card{animation:none;background:var(--color-surface-raised)}}',

    /* Form fields */
    '.posfloor-field{display:flex;flex-direction:column;gap:var(--space-1);margin-bottom:var(--space-4)}',
    '.posfloor-field:last-of-type{margin-bottom:0}',
    '.posfloor-label{font-size:13px;font-weight:500;color:var(--color-text-primary)}',
    '.posfloor-input{width:100%;min-height:44px;padding:var(--space-2) var(--space-4);background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-md);font-size:14px;color:var(--color-text-primary);transition:border-color var(--duration-fast),box-shadow var(--duration-fast);box-sizing:border-box}',
    '.posfloor-input:focus{outline:none;border-color:var(--color-primary);box-shadow:0 0 0 3px var(--color-primary-light)}',
    '.posfloor-input::placeholder{color:var(--color-text-muted)}',

    /* Modal */
    '.posfloor-modal-overlay{position:fixed;inset:0;background:var(--color-overlay,rgba(28,23,20,.48));z-index:500;display:none;align-items:center;justify-content:center;padding:var(--space-4)}',
    '.posfloor-modal-overlay.posfloor-open{display:flex}',
    '.posfloor-modal{background:var(--color-surface);border-radius:var(--radius-xl);padding:var(--space-7);width:100%;max-width:420px;box-shadow:var(--shadow-xl);animation:posfloor-modal-in .2s var(--easing-decelerate,ease-out) both;min-width:0}',
    '@keyframes posfloor-modal-in{from{opacity:0;transform:scale(.95) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}',
    '.posfloor-modal-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-5)}',
    '.posfloor-modal-title{font-size:20px;font-weight:600;color:var(--color-text-primary);margin:0;min-width:0}',
    '.posfloor-modal-foot{display:flex;gap:var(--space-3);margin-top:var(--space-5)}',

    /* Readonly banner inside card */
    '.posfloor-readonly-tag{font-size:11px;color:var(--color-text-muted);font-style:italic}',

    /* Responsive */
    '@media (max-width:599px){.posfloor-grid{grid-template-columns:1fr 1fr}.posfloor-skel-grid{grid-template-columns:1fr 1fr}.posfloor-toolbar{flex-direction:column;align-items:flex-start}.posfloor-toolbar-actions{width:100%}.posfloor-toolbar-actions .posfloor-btn{flex:1}}',
    '@media (max-width:374px){.posfloor-grid{grid-template-columns:1fr}.posfloor-skel-grid{grid-template-columns:1fr}}',
    '@media (max-width:1023px){.posfloor-modal{max-width:calc(100vw - 32px)}}',
    '@media (max-width:599px){.posfloor-modal-overlay{align-items:flex-end;padding:0}.posfloor-modal{border-radius:var(--radius-xl) var(--radius-xl) 0 0;max-width:100%;max-height:92vh;overflow-y:auto}}',
  ].join('\n');

  function injectStyles() {
    if (document.getElementById('posfloor-css')) return;
    var s = document.createElement('style');
    s.id = 'posfloor-css';
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

  function isVirtual(tableCode) {
    return typeof tableCode === 'string' && tableCode.slice(-8) === '-VIRTUAL';
  }

  function elapsedStr(createdAt) {
    if (!createdAt) return '';
    var ms = Date.now() - new Date(createdAt).getTime();
    if (ms < 0) return '0m';
    var mins = Math.floor(ms / 60000);
    if (mins < 60) return mins + 'm';
    return Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm';
  }

  function genCode() {
    return 'PT-' + Math.random().toString(36).substr(2, 5).toUpperCase();
  }

  /* ==========================================================================
     MODULE STATE
  ========================================================================== */
  var _state = {
    tables:   [],    // mesa_tables rows
    sessions: [],   // open mesa_sessions rows
    loading:  true,
    error:    null,
    restaurant: null,
  };
  var _pollTimer = null;
  var _realtimeChannel = null;
  var _channelCounter = 0;

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

    if (!sectionEl.querySelector('.posfloor-root')) {
      sectionEl.innerHTML = buildScaffold();
      wireAddModal(sectionEl);
      wireEditModal(sectionEl);
    }

    loadAll(sectionEl);
  }

  /* ==========================================================================
     SCAFFOLD
  ========================================================================== */
  function buildScaffold() {
    return [
      '<div class="posfloor-root">',

        /* Live status region */
        '<div role="status" aria-live="polite" aria-atomic="true" id="posfloor-live"',
          ' style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0"></div>',

        /* Toolbar */
        '<div class="posfloor-toolbar">',
          '<h2 class="posfloor-toolbar-title">Floor &amp; Tables</h2>',
          '<div class="posfloor-toolbar-actions">',
            '<span class="posfloor-refresh-meta" id="posfloor-refresh-meta" aria-live="polite"></span>',
            '<button class="posfloor-btn posfloor-btn-primary" id="posfloor-add-btn" type="button"',
              ' aria-label="Add new table">',
              svgPlus(), ' Add table',
            '</button>',
          '</div>',
        '</div>',

        /* Floor status grid */
        '<div id="posfloor-grid-wrap">',
          buildSkeletonGrid(6),
        '</div>',

      '</div>',

      /* ADD TABLE MODAL */
      '<div class="posfloor-modal-overlay" id="posfloor-add-modal" role="dialog" aria-modal="true"',
        ' aria-labelledby="posfloor-add-modal-title">',
        '<div class="posfloor-modal" role="document">',
          '<div class="posfloor-modal-head">',
            '<h3 class="posfloor-modal-title" id="posfloor-add-modal-title">Add table</h3>',
            '<button class="posfloor-icon-btn" id="posfloor-add-close" type="button" aria-label="Close">',
              svgClose(),
            '</button>',
          '</div>',
          '<div class="posfloor-field">',
            '<label class="posfloor-label" for="posfloor-add-label">Table name or number</label>',
            '<input class="posfloor-input" id="posfloor-add-label" type="text"',
              ' placeholder="e.g. Table 5 or Patio A" autocomplete="off">',
          '</div>',
          '<div class="posfloor-field">',
            '<label class="posfloor-label" for="posfloor-add-code">Table code (auto-generated)</label>',
            '<input class="posfloor-input" id="posfloor-add-code" type="text"',
              ' placeholder="PT-XXXXX" autocomplete="off">',
          '</div>',
          '<div class="posfloor-field">',
            '<label class="posfloor-label" for="posfloor-add-seats">Seats</label>',
            '<input class="posfloor-input" id="posfloor-add-seats" type="number" min="1" max="50" value="4">',
          '</div>',
          '<div class="posfloor-modal-foot">',
            '<button class="posfloor-btn posfloor-btn-primary" id="posfloor-add-save" type="button" style="flex:1">',
              'Add table',
            '</button>',
            '<button class="posfloor-btn posfloor-btn-secondary" id="posfloor-add-cancel" type="button">Cancel</button>',
          '</div>',
        '</div>',
      '</div>',

      /* EDIT TABLE MODAL */
      '<div class="posfloor-modal-overlay" id="posfloor-edit-modal" role="dialog" aria-modal="true"',
        ' aria-labelledby="posfloor-edit-modal-title">',
        '<div class="posfloor-modal" role="document">',
          '<div class="posfloor-modal-head">',
            '<h3 class="posfloor-modal-title" id="posfloor-edit-modal-title">Edit table</h3>',
            '<button class="posfloor-icon-btn" id="posfloor-edit-close" type="button" aria-label="Close">',
              svgClose(),
            '</button>',
          '</div>',
          '<input type="hidden" id="posfloor-edit-id">',
          '<div class="posfloor-field">',
            '<label class="posfloor-label" for="posfloor-edit-label">Table name</label>',
            '<input class="posfloor-input" id="posfloor-edit-label" type="text" placeholder="e.g. Table 5">',
          '</div>',
          '<div class="posfloor-field">',
            '<label class="posfloor-label" for="posfloor-edit-seats">Seats</label>',
            '<input class="posfloor-input" id="posfloor-edit-seats" type="number" min="1" max="50" value="4">',
          '</div>',
          '<div class="posfloor-modal-foot">',
            '<button class="posfloor-btn posfloor-btn-primary" id="posfloor-edit-save" type="button" style="flex:1">Save</button>',
            '<button class="posfloor-btn posfloor-btn-secondary" id="posfloor-edit-cancel" type="button">Cancel</button>',
          '</div>',
        '</div>',
      '</div>',
    ].join('');
  }

  /* ==========================================================================
     LOAD ALL DATA
  ========================================================================== */
  function loadAll(sectionEl) {
    var wrap = sectionEl.querySelector('#posfloor-grid-wrap');
    if (wrap) wrap.innerHTML = buildSkeletonGrid(6);
    announce(sectionEl, 'Loading floor data…');
    _state.loading = true;
    _state.error   = null;

    loadRestaurant(function (rErr, restaurant) {
      if (rErr || !restaurant) {
        _state.loading = false;
        _state.error   = 'Could not load restaurant data.';
        if (wrap) wrap.innerHTML = buildErrorHtml('Could not load restaurant data.', function () { loadAll(sectionEl); });
        announce(sectionEl, 'Error loading floor data.');
        console.error('[pos-floor] restaurant error', rErr);
        return;
      }

      var sb = getSb();
      if (!sb) {
        _state.loading = false;
        _state.error   = 'Database client not available.';
        if (wrap) wrap.innerHTML = buildErrorHtml('Database client not available.', function () { loadAll(sectionEl); });
        return;
      }

      // Fetch tables and sessions in parallel
      Promise.all([
        sb.from('mesa_tables')
          .select('*')
          .eq('restaurant_id', restaurant.id)
          .order('label'),
        sb.from('mesa_sessions')
          .select('id,table_id,status,order_type,tab_name,server_staff_id,guest_count,created_at')
          .eq('restaurant_id', restaurant.id)
          .in('status', ['open', 'occupied', 'needs_bus']),
      ]).then(function (results) {
        _state.loading = false;
        var tablesRes   = results[0];
        var sessionsRes = results[1];

        if (tablesRes.error) {
          _state.error = 'Could not load tables.';
          if (wrap) wrap.innerHTML = buildErrorHtml(_state.error, function () { loadAll(sectionEl); });
          console.error('[pos-floor] tables error', tablesRes.error);
          return;
        }
        if (sessionsRes.error) {
          // Non-fatal — render tables without status
          console.warn('[pos-floor] sessions fetch warning', sessionsRes.error);
        }

        _state.tables   = tablesRes.data   || [];
        _state.sessions = sessionsRes.data || [];
        _state.error    = null;

        renderFloor(sectionEl);
        armPolling(sectionEl);
        armRealtime(sectionEl, restaurant.id);
      }).catch(function (err) {
        _state.loading = false;
        _state.error   = 'Unexpected error loading floor data.';
        if (wrap) wrap.innerHTML = buildErrorHtml(_state.error, function () { loadAll(sectionEl); });
        console.error('[pos-floor] load error', err);
      });
    });
  }

  /* Refresh only sessions (for polling) */
  function refreshSessions(sectionEl) {
    loadRestaurant(function (err, restaurant) {
      if (err || !restaurant) return;
      var sb = getSb();
      if (!sb) return;
      sb.from('mesa_sessions')
        .select('id,table_id,status,order_type,tab_name,server_staff_id,guest_count,created_at')
        .eq('restaurant_id', restaurant.id)
        .in('status', ['open', 'occupied', 'needs_bus'])
        .then(function (res) {
          if (res.error) { console.warn('[pos-floor] session refresh error', res.error); return; }
          _state.sessions = res.data || [];
          renderFloor(sectionEl);
          updateRefreshMeta(sectionEl);
        })
        .catch(function (err) { console.warn('[pos-floor] session refresh exception', err); });
    });
  }

  /* ==========================================================================
     POLLING
  ========================================================================== */
  function armPolling(sectionEl) {
    if (_pollTimer) clearInterval(_pollTimer);
    _pollTimer = setInterval(function () {
      refreshSessions(sectionEl);
    }, POLL_INTERVAL);
    updateRefreshMeta(sectionEl);
  }

  function updateRefreshMeta(sectionEl) {
    var el = sectionEl.querySelector('#posfloor-refresh-meta');
    if (el) {
      var now = new Date();
      el.textContent = 'Refreshed ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  }

  /* ==========================================================================
     REALTIME — postgres_changes on mesa_sessions
  ========================================================================== */
  function armRealtime(sectionEl, restaurantId) {
    var sb = getSb();
    if (!sb || !sb.channel) return; // realtime not available

    // Remove prior channel
    if (_realtimeChannel) {
      try { sb.removeChannel(_realtimeChannel); } catch (e) { /* ignore */ }
      _realtimeChannel = null;
    }

    _channelCounter++;
    var topic = 'posfloor-sessions-' + _channelCounter;

    _realtimeChannel = sb.channel(topic)
      .on('postgres_changes', {
        event:  '*',
        schema: 'public',
        table:  'mesa_sessions',
        filter: 'restaurant_id=eq.' + restaurantId,
      }, function () {
        refreshSessions(sectionEl);
      })
      .subscribe(function (status) {
        if (status === 'SUBSCRIBED') {
          console.info('[pos-floor] realtime subscribed:', topic);
        }
      });
  }

  /* ==========================================================================
     RENDER FLOOR GRID
  ========================================================================== */
  function renderFloor(sectionEl) {
    var wrap = sectionEl.querySelector('#posfloor-grid-wrap');
    if (!wrap) return;

    if (!_state.tables.length) {
      wrap.innerHTML = buildEmptyHtml(
        'No tables yet',
        'Add your first table to track its status from the POS.',
        function () { openAddModal(sectionEl); }
      );
      announce(sectionEl, 'No tables found. Use Add table to create one.');
      return;
    }

    // Build a quick lookup: table_id → session
    var sessMap = {};
    _state.sessions.forEach(function (s) {
      if (s.table_id) sessMap[s.table_id] = s;
    });

    // Separate real vs virtual
    var real    = _state.tables.filter(function (t) { return !isVirtual(t.table_code); });
    var virtual = _state.tables.filter(function (t) { return isVirtual(t.table_code); });

    var html = '<div class="posfloor-grid" role="list" aria-label="Floor tables">';

    real.forEach(function (t) {
      html += buildTableCard(t, sessMap[t.id] || null, false);
    });

    html += '</div>';

    if (virtual.length) {
      html += [
        '<div class="posfloor-section-head">',
          '<span class="posfloor-section-label">Auto-managed (read-only)</span>',
          '<span class="posfloor-divider" aria-hidden="true"></span>',
        '</div>',
        '<div class="posfloor-grid" role="list" aria-label="Virtual tables (read-only)">',
      ].join('');
      virtual.forEach(function (t) {
        html += buildTableCard(t, sessMap[t.id] || null, true);
      });
      html += '</div>';
    }

    wrap.innerHTML = html;

    announce(sectionEl, real.length + ' table' + (real.length !== 1 ? 's' : '') + ' on the floor.');

    // Wire card buttons
    wireCardActions(sectionEl);
  }

  function buildTableCard(t, session, isReadonly) {
    var statusClass, badge, meta;

    if (isReadonly) {
      statusClass = 'posfloor-status-readonly';
      badge = '<span class="posfloor-badge posfloor-badge-readonly">Takeout/Bar (auto)</span>';
      meta  = '';
    } else if (!session) {
      statusClass = 'posfloor-status-open';
      badge = '<span class="posfloor-badge posfloor-badge-open">Open</span>';
      meta  = '';
    } else if (session.status === 'needs_bus') {
      statusClass = 'posfloor-status-needs-bus';
      badge = '<span class="posfloor-badge posfloor-badge-needs-bus">Needs bus</span>';
      meta  = buildSessionMeta(session);
    } else {
      statusClass = 'posfloor-status-occupied';
      badge = '<span class="posfloor-badge posfloor-badge-occupied">Occupied</span>';
      meta  = buildSessionMeta(session);
    }

    var seatsText = t.seats ? t.seats + ' seat' + (t.seats !== 1 ? 's' : '') : '';
    var cardAriaLabel = esc(t.label) + (seatsText ? ', ' + esc(seatsText) : '') + (session ? ', ' + (session.status || 'occupied') : ', open');

    var actions = isReadonly
      ? '<span class="posfloor-readonly-tag">System-managed — not editable</span>'
      : [
          '<button class="posfloor-icon-btn" type="button"',
            ' data-action="edit"',
            ' data-tid="' + esc(t.id) + '"',
            ' data-label="' + esc(t.label) + '"',
            ' data-seats="' + esc(String(t.seats || 4)) + '"',
            ' aria-label="Edit ' + esc(t.label) + '">',
            svgEdit(),
          '</button>',
          '<button class="posfloor-icon-btn posfloor-icon-btn-danger" type="button"',
            ' data-action="delete"',
            ' data-tid="' + esc(t.id) + '"',
            ' data-label="' + esc(t.label) + '"',
            ' aria-label="Delete ' + esc(t.label) + '"',
            session ? ' disabled aria-disabled="true" title="Cannot delete while table has an open session"' : '',
            '>',
            svgTrash(),
          '</button>',
        ].join('');

    return [
      '<article class="posfloor-card ' + statusClass + '" role="listitem" aria-label="' + cardAriaLabel + '">',
        '<div class="posfloor-status-strip" aria-hidden="true"></div>',
        '<div class="posfloor-card-head">',
          '<h3 class="posfloor-card-label">' + esc(t.label) + '</h3>',
          badge,
        '</div>',
        seatsText ? '<p class="posfloor-card-meta">' + esc(seatsText) + '</p>' : '',
        meta ? '<div class="posfloor-card-meta">' + meta + '</div>' : '',
        '<div class="posfloor-card-actions">',
          actions,
        '</div>',
      '</article>',
    ].join('');
  }

  function buildSessionMeta(session) {
    var parts = [];
    if (session.tab_name) {
      parts.push('<strong>' + esc(session.tab_name) + '</strong>');
    }
    if (session.guest_count) {
      parts.push(esc(String(session.guest_count)) + ' guest' + (session.guest_count !== 1 ? 's' : ''));
    }
    if (session.created_at) {
      parts.push(esc(elapsedStr(session.created_at)));
    }
    return parts.join(' &middot; ');
  }

  /* ==========================================================================
     CARD ACTIONS — wire edit / delete buttons
  ========================================================================== */
  function wireCardActions(sectionEl) {
    sectionEl.querySelectorAll('[data-action]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var action = btn.dataset.action;
        var tid    = btn.dataset.tid;
        if (action === 'edit') {
          openEditModal(sectionEl, tid, btn.dataset.label, btn.dataset.seats);
        } else if (action === 'delete') {
          doDeleteTable(sectionEl, tid, btn.dataset.label);
        }
      });
      btn.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); btn.click(); }
      });
    });
  }

  /* ==========================================================================
     ADD MODAL
  ========================================================================== */
  function openAddModal(sectionEl) {
    var overlay = sectionEl.querySelector('#posfloor-add-modal');
    if (!overlay) return;
    var labelInp = sectionEl.querySelector('#posfloor-add-label');
    var codeInp  = sectionEl.querySelector('#posfloor-add-code');
    var seatsInp = sectionEl.querySelector('#posfloor-add-seats');
    if (labelInp) labelInp.value = '';
    if (codeInp)  codeInp.value  = genCode();
    if (seatsInp) seatsInp.value = '4';
    overlay.classList.add('posfloor-open');
    setTimeout(function () { if (labelInp) labelInp.focus(); }, 50);
  }

  function closeAddModal(sectionEl) {
    var overlay = sectionEl.querySelector('#posfloor-add-modal');
    if (overlay) overlay.classList.remove('posfloor-open');
  }

  function wireAddModal(sectionEl) {
    var addBtn    = sectionEl.querySelector('#posfloor-add-btn');
    var closeBtn  = sectionEl.querySelector('#posfloor-add-close');
    var cancelBtn = sectionEl.querySelector('#posfloor-add-cancel');
    var saveBtn   = sectionEl.querySelector('#posfloor-add-save');
    var overlay   = sectionEl.querySelector('#posfloor-add-modal');

    if (addBtn)    addBtn.addEventListener('click',    function () { openAddModal(sectionEl); });
    if (closeBtn)  closeBtn.addEventListener('click',  function () { closeAddModal(sectionEl); });
    if (cancelBtn) cancelBtn.addEventListener('click', function () { closeAddModal(sectionEl); });
    if (overlay) {
      overlay.addEventListener('click',   function (e) { if (e.target === overlay) closeAddModal(sectionEl); });
      overlay.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAddModal(sectionEl); });
    }
    if (saveBtn) saveBtn.addEventListener('click', function () { doAddTable(sectionEl); });

    // Enter submits
    ['#posfloor-add-label', '#posfloor-add-code', '#posfloor-add-seats'].forEach(function (sel) {
      var inp = sectionEl.querySelector(sel);
      if (inp) inp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); if (saveBtn) saveBtn.click(); }
      });
    });
  }

  function doAddTable(sectionEl) {
    var labelInp = sectionEl.querySelector('#posfloor-add-label');
    var codeInp  = sectionEl.querySelector('#posfloor-add-code');
    var seatsInp = sectionEl.querySelector('#posfloor-add-seats');
    var saveBtn  = sectionEl.querySelector('#posfloor-add-save');

    var label = labelInp ? labelInp.value.trim() : '';
    var code  = (codeInp ? codeInp.value.trim() : '') || genCode();
    var seats = Math.max(1, Math.min(50, parseInt((seatsInp && seatsInp.value) || '4') || 4));

    if (!label) { toast('Enter a table name.', 'err'); if (labelInp) labelInp.focus(); return; }

    var sb = getSb();
    if (!sb) { toast('Database client unavailable.', 'err'); return; }

    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Adding…'; }

    loadRestaurant(function (err, restaurant) {
      if (err || !restaurant) {
        toast('Could not load restaurant.', 'err');
        if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Add table'; }
        return;
      }

      sb.from('mesa_tables').insert({
        restaurant_id: restaurant.id,
        label:         label,
        table_code:    code,
        seats:         seats,
        is_active:     true,
      }).select('*').single()
        .then(function (res) {
          if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Add table'; }
          if (res.error) {
            toast('Error adding table.', 'err');
            console.error('[pos-floor] add error', res.error);
            return;
          }
          _state.tables.push(res.data);
          _state.tables.sort(function (a, b) { return a.label.localeCompare(b.label); });
          closeAddModal(sectionEl);
          renderFloor(sectionEl);
          toast('Table "' + label + '" added.', 'ok');
        })
        .catch(function (err) {
          if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Add table'; }
          toast('Unexpected error.', 'err');
          console.error('[pos-floor] add exception', err);
        });
    });
  }

  /* ==========================================================================
     EDIT MODAL
  ========================================================================== */
  function openEditModal(sectionEl, tid, label, seats) {
    var overlay  = sectionEl.querySelector('#posfloor-edit-modal');
    var idInp    = sectionEl.querySelector('#posfloor-edit-id');
    var labelInp = sectionEl.querySelector('#posfloor-edit-label');
    var seatsInp = sectionEl.querySelector('#posfloor-edit-seats');
    if (!overlay) return;
    if (idInp)    idInp.value    = tid;
    if (labelInp) labelInp.value = label || '';
    if (seatsInp) seatsInp.value = seats  || '4';
    overlay.classList.add('posfloor-open');
    setTimeout(function () { if (labelInp) labelInp.focus(); }, 50);
  }

  function closeEditModal(sectionEl) {
    var overlay = sectionEl.querySelector('#posfloor-edit-modal');
    if (overlay) overlay.classList.remove('posfloor-open');
  }

  function wireEditModal(sectionEl) {
    var closeBtn  = sectionEl.querySelector('#posfloor-edit-close');
    var cancelBtn = sectionEl.querySelector('#posfloor-edit-cancel');
    var saveBtn   = sectionEl.querySelector('#posfloor-edit-save');
    var overlay   = sectionEl.querySelector('#posfloor-edit-modal');

    if (closeBtn)  closeBtn.addEventListener('click',  function () { closeEditModal(sectionEl); });
    if (cancelBtn) cancelBtn.addEventListener('click', function () { closeEditModal(sectionEl); });
    if (overlay) {
      overlay.addEventListener('click',   function (e) { if (e.target === overlay) closeEditModal(sectionEl); });
      overlay.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeEditModal(sectionEl); });
    }
    if (saveBtn) saveBtn.addEventListener('click', function () { doSaveEdit(sectionEl); });

    ['#posfloor-edit-label', '#posfloor-edit-seats'].forEach(function (sel) {
      var inp = sectionEl.querySelector(sel);
      if (inp) inp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); if (saveBtn) saveBtn.click(); }
      });
    });
  }

  function doSaveEdit(sectionEl) {
    var idInp    = sectionEl.querySelector('#posfloor-edit-id');
    var labelInp = sectionEl.querySelector('#posfloor-edit-label');
    var seatsInp = sectionEl.querySelector('#posfloor-edit-seats');
    var saveBtn  = sectionEl.querySelector('#posfloor-edit-save');

    var id    = idInp    ? idInp.value.trim()                                       : '';
    var label = labelInp ? labelInp.value.trim()                                    : '';
    var seats = Math.max(1, Math.min(50, parseInt((seatsInp && seatsInp.value) || '4') || 4));

    if (!label) { toast('Enter a table name.', 'err'); if (labelInp) labelInp.focus(); return; }

    var sb = getSb();
    if (!sb) { toast('Database client unavailable.', 'err'); return; }

    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving…'; }

    sb.from('mesa_tables').update({ label: label, seats: seats }).eq('id', id).select('*').single()
      .then(function (res) {
        if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save'; }
        if (res.error) { toast('Error saving table.', 'err'); console.error('[pos-floor] edit error', res.error); return; }
        _state.tables = _state.tables.map(function (t) { return t.id === id ? res.data : t; });
        _state.tables.sort(function (a, b) { return a.label.localeCompare(b.label); });
        closeEditModal(sectionEl);
        renderFloor(sectionEl);
        toast('Table updated.', 'ok');
      })
      .catch(function (err) {
        if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save'; }
        toast('Unexpected error.', 'err');
        console.error('[pos-floor] edit exception', err);
      });
  }

  /* ==========================================================================
     DELETE
  ========================================================================== */
  function doDeleteTable(sectionEl, tid, label) {
    // Safety: check session in state
    var hasSession = _state.sessions.some(function (s) { return s.table_id === tid; });
    if (hasSession) {
      toast('Cannot delete a table with an open session.', 'err');
      return;
    }
    if (!window.confirm('Delete "' + label + '"? This cannot be undone.')) return;
    var sb = getSb();
    if (!sb) { toast('Database client unavailable.', 'err'); return; }

    sb.from('mesa_tables').delete().eq('id', tid)
      .then(function (res) {
        if (res.error) { toast('Error deleting table.', 'err'); console.error('[pos-floor] delete error', res.error); return; }
        _state.tables   = _state.tables.filter(function (t) { return t.id !== tid; });
        _state.sessions = _state.sessions.filter(function (s) { return s.table_id !== tid; });
        renderFloor(sectionEl);
        toast('Table deleted.', 'ok');
      })
      .catch(function (err) {
        toast('Unexpected error.', 'err');
        console.error('[pos-floor] delete exception', err);
      });
  }

  /* ==========================================================================
     HTML BUILDERS
  ========================================================================== */
  function buildSkeletonGrid(n) {
    var html = '<div class="posfloor-skel-grid" aria-hidden="true" aria-busy="true">';
    for (var i = 0; i < n; i++) html += '<div class="posfloor-skel-card"></div>';
    return html + '</div>';
  }

  function buildErrorHtml(msg, retryFn) {
    var btnId = 'posfloor-retry-' + Date.now();
    setTimeout(function () {
      var btn = document.getElementById(btnId);
      if (btn && retryFn) btn.addEventListener('click', retryFn);
    }, 0);
    return [
      '<div class="posfloor-error-bar" role="alert">',
        '<span>Unable to load floor data — please try again.</span>',
        '<button class="posfloor-retry-btn" id="' + btnId + '" type="button">Retry</button>',
      '</div>',
    ].join('');
  }

  function buildEmptyHtml(title, body, addFn) {
    var btnId = addFn ? 'posfloor-empty-add-' + Date.now() : null;
    if (btnId) setTimeout(function () {
      var btn = document.getElementById(btnId);
      if (btn) btn.addEventListener('click', addFn);
    }, 0);
    return [
      '<div class="posfloor-empty">',
        '<svg aria-hidden="true" width="56" height="56" viewBox="0 0 24 24" fill="none"',
          ' stroke="var(--color-text-muted)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">',
          '<rect x="3" y="3" width="7" height="7" rx="1"/>',
          '<rect x="14" y="3" width="7" height="7" rx="1"/>',
          '<rect x="14" y="14" width="7" height="7" rx="1"/>',
          '<rect x="3" y="14" width="7" height="7" rx="1"/>',
        '</svg>',
        '<p class="posfloor-empty-title">' + esc(title) + '</p>',
        body ? '<p class="posfloor-empty-body">' + esc(body) + '</p>' : '',
        btnId
          ? '<button class="posfloor-btn posfloor-btn-primary" id="' + esc(btnId) + '" type="button">'
              + svgPlus() + ' Add table</button>'
          : '',
      '</div>',
    ].join('');
  }

  function announce(sectionEl, msg) {
    var el = sectionEl.querySelector('#posfloor-live');
    if (el) el.textContent = msg;
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

  /* ==========================================================================
     REGISTER MODULE
  ========================================================================== */
  window.COV           = window.COV           || {};
  window.COV.screens   = window.COV.screens   || {};
  window.PLAT          = window.PLAT          || {};
  window.PLAT.screens  = window.PLAT.screens  || {};

  var screenDef = { render: render };

  window.COV.screens['pos-floor']  = screenDef;
  window.PLAT.screens['pos-floor'] = screenDef;

  console.info('[tavolo] pos-floor.js ready — screen "pos-floor" registered');

}());
