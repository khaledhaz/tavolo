/* ============================================================================
   Coverly — Live Floor Screen
   Registers: window.COV.screens.floor = { render(sectionEl) }
   DO NOT edit index.html or data.js.
   ============================================================================ */
(function () {
  'use strict';

  /* ── inject CSS once ─────────────────────────────────────────────────── */
  (function injectCss() {
    if (document.getElementById('cov-floor-css')) return;
    var link = document.createElement('link');
    link.id   = 'cov-floor-css';
    link.rel  = 'stylesheet';
    link.href = 'assets/floor.css';
    document.head.appendChild(link);
  }());

  /* ── shorthand aliases ───────────────────────────────────────────────── */
  var d     = window.COV.data;
  var u     = window.COV.utils;
  var esc   = u.esc;
  var toast = u.toast;
  var fmtTime = u.formatTime;

  function getState()      { return window.COV.state; }
  function getRestaurant() { return getState().restaurant; }

  /* ── module-level state (persists across re-renders) ─────────────────── */
  var _channels     = [];    // realtime subscriptions
  var _tables       = [];    // [{...table, _state, _res}]
  var _rooms        = [];
  var _reservations = [];    // today's active reservations
  var _blackouts    = [];    // active blackouts
  var _activeRoom   = null;  // current room id
  var _editMode     = false;
  var _dragState    = null;  // drag-to-move context
  var _sectionEl    = null;

  /* ──────────────────────────────────────────────────────────────────────
     STATE MACHINE
     Derives each table's display state from reservations + blackouts.
     Priority: blocked > seated > reserved > dirty > open
  ────────────────────────────────────────────────────────────────────── */

  /** True if two intervals [aStart,aEnd) and [bStart,bEnd) overlap.
   *  Both are Date objects or ISO strings. */
  function overlaps(aStart, aEnd, bStart, bEnd) {
    var a0 = +new Date(aStart), a1 = +new Date(aEnd);
    var b0 = +new Date(bStart), b1 = +new Date(bEnd);
    return a0 < b1 && b0 < a1;
  }

  /** SPEC §3b conflict check: is tableId free for [newStart, newEnd)+buffer?
   *  excludeResId: ignore this reservation when checking (for re-assignment). */
  function isTableFree(tableId, newStart, newEnd, excludeResId, bufferMin) {
    bufferMin = bufferMin || (getRestaurant() || {}).buffer_minutes || 15;
    var buf   = bufferMin * 60 * 1000;
    var s0    = +new Date(newStart);
    var e0    = +new Date(newEnd) + buf;

    // Check reservations
    for (var i = 0; i < _reservations.length; i++) {
      var r = _reservations[i];
      if (r.id === excludeResId) continue;
      if (r.table_id !== tableId) continue;
      if (!['booked','confirmed','seated'].includes(r.status)) continue;
      var rs = +new Date(r.starts_at);
      var re = +new Date(r.end_at) + buf;
      if (s0 < re && rs < e0) return false;
    }

    // Check blackouts
    for (var j = 0; j < _blackouts.length; j++) {
      var b = _blackouts[j];
      if (b.table_id && b.table_id !== tableId) continue; // table-specific
      if (overlaps(s0, e0, b.starts_at, b.end_at)) return false;
    }
    return true;
  }

  /** Compute display-state for a single table */
  function computeTableState(table) {
    var now = Date.now();

    // 1. Blackout (whole-restaurant or table-specific)?
    for (var i = 0; i < _blackouts.length; i++) {
      var b = _blackouts[i];
      if (!b.table_id || b.table_id === table.id) {
        if (+new Date(b.starts_at) <= now && now < +new Date(b.end_at)) {
          return { state: 'blocked', res: null, blackout: b };
        }
      }
    }

    // 2. Seated
    for (var j = 0; j < _reservations.length; j++) {
      var r = _reservations[j];
      if (r.table_id === table.id && r.status === 'seated') {
        return { state: 'seated', res: r, blackout: null };
      }
    }

    // 3. Dirty — client-side flag OR persisted status from DB
    if (table._dirty || table.status === 'dirty') {
      return { state: 'dirty', res: null, blackout: null };
    }

    // 4. Reserved — upcoming in today's window
    var upcoming = null;
    var upcomingDist = Infinity;
    for (var k = 0; k < _reservations.length; k++) {
      var rv = _reservations[k];
      if (rv.table_id === table.id &&
          ['booked','confirmed'].includes(rv.status)) {
        var dist = +new Date(rv.starts_at) - now;
        if (dist >= -30*60*1000 && dist < upcomingDist) { // show if within past 30min
          upcomingDist = dist;
          upcoming = rv;
        }
      }
    }
    if (upcoming) {
      return { state: 'reserved', res: upcoming, blackout: null };
    }

    return { state: 'open', res: null, blackout: null };
  }

  /** Recompute state for all tables in current room */
  function recomputeStates() {
    _tables.forEach(function (t) {
      var info = computeTableState(t);
      t._state   = info.state;
      t._res     = info.res;
      t._blackout = info.blackout;
    });
  }

  /* ──────────────────────────────────────────────────────────────────────
     DATA LOADING
  ────────────────────────────────────────────────────────────────────── */

  function getTodayInTz(tz) {
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: tz || 'UTC' }).format(new Date());
    } catch (e) {
      return new Date().toISOString().slice(0, 10);
    }
  }

  async function loadAll() {
    var rest = getRestaurant();
    if (!rest) return;
    var today = getTodayInTz(rest.timezone);

    var results = await Promise.all([
      d.rooms.list(rest.id),
      d.tables.list(rest.id),
      d.reservations.listByDate(rest.id, today),
      d.blackouts.listActive(rest.id),
    ]);

    _rooms        = results[0] || [];
    var rawTables = results[1] || [];
    _reservations = results[2] || [];
    _blackouts    = results[3] || [];

    // preserve _dirty flag across reloads
    var dirtyMap = {};
    _tables.forEach(function (t) { if (t._dirty) dirtyMap[t.id] = true; });
    _tables = rawTables.map(function (t) {
      return Object.assign({ _dirty: !!dirtyMap[t.id], _state: 'open', _res: null, _blackout: null }, t);
    });

    recomputeStates();
  }

  /* ──────────────────────────────────────────────────────────────────────
     REALTIME
  ────────────────────────────────────────────────────────────────────── */

  function cleanupChannels() {
    _channels.forEach(function (ch) { d.realtime.removeChannel(ch); });
    _channels = [];
  }

  function subscribeRealtime() {
    var rest = getRestaurant();
    if (!rest) return;

    var resCh = d.realtime.subscribeReservations(rest.id, function (payload) {
      handleResChange(payload);
    });
    var tblCh = d.realtime.subscribeTables(rest.id, function (payload) {
      handleTableChange(payload);
    });
    _channels.push(resCh, tblCh);
  }

  function handleResChange(payload) {
    var rec = payload.new || payload.old;
    if (!rec) return;
    var today = getTodayInTz((getRestaurant() || {}).timezone);
    // Merge the change
    if (payload.eventType === 'DELETE') {
      _reservations = _reservations.filter(function (r) { return r.id !== rec.id; });
    } else {
      var found = false;
      _reservations = _reservations.map(function (r) {
        if (r.id === rec.id) { found = true; return Object.assign({}, r, rec); }
        return r;
      });
      if (!found && rec.starts_at && rec.starts_at.startsWith(today)) {
        _reservations.push(rec);
      }
    }
    recomputeStates();
    renderFloorCanvas();
    // Announce significant status changes to screen readers
    if (rec.status && payload.eventType === 'UPDATE') {
      announceRealtimeChange('Reservation updated: status is now ' + rec.status);
    }
  }

  function handleTableChange(payload) {
    var rec = payload.new || payload.old;
    if (!rec) return;
    if (payload.eventType === 'DELETE') {
      _tables = _tables.filter(function (t) { return t.id !== rec.id; });
    } else {
      var found = false;
      _tables = _tables.map(function (t) {
        if (t.id === rec.id) { found = true; return Object.assign({}, t, rec); }
        return t;
      });
      if (!found) {
        _tables.push(Object.assign({ _dirty: false, _state: 'open', _res: null, _blackout: null }, rec));
      }
    }
    recomputeStates();
    renderFloorCanvas();
    if (rec.label && payload.eventType === 'UPDATE') {
      announceRealtimeChange('Table ' + rec.label + ' updated');
    }
  }

  /* ──────────────────────────────────────────────────────────────────────
     RENDERING — top-level
  ────────────────────────────────────────────────────────────────────── */

  function renderAll() {
    if (!_sectionEl) return;
    _sectionEl.innerHTML = buildShellHtml();
    wireShell();
    renderRoomTabs();
    renderFloorCanvas();
    if (_editMode) renderEditorPanel();
    // Inject an ARIA live region once so screen readers hear realtime table state changes
    if (!document.getElementById('fl-live-announcer')) {
      var announcer = document.createElement('div');
      announcer.id              = 'fl-live-announcer';
      announcer.setAttribute('role',      'status');
      announcer.setAttribute('aria-live', 'polite');
      announcer.setAttribute('aria-atomic', 'true');
      announcer.style.cssText   = 'position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden';
      document.body.appendChild(announcer);
    }
  }

  function announceRealtimeChange(msg) {
    var el = document.getElementById('fl-live-announcer');
    if (!el) return;
    // Toggle text content to re-trigger announcement even if message is the same
    el.textContent = '';
    setTimeout(function () { el.textContent = msg; }, 50);
  }

  function buildShellHtml() {
    return [
      '<div class="fl-root">',
        '<div class="fl-toolbar">',
          '<div class="fl-toolbar-left">',
            '<div class="fl-room-tabs" id="fl-room-tabs" role="tablist" aria-label="Rooms"></div>',
            '<button class="fl-btn fl-btn-ghost fl-add-room-btn" id="fl-add-room-btn" aria-label="Add room">',
              '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
              'Room',
            '</button>',
          '</div>',
          '<div class="fl-toolbar-right">',
            '<span class="fl-legend" aria-label="Table state legend">',
              '<span class="fl-legend-dot fl-s-open" aria-label="Open (green)"></span>Open',
              '<span class="fl-legend-dot fl-s-reserved" aria-label="Reserved (gold)"></span>Reserved',
              '<span class="fl-legend-dot fl-s-seated" aria-label="Seated (red)"></span>Seated',
              '<span class="fl-legend-dot fl-s-dirty" aria-label="Dirty (grey)"></span>Dirty',
              '<span class="fl-legend-dot fl-s-blocked" aria-label="Blocked (dashed)"></span>Blocked',
            '</span>',
            '<button class="fl-btn ' + (_editMode ? 'fl-btn-primary' : 'fl-btn-ghost') + '" id="fl-edit-toggle" aria-pressed="' + _editMode + '">',
              '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
              _editMode ? 'Done editing' : 'Edit floor',
            '</button>',
          '</div>',
        '</div>',
        '<div class="fl-body">',
          '<div class="fl-canvas-wrap" id="fl-canvas-wrap">',
            '<div class="fl-canvas" id="fl-canvas" role="region" aria-label="Floor plan">',
              '<!-- tables rendered here -->',
            '</div>',
          '</div>',
          (_editMode ? '<div class="fl-editor-panel" id="fl-editor-panel"></div>' : ''),
        '</div>',
      '</div>',
    ].join('');
  }

  function wireShell() {
    var editBtn = document.getElementById('fl-edit-toggle');
    if (editBtn) {
      editBtn.addEventListener('click', function () {
        _editMode = !_editMode;
        renderAll();
      });
    }
    var addRoomBtn = document.getElementById('fl-add-room-btn');
    if (addRoomBtn) {
      addRoomBtn.addEventListener('click', function () { openAddRoomDialog(); });
    }

    // Refetch on window focus (offline reconciliation)
    window.addEventListener('focus', onFocusRefetch);
  }

  function onFocusRefetch() {
    loadAll().then(function () {
      renderRoomTabs();
      renderFloorCanvas();
    }).catch(function () {});
  }

  /* ── Room tabs ─────────────────────────────────────────────────────── */

  function renderRoomTabs() {
    var tabsEl = document.getElementById('fl-room-tabs');
    if (!tabsEl) return;

    if (!_rooms.length) {
      tabsEl.innerHTML = '<span class="fl-room-empty">No rooms — click "+ Room" to add one</span>';
      return;
    }

    if (!_activeRoom || !_rooms.find(function (r) { return r.id === _activeRoom; })) {
      _activeRoom = _rooms[0].id;
    }

    tabsEl.innerHTML = _rooms.map(function (room) {
      var active = room.id === _activeRoom;
      return '<button class="fl-room-tab' + (active ? ' active' : '') + '" ' +
        'data-room="' + esc(room.id) + '" ' +
        'role="tab" aria-selected="' + active + '" ' +
        'aria-label="' + esc(room.name) + ' room">' +
        esc(room.name) +
        '</button>';
    }).join('');

    tabsEl.querySelectorAll('.fl-room-tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        _activeRoom = btn.dataset.room;
        renderRoomTabs();
        renderFloorCanvas();
        if (_editMode) renderEditorPanel();
      });
      btn.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); btn.click(); }
      });
    });
  }

  /* ── Floor canvas ──────────────────────────────────────────────────── */

  function renderFloorCanvas() {
    var canvas = document.getElementById('fl-canvas');
    if (!canvas) return;

    var roomTables = _tables.filter(function (t) {
      return t.room_id === _activeRoom && t.is_active !== false;
    });

    if (!roomTables.length) {
      canvas.innerHTML = buildEmptyState();
      return;
    }

    canvas.innerHTML = roomTables.map(function (t) {
      return buildTableHtml(t);
    }).join('');

    // Wire interactions
    canvas.querySelectorAll('.fl-table').forEach(function (el) {
      wireTableEl(el);
    });
  }

  function buildEmptyState() {
    var msg = _editMode
      ? 'No tables in this room yet. Use the panel on the right to add one.'
      : 'No tables in this room yet. Switch to <strong>Edit floor</strong> to add tables.';
    return '<div class="fl-empty">' +
      '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#60626e" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>' +
      '<p>' + msg + '</p>' +
    '</div>';
  }

  function buildTableHtml(t) {
    var s    = t._state || 'open';
    var res  = t._res;
    var tz   = (getRestaurant() || {}).timezone;
    var w    = t.width  || 80;
    var h    = t.height || 60;
    var x    = t.pos_x  || 0;
    var y    = t.pos_y  || 0;
    var isRound = t.shape === 'round';

    // Determine if this table has reservation detail to show (reserved or seated with data)
    var hasDetail = (s === 'reserved' || s === 'seated') && !!res;

    // Build badge / detail HTML
    var badgeHtml = '';
    var vipBadge  = '';
    if (s === 'reserved' && res) {
      var timeStr = fmtTime(res.starts_at, tz);
      var guest   = res.cov_guests || {};
      var isVip   = Array.isArray(guest.tags) && guest.tags.some(function (g) { return /vip/i.test(g); });
      if (isVip) {
        vipBadge = '<span class="fl-vip fl-vip-corner" aria-label="VIP guest">VIP</span>';
      }
      badgeHtml = '<div class="fl-table-detail">' +
        '<span class="fl-next-time">' + esc(timeStr) + '</span>' +
        '<span class="fl-party">' + esc(String(res.party_size)) + ' pax</span>' +
      '</div>';
    } else if (s === 'seated' && res) {
      var guest2  = res.cov_guests || {};
      var isVip2  = Array.isArray(guest2.tags) && guest2.tags.some(function (g) { return /vip/i.test(g); });
      if (isVip2) {
        vipBadge = '<span class="fl-vip fl-vip-corner" aria-label="VIP guest">VIP</span>';
      }
      badgeHtml = '<div class="fl-table-detail">' +
        '<span class="fl-party">' + esc(String(res.party_size)) + ' pax</span>' +
      '</div>';
    } else if (s === 'blocked' && t._blackout) {
      badgeHtml = '<div class="fl-table-detail"><span class="fl-blocked-label">Blocked</span></div>';
    }

    var ariaLabel = 'Table ' + t.label + ', ' + s +
      (res ? ', ' + (res.party_size || '') + ' guests' : '') +
      ', seats ' + (t.seats_min || 1) + '-' + (t.seats_max || 2);

    // When a table has detail, enforce minimum readable size
    var styleW = hasDetail ? Math.max(w, 72) : w;
    var styleH = hasDetail ? Math.max(h, 72) : h;

    return '<div class="fl-table fl-s-' + s +
      (isRound ? ' fl-round' : '') +
      (hasDetail ? ' fl-has-detail' : '') +
      (_editMode ? ' fl-draggable' : '') + '" ' +
      'id="fl-tbl-' + esc(t.id) + '" ' +
      'data-id="' + esc(t.id) + '" ' +
      'tabindex="0" ' +
      'role="button" ' +
      'aria-label="' + esc(ariaLabel) + '" ' +
      'style="' +
        'left:' + x + 'px;' +
        'top:' + y + 'px;' +
        'width:' + styleW + 'px;' +
        'height:' + styleH + 'px;' +
      '">' +
      vipBadge +
      '<div class="fl-table-label">' + esc(t.label || '?') + '</div>' +
      '<div class="fl-table-seats">' + (t.seats_max || '?') + '</div>' +
      badgeHtml +
    '</div>';
  }

  /* ──────────────────────────────────────────────────────────────────────
     DRAG-TO-MOVE
  ────────────────────────────────────────────────────────────────────── */

  function wireTableEl(el) {
    var tableId = el.dataset.id;

    // Click / keyboard → action sheet
    el.addEventListener('click', function (e) {
      if (_dragState && _dragState.moved) return; // ignore click after drag
      openActionSheet(tableId);
    });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openActionSheet(tableId); }
    });

    if (!_editMode) return;

    // Mouse drag
    el.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return;
      startDrag(e, el, tableId, false);
    });
    // Touch drag
    el.addEventListener('touchstart', function (e) {
      startDrag(e.touches[0], el, tableId, true);
    }, { passive: true });
  }

  function startDrag(ev, el, tableId, isTouch) {
    var canvas = document.getElementById('fl-canvas');
    if (!canvas) return;
    var rect   = canvas.getBoundingClientRect();
    var elRect = el.getBoundingClientRect();
    var offX   = ev.clientX - elRect.left;
    var offY   = ev.clientY - elRect.top;

    var startX = ev.clientX;
    var startY = ev.clientY;

    _dragState = { tableId: tableId, moved: false, el: el };

    function onMove(e) {
      var cx = isTouch ? e.touches[0].clientX : e.clientX;
      var cy = isTouch ? e.touches[0].clientY : e.clientY;
      if (Math.abs(cx - startX) > 4 || Math.abs(cy - startY) > 4) {
        _dragState.moved = true;
      }
      var newX = Math.max(0, Math.round(cx - rect.left - offX));
      var newY = Math.max(0, Math.round(cy - rect.top  - offY));
      el.style.left = newX + 'px';
      el.style.top  = newY + 'px';
    }

    function onEnd(e) {
      document.removeEventListener(isTouch ? 'touchmove' : 'mousemove', onMove);
      document.removeEventListener(isTouch ? 'touchend'  : 'mouseup',   onEnd);
      if (!_dragState || !_dragState.moved) { _dragState = null; return; }
      var newX = parseInt(el.style.left, 10);
      var newY = parseInt(el.style.top,  10);
      persistPosition(tableId, newX, newY);
      setTimeout(function () { _dragState = null; }, 50);
    }

    document.addEventListener(isTouch ? 'touchmove' : 'mousemove', onMove, isTouch ? { passive: true } : undefined);
    document.addEventListener(isTouch ? 'touchend'  : 'mouseup',   onEnd);
  }

  async function persistPosition(tableId, x, y) {
    // Update local cache immediately
    _tables = _tables.map(function (t) {
      return t.id === tableId ? Object.assign({}, t, { pos_x: x, pos_y: y }) : t;
    });
    try {
      await d.tables.updatePosition(tableId, x, y);
    } catch (err) {
      toast('Could not save table position', 'err');
      console.error('[floor] updatePosition error', err);
      // Revert
      await loadAll();
      renderFloorCanvas();
    }
  }

  /* ──────────────────────────────────────────────────────────────────────
     ACTION SHEET (click on table)
  ────────────────────────────────────────────────────────────────────── */

  function openActionSheet(tableId) {
    var table = _tables.find(function (t) { return t.id === tableId; });
    if (!table) return;
    var s   = table._state;
    var res = table._res;

    // Unassigned today's reservations for this table (for assign action)
    var unassigned = _reservations.filter(function (r) {
      return !r.table_id && ['booked','confirmed'].includes(r.status);
    });

    var closeBtn = '<button class="fl-sheet-close icon-btn" id="fl-sheet-close" aria-label="Close action sheet">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
    '</button>';

    var tableInfo = '<div class="fl-sheet-info">' +
      '<div class="fl-sheet-label">' + esc(table.label) + '</div>' +
      '<div class="fl-sheet-meta">' + esc(s) + ' · ' + esc(table.seats_min || 1) + '-' + esc(table.seats_max || '?') + ' seats</div>' +
    '</div>';

    var actions = '';

    if (s === 'open') {
      // Assign a booked reservation
      if (unassigned.length) {
        var opts = unassigned.map(function (r) {
          var tz   = (getRestaurant() || {}).timezone;
          var guest = r.cov_guests || {};
          return '<option value="' + esc(r.id) + '">' +
            esc(fmtTime(r.starts_at, tz)) + ' — ' + esc(guest.name || 'Walk-in') + ' (' + esc(r.party_size) + ')' +
          '</option>';
        }).join('');
        actions += '<div class="fl-sheet-section">' +
          '<label class="fl-sheet-section-label" for="fl-assign-select">Assign reservation</label>' +
          '<select class="input fl-assign-select" id="fl-assign-select" style="min-height:40px;font-size:14px">' +
          '<option value="">— pick a reservation —</option>' + opts +
          '</select>' +
          '<button class="fl-btn fl-btn-primary fl-sheet-action" id="fl-do-assign" aria-label="Assign selected reservation">Assign</button>' +
        '</div>';
      }
      // Walk-in → seat immediately
      actions += '<div class="fl-sheet-section">' +
        '<button class="fl-btn fl-btn-accent fl-sheet-action" id="fl-do-walkin" aria-label="Seat a walk-in">Seat walk-in</button>' +
      '</div>';
      // Block
      actions += '<div class="fl-sheet-section">' +
        '<button class="fl-btn fl-btn-danger fl-sheet-action" id="fl-do-block" aria-label="Block this table">Block table</button>' +
      '</div>';
    }

    if (s === 'reserved' && res) {
      actions += '<div class="fl-sheet-section">' +
        '<div class="fl-sheet-res-detail">' +
          (res.cov_guests ? '<strong>' + esc(res.cov_guests.name || 'Walk-in') + '</strong>' : '') +
          '<div style="font-size:13px;color:#60626e">' +
            'Party of ' + esc(String(res.party_size)) + ' · ' + esc(fmtTime(res.starts_at, (getRestaurant()||{}).timezone)) +
          '</div>' +
        '</div>' +
        '<button class="fl-btn fl-btn-primary fl-sheet-action" id="fl-do-seat" aria-label="Seat this party">Seat party</button>' +
      '</div>';
      actions += '<div class="fl-sheet-section">' +
        '<button class="fl-btn fl-btn-danger fl-sheet-action" id="fl-do-noshow" aria-label="Mark no-show">Mark no-show</button>' +
      '</div>';
    }

    if (s === 'seated' && res) {
      actions += '<div class="fl-sheet-section">' +
        '<div class="fl-sheet-res-detail">' +
          (res.cov_guests ? '<strong>' + esc(res.cov_guests.name || 'Walk-in') + '</strong> seated' : 'Seated') +
          '<div style="font-size:13px;color:var(--color-text-muted)">Party of ' + esc(String(res.party_size)) + '</div>' +
        '</div>' +
        '<button class="fl-btn fl-btn-success fl-sheet-action" id="fl-do-complete" aria-label="Mark as completed">Complete party</button>' +
      '</div>';
    }

    if (s === 'dirty') {
      actions += '<div class="fl-sheet-section">' +
        '<button class="fl-btn fl-btn-success fl-sheet-action" id="fl-do-clean" aria-label="Mark table as clean">Mark clean</button>' +
      '</div>';
    }

    if (s === 'blocked') {
      actions += '<div class="fl-sheet-section">' +
        '<button class="fl-btn fl-btn-success fl-sheet-action" id="fl-do-unblock" aria-label="Unblock this table">Unblock</button>' +
      '</div>';
    }

    var overlayHtml =
      '<div class="fl-overlay-bg" id="fl-overlay-bg" role="dialog" aria-modal="true" aria-label="Table actions">' +
        '<div class="fl-sheet" role="document">' +
          '<div class="fl-sheet-head">' + tableInfo + closeBtn + '</div>' +
          '<div class="fl-sheet-body">' + actions + '</div>' +
        '</div>' +
      '</div>';

    // Remove any existing overlay
    closeActionSheet();

    var wrap = document.createElement('div');
    wrap.innerHTML = overlayHtml;
    document.body.appendChild(wrap.firstElementChild);

    // Wire close
    var overlay = document.getElementById('fl-overlay-bg');
    document.getElementById('fl-sheet-close').addEventListener('click', closeActionSheet);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeActionSheet(); });
    overlay.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeActionSheet(); });

    // Wire action buttons
    wireActionBtn('fl-do-assign',   function () { doAssign(table);    });
    wireActionBtn('fl-do-walkin',   function () { doWalkin(table);    });
    wireActionBtn('fl-do-block',    function () { doBlock(table);     });
    wireActionBtn('fl-do-seat',     function () { doSeat(table, res); });
    wireActionBtn('fl-do-noshow',   function () { doNoShow(table, res); });
    wireActionBtn('fl-do-complete', function () { doComplete(table, res); });
    wireActionBtn('fl-do-clean',    function () { doClean(table);     });
    wireActionBtn('fl-do-unblock',  function () { doUnblock(table);   });

    // Focus first interactive element
    setTimeout(function () {
      var first = overlay.querySelector('button,select');
      if (first) first.focus();
    }, 50);
  }

  function wireActionBtn(id, fn) {
    var btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('click', fn);
    btn.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); }
    });
  }

  function closeActionSheet() {
    var el = document.getElementById('fl-overlay-bg');
    if (el) el.remove();
  }

  /* ──────────────────────────────────────────────────────────────────────
     ACTION HANDLERS
  ────────────────────────────────────────────────────────────────────── */

  async function doAssign(table) {
    var sel = document.getElementById('fl-assign-select');
    if (!sel || !sel.value) { toast('Please pick a reservation to assign', 'warn'); return; }
    var resId = sel.value;
    var res   = _reservations.find(function (r) { return r.id === resId; });
    if (!res) { toast('Reservation not found', 'err'); return; }

    // SPEC §3b conflict check (client-side gate)
    var rest = getRestaurant();
    var bufMin = (rest || {}).buffer_minutes || 15;
    if (!isTableFree(table.id, res.starts_at, res.end_at, resId, bufMin)) {
      toast('Conflict: another booking overlaps this table at that time (including buffer)', 'err');
      return;
    }

    closeActionSheet();
    try {
      await d.reservations.assignTable(resId, table.id);
      // Update local cache
      _reservations = _reservations.map(function (r) {
        return r.id === resId ? Object.assign({}, r, { table_id: table.id }) : r;
      });
      recomputeStates();
      renderFloorCanvas();
      toast('Table ' + table.label + ' assigned', 'ok');
    } catch (err) {
      toast('Assignment failed — please try again', 'err');
      console.error('[floor] assignTable error', err);
    }
  }

  async function doWalkin(table) {
    // Create a walk-in reservation + seat immediately
    var rest = getRestaurant();
    closeActionSheet();
    try {
      var now    = new Date();
      var endAt  = new Date(now.getTime() + ((rest.default_turn_minutes || 90) * 60 * 1000));
      var newRes = await d.reservations.create({
        restaurant_id: rest.id,
        table_id:      table.id,
        party_size:    2,  // default walk-in party
        starts_at:     now.toISOString(),
        end_at:        endAt.toISOString(),
        turn_minutes:  rest.default_turn_minutes || 90,
        status:        'seated',
        source:        'walkin',
        seated_at:     now.toISOString(),
      });
      _reservations.push(Object.assign({ cov_guests: null, cov_tables: { id: table.id, label: table.label, room_id: table.room_id } }, newRes));
      recomputeStates();
      renderFloorCanvas();
      toast('Walk-in seated at ' + table.label, 'ok');
    } catch (err) {
      toast('Could not create walk-in — please try again', 'err');
      console.error('[floor] walkin error', err);
    }
  }

  async function doBlock(table) {
    var rest = getRestaurant();
    closeActionSheet();
    // Confirm
    if (!(await window.PLAT.confirmDialog('Block table ' + table.label + '? This will create a 4-hour blackout starting now.', { confirmLabel: 'Block', danger: true }))) return;
    try {
      var now = new Date();
      var end = new Date(now.getTime() + 4 * 3600 * 1000);
      var bo  = await d.blackouts.create({
        restaurant_id: rest.id,
        table_id:      table.id,
        starts_at:     now.toISOString(),
        end_at:        end.toISOString(),
        reason:        'maintenance',
      });
      _blackouts.push(bo);
      recomputeStates();
      renderFloorCanvas();
      toast('Table ' + table.label + ' blocked for 4 hours', 'warn');
    } catch (err) {
      toast('Could not block table — please try again', 'err');
      console.error('[floor] block error', err);
    }
  }

  async function doSeat(table, res) {
    closeActionSheet();
    // Edge case: table dirty → must clean first
    if (table._dirty) {
      toast('Table ' + table.label + ' is dirty — mark it clean first', 'warn');
      return;
    }
    try {
      await d.reservations.updateStatus(res.id, 'seated');
      _reservations = _reservations.map(function (r) {
        return r.id === res.id ? Object.assign({}, r, { status: 'seated', seated_at: new Date().toISOString() }) : r;
      });
      recomputeStates();
      renderFloorCanvas();
      toast('Party seated at ' + table.label, 'ok');
    } catch (err) {
      toast('Could not update status — please try again', 'err');
      console.error('[floor] seat error', err);
    }
  }

  async function doNoShow(table, res) {
    closeActionSheet();
    if (!(await window.PLAT.confirmDialog('Mark this reservation as a no-show?', { danger: true }))) return;
    try {
      await d.reservations.updateStatus(res.id, 'no_show');
      _reservations = _reservations.map(function (r) {
        return r.id === res.id ? Object.assign({}, r, { status: 'no_show' }) : r;
      });
      recomputeStates();
      renderFloorCanvas();
      toast('Marked as no-show — table freed', 'ok');
    } catch (err) {
      toast('Could not mark no-show — please try again', 'err');
      console.error('[floor] noshow error', err);
    }
  }

  async function doComplete(table, res) {
    closeActionSheet();
    try {
      await d.reservations.updateStatus(res.id, 'completed');
      _reservations = _reservations.map(function (r) {
        return r.id === res.id ? Object.assign({}, r, { status: 'completed', completed_at: new Date().toISOString() }) : r;
      });
      // Persist dirty status on the table row so it survives page reload and realtime
      await d.tables.update(table.id, { status: 'dirty' }).catch(function (err) {
        console.warn('[floor] could not persist dirty status', err);
      });
      _tables = _tables.map(function (t) {
        return t.id === table.id ? Object.assign({}, t, { _dirty: true, status: 'dirty' }) : t;
      });
      recomputeStates();
      renderFloorCanvas();
      toast('Party completed — table ' + table.label + ' is now dirty', 'ok');
    } catch (err) {
      toast('Could not complete party — please try again', 'err');
      console.error('[floor] complete error', err);
    }
  }

  async function doClean(table) {
    closeActionSheet();
    // Persist cleared status so it survives reload and realtime
    await d.tables.update(table.id, { status: null }).catch(function (err) {
      console.warn('[floor] could not persist clean status', err);
    });
    _tables = _tables.map(function (t) {
      return t.id === table.id ? Object.assign({}, t, { _dirty: false, status: null }) : t;
    });
    recomputeStates();
    renderFloorCanvas();
    toast('Table ' + table.label + ' marked clean', 'ok');
  }

  async function doUnblock(table) {
    closeActionSheet();
    var bo = table._blackout;
    if (!bo) { toast('No active blackout found', 'warn'); return; }
    try {
      await d.blackouts.remove(bo.id);
      _blackouts = _blackouts.filter(function (b) { return b.id !== bo.id; });
      recomputeStates();
      renderFloorCanvas();
      toast('Table ' + table.label + ' unblocked', 'ok');
    } catch (err) {
      toast('Could not unblock — please try again', 'err');
      console.error('[floor] unblock error', err);
    }
  }

  /* ──────────────────────────────────────────────────────────────────────
     FLOOR EDITOR PANEL
  ────────────────────────────────────────────────────────────────────── */

  function renderEditorPanel() {
    var panel = document.getElementById('fl-editor-panel');
    if (!panel) return;

    panel.innerHTML =
      '<div class="fl-ep-title">Editor</div>' +
      '<div class="fl-ep-section">' +
        '<div class="fl-ep-section-title">Rooms</div>' +
        buildRoomListEditor() +
      '</div>' +
      '<div class="fl-ep-section">' +
        '<div class="fl-ep-section-title">Add table</div>' +
        buildAddTableForm() +
      '</div>' +
      '<div class="fl-ep-section">' +
        '<div class="fl-ep-section-title">Tables in room</div>' +
        buildTableListEditor() +
      '</div>';

    // Wire add-table form
    var form = panel.querySelector('#fl-add-table-form');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        doAddTable(form);
      });
    }
  }

  function buildRoomListEditor() {
    if (!_rooms.length) return '<p class="fl-ep-empty-msg">No rooms yet — click "+ Room" in the toolbar</p>';
    return '<ul class="fl-ep-table-list" role="list">' +
      _rooms.map(function (room) {
        var isActive = room.id === _activeRoom;
        return '<li class="fl-ep-table-row' + (isActive ? ' fl-ep-room-active' : '') + '" role="listitem">' +
          '<span class="fl-ep-tbl-label" style="' + (isActive ? 'color:var(--fl-copper,#c2703d)' : '') + '">' + esc(room.name) + (isActive ? ' ✓' : '') + '</span>' +
          '<button class="fl-btn fl-btn-ghost fl-ep-rename-room-btn" data-room-id="' + esc(room.id) + '" data-room-name="' + esc(room.name) + '" ' +
            'aria-label="Rename room ' + esc(room.name) + '" style="min-height:28px;padding:0 var(--space-2);font-size:12px">' +
            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Rename' +
          '</button>' +
          '<button class="fl-btn fl-btn-ghost fl-ep-del-room-btn" data-room-id="' + esc(room.id) + '" data-room-name="' + esc(room.name) + '" ' +
            'aria-label="Delete room ' + esc(room.name) + '" style="min-height:28px;padding:0 var(--space-2);font-size:12px;color:#f56565">' +
            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f56565" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> Del' +
          '</button>' +
        '</li>';
      }).join('') +
    '</ul>';
  }

  function buildAddTableForm() {
    return '<form id="fl-add-table-form" class="fl-ep-form">' +
      '<div class="fl-ep-field">' +
        '<label for="fl-ep-label">Label</label>' +
        '<input id="fl-ep-label" class="input" type="text" placeholder="T5" required maxlength="8" style="min-height:36px;font-size:13px">' +
      '</div>' +
      '<div class="fl-ep-row">' +
        '<div class="fl-ep-field">' +
          '<label for="fl-ep-min">Min seats</label>' +
          '<input id="fl-ep-min" class="input" type="number" value="1" min="1" max="50" style="min-height:36px;font-size:13px">' +
        '</div>' +
        '<div class="fl-ep-field">' +
          '<label for="fl-ep-max">Max seats</label>' +
          '<input id="fl-ep-max" class="input" type="number" value="4" min="1" max="50" style="min-height:36px;font-size:13px">' +
        '</div>' +
      '</div>' +
      '<div class="fl-ep-field">' +
        '<label for="fl-ep-shape">Shape</label>' +
        '<select id="fl-ep-shape" class="input select" style="min-height:36px;font-size:13px">' +
          '<option value="rect">Rectangle</option>' +
          '<option value="square">Square</option>' +
          '<option value="round">Round</option>' +
        '</select>' +
      '</div>' +
      '<div class="fl-ep-field fl-ep-check">' +
        '<label style="flex-direction:row;align-items:center;gap:8px;cursor:pointer">' +
          '<input id="fl-ep-online" type="checkbox" checked> Online bookable' +
        '</label>' +
      '</div>' +
      '<button type="submit" class="fl-btn fl-btn-primary" style="width:100%;justify-content:center">Add table</button>' +
    '</form>';
  }

  function buildTableListEditor() {
    var roomTables = _tables.filter(function (t) {
      return t.room_id === _activeRoom && t.is_active !== false;
    });
    if (!roomTables.length) return '<p class="fl-ep-empty-msg">No tables yet</p>';
    return '<ul class="fl-ep-table-list" role="list">' +
      roomTables.map(function (t) {
        return '<li class="fl-ep-table-row" role="listitem">' +
          '<span class="fl-ep-tbl-label">' + esc(t.label) + '</span>' +
          '<span class="fl-ep-tbl-seats">' + esc(t.seats_min) + '-' + esc(t.seats_max) + ' seats</span>' +
          '<button class="fl-btn fl-btn-ghost fl-ep-edit-btn" data-id="' + esc(t.id) + '" aria-label="Edit table ' + esc(t.label) + '">' +
            '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' +
          '</button>' +
          '<button class="fl-btn fl-btn-ghost fl-ep-del-btn" data-id="' + esc(t.id) + '" data-label="' + esc(t.label) + '" aria-label="Delete table ' + esc(t.label) + '">' +
            '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--color-destructive)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>' +
          '</button>' +
        '</li>';
      }).join('') +
    '</ul>';
  }

  async function doAddTable(form) {
    var rest  = getRestaurant();
    var label = form.querySelector('#fl-ep-label').value.trim();
    var min   = parseInt(form.querySelector('#fl-ep-min').value, 10) || 1;
    var max   = parseInt(form.querySelector('#fl-ep-max').value, 10) || 4;
    var shape = form.querySelector('#fl-ep-shape').value;
    var onlineBookable = form.querySelector('#fl-ep-online').checked;
    if (!label) { toast('Please enter a table label', 'warn'); return; }
    if (min > max) { toast('Min seats must be ≤ max seats', 'warn'); return; }

    var w = shape === 'round' ? 72 : (shape === 'rect' ? 90 : 72);
    var h = shape === 'round' ? 72 : 60;

    try {
      var t = await d.tables.create({
        restaurant_id: rest.id,
        room_id:       _activeRoom,
        label:         label,
        seats_min:     min,
        seats_max:     max,
        shape:         shape,
        width:         w,
        height:        h,
        pos_x:         40,
        pos_y:         40,
        is_active:     true,
        online_bookable: onlineBookable,
        sort_order:    _tables.length,
      });
      _tables.push(Object.assign({ _dirty: false, _state: 'open', _res: null, _blackout: null }, t));
      recomputeStates();
      renderFloorCanvas();
      renderEditorPanel();
      toast('Table ' + t.label + ' added', 'ok');
    } catch (err) {
      toast('Could not add table — please try again', 'err');
      console.error('[floor] addTable error', err);
    }
  }

  // Editor panel — wire edit/delete/rename via event delegation on document
  document.addEventListener('click', function (e) {
    var editBtn = e.target.closest('.fl-ep-edit-btn');
    if (editBtn) { openEditTableDialog(editBtn.dataset.id); return; }
    var delBtn  = e.target.closest('.fl-ep-del-btn');
    if (delBtn)  { doDeleteTable(delBtn.dataset.id, delBtn.dataset.label); return; }
    var renameRoomBtn = e.target.closest('.fl-ep-rename-room-btn');
    if (renameRoomBtn) { openRenameRoomDialog(renameRoomBtn.dataset.roomId, renameRoomBtn.dataset.roomName); return; }
    var delRoomBtn = e.target.closest('.fl-ep-del-room-btn');
    if (delRoomBtn)  { doDeleteRoom(delRoomBtn.dataset.roomId, delRoomBtn.dataset.roomName); }
  });

  function openRenameRoomDialog(roomId, currentName) {
    var prevOverlay = document.getElementById('fl-renameroom-overlay');
    if (prevOverlay) prevOverlay.remove();

    var overlayHtml =
      '<div class="fl-overlay-bg" id="fl-renameroom-overlay" role="dialog" aria-modal="true" aria-labelledby="fl-rr-title">' +
        '<div class="fl-sheet" role="document">' +
          '<div class="fl-sheet-head">' +
            '<div class="fl-sheet-info"><div class="fl-sheet-label" id="fl-rr-title">Rename room</div></div>' +
            '<button class="fl-sheet-close icon-btn" id="fl-rr-close" aria-label="Close">' +
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
            '</button>' +
          '</div>' +
          '<div class="fl-sheet-body">' +
            '<div class="fl-ep-field">' +
              '<label for="fl-rr-name">New room name</label>' +
              '<input id="fl-rr-name" class="input" type="text" value="' + esc(currentName) + '" maxlength="60" required style="min-height:40px">' +
            '</div>' +
            '<div id="fl-rr-err" style="color:#f56565;font-size:13px;display:none"></div>' +
            '<button id="fl-rr-submit" class="fl-btn fl-btn-primary" style="width:100%;justify-content:center;margin-top:var(--space-2)">Save name</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    var wrap = document.createElement('div');
    wrap.innerHTML = overlayHtml;
    document.body.appendChild(wrap.firstElementChild);

    var overlay = document.getElementById('fl-renameroom-overlay');
    document.getElementById('fl-rr-close').addEventListener('click', function () { overlay.remove(); });
    overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.remove(); });
    overlay.addEventListener('keydown', function (e) { if (e.key === 'Escape') overlay.remove(); });

    var nameInput = document.getElementById('fl-rr-name');
    var errEl     = document.getElementById('fl-rr-err');
    var submitBtn = document.getElementById('fl-rr-submit');
    setTimeout(function () { if (nameInput) { nameInput.focus(); nameInput.select(); } }, 50);

    submitBtn.addEventListener('click', async function () {
      var newName = nameInput.value.trim();
      if (!newName) { errEl.textContent = 'Name is required.'; errEl.style.display = 'block'; return; }
      submitBtn.disabled = true;
      try {
        await d.rooms.update(roomId, { name: newName });
        _rooms = _rooms.map(function (r) {
          return r.id === roomId ? Object.assign({}, r, { name: newName }) : r;
        });
        renderRoomTabs();
        renderEditorPanel();
        overlay.remove();
        toast('Room renamed to "' + newName + '"', 'ok');
      } catch (err) {
        errEl.textContent = 'Could not rename room. Please try again.';
        errEl.style.display = 'block';
        submitBtn.disabled = false;
        console.error('[floor] renameRoom error', err);
      }
    });
  }

  async function doDeleteRoom(roomId, roomName) {
    var hasTables = _tables.some(function (t) {
      return t.room_id === roomId && t.is_active !== false;
    });
    if (hasTables) {
      toast('Cannot delete "' + roomName + '" — move or delete all tables in it first.', 'warn');
      return;
    }
    if (!(await window.PLAT.confirmDialog('Delete room "' + roomName + '"? This cannot be undone.', { confirmLabel: 'Delete', danger: true }))) return;
    try {
      await d.rooms.remove(roomId);
      _rooms = _rooms.filter(function (r) { return r.id !== roomId; });
      if (_activeRoom === roomId) {
        _activeRoom = _rooms.length ? _rooms[0].id : null;
      }
      renderRoomTabs();
      renderFloorCanvas();
      renderEditorPanel();
      toast('Room "' + roomName + '" deleted.', 'ok');
    } catch (err) {
      toast('Could not delete room. Please try again.', 'err');
      console.error('[floor] deleteRoom error', err);
    }
  }

  function openEditTableDialog(tableId) {
    var table = _tables.find(function (t) { return t.id === tableId; });
    if (!table) return;

    var overlayHtml =
      '<div class="fl-overlay-bg" id="fl-edit-overlay" role="dialog" aria-modal="true" aria-label="Edit table">' +
        '<div class="fl-sheet" role="document">' +
          '<div class="fl-sheet-head">' +
            '<div class="fl-sheet-info"><div class="fl-sheet-label">Edit ' + esc(table.label) + '</div></div>' +
            '<button class="fl-sheet-close icon-btn" id="fl-edit-close" aria-label="Close">'+
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'+
            '</button>' +
          '</div>' +
          '<div class="fl-sheet-body">' +
            '<form id="fl-edit-table-form" class="fl-ep-form">' +
              '<div class="fl-ep-field"><label for="fl-et-label">Label</label>' +
                '<input id="fl-et-label" class="input" type="text" value="' + esc(table.label) + '" required maxlength="8" style="min-height:36px;font-size:13px"></div>' +
              '<div class="fl-ep-row">' +
                '<div class="fl-ep-field"><label for="fl-et-min">Min</label>' +
                  '<input id="fl-et-min" class="input" type="number" value="' + esc(table.seats_min) + '" min="1" max="50" style="min-height:36px;font-size:13px"></div>' +
                '<div class="fl-ep-field"><label for="fl-et-max">Max</label>' +
                  '<input id="fl-et-max" class="input" type="number" value="' + esc(table.seats_max) + '" min="1" max="50" style="min-height:36px;font-size:13px"></div>' +
              '</div>' +
              '<div class="fl-ep-field"><label for="fl-et-shape">Shape</label>' +
                '<select id="fl-et-shape" class="input select" style="min-height:36px;font-size:13px">' +
                  ['rect','square','round'].map(function (s) {
                    return '<option value="' + s + '"' + (table.shape === s ? ' selected' : '') + '>' + s + '</option>';
                  }).join('') +
                '</select></div>' +
              '<div class="fl-ep-field fl-ep-check"><label style="flex-direction:row;align-items:center;gap:8px;cursor:pointer">' +
                '<input id="fl-et-online" type="checkbox"' + (table.online_bookable ? ' checked' : '') + '> Online bookable' +
              '</label></div>' +
              '<button type="submit" class="fl-btn fl-btn-primary" style="width:100%;justify-content:center">Save changes</button>' +
            '</form>' +
          '</div>' +
        '</div>' +
      '</div>';

    var prev = document.getElementById('fl-edit-overlay');
    if (prev) prev.remove();
    var wrap = document.createElement('div');
    wrap.innerHTML = overlayHtml;
    document.body.appendChild(wrap.firstElementChild);

    var overlay = document.getElementById('fl-edit-overlay');
    document.getElementById('fl-edit-close').addEventListener('click', function () { overlay.remove(); });
    overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.remove(); });
    overlay.addEventListener('keydown', function (e) { if (e.key === 'Escape') overlay.remove(); });
    overlay.querySelector('#fl-edit-table-form').addEventListener('submit', async function (e) {
      e.preventDefault();
      var patch = {
        label:          overlay.querySelector('#fl-et-label').value.trim(),
        seats_min:      parseInt(overlay.querySelector('#fl-et-min').value, 10),
        seats_max:      parseInt(overlay.querySelector('#fl-et-max').value, 10),
        shape:          overlay.querySelector('#fl-et-shape').value,
        online_bookable: overlay.querySelector('#fl-et-online').checked,
      };
      if (!patch.label) { toast('Label required', 'warn'); return; }
      if (patch.seats_min > patch.seats_max) { toast('Min > max seats', 'warn'); return; }
      try {
        var updated = await d.tables.update(tableId, patch);
        _tables = _tables.map(function (t) {
          return t.id === tableId ? Object.assign({}, t, updated) : t;
        });
        recomputeStates();
        renderFloorCanvas();
        renderEditorPanel();
        overlay.remove();
        toast('Table updated', 'ok');
      } catch (err) {
        toast('Could not update table', 'err');
        console.error('[floor] editTable error', err);
      }
    });
  }

  async function doDeleteTable(tableId, label) {
    var futurRes = _reservations.filter(function (r) {
      return r.table_id === tableId && ['booked','confirmed','seated'].includes(r.status);
    });
    if (futurRes.length) {
      toast('Cannot delete — table has active/upcoming reservations. Reassign them first.', 'warn');
      return;
    }
    if (!(await window.PLAT.confirmDialog('Delete table ' + label + '? This cannot be undone.', { confirmLabel: 'Delete', danger: true }))) return;
    try {
      await d.tables.remove(tableId);
      _tables = _tables.filter(function (t) { return t.id !== tableId; });
      recomputeStates();
      renderFloorCanvas();
      renderEditorPanel();
      toast('Table ' + label + ' deleted', 'ok');
    } catch (err) {
      toast('Could not delete table', 'err');
      console.error('[floor] deleteTable error', err);
    }
  }

  /* ──────────────────────────────────────────────────────────────────────
     ADD ROOM DIALOG
  ────────────────────────────────────────────────────────────────────── */

  function openAddRoomDialog() {
    var overlayHtml =
      '<div class="fl-overlay-bg" id="fl-addroom-overlay" role="dialog" aria-modal="true" aria-label="Add room">' +
        '<div class="fl-sheet" role="document">' +
          '<div class="fl-sheet-head">' +
            '<div class="fl-sheet-info"><div class="fl-sheet-label">Add room</div></div>' +
            '<button class="fl-sheet-close icon-btn" id="fl-ar-close" aria-label="Close">'+
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'+
            '</button>' +
          '</div>' +
          '<div class="fl-sheet-body">' +
            '<div class="fl-ep-field">' +
              '<label for="fl-ar-name">Room name</label>' +
              '<input id="fl-ar-name" class="input" type="text" placeholder="e.g. Patio" required style="min-height:40px">' +
            '</div>' +
            '<button id="fl-ar-submit" class="fl-btn fl-btn-primary" style="width:100%;justify-content:center">Add room</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    var prev = document.getElementById('fl-addroom-overlay');
    if (prev) prev.remove();
    var wrap = document.createElement('div');
    wrap.innerHTML = overlayHtml;
    document.body.appendChild(wrap.firstElementChild);

    var overlay = document.getElementById('fl-addroom-overlay');
    document.getElementById('fl-ar-close').addEventListener('click', function () { overlay.remove(); });
    overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.remove(); });
    overlay.addEventListener('keydown', function (e) { if (e.key === 'Escape') overlay.remove(); });
    document.getElementById('fl-ar-submit').addEventListener('click', async function () {
      var name = document.getElementById('fl-ar-name').value.trim();
      if (!name) { toast('Please enter a room name', 'warn'); return; }
      var rest = getRestaurant();
      try {
        var room = await d.rooms.create({
          restaurant_id: rest.id,
          name:          name,
          sort_order:    _rooms.length,
          is_active:     true,
        });
        _rooms.push(room);
        _activeRoom = room.id;
        renderRoomTabs();
        renderFloorCanvas();
        if (_editMode) renderEditorPanel();
        overlay.remove();
        toast('Room "' + name + '" added', 'ok');
      } catch (err) {
        toast('Could not add room', 'err');
        console.error('[floor] addRoom error', err);
      }
    });

    setTimeout(function () {
      var inp = document.getElementById('fl-ar-name');
      if (inp) inp.focus();
    }, 50);
  }

  /* ──────────────────────────────────────────────────────────────────────
     ERROR STATE
  ────────────────────────────────────────────────────────────────────── */

  function renderError(msg) {
    if (!_sectionEl) return;
    _sectionEl.innerHTML =
      '<div class="fl-error-state">' +
        '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#f56565" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' +
        '<p>Failed to load the floor</p>' +
        '<button class="fl-btn fl-btn-primary" id="fl-retry-btn">Retry</button>' +
      '</div>';
    var retryBtn = document.getElementById('fl-retry-btn');
    if (retryBtn) retryBtn.addEventListener('click', function () { initFloor(); });
  }

  /* ──────────────────────────────────────────────────────────────────────
     LOADING SKELETON
  ────────────────────────────────────────────────────────────────────── */

  function renderLoadingSkeleton() {
    if (!_sectionEl) return;
    _sectionEl.innerHTML =
      '<div class="fl-loading" role="status" aria-label="Loading floor plan">' +
        '<div class="fl-loading-toolbar">' +
          '<div class="skeleton fl-skel-tab"></div>' +
          '<div class="skeleton fl-skel-tab"></div>' +
          '<div class="skeleton fl-skel-tab" style="width:80px"></div>' +
        '</div>' +
        '<div class="fl-loading-canvas">' +
          [0,1,2,3].map(function () {
            var w = 72 + Math.random() * 40 | 0;
            var h = 60 + Math.random() * 20 | 0;
            return '<div class="skeleton fl-skel-table" style="width:' + w + 'px;height:' + h + 'px"></div>';
          }).join('') +
        '</div>' +
      '</div>';
  }

  /* ──────────────────────────────────────────────────────────────────────
     ENTRY POINT
  ────────────────────────────────────────────────────────────────────── */

  async function initFloor() {
    renderLoadingSkeleton();
    try {
      await loadAll();
      renderAll();
      // Subscribe realtime after initial render
      cleanupChannels();
      subscribeRealtime();
    } catch (err) {
      console.error('[floor] initFloor error', err);
      renderError('Could not load floor data.');
    }
  }

  /* ──────────────────────────────────────────────────────────────────────
     CLEANUP on re-render (shell calls render() each navigation)
  ────────────────────────────────────────────────────────────────────── */

  function cleanup() {
    // Remove focus listener
    window.removeEventListener('focus', onFocusRefetch);
    // Close any open overlays
    ['fl-overlay-bg','fl-edit-overlay','fl-addroom-overlay','fl-renameroom-overlay'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.remove();
    });
  }

  /* ──────────────────────────────────────────────────────────────────────
     PUBLIC API
  ────────────────────────────────────────────────────────────────────── */

  window.COV = window.COV || {};
  window.COV.screens = window.COV.screens || {};
  window.COV.screens.floor = {
    render: function (sectionEl) {
      cleanup();
      _sectionEl = sectionEl;
      // Keep realtime channels alive but re-render on navigation
      if (!_channels.length) {
        // First load: fetch data
        initFloor();
      } else {
        // Already have data from realtime; just re-render
        recomputeStates();
        renderAll();
      }
    },
  };

}());
