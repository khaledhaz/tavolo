/* ============================================================================
   Tavolo — Unified Platform Runtime
   Merges: Mesa (mesa.js) + Coverly Data Layer (data.js)
   Load AFTER the supabase-js UMD bundle. Exposes window.PLAT.
   Back-compat shims: window.MESA and window.COV delegate to PLAT internals.

   Usage:
     <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
     <script src="assets/platform.js"></script>
   ============================================================================ */

(function () {
  'use strict';

  /* ==========================================================================
     AUTH-KEY MIGRATION
     Runs once before client creation. If localStorage contains a legacy session
     under 'mesa-auth' or 'coverly-auth' and 'plat-auth' is absent, the most
     recently issued session is promoted to 'plat-auth' and the old keys removed.
     Wrapped in try/catch — must never break page load.
  ========================================================================== */
  (function migrateAuthKeys() {
    try {
      var PLAT_KEY = 'plat-auth';
      var LEGACY   = ['mesa-auth', 'coverly-auth'];

      // Only migrate when plat-auth is not already populated
      var hasPlatSession = false;
      try {
        var platRaw = localStorage.getItem(PLAT_KEY);
        if (platRaw) {
          var platParsed = JSON.parse(platRaw);
          hasPlatSession = !!(platParsed && platParsed.access_token);
        }
      } catch (e) { /* ignore parse error */ }

      if (!hasPlatSession) {
        // Collect all legacy sessions that look valid (have access_token + expires_at)
        var candidates = [];
        LEGACY.forEach(function (key) {
          try {
            var raw = localStorage.getItem(key);
            if (!raw) return;
            var parsed = JSON.parse(raw);
            if (parsed && parsed.access_token) {
              candidates.push({ key: key, session: parsed });
            }
          } catch (e) { /* ignore */ }
        });

        if (candidates.length > 0) {
          // Pick the most recently issued (highest expires_at; fall back to first found)
          var best = candidates.reduce(function (a, b) {
            var ea = a.session.expires_at || 0;
            var eb = b.session.expires_at || 0;
            return eb > ea ? b : a;
          });
          try {
            localStorage.setItem(PLAT_KEY, JSON.stringify(best.session));
            console.info('[tavolo] migrated auth session from "' + best.key + '" to "' + PLAT_KEY + '"');
          } catch (e) { /* storage full or private mode */ }

          // Remove all legacy keys regardless of which won, to keep storage clean
          LEGACY.forEach(function (key) {
            try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
          });
        }
      } else {
        // plat-auth is already present — just remove stale legacy keys silently
        LEGACY.forEach(function (key) {
          try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
        });
      }
    } catch (outerErr) {
      // Absolute last-resort guard — nothing in this function may throw to the caller
      console.warn('[tavolo] auth key migration skipped:', outerErr);
    }
  }());

  /* ==========================================================================
     CONFIG
  ========================================================================== */
  var CFG = {
    SUPABASE_URL:       'https://durugcxsakdbgimgkyiw.supabase.co',
    SUPABASE_KEY:       'sb_publishable_rfZYlRhgpU23UJHox-tpHw_142Q3U2V',
    DEMO_OWNER_EMAIL:   'demo@mesa.app',
    DEMO_TABLE_CODES:   ['OE-03', 'OE-05'],
  };

  /* ==========================================================================
     SINGLE SUPABASE CLIENT
     storageKey 'plat-auth' — both legacy apps used the same project; the
     migration block above already moved any live session here.
  ========================================================================== */
  var sb = null;
  if (window.supabase && window.supabase.createClient) {
    sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'plat-auth' },
    });
  } else {
    console.error('[tavolo] supabase-js not loaded before platform.js — sb will be null');
  }

  /* ==========================================================================
     UTILS
     Collision notes:
       - el / els / esc: identical in both files — one canonical copy kept.
       - h(): only in mesa.js — kept as-is.
       - dollars(): only in mesa.js — kept as-is.
       - toast(): BOTH files define toast. Unified impl auto-creates a host
         element with id "plat-toast" when neither "#mesa-toast" nor "#cov-toast"
         is found. Falls through to whichever container exists in the page (so
         existing pay.html and Coverly screens keep their existing toast host IDs
         working). Mesa's fade-out animation is preserved; COV's longer default
         timeout (3500 ms) is used as the new default (was 2600 ms in Mesa).
       - skeletonCards / formatDate / formatTime / slugify: COV-only — added.
       - money / applyBrand / contrastWithWhite / relLum: Mesa-only — kept.
  ========================================================================== */

  // ---- Money ----------------------------------------------------------------
  var CUR = { USD: '$', GBP: '£', EUR: '€', AED: 'AED ', SAR: 'SAR ', AUD: 'A$', CAD: 'C$' };

  function money(cents, currency) {
    var sym = CUR[currency || 'USD'] || (currency ? currency + ' ' : '$');
    var v = (Number(cents || 0) / 100).toLocaleString(undefined, {
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    });
    return sym + v;
  }

  function dollars(cents) { return (Number(cents || 0) / 100); }

  // ---- DOM helpers ----------------------------------------------------------
  function el(sel, root)  { return (root || document).querySelector(sel); }
  function els(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function h(tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class')       n.className  = attrs[k];
        else if (k === 'html')   n.innerHTML  = attrs[k];
        else if (k === 'text')   n.textContent = attrs[k];
        else if (k.slice(0, 2) === 'on' && typeof attrs[k] === 'function')
          n.addEventListener(k.slice(2), attrs[k]);
        else if (attrs[k] != null)
          n.setAttribute(k, attrs[k]);
      });
    }
    if (children != null) {
      (Array.isArray(children) ? children : [children]).forEach(function (c) {
        if (c == null) return;
        n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      });
    }
    return n;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ---- Toast (unified) ------------------------------------------------------
  // Host resolution order: #plat-toast (new pages) → #mesa-toast (pay.html) →
  // #cov-toast (Coverly screens) → auto-create #plat-toast on <body>.
  // Default timeout 3500 ms (COV's value; was 2600 ms in Mesa).
  // Mesa fade-out animation is applied when a host is found/created.
  function toast(msg, kind, ms) {
    var host = el('#plat-toast') || el('#mesa-toast') || el('#cov-toast');
    if (!host) {
      host = h('div', { id: 'plat-toast' });
      document.body.appendChild(host);
    }
    var cls = 'plat-toast';
    // Honour legacy class names so existing CSS still targets the element
    if (host.id === 'mesa-toast') cls = 'mesa-toast';
    if (host.id === 'cov-toast')  cls = 'cov-toast';
    var t = h('div', { class: cls + (kind ? ' ' + kind : ''), text: msg });
    host.appendChild(t);
    var duration = ms || 3500;
    setTimeout(function () {
      t.style.transition = 'opacity .25s';
      t.style.opacity    = '0';
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 260);
    }, duration);
  }

  // ---- In-page dialogs (confirm/prompt replacements) -------------------------
  // Native window.confirm/prompt/alert block the JS thread; under automation or
  // kiosk shells the dialog is never answered and the page freezes forever.
  // These Promise-based overlays are self-contained (inline styles only) so they
  // work on every page regardless of which stylesheet is loaded.
  var _DLG_BTN =
    'min-height:44px;padding:10px 18px;border-radius:8px;font-size:15px;' +
    'font-weight:600;cursor:pointer;font-family:inherit;';

  function _dialogOpen(message, opts, withInput) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var settled = false;

      var wrap = document.createElement('div');
      wrap.className = 'plat-dialog-overlay';
      wrap.style.cssText =
        'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;' +
        'justify-content:center;padding:16px;background:rgba(0,0,0,.7);';

      var card = document.createElement('div');
      card.setAttribute('role', 'dialog');
      card.setAttribute('aria-modal', 'true');
      card.setAttribute('aria-label', message);
      card.style.cssText =
        'width:100%;max-width:340px;background:#1a1d24;color:#f0eff2;' +
        'border-radius:12px;padding:20px;box-shadow:0 12px 48px rgba(0,0,0,.55);' +
        'font-family:inherit;';

      var msg = document.createElement('p');
      msg.textContent = message;
      msg.style.cssText = 'margin:0 0 16px;font-size:15px;line-height:1.45;';
      card.appendChild(msg);

      var input = null;
      if (withInput) {
        input = document.createElement('input');
        input.type = opts.type || 'text';
        if (opts.placeholder) input.placeholder = opts.placeholder;
        if (opts.value != null) input.value = opts.value;
        input.setAttribute('aria-label', message);
        input.style.cssText =
          'width:100%;box-sizing:border-box;margin:0 0 16px;padding:10px 12px;' +
          'min-height:44px;border-radius:8px;border:1px solid rgba(240,239,242,.25);' +
          'background:#11141a;color:#f0eff2;font-size:15px;font-family:inherit;';
        card.appendChild(input);
      }

      var row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;';

      var btnCancel = document.createElement('button');
      btnCancel.type = 'button';
      btnCancel.textContent = 'Cancel';
      btnCancel.style.cssText = _DLG_BTN +
        'background:transparent;color:#f0eff2;border:1px solid rgba(240,239,242,.3);';

      var btnOk = document.createElement('button');
      btnOk.type = 'button';
      btnOk.textContent = opts.confirmLabel || (withInput ? 'OK' : 'Confirm');
      btnOk.style.cssText = _DLG_BTN + 'border:1px solid transparent;' +
        (opts.danger ? 'background:#fc8181;color:#1a1d24;'
                     : 'background:#c2703d;color:#fff;');

      row.appendChild(btnCancel);
      row.appendChild(btnOk);
      card.appendChild(row);
      wrap.appendChild(card);

      function finish(val) {
        if (settled) return;
        settled = true;
        document.removeEventListener('keydown', onKey, true);
        if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
        resolve(val);
      }
      function okValue()     { return withInput ? input.value : true; }
      function cancelValue() { return withInput ? null : false; }
      function onKey(e) {
        if (e.key === 'Escape') {
          e.preventDefault();
          finish(cancelValue());
        } else if (e.key === 'Enter' && withInput && e.target === input) {
          e.preventDefault();
          finish(okValue());
        }
      }

      wrap.addEventListener('mousedown', function (e) {
        if (e.target === wrap) finish(cancelValue());
      });
      btnCancel.addEventListener('click', function () { finish(cancelValue()); });
      btnOk.addEventListener('click',     function () { finish(okValue()); });
      document.addEventListener('keydown', onKey, true);

      document.body.appendChild(wrap);
      (withInput ? input : btnOk).focus();
    });
  }

  /* confirmDialog(message, opts) → Promise<boolean>
     opts: { confirmLabel, danger } — Confirm resolves true;
     Cancel / Escape / backdrop-click resolve false. */
  function confirmDialog(message, opts) {
    return _dialogOpen(message, opts, false);
  }

  /* promptDialog(message, opts) → Promise<string|null>
     opts: { placeholder, value, type, confirmLabel } — OK / Enter resolve the
     input value; Cancel / Escape / backdrop-click resolve null. */
  function promptDialog(message, opts) {
    return _dialogOpen(message, opts, true);
  }

  // ---- Skeleton / date / slug helpers (COV) ---------------------------------
  function skeletonCards(n, cls) {
    var html = '';
    for (var i = 0; i < (n || 3); i++) {
      html += '<div class="' + (cls || 'skeleton-card') +
              ' skeleton" aria-hidden="true" style="height:96px;border-radius:var(--radius-lg);"></div>';
    }
    return html;
  }

  function formatDate(isoStr, tz, opts) {
    if (!isoStr) return '';
    try {
      return new Intl.DateTimeFormat('en-GB', Object.assign({
        timeZone:  tz || 'UTC',
        dateStyle: 'medium',
        timeStyle: 'short',
      }, opts || {})).format(new Date(isoStr));
    } catch (e) {
      return new Date(isoStr).toLocaleString();
    }
  }

  function formatTime(isoStr, tz) {
    return formatDate(isoStr, tz, { dateStyle: undefined, timeStyle: 'short' });
  }

  function slugify(name) {
    return String(name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 60);
  }

  // ---- Brand / a11y (Mesa) --------------------------------------------------
  function relLum(hex) {
    var m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
    if (!m) return 1;
    var c = [m[1], m[2], m[3]].map(function (x) {
      var v = parseInt(x, 16) / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }

  function contrastWithWhite(hex) { return 1.05 / (relLum(hex) + 0.05); }

  function applyBrand(accentHex) {
    var root     = document.documentElement;
    var fallback = '#C4522A';
    var used     = accentHex;
    if (!accentHex || contrastWithWhite(accentHex) < 4.5) used = fallback;
    root.style.setProperty('--color-restaurant-accent', used);
    root.style.setProperty(
      '--color-restaurant-accent-foreground',
      contrastWithWhite(used) >= 4.5 ? '#FFFFFF' : '#1A1208'
    );
    return used;
  }

  /* ==========================================================================
     SHARED AUTH HELPERS (COV auth surface, delegates to sb.auth)
  ========================================================================== */
  var auth = {
    signUp: function (email, pw) {
      return sb.auth.signUp({ email: email, password: pw });
    },
    signIn: function (email, pw) {
      return sb.auth.signInWithPassword({ email: email, password: pw });
    },
    signOut: function () {
      return sb.auth.signOut();
    },
    getSession: function () {
      return sb.auth.getSession();
    },
    onAuthStateChange: function (cb) {
      return sb.auth.onAuthStateChange(cb);
    },
  };

  /* ==========================================================================
     COV DATA HELPERS (every namespace data.js exposed)
  ========================================================================== */

  // Generic error unwrapper (COV pattern)
  function ok(res) {
    if (res.error) throw res.error;
    return res.data;
  }

  // ---- restaurant -----------------------------------------------------------
  var covRestaurant = {
    get: async function () {
      var res = await sb.from('cov_restaurants').select('*').limit(1).maybeSingle();
      return ok(res);
    },
    update: async function (id, patch) {
      var res = await sb.from('cov_restaurants').update(patch).eq('id', id).select().single();
      return ok(res);
    },
    insert: async function (fields) {
      var res = await sb.from('cov_restaurants').insert(fields).select().single();
      return ok(res);
    },
  };

  // ---- rooms ----------------------------------------------------------------
  var covRooms = {
    list: async function (restaurantId) {
      var res = await sb.from('cov_rooms')
        .select('*').eq('restaurant_id', restaurantId).order('sort_order');
      return ok(res);
    },
    create: async function (fields) {
      var res = await sb.from('cov_rooms').insert(fields).select().single();
      return ok(res);
    },
    update: async function (id, patch) {
      var res = await sb.from('cov_rooms').update(patch).eq('id', id).select().single();
      return ok(res);
    },
    remove: async function (id) {
      var res = await sb.from('cov_rooms').delete().eq('id', id);
      return ok(res);
    },
  };

  // ---- tables (COV) ---------------------------------------------------------
  var covTables = {
    list: async function (restaurantId, roomId) {
      var q = sb.from('cov_tables')
        .select('*').eq('restaurant_id', restaurantId).order('sort_order');
      if (roomId) q = q.eq('room_id', roomId);
      return ok(await q);
    },
    get: async function (id) {
      var res = await sb.from('cov_tables').select('*').eq('id', id).single();
      return ok(res);
    },
    create: async function (fields) {
      var res = await sb.from('cov_tables').insert(fields).select().single();
      return ok(res);
    },
    update: async function (id, patch) {
      var res = await sb.from('cov_tables').update(patch).eq('id', id).select().single();
      return ok(res);
    },
    updatePosition: async function (id, posX, posY) {
      var res = await sb.from('cov_tables')
        .update({ pos_x: posX, pos_y: posY }).eq('id', id).select().single();
      return ok(res);
    },
    remove: async function (id) {
      var res = await sb.from('cov_tables').delete().eq('id', id);
      return ok(res);
    },
  };

  // ---- servicePeriods -------------------------------------------------------
  var covServicePeriods = {
    list: async function (restaurantId) {
      var res = await sb.from('cov_service_periods')
        .select('*').eq('restaurant_id', restaurantId).order('start_time');
      return ok(res);
    },
    create: async function (fields) {
      var res = await sb.from('cov_service_periods').insert(fields).select().single();
      return ok(res);
    },
    update: async function (id, patch) {
      var res = await sb.from('cov_service_periods')
        .update(patch).eq('id', id).select().single();
      return ok(res);
    },
    remove: async function (id) {
      var res = await sb.from('cov_service_periods').delete().eq('id', id);
      return ok(res);
    },
  };

  // ---- guests ---------------------------------------------------------------
  var covGuests = {
    list: async function (restaurantId, opts) {
      opts = opts || {};
      var q = sb.from('cov_guests')
        .select('*').eq('restaurant_id', restaurantId)
        .order('total_visits', { ascending: false });
      if (opts.limit) q = q.limit(opts.limit);
      return ok(await q);
    },
    get: async function (id) {
      var res = await sb.from('cov_guests').select('*').eq('id', id).single();
      return ok(res);
    },
    findByPhone: async function (restaurantId, phone) {
      var norm = String(phone).replace(/\D/g, '');
      var res  = await sb.from('cov_guests')
        .select('*').eq('restaurant_id', restaurantId)
        .ilike('phone', '%' + norm + '%').maybeSingle();
      return ok(res);
    },
    search: async function (restaurantId, query) {
      var res = await sb.from('cov_guests')
        .select('*').eq('restaurant_id', restaurantId)
        .or('name.ilike.%' + query + '%,phone.ilike.%' + query + '%,email.ilike.%' + query + '%')
        .order('total_visits', { ascending: false }).limit(20);
      return ok(res);
    },
    update: async function (id, patch) {
      var res = await sb.from('cov_guests').update(patch).eq('id', id).select().single();
      return ok(res);
    },
    upsert: async function (fields) {
      var res = await sb.from('cov_guests')
        .upsert(fields, { onConflict: 'restaurant_id,phone' }).select().single();
      return ok(res);
    },
  };

  // ---- reservations ---------------------------------------------------------
  var covReservations = {
    listByDate: async function (restaurantId, isoDate) {
      var startUtc = isoDate + 'T00:00:00.000Z';
      var endUtc   = isoDate + 'T23:59:59.999Z';
      var res = await sb.from('cov_reservations')
        .select('*, cov_guests(id,name,phone,tags,no_show_count,total_visits), cov_tables(id,label,room_id)')
        .eq('restaurant_id', restaurantId)
        .gte('starts_at', startUtc).lte('starts_at', endUtc)
        .neq('status', 'cancelled').order('starts_at');
      return ok(res);
    },
    listUpcoming: async function (restaurantId, hoursAhead) {
      hoursAhead = hoursAhead || 2;
      var now   = new Date().toISOString();
      var until = new Date(Date.now() + hoursAhead * 3600 * 1000).toISOString();
      var res = await sb.from('cov_reservations')
        .select('*, cov_guests(id,name,phone,tags), cov_tables(id,label)')
        .eq('restaurant_id', restaurantId)
        .gte('starts_at', now).lte('starts_at', until)
        .in('status', ['booked', 'confirmed']).order('starts_at').limit(20);
      return ok(res);
    },
    countCoversForDate: async function (restaurantId, isoDate) {
      var startUtc = isoDate + 'T00:00:00.000Z';
      var endUtc   = isoDate + 'T23:59:59.999Z';
      var res = await sb.from('cov_reservations')
        .select('party_size').eq('restaurant_id', restaurantId)
        .gte('starts_at', startUtc).lte('starts_at', endUtc)
        .in('status', ['booked', 'confirmed', 'seated', 'completed']);
      var rows = ok(res) || [];
      return rows.reduce(function (sum, r) { return sum + (r.party_size || 0); }, 0);
    },
    noShowRate30d: async function (restaurantId) {
      var since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
      var res = await sb.from('cov_reservations')
        .select('status').eq('restaurant_id', restaurantId)
        .gte('starts_at', since).in('status', ['completed', 'no_show']);
      var rows = ok(res) || [];
      if (!rows.length) return 0;
      var noShows = rows.filter(function (r) { return r.status === 'no_show'; }).length;
      return noShows / rows.length;
    },
    get: async function (id) {
      var res = await sb.from('cov_reservations')
        .select('*, cov_guests(*), cov_tables(id,label,room_id,seats_max)')
        .eq('id', id).single();
      return ok(res);
    },
    create: async function (fields) {
      var res = await sb.from('cov_reservations').insert(fields).select().single();
      return ok(res);
    },
    update: async function (id, patch) {
      var res = await sb.from('cov_reservations').update(patch).eq('id', id).select().single();
      return ok(res);
    },
    updateStatus: async function (id, status) {
      var patch = { status: status };
      if (status === 'seated')    patch.seated_at    = new Date().toISOString();
      if (status === 'completed') patch.completed_at = new Date().toISOString();
      if (status === 'cancelled') patch.cancelled_at = new Date().toISOString();
      var res = await sb.from('cov_reservations').update(patch).eq('id', id).select().single();
      return ok(res);
    },
    assignTable: async function (id, tableId) {
      var res = await sb.from('cov_reservations')
        .update({ table_id: tableId }).eq('id', id).select().single();
      return ok(res);
    },
    cancel: async function (id) {
      var res = await sb.from('cov_reservations')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('id', id).select().single();
      return ok(res);
    },
  };

  // ---- blackouts ------------------------------------------------------------
  var covBlackouts = {
    list: async function (restaurantId) {
      var res = await sb.from('cov_blackouts')
        .select('*').eq('restaurant_id', restaurantId).order('starts_at');
      return ok(res);
    },
    listActive: async function (restaurantId) {
      var now = new Date().toISOString();
      var res = await sb.from('cov_blackouts')
        .select('*').eq('restaurant_id', restaurantId)
        .gte('end_at', now).order('starts_at');
      return ok(res);
    },
    create: async function (fields) {
      var res = await sb.from('cov_blackouts').insert(fields).select().single();
      return ok(res);
    },
    update: async function (id, patch) {
      var res = await sb.from('cov_blackouts').update(patch).eq('id', id).select().single();
      return ok(res);
    },
    remove: async function (id) {
      var res = await sb.from('cov_blackouts').delete().eq('id', id);
      return ok(res);
    },
  };

  // ---- rpc (COV) ------------------------------------------------------------
  var covRpc = {
    availableSlots: async function (slug, date, partySize) {
      var res = await sb.rpc('cov_available_slots', {
        p_slug:  slug,
        p_date:  date,
        p_party: partySize,
      });
      return ok(res);
    },
    book: async function (slug, startsAt, partySize, name, phone, email, requests) {
      var res = await sb.rpc('cov_book', {
        p_slug:     slug,
        p_start:    startsAt,
        p_party:    partySize,
        p_name:     name,
        p_phone:    phone,
        p_email:    email    || null,
        p_requests: requests || null,
      });
      return ok(res);
    },
    manageGet: async function (token) {
      var res = await sb.rpc('cov_manage_get', { p_token: token });
      return ok(res);
    },
    manageCancel: async function (token) {
      var res = await sb.rpc('cov_manage_cancel', { p_token: token });
      return ok(res);
    },
  };

  // ---- onboarding -----------------------------------------------------------
  var covOnboarding = {
    seed: async function (userId, name, timezone) {
      timezone = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      var slug = slugify(name);

      var rest = await covRestaurant.insert({
        owner_user_id:         userId,
        name:                  name,
        slug:                  slug,
        timezone:              timezone,
        booking_enabled:       true,
        default_turn_minutes:  90,
        buffer_minutes:        15,
        max_party_online:      10,
        deposit_required:      false,
      });

      var room = await covRooms.create({
        restaurant_id: rest.id,
        name:          'Main Dining',
        sort_order:    0,
        is_active:     true,
      });

      await covServicePeriods.create({
        restaurant_id:         rest.id,
        name:                  'Dinner',
        days_of_week:          [0,1,2,3,4,5,6],
        start_time:            '17:00:00',
        end_time:              '22:00:00',
        last_seating_time:     '21:30:00',
        slot_interval_minutes: 30,
      });

      var sampleTables = [
        { label: 'T1', seats_min: 1, seats_max: 2, shape: 'square', pos_x: 40,  pos_y: 40,  sort_order: 0, online_bookable: true },
        { label: 'T2', seats_min: 1, seats_max: 2, shape: 'square', pos_x: 160, pos_y: 40,  sort_order: 1, online_bookable: true },
        { label: 'T3', seats_min: 2, seats_max: 4, shape: 'rect',   pos_x: 40,  pos_y: 160, sort_order: 2, online_bookable: true },
        { label: 'T4', seats_min: 4, seats_max: 6, shape: 'rect',   pos_x: 200, pos_y: 160, sort_order: 3, online_bookable: true },
      ];
      for (var i = 0; i < sampleTables.length; i++) {
        var t = Object.assign({}, sampleTables[i], {
          restaurant_id: rest.id,
          room_id:       room.id,
          width:         80,
          height:        60,
          is_active:     true,
        });
        await covTables.create(t);
      }

      return rest;
    },
  };

  /* ==========================================================================
     MESA DATA HELPERS (every helper mesa.js exposed)
  ========================================================================== */

  async function loadTableBill(code) {
    var rTable = await sb.from('mesa_tables')
      .select('id,restaurant_id,label,table_code,seats')
      .eq('table_code', code).maybeSingle();
    if (rTable.error) throw rTable.error;
    if (!rTable.data) return { notFound: true };
    var table = rTable.data;

    var rRest = await sb.from('mesa_restaurants')
      .select('id,name,slug,brand_logo_url,brand_primary,brand_accent,currency,service_charge_pct,tax_pct,tip_presets')
      .eq('id', table.restaurant_id).maybeSingle();
    if (rRest.error) throw rRest.error;
    var rest = rRest.data;
    if (rest) {
      rest.service_charge_pct = parseFloat(rest.service_charge_pct) || 0;
      rest.tax_pct = parseFloat(rest.tax_pct) || 0;
      if (typeof rest.tip_presets === 'string') {
        try { rest.tip_presets = JSON.parse(rest.tip_presets); } catch (e) { rest.tip_presets = null; }
      }
    }

    /* Live sessions only — a settled ('paid') session must NOT surface to the
       next guest who scans this table (they'd see the previous guest's bill). */
    var rSess = await sb.from('mesa_sessions')
      .select('id,status,party_size,server_staff_id,opened_at')
      .eq('table_id', table.id).in('status', ['open', 'seated', 'scanned', 'paying'])
      .order('opened_at', { ascending: false }).limit(1).maybeSingle();
    if (rSess.error) throw rSess.error;
    var session = rSess.data;
    var items = [], server = null;

    if (session) {
      var rItems = await sb.from('mesa_order_items')
        /* `voided` is needed so the QR bill can drop staff-voided lines live
           (POS pos_void_item SOFT-deletes: voided=true, kitchen_status='void'
           — the row stays). Without it the bill keeps showing/charging a
           line the cashier already removed. */
        .select('id,name,unit_price_cents,qty,claimed_by,menu_item_id,voided')
        .eq('session_id', session.id).order('created_at', { ascending: true });
      if (rItems.error) throw rItems.error;
      items = rItems.data || [];
      if (session.server_staff_id) {
        var rSrv = await sb.from('mesa_staff').select('name').eq('id', session.server_staff_id).maybeSingle();
        server = rSrv.data ? rSrv.data.name : null;
      }
    }
    return { table: table, restaurant: rest, session: session, items: items, server: server };
  }

  function billMath(items, serviceChargePct, taxPct) {
    /* Mirrors pos_session_bill: total = items + tax + service. The QR flow used
       to omit tax entirely, so QR and POS disagreed on the same items.
       Voided lines (POS soft-delete) are excluded here so QR totals match the
       POS bill RPC, which also ignores voided rows. */
    var subtotal = (items || []).reduce(function (s, it) {
      if (it.voided) return s;
      return s + it.unit_price_cents * it.qty;
    }, 0);
    var service = Math.round(subtotal * (Number(serviceChargePct || 0) / 100));
    var tax     = Math.round(subtotal * (Number(taxPct || 0) / 100));
    return {
      subtotal_cents: subtotal,
      service_cents: service,
      tax_cents: tax,
      total_before_tip_cents: subtotal + tax + service,
    };
  }

  async function claimItem(itemId, label) {
    var q = sb.from('mesa_order_items').update({ claimed_by: label }).eq('id', itemId);
    if (label) q = q.is('claimed_by', null);
    return q.select('id,claimed_by').maybeSingle();
  }

  async function insertPayment(p) {
    return sb.from('mesa_payments')
      .insert(Object.assign({ status: 'succeeded' }, p))
      .select('id').single();
  }

  async function joinLoyalty(restaurantId, phone, name) {
    return sb.rpc('mesa_loyalty_join', {
      p_restaurant: restaurantId, p_phone: phone, p_name: name || null,
    });
  }

  async function startTableOrder(restaurantId, tableId) {
    var existing = await sb.from('mesa_sessions')
      .select('id').eq('table_id', tableId)
      .in('status', ['open', 'seated', 'scanned', 'paying'])
      .order('opened_at', { ascending: false }).limit(1).maybeSingle();
    var sessionId = existing && existing.data ? existing.data.id : null;

    if (!sessionId) {
      var sIns = await sb.from('mesa_sessions')
        .insert({ restaurant_id: restaurantId, table_id: tableId, status: 'seated', source: 'qr' })
        .select('id').single();
      if (sIns.error) {
        var re = await sb.from('mesa_sessions').select('id').eq('table_id', tableId)
          .in('status', ['open', 'seated', 'scanned', 'paying'])
          .order('opened_at', { ascending: false }).limit(1).maybeSingle();
        if (re.error || !re.data) return { error: sIns.error };
        sessionId = re.data.id;
      } else {
        sessionId = sIns.data.id;
      }
    }

    var ord = await sb.from('mesa_orders').select('id')
      .eq('session_id', sessionId).order('created_at', { ascending: false }).limit(1).maybeSingle();
    var orderId = ord && ord.data ? ord.data.id : null;
    if (!orderId) {
      var oIns = await sb.from('mesa_orders')
        .insert({ session_id: sessionId, restaurant_id: restaurantId })
        .select('id').single();
      if (oIns.error) return { error: oIns.error };
      orderId = oIns.data.id;
    }
    return { error: null, session_id: sessionId, order_id: orderId };
  }

  // Cart lines come in TWO shapes:
  //   plain  : { menu_item_id, name, unit_price_cents | base_price_cents, qty }
  //   w/mods : { menu_item_id, name, base_price_cents, qty,
  //             modifiers:[{ modifier_id, name, price_delta_cents }] }
  //
  // WRITE PATH (verified against the live project 2026-06-18):
  //   - anon CANNOT INSERT pos_order_item_modifiers (RLS 42501).
  //   - anon CAN call the pos_add_item RPC (SECURITY DEFINER) which creates the
  //     line AND persists its modifiers atomically.
  // So: lines WITH modifiers go through pos_add_item (one RPC per physical unit).
  // Plain lines keep the cheap bulk INSERT into mesa_order_items (unchanged path,
  // base price only). pos_add_item also handles firing, but we keep a single
  // explicit pos_fire_session at the end as a backstop for the plain-insert path.
  async function addOrderItems(orderId, sessionId, items) {
    var plainRows = [];
    var modLines  = [];
    (items || []).forEach(function (it) {
      var n = Math.max(1, Number(it.qty || 1));
      var base = (it.base_price_cents != null) ? it.base_price_cents : it.unit_price_cents;
      var hasMods = it.modifiers && it.modifiers.length;
      if (hasMods) {
        for (var k = 0; k < n; k++) { modLines.push(it); }   // one RPC call per unit
      } else {
        for (var i = 0; i < n; i++) {
          plainRows.push({
            order_id:         orderId,
            session_id:       sessionId,
            menu_item_id:     it.menu_item_id || null,
            name:             it.name,
            unit_price_cents: base,
            qty:              1,
          });
        }
      }
    });

    var totalCount = plainRows.length + modLines.length;
    if (!totalCount) return { error: null, count: 0 };

    // 1) plain lines — single bulk insert
    if (plainRows.length) {
      var ins = await sb.from('mesa_order_items').insert(plainRows);
      if (ins.error) return { error: ins.error, count: 0 };
    }

    // 2) modifier lines — pos_add_item RPC (anon-callable, persists modifiers)
    for (var m2 = 0; m2 < modLines.length; m2++) {
      var line = modLines[m2];
      var modIds = (line.modifiers || []).map(function (mm) { return mm.modifier_id; });
      var rpc = await sb.rpc('pos_add_item', {
        p_session:      sessionId,
        p_menu_item:    line.menu_item_id,
        p_qty:          1,
        p_seat:         null,
        p_course:       1,
        p_notes:        null,
        p_modifier_ids: modIds,
      });
      if (rpc.error) return { error: rpc.error, count: m2 };
    }

    // QR/diner orders fire to the kitchen immediately so the line cooks see them
    // (POS v2 unified kitchen — QR orders no longer get stuck at kitchen_status 'new').
    try { await sb.rpc('pos_fire_session', { p_session: sessionId }); } catch (e) {}
    return { error: null, count: totalCount };
  }

  /* --------------------------------------------------------------------------
     POS DASHBOARD METRICS (admin landing page)
     The admin app's state.restaurant is a cov_restaurants row, which has no
     POS data. The POS lives on mesa_restaurants, linked by plat_restaurant_id.
     resolveMesaRestaurantId() maps cov.plat_restaurant_id -> mesa_restaurants.id.

     posDashboardMetrics() returns today's live POS/QR KPIs for that restaurant:
       - openTables   : sessions NOT in (paid,closed)        [point-in-time]
       - revenueCents : today's succeeded payments, principal only (excl tips)
       - paidSessions : distinct sessions paid today          [today, local tz]
       - avgTicketCents: revenueCents / paidSessions (0 when none)
       - currency     : ISO code for money() formatting
     "Today" is the restaurant's local calendar day. pos_x_report computes the
     local-midnight cutoff server-side from the restaurant timezone (verified:
     its `since` matches the JS local-midnight for Asia/Kuwait), so revenue and
     openTables come straight from it. pos_x_report exposes no order/session
     count, so paidSessions is a small supplemental query over today's payments.
     Voided items are excluded from revenue by construction: revenue is summed
     from succeeded payments (voided line items never reach a payment), and
     pos_x_report's net_cents is payment-derived, not line-item-derived.
  -------------------------------------------------------------------------- */
  async function resolveMesaRestaurantId(restaurant) {
    if (!restaurant) return null;
    // The cov row carries plat_restaurant_id; mesa shares the same plat link.
    var platId = restaurant.plat_restaurant_id;
    if (!platId) return null;
    var res = await sb.from('mesa_restaurants')
      .select('id,currency')
      .eq('plat_restaurant_id', platId)
      .limit(1)
      .maybeSingle();
    if (res.error || !res.data) return null;
    return { id: res.data.id, currency: res.data.currency || (restaurant.currency || 'USD') };
  }

  async function posDashboardMetrics(restaurant) {
    var mesa = await resolveMesaRestaurantId(restaurant);
    if (!mesa) return { available: false };

    // 1) pos_x_report — open sessions + today's revenue (timezone-correct, server-side).
    var x = await sb.rpc('pos_x_report', { p_restaurant: mesa.id });
    if (x.error) throw x.error;
    var report = x.data || {};
    var sales  = report.sales_today || {};
    var openTables   = Number(report.open_sessions || 0);
    var revenueCents = Number(sales.net_cents || 0); // principal, excludes tips

    // 2) Paid sessions today — distinct sessions with a succeeded payment since
    //    the SAME local-midnight cutoff pos_x_report used (report.since). Today's
    //    payment volume is small, so fetching session_ids and de-duping client
    //    side is cheap and avoids a second RPC.
    var since = report.since;
    var paidSessions = 0;
    if (since) {
      var pr = await sb.from('mesa_payments')
        .select('session_id')
        .eq('restaurant_id', mesa.id)
        .eq('status', 'succeeded')
        .gte('created_at', since);
      if (pr.error) throw pr.error;
      var ids = {};
      (pr.data || []).forEach(function (row) { if (row.session_id) ids[row.session_id] = 1; });
      paidSessions = Object.keys(ids).length;
    }

    var avgTicketCents = paidSessions > 0 ? Math.round(revenueCents / paidSessions) : 0;

    return {
      available:      true,
      currency:       mesa.currency,
      openTables:     openTables,
      revenueCents:   revenueCents,
      paidSessions:   paidSessions,
      avgTicketCents: avgTicketCents,
      asOf:           report.as_of || null,
    };
  }

  /* ==========================================================================
     REALTIME
     _chSeq counter: every sb.channel() call gets a unique topic name.
     supabase-js caches channels by topic; reusing a topic after subscribe()
     throws "cannot add postgres_changes callbacks … after subscribe()".
     THIS IS THE PRODUCTION BUG FIX — the suffix pattern is preserved exactly
     and applied to ALL realtime subscriptions (COV + Mesa).
  ========================================================================== */
  var _chSeq = 0;

  var realtime = {
    // ---- COV subscriptions --------------------------------------------------
    subscribeReservations: function (restaurantId, cb) {
      var ch = sb.channel('cov_res_' + restaurantId + '_' + (++_chSeq))
        .on('postgres_changes', {
          event:  '*',
          schema: 'public',
          table:  'cov_reservations',
          filter: 'restaurant_id=eq.' + restaurantId,
        }, cb)
        .subscribe();
      return ch;
    },

    subscribeTables: function (restaurantId, cb) {
      var ch = sb.channel('cov_tbl_' + restaurantId + '_' + (++_chSeq))
        .on('postgres_changes', {
          event:  '*',
          schema: 'public',
          table:  'cov_tables',
          filter: 'restaurant_id=eq.' + restaurantId,
        }, cb)
        .subscribe();
      return ch;
    },

    // ---- Mesa subscriptions (same _chSeq pattern applied) -------------------
    subscribeMesaSession: function (sessionId, cb) {
      var ch = sb.channel('mesa_sess_' + sessionId + '_' + (++_chSeq))
        .on('postgres_changes', {
          event:  '*',
          schema: 'public',
          table:  'mesa_order_items',
          filter: 'session_id=eq.' + sessionId,
        }, cb)
        .subscribe();
      return ch;
    },

    subscribeMesaPayments: function (sessionId, cb) {
      var ch = sb.channel('mesa_pay_' + sessionId + '_' + (++_chSeq))
        .on('postgres_changes', {
          event:  'INSERT',
          schema: 'public',
          table:  'mesa_payments',
          filter: 'session_id=eq.' + sessionId,
        }, cb)
        .subscribe();
      return ch;
    },

    removeChannel: function (ch) {
      if (ch) sb.removeChannel(ch);
    },
  };

  /* ==========================================================================
     PLAT.getModules()
     Cached async. After sign-in, selects the owner's plat_restaurants row
     (limit 1 maybeSingle). Returns:
       { plat: <row|null>, modules: { reservations: bool, qr_pay: bool } }
     Default both-on for accounts predating the platform row.
  ========================================================================== */
  var _modulesCache = null;

  async function getModules() {
    if (_modulesCache) return _modulesCache;
    var res = await sb.from('plat_restaurants').select('*').limit(1).maybeSingle();
    var row = (res && !res.error) ? res.data : null;
    _modulesCache = {
      plat:    row,
      modules: row && row.modules
        ? row.modules
        : { reservations: true, qr_pay: true },
    };
    return _modulesCache;
  }

  // Allow callers to bust the cache (e.g. after onboarding)
  getModules.bust = function () { _modulesCache = null; };

  /* ==========================================================================
     PLAT.net — connection monitor
     Tracks online/offline using navigator.onLine + window events + a lightweight
     heartbeat (HEAD-equivalent: tiny select on plat_restaurants, 5 s timeout).
     Debounces transitions by 1.5 s so brief network blips don't flap the UI.
     API:
       PLAT.net.isOnline()         → bool
       PLAT.net.onChange(cb)       → unsubscribe fn
       PLAT.net.offbanner()        → object — internal, used by pos-terminal.js
  ========================================================================== */
  var _netOnline    = navigator.onLine !== false;
  var _netListeners = [];
  var _netDebounce  = null;
  var _hbTimer      = null;

  function _netFire(nowOnline) {
    if (nowOnline === _netOnline) return;
    _netOnline = nowOnline;
    _netListeners.forEach(function (cb) {
      try { cb(nowOnline); } catch (e) { /* ignore listener errors */ }
    });
  }

  function _netTransition(nowOnline) {
    /* Debounce 1.5 s — avoids flapping on brief sub-second blips */
    if (_netDebounce) clearTimeout(_netDebounce);
    _netDebounce = setTimeout(function () {
      _netDebounce = null;
      _netFire(nowOnline);
    }, 1500);
  }

  /* Browser online/offline events */
  window.addEventListener('online',  function () { _netTransition(true);  });
  window.addEventListener('offline', function () { _netTransition(false); });

  /* Heartbeat — a cheap limit-1 select with a 5 s AbortController timeout.
     If the Supabase client exists we use it; otherwise plain fetch to the URL. */
  function _netHeartbeat() {
    var done = false;
    var abortCtrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = setTimeout(function () {
      if (!done) { done = true; if (abortCtrl) abortCtrl.abort(); _netTransition(false); }
    }, 5000);

    var cleanup = function (ok) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      _netTransition(ok);
    };

    /* Try a fetch HEAD against the Supabase REST root — works even without the
       JS client, costs zero tokens, never mutates data */
    var hbUrl = CFG.SUPABASE_URL + '/rest/v1/plat_restaurants?select=id&limit=1';
    var fetchOpts = {
      method:  'GET',
      headers: { 'apikey': CFG.SUPABASE_KEY, 'Authorization': 'Bearer ' + CFG.SUPABASE_KEY },
    };
    if (abortCtrl) fetchOpts.signal = abortCtrl.signal;
    fetch(hbUrl, fetchOpts).then(function (resp) {
      cleanup(resp.ok || resp.status === 406 /* empty 406 is still reachable */);
    }).catch(function () {
      cleanup(false);
    });
  }

  /* Schedule heartbeat every 15 s; fire once immediately */
  _netHeartbeat();
  _hbTimer = setInterval(_netHeartbeat, 15000);

  var net = {
    isOnline: function () { return _netOnline; },
    onChange: function (cb) {
      _netListeners.push(cb);
      return function () {
        _netListeners = _netListeners.filter(function (x) { return x !== cb; });
      };
    },
  };

  /* ==========================================================================
     PLAT.outbox — order-write queue
     Persists add-item / fire-course ops to localStorage when offline.
     On reconnect, the POS calls outbox.replay(onItem, onDone).
     PAYMENTS ARE NEVER QUEUED — callers must guard pos_pay separately.
     Each entry: { id, op, params, ts }
       op: 'add_item' | 'fire_course'
     id: client-generated UUID used to skip already-applied ops on replay.
  ========================================================================== */
  var OUTBOX_KEY = 'tavolo-pos-outbox';

  /* Simple pseudo-UUID — crypto.randomUUID not universally available */
  function _outboxId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  function _outboxRead() {
    try { return JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]') || []; } catch (e) { return []; }
  }

  function _outboxWrite(entries) {
    try { localStorage.setItem(OUTBOX_KEY, JSON.stringify(entries)); } catch (e) { /* storage full */ }
  }

  var outbox = {
    /* Append an entry. Returns the generated id. */
    push: function (op, params) {
      var entry = { id: _outboxId(), op: op, params: params, ts: Date.now() };
      var entries = _outboxRead();
      entries.push(entry);
      _outboxWrite(entries);
      return entry.id;
    },
    /* Number of pending entries */
    size: function () { return _outboxRead().length; },
    /* Clear entries by id list */
    remove: function (ids) {
      if (!ids || !ids.length) return;
      var set = {};
      ids.forEach(function (id) { set[id] = true; });
      _outboxWrite(_outboxRead().filter(function (e) { return !set[e.id]; }));
    },
    /* Drain the queue: calls onItem(entry)→Promise for each, collects successes.
       After all settle, calls onDone(failCount). */
    replay: function (onItem, onDone) {
      var entries = _outboxRead();
      if (!entries.length) { if (onDone) onDone(0); return; }
      var applied = [], failed = 0;
      var chain = Promise.resolve();
      entries.forEach(function (entry) {
        chain = chain.then(function () {
          return Promise.resolve(onItem(entry)).then(function () {
            applied.push(entry.id);
          }).catch(function () {
            failed++;
          });
        });
      });
      chain.then(function () {
        outbox.remove(applied);
        if (onDone) onDone(failed);
      });
    },
  };

  /* ==========================================================================
     window.PLAT — canonical namespace
  ========================================================================== */
  window.PLAT = {
    config: CFG,
    client: sb,   // canonical client reference (also aliased as .sb below for compat)
    sb:     sb,   // back-compat alias used by shims

    auth: auth,

    confirmDialog: confirmDialog,
    promptDialog:  promptDialog,

    data: {
      mesa: {
        loadTableBill:  loadTableBill,
        billMath:       billMath,
        claimItem:      claimItem,
        insertPayment:  insertPayment,
        joinLoyalty:    joinLoyalty,
        startTableOrder: startTableOrder,
        addOrderItems:  addOrderItems,
        posDashboardMetrics: posDashboardMetrics,
      },
      cov: {
        auth:           auth,          // COV screens access auth via data.cov.auth
        restaurant:     covRestaurant,
        rooms:          covRooms,
        tables:         covTables,
        servicePeriods: covServicePeriods,
        guests:         covGuests,
        reservations:   covReservations,
        blackouts:      covBlackouts,
        rpc:            covRpc,
        realtime:       realtime,      // COV screens also reach realtime via data.cov.realtime
        onboarding:     covOnboarding,
      },
    },

    realtime: realtime,

    utils: {
      // Core DOM
      el:             el,
      els:            els,
      h:              h,
      esc:            esc,
      toast:          toast,
      // Money
      money:          money,
      dollars:        dollars,
      // Brand
      applyBrand:     applyBrand,
      contrastWithWhite: contrastWithWhite,
      relLum:         relLum,
      // COV-origin helpers
      skeletonCards:  skeletonCards,
      formatDate:     formatDate,
      formatTime:     formatTime,
      slugify:        slugify,
    },

    net:        net,
    outbox:     outbox,

    screens:    {},
    getModules: getModules,
  };

  /* ==========================================================================
     BACK-COMPAT SHIMS
     window.MESA and window.COV expose the same public surfaces the original
     files exposed, delegating to PLAT internals. Existing pay.html and all
     Coverly screen modules continue to work unmodified.
  ========================================================================== */

  // ---- MESA shim (mirrors window.MESA as exported by mesa.js) ---------------
  window.MESA = {
    cfg:              CFG,
    sb:               sb,
    money:            money,
    dollars:          dollars,
    el:               el,
    els:              els,
    h:                h,
    esc:              esc,
    toast:            toast,
    confirmDialog:    confirmDialog,
    promptDialog:     promptDialog,
    applyBrand:       applyBrand,
    contrastWithWhite: contrastWithWhite,
    loadTableBill:    loadTableBill,
    billMath:         billMath,
    claimItem:        claimItem,
    insertPayment:    insertPayment,
    joinLoyalty:      joinLoyalty,
    startTableOrder:  startTableOrder,
    addOrderItems:    addOrderItems,
  };

  // ---- COV shim (mirrors window.COV as exported by data.js) -----------------
  window.COV = {
    sb:   sb,
    data: {
      auth:           auth,
      restaurant:     covRestaurant,
      rooms:          covRooms,
      tables:         covTables,
      servicePeriods: covServicePeriods,
      guests:         covGuests,
      reservations:   covReservations,
      blackouts:      covBlackouts,
      rpc:            covRpc,
      realtime:       realtime,
      onboarding:     covOnboarding,
    },
    utils: {
      el:             el,
      els:            els,
      esc:            esc,
      toast:          toast,
      skeletonCards:  skeletonCards,
      formatDate:     formatDate,
      formatTime:     formatTime,
      slugify:        slugify,
    },
  };

  console.info('[tavolo] platform.js ready');

}());
