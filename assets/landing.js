/* =============================================================
   TAVOLO LANDING v3 — all page behavior
   1. Nav (scroll state + mobile menu)
   2. FAQ accordion
   3. Pricing toggle
   4. Scroll reveal (IntersectionObserver)
   5. Hero live stage cycler (+ pointer tilt)
   6. "How a shift flows" step cycler
   7. Interactive floor demo (click table → POS panel → pay)
   Pure class-toggling, no fetch, no framework.
   ============================================================= */
(function () {
  /* 0. Hero ambiance video — respect reduced-motion + save battery offscreen */
  (function heroVideo() {
    var v = document.querySelector('.hero-video');
    if (!v) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      try { v.removeAttribute('autoplay'); v.pause(); v.currentTime = 0; } catch (e) {}
      return; /* poster frame stays — still cinematic, no motion */
    }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { var p = v.play(); if (p && p.catch) p.catch(function(){}); }
          else { try { v.pause(); } catch (e) {} }
        });
      }, { threshold: 0.05 });
      io.observe(v);
    }
    var kick = function () { var p = v.play(); if (p && p.catch) p.catch(function(){}); };
    if (v.readyState >= 2) kick(); else v.addEventListener('loadeddata', kick, { once: true });
  })();

  'use strict';

  var REDUCED = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ----------------------------------------------------------
     1a. NAV — transparent → solid on scroll
  ---------------------------------------------------------- */
  var hdr = document.getElementById('site-header');
  if (hdr) {
    var scrolled = false;
    var onScroll = function () {
      var s = window.scrollY > 80;
      if (s !== scrolled) { scrolled = s; hdr.classList.toggle('scrolled', s); }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ----------------------------------------------------------
     1b. Mobile menu toggle
  ---------------------------------------------------------- */
  var toggle = document.getElementById('nav-toggle');
  var menu   = document.getElementById('mobile-menu');
  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      var open = menu.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
      menu.setAttribute('aria-hidden', String(!open));
    });
    menu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        menu.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        menu.setAttribute('aria-hidden', 'true');
      });
    });
  }

  /* ----------------------------------------------------------
     2. FAQ accordion
  ---------------------------------------------------------- */
  function toggleFaq(btn) {
    var expanded = btn.getAttribute('aria-expanded') === 'true';
    document.querySelectorAll('.faq-q').forEach(function (b) {
      b.setAttribute('aria-expanded', 'false');
      var ans = document.getElementById(b.getAttribute('aria-controls'));
      if (ans) ans.classList.remove('open');
    });
    if (!expanded) {
      btn.setAttribute('aria-expanded', 'true');
      var ans = document.getElementById(btn.getAttribute('aria-controls'));
      if (ans) ans.classList.add('open');
    }
  }
  document.querySelectorAll('.faq-q').forEach(function (btn) {
    btn.addEventListener('click', function () { toggleFaq(btn); });
  });

  /* ----------------------------------------------------------
     3. Pricing monthly/annual toggle
  ---------------------------------------------------------- */
  var btnM = document.getElementById('ptog-monthly');
  var btnA = document.getElementById('ptog-annual');
  if (btnM && btnA) {
    [btnM, btnA].forEach(function (btn) {
      btn.addEventListener('click', function () {
        var isAnnual = btn === btnA;
        btnM.classList.toggle('ptoggle-active', !isAnnual);
        btnA.classList.toggle('ptoggle-active',  isAnnual);
        btnM.setAttribute('aria-pressed', String(!isAnnual));
        btnA.setAttribute('aria-pressed', String(isAnnual));
        document.querySelectorAll('.price-amount').forEach(function (el) {
          el.textContent = isAnnual
            ? (el.dataset.annual  || el.dataset.monthly)
            : (el.dataset.monthly || el.textContent);
        });
      });
    });
  }

  /* ----------------------------------------------------------
     4. Scroll reveal
  ---------------------------------------------------------- */
  var reveals = document.querySelectorAll('.reveal');
  reveals.forEach(function (el) { el.classList.add('visible'); });
  if ('IntersectionObserver' in window && !REDUCED) {
    requestAnimationFrame(function () {
      document.documentElement.classList.add('js-ready');
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            obs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15, rootMargin: '0px 0px -32px 0px' });
      reveals.forEach(function (el) { obs.observe(el); });
    });
  }

  /* ----------------------------------------------------------
     5. HERO LIVE STAGE — cycles Floor → POS → Kitchen → QR Pay
  ---------------------------------------------------------- */
  var stage = document.getElementById('hero-stage');
  if (stage) {
    var panels = stage.querySelectorAll('.stage-panel');
    var tabs   = stage.querySelectorAll('.stage-tab');
    var sIdx   = 0;
    var sTimer = null;
    var HOLD   = 4200;
    var stageVisible = true;

    var showPanel = function (i) {
      sIdx = i;
      panels.forEach(function (p, j) { p.classList.toggle('on', j === i); });
      tabs.forEach(function (t) {
        t.classList.remove('active');
        t.setAttribute('aria-pressed', 'false');
      });
      if (tabs[i]) {
        /* force reflow so the underline fill animation restarts */
        void tabs[i].offsetWidth;
        tabs[i].classList.add('active');
        tabs[i].setAttribute('aria-pressed', 'true');
      }
    };
    var stageStart = function () {
      if (sTimer || REDUCED || !stageVisible || document.hidden) return;
      sTimer = setInterval(function () {
        showPanel((sIdx + 1) % panels.length);
      }, HOLD);
    };
    var stageStop = function () {
      if (sTimer) { clearInterval(sTimer); sTimer = null; }
    };

    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () {
        stageStop();
        showPanel(i);
        stageStart();
      });
    });

    showPanel(0);
    if (!REDUCED) {
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            stageVisible = e.isIntersecting;
            if (stageVisible) { stageStart(); } else { stageStop(); }
          });
        }, { threshold: 0.15 }).observe(stage);
      } else {
        stageStart();
      }
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) { stageStop(); } else { stageStart(); }
      });
    }

    /* Pointer tilt — desktop, fine pointers only */
    var wrap = document.querySelector('.hero-stage-wrap');
    if (wrap && !REDUCED &&
        window.matchMedia('(pointer: fine)').matches) {
      wrap.addEventListener('mousemove', function (e) {
        var r = wrap.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width  - 0.5;
        var y = (e.clientY - r.top)  / r.height - 0.5;
        stage.style.setProperty('--ty', (x * 4).toFixed(2) + 'deg');
        stage.style.setProperty('--tx', (-y * 3).toFixed(2) + 'deg');
      });
      wrap.addEventListener('mouseleave', function () {
        stage.style.setProperty('--tx', '0deg');
        stage.style.setProperty('--ty', '0deg');
      });
    }
  }

  /* ----------------------------------------------------------
     6. SHIFT FLOW — cycles the four steps, fills the rail
  ---------------------------------------------------------- */
  var flowWrap = document.getElementById('flow-steps');
  if (flowWrap) {
    var steps = flowWrap.querySelectorAll('.flow-step');
    var fill  = document.getElementById('flow-fill');
    var fIdx  = 0;
    var fTimer = null;
    var flowVisible = false;

    var showStep = function (i) {
      fIdx = i;
      steps.forEach(function (s, j) { s.classList.toggle('active', j === i); });
      if (fill) {
        fill.style.setProperty('--p', String(steps.length > 1 ? i / (steps.length - 1) : 1));
      }
    };
    var flowStart = function () {
      if (fTimer || REDUCED || !flowVisible || document.hidden) return;
      fTimer = setInterval(function () {
        showStep((fIdx + 1) % steps.length);
      }, 3400);
    };
    var flowStop = function () {
      if (fTimer) { clearInterval(fTimer); fTimer = null; }
    };

    if (REDUCED) {
      /* static, complete story: all steps lit, rail full */
      steps.forEach(function (s) { s.classList.add('active'); });
      if (fill) fill.style.setProperty('--p', '1');
    } else if ('IntersectionObserver' in window) {
      showStep(0);
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          flowVisible = e.isIntersecting;
          if (flowVisible) { flowStart(); } else { flowStop(); }
        });
      }, { threshold: 0.25 }).observe(flowWrap);
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) { flowStop(); } else { flowStart(); }
      });
    } else {
      showStep(0);
      flowVisible = true;
      flowStart();
    }
  }

  /* ==========================================================
     7. INTERACTIVE FLOOR DEMO
     ========================================================== */

  /* ----------------------------------------------------------
     TABLE DATA — state: 'empty' | 'occupied' | 'paying'
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
  var activeId        = null;
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
            cell.classList.remove('dt-occupied', 'dt-paying', 'dt-active');
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
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ----------------------------------------------------------
     V3: Demo step chips — mark done as user progresses
  ---------------------------------------------------------- */
  var chip1 = document.getElementById('demo-chip-1');
  var chip2 = document.getElementById('demo-chip-2');
  var chip3 = document.getElementById('demo-chip-3');
  var closedToast = document.getElementById('demo-closed-toast');
  var chip1done = false, chip2done = false;

  /* Step 1 done: table clicked (openPanel already called above).
     We hook into openPanel by patching closePanel to track state. */
  var _origOpen = typeof openPanel === 'function' ? openPanel : null;
  /* Instead, listen for the pay button being clicked (step 2 → done) and
     the payment completing (step 3 → done) via MutationObserver on payAnim */
  if (payBtn && chip1) {
    /* Step 1 complete when panel opens — watch aria-hidden on panelEl */
    if (panelEl) {
      new MutationObserver(function () {
        if (panelEl.getAttribute('aria-hidden') === 'false' && !chip1done) {
          chip1done = true;
          if (chip1) chip1.classList.add('step-done');
          if (chip2) chip2.classList.add('step-done');
        }
      }).observe(panelEl, { attributes: true, attributeFilter: ['aria-hidden'] });
    }
  }
  /* Step 3 complete: payment animation shows green check — watch payAnim innerHTML */
  if (payAnim && chip3) {
    new MutationObserver(function () {
      if (payAnim.classList.contains('active') &&
          payAnim.innerHTML.indexOf('pay-step-check') !== -1) {
        chip3.classList.add('step-done');
        /* Show "table closed" toast */
        if (closedToast) {
          closedToast.classList.add('show');
          setTimeout(function () { closedToast.classList.remove('show'); }, 4000);
        }
      }
    }).observe(payAnim, { attributes: true, childList: true, subtree: false });
  }

})();

