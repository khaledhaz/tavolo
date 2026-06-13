/* ============================================================
   Tavolo POS Terminal — pos-terminal.js
   Vanilla JS, no build step. Requires PLAT (platform.js).
   ============================================================ */
(function () {
  'use strict';

  /* ---- Constants ---- */
  var RESTAURANT_ID = 'a1000000-0000-0000-0000-000000000001';
  var CAT_COLORS = [
    'cat-color-0','cat-color-1','cat-color-2','cat-color-3',
    'cat-color-4','cat-color-5','cat-color-6','cat-color-7',
  ];

  /* ---- State ---- */
  var state = {
    staff:        null,   /* {id,name,role} */
    sessionId:    null,
    orderId:      null,
    orderType:    null,
    tableId:      null,
    tableLabel:   null,
    tabName:      null,
    guestCount:   1,
    currentSeat:  1,
    currentCourse:1,
    bill:         null,   /* latest pos_session_bill result */
    categories:   [],
    items:        [],     /* all items for restaurant */
    activeCatId:  null,
    searchQuery:  '',
    tables:       [],
    openSessions: {},     /* table_id → session */
    discounts:    [],
    activeShift:  null,
    modifierItem: null,   /* item pending modifier pick */
    modGroups:    [],     /* groups for current item */
    modSelected:  {},     /* group_id → [modifier_ids] */
    voidItemId:   null,
    itemNoteItem: null,  /* {item, modifierIds, seat} pending note prompt */
    editNoteItemId: null, /* order item uuid being note-edited */
    mgrPinResolve:null,
    mgrPinReject: null,
    mgrPinBuf:    '',
    loginBuf:     '',
    /* payment */
    payBill:      null,
    paySplitMode: 'whole',
    paySplitCustomCents: 0,
    paySplitEvenWays: 2,
    paySplitSeat: null,    /* seat key ('1','2','shared') for split-by-seat */
    paySplitItemIds: {},   /* order_item_id → true (split-by-item selection) */
    payPaidItemIds:  {},   /* order_item_id → true (covered by a prior split payment this session) */
    payTipPct:    0,       /* m3: default to No tip (QR flow parity) */
    payTipCents:  0,
    payMethod:    'cash',
    pendingDiscounts: [],  /* m2: check-level discounts held as {id,kind,value,…} until pay */
    /* guest receipt */
    lastClosedSession: null, /* {id,label} of the most recently closed check (reprint) */
    receiptReturnFocus: null, /* element to refocus when the receipt modal closes */
  };

  /* ---- PLAT helpers ---- */
  var sb, toast, money, esc;

  function initPlat() {
    sb    = window.PLAT.client;
    toast = window.PLAT.utils.toast;
    money = window.PLAT.utils.money;
    esc   = window.PLAT.utils.esc;
  }

  /* ============================================================
     OFFLINE BANNER + CONNECTION STATE
     ============================================================ */

  /* Create the banner DOM node once and insert it before the shell */
  var _offlineBanner = null;
  var _onlineRecoveryTimer = null;

  function _ensureBanner() {
    if (_offlineBanner) return _offlineBanner;
    _offlineBanner = document.createElement('div');
    _offlineBanner.id = 'pos-offline-banner';
    _offlineBanner.setAttribute('role', 'status');
    _offlineBanner.setAttribute('aria-live', 'polite');
    _offlineBanner.setAttribute('aria-atomic', 'true');
    /* Inline styles — independent of any loaded stylesheet */
    _offlineBanner.style.cssText = [
      'position:fixed;top:0;left:0;right:0;z-index:99998;',
      'padding:10px 18px;font-size:14px;font-weight:600;text-align:center;',
      'font-family:inherit;letter-spacing:.01em;transition:background .25s,color .25s;',
      'display:none;',
    ].join('');
    document.body.insertBefore(_offlineBanner, document.body.firstChild);
    return _offlineBanner;
  }

  function _setBannerOffline() {
    var b = _ensureBanner();
    if (_onlineRecoveryTimer) { clearTimeout(_onlineRecoveryTimer); _onlineRecoveryTimer = null; }
    b.style.cssText = b.style.cssText.replace('display:none', 'display:block');
    b.style.display = 'block';
    b.style.background = '#92400e';   /* amber-800 — passes 4.5:1 contrast on white text */
    b.style.color = '#fef3c7';         /* amber-100 */
    b.textContent = 'Offline — reconnecting… (orders will sync when back online)';
    /* Disable the Pay button while offline */
    _setPayButtonOffline(true);
  }

  function _setBannerOnline() {
    var b = _ensureBanner();
    b.style.background = '#065f46';   /* emerald-800 */
    b.style.color = '#d1fae5';         /* emerald-100 */
    b.textContent = 'Back online — synced';
    b.style.display = 'block';
    /* Re-enable Pay button */
    _setPayButtonOffline(false);
    /* Auto-hide after 3 s */
    _onlineRecoveryTimer = setTimeout(function () {
      b.style.display = 'none';
      _onlineRecoveryTimer = null;
    }, 3000);
  }

  function _setPayButtonOffline(isOffline) {
    var btn = el('btn-process-payment');
    var payBtn = el('btn-pay');
    if (btn) {
      btn.disabled = isOffline;
      if (isOffline) {
        btn.dataset._offlineLabel = btn.innerHTML;
        btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.56 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/></svg> Can\'t take payment while offline';
      } else {
        btn.innerHTML = btn.dataset._offlineLabel ||
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg> Process Payment';
      }
    }
    /* Also guard the Pay button on the order screen */
    if (payBtn) {
      payBtn.disabled = isOffline;
      payBtn.title = isOffline ? "Can't take payment while offline" : '';
    }
  }

  function _setupNetMonitor() {
    var net = window.PLAT && window.PLAT.net;
    if (!net) return;

    /* Sync initial state without debounce */
    if (!net.isOnline()) _setBannerOffline();

    net.onChange(function (nowOnline) {
      if (nowOnline) {
        _setBannerOnline();
        _replayOutbox();
      } else {
        _setBannerOffline();
      }
    });

    /* Show pending-sync count on load if outbox non-empty */
    var outbox = window.PLAT.outbox;
    if (outbox) {
      var pending = outbox.size();
      if (pending > 0) {
        toast(pending + ' order action' + (pending === 1 ? '' : 's') + ' pending sync', 'warning');
      }
    }
  }

  /* ============================================================
     OUTBOX REPLAY
     Called on reconnect. Replays add_item and fire_course ops in order.
     Payments are NEVER queued — callers guard pos_pay separately.
     ============================================================ */
  function _replayOutbox() {
    var outbox = window.PLAT && window.PLAT.outbox;
    if (!outbox || outbox.size() === 0) return;

    outbox.replay(function (entry) {
      if (entry.op === 'add_item') {
        return sb.rpc('pos_add_item', entry.params).then(function (r) {
          if (r.error) throw r.error;
        });
      }
      if (entry.op === 'fire_course') {
        return sb.rpc('pos_fire_course', entry.params).then(function (r) {
          if (r.error) throw r.error;
        });
      }
      /* Unknown op — skip silently */
      return Promise.resolve();
    }, function (failCount) {
      if (failCount === 0) {
        toast('Offline actions synced', 'success');
        /* Refresh the ticket if we have an active session */
        if (state.sessionId) refreshBill();
      } else {
        toast(failCount + ' action(s) failed to sync — will retry next reconnect', 'error');
      }
    });
  }

  function localMoney(cents) {
    /* safe fallback if PLAT not ready */
    if (money) return money(cents);
    return '$' + (Number(cents || 0) / 100).toFixed(2);
  }

  function localEsc(s) {
    if (esc) return esc(s);
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  /* ---- DOM shortcuts ---- */
  function el(id) { return document.getElementById(id); }
  function qsa(sel, root) { return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }

  /* ---- Screen manager ---- */
  var SCREENS = ['screen-login','screen-home','screen-order','screen-payment','screen-manager'];

  function showScreen(id) {
    var shell = el('pos-shell');
    var login = el('screen-login');
    var isLogin = id === 'screen-login';

    /* toggle shell visibility */
    if (isLogin) {
      login.classList.add('active');
      shell.classList.remove('active');
    } else {
      login.classList.remove('active');
      shell.classList.add('active');
      /* within shell, only one sub-screen active */
      SCREENS.forEach(function(sid) {
        var scr = el(sid);
        if (!scr) return;
        if (sid === id) scr.classList.add('active');
        else            scr.classList.remove('active');
      });
    }
  }

  /* ---- Clock ---- */
  function updateClock() {
    var c = el('pos-clock');
    if (c) c.textContent = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
  }

  /* ============================================================
     LOGIN
     ============================================================ */
  function setupLogin() {
    var buf     = '';
    var display = el('login-dots');
    var submit  = el('btn-login-submit');
    var errEl   = el('login-error');
    var loginCard = el('screen-login');

    function updateDisplay() {
      var dots = '';
      for (var i = 0; i < 4; i++) dots += (i < buf.length ? '●' : '·');
      display.textContent = dots;
      /* Sign In stays ENABLED at all times — a disabled button is a silent
         dead-end (no click handler, no feedback); doLogin explains instead. */
      errEl.textContent = '';
      loginCard.querySelector('.login-display').classList.remove('error');
    }

    /* Numpad digits */
    qsa('[data-digit]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        if (buf.length >= 4) return;
        buf += btn.dataset.digit;
        state.loginBuf = buf;
        updateDisplay();
        if (buf.length === 4) doLogin();
      });
    });

    /* Delete */
    el('btn-del-login').addEventListener('click', function() {
      buf = buf.slice(0,-1);
      state.loginBuf = buf;
      updateDisplay();
    });

    /* Submit */
    submit.addEventListener('click', doLogin);

    /* Keyboard */
    document.addEventListener('keydown', function(e) {
      if (el('screen-login').classList.contains('active')) {
        if (e.key >= '0' && e.key <= '9' && buf.length < 4) {
          buf += e.key;
          state.loginBuf = buf;
          updateDisplay();
          if (buf.length === 4) doLogin();
        } else if (e.key === 'Backspace') {
          buf = buf.slice(0,-1);
          state.loginBuf = buf;
          updateDisplay();
        } else if (e.key === 'Enter' && buf.length >= 4) {
          doLogin();
        }
      }
    });

    function doLogin() {
      if (buf.length < 4) {
        /* Feedback instead of a silent no-op — automation/users tapping Sign In
           with an empty/partial PIN were left stranded with no error. */
        errEl.textContent = 'Enter your 4-digit PIN first';
        loginCard.querySelector('.login-display').classList.add('error');
        return;
      }
      submit.disabled = true;
      submit.textContent = 'Checking…';
      errEl.textContent = '';

      sb.rpc('pos_staff_login', {
        p_restaurant: RESTAURANT_ID,
        p_pin: buf,
      }).then(function(r) {
        if (r.error || !r.data || r.data.ok === false) {
          var raw = (r.data && r.data.error) ? r.data.error : 'Invalid PIN';
          var msg = (raw === 'not_found') ? 'Incorrect PIN — try again' : raw;
          /* BUG 1 FIX: reset buf and dots WITHOUT calling updateDisplay() so error stays */
          buf = '';
          state.loginBuf = '';
          var dots = '';
          for (var i = 0; i < 4; i++) dots += '·';
          display.textContent = dots;
          loginCard.querySelector('.login-display').classList.add('error');
          errEl.textContent = msg;
          submit.disabled = false;
          submit.textContent = 'Sign In';
          return;
        }
        var staff = r.data;
        state.staff = {id: staff.id, name: staff.name, role: staff.role};
        /* M3b: survive a page refresh — sessionStorage so closing the tab still logs out */
        try { sessionStorage.setItem('tavolo-pos-staff', JSON.stringify(state.staff)); } catch (e) {}
        buf = '';
        state.loginBuf = '';
        updateDisplay();
        submit.textContent = 'Sign In';
        onLoginSuccess();
      }).catch(function(err) {
        console.error('[POS] login error', err);
        errEl.textContent = 'Connection error — try again';
        buf = '';
        state.loginBuf = '';
        updateDisplay();
        submit.disabled = false;
        submit.textContent = 'Sign In';
      });
    }
  }

  function onLoginSuccess() {
    /* Update topbar */
    el('pos-staff-name').textContent = state.staff.name;
    el('pos-staff-role').textContent = state.staff.role;
    /* Show manager button for manager/owner */
    if (state.staff.role === 'manager' || state.staff.role === 'owner') {
      el('btn-mgr').classList.remove('hidden');
    }
    showScreen('screen-home');
    loadHomeData();
  }

  /* Logout */
  el('btn-logout').addEventListener('click', function() {
    state.staff = null;
    state.sessionId = null;
    state.orderId = null;
    try { sessionStorage.removeItem('tavolo-pos-staff'); } catch (e) {}
    el('btn-mgr').classList.add('hidden');
    showScreen('screen-login');
  });

  /* Manager panel nav */
  el('btn-mgr').addEventListener('click', function() {
    showScreen('screen-manager');
    loadManagerData();
  });
  el('btn-mgr-back').addEventListener('click', function() {
    showScreen('screen-home');
    loadHomeData();
  });

  /* ============================================================
     HOME SCREEN
     ============================================================ */
  function loadHomeData() {
    updateLastReceiptBtn();
    var grid = el('table-grid');
    grid.innerHTML = '<div class="home-loading" role="status"><span class="spinner" aria-hidden="true"></span></div>';

    Promise.all([
      sb.from('mesa_tables').select('id,table_code,label,seats').order('table_code'),
      sb.from('mesa_sessions')
        /* ALL live statuses — a QR guest's session is 'seated'; loading only
           'open' made QR-occupied tables look available on the floor (and made
           "first available table" pick them for a new dine-in). */
        .select('id,table_id,status,order_type,tab_name,server_staff_id,guest_count')
        .in('status', ['open','seated','scanned','paying']),
    ]).then(function(results) {
      var tablesRes   = results[0];
      var sessionsRes = results[1];
      if (tablesRes.error) throw tablesRes.error;

      state.tables = tablesRes.data || [];
      state.openSessions = {};
      (sessionsRes.data || []).forEach(function(s) {
        if (s.table_id) state.openSessions[s.table_id] = s;
      });

      renderTableGrid();
    }).catch(function(err) {
      console.error('[POS] loadHomeData error', err);
      grid.innerHTML = '<div class="home-error" role="alert">Failed to load tables</div>';
    });
  }

  function renderTableGrid() {
    var grid = el('table-grid');
    grid.innerHTML = '';

    if (!state.tables.length) {
      grid.innerHTML = '<div class="home-empty" role="status">No tables configured</div>';
      return;
    }

    state.tables.forEach(function(t) {
      var occupied = !!state.openSessions[t.id];
      var sess = state.openSessions[t.id];
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'table-btn' + (occupied ? ' occupied' : '');
      btn.setAttribute('role','listitem');
      btn.setAttribute('aria-label', t.label + (occupied ? ' (occupied)' : ' (available)'));
      btn.innerHTML = [
        '<span class="table-code">' + localEsc(t.label || t.table_code) + '</span>',
        '<span class="table-seats">' + localEsc(t.seats) + ' seats</span>',
        occupied ? '<span class="table-meta">' + localEsc(sess.order_type === 'bar' ? sess.tab_name || 'Bar' : (sess.guest_count || '') + ' guests') + '</span>' : '',
      ].join('');
      btn.addEventListener('click', function() {
        handleTableTap(t, sess || null);
      });
      grid.appendChild(btn);
    });
  }

  function handleTableTap(table, existingSession) {
    if (existingSession) {
      /* Resume open session */
      state.sessionId   = existingSession.id;
      state.orderId     = null;
      state.tableId     = table.id;
      state.tableLabel  = table.label || table.table_code;
      state.orderType   = existingSession.order_type;
      state.guestCount  = existingSession.guest_count || 1;
      state.tabName     = existingSession.tab_name || '';
      state.payPaidItemIds = {};
      loadPendingDiscounts();
      buildSeatBar();
      showScreen('screen-order');
      loadMenuAndBill();
    } else {
      /* New dine-in */
      openNewSession('dine_in', table.id, table.label || table.table_code, null, 2);
    }
  }

  /* Non-blocking replacement for window.prompt — a native dialog blocks the
     whole JS thread until answered, which under automation/kiosk shells means
     a permanent renderer freeze with zero console errors (M3, same class as
     the old Close-button confirm). Returns Promise<string|null>. */
  function posPrompt(title, placeholder, defaultValue, inputType) {
    return new Promise(function(resolve) {
      var modal  = el('pos-prompt-modal');
      var input  = el('pos-prompt-input');
      var okBtn  = el('btn-pos-prompt-ok');
      var cancel = el('btn-pos-prompt-cancel');
      el('pos-prompt-title').textContent = title;
      input.placeholder = placeholder || '';
      input.type  = inputType || 'text';
      input.value = defaultValue || '';
      modal.classList.add('open');
      setTimeout(function() { input.focus(); input.select(); }, 40);
      function done(val) {
        modal.classList.remove('open');
        okBtn.removeEventListener('click', onOk);
        cancel.removeEventListener('click', onCancel);
        input.removeEventListener('keydown', onKey);
        resolve(val);
      }
      function onOk()     { done(input.value); }
      function onCancel() { done(null); }
      function onKey(e) {
        if (e.key === 'Enter')  { e.preventDefault(); onOk(); }
        if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
      }
      okBtn.addEventListener('click', onOk);
      cancel.addEventListener('click', onCancel);
      input.addEventListener('keydown', onKey);
    });
  }

  /* New order buttons */
  el('btn-new-dinein').addEventListener('click', function() {
    /* Prompt for guest count inline — use first available table */
    var available = state.tables.filter(function(t) { return !state.openSessions[t.id]; });
    if (!available.length) {
      toast('No tables available', 'error'); return;
    }
    posPrompt('New dine-in — guests', 'Guests (1-20)', '2', 'number').then(function(v) {
      if (v === null) return; /* cancelled */
      var guests = parseInt(v, 10);
      if (!guests || guests < 1) guests = 2;
      var t = available[0];
      openNewSession('dine_in', t.id, t.label || t.table_code, null, Math.min(guests, 20));
    });
  });

  el('btn-new-takeout').addEventListener('click', function() {
    openNewSession('takeout', null, 'Takeout', null, 1);
  });

  el('btn-new-bartab').addEventListener('click', function() {
    posPrompt('New bar tab — name', 'Tab name (e.g. Marcus)', '', 'text').then(function(v) {
      if (v === null) return; /* cancelled */
      var name = (v || '').trim();
      if (!name) name = 'Bar';
      openNewSession('bar', null, 'Bar', name, 1);
    });
  });

  function openNewSession(orderType, tableId, label, tabName, guests) {
    sb.rpc('pos_open_session', {
      p_restaurant: RESTAURANT_ID,
      p_table:      tableId || null,
      p_order_type: orderType,
      p_server:     state.staff.id,
      p_tab_name:   tabName || null,
      p_guests:     guests || 1,
    }).then(function(r) {
      if (r.error || !r.data) {
        /* On duplicate-session constraint, offer to resume the existing one */
        if (r.error && r.error.message && r.error.message.includes('uq_mesa_sessions_active_table')) {
          /* Find and resume the existing open/paying session for this table/type */
          resumeExistingSession(orderType, tableId, label, tabName, guests);
          return;
        }
        var msg = r.error ? r.error.message : 'Could not open session';
        toast(msg, 'error'); return;
      }
      var d = r.data;
      state.sessionId   = d.session_id;
      state.orderId     = d.order_id;
      state.tableId     = tableId;
      state.tableLabel  = label;
      state.orderType   = orderType;
      state.guestCount  = guests;
      state.tabName     = tabName || '';
      state.currentSeat = 1;
      state.currentCourse = 1;
      state.payPaidItemIds = {};
      loadPendingDiscounts();
      /* Expose for test cleanup */
      window.__pos_last_session = d.session_id;
      buildSeatBar();
      showScreen('screen-order');
      loadMenuAndBill();
    }).catch(function(err) {
      console.error('[POS] openNewSession error', err);
      toast('Connection error', 'error');
    });
  }

  function resumeExistingSession(orderType, tableId, label, tabName, guests) {
    /* Look up any active session for this table/orderType */
    var query = sb.from('mesa_sessions')
      .select('id,order_type,tab_name,guest_count,table_id')
      .eq('restaurant_id', RESTAURANT_ID)
      .in('status', ['open','paying','seated'])
      .eq('order_type', orderType);
    if (tableId) query = query.eq('table_id', tableId);
    query.order('created_at', {ascending: false}).limit(1)
      .then(function(r) {
        var sess = r.data && r.data[0] ? r.data[0] : null;
        if (!sess) { toast('Could not open or resume session', 'error'); return; }
        toast('Resuming existing ' + orderType + ' session', 'success');
        state.sessionId   = sess.id;
        state.orderId     = null;
        state.tableId     = sess.table_id || tableId;
        state.tableLabel  = label;
        state.orderType   = orderType;
        state.guestCount  = sess.guest_count || guests;
        state.tabName     = sess.tab_name || tabName || '';
        state.currentSeat = 1;
        state.currentCourse = 1;
        state.payPaidItemIds = {};
        loadPendingDiscounts();
        window.__pos_last_session = sess.id;
        buildSeatBar();
        showScreen('screen-order');
        loadMenuAndBill();
      }).catch(function(err) {
        console.error('[POS] resumeExistingSession error', err);
        toast('Connection error', 'error');
      });
  }

  /* ============================================================
     ORDER SCREEN — Menu loading
     ============================================================ */
  function loadMenuAndBill() {
    /* Update ticket header */
    var label = state.tableLabel || (state.orderType === 'takeout' ? 'Takeout' : 'Bar');
    if (state.tabName) label += ' — ' + state.tabName;
    el('ticket-session-label').textContent = label;
    el('ticket-guests-label').textContent  = state.guestCount > 1 ? state.guestCount + ' guests' : '';

    /* Load categories + items in parallel with bill */
    Promise.all([
      sb.from('mesa_menu_categories')
        .select('id,name,sort')
        .eq('restaurant_id', RESTAURANT_ID)
        .order('sort'),
      sb.from('mesa_menu_items')
        .select('id,category_id,name,price_cents,is_available,sort')
        .order('sort'),
    ]).then(function(results) {
      var catRes  = results[0];
      var itemRes = results[1];
      if (catRes.error)  throw catRes.error;
      if (itemRes.error) throw itemRes.error;

      state.categories = catRes.data  || [];
      state.items      = itemRes.data || [];

      /* Assign color indices */
      state.categories.forEach(function(c, i) { c._colorIdx = i % CAT_COLORS.length; });

      /* Build category map for items */
      var catMap = {};
      state.categories.forEach(function(c) { catMap[c.id] = c; });
      state.items.forEach(function(item) {
        var cat = catMap[item.category_id];
        item._colorIdx = cat ? cat._colorIdx : 0;
      });

      if (state.categories.length) state.activeCatId = state.categories[0].id;
      state.searchQuery = '';
      el('order-search').value = '';

      renderCategoryTabs();
      renderItemGrid();
    }).catch(function(err) {
      console.error('[POS] loadMenu error', err);
      toast('Menu load failed', 'error');
    });

    /* Load discounts */
    sb.from('pos_discounts').select('*').eq('active', true).then(function(r) {
      state.discounts = r.data || [];
    });

    /* Load bill */
    refreshBill();
  }

  function renderCategoryTabs() {
    var nav = el('order-cats');
    nav.innerHTML = '';
    state.categories.forEach(function(cat) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cat-tab' + (cat.id === state.activeCatId ? ' active' : '');
      btn.textContent = cat.name;
      btn.setAttribute('aria-pressed', String(cat.id === state.activeCatId));
      btn.addEventListener('click', function() {
        state.activeCatId = cat.id;
        state.searchQuery = '';
        el('order-search').value = '';
        qsa('.cat-tab').forEach(function(b) {
          b.classList.toggle('active', b === btn);
          b.setAttribute('aria-pressed', String(b === btn));
        });
        renderItemGrid();
      });
      nav.appendChild(btn);
    });
  }

  function renderItemGrid() {
    var grid = el('order-items-grid');
    var q    = state.searchQuery.toLowerCase().trim();
    var items = state.items.filter(function(item) {
      if (q) return item.name.toLowerCase().includes(q);
      return item.category_id === state.activeCatId;
    });

    grid.innerHTML = '';

    if (!items.length) {
      var empty = document.createElement('div');
      empty.className = 'order-menu-empty';
      empty.setAttribute('role','status');
      empty.textContent = q ? 'No items match "' + q + '"' : 'No items in this category';
      grid.appendChild(empty);
      return;
    }

    items.forEach(function(item) {
      var card = document.createElement('div');
      card.className = 'item-card' + (item.is_available === false ? ' unavail' : '');
      card.setAttribute('role','listitem');
      card.setAttribute('tabindex','0');
      card.setAttribute('aria-label', item.name + ' ' + localMoney(item.price_cents) + (item.is_available === false ? ' (unavailable)' : ''));

      card.innerHTML = [
        '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:4px;">',
          '<span class="item-name">' + localEsc(item.name) + '</span>',
          '<span class="item-cat-dot ' + CAT_COLORS[item._colorIdx || 0] + '" aria-hidden="true"></span>',
        '</div>',
        '<span class="item-price">' + localMoney(item.price_cents) + '</span>',
      ].join('');

      function handleItemTap() {
        if (item.is_available === false) { toast('Item unavailable', 'error'); return; }
        handleAddItem(item);
      }

      card.addEventListener('click', handleItemTap);
      card.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleItemTap(); }
      });

      grid.appendChild(card);
    });
  }

  /* Search */
  el('order-search').addEventListener('input', function(e) {
    state.searchQuery = e.target.value;
    renderItemGrid();
  });

  /* ============================================================
     ADD ITEM — modifier check then add
     ============================================================ */
  function handleAddItem(item) {
    /* OFFLINE: skip the modifier-groups fetch entirely (it would hang or fail);
       add without modifiers so the item is captured immediately. */
    var net = window.PLAT && window.PLAT.net;
    if (net && !net.isOnline()) {
      addItemToTicket(item, [], state.currentSeat, null);
      return;
    }
    /* Check for modifier groups */
    sb.from('pos_item_modifier_groups')
      .select('group_id')
      .eq('menu_item_id', item.id)
      .then(function(r) {
        var groupIds = (r.data || []).map(function(row) { return row.group_id; });
        if (!groupIds.length) {
          /* No modifiers — add IMMEDIATELY (fast path, 1 tap). The server adds a
             special instruction via the pencil on the ticket line if needed —
             never block the add or risk dropping the item behind a modal. */
          addItemToTicket(item, [], state.currentSeat, null);
          return;
        }
        /* Fetch groups + modifiers */
        Promise.all([
          sb.from('pos_modifier_groups')
            .select('id,name,min_select,max_select,required,sort')
            .in('id', groupIds)
            .order('sort'),
          sb.from('pos_modifiers')
            .select('id,group_id,name,price_delta_cents,is_available,sort')
            .in('group_id', groupIds)
            .eq('is_available', true)
            .order('sort'),
        ]).then(function(results) {
          var groups = results[0].data || [];
          var mods   = results[1].data || [];
          /* Attach modifiers to groups */
          groups.forEach(function(g) {
            g._mods = mods.filter(function(m) { return m.group_id === g.id; });
          });
          openModifierModal(item, groups);
        }).catch(function(err) {
          console.error('[POS] mod load error', err);
          /* Fallback: add without modifiers */
          addItemToTicket(item, [], state.currentSeat);
        });
      });
  }

  /* ============================================================
     MODIFIER MODAL
     ============================================================ */
  function openModifierModal(item, groups) {
    state.modifierItem = item;
    state.modGroups    = groups;
    state.modSelected  = {};

    el('mod-title').textContent  = item.name;
    el('mod-price').textContent  = localMoney(item.price_cents);
    el('mod-validation').textContent = '';
    el('mod-notes-input').value = '';

    /* Populate seat selector */
    var seatSel = el('modifier-seat-sel');
    seatSel.innerHTML = '';
    for (var s = 1; s <= Math.max(state.guestCount, 1); s++) {
      var opt = document.createElement('option');
      opt.value = s;
      opt.textContent = 'Seat ' + s;
      if (s === state.currentSeat) opt.selected = true;
      seatSel.appendChild(opt);
    }

    /* Render groups */
    var body = el('mod-groups-body');
    body.innerHTML = '';

    groups.forEach(function(group) {
      var groupDiv = document.createElement('div');
      var reqBadge = group.required ? '<span class="req-badge">Required</span>' : '';
      var limitTxt = group.max_select > 1 ? ' (up to ' + group.max_select + ')' : '';
      groupDiv.innerHTML = '<div class="mod-group-title">' + localEsc(group.name) + reqBadge + '<span style="font-size:10px;color:rgba(255,255,255,0.3);font-weight:500;">' + limitTxt + '</span></div>';

      group._mods.forEach(function(mod) {
        var optDiv = document.createElement('div');
        optDiv.className = 'mod-option';
        optDiv.setAttribute('role','checkbox');
        optDiv.setAttribute('aria-checked','false');
        optDiv.setAttribute('tabindex','0');
        optDiv.dataset.groupId = group.id;
        optDiv.dataset.modId   = mod.id;
        optDiv.setAttribute('aria-label', mod.name + (mod.price_delta_cents ? ' +' + localMoney(mod.price_delta_cents) : ''));

        var priceStr = mod.price_delta_cents > 0 ? '+' + localMoney(mod.price_delta_cents) : (mod.price_delta_cents < 0 ? localMoney(mod.price_delta_cents) : '');

        optDiv.innerHTML = [
          '<span class="mod-check" aria-hidden="true"></span>',
          '<span class="mod-option-name">' + localEsc(mod.name) + '</span>',
          priceStr ? '<span class="mod-option-price">' + localEsc(priceStr) + '</span>' : '',
        ].join('');

        function toggleMod() {
          var sel = state.modSelected[group.id] || [];
          var idx = sel.indexOf(mod.id);
          var isRadio = group.max_select === 1;

          if (idx === -1) {
            /* Select */
            if (isRadio) {
              /* Deselect others in group */
              state.modSelected[group.id] = [mod.id];
              groupDiv.querySelectorAll('.mod-option').forEach(function(o) {
                o.classList.remove('selected');
                o.setAttribute('aria-checked','false');
              });
            } else {
              if (sel.length >= group.max_select && group.max_select > 0) {
                toast('Max ' + group.max_select + ' selections', 'error');
                return;
              }
              state.modSelected[group.id] = sel.concat([mod.id]);
            }
            optDiv.classList.add('selected');
            optDiv.setAttribute('aria-checked','true');
            var checkEl = optDiv.querySelector('.mod-check');
            if (checkEl) checkEl.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
          } else {
            /* Deselect */
            state.modSelected[group.id] = sel.filter(function(id) { return id !== mod.id; });
            optDiv.classList.remove('selected');
            optDiv.setAttribute('aria-checked','false');
            var checkEl2 = optDiv.querySelector('.mod-check');
            if (checkEl2) checkEl2.innerHTML = '';
          }
          el('mod-validation').textContent = '';
        }

        optDiv.addEventListener('click', toggleMod);
        optDiv.addEventListener('keydown', function(e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleMod(); }
        });

        groupDiv.appendChild(optDiv);
      });

      body.appendChild(groupDiv);
    });

    el('modifier-modal').classList.add('open');
    el('btn-mod-add').focus();
  }

  el('btn-mod-close').addEventListener('click', closeModifierModal);
  el('modifier-modal').addEventListener('click', function(e) {
    if (e.target === el('modifier-modal')) closeModifierModal();
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && el('modifier-modal').classList.contains('open')) closeModifierModal();
  });

  function closeModifierModal() {
    el('modifier-modal').classList.remove('open');
    state.modifierItem = null;
    state.modGroups    = [];
    state.modSelected  = {};
  }

  el('btn-mod-add').addEventListener('click', function() {
    var item   = state.modifierItem;
    var groups = state.modGroups;
    if (!item) return;

    /* Validate required groups */
    var missing = groups.filter(function(g) {
      if (!g.required) return false;
      var sel = state.modSelected[g.id] || [];
      return sel.length < (g.min_select || 1);
    });
    if (missing.length) {
      el('mod-validation').textContent = 'Please select: ' + missing.map(function(g){return g.name;}).join(', ');
      return;
    }

    /* Collect all selected modifier ids */
    var modIds = [];
    Object.values(state.modSelected).forEach(function(ids) {
      modIds = modIds.concat(ids);
    });

    var seat  = parseInt(el('modifier-seat-sel').value, 10) || state.currentSeat;
    var notes = (el('mod-notes-input').value || '').trim() || null;
    closeModifierModal();
    addItemToTicket(item, modIds, seat, notes);
  });

  /* ============================================================
     ADD ITEM TO TICKET (RPC)
     Offline: queue to outbox and apply optimistically to the ticket.
     Online: normal RPC path.
     ============================================================ */
  function addItemToTicket(item, modifierIds, seat, notes) {
    if (!state.sessionId) { toast('No active session', 'error'); return; }

    var net    = window.PLAT && window.PLAT.net;
    var outbox = window.PLAT && window.PLAT.outbox;
    var params = {
      p_session:      state.sessionId,
      p_menu_item:    item.id,
      p_qty:          1,
      p_seat:         seat || 1,
      p_course:       state.currentCourse,
      p_notes:        notes || null,
      p_modifier_ids: modifierIds || [],
    };

    /* ---- OFFLINE PATH ---- */
    if (net && !net.isOnline()) {
      if (outbox) {
        outbox.push('add_item', params);
      }
      /* Optimistic update: inject a synthetic item into bill so the ticket
         shows the item immediately. Use a client-side temp id. */
      var tempId = 'offline-' + Date.now() + '-' + Math.floor(Math.random() * 1e6);
      var syntheticItem = {
        id:               tempId,
        name:             item.name,
        qty:              1,
        unit_price_cents: item.price_cents,
        line_total_cents: item.price_cents,
        seat:             seat || 1,
        course:           state.currentCourse,
        notes:            notes || null,
        modifiers:        [],
        kitchen_status:   'new',
        voided:           false,
        _offline:         true,
      };
      if (!state.bill) {
        state.bill = { items: [], subtotal_cents: 0, total_cents: 0 };
      }
      if (!state.bill.items) state.bill.items = [];
      state.bill.items.push(syntheticItem);
      state.bill.subtotal_cents = (state.bill.subtotal_cents || 0) + item.price_cents;
      state.bill.total_cents    = (state.bill.total_cents || 0) + item.price_cents;
      renderTicket();
      updateTotals();
      toast(item.name + ' saved offline — will sync when reconnected', 'warning');
      return;
    }

    /* ---- ONLINE PATH ---- */
    sb.rpc('pos_add_item', params).then(function(r) {
      if (r.error) { toast(r.error.message || 'Add item failed', 'error'); return; }
      toast(item.name + ' added', 'success');
      refreshBill();
    }).catch(function(err) {
      console.error('[POS] addItem error', err);
      /* Network died mid-flight — queue and optimistic-add */
      if (outbox) outbox.push('add_item', params);
      var tempId2 = 'offline-' + Date.now() + '-' + Math.floor(Math.random() * 1e6);
      var syntheticItem2 = {
        id:               tempId2,
        name:             item.name,
        qty:              1,
        unit_price_cents: item.price_cents,
        line_total_cents: item.price_cents,
        seat:             seat || 1,
        course:           state.currentCourse,
        notes:            notes || null,
        modifiers:        [],
        kitchen_status:   'new',
        voided:           false,
        _offline:         true,
      };
      if (!state.bill) state.bill = { items: [], subtotal_cents: 0, total_cents: 0 };
      if (!state.bill.items) state.bill.items = [];
      state.bill.items.push(syntheticItem2);
      state.bill.subtotal_cents = (state.bill.subtotal_cents || 0) + item.price_cents;
      state.bill.total_cents    = (state.bill.total_cents || 0) + item.price_cents;
      renderTicket();
      updateTotals();
      toast(item.name + ' saved offline — will sync when reconnected', 'warning');
    });
  }

  /* ============================================================
     ITEM NOTE MODAL (no-modifier items — quick prompt before add)
     ============================================================ */
  function openItemNoteModal(item, modifierIds, seat) {
    state.itemNoteItem = { item: item, modifierIds: modifierIds, seat: seat };
    el('item-note-item-name').textContent = item.name;
    el('item-note-input').value = '';
    el('item-note-modal').classList.add('open');
    el('item-note-input').focus();
  }

  function closeItemNoteModal() {
    el('item-note-modal').classList.remove('open');
    state.itemNoteItem = null;
  }

  el('btn-item-note-confirm').addEventListener('click', function() {
    if (!state.itemNoteItem) return;
    var notes = (el('item-note-input').value || '').trim() || null;
    var p = state.itemNoteItem;
    closeItemNoteModal();
    addItemToTicket(p.item, p.modifierIds, p.seat, notes);
  });

  el('btn-item-note-skip').addEventListener('click', function() {
    if (!state.itemNoteItem) return;
    var p = state.itemNoteItem;
    closeItemNoteModal();
    addItemToTicket(p.item, p.modifierIds, p.seat, null);
  });

  el('item-note-modal').addEventListener('click', function(e) {
    if (e.target === el('item-note-modal')) closeItemNoteModal();
  });

  el('item-note-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      el('btn-item-note-confirm').click();
    }
    if (e.key === 'Escape') closeItemNoteModal();
  });

  /* ============================================================
     EDIT NOTE MODAL (pencil affordance on ticket lines)
     ============================================================ */
  function openEditNoteModal(itemId, itemName, currentNote) {
    state.editNoteItemId = itemId;
    el('edit-note-item-name').textContent = itemName;
    el('edit-note-input').value = currentNote || '';
    el('edit-note-modal').classList.add('open');
    el('edit-note-input').focus();
    /* select all existing text so it's easy to replace */
    el('edit-note-input').select();
  }

  function closeEditNoteModal() {
    el('edit-note-modal').classList.remove('open');
    state.editNoteItemId = null;
  }

  el('btn-edit-note-confirm').addEventListener('click', function() {
    var itemId = state.editNoteItemId;
    if (!itemId) return;
    var note = (el('edit-note-input').value || '').trim();
    closeEditNoteModal();
    sb.rpc('pos_update_item_note', { p_order_item: itemId, p_note: note || null })
      .then(function(r) {
        if (r.error) { toast(r.error.message || 'Note update failed', 'error'); return; }
        refreshBill();
      }).catch(function(err) {
        console.error('[POS] update note error', err);
        toast('Connection error — note not saved', 'error');
      });
  });

  el('btn-edit-note-cancel').addEventListener('click', closeEditNoteModal);

  el('edit-note-modal').addEventListener('click', function(e) {
    if (e.target === el('edit-note-modal')) closeEditNoteModal();
  });

  el('edit-note-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      el('btn-edit-note-confirm').click();
    }
    if (e.key === 'Escape') closeEditNoteModal();
  });

  /* ============================================================
     PENDING DISCOUNTS (m2)
     pos_applied_discounts rows freeze amount_cents at apply time and the
     anon client has no UPDATE/DELETE path (RLS is SELECT-only; re-applying
     the RPC stacks a second row). So check-level discounts are held
     client-side as {id, kind, value} and recomputed from the CURRENT bill
     on every render; they are persisted via pos_apply_discount (which
     computes from the live subtotal server-side) only when Pay is opened
     and the check is final.
     ============================================================ */
  function pendingDiscKey() { return 'tavolo-pos-pending-disc:' + state.sessionId; }

  function savePendingDiscounts() {
    if (!state.sessionId) return;
    try {
      if (state.pendingDiscounts && state.pendingDiscounts.length) {
        sessionStorage.setItem(pendingDiscKey(), JSON.stringify(state.pendingDiscounts));
      } else {
        sessionStorage.removeItem(pendingDiscKey());
      }
    } catch (e) {}
  }

  function loadPendingDiscounts() {
    state.pendingDiscounts = [];
    if (!state.sessionId) return;
    try {
      state.pendingDiscounts = JSON.parse(sessionStorage.getItem(pendingDiscKey()) || '[]') || [];
    } catch (e) { state.pendingDiscounts = []; }
  }

  function pendingDiscCents(bill) {
    var sub = (bill && bill.subtotal_cents) || 0;
    var total = 0;
    (state.pendingDiscounts || []).forEach(function(d) {
      if (d.kind === 'percent' || d.kind === 'pct') {
        total += Math.round(sub * Number(d.value) / 100);
      } else {
        /* 'amount' — server treats value as cents, capped at subtotal */
        total += Math.min(Math.round(Number(d.value)), sub);
      }
    });
    return Math.min(total, sub);
  }

  /* Overlay pending discounts on the server bill, recomputing tax/service/
     total with the same rounding the server uses (ROUND on the discounted base). */
  function effectiveBill(raw) {
    if (!raw) return raw;
    var pend = pendingDiscCents(raw);
    if (!pend) return raw;
    var b = Object.assign({}, raw);
    b.discounts_cents = (raw.discounts_cents || 0) + pend;
    var base = Math.max((raw.subtotal_cents || 0) - b.discounts_cents, 0);
    b.tax_cents = raw.tax_pct != null ? Math.round(base * raw.tax_pct / 100) : (raw.tax_cents || 0);
    b.service_charge_cents = raw.service_pct != null ? Math.round(base * raw.service_pct / 100) : (raw.service_charge_cents || 0);
    b.total_cents = base + b.tax_cents + b.service_charge_cents;
    b.remaining_cents = Math.max(b.total_cents - (raw.paid_cents || 0), 0);
    return b;
  }

  /* Persist held discounts through the RPC (server recomputes from the live
     subtotal) — called when the check is finalised for payment. */
  function persistPendingDiscounts() {
    var pend = (state.pendingDiscounts || []).slice();
    if (!pend.length) return Promise.resolve();
    var chain = Promise.resolve();
    pend.forEach(function(d) {
      chain = chain.then(function() {
        return sb.rpc('pos_apply_discount', {
          p_session:    state.sessionId,
          p_order_item: null,
          p_discount:   d.id,
          p_staff:      d.staffId || (state.staff && state.staff.id),
          p_reason:     d.reason || d.name,
        }).then(function(r) {
          if (r.error) toast(d.name + ' could not be applied', 'error');
        });
      });
    });
    return chain.then(function() {
      state.pendingDiscounts = [];
      savePendingDiscounts();
    });
  }

  /* ============================================================
     BILL / TICKET
     ============================================================ */
  function refreshBill() {
    if (!state.sessionId) return;
    sb.rpc('pos_session_bill', { p_session: state.sessionId })
      .then(function(r) {
        if (r.error) { console.error('[POS] bill error', r.error); return; }
        state.bill = r.data;
        renderTicket();
        updateTotals();
      }).catch(function(err) {
        console.error('[POS] refreshBill exception', err);
      });
  }

  function buildSeatBar() {
    var bar = el('ticket-seat-bar');
    bar.innerHTML = '';
    var maxSeat = Math.max(state.guestCount || 1, 1);
    /* All seats button */
    var allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.className = 'seat-btn' + (state.currentSeat === 0 ? ' active' : '');
    allBtn.textContent = 'All';
    allBtn.setAttribute('aria-pressed', String(state.currentSeat === 0));
    allBtn.addEventListener('click', function() {
      state.currentSeat = 0;
      refreshSeatBar();
      renderTicket();
    });
    bar.appendChild(allBtn);

    for (var s = 1; s <= maxSeat; s++) {
      (function(seat) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'seat-btn' + (state.currentSeat === seat ? ' active' : '');
        btn.textContent = 'Seat ' + seat;
        btn.setAttribute('aria-pressed', String(state.currentSeat === seat));
        btn.addEventListener('click', function() {
          state.currentSeat = seat;
          refreshSeatBar();
          renderTicket();
        });
        bar.appendChild(btn);
      }(s));
    }
  }

  function refreshSeatBar() {
    qsa('.seat-btn').forEach(function(btn, i) {
      var seatVal = i === 0 ? 0 : i;
      btn.classList.toggle('active', state.currentSeat === seatVal);
      btn.setAttribute('aria-pressed', String(state.currentSeat === seatVal));
    });
  }

  function renderTicket() {
    var list = el('ticket-items-list');
    var bill = state.bill;

    if (!bill || !bill.items || !bill.items.length) {
      list.innerHTML = [
        '<div class="ticket-empty" role="status">',
          '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">',
            '<path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>',
            '<rect x="9" y="3" width="6" height="4" rx="1"/>',
          '</svg>',
          '<span>No items yet</span>',
        '</div>',
      ].join('');
      return;
    }

    /* Filter by seat if not "All" */
    var items = bill.items.filter(function(item) {
      if (item.voided) return false;
      if (state.currentSeat === 0) return true;
      return item.seat === state.currentSeat;
    });

    /* Group by course */
    var courseMap = {};
    items.forEach(function(item) {
      var c = item.course || 1;
      if (!courseMap[c]) courseMap[c] = [];
      courseMap[c].push(item);
    });
    var courseKeys = Object.keys(courseMap).map(Number).sort(function(a,b){return a-b;});

    var html = '';
    courseKeys.forEach(function(course) {
      if (courseKeys.length > 1) {
        html += '<div class="ti-course-label">Course ' + course + '</div>';
      }
      courseMap[course].forEach(function(item) {
        var modsStr = item.modifiers && item.modifiers.length
          ? item.modifiers.map(function(m){return m.name;}).join(', ')
          : '';
        var noteStr   = item.notes || '';
        var hasNote   = noteStr.length > 0;
        /* n3: items covered by a split payment are marked and locked */
        var isPaid    = !!(state.payPaidItemIds && state.payPaidItemIds[item.id]);
        var canRemove = item.kitchen_status === 'new' && !isPaid;
        var noteBtnCls = 'ti-note-btn' + (hasNote ? ' has-note' : '');
        var noteBtnLabel = hasNote ? 'Edit note' : 'Add note';
        /* pencil svg */
        var pencilSvg = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
        html += [
          '<div class="ticket-item-row' + (isPaid ? ' is-paid' : '') + '" data-item-id="' + localEsc(item.id) + '" role="listitem">',
            '<div style="flex:1;min-width:0;">',
              '<div class="ti-name">' + localEsc(item.qty + '× ' + item.name) + (isPaid ? ' <span class="ti-paid-tag">paid</span>' : '') + '</div>',
              modsStr ? '<div class="ti-mods">' + localEsc(modsStr) + '</div>' : '',
              hasNote ? '<div class="ti-note">' + localEsc(noteStr) + '</div>' : '',
            '</div>',
            '<button class="' + noteBtnCls + '" data-action="note" data-item-id="' + localEsc(item.id) + '" data-item-name="' + localEsc(item.name) + '" data-note="' + localEsc(noteStr) + '" type="button" aria-label="' + localEsc(noteBtnLabel + ' for ' + item.name) + '">' + pencilSvg + '</button>',
            '<div class="ti-qty-wrap">',
              canRemove ? '<button class="ti-qty-btn" data-action="dec" data-item-id="' + localEsc(item.id) + '" data-qty="' + item.qty + '" type="button" aria-label="Decrease qty">−</button>' : '',
              '<span class="ti-qty-num">' + localEsc(String(item.qty)) + '</span>',
              canRemove ? '<button class="ti-qty-btn" data-action="inc" data-item-id="' + localEsc(item.id) + '" data-qty="' + item.qty + '" type="button" aria-label="Increase qty">+</button>' : '',
            '</div>',
            '<span class="ti-price">' + localMoney(item.line_total_cents) + '</span>',
          '</div>',
        ].join('');
      });
    });

    list.innerHTML = html;

    /* Attach note button listeners */
    qsa('[data-action="note"]', list).forEach(function(btn) {
      btn.addEventListener('click', function() {
        openEditNoteModal(btn.dataset.itemId, btn.dataset.itemName, btn.dataset.note || '');
      });
    });

    /* Attach qty event listeners */
    qsa('[data-action="dec"],[data-action="inc"]', list).forEach(function(btn) {
      btn.addEventListener('click', function() {
        var itemId = btn.dataset.itemId;
        var qty    = parseInt(btn.dataset.qty, 10);
        var newQty = btn.dataset.action === 'inc' ? qty + 1 : qty - 1;
        if (newQty <= 0) {
          /* Remove item */
          sb.rpc('pos_remove_item', { p_order_item: itemId })
            .then(function(r) {
              if (r.error) { toast(r.error.message || 'Remove failed', 'error'); return; }
              refreshBill();
            });
        } else {
          sb.rpc('pos_update_item_qty', { p_order_item: itemId, p_qty: newQty })
            .then(function(r) {
              if (r.error) { toast(r.error.message || 'Update failed', 'error'); return; }
              refreshBill();
            });
        }
      });
    });
  }

  function updateTotals() {
    /* m2: overlay pending (client-held) discounts so percent discounts always
       reflect the current subtotal */
    var bill = effectiveBill(state.bill);
    if (!bill) {
      el('tot-subtotal').textContent = localMoney(0);
      el('tot-discounts-row').classList.add('hidden');
      el('tot-tax-row').classList.add('hidden');
      el('tot-service-row').classList.add('hidden');
      el('tot-total').textContent    = localMoney(0);
      el('tot-remaining-row').classList.add('hidden');
      return;
    }

    el('tot-subtotal').textContent = localMoney(bill.subtotal_cents || 0);

    /* Discounts row — show only if there are discounts */
    var discCents = bill.discounts_cents || 0;
    if (discCents > 0) {
      el('tot-discounts-row').classList.remove('hidden');
      el('tot-discounts').textContent = '−' + localMoney(discCents);
    } else {
      el('tot-discounts-row').classList.add('hidden');
    }

    /* Tax row — show only if non-zero */
    var taxCents = bill.tax_cents || 0;
    var taxPct   = bill.tax_pct   != null ? bill.tax_pct : null;
    if (taxCents > 0) {
      el('tot-tax-row').classList.remove('hidden');
      el('tot-tax-label').textContent = taxPct != null ? 'Tax (' + taxPct + '%)' : 'Tax';
      el('tot-tax').textContent = localMoney(taxCents);
    } else {
      el('tot-tax-row').classList.add('hidden');
    }

    /* Service charge row — show only if non-zero */
    var svcCents = bill.service_charge_cents || 0;
    var svcPct   = bill.service_pct != null ? bill.service_pct : null;
    if (svcCents > 0) {
      el('tot-service-row').classList.remove('hidden');
      el('tot-service-label').textContent = svcPct != null ? 'Service charge (' + svcPct + '%)' : 'Service charge';
      el('tot-service').textContent = localMoney(svcCents);
    } else {
      el('tot-service-row').classList.add('hidden');
    }

    el('tot-total').textContent = localMoney(bill.total_cents || 0);

    if (bill.paid_cents > 0) {
      el('tot-remaining-row').classList.remove('hidden');
      el('tot-remaining').textContent = localMoney(bill.remaining_cents || 0);
    } else {
      el('tot-remaining-row').classList.add('hidden');
    }
  }

  /* ============================================================
     TICKET ACTIONS
     ============================================================ */

  /* Close/cancel the current order. Empty (total 0) → pos_cancel_session frees the
     table; with items → leave it open (resumable) and return home.
     M3a: the old handler had no .catch (a failed bill fetch hung silently), no
     re-entry guard, and a blocking window.confirm that froze the page under
     automation. Every path below restores the button and never blocks. */
  var closeOrderBusy = false;
  el('btn-close-order').addEventListener('click', function() {
    if (closeOrderBusy) return;
    var btn = el('btn-close-order');
    if (!state.sessionId) {
      /* Nothing to close — just return to the floor */
      showScreen('screen-home'); loadHomeData();
      return;
    }
    closeOrderBusy = true;
    btn.disabled = true;
    btn.textContent = 'Closing…';
    function closeDone() {
      closeOrderBusy = false;
      btn.disabled = false;
      btn.textContent = 'Close';
    }
    sb.rpc('pos_session_bill', { p_session: state.sessionId }).then(function(r) {
      if (r.error || !r.data) {
        closeDone();
        toast('Could not check order — try again', 'error');
        return;
      }
      var t = r.data.total_cents || 0;
      if (t <= 0) {
        return sb.rpc('pos_cancel_session', { p_session: state.sessionId }).then(function(cr) {
          closeDone();
          if (cr.error) { toast('Could not close order', 'error'); return; }
          toast('Empty order closed', 'success');
          try { sessionStorage.removeItem(pendingDiscKey()); } catch (e) {}
          state.sessionId = null;
          state.pendingDiscounts = [];
          showScreen('screen-home'); loadHomeData();
        });
      }
      /* Items on the ticket — leave the order open on the floor (non-blocking) */
      closeDone();
      toast('Order left open — resume it from the floor', 'success');
      showScreen('screen-home'); loadHomeData();
    }).catch(function(err) {
      console.error('[POS] close order error', err);
      closeDone();
      toast('Connection error — try again', 'error');
    });
  });

  el('btn-fire').addEventListener('click', function() {
    if (!state.sessionId) return;

    var net    = window.PLAT && window.PLAT.net;
    var outbox = window.PLAT && window.PLAT.outbox;
    var fireParams = {
      p_session: state.sessionId,
      p_course:  state.currentCourse,
    };

    /* ---- OFFLINE PATH ---- */
    if (net && !net.isOnline()) {
      if (outbox) outbox.push('fire_course', fireParams);
      /* Optimistic: advance course counter so server-sent items go to the right course */
      toast('Course ' + state.currentCourse + ' queued — will fire when reconnected', 'warning');
      state.currentCourse++;
      el('btn-fire').textContent = 'Fire C' + state.currentCourse;
      el('btn-fire').setAttribute('aria-label', 'Fire course ' + state.currentCourse);
      return;
    }

    /* ---- ONLINE PATH ---- */
    sb.rpc('pos_fire_course', fireParams).then(function(r) {
      if (r.error) { toast(r.error.message || 'Fire failed', 'error'); return; }
      toast('Course ' + state.currentCourse + ' fired!', 'success');
      /* Advance course for next items */
      state.currentCourse++;
      el('btn-fire').textContent = 'Fire C' + state.currentCourse;
      el('btn-fire').setAttribute('aria-label', 'Fire course ' + state.currentCourse);
      refreshBill();
    }).catch(function(err) {
      console.error('[POS] fire error', err);
      /* Network died mid-flight — queue it */
      if (outbox) outbox.push('fire_course', fireParams);
      toast('Course ' + state.currentCourse + ' queued offline — will fire when reconnected', 'warning');
      state.currentCourse++;
      el('btn-fire').textContent = 'Fire C' + state.currentCourse;
      el('btn-fire').setAttribute('aria-label', 'Fire course ' + state.currentCourse);
    });
  });

  /* Pay button — m2: persist held discounts first (server recomputes them from
     the live subtotal), then open payment on a fresh bill */
  el('btn-pay').addEventListener('click', function() {
    if (!state.sessionId || !state.bill) { toast('No active ticket', 'error'); return; }
    var btn = el('btn-pay');
    btn.disabled = true;
    persistPendingDiscounts().then(function() {
      return sb.rpc('pos_session_bill', { p_session: state.sessionId });
    }).then(function(r) {
      btn.disabled = false;
      if (r.error || !r.data) { toast('Could not load bill', 'error'); return; }
      state.bill    = r.data;
      state.payBill = r.data;
      renderTicket();
      updateTotals();
      openPaymentScreen();
    }).catch(function(err) {
      console.error('[POS] open payment error', err);
      btn.disabled = false;
      toast('Connection error', 'error');
    });
  });

  /* Discount */
  el('btn-discount').addEventListener('click', function() {
    if (!state.discounts.length) { toast('No discounts available', 'error'); return; }
    openDiscountModal();
  });

  /* Void */
  el('btn-void-item').addEventListener('click', function() {
    if (!state.bill || !state.bill.items || !state.bill.items.length) {
      toast('No items to void', 'error'); return;
    }
    /* If only one item, pre-select it; otherwise user needs to identify */
    var voidableItems = state.bill.items.filter(function(i) { return !i.voided; });
    if (!voidableItems.length) { toast('No voidable items', 'error'); return; }
    /* Pick last added item for simplicity (manager PIN will be required) */
    state.voidItemId = voidableItems[voidableItems.length - 1].id;
    el('void-modal').classList.add('open');
    el('void-reason-input').value = '';
    el('void-reason-input').focus();
  });

  el('btn-void-confirm').addEventListener('click', function() {
    var reason = el('void-reason-input').value.trim();
    if (!reason) { toast('Please enter a reason', 'error'); return; }
    var itemId = state.voidItemId;
    el('void-modal').classList.remove('open');

    /* Require manager PIN */
    requireManagerPin('Void requires manager override').then(function(mgr) {
      sb.rpc('pos_void_item', {
        p_order_item: itemId,
        p_reason:     reason,
        p_manager:    mgr.id,
      }).then(function(r) {
        if (r.error) { toast(r.error.message || 'Void failed', 'error'); return; }
        toast('Item voided', 'success');
        refreshBill();
      }).catch(function(err) {
        console.error('[POS] void error', err);
        toast('Connection error', 'error');
      });
    }).catch(function() { /* cancelled */ });
  });

  el('btn-void-cancel').addEventListener('click', function() {
    el('void-modal').classList.remove('open');
  });

  /* ============================================================
     DISCOUNT MODAL
     ============================================================ */
  function openDiscountModal() {
    var list = el('discount-options-list');
    list.innerHTML = '';
    state.discounts.forEach(function(disc) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'discount-option';
      btn.setAttribute('role','listitem');
      /* m1: DB kind is 'percent' (the old 'pct' check never matched, so 15%
         rendered as $15.00); 'amount' values are cents (see pos_apply_discount). */
      var isPct  = disc.kind === 'percent' || disc.kind === 'pct';
      var valStr = isPct ? Number(disc.value) + '%' : localMoney(Math.round(Number(disc.value)));
      var mgrTag = disc.requires_manager ? '<span class="disc-mgr">Mgr</span>' : '';
      btn.innerHTML = [
        '<span>' + localEsc(disc.name) + '</span>',
        '<span style="display:flex;align-items:center;gap:8px;">',
          '<span class="disc-badge">' + localEsc(valStr) + '</span>',
          mgrTag,
        '</span>',
      ].join('');
      btn.addEventListener('click', function() {
        el('discount-modal').classList.remove('open');
        applyDiscount(disc);
      });
      list.appendChild(btn);
    });
    el('discount-modal').classList.add('open');
  }

  el('btn-discount-cancel').addEventListener('click', function() {
    el('discount-modal').classList.remove('open');
  });

  function applyDiscount(disc) {
    var doApply = function(staffId) {
      if (disc.scope === 'item') {
        /* Item-scope discounts go straight to the RPC (server validates) */
        sb.rpc('pos_apply_discount', {
          p_session:    state.sessionId,
          p_order_item: null,
          p_discount:   disc.id,
          p_staff:      staffId,
          p_reason:     disc.name,
        }).then(function(r) {
          if (r.error) { toast(r.error.message || 'Discount failed', 'error'); return; }
          toast(disc.name + ' applied', 'success');
          refreshBill();
        }).catch(function(err) {
          console.error('[POS] discount error', err);
          toast('Connection error', 'error');
        });
        return;
      }
      /* m2: hold check-level discounts client-side so percent values track the
         CURRENT subtotal (voids, qty changes); persisted when Pay is opened. */
      state.pendingDiscounts = state.pendingDiscounts || [];
      var dup = state.pendingDiscounts.some(function(p) { return p.id === disc.id; });
      if (dup) { toast(disc.name + ' is already on this check', 'error'); return; }
      state.pendingDiscounts.push({
        id: disc.id, kind: disc.kind, value: disc.value,
        name: disc.name, staffId: staffId, reason: disc.name,
      });
      savePendingDiscounts();
      toast(disc.name + ' applied', 'success');
      updateTotals();
    };

    if (disc.requires_manager) {
      requireManagerPin('Discount requires manager override').then(function(mgr) {
        doApply(mgr.id);
      }).catch(function() { /* cancelled */ });
    } else {
      doApply(state.staff.id);
    }
  }

  /* ============================================================
     MANAGER PIN MODAL
     ============================================================ */
  function requireManagerPin(promptMsg) {
    return new Promise(function(resolve, reject) {
      /* If current user is already manager/owner, resolve immediately */
      if (state.staff && (state.staff.role === 'manager' || state.staff.role === 'owner')) {
        resolve(state.staff);
        return;
      }
      state.mgrPinResolve = resolve;
      state.mgrPinReject  = reject;
      state.mgrPinBuf     = '';
      el('mgr-pin-title').textContent = promptMsg || 'Manager Override';
      el('mgr-pin-display').textContent = '····';
      el('mgr-pin-display').classList.remove('error');
      el('mgr-pin-error').textContent = '';
      el('mgr-pin-modal').classList.add('open');
    });
  }

  /* Numpad for manager PIN */
  qsa('[data-mpin]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      if (state.mgrPinBuf.length >= 4) return;
      state.mgrPinBuf += btn.dataset.mpin;
      updateMgrDisplay();
      if (state.mgrPinBuf.length === 4) submitMgrPin();
    });
  });

  el('btn-del-mpin').addEventListener('click', function() {
    state.mgrPinBuf = state.mgrPinBuf.slice(0,-1);
    updateMgrDisplay();
  });

  el('btn-mgr-pin-cancel').addEventListener('click', function() {
    closeMgrPinModal();
    if (state.mgrPinReject) { state.mgrPinReject(new Error('cancelled')); state.mgrPinReject = null; }
  });

  function updateMgrDisplay() {
    var dots = '';
    for (var i = 0; i < 4; i++) dots += (i < state.mgrPinBuf.length ? '●' : '·');
    el('mgr-pin-display').textContent = dots;
    el('mgr-pin-display').classList.remove('error');
    el('mgr-pin-error').textContent = '';
  }

  function submitMgrPin() {
    var pin = state.mgrPinBuf;
    sb.rpc('pos_staff_login', {
      p_restaurant: RESTAURANT_ID,
      p_pin: pin,
    }).then(function(r) {
      if (r.error || !r.data || r.data.ok === false || (r.data.role !== 'manager' && r.data.role !== 'owner')) {
        /* BUG 2 FIX: removed setTimeout(updateMgrDisplay, 800) — error must persist
           until the next digit press; updateMgrDisplay() is called on every keypress. */
        el('mgr-pin-display').classList.add('error');
        el('mgr-pin-error').textContent = 'Invalid manager PIN';
        state.mgrPinBuf = '';
        return;
      }
      closeMgrPinModal();
      if (state.mgrPinResolve) {
        state.mgrPinResolve({id: r.data.id, name: r.data.name, role: r.data.role});
        state.mgrPinResolve = null;
      }
    }).catch(function() {
      el('mgr-pin-error').textContent = 'Connection error';
      state.mgrPinBuf = '';
    });
  }

  function closeMgrPinModal() {
    el('mgr-pin-modal').classList.remove('open');
    state.mgrPinBuf = '';
  }

  /* ============================================================
     PAYMENT SCREEN
     ============================================================ */
  function openPaymentScreen() {
    showScreen('screen-payment');
    var bill = state.payBill;

    /* Receipt is meaningful once something has been paid on this check */
    el('btn-pay-receipt').disabled = !(bill && bill.paid_cents > 0);

    /* Reset state (payPaidItemIds intentionally survives — it tracks split
       coverage across multiple payments on the same check) */
    state.paySplitMode     = 'whole';
    state.paySplitCustomCents = 0;
    state.paySplitEvenWays = 2;
    state.paySplitItemIds  = {};
    state.paySplitSeat     = null;
    state.payTipPct        = 0;   /* m3: default No tip */
    state.payMethod        = 'cash';
    el('split-item-wrap').classList.add('hidden');
    el('split-seat-wrap').classList.add('hidden');

    /* Mark split/tip UI */
    qsa('.split-btn').forEach(function(b) { b.classList.toggle('active', b.dataset.split === 'whole'); });
    qsa('.tip-btn').forEach(function(b)   { b.classList.toggle('active', b.dataset.tip === '0'); });
    el('split-custom-wrap').classList.add('hidden');
    el('split-even-wrap').classList.add('hidden');
    el('tip-custom-wrap').classList.add('hidden');
    qsa('.method-tab').forEach(function(b) { b.classList.toggle('active', b.dataset.method === 'cash'); b.setAttribute('aria-pressed', String(b.dataset.method === 'cash')); });
    el('cash-panel').classList.remove('hidden');
    el('cash-received-input').value = '';
    el('cash-change-display').textContent = 'Change: $0.00';

    updatePaymentAmounts();
  }

  el('btn-pay-back').addEventListener('click', function() {
    showScreen('screen-order');
  });

  /* Split buttons */
  qsa('.split-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      state.paySplitMode = btn.dataset.split;
      qsa('.split-btn').forEach(function(b) { b.classList.toggle('active', b === btn); });
      el('split-custom-wrap').classList.toggle('hidden', state.paySplitMode !== 'custom');
      el('split-even-wrap').classList.toggle('hidden', state.paySplitMode !== 'even');
      el('split-item-wrap').classList.toggle('hidden', state.paySplitMode !== 'item');
      el('split-seat-wrap').classList.toggle('hidden', state.paySplitMode !== 'seat');
      if (state.paySplitMode === 'item') renderSplitItems();
      if (state.paySplitMode === 'seat') renderSplitSeats();
      updatePaymentAmounts();
    });
  });

  /* ---- Split helpers (M2/M4/n3) ---- */
  function seatKeyOf(it) { return it.seat == null ? 'shared' : String(it.seat); }

  function isItemPaid(id) { return !!(state.payPaidItemIds && state.payPaidItemIds[id]); }

  function seatItemsOf(seatKey) {
    var bill = state.payBill;
    return ((bill && bill.items) || []).filter(function(it) {
      return !it.voided && seatKeyOf(it) === String(seatKey);
    });
  }

  function seatUnpaidCents(seatKey) {
    var sum = 0;
    seatItemsOf(seatKey).forEach(function(it) {
      if (!isItemPaid(it.id)) sum += (it.line_total_cents || 0);
    });
    return sum;
  }

  function selectedItemsCents() {
    var bill = state.payBill;
    var sel  = state.paySplitItemIds || {};
    var sum  = 0;
    ((bill && bill.items) || []).forEach(function(it) {
      if (sel[it.id] && !it.voided && !isItemPaid(it.id)) sum += (it.line_total_cents || 0);
    });
    return sum;
  }

  /* Split-by-item: render the bill's line items as toggleable rows;
     items already covered by a split payment are dimmed + tagged (n3) */
  function renderSplitItems() {
    var bill = state.payBill;
    var listEl = el('split-item-list');
    if (!bill || !bill.items || !bill.items.length) { listEl.innerHTML = '<div style="font-size:13px;color:rgba(255,255,255,0.45);">No items to split.</div>'; return; }
    state.paySplitItemIds = state.paySplitItemIds || {};
    listEl.innerHTML = bill.items.filter(function(it){ return !it.voided; }).map(function(it) {
      var paid = isItemPaid(it.id);
      var on   = !paid && !!state.paySplitItemIds[it.id];
      return '<button type="button" class="split-item-row" data-item-id="' + localEsc(it.id) + '"'
        + (paid ? ' disabled' : '')
        + ' aria-pressed="' + on + '" style="display:flex;justify-content:space-between;width:100%;align-items:center;gap:10px;'
        + 'padding:10px 12px;margin-bottom:6px;border-radius:8px;min-height:44px;text-align:left;'
        + 'cursor:' + (paid ? 'default' : 'pointer') + ';opacity:' + (paid ? '0.45' : '1') + ';'
        + 'border:1px solid ' + (on ? '#c2703d' : 'rgba(255,255,255,0.12)') + ';'
        + 'background:' + (on ? 'rgba(194,112,61,0.18)' : 'rgba(255,255,255,0.04)') + ';color:#fff;">'
        + '<span>' + (on ? '✓ ' : '') + localEsc(it.qty + '× ' + it.name)
        + (paid ? ' <span class="ti-paid-tag">paid</span>' : '') + '</span>'
        + '<span style="font-variant-numeric:tabular-nums;">' + localMoney(it.line_total_cents) + '</span>'
        + '</button>';
    }).join('');
    qsa('#split-item-list .split-item-row:not([disabled])').forEach(function(row) {
      row.addEventListener('click', function() {
        var id = row.dataset.itemId;
        if (state.paySplitItemIds[id]) delete state.paySplitItemIds[id]; else state.paySplitItemIds[id] = true;
        renderSplitItems();
        updatePaymentAmounts();
      });
    });
  }

  /* M2: split-by-seat — one button per distinct seat on the check (plus
     "Shared" for items without a seat); tapping a seat charges that seat's
     items, mirroring the by-item flow. */
  function renderSplitSeats() {
    var bill = state.payBill;
    var listEl = el('split-seat-list');
    var items = ((bill && bill.items) || []).filter(function(it) { return !it.voided; });
    if (!items.length) { listEl.innerHTML = '<div style="font-size:13px;color:rgba(255,255,255,0.45);">No items to split.</div>'; return; }

    var seen = {}, seats = [];
    items.forEach(function(it) {
      var k = seatKeyOf(it);
      if (!seen[k]) { seen[k] = true; seats.push(k); }
    });
    seats.sort(function(a, b) {
      if (a === 'shared') return 1;
      if (b === 'shared') return -1;
      return Number(a) - Number(b);
    });

    /* Default to the first seat that still has something to pay */
    var sel = state.paySplitSeat != null ? String(state.paySplitSeat) : null;
    if (!sel || !seen[sel] || seatUnpaidCents(sel) <= 0) {
      state.paySplitSeat = null;
      for (var i = 0; i < seats.length; i++) {
        if (seatUnpaidCents(seats[i]) > 0) { state.paySplitSeat = seats[i]; break; }
      }
    }

    listEl.innerHTML = seats.map(function(k) {
      var label  = k === 'shared' ? 'Shared' : 'Seat ' + k;
      var unpaid = seatUnpaidCents(k);
      var paid   = unpaid <= 0;
      var on     = !paid && String(state.paySplitSeat) === String(k);
      return '<button type="button" class="split-seat-btn" data-seat="' + localEsc(k) + '"'
        + (paid ? ' disabled' : '')
        + ' aria-pressed="' + on + '" style="display:flex;justify-content:space-between;width:100%;align-items:center;gap:10px;'
        + 'padding:10px 12px;margin-bottom:6px;border-radius:8px;min-height:44px;text-align:left;'
        + 'cursor:' + (paid ? 'default' : 'pointer') + ';opacity:' + (paid ? '0.45' : '1') + ';'
        + 'border:1px solid ' + (on ? '#c2703d' : 'rgba(255,255,255,0.12)') + ';'
        + 'background:' + (on ? 'rgba(194,112,61,0.18)' : 'rgba(255,255,255,0.04)') + ';color:#fff;">'
        + '<span>' + (on ? '✓ ' : '') + localEsc(label)
        + (paid ? ' <span class="ti-paid-tag">paid</span>' : '') + '</span>'
        + '<span style="font-variant-numeric:tabular-nums;">' + localMoney(unpaid) + '</span>'
        + '</button>';
    }).join('');
    qsa('#split-seat-list .split-seat-btn:not([disabled])').forEach(function(btn) {
      btn.addEventListener('click', function() {
        state.paySplitSeat = btn.dataset.seat;
        renderSplitSeats();
        updatePaymentAmounts();
      });
    });
  }

  el('split-custom-input').addEventListener('input', function() {
    state.paySplitCustomCents = Math.round(parseFloat(this.value || '0') * 100);
    updatePaymentAmounts();
  });

  el('split-even-count').addEventListener('input', function() {
    state.paySplitEvenWays = Math.max(2, parseInt(this.value || '2', 10));
    updatePaymentAmounts();
  });

  /* Tip buttons */
  qsa('.tip-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      qsa('.tip-btn').forEach(function(b) { b.classList.toggle('active', b === btn); });
      if (btn.dataset.tip === 'custom') {
        state.payTipPct = 'custom';
        el('tip-custom-wrap').classList.remove('hidden');
      } else {
        state.payTipPct = parseInt(btn.dataset.tip, 10);
        el('tip-custom-wrap').classList.add('hidden');
      }
      updatePaymentAmounts();
    });
  });

  el('tip-custom-input').addEventListener('input', updatePaymentAmounts);
  qsa('[name="tip-custom-kind"]').forEach(function(r) { r.addEventListener('change', updatePaymentAmounts); });

  /* Method tabs */
  qsa('.method-tab').forEach(function(btn) {
    btn.addEventListener('click', function() {
      state.payMethod = btn.dataset.method;
      qsa('.method-tab').forEach(function(b) {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-pressed', String(b === btn));
      });
      el('cash-panel').classList.toggle('hidden', state.payMethod !== 'cash');
      updatePaymentAmounts();
    });
  });

  el('cash-received-input').addEventListener('input', function() {
    updateCashChange();
  });

  /* M4: a split payment covering items worth X out of the check's item
     subtotal S owes X − disc·(X/S) + tax·(X/S) + service·(X/S), rounded to
     the cent; the last payer absorbs the ±1-2¢ residue via remaining_cents. */
  function apportionBreakdown(itemsCents) {
    var bill = state.payBill;
    var S = (bill && bill.subtotal_cents) || 0;
    var remaining = bill && bill.remaining_cents != null ? bill.remaining_cents : ((bill && bill.total_cents) || 0);
    if (S <= 0 || itemsCents <= 0) return { sub: 0, disc: 0, tax: 0, svc: 0, charge: 0 };
    var f    = itemsCents / S;
    var disc = Math.round((bill.discounts_cents || 0) * f);
    var tax  = Math.round((bill.tax_cents || 0) * f);
    var svc  = Math.round((bill.service_charge_cents || 0) * f);
    return { sub: itemsCents, disc: disc, tax: tax, svc: svc,
             charge: Math.min(itemsCents - disc + tax + svc, remaining) };
  }

  /* Charge + the tax/service/discount shares belonging to THIS payment —
     the charge panel shows these, not the whole check's (M4). */
  function computeChargeBreakdown() {
    var bill = state.payBill;
    if (!bill) return { sub: 0, disc: 0, tax: 0, svc: 0, charge: 0 };
    var remaining = bill.remaining_cents != null ? bill.remaining_cents : (bill.total_cents || 0);
    var whole = {
      sub:  bill.subtotal_cents || 0,
      disc: bill.discounts_cents || 0,
      tax:  bill.tax_cents || 0,
      svc:  bill.service_charge_cents || 0,
      charge: remaining,
    };

    switch (state.paySplitMode) {
      case 'whole':  return whole;
      case 'custom':
        whole.charge = Math.min(state.paySplitCustomCents, remaining);
        return whole;
      case 'even': {
        /* charge already divides the grand total (incl. tax+service); the
           panel rows show this share's portion and sum exactly to the charge */
        var ways   = Math.max(state.paySplitEvenWays, 2);
        var charge = Math.ceil(remaining / ways);
        var disc   = Math.round((bill.discounts_cents || 0) / ways);
        var tax    = Math.round((bill.tax_cents || 0) / ways);
        var svc    = Math.round((bill.service_charge_cents || 0) / ways);
        return { sub: charge - tax - svc + disc, disc: disc, tax: tax, svc: svc, charge: charge };
      }
      case 'seat':
        return apportionBreakdown(state.paySplitSeat != null ? seatUnpaidCents(state.paySplitSeat) : 0);
      case 'item':
        return apportionBreakdown(selectedItemsCents());
      default: return whole;
    }
  }

  function computeChargeAmount() { return computeChargeBreakdown().charge; }

  function computeTipCents(chargeSubtotal) {
    if (state.payTipPct === 0) return 0;
    if (state.payTipPct === 'custom') {
      var isPct = el('tip-custom-pct').checked;
      var val   = parseFloat(el('tip-custom-input').value || '0');
      if (isPct) return Math.round(chargeSubtotal * val / 100);
      return Math.round(val * 100);
    }
    return Math.round(chargeSubtotal * state.payTipPct / 100);
  }

  function updatePaymentAmounts() {
    var bill = state.payBill;
    if (!bill) return;

    /* M4: panel rows show THIS payment's share of tax/service/discounts */
    var bd         = computeChargeBreakdown();
    var tipCents   = computeTipCents(bd.charge);
    var total      = bd.charge + tipCents;
    state.payTipCents = tipCents;

    el('pay-sub').textContent = localMoney(bd.sub);

    /* Discounts */
    if (bd.disc > 0) {
      el('pay-discounts-row').classList.remove('hidden');
      el('pay-discounts').textContent = '−' + localMoney(bd.disc);
    } else {
      el('pay-discounts-row').classList.add('hidden');
    }

    /* Tax */
    var payTaxPct = bill.tax_pct != null ? bill.tax_pct : null;
    if (bd.tax > 0) {
      el('pay-tax-row').classList.remove('hidden');
      el('pay-tax-label').textContent = payTaxPct != null ? 'Tax (' + payTaxPct + '%)' : 'Tax';
      el('pay-tax').textContent = localMoney(bd.tax);
    } else {
      el('pay-tax-row').classList.add('hidden');
    }

    /* Service charge */
    var paySvcPct = bill.service_pct != null ? bill.service_pct : null;
    if (bd.svc > 0) {
      el('pay-service-row').classList.remove('hidden');
      el('pay-service-label').textContent = paySvcPct != null ? 'Service charge (' + paySvcPct + '%)' : 'Service charge';
      el('pay-service').textContent = localMoney(bd.svc);
    } else {
      el('pay-service-row').classList.add('hidden');
    }

    el('pay-tip').textContent          = localMoney(tipCents);
    el('pay-charge-row').textContent   = localMoney(total);
    el('pay-charge-total').textContent = localMoney(total);

    el('pay-tip-row').style.display = tipCents > 0 ? '' : 'none';

    updateCashChange();
  }

  function updateCashChange() {
    if (state.payMethod !== 'cash') return;
    var chargeTotal = computeChargeAmount() + (state.payTipCents || 0);
    var received    = Math.round(parseFloat(el('cash-received-input').value || '0') * 100);
    var change      = Math.max(0, received - chargeTotal);
    el('cash-change-display').textContent = 'Change: ' + localMoney(change);
    el('cash-change-display').style.color = change > 0 ? '#4cd48a' : 'rgba(255,255,255,0.5)';
  }

  el('btn-process-payment').addEventListener('click', processPayment);

  function processPayment() {
    /* SAFETY: payments are NEVER queued offline — double-charge risk.
       Detect offline and refuse immediately with a clear message. */
    var net = window.PLAT && window.PLAT.net;
    if (net && !net.isOnline()) {
      toast("Can't take payment while offline — please reconnect first", 'error');
      return;
    }

    var bill = state.payBill;
    if (!bill) return;

    var chargeSubtotal = computeChargeAmount();
    var tipCents       = state.payTipCents || 0;
    var chargeTotal    = chargeSubtotal + tipCents;
    var method         = state.payMethod;

    if (chargeSubtotal <= 0) {
      toast(state.paySplitMode === 'item' ? 'Select the items to pay for first' : 'Nothing to charge', 'error');
      return;
    }

    /* n3: remember which items this split payment covers so they can be
       marked paid in the lists (the backend has no per-item coverage) */
    var coveredIds = [];
    if (state.paySplitMode === 'item') {
      coveredIds = Object.keys(state.paySplitItemIds || {}).filter(function(id) { return !isItemPaid(id); });
    } else if (state.paySplitMode === 'seat' && state.paySplitSeat != null) {
      coveredIds = seatItemsOf(state.paySplitSeat).map(function(it) { return it.id; });
    }

    /* Validate cash received */
    if (method === 'cash') {
      var received = Math.round(parseFloat(el('cash-received-input').value || '0') * 100);
      if (received < chargeTotal) {
        toast('Cash received is less than charge amount', 'error');
        return;
      }
    }

    var btn = el('btn-process-payment');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width:20px;height:20px;border-width:2px;" aria-hidden="true"></span> Processing…';

    /* Resolve active shift */
    var shiftId = state.activeShift ? state.activeShift.id : null;

    /* Fetch current open shift if not cached */
    var doPayment = function(shiftId) {
      /* payer_label is NOT NULL in mesa_payments — always provide a value */
      var payerLabel = state.tabName || state.tableLabel || (state.orderType === 'takeout' ? 'Takeout' : 'Guest');
      sb.rpc('pos_pay', {
        p_session:      state.sessionId,
        p_amount:       chargeSubtotal,
        p_tip:          tipCents,
        p_method:       method,
        p_cash_received:method === 'cash' ? Math.round(parseFloat(el('cash-received-input').value || '0') * 100) : 0,
        p_staff:        state.staff.id,
        p_shift:        shiftId || null,
        p_payer_label:  payerLabel,
      }).then(function(r) {
        btn.disabled = false;
        btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg> Process Payment';

        if (r.error) { toast(r.error.message || 'Payment failed', 'error'); return; }

        /* n3: mark covered items paid for the rest of this check */
        coveredIds.forEach(function(id) { state.payPaidItemIds[id] = true; });
        if (state.paySplitMode === 'item') state.paySplitItemIds = {};

        var change = r.data && r.data.change_cents ? r.data.change_cents : 0;

        if (change > 0) {
          toast('Payment complete! Change: ' + localMoney(change), 'success');
        } else {
          toast('Payment complete!', 'success');
        }

        /* Refresh bill to check if fully paid */
        sb.rpc('pos_session_bill', { p_session: state.sessionId }).then(function(billR) {
          if (billR.data && (billR.data.remaining_cents <= 0 || billR.data.remaining_cents == null)) {
            /* Fully paid — remember the check for guest-receipt reprint, then go home */
            state.lastClosedSession = { id: state.sessionId, label: payerLabel };
            toast('Receipt available — "Last receipt" on the floor', 'success');
            state.sessionId   = null;
            state.orderId     = null;
            state.bill        = null;
            state.payBill     = null;
            state.currentCourse = 1;
            el('btn-fire').textContent = 'Fire C1';
            showScreen('screen-home');
            loadHomeData();
          } else {
            /* Partial payment — back to order */
            state.bill    = billR.data;
            state.payBill = billR.data;
            showScreen('screen-order');
            updateTotals();
            renderTicket();
          }
        });
      }).catch(function(err) {
        console.error('[POS] payment error', err);
        btn.disabled = false;
        btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg> Process Payment';
        toast('Connection error — payment not processed', 'error');
      });
    };

    if (shiftId) {
      doPayment(shiftId);
    } else {
      /* Try to fetch open shift */
      sb.from('pos_shifts')
        .select('id,status')
        .eq('status','open')
        .limit(1)
        .then(function(r) {
          var s = r.data && r.data[0] ? r.data[0] : null;
          if (s) state.activeShift = s;
          doPayment(s ? s.id : null);
        }).catch(function() {
          doPayment(null);
        });
    }
  }

  /* ============================================================
     MANAGER SCREEN
     ============================================================ */
  function loadManagerData() {
    /* Load current open shift */
    sb.from('pos_shifts')
      .select('id,status,opening_cash_cents,started_at')
      .eq('status','open')
      .order('started_at', {ascending: false})
      .limit(1)
      .then(function(r) {
        var s = r.data && r.data[0] ? r.data[0] : null;
        state.activeShift = s;
        var badge = el('shift-status-badge');
        if (s) {
          badge.textContent = 'Open';
          badge.style.background   = 'rgba(76,212,138,0.12)';
          badge.style.borderColor  = 'rgba(76,212,138,0.3)';
          badge.style.color        = '#4cd48a';
          el('shift-opening-cash').value = (s.opening_cash_cents / 100).toFixed(2);
        } else {
          badge.textContent = 'Closed';
          badge.style.background   = 'rgba(255,255,255,0.05)';
          badge.style.borderColor  = 'rgba(255,255,255,0.1)';
          badge.style.color        = 'rgba(255,255,255,0.4)';
        }
      });

    loadXReport();
  }

  el('btn-open-shift').addEventListener('click', function() {
    var cashCents = Math.round(parseFloat(el('shift-opening-cash').value || '200') * 100);
    sb.rpc('pos_open_shift', {
      p_restaurant: RESTAURANT_ID,
      p_staff:      state.staff.id,
      p_opening_cash: cashCents,
    }).then(function(r) {
      if (r.error) { toast(r.error.message || 'Could not open shift', 'error'); return; }
      state.activeShift = { id: r.data };
      toast('Shift opened', 'success');
      loadManagerData();
    }).catch(function(err) {
      console.error('[POS] open shift error', err);
      toast('Connection error', 'error');
    });
  });

  el('btn-close-shift').addEventListener('click', function() {
    if (!state.activeShift) { toast('No open shift', 'error'); return; }
    var closingCash   = Math.round(parseFloat(el('shift-closing-cash').value || '0') * 100);
    var declaredTips  = Math.round(parseFloat(el('shift-declared-tips').value || '0') * 100);

    requireManagerPin('Close shift requires manager').then(function() {
      sb.rpc('pos_close_shift', {
        p_shift:          state.activeShift.id,
        p_closing_cash:   closingCash,
        p_declared_tips:  declaredTips,
      }).then(function(r) {
        if (r.error) { toast(r.error.message || 'Could not close shift', 'error'); return; }
        state.activeShift = null;
        var zData = r.data;
        var zMsg = 'Shift closed.';
        if (zData) {
          var s = typeof zData === 'string' ? JSON.parse(zData) : zData;
          if (s && s.sales && s.sales.total_cents != null) {
            zMsg += ' Sales: ' + localMoney(s.sales.total_cents) + '.';
          }
          if (s && s.over_short != null) {
            zMsg += ' Over/short: ' + localMoney(Math.abs(s.over_short)) + (s.over_short >= 0 ? ' over' : ' short') + '.';
          }
        }
        toast(zMsg, 'success');
        loadManagerData();
      }).catch(function(err) {
        console.error('[POS] close shift error', err);
        toast('Connection error', 'error');
      });
    }).catch(function() {/* cancelled */});
  });

  /* Cash events */
  el('btn-cash-in').addEventListener('click', function() {
    fireCashEvent('paid_in');
  });
  el('btn-cash-out').addEventListener('click', function() {
    fireCashEvent('paid_out');
  });

  function fireCashEvent(kind) {
    if (!state.activeShift) { toast('No open shift', 'error'); return; }
    var amount = Math.round(parseFloat(el('cash-event-amount').value || '0') * 100);
    var reason = el('cash-event-reason').value.trim();
    if (amount <= 0) { toast('Enter an amount', 'error'); return; }

    sb.rpc('pos_cash_event', {
      p_shift:  state.activeShift.id,
      p_kind:   kind,
      p_amount: amount,
      p_reason: reason || kind,
    }).then(function(r) {
      if (r.error) { toast(r.error.message || 'Cash event failed', 'error'); return; }
      toast((kind === 'paid_in' ? 'Cash in' : 'Cash out') + ': ' + localMoney(amount), 'success');
      el('cash-event-amount').value = '';
      el('cash-event-reason').value = '';
    }).catch(function(err) {
      console.error('[POS] cash event error', err);
      toast('Connection error', 'error');
    });
  }

  /* X-Report */
  el('btn-x-report').addEventListener('click', loadXReport);

  function loadXReport() {
    /* local-midnight window — same "today" as the operator Reports page */
    var d0 = new Date(); var since = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate(), 0, 0, 0, 0).toISOString();
    sb.rpc('pos_x_report', { p_restaurant: RESTAURANT_ID, p_since: since })
      .then(function(r) {
        if (r.error) { console.error('[POS] x-report error', r.error); return; }
        var d = r.data;
        if (!d) return;

        var openSess = d.open_sessions != null ? d.open_sessions : (d.open_sessions || 0);
        var salesNet = d.sales_today ? (d.sales_today.net_cents != null ? d.sales_today.net_cents : d.sales_today.total_cents) : 0;
        var tips     = d.sales_today ? (d.sales_today.tips_cents || 0) : 0;
        var cash     = d.tenders_today ? (d.tenders_today.cash || 0) : 0;
        var card     = d.tenders_today ? (d.tenders_today.card || 0) : 0;
        var voids    = d.voids_today   ? (d.voids_today.count || 0) : 0;

        el('xr-open-sessions').textContent = openSess;
        el('xr-sales-net').textContent     = localMoney(salesNet);
        el('xr-tips').textContent          = localMoney(tips);
        el('xr-cash').textContent          = localMoney(cash);
        el('xr-card').textContent          = localMoney(card);
        el('xr-voids').textContent         = voids + (voids === 1 ? ' void' : ' voids');
      }).catch(function(err) {
        console.error('[POS] x-report exception', err);
      });
  }

  /* ============================================================
     GUEST RECEIPT (#receipt-modal)
     Renders from a FRESH pos_session_bill + succeeded mesa_payments
     fetch so a reprint always reflects what was actually charged.
     ============================================================ */
  function methodLabel(m) {
    if (m === 'cash') return 'Cash';
    if (m === 'card') return 'Card';
    return m ? m.charAt(0).toUpperCase() + m.slice(1) : 'Payment';
  }

  function openReceipt(sessionId, label) {
    if (!sessionId) { toast('No receipt available', 'error'); return; }
    state.receiptReturnFocus = document.activeElement;
    el('receipt-paper').innerHTML = '<div class="receipt-loading" role="status" aria-label="Loading receipt"><span class="spinner" aria-hidden="true"></span></div>';
    el('receipt-modal').classList.add('open');
    el('btn-receipt-close').focus();

    Promise.all([
      sb.rpc('pos_session_bill', { p_session: sessionId }),
      sb.from('mesa_payments')
        .select('method,amount_cents,tip_cents,change_cents')
        .eq('session_id', sessionId)
        .eq('status', 'succeeded'),
    ]).then(function(results) {
      var billR = results[0];
      var payR  = results[1];
      if (billR.error || !billR.data) throw (billR.error || new Error('bill unavailable'));
      /* payments are best-effort — a receipt without the tender lines still helps */
      if (payR.error) console.error('[POS] receipt payments error', payR.error);
      renderReceipt(billR.data, (payR.data || []), label);
    }).catch(function(err) {
      console.error('[POS] receipt load error', err);
      closeReceiptModal();
      toast('Could not load receipt — try again', 'error');
    });
  }

  function renderReceipt(bill, payments, label) {
    var now  = new Date();
    var html = [];

    /* Header */
    html.push('<div class="rcpt-name">The Copper Table</div>');
    html.push('<div class="rcpt-meta">' + localEsc(
      now.toLocaleDateString([], {year:'numeric', month:'short', day:'numeric'}) +
      ' · ' + now.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})
    ) + '</div>');
    var who = [];
    if (label) who.push(label);
    if (state.staff && state.staff.name) who.push('Server: ' + state.staff.name);
    if (who.length) html.push('<div class="rcpt-meta">' + localEsc(who.join(' · ')) + '</div>');
    html.push('<div class="rcpt-rule" aria-hidden="true"></div>');

    /* Line items (voided lines never appear on a guest receipt) */
    var items = (bill.items || []).filter(function(it) { return !it.voided; });
    if (!items.length) {
      html.push('<div class="rcpt-meta">No items on this check</div>');
    }
    items.forEach(function(it) {
      html.push('<div class="rcpt-line"><span>' + localEsc(it.qty + '× ' + it.name) + '</span><span>' + localMoney(it.line_total_cents) + '</span></div>');
      (it.modifiers || []).forEach(function(m) {
        html.push('<div class="rcpt-mod">+ ' + localEsc(m.name) + '</div>');
      });
    });

    /* Totals */
    html.push('<div class="rcpt-rule" aria-hidden="true"></div>');
    html.push('<div class="rcpt-line"><span>Subtotal</span><span>' + localMoney(bill.subtotal_cents || 0) + '</span></div>');
    if (bill.discounts_cents > 0) {
      html.push('<div class="rcpt-line"><span>Discounts</span><span>−' + localMoney(bill.discounts_cents) + '</span></div>');
    }
    if (bill.tax_cents > 0) {
      html.push('<div class="rcpt-line"><span>' + localEsc(bill.tax_pct != null ? 'Tax (' + bill.tax_pct + '%)' : 'Tax') + '</span><span>' + localMoney(bill.tax_cents) + '</span></div>');
    }
    if (bill.service_charge_cents > 0) {
      html.push('<div class="rcpt-line"><span>' + localEsc(bill.service_pct != null ? 'Service charge (' + bill.service_pct + '%)' : 'Service charge') + '</span><span>' + localMoney(bill.service_charge_cents) + '</span></div>');
    }
    html.push('<div class="rcpt-line rcpt-total"><span>Total</span><span>' + localMoney(bill.total_cents || 0) + '</span></div>');

    /* Payments */
    if (payments.length) {
      html.push('<div class="rcpt-rule" aria-hidden="true"></div>');
      var tipTotal = 0;
      payments.forEach(function(p) {
        html.push('<div class="rcpt-line"><span>' + localEsc(methodLabel(p.method)) + '</span><span>' + localMoney(p.amount_cents || 0) + '</span></div>');
        if (p.tip_cents > 0) tipTotal += p.tip_cents;
        if (p.method === 'cash' && p.change_cents > 0) {
          html.push('<div class="rcpt-line"><span>Change</span><span>' + localMoney(p.change_cents) + '</span></div>');
        }
      });
      if (tipTotal > 0) {
        html.push('<div class="rcpt-line"><span>Tip</span><span>' + localMoney(tipTotal) + '</span></div>');
      }
    }
    var due = (bill.total_cents || 0) - (bill.paid_cents || 0);
    if (due > 0) {
      html.push('<div class="rcpt-line rcpt-total"><span>Balance due</span><span>' + localMoney(due) + '</span></div>');
    }

    html.push('<div class="rcpt-rule" aria-hidden="true"></div>');
    html.push('<div class="rcpt-foot">Thank you!</div>');

    el('receipt-paper').innerHTML = html.join('');
  }

  function closeReceiptModal() {
    el('receipt-modal').classList.remove('open');
    var f = state.receiptReturnFocus;
    state.receiptReturnFocus = null;
    if (f && typeof f.focus === 'function' && document.contains(f)) f.focus();
  }

  el('btn-receipt-close').addEventListener('click', closeReceiptModal);
  el('btn-receipt-done').addEventListener('click', closeReceiptModal);
  el('receipt-modal').addEventListener('click', function(e) {
    if (e.target === el('receipt-modal')) closeReceiptModal();
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && el('receipt-modal').classList.contains('open')) closeReceiptModal();
  });
  el('btn-receipt-print').addEventListener('click', function() {
    /* user-tapped Print is the one sanctioned native-dialog path */
    window.print();
  });

  /* Floor header — reprint the most recently closed check */
  el('btn-last-receipt').addEventListener('click', function() {
    if (!state.lastClosedSession) { toast('No closed check yet', 'error'); return; }
    openReceipt(state.lastClosedSession.id, state.lastClosedSession.label);
  });

  function updateLastReceiptBtn() {
    var btn = el('btn-last-receipt');
    if (!btn) return;
    btn.classList.toggle('hidden', !state.lastClosedSession);
    if (state.lastClosedSession) {
      btn.setAttribute('aria-label', 'Show receipt for ' + state.lastClosedSession.label + ' (last closed check)');
    }
  }

  /* Payment screen — receipt for the CURRENT session (enabled once paid_cents > 0) */
  el('btn-pay-receipt').addEventListener('click', function() {
    if (!state.sessionId) { toast('No active session', 'error'); return; }
    var label = state.tabName || state.tableLabel || (state.orderType === 'takeout' ? 'Takeout' : 'Guest');
    openReceipt(state.sessionId, label);
  });

  /* ============================================================
     BOOT
     ============================================================ */
  function boot() {
    if (!window.PLAT || !window.PLAT.client) {
      console.error('[POS] PLAT not available');
      return;
    }
    initPlat();
    _ensureBanner();         /* inject offline banner DOM node */
    _setupNetMonitor();      /* wire PLAT.net → banner + pay-guard */
    updateClock();
    setInterval(updateClock, 30000);
    setupLogin();
    /* M3b: restore staff from sessionStorage so a reload doesn't force re-login */
    var savedStaff = null;
    try { savedStaff = JSON.parse(sessionStorage.getItem('tavolo-pos-staff') || 'null'); } catch (e) { savedStaff = null; }
    if (savedStaff && savedStaff.id && savedStaff.name) {
      state.staff = savedStaff;
      onLoginSuccess();
    } else {
      showScreen('screen-login');
    }
  }

  if (window.PLAT) {
    boot();
  } else {
    window.addEventListener('load', function() {
      if (window.PLAT) boot();
      else console.error('[POS] PLAT never loaded');
    });
  }

}());
