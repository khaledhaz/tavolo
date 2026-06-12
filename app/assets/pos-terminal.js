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
    mgrPinResolve:null,
    mgrPinReject: null,
    mgrPinBuf:    '',
    loginBuf:     '',
    /* payment */
    payBill:      null,
    paySplitMode: 'whole',
    paySplitCustomCents: 0,
    paySplitEvenWays: 2,
    payTipPct:    18,
    payTipCents:  0,
    payMethod:    'cash',
  };

  /* ---- PLAT helpers ---- */
  var sb, toast, money, esc;

  function initPlat() {
    sb    = window.PLAT.client;
    toast = window.PLAT.utils.toast;
    money = window.PLAT.utils.money;
    esc   = window.PLAT.utils.esc;
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
      submit.disabled = buf.length < 4;
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
      if (buf.length < 4) return;
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
          submit.disabled = true; /* re-disable; re-enabled once 4 digits entered */
          loginCard.querySelector('.login-display').classList.add('error');
          errEl.textContent = msg;
          submit.disabled = false;
          submit.textContent = 'Sign In';
          return;
        }
        var staff = r.data;
        state.staff = {id: staff.id, name: staff.name, role: staff.role};
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
    var grid = el('table-grid');
    grid.innerHTML = '<div class="home-loading" role="status"><span class="spinner" aria-hidden="true"></span></div>';

    Promise.all([
      sb.from('mesa_tables').select('id,table_code,label,seats').order('table_code'),
      sb.from('mesa_sessions')
        .select('id,table_id,status,order_type,tab_name,server_staff_id,guest_count')
        .eq('status','open'),
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
      buildSeatBar();
      showScreen('screen-order');
      loadMenuAndBill();
    } else {
      /* New dine-in */
      openNewSession('dine_in', table.id, table.label || table.table_code, null, 2);
    }
  }

  /* New order buttons */
  el('btn-new-dinein').addEventListener('click', function() {
    /* Prompt for guest count inline — use first available table */
    var available = state.tables.filter(function(t) { return !state.openSessions[t.id]; });
    if (!available.length) {
      toast('No tables available', 'error'); return;
    }
    var guests = parseInt(window.prompt('Guests (1-20):', '2'), 10);
    if (!guests || guests < 1) guests = 2;
    var t = available[0];
    openNewSession('dine_in', t.id, t.label || t.table_code, null, Math.min(guests, 20));
  });

  el('btn-new-takeout').addEventListener('click', function() {
    openNewSession('takeout', null, 'Takeout', null, 1);
  });

  el('btn-new-bartab').addEventListener('click', function() {
    var name = (window.prompt('Tab name:') || '').trim();
    if (!name) name = 'Bar';
    openNewSession('bar', null, 'Bar', name, 1);
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
    /* Check for modifier groups */
    sb.from('pos_item_modifier_groups')
      .select('group_id')
      .eq('menu_item_id', item.id)
      .then(function(r) {
        var groupIds = (r.data || []).map(function(row) { return row.group_id; });
        if (!groupIds.length) {
          /* No modifiers — add directly */
          addItemToTicket(item, [], state.currentSeat);
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

    var seat = parseInt(el('modifier-seat-sel').value, 10) || state.currentSeat;
    closeModifierModal();
    addItemToTicket(item, modIds, seat);
  });

  /* ============================================================
     ADD ITEM TO TICKET (RPC)
     ============================================================ */
  function addItemToTicket(item, modifierIds, seat) {
    if (!state.sessionId) { toast('No active session', 'error'); return; }

    sb.rpc('pos_add_item', {
      p_session:      state.sessionId,
      p_menu_item:    item.id,
      p_qty:          1,
      p_seat:         seat || 1,
      p_course:       state.currentCourse,
      p_notes:        null,
      p_modifier_ids: modifierIds || [],
    }).then(function(r) {
      if (r.error) { toast(r.error.message || 'Add item failed', 'error'); return; }
      toast(item.name + ' added', 'success');
      refreshBill();
    }).catch(function(err) {
      console.error('[POS] addItem error', err);
      toast('Connection error — item not added', 'error');
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
        var canRemove = item.kitchen_status === 'new';
        html += [
          '<div class="ticket-item-row" data-item-id="' + localEsc(item.id) + '" role="listitem">',
            '<div style="flex:1;min-width:0;">',
              '<div class="ti-name">' + localEsc(item.qty + '× ' + item.name) + '</div>',
              modsStr ? '<div class="ti-mods">' + localEsc(modsStr) + '</div>' : '',
            '</div>',
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
    var bill = state.bill;
    if (!bill) {
      el('tot-subtotal').textContent = localMoney(0);
      el('tot-charges').textContent  = localMoney(0);
      el('tot-total').textContent    = localMoney(0);
      el('tot-remaining-row').classList.add('hidden');
      return;
    }
    var charges = (bill.service_charge_cents || 0) - (bill.discounts_cents || 0);
    el('tot-subtotal').textContent = localMoney(bill.subtotal_cents || 0);
    el('tot-charges').textContent  = localMoney(charges);
    el('tot-total').textContent    = localMoney(bill.total_cents || 0);

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

  /* Fire course */
  /* Close/cancel the current order. Empty (total 0) → pos_cancel_session frees the
     table; with items → leave it open (resumable) and return home. (Fixes stuck-table bug.) */
  el('btn-close-order').addEventListener('click', function() {
    var bill = state.payBill || {};
    var total = bill.total_cents != null ? bill.total_cents : null;
    var refresh = sb.rpc('pos_session_bill', { p_session: state.sessionId });
    refresh.then(function(r) {
      var t = (r.data && r.data.total_cents != null) ? r.data.total_cents : (total || 0);
      if (t <= 0) {
        sb.rpc('pos_cancel_session', { p_session: state.sessionId }).then(function(cr) {
          if (cr.error) { toast('Could not close order', 'error'); return; }
          toast('Empty order closed', 'ok');
          state.sessionId = null;
          showScreen('screen-home'); loadHomeData();
        });
      } else {
        if (window.confirm('Leave this order open? It will stay on the floor and you can resume it later.')) {
          showScreen('screen-home'); loadHomeData();
        }
      }
    });
  });

  el('btn-fire').addEventListener('click', function() {
    if (!state.sessionId) return;
    sb.rpc('pos_fire_course', {
      p_session: state.sessionId,
      p_course:  state.currentCourse,
    }).then(function(r) {
      if (r.error) { toast(r.error.message || 'Fire failed', 'error'); return; }
      toast('Course ' + state.currentCourse + ' fired!', 'success');
      /* Advance course for next items */
      state.currentCourse++;
      el('btn-fire').textContent = 'Fire C' + state.currentCourse;
      el('btn-fire').setAttribute('aria-label', 'Fire course ' + state.currentCourse);
      refreshBill();
    }).catch(function(err) {
      console.error('[POS] fire error', err);
      toast('Connection error', 'error');
    });
  });

  /* Pay button */
  el('btn-pay').addEventListener('click', function() {
    if (!state.sessionId || !state.bill) { toast('No active ticket', 'error'); return; }
    state.payBill = state.bill;
    openPaymentScreen();
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
      var valStr = disc.kind === 'pct' ? disc.value + '%' : localMoney(disc.value * 100);
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

    /* Reset state */
    state.paySplitMode     = 'whole';
    state.paySplitCustomCents = 0;
    state.paySplitEvenWays = 2;
    state.paySplitItemIds  = {};
    state.payTipPct        = 18;
    state.payMethod        = 'cash';
    el('split-item-wrap').classList.add('hidden');

    /* Mark split/tip UI */
    qsa('.split-btn').forEach(function(b) { b.classList.toggle('active', b.dataset.split === 'whole'); });
    qsa('.tip-btn').forEach(function(b)   { b.classList.toggle('active', b.dataset.tip === '18'); });
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
      if (state.paySplitMode === 'item') renderSplitItems();
      updatePaymentAmounts();
    });
  });

  /* Split-by-item: render the bill's unpaid line items as toggleable rows */
  function renderSplitItems() {
    var bill = state.payBill;
    var listEl = el('split-item-list');
    if (!bill || !bill.items || !bill.items.length) { listEl.innerHTML = '<div style="font-size:13px;color:rgba(255,255,255,0.45);">No items to split.</div>'; return; }
    state.paySplitItemIds = state.paySplitItemIds || {};
    listEl.innerHTML = bill.items.filter(function(it){ return !it.voided; }).map(function(it) {
      var on = !!state.paySplitItemIds[it.id];
      return '<button type="button" class="split-item-row" data-item-id="' + esc(it.id) + '"'
        + ' aria-pressed="' + on + '" style="display:flex;justify-content:space-between;width:100%;align-items:center;gap:10px;'
        + 'padding:10px 12px;margin-bottom:6px;border-radius:8px;min-height:44px;cursor:pointer;text-align:left;'
        + 'border:1px solid ' + (on ? '#c2703d' : 'rgba(255,255,255,0.12)') + ';'
        + 'background:' + (on ? 'rgba(194,112,61,0.18)' : 'rgba(255,255,255,0.04)') + ';color:#fff;">'
        + '<span>' + (on ? '✓ ' : '') + esc(it.qty + '× ' + it.name) + '</span>'
        + '<span style="font-variant-numeric:tabular-nums;">' + money(it.line_total_cents) + '</span>'
        + '</button>';
    }).join('');
    qsa('#split-item-list .split-item-row').forEach(function(row) {
      row.addEventListener('click', function() {
        var id = row.dataset.itemId;
        if (state.paySplitItemIds[id]) delete state.paySplitItemIds[id]; else state.paySplitItemIds[id] = true;
        renderSplitItems();
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

  function computeChargeAmount() {
    var bill = state.payBill;
    if (!bill) return 0;
    var remaining = bill.remaining_cents != null ? bill.remaining_cents : bill.total_cents;

    switch (state.paySplitMode) {
      case 'whole':  return remaining;
      case 'custom': return Math.min(state.paySplitCustomCents, remaining);
      case 'even':   return Math.ceil(remaining / Math.max(state.paySplitEvenWays, 2));
      case 'seat':
        /* sum items for current seat */
        if (bill.by_seat && state.currentSeat && bill.by_seat[state.currentSeat]) {
          return bill.by_seat[state.currentSeat].subtotal_cents || 0;
        }
        return remaining;
      case 'item':
        /* sum the selected line items (capped at remaining) */
        var sel = state.paySplitItemIds || {};
        var sum = 0;
        (bill.items || []).forEach(function(it) { if (sel[it.id] && !it.voided) sum += (it.line_total_cents || 0); });
        return Math.min(sum, remaining);
      default: return remaining;
    }
  }

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

    var chargeSub  = computeChargeAmount();
    var tipCents   = computeTipCents(chargeSub);
    var total      = chargeSub + tipCents;
    state.payTipCents = tipCents;

    el('pay-sub').textContent      = localMoney(bill.subtotal_cents || 0);
    el('pay-charges').textContent  = localMoney((bill.service_charge_cents || 0) - (bill.discounts_cents || 0));
    el('pay-tip').textContent      = localMoney(tipCents);
    el('pay-charge-row').textContent = localMoney(total);
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
    var bill = state.payBill;
    if (!bill) return;

    var chargeSubtotal = computeChargeAmount();
    var tipCents       = state.payTipCents || 0;
    var chargeTotal    = chargeSubtotal + tipCents;
    var method         = state.payMethod;

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
        var change = r.data && r.data.change_cents ? r.data.change_cents : 0;

        if (change > 0) {
          toast('Payment complete! Change: ' + localMoney(change), 'success');
        } else {
          toast('Payment complete!', 'success');
        }

        /* Refresh bill to check if fully paid */
        sb.rpc('pos_session_bill', { p_session: state.sessionId }).then(function(billR) {
          if (billR.data && (billR.data.remaining_cents <= 0 || billR.data.remaining_cents == null)) {
            /* Fully paid — go home */
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
    sb.rpc('pos_x_report', { p_restaurant: RESTAURANT_ID })
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
     BOOT
     ============================================================ */
  function boot() {
    if (!window.PLAT || !window.PLAT.client) {
      console.error('[POS] PLAT not available');
      return;
    }
    initPlat();
    updateClock();
    setInterval(updateClock, 30000);
    setupLogin();
    showScreen('screen-login');
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
