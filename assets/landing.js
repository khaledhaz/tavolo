/* =============================================================
   TAVOLO LANDING — Interactive Floor Demo
   Pure class-toggling, no fetch, no framework.
   ============================================================= */
(function () {
  'use strict';

  /* ----------------------------------------------------------
     TABLE DATA
     state: 'empty' | 'occupied' | 'paying'
  ---------------------------------------------------------- */
  var TABLES = [
    { id: 'T1', label: 'T1', state: 'occupied', guests: 2, orders: [
      { name: 'Burrata & Prosciutto', qty: 1, price: 18 },
      { name: 'Linguine Vongole',     qty: 1, price: 26 },
      { name: 'House Rosé (glass)',   qty: 2, price: 24 }
    ]},
    { id: 'T2', label: 'T2', state: 'empty',    guests: 0, orders: [] },
    { id: 'T3', label: 'T3', state: 'occupied', guests: 4, orders: [
      { name: 'Ribeye Steak',   qty: 2, price: 96 },
      { name: 'Tiramisu',       qty: 2, price: 28 },
      { name: 'Barolo 750ml',   qty: 1, price: 85 }
    ]},
    { id: 'T4', label: 'T4', state: 'paying',   guests: 3, orders: [
      { name: 'Sea Bass',       qty: 2, price: 68 },
      { name: 'Lamb Ragu',      qty: 1, price: 28 },
      { name: 'Espresso ×3',   qty: 1, price: 15 }
    ]},
    { id: 'T5', label: 'T5', state: 'empty',    guests: 0, orders: [] },
    { id: 'T6', label: 'T6', state: 'occupied', guests: 2, orders: [
      { name: 'Beef Tartare',   qty: 1, price: 22 },
      { name: 'Duck Confit',    qty: 2, price: 72 },
      { name: 'Côtes du Rhône', qty: 1, price: 48 }
    ]},
    { id: 'T7', label: 'T7', state: 'occupied', guests: 6, orders: [
      { name: 'Sharing Boards ×2',   qty: 2, price: 68 },
      { name: 'Chicken Supreme',     qty: 3, price: 87 },
      { name: 'Champagne (bottle)',  qty: 1, price: 95 }
    ]},
    { id: 'T8', label: 'T8', state: 'empty',    guests: 0, orders: [] },
  ];

  /* ----------------------------------------------------------
     DOM REFS
  ---------------------------------------------------------- */
  var floorEl   = document.getElementById('demo-floor');
  var panelEl   = document.getElementById('demo-panel');
  var titleEl   = document.getElementById('demo-panel-title');
  var guestsEl  = document.querySelector('.demo-panel-guests');
  var itemsEl   = document.getElementById('demo-panel-items');
  var totalEl   = document.getElementById('demo-panel-total-amt');
  var payBtn    = document.getElementById('demo-pay-btn');
  var payLabel  = document.getElementById('demo-pay-label');
  var payAnim   = document.getElementById('demo-pay-anim');
  var closeBtn  = document.getElementById('demo-panel-close');
  var hintEl    = document.getElementById('demo-hint');

  if (!floorEl) return; // guard: demo section not on page

  /* ----------------------------------------------------------
     RENDER FLOOR TABLES
  ---------------------------------------------------------- */
  var cellEls = {}; // id → DOM element

  TABLES.forEach(function (tbl) {
    var el = document.createElement('button');
    el.className   = 'dt dt-' + tbl.state;
    el.id          = 'dt-' + tbl.id;
    el.dataset.id  = tbl.id;
    el.type        = 'button';
    el.setAttribute('aria-label',
      tbl.state === 'empty'
        ? 'Table ' + tbl.label + ' — empty'
        : 'Table ' + tbl.label + ' — ' + tbl.state + ', click to view order');

    el.innerHTML =
      '<span>' + tbl.label + '</span>' +
      '<span>' + (tbl.state === 'empty' ? 'Empty' : tbl.state === 'paying' ? 'Paying' : 'Occupied') + '</span>';

    if (tbl.state !== 'empty') {
      el.addEventListener('click',  function () { openPanel(tbl.id); });
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPanel(tbl.id); }
      });
    } else {
      el.disabled = true;
      el.style.cursor = 'default';
    }

    cellEls[tbl.id] = el;
    floorEl.appendChild(el);
  });

  /* ----------------------------------------------------------
     STATE
  ---------------------------------------------------------- */
  var activeId     = null;
  var paymentInFlight = false;

  /* ----------------------------------------------------------
     OPEN PANEL
  ---------------------------------------------------------- */
  function openPanel(id) {
    var tbl = TABLES.find(function (t) { return t.id === id; });
    if (!tbl) return;

    /* deactivate previous */
    if (activeId && cellEls[activeId]) {
      cellEls[activeId].classList.remove('dt-active');
    }
    activeId = id;
    cellEls[id].classList.add('dt-active');

    /* populate panel */
    titleEl.textContent  = 'Table ' + tbl.label;
    guestsEl.textContent = tbl.guests + ' guests · ordering';

    var total = 0;
    itemsEl.innerHTML = '';
    tbl.orders.forEach(function (item) {
      total += item.price;
      var row = document.createElement('div');
      row.className = 'dpi';
      row.innerHTML =
        '<span class="dpi-qty">' + item.qty + '×</span>' +
        '<span class="dpi-name">' + escHtml(item.name) + '</span>' +
        '<span class="dpi-price">$' + item.price.toFixed(2) + '</span>';
      itemsEl.appendChild(row);
    });

    totalEl.textContent  = '$' + total.toFixed(2);
    payLabel.textContent = 'Pay $' + total.toFixed(2);
    payAnim.classList.remove('active');
    payAnim.textContent = '';
    payBtn.disabled = false;

    /* show panel */
    panelEl.setAttribute('aria-hidden', 'false');
    if (hintEl) hintEl.textContent = 'Panel open — hit Pay to run the payment flow';

    /* focus pay button */
    requestAnimationFrame(function () { payBtn.focus(); });
  }

  /* ----------------------------------------------------------
     CLOSE PANEL
  ---------------------------------------------------------- */
  function closePanel() {
    panelEl.setAttribute('aria-hidden', 'true');
    if (activeId && cellEls[activeId]) {
      cellEls[activeId].classList.remove('dt-active');
      cellEls[activeId].focus();
    }
    activeId = null;
    paymentInFlight = false;
    if (hintEl) hintEl.textContent = 'Click an occupied table to open its order panel';
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', closePanel);
    closeBtn.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); closePanel(); }
    });
  }

  /* Close on Escape */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && panelEl.getAttribute('aria-hidden') === 'false') {
      closePanel();
    }
  });

  /* ----------------------------------------------------------
     PAY ANIMATION — 3-step CSS sequence
     Step 1 (0–900ms):  QR icon + "Scanning QR code…"
     Step 2 (900–1800): spinner + "Processing payment…"
     Step 3 (1800–):    green check + "Payment complete!"
  ---------------------------------------------------------- */
  if (payBtn) {
    payBtn.addEventListener('click', function () {
      if (paymentInFlight) return;
      paymentInFlight = true;
      payBtn.disabled = true;

      var tbl = TABLES.find(function (t) { return t.id === activeId; });
      var total = tbl ? tbl.orders.reduce(function (s, i) { return s + i.price; }, 0) : 0;

      /* Step 1 — QR */
      payAnim.innerHTML = stepHtml('qr',
        '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c2703d" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
        '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>' +
        '<rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3M17 17h3v3"/></svg>',
        'Scanning QR code…');
      payAnim.classList.add('active');

      setTimeout(function () {
        /* Step 2 — Processing */
        payAnim.innerHTML = stepHtml('spin',
          '<div class="pay-spinner"></div>',
          'Processing payment…');
      }, 900);

      setTimeout(function () {
        /* Step 3 — Success */
        payAnim.innerHTML = stepHtml('check',
          '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#3aa870" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="pay-check-icon">' +
          '<circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>',
          'Payment complete! $' + total.toFixed(2) + ' settled.');

        /* Update floor table state after brief pause */
        setTimeout(function () {
          if (activeId && cellEls[activeId]) {
            var cell = cellEls[activeId];
            cell.classList.remove('dt-occupied','dt-paying','dt-active');
            cell.classList.add('dt-empty');
            cell.disabled = true;
            cell.style.cursor = 'default';
            cell.setAttribute('aria-label', 'Table ' + activeId + ' — empty');
            cell.innerHTML =
              '<span>' + activeId + '</span><span>Empty</span>';
          }
          /* Auto-close panel after 1.5 s */
          setTimeout(closePanel, 1500);
        }, 600);
      }, 1900);
    });
  }

  function stepHtml(type, icon, label) {
    return '<div class="pay-step pay-step-' + type + '">' +
           '<div class="pay-step-icon">' + icon + '</div>' +
           '<p class="pay-step-label">' + escHtml(label) + '</p>' +
           '</div>';
  }

  function escHtml(s) {
    return String(s)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;');
  }

})();
