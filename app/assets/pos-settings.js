/* ============================================================================
   Tavolo POS — Settings screen
   Registers:
     window.COV.screens['pos-settings']
     window.PLAT.screens['pos-settings']
   Injects own CSS once: <style id="posset-css">  (all classes .posset-*)
   No build step. ES5-compatible with async/await (modern evergreen target).
   Depends on window.PLAT (platform.js loaded first).
   ============================================================================ */
(function () {
  'use strict';

  /* ---- shorthand aliases ---- */
  var esc   = window.PLAT.utils.esc;
  var toast = window.PLAT.utils.toast;
  var sb    = window.PLAT.client;

  /* ==========================================================================
     CSS — injected once, namespaced .posset-*
  ========================================================================== */
  (function injectStyles() {
    if (document.getElementById('posset-css')) return;
    var s = document.createElement('style');
    s.id = 'posset-css';
    s.textContent = [
      /* Page wrapper */
      '.posset-page{max-width:1100px;margin:0 auto;display:flex;flex-direction:column;gap:var(--space-5)}',

      /* Card */
      '.posset-card{background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-lg);overflow:hidden}',
      '.posset-card-head{padding:var(--space-5) var(--space-6);border-bottom:1px solid var(--color-border);display:flex;align-items:center;gap:var(--space-3)}',
      '.posset-card-icon{width:36px;height:36px;border-radius:var(--radius-md);display:flex;align-items:center;justify-content:center;flex-shrink:0;background:rgba(194,112,61,.1);color:var(--shell-copper,#c2703d)}',
      '.posset-card-title{font-size:16px;font-weight:600;color:var(--color-text-primary);letter-spacing:-0.01em;flex:1;min-width:0}',
      '.posset-card-body{padding:var(--space-5) var(--space-6)}',

      /* Field helpers */
      '.posset-field{margin-bottom:var(--space-4)}',
      '.posset-field:last-child{margin-bottom:0}',
      '.posset-label{display:block;font-size:13px;font-weight:500;color:var(--color-text-secondary);margin-bottom:var(--space-2)}',
      '.posset-hint{font-size:12px;color:var(--color-text-muted);margin-top:var(--space-1);line-height:1.5}',

      /* Grid */
      '.posset-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)}',
      '@media(max-width:640px){.posset-grid-2{grid-template-columns:1fr}}',

      /* Tax preview box */
      '.posset-preview{background:var(--color-surface-raised);border:1px solid var(--color-border);border-radius:var(--radius-md);padding:var(--space-4) var(--space-5);margin-top:var(--space-4)}',
      '.posset-preview-title{font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--color-text-muted);margin-bottom:var(--space-3)}',
      '.posset-preview-row{display:flex;justify-content:space-between;align-items:center;font-size:14px;padding:3px 0;min-width:0}',
      '.posset-preview-row .posset-pv-label{color:var(--color-text-secondary);min-width:0}',
      '.posset-preview-row .posset-pv-val{font-variant-numeric:tabular-nums;font-weight:500;flex-shrink:0;padding-left:var(--space-3)}',
      '.posset-preview-total{border-top:1px solid var(--color-border);margin-top:var(--space-2);padding-top:var(--space-2);font-weight:700;font-size:15px}',
      '.posset-pv-key{color:var(--color-text-muted);font-size:12px;margin-top:var(--space-1);padding-bottom:var(--space-2);border-bottom:1px solid var(--color-border)}',

      /* Toggle */
      '.posset-toggle-wrap{display:flex;align-items:center;justify-content:space-between;gap:var(--space-4);padding:var(--space-1) 0}',
      '.posset-toggle-text{flex:1;min-width:0}',
      '.posset-toggle-label{font-size:15px;font-weight:500;color:var(--color-text-primary)}',
      '.posset-toggle-sub{font-size:13px;color:var(--color-text-muted);margin-top:2px}',
      '.posset-toggle{position:relative;display:inline-block;width:44px;height:24px;flex-shrink:0}',
      '.posset-toggle input{opacity:0;width:0;height:0;position:absolute}',
      '.posset-toggle-slider{position:absolute;cursor:pointer;inset:0;background:var(--color-border-strong,#ccc);border-radius:var(--radius-full);transition:background .15s}',
      '.posset-toggle-slider::before{content:"";position:absolute;left:3px;top:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:transform .15s;box-shadow:0 1px 3px rgba(0,0,0,.2)}',
      '.posset-toggle input:checked + .posset-toggle-slider{background:var(--shell-copper,#c2703d)}',
      '.posset-toggle input:checked + .posset-toggle-slider::before{transform:translateX(20px)}',
      '.posset-toggle input:focus-visible + .posset-toggle-slider{outline:2px solid var(--shell-copper,#c2703d);outline-offset:2px}',

      /* Tip presets */
      '.posset-tips{display:flex;flex-wrap:wrap;gap:var(--space-2);align-items:center;margin-top:var(--space-2)}',
      '.posset-tip-chip{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:var(--radius-full);background:var(--color-surface-raised);border:1px solid var(--color-border);font-size:13px;font-weight:500;color:var(--color-text-secondary)}',
      '.posset-tip-rm{background:none;border:none;cursor:pointer;color:var(--color-text-muted);display:inline-flex;align-items:center;padding:0;min-width:20px;min-height:20px;justify-content:center}',
      '.posset-tip-rm:hover{color:var(--color-destructive,#b53b2f)}',
      '.posset-tip-rm:focus-visible{outline:2px solid var(--shell-copper,#c2703d);outline-offset:2px;border-radius:2px}',
      '.posset-tip-add{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:var(--radius-full);border:1px dashed var(--color-border);background:none;font-size:13px;color:var(--color-text-muted);cursor:pointer;min-height:32px}',
      '.posset-tip-add:hover{border-color:var(--shell-copper,#c2703d);color:var(--shell-copper,#c2703d)}',
      '.posset-tip-add:focus-visible{outline:2px solid var(--shell-copper,#c2703d);outline-offset:2px}',
      '.posset-tip-input-wrap{display:flex;align-items:center;gap:var(--space-2)}',

      /* Save row */
      '.posset-save-row{display:flex;justify-content:flex-end;padding-top:var(--space-4);border-top:1px solid var(--color-border);margin-top:var(--space-4)}',

      /* Loading / error states */
      '.posset-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:var(--space-12,64px) var(--space-8);color:var(--color-text-muted);gap:var(--space-3)}',
      '.posset-spin{animation:posset-spin 1s linear infinite}',
      '@keyframes posset-spin{to{transform:rotate(360deg)}}',
      '.posset-error{padding:var(--space-8);text-align:center;color:var(--color-destructive,#b53b2f)}',

      /* Input overrides for narrow contexts */
      '.posset-input-narrow{max-width:200px}',
      '@media(max-width:480px){.posset-input-narrow{max-width:100%}}',

      /* Two-col card grid */
      '.posset-cards-grid{display:grid;grid-template-columns:1fr 1fr;gap:var(--space-5);align-items:start}',
      '@media(max-width:860px){.posset-cards-grid{grid-template-columns:1fr}}',
    ].join('');
    document.head.appendChild(s);
  }());

  /* ==========================================================================
     Module state
  ========================================================================== */
  var _rest   = null;   /* current mesa_restaurants row */
  var DEMO_ID = 'a1000000-0000-0000-0000-000000000001';

  /* ==========================================================================
     Entry point — called every navigation
  ========================================================================== */
  function render(sectionEl) {
    if (!sectionEl) return;
    showLoading(sectionEl);
    loadRestaurant(sectionEl);
  }

  /* ==========================================================================
     Data: load mesa_restaurants row
  ========================================================================== */
  async function loadRestaurant(sectionEl) {
    try {
      /* Prefer the authenticated user's own row; fall back to demo restaurant */
      var res = await sb.from('mesa_restaurants').select('*').limit(1).maybeSingle();
      if (res.error) throw res.error;
      _rest = res.data || null;

      /* If no row found for this account (e.g. demo user) fall back to demo id */
      if (!_rest) {
        var res2 = await sb.from('mesa_restaurants').select('*')
          .eq('id', DEMO_ID).maybeSingle();
        if (res2.error) throw res2.error;
        _rest = res2.data || null;
      }

      if (!_rest) {
        showError(sectionEl, 'No restaurant configuration found. Please complete onboarding.');
        return;
      }

      drawPage(sectionEl);
    } catch (e) {
      console.error('[posset] loadRestaurant', e);
      showError(sectionEl, 'Failed to load settings. Please reload the page.');
    }
  }

  /* ==========================================================================
     Save: write changed columns back to mesa_restaurants
  ========================================================================== */
  async function saveFields(patch, btnEl, originalLabel) {
    if (!_rest || !_rest.id) { toast('No restaurant loaded.', 'err'); return false; }
    btnEl.disabled = true;
    btnEl.textContent = 'Saving…';
    try {
      var res = await sb.from('mesa_restaurants')
        .update(patch)
        .eq('id', _rest.id)
        .select('*')
        .single();
      if (res.error) throw res.error;
      _rest = res.data;
      toast('Settings saved!', 'ok');
      return true;
    } catch (e) {
      console.error('[posset] saveFields', e);
      /* Never render raw error objects — show a safe string */
      var msg = (e && typeof e.message === 'string' && e.message)
        ? e.message
        : 'Save failed. Please try again.';
      /* Redact any stack traces */
      if (msg.length > 200) msg = msg.slice(0, 200) + '…';
      toast(msg, 'err');
      return false;
    } finally {
      btnEl.disabled = false;
      btnEl.textContent = originalLabel;
    }
  }

  /* ==========================================================================
     HTML helpers
  ========================================================================== */
  function fld(id, label, inputHtml, hint) {
    return '<div class="posset-field">' +
      '<label class="posset-label" for="' + id + '">' + esc(label) + '</label>' +
      inputHtml +
      (hint ? '<p class="posset-hint" id="' + id + '-hint">' + esc(hint) + '</p>' : '') +
      '</div>';
  }

  function numInput(id, val, step, min, max, ariaDesc) {
    return '<input id="' + id + '" class="input posset-input-narrow" type="number"' +
      ' step="' + (step || 'any') + '"' +
      ' min="' + (min != null ? min : 0) + '"' +
      (max != null ? ' max="' + max + '"' : '') +
      ' value="' + esc(String(val != null ? val : '')) + '"' +
      (ariaDesc ? ' aria-describedby="' + ariaDesc + '"' : '') +
      '>';
  }

  function textInput(id, val, placeholder, type, maxlength) {
    return '<input id="' + id + '" class="input" type="' + (type || 'text') + '"' +
      (placeholder ? ' placeholder="' + esc(placeholder) + '"' : '') +
      (maxlength ? ' maxlength="' + maxlength + '"' : '') +
      ' value="' + esc(val || '') + '">';
  }

  function textArea(id, val, placeholder, rows) {
    return '<textarea id="' + id + '" class="input" rows="' + (rows || 3) + '"' +
      (placeholder ? ' placeholder="' + esc(placeholder) + '"' : '') +
      '>' + esc(val || '') + '</textarea>';
  }

  function toggle(id, checked, label, sub) {
    return '<div class="posset-toggle-wrap">' +
      '<div class="posset-toggle-text">' +
        '<div class="posset-toggle-label">' + esc(label) + '</div>' +
        (sub ? '<div class="posset-toggle-sub">' + esc(sub) + '</div>' : '') +
      '</div>' +
      '<label class="posset-toggle" aria-label="' + esc(label) + '">' +
        '<input type="checkbox" id="' + id + '"' + (checked ? ' checked' : '') + '>' +
        '<span class="posset-toggle-slider"></span>' +
      '</label>' +
    '</div>';
  }

  function saveBtn(id, label) {
    return '<div class="posset-save-row">' +
      '<button id="' + id + '" class="btn btn-primary" style="min-height:40px;font-size:14px;padding:0 var(--space-5);border-radius:var(--radius-md)">' +
        esc(label) +
      '</button>' +
    '</div>';
  }

  function cardHead(icon, title) {
    return '<div class="posset-card-head">' +
      '<div class="posset-card-icon" aria-hidden="true">' + icon + '</div>' +
      '<h2 class="posset-card-title">' + esc(title) + '</h2>' +
    '</div>';
  }

  /* SVG icons (inline, aria-hidden) */
  var ICON_CHARGES = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>';
  var ICON_CURRENCY = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
  var ICON_RECEIPT  = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>';
  var ICON_BUSINESS = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>';
  var ICON_KITCHEN  = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>';

  /* ==========================================================================
     Build the preview block HTML (used in drawPage & re-rendered live)
  ========================================================================== */
  function previewHTML(taxPct, svcPct, currencyCode) {
    var base      = 100;
    var tax       = parseFloat(taxPct)  || 0;
    var svc       = parseFloat(svcPct)  || 0;
    var taxAmt    = +(base * tax  / 100).toFixed(2);
    var svcAmt    = +(base * svc  / 100).toFixed(2);
    var total     = +(base + taxAmt + svcAmt).toFixed(2);
    var sym       = currencySymbol(currencyCode);

    function fmt(n) { return sym + n.toFixed(2); }

    return '<div class="posset-preview" aria-live="polite" aria-atomic="true" aria-label="Live charge preview" id="posset-preview-box">' +
      '<div class="posset-preview-title">Live preview — example $100 order</div>' +
      '<div class="posset-preview-row"><span class="posset-pv-label">Food subtotal</span><span class="posset-pv-val">' + esc(fmt(base)) + '</span></div>' +
      '<div class="posset-preview-row"><span class="posset-pv-label">Tax (' + esc(String(tax)) + '%)</span><span class="posset-pv-val">' + esc(fmt(taxAmt)) + '</span></div>' +
      '<div class="posset-preview-row"><span class="posset-pv-label">Service charge (' + esc(String(svc)) + '%)</span><span class="posset-pv-val">' + esc(fmt(svcAmt)) + '</span></div>' +
      '<div class="posset-preview-row posset-preview-total"><span class="posset-pv-label">Order total</span><span class="posset-pv-val">' + esc(fmt(total)) + '</span></div>' +
    '</div>';
  }

  function currencySymbol(code) {
    var MAP = { USD: '$', GBP: '£', EUR: '€', AED: 'AED ', SAR: 'SAR ', KWD: 'KWD ', AUD: 'A$', CAD: 'C$' };
    return MAP[(code || '').toUpperCase()] || ((code || 'USD') + ' ');
  }

  /* ==========================================================================
     Tip-preset chips state (mutable array rebuilt on each chip add/remove)
  ========================================================================== */
  var _tips = [];

  function normalizeTips(raw) {
    /* raw may be array, JSON string, or null */
    if (!raw) return [15, 18, 20];
    if (typeof raw === 'string') {
      try { raw = JSON.parse(raw); } catch (e) { return [15, 18, 20]; }
    }
    if (!Array.isArray(raw)) return [15, 18, 20];
    return raw.map(function (v) { return Number(v); }).filter(function (v) { return !isNaN(v) && v >= 0; });
  }

  function renderTips(containerEl) {
    if (!containerEl) return;
    containerEl.innerHTML = _tips.map(function (v, i) {
      return '<span class="posset-tip-chip">' +
        esc(String(v)) + '%' +
        '<button type="button" class="posset-tip-rm" data-idx="' + i + '" aria-label="Remove ' + esc(String(v)) + '% tip preset">' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
        '</button>' +
      '</span>';
    }).join('') +
    '<div class="posset-tip-input-wrap" id="posset-tip-adder">' +
      '<input id="posset-tip-new" class="input" type="number" min="0" max="100" step="1" placeholder="e.g. 25" ' +
        'style="max-width:90px" aria-label="New tip percentage">' +
      '<button type="button" class="posset-tip-add" id="posset-tip-add-btn" aria-label="Add tip preset">' +
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true" style="flex-shrink:0"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
        'Add' +
      '</button>' +
    '</div>';
    wireTipEvents(containerEl);
  }

  function wireTipEvents(containerEl) {
    /* Remove buttons */
    containerEl.querySelectorAll('.posset-tip-rm').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(btn.dataset.idx, 10);
        if (!isNaN(idx)) {
          _tips.splice(idx, 1);
          renderTips(containerEl);
        }
      });
      btn.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); btn.click(); }
      });
    });
    /* Add button */
    var addBtn = containerEl.querySelector('#posset-tip-add-btn');
    var newInp = containerEl.querySelector('#posset-tip-new');
    function doAdd() {
      var v = parseFloat(newInp.value);
      if (isNaN(v) || v < 0 || v > 100) {
        toast('Enter a tip percentage between 0 and 100.', 'err');
        newInp.focus();
        return;
      }
      _tips.push(Math.round(v * 10) / 10);
      newInp.value = '';
      renderTips(containerEl);
    }
    if (addBtn) {
      addBtn.addEventListener('click', doAdd);
      addBtn.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); doAdd(); }
      });
    }
    if (newInp) {
      newInp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); doAdd(); } });
    }
  }

  /* ==========================================================================
     Draw full page
  ========================================================================== */
  function drawPage(sectionEl) {
    var r = _rest;
    _tips = normalizeTips(r.tip_presets);

    var taxPct = r.tax_pct != null ? r.tax_pct : 0;
    var svcPct = r.service_charge_pct != null ? r.service_charge_pct : 0;
    var cur    = r.currency || 'USD';

    /* ---- CHARGES card ---- */
    var chargesCard =
      '<section class="posset-card" aria-labelledby="posset-h-charges">' +
        cardHead(ICON_CHARGES, 'Charges') +
        '<div class="posset-card-body">' +
          '<div class="posset-grid-2">' +
            fld('posset-tax',
              'Tax rate (%)',
              numInput('posset-tax', taxPct, 'any', 0, 100, 'posset-tax-hint'),
              'Government / sales tax added to the food subtotal. Set 0 if your region has no tax.') +
            fld('posset-svc',
              'Service charge (%)',
              numInput('posset-svc', svcPct, 'any', 0, 100, 'posset-svc-hint'),
              'Your restaurant\'s service fee, added on top of the subtotal.') +
          '</div>' +
          previewHTML(taxPct, svcPct, cur) +
          saveBtn('posset-save-charges', 'Save charges') +
        '</div>' +
      '</section>';

    /* ---- CURRENCY card ---- */
    var CURRENCIES = ['USD', 'GBP', 'EUR', 'AED', 'SAR', 'KWD', 'AUD', 'CAD', 'SGD', 'JPY', 'INR', 'MXN'];
    var curOpts = CURRENCIES.map(function (c) {
      return '<option value="' + esc(c) + '"' + (c === cur ? ' selected' : '') + '>' + esc(c) + '</option>';
    }).join('');
    /* inject current value if not in list */
    if (CURRENCIES.indexOf(cur) === -1) {
      curOpts = '<option value="' + esc(cur) + '" selected>' + esc(cur) + '</option>' + curOpts;
    }

    var currencyCard =
      '<section class="posset-card" aria-labelledby="posset-h-currency">' +
        cardHead(ICON_CURRENCY, 'Currency & Tips') +
        '<div class="posset-card-body">' +
          fld('posset-currency',
            'Currency code',
            '<select id="posset-currency" class="input select posset-input-narrow">' + curOpts + '</select>',
            'Used to format all prices on receipts and in the POS.') +
          '<div class="posset-field">' +
            '<label class="posset-label">Tip presets (%)</label>' +
            '<p class="posset-hint" style="margin-bottom:var(--space-2)">Preset percentages shown to guests at checkout. You can add or remove any.</p>' +
            '<div class="posset-tips" id="posset-tips-container" role="list" aria-label="Tip presets"></div>' +
          '</div>' +
          saveBtn('posset-save-currency', 'Save currency & tips') +
        '</div>' +
      '</section>';

    /* ---- RECEIPT card ---- */
    var receiptCard =
      '<section class="posset-card" aria-labelledby="posset-h-receipt">' +
        cardHead(ICON_RECEIPT, 'Receipt Text') +
        '<div class="posset-card-body">' +
          fld('posset-receipt-header',
            'Receipt header',
            textArea('posset-receipt-header', r.receipt_header, 'e.g. Thank you for dining with us!', 3),
            'Printed or displayed at the top of every receipt.') +
          fld('posset-receipt-footer',
            'Receipt footer',
            textArea('posset-receipt-footer', r.receipt_footer, 'e.g. Service charge is shared with the team.', 3),
            'Printed or displayed at the bottom of every receipt.') +
          saveBtn('posset-save-receipt', 'Save receipt text') +
        '</div>' +
      '</section>';

    /* ---- BUSINESS card ---- */
    var businessCard =
      '<section class="posset-card" aria-labelledby="posset-h-business">' +
        cardHead(ICON_BUSINESS, 'Business Info') +
        '<div class="posset-card-body">' +
          fld('posset-biz-name',
            'Restaurant name',
            textInput('posset-biz-name', r.name, 'The Copper Table', 'text', 120),
            'Appears on receipts and in the POS header.') +
          fld('posset-biz-address',
            'Address',
            textInput('posset-biz-address', r.address, '123 Main St, City', 'text', 255),
            'Printed on receipts and used for delivery address reference.') +
          fld('posset-biz-phone',
            'Phone number',
            textInput('posset-biz-phone', r.phone, '+1 555 000 0000', 'tel', 60),
            'Printed on receipts so guests can contact you.') +
          saveBtn('posset-save-business', 'Save business info') +
        '</div>' +
      '</section>';

    /* ---- KITCHEN card ---- */
    var kitchenCard =
      '<section class="posset-card" aria-labelledby="posset-h-kitchen">' +
        cardHead(ICON_KITCHEN, 'Kitchen') +
        '<div class="posset-card-body">' +
          toggle('posset-auto-fire',
            r.auto_fire === true,
            'Auto-fire orders',
            'When on, orders go to the kitchen automatically when placed. When off, staff press the Fire button to send each course.') +
          saveBtn('posset-save-kitchen', 'Save kitchen settings') +
        '</div>' +
      '</section>';

    /* ---- Assemble page (charges full-width, then 2-col grid, then full-width) ---- */
    sectionEl.innerHTML =
      '<div class="posset-page" id="posset-root">' +
        chargesCard +
        '<div class="posset-cards-grid">' +
          currencyCard +
          receiptCard +
        '</div>' +
        '<div class="posset-cards-grid">' +
          businessCard +
          kitchenCard +
        '</div>' +
      '</div>';

    /* Render tips after DOM insertion */
    var tipsContainer = sectionEl.querySelector('#posset-tips-container');
    if (tipsContainer) renderTips(tipsContainer);

    /* Set the currency select value explicitly (browsers can be fussy) */
    var curSel = sectionEl.querySelector('#posset-currency');
    if (curSel) curSel.value = cur;

    wireAll(sectionEl);
  }

  /* ==========================================================================
     Wire all event handlers
  ========================================================================== */
  function wireAll(sectionEl) {
    function q(sel) { return sectionEl.querySelector(sel); }

    /* ---- Live preview: recompute as tax/svc/currency changes ---- */
    function updatePreview() {
      var box = q('#posset-preview-box');
      if (!box) return;
      var tax = parseFloat((q('#posset-tax') || {}).value) || 0;
      var svc = parseFloat((q('#posset-svc') || {}).value) || 0;
      var cur = ((q('#posset-currency') || {}).value || 'USD').trim();
      box.outerHTML = previewHTML(tax, svc, cur);
    }

    var taxInp = q('#posset-tax');
    var svcInp = q('#posset-svc');
    var curSel = q('#posset-currency');
    if (taxInp) taxInp.addEventListener('input', updatePreview);
    if (svcInp) svcInp.addEventListener('input', updatePreview);
    if (curSel) curSel.addEventListener('change', updatePreview);

    /* ---- Save: CHARGES ---- */
    var btnCharges = q('#posset-save-charges');
    if (btnCharges) {
      btnCharges.addEventListener('click', async function () {
        var tax = parseFloat((q('#posset-tax') || {}).value);
        var svc = parseFloat((q('#posset-svc') || {}).value);
        if (isNaN(tax) || tax < 0 || tax > 100) { toast('Tax must be between 0 and 100.', 'err'); return; }
        if (isNaN(svc) || svc < 0 || svc > 100) { toast('Service charge must be between 0 and 100.', 'err'); return; }
        var ok = await saveFields({ tax_pct: tax, service_charge_pct: svc }, btnCharges, 'Save charges');
        if (ok) {
          /* re-render preview with persisted values */
          var cur = ((q('#posset-currency') || {}).value || 'USD').trim();
          var box = q('#posset-preview-box');
          if (box) box.outerHTML = previewHTML(tax, svc, cur);
        }
      });
    }

    /* ---- Save: CURRENCY & TIPS ---- */
    var btnCur = q('#posset-save-currency');
    if (btnCur) {
      btnCur.addEventListener('click', async function () {
        var cur = ((q('#posset-currency') || {}).value || 'USD').trim().toUpperCase();
        if (!/^[A-Z]{3}$/.test(cur)) { toast('Currency must be a 3-letter code (e.g. USD).', 'err'); return; }
        await saveFields({ currency: cur, tip_presets: _tips }, btnCur, 'Save currency & tips');
      });
    }

    /* ---- Save: RECEIPT ---- */
    var btnReceipt = q('#posset-save-receipt');
    if (btnReceipt) {
      btnReceipt.addEventListener('click', async function () {
        var header = ((q('#posset-receipt-header') || {}).value || '').trim();
        var footer = ((q('#posset-receipt-footer') || {}).value || '').trim();
        await saveFields({ receipt_header: header || null, receipt_footer: footer || null }, btnReceipt, 'Save receipt text');
      });
    }

    /* ---- Save: BUSINESS ---- */
    var btnBiz = q('#posset-save-business');
    if (btnBiz) {
      btnBiz.addEventListener('click', async function () {
        var name    = ((q('#posset-biz-name')    || {}).value || '').trim();
        var address = ((q('#posset-biz-address') || {}).value || '').trim();
        var phone   = ((q('#posset-biz-phone')   || {}).value || '').trim();
        if (!name) { toast('Restaurant name is required.', 'err'); return; }
        await saveFields({ name: name, address: address || null, phone: phone || null }, btnBiz, 'Save business info');
      });
    }

    /* ---- Save: KITCHEN ---- */
    var btnKitchen = q('#posset-save-kitchen');
    if (btnKitchen) {
      btnKitchen.addEventListener('click', async function () {
        var autoFire = !!(q('#posset-auto-fire') || {}).checked;
        await saveFields({ auto_fire: autoFire }, btnKitchen, 'Save kitchen settings');
      });
    }
  }

  /* ==========================================================================
     UI state helpers
  ========================================================================== */
  function showLoading(sectionEl) {
    sectionEl.innerHTML =
      '<div class="posset-loading" role="status" aria-live="polite">' +
        '<svg class="posset-spin" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>' +
        '<span style="font-size:14px;color:var(--color-text-muted)">Loading POS settings…</span>' +
      '</div>';
  }

  function showError(sectionEl, msg) {
    /* Never render raw Error objects or stack traces */
    var safeMsg = (typeof msg === 'string') ? msg : 'An error occurred. Please reload.';
    sectionEl.innerHTML =
      '<div class="posset-error" role="alert">' +
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display:block;margin:0 auto var(--space-3)"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' +
        '<p style="font-size:15px;font-weight:500;margin-bottom:var(--space-3)">' + esc(safeMsg) + '</p>' +
        '<button onclick="location.reload()" class="btn btn-secondary" style="min-height:40px;font-size:14px;padding:0 var(--space-5)">Reload page</button>' +
      '</div>';
  }

  /* ==========================================================================
     Register screen module
  ========================================================================== */
  window.COV  = window.COV  || {};
  window.PLAT = window.PLAT || {};
  window.COV.screens  = window.COV.screens  || {};
  window.PLAT.screens = window.PLAT.screens || {};

  var module = { render: render };
  window.COV.screens['pos-settings']  = module;
  window.PLAT.screens['pos-settings'] = module;

}());
