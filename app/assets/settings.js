/* ============================================================================
   Coverly — Settings screen
   Registers: window.COV.screens.settings = { render(sectionEl) }
   Owns:      assets/settings.js  (no edits to index.html or data.js)
   ============================================================================ */
(function () {
  'use strict';

  /* ---- shorthand aliases ---- */
  var data  = window.COV.data;
  var utils = window.COV.utils;
  var esc   = utils.esc;
  var toast = utils.toast;
  var $     = utils.el;
  var $$    = utils.els;

  /* ---- inject styles once ---- */
  (function injectStyles() {
    if (document.getElementById('cov-settings-css')) return;
    var s = document.createElement('style');
    s.id = 'cov-settings-css';
    s.textContent = [
      /* settings layout */
      '.set-page{max-width:760px;margin:0 auto}',
      '.set-section{background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-lg);margin-bottom:var(--space-5);overflow:hidden}',
      '.set-section-head{padding:var(--space-5) var(--space-6);border-bottom:1px solid var(--color-border);display:flex;align-items:center;justify-content:space-between;gap:var(--space-3);flex-wrap:wrap}',
      '.set-section-title{font-size:16px;font-weight:600;color:var(--color-text-primary);letter-spacing:-0.01em}',
      '.set-section-body{padding:var(--space-5) var(--space-6)}',
      '.set-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)}',
      '@media(max-width:600px){.set-grid-2{grid-template-columns:1fr}}',
      /* color swatch */
      '.set-color-wrap{display:flex;align-items:center;gap:var(--space-3);flex-wrap:wrap}',
      '.set-color-preview{width:40px;height:40px;border-radius:var(--radius-md);border:2px solid var(--color-border);flex-shrink:0;cursor:pointer}',
      /* link display */
      '.set-link-box{display:flex;align-items:center;gap:var(--space-3);background:var(--color-surface-raised);border:1px solid var(--color-border);border-radius:var(--radius-md);padding:var(--space-3) var(--space-4);flex-wrap:wrap}',
      '.set-link-text{font-size:13px;color:var(--color-text-secondary);word-break:break-all;flex:1;min-width:0}',
      /* service period list */
      '.sp-item{display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-4);padding:var(--space-4) 0;border-bottom:1px solid var(--color-border)}',
      '.sp-item:last-child{border-bottom:none}',
      '.sp-info{flex:1;min-width:0}',
      '.sp-name{font-size:15px;font-weight:500;color:var(--color-text-primary);margin-bottom:var(--space-1)}',
      '.sp-meta{font-size:13px;color:var(--color-text-muted);line-height:1.6}',
      '.sp-actions{display:flex;gap:var(--space-2);flex-shrink:0;align-items:flex-start}',
      '.sp-empty{text-align:center;padding:var(--space-8) 0;color:var(--color-text-muted);font-size:14px}',
      /* day chips */
      '.day-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:var(--space-2)}',
      '.day-chip{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:50%;border:1px solid var(--color-border);background:var(--color-surface);font-size:12px;font-weight:500;cursor:pointer;color:var(--color-text-secondary);transition:background var(--duration-fast),color var(--duration-fast),border-color var(--duration-fast)}',
      '.day-chip.on{background:var(--color-primary);color:#fff;border-color:var(--color-primary)}',
      '.day-chip:focus-visible{outline:2px solid var(--color-primary);outline-offset:2px}',
      /* toggle */
      '.toggle-wrap{display:flex;align-items:center;justify-content:space-between;padding:var(--space-3) 0}',
      '.toggle-label{font-size:15px;font-weight:500;color:var(--color-text-primary)}',
      '.toggle-sub{font-size:13px;color:var(--color-text-muted);margin-top:2px}',
      '.toggle{position:relative;display:inline-block;width:44px;height:24px;flex-shrink:0}',
      '.toggle input{opacity:0;width:0;height:0}',
      '.toggle-slider{position:absolute;cursor:pointer;inset:0;background:var(--color-border-strong);border-radius:var(--radius-full);transition:background var(--duration-fast)}',
      '.toggle-slider::before{content:"";position:absolute;left:3px;top:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:transform var(--duration-fast);box-shadow:0 1px 3px rgba(0,0,0,0.2)}',
      '.toggle input:checked + .toggle-slider{background:var(--color-primary)}',
      '.toggle input:checked + .toggle-slider::before{transform:translateX(20px)}',
      '.toggle input:focus-visible + .toggle-slider{outline:2px solid var(--color-primary);outline-offset:2px}',
      /* save button area */
      '.set-save-row{display:flex;justify-content:flex-end;padding-top:var(--space-4);border-top:1px solid var(--color-border);margin-top:var(--space-2)}',
      /* deposit row */
      '.deposit-amount-row{display:flex;align-items:center;gap:var(--space-3);margin-top:var(--space-3)}',
      '.deposit-amount-row .input{max-width:160px}',
      /* sp modal */
      '.sp-modal-grid{display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)}',
      '@media(max-width:480px){.sp-modal-grid{grid-template-columns:1fr}}',
    ].join('');
    document.head.appendChild(s);
  }());

  /* ======================================================================
     State
  ====================================================================== */
  var _rest    = null;
  var _periods = [];
  var _tables  = [];
  var _rooms   = [];
  var _loaded  = false;

  /* ======================================================================
     Entry point — called every time the section is navigated to
  ====================================================================== */
  function render(sectionEl) {
    if (!sectionEl) return;
    sectionEl.innerHTML = '<div class="set-page" id="set-root"><div role="status" aria-live="polite" style="padding:var(--space-8);text-align:center;color:var(--color-text-muted)"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;animation:spin 1s linear infinite;margin-bottom:var(--space-2)" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg><br>Loading settings…</div></div>';
    if (!document.getElementById('cov-spin-kf')) {
      var kf = document.createElement('style');
      kf.id = 'cov-spin-kf';
      kf.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
      document.head.appendChild(kf);
    }
    loadAll(sectionEl);
  }

  async function loadAll(sectionEl) {
    var rest = window.COV.state && window.COV.state.restaurant;
    if (!rest) {
      sectionEl.innerHTML = '<div class="set-page"><div style="padding:var(--space-8);text-align:center;color:var(--color-destructive)">No restaurant found. Please reload.</div></div>';
      return;
    }
    try {
      var results = await Promise.all([
        data.servicePeriods.list(rest.id),
        data.tables.list(rest.id),
        data.rooms.list(rest.id),
      ]);
      _rest    = rest;
      _periods = results[0] || [];
      _tables  = results[1] || [];
      _rooms   = results[2] || [];
      _loaded  = true;
      drawPage(sectionEl);
    } catch (e) {
      console.error('[coverly:settings] loadAll error', e);
      sectionEl.innerHTML = '<div class="set-page"><div style="padding:var(--space-8);text-align:center;color:var(--color-destructive)">Failed to load settings. <button onclick="location.reload()" style="color:var(--color-primary);background:none;border:none;cursor:pointer;text-decoration:underline">Reload</button></div></div>';
    }
  }

  /* ======================================================================
     DRAW — full page HTML
  ====================================================================== */
  var DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var TIMEZONES = [
    'America/New_York','America/Chicago','America/Denver','America/Los_Angeles',
    'Europe/London','Europe/Paris','Europe/Amsterdam','Asia/Dubai','Asia/Riyadh',
    'Australia/Sydney','Asia/Singapore','UTC',
  ];

  function drawPage(sectionEl) {
    var r = _rest;

    /* --- booking link --- */
    var slug       = r.slug || '';
    var bookingUrl = window.location.origin + window.location.pathname.replace(/\/index\.html$/, '/').replace(/\/[^/]*$/, '/') + 'book.html?r=' + encodeURIComponent(slug);

    /* --- tz options --- */
    var tzOpts = TIMEZONES.map(function (tz) {
      return '<option value="' + esc(tz) + '"' + (r.timezone === tz ? ' selected' : '') + '>' + esc(tz) + '</option>';
    }).join('');

    sectionEl.innerHTML = '<div class="set-page" id="set-root">' +

      /* ======== RESTAURANT PROFILE ======== */
      '<section class="set-section" aria-labelledby="set-h-profile">' +
        '<div class="set-section-head"><h2 class="set-section-title" id="set-h-profile">Restaurant profile</h2></div>' +
        '<div class="set-section-body">' +
          '<div class="set-grid-2">' +
            field('set-name',    'Restaurant name',  '<input id="set-name" class="input" type="text" autocomplete="organization" value="' + esc(r.name||'') + '" required>') +
            field('set-slug',    'URL slug',         '<input id="set-slug" class="input" type="text" pattern="[a-z0-9-]+" placeholder="my-restaurant" value="' + esc(r.slug||'') + '" aria-describedby="set-slug-hint">') +
          '</div>' +
          '<p id="set-slug-hint" style="font-size:13px;color:var(--color-text-muted);margin-top:-12px;margin-bottom:var(--space-4)">Lowercase letters, numbers and hyphens only.</p>' +
          '<div class="set-grid-2">' +
            field('set-phone',   'Phone number',     '<input id="set-phone" class="input" type="tel" autocomplete="tel" value="' + esc(r.phone||'') + '">') +
            field('set-tz',      'Timezone',         '<select id="set-tz" class="input select">' + tzOpts + '</select>') +
          '</div>' +
          field('set-address',  'Address',          '<input id="set-address" class="input" type="text" autocomplete="street-address" value="' + esc(r.address||'') + '">') +
          '<div class="field">' +
            '<label for="set-brand-color">Brand colour</label>' +
            '<div class="set-color-wrap">' +
              '<input type="color" id="set-brand-color" value="' + esc(r.brand_color||'#C4522A') + '" style="width:40px;height:40px;padding:0;border:none;border-radius:var(--radius-md);cursor:pointer;background:none" aria-label="Brand colour picker">' +
              '<input id="set-brand-color-text" class="input" type="text" value="' + esc(r.brand_color||'#C4522A') + '" placeholder="#C4522A" style="max-width:140px" aria-label="Brand colour hex">' +
            '</div>' +
          '</div>' +
          field('set-logo', 'Logo URL', '<input id="set-logo" class="input" type="url" placeholder="https://example.com/logo.png" value="' + esc(r.logo_url||'') + '" autocomplete="url">') +
          '<div class="set-save-row"><button id="set-save-profile" class="btn btn-primary" style="min-height:40px;font-size:14px;padding:0 var(--space-5);border-radius:var(--radius-md)">Save profile</button></div>' +
        '</div>' +
      '</section>' +

      /* ======== BOOKING LINK ======== */
      '<section class="set-section" aria-labelledby="set-h-link">' +
        '<div class="set-section-head"><h2 class="set-section-title" id="set-h-link">Public booking link</h2></div>' +
        '<div class="set-section-body">' +
          '<div class="set-link-box">' +
            '<span class="set-link-text" id="set-link-display" aria-label="Booking link">' + esc(bookingUrl) + '</span>' +
            '<button id="set-copy-link" class="btn btn-secondary" style="min-height:36px;font-size:13px;padding:0 var(--space-4);border-radius:var(--radius-full);flex-shrink:0" aria-label="Copy booking link">' +
              '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>' +
              ' Copy' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</section>' +

      /* ======== BOOKING RULES ======== */
      '<section class="set-section" aria-labelledby="set-h-rules">' +
        '<div class="set-section-head"><h2 class="set-section-title" id="set-h-rules">Booking rules</h2></div>' +
        '<div class="set-section-body">' +
          '<div class="set-grid-2">' +
            numField('set-turn',   'Default turn time (min)',  r.default_turn_minutes || 90,  1, 360) +
            numField('set-buffer', 'Buffer between turns (min)', r.buffer_minutes || 15, 0, 120) +
          '</div>' +
          '<div class="set-grid-2" style="margin-top:var(--space-1)">' +
            numField('set-maxparty', 'Max online party size', r.max_party_online || 10, 1, 50) +
            numField('set-vip-threshold', 'VIP visit threshold', r.vip_visit_threshold || 5, 1, 100) +
          '</div>' +
          '<div class="toggle-wrap" style="margin-top:var(--space-3)">' +
            '<div><div class="toggle-label">Online booking enabled</div><div class="toggle-sub">Turn off to pause all new online bookings.</div></div>' +
            '<label class="toggle" aria-label="Toggle online booking">' +
              '<input type="checkbox" id="set-booking-enabled"' + (r.booking_enabled ? ' checked' : '') + '>' +
              '<span class="toggle-slider"></span>' +
            '</label>' +
          '</div>' +
          '<div class="set-save-row"><button id="set-save-rules" class="btn btn-primary" style="min-height:40px;font-size:14px;padding:0 var(--space-5);border-radius:var(--radius-md)">Save rules</button></div>' +
        '</div>' +
      '</section>' +

      /* ======== DEPOSITS ======== */
      '<section class="set-section" aria-labelledby="set-h-deposit">' +
        '<div class="set-section-head"><h2 class="set-section-title" id="set-h-deposit">Deposit settings</h2></div>' +
        '<div class="set-section-body">' +
          '<div class="toggle-wrap">' +
            '<div><div class="toggle-label">Require deposit</div><div class="toggle-sub">Guests must pay a deposit at booking time.</div></div>' +
            '<label class="toggle" aria-label="Toggle deposit requirement">' +
              '<input type="checkbox" id="set-deposit-req"' + (r.deposit_required ? ' checked' : '') + '>' +
              '<span class="toggle-slider"></span>' +
            '</label>' +
          '</div>' +
          '<div class="deposit-amount-row" id="set-deposit-amt-row"' + (!r.deposit_required ? ' style="display:none"' : '') + '>' +
            '<label for="set-deposit-amt" style="font-size:14px;font-weight:500;flex-shrink:0">Amount (pence/cents):</label>' +
            '<input id="set-deposit-amt" class="input" type="number" min="0" max="99900" step="100" value="' + esc(String(r.deposit_cents||0)) + '" aria-describedby="set-deposit-hint">' +
          '</div>' +
          '<p id="set-deposit-hint" style="font-size:12px;color:var(--color-text-muted);margin-top:var(--space-2)">Enter amount in lowest currency unit (e.g. 1000 = £10.00). Stripe integration is stubbed.</p>' +
          '<div class="set-save-row"><button id="set-save-deposit" class="btn btn-primary" style="min-height:40px;font-size:14px;padding:0 var(--space-5);border-radius:var(--radius-md)">Save deposit</button></div>' +
        '</div>' +
      '</section>' +

      /* ======== SERVICE PERIODS ======== */
      '<section class="set-section" aria-labelledby="set-h-periods">' +
        '<div class="set-section-head">' +
          '<h2 class="set-section-title" id="set-h-periods">Service periods</h2>' +
          '<button id="set-add-period" class="btn btn-secondary" style="min-height:36px;font-size:13px;padding:0 var(--space-4);border-radius:var(--radius-md)" aria-label="Add service period">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
            ' Add period' +
          '</button>' +
        '</div>' +
        '<div class="set-section-body" id="set-periods-body">' + renderPeriodsHTML() + '</div>' +
      '</section>' +

    '</div>'; /* /set-page */

    wireSettings(sectionEl);
  }

  function field(id, label, inputHtml) {
    return '<div class="field"><label for="' + id + '">' + esc(label) + '</label>' + inputHtml + '</div>';
  }
  function numField(id, label, val, min, max) {
    return '<div class="field"><label for="' + id + '">' + esc(label) + '</label>' +
      '<input id="' + id + '" class="input" type="number" min="' + min + '" max="' + max + '" value="' + esc(String(val)) + '"></div>';
  }

  function renderPeriodsHTML() {
    if (!_periods.length) {
      return '<div class="sp-empty">No service periods yet. Add one to define when guests can book.</div>';
    }
    return _periods.map(function (sp) {
      var days = (sp.days_of_week || []).map(function (d) { return DAY_NAMES[d]; }).join(', ');
      return '<div class="sp-item" data-spid="' + esc(sp.id) + '">' +
        '<div class="sp-info">' +
          '<div class="sp-name">' + esc(sp.name) + '</div>' +
          '<div class="sp-meta">' +
            esc(days || 'No days set') + ' &bull; ' +
            esc(sp.start_time||'') + '–' + esc(sp.end_time||'') +
            ' (last seating ' + esc(sp.last_seating_time||'') + ')' +
            ' &bull; ' + esc(String(sp.slot_interval_minutes||30)) + ' min slots' +
          '</div>' +
        '</div>' +
        '<div class="sp-actions">' +
          '<button class="btn btn-secondary sp-edit-btn" data-spid="' + esc(sp.id) + '" style="min-height:32px;font-size:13px;padding:0 var(--space-3);border-radius:var(--radius-sm)" aria-label="Edit ' + esc(sp.name) + '">Edit</button>' +
          '<button class="btn btn-danger sp-delete-btn" data-spid="' + esc(sp.id) + '" style="min-height:32px;font-size:13px;padding:0 var(--space-3);border-radius:var(--radius-sm)" aria-label="Delete ' + esc(sp.name) + '">Delete</button>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  /* ======================================================================
     WIRE — event handlers
  ====================================================================== */
  function wireSettings(sectionEl) {
    /* colour sync */
    var colorPicker = sectionEl.querySelector('#set-brand-color');
    var colorText   = sectionEl.querySelector('#set-brand-color-text');
    if (colorPicker && colorText) {
      colorPicker.addEventListener('input', function () { colorText.value = colorPicker.value; });
      colorText.addEventListener('input', function () {
        if (/^#[0-9A-Fa-f]{6}$/.test(colorText.value)) colorPicker.value = colorText.value;
      });
    }

    /* deposit toggle */
    var depositReq = sectionEl.querySelector('#set-deposit-req');
    var depositAmt = sectionEl.querySelector('#set-deposit-amt-row');
    if (depositReq && depositAmt) {
      depositReq.addEventListener('change', function () {
        depositAmt.style.display = depositReq.checked ? 'flex' : 'none';
      });
    }

    /* copy booking link */
    var copyBtn = sectionEl.querySelector('#set-copy-link');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        var txt = (sectionEl.querySelector('#set-link-display') || {}).textContent || '';
        if (!txt) return;
        navigator.clipboard.writeText(txt)
          .then(function () { toast('Booking link copied!', 'ok'); })
          .catch(function () { toast('Could not copy to clipboard', 'err'); });
      });
    }

    /* save profile */
    var saveProfileBtn = sectionEl.querySelector('#set-save-profile');
    if (saveProfileBtn) {
      saveProfileBtn.addEventListener('click', function () { saveProfile(sectionEl); });
    }

    /* save rules */
    var saveRulesBtn = sectionEl.querySelector('#set-save-rules');
    if (saveRulesBtn) {
      saveRulesBtn.addEventListener('click', function () { saveRules(sectionEl); });
    }

    /* save deposit */
    var saveDepositBtn = sectionEl.querySelector('#set-save-deposit');
    if (saveDepositBtn) {
      saveDepositBtn.addEventListener('click', function () { saveDeposit(sectionEl); });
    }

    /* add period */
    var addPeriodBtn = sectionEl.querySelector('#set-add-period');
    if (addPeriodBtn) {
      addPeriodBtn.addEventListener('click', function () { openPeriodModal(null); });
    }

    /* period edit/delete (delegated) */
    var periodsBody = sectionEl.querySelector('#set-periods-body');
    if (periodsBody) {
      periodsBody.addEventListener('click', function (e) {
        var editBtn   = e.target.closest('.sp-edit-btn');
        var deleteBtn = e.target.closest('.sp-delete-btn');
        if (editBtn)   openPeriodModal(editBtn.dataset.spid);
        if (deleteBtn) deletePeriod(deleteBtn.dataset.spid, sectionEl);
      });
    }
  }

  /* ======================================================================
     SAVE handlers
  ====================================================================== */
  async function saveProfile(sectionEl) {
    var name   = (sectionEl.querySelector('#set-name') || {}).value || '';
    var slug   = (sectionEl.querySelector('#set-slug') || {}).value || '';
    var phone  = (sectionEl.querySelector('#set-phone') || {}).value || '';
    var tz     = (sectionEl.querySelector('#set-tz') || {}).value || '';
    var addr   = (sectionEl.querySelector('#set-address') || {}).value || '';
    var color  = (sectionEl.querySelector('#set-brand-color-text') || {}).value || '';
    var logo   = (sectionEl.querySelector('#set-logo') || {}).value || '';

    if (!name.trim()) { toast('Restaurant name is required.', 'err'); return; }
    if (slug && !/^[a-z0-9-]+$/.test(slug)) { toast('Slug may only contain lowercase letters, numbers, and hyphens.', 'err'); return; }
    if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) { toast('Enter a valid hex colour like #C4522A.', 'err'); return; }

    var btn = sectionEl.querySelector('#set-save-profile');
    btn.disabled = true; btn.textContent = 'Saving…';
    try {
      var updated = await data.restaurant.update(_rest.id, {
        name: name.trim(), slug: slug.trim() || utils.slugify(name.trim()),
        phone: phone.trim(), timezone: tz, address: addr.trim(),
        brand_color: color || null, logo_url: logo.trim() || null,
      });
      _rest = updated;
      window.COV.state.restaurant = updated;
      /* update sidebar name */
      var sidebarName = document.getElementById('sidebar-rest-name');
      if (sidebarName) sidebarName.textContent = updated.name || 'My Restaurant';
      var sidebarAvatar = document.getElementById('sidebar-avatar');
      if (sidebarAvatar) sidebarAvatar.textContent = (updated.name || '?').charAt(0).toUpperCase();
      /* update booking link */
      var linkEl = sectionEl.querySelector('#set-link-display');
      if (linkEl) {
        var newUrl = window.location.origin + window.location.pathname.replace(/\/index\.html$/, '/').replace(/\/[^/]*$/, '/') + 'book.html?r=' + encodeURIComponent(updated.slug || '');
        linkEl.textContent = newUrl;
      }
      toast('Profile saved!', 'ok');
    } catch (e) {
      console.error('[coverly:settings] saveProfile', e);
      toast('Save failed. Please try again.', 'err');
    } finally {
      btn.disabled = false; btn.textContent = 'Save profile';
    }
  }

  async function saveRules(sectionEl) {
    var turn    = parseInt((sectionEl.querySelector('#set-turn') || {}).value || '90', 10);
    var buffer  = parseInt((sectionEl.querySelector('#set-buffer') || {}).value || '15', 10);
    var maxP    = parseInt((sectionEl.querySelector('#set-maxparty') || {}).value || '10', 10);
    var vipT    = parseInt((sectionEl.querySelector('#set-vip-threshold') || {}).value || '5', 10);
    var enabled = (sectionEl.querySelector('#set-booking-enabled') || {}).checked;

    if (isNaN(turn) || turn < 1)   { toast('Turn time must be at least 1 minute.', 'err'); return; }
    if (isNaN(buffer) || buffer < 0){ toast('Buffer must be 0 or more minutes.', 'err'); return; }
    if (isNaN(maxP) || maxP < 1)   { toast('Max party size must be at least 1.', 'err'); return; }

    var btn = sectionEl.querySelector('#set-save-rules');
    btn.disabled = true; btn.textContent = 'Saving…';
    try {
      var updated = await data.restaurant.update(_rest.id, {
        default_turn_minutes: turn,
        buffer_minutes:       buffer,
        max_party_online:     maxP,
        vip_visit_threshold:  vipT,
        booking_enabled:      enabled,
      });
      _rest = updated;
      window.COV.state.restaurant = updated;
      toast('Booking rules saved!', 'ok');
    } catch (e) {
      console.error('[coverly:settings] saveRules', e);
      toast('Save failed. Please try again.', 'err');
    } finally {
      btn.disabled = false; btn.textContent = 'Save rules';
    }
  }

  async function saveDeposit(sectionEl) {
    var req  = (sectionEl.querySelector('#set-deposit-req') || {}).checked;
    var amt  = parseInt((sectionEl.querySelector('#set-deposit-amt') || {}).value || '0', 10);
    if (req && (isNaN(amt) || amt < 0)) { toast('Enter a valid deposit amount.', 'err'); return; }

    var btn = sectionEl.querySelector('#set-save-deposit');
    btn.disabled = true; btn.textContent = 'Saving…';
    try {
      var updated = await data.restaurant.update(_rest.id, {
        deposit_required: req,
        deposit_cents:    req ? amt : 0,
      });
      _rest = updated;
      window.COV.state.restaurant = updated;
      toast('Deposit settings saved!', 'ok');
    } catch (e) {
      console.error('[coverly:settings] saveDeposit', e);
      toast('Save failed. Please try again.', 'err');
    } finally {
      btn.disabled = false; btn.textContent = 'Save deposit';
    }
  }

  /* ======================================================================
     SERVICE PERIOD MODAL
  ====================================================================== */
  function openPeriodModal(spId) {
    var existing = spId ? _periods.find(function (p) { return p.id === spId; }) : null;
    var isNew    = !existing;
    var sp       = existing || { name: '', days_of_week: [0,1,2,3,4,5,6], start_time: '17:00', end_time: '22:00', last_seating_time: '21:30', slot_interval_minutes: 30 };

    /* remove old modal if any */
    var old = document.getElementById('sp-modal');
    if (old) old.remove();

    var daysHtml = DAY_NAMES.map(function (d, i) {
      var on = (sp.days_of_week || []).includes(i);
      return '<button type="button" class="day-chip' + (on ? ' on' : '') + '" data-day="' + i + '" aria-pressed="' + (on ? 'true' : 'false') + '" aria-label="' + d + '">' + d.charAt(0) + '</button>';
    }).join('');

    var overlay = document.createElement('div');
    overlay.id = 'sp-modal';
    overlay.className = 'modal-overlay open';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'sp-modal-title');
    overlay.innerHTML =
      '<div class="modal" style="max-width:500px">' +
        '<div class="modal-head">' +
          '<h2 class="modal-title" id="sp-modal-title">' + (isNew ? 'Add service period' : 'Edit service period') + '</h2>' +
          '<button class="icon-btn" id="sp-modal-close" aria-label="Close">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
          '</button>' +
        '</div>' +
        '<div class="field"><label for="sp-name">Period name (e.g. Dinner)</label><input id="sp-name" class="input" type="text" value="' + esc(sp.name) + '" required></div>' +
        '<div class="field"><label>Days of week</label><div class="day-chips" id="sp-days" role="group" aria-label="Days of week">' + daysHtml + '</div></div>' +
        '<div class="sp-modal-grid">' +
          field2('sp-start',   'Opens at',          '<input id="sp-start" class="input" type="time" value="' + esc(sp.start_time ? sp.start_time.slice(0,5) : '17:00') + '" required>') +
          field2('sp-end',     'Closes at',         '<input id="sp-end" class="input" type="time" value="' + esc(sp.end_time ? sp.end_time.slice(0,5) : '22:00') + '" required>') +
          field2('sp-last',    'Last seating',      '<input id="sp-last" class="input" type="time" value="' + esc(sp.last_seating_time ? sp.last_seating_time.slice(0,5) : '21:30') + '" required>') +
          field2('sp-interval','Slot interval (min)','<input id="sp-interval" class="input" type="number" min="5" max="120" value="' + esc(String(sp.slot_interval_minutes||30)) + '" required>') +
        '</div>' +
        '<div style="display:flex;gap:var(--space-3);margin-top:var(--space-5)">' +
          '<button id="sp-cancel" class="btn btn-secondary" style="flex:1;border-radius:var(--radius-md)">Cancel</button>' +
          '<button id="sp-save" class="btn btn-primary" style="flex:2;border-radius:var(--radius-md)">' + (isNew ? 'Add period' : 'Save changes') + '</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    /* day chips */
    overlay.querySelectorAll('.day-chip').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var on = btn.classList.toggle('on');
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      btn.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); btn.click(); }
      });
    });

    /* close */
    function closeModal() { overlay.remove(); }
    overlay.querySelector('#sp-modal-close').addEventListener('click', closeModal);
    overlay.querySelector('#sp-cancel').addEventListener('click', closeModal);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });
    overlay.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });

    /* save */
    overlay.querySelector('#sp-save').addEventListener('click', async function () {
      var name     = (overlay.querySelector('#sp-name') || {}).value || '';
      var start    = (overlay.querySelector('#sp-start') || {}).value || '';
      var end      = (overlay.querySelector('#sp-end') || {}).value || '';
      var last     = (overlay.querySelector('#sp-last') || {}).value || '';
      var interval = parseInt((overlay.querySelector('#sp-interval') || {}).value || '30', 10);
      var days     = [];
      overlay.querySelectorAll('.day-chip.on').forEach(function (c) { days.push(parseInt(c.dataset.day, 10)); });

      if (!name.trim()) { toast('Period name is required.', 'err'); return; }
      if (!days.length) { toast('Select at least one day.', 'err'); return; }
      if (!start || !end || !last) { toast('Start, end and last seating times are required.', 'err'); return; }
      if (isNaN(interval) || interval < 5) { toast('Slot interval must be at least 5 minutes.', 'err'); return; }

      var saveBtn = overlay.querySelector('#sp-save');
      saveBtn.disabled = true; saveBtn.textContent = 'Saving…';

      var fields = {
        restaurant_id:         _rest.id,
        name:                  name.trim(),
        days_of_week:          days.sort(function (a, b) { return a - b; }),
        start_time:            start + ':00',
        end_time:              end + ':00',
        last_seating_time:     last + ':00',
        slot_interval_minutes: interval,
      };

      try {
        if (isNew) {
          var created = await data.servicePeriods.create(fields);
          _periods.push(created);
          toast('Service period added!', 'ok');
        } else {
          var updated = await data.servicePeriods.update(spId, fields);
          _periods = _periods.map(function (p) { return p.id === spId ? updated : p; });
          toast('Service period updated!', 'ok');
        }
        /* re-render periods list without full page reload */
        var periodsBody = document.getElementById('set-periods-body');
        if (periodsBody) periodsBody.innerHTML = renderPeriodsHTML();
        closeModal();
      } catch (e) {
        console.error('[coverly:settings] savePeriod', e);
        toast('Save failed. Please try again.', 'err');
        saveBtn.disabled = false;
        saveBtn.textContent = isNew ? 'Add period' : 'Save changes';
      }
    });

    /* focus first field */
    setTimeout(function () { var f = overlay.querySelector('#sp-name'); if (f) f.focus(); }, 50);
  }

  function field2(id, label, inputHtml) {
    return '<div class="field"><label for="' + id + '">' + esc(label) + '</label>' + inputHtml + '</div>';
  }

  async function deletePeriod(spId, sectionEl) {
    var sp = _periods.find(function (p) { return p.id === spId; });
    if (!sp) return;
    if (!confirm('Delete service period "' + sp.name + '"? This will affect availability.')) return;
    try {
      await data.servicePeriods.remove(spId);
      _periods = _periods.filter(function (p) { return p.id !== spId; });
      var periodsBody = sectionEl.querySelector('#set-periods-body');
      if (periodsBody) periodsBody.innerHTML = renderPeriodsHTML();
      toast('Service period deleted.', 'ok');
    } catch (e) {
      console.error('[coverly:settings] deletePeriod', e);
      toast('Could not delete period. Please try again.', 'err');
    }
  }

  /* ======================================================================
     EXPORT
  ====================================================================== */
  window.COV = window.COV || {};
  window.COV.screens = window.COV.screens || {};
  window.COV.screens['settings'] = { render: render };

}());
