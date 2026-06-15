/* ============================================================================
   Mesa Analytics — Tavolo screen module
   Registers:
     window.COV.screens['qr-analytics']
     window.PLAT.screens['qr-analytics']
   Renders KPI cards, server performance table, top-items bar chart,
   loyalty-member count, and 7/30/90-day range selector.
   Injects own CSS once via <style id="mesa-analytics-css">.
   All CSS classes are namespaced .mesa-* — zero collisions.
   No build step. ES5. Depends on window.PLAT (platform.js loaded first).
   ============================================================================ */

(function () {
  'use strict';

  /* ==========================================================================
     CSS — injected once, namespaced .mesa-*
  ========================================================================== */
  var CSS = '\n\
/* ===== Mesa Analytics Layout ===== */\n\
.mesa-root {\n\
  display: flex;\n\
  flex-direction: column;\n\
  gap: var(--space-5);\n\
  min-width: 0;\n\
}\n\
\n\
/* Toolbar */\n\
.mesa-toolbar {\n\
  display: flex;\n\
  align-items: center;\n\
  justify-content: space-between;\n\
  flex-wrap: wrap;\n\
  gap: var(--space-3);\n\
}\n\
.mesa-toolbar-title {\n\
  font-size: 22px;\n\
  font-weight: 600;\n\
  letter-spacing: -0.01em;\n\
  color: var(--color-text-primary);\n\
}\n\
.mesa-seg {\n\
  display: flex;\n\
  background: var(--color-surface-raised);\n\
  border-radius: var(--radius-full);\n\
  padding: 3px;\n\
  gap: 2px;\n\
}\n\
.mesa-seg-btn {\n\
  padding: 6px 14px;\n\
  border-radius: var(--radius-full);\n\
  font-size: 13px;\n\
  font-weight: 500;\n\
  color: var(--color-text-secondary);\n\
  background: none;\n\
  border: none;\n\
  cursor: pointer;\n\
  transition: background var(--duration-fast), color var(--duration-fast), box-shadow var(--duration-fast);\n\
  white-space: nowrap;\n\
  min-height: 32px;\n\
}\n\
.mesa-seg-btn:focus-visible {\n\
  outline: 2px solid var(--color-primary);\n\
  outline-offset: 1px;\n\
}\n\
.mesa-seg-btn.active {\n\
  background: var(--shell-copper, var(--color-primary));\n\
  color: #fff;\n\
  font-weight: 600;\n\
  box-shadow: var(--shadow-sm);\n\
}\n\
\n\
/* KPI grid */\n\
.mesa-kpi-grid {\n\
  display: grid;\n\
  grid-template-columns: repeat(auto-fill, minmax(175px, 1fr));\n\
  gap: var(--space-4);\n\
}\n\
.mesa-kpi-card {\n\
  background: var(--color-surface);\n\
  border: 1px solid var(--color-border);\n\
  border-radius: var(--radius-lg);\n\
  padding: var(--space-5);\n\
  animation: mesa-kpi-in 0.3s var(--easing-standard) both;\n\
  transition: box-shadow var(--duration-fast), transform var(--duration-fast);\n\
}\n\
.mesa-kpi-card:nth-child(1) { animation-delay: 0.04s; }\n\
.mesa-kpi-card:nth-child(2) { animation-delay: 0.08s; }\n\
.mesa-kpi-card:nth-child(3) { animation-delay: 0.12s; }\n\
.mesa-kpi-card:nth-child(4) { animation-delay: 0.16s; }\n\
.mesa-kpi-card:nth-child(5) { animation-delay: 0.20s; }\n\
.mesa-kpi-card:nth-child(6) { animation-delay: 0.24s; }\n\
@keyframes mesa-kpi-in {\n\
  from { opacity: 0; transform: translateY(6px); }\n\
  to   { opacity: 1; transform: translateY(0); }\n\
}\n\
.mesa-kpi-card:hover { box-shadow: var(--shadow-md); transform: translateY(-1px); }\n\
.mesa-kpi-label {\n\
  font-size: 11px;\n\
  font-weight: 600;\n\
  letter-spacing: 0.08em;\n\
  text-transform: uppercase;\n\
  color: var(--color-text-muted);\n\
  margin-bottom: var(--space-2);\n\
}\n\
.mesa-kpi-value {\n\
  font-size: 28px;\n\
  font-weight: 600;\n\
  letter-spacing: -0.02em;\n\
  font-variant-numeric: tabular-nums;\n\
  color: var(--color-text-primary);\n\
  line-height: 1.1;\n\
}\n\
\n\
/* Two-column content grid */\n\
.mesa-content-grid {\n\
  display: grid;\n\
  grid-template-columns: 1fr 1fr;\n\
  gap: var(--space-4);\n\
}\n\
.mesa-full-col {\n\
  grid-column: 1 / -1;\n\
}\n\
\n\
/* Card panel */\n\
.mesa-panel {\n\
  background: var(--color-surface);\n\
  border: 1px solid var(--color-border);\n\
  border-radius: var(--radius-lg);\n\
  padding: var(--space-5);\n\
  min-width: 0;\n\
}\n\
.mesa-panel-title {\n\
  font-size: 15px;\n\
  font-weight: 600;\n\
  color: var(--color-text-primary);\n\
  margin-bottom: var(--space-4);\n\
}\n\
\n\
/* Data table */\n\
.mesa-table-wrap {\n\
  overflow-x: auto;\n\
  -webkit-overflow-scrolling: touch;\n\
}\n\
.mesa-table {\n\
  width: 100%;\n\
  min-width: 400px;\n\
  border-collapse: collapse;\n\
}\n\
.mesa-table th {\n\
  font-size: 11px;\n\
  font-weight: 600;\n\
  letter-spacing: 0.08em;\n\
  text-transform: uppercase;\n\
  color: var(--color-text-muted);\n\
  padding: var(--space-3) var(--space-4);\n\
  text-align: left;\n\
  border-bottom: 1px solid var(--color-border);\n\
}\n\
.mesa-table td {\n\
  padding: var(--space-3) var(--space-4);\n\
  border-bottom: 1px solid var(--color-border);\n\
  font-size: 14px;\n\
  color: var(--color-text-primary);\n\
  vertical-align: middle;\n\
}\n\
.mesa-table tr:last-child td { border-bottom: none; }\n\
.mesa-table tr:hover td { background: var(--color-surface-raised); }\n\
.mesa-num { font-variant-numeric: tabular-nums; }\n\
\n\
/* Bar chart */\n\
.mesa-bar-chart {\n\
  display: flex;\n\
  flex-direction: column;\n\
  gap: var(--space-2);\n\
}\n\
.mesa-bar-row {\n\
  display: flex;\n\
  align-items: center;\n\
  gap: var(--space-3);\n\
  min-width: 0;\n\
}\n\
.mesa-bar-label {\n\
  width: 130px;\n\
  font-size: 13px;\n\
  color: var(--color-text-secondary);\n\
  text-align: right;\n\
  flex-shrink: 0;\n\
  overflow: hidden;\n\
  text-overflow: ellipsis;\n\
  white-space: nowrap;\n\
  min-width: 0;\n\
}\n\
.mesa-bar-track {\n\
  flex: 1;\n\
  height: 26px;\n\
  background: var(--color-surface-raised);\n\
  border-radius: var(--radius-sm);\n\
  overflow: hidden;\n\
  min-width: 0;\n\
}\n\
.mesa-bar-fill {\n\
  height: 100%;\n\
  /* Use copper accent from shell, fall back to mesa primary */\n\
  background: var(--shell-copper, var(--color-primary));\n\
  border-radius: var(--radius-sm);\n\
  transition: width 0.5s var(--easing-standard);\n\
  min-width: 0;\n\
}\n\
.mesa-bar-val {\n\
  width: 76px;\n\
  font-size: 13px;\n\
  font-weight: 600;\n\
  font-variant-numeric: tabular-nums;\n\
  color: var(--color-text-primary);\n\
  flex-shrink: 0;\n\
}\n\
\n\
/* Loyalty stat */\n\
.mesa-loyalty-num {\n\
  font-size: 36px;\n\
  font-weight: 600;\n\
  font-variant-numeric: tabular-nums;\n\
  color: var(--color-text-primary);\n\
  line-height: 1.1;\n\
  margin-bottom: var(--space-2);\n\
}\n\
.mesa-loyalty-sub {\n\
  font-size: 14px;\n\
  color: var(--color-text-secondary);\n\
}\n\
\n\
/* Skeleton shimmer */\n\
.mesa-skeleton {\n\
  background: linear-gradient(\n\
    90deg,\n\
    var(--color-surface-raised) 25%,\n\
    var(--color-border) 50%,\n\
    var(--color-surface-raised) 75%\n\
  );\n\
  background-size: 800px 100%;\n\
  animation: mesa-shimmer 1.4s infinite linear;\n\
  border-radius: var(--radius-md);\n\
}\n\
@keyframes mesa-shimmer {\n\
  0%   { background-position: -400px 0; }\n\
  100% { background-position:  400px 0; }\n\
}\n\
\n\
/* Empty / error states */\n\
.mesa-empty {\n\
  display: flex;\n\
  flex-direction: column;\n\
  align-items: center;\n\
  justify-content: center;\n\
  padding: var(--space-10) var(--space-5);\n\
  text-align: center;\n\
}\n\
.mesa-empty-icon {\n\
  margin: 0 auto var(--space-4);\n\
}\n\
.mesa-empty-title {\n\
  font-size: 16px;\n\
  font-weight: 600;\n\
  color: var(--color-text-primary);\n\
  margin-bottom: var(--space-2);\n\
}\n\
.mesa-empty-body {\n\
  font-size: 14px;\n\
  color: #666;\n\
  max-width: 320px;\n\
  line-height: 1.6;\n\
}\n\
.mesa-error-bar {\n\
  background: var(--color-destructive-light);\n\
  color: var(--color-destructive);\n\
  border: 1px solid rgba(181, 59, 47, 0.2);\n\
  border-radius: var(--radius-md);\n\
  padding: var(--space-3) var(--space-4);\n\
  font-size: 14px;\n\
  display: flex;\n\
  align-items: center;\n\
  justify-content: space-between;\n\
  gap: var(--space-3);\n\
  role: alert;\n\
}\n\
.mesa-retry-btn {\n\
  background: none;\n\
  border: none;\n\
  color: var(--color-destructive);\n\
  font-weight: 600;\n\
  font-size: 13px;\n\
  cursor: pointer;\n\
  text-decoration: underline;\n\
  padding: 0;\n\
  flex-shrink: 0;\n\
  min-height: 44px;\n\
}\n\
.mesa-retry-btn:focus-visible {\n\
  outline: 2px solid var(--color-destructive);\n\
  outline-offset: 2px;\n\
}\n\
\n\
/* ===== Responsive ===== */\n\
@media (max-width: 1023px) {\n\
  .mesa-content-grid { grid-template-columns: 1fr !important; }\n\
}\n\
@media (max-width: 599px) {\n\
  .mesa-kpi-grid { grid-template-columns: 1fr 1fr; }\n\
  .mesa-kpi-value { font-size: 22px; }\n\
  .mesa-bar-label { width: 80px; font-size: 12px; }\n\
  .mesa-bar-val   { width: 60px; font-size: 12px; }\n\
  .mesa-toolbar   { flex-direction: column; align-items: flex-start; }\n\
  .mesa-seg       { flex-shrink: 0; }\n\
}\n\
@media (max-width: 374px) {\n\
  .mesa-kpi-grid { grid-template-columns: 1fr; }\n\
  .mesa-kpi-value { font-size: 20px; }\n\
}\n\
@media (prefers-reduced-motion: reduce) {\n\
  .mesa-skeleton  { animation: none; background: var(--color-surface-raised); }\n\
  .mesa-kpi-card  { animation: none; }\n\
  .mesa-bar-fill  { transition: none; }\n\
}\n\
';

  /* ==========================================================================
     Inject CSS once
  ========================================================================== */
  function injectStyles() {
    if (document.getElementById('mesa-analytics-css')) return;
    var style = document.createElement('style');
    style.id = 'mesa-analytics-css';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  /* ==========================================================================
     Module-local helpers
  ========================================================================== */
  function esc(s) {
    return window.PLAT.utils.esc(s);
  }

  function money(cents, cur) {
    return window.PLAT.utils.money(cents, cur);
  }

  function toast(msg, kind) {
    return window.PLAT.utils.toast(msg, kind);
  }

  /* ==========================================================================
     Module state
  ========================================================================== */
  var _state = {
    restaurant: null,   // cached mesa_restaurants row
    range:      'today' // 'today' | 'week' | 'month'
  };

  /* ==========================================================================
     Tenant resolution — select limit 1 maybeSingle, cached per session
  ========================================================================== */
  var _restCache = null;

  function getRestaurant() {
    if (_restCache) {
      return Promise.resolve(_restCache);
    }
    return window.PLAT.client
      .from('mesa_restaurants')
      .select('*')
      .limit(1)
      .maybeSingle()
      .then(function (res) {
        if (res.error) throw res.error;
        _restCache = res.data;
        return res.data;
      });
  }

  /* ==========================================================================
     Date helpers
  ========================================================================== */
  function sinceDate(range) {
    var now = new Date();
    var since = new Date(now);
    if (range === 'today') {
      since.setHours(0, 0, 0, 0);
    } else if (range === 'week') {
      since.setDate(since.getDate() - 7);
    } else {
      // 'month' → 30 days
      since.setDate(since.getDate() - 30);
    }
    return since.toISOString();
  }

  /* ==========================================================================
     Skeleton helpers
  ========================================================================== */
  function kpiSkeletons(n) {
    var html = '';
    for (var i = 0; i < n; i++) {
      html += '<div class="mesa-kpi-card">'
            + '<div class="mesa-skeleton" style="height:80px"></div>'
            + '</div>';
    }
    return html;
  }

  function panelSkeleton(h) {
    return '<div class="mesa-skeleton" style="height:' + (h || 160) + 'px"></div>';
  }

  /* ==========================================================================
     KPI count-up animation (respects prefers-reduced-motion)
  ========================================================================== */
  function animateCountUp(el, endVal, prefix, suffix, decimals) {
    if (typeof endVal !== 'number' || !isFinite(endVal)) return;
    var duration  = 700;
    var startTime = null;
    var startVal  = 0;

    function fmt(n) {
      return prefix + n.toFixed(decimals || 0) + suffix;
    }
    function step(ts) {
      if (!startTime) startTime = ts;
      var progress = Math.min((ts - startTime) / duration, 1);
      var ease = 1 - Math.pow(1 - progress, 3);
      el.textContent = fmt(startVal + (endVal - startVal) * ease);
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = fmt(endVal);
      }
    }
    requestAnimationFrame(step);
  }

  function runCountUps(container) {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches) {
      return;
    }
    var els = (container || document).querySelectorAll('.mesa-kpi-value[data-countup]');
    for (var i = 0; i < els.length; i++) {
      var el       = els[i];
      var val      = parseFloat(el.dataset.countup);
      var prefix   = el.dataset.prefix  || '';
      var suffix   = el.dataset.suffix  || '';
      var decimals = parseInt(el.dataset.decimals || '0', 10) || 0;
      if (!isNaN(val)) animateCountUp(el, val, prefix, suffix, decimals);
    }
  }

  /* ==========================================================================
     Build HTML helpers
  ========================================================================== */
  function buildKpiHtml(defs) {
    return defs.map(function (k) {
      var attrs = '';
      if (k.raw !== null && k.raw !== undefined && isFinite(k.raw)) {
        attrs = ' data-countup="' + esc(String(k.raw)) + '"'
              + ' data-prefix="' + esc(k.prefix) + '"'
              + ' data-suffix="' + esc(k.suffix) + '"'
              + ' data-decimals="' + esc(String(k.decimals)) + '"';
      }
      return '<div class="mesa-kpi-card">'
           + '<p class="mesa-kpi-label">' + esc(k.label) + '</p>'
           + '<p class="mesa-kpi-value mesa-num"' + attrs + '>' + esc(k.value) + '</p>'
           + '</div>';
    }).join('');
  }

  function buildServerTable(srv, cur) {
    if (!srv.length) {
      return '<p style="color:var(--color-text-muted);font-size:14px;padding:var(--space-3) 0">'
           + 'No server data for this period.</p>';
    }
    var rows = srv.map(function (s) {
      var rate = (s.rev - s.tips) > 0
        ? (s.tips / (s.rev - s.tips) * 100).toFixed(1)
        : '0.0';
      return '<tr>'
           + '<td>' + esc(s.name) + '</td>'
           + '<td class="mesa-num">' + esc(String(s.sessions)) + '</td>'
           + '<td class="mesa-num">' + esc(money(s.tips, cur)) + '</td>'
           + '<td class="mesa-num">' + esc(rate) + '%</td>'
           + '</tr>';
    }).join('');
    return '<div class="mesa-table-wrap">'
         + '<table class="mesa-table" aria-label="Server performance">'
         + '<thead><tr>'
         + '<th scope="col">Server</th>'
         + '<th scope="col">Sessions</th>'
         + '<th scope="col">Tips earned</th>'
         + '<th scope="col">Avg tip %</th>'
         + '</tr></thead>'
         + '<tbody>' + rows + '</tbody>'
         + '</table>'
         + '</div>';
  }

  function buildBarChart(topItems, cur) {
    if (!topItems.length) {
      return '<p style="color:var(--color-text-muted);font-size:14px">No order data for this period.</p>';
    }
    var maxRev = topItems[0].rev || 1;
    return '<div class="mesa-bar-chart" role="list" aria-label="Top items by revenue">'
         + topItems.map(function (it) {
             var pct = Math.round((it.rev / maxRev) * 100);
             return '<div class="mesa-bar-row" role="listitem">'
                  + '<span class="mesa-bar-label" title="' + esc(it.name) + '" aria-hidden="true">'
                  + esc(it.name) + '</span>'
                  + '<div class="mesa-bar-track" aria-label="' + esc(it.name)
                  + ': ' + esc(money(it.rev, cur)) + '">'
                  + '<div class="mesa-bar-fill" style="width:' + pct + '%" aria-hidden="true"></div>'
                  + '</div>'
                  + '<span class="mesa-bar-val">' + esc(money(it.rev, cur)) + '</span>'
                  + '</div>';
           }).join('')
         + '</div>';
  }

  function buildEmptyState(msg) {
    return '<div class="mesa-empty" role="status">'
         + '<div class="mesa-empty-icon" aria-hidden="true">'
         + '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" '
         + 'stroke="var(--color-text-muted)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'
         + '<line x1="18" y1="20" x2="18" y2="10"/>'
         + '<line x1="12" y1="20" x2="12" y2="4"/>'
         + '<line x1="6" y1="20" x2="6" y2="14"/>'
         + '</svg>'
         + '</div>'
         + '<p class="mesa-empty-title">No data yet</p>'
         + '<p class="mesa-empty-body">' + esc(msg) + '</p>'
         + '</div>';
  }

  function buildErrorBar(safeMsg, retryId) {
    return '<div class="mesa-error-bar" role="alert">'
         + '<span>' + esc(safeMsg) + '</span>'
         + '<button class="mesa-retry-btn" id="' + esc(retryId) + '" type="button">Retry</button>'
         + '</div>';
  }

  /* ==========================================================================
     Data fetch + render
  ========================================================================== */
  function loadAnalytics(sectionEl, rest, range) {
    _state.range = range;

    var sb      = window.PLAT.client;
    var rid     = rest.id;
    var cur     = rest.currency || 'GBP';
    var sinceISO = sinceDate(range);
    var sinceDate10 = sinceISO.slice(0, 10); // YYYY-MM-DD for v_mesa_tips_by_server

    var kpiEl     = sectionEl.querySelector('#masa-kpi-grid');
    var serverEl  = sectionEl.querySelector('#masa-server-table');
    var itemsEl   = sectionEl.querySelector('#masa-top-items');
    var loyaltyEl = sectionEl.querySelector('#masa-loyalty');

    // Skeletons
    if (kpiEl)     kpiEl.innerHTML    = kpiSkeletons(6);
    if (serverEl)  serverEl.innerHTML = panelSkeleton(140);
    if (itemsEl)   itemsEl.innerHTML  = panelSkeleton(180);
    if (loyaltyEl) loyaltyEl.innerHTML = panelSkeleton(80);

    // Fire three queries in parallel (mirrors loadAnalytics in dashboard.html)
    var pPayments = sb.from('mesa_payments')
      .select('amount_cents,tip_cents,service_charge_cents,created_at')
      .eq('restaurant_id', rid)
      .eq('status', 'succeeded')
      .gte('created_at', sinceISO);

    var pServers = sb.from('v_mesa_tips_by_server')
      .select('*')
      .eq('restaurant_id', rid)
      .gte('day', sinceDate10);

    var pLoyalty = sb.from('mesa_loyalty_members')
      .select('id')
      .eq('restaurant_id', rid);

    Promise.all([pPayments, pServers, pLoyalty]).then(function (results) {
      var paymentsRes = results[0];
      var serversRes  = results[1];
      var loyaltyRes  = results[2];

      if (paymentsRes.error || serversRes.error || loyaltyRes.error) {
        var retryId = 'mesa-retry-' + Date.now();
        var errHtml = buildErrorBar('Could not load analytics. Please try again.', retryId);
        if (kpiEl) kpiEl.innerHTML = errHtml;
        if (serverEl)  serverEl.innerHTML  = '';
        if (itemsEl)   itemsEl.innerHTML   = '';
        if (loyaltyEl) loyaltyEl.innerHTML = '';
        // wire retry
        setTimeout(function () {
          var btn = document.getElementById(retryId);
          if (btn) {
            btn.addEventListener('click', function () {
              loadAnalytics(sectionEl, rest, range);
            });
          }
        }, 0);
        return;
      }

      var pmts   = paymentsRes.data || [];
      var servers = serversRes.data  || [];
      var loyalty = loyaltyRes.data  || [];

      /* ----- KPI calculations ----- */
      var totalRev  = 0;
      var totalTips = 0;
      for (var i = 0; i < pmts.length; i++) {
        totalRev  += pmts[i].amount_cents || 0;
        totalTips += pmts[i].tip_cents    || 0;
      }
      var aov         = pmts.length ? Math.round(totalRev / pmts.length) : 0;
      var foodRev     = totalRev - totalTips;
      var tipRatePct  = foodRev > 0 ? parseFloat(((totalTips / foodRev) * 100).toFixed(1)) : null;

      var sym = cur === 'GBP' ? '£' : cur === 'USD' ? '$' : cur === 'EUR' ? '€' : '';

      var kpiDefs = [
        { label: 'Total revenue',     value: money(totalRev, cur),  raw: totalRev / 100,  prefix: sym, suffix: '', decimals: 2 },
        { label: 'Tips collected',    value: money(totalTips, cur), raw: totalTips / 100, prefix: sym, suffix: '', decimals: 2 },
        { label: 'Average order',     value: money(aov, cur),       raw: aov / 100,       prefix: sym, suffix: '', decimals: 2 },
        { label: 'Payments received', value: String(pmts.length),   raw: pmts.length,     prefix: '',  suffix: '', decimals: 0 },
        {
          label: 'Tip rate (of food)',
          value: tipRatePct !== null ? tipRatePct.toFixed(1) + '%' : '—',
          raw:   tipRatePct,
          prefix: '', suffix: '%', decimals: 1
        },
        { label: 'Loyalty members',   value: String(loyalty.length), raw: loyalty.length, prefix: '', suffix: '', decimals: 0 }
      ];

      if (kpiEl) {
        if (!pmts.length && !loyalty.length) {
          kpiEl.innerHTML = buildEmptyState('No payment data for this period. Try a longer range.');
        } else {
          kpiEl.innerHTML = buildKpiHtml(kpiDefs);
          runCountUps(kpiEl);
        }
      }

      /* ----- Server performance table (aggregate by server across period) ----- */
      var srvMap = {};
      for (var j = 0; j < servers.length; j++) {
        var s = servers[j];
        var k = s.server_name || '—';
        if (!srvMap[k]) srvMap[k] = { name: k, sessions: 0, tips: 0, rev: 0 };
        srvMap[k].sessions += s.sessions_served    || 0;
        srvMap[k].tips     += s.total_tip_cents    || 0;
        srvMap[k].rev      += s.total_revenue_cents || 0;
      }
      var srvArr = Object.keys(srvMap).map(function (key) { return srvMap[key]; });
      srvArr.sort(function (a, b) { return b.tips - a.tips; });

      if (serverEl) serverEl.innerHTML = buildServerTable(srvArr, cur);

      /* ----- Top items query — RPC (no 1000-row cap) ----- */
      sb.rpc('pos_item_report', { p_restaurant: rid, p_since: sinceISO, p_top: 8 })
        .then(function (res) {
          if (res.error) {
            if (itemsEl) itemsEl.innerHTML = '<p style="color:var(--color-text-muted);font-size:14px">'
              + 'Could not load item data.</p>';
            return;
          }
          var rpcItems = (res.data && res.data.items) || [];
          var topItems = rpcItems.map(function (it) {
            return { name: it.name, rev: it.revenue_cents };
          });

          if (itemsEl) itemsEl.innerHTML = buildBarChart(topItems, cur);
        });

      /* ----- Loyalty count ----- */
      if (loyaltyEl) {
        loyaltyEl.innerHTML = '<p class="mesa-loyalty-num mesa-num">'
          + esc(String(loyalty.length))
          + '</p>'
          + '<p class="mesa-loyalty-sub">loyalty members enrolled</p>';
      }

    }).catch(function (err) {
      // Catch any unexpected throw — never render raw error objects
      var retryId = 'mesa-retry-unexp-' + Date.now();
      var errHtml = buildErrorBar('An unexpected error occurred. Please try again.', retryId);
      if (kpiEl) kpiEl.innerHTML = errHtml;
      if (serverEl)  serverEl.innerHTML  = '';
      if (itemsEl)   itemsEl.innerHTML   = '';
      if (loyaltyEl) loyaltyEl.innerHTML = '';
      setTimeout(function () {
        var btn = document.getElementById(retryId);
        if (btn) {
          btn.addEventListener('click', function () {
            loadAnalytics(sectionEl, rest, range);
          });
        }
      }, 0);
      console.error('[mesa-analytics] unexpected error', err);
    });
  }

  /* ==========================================================================
     Build scaffold HTML
  ========================================================================== */
  function buildScaffold(range) {
    var ranges = [
      { key: 'today', label: 'Today' },
      { key: 'week',  label: 'This week' },
      { key: 'month', label: 'This month' }
    ];
    var segBtns = ranges.map(function (r) {
      return '<button class="mesa-seg-btn' + (r.key === range ? ' active' : '') + '"'
           + ' data-range="' + esc(r.key) + '"'
           + ' aria-pressed="' + (r.key === range ? 'true' : 'false') + '"'
           + ' type="button">'
           + esc(r.label)
           + '</button>';
    }).join('');

    return '<div class="mesa-root">'

         // Toolbar row
         + '<div class="mesa-toolbar">'
         + '<h2 class="mesa-toolbar-title">Analytics</h2>'
         + '<div class="mesa-seg" role="group" aria-label="Date range">'
         + segBtns
         + '</div>'
         + '</div>'

         // KPI grid
         + '<div id="masa-kpi-grid" class="mesa-kpi-grid" aria-live="polite" aria-busy="true" aria-label="Key metrics">'
         + kpiSkeletons(6)
         + '</div>'

         // Two-column content grid
         + '<div class="mesa-content-grid">'

         // Server performance — full width
         + '<div class="mesa-panel mesa-full-col">'
         + '<h3 class="mesa-panel-title">Server performance</h3>'
         + '<div id="masa-server-table">' + panelSkeleton(140) + '</div>'
         + '</div>'

         // Top items bar chart
         + '<div class="mesa-panel">'
         + '<h3 class="mesa-panel-title">Top items by revenue</h3>'
         + '<div id="masa-top-items">' + panelSkeleton(180) + '</div>'
         + '</div>'

         // Loyalty members
         + '<div class="mesa-panel">'
         + '<h3 class="mesa-panel-title">Loyalty members</h3>'
         + '<div id="masa-loyalty">' + panelSkeleton(80) + '</div>'
         + '</div>'

         + '</div>' // .mesa-content-grid
         + '</div>'; // .mesa-root
  }

  /* ==========================================================================
     Wire range selector
  ========================================================================== */
  function wireRangeButtons(sectionEl, rest) {
    var btns = sectionEl.querySelectorAll('.mesa-seg-btn');
    for (var i = 0; i < btns.length; i++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          // update active state
          for (var j = 0; j < btns.length; j++) {
            btns[j].classList.remove('active');
            btns[j].setAttribute('aria-pressed', 'false');
          }
          btn.classList.add('active');
          btn.setAttribute('aria-pressed', 'true');
          loadAnalytics(sectionEl, rest, btn.dataset.range);
        });
      })(btns[i]);
    }
  }

  /* ==========================================================================
     render(sectionEl) — public entry point
  ========================================================================== */
  function render(sectionEl) {
    injectStyles();

    // If scaffold already built, just reload data for the current range
    if (sectionEl.querySelector('.mesa-root')) {
      getRestaurant().then(function (rest) {
        if (!rest) return;
        loadAnalytics(sectionEl, rest, _state.range);
      }).catch(function () {
        /* silently swallow — user may not be signed in to mesa */
      });
      return;
    }

    // First render: resolve tenant, then build scaffold + load
    getRestaurant().then(function (rest) {
      if (!rest) {
        sectionEl.innerHTML = buildEmptyState(
          'No Mesa restaurant found. Set up a restaurant in Mesa to see analytics.'
        );
        return;
      }
      _state.restaurant = rest;

      sectionEl.innerHTML = buildScaffold(_state.range);
      wireRangeButtons(sectionEl, rest);
      loadAnalytics(sectionEl, rest, _state.range);

    }).catch(function () {
      sectionEl.innerHTML = buildErrorBar(
        'Could not connect to Mesa. Please sign in and try again.',
        'mesa-analytics-boot-retry'
      );
      setTimeout(function () {
        var btn = document.getElementById('mesa-analytics-boot-retry');
        if (btn) {
          btn.addEventListener('click', function () {
            sectionEl.innerHTML = '';
            render(sectionEl);
          });
        }
      }, 0);
    });
  }

  /* ==========================================================================
     Register screen under both window.COV.screens and window.PLAT.screens
  ========================================================================== */
  window.COV        = window.COV        || {};
  window.COV.screens = window.COV.screens || {};
  window.COV.screens['qr-analytics'] = { render: render };

  if (window.PLAT) {
    window.PLAT.screens = window.PLAT.screens || {};
    window.PLAT.screens['qr-analytics'] = { render: render };
  }

}());
