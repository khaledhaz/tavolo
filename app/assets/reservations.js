/* ============================================================================
   Coverly — Reservations screen + shared resEditor
   Registers:
     window.COV.screens.reservations = { render(sectionEl) }
     window.COV.resEditor             = { open(reservationId|null, defaults) }
   ============================================================================ */
(function () {
  'use strict';

  var data  = window.COV.data;
  var utils = window.COV.utils;
  var esc   = utils.esc;
  var toast = utils.toast;
  var fmtTime = utils.formatTime;

  /* ------------------------------------------------------------------ */
  /* CSS — injected once                                                  */
  /* ------------------------------------------------------------------ */
  var CSS = `
/* ===== RESERVATIONS SCREEN ===== */

/* Override the global amber badge-booked with blue so it's distinct from the
   amber time text in the same row. Confirmed stays green-ish (badge-confirmed). */
.badge-booked {
  background: #dbeafe !important;
  color: #1e40af !important;
  border-color: rgba(30,64,175,.25) !important;
}

.res-screen-bar {
  display: flex; align-items: center; gap: 12px;
  margin-bottom: 20px; flex-wrap: wrap;
}
.res-date-picker {
  min-height: 40px; padding: 0 12px; border: 1px solid var(--color-border);
  border-radius: var(--radius-md); font-size: 14px; background: var(--color-surface);
  color: var(--color-text-primary); cursor: pointer;
}
.res-date-picker:focus { outline: none; border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-light); }
.res-screen-actions { margin-left: auto; display: flex; gap: 8px; flex-wrap: wrap; }

/* list */
.res-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.res-table { width: 100%; border-collapse: collapse; min-width: 560px; }
.res-table th {
  text-align: left; font-size: 11px; font-weight: 600; letter-spacing: .07em;
  text-transform: uppercase; color: var(--color-text-muted);
  padding: 10px 12px; border-bottom: 2px solid var(--color-border);
  white-space: nowrap;
}
.res-table td {
  padding: 10px 12px; border-bottom: 1px solid var(--color-border);
  font-size: 14px; vertical-align: middle; min-width: 0;
}
.res-table tr:last-child td { border-bottom: none; }
.res-table tbody tr { cursor: pointer; transition: background var(--duration-fast); }
.res-table tbody tr:hover { background: var(--color-surface-raised); }
.res-table tbody tr:focus-within { background: var(--color-primary-light); }
.res-row-time { font-weight: 600; color: var(--color-primary); white-space: nowrap; font-variant-numeric: tabular-nums; }
.res-row-name { font-weight: 500; display: flex; align-items: center; gap: 6px; min-width: 0; }
.res-row-name span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.res-row-tags { display: flex; gap: 4px; flex-wrap: wrap; }
.res-row-tag { font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: var(--radius-full); background: var(--color-accent-light); color: var(--color-accent-hover); }
.res-row-tag.vip { background: #fdf2ff; color: #7c3aed; }
.res-row-tag.allergy { background: var(--color-destructive-light); color: var(--color-destructive); }

/* status action buttons */
.res-actions-cell { display: flex; gap: 6px; flex-wrap: wrap; align-items: flex-start; }
.res-act-btn {
  font-size: 12px; font-weight: 500; padding: 4px 10px; border-radius: var(--radius-full);
  border: 1px solid var(--color-border); background: var(--color-surface);
  cursor: pointer; transition: background var(--duration-fast), color var(--duration-fast);
  white-space: nowrap; min-height: 36px;
}
.res-act-btn:hover { background: var(--color-surface-raised); }
.res-act-btn.confirm  { border-color: var(--color-info); color: var(--color-info); }
.res-act-btn.seat     { border-color: var(--color-primary); color: var(--color-primary); }
.res-act-btn.complete { border-color: var(--color-success); color: var(--color-success); }
.res-act-btn.noshow   { border-color: var(--color-warning); color: var(--color-warning); }
.res-act-btn.cancel   { border-color: var(--color-destructive); color: var(--color-destructive); }
.res-act-btn.edit     { border-color: var(--color-border-strong); color: var(--color-text-secondary); }

/* ===== RES EDITOR MODAL ===== */
.re-overlay {
  position: fixed; inset: 0; background: var(--color-overlay); z-index: 600;
  display: none; align-items: center; justify-content: center; padding: 20px;
}
.re-overlay.open { display: flex; }
.re-modal {
  background: var(--color-surface); border-radius: var(--radius-xl);
  width: 100%; max-width: 520px; max-height: 92vh; overflow-y: auto;
  box-shadow: var(--shadow-xl);
  animation: re-in .2s var(--easing-decelerate) both;
}
@keyframes re-in { from { opacity: 0; transform: scale(.96) translateY(8px) } to { opacity: 1; transform: scale(1) translateY(0) } }
.re-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 24px 24px 0; position: sticky; top: 0; background: var(--color-surface);
  z-index: 1;
}
.re-title { font-size: 20px; font-weight: 600; letter-spacing: -.01em; }
.re-close {
  width: 36px; height: 36px; border-radius: var(--radius-sm); border: 1px solid var(--color-border);
  display: flex; align-items: center; justify-content: center; cursor: pointer;
  color: var(--color-text-secondary); background: none; flex-shrink: 0;
  transition: background var(--duration-fast), color var(--duration-fast);
}
.re-close:hover { background: var(--color-surface-raised); color: var(--color-text-primary); }
.re-body { padding: 20px 24px 24px; }
.re-section { margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid var(--color-border); }
.re-section:last-child { margin-bottom: 0; padding-bottom: 0; border-bottom: none; }
.re-section-label {
  font-size: 11px; font-weight: 600; letter-spacing: .07em; text-transform: uppercase;
  color: var(--color-text-muted); margin-bottom: 12px;
}
.re-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.re-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
.re-field:last-child { margin-bottom: 0; }
.re-label { font-size: 13px; font-weight: 500; color: var(--color-text-secondary); }
.re-input, .re-select, .re-textarea {
  min-height: 44px; padding: 10px 12px; border: 1px solid var(--color-border);
  border-radius: var(--radius-md); font-size: 14px; background: var(--color-surface);
  color: var(--color-text-primary); width: 100%;
  transition: border-color var(--duration-fast);
}
.re-input:focus, .re-select:focus, .re-textarea:focus {
  outline: none; border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-light);
}
.re-textarea { min-height: 72px; resize: vertical; }
.re-input::placeholder { color: var(--color-text-muted); }
.re-guest-found {
  background: var(--color-success-light); border: 1px solid var(--color-success);
  border-radius: var(--radius-md); padding: 10px 12px; font-size: 13px;
  color: var(--color-success); margin-top: 8px; display: none;
}
.re-guest-tags { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 6px; }
.re-guest-tag { font-size: 11px; font-weight: 600; padding: 2px 7px; border-radius: var(--radius-full); }
.re-suggest {
  background: var(--color-primary-light); border: 1px solid rgba(196,82,42,.25);
  border-radius: var(--radius-sm); padding: 8px 12px; font-size: 13px;
  color: var(--color-primary); margin-top: 4px; display: none;
}
.re-conflict-warn {
  background: var(--color-destructive-light); border: 1px solid var(--color-destructive);
  border-radius: var(--radius-md); padding: 10px 12px; font-size: 13px;
  color: var(--color-destructive); margin-top: 8px; display: none;
}
.re-foot {
  display: flex; gap: 10px; padding: 16px 24px 20px;
  border-top: 1px solid var(--color-border); background: var(--color-surface);
  position: sticky; bottom: 0;
}
.re-save-btn {
  flex: 1; min-height: 44px; border-radius: var(--radius-md);
  background: var(--color-primary); color: #fff; font-size: 15px; font-weight: 500;
  border: none; cursor: pointer; transition: background var(--duration-fast);
}
.re-save-btn:hover { background: var(--color-primary-hover); }
.re-save-btn:disabled { opacity: .55; cursor: not-allowed; }
.re-cancel-btn {
  min-height: 44px; padding: 0 20px; border-radius: var(--radius-md);
  border: 1px solid var(--color-border); background: var(--color-surface);
  font-size: 15px; font-weight: 500; cursor: pointer;
  transition: background var(--duration-fast);
}
.re-cancel-btn:hover { background: var(--color-surface-raised); }

@media (max-width: 599px) {
  .re-overlay { padding: 0; align-items: flex-end; }
  .re-modal { border-radius: var(--radius-xl) var(--radius-xl) 0 0; max-height: 95vh; max-width: 100%; }
  .re-row { grid-template-columns: 1fr; }
  .res-screen-bar { gap: 8px; }
  .res-screen-actions { margin-left: 0; width: 100%; }

  /* Responsive reservation rows: collapse table to cards so action buttons
     have full width to wrap horizontally instead of stacking in a narrow column */
  .res-table, .res-table thead, .res-table tbody,
  .res-table th, .res-table td, .res-table tr {
    display: block;
  }
  .res-table thead tr {
    position: absolute; left: -9999px; top: -9999px; /* visually hide, accessible via aria-label on td */
  }
  .res-table tbody tr {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    margin-bottom: 10px;
    padding: 10px 12px;
    background: var(--color-surface);
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    align-items: center;
  }
  .res-table tbody tr:hover { background: var(--color-surface-raised); }
  .res-table td {
    border: none;
    padding: 2px 0;
    font-size: 14px;
  }
  /* Time gets emphasis */
  .res-table td:first-child { flex: 0 0 auto; }
  /* Guest name */
  .res-table td:nth-child(2) { flex: 1 1 120px; min-width: 0; }
  /* Party — compact */
  .res-table td:nth-child(3) { flex: 0 0 auto; font-size: 13px; color: var(--color-text-muted); }
  .res-table td:nth-child(3)::before { content: 'Party: '; }
  /* Table label */
  .res-table td:nth-child(4) { flex: 0 0 auto; font-size: 13px; color: var(--color-text-muted); }
  /* Status badge */
  .res-table td:nth-child(5) { flex: 0 0 auto; }
  /* Actions — full row, wrapping */
  .res-table td:last-child {
    flex: 1 1 100%;
    margin-top: 6px;
    padding-top: 8px;
    border-top: 1px solid var(--color-border);
  }
  .res-actions-cell { flex-wrap: wrap; gap: 6px; }
  .res-act-btn { min-height: 36px; }
}
`;

  (function injectCSS() {
    if (document.getElementById('cov-res-css')) return;
    var s = document.createElement('style');
    s.id = 'cov-res-css';
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

  /** isoDate = 'YYYY-MM-DD', return { startUtc, endUtc } wide window */
  function dayWindow(isoDate) {
    return {
      startUtc: isoDate + 'T00:00:00.000Z',
      endUtc:   isoDate + 'T23:59:59.999Z',
    };
  }

  /** status → allowed next transitions */
  var STATUS_TRANSITIONS = {
    booked:    ['confirm', 'seat', 'cancel', 'noshow'],
    confirmed: ['seat', 'cancel', 'noshow'],
    seated:    ['complete', 'noshow'],
    completed: [],
    no_show:   [],
    cancelled: [],
  };
  var STATUS_LABELS = {
    booked: 'Booked', confirmed: 'Confirmed', seated: 'Seated',
    completed: 'Completed', no_show: 'No-show', cancelled: 'Cancelled',
  };
  var ACTION_TO_STATUS = {
    confirm: 'confirmed', seat: 'seated', complete: 'completed',
    noshow: 'no_show', cancel: 'cancelled',
  };
  var ACTION_LABELS = {
    confirm: 'Confirm', seat: 'Seat', complete: 'Complete', noshow: 'No-show', cancel: 'Cancel',
  };

  /** Build badge HTML for a reservation status */
  function statusBadge(status) {
    var cls = {
      booked: 'badge-booked', confirmed: 'badge-confirmed', seated: 'badge-seated',
      completed: 'badge-completed', no_show: 'badge-no_show', cancelled: 'badge-cancelled',
    }[status] || 'badge-neutral';
    return '<span class="badge ' + cls + '">' + esc(STATUS_LABELS[status] || status) + '</span>';
  }

  /** Render guest tags as chips */
  function renderTagChips(tags) {
    if (!tags || !tags.length) return '';
    return tags.map(function (t) {
      var cls = 're-guest-tag ';
      if (t === 'VIP') cls += 'badge-accent';
      else if (t.startsWith('allergy')) cls += 'badge-danger';
      else cls += 'badge-neutral';
      return '<span class="' + cls + '">' + esc(t) + '</span>';
    }).join('');
  }

  /** Conflict check: does newRes overlap any existing reservation on same table?
   *  newRes = { table_id, starts_at ISO, end_at ISO, id? (exclude self) }
   *  existingList = array of reservation rows from listByDate
   */
  function hasConflict(newRes, existingList, bufferMinutes) {
    var buf = (bufferMinutes || 0) * 60000;
    var newStart = new Date(newRes.starts_at).getTime();
    var newEnd   = new Date(newRes.end_at).getTime();
    return existingList.some(function (r) {
      if (!r.table_id || r.table_id !== newRes.table_id) return false;
      if (r.id && newRes.id && r.id === newRes.id) return false;
      if (['cancelled', 'no_show', 'completed'].includes(r.status)) return false;
      var rStart = new Date(r.starts_at).getTime();
      var rEnd   = new Date(r.end_at).getTime();
      // overlap: [newStart, newEnd+buf) vs [rStart, rEnd+buf)
      return newStart < (rEnd + buf) && (newEnd + buf) > rStart;
    });
  }

  /** Find a free table for party on a given date/time */
  function suggestTable(allTables, existingList, startsAt, turnMinutes, partySize, bufferMinutes, excludeResId) {
    var endAt = new Date(new Date(startsAt).getTime() + (turnMinutes || 90) * 60000).toISOString();
    var probe = { starts_at: startsAt, end_at: endAt, id: excludeResId };
    var sorted = allTables
      .filter(function (t) { return t.is_active && t.seats_max >= partySize && t.seats_min <= partySize; })
      .sort(function (a, b) { return a.seats_max - b.seats_max; }); // smallest fitting first
    for (var i = 0; i < sorted.length; i++) {
      probe.table_id = sorted[i].id;
      if (!hasConflict(probe, existingList, bufferMinutes)) return sorted[i];
    }
    // no exact fit — try tables where party fits even if above min
    var relaxed = allTables
      .filter(function (t) { return t.is_active && t.seats_max >= partySize; })
      .sort(function (a, b) { return a.seats_max - b.seats_max; });
    for (var j = 0; j < relaxed.length; j++) {
      probe.table_id = relaxed[j].id;
      if (!hasConflict(probe, existingList, bufferMinutes)) return relaxed[j];
    }
    return null;
  }

  /* ------------------------------------------------------------------ */
  /* MODULE STATE                                                         */
  /* ------------------------------------------------------------------ */
  var _date    = null;   // currently displayed date (YYYY-MM-DD)
  var _res     = [];     // reservations for _date
  var _tables  = [];     // all tables for restaurant
  var _rooms   = [];     // all rooms
  var _sectionEl = null;
  var _rtChannel = null;

  /* ------------------------------------------------------------------ */
  /* SECTION RENDER                                                       */
  /* ------------------------------------------------------------------ */
  function render(sectionEl) {
    _sectionEl = sectionEl;
    var rest = window.COV.state.restaurant;
    if (!rest) { sectionEl.innerHTML = '<p style="padding:24px;color:var(--color-destructive)">No restaurant loaded.</p>'; return; }

    if (!_date) _date = getTodayLocal(rest.timezone);

    sectionEl.innerHTML =
      '<div class="res-screen-bar" id="res-bar">' +
        '<label for="res-date-input" style="font-size:13px;font-weight:500;color:var(--color-text-secondary)">Date</label>' +
        '<input type="date" id="res-date-input" class="res-date-picker" value="' + esc(_date) + '" aria-label="Select date to view reservations">' +
        '<div class="res-screen-actions">' +
          '<button class="quick-btn quick-btn-primary" id="res-walkin-btn" aria-label="Add walk-in" style="min-height:40px;font-size:13px;padding:0 14px">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>' +
            'Walk-in' +
          '</button>' +
          '<button class="quick-btn quick-btn-secondary" id="res-add-btn" aria-label="Add reservation" style="min-height:40px;font-size:13px;padding:0 14px">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
            'Add Reservation' +
          '</button>' +
        '</div>' +
      '</div>' +
      '<div class="panel" style="overflow:hidden">' +
        '<div id="res-list-body" class="res-table-wrap" role="status" aria-live="polite" aria-label="Reservations list">' +
          renderSkeleton() +
        '</div>' +
      '</div>';

    document.getElementById('res-date-input').addEventListener('change', function (e) {
      _date = e.target.value;
      loadList();
    });
    document.getElementById('res-add-btn').addEventListener('click', function () {
      window.COV.resEditor.open(null, { date: _date, source: 'host' });
    });
    document.getElementById('res-walkin-btn').addEventListener('click', function () {
      window.COV.resEditor.open(null, { date: _date, source: 'walkin', status: 'seated' });
    });

    // wire realtime
    if (_rtChannel) { data.realtime.removeChannel(_rtChannel); }
    _rtChannel = data.realtime.subscribeReservations(rest.id, function () { loadList(); });

    loadList();
  }

  function renderSkeleton() {
    return '<div style="padding:20px">' +
      '<div class="skel-text" style="width:60%;margin-bottom:12px" aria-hidden="true"></div>' +
      '<div class="skel-text" style="width:80%;margin-bottom:12px" aria-hidden="true"></div>' +
      '<div class="skel-text" style="width:70%" aria-hidden="true"></div>' +
      '</div>';
  }

  async function loadList() {
    var rest = window.COV.state.restaurant;
    if (!rest || !_date) return;
    var body = document.getElementById('res-list-body');
    if (!body) return;

    try {
      var results = await Promise.all([
        data.reservations.listByDate(rest.id, _date),
        data.tables.list(rest.id),
        data.rooms.list(rest.id),
      ]);
      _res    = results[0] || [];
      _tables = results[1] || [];
      _rooms  = results[2] || [];
      renderList(body, _res, rest.timezone, rest);
    } catch (e) {
      body.innerHTML = '<div style="padding:20px;text-align:center;color:var(--color-destructive)">' +
        'Failed to load reservations. <button onclick="window.COV.screens.reservations._reload()" style="color:var(--color-primary);background:none;border:none;cursor:pointer;text-decoration:underline">Retry</button></div>';
    }
  }

  function renderList(container, list, tz, rest) {
    if (!list.length) {
      container.innerHTML = '<div class="panel-empty" style="padding:40px 20px;text-align:center">' +
        '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' +
        '<p style="font-size:15px;font-weight:500;color:var(--color-text-secondary);margin:12px 0 4px">No reservations</p>' +
        '<span style="font-size:13px;color:var(--color-text-muted)">No active reservations for this date.</span></div>';
      return;
    }

    var rows = list.map(function (r) {
      var guest  = r.cov_guests || {};
      var table  = r.cov_tables || {};
      var name   = guest.name || 'Walk-in';
      var time   = fmtTime(r.starts_at, tz);
      var tags   = (guest.tags || []).slice(0, 3);
      var transitions = STATUS_TRANSITIONS[r.status] || [];

      var tagHtml = tags.map(function (t) {
        var cls = t === 'VIP' ? 'vip' : (t.startsWith('allergy') ? 'allergy' : '');
        return '<span class="res-row-tag ' + cls + '">' + esc(t) + '</span>';
      }).join('');

      var actionHtml = transitions.map(function (act) {
        return '<button class="res-act-btn ' + act + '" data-id="' + esc(r.id) + '" data-action="' + esc(act) + '" aria-label="' + esc(ACTION_LABELS[act]) + ' reservation for ' + esc(name) + '">' +
          esc(ACTION_LABELS[act]) +
          '</button>';
      }).join('');

      var editBtn = '<button class="res-act-btn edit" data-id="' + esc(r.id) + '" data-action="edit" aria-label="Edit reservation for ' + esc(name) + '">Edit</button>';

      return '<tr tabindex="0" data-id="' + esc(r.id) + '" aria-label="' + esc(name) + ' at ' + esc(time) + '">' +
        '<td class="res-row-time">' + esc(time) + '</td>' +
        '<td>' +
          '<div class="res-row-name"><span>' + esc(name) + '</span></div>' +
          (tagHtml ? '<div class="res-row-tags">' + tagHtml + '</div>' : '') +
        '</td>' +
        '<td>' + esc(String(r.party_size)) + '</td>' +
        '<td>' + esc(table.label || '—') + '</td>' +
        '<td>' + statusBadge(r.status) + '</td>' +
        '<td><div class="res-actions-cell">' + editBtn + actionHtml + '</div></td>' +
        '</tr>';
    }).join('');

    container.innerHTML =
      '<table class="res-table" aria-label="Reservations for ' + esc(_date) + '">' +
        '<thead><tr>' +
          '<th scope="col">Time</th>' +
          '<th scope="col">Guest</th>' +
          '<th scope="col">Party</th>' +
          '<th scope="col">Table</th>' +
          '<th scope="col">Status</th>' +
          '<th scope="col">Actions</th>' +
        '</tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table>';

    // Event delegation
    container.addEventListener('click', handleListClick);
    container.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        var row = e.target.closest('tr[data-id]');
        if (row && e.target === row) { e.preventDefault(); window.COV.resEditor.open(row.dataset.id); }
      }
    });
  }

  function handleListClick(e) {
    var btn = e.target.closest('[data-action]');
    if (btn) {
      e.stopPropagation();
      var id     = btn.dataset.id;
      var action = btn.dataset.action;
      if (action === 'edit') { window.COV.resEditor.open(id); return; }
      doStatusAction(id, action);
      return;
    }
    var row = e.target.closest('tr[data-id]');
    if (row) { window.COV.resEditor.open(row.dataset.id); }
  }

  async function doStatusAction(id, action) {
    var newStatus = ACTION_TO_STATUS[action];
    if (!newStatus) return;
    if (action === 'cancel' && !(await window.PLAT.confirmDialog('Cancel this reservation?', { danger: true }))) return;
    if (action === 'noshow' && !(await window.PLAT.confirmDialog('Mark as no-show?', { danger: true }))) return;
    try {
      await data.reservations.updateStatus(id, newStatus);
      toast('Status updated to ' + STATUS_LABELS[newStatus], 'ok');
      loadList();
    } catch (e) {
      toast('Failed to update status.', 'err');
    }
  }

  /* ------------------------------------------------------------------ */
  /* RESERVATION EDITOR MODAL                                            */
  /* ------------------------------------------------------------------ */
  var _editorOverlay = null;
  var _editing = null;      // reservation id being edited, or null for create
  var _edDefaults = {};     // defaults passed in
  var _edGuest = null;      // found guest object
  var _edAllRes = [];       // all reservations for date (for conflict check)
  var _edTables = [];       // all tables
  var _edRooms  = [];       // all rooms
  var _edPeriods = [];      // service periods
  var _phoneDebounce = null;

  function buildEditorDOM() {
    if (document.getElementById('cov-re-overlay')) return;
    var div = document.createElement('div');
    div.id = 'cov-re-overlay';
    div.className = 're-overlay';
    div.setAttribute('role', 'dialog');
    div.setAttribute('aria-modal', 'true');
    div.setAttribute('aria-labelledby', 're-title');
    div.innerHTML =
      '<div class="re-modal" id="re-modal">' +
        '<div class="re-head">' +
          '<h2 class="re-title" id="re-title">Reservation</h2>' +
          '<button class="re-close" id="re-close-btn" aria-label="Close editor">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
          '</button>' +
        '</div>' +
        '<div class="re-body" id="re-body">' +
          /* Guest section */
          '<div class="re-section" id="re-sect-guest">' +
            '<div class="re-section-label">Guest</div>' +
            '<div class="re-field">' +
              '<label class="re-label" for="re-phone">Phone number</label>' +
              '<input id="re-phone" class="re-input" type="tel" placeholder="+1 555 000 0000" autocomplete="tel" aria-describedby="re-phone-hint">' +
              '<span id="re-phone-hint" style="font-size:12px;color:var(--color-text-muted)">Enter phone to find or create guest</span>' +
              '<div id="re-guest-found" class="re-guest-found" aria-live="polite" role="status"></div>' +
            '</div>' +
            '<div class="re-row">' +
              '<div class="re-field">' +
                '<label class="re-label" for="re-name">Guest name</label>' +
                '<input id="re-name" class="re-input" type="text" placeholder="Full name" autocomplete="name">' +
              '</div>' +
              '<div class="re-field">' +
                '<label class="re-label" for="re-email">Email (optional)</label>' +
                '<input id="re-email" class="re-input" type="email" placeholder="guest@example.com" autocomplete="email">' +
              '</div>' +
            '</div>' +
          '</div>' +
          /* Booking details */
          '<div class="re-section" id="re-sect-booking">' +
            '<div class="re-section-label">Booking Details</div>' +
            '<div class="re-row">' +
              '<div class="re-field">' +
                '<label class="re-label" for="re-date">Date</label>' +
                '<input id="re-date" class="re-input" type="date" required>' +
              '</div>' +
              '<div class="re-field">' +
                '<label class="re-label" for="re-time">Time</label>' +
                '<input id="re-time" class="re-input" type="time" required>' +
              '</div>' +
            '</div>' +
            '<div class="re-row">' +
              '<div class="re-field">' +
                '<label class="re-label" for="re-party">Party size</label>' +
                '<input id="re-party" class="re-input" type="number" min="1" max="50" placeholder="2" required>' +
              '</div>' +
              '<div class="re-field">' +
                '<label class="re-label" for="re-turn">Seating duration (minutes)</label>' +
                '<input id="re-turn" class="re-input" type="number" min="30" max="360" placeholder="90">' +
              '</div>' +
            '</div>' +
          '</div>' +
          /* Table assignment */
          '<div class="re-section" id="re-sect-table">' +
            '<div class="re-section-label">Table Assignment</div>' +
            '<div class="re-row">' +
              '<div class="re-field">' +
                '<label class="re-label" for="re-room">Room</label>' +
                '<select id="re-room" class="re-select">' +
                  '<option value="">Any room</option>' +
                '</select>' +
              '</div>' +
              '<div class="re-field">' +
                '<label class="re-label" for="re-table">Table</label>' +
                '<select id="re-table" class="re-select">' +
                  '<option value="">Auto-assign</option>' +
                '</select>' +
              '</div>' +
            '</div>' +
            '<div id="re-suggest" class="re-suggest" role="status" aria-live="polite"></div>' +
            '<div id="re-conflict" class="re-conflict-warn" role="alert" aria-live="assertive"></div>' +
          '</div>' +
          /* Meta */
          '<div class="re-section" id="re-sect-meta">' +
            '<div class="re-section-label">Details</div>' +
            '<div class="re-row">' +
              '<div class="re-field">' +
                '<label class="re-label" for="re-source">Source</label>' +
                '<select id="re-source" class="re-select">' +
                  '<option value="host">Host</option>' +
                  '<option value="phone">Phone</option>' +
                  '<option value="walkin">Walk-in</option>' +
                  '<option value="online">Online</option>' +
                '</select>' +
              '</div>' +
              '<div class="re-field">' +
                '<label class="re-label" for="re-status">Status</label>' +
                '<select id="re-status" class="re-select">' +
                  '<option value="booked">Booked</option>' +
                  '<option value="confirmed">Confirmed</option>' +
                  '<option value="seated">Seated</option>' +
                '</select>' +
              '</div>' +
            '</div>' +
            '<div class="re-field">' +
              '<label class="re-label" for="re-requests">Special requests</label>' +
              '<textarea id="re-requests" class="re-textarea" placeholder="Dietary needs, occasion, seating preference…"></textarea>' +
            '</div>' +
            '<div class="re-field">' +
              '<label class="re-label" for="re-notes">Host notes (internal)</label>' +
              '<textarea id="re-notes" class="re-textarea" placeholder="Internal notes for the team…"></textarea>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="re-foot">' +
          '<button class="re-cancel-btn" id="re-cancel-btn" type="button">Cancel</button>' +
          '<button class="re-save-btn" id="re-save-btn" type="button">Save Reservation</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(div);
    _editorOverlay = div;

    // close triggers
    document.getElementById('re-close-btn').addEventListener('click', closeEditor);
    document.getElementById('re-cancel-btn').addEventListener('click', closeEditor);
    div.addEventListener('click', function (e) { if (e.target === div) closeEditor(); });
    div.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeEditor(); });

    // save
    document.getElementById('re-save-btn').addEventListener('click', saveEditor);

    // phone lookup
    document.getElementById('re-phone').addEventListener('input', function () {
      clearTimeout(_phoneDebounce);
      _phoneDebounce = setTimeout(lookupPhone, 600);
    });

    // table conflict check on change
    ['re-date', 're-time', 're-party', 're-turn', 're-table'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('change', onBookingChange);
    });

    // room filter
    document.getElementById('re-room').addEventListener('change', populateTableSelect);

    // party size → re-suggest
    document.getElementById('re-party').addEventListener('change', onBookingChange);
  }

  function closeEditor() {
    if (_editorOverlay) _editorOverlay.classList.remove('open');
  }

  /* Public contract: open(reservationId|null, defaults) */
  async function openEditor(resId, defaults) {
    buildEditorDOM();
    _editing    = resId || null;
    _edDefaults = defaults || {};
    _edGuest    = null;

    var rest = window.COV.state.restaurant;
    if (!rest) { toast('Restaurant not loaded', 'err'); return; }

    // Load support data
    try {
      var results = await Promise.all([
        data.tables.list(rest.id),
        data.rooms.list(rest.id),
        data.servicePeriods.list(rest.id),
      ]);
      _edTables  = results[0] || [];
      _edRooms   = results[1] || [];
      _edPeriods = results[2] || [];
    } catch (e) {
      toast('Could not load form data.', 'err'); return;
    }

    // Populate room select
    var roomSel = document.getElementById('re-room');
    roomSel.innerHTML = '<option value="">Any room</option>' +
      _edRooms.map(function (r) { return '<option value="' + esc(r.id) + '">' + esc(r.name) + '</option>'; }).join('');

    if (_editing) {
      document.getElementById('re-title').textContent = 'Edit Reservation';
      document.getElementById('re-save-btn').textContent = 'Save Changes';
      try {
        var existing = await data.reservations.get(_editing);
        var d = new Date(existing.starts_at);
        var tz = rest.timezone;
        var dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(d);
        var timeStr = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(d);

        // load reservations for that date for conflict check
        _edAllRes = await data.reservations.listByDate(rest.id, dateStr);

        setField('re-phone', existing.cov_guests ? (existing.cov_guests.phone || '') : '');
        setField('re-name',  existing.cov_guests ? (existing.cov_guests.name  || '') : '');
        setField('re-email', existing.cov_guests ? (existing.cov_guests.email || '') : '');
        setField('re-date',  dateStr);
        setField('re-time',  timeStr);
        setField('re-party', String(existing.party_size || 2));
        setField('re-turn',  String(existing.turn_minutes || rest.default_turn_minutes || 90));
        setField('re-source', existing.source || 'host');
        setField('re-status', existing.status || 'booked');
        setField('re-requests', existing.special_requests || '');
        setField('re-notes', existing.host_notes || '');

        _edGuest = existing.cov_guests || null;
        if (_edGuest) showGuestFound(_edGuest);

        populateTableSelect();
        if (existing.room_id) document.getElementById('re-room').value = existing.room_id;
        populateTableSelect();
        if (existing.table_id) document.getElementById('re-table').value = existing.table_id;
      } catch (e) {
        toast('Could not load reservation.', 'err'); return;
      }
    } else {
      document.getElementById('re-title').textContent =
        (_edDefaults.source === 'walkin') ? 'Add Walk-in' : 'New Reservation';
      document.getElementById('re-save-btn').textContent =
        (_edDefaults.source === 'walkin') ? 'Add Walk-in' : 'Create Reservation';
      clearGuestFound();

      var defaultDate = _edDefaults.date || getTodayLocal(rest.timezone);
      setField('re-date',   defaultDate);
      setField('re-time',   _edDefaults.time  || '19:00');
      setField('re-party',  String(_edDefaults.party_size || 2));
      setField('re-turn',   String(rest.default_turn_minutes || 90));
      setField('re-source', _edDefaults.source || 'host');
      setField('re-status', _edDefaults.status || 'booked');
      setField('re-phone',  '');
      setField('re-name',   '');
      setField('re-email',  '');
      setField('re-requests', '');
      setField('re-notes',  '');

      _edAllRes = await data.reservations.listByDate(rest.id, defaultDate).catch(function () { return []; });
      populateTableSelect();
      triggerAutoSuggest();
    }

    document.getElementById('re-conflict').style.display = 'none';
    _editorOverlay.classList.add('open');

    // Focus first meaningful field
    setTimeout(function () {
      var f = _editing ? document.getElementById('re-name') : document.getElementById('re-phone');
      if (f) f.focus();
    }, 80);
  }

  function setField(id, val) {
    var el = document.getElementById(id);
    if (el) el.value = val;
  }

  function populateTableSelect() {
    var roomId = document.getElementById('re-room').value;
    var sel    = document.getElementById('re-table');
    var prev   = sel.value;
    var filtered = _edTables.filter(function (t) {
      return t.is_active && (!roomId || t.room_id === roomId);
    });
    sel.innerHTML = '<option value="">Auto-assign</option>' +
      filtered.map(function (t) {
        return '<option value="' + esc(t.id) + '">' + esc(t.label) + ' (' + esc(String(t.seats_min)) + '–' + esc(String(t.seats_max)) + ')</option>';
      }).join('');
    if (prev && filtered.some(function (t) { return t.id === prev; })) sel.value = prev;
  }

  async function lookupPhone() {
    var rest  = window.COV.state.restaurant;
    var phone = document.getElementById('re-phone').value.trim();
    if (!phone || phone.length < 4 || !rest) { clearGuestFound(); return; }
    try {
      var g = await data.guests.findByPhone(rest.id, phone);
      _edGuest = g;
      if (g) {
        showGuestFound(g);
        setField('re-name',  g.name || '');
        setField('re-email', g.email || '');
      } else {
        clearGuestFound();
      }
    } catch (e) {
      clearGuestFound();
    }
  }

  function showGuestFound(g) {
    var el = document.getElementById('re-guest-found');
    var tags = (g.tags || []).slice(0, 4).map(function (t) {
      var cls = 're-guest-tag ';
      if (t === 'VIP') cls += 'badge-accent';
      else if (t.startsWith('allergy')) cls += 'badge-danger';
      else cls += 'badge-neutral';
      return '<span class="' + cls + '">' + esc(t) + '</span>';
    }).join('');
    el.innerHTML =
      '<strong>Found:</strong> ' + esc(g.name || 'Guest') +
      ' · ' + esc(String(g.total_visits || 0)) + ' visits' +
      (g.no_show_count ? ' · <span style="color:var(--color-destructive)">' + esc(String(g.no_show_count)) + ' no-shows</span>' : '') +
      (tags ? '<div class="re-guest-tags">' + tags + '</div>' : '');
    el.style.display = 'block';
  }

  function clearGuestFound() {
    _edGuest = null;
    var el = document.getElementById('re-guest-found');
    el.style.display = 'none'; el.innerHTML = '';
  }

  function buildStartsAt(dateStr, timeStr, tz) {
    // Combine date+time treating them as in restaurant TZ
    // We build an ISO string by using the local offset for that tz at that datetime
    var localIso = dateStr + 'T' + timeStr + ':00';
    // Get UTC offset for that timezone at that time
    try {
      var dtf = new Intl.DateTimeFormat('en-GB', {
        timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
      });
      // Compare what the TZ thinks vs UTC now
      // Simplest correct approach: use Date.UTC with known offset
      // We use a trick: create date as if UTC, find the offset, then adjust
      var d = new Date(localIso + 'Z');
      var parts = dtf.formatToParts(d);
      var tzParsed = {};
      parts.forEach(function (p) { tzParsed[p.type] = p.value; });
      var tzIso = tzParsed.year + '-' + tzParsed.month + '-' + tzParsed.day + 'T' + tzParsed.hour + ':' + tzParsed.minute + ':' + tzParsed.second;
      var diffMs = new Date(localIso).getTime() - new Date(tzIso).getTime();
      var correct = new Date(d.getTime() + diffMs);
      return correct.toISOString();
    } catch (e) {
      return new Date(localIso).toISOString();
    }
  }

  function onBookingChange() {
    // Re-load allRes if date changed
    var rest = window.COV.state.restaurant;
    var dateEl = document.getElementById('re-date');
    if (!dateEl || !rest) return;
    var d = dateEl.value;
    if (d && d !== _edDefaults._lastDate) {
      _edDefaults._lastDate = d;
      data.reservations.listByDate(rest.id, d).then(function (rows) {
        _edAllRes = rows || [];
        checkConflict();
        triggerAutoSuggest();
      }).catch(function () {});
    } else {
      checkConflict();
      triggerAutoSuggest();
    }
  }

  function getEditorValues() {
    var rest  = window.COV.state.restaurant;
    var tz    = rest ? rest.timezone : 'UTC';
    var dateV = document.getElementById('re-date').value;
    var timeV = document.getElementById('re-time').value;
    var startsAt = (dateV && timeV) ? buildStartsAt(dateV, timeV, tz) : null;
    var turn = parseInt(document.getElementById('re-turn').value, 10) || (rest ? rest.default_turn_minutes : 90) || 90;
    var endAt = startsAt ? new Date(new Date(startsAt).getTime() + turn * 60000).toISOString() : null;
    return {
      startsAt: startsAt,
      endAt:    endAt,
      turn:     turn,
      tableId:  document.getElementById('re-table').value || null,
      party:    parseInt(document.getElementById('re-party').value, 10) || 2,
    };
  }

  function checkConflict() {
    var rest = window.COV.state.restaurant;
    var warn = document.getElementById('re-conflict');
    var vals = getEditorValues();
    if (!vals.tableId || !vals.startsAt || !vals.endAt) { warn.style.display = 'none'; return; }
    var probe = { table_id: vals.tableId, starts_at: vals.startsAt, end_at: vals.endAt, id: _editing };
    if (hasConflict(probe, _edAllRes, rest ? rest.buffer_minutes : 15)) {
      warn.textContent = 'Conflict: this table is already booked during this time window (including buffer). Please choose another table or time.';
      warn.style.display = 'block';
    } else {
      warn.style.display = 'none';
    }
  }

  function triggerAutoSuggest() {
    var rest = window.COV.state.restaurant;
    var sug  = document.getElementById('re-suggest');
    var vals = getEditorValues();
    if (!vals.startsAt || !_edTables.length) { sug.style.display = 'none'; return; }
    var suggested = suggestTable(_edTables, _edAllRes, vals.startsAt, vals.turn, vals.party, rest ? rest.buffer_minutes : 15, _editing);
    if (suggested) {
      sug.textContent = 'Suggested: ' + suggested.label + ' (' + suggested.seats_min + '–' + suggested.seats_max + ' seats)';
      sug.style.display = 'block';
    } else {
      sug.textContent = 'No free table found for this time. Consider a different time or check table assignments.';
      sug.style.display = 'block';
    }
  }

  async function saveEditor() {
    var rest = window.COV.state.restaurant;
    if (!rest) { toast('Restaurant not loaded.', 'err'); return; }

    var phone   = document.getElementById('re-phone').value.trim();
    var name    = document.getElementById('re-name').value.trim();
    var email   = document.getElementById('re-email').value.trim();
    var dateV   = document.getElementById('re-date').value;
    var timeV   = document.getElementById('re-time').value;
    var party   = parseInt(document.getElementById('re-party').value, 10);
    var turn    = parseInt(document.getElementById('re-turn').value, 10) || rest.default_turn_minutes || 90;
    var tableId = document.getElementById('re-table').value || null;
    var roomId  = document.getElementById('re-room').value  || null;
    var source  = document.getElementById('re-source').value || 'host';
    var status  = document.getElementById('re-status').value || 'booked';
    var requests = document.getElementById('re-requests').value.trim();
    var notes    = document.getElementById('re-notes').value.trim();

    // Validate
    if (!dateV || !timeV) { toast('Please set a date and time.', 'warn'); return; }
    if (!party || party < 1) { toast('Party size must be at least 1.', 'warn'); return; }

    var startsAt = buildStartsAt(dateV, timeV, rest.timezone);
    var endAt    = new Date(new Date(startsAt).getTime() + turn * 60000).toISOString();

    // Conflict check (pre-save)
    if (tableId) {
      var probe = { table_id: tableId, starts_at: startsAt, end_at: endAt, id: _editing };
      if (hasConflict(probe, _edAllRes, rest.buffer_minutes || 15)) {
        toast('Conflict detected — this table is busy during that window. Change table or time.', 'err');
        document.getElementById('re-conflict').style.display = 'block';
        return;
      }
    }

    // If no table chosen, auto-suggest
    if (!tableId) {
      var autoTable = suggestTable(_edTables, _edAllRes, startsAt, turn, party, rest.buffer_minutes || 15, _editing);
      if (autoTable) tableId = autoTable.id;
    }

    var saveBtn = document.getElementById('re-save-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';

    try {
      // Upsert guest if phone provided
      var guestId = (_edGuest && _edGuest.id) ? _edGuest.id : null;
      if (phone) {
        var guestFields = { restaurant_id: rest.id, phone: phone };
        if (name) guestFields.name = name;
        if (email) guestFields.email = email;
        var savedGuest = await data.guests.upsert(guestFields);
        guestId = savedGuest.id;
      } else if (!guestId && name) {
        /* No phone, but a name was typed — create a named guest so the
           reservation doesn't silently save as an anonymous Walk-in. */
        var namedFields = { restaurant_id: rest.id, name: name };
        if (email) namedFields.email = email;
        var namedGuest = await data.guests.upsert(namedFields);
        guestId = namedGuest.id;
      }

      var fields = {
        restaurant_id:    rest.id,
        guest_id:         guestId,
        table_id:         tableId,
        room_id:          roomId || (tableId ? (_edTables.find(function (t) { return t.id === tableId; }) || {}).room_id : null),
        party_size:       party,
        starts_at:        startsAt,
        end_at:           endAt,
        turn_minutes:     turn,
        status:           status,
        source:           source,
        special_requests: requests || null,
        host_notes:       notes || null,
      };

      if (_editing) {
        await data.reservations.update(_editing, fields);
        toast('Reservation updated.', 'ok');
      } else {
        await data.reservations.create(fields);
        toast('Reservation created.', 'ok');
      }

      closeEditor();
      // Refresh screens
      if (_sectionEl && window.COV.state.section === 'reservations') loadList();
      // Also refresh timeline if it's loaded
      if (window.COV.screens.timeline && window.COV.screens.timeline._reload) {
        window.COV.screens.timeline._reload();
      }
    } catch (e) {
      var msg = (e && typeof e.message === 'string' && !e.message.includes('object')) ? e.message : 'Save failed. Please try again.';
      toast(msg, 'err');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = _editing ? 'Save Changes' : 'Create Reservation';
    }
  }

  /* ------------------------------------------------------------------ */
  /* EXPORTS                                                              */
  /* ------------------------------------------------------------------ */
  window.COV = window.COV || {};
  window.COV.screens = window.COV.screens || {};
  window.COV.screens.reservations = {
    render: render,
    _reload: loadList,
  };
  window.COV.resEditor = {
    open: openEditor,
  };

  /* Override dashboard quick-action buttons (inline script added click→#res-modal;
     we replace them with onclick so only one handler fires). */
  (function overrideDashButtons() {
    var addBtn    = document.getElementById('btn-add-reservation');
    var walkinBtn = document.getElementById('btn-add-walkin');
    if (addBtn) addBtn.onclick = function (e) {
      e.stopImmediatePropagation();
      window.COV.resEditor.open(null, { source: 'host' });
    };
    if (walkinBtn) walkinBtn.onclick = function (e) {
      e.stopImmediatePropagation();
      window.COV.resEditor.open(null, { source: 'walkin', status: 'seated' });
    };
  })();

}());
