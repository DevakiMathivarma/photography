/* ================================================================
   QUOTATION EDIT DRAWER — quot_edit.js
   Self-contained: reads QUOT_LEAD_ID / QUOT_SERVICES / QUOT_PRICING
   injected by the template as inline <script> vars.
   Saves via /leads/save/ (existing endpoint).
================================================================ */

(function () {
  'use strict';

  /* ── CONSTANTS ─────────────────────────────────────────────── */
  const CREW_ROLES = [
    'Traditional Photographer', 'Candid Photographer',
    'Traditional Videographer', 'Candid Videographer',
    'Photographer', 'Videographer', 'Drone Operator', 'Cinematic Videographer',
  ];

  /* ── STATE (deep-cloned from template vars on open) ─────────── */
  let _state   = {};   // { [svcKey]: { label, crew[], deliverables[], price, basePrice, extraCrewCost, extraDelCost, eventDate, eventSession, dateTBD } }
  let _pricing = {};   // { subtotal, discountType, discountValue, discountAmount, gstRate, gstAmount, finalTotal }
  let _activeTab = null;
  let _saving  = false;

  /* ── HELPERS ───────────────────────────────────────────────── */
  function _csrfToken() {
    const el = document.getElementById('csrf_token') ||
               document.querySelector('[name=csrfmiddlewaretoken]');
    return el ? el.value : '';
  }

  function _deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function _fmtInr(n) {
    return Number(n || 0).toLocaleString('en-IN');
  }

  function _showToast(msg) {
    const t = document.getElementById('qedToast');
    if (!t) return;
    t.textContent = msg;
    t.style.display = 'block';
    clearTimeout(t._tid);
    t._tid = setTimeout(() => { t.style.display = 'none'; }, 3500);
  }

  /* ── OPEN / CLOSE ──────────────────────────────────────────── */
  window.openQuotEdit = function () {
    // Deep-clone template data into local state
    const rawServices = window.QUOT_SERVICES || [];
    _state = {};

    rawServices.forEach(svc => {
      const key = svc.key || ('SVC_' + svc.label);
      _state[key] = {
        key:            key,
        label:          svc.label || '',
        price:          Number(svc.price || 0),
        basePrice:      Number(svc.basePrice || svc.price || 0),
        extraCrewCost:  Number(svc.extraCrewCost || 0),
        extraDelCost:   Number(svc.extraDelCost  || 0),
        // Crew: normalise to array of objects
        crew: (svc.crewDetail || []).map(c => ({
          role:         c.role || '',
          qty:          Number(c.qty || 1),
          baseQty:      Number(c.baseQty != null ? c.baseQty : c.qty || 1),
          isExtra:      !!c.isExtra,
          pricePerHead: Number(c.pricePerHead || 0),
        })),
        // Deliverables: normalise
        deliverables: (svc.deliverables || []).map(d => {
          if (typeof d === 'string') return { label: d, isExtra: false, extraPrice: 0 };
          return { label: d.label || d, isExtra: !!d.isExtra, extraPrice: Number(d.extraPrice || 0) };
        }),
        // Date / session
        eventDate:    svc.eventDate    || svc.event_date    || '',
        eventSession: svc.eventSession || svc.event_session || '',
        dateTBD:      svc.dateTBD === true || svc.dateTBD === 'true',
      };
    });

    const rawPricing = window.QUOT_PRICING || {};
    _pricing = {
      subtotal:       Number(rawPricing.subtotal       || 0),
      discountType:   rawPricing.discountType           || null,
      discountValue:  Number(rawPricing.discountValue   || 0),
      discountAmount: Number(rawPricing.discountAmount  || 0),
      gstRate:        Number(rawPricing.gstRate         || 0),
      gstAmount:      Number(rawPricing.gstAmount       || 0),
      finalTotal:     Number(rawPricing.finalTotal      || rawPricing.final_display && 0 || 0),
    };

    _buildDrawer();

    document.getElementById('quotEditDrawer').classList.add('open');
    document.getElementById('qedBackdrop').classList.add('show');
    document.body.style.overflow = 'hidden';
  };

  window.closeQuotEdit = function () {
    document.getElementById('quotEditDrawer').classList.remove('open');
    document.getElementById('qedBackdrop').classList.remove('show');
    document.body.style.overflow = '';
  };

  /* ── BUILD DRAWER CONTENTS ──────────────────────────────────── */
  function _buildDrawer() {
    _buildTabs();
    const keys = Object.keys(_state);
    if (keys.length > 0) {
      _activateTab(keys[0]);
    } else {
      // No services — show pricing only
      _activateTab('__PRICING__');
    }
  }

  function _buildTabs() {
    const tabsEl = document.getElementById('qedTabs');
    if (!tabsEl) return;
    tabsEl.innerHTML = '';

    Object.keys(_state).forEach(key => {
      const btn = document.createElement('button');
      btn.className = 'qed-tab';
      btn.id = 'qedtab-' + key;
      btn.textContent = _state[key].label;
      btn.onclick = () => _activateTab(key);
      tabsEl.appendChild(btn);
    });

    // Always add Pricing tab
    const pBtn = document.createElement('button');
    pBtn.className = 'qed-tab';
    pBtn.id = 'qedtab-__PRICING__';
    pBtn.textContent = 'Pricing';
    pBtn.onclick = () => _activateTab('__PRICING__');
    tabsEl.appendChild(pBtn);
  }

  function _activateTab(key) {
    _activeTab = key;

    // Highlight tab
    document.querySelectorAll('.qed-tab').forEach(t => t.classList.remove('active'));
    const activeTabEl = document.getElementById('qedtab-' + key);
    if (activeTabEl) activeTabEl.classList.add('active');

    // Build pane
    const body = document.getElementById('qedBody');
    if (!body) return;
    body.innerHTML = '';

    if (key === '__PRICING__') {
      body.appendChild(_buildPricingPane());
    } else {
      body.appendChild(_buildServicePane(key));
    }
  }

  /* ── SERVICE PANE ───────────────────────────────────────────── */
  function _buildServicePane(key) {
    const svc  = _state[key];
    const frag = document.createDocumentFragment();

    /* ── CREW ── */
    const crewLabel = _makeLabel('Crew Members');
    frag.appendChild(crewLabel);

    const crewList = document.createElement('div');
    crewList.className = 'qed-crew-list';
    crewList.id = 'qedCrew-' + key;
    svc.crew.forEach((c, i) => crewList.appendChild(_buildCrewRow(key, i)));
    frag.appendChild(crewList);

    const addCrewBtn = document.createElement('button');
    addCrewBtn.className = 'qed-add-btn';
    addCrewBtn.innerHTML = '＋ Add Crew Member';
    addCrewBtn.onclick = () => {
      svc.crew.push({ role: CREW_ROLES[0], qty: 1, baseQty: 0, isExtra: true, pricePerHead: 0 });
      _refreshCrewList(key);
      _recalcService(key);
    };
    frag.appendChild(addCrewBtn);

    /* ── DELIVERABLES ── */
    const delLabel = _makeLabel('Deliverables');
    delLabel.style.marginTop = '22px';
    frag.appendChild(delLabel);

    const chipsWrap = document.createElement('div');
    chipsWrap.className = 'qed-chips';
    chipsWrap.id = 'qedChips-' + key;
    svc.deliverables.forEach((d, i) => chipsWrap.appendChild(_buildChip(key, i)));
    frag.appendChild(chipsWrap);

    // Inline add form
    const inlineForm = document.createElement('div');
    inlineForm.className = 'qed-inline-add';
    inlineForm.id = 'qedDelInline-' + key;
    inlineForm.innerHTML = `
      <div style="display:flex;gap:8px;">
        <input class="qed-mini-input" id="qedDelName-${key}" placeholder="e.g. Instagram Reels" style="flex:1">
        <input class="qed-mini-input" id="qedDelPrice-${key}" type="number" placeholder="Extra ₹" style="width:90px;flex:none">
      </div>
      <div class="qed-inline-btns">
        <button class="qed-btn-ghost" onclick="_qedCancelDel('${key}')">Cancel</button>
        <button class="qed-btn-primary" onclick="_qedConfirmDel('${key}')">＋ Add</button>
      </div>
    `;
    frag.appendChild(inlineForm);

    const addDelBtn = document.createElement('button');
    addDelBtn.className = 'qed-add-btn';
    addDelBtn.id = 'qedAddDelBtn-' + key;
    addDelBtn.innerHTML = '＋ Add Deliverable';
    addDelBtn.onclick = () => {
      inlineForm.style.display = 'flex';
      addDelBtn.style.display  = 'none';
      document.getElementById('qedDelName-' + key)?.focus();
    };
    frag.appendChild(addDelBtn);

    /* ── DATE / SESSION ── */
    const dateLabel = _makeLabel('Event Date & Session');
    dateLabel.style.marginTop = '22px';
    frag.appendChild(dateLabel);

    const dateRow = document.createElement('div');
    dateRow.className = 'qed-date-row';

    // TBD toggle
    const tbdToggle = document.createElement('label');
    tbdToggle.className = 'qed-tbd-toggle';
    tbdToggle.innerHTML = `
      <input type="checkbox" id="qedTbd-${key}" ${svc.dateTBD ? 'checked' : ''} onchange="_qedTbdChange('${key}', this.checked)">
      <span>Date not yet decided (TBD)</span>
    `;
    dateRow.appendChild(tbdToggle);

    const dateInputsWrap = document.createElement('div');
    dateInputsWrap.id = 'qedDateInputs-' + key;
    dateInputsWrap.style.display = svc.dateTBD ? 'none' : 'block';
    dateInputsWrap.innerHTML = `
      <div class="qed-date-label" style="margin:10px 0 6px">Event Date</div>
      <input class="qed-date-input" id="qedDate-${key}" type="date" value="${svc.eventDate || ''}" onchange="_qedDateChange('${key}', this.value)">
      <div class="qed-date-label" style="margin:10px 0 6px">Session</div>
      <select class="qed-session-select" id="qedSess-${key}" onchange="_qedSessChange('${key}', this.value)">
        <option value="">Select session</option>
        <option value="Morning" ${svc.eventSession === 'Morning' ? 'selected' : ''}>Morning</option>
        <option value="Evening" ${svc.eventSession === 'Evening' ? 'selected' : ''}>Evening</option>
      </select>
    `;
    dateRow.appendChild(dateInputsWrap);
    frag.appendChild(dateRow);

    /* ── PRICING PREVIEW ── */
    const priceLabel = _makeLabel('Package Cost');
    priceLabel.style.marginTop = '22px';
    frag.appendChild(priceLabel);

    const priceBox = document.createElement('div');
    priceBox.id = 'qedPriceBox-' + key;
    priceBox.style.cssText = 'background:white;border:1.5px solid #ede0e8;border-radius:10px;padding:14px 16px;font-size:13px;display:flex;flex-direction:column;gap:7px;';
    frag.appendChild(priceBox);
    _renderPriceBox(key);

    const div = document.createElement('div');
    frag.childNodes.forEach(n => div.appendChild(n.cloneNode(true)));
    // Re-attach event-bound children properly
    return _buildServicePaneDirect(key);
  }

  // Direct DOM approach (avoids cloneNode losing events)
  function _buildServicePaneDirect(key) {
    const svc  = _state[key];
    const wrap = document.createElement('div');

    /* CREW */
    wrap.appendChild(_makeLabel('Crew Members'));
    const crewList = document.createElement('div');
    crewList.className = 'qed-crew-list';
    crewList.id = 'qedCrew-' + key;
    svc.crew.forEach((c, i) => crewList.appendChild(_buildCrewRow(key, i)));
    wrap.appendChild(crewList);

    const addCrewBtn = document.createElement('button');
    addCrewBtn.className = 'qed-add-btn';
    addCrewBtn.innerHTML = '<span style="font-size:15px">＋</span> Add Crew Member';
    addCrewBtn.onclick = () => {
      _state[key].crew.push({ role: CREW_ROLES[0], qty: 1, baseQty: 0, isExtra: true, pricePerHead: 0 });
      _refreshCrewList(key);
      _recalcService(key);
    };
    wrap.appendChild(addCrewBtn);

    /* DELIVERABLES */
    const delLabel = _makeLabel('Deliverables');
    delLabel.style.marginTop = '22px';
    wrap.appendChild(delLabel);

    const chipsWrap = document.createElement('div');
    chipsWrap.className = 'qed-chips';
    chipsWrap.id = 'qedChips-' + key;
    _state[key].deliverables.forEach((d, i) => chipsWrap.appendChild(_buildChip(key, i)));
    wrap.appendChild(chipsWrap);

    const inlineForm = document.createElement('div');
    inlineForm.className = 'qed-inline-add';
    inlineForm.id = 'qedDelInline-' + key;
    inlineForm.innerHTML = `
      <div style="display:flex;gap:8px;">
        <input class="qed-mini-input" id="qedDelName-${key}" placeholder="e.g. Instagram Reels" style="flex:1">
        <input class="qed-mini-input" id="qedDelPrice-${key}" type="number" placeholder="Extra ₹" style="width:90px;flex:none">
      </div>
      <div class="qed-inline-btns">
        <button class="qed-btn-ghost" onclick="window._qedCancelDel('${key}')">Cancel</button>
        <button class="qed-btn-primary" onclick="window._qedConfirmDel('${key}')">＋ Add</button>
      </div>
    `;
    wrap.appendChild(inlineForm);

    const addDelBtn = document.createElement('button');
    addDelBtn.className = 'qed-add-btn';
    addDelBtn.id = 'qedAddDelBtn-' + key;
    addDelBtn.innerHTML = '<span style="font-size:15px">＋</span> Add Deliverable';
    addDelBtn.onclick = () => {
      inlineForm.style.display = 'flex';
      addDelBtn.style.display  = 'none';
      document.getElementById('qedDelName-' + key)?.focus();
    };
    wrap.appendChild(addDelBtn);

    /* DATE / SESSION */
    const dateLabel = _makeLabel('Event Date & Session');
    dateLabel.style.marginTop = '22px';
    wrap.appendChild(dateLabel);

    const dateCardWrap = document.createElement('div');
    dateCardWrap.className = 'qed-date-row';

    const tbdLabel = document.createElement('label');
    tbdLabel.className = 'qed-tbd-toggle';
    const tbdCb = document.createElement('input');
    tbdCb.type = 'checkbox';
    tbdCb.checked = !!svc.dateTBD;
    tbdCb.onchange = (e) => _qedTbdChange(key, e.target.checked);
    tbdLabel.appendChild(tbdCb);
    tbdLabel.appendChild(Object.assign(document.createElement('span'), { textContent: 'Date not yet decided (TBD)' }));
    dateCardWrap.appendChild(tbdLabel);

    const dateInputsWrap = document.createElement('div');
    dateInputsWrap.id = 'qedDateInputs-' + key;
    dateInputsWrap.style.display = svc.dateTBD ? 'none' : 'flex';
    dateInputsWrap.style.flexDirection = 'column';
    dateInputsWrap.style.gap = '8px';
    dateInputsWrap.style.marginTop = '10px';

    const dateLbl2 = document.createElement('div');
    dateLbl2.style.cssText = 'font-size:11px;font-weight:700;color:#7d3f5a;letter-spacing:0.5px;text-transform:uppercase;';
    dateLbl2.textContent = 'Event Date';
    dateInputsWrap.appendChild(dateLbl2);

    const dateInp = document.createElement('input');
    dateInp.type = 'date';
    dateInp.className = 'qed-date-input';
    dateInp.value = svc.eventDate || '';
    dateInp.onchange = (e) => _qedDateChange(key, e.target.value);
    dateInputsWrap.appendChild(dateInp);

    const sessLbl = document.createElement('div');
    sessLbl.style.cssText = 'font-size:11px;font-weight:700;color:#7d3f5a;letter-spacing:0.5px;text-transform:uppercase;';
    sessLbl.textContent = 'Session';
    dateInputsWrap.appendChild(sessLbl);

    const sessSel = document.createElement('select');
    sessSel.className = 'qed-session-select';
    ['', 'Morning', 'Evening'].forEach(v => {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = v || 'Select session';
      if (svc.eventSession === v) opt.selected = true;
      sessSel.appendChild(opt);
    });
    sessSel.onchange = (e) => _qedSessChange(key, e.target.value);
    dateInputsWrap.appendChild(sessSel);
    dateCardWrap.appendChild(dateInputsWrap);
    wrap.appendChild(dateCardWrap);

    /* PRICE BOX */
    const priceLabel = _makeLabel('Package Cost');
    priceLabel.style.marginTop = '22px';
    wrap.appendChild(priceLabel);

    const priceBox = document.createElement('div');
    priceBox.id = 'qedPriceBox-' + key;
    priceBox.style.cssText = 'background:white;border:1.5px solid #ede0e8;border-radius:10px;padding:14px 16px;font-size:13px;display:flex;flex-direction:column;gap:7px;';
    wrap.appendChild(priceBox);
    setTimeout(() => _renderPriceBox(key), 0);

    return wrap;
  }

  /* ── CREW ROW ────────────────────────────────────────────────── */
  function _buildCrewRow(key, i) {
    const c   = _state[key].crew[i];
    const isExtra  = c.isExtra || c.qty > c.baseQty;
    const extraQty = c.isExtra ? c.qty : Math.max(0, c.qty - c.baseQty);

    const row = document.createElement('div');
    row.className = 'qed-crew-row';
    row.id = `qedCrewRow-${key}-${i}`;

    // Icon
    const icon = Object.assign(document.createElement('span'), { className: 'qed-crew-icon', textContent: '📷' });
    row.appendChild(icon);

    // Role selector
    const sel = document.createElement('select');
    sel.className = 'qed-crew-select';
    CREW_ROLES.forEach(r => {
      const opt = document.createElement('option');
      opt.value = r;
      opt.textContent = r;
      if (r === c.role) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.onchange = (e) => {
      _state[key].crew[i].role = e.target.value;
    };
    row.appendChild(sel);

    // Included badge
    if (!c.isExtra && c.qty <= c.baseQty) {
      const badge = Object.assign(document.createElement('span'), { className: 'qed-crew-badge', textContent: 'INCLUDED' });
      row.appendChild(badge);
    }

    // Qty stepper
    const qtyWrap = document.createElement('div');
    qtyWrap.className = 'qed-qty-wrap';

    const minusBtn = document.createElement('button');
    minusBtn.type = 'button';
    minusBtn.className = 'qed-qty-btn';
    minusBtn.textContent = '−';
    minusBtn.onclick = () => _qedChangeQty(key, i, -1);

    const qtyVal = document.createElement('span');
    qtyVal.className = 'qed-qty-val';
    qtyVal.id = `qedQty-${key}-${i}`;
    qtyVal.textContent = c.qty;

    const plusBtn = document.createElement('button');
    plusBtn.type = 'button';
    plusBtn.className = 'qed-qty-btn';
    plusBtn.textContent = '+';
    plusBtn.onclick = () => _qedChangeQty(key, i, 1);

    qtyWrap.appendChild(minusBtn);
    qtyWrap.appendChild(qtyVal);
    qtyWrap.appendChild(plusBtn);
    row.appendChild(qtyWrap);

    // Delete
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'qed-del-btn';
    delBtn.textContent = '✕';
    delBtn.onclick = () => _qedRemoveCrew(key, i);
    row.appendChild(delBtn);

    // Extra price input row
    if (isExtra) {
      const priceWrap = document.createElement('div');
      priceWrap.className = 'qed-crew-price-wrap';
      priceWrap.style.flexBasis = '100%';
      priceWrap.innerHTML = `
        <span class="qed-crew-price-label">
          ${c.isExtra ? `+${c.qty} person${c.qty > 1 ? 's' : ''} ×` : `+${extraQty} extra ×`} ₹
        </span>
        <input type="number" class="qed-crew-price-input" min="0"
          id="qedCrewPrice-${key}-${i}"
          placeholder="price/head"
          value="${c.pricePerHead || ''}">
      `;
      priceWrap.querySelector('input').oninput = (e) => {
        _state[key].crew[i].pricePerHead = parseFloat(e.target.value) || 0;
        _recalcService(key);
      };
      // Make row wrap
      row.style.flexWrap = 'wrap';
      row.appendChild(priceWrap);
    }

    return row;
  }

  function _refreshCrewList(key) {
    const list = document.getElementById('qedCrew-' + key);
    if (!list) return;
    list.innerHTML = '';
    _state[key].crew.forEach((c, i) => list.appendChild(_buildCrewRow(key, i)));
  }

  /* ── CREW ACTIONS ────────────────────────────────────────────── */
  function _qedChangeQty(key, i, delta) {
    const c = _state[key].crew[i];
    c.qty = Math.max(1, Math.min(9, c.qty + delta));
    const el = document.getElementById(`qedQty-${key}-${i}`);
    if (el) {
      el.textContent = c.qty;
      el.style.transform = 'scale(1.5)';
      el.style.color = '#7d3f5a';
      setTimeout(() => { el.style.transform = 'scale(1)'; el.style.color = ''; }, 200);
    }
    // Rebuild row to show/hide extra price row
    _refreshCrewList(key);
    _recalcService(key);
  }

  function _qedRemoveCrew(key, i) {
    const row = document.getElementById(`qedCrewRow-${key}-${i}`);
    if (row) {
      row.style.transition = 'opacity .15s, transform .15s';
      row.style.opacity = '0';
      row.style.transform = 'translateX(12px)';
    }
    setTimeout(() => {
      _state[key].crew.splice(i, 1);
      _refreshCrewList(key);
      _recalcService(key);
    }, 160);
  }

  /* ── DELIVERABLE CHIPS ────────────────────────────────────────── */
  function _buildChip(key, i) {
    const d = _state[key].deliverables[i];
    const chip = document.createElement('span');
    chip.className = 'qed-chip ' + (d.isExtra ? 'extra' : 'base');
    chip.id = `qedChip-${key}-${i}`;
    const extraLabel = d.extraPrice ? ` +₹${d.extraPrice}` : '';
    chip.innerHTML = `${d.label}${extraLabel} <span class="qed-chip-x" title="Remove">✕</span>`;
    chip.querySelector('.qed-chip-x').onclick = () => _qedRemoveChip(key, i);
    return chip;
  }

  function _refreshChips(key) {
    const box = document.getElementById('qedChips-' + key);
    if (!box) return;
    box.innerHTML = '';
    _state[key].deliverables.forEach((d, i) => box.appendChild(_buildChip(key, i)));
  }

  window._qedCancelDel = function (key) {
    const f = document.getElementById('qedDelInline-' + key);
    const b = document.getElementById('qedAddDelBtn-' + key);
    if (f) f.style.display = 'none';
    if (b) b.style.display = 'flex';
    const n = document.getElementById('qedDelName-' + key);
    const p = document.getElementById('qedDelPrice-' + key);
    if (n) n.value = '';
    if (p) p.value = '';
  };

  window._qedConfirmDel = function (key) {
    const nameEl = document.getElementById('qedDelName-' + key);
    const priceVal = parseInt(document.getElementById('qedDelPrice-' + key)?.value) || 0;
    const name = nameEl?.value.trim();
    if (!name) {
      if (nameEl) { nameEl.style.borderColor = '#ef4444'; setTimeout(() => nameEl.style.borderColor = '', 400); }
      return;
    }
    _state[key].deliverables.push({ label: name, isExtra: true, extraPrice: priceVal });
    if (priceVal > 0) {
      _state[key].extraDelCost = (_state[key].extraDelCost || 0) + priceVal;
    }
    _refreshChips(key);
    _recalcService(key);
    window._qedCancelDel(key);
  };

  function _qedRemoveChip(key, i) {
    const d = _state[key].deliverables[i];
    if (d.isExtra && d.extraPrice) {
      _state[key].extraDelCost = Math.max(0, (_state[key].extraDelCost || 0) - d.extraPrice);
    }
    const chip = document.getElementById(`qedChip-${key}-${i}`);
    if (chip) {
      chip.style.transition = 'opacity .12s, transform .12s';
      chip.style.opacity = '0';
      chip.style.transform = 'scale(0.7)';
    }
    setTimeout(() => {
      _state[key].deliverables.splice(i, 1);
      _refreshChips(key);
      _recalcService(key);
    }, 130);
  }

  /* ── DATE / SESSION HANDLERS ─────────────────────────────────── */
  window._qedTbdChange = function (key, checked) {
    _state[key].dateTBD = checked;
    const wrap = document.getElementById('qedDateInputs-' + key);
    if (wrap) wrap.style.display = checked ? 'none' : 'flex';
  };

  window._qedDateChange = function (key, val) {
    _state[key].eventDate = val;
  };

  window._qedSessChange = function (key, val) {
    _state[key].eventSession = val;
  };

  /* ── PRICE BOX ──────────────────────────────────────────────── */
  function _renderPriceBox(key) {
    const box = document.getElementById('qedPriceBox-' + key);
    if (!box) return;
    const svc = _state[key];
    const crewExtra = svc.extraCrewCost || 0;
    const delExtra  = svc.extraDelCost  || 0;
    const total     = svc.basePrice + crewExtra + delExtra;

    box.innerHTML = '';
    const rows = [
      ['Base Package', svc.basePrice],
      crewExtra > 0 ? ['Extra Crew Cost', crewExtra] : null,
      delExtra  > 0 ? ['Extra Deliverables', delExtra]  : null,
      ['Package Total', total],
    ].filter(Boolean);

    rows.forEach(([label, amount], idx) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;' +
        (idx === rows.length - 1 ? 'border-top:1px solid #ede0e8;padding-top:9px;margin-top:3px;font-weight:700;color:#2c1a22;' : 'color:#7a5a65;');
      row.innerHTML = `<span>${label}</span><span>₹${_fmtInr(amount)}</span>`;
      box.appendChild(row);
    });
  }

  /* ── RECALC SERVICE TOTAL ────────────────────────────────────── */
  function _recalcService(key) {
    const svc = _state[key];
    let crewCost = 0;
    svc.crew.forEach(c => {
      const extraQty = c.isExtra ? c.qty : Math.max(0, c.qty - c.baseQty);
      crewCost += extraQty * (c.pricePerHead || 0);
    });
    svc.extraCrewCost = crewCost;
    svc.price = svc.basePrice + crewCost + (svc.extraDelCost || 0);

    _renderPriceBox(key);
    _recalcPricingFromServices();
  }

  function _recalcPricingFromServices() {
    const subtotal = Object.values(_state).reduce((s, svc) => s + (svc.price || 0), 0);
    _pricing.subtotal = subtotal;

    if (_pricing.discountType === 'percent') {
      _pricing.discountAmount = Math.round(subtotal * _pricing.discountValue / 100);
    } else if (_pricing.discountType === 'flat') {
      _pricing.discountAmount = Math.min(_pricing.discountValue, subtotal);
    } else {
      _pricing.discountAmount = 0;
    }
    const afterDiscount = subtotal - _pricing.discountAmount;
    _pricing.gstAmount  = Math.round(afterDiscount * _pricing.gstRate / 100);
    _pricing.finalTotal = afterDiscount + _pricing.gstAmount;

    // Refresh pricing pane if open
    if (_activeTab === '__PRICING__') {
      _activateTab('__PRICING__');
    }
    _renderPricingSummary();
  }

  /* ── PRICING PANE ────────────────────────────────────────────── */
  function _buildPricingPane() {
    const wrap = document.createElement('div');

    // ── DISCOUNT ──
    const discLabel = _makeLabel('Discount');
    wrap.appendChild(discLabel);

    const discRow = document.createElement('div');
    discRow.className = 'qed-pricing-row';
    discRow.style.flexWrap = 'wrap';
    discRow.style.gap = '10px';

    // Type toggle
    const typeToggle = document.createElement('div');
    typeToggle.className = 'qed-type-toggle';
    ['percent', 'flat'].forEach(type => {
      const btn = document.createElement('button');
      btn.className = 'qed-type-btn' + (_pricing.discountType === type ? ' active' : (type === 'percent' && !_pricing.discountType ? ' active' : ''));
      btn.dataset.type = type;
      btn.textContent = type === 'percent' ? '% Off' : '₹ Flat';
      btn.onclick = () => {
        wrap.querySelectorAll('.qed-type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        _pricing.discountType = type;
        _recalcPricingFromServices();
      };
      typeToggle.appendChild(btn);
    });

    const discInputWrap = document.createElement('div');
    discInputWrap.className = 'qed-pricing-input-wrap';
    discInputWrap.innerHTML = `<span class="qed-pricing-prefix" id="qedDiscPrefix">${_pricing.discountType === 'flat' ? '₹' : '%'}</span>`;
    const discInp = document.createElement('input');
    discInp.type = 'number';
    discInp.className = 'qed-pricing-input';
    discInp.min = 0;
    discInp.value = _pricing.discountValue || '';
    discInp.placeholder = 'e.g. 10';
    discInp.oninput = (e) => {
      _pricing.discountValue = parseFloat(e.target.value) || 0;
      _recalcPricingFromServices();
    };
    discInputWrap.appendChild(discInp);

    discRow.appendChild(typeToggle);
    discRow.appendChild(discInputWrap);
    wrap.appendChild(discRow);

    // Clear discount
    const clearDiscBtn = document.createElement('button');
    clearDiscBtn.className = 'qed-add-btn';
    clearDiscBtn.style.marginTop = '6px';
    clearDiscBtn.innerHTML = '✕ Remove Discount';
    clearDiscBtn.onclick = () => {
      _pricing.discountType = null;
      _pricing.discountValue = 0;
      _pricing.discountAmount = 0;
      _recalcPricingFromServices();
      _activateTab('__PRICING__');
    };
    wrap.appendChild(clearDiscBtn);

    // ── GST ──
    const gstLabel = _makeLabel('GST / Tax');
    gstLabel.style.marginTop = '22px';
    wrap.appendChild(gstLabel);

    const gstRow = document.createElement('div');
    gstRow.className = 'qed-pricing-row';

    const gstSlabs = document.createElement('div');
    gstSlabs.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;';
    [0, 5, 12, 18, 28].forEach(rate => {
      const chip = document.createElement('button');
      chip.style.cssText = `padding:6px 12px;border-radius:7px;border:1.5px solid ${_pricing.gstRate === rate ? '#7d3f5a' : '#ede0e8'};background:${_pricing.gstRate === rate ? '#5a2d42' : 'white'};color:${_pricing.gstRate === rate ? 'white' : '#5a2d42'};font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;font-family:'Jost',sans-serif;`;
      chip.textContent = rate + '%';
      chip.onclick = () => {
        _pricing.gstRate = rate;
        _recalcPricingFromServices();
        _activateTab('__PRICING__');
      };
      gstSlabs.appendChild(chip);
    });
    gstRow.appendChild(gstSlabs);
    wrap.appendChild(gstRow);

    // Custom GST
    const customGstWrap = document.createElement('div');
    customGstWrap.className = 'qed-pricing-input-wrap';
    customGstWrap.style.marginTop = '8px';
    customGstWrap.innerHTML = `<span class="qed-pricing-prefix">%</span>`;
    const gstInp = document.createElement('input');
    gstInp.type = 'number';
    gstInp.className = 'qed-pricing-input';
    gstInp.min = 0; gstInp.max = 100;
    gstInp.placeholder = 'Custom GST %';
    if (_pricing.gstRate > 0 && ![0,5,12,18,28].includes(_pricing.gstRate)) {
      gstInp.value = _pricing.gstRate;
    }
    gstInp.oninput = (e) => {
      _pricing.gstRate = parseFloat(e.target.value) || 0;
      _recalcPricingFromServices();
    };
    customGstWrap.appendChild(gstInp);
    wrap.appendChild(customGstWrap);

    // ── SUMMARY ──
    const summaryLabel = _makeLabel('Total Summary');
    summaryLabel.style.marginTop = '24px';
    wrap.appendChild(summaryLabel);

    const summaryBox = document.createElement('div');
    summaryBox.className = 'qed-pricing-summary';
    summaryBox.id = 'qedPricingSummary';
    wrap.appendChild(summaryBox);
    setTimeout(() => _renderPricingSummary(), 0);

    return wrap;
  }

  function _renderPricingSummary() {
    const box = document.getElementById('qedPricingSummary');
    if (!box) return;
    const p = _pricing;
    const sub = p.subtotal || 0;
    const dis = p.discountAmount || 0;
    const gst = p.gstAmount || 0;
    const tot = p.finalTotal || sub;

    box.innerHTML = '';
    const rows = [
      ['Subtotal', '₹' + _fmtInr(sub), false],
      dis > 0 ? ['Discount', '− ₹' + _fmtInr(dis), false] : null,
      gst > 0 ? ['GST (' + p.gstRate + '%)', '+ ₹' + _fmtInr(gst), false] : null,
      ['Total Amount', '₹' + _fmtInr(tot), true],
    ].filter(Boolean);

    rows.forEach(([label, val, isTotal]) => {
      const row = document.createElement('div');
      row.className = 'qed-psrow' + (isTotal ? ' total' : '');
      row.innerHTML = `<span>${label}</span><span>${val}</span>`;
      box.appendChild(row);
    });
  }

  /* ── HELPERS ────────────────────────────────────────────────── */
  function _makeLabel(text) {
    const el = document.createElement('div');
    el.className = 'qed-section-label';
    el.textContent = text;
    return el;
  }

  /* ── SAVE ───────────────────────────────────────────────────── */
  window.saveQuotEdit = function () {
    if (_saving) return;
    _saving = true;

    const saveBtn = document.getElementById('qedSaveBtn');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<span class="qed-spinner"></span> Saving…';
    }

    // Build selected_services array in the same format as lead form
    const selectedServices = Object.values(_state).map(svc => ({
      key:            svc.key,
      label:          svc.label,
      price:          svc.price,
      basePrice:      svc.basePrice,
      extraCrewCost:  svc.extraCrewCost || 0,
      extraDelCost:   svc.extraDelCost  || 0,
      crew:           svc.crew.map(c => `${c.role} x${c.qty}`),
      crewDetail:     svc.crew.map(c => ({
        role:         c.role,
        qty:          c.qty,
        baseQty:      c.baseQty,
        isExtra:      c.isExtra,
        pricePerHead: c.pricePerHead || 0,
      })),
      deliverables:   svc.deliverables.map(d => d.label),
      eventDate:      svc.dateTBD ? null : (svc.eventDate || null),
      eventSession:   svc.dateTBD ? null : (svc.eventSession || null),
      dateTBD:        svc.dateTBD === true,
    }));

    const pricingData = {
      subtotal:       _pricing.subtotal       || 0,
      discountType:   _pricing.discountType   || null,
      discountValue:  _pricing.discountValue  || 0,
      discountAmount: _pricing.discountAmount || 0,
      gstRate:        _pricing.gstRate        || 0,
      gstAmount:      _pricing.gstAmount      || 0,
      finalTotal:     _pricing.finalTotal     || _pricing.subtotal || 0,
    };

    const formData = new FormData();
    formData.append('lead_id',          window.QUOT_LEAD_ID);
    formData.append('selected_services', JSON.stringify(selectedServices));
    formData.append('pricing_data',      JSON.stringify(pricingData));
    formData.append('total_amount',      pricingData.finalTotal);

    // Carry forward unchanged fields (fetched from window.QUOT_LEAD_DATA)
    const leadData = window.QUOT_LEAD_DATA || {};
    ['client_name','phone','email','event_type','event_location',
     'event_start_date','event_start_session','event_end_date','event_end_session',
     'follow_up_date'].forEach(field => {
      if (leadData[field] != null && leadData[field] !== undefined) {
        formData.append(field, leadData[field]);
      }
    });

    const csrf = _csrfToken();

    fetch('/leads/save/', {
      method: 'POST',
      headers: { 'X-CSRFToken': csrf },
      body: formData,
    })
    .then(r => r.json())
    .then(data => {
      _saving = false;
      if (data.success) {
        // Success flash then reload
        if (saveBtn) {
          saveBtn.innerHTML = '✓ Saved!';
          saveBtn.style.background = '#16a34a';
        }
        setTimeout(() => location.reload(), 900);
      } else {
        _showToast('Save failed: ' + (data.error || 'Unknown error'));
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.innerHTML = 'Save Changes ✓';
          saveBtn.style.background = '';
        }
      }
    })
    .catch(err => {
      _saving = false;
      _showToast('Network error. Please try again.');
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = 'Save Changes ✓';
        saveBtn.style.background = '';
      }
    });
  };

  /* ── INIT: fetch lead base data for carry-forward ────────────── */
  document.addEventListener('DOMContentLoaded', () => {
    const leadId = window.QUOT_LEAD_ID;
    if (!leadId) return;
    fetch(`/leads/get/${leadId}/`)
      .then(r => r.json())
      .then(data => { window.QUOT_LEAD_DATA = data; })
      .catch(() => {});
  });

})();