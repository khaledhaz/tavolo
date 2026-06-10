/* ============================================================================
   Coverly — Reservation Timeline screen
   Registers: window.COV.screens.timeline = { render(sectionEl), _reload() }
   Requires:  window.COV.resEditor (from reservations.js, loaded after)
   ============================================================================ */
(function () {
  'use strict';

  var data  = window.COV.data;
  var utils = window.COV.utils;
  var esc   = utils.esc;
  var toast = utils.toast;
  var fmtTime = utils.formatTime;

  /* ------------------------------------------------------------------ */
  /* CSS                                                                  */
  /* ------------------------------------------------------------------ */
  var CSS = `
/* ===== TIMELINE SCREEN ===== */
.tl-bar {
  display: flex; align-items: center; gap: 12px;
  margin-bottom: 16px; flex-wrap: wrap;
}
.tl-date-picker {
  min-height: 40px; padding: 0 12px; border: 1px solid var(--color-border);
  border-radius: var(--radius-md); font-size: 14px; background: var(--color-surface);
  color: var(--color-text-primary); cursor: pointer;
}
.tl-date-picker:focus { outline: none; border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-light); }
.tl-nav-btn {
  width: 36px; height: 36px; border-radius: var(--radius-sm); border: 1px solid var(--color-border);
  background: var(--color-surface); cursor: pointer; display: flex; align-items: center; justify-content: center;
  color: var(--color-text-secondary); transition: background var(--duration-fast), color var(--duration-fast);
  flex-shrink: 0;
}
.tl-nav-btn:hover { background: var(--color-surface-raised); color: var(--color-text-primary); }

/* Scroll wrapper — ONLY the grid scrolls horizontally */
.tl-scroll-wrap {
  overflow-x: auto; overflow-y: visible;
  -webkit-overflow-scrolling: touch;
  border: 1px solid var(--color-border); border-radius: var(--radius-lg);
  background: var(--color-surface);
}
.tl-scroll-wrap::-webkit-scrollbar { height: 6px; }
.tl-scroll-wrap::-webkit-scrollbar-thumb { background: var(--color-border-strong); border-radius: 3px; }

/* Grid table */
.tl-grid {
  border-collapse: collapse;
  table-layout: fixed;
  min-width: 100%;
}
.tl-grid th, .tl-grid td {
  border: 1px solid var(--color-border);
  padding: 0; height: 52px; position: relative; vertical-align: top;
}
.tl-grid th {
  background: var(--color-surface-raised); font-size: 11px; font-weight: 600;
  letter-spacing: .06em; text-transform: uppercase; color: var(--color-text-muted);
  white-space: nowrap; padding: 0 8px; height: 36px; vertical-align: middle;
  text-align: center; position: sticky; top: 0; z-index: 5;
}
/* Label column — row headers */
.tl-grid .tl-row-label {
  font-size: 12px; font-weight: 600; color: var(--color-text-secondary);
  background: var(--color-surface-raised); white-space: nowrap;
  padding: 0 12px; text-align: left; width: 72px; min-width: 72px;
  position: sticky; left: 0; z-index: 4; border-right: 2px solid var(--color-border);
}
/* Corner cell */
.tl-grid .tl-corner {
  position: sticky; left: 0; top: 0; z-index: 6;
  background: var(--color-surface-raised);
  border-right: 2px solid var(--color-border);
  border-bottom: 2px solid var(--color-border);
}
/* Time slot cells */
.tl-cell {
  width: 64px; min-width: 64px; cursor: pointer;
  transition: background var(--duration-fast);
}
.tl-cell:hover { background: var(--color-primary-light); }
.tl-cell.tl-blocked {
  background: repeating-linear-gradient(45deg, var(--color-surface-raised) 0 6px, var(--color-border) 6px 8px);
  cursor: not-allowed;
}
.tl-cell.tl-blocked:hover { background: repeating-linear-gradient(45deg, var(--color-surface-raised) 0 6px, var(--color-border) 6px 8px); }

/* Reservation block */
.tl-block {
  position: absolute; top: 4px; bottom: 4px; left: 2px;
  border-radius: 6px; padding: 3px 6px;
  font-size: 11px; font-weight: 600; line-height: 1.3;
  overflow: hidden; cursor: grab; z-index: 2;
  user-select: none; -webkit-user-select: none;
  transition: box-shadow var(--duration-fast), transform var(--duration-fast), opacity var(--duration-fast);
  display: flex; flex-direction: column; justify-content: center; min-width: 0;
}
.tl-block:hover { box-shadow: 0 4px 12px rgba(28,23,20,.18); z-index: 10; }
.tl-block:focus { outline: 2px solid var(--color-primary); outline-offset: 2px; }
.tl-block.dragging { opacity: .55; cursor: grabbing; transform: scale(1.03); z-index: 20; }
.tl-block.drag-over-ok  { box-shadow: inset 0 0 0 2px var(--color-success); }
.tl-block.drag-over-err { box-shadow: inset 0 0 0 2px var(--color-destructive); }

/* Status colors */
.tl-block.booked    { background: var(--color-accent-light);      color: var(--color-accent-hover); border: 1px solid rgba(232,160,64,.35); }
.tl-block.confirmed { background: var(--color-info-light);         color: var(--color-info);         border: 1px solid rgba(43,108,176,.3); }
.tl-block.seated    { background: var(--color-primary-light);      color: var(--color-primary);      border: 1px solid rgba(196,82,42,.3); }
.tl-block.completed { background: var(--color-success-light);      color: var(--color-success);      border: 1px solid rgba(42,122,85,.25); }
.tl-block.no_show   { background: var(--color-destructive-light);  color: var(--color-destructive);  border: 1px solid rgba(181,59,47,.25); }
.tl-block.cancelled { background: var(--color-surface-raised);     color: var(--color-text-muted);   border: 1px solid var(--color-border); }

.tl-block-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tl-block-meta { font-size: 10px; opacity: .8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* Drop targets while dragging */
.tl-cell.drop-target-ok  { background: var(--color-success-light) !important; outline: 2px dashed var(--color-success); }
.tl-cell.drop-target-err { background: var(--color-destructive-light) !important; outline: 2px dashed var(--color-destructive); }

/* Legend */
.tl-legend {
  display: flex; gap: 12px; flex-wrap: wrap; margin-top: 12px;
  font-size: 12px; color: var(--color-text-muted);
}
.tl-legend-item { display: flex; align-items: center; gap: 5px; }
.tl-legend-dot  { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }

@media (max-width: 599px) {
  .tl-bar { gap: 8px; }
  .tl-grid .tl-row-label { width: 56px; min-width: 56px; font-size: 11px; padding: 0 6px; }
  .tl-cell { width: 52px; min-width: 52px; }
}
`;

  (function injectCSS() {
    if (document.getElementById('cov-tl-css')) return;
    var s = document.createElement('style');
    s.id = 'cov-tl-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  })();

  /* ------------------------------------------------------------------ */
  /* Helpers                                                              */
  /* ------------------------------------------------------------------ */
  function getTodayLocal(tz) {
    try { return new Intl.DateTimeFormat('en-CA', { timeZone: tz || 'UTC' }).format(new Date()); }
    catch (e) { return new Date().toISOString().slice(0, 10); }
  }

  /** Parse 'HH:MM:SS' → total minutes from midnight */
  function timeToMins(t) {
    if (!t) return 0;
    var p = String(t).split(':');
    return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
  }

  /** minutes from midnight → 'HH:MM' */
  function minsToTime(m) {
    var h = Math.floor(m / 60) % 24;
    var min = m % 60;
    return (h < 10 ? '0' : '') + h + ':' + (min < 10 ? '0' : '') + min;
  }

  /** Format a slot time for display, e.g. '18:30' */
  function fmtSlot(mins) {
    var h = Math.floor(mins / 60) % 24;
    var m = mins % 60;
    var ampm = h >= 12 ? 'pm' : 'am';
    var h12 = h % 12 || 12;
    return h12 + (m ? ':' + (m < 10 ? '0' : '') + m : '') + ampm;
  }

  /** Given a date string (YYYY-MM-DD) and HH:MM slot in restaurant TZ,
   *  return UTC ISO string. */
  function slotToUtc(dateStr, hhmm, tz) {
    // Same trick as reservations.js buildStartsAt
    var localIso = dateStr + 'T' + hhmm + ':00';
    try {
      var dtf = new Intl.DateTimeFormat('en-GB', {
        timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
      });
      var d = new Date(localIso + 'Z');
      var parts = dtf.formatToParts(d);
      var p = {};
      parts.forEach(function (x) { p[x.type] = x.value; });
      var tzIso = p.year + '-' + p.month + '-' + p.day + 'T' + p.hour + ':' + p.minute + ':' + p.second;
      var diff = new Date(localIso).getTime() - new Date(tzIso).getTime();
      return new Date(d.getTime() + diff).toISOString();
    } catch (e) {
      return new Date(localIso).toISOString();
    }
  }

  /** Convert UTC ISO to minutes-from-midnight in restaurant TZ */
  function utcToLocalMins(isoStr, tz) {
    if (!isoStr) return 0;
    try {
      var dtf = new Intl.DateTimeFormat('en-GB', {
        timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false,
      });
      var parts = dtf.formatToParts(new Date(isoStr));
      var h = 0, m = 0;
      parts.forEach(function (p) { if (p.type === 'hour') h = parseInt(p.value, 10); if (p.type === 'minute') m = parseInt(p.value, 10); });
      return h * 60 + m;
    } catch (e) {
      var d = new Date(isoStr);
      return d.getUTCHours() * 60 + d.getUTCMinutes();
    }
  }

  /** Conflict check: does newRes (table_id, starts_at, end_at) overlap existing? */
  function hasConflict(newRes, existingList, bufferMinutes) {
    var buf = (bufferMinutes || 0) * 60000;
    var nS  = new Date(newRes.starts_at).getTime();
    var nE  = new Date(newRes.end_at).getTime();
    return existingList.some(function (r) {
      if (!r.table_id || r.table_id !== newRes.table_id) return false;
      if (r.id && newRes.id && r.id === newRes.id) return false;
      if (['cancelled', 'no_show', 'completed'].includes(r.status)) return false;
      var rS = new Date(r.starts_at).getTime();
      var rE = new Date(r.end_at).getTime();
      return nS < (rE + buf) && (nE + buf) > rS;
    });
  }

  /* ------------------------------------------------------------------ */
  /* MODULE STATE                                                         */
  /* ------------------------------------------------------------------ */
  var _date      = null;
  var _res       = [];
  var _tables    = [];
  var _rooms     = [];
  var _periods   = [];
  var _sectionEl = null;
  var _rtChannel = null;

  // Drag state
  var _drag = {
    resId:       null,
    origTableId: null,
    origStartAt: null,
    origEndAt:   null,
    turnMs:      0,
  };

  /* ------------------------------------------------------------------ */
  /* SECTION RENDER                                                       */
  /* ------------------------------------------------------------------ */
  function render(sectionEl) {
    _sectionEl = sectionEl;
    var rest = window.COV.state.restaurant;
    if (!rest) {
      sectionEl.innerHTML = '<p style="padding:24px;color:var(--color-destructive)">No restaurant loaded.</p>';
      return;
    }
    if (!_date) _date = getTodayLocal(rest.timezone);

    sectionEl.innerHTML =
      '<div class="tl-bar" id="tl-bar">' +
        '<button class="tl-nav-btn" id="tl-prev" aria-label="Previous day">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>' +
        '</button>' +
        '<input type="date" id="tl-date-input" class="tl-date-picker" value="' + esc(_date) + '" aria-label="Select date for timeline">' +
        '<button class="tl-nav-btn" id="tl-next" aria-label="Next day">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>' +
        '</button>' +
        '<button class="quick-btn quick-btn-primary" id="tl-add-btn" aria-label="Add reservation" style="min-height:40px;font-size:13px;padding:0 14px;margin-left:auto">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
          'Add Reservation' +
        '</button>' +
      '</div>' +
      '<div id="tl-grid-wrap"></div>' +
      '<div class="tl-legend" aria-label="Legend" id="tl-legend">' +
        legendItem('booked',    '#FEF7EB',  'Booked') +
        legendItem('confirmed', '#EBF4FF',  'Confirmed') +
        legendItem('seated',    '#FBF0EB',  'Seated') +
        legendItem('completed', '#E8F5EF',  'Completed') +
        legendItem('no_show',   '#FDEDEB',  'No-show') +
        '<div class="tl-legend-item"><div class="tl-legend-dot" style="background:repeating-linear-gradient(45deg,#F5F3F0 0 4px,#E4E0DA 4px 6px)" aria-hidden="true"></div>Blocked</div>' +
      '</div>';

    document.getElementById('tl-date-input').addEventListener('change', function (e) {
      _date = e.target.value;
      loadTimeline();
    });
    document.getElementById('tl-prev').addEventListener('click', function () {
      var d = new Date(_date + 'T12:00:00Z');
      d.setUTCDate(d.getUTCDate() - 1);
      _date = d.toISOString().slice(0, 10);
      document.getElementById('tl-date-input').value = _date;
      loadTimeline();
    });
    document.getElementById('tl-next').addEventListener('click', function () {
      var d = new Date(_date + 'T12:00:00Z');
      d.setUTCDate(d.getUTCDate() + 1);
      _date = d.toISOString().slice(0, 10);
      document.getElementById('tl-date-input').value = _date;
      loadTimeline();
    });
    document.getElementById('tl-add-btn').addEventListener('click', function () {
      if (window.COV.resEditor) window.COV.resEditor.open(null, { date: _date, source: 'host' });
    });

    // wire realtime
    var rest2 = window.COV.state.restaurant;
    if (_rtChannel) { data.realtime.removeChannel(_rtChannel); }
    _rtChannel = data.realtime.subscribeReservations(rest2.id, function () { loadTimeline(); });

    loadTimeline();
  }

  function legendItem(cls, color, label) {
    return '<div class="tl-legend-item"><div class="tl-legend-dot" style="background:' + color + ';border:1px solid rgba(0,0,0,.1)" aria-hidden="true"></div>' + esc(label) + '</div>';
  }

  async function loadTimeline() {
    var rest = window.COV.state.restaurant;
    if (!rest || !_date) return;
    var wrap = document.getElementById('tl-grid-wrap');
    if (!wrap) return;

    wrap.innerHTML = '<div style="padding:24px;text-align:center" role="status" aria-label="Loading timeline">' +
      '<div class="skel-text" style="width:90%;margin:0 auto 12px" aria-hidden="true"></div>' +
      '<div class="skel-text" style="width:75%;margin:0 auto" aria-hidden="true"></div>' +
      '</div>';

    try {
      var results = await Promise.all([
        data.reservations.listByDate(rest.id, _date),
        data.tables.list(rest.id),
        data.rooms.list(rest.id),
        data.servicePeriods.list(rest.id),
      ]);
      _res     = results[0] || [];
      _tables  = results[1] || [];
      _rooms   = results[2] || [];
      _periods = results[3] || [];
      renderGrid(wrap, rest);
    } catch (e) {
      wrap.innerHTML = '<div style="padding:24px;text-align:center;color:var(--color-destructive)">' +
        'Failed to load timeline. <button onclick="window.COV.screens.timeline._reload()" style="color:var(--color-primary);background:none;border:none;cursor:pointer;text-decoration:underline">Retry</button></div>';
    }
  }

  function renderGrid(wrap, rest) {
    var tz = rest.timezone || 'UTC';
    var activeTables = _tables.filter(function (t) { return t.is_active; });

    if (!activeTables.length) {
      wrap.innerHTML = '<div style="padding:40px;text-align:center;color:var(--color-text-muted);background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-lg)">' +
        '<p style="font-size:15px;font-weight:500;margin-bottom:8px">No tables set up</p>' +
        '<p style="font-size:13px">Add tables in the Floor Editor to see the timeline.</p>' +
        '</div>';
      return;
    }

    // Determine time range from service periods (fall back to 17:00–22:00)
    var slotInterval = 30;
    var periodStart  = 17 * 60; // 17:00
    var periodEnd    = 22 * 60; // 22:00

    // Find periods active on this weekday
    var dow = new Date(_date + 'T12:00:00Z').getUTCDay();
    var activePeriods = _periods.filter(function (p) {
      return p.days_of_week && p.days_of_week.includes(dow);
    });
    if (activePeriods.length) {
      var allStarts = activePeriods.map(function (p) { return timeToMins(p.start_time); });
      var allEnds   = activePeriods.map(function (p) {
        var last = timeToMins(p.last_seating_time || p.end_time);
        var turn = rest.default_turn_minutes || 90;
        return last + turn;
      });
      periodStart  = Math.min.apply(null, allStarts);
      periodEnd    = Math.max.apply(null, allEnds);
      slotInterval = activePeriods[0].slot_interval_minutes || 30;
    }

    // Clamp to reasonable range
    periodStart = Math.max(0, periodStart);
    periodEnd   = Math.min(24 * 60, periodEnd);

    // Build slot array
    var slots = [];
    for (var t = periodStart; t < periodEnd; t += slotInterval) {
      slots.push(t);
    }
    if (!slots.length) slots = [periodStart];

    // Build cell width: 64px min
    var cellW = 64;

    // Group tables by room
    var roomMap = {};
    _rooms.forEach(function (r) { roomMap[r.id] = r; });
    var tableRows = activeTables; // show all active tables as rows

    // Build header row
    var headerCells = '<th class="tl-corner" scope="col">Table</th>' +
      slots.map(function (m) {
        return '<th scope="col" style="width:' + cellW + 'px" aria-label="' + fmtSlot(m) + '">' + fmtSlot(m) + '</th>';
      }).join('');

    // Build data rows
    var bodyRows = tableRows.map(function (tbl) {
      var room = roomMap[tbl.room_id] || {};
      var rowLabel = '<th class="tl-row-label" scope="row">' +
        '<div style="font-weight:600;color:var(--color-text-primary)">' + esc(tbl.label) + '</div>' +
        '<div style="font-size:10px;color:var(--color-text-muted);margin-top:1px">' + esc(room.name || '') + '</div>' +
        '</th>';

      var cells = slots.map(function (slotMins) {
        var slotHHMM = minsToTime(slotMins);
        var slotUtc  = slotToUtc(_date, slotHHMM, tz);
        var nextUtc  = slotToUtc(_date, minsToTime(slotMins + slotInterval), tz);

        // Check if this cell is blocked by any existing reservation on this table
        var isBlocked = _res.some(function (r) {
          if (!r.table_id || r.table_id !== tbl.id) return false;
          if (['cancelled', 'no_show', 'completed'].includes(r.status)) return false;
          var rS = new Date(r.starts_at).getTime();
          var rE = new Date(r.end_at).getTime();
          var sS = new Date(slotUtc).getTime();
          var sE = new Date(nextUtc).getTime();
          return sS < rE && sE > rS;
        });

        var cls = 'tl-cell' + (isBlocked ? ' tl-blocked' : '');
        return '<td class="' + cls + '" ' +
          'data-table="' + esc(tbl.id) + '" ' +
          'data-slot="' + esc(slotUtc) + '" ' +
          (isBlocked ? 'aria-label="Blocked slot"' : 'aria-label="Open slot at ' + fmtSlot(slotMins) + '"') +
          '></td>';
      }).join('');

      return '<tr>' + rowLabel + cells + '</tr>';
    }).join('');

    var totalWidth = 72 + slots.length * cellW;

    wrap.innerHTML =
      '<div class="tl-scroll-wrap" role="region" aria-label="Reservation timeline for ' + esc(_date) + '" tabindex="0">' +
        '<table class="tl-grid" style="min-width:' + totalWidth + 'px" aria-label="Tables vs time grid">' +
          '<thead><tr>' + headerCells + '</tr></thead>' +
          '<tbody id="tl-tbody">' + bodyRows + '</tbody>' +
        '</table>' +
      '</div>';

    // Place reservation blocks
    placeBlocks(wrap, slots, slotInterval, tz, cellW);

    // Wire drag-drop on table cells
    wireDragDrop(wrap, tz, slotInterval, rest);

    // Wire cell click (create reservation at slot)
    wrap.addEventListener('click', function (e) {
      var cell = e.target.closest('.tl-cell:not(.tl-blocked)');
      if (cell && !e.target.closest('.tl-block')) {
        var slot = cell.dataset.slot;
        var tableId = cell.dataset.table;
        var tbl = _tables.find(function (t) { return t.id === tableId; });
        if (slot && window.COV.resEditor) {
          // Derive HH:MM in local TZ for the editor
          var dtf = new Intl.DateTimeFormat('en-GB', {
            timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false,
          });
          var timeStr = dtf.format(new Date(slot));
          window.COV.resEditor.open(null, { date: _date, time: timeStr, source: 'host' });
        }
      }
    });
  }

  function placeBlocks(wrap, slots, slotInterval, tz, cellW) {
    var tbody = document.getElementById('tl-tbody');
    if (!tbody) return;

    _res.forEach(function (r) {
      if (!r.table_id) return;
      var startMins = utcToLocalMins(r.starts_at, tz);
      var endMins   = utcToLocalMins(r.end_at,   tz);
      if (endMins <= startMins) endMins = startMins + (r.turn_minutes || 90);

      // Find column offset
      var firstSlot  = slots[0];
      var slotOffset = startMins - firstSlot; // mins from first slot
      var colIndex   = Math.round(slotOffset / slotInterval);
      if (colIndex < 0 || colIndex >= slots.length) return;

      // Find row
      var row = tbody.querySelector('tr th[scope="row"]');
      var allRows = tbody.querySelectorAll('tr');
      var targetRow = null;
      allRows.forEach(function (tr) {
        var cells = tr.querySelectorAll('td.tl-cell');
        if (cells.length && cells[0].dataset.table === r.table_id) targetRow = tr;
      });
      if (!targetRow) return;

      // Find the target cell
      var targetCell = null;
      var cells = targetRow.querySelectorAll('td.tl-cell');
      if (cells[colIndex]) targetCell = cells[colIndex];
      if (!targetCell) return;

      // Width = duration in cols * cellW
      var durationMins = endMins - startMins;
      var spanCols = Math.max(1, Math.ceil(durationMins / slotInterval));
      var blockWidth = spanCols * cellW - 4;

      var guest = r.cov_guests || {};
      var name  = guest.name || 'Walk-in';
      var table = r.cov_tables || {};
      var tags  = (guest.tags || []);
      var vip   = tags.includes('VIP');

      var block = document.createElement('div');
      block.className = 'tl-block ' + (r.status || 'booked');
      block.style.width = blockWidth + 'px';
      block.style.right = 'auto';
      block.setAttribute('draggable', 'true');
      block.setAttribute('tabindex', '0');
      block.setAttribute('role', 'button');
      block.setAttribute('aria-label', name + ', party of ' + r.party_size + ', ' + r.status);
      block.dataset.resId    = r.id;
      block.dataset.tableId  = r.table_id;
      block.dataset.startsAt = r.starts_at;
      block.dataset.endAt    = r.end_at;
      block.dataset.turn     = r.turn_minutes || 90;

      block.innerHTML =
        '<div class="tl-block-name">' + esc(name) + (vip ? ' ★' : '') + '</div>' +
        '<div class="tl-block-meta">×' + esc(String(r.party_size)) + ' ' + fmtTime(r.starts_at, tz) + '</div>';

      // Click opens editor
      block.addEventListener('click', function (e) {
        e.stopPropagation();
        if (window.COV.resEditor) window.COV.resEditor.open(r.id);
      });
      block.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault(); e.stopPropagation();
          if (window.COV.resEditor) window.COV.resEditor.open(r.id);
        }
      });

      // Drag events
      block.addEventListener('dragstart', function (e) {
        _drag.resId       = r.id;
        _drag.origTableId = r.table_id;
        _drag.origStartAt = r.starts_at;
        _drag.origEndAt   = r.end_at;
        _drag.turnMs      = (r.turn_minutes || 90) * 60000;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', r.id);
        block.classList.add('dragging');
      });
      block.addEventListener('dragend', function () {
        block.classList.remove('dragging');
        clearDropHighlights();
      });

      targetCell.style.position = 'relative';
      targetCell.appendChild(block);
    });
  }

  /* ------------------------------------------------------------------ */
  /* DRAG & DROP                                                          */
  /* ------------------------------------------------------------------ */
  function wireDragDrop(wrap, tz, slotInterval, rest) {
    var cells = wrap.querySelectorAll('td.tl-cell');
    cells.forEach(function (cell) {
      cell.addEventListener('dragover', function (e) {
        e.preventDefault();
        if (!_drag.resId) return;
        clearDropHighlights();

        var targetTableId = cell.dataset.table;
        var targetSlotUtc = cell.dataset.slot;
        if (!targetTableId || !targetSlotUtc) return;

        var newEndUtc = new Date(new Date(targetSlotUtc).getTime() + _drag.turnMs).toISOString();
        var probe = {
          table_id:  targetTableId,
          starts_at: targetSlotUtc,
          end_at:    newEndUtc,
          id:        _drag.resId,
        };
        var conflict = hasConflict(probe, _res, rest.buffer_minutes || 15);
        cell.classList.add(conflict ? 'drop-target-err' : 'drop-target-ok');
        e.dataTransfer.dropEffect = conflict ? 'none' : 'move';
      });

      cell.addEventListener('dragleave', function () {
        cell.classList.remove('drop-target-ok', 'drop-target-err');
      });

      cell.addEventListener('drop', function (e) {
        e.preventDefault();
        clearDropHighlights();
        if (!_drag.resId) return;

        var targetTableId = cell.dataset.table;
        var targetSlotUtc = cell.dataset.slot;
        if (!targetTableId || !targetSlotUtc) return;

        var newEndUtc = new Date(new Date(targetSlotUtc).getTime() + _drag.turnMs).toISOString();
        var probe = {
          table_id:  targetTableId,
          starts_at: targetSlotUtc,
          end_at:    newEndUtc,
          id:        _drag.resId,
        };
        var conflict = hasConflict(probe, _res, rest.buffer_minutes || 15);
        if (conflict) {
          toast('Cannot move here — time/table conflict. Snapping back.', 'warn');
          _drag.resId = null;
          return;
        }

        // Optimistically commit
        var resId = _drag.resId;
        _drag.resId = null;
        data.reservations.update(resId, {
          table_id:  targetTableId,
          starts_at: targetSlotUtc,
          end_at:    newEndUtc,
        }).then(function () {
          toast('Reservation moved.', 'ok');
          loadTimeline();
          if (window.COV.screens.reservations && window.COV.screens.reservations._reload &&
              window.COV.state.section === 'reservations') {
            window.COV.screens.reservations._reload();
          }
        }).catch(function (e) {
          toast('Move failed — conflict on server. Snapping back.', 'err');
          loadTimeline();
        });
      });
    });
  }

  function clearDropHighlights() {
    var cells = document.querySelectorAll('.tl-cell');
    cells.forEach(function (c) { c.classList.remove('drop-target-ok', 'drop-target-err'); });
  }

  /* ------------------------------------------------------------------ */
  /* EXPORTS                                                              */
  /* ------------------------------------------------------------------ */
  window.COV = window.COV || {};
  window.COV.screens = window.COV.screens || {};
  window.COV.screens.timeline = {
    render:  render,
    _reload: loadTimeline,
  };

}());