/* =============================================================
   V3 — HERO STAGGER ENTRANCE
   Runs after DOMContentLoaded; triggers .visible on headline lines
   ============================================================= */
(function heroStagger() {
  var REDUCED = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (REDUCED) return;

  function makeVisible() {
    var lines = document.querySelectorAll('.hero-hl-line');
    var sub   = document.querySelector('.hero-subline-wrap');
    var acts  = document.querySelector('.hero-actions-wrap');
    var wrap  = document.getElementById('hero-stage-wrap');
    lines.forEach(function (l) { l.classList.add('visible'); });
    if (sub)  sub.classList.add('visible');
    if (acts) acts.classList.add('visible');
    if (wrap) wrap.classList.add('visible');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', makeVisible);
  } else {
    /* already parsed — small rAF so CSS transition has a frame to start from */
    requestAnimationFrame(makeVisible);
  }
})();

/* =============================================================
   V3 — PROOF STRIP COUNT-UP
   Numbers animate from 0 when the strip scrolls into view
   ============================================================= */
(function proofCountUp() {
  var REDUCED = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var strip = document.querySelector('.proof-strip');
  if (!strip) return;

  var nums = strip.querySelectorAll('.proof-num');
  var done = false;

  function animateStar(el) {
    var full = '★★★★★';
    var i = 0;
    el.textContent = '';
    var t = setInterval(function () {
      el.textContent = full.slice(0, ++i);
      if (i >= 5) clearInterval(t);
    }, 200);
  }

  function animateNum(el, end, prefix, suffix, duration) {
    var start = 0;
    var startTime = null;
    function step(ts) {
      if (!startTime) startTime = ts;
      var progress = Math.min((ts - startTime) / duration, 1);
      var val = Math.floor(progress * end);
      el.textContent = prefix + val + suffix;
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = prefix + end + suffix;
    }
    requestAnimationFrame(step);
  }

  function runCountUp() {
    if (done) return;
    done = true;
    nums.forEach(function (el) {
      var txt = el.textContent.trim();
      if (txt === '★★★★★') { animateStar(el); return; }
      if (txt === '50→500+') { animateNum(el, 500, '50→', '+', 1200); return; }
      /* other stats just fade in — already visible via CSS */
    });
  }

  if (REDUCED) return; /* leave pre-rendered final values */

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) runCountUp();
    }, { threshold: 0.5 }).observe(strip);
  } else {
    runCountUp();
  }
})();

