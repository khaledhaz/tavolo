/* ============================================================================
   Coverly — Blackouts screen
   Registers: window.COV.screens.blackouts = { render(sectionEl) }
   Owns:      assets/blackouts.js  (no edits to index.html or data.js)
   ============================================================================ */
(function () {
  'use strict';

  var data  = window.COV.data;
  var utils = window.COV.utils;
  var esc   = utils.esc;
  var toast = utils.toast;

  /* ---- inject styles once ---- */
  (function injectStyles() {
    if (document.getElementById('cov-blackouts-css')) return;
    var s = document.createElement('style');
    s.id = 'cov-blackouts-css';
    s.textContent = [
      '.bl-page{max-width:760px;margin:0 auto}',
      '.bl-header{display:flex;align-items:center;justify-content:space-between;gap:var(--space-3);flex-wrap:wrap;margin-bottom:var(--space-5)}',
      '.bl-h1{font-size:22px;font-weight:600;letter-spacing:-0.02em;color:var(--color-text-primary)}',
      '.bl-info-box{background:var(--color-accent-light);border:1px solid rgba(232,160,64,.3);border-radius:var(--radius-md);padding:var(--space-4) var(--space-5);font-size:14px;color:var(--color-accent-hover);margin-bottom:var(--space-5);line-height:1.5}',
      '.bl-list{display:flex;flex-direction:column;gap:var(--space-3)}',
      '.bl-item{background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-lg);padding:var(--space-4) var(--space-5);display:flex;align-items:flex-start;gap:var(--space-4);flex-wrap:wrap}',
      '.bl-item.bl-active{border-color:var(--color-destructive);border-left:4px solid var(--color-destructive)}',
      '.bl-item.bl-upcoming{border-color:var(--color-warning);border-left:4px solid var(--color-warning)}',
      '.bl-icon{width:40px;height:40px;border-radius:var(--radius-md);display:flex;align-items:center;justify-content:center;flex-shrink:0}',
      '.bl-icon.active{background:var(--color-destructive-light);color:var(--color-destructive)}',
      '.bl-icon.upcoming{background:var(--color-warning-light);color:var(--color-warning)}',
      '.bl-icon.past{background:var(--color-surface-raised);color:var(--color-text-muted)}',
      '.bl-body{flex:1;min-width:0}',
      '.bl-title{font-size:15px;font-weight:600;color:var(--color-text-primary);margin-bottom:var(--space-1)}',
      '.bl-meta{font-size:13px;color:var(--color-text-muted);line-height:1.6}',
      '.bl-scope{display:inline-flex;align-items:center;gap:4px;background:var(--color-surface-raised);border:1px solid var(--color-border);border-radius:var(--radius-full);padding:2px 10px;font-size:12px;font-weight:500;color:var(--color-text-secondary);margin-bottom:var(--space-2)}',
      '.bl-effect{font-size:12px;color:var(--color-text-muted);margin-top:var(--space-1);font-style:italic}',
      '.bl-actions{display:flex;gap:var(--space-2);flex-shrink:0;align-items:flex-start}',
      '.bl-empty{text-align:center;padding:var(--space-12) var(--space-5);background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-lg)}',
      '.bl-empty-icon{width:56px;height:56px;border-radius:var(--radius-xl);background:var(--color-surface-raised);border:1px solid var(--color-border);display:flex;align-items:center;justify-content:center;color:var(--color-text-muted);margin:0 auto var(--space-4)}',
      '.bl-empty-title{font-size:18px;font-weight:600;color:var(--color-text-primary);margin-bottom:var(--space-2)}',
      '.bl-empty-body{font-size:14px;color:var(--color-text-muted);max-width:360px;margin:0 auto var(--space-5);line-height:1.6}',
      /* modal specifics */
      '.bl-scope-tabs{display:flex;gap:var(--space-2);flex-wrap:wrap;margin-bottom:var(--space-4)}',
      '.bl-scope-btn{min-height:36px;padding:0 var(--space-4);border-radius:var(--radius-full);border:1px solid var(--color-border);background:var(--color-surface);font-size:13px;font-weight:500;color:var(--color-text-secondary);cursor:pointer;transition:background var(--duration-fast),color var(--duration-fast),border-color var(--duration-fast)}',
      '.bl-scope-btn.active{background:var(--color-primary);color:#fff;border-color:var(--color-primary)}',
      '.bl-scope-btn:focus-visible{outline:2px solid var(--color-primary);outline-offset:2px}',
    ].join('');
    document.head.appendChild(s);
  }());

  /* ======================================================================
     State
  ====================================================================== */
  var _blackouts = [];
  var _tables    = [];
  var _rooms     = [];

  /* ======================================================================
     Entry point
  ====================================================================== */
  function render(sectionEl) {
    if (!sectionEl) return;
    sectionEl.innerHTML = '<div class="bl-page"><div role="status" aria-live="polite" style="padding:var(--space-8);text-align:center;color:var(--color-text-muted)"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;animation:spin 1s linear infinite;margin-bottom:var(--space-2)" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg><br>Loading blackouts…</div></div>';
    loadAll(sectionEl);
  }

  async function loadAll(sectionEl) {
    var rest = window.COV.state && window.COV.state.restaurant;
    if (!rest) {
      renderError(sectionEl, 'No restaurant found. Please reload.');
      return;
    }
    try {
      var results = await Promise.all([
        data.blackouts.listActive(rest.id),
        data.tables.list(rest.id),
        data.rooms.list(rest.id),
      ]);
      _blackouts = results[0] || [];
      _tables    = results[1] || [];
      _rooms     = results[2] || [];
      drawPage(sectionEl);
    } catch (e) {
      console.error('[coverly:blackouts] loadAll', e);
      renderError(sectionEl, 'Failed to load blackouts.');
    }
  }

  function renderError(sectionEl, msg) {
    sectionEl.innerHTML = '<div class="bl-page"><div style="padding:var(--space-8);text-align:center;color:var(--color-destructive)">' + esc(msg) + ' <button onclick="location.reload()" style="color:var(--color-primary);background:none;border:none;cursor:pointer;text-decoration:underline">Reload</button></div></div>';
  }

  /* ======================================================================
     DRAW
  ====================================================================== */
  function drawPage(sectionEl) {
    sectionEl.innerHTML =
      '<div class="bl-page" id="bl-root">' +
        '<div class="bl-header">' +
          '<h2 class="bl-h1">Blackouts</h2>' +
          '<button id="bl-add-btn" class="btn btn-primary" style="min-height:40px;font-size:14px;padding:0 var(--space-5);border-radius:var(--radius-md)" aria-label="Create blackout">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
            ' Add blackout' +
          '</button>' +
        '</div>' +
        '<div class="bl-info-box" role="note">' +
          '<strong>What blackouts do:</strong> A blackout removes the affected tables from the availability engine and shows them as blocked on the live floor. No new bookings can be made for the blocked window. Existing bookings are not automatically cancelled — you\'ll need to contact guests manually.' +
        '</div>' +
        '<div id="bl-list-wrap">' + renderListHTML() + '</div>' +
      '</div>';

    wirePage(sectionEl);
  }

  function renderListHTML() {
    if (!_blackouts.length) {
      return '<div class="bl-empty">' +
        '<div class="bl-empty-icon" aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg></div>' +
        '<h3 class="bl-empty-title">No active blackouts</h3>' +
        '<p class="bl-empty-body">Block tables, rooms, or the whole restaurant for maintenance, private events, or holidays.</p>' +
        '<button id="bl-empty-add" class="btn btn-primary" style="border-radius:var(--radius-md)">Add first blackout</button>' +
      '</div>';
    }

    var now = new Date();
    return '<div class="bl-list" role="list" aria-label="Blackout list">' +
      _blackouts.map(function (bl) {
        var start   = new Date(bl.starts_at);
        var end     = new Date(bl.end_at);
        var isActive = now >= start && now <= end;
        var state   = isActive ? 'active' : 'upcoming';
        var stateLabel = isActive ? 'Active now' : 'Upcoming';

        var scope = getScopeLabel(bl);
        var effect = getEffectLabel(bl);

        var tz = (window.COV.state.restaurant || {}).timezone || 'UTC';
        var startStr = utils.formatDate(bl.starts_at, tz);
        var endStr   = utils.formatDate(bl.end_at, tz);

        return '<div class="bl-item bl-' + state + '" role="listitem" data-blid="' + esc(bl.id) + '">' +
          '<div class="bl-icon ' + state + '" aria-hidden="true">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>' +
          '</div>' +
          '<div class="bl-body">' +
            '<div class="bl-scope">' + esc(scope) + '</div>' +
            '<div class="bl-title">' + esc(bl.reason || 'Blocked') + '</div>' +
            '<div class="bl-meta">' +
              '<strong>' + esc(stateLabel) + '</strong> &bull; ' +
              esc(startStr) + ' → ' + esc(endStr) +
            '</div>' +
            '<div class="bl-effect">' + esc(effect) + '</div>' +
          '</div>' +
          '<div class="bl-actions">' +
            '<button class="btn btn-danger bl-delete-btn" data-blid="' + esc(bl.id) + '" style="min-height:32px;font-size:13px;padding:0 var(--space-3);border-radius:var(--radius-sm)" aria-label="Delete blackout: ' + esc(bl.reason || 'Blocked') + '">Delete</button>' +
          '</div>' +
        '</div>';
      }).join('') +
    '</div>';
  }

  function getScopeLabel(bl) {
    if (!bl.table_id) return 'Whole restaurant';
    var tbl = _tables.find(function (t) { return t.id === bl.table_id; });
    if (tbl) {
      var room = _rooms.find(function (r) { return r.id === tbl.room_id; });
      return 'Table ' + tbl.label + (room ? ' (' + room.name + ')' : '');
    }
    return 'Specific table';
  }

  function getEffectLabel(bl) {
    if (!bl.table_id) {
      return 'All tables removed from availability + shown blocked on floor.';
    }
    var tbl = _tables.find(function (t) { return t.id === bl.table_id; });
    if (tbl) return 'Table ' + tbl.label + ' removed from availability + shown blocked on floor.';
    return 'Table removed from availability + shown blocked on floor.';
  }

  /* ======================================================================
     WIRE
  ====================================================================== */
  function wirePage(sectionEl) {
    var addBtn = sectionEl.querySelector('#bl-add-btn');
    if (addBtn) addBtn.addEventListener('click', function () { openBlackoutModal(); });

    var emptyAdd = sectionEl.querySelector('#bl-empty-add');
    if (emptyAdd) emptyAdd.addEventListener('click', function () { openBlackoutModal(); });

    var listWrap = sectionEl.querySelector('#bl-list-wrap');
    if (listWrap) {
      listWrap.addEventListener('click', function (e) {
        var delBtn = e.target.closest('.bl-delete-btn');
        if (delBtn) deleteBlackout(delBtn.dataset.blid, sectionEl);
      });
    }
  }

  /* ======================================================================
     MODAL — create blackout
  ====================================================================== */
  function openBlackoutModal() {
    var old = document.getElementById('bl-modal');
    if (old) old.remove();

    var rest = window.COV.state.restaurant || {};
    var tz   = rest.timezone || 'UTC';

    /* default: now → now+3h */
    var nowLocal  = localDatetimeValue(new Date(), tz);
    var end3h     = localDatetimeValue(new Date(Date.now() + 3 * 3600 * 1000), tz);

    /* scope options: whole restaurant + each table */
    var scopeOptions = '<option value="">Whole restaurant</option>';
    _rooms.forEach(function (room) {
      var roomTables = _tables.filter(function (t) { return t.room_id === room.id && t.is_active; });
      if (!roomTables.length) return;
      scopeOptions += '<optgroup label="' + esc(room.name) + '">';
      roomTables.forEach(function (t) {
        scopeOptions += '<option value="' + esc(t.id) + '">Table ' + esc(t.label) + '</option>';
      });
      scopeOptions += '</optgroup>';
    });

    var overlay = document.createElement('div');
    overlay.id = 'bl-modal';
    overlay.className = 'modal-overlay open';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'bl-modal-title');
    overlay.innerHTML =
      '<div class="modal" style="max-width:460px">' +
        '<div class="modal-head">' +
          '<h2 class="modal-title" id="bl-modal-title">Add blackout</h2>' +
          '<button class="icon-btn" id="bl-modal-close" aria-label="Close">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
          '</button>' +
        '</div>' +
        '<div class="field">' +
          '<label for="bl-scope">Scope (table or whole restaurant)</label>' +
          '<select id="bl-scope" class="input select">' + scopeOptions + '</select>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr));gap:var(--space-4)">' +
          '<div class="field"><label for="bl-start">Starts at</label><input id="bl-start" class="input" type="datetime-local" value="' + esc(nowLocal) + '" required></div>' +
          '<div class="field"><label for="bl-end">Ends at</label><input id="bl-end" class="input" type="datetime-local" value="' + esc(end3h) + '" required></div>' +
        '</div>' +
        '<div class="field"><label for="bl-reason">Reason</label>' +
          '<select id="bl-reason" class="input select">' +
            '<option value="maintenance">Maintenance</option>' +
            '<option value="private-event">Private event</option>' +
            '<option value="holiday">Holiday / Closure</option>' +
            '<option value="other">Other</option>' +
          '</select>' +
        '</div>' +
        '<div class="field"><label for="bl-reason-note">Note (optional)</label><input id="bl-reason-note" class="input" type="text" placeholder="e.g. Birthday party, AC repair"></div>' +
        '<p style="font-size:13px;color:var(--color-text-muted);margin-bottom:var(--space-4);line-height:1.5">Times are in the restaurant\'s timezone: <strong>' + esc(tz) + '</strong>. The blocked window will be removed from availability and shown as blocked on the floor.</p>' +
        '<div style="display:flex;gap:var(--space-3)">' +
          '<button id="bl-modal-cancel" class="btn btn-secondary" style="flex:1;border-radius:var(--radius-md)">Cancel</button>' +
          '<button id="bl-modal-save" class="btn btn-primary" style="flex:2;border-radius:var(--radius-md)">Create blackout</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    function closeModal() { overlay.remove(); }
    overlay.querySelector('#bl-modal-close').addEventListener('click', closeModal);
    overlay.querySelector('#bl-modal-cancel').addEventListener('click', closeModal);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });
    overlay.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });

    overlay.querySelector('#bl-modal-save').addEventListener('click', async function () {
      var tableId = (overlay.querySelector('#bl-scope') || {}).value || null;
      var startVal = (overlay.querySelector('#bl-start') || {}).value || '';
      var endVal   = (overlay.querySelector('#bl-end') || {}).value || '';
      var reasonVal = (overlay.querySelector('#bl-reason') || {}).value || 'other';
      var noteVal   = (overlay.querySelector('#bl-reason-note') || {}).value || '';

      if (!startVal || !endVal) { toast('Start and end times are required.', 'err'); return; }

      var startsAt = localDatetimeToUTC(startVal, tz);
      var endsAt   = localDatetimeToUTC(endVal, tz);

      if (new Date(endsAt) <= new Date(startsAt)) {
        toast('End time must be after start time.', 'err'); return;
      }

      var reason = reasonVal + (noteVal ? ': ' + noteVal : '');
      var rest   = window.COV.state.restaurant;

      var saveBtn = overlay.querySelector('#bl-modal-save');
      saveBtn.disabled = true; saveBtn.textContent = 'Creating…';

      try {
        var created = await data.blackouts.create({
          restaurant_id: rest.id,
          table_id:      tableId || null,
          starts_at:     startsAt,
          end_at:        endsAt,
          reason:        reason,
        });
        _blackouts.push(created);
        /* re-sort */
        _blackouts.sort(function (a, b) { return new Date(a.starts_at) - new Date(b.starts_at); });
        var listWrap = document.getElementById('bl-list-wrap');
        if (listWrap) listWrap.innerHTML = renderListHTML();
        /* re-wire list */
        var sectionEl = document.getElementById('section-blackouts');
        if (sectionEl) {
          var lw = sectionEl.querySelector('#bl-list-wrap');
          if (lw) {
            lw.addEventListener('click', function (e) {
              var delBtn = e.target.closest('.bl-delete-btn');
              if (delBtn) deleteBlackout(delBtn.dataset.blid, sectionEl);
            });
          }
          var emptyAdd = sectionEl.querySelector('#bl-empty-add');
          if (emptyAdd) emptyAdd.addEventListener('click', function () { openBlackoutModal(); });
        }
        toast('Blackout created!', 'ok');
        closeModal();
      } catch (e) {
        console.error('[coverly:blackouts] create', e);
        toast('Could not create blackout. Please try again.', 'err');
        saveBtn.disabled = false; saveBtn.textContent = 'Create blackout';
      }
    });

    setTimeout(function () { var f = overlay.querySelector('#bl-start'); if (f) f.focus(); }, 50);
  }

  /* ======================================================================
     DELETE
  ====================================================================== */
  async function deleteBlackout(blId, sectionEl) {
    var bl = _blackouts.find(function (b) { return b.id === blId; });
    if (!bl) return;
    var label = bl.reason || 'this blackout';
    if (!(await window.PLAT.confirmDialog('Delete blackout "' + label + '"? This will restore availability for the affected window.', { confirmLabel: 'Delete', danger: true }))) return;
    try {
      await data.blackouts.remove(blId);
      _blackouts = _blackouts.filter(function (b) { return b.id !== blId; });
      var listWrap = sectionEl.querySelector('#bl-list-wrap');
      if (listWrap) listWrap.innerHTML = renderListHTML();
      /* re-wire empty state add button */
      var emptyAdd = sectionEl.querySelector('#bl-empty-add');
      if (emptyAdd) emptyAdd.addEventListener('click', function () { openBlackoutModal(); });
      toast('Blackout deleted. Availability restored.', 'ok');
    } catch (e) {
      console.error('[coverly:blackouts] delete', e);
      toast('Could not delete blackout. Please try again.', 'err');
    }
  }

  /* ======================================================================
     DATE HELPERS
  ====================================================================== */
  function localDatetimeValue(date, tz) {
    try {
      /* format as YYYY-MM-DDTHH:MM in the restaurant's local timezone */
      var parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false,
      }).formatToParts(date);
      var m = {};
      parts.forEach(function (p) { m[p.type] = p.value; });
      return m.year + '-' + m.month + '-' + m.day + 'T' + (m.hour === '24' ? '00' : m.hour) + ':' + m.minute;
    } catch (e) {
      /* fallback: just use ISO */
      return date.toISOString().slice(0, 16);
    }
  }

  function localDatetimeToUTC(localStr, tz) {
    /* localStr = "YYYY-MM-DDTHH:MM", tz = IANA timezone */
    /* We interpret the datetime-local value as being in `tz`. */
    try {
      /* Use Intl to find the UTC offset for this moment in the given tz */
      var naive = new Date(localStr + ':00');
      /* Approximate: find the offset by comparing what Intl formats as local */
      var parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
      }).formatToParts(naive);
      var m = {};
      parts.forEach(function (p) { m[p.type] = p.value; });
      var localFormatted = m.year + '-' + m.month + '-' + m.day + 'T' +
        (m.hour === '24' ? '00' : m.hour) + ':' + m.minute + ':' + m.second;
      var diff = naive.getTime() - new Date(localFormatted).getTime();
      return new Date(new Date(localStr + ':00').getTime() + diff).toISOString();
    } catch (e) {
      return new Date(localStr + ':00').toISOString();
    }
  }

  /* ======================================================================
     EXPORT
  ====================================================================== */
  window.COV = window.COV || {};
  window.COV.screens = window.COV.screens || {};
  window.COV.screens['blackouts'] = { render: render };

}());
