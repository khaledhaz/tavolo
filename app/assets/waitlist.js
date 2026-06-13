/* ============================================================================
   Coverly — Waitlist screen
   Registers: window.COV.screens.waitlist = { render(sectionEl) }
   Owns:      assets/waitlist.js  (no edits to index.html or data.js)

   Data-layer note: there is no dedicated `data.reservations.listWaitlist()`.
   We use `data.reservations.listByDate(restaurantId, today)` and filter
   client-side to status === 'waitlist'. The listByDate helper fetches a
   full day UTC-wide, which means guests added close to midnight UTC may
   appear/disappear. A server-side helper filtering on status would be more
   precise — flagged as a data-layer gap for the server team.
   ============================================================================ */
(function () {
  'use strict';

  var data  = window.COV.data;
  var utils = window.COV.utils;
  var esc   = utils.esc;
  var toast = utils.toast;

  /* ---- inject styles once ---- */
  (function injectStyles() {
    if (document.getElementById('cov-waitlist-css')) return;
    var s = document.createElement('style');
    s.id = 'cov-waitlist-css';
    s.textContent = [
      '.wl-page{max-width:760px;margin:0 auto}',
      '.wl-header{display:flex;align-items:center;justify-content:space-between;gap:var(--space-3);flex-wrap:wrap;margin-bottom:var(--space-5)}',
      '.wl-h1{font-size:22px;font-weight:600;letter-spacing:-0.02em;color:var(--color-text-primary)}',
      '.wl-list{display:flex;flex-direction:column;gap:var(--space-3)}',
      /* list item — two-row layout: [position + body] then [actions] */
      '.wl-item{background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-lg);padding:var(--space-4) var(--space-5);display:flex;flex-direction:column;gap:var(--space-3)}',
      '.wl-item-top{display:flex;align-items:flex-start;gap:var(--space-3);min-width:0}',
      '.wl-position{width:32px;height:32px;border-radius:50%;background:var(--color-primary-light);color:var(--color-primary);font-size:14px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px}',
      '.wl-body{flex:1;min-width:0}',
      '.wl-name{font-size:15px;font-weight:600;color:var(--color-text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.wl-meta{font-size:13px;color:var(--color-text-muted);line-height:1.6}',
      '.wl-wait-badge{display:inline-flex;align-items:center;gap:4px;background:var(--color-accent-light);color:var(--color-accent-hover);border:1px solid rgba(232,160,64,.3);border-radius:var(--radius-full);padding:2px 10px;font-size:12px;font-weight:600;margin-left:var(--space-2)}',
      '.wl-actions{display:flex;gap:var(--space-2);flex-wrap:wrap;padding-left:44px}',
      /* empty state */
      '.wl-empty{text-align:center;padding:var(--space-12) var(--space-5);background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-lg)}',
      '.wl-empty-icon{width:56px;height:56px;border-radius:var(--radius-xl);background:var(--color-surface-raised);border:1px solid var(--color-border);display:flex;align-items:center;justify-content:center;color:var(--color-text-muted);margin:0 auto var(--space-4)}',
      '.wl-empty-title{font-size:18px;font-weight:600;color:var(--color-text-primary);margin-bottom:var(--space-2)}',
      '.wl-empty-body{font-size:14px;color:var(--color-text-muted);max-width:360px;margin:0 auto var(--space-5);line-height:1.6}',
      /* seat modal */
      '.wl-table-option{display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3) var(--space-4);border-radius:var(--radius-md);border:1px solid var(--color-border);cursor:pointer;transition:border-color var(--duration-fast),background var(--duration-fast);background:var(--color-surface)}',
      '.wl-table-option:hover,.wl-table-option.selected{border-color:var(--color-primary);background:var(--color-primary-light)}',
      '.wl-table-option input{accent-color:var(--color-primary)}',
    ].join('');
    document.head.appendChild(s);
  }());

  /* ======================================================================
     State
  ====================================================================== */
  var _waitlist  = [];   /* reservations with status=waitlist today */
  var _allTodayRes = []; /* all today's reservations (for conflict check) */
  var _tables    = [];
  var _rooms     = [];

  /* ======================================================================
     Entry point
  ====================================================================== */
  function render(sectionEl) {
    if (!sectionEl) return;
    sectionEl.innerHTML = '<div class="wl-page"><div role="status" aria-live="polite" style="padding:var(--space-8);text-align:center;color:var(--color-text-muted)"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;animation:spin 1s linear infinite;margin-bottom:var(--space-2)" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg><br>Loading waitlist…</div></div>';
    loadAll(sectionEl);
  }

  function getTodayISO(tz) {
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: tz || 'UTC' }).format(new Date());
    } catch (e) {
      return new Date().toISOString().slice(0, 10);
    }
  }

  async function loadAll(sectionEl) {
    var rest = window.COV.state && window.COV.state.restaurant;
    if (!rest) {
      sectionEl.innerHTML = '<div class="wl-page"><div style="padding:var(--space-8);text-align:center;color:var(--color-destructive)">No restaurant found. Please reload.</div></div>';
      return;
    }
    var today = getTodayISO(rest.timezone);
    try {
      var results = await Promise.all([
        data.reservations.listByDate(rest.id, today),
        data.tables.list(rest.id),
        data.rooms.list(rest.id),
      ]);
      var allRes     = results[0] || [];
      _allTodayRes   = allRes;
      _waitlist      = allRes
        .filter(function (r) { return r.status === 'waitlist'; })
        .sort(function (a, b) { return new Date(a.created_at) - new Date(b.created_at); });
      _tables  = results[1] || [];
      _rooms   = results[2] || [];
      drawPage(sectionEl);
    } catch (e) {
      console.error('[coverly:waitlist] loadAll', e);
      sectionEl.innerHTML = '<div class="wl-page"><div style="padding:var(--space-8);text-align:center;color:var(--color-destructive)">Failed to load waitlist. <button onclick="location.reload()" style="color:var(--color-primary);background:none;border:none;cursor:pointer;text-decoration:underline">Reload</button></div></div>';
    }
  }

  /* ======================================================================
     DRAW
  ====================================================================== */
  function drawPage(sectionEl) {
    sectionEl.innerHTML =
      '<div class="wl-page" id="wl-root">' +
        '<div class="wl-header">' +
          '<div>' +
            '<h2 class="wl-h1">Waitlist</h2>' +
            '<p style="font-size:13px;color:var(--color-text-muted);margin-top:2px">Today\'s walk-in queue — ' + esc(String(_waitlist.length)) + ' waiting</p>' +
          '</div>' +
          '<button id="wl-add-btn" class="btn btn-primary" style="min-height:40px;font-size:14px;padding:0 var(--space-5);border-radius:var(--radius-md)" aria-label="Add walk-in to waitlist">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
            ' Add walk-in' +
          '</button>' +
        '</div>' +
        '<div id="wl-list-wrap">' + renderListHTML() + '</div>' +
      '</div>';

    wirePage(sectionEl);
  }

  function renderListHTML() {
    if (!_waitlist.length) {
      return '<div class="wl-empty">' +
        '<div class="wl-empty-icon" aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg></div>' +
        '<h3 class="wl-empty-title">No one waiting</h3>' +
        '<p class="wl-empty-body">When a walk-in arrives and no table is immediately available, add them here. Seat them as soon as a table frees up.</p>' +
        '<button id="wl-empty-add" class="btn btn-primary" style="border-radius:var(--radius-md)">Add first walk-in</button>' +
      '</div>';
    }

    var tz = (window.COV.state.restaurant || {}).timezone || 'UTC';
    return '<div class="wl-list" role="list" aria-label="Waitlist">' +
      _waitlist.map(function (res, i) {
        var guest = res.cov_guests || {};
        var name  = guest.name || res._guestName || 'Walk-in';
        var party = res.party_size || 1;
        var quotedWait = res._quoted_wait || 0;
        var addedAt = utils.formatDate(res.created_at, tz, { dateStyle: undefined, timeStyle: 'short' });

        /* compute actual wait so far in minutes */
        var waitedMin = Math.floor((Date.now() - new Date(res.created_at).getTime()) / 60000);

        return '<div class="wl-item" role="listitem" data-resid="' + esc(res.id) + '">' +
          '<div class="wl-item-top">' +
            '<div class="wl-position" aria-label="Position ' + (i + 1) + '">' + (i + 1) + '</div>' +
            '<div class="wl-body">' +
              '<div class="wl-name">' + esc(name) +
                (guest.phone ? '<span style="font-size:12px;font-weight:400;color:var(--color-text-muted);margin-left:var(--space-2)">' + esc(guest.phone) + '</span>' : '') +
              '</div>' +
              '<div class="wl-meta">' +
                'Party of <strong>' + esc(String(party)) + '</strong> &bull; Added at ' + esc(addedAt) + ' &bull; Waited: ' + esc(String(waitedMin)) + ' min' +
                (quotedWait ? '<span class="wl-wait-badge">~' + esc(String(quotedWait)) + ' min quoted</span>' : '') +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="wl-actions">' +
            '<button class="btn btn-primary wl-seat-btn" data-resid="' + esc(res.id) + '" style="min-height:36px;font-size:13px;padding:0 var(--space-4);border-radius:var(--radius-md)" aria-label="Seat ' + esc(name) + '">Seat now</button>' +
            '<button class="btn btn-danger wl-remove-btn" data-resid="' + esc(res.id) + '" style="min-height:36px;font-size:13px;padding:0 var(--space-3);border-radius:var(--radius-md)" aria-label="Remove ' + esc(name) + ' from waitlist">Remove</button>' +
          '</div>' +
        '</div>';
      }).join('') +
    '</div>';
  }

  /* ======================================================================
     WIRE
  ====================================================================== */
  function wirePage(sectionEl) {
    var addBtn = sectionEl.querySelector('#wl-add-btn');
    if (addBtn) addBtn.addEventListener('click', function () { openAddModal(sectionEl); });

    var emptyAdd = sectionEl.querySelector('#wl-empty-add');
    if (emptyAdd) emptyAdd.addEventListener('click', function () { openAddModal(sectionEl); });

    var listWrap = sectionEl.querySelector('#wl-list-wrap');
    if (listWrap) {
      listWrap.addEventListener('click', function (e) {
        var seatBtn   = e.target.closest('.wl-seat-btn');
        var removeBtn = e.target.closest('.wl-remove-btn');
        if (seatBtn)   openSeatModal(seatBtn.dataset.resid, sectionEl);
        if (removeBtn) removeFromWaitlist(removeBtn.dataset.resid, sectionEl);
      });
    }
  }

  function refreshList(sectionEl) {
    var listWrap = sectionEl.querySelector('#wl-list-wrap');
    if (listWrap) listWrap.innerHTML = renderListHTML();
    /* re-wire empty add */
    var emptyAdd = sectionEl.querySelector('#wl-empty-add');
    if (emptyAdd) emptyAdd.addEventListener('click', function () { openAddModal(sectionEl); });
    /* update count */
    var countEl = sectionEl.querySelector('.wl-h1 + p');
    if (!countEl) {
      /* find the subtitle p */
      var page = sectionEl.querySelector('.wl-page');
      if (page) {
        var p = page.querySelector('.wl-header p');
        if (p) p.textContent = 'Today\'s walk-in queue — ' + _waitlist.length + ' waiting';
      }
    }
  }

  /* ======================================================================
     ADD WALK-IN MODAL
  ====================================================================== */
  function openAddModal(sectionEl) {
    var old = document.getElementById('wl-add-modal');
    if (old) old.remove();

    var overlay = document.createElement('div');
    overlay.id = 'wl-add-modal';
    overlay.className = 'modal-overlay open';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'wl-add-title');
    overlay.innerHTML =
      '<div class="modal" style="max-width:440px">' +
        '<div class="modal-head">' +
          '<h2 class="modal-title" id="wl-add-title">Add walk-in to waitlist</h2>' +
          '<button class="icon-btn" id="wl-add-close" aria-label="Close">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
          '</button>' +
        '</div>' +
        '<div class="field"><label for="wl-guest-name">Guest name <span aria-hidden="true" style="color:var(--color-destructive)">*</span></label><input id="wl-guest-name" class="input" type="text" placeholder="e.g. Smith" required autocomplete="name"></div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)">' +
          '<div class="field"><label for="wl-party">Party size <span aria-hidden="true" style="color:var(--color-destructive)">*</span></label><input id="wl-party" class="input" type="number" min="1" max="50" value="2" required></div>' +
          '<div class="field"><label for="wl-wait">Quoted wait (min)</label><input id="wl-wait" class="input" type="number" min="0" max="240" value="20" placeholder="0"></div>' +
        '</div>' +
        '<div class="field"><label for="wl-phone">Phone (optional — for notification)</label><input id="wl-phone" class="input" type="tel" autocomplete="tel" placeholder="+44 7000 000000"></div>' +
        '<div style="display:flex;gap:var(--space-3);margin-top:var(--space-2)">' +
          '<button id="wl-add-cancel" class="btn btn-secondary" style="flex:1;border-radius:var(--radius-md)">Cancel</button>' +
          '<button id="wl-add-save" class="btn btn-primary" style="flex:2;border-radius:var(--radius-md)">Add to waitlist</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    function closeModal() { overlay.remove(); }
    overlay.querySelector('#wl-add-close').addEventListener('click', closeModal);
    overlay.querySelector('#wl-add-cancel').addEventListener('click', closeModal);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });
    overlay.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });

    overlay.querySelector('#wl-add-save').addEventListener('click', async function () {
      var name   = (overlay.querySelector('#wl-guest-name') || {}).value || '';
      var party  = parseInt((overlay.querySelector('#wl-party') || {}).value || '2', 10);
      var wait   = parseInt((overlay.querySelector('#wl-wait') || {}).value || '0', 10);
      var phone  = (overlay.querySelector('#wl-phone') || {}).value || '';

      if (!name.trim()) { toast('Guest name is required.', 'err'); return; }
      if (isNaN(party) || party < 1) { toast('Party size must be at least 1.', 'err'); return; }

      var saveBtn = overlay.querySelector('#wl-add-save');
      saveBtn.disabled = true; saveBtn.textContent = 'Adding…';

      var rest = window.COV.state.restaurant;
      try {
        /* 1. Upsert guest (if phone provided) */
        var guestId = null;
        if (phone.trim()) {
          var normPhone = phone.trim().replace(/\s+/g, '');
          var guest = await data.guests.upsert({
            restaurant_id: rest.id,
            name:          name.trim(),
            phone:         normPhone,
          });
          guestId = guest && guest.id ? guest.id : null;
        }

        /* 2. Create reservation with status='waitlist' */
        var now = new Date().toISOString();
        var created = await data.reservations.create({
          restaurant_id: rest.id,
          guest_id:      guestId,
          party_size:    party,
          starts_at:     now,
          end_at:        new Date(Date.now() + ((rest.default_turn_minutes || 90) * 60000)).toISOString(),
          turn_minutes:  rest.default_turn_minutes || 90,
          status:        'waitlist',
          source:        'walkin',
          host_notes:    wait ? 'Quoted wait: ' + wait + ' min' : '',
        });

        /* attach display-only fields for the list */
        created._guestName   = name.trim();
        created._quoted_wait = wait;
        if (guestId) {
          created.cov_guests = { id: guestId, name: name.trim(), phone: phone.trim() };
        }

        _waitlist.push(created);
        _allTodayRes.push(created);

        refreshList(sectionEl);
        toast(name.trim() + ' added to waitlist.', 'ok');
        closeModal();
      } catch (e) {
        console.error('[coverly:waitlist] add', e);
        toast('Could not add to waitlist. Please try again.', 'err');
        saveBtn.disabled = false; saveBtn.textContent = 'Add to waitlist';
      }
    });

    setTimeout(function () { var f = overlay.querySelector('#wl-guest-name'); if (f) f.focus(); }, 50);
  }

  /* ======================================================================
     SEAT NOW MODAL
  ====================================================================== */
  function openSeatModal(resId, sectionEl) {
    var reservation = _waitlist.find(function (r) { return r.id === resId; });
    if (!reservation) return;

    var guest = reservation.cov_guests || {};
    var name  = guest.name || reservation._guestName || 'Walk-in';
    var party = reservation.party_size || 1;
    var rest  = window.COV.state.restaurant || {};
    var turnMin = rest.default_turn_minutes || 90;
    var bufferMin = rest.buffer_minutes || 15;
    var now   = Date.now();

    /* find free tables fitting this party */
    var freeTables = _tables.filter(function (t) {
      if (!t.is_active) return false;
      if (t.seats_max < party) return false;
      /* conflict check: no active reservation overlaps now..now+turn+buffer on this table */
      var wStart = now;
      var wEnd   = now + (turnMin + bufferMin) * 60000;
      var conflict = _allTodayRes.some(function (r) {
        if (r.table_id !== t.id) return false;
        if (!['booked','confirmed','seated'].includes(r.status)) return false;
        var rStart = new Date(r.starts_at).getTime();
        var rEnd   = new Date(r.end_at).getTime() + bufferMin * 60000;
        return wStart < rEnd && wEnd > rStart;
      });
      return !conflict;
    });

    var old = document.getElementById('wl-seat-modal');
    if (old) old.remove();

    var tablesHtml;
    if (!freeTables.length) {
      tablesHtml = '<p style="color:var(--color-text-muted);font-size:14px;padding:var(--space-3) 0">No free tables for a party of ' + esc(String(party)) + ' right now. You can still seat without a table assignment.</p>';
    } else {
      tablesHtml = '<div style="display:flex;flex-direction:column;gap:var(--space-2);" role="radiogroup" aria-label="Select a table">' +
        '<label class="wl-table-option">' +
          '<input type="radio" name="wl-table" value="" checked> No table assignment' +
        '</label>' +
        freeTables.map(function (t) {
          var room = _rooms.find(function (r) { return r.id === t.room_id; });
          return '<label class="wl-table-option">' +
            '<input type="radio" name="wl-table" value="' + esc(t.id) + '"> ' +
            '<div>' +
              '<strong>Table ' + esc(t.label) + '</strong>' +
              (room ? ' <span style="color:var(--color-text-muted);font-size:13px">(' + esc(room.name) + ')</span>' : '') +
              '<br><span style="font-size:12px;color:var(--color-text-muted)">' + esc(String(t.seats_min)) + '–' + esc(String(t.seats_max)) + ' seats</span>' +
            '</div>' +
          '</label>';
        }).join('') +
      '</div>';
    }

    var overlay = document.createElement('div');
    overlay.id = 'wl-seat-modal';
    overlay.className = 'modal-overlay open';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'wl-seat-title');
    overlay.innerHTML =
      '<div class="modal" style="max-width:440px">' +
        '<div class="modal-head">' +
          '<h2 class="modal-title" id="wl-seat-title">Seat ' + esc(name) + '</h2>' +
          '<button class="icon-btn" id="wl-seat-close" aria-label="Close">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
          '</button>' +
        '</div>' +
        '<p style="font-size:15px;color:var(--color-text-secondary);margin-bottom:var(--space-5)">Party of <strong>' + esc(String(party)) + '</strong>. Select a free table to assign:</p>' +
        tablesHtml +
        '<div style="display:flex;gap:var(--space-3);margin-top:var(--space-5)">' +
          '<button id="wl-seat-cancel" class="btn btn-secondary" style="flex:1;border-radius:var(--radius-md)">Cancel</button>' +
          '<button id="wl-seat-confirm" class="btn btn-primary" style="flex:2;border-radius:var(--radius-md)">Seat now</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    function closeModal() { overlay.remove(); }
    overlay.querySelector('#wl-seat-close').addEventListener('click', closeModal);
    overlay.querySelector('#wl-seat-cancel').addEventListener('click', closeModal);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });
    overlay.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });

    /* style radio labels */
    overlay.querySelectorAll('.wl-table-option input[type="radio"]').forEach(function (radio) {
      radio.addEventListener('change', function () {
        overlay.querySelectorAll('.wl-table-option').forEach(function (l) { l.classList.remove('selected'); });
        if (radio.checked) radio.closest('.wl-table-option').classList.add('selected');
      });
    });
    /* mark first as selected */
    var firstOpt = overlay.querySelector('.wl-table-option');
    if (firstOpt) firstOpt.classList.add('selected');

    overlay.querySelector('#wl-seat-confirm').addEventListener('click', async function () {
      var selected = overlay.querySelector('input[name="wl-table"]:checked');
      var tableId  = selected ? selected.value : '';

      var confirmBtn = overlay.querySelector('#wl-seat-confirm');
      confirmBtn.disabled = true; confirmBtn.textContent = 'Seating…';

      try {
        /* update status to 'seated', assign table if chosen */
        var patch = {
          status:   'seated',
          seated_at: new Date().toISOString(),
        };
        if (tableId) patch.table_id = tableId;
        var updated = await data.reservations.update(resId, patch);

        /* reflect in local state */
        _waitlist = _waitlist.filter(function (r) { return r.id !== resId; });
        _allTodayRes = _allTodayRes.map(function (r) { return r.id === resId ? Object.assign({}, r, patch) : r; });

        var tbl = tableId ? _tables.find(function (t) { return t.id === tableId; }) : null;
        toast(name + ' seated' + (tbl ? ' at Table ' + tbl.label : '') + '!', 'ok');
        refreshList(sectionEl);
        closeModal();
      } catch (e) {
        console.error('[coverly:waitlist] seat', e);
        toast('Could not seat guest. Please try again.', 'err');
        confirmBtn.disabled = false; confirmBtn.textContent = 'Seat now';
      }
    });

    setTimeout(function () { var f = overlay.querySelector('#wl-seat-confirm'); if (f) f.focus(); }, 50);
  }

  /* ======================================================================
     REMOVE / CANCEL
  ====================================================================== */
  async function removeFromWaitlist(resId, sectionEl) {
    var res = _waitlist.find(function (r) { return r.id === resId; });
    if (!res) return;
    var guest = res.cov_guests || {};
    var name  = guest.name || res._guestName || 'this guest';
    if (!(await window.PLAT.confirmDialog('Remove ' + name + ' from the waitlist?', { confirmLabel: 'Remove', danger: true }))) return;
    try {
      await data.reservations.updateStatus(resId, 'cancelled');
      _waitlist = _waitlist.filter(function (r) { return r.id !== resId; });
      _allTodayRes = _allTodayRes.filter(function (r) { return r.id !== resId; });
      refreshList(sectionEl);
      toast(name + ' removed from waitlist.', 'ok');
    } catch (e) {
      console.error('[coverly:waitlist] remove', e);
      toast('Could not remove from waitlist. Please try again.', 'err');
    }
  }

  /* ======================================================================
     EXPORT
  ======================================================================  */
  window.COV = window.COV || {};
  window.COV.screens = window.COV.screens || {};
  window.COV.screens['waitlist'] = { render: render };

}());