/* =============================================================
   V3 — SCROLL-DRIVEN "WATCH A SHIFT" SECTION
   Scroll progress 0→1 across 4×vh container drives step + pane
   ============================================================= */
(function shiftScroll() {
  var REDUCED = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (REDUCED) return;

  var outer = document.getElementById('shift-scroll-container');
  var fill  = document.getElementById('shift-fill');
  var steps = document.querySelectorAll('#shift-steps .shift-step');
  var panes = document.querySelectorAll('#shift-stage .shift-pane');
  if (!outer || !steps.length || !panes.length) return;

  /* progress thresholds per pane */
  var thresholds = [0, 0.28, 0.56, 0.82];

  var rafPending = false;

  function update() {
    rafPending = false;
    var rect = outer.getBoundingClientRect();
    var totalScroll = outer.offsetHeight - window.innerHeight;
    if (totalScroll <= 0) return;
    var scrolled = -rect.top;
    var p = Math.max(0, Math.min(1, scrolled / totalScroll));

    /* spine fill */
    if (fill) fill.style.height = (p * 100) + '%';

    /* active step */
    var activeStep = 0;
    thresholds.forEach(function (t, i) { if (p >= t) activeStep = i; });

    steps.forEach(function (s, i) {
      s.classList.toggle('active', i === activeStep);
    });
    panes.forEach(function (pn, i) {
      pn.classList.toggle('active', i === activeStep);
    });
  }

  function onScroll() {
    if (!rafPending) {
      rafPending = true;
      requestAnimationFrame(update);
    }
  }

  var inView = false;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting;
      if (inView) window.addEventListener('scroll', onScroll, { passive: true });
      else window.removeEventListener('scroll', onScroll);
    }, { threshold: 0 }).observe(outer);
  } else {
    window.addEventListener('scroll', onScroll, { passive: true });
  }
  update();
})();

/* =============================================================
   V3 — SCREENSHOT CARD 3D TILT
   ============================================================= */
(function screenshotTilt() {
  var REDUCED = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (REDUCED) return;
  if (!window.matchMedia('(pointer: fine)').matches) return;

  document.querySelectorAll('.real-card').forEach(function (card) {
    card.addEventListener('mousemove', function (e) {
      var r  = card.getBoundingClientRect();
      var x  = (e.clientX - r.left) / r.width  - 0.5;
      var y  = (e.clientY - r.top)  / r.height - 0.5;
      card.style.setProperty('--rx', (-y * 3).toFixed(2) + 'deg');
      card.style.setProperty('--ry', ( x * 4).toFixed(2) + 'deg');
    });
    card.addEventListener('mouseleave', function () {
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  });
})();

/* =============================================================
   V3 — HERO MOBILE SCROLL INDICATOR
   Fades out after the visitor starts scrolling
   ============================================================= */
(function scrollIndicator() {
  var ind = document.getElementById('hero-scroll-ind');
  if (!ind) return;
  var scrolled = false;
  window.addEventListener('scroll', function () {
    if (!scrolled && window.scrollY > 10) {
      scrolled = true;
      ind.classList.add('hidden');
    }
  }, { passive: true });
})();
