let draggedCard = null;
let targetStatus = null;
let sourceColumn = null;

document.querySelectorAll(".card").forEach(card => {
    card.addEventListener("dragstart", () => {
        draggedCard = card;
        sourceColumn = card.parentElement;
        setTimeout(() => card.classList.add("dragging"), 0);
    });

    card.addEventListener("dragend", () => {
        card.classList.remove("dragging");
        draggedCard = null;
    });
});

document.querySelectorAll(".column").forEach(column => {
    column.addEventListener("dragover", e => {
        e.preventDefault();
        column.classList.add("hover");
    });

    column.addEventListener("dragleave", () => {
        column.classList.remove("hover");
    });

    column.addEventListener("drop", () => {
        column.classList.remove("hover");

        const status = column.dataset.status;
        const leadId = draggedCard.dataset.id;
        const fromStatus = sourceColumn.dataset.status;

        if (canMoveBackward(fromStatus, status)) {
            draggedCard.classList.add("shake");
            sourceColumn.appendChild(draggedCard);
            setTimeout(() => draggedCard.classList.remove("shake"), 400);
            return;
        }

        if (sourceColumn !== column) {
            const firstCard = column.querySelector(".card");
            if (firstCard) {
                column.insertBefore(draggedCard, firstCard);
            } else {
                column.appendChild(draggedCard);
            }
        }

        if (status === "ACCEPTED") {
            currentLeadId = leadId;
            openPaymentModal(leadId);
        } else {
            updateStatus(leadId, status);
        }

        const order = [...column.querySelectorAll(".card")].map((card, index) => ({ id: card.dataset.id, position: index }));
        const csrfToken = document.getElementById("csrf_token").value;
        fetch("/update-position/", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
            body: JSON.stringify({ order })
        });
    });
});


// ===============================
// PAYMENT LOGIC
// ===============================
let currentLeadId = null;

function openPaymentModal(leadId) {
    currentLeadId = leadId;
    document.getElementById("paymentModal").style.display = "flex";
}

function closeModal() {
    document.getElementById("paymentModal").style.display = "none";
    updateStatus(currentLeadId, "ACCEPTED");
}

function closePaymentModal() {
    document.getElementById("paymentModal").style.display = "none";
    currentLeadId = null;
}

function submitPayment() {
    const toast = document.getElementById("paymentToast");
    toast.style.display = "none";

    const total = Number(document.getElementById("totalAmount").value);
    const paid = Number(document.getElementById("paidAmount").value);

    if (!total || !paid) {
        toast.innerText = "Both total amount and advance paid are required";
        toast.style.display = "block";
        return;
    }

    if (total <= 0 || paid <= 0) {
        toast.innerText = "Amount cannot be negative or zero";
        toast.style.display = "block";
        return;
    }

    if (paid > total) {
        toast.innerText = "Advance paid cannot be greater than total amount";
        toast.style.display = "block";
        return;
    }

    updateStatus(currentLeadId, "ACCEPTED", total, paid);

    const card = document.querySelector(`.card[data-id="${currentLeadId}"]`);
    if (!card) return;

    const quoted = card.querySelector(".quoted-row");
    if (quoted) quoted.remove();

    const existingPaid = card.querySelector(".paid-row");
    if (existingPaid) existingPaid.remove();

    if (paid) {
        const paidRow = document.createElement("div");
        paidRow.className = "card-row paid-row";
        paidRow.innerHTML = `<img src="/static/icons/rupee.svg"><span>Paid : ₹ ${paid}</span>`;
        card.appendChild(paidRow);
    }

    document.getElementById("paymentModal").style.display = "none";
}

function updateStatus(leadId, status, total = null, paid = null) {
    const csrf = document.getElementById("csrf_token").value;

    fetch("/leads/update-status/", {
        method: "POST",
        headers: { "X-CSRFToken": csrf, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            lead_id: leadId,
            status: status,
            total_amount: total || "",
            paid_amount: paid || ""
        })
    }).then(res => res.json())
      .then(data => {
        if (data.success) {
            window.location.reload();
            if (status === "FOLLOW_UP" && data.follow_up_date) {
                addFollowUpUI(leadId, data.follow_up_date);
            }
            if (status !== "FOLLOW_UP") {
                removeFollowUpUI(leadId);
            }
        }
    });
}

function addFollowUpUI(leadId, date) {
    const card = document.querySelector(`.card[data-id="${leadId}"]`);
    if (!card) return;
    if (card.querySelector(".card-row.danger")) return;
    const row = document.createElement("div");
    row.className = "card-row danger";
    row.innerHTML = `<img src="/static/icons/clock.svg"><span>${date}</span><small>Due</small>`;
    card.appendChild(row);
}

function removeFollowUpUI(leadId) {
    const card = document.querySelector(`.card[data-id="${leadId}"]`);
    if (!card) return;
    const followRow = card.querySelector(".card-row.danger");
    if (followRow) followRow.remove();
}


// ===============================
// FORM STEPS
// ===============================
let currentStep = 0;
const steps = document.querySelectorAll(".form-step");
const stepIndicators = document.querySelectorAll(".progress-step");

function openLeadForm() {
    document.getElementById("leadModal").style.display = "flex";
}

function nextStep() {
    steps[currentStep].classList.remove("active");
    stepIndicators[currentStep].classList.remove("active");
    currentStep++;
    steps[currentStep].classList.add("active");
    stepIndicators[currentStep].classList.add("active");
    updateFormWidth();
}

function prevStep() {
    steps[currentStep].classList.remove("active");
    stepIndicators[currentStep].classList.remove("active");
    currentStep--;
    steps[currentStep].classList.add("active");
    stepIndicators[currentStep].classList.add("active");
    updateFormWidth();
}

function updateFormWidth() {
    const form = document.querySelector(".lead-form");
    if (!form) return;
    if (currentStep === 0) {
        form.classList.remove("step-wide");
    } else {
        form.classList.add("step-wide");
    }
}

function closeLeadForm() {
    document.getElementById("leadModal").style.display = "none";

    const form = document.getElementById("leadForm");
    form.reset();
    const toast = document.getElementById("formToast");
    toast.innerText = "";
    toast.style.display = "none";

    document.getElementById("lead_id").value = "";

    ["client_name", "phone", "email"].forEach(name => {
        const input = document.querySelector(`[name="${name}"]`);
        if (input) input.readOnly = false;
    });

    steps.forEach(step => step.classList.remove("active"));
    stepIndicators.forEach(step => step.classList.remove("active"));

    currentStep = 0;
    steps[0].classList.add("active");
    stepIndicators[0].classList.add("active");

    updateFormWidth();

    _selectedKeys = [];
    _editState = {};
    window.selectedPackageServices = [];

    // Reset pricing state
    _pricing.subtotal = 0;
    _pricing.discountType = null;
    _pricing.discountValue = 0;
    _pricing.discountAmount = 0;
    _pricing.gstRate = 0;
    _pricing.gstAmount = 0;
    _pricing.finalTotal = 0;

    // Unlock total_amount field
    const totalInput = document.querySelector('[name="total_amount"]');
    if (totalInput) {
        totalInput.readOnly = false;
        totalInput.classList.remove('pkg-auto-amount');
        totalInput.title = '';
    }

    renderPackages();
}


// ===============================
// FORM SUBMIT — with success modal
// ===============================
document.getElementById("leadForm").addEventListener("submit", function (e) {
    e.preventDefault();

    const toast = document.getElementById("formToast");
    toast.style.display = "none";

    const f = this;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!f.client_name.value.trim()) return showToast("Client name is required");
    if (!f.phone.value.trim()) return showToast("Phone number is required");
    if (!f.email.value.trim()) return showToast("Email is required");
    if (!emailRegex.test(f.email.value.trim())) return showToast("Enter a valid email address");
    if (!f.event_type.value.trim()) return showToast("Event type is required");
    const _pkgDateCheck = window.validatePkgDates ? window.validatePkgDates() : true;
if (_pkgDateCheck && _pkgDateCheck.error) return showToast(_pkgDateCheck.error);
    if (!f.follow_up_date.value) return showToast("Follow-up date is required");
    if (!f.event_location.value.trim()) return showToast("Event location is required");
    if (!f.total_amount.value) return showToast("Quoted amount is required");

    // Capture form data BEFORE any reset
    const capturedData = {
        client_name: f.client_name.value.trim(),
        phone: f.phone.value.trim(),
        email: f.email.value.trim(),
        event_type: f.event_type.value.trim(),
        event_start_date: f.event_start_date.value,
        event_start_session: f.event_start_session.value,
        event_end_date: f.event_end_date.value,
        event_end_session: f.event_end_session.value,
        follow_up_date: f.follow_up_date.value,
        event_location: f.event_location.value.trim(),
        total_amount: f.total_amount.value,
        lead_id: document.getElementById("lead_id").value,
        selected_services: JSON.parse(JSON.stringify(window.selectedPackageServices || [])),
        // pricing breakdown
        pricing: {
            subtotal: _pricing.subtotal,
            discountType: _pricing.discountType,
            discountValue: _pricing.discountValue,
            discountAmount: _pricing.discountAmount,
            gstRate: _pricing.gstRate,
            gstAmount: _pricing.gstAmount,
            finalTotal: _pricing.finalTotal
        }
    };

    const formData = new FormData(f);
    const csrf = document.getElementById("csrf_token").value;
    formData.append("selected_services", JSON.stringify(capturedData.selected_services));
    formData.append("pricing_data", JSON.stringify(capturedData.pricing));

    fetch("/leads/save/", {
        method: "POST",
        headers: { "X-CSRFToken": csrf },
        body: formData
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            // Close lead form
            closeLeadForm();
            document.getElementById("leadModal").style.display = "none";

            // Inject new card into NEW column instantly (no reload yet)
            if (!capturedData.lead_id) {
                injectNewLeadCard(data.id, capturedData);
            }

            // Show success modal with quotation options
            openLeadSuccessModal(capturedData, data.id);
        }
    });

    function showToast(msg) {
        toast.innerText = msg;
        toast.style.display = "block";
    }
});


// ===============================
// INJECT CARD INTO KANBAN
// ===============================
function injectNewLeadCard(leadId, d) {
    const col = document.querySelector('.column[data-status="NEW"]');
    if (!col) return;

    const card = document.createElement("div");
    card.className = "card card-new-flash";
    card.draggable = true;
    card.dataset.id = leadId;
    
    // ✅ ADD THIS
    if (d.selected_services?.length) {
        card.dataset.selectedServices = JSON.stringify(d.selected_services);
    }

    const startDate = d.event_start_date || "";
    const endDate = d.event_end_date || "";
    const startSess = d.event_start_session || "";
    const endSess = d.event_end_session || "";

    card.innerHTML = `
        <div class="card-title">
            ${d.client_name}
            <button class="edit-btn" onclick="openEditLead(${leadId})" title="Edit Lead">
                <i class="fa-solid fa-pen-to-square"></i>
            </button>
        </div>
        <hr>
        <div class="card-row"><span>📅 ${d.event_type}</span></div>
        <div class="card-row"><span>🗓 ${_buildCardDateLine(d.selected_services || [])}</span></div>
        ${d.follow_up_date ? `<div class="card-row"><span>⏰ ${d.follow_up_date}</span><small>Due</small></div>` : ""}
        ${d.total_amount ? `<div class="card-row"><span>₹ Quoted : ₹ ${Number(d.total_amount).toLocaleString('en-IN')}</span></div>` : ""}
    `;

    // Wire up drag events
    card.addEventListener("dragstart", () => {
        draggedCard = card;
        sourceColumn = card.parentElement;
        setTimeout(() => card.classList.add("dragging"), 0);
    });
    card.addEventListener("dragend", () => {
        card.classList.remove("dragging");
        draggedCard = null;
    });

    // Insert at top of NEW column (after column-head)
    const head = col.querySelector(".column-head");
    if (head && head.nextSibling) {
        col.insertBefore(card, head.nextSibling);
    } else {
        col.appendChild(card);
    }

    // Update count badge
    const countEl = col.querySelector(".column-head .count");
    if (countEl) countEl.innerText = col.querySelectorAll(".card").length;

    // Animate in
    requestAnimationFrame(() => {
        card.style.opacity = "0";
        card.style.transform = "translateY(-20px) scale(0.95)";
        card.style.transition = "opacity 0.4s ease, transform 0.4s cubic-bezier(0.34,1.56,0.64,1)";
        requestAnimationFrame(() => {
            card.style.opacity = "1";
            card.style.transform = "translateY(0) scale(1)";
        });
    });
}


// ===============================
// GLOBAL PRICING STATE
// discount & GST live here — shared between form & quotation
// ===============================
const _pricing = {
    subtotal: 0,          // packages subtotal (no discount/tax)
    discountType: null,   // 'percent' | 'flat' | null
    discountValue: 0,     // number entered by admin
    discountAmount: 0,    // computed ₹ discount
    gstRate: 0,           // GST % (0, 5, 12, 18, 28)
    gstAmount: 0,         // computed ₹ GST
    finalTotal: 0         // what goes into total_amount field
};

// Recompute _pricing from current subtotal
function recalcPricing() {
    const sub = _pricing.subtotal;

    // Discount
    if (_pricing.discountType === 'percent') {
        _pricing.discountAmount = Math.round(sub * _pricing.discountValue / 100);
    } else if (_pricing.discountType === 'flat') {
        _pricing.discountAmount = Math.min(_pricing.discountValue, sub);
    } else {
        _pricing.discountAmount = 0;
    }

    const afterDiscount = sub - _pricing.discountAmount;

    // GST applied on discounted amount
    _pricing.gstAmount = Math.round(afterDiscount * _pricing.gstRate / 100);

    _pricing.finalTotal = afterDiscount + _pricing.gstAmount;

    // Sync to form field
    const totalInput = document.querySelector('[name="total_amount"]');
    if (totalInput) totalInput.value = _pricing.finalTotal;

    renderPricingSummaryWidget();
}

// Called from syncSelectedServicesToWindow — keep subtotal fresh
function updatePricingSubtotal(subtotal) {
    _pricing.subtotal = subtotal;
    recalcPricing();
    updateTotalAmountFieldState();
}

// Lock / unlock total_amount input based on whether packages are selected
function updateTotalAmountFieldState() {
    const totalInput = document.querySelector('[name="total_amount"]');
    if (!totalInput) return;
    if (_pricing.subtotal > 0) {
        totalInput.readOnly = true;
        totalInput.classList.add('pkg-auto-amount');
        totalInput.title = 'Auto-calculated from selected packages';
    } else {
        totalInput.readOnly = false;
        totalInput.classList.remove('pkg-auto-amount');
        totalInput.title = '';
    }
}


// ===============================
// PRICING SUMMARY WIDGET (in lead form step 2)
// ===============================
function renderPricingSummaryWidget() {
    const wrap = document.getElementById('pricingSummaryWrap');
    if (!wrap) return;

    // In edit mode, subtotal may be 0 momentarily before sync runs.
    // Fall back to saved subtotal from pricing_data if available.
    const sub = _pricing.subtotal > 0
        ? _pricing.subtotal
        : (_pricing._savedSubtotal || 0);
    if (sub <= 0 && _pricing.finalTotal <= 0) { wrap.style.display = 'none'; return; }
    wrap.style.display = 'block';

    const discountActive = _pricing.discountAmount > 0;
    const gstActive = _pricing.gstAmount > 0;
    const afterDiscount = sub - _pricing.discountAmount;

    wrap.innerHTML = `
        <div class="psw-card">
            <div class="psw-row psw-subtotal">
                <span class="psw-label">Sub Total</span>
                <span class="psw-val">₹${sub.toLocaleString('en-IN')}</span>
            </div>

            ${discountActive ? `
            <div class="psw-row psw-discount-row">
                <span class="psw-label">
                    Discount
                    <span class="psw-badge psw-badge--green">
                        ${_pricing.discountType === 'percent' ? _pricing.discountValue + '%' : 'Flat'}
                    </span>
                </span>
                <span class="psw-val psw-val--green">
                    − ₹${_pricing.discountAmount.toLocaleString('en-IN')}
                </span>
            </div>` : ''}

            ${gstActive ? `
            <div class="psw-row psw-tax-row">
                <span class="psw-label">
                    GST
                    <span class="psw-badge psw-badge--blue">${_pricing.gstRate}%</span>
                </span>
                <span class="psw-val psw-val--blue">+ ₹${_pricing.gstAmount.toLocaleString('en-IN')}</span>
            </div>` : ''}

            ${(discountActive || gstActive) ? `<div class="psw-divider"></div>` : ''}

            <div class="psw-row psw-total-row">
                <span class="psw-label psw-label--bold">Total Amount</span>
                <span class="psw-val psw-val--total">₹${_pricing.finalTotal.toLocaleString('en-IN')}</span>
            </div>

            <div class="psw-actions">
                <button type="button" class="psw-btn psw-btn--discount ${discountActive ? 'psw-btn--active' : ''}"
                    onclick="openDiscountPopup()">
                    ${discountActive
                        ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20,6 9,17 4,12"/></svg> Discount Applied`
                        : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Discount`}
                </button>
                <button type="button" class="psw-btn psw-btn--tax ${gstActive ? 'psw-btn--active-blue' : ''}"
                    onclick="openTaxPopup()">
                    ${gstActive
                        ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20,6 9,17 4,12"/></svg> GST Applied`
                        : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add GST / Tax`}
                </button>
            </div>
        </div>
    `;
}


// ===============================
// DISCOUNT POPUP
// ===============================
function openDiscountPopup() {
    const pop = document.getElementById('discountPopup');
    if (!pop) return;

    // Pre-fill saved values
    if (_pricing.discountType === 'percent') {
        pop.querySelector('[data-dtype="percent"]').classList.add('dp-type--active');
        pop.querySelector('[data-dtype="flat"]').classList.remove('dp-type--active');
        pop.querySelector('#discountValueInput').value = _pricing.discountValue || '';
        pop.querySelector('#discountValueInput').placeholder = 'e.g. 10';
    } else if (_pricing.discountType === 'flat') {
        pop.querySelector('[data-dtype="flat"]').classList.add('dp-type--active');
        pop.querySelector('[data-dtype="percent"]').classList.remove('dp-type--active');
        pop.querySelector('#discountValueInput').value = _pricing.discountValue || '';
        pop.querySelector('#discountValueInput').placeholder = 'e.g. 5000';
    } else {
        pop.querySelector('[data-dtype="percent"]').classList.add('dp-type--active');
        pop.querySelector('[data-dtype="flat"]').classList.remove('dp-type--active');
        pop.querySelector('#discountValueInput').value = '';
    }

    // Show current subtotal for reference
    const subRefEl = pop.querySelector('#dpSubRef');
    if (subRefEl) subRefEl.innerText = _pricing.subtotal.toLocaleString('en-IN');

    updateDiscountPreview();

    pop.style.display = 'flex';
    requestAnimationFrame(() => requestAnimationFrame(() => pop.classList.add('popup--visible')));
    setTimeout(() => pop.querySelector('#discountValueInput')?.focus(), 180);
}

function closeDiscountPopup() {
    const pop = document.getElementById('discountPopup');
    pop.classList.remove('popup--visible');
    setTimeout(() => { pop.style.display = 'none'; }, 280);
}

function discountTypeToggle(type) {
    const pop = document.getElementById('discountPopup');
    pop.querySelectorAll('[data-dtype]').forEach(b => b.classList.remove('dp-type--active'));
    pop.querySelector(`[data-dtype="${type}"]`).classList.add('dp-type--active');
    const inp = pop.querySelector('#discountValueInput');
    inp.placeholder = type === 'percent' ? 'e.g. 10' : 'e.g. 5000';
    updateDiscountPreview();
}

function updateDiscountPreview() {
    const pop = document.getElementById('discountPopup');
    if (!pop) return;
    const activeType = pop.querySelector('.dp-type--active')?.dataset.dtype || 'percent';
    const val = parseFloat(pop.querySelector('#discountValueInput')?.value) || 0;
    const sub = _pricing.subtotal;

    let discAmt = 0;
    let previewTxt = '';

    if (activeType === 'percent' && val > 0) {
        discAmt = Math.round(sub * Math.min(val, 100) / 100);
        previewTxt = `${val}% of ₹${sub.toLocaleString('en-IN')} = −₹${discAmt.toLocaleString('en-IN')}`;
    } else if (activeType === 'flat' && val > 0) {
        discAmt = Math.min(val, sub);
        previewTxt = `−₹${discAmt.toLocaleString('en-IN')} flat discount`;
    }

    const previewEl = pop.querySelector('#discountPreview');
    if (previewEl) {
        previewEl.innerText = previewTxt;
        previewEl.style.display = val > 0 ? 'block' : 'none';
    }

    const afterEl = pop.querySelector('#discountAfterTotal');
    if (afterEl) {
        afterEl.innerText = val > 0 ? `₹${(sub - discAmt).toLocaleString('en-IN')}` : '—';
    }
}

function applyDiscount() {
    const pop = document.getElementById('discountPopup');
    const activeType = pop.querySelector('.dp-type--active')?.dataset.dtype || 'percent';
    const val = parseFloat(pop.querySelector('#discountValueInput')?.value) || 0;

    if (val <= 0) {
        const inp = pop.querySelector('#discountValueInput');
        inp.style.borderColor = '#ef4444';
        inp.style.animation = 'shake .3s ease';
        setTimeout(() => { inp.style.borderColor = ''; inp.style.animation = ''; }, 600);
        return;
    }

    if (activeType === 'percent' && val > 100) {
        pop.querySelector('#discountValueInput').value = 100;
    }

    _pricing.discountType = activeType;
    _pricing.discountValue = Math.min(val, activeType === 'percent' ? 100 : _pricing.subtotal);
    recalcPricing();
    closeDiscountPopup();
}

function removeDiscount() {
    _pricing.discountType = null;
    _pricing.discountValue = 0;
    _pricing.discountAmount = 0;
    recalcPricing();
    closeDiscountPopup();
}


// ===============================
// TAX / GST POPUP
// ===============================
function openTaxPopup() {
    const pop = document.getElementById('taxPopup');
    if (!pop) return;

    // Mark current GST rate as active
    pop.querySelectorAll('[data-gst]').forEach(b => {
        b.classList.toggle('gst-chip--active', Number(b.dataset.gst) === _pricing.gstRate);
    });

    const customInp = pop.querySelector('#gstCustomInput');
    const standardRates = [0, 5, 12, 18, 28];
    if (_pricing.gstRate > 0 && !standardRates.includes(_pricing.gstRate)) {
        customInp.value = _pricing.gstRate;
    } else {
        customInp.value = '';
    }

    updateTaxPreview();

    pop.style.display = 'flex';
    requestAnimationFrame(() => requestAnimationFrame(() => pop.classList.add('popup--visible')));
}

function closeTaxPopup() {
    const pop = document.getElementById('taxPopup');
    pop.classList.remove('popup--visible');
    setTimeout(() => { pop.style.display = 'none'; }, 280);
}

function selectGstChip(rate) {
    const pop = document.getElementById('taxPopup');
    pop.querySelectorAll('[data-gst]').forEach(b => b.classList.remove('gst-chip--active'));
    pop.querySelector(`[data-gst="${rate}"]`).classList.add('gst-chip--active');
    pop.querySelector('#gstCustomInput').value = '';
    updateTaxPreview();
}

function updateTaxPreview() {
    const pop = document.getElementById('taxPopup');
    if (!pop) return;

    const activeChip = pop.querySelector('.gst-chip--active');
    const customVal = parseFloat(pop.querySelector('#gstCustomInput')?.value) || 0;
    const rate = customVal > 0 ? customVal : (activeChip ? Number(activeChip.dataset.gst) : 0);

    const afterDiscount = _pricing.subtotal - _pricing.discountAmount;
    const gstAmt = Math.round(afterDiscount * rate / 100);

    const previewEl = pop.querySelector('#taxPreview');
    if (previewEl) {
        previewEl.innerText = rate > 0
            ? `${rate}% on ₹${afterDiscount.toLocaleString('en-IN')} = +₹${gstAmt.toLocaleString('en-IN')}`
            : '';
        previewEl.style.display = rate > 0 ? 'block' : 'none';
    }

    const finalEl = pop.querySelector('#taxFinalTotal');
    if (finalEl) finalEl.innerText = rate >= 0 ? `₹${(afterDiscount + gstAmt).toLocaleString('en-IN')}` : '—';
}

function applyTax() {
    const pop = document.getElementById('taxPopup');
    const activeChip = pop.querySelector('.gst-chip--active');
    const customVal = parseFloat(pop.querySelector('#gstCustomInput')?.value) || 0;
    const rate = customVal > 0 ? customVal : (activeChip ? Number(activeChip.dataset.gst) : 0);

    _pricing.gstRate = rate;
    recalcPricing();
    closeTaxPopup();
}

function removeGst() {
    _pricing.gstRate = 0;
    _pricing.gstAmount = 0;
    recalcPricing();
    closeTaxPopup();
}


// ===============================
// SUCCESS MODAL
// ===============================
let _successLeadData = null;
let _successLeadId = null;

function openLeadSuccessModal(leadData, leadId) {
    _successLeadData = leadData;
    _successLeadId = leadId;

    const modal = document.getElementById("leadSuccessModal");
    const clientName = leadData.client_name || "Client";

    document.getElementById("successClientName").innerText = clientName;
    modal.style.display = "flex";

    // Trigger animation
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            modal.classList.add("visible");
        });
    });

    // Animate checkmark
    setTimeout(() => {
        const check = modal.querySelector(".success-check-icon");
        if (check) check.classList.add("animated");
    }, 100);
}

function closeLeadSuccessModal() {
    const modal = document.getElementById("leadSuccessModal");
    modal.classList.remove("visible");
    setTimeout(() => {
        modal.style.display = "none";
        // Now reload to sync properly
        location.reload();
    }, 350);
}

function shareQuotation() {
    const d = _successLeadData;
    if (!d) return;

    const services = d.selected_services || [];
    let servicesText = services.map(s => `• ${s.label} — ₹${Number(s.price).toLocaleString('en-IN')}`).join('\n');
    if (!servicesText) servicesText = `• Total Package — ₹${Number(d.total_amount).toLocaleString('en-IN')}`;

    const deliverables = services.flatMap(s => s.deliverables || []);
    const delText = deliverables.length ? `\n\n📦 *Deliverables:*\n${deliverables.map(dl => `  ✓ ${dl}`).join('\n')}` : '';

    const crew = services.flatMap(s => (s.crew || []).map(c => c));
    const crewText = crew.length ? `\n\n👥 *Crew:*\n${crew.map(c => `  • ${c}`).join('\n')}` : '';

    // Pricing breakdown
    const p = d.pricing || {};
    let pricingText = `\n\n💰 *Pricing Breakdown:*`;
    pricingText += `\n  Sub Total : ₹${Number(p.subtotal || d.total_amount).toLocaleString('en-IN')}`;
    if (p.discountAmount > 0) {
        const discLabel = p.discountType === 'percent' ? `${p.discountValue}%` : 'Flat';
        pricingText += `\n  Discount (${discLabel}) : − ₹${Number(p.discountAmount).toLocaleString('en-IN')}`;
    }
    if (p.gstAmount > 0) {
        pricingText += `\n  GST (${p.gstRate}%) : + ₹${Number(p.gstAmount).toLocaleString('en-IN')}`;
    }
    pricingText += `\n  *Total : ₹${Number(d.total_amount).toLocaleString('en-IN')}*`;

    const msg = `
🎉 *Quotation from AK Photography*

Dear ${d.client_name},

We are delighted to share your event quotation!

📋 *Event Details:*
• Type: ${d.event_type}
• Date: ${d.event_start_date} (${d.event_start_session}) – ${d.event_end_date} (${d.event_end_session})
• Venue: ${d.event_location}

💼 *Package Details:*
${servicesText}${delText}${crewText}${pricingText}

Thank you for choosing us! ✨
    `.trim();

    const whatsappUrl = `https://wa.me/${d.phone}?text=${encodeURIComponent(msg)}`;
    window.open(whatsappUrl, "_blank");
}

function downloadQuotation() {
    const d = _successLeadData;
    if (!d) return;

    const services = d.selected_services || [];
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    const quoteNo = `AK-${_successLeadId || String(today.getTime()).slice(-6)}`;

    // Build service rows HTML
    let serviceRowsHTML = '';
    let grandTotal = 0;

    if (services.length > 0) {
        services.forEach((svc, idx) => {
            const price = Number(svc.price) || 0;
            grandTotal += price;
            const crew = (svc.crew || []).join(', ') || '—';
            const dels = (svc.deliverables || []).join(', ') || '—';
            serviceRowsHTML += `
                <tr class="service-row" style="animation-delay:${idx * 0.05}s">
                    <td class="svc-name">
                        <div class="svc-label">${svc.label}</div>
                        <div class="svc-meta">👥 ${crew}</div>
                        <div class="svc-del">📦 ${dels}</div>
                    </td>
                    <td class="svc-qty">1</td>
                    <td class="svc-price">₹${price.toLocaleString('en-IN')}</td>
                    <td class="svc-total">₹${price.toLocaleString('en-IN')}</td>
                </tr>
            `;
        });
    } else {
        grandTotal = Number(d.total_amount) || 0;
        serviceRowsHTML = `
            <tr class="service-row">
                <td class="svc-name">
                    <div class="svc-label">Photography & Videography Package</div>
                    <div class="svc-meta">${d.event_type}</div>
                </td>
                <td class="svc-qty">1</td>
                <td class="svc-price">₹${grandTotal.toLocaleString('en-IN')}</td>
                <td class="svc-total">₹${grandTotal.toLocaleString('en-IN')}</td>
            </tr>
        `;
    }

    // Pricing breakdown from captured data
    const p = d.pricing || {};
    const subtotal = p.subtotal || grandTotal;
    const discountAmount = p.discountAmount || 0;
    const gstRate = p.gstRate || 0;
    const gstAmount = p.gstAmount || 0;
    const finalTotal = p.finalTotal || Number(d.total_amount) || grandTotal;

    const discountLabel = p.discountType === 'percent'
        ? `Discount (${p.discountValue}%)`
        : p.discountType === 'flat' ? 'Flat Discount' : 'Discount';

    const discountRowHTML = discountAmount > 0 ? `
      <div class="totals-row totals-row--discount">
        <span>${discountLabel}</span>
        <span style="color:#16a34a">− ₹${discountAmount.toLocaleString('en-IN')}</span>
      </div>` : '';

    const afterDiscount = subtotal - discountAmount;

    const gstRowHTML = gstAmount > 0 ? `
      <div class="totals-row">
        <span>GST (${gstRate}%)</span>
        <span style="color:#2563eb">+ ₹${gstAmount.toLocaleString('en-IN')}</span>
      </div>` : '';

    const invoiceHTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Quotation ${quoteNo}</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --ink: #1a1a2e;
    --accent: #8B1A1A;
    --accent-light: #f8ece8;
    --gold: #c9a84c;
    --gold-light: #fdf6e3;
    --muted: #6b7280;
    --border: #e8e0d8;
    --white: #ffffff;
    --cream: #faf8f5;
  }

  body {
    font-family: 'DM Sans', sans-serif;
    background: var(--cream);
    color: var(--ink);
    min-height: 100vh;
    padding: 40px 20px;
  }

  .invoice-page {
    max-width: 820px;
    margin: 0 auto;
    background: var(--white);
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(26,26,46,0.12), 0 4px 16px rgba(26,26,46,0.06);
  }

  /* ── HEADER ── */
  .inv-header {
    background: var(--ink);
    padding: 48px 52px 36px;
    position: relative;
    overflow: hidden;
  }
  .inv-header::before {
    content: '';
    position: absolute;
    top: -60px; right: -60px;
    width: 220px; height: 220px;
    border-radius: 50%;
    border: 40px solid rgba(201,168,76,0.15);
  }
  .inv-header::after {
    content: '';
    position: absolute;
    bottom: -30px; left: 200px;
    width: 120px; height: 120px;
    border-radius: 50%;
    border: 24px solid rgba(139,26,26,0.2);
  }
  .inv-header-inner {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    position: relative;
    z-index: 1;
  }
  .inv-brand {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .inv-logo {
    width: 56px; height: 56px;
    background: linear-gradient(135deg, var(--accent), #c0392b);
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Playfair Display', serif;
    font-size: 22px;
    font-weight: 700;
    color: white;
    letter-spacing: -1px;
    box-shadow: 0 4px 16px rgba(139,26,26,0.4);
  }
  .inv-brand-text h1 {
    font-family: 'Playfair Display', serif;
    font-size: 22px;
    font-weight: 700;
    color: white;
    letter-spacing: 0.5px;
  }
  .inv-brand-text p {
    font-size: 12px;
    color: rgba(255,255,255,0.55);
    margin-top: 2px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
  }
  .inv-meta {
    text-align: right;
  }
  .inv-meta .inv-tag {
    display: inline-block;
    background: var(--gold);
    color: var(--ink);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 2px;
    text-transform: uppercase;
    padding: 4px 12px;
    border-radius: 20px;
    margin-bottom: 8px;
  }
  .inv-meta .inv-number {
    font-family: 'Playfair Display', serif;
    font-size: 28px;
    font-weight: 700;
    color: white;
    line-height: 1;
  }
  .inv-meta .inv-date {
    font-size: 12px;
    color: rgba(255,255,255,0.5);
    margin-top: 4px;
  }

  /* ── GOLD RIBBON ── */
  .inv-ribbon {
    height: 4px;
    background: linear-gradient(90deg, var(--accent) 0%, var(--gold) 50%, var(--accent) 100%);
  }

  /* ── BODY ── */
  .inv-body {
    padding: 44px 52px;
  }

  /* ── BILL TO / EVENT INFO ── */
  .inv-info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 32px;
    margin-bottom: 40px;
    padding-bottom: 36px;
    border-bottom: 1.5px solid var(--border);
  }
  .inv-info-block h4 {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--accent);
    margin-bottom: 12px;
  }
  .inv-info-block .client-name {
    font-family: 'Playfair Display', serif;
    font-size: 22px;
    font-weight: 600;
    color: var(--ink);
    margin-bottom: 6px;
  }
  .inv-info-block p {
    font-size: 13.5px;
    color: var(--muted);
    line-height: 1.7;
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }
  .inv-info-block p span.icon {
    font-size: 14px;
    flex-shrink: 0;
    margin-top: 1px;
  }

  /* Event detail chips */
  .event-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 8px;
  }
  .event-chip {
    background: var(--accent-light);
    color: var(--accent);
    font-size: 11.5px;
    font-weight: 500;
    padding: 5px 12px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    gap: 5px;
  }

  /* ── SERVICES TABLE ── */
  .inv-table-wrap {
    margin-bottom: 32px;
  }
  .inv-table-title {
    font-family: 'Playfair Display', serif;
    font-size: 16px;
    font-weight: 600;
    color: var(--ink);
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .inv-table-title::after {
    content: '';
    flex: 1;
    height: 1.5px;
    background: linear-gradient(90deg, var(--border), transparent);
  }
  table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    border-radius: 12px;
    overflow: hidden;
    border: 1.5px solid var(--border);
  }
  thead tr {
    background: var(--ink);
  }
  thead th {
    padding: 14px 20px;
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.7);
    text-align: left;
  }
  thead th:last-child,
  thead th:nth-child(2),
  thead th:nth-child(3) {
    text-align: right;
  }
  tbody tr.service-row {
    border-bottom: 1px solid var(--border);
    transition: background 0.2s;
  }
  tbody tr.service-row:last-child {
    border-bottom: none;
  }
  tbody tr.service-row:nth-child(even) {
    background: #fafaf9;
  }
  td {
    padding: 18px 20px;
    vertical-align: top;
  }
  .svc-name { min-width: 260px; }
  .svc-label {
    font-size: 14.5px;
    font-weight: 600;
    color: var(--ink);
    margin-bottom: 4px;
  }
  .svc-meta, .svc-del {
    font-size: 11.5px;
    color: var(--muted);
    margin-top: 3px;
    line-height: 1.5;
  }
  .svc-qty, .svc-price, .svc-total {
    text-align: right;
    font-size: 14px;
  }
  .svc-qty { color: var(--muted); }
  .svc-price { color: var(--muted); }
  .svc-total {
    font-weight: 600;
    color: var(--ink);
  }

  /* ── TOTALS ── */
  .inv-totals {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 40px;
  }
  .inv-totals-box {
    width: 300px;
    background: var(--gold-light);
    border-radius: 14px;
    padding: 24px 28px;
    border: 1.5px solid rgba(201,168,76,0.3);
  }
  .totals-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 7px 0;
    font-size: 13.5px;
    color: var(--muted);
    border-bottom: 1px solid rgba(201,168,76,0.2);
  }
  .totals-row:last-child {
    border-bottom: none;
    padding-top: 14px;
    margin-top: 6px;
  }
  .totals-row.grand {
    font-family: 'Playfair Display', serif;
    font-size: 20px;
    font-weight: 700;
    color: var(--ink);
  }
  .totals-row.grand span:last-child {
    color: var(--accent);
  }

  /* ── NOTES / TERMS ── */
  .inv-notes {
    background: var(--cream);
    border-radius: 12px;
    padding: 20px 24px;
    margin-bottom: 36px;
    border-left: 3px solid var(--gold);
  }
  .inv-notes h5 {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--gold);
    margin-bottom: 8px;
  }
  .inv-notes p {
    font-size: 12.5px;
    color: var(--muted);
    line-height: 1.7;
  }

  /* ── FOOTER ── */
  .inv-footer {
    background: var(--ink);
    padding: 28px 52px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .inv-footer-left p {
    font-size: 11.5px;
    color: rgba(255,255,255,0.45);
    line-height: 1.6;
  }
  .inv-footer-left strong {
    color: rgba(255,255,255,0.7);
  }
  .inv-footer-right {
    text-align: right;
  }
  .inv-footer-right .stamp {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(201,168,76,0.15);
    border: 1px solid rgba(201,168,76,0.3);
    border-radius: 8px;
    padding: 8px 16px;
    font-size: 11px;
    color: var(--gold);
    font-weight: 500;
    letter-spacing: 0.5px;
  }

  .totals-row.totals-row--discount {
    background: rgba(220,252,231,0.5);
    border-radius: 6px;
    padding: 6px 8px;
  }
  .totals-row.totals-row--after-discount {
    padding: 4px 8px;
    border-bottom: 1px dashed var(--border);
  }
  /* ── PRINT ── */
  @media print {
    body { background: white; padding: 0; }
    .invoice-page {
      box-shadow: none;
      border-radius: 0;
      max-width: 100%;
    }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>
<div class="invoice-page">

  <!-- HEADER -->
  <div class="inv-header">
    <div class="inv-header-inner">
      <div class="inv-brand">
        <div class="inv-logo">AK</div>
        <div class="inv-brand-text">
          <h1>AK Photography</h1>
          <p>Premium Visual Storytelling</p>
        </div>
      </div>
      <div class="inv-meta">
        <div class="inv-tag">Quotation</div>
        <div class="inv-number">${quoteNo}</div>
        <div class="inv-date">Issued: ${dateStr}</div>
      </div>
    </div>
  </div>

  <!-- GOLD RIBBON -->
  <div class="inv-ribbon"></div>

  <!-- BODY -->
  <div class="inv-body">

    <!-- BILL TO / EVENT -->
    <div class="inv-info-grid">
      <div class="inv-info-block">
        <h4>Billed To</h4>
        <div class="client-name">${d.client_name}</div>
        <p><span class="icon">📞</span> ${d.phone}</p>
        <p><span class="icon">✉️</span> ${d.email}</p>
      </div>
      <div class="inv-info-block">
        <h4>Event Details</h4>
        <p style="margin-bottom:10px"><span class="icon">📍</span> ${d.event_location}</p>
        <div class="event-chips">
          <span class="event-chip">🎭 ${d.event_type}</span>
          <span class="event-chip">📅 ${d.event_start_date} ${d.event_start_session}</span>
          <span class="event-chip">🏁 ${d.event_end_date} ${d.event_end_session}</span>
          ${d.follow_up_date ? `<span class="event-chip">🔔 Follow-up: ${d.follow_up_date}</span>` : ''}
        </div>
      </div>
    </div>

    <!-- SERVICES TABLE -->
    <div class="inv-table-wrap">
      <div class="inv-table-title">Services & Packages</div>
      <table>
        <thead>
          <tr>
            <th>Service / Package</th>
            <th style="text-align:right">Qty</th>
            <th style="text-align:right">Rate</th>
            <th style="text-align:right">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${serviceRowsHTML}
        </tbody>
      </table>
    </div>

    <!-- TOTALS -->
    <div class="inv-totals">
      <div class="inv-totals-box">
        <div class="totals-row">
          <span>Subtotal</span>
          <span>₹${subtotal.toLocaleString('en-IN')}</span>
        </div>
        ${discountRowHTML}
        ${discountAmount > 0 ? `
        <div class="totals-row totals-row--after-discount">
          <span style="color:#6b7280;font-size:12px">After Discount</span>
          <span style="color:#6b7280;font-size:12px">₹${afterDiscount.toLocaleString('en-IN')}</span>
        </div>` : ''}
        ${gstRowHTML}
        <div class="totals-row grand">
          <span>Total Amount</span>
          <span>₹${finalTotal.toLocaleString('en-IN')}</span>
        </div>
      </div>
    </div>

    <!-- NOTES -->
    <div class="inv-notes">
      <h5>Terms & Notes</h5>
      <p>50% advance required to confirm booking. Balance due on event day. All packages include high-resolution digital delivery. Cancellation policy: 14 days notice required for full refund of advance.</p>
    </div>

  </div>

  <!-- FOOTER -->
  <div class="inv-footer">
    <div class="inv-footer-left">
      <p><strong>AK Photography Studio</strong></p>
      <p>Thank you for choosing us to capture your precious moments ✨</p>
    </div>
    <div class="inv-footer-right">
      <div class="stamp">✦ Official Quotation</div>
    </div>
  </div>

</div>
</body>
</html>`;

    // Open in new window and trigger print-to-PDF
    const win = window.open('', '_blank');
    win.document.write(invoiceHTML);
    win.document.close();
    win.onload = () => {
        setTimeout(() => win.print(), 500);
    };
}


// ===============================
// COLUMN COUNTS
// ===============================
function updateColumnCounts() {
    document.querySelectorAll(".column").forEach(column => {
        const count = column.querySelectorAll(".card").length;
        column.querySelector(".column-head span").innerText = count;
    });
}


// ===============================
// EDIT LEAD
// ===============================
function openEditLead(leadId) {
    openLeadForm();

    fetch(`/leads/get/${leadId}/`)
        .then(res => res.json())
        .then(lead => {
            document.getElementById("lead_id").value = lead.id;

            const name = document.querySelector('[name="client_name"]');
            const phone = document.querySelector('[name="phone"]');
            const email = document.querySelector('[name="email"]');

            name.value = lead.client_name;
            phone.value = lead.phone;
            email.value = lead.email;

            name.readOnly = true;
            phone.readOnly = true;
            email.readOnly = true;

            document.querySelector('[name="event_type"]').value = lead.event_type;
            document.querySelector('[name="event_start_date"]').value = lead.event_start_date;
            document.querySelector('[name="event_start_session"]').value = lead.event_start_session;
            document.querySelector('[name="event_end_date"]').value = lead.event_end_date;
            document.querySelector('[name="event_end_session"]').value = lead.event_end_session;
            document.querySelector('[name="follow_up_date"]').value = lead.follow_up_date || "";
            document.querySelector('[name="event_location"]').value = lead.event_location;
            document.querySelector('[name="total_amount"]').value = lead.total_amount;

            // ── Restore saved package selections ──────────────────────
            _selectedKeys = [];
            _editState = {};
            window.selectedPackageServices = [];

            if (lead.selected_services) {
                let services = lead.selected_services;
                if (typeof services === 'string') {
                    try { services = JSON.parse(services); } catch(e) { services = []; }
                }
                if (Array.isArray(services)) {
                    services.forEach(svc => {
                        const key = svc.key;

                        if (!PACKAGE_CATALOG[key]) {
                            PACKAGE_CATALOG[key] = {
                                label: svc.label,
                                price: svc.basePrice || svc.price,
                                crew: (svc.crewDetail || svc.crew || []).map(c => {
                                    if (typeof c === 'string') {
                                        const parts = c.split(' x');
                                        return { role: parts[0], qty: parseInt(parts[1]) || 1 };
                                    }
                                    return { role: c.role, qty: c.baseQty || c.qty };
                                }),
                                deliverables: (svc.deliverables || []).map(d => ({ key: 'DEL_' + d, label: d }))
                            };
                        }

                        _selectedKeys.push(key);

                        // Rebuild crew from saved crewDetail (preferred) or legacy crew strings
                        let crew;
                        if (svc.crewDetail && Array.isArray(svc.crewDetail)) {
                            crew = svc.crewDetail.map(c => ({
                                role: c.role,
                                qty: c.qty,
                                baseQty: c.baseQty != null ? c.baseQty : c.qty,
                                pricePerHead: c.pricePerHead || 0,
                                isExtra: c.isExtra || false
                            }));
                        } else {
                            // Legacy format: "Role x2" strings — treat all as base
                            crew = (svc.crew || []).map(c => {
                                const parts = c.split(' x');
                                const qty = parseInt(parts[1]) || 1;
                                return { role: parts[0], qty, baseQty: qty, pricePerHead: 0, isExtra: false };
                            });
                        }

                        const catalogDels = (PACKAGE_CATALOG[key].deliverables || []).map(d => ({
                            ...d, isExtra: false, extraPrice: 0
                        }));

                        const deliverables = (svc.deliverables || []).map(label => {
                            const inCatalog = catalogDels.find(d => d.label === label);
                            return inCatalog
                                ? { ...inCatalog }
                                : { key: 'EXTRA_' + label, label, isExtra: true, extraPrice: 0 };
                        });

                        _editState[key] = {
                            crew,
                            deliverables,
                            extraCrewCost: svc.extraCrewCost || 0,
                            extraDelCost: svc.extraDelCost || 0,
                            teamRoles: (svc.teamRoles || []).map(r => ({ role: r, assigned: null }))
                        };
                    });
                }
            }

            // ── Restore pricing (discount + GST) ────────────────────
            if (lead.pricing_data) {
                let p = lead.pricing_data;
                if (typeof p === 'string') { try { p = JSON.parse(p); } catch(e) { p = {}; } }
                _pricing.discountType    = p.discountType   || null;
                _pricing.discountValue   = p.discountValue  || 0;
                _pricing.discountAmount  = p.discountAmount || 0;
                _pricing.gstRate         = p.gstRate        || 0;
                _pricing.gstAmount       = p.gstAmount      || 0;
                _pricing.finalTotal      = p.finalTotal     || 0;
                _pricing._savedSubtotal  = p.subtotal       || 0;  // ← fallback for widget
                // subtotal is recomputed by syncSelectedServicesToWindow below;
                // _savedSubtotal lets the widget display correctly before that runs
            } else {
                // no saved pricing — reset cleanly
                _pricing.discountType = null; _pricing.discountValue = 0;
                _pricing.discountAmount = 0;  _pricing.gstRate = 0;
                _pricing.gstAmount = 0;       _pricing.finalTotal = 0;
            }
            // ── Restore pkg dates BEFORE renderPackages so _buildDateRow sees them ──
            window._pkgDates = {};
            if (Array.isArray(lead.selected_services)) {
                lead.selected_services.forEach(svc => {
                    if (svc.key) {
                        window._pkgDates[svc.key] = {
                            date:    svc.eventDate    || '',
                            session: svc.eventSession || '',
                            tbd:     svc.dateTBD === true || svc.dateTBD === 'true'
                        };
                    }
                });
            }


            renderPackages();

            // ── Force subtotal sync AFTER all packages are restored ──────
            // renderPackages → renderSummaryBar does NOT call syncSelectedServicesToWindow,
            // so we call it explicitly here to push the correct grandTotal into _pricing.
            // We also call it in a rAF to ensure the DOM (pricingSummaryWrap) is fully
            // visible before renderPricingSummaryWidget tries to show it.
            syncSelectedServicesToWindow();
            requestAnimationFrame(() => {
                syncSelectedServicesToWindow();   // re-render widget after DOM paint
            });

            steps[0].classList.remove("active");
            steps[1].classList.add("active");
            stepIndicators[0].classList.remove("active");
            stepIndicators[1].classList.add("active");
            currentStep = 1;
            updateFormWidth();
        });
}


// ===============================
// FILTER
// ===============================
document.querySelector(".filter-btn").addEventListener("click", () => {
    document.getElementById("filterDrawer").classList.add("open");
});

function closeFilters() {
    document.getElementById("filterDrawer").classList.remove("open");
}

function clearFilters() {
    document.querySelectorAll("#filterDrawer input").forEach(input => {
        if (input.type === "checkbox" || input.type === "radio") {
            input.checked = false;
        } else {
            input.value = "";
        }
    });
}

function applyFilters() {
    const params = new URLSearchParams();

    const eventRange = document.querySelector('input[name="event_date"]:checked');
    if (eventRange) params.set("event_range", eventRange.value);

    const eventFrom = document.getElementById("event_from");
    const eventTo = document.getElementById("event_to");
    if (eventFrom && eventFrom.value) params.set("event_from", eventFrom.value);
    if (eventTo && eventTo.value) params.set("event_to", eventTo.value);

    const followUp = document.querySelector('input[name="follow_up"]:checked');
    if (followUp) params.set("follow_up", followUp.value);

    document.querySelectorAll('.filter-section input[type="checkbox"][value="NEW"], .filter-section input[type="checkbox"][value="FOLLOW_UP"], .filter-section input[type="checkbox"][value="ACCEPTED"], .filter-section input[type="checkbox"][value="LOST"]')
        .forEach(cb => { if (cb.checked) params.append("status", cb.value); });

    const amountRadio = document.querySelector('input[name="amount"]:checked');
    if (amountRadio) params.set("amount", amountRadio.value);

    const amountInputs = document.querySelectorAll('.filter-section input[type="number"]');
    if (amountInputs[0]?.value) params.set("min_amount", amountInputs[0].value);
    if (amountInputs[1]?.value) params.set("max_amount", amountInputs[1].value);

    document.querySelectorAll('.filter-section h4').forEach(section => {
        if (section.textContent.includes("Payment")) {
            section.parentElement.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
                const label = cb.parentElement.textContent.trim().toLowerCase();
                if (label.includes("fully")) params.set("payment", "full");
                else if (label.includes("partial")) params.set("payment", "partial");
                else if (label.includes("not")) params.set("payment", "none");
            });
        }
        if (section.textContent.includes("Event Type")) {
            section.parentElement.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
                params.append("event_type", cb.parentElement.textContent.trim());
            });
        }
    });

    document.querySelectorAll(".urgent, .upcoming, .safe").forEach(label => {
        label.onclick = () => {
            if (label.classList.contains("urgent")) params.set("priority", "urgent");
            if (label.classList.contains("upcoming")) params.set("priority", "upcoming");
            if (label.classList.contains("safe")) params.set("priority", "safe");
        };
    });

    const searchInput = document.querySelector('.filter-section input[type="text"]');
    if (searchInput && searchInput.value.trim()) params.set("search", searchInput.value.trim());

    closeFilters();
    window.location.href = `/leads/?${params.toString()}`;
}


// ===============================
// FOLLOWUP REMINDER
// ===============================
let followupData = {};
let activeTab = "today";

function openFollowup() {
    document.getElementById("followupPanel").classList.add("open");
    loadFollowups();
}

function closeFollowup() {
    document.getElementById("followupPanel").classList.remove("open");
}

function loadFollowups() {
    fetch("/followups/data/")
        .then(res => res.json())
        .then(data => {
            followupData = data;

            document.getElementById("followupTotal").innerText = data.counts.total;
            document.getElementById("countOverdue").innerText = data.counts.overdue;
            document.getElementById("countToday").innerText = data.counts.today;
            document.getElementById("countUpcoming").innerText = data.counts.upcoming;

            const badge = document.getElementById("followupBadge");
            const total = data.counts.total;
            if (total > 0) {
                badge.innerText = total > 9 ? "9+" : total;
                badge.classList.add("show");
            } else {
                badge.classList.remove("show");
            }

            renderList();
        });
}

function switchTab(tab) {
    activeTab = tab;
    document.querySelectorAll(".followup-tabs button").forEach(b => b.classList.remove("active"));
    event.target.classList.add("active");
    renderList();
}

function renderList() {
    const list = document.getElementById("followupList");
    list.innerHTML = "";
    const items = followupData[activeTab];
    if (!items.length) {
        list.innerHTML = `<div class="followup-empty">🎉 No follow-ups here</div>`;
        return;
    }
    items.forEach(lead => {
        list.innerHTML += `
            <div class="followup-card">
                <h4>${lead.client_name}</h4>
                <p>📞 ${lead.phone}</p>
                <p>📅 ${lead.event_type}</p>
                <p>⏰ ${lead.follow_up_date}</p>
                <div class="card-actions">
                    <button onclick="openEditLead(${lead.id})">Open Lead</button>
                    <button onclick="markDone(${lead.id})">Mark Done</button>
                </div>
            </div>
        `;
    });
}

function markDone(id) {
    fetch("/followups/done/", {
        method: "POST",
        headers: {
            "X-CSRFToken": document.getElementById("csrf_token").value,
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({ lead_id: id })
    }).then(() => loadFollowups());
}

document.addEventListener("DOMContentLoaded", () => {
    loadFollowups();
});


// ===============================
// GLOBAL SEARCH
// ===============================
const globalSearch = document.getElementById("globalSearch");
const filterSearch = document.querySelector('.filter-section input[type="text"]');

if (globalSearch && filterSearch) {
    globalSearch.addEventListener("keydown", e => {
        if (e.key === "Enter") { filterSearch.value = globalSearch.value; applyFilters(); }
    });
    globalSearch.addEventListener("input", () => { filterSearch.value = globalSearch.value; });
}

const clearBtn = document.getElementById("clearSearch");
if (globalSearch && clearBtn) {
    globalSearch.addEventListener("input", () => {
        clearBtn.style.display = globalSearch.value ? "block" : "none";
    });
    clearBtn.addEventListener("click", () => {
        globalSearch.value = "";
        filterSearch.value = "";
        clearBtn.style.display = "none";
        window.location.href = "/leads/";
    });
}


// ===============================
// INPUT RESTRICTIONS
// ===============================
document.querySelector('[name="client_name"]')?.addEventListener("input", e => {
    e.target.value = e.target.value.replace(/[^a-zA-Z\s]/g, "");
});
document.querySelector('[name="phone"]')?.addEventListener("input", e => {
    e.target.value = e.target.value.replace(/\D/g, "");
});
document.querySelector('[name="event_type"]')?.addEventListener("input", e => {
    e.target.value = e.target.value.replace(/[^a-zA-Z\s]/g, "");
});
document.querySelector('[name="event_location"]')?.addEventListener("input", e => {
    e.target.value = e.target.value.replace(/[^a-zA-Z0-9\s]/g, "");
});


// ===============================
// COUNTER ANIMATION
// ===============================
const overviewSection = document.querySelector(".overview-left");

function animateCounter(el) {
    const target = parseInt(el.innerText.replace(/[^\d]/g, ""), 10);
    if (isNaN(target)) return;
    let current = 0;
    const increment = Math.ceil(target / 40);
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            el.innerText = el.innerText.includes("₹") ? `₹ ${target}` : target;
            clearInterval(timer);
        } else {
            el.innerText = el.innerText.includes("₹") ? `₹ ${current}` : current;
        }
    }, 25);
}

if (overviewSection) {
    const observer = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) {
            overviewSection.querySelectorAll(".stats strong").forEach(animateCounter);
            observer.disconnect();
        }
    }, { threshold: 0.4 });
    observer.observe(overviewSection);
}


// ===============================
// KANBAN FLOW
// ===============================
const STATUS_ORDER = ["NEW", "FOLLOW_UP", "ACCEPTED", "LOST"];

function canMoveBackward(from, to) {
    return STATUS_ORDER.indexOf(to) < STATUS_ORDER.indexOf(from);
}

document.querySelectorAll(".column").forEach(column => {
    column.addEventListener("dragover", e => {
        if (!draggedCard) return;
        if (draggedCard.parentElement !== column) return;

        const rect = column.getBoundingClientRect();
        const threshold = 60;
        const scrollSpeed = 10;

        if (e.clientY < rect.top + threshold) column.scrollTop -= scrollSpeed;
        if (e.clientY > rect.bottom - threshold) column.scrollTop += scrollSpeed;

        const cards = [...column.querySelectorAll(".card:not(.dragging)")];
        for (const card of cards) {
            const middle = card.getBoundingClientRect().top + card.offsetHeight / 2;
            if (e.clientY < middle) {
                column.insertBefore(draggedCard, card);
                return;
            }
        }
        column.appendChild(draggedCard);
    });
});


// ===============================
// PACKAGE CATALOG & STATE
// ===============================
if (!window.selectedPackageServices) window.selectedPackageServices = [];

const PACKAGE_CATALOG = {
    WEDDING: {
        label: 'Wedding', price: 70000,
        crew: [{ role: 'Traditional Photographer', qty: 1 }, { role: 'Candid Photographer', qty: 1 }, { role: 'Traditional Videographer', qty: 1 }, { role: 'Candid Videographer', qty: 1 }],
        deliverables: [{ key: 'RAW_PHOTOS', label: 'Raw Photos' }, { key: 'ALBUM', label: 'Album' }, { key: 'PENDRIVE', label: 'Pen Drive' }, { key: 'TEASER', label: 'Wedding Teaser' }]
    },
    ENGAGEMENT: {
        label: 'Engagement', price: 35000,
        crew: [{ role: 'Traditional Photographer', qty: 1 }, { role: 'Candid Photographer', qty: 1 }],
        deliverables: [{ key: 'EDITED_PHOTOS', label: 'Edited Photos' }, { key: 'HIGHLIGHT', label: 'Highlight Video' }]
    },
    RECEPTION: {
        label: 'Reception', price: 45000,
        crew: [{ role: 'Traditional Photographer', qty: 1 }, { role: 'Candid Photographer', qty: 1 }, { role: 'Videographer', qty: 1 }],
        deliverables: [{ key: 'EDITED_PHOTOS', label: 'Edited Photos' }, { key: 'SHORT_VIDEO', label: 'Short Video' }, { key: 'PENDRIVE', label: 'Pen Drive' }]
    },
    BABY_SHOWER: {
        label: 'Baby Shower', price: 40000,
        crew: [{ role: 'Photographer', qty: 1 }, { role: 'Videographer', qty: 1 }],
        deliverables: [{ key: 'EDITED_PHOTOS', label: 'Edited Photos' }, { key: 'SHORT_VIDEO', label: 'Short Video' }]
    },
    BIRTHDAY: {
        label: 'Birthday', price: 20000,
        crew: [{ role: 'Photographer', qty: 1 }],
        deliverables: [{ key: 'EDITED_PHOTOS', label: 'Edited Photos' }]
    }
};

const EP_CREW_ROLES = [
    'Traditional Photographer', 'Candid Photographer',
    'Traditional Videographer', 'Candid Videographer',
    'Photographer', 'Videographer', 'Drone Operator', 'Cinematic Videographer'
];

let _selectedKeys = [];
let _editState = {};
let _activeTab = null;


// ===============================
// RENDER PACKAGE GRID
// ===============================
function renderPackages() {
    const grid = document.getElementById('packageGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const unselectedKeys = Object.keys(PACKAGE_CATALOG).filter(k => !_selectedKeys.includes(k));
    const orderedKeys = [..._selectedKeys, ...unselectedKeys];

    orderedKeys.forEach(key => {
        const pkg = PACKAGE_CATALOG[key];
        const card = document.createElement('div');
        card.className = 'package-card';
        card.dataset.key = key;

        if (_selectedKeys.includes(key)) card.classList.add('selected');

        card.innerHTML = `
            <div class="pkg-check">✓</div>
            <div class="package-header">
                <div class="package-title">${pkg.label}</div>
                <div class="package-price">₹${pkg.price.toLocaleString('en-IN')}</div>
            </div>
            <div class="package-crew">
                ${pkg.crew.map(c => `<span>📷 ${c.role}</span>`).join('')}
            </div>
        `;

        card.addEventListener('click', () => togglePackage(key, card));
        grid.appendChild(card);
    });

    renderSummaryBar();
    const editBtn = document.getElementById('editPkgBtn');
    if (editBtn) editBtn.disabled = _selectedKeys.length === 0;
}
// ================================================================
// PACKAGE DATE PICKER — per-package event dates
// Add this block to dragdrop.js after the PACKAGE CATALOG section
// OR load as a separate file after dragdrop.js
// ================================================================

// ── STATE: per-package dates ─────────────────────────────────────
// Structure: { [packageKey]: { date: 'YYYY-MM-DD', session: 'Morning'|'Evening' } }
window._pkgDates = {};

// ── RENDER DATE ROWS ─────────────────────────────────────────────
// Called every time _selectedKeys changes (after renderSummaryBar)
function renderPkgDateRows() {
    // Find or create the date container (placed right after pkgSummaryBar)
    let wrap = document.getElementById('pkgDatesWrap');
    if (!wrap) {
        const bar = document.getElementById('pkgSummaryBar');
        if (!bar) return;
        wrap = document.createElement('div');
        wrap.id = 'pkgDatesWrap';
        wrap.className = 'pkg-dates-wrap';
        bar.parentNode.insertBefore(wrap, bar.nextSibling);
    }

    // Remove rows for deselected packages
    const existingKeys = [...wrap.querySelectorAll('.pkg-date-row')].map(r => r.dataset.key);
    existingKeys.forEach(k => {
        if (!_selectedKeys.includes(k)) {
            const row = wrap.querySelector(`.pkg-date-row[data-key="${k}"]`);
            if (row) {
                row.style.opacity = '0';
                row.style.transform = 'translateX(10px)';
                setTimeout(() => row.remove(), 180);
            }
            delete window._pkgDates[k];
        }
    });

    // Hide wrap if nothing selected
    if (_selectedKeys.length === 0) {
        wrap.style.display = 'none';
        return;
    }
    wrap.style.display = 'flex';

    // Add/update rows for selected packages (preserve order)
    _selectedKeys.forEach((key, idx) => {
        let row = wrap.querySelector(`.pkg-date-row[data-key="${key}"]`);
        if (!row) {
            row = _buildDateRow(key);
            // Insert at correct position
            const allRows = [...wrap.querySelectorAll('.pkg-date-row')];
            if (allRows[idx]) {
                wrap.insertBefore(row, allRows[idx]);
            } else {
                wrap.appendChild(row);
            }
            // entrance animation
            requestAnimationFrame(() => {
                row.style.transition = 'opacity .22s ease, transform .22s cubic-bezier(.34,1.4,.64,1)';
                row.style.opacity = '1';
                row.style.transform = 'translateY(0)';
            });
        } else {
            // Update label in case it changed
            const lbl = row.querySelector('.pkg-date-card-head .pkg-date-label');
            if (lbl) lbl.textContent = PACKAGE_CATALOG[key]?.label || key;
        }
    });
}

function _buildDateRow(key) {
    const pkg   = PACKAGE_CATALOG[key];
    const saved = window._pkgDates[key] || {};
    const isTBD = saved.tbd === true;

    const row = document.createElement('div');
    row.className = 'pkg-date-row' + (isTBD ? ' pkg-date-tbd' : '');
    row.dataset.key = key;
    row.style.opacity = '0';
    row.style.transform = 'translateY(-6px)';

    row.innerHTML = `
        <div class="pkg-date-card-head">
            <div class="pkg-date-label">${pkg?.label || key}</div>
            <div class="pkg-date-head-right">
                <div class="pkg-conflict-dot hidden" id="pkgcdot-${key}" title="Date conflict detected"></div>
                <label class="pkg-tbd-toggle" title="Mark date as not yet decided">
                    <input
                        type="checkbox"
                        class="pkg-tbd-check"
                        id="pkgtbd-${key}"
                        ${isTBD ? 'checked' : ''}
                        onchange="onPkgTbdChange('${key}', this.checked)"
                    >
                    <span class="pkg-tbd-label">TBD</span>
                </label>
            </div>
        </div>
        <div class="pkg-date-inputs" id="pkginputs-${key}" ${isTBD ? 'style="display:none"' : ''}>
            <input
                type="date"
                class="pkg-date-input"
                id="pkgdate-${key}"
                value="${saved.date || ''}"
                onchange="onPkgDateChange('${key}', this.value)"
            >
            <select
                class="pkg-session-select"
                id="pkgsess-${key}"
                onchange="onPkgSessionChange('${key}', this.value)"
            >
                <option value="">Session</option>
                <option value="Morning" ${saved.session === 'Morning' ? 'selected' : ''}>Morning</option>
                <option value="Evening" ${saved.session === 'Evening' ? 'selected' : ''}>Evening</option>
            </select>
        </div>
        <div class="pkg-tbd-placeholder" id="pkgtbdph-${key}" ${!isTBD ? 'style="display:none"' : ''}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Date not yet finalized
        </div>
    `;

    return row;
}

// ── DATE / SESSION CHANGE HANDLERS ──────────────────────────────
function onPkgDateChange(key, value) {
    if (!window._pkgDates[key]) window._pkgDates[key] = {};
    window._pkgDates[key].date = value;

    // Fire conflict check only if date is set
    if (value) {
        _checkDateConflict(key, value);
    } else {
        _clearConflictDot(key);
    }

    _syncPkgDatesToForm();
}

function onPkgSessionChange(key, value) {
    if (!window._pkgDates[key]) window._pkgDates[key] = {};
    window._pkgDates[key].session = value;
    _syncPkgDatesToForm();
}

function onPkgTbdChange(key, isTBD) {
    if (!window._pkgDates[key]) window._pkgDates[key] = {};
    window._pkgDates[key].tbd = isTBD;

    const row       = document.querySelector(`.pkg-date-row[data-key="${key}"]`);
    const inputs    = document.getElementById('pkginputs-' + key);
    const placeholder = document.getElementById('pkgtbdph-' + key);

    if (isTBD) {
        // Hide date inputs, show TBD placeholder
        if (inputs)      { inputs.style.opacity = '0'; setTimeout(() => { inputs.style.display = 'none'; }, 160); }
        if (placeholder) { placeholder.style.display = 'flex'; requestAnimationFrame(() => { placeholder.style.opacity = '1'; }); }
        if (row)         { row.classList.add('pkg-date-tbd'); row.classList.remove('has-conflict'); }
        // Clear any conflict dot
        _clearConflictDot(key);
        // Clear date/session so they don't pollute form fields
        window._pkgDates[key].date    = '';
        window._pkgDates[key].session = '';
        const dateInp = document.getElementById('pkgdate-' + key);
        const sessInp = document.getElementById('pkgsess-' + key);
        if (dateInp) dateInp.value = '';
        if (sessInp) sessInp.value = '';
    } else {
        // Show date inputs, hide TBD placeholder
        if (inputs)      { inputs.style.display = 'flex'; inputs.style.opacity = '0'; requestAnimationFrame(() => { inputs.style.opacity = '1'; }); }
        if (placeholder) { placeholder.style.opacity = '0'; setTimeout(() => { placeholder.style.display = 'none'; }, 160); }
        if (row)         { row.classList.remove('pkg-date-tbd'); }
    }

    _syncPkgDatesToForm();
}

// ── SYNC DATES INTO selectedPackageServices ───────────────────────
// Called after any date/session change so data flows into form submission
function _syncPkgDatesToForm() {
    if (!window.selectedPackageServices) return;
    window.selectedPackageServices = window.selectedPackageServices.map(svc => {
        const d = window._pkgDates[svc.key] || {};
        return {
            ...svc,
            eventDate:    d.tbd ? null : (d.date    || null),
            eventSession: d.tbd ? null : (d.session || null),
            dateTBD:      d.tbd === true
        };
    });

    // Also update _editState so syncSelectedServicesToWindow picks it up
    _selectedKeys.forEach(key => {
        const d = window._pkgDates[key] || {};
        if (_editState[key]) {
            _editState[key].eventDate    = d.tbd ? null : (d.date    || null);
            _editState[key].eventSession = d.tbd ? null : (d.session || null);
            _editState[key].dateTBD      = d.tbd === true;
        }
    });

    // Update form's event_start_date / event_end_date using ONLY confirmed (non-TBD) dates.
    // EARLIEST confirmed date → event_start_date
    // LATEST confirmed date   → event_end_date
    // If ALL packages are TBD → clear both fields (blank is valid — sessions page handles it)
    const confirmedKeys = _selectedKeys.filter(k => {
        const d = window._pkgDates[k];
        return d && d.date && !d.tbd;
    });

    const startInput = document.querySelector('[name="event_start_date"]');
    const startSess  = document.querySelector('[name="event_start_session"]');
    const endInput   = document.querySelector('[name="event_end_date"]');
    const endSess    = document.querySelector('[name="event_end_session"]');

    if (confirmedKeys.length > 0) {
        const sorted = [...confirmedKeys].sort(
            (a, b) => window._pkgDates[a].date.localeCompare(window._pkgDates[b].date)
        );
        const earliestKey = sorted[0];
        const latestKey   = sorted[sorted.length - 1];

        if (startInput) startInput.value = window._pkgDates[earliestKey].date;
        if (startSess)  startSess.value  = window._pkgDates[earliestKey].session || '';
        if (endInput)   endInput.value   = window._pkgDates[latestKey].date;
        if (endSess)    endSess.value    = window._pkgDates[latestKey].session   || '';
    } else if (_selectedKeys.length > 0) {
        // All packages are TBD — clear legacy date fields
        if (startInput) startInput.value = '';
        if (startSess)  startSess.value  = '';
        if (endInput)   endInput.value   = '';
        if (endSess)    endSess.value    = '';
    }
}

// ── CONFLICT CHECK ───────────────────────────────────────────────
let _conflictCheckDebounce = {};

function _checkDateConflict(key, date) {
    clearTimeout(_conflictCheckDebounce[key]);
    _conflictCheckDebounce[key] = setTimeout(() => {
        const csrf = document.getElementById('csrf_token')?.value || '';
        fetch('/leads/check-date-conflict/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-CSRFToken': csrf
            },
            body: new URLSearchParams({
                date: date,
                exclude_lead_id: document.getElementById('lead_id')?.value || ''
            })
        })
        .then(r => r.json())
        .then(data => {
            if (data.conflicts && data.conflicts.length > 0) {
                _showConflictDot(key);
                _showDateConflictPopup(key, date, data.conflicts);
            } else {
                _clearConflictDot(key);
            }
        })
        .catch(() => { /* silent — don't break form */ });
    }, 400); // debounce 400ms
}

function _showConflictDot(key) {
    const dot = document.getElementById('pkgcdot-' + key);
    if (dot) dot.classList.remove('hidden');
    const row = document.querySelector(`.pkg-date-row[data-key="${key}"]`);
    if (row) row.classList.add('has-conflict');
}

function _clearConflictDot(key) {
    const dot = document.getElementById('pkgcdot-' + key);
    if (dot) dot.classList.add('hidden');
    const row = document.querySelector(`.pkg-date-row[data-key="${key}"]`);
    if (row) row.classList.remove('has-conflict');
}

// ── CONFLICT ALERT POPUP ─────────────────────────────────────────
let _dcaCurrentKey  = null;
let _dcaCurrentDate = null;

function _showDateConflictPopup(key, date, conflicts) {
    _dcaCurrentKey  = key;
    _dcaCurrentDate = date;

    const overlay = document.getElementById('dcaOverlay');
    if (!overlay) return;

    // Format date nicely
    const fmtDate = (() => {
        try {
            const dt = new Date(date + 'T00:00:00');
            return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch { return date; }
    })();

    const pkgLabel = PACKAGE_CATALOG[key]?.label || key;

    // Fill conflict list
    const list = document.getElementById('dcaConflictsList');
    if (list) {
        list.innerHTML = conflicts.map(c => `
            <div class="dca-conflict-item">
                <div class="dca-conflict-dot-lg"></div>
                <div class="dca-conflict-text">
                    <div class="dca-conflict-client">${c.client_name}</div>
                    <div class="dca-conflict-detail">${c.event_type} &nbsp;·&nbsp; ${c.date_display}</div>
                </div>
            </div>
        `).join('');
    }

    // Fill summary text
    const subEl = document.getElementById('dcaSub');
    if (subEl) {
        subEl.innerHTML = `<strong>${fmtDate}</strong> is already booked for <strong>${pkgLabel}</strong>. You can still proceed or pick a different date.`;
    }

    // Show popup
    overlay.classList.add('show');
    requestAnimationFrame(() => requestAnimationFrame(() => {
        overlay.querySelector('.dca-card').classList.add('pop');
    }));
}

function dcaChangeDate() {
    // Close popup — admin will manually pick another date
    _closeDcaPopup();
    // Focus the date input for this package
    if (_dcaCurrentKey) {
        setTimeout(() => {
            const inp = document.getElementById('pkgdate-' + _dcaCurrentKey);
            if (inp) { inp.focus(); inp.click(); }
        }, 320);
    }
}

function dcaProceedAnyway() {
    // Close popup — keep the date, just clear the visual warning
    _clearConflictDot(_dcaCurrentKey);
    _closeDcaPopup();
}

function _closeDcaPopup() {
    const overlay = document.getElementById('dcaOverlay');
    if (!overlay) return;
    overlay.querySelector('.dca-card').classList.remove('pop');
    setTimeout(() => overlay.classList.remove('show'), 320);
}

// ── PATCH: hook renderPkgDateRows into existing renderSummaryBar ──
// We wrap the existing renderSummaryBar so date rows stay in sync
(function() {
    const _origRenderSummaryBar = window.renderSummaryBar;
    if (typeof _origRenderSummaryBar === 'function') {
        window.renderSummaryBar = function() {
            _origRenderSummaryBar.apply(this, arguments);
            renderPkgDateRows();
        };
    }
})();

// ── PATCH: hook into syncSelectedServicesToWindow to carry dates ──
(function() {
    const _origSync = window.syncSelectedServicesToWindow;
    if (typeof _origSync === 'function') {
        window.syncSelectedServicesToWindow = function() {
            _origSync.apply(this, arguments);
            // After sync, push dates + TBD flag into each service object
            if (window.selectedPackageServices) {
                window.selectedPackageServices = window.selectedPackageServices.map(svc => {
                    const d = window._pkgDates[svc.key] || {};
                    return {
                        ...svc,
                        eventDate:    d.tbd ? null : (d.date    || null),
                        eventSession: d.tbd ? null : (d.session || null),
                        dateTBD:      d.tbd === true
                    };
                });
            }
        };
    }
})();

// ── PATCH: hook into closeLeadForm to reset date state ───────────
(function() {
    const _origClose = window.closeLeadForm;
    if (typeof _origClose === 'function') {
        window.closeLeadForm = function() {
            _origClose.apply(this, arguments);
            window._pkgDates = {};
            const wrap = document.getElementById('pkgDatesWrap');
            if (wrap) wrap.innerHTML = '';
        };
    }
})();

// ── RESTORE DATES when editing a lead ───────────────────────────
// Called from openEditLead after services are restored.
// Reads eventDate/eventSession from selected_services JSON.
function restorePkgDatesFromLead(services) {
    window._pkgDates = {};
    if (!Array.isArray(services)) return;
    services.forEach(svc => {
        if (svc.key) {
            // Handle both camelCase variants saved by different code paths
            const date    = svc.eventDate    || svc.event_date    || '';
            const session = svc.eventSession || svc.event_session || '';
            const tbd     = svc.dateTBD === true || svc.dateTBD === 'true' || false;
            window._pkgDates[svc.key] = { date, session, tbd };
        }
    });
    // Re-render rows with restored values
    renderPkgDateRows();
    // Apply values into DOM inputs after rows are built
    requestAnimationFrame(() => {
        Object.entries(window._pkgDates).forEach(([key, d]) => {
            const dateInp = document.getElementById('pkgdate-' + key);
            const sessInp = document.getElementById('pkgsess-' + key);
            const tbdInp  = document.getElementById('pkgtbd-'  + key);
            if (dateInp && d.date)    dateInp.value   = d.date;
            if (sessInp && d.session) sessInp.value   = d.session;
            if (tbdInp  && d.tbd)    tbdInp.checked  = true;
            // Trigger TBD visual state if needed
            if (d.tbd) onPkgTbdChange(key, true);
        });
    });
}

// ── PATCH openEditLead to restore dates after load ───────────────
(function() {
    const _origOpenEditLead = window.openEditLead;
    if (typeof _origOpenEditLead === 'function') {
        window.openEditLead = function(leadId) {
            // Patch fetch inside openEditLead by intercepting renderPackages
            // which is called after the fetch completes
            const _origRenderPackages = window.renderPackages;
            let _restored = false;
            window.renderPackages = function() {
                _origRenderPackages.apply(this, arguments);
                if (!_restored && window.selectedPackageServices && window.selectedPackageServices.length > 0) {
                    _restored = true;
                    restorePkgDatesFromLead(window.selectedPackageServices);
                    window.renderPackages = _origRenderPackages; // restore
                }
            };
            _origOpenEditLead.apply(this, arguments);
        };
    }
})();

// ── Validate dates before form submit ───────────────────────────
// Rules:
//   ✅ date + session filled    → valid
//   ✅ TBD checked              → valid (skip)
//   ❌ date filled + no session → block ("Pick a session for X")
//   ⚠  date empty + no TBD     → allowed (soft — not a hard block)
function validatePkgDates() {
    if (_selectedKeys.length === 0) return true;

    // Check for date-filled-but-missing-session (hard error)
    const missingSession = _selectedKeys.filter(k => {
        const d = window._pkgDates[k];
        if (!d || d.tbd) return false;          // TBD → skip
        return d.date && !d.session;             // date set, session missing
    });

    if (missingSession.length > 0) {
        const labels = missingSession.map(k => PACKAGE_CATALOG[k]?.label || k).join(', ');
        missingSession.forEach(k => {
            const sel = document.getElementById('pkgsess-' + k);
            if (sel) {
                sel.style.borderColor = '#ef4444';
                sel.style.boxShadow   = '0 0 0 3px rgba(239,68,68,.12)';
                setTimeout(() => { sel.style.borderColor = ''; sel.style.boxShadow = ''; }, 2000);
            }
        });
        return { error: `Please select a session for: ${labels}` };
    }

    // Warn (but allow) if ALL packages have no date and no TBD
    const allUndecided = _selectedKeys.every(k => {
        const d = window._pkgDates[k];
        return !d || (!d.date && !d.tbd);
    });

    if (allUndecided && _selectedKeys.length > 0) {
        // Show a soft amber notice inside the form — do NOT block
        _showAllTbdNotice();
    }

    return true; // always allow save
}

// Soft amber notice when EVERY package is undecided
function _showAllTbdNotice() {
    let notice = document.getElementById('pkgAllTbdNotice');
    if (!notice) {
        const wrap = document.getElementById('pkgDatesWrap');
        if (!wrap) return;
        notice = document.createElement('div');
        notice.id = 'pkgAllTbdNotice';
        notice.className = 'pkg-tbd-all-notice';
        notice.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            No event dates confirmed yet — this lead will be marked as <strong>TBD</strong> in the sessions calendar.
        `;
        wrap.parentNode.insertBefore(notice, wrap.nextSibling);
        // Auto-dismiss after 4s
        setTimeout(() => {
            notice.style.opacity = '0';
            setTimeout(() => notice.remove(), 400);
        }, 4000);
    }
}


    const leadForm = document.getElementById('leadForm');
    if (leadForm) {
        leadForm.addEventListener('submit', function(e) {
            // Run before existing validators (capture phase = false, so existing runs first)
            // Actually we patch the existing submit handler's showToast guard
            // by checking in the same bubbling phase — the existing submit handler
            // already calls e.preventDefault(), so we need to inject here.
        }, false);
    }

    // Initial render in case packages are pre-selected on page load
    renderPkgDateRows();


// ===============================
// TOGGLE PACKAGE SELECTION
// ===============================
function togglePackage(key, card) {
    if (_selectedKeys.includes(key)) {
        _selectedKeys = _selectedKeys.filter(k => k !== key);
        delete _editState[key];
        card.classList.remove('selected');
    } else {
        _selectedKeys.push(key);
        const pkg = PACKAGE_CATALOG[key];
        const autoTeamRoles = [];
        pkg.crew.forEach(c => {
            for (let q = 0; q < c.qty; q++) {
                autoTeamRoles.push({ role: c.role, assigned: null });
            }
        });
        _editState[key] = {
            // crew array — each item: { role, qty, baseQty, pricePerHead, isExtra }
            // baseQty  = qty included in package price (locked at selection time)
            // isExtra  = true if this crew row was added manually (not in catalog)
            crew: pkg.crew.map(c => ({
                role: c.role,
                qty: c.qty,
                baseQty: c.qty,       // ← remember original included qty
                pricePerHead: 0,      // ← will be filled when user adds extra qty
                isExtra: false
            })),
            deliverables: pkg.deliverables.map(d => ({ ...d, isExtra: false, extraPrice: 0 })),
            extraCrewCost: 0,         // ← sum of all extra crew charges
            extraDelCost: 0,          // ← sum of extra deliverable charges
            teamRoles: autoTeamRoles
        };
        card.classList.add('selected');
    }

    syncSelectedServicesToWindow();
    renderSummaryBar();

    const editBtn = document.getElementById('editPkgBtn');
    if (editBtn) editBtn.disabled = _selectedKeys.length === 0;
}


// ===============================
// SUMMARY BAR
// ===============================
function renderSummaryBar() {
    const bar = document.getElementById('pkgSummaryBar');
    if (!bar) return;

    if (_selectedKeys.length === 0) {
        bar.style.display = 'none';
        updateEventTypeField();
        return;
    }

    bar.style.display = 'flex';
    bar.innerHTML = '';

    let total = 0;
    let _dragSrcKey = null;

    _selectedKeys.forEach(key => {
        const s = _editState[key];
        total += PACKAGE_CATALOG[key].price + (s?.extraCrewCost || 0) + (s?.extraDelCost || 0);
        const tag = document.createElement('span');
        tag.className = 'pkg-summary-tag';
        tag.draggable = true;
        tag.dataset.key = key;
        tag.innerHTML = `<span class="pkg-tag-handle">⠿</span> ${PACKAGE_CATALOG[key].label} <span class="pkg-tag-remove" onclick="removePkgTag('${key}')">✕</span>`;

        tag.addEventListener('dragstart', e => {
            _dragSrcKey = key;
            tag.classList.add('pkg-tag-dragging');
            e.dataTransfer.effectAllowed = 'move';
        });
        tag.addEventListener('dragend', () => {
            _dragSrcKey = null;
            tag.classList.remove('pkg-tag-dragging');
            document.querySelectorAll('.pkg-summary-tag').forEach(t => t.classList.remove('pkg-tag-over'));
        });
        tag.addEventListener('dragover', e => {
            e.preventDefault();
            if (_dragSrcKey && _dragSrcKey !== key) tag.classList.add('pkg-tag-over');
        });
        tag.addEventListener('dragleave', () => tag.classList.remove('pkg-tag-over'));
        tag.addEventListener('drop', e => {
            e.preventDefault();
            tag.classList.remove('pkg-tag-over');
            if (!_dragSrcKey || _dragSrcKey === key) return;

            const fromIdx = _selectedKeys.indexOf(_dragSrcKey);
            const toIdx   = _selectedKeys.indexOf(key);
            _selectedKeys.splice(fromIdx, 1);
            _selectedKeys.splice(toIdx, 0, _dragSrcKey);

            syncSelectedServicesToWindow();
            renderPackages();

            const panelOpen = document.getElementById('pkgEditPanel').classList.contains('open');
            if (panelOpen) {
                const currentTab = _activeTab;
                buildEditPanel();
                if (currentTab && _selectedKeys.includes(currentTab)) {
                    switchEpTab(currentTab);
                }
            }
        });

        bar.appendChild(tag);
    });

    const totalEl = document.createElement('span');
    totalEl.className = 'pkg-summary-total';
    totalEl.id = 'pkgSummaryTotal';
    totalEl.innerText = '₹' + total.toLocaleString('en-IN');
    bar.appendChild(totalEl);

    updateEventTypeField();
}

function updateEventTypeField() {
    const eventInput = document.querySelector('[name="event_type"]');
    if (!eventInput) return;
    if (_selectedKeys.length === 0) {
        if (eventInput.dataset.autofilled === '1') {
            eventInput.value = '';
            eventInput.dataset.autofilled = '0';
        }
        return;
    }
    const combined = _selectedKeys.map(k => PACKAGE_CATALOG[k].label).join('+');
    eventInput.value = combined;
    eventInput.dataset.autofilled = '1';
}

function removePkgTag(key) {
    _selectedKeys = _selectedKeys.filter(k => k !== key);
    delete _editState[key];
    syncSelectedServicesToWindow();
    renderPackages();
}


// ===============================
// OPEN / CLOSE EDIT PANEL
// ===============================
function openPackageEditor() {
    if (_selectedKeys.length === 0) return;
    buildEditPanel();
    document.getElementById('pkgEditPanel').classList.add('open');
    document.getElementById('pkgEditOverlay').classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closePkgEditPanel() {
    document.getElementById('pkgEditPanel').classList.remove('open');
    document.getElementById('pkgEditOverlay').classList.remove('show');
    document.body.style.overflow = '';
}


// ===============================
// BUILD EDIT PANEL
// ===============================
function buildEditPanel() {
    const tabsEl = document.getElementById('pkgEditTabs');
    tabsEl.innerHTML = '';
    _selectedKeys.forEach((key, i) => {
        const t = document.createElement('div');
        t.className = 'ep-tab' + (i === 0 ? ' active' : '');
        t.id = 'eptab-' + key;
        t.innerText = PACKAGE_CATALOG[key].label;
        t.onclick = () => switchEpTab(key);
        tabsEl.appendChild(t);
    });

    const body = document.getElementById('pkgEditBody');
    body.innerHTML = '';
    _selectedKeys.forEach((key, i) => {
        const pane = buildEpPane(key);
        if (i === 0) pane.classList.add('active');
        body.appendChild(pane);
    });

    _activeTab = _selectedKeys[0];
    updateEpFooterTotal();
}


// ===============================
// SWITCH TAB
// ===============================
function switchEpTab(key) {
    if (key === _activeTab) return;

    const oldIdx = _selectedKeys.indexOf(_activeTab);
    const newIdx = _selectedKeys.indexOf(key);
    const goRight = newIdx > oldIdx;

    const oldPane = document.getElementById('eppane-' + _activeTab);
    if (oldPane) {
        oldPane.style.transition = 'opacity .22s ease, transform .22s ease';
        oldPane.style.opacity = '0';
        oldPane.style.transform = goRight ? 'translateX(-30px)' : 'translateX(30px)';
        oldPane.style.pointerEvents = 'none';
        setTimeout(() => { oldPane.classList.remove('active'); oldPane.style.cssText = ''; }, 220);
    }

    const newPane = document.getElementById('eppane-' + key);
    if (newPane) {
        newPane.style.transform = goRight ? 'translateX(30px)' : 'translateX(-30px)';
        newPane.style.opacity = '0';
        newPane.classList.add('active');
        requestAnimationFrame(() => requestAnimationFrame(() => {
            newPane.style.transition = 'opacity .25s ease, transform .25s ease';
            newPane.style.opacity = '1';
            newPane.style.transform = 'translateX(0)';
        }));
        setTimeout(() => newPane.style.cssText = '', 260);
    }

    document.querySelectorAll('.ep-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('eptab-' + key)?.classList.add('active');
    _activeTab = key;
}


// ===============================
// BUILD ONE PANE
// ===============================
function buildEpPane(key) {
    const state = _editState[key];
    const pkg = PACKAGE_CATALOG[key];

    const pane = document.createElement('div');
    pane.className = 'ep-pane';
    pane.id = 'eppane-' + key;

    const crewLabel = document.createElement('div');
    crewLabel.className = 'ep-section-label';
    crewLabel.innerText = 'Crew Members';
    pane.appendChild(crewLabel);

    const crewWrap = document.createElement('div');
    crewWrap.style.cssText = 'display:flex;flex-direction:column;gap:8px;';

    const crewList = document.createElement('div');
    crewList.id = 'ep-crew-' + key;
    crewList.style.cssText = 'display:flex;flex-direction:column;gap:8px;';
    state.crew.forEach((c, i) => crewList.appendChild(buildEpCrewRow(key, i)));
    crewWrap.appendChild(crewList);

    const addCrewBtn = document.createElement('button');
    addCrewBtn.type = 'button';
    addCrewBtn.className = 'ep-add-btn';
    addCrewBtn.innerHTML = '＋ Add Crew Member';
    addCrewBtn.onclick = () => {
        // New crew is always "extra" — needs a price per head
        state.crew.push({
            role: EP_CREW_ROLES[0],
            qty: 1,
            baseQty: 0,         // ← 0 means nothing is "included" for this row
            pricePerHead: 0,    // ← user must fill this
            isExtra: true
        });
        refreshEpCrew(key);
        syncTeamRolesFromCrew(key);
    };
    crewWrap.appendChild(addCrewBtn);
    pane.appendChild(crewWrap);

    const teamLabel = document.createElement('div');
    teamLabel.className = 'ep-section-label';
    teamLabel.style.marginTop = '16px';
    teamLabel.innerText = 'Team Roles';
    pane.appendChild(teamLabel);

    const teamSection = document.createElement('div');
    teamSection.id = 'ep-team-section-' + key;
    pane.appendChild(teamSection);

    renderTeamRoleBadges(key, teamSection);

    const addRoleBtn = document.createElement('button');
    addRoleBtn.type = 'button';
    addRoleBtn.className = 'ep-add-role-btn';
    addRoleBtn.id = 'ep-add-role-btn-' + key;
    addRoleBtn.innerHTML = '＋ Add Team Role';
    addRoleBtn.onclick = () => showRoleDropdown(key, addRoleBtn);
    pane.appendChild(addRoleBtn);

    const delLabel = document.createElement('div');
    delLabel.className = 'ep-section-label';
    delLabel.style.marginTop = '16px';
    delLabel.innerText = 'Deliverables';
    pane.appendChild(delLabel);

    const delWrap = document.createElement('div');
    delWrap.style.cssText = 'display:flex;flex-direction:column;gap:8px;';

    const chipBox = document.createElement('div');
    chipBox.className = 'ep-chips';
    chipBox.id = 'ep-chips-' + key;
    state.deliverables.forEach((d, i) => chipBox.appendChild(buildEpChip(key, i)));
    delWrap.appendChild(chipBox);

    const inlineForm = document.createElement('div');
    inlineForm.className = 'ep-inline-add';
    inlineForm.id = 'ep-inline-' + key;
    inlineForm.style.display = 'none';
    inlineForm.innerHTML = `
        <div style="font-size:11px;font-weight:700;color:#6b7280;margin-bottom:8px;">New Deliverable</div>
        <div style="display:flex;gap:8px;margin-bottom:8px;">
            <input class="ep-mini-input" placeholder="Eg: Instagram Reels" id="ep-iname-${key}">
            <input class="ep-mini-input" placeholder="Extra ₹" id="ep-iprice-${key}" style="max-width:100px;flex:none">
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
            <button type="button" class="ep-btn-ghost" onclick="cancelEpInline('${key}')">Cancel</button>
            <button type="button" class="ep-btn-red-sm" onclick="confirmEpInline('${key}')">＋ Add</button>
        </div>
    `;
    delWrap.appendChild(inlineForm);

    const addDelBtn = document.createElement('button');
    addDelBtn.type = 'button';
    addDelBtn.className = 'ep-add-btn';
    addDelBtn.id = 'ep-addtrig-' + key;
    addDelBtn.innerHTML = '＋ Add Extra Deliverable';
    addDelBtn.onclick = () => {
        inlineForm.style.display = 'block';
        addDelBtn.style.display = 'none';
        document.getElementById('ep-iname-' + key)?.focus();
    };
    delWrap.appendChild(addDelBtn);
    pane.appendChild(delWrap);

    const priceDiv = document.createElement('div');
    priceDiv.style.marginTop = '16px';
    priceDiv.innerHTML = `
        <div class="ep-section-label">Pricing Breakdown</div>
        <div class="ep-price-box">
            <div class="ep-price-row">
                <span>Base Package <small style="color:#9ca3af;font-weight:400">(${pkg.crew.map(c=>c.role+' ×'+c.qty).join(', ')})</small></span>
                <span>₹${pkg.price.toLocaleString('en-IN')}</span>
            </div>
            <div class="ep-price-row ep-crew-charge-row" id="ep-crewrow-${key}" style="display:none">
                <span>Extra Crew / Qty <span id="ep-crewlabel-${key}" style="color:#9ca3af;font-size:11px"></span></span>
                <span id="ep-crewval-${key}" style="color:#b45309">₹0</span>
            </div>
            <div class="ep-price-row" id="ep-extrarow-${key}" style="display:none">
                <span>Extra Deliverables</span>
                <span id="ep-extraval-${key}" style="color:#b45309">₹0</span>
            </div>
            <div class="ep-price-row ep-price-total">
                <span>Package Total</span>
                <span id="ep-subval-${key}">₹${pkg.price.toLocaleString('en-IN')}</span>
            </div>
        </div>
    `;
    pane.appendChild(priceDiv);

    return pane;
}


// ===============================
// CREW ROW
// ===============================
function buildEpCrewRow(key, i) {
    const c = _editState[key].crew[i];
    const pkg = PACKAGE_CATALOG[key];

    // Is this crew row "extra" in any way?
    // Case 1: isExtra = true  → entirely new crew not in base package
    // Case 2: qty > baseQty   → existing crew but qty increased beyond base
    const extraQty = Math.max(0, c.qty - c.baseQty);
    const hasExtraCharge = c.isExtra || extraQty > 0;

    const row = document.createElement('div');
    row.className = 'ep-crew-row' + (hasExtraCharge ? ' ep-crew-row--extra' : '');
    row.id = `ep-crow-${key}-${i}`;

    // Badge shown on base-included crew
    const baseBadge = (!c.isExtra && c.qty <= c.baseQty)
        ? `<span class="ep-crew-badge ep-crew-badge--base">included</span>`
        : '';

    // Price input shown whenever there's an extra charge
    const priceInput = hasExtraCharge ? `
        <div class="ep-crew-price-wrap">
            <span class="ep-crew-price-label">
                ${c.isExtra
                    ? `+${c.qty} person${c.qty > 1 ? 's' : ''} × ₹`
                    : `+${extraQty} extra × ₹`}
            </span>
            <input
                type="number"
                class="ep-crew-price-input"
                id="ep-cprice-${key}-${i}"
                placeholder="price/head"
                min="0"
                value="${c.pricePerHead || ''}"
                onchange="epCrewPriceChange('${key}',${i},this.value)"
                oninput="epCrewPriceChange('${key}',${i},this.value)"
            >
        </div>` : '';

    row.innerHTML = `
        <span class="ep-crew-icon">📷</span>
        <select class="ep-crew-select" onchange="epCrewRoleChange('${key}',${i},this.value)">
            ${EP_CREW_ROLES.map(r => `<option${r === c.role ? ' selected' : ''}>${r}</option>`).join('')}
        </select>
        ${baseBadge}
        <div class="ep-qty">
            <button type="button" onclick="epChangeQty('${key}',${i},-1)">−</button>
            <span id="ep-qty-${key}-${i}">${c.qty}</span>
            <button type="button" onclick="epChangeQty('${key}',${i},1)">+</button>
        </div>
        <button type="button" class="ep-del-btn" onclick="epRemoveCrew('${key}',${i})">✕</button>
        ${priceInput}
    `;
    return row;
}

function refreshEpCrew(key) {
    const area = document.getElementById('ep-crew-' + key);
    if (!area) return;
    area.innerHTML = '';
    _editState[key].crew.forEach((c, i) => area.appendChild(buildEpCrewRow(key, i)));
}

function epCrewRoleChange(key, i, newRole) {
    _editState[key].crew[i].role = newRole;
    syncSelectedServicesToWindow();
    syncTeamRolesFromCrew(key);
}

function epCrewPriceChange(key, i, val) {
    _editState[key].crew[i].pricePerHead = parseFloat(val) || 0;
    recalcCrewCost(key);
}

function epChangeQty(key, i, delta) {
    const c = _editState[key].crew[i];
    const oldQty = c.qty;
    c.qty = Math.max(1, Math.min(9, c.qty + delta));

    // Update qty display with bounce animation
    const el = document.getElementById(`ep-qty-${key}-${i}`);
    if (el) {
        el.innerText = c.qty;
        el.style.transform = 'scale(1.4)';
        el.style.color = '#8B1A1A';
        setTimeout(() => { el.style.transform = 'scale(1)'; el.style.color = ''; }, 180);
    }

    // Rebuild the row so the price-input appears/disappears correctly
    refreshEpCrew(key);
    recalcCrewCost(key);
    syncSelectedServicesToWindow();
    syncTeamRolesFromCrew(key);
}

// ── Recalculate total extra-crew cost for a package key ──────────────────────
function recalcCrewCost(key) {
    const state = _editState[key];
    let crewCost = 0;
    const details = [];  // for label like "(+1 CP ×₹2000)"

    state.crew.forEach(c => {
        if (c.isExtra) {
            // Entirely new crew — full qty × pricePerHead
            const charge = c.qty * (c.pricePerHead || 0);
            crewCost += charge;
            if (charge > 0) details.push(`+${c.qty} ${c.role.split(' ').map(w=>w[0]).join('')} ×₹${c.pricePerHead.toLocaleString('en-IN')}`);
        } else {
            // Base crew — only charge for qty ABOVE baseQty
            const extraQty = Math.max(0, c.qty - c.baseQty);
            const charge = extraQty * (c.pricePerHead || 0);
            crewCost += charge;
            if (charge > 0) details.push(`+${extraQty} ${c.role.split(' ').map(w=>w[0]).join('')} ×₹${c.pricePerHead.toLocaleString('en-IN')}`);
        }
    });

    state.extraCrewCost = crewCost;
    updateEpBlockPrice(key);

    // Update crew-charge label
    const labelEl = document.getElementById('ep-crewlabel-' + key);
    if (labelEl) labelEl.innerText = details.length ? `(${details.join(', ')})` : '';
}

function epRemoveCrew(key, i) {
    const row = document.getElementById(`ep-crow-${key}-${i}`);
    if (row) {
        row.style.transition = 'opacity .18s, transform .18s';
        row.style.opacity = '0';
        row.style.transform = 'translateX(14px)';
        setTimeout(() => {
            _editState[key].crew.splice(i, 1);
            refreshEpCrew(key);
            recalcCrewCost(key);
            syncSelectedServicesToWindow();
            syncTeamRolesFromCrew(key);
        }, 190);
    }
}


// ===============================
// CHIPS
// ===============================
function buildEpChip(key, i) {
    const d = _editState[key].deliverables[i];
    const chip = document.createElement('span');
    chip.className = 'ep-chip ' + (d.isExtra ? 'extra' : 'base');
    chip.id = `ep-chip-${key}-${i}`;
    chip.innerHTML = `${d.label}${d.extraPrice ? ' +₹' + d.extraPrice : ''} <span class="ep-chip-x" onclick="epRemoveChip('${key}',${i})">✕</span>`;
    return chip;
}

function refreshEpChips(key) {
    const box = document.getElementById('ep-chips-' + key);
    if (!box) return;
    box.innerHTML = '';
    _editState[key].deliverables.forEach((d, i) => box.appendChild(buildEpChip(key, i)));
}

function epRemoveChip(key, i) {
    const d = _editState[key].deliverables[i];
    if (d.isExtra && d.extraPrice) _editState[key].extraDelCost = Math.max(0, (_editState[key].extraDelCost || 0) - d.extraPrice);
    const chip = document.getElementById(`ep-chip-${key}-${i}`);
    if (chip) {
        chip.style.transition = 'opacity .15s, transform .15s';
        chip.style.opacity = '0';
        chip.style.transform = 'scale(.7)';
        setTimeout(() => { _editState[key].deliverables.splice(i, 1); refreshEpChips(key); updateEpBlockPrice(key); }, 150);
    }
}

function cancelEpInline(key) {
    document.getElementById('ep-inline-' + key).style.display = 'none';
    document.getElementById('ep-addtrig-' + key).style.display = 'flex';
    const n = document.getElementById('ep-iname-' + key);
    const p = document.getElementById('ep-iprice-' + key);
    if (n) n.value = '';
    if (p) p.value = '';
}

function confirmEpInline(key) {
    const nameEl = document.getElementById('ep-iname-' + key);
    const price = parseInt(document.getElementById('ep-iprice-' + key)?.value) || 0;
    const name = nameEl?.value.trim();
    if (!name) {
        if (nameEl) { nameEl.style.borderColor = '#ef4444'; setTimeout(() => nameEl.style.borderColor = '', 400); }
        return;
    }
    _editState[key].deliverables.push({ key: 'EXTRA_' + Date.now(), label: name, isExtra: true, extraPrice: price });
    if (price > 0) _editState[key].extraDelCost = (_editState[key].extraDelCost || 0) + price;
    refreshEpChips(key);
    updateEpBlockPrice(key);
    cancelEpInline(key);
}


// ===============================
// PRICING
// ===============================
function updateEpBlockPrice(key) {
    const base = PACKAGE_CATALOG[key].price;
    const state = _editState[key];
    const crewExtra = state.extraCrewCost || 0;
    const delExtra  = state.extraDelCost  || 0;
    const total = base + crewExtra + delExtra;

    // Crew row
    const crewRow = document.getElementById('ep-crewrow-' + key);
    const crewVal = document.getElementById('ep-crewval-' + key);
    if (crewRow) crewRow.style.display = crewExtra > 0 ? 'flex' : 'none';
    if (crewVal) {
        crewVal.innerText = '₹' + crewExtra.toLocaleString('en-IN');
        crewVal.style.transition = 'transform .15s cubic-bezier(.34,1.56,.64,1)';
        crewVal.style.transform = 'scale(1.2)';
        setTimeout(() => crewVal.style.transform = 'scale(1)', 150);
    }

    // Deliverables row
    const extraRow = document.getElementById('ep-extrarow-' + key);
    const extraVal = document.getElementById('ep-extraval-' + key);
    if (extraRow) extraRow.style.display = delExtra > 0 ? 'flex' : 'none';
    if (extraVal) extraVal.innerText = '₹' + delExtra.toLocaleString('en-IN');

    // Total
    const subVal = document.getElementById('ep-subval-' + key);
    if (subVal) {
        subVal.innerText = '₹' + total.toLocaleString('en-IN');
        subVal.style.transition = 'transform .18s cubic-bezier(.34,1.56,.64,1)';
        subVal.style.transform = 'scale(1.12)';
        setTimeout(() => subVal.style.transform = 'scale(1)', 180);
    }

    updateEpFooterTotal();
    syncSelectedServicesToWindow();
    renderSummaryBar();
}

function updateEpFooterTotal() {
    let total = 0;
    _selectedKeys.forEach(k => {
        const s = _editState[k];
        total += PACKAGE_CATALOG[k].price + (s?.extraCrewCost || 0) + (s?.extraDelCost || 0);
    });
    const el = document.getElementById('pkgEditFooterTotal');
    if (el) {
        el.innerText = '₹' + total.toLocaleString('en-IN');
        el.style.transition = 'transform .2s cubic-bezier(.34,1.56,.64,1)';
        el.style.transform = 'scale(1.15)';
        setTimeout(() => el.style.transform = 'scale(1)', 200);
    }
}


// ===============================
// SYNC TO WINDOW + SAVE
// ===============================
function syncSelectedServicesToWindow() {
    window.selectedPackageServices = _selectedKeys.map(key => {
        const state = _editState[key];
        const pkg = PACKAGE_CATALOG[key];
        const totalPrice = pkg.price + (state.extraCrewCost || 0) + (state.extraDelCost || 0);
        return {
            key: key,
            label: pkg.label,
            price: totalPrice,
            basePrice: pkg.price,
            extraCrewCost: state.extraCrewCost || 0,
            extraDelCost: state.extraDelCost || 0,
            crew: state.crew.map(c => `${c.role} x${c.qty}`),
            crewDetail: state.crew.map(c => ({
                role: c.role,
                qty: c.qty,
                baseQty: c.baseQty,
                isExtra: c.isExtra,
                pricePerHead: c.pricePerHead || 0
            })),
            deliverables: state.deliverables.map(d => d.label),
            teamRoles: (state.teamRoles || []).map(r => r.role),
            selectionOrder: _selectedKeys.indexOf(key)
        };
    });

    const grandTotal = _selectedKeys.reduce((sum, k) => {
            const s = _editState[k];
            return sum + PACKAGE_CATALOG[k].price + (s?.extraCrewCost || 0) + (s?.extraDelCost || 0);
        }, 0);

    // Push into pricing engine (discount + GST live here)
    updatePricingSubtotal(grandTotal);
}

function savePkgEditPanel() {
    syncSelectedServicesToWindow();
    closePkgEditPanel();

    const btn = document.getElementById('editPkgBtn');
    if (btn) {
        const orig = btn.innerText;
        btn.innerText = '✓ Saved';
        btn.style.background = '#16a34a';
        setTimeout(() => { btn.innerText = orig; btn.style.background = ''; }, 1500);
    }
}


// ===============================
// TEAM ROLES
// ===============================
const ROLE_ABBR = {
    'Traditional Photographer': 'TP',
    'Candid Photographer': 'CP',
    'Traditional Videographer': 'TV',
    'Candid Videographer': 'CV',
    'Photographer': 'PH',
    'Videographer': 'VG',
    'Drone Operator': 'DR',
    'Cinematic Videographer': 'CI',
};

const ROLE_COLORS = {
    'Traditional Photographer': '#8B1A1A',
    'Candid Photographer': '#1a4e8b',
    'Traditional Videographer': '#1a6b3a',
    'Candid Videographer': '#7a4e1a',
    'Photographer': '#8B1A1A',
    'Videographer': '#1a6b3a',
    'Drone Operator': '#4a1a8b',
    'Cinematic Videographer': '#8b1a6b',
};

// function syncTeamRolesFromCrew(key) {
//     const state = _editState[key];
//     if (!state) return;

//     const newRoles = [];
//     state.crew.forEach(c => {
//         for (let q = 0; q < c.qty; q++) {
//             newRoles.push({ role: c.role, assigned: null });
//         }
//     });

//     const crewRoleSet = new Set(state.crew.map(c => c.role));
//     (state.teamRoles || []).forEach(r => {
//         if (!crewRoleSet.has(r.role)) newRoles.push({ ...r });
//     });

//     state.teamRoles = newRoles;

//     const section = document.getElementById('ep-team-section-' + key);
//     if (section) renderTeamRoleBadges(key, section);
// }

function syncTeamRolesFromCrew(key) {
    const state = _editState[key];
    if (!state) return;

    // Count total slots needed per role from current crew
    const crewMap = {};
    state.crew.forEach(c => {
        crewMap[c.role] = (crewMap[c.role] || 0) + c.qty;
    });

    // Preserve existing assigned values per role
    const existingByRole = {};
    (state.teamRoles || []).forEach(r => {
        if (!existingByRole[r.role]) existingByRole[r.role] = [];
        existingByRole[r.role].push(r.assigned || null);
    });

    const newRoles = [];

    // Add slots for each crew role (exactly qty times)
    Object.entries(crewMap).forEach(([role, qty]) => {
        const prev = existingByRole[role] || [];
        for (let q = 0; q < qty; q++) {
            newRoles.push({ role, assigned: prev[q] || null });
        }
    });

   // Keep manually-added team roles ONLY if they were added via addTeamRole button
    // AND their role is not already covered by crew (avoids ghost badges on crew removal)
    const crewRoleSet = new Set(Object.keys(crewMap));
    const crewDerivedRoles = new Set(
        (state.crew || []).flatMap(c => 
            Array.from({ length: c.qty }, () => c.role)
        )
    );
    (state.teamRoles || []).forEach(r => {
        // Only keep if: not in current crew AND was manually added (not crew-derived)
        if (!crewRoleSet.has(r.role) && r._manual === true) {
            newRoles.push({ ...r });
        }
    });
    state.teamRoles = newRoles;

    const section = document.getElementById('ep-team-section-' + key);
    if (section) renderTeamRoleBadges(key, section);
}
function renderTeamRoleBadges(key, container) {
    container.innerHTML = '';
    const state = _editState[key];
    if (!state || !state.teamRoles || state.teamRoles.length === 0) {
        container.innerHTML = `<div style="font-size:12px;color:#9ca3af;padding:6px 0">No team roles yet. Click ＋ Add Team Role below.</div>`;
        return;
    }

    const row = document.createElement('div');
    row.className = 'ep-role-badges';

    state.teamRoles.forEach((r, i) => {
        const abbr = ROLE_ABBR[r.role] || r.role.slice(0, 2).toUpperCase();
        const color = ROLE_COLORS[r.role] || '#8B1A1A';

        const wrap = document.createElement('div');
        wrap.className = 'ep-role-badge-wrap';
        wrap.style.cssText = `--anim-delay:${i * 60}ms`;
        wrap.style.animationDelay = `${i * 60}ms`;

        wrap.innerHTML = `
            <div class="ep-role-bubble" title="${r.role}">
                +
                <span class="ep-role-remove" onclick="removeTeamRole('${key}', ${i})">✕</span>
            </div>
            <div class="ep-role-abbr">${abbr}</div>
        `;

        row.appendChild(wrap);
    });

    container.appendChild(row);
}

function removeTeamRole(key, i) {
    const state = _editState[key];
    if (!state || !state.teamRoles) return;

    const section = document.getElementById('ep-team-section-' + key);
    const wraps = section ? section.querySelectorAll('.ep-role-badge-wrap') : [];
    if (wraps[i]) {
        wraps[i].style.transition = 'opacity .15s, transform .15s';
        wraps[i].style.opacity = '0';
        wraps[i].style.transform = 'scale(0.4)';
        setTimeout(() => {
            state.teamRoles.splice(i, 1);
            const sec = document.getElementById('ep-team-section-' + key);
            if (sec) renderTeamRoleBadges(key, sec);
            syncSelectedServicesToWindow();
        }, 160);
    }
}

function showRoleDropdown(key, triggerBtn) {
    document.querySelectorAll('.ep-role-dropdown').forEach(d => d.remove());

    const dropdown = document.createElement('div');
    dropdown.className = 'ep-role-dropdown';

    EP_CREW_ROLES.forEach(role => {
        const item = document.createElement('div');
        item.className = 'ep-role-dropdown-item';
        const abbr = ROLE_ABBR[role] || role.slice(0, 2).toUpperCase();
        const color = ROLE_COLORS[role] || '#8B1A1A';
        item.innerHTML = `<span class="ep-role-dd-dot" style="background:${color}">${abbr}</span>${role}`;
        item.onclick = () => {
            addTeamRole(key, role);
            dropdown.remove();
        };
        dropdown.appendChild(item);
    });

    triggerBtn.insertAdjacentElement('afterend', dropdown);

    setTimeout(() => {
        document.addEventListener('click', function closeDD(e) {
            if (!dropdown.contains(e.target) && e.target !== triggerBtn) {
                dropdown.remove();
                document.removeEventListener('click', closeDD);
            }
        });
    }, 10);
}

function addTeamRole(key, role) {
    const state = _editState[key];
    if (!state) return;
    if (!state.teamRoles) state.teamRoles = [];

    state.teamRoles.push({ role: role, assigned: null, _manual: true });

    const section = document.getElementById('ep-team-section-' + key);
    if (section) renderTeamRoleBadges(key, section);
    syncSelectedServicesToWindow();
}


// ===============================
// SERVICE CREATOR DRAWER
// ===============================
const PRESET_DELIVERABLES = ["Raw Photos", "Album", "Pen Drive", "Wedding Teaser", "Highlight Video", "Instagram Reel"];

const CREW_ROLES = [
    'Traditional Photographer', 'Candid Photographer',
    'Traditional Videographer', 'Candid Videographer',
    'Photographer', 'Videographer', 'Drone Operator', 'Cinematic Videographer'
];

function openServiceCreator() {
    document.getElementById("serviceDrawer").classList.add("open");
    renderDeliverablePresets();
    if (!document.querySelector("#crewContainer .sc-crew-row")) {
        addCrewRow();
    }
}

function closeServiceCreator() {
    document.getElementById("serviceDrawer").classList.remove("open");
    document.getElementById("serviceName").value = "";
    document.getElementById("servicePrice").value = "";
    document.getElementById("crewContainer").innerHTML = "";
    document.getElementById("deliverableList").innerHTML = "";
    const customInline = document.getElementById("sc-custom-inline");
    if (customInline) customInline.style.display = "none";
    const customInput = document.getElementById("sc-custom-input");
    if (customInput) customInput.value = "";
    document.getElementById("sc-toast").style.display = "none";
}

function addCrewRow(role = "", qty = 1) {
    const container = document.getElementById("crewContainer");
    const row = document.createElement("div");
    row.className = "sc-crew-row";

    let options = CREW_ROLES.map(r =>
        `<option ${r === role ? "selected" : ""}>${r}</option>`
    ).join("");

    row.innerHTML = `
        <select class="sc-crew-select">${options}</select>
        <div class="sc-qty-wrap">
            <button type="button" class="sc-qty-btn" onclick="scChangeQty(this, -1)">−</button>
            <span class="sc-qty-val">${qty}</span>
            <button type="button" class="sc-qty-btn" onclick="scChangeQty(this, 1)">+</button>
        </div>
        <button type="button" class="sc-del-btn" onclick="this.closest('.sc-crew-row').remove()">✕</button>
    `;
    container.appendChild(row);
}

function scChangeQty(btn, delta) {
    const span = btn.parentElement.querySelector(".sc-qty-val");
    let val = parseInt(span.innerText) + delta;
    val = Math.max(1, Math.min(9, val));
    span.innerText = val;
    span.style.transform = "scale(1.4)";
    span.style.color = "#8B1A1A";
    setTimeout(() => { span.style.transform = "scale(1)"; span.style.color = ""; }, 180);
}

function renderDeliverablePresets() {
    const box = document.getElementById("deliverableList");
    box.innerHTML = "";
    PRESET_DELIVERABLES.forEach(name => {
        const pill = document.createElement("div");
        pill.className = "deliver-pill sc-pill";
        pill.innerText = name;
        pill.onclick = () => pill.classList.toggle("active");
        box.appendChild(pill);
    });
}

function showCustomDeliverableInline() {
    const inline = document.getElementById("sc-custom-inline");
    const addBtn = document.getElementById("sc-custom-trig");
    if (inline) inline.style.display = "block";
    if (addBtn) addBtn.style.display = "none";
    document.getElementById("sc-custom-input")?.focus();
}

function confirmCustomDeliverable() {
    const input = document.getElementById("sc-custom-input");
    const priceInput = document.getElementById("sc-custom-price");
    const name = input?.value.trim();
    if (!name) {
        if (input) { input.style.borderColor = "#ef4444"; setTimeout(() => input.style.borderColor = "", 400); }
        return;
    }
    const price = parseInt(priceInput?.value) || 0;
    const pill = document.createElement("div");
    pill.className = "deliver-pill sc-pill active custom";
    pill.dataset.extraPrice = price;
    const priceLabel = price > 0 ? ` <span style="opacity:.75;font-size:11px">+\u20b9${price.toLocaleString("en-IN")}</span>` : "";
    pill.innerHTML = `${name}${priceLabel} <span onclick="this.parentElement.remove()" style="cursor:pointer;opacity:.6;margin-left:4px">\u2715</span>`;
    document.getElementById("deliverableList").appendChild(pill);
    input.value = "";
    if (priceInput) priceInput.value = "";
    cancelCustomDeliverable();
}

function cancelCustomDeliverable() {
    const inline = document.getElementById("sc-custom-inline");
    const addBtn = document.getElementById("sc-custom-trig");
    if (inline) inline.style.display = "none";
    if (addBtn) addBtn.style.display = "flex";
    const input = document.getElementById("sc-custom-input");
    if (input) input.value = "";
    const priceInput = document.getElementById("sc-custom-price");
    if (priceInput) priceInput.value = "";
}

function saveService() {
    const toast = document.getElementById("sc-toast");
    toast.style.display = "none";

    const name = document.getElementById("serviceName").value.trim();
    const price = Number(document.getElementById("servicePrice").value);

    if (!name) { toast.innerText = "Service name is required"; toast.style.display = "block"; return; }
    if (!price || price <= 0) { toast.innerText = "Enter a valid price"; toast.style.display = "block"; return; }

    const crew = [...document.querySelectorAll("#crewContainer .sc-crew-row")].map(row => ({
        role: row.querySelector(".sc-crew-select").value,
        qty: parseInt(row.querySelector(".sc-qty-val").innerText) || 1
    }));

    const deliverables = [...document.querySelectorAll("#deliverableList .sc-pill.active")].map(p => ({
        label: p.childNodes[0]?.textContent?.trim() || p.innerText.replace("✕", "").replace(/\+₹[\d,]+/, "").trim(),
        key: "DEL_" + Date.now() + Math.random(),
        isExtra: parseInt(p.dataset.extraPrice || 0) > 0,
        extraPrice: parseInt(p.dataset.extraPrice || 0)
    }));

    const extrasTotal = deliverables.reduce((sum, d) => sum + (d.extraPrice || 0), 0);

    const key = "CUSTOM_" + Date.now();
    PACKAGE_CATALOG[key] = { label: name, price: price, crew, deliverables };

    _selectedKeys.push(key);
    const autoTeamRoles = [];
    crew.forEach(c => {
        for (let q = 0; q < c.qty; q++) {
            autoTeamRoles.push({ role: c.role, assigned: null });
        }
    });
    _editState[key] = {
        crew: crew.map(c => ({ ...c })),
        deliverables: deliverables.map(d => ({ ...d })),
        extras: extrasTotal,
        teamRoles: autoTeamRoles
    };

    syncSelectedServicesToWindow();
    closeServiceCreator();
    renderPackages();

    const editBtn = document.getElementById("editPkgBtn");
    if (editBtn) {
        editBtn.disabled = false;
        const orig = editBtn.innerText;
        editBtn.innerText = "✓ Service Added";
        editBtn.style.background = "#16a34a";
        setTimeout(() => { editBtn.innerText = orig; editBtn.style.background = ""; }, 1800);
    }
}


// ===============================
// DELIVERABLE MODAL
// ===============================
function openDeliverableModal() {
    document.getElementById("deliverableModal").style.display = "flex";
}

function closeDeliverableModal() {
    document.getElementById("deliverableModal").style.display = "none";
    document.getElementById("extraDeliverableName").value = "";
    document.getElementById("extraDeliverablePrice").value = "";
}

function addExtraDeliverable() {
    const name = document.getElementById("extraDeliverableName").value.trim();
    const price = Number(document.getElementById("extraDeliverablePrice").value);

    if (!name || price <= 0) { alert("Enter valid deliverable name and price"); return; }

    const box = document.getElementById("deliverablesBox");
    const pill = document.createElement("label");
    pill.className = "deliverable-pill extra";
    pill.innerHTML = `<input type="checkbox" checked disabled>${name} (+₹${price})`;
    box.appendChild(pill);

    const totalInput = document.querySelector('[name="total_amount"]');
    if (totalInput) totalInput.value = Number(totalInput.value || 0) + price;

    if (!window.selectedPackageServices) window.selectedPackageServices = [];
    window.selectedPackageServices.push({ key: "EXTRA_" + Date.now(), label: name, price: price, category: "EXTRA" });

    closeDeliverableModal();
}


// ===============================
// INIT
// ===============================
document.addEventListener("DOMContentLoaded", () => {
    renderPackages();
});
// ================================================================
// LEAD ACCEPTANCE FLOW
// Replaces the old payment modal when dragging to ACCEPTED column
// ================================================================
// Override the existing drop handler's ACCEPTED logic
// We inject ourselves via a patched openPaymentModal function

// Stub: old payment modal is removed — keep this so no reference errors
function closeModal() { /* no-op: payment modal replaced by acceptance flow */ }
function closePaymentModal() { /* no-op */ }

// ── STATE ─────────────────────────────────────────────────────────
let _acceptLeadId   = null;
let _acceptLeadData = null;   // full lead object fetched from server
let _paidAmountVal  = 0;

// ── PATCH: intercept openPaymentModal ─────────────────────────────
// The existing dragdrop.js calls openPaymentModal(leadId) when a card
// is dropped on ACCEPTED. We override that function here (this file
// must be loaded AFTER dragdrop.js).
function openPaymentModal(leadId) {
    _acceptLeadId = leadId;
    _fetchLeadAndShowConfirm(leadId);
}

// ── STEP 1 : CONFIRM DIALOG ───────────────────────────────────────
function _fetchLeadAndShowConfirm(leadId) {
    fetch(`/leads/get/${leadId}/`)
        .then(r => r.json())
        .then(lead => {
            _acceptLeadData = lead;
            _showAcceptConfirm();
        });
}

function _showAcceptConfirm() {
    const overlay = document.getElementById('acceptConfirmOverlay');
    const nameEl  = document.getElementById('acConfirmClientName');
    if (nameEl) nameEl.textContent = _acceptLeadData.client_name;
    overlay.classList.add('show');
    requestAnimationFrame(() => requestAnimationFrame(() => {
        overlay.querySelector('.ac-confirm-card').classList.add('pop');
    }));
}

function acConfirmNo() {
    // Revert the card back to its original column
    const card = document.querySelector(`.card[data-id="${_acceptLeadId}"]`);
    if (card) {
        const newCol = document.querySelector('.column[data-status="NEW"]') ||
                       document.querySelector('.column[data-status="FOLLOW_UP"]');
        if (newCol) {
            const head = newCol.querySelector('.column-head');
            if (head && head.nextSibling) newCol.insertBefore(card, head.nextSibling);
            else newCol.appendChild(card);
        }
    }
    _closeAcceptConfirm();
    _acceptLeadId   = null;
    _acceptLeadData = null;
}

function acConfirmYes() {
    _closeAcceptConfirm();
    _buildAndShowPreview();
}

function _closeAcceptConfirm() {
    const overlay = document.getElementById('acceptConfirmOverlay');
    const card    = overlay.querySelector('.ac-confirm-card');
    card.classList.remove('pop');
    setTimeout(() => overlay.classList.remove('show'), 280);
}

// ── STEP 2 : FULL LEAD PREVIEW MODAL ─────────────────────────────
function _buildAndShowPreview() {
    const lead    = _acceptLeadData;
    const modal   = document.getElementById('leadPreviewModal');

    // ── Header ──
    const _hdrTitle = document.getElementById('lpHeaderTitle');
    if (_hdrTitle) _hdrTitle.textContent = lead.client_name || 'Lead Preview';
    document.getElementById('lpClientName').textContent = lead.client_name;
    document.getElementById('lpEventType').textContent  = lead.event_type || '—';
    document.getElementById('lpPhone').textContent      = lead.phone || '—';
    document.getElementById('lpEmail').textContent      = lead.email || '—';
    document.getElementById('lpLocation').textContent   = lead.event_location || '—';

    const startDate = _fmtDate(lead.event_start_date);
    const endDate   = _fmtDate(lead.event_end_date);
    document.getElementById('lpDates').textContent =
        `${startDate} (${lead.event_start_session || ''}) – ${endDate} (${lead.event_end_session || ''})`;

    if (lead.follow_up_date) {
        document.getElementById('lpFollowupRow').style.display = '';
        document.getElementById('lpFollowup').textContent = _fmtDate(lead.follow_up_date);
    } else {
        document.getElementById('lpFollowupRow').style.display = 'none';
    }

    // ── Services / Packages ──
    _buildServicesTable(lead.selected_services || []);

    // ── Pricing ──
    _renderLpPricing(lead);

    // ── Payment section ──
    _paidAmountVal = parseFloat(lead.paid_amount || 0);
    _renderPaymentSection();

    // Show modal
    modal.classList.add('show');
    requestAnimationFrame(() => requestAnimationFrame(() => {
        modal.querySelector('.lpm-wrap').classList.add('in');
    }));
}

function _buildServicesTable(services) {
    const tbody = document.getElementById('lpServicesTbody');
    tbody.innerHTML = '';

    if (!services || services.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#9ca3af;padding:18px 0">No package selected</td></tr>`;
        return;
    }

    services.forEach((svc, idx) => {
        const price = Number(svc.price) || 0;
        // crew strings
        const crewList = (svc.crew || []).join(', ') || '—';
        // deliverables
        const delList  = (svc.deliverables || []).join(', ') || '—';

        const tr = document.createElement('tr');
        tr.style.animationDelay = `${idx * 60}ms`;
        tr.innerHTML = `
            <td>
                <div class="lp-svc-name">${svc.label}</div>
             
<div class="lp-svc-meta">
   
    ${(svc.crew || []).map(c => `<div class="lp-meta-item">${c}</div>`).join('')}
    <div class="lp-meta-label" style="margin-top:5px">Deliverables</div>
    ${(svc.deliverables || []).map(d => `<div class="lp-meta-item">${d}</div>`).join('')}
</div>
            </td>
            <td class="lp-td-center">1</td>
            <td class="lp-td-right">₹${price.toLocaleString('en-IN')}</td>
            <td class="lp-td-right lp-bold">₹${price.toLocaleString('en-IN')}</td>
        `;
        tbody.appendChild(tr);
    });
}

function _renderLpPricing(lead) {
    const p   = lead.pricing_data || {};
    const sub = p.subtotal || Number(lead.total_amount) || 0;
    const dis = p.discountAmount || 0;
    const gst = p.gstAmount     || 0;
    const tot = p.finalTotal    || Number(lead.total_amount) || sub;

    document.getElementById('lpSubtotal').textContent     = `₹${sub.toLocaleString('en-IN')}`;
    document.getElementById('lpTotalFinal').textContent   = `₹${tot.toLocaleString('en-IN')}`;

    const disRow = document.getElementById('lpDiscountRow');
    if (dis > 0) {
        disRow.style.display = '';
        const label = p.discountType === 'percent'
            ? `Discount (${p.discountValue}%)`
            : 'Flat Discount';
        document.getElementById('lpDiscountLabel').textContent = label;
        document.getElementById('lpDiscountVal').textContent   = `−₹${dis.toLocaleString('en-IN')}`;
    } else {
        disRow.style.display = 'none';
    }

    const gstRow = document.getElementById('lpGstRow');
    if (gst > 0) {
        gstRow.style.display = '';
        document.getElementById('lpGstLabel').textContent = `GST (${p.gstRate}%)`;
        document.getElementById('lpGstVal').textContent   = `+₹${gst.toLocaleString('en-IN')}`;
    } else {
        gstRow.style.display = 'none';
    }
}

function _renderPaymentSection() {
    const lead  = _acceptLeadData;
    const total = Number((lead.pricing_data && lead.pricing_data.finalTotal) || lead.total_amount || 0);
    const paid  = _paidAmountVal;
    const remaining = Math.max(0, total - paid);

    document.getElementById('lpPayTotal').textContent     = `₹${total.toLocaleString('en-IN')}`;
    document.getElementById('lpPayPaid').textContent      = `₹${paid.toLocaleString('en-IN')}`;
    document.getElementById('lpPayRemaining').textContent = `₹${remaining.toLocaleString('en-IN')}`;

    const bar = document.getElementById('lpPayProgressBar');
    const pct = total > 0 ? Math.min(100, Math.round(paid / total * 100)) : 0;
    bar.style.width = pct + '%';
    document.getElementById('lpPayPct').textContent = pct + '%';

    // Remaining badge color
    const remEl = document.getElementById('lpPayRemaining');
    remEl.style.color = remaining === 0 ? '#16a34a' : '#8B1A1A';
}

// ── MAKE PAYMENT POPUP ────────────────────────────────────────────
function lpOpenMakePayment() {
    const lead  = _acceptLeadData;
    const total = Number((lead.pricing_data && lead.pricing_data.finalTotal) || lead.total_amount || 0);
    document.getElementById('lpMpTotalDisplay').textContent = `₹${total.toLocaleString('en-IN')}`;
    document.getElementById('lpMpPaidInput').value = _paidAmountVal > 0 ? _paidAmountVal : '';
    document.getElementById('lpMpToast').style.display = 'none';

    const popup = document.getElementById('lpMakePaymentPopup');
    popup.style.display = 'flex';
    requestAnimationFrame(() => requestAnimationFrame(() => {
        popup.querySelector('.lpmp-card').classList.add('pop');
    }));
    setTimeout(() => document.getElementById('lpMpPaidInput').focus(), 200);
}

function lpCloseMakePayment() {
    const popup = document.getElementById('lpMakePaymentPopup');
    popup.querySelector('.lpmp-card').classList.remove('pop');
    setTimeout(() => { popup.style.display = 'none'; }, 280);
}

function lpSubmitPayment() {
    const lead  = _acceptLeadData;
    const total = Number((lead.pricing_data && lead.pricing_data.finalTotal) || lead.total_amount || 0);
    const paid  = parseFloat(document.getElementById('lpMpPaidInput').value) || 0;
    const toast = document.getElementById('lpMpToast');

    toast.style.display = 'none';
    if (paid < 0)       { toast.textContent = 'Amount cannot be negative'; toast.style.display='block'; return; }
    if (paid > total)   { toast.textContent = 'Advance cannot exceed total'; toast.style.display='block'; return; }

    _paidAmountVal = paid;
    _acceptLeadData.paid_amount = paid;
    _renderPaymentSection();
    lpCloseMakePayment();
}

// ── ACCEPT (FINALIZE) ─────────────────────────────────────────────
function lpAcceptLead() {
    const lead  = _acceptLeadData;
    const total = Number((lead.pricing_data && lead.pricing_data.finalTotal) || lead.total_amount || 0);
    const paid  = _paidAmountVal;

    const csrf = document.getElementById('csrf_token').value;

    // 1. Update status + payment
    fetch('/leads/update-status/', {
        method: 'POST',
        headers: { 'X-CSRFToken': csrf, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            lead_id:      _acceptLeadId,
            status:       'ACCEPTED',
            total_amount: total,
            paid_amount:  paid
        })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            // 2. Auto-create invoice via existing endpoint
            _autoCreateInvoice(_acceptLeadId);

            // 3. Update card on board
            const card = document.querySelector(`.card[data-id="${_acceptLeadId}"]`);
            if (card) {
                const existing = card.querySelector('.paid-row');
                if (existing) existing.remove();
                const quoted  = card.querySelector('.quoted-row');
                if (quoted)   quoted.remove();

                if (paid > 0) {
                    const row = document.createElement('div');
                    row.className = 'card-row paid-row';
                    row.innerHTML = `<img src="/static/icons/rupee.svg"><span>Paid : ₹ ${paid.toLocaleString('en-IN')}</span>`;
                    card.appendChild(row);
                }
            }

            _closePreviewModal();
            // reload to sync everything
            setTimeout(() => location.reload(), 400);
        }
    });
}

// ── AUTO-CREATE INVOICE ───────────────────────────────────────────
function _autoCreateInvoice(leadId) {
    // Find a project linked to this lead (if any) via existing create_invoice endpoint
    // We send to /invoice/create/ with project_id.
    // Since we may not have project_id here, we call a lightweight helper
    // that looks up the project by lead_id server-side.
    // If no project exists yet, we skip silently.
    fetch(`/invoice/auto-create-from-lead/`, {
        method: 'POST',
        headers: {
            'X-CSRFToken': document.getElementById('csrf_token').value,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({ lead_id: leadId })
    }).catch(() => {}); // silent – invoice page not broken if endpoint missing
}

// ── GENERATE INVOICE POPUP ────────────────────────────────────────
function lpGenerateInvoice() {
    const lead = _acceptLeadData;
    if (!lead) return;

    const services     = lead.selected_services || [];
    const today        = new Date();
    const dateStr      = today.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    const quoteNo      = `AK-INV-${_acceptLeadId || String(today.getTime()).slice(-6)}`;
    const p            = (lead.pricing_data) || {};
    const subtotal     = p.subtotal || Number(lead.total_amount) || 0;
    const discAmt      = p.discountAmount || 0;
    const gstAmt       = p.gstAmount || 0;
    const finalTotal   = p.finalTotal || Number(lead.total_amount) || subtotal;
    const afterDis     = subtotal - discAmt;
    const paidAmt      = _paidAmountVal || 0;
    const remaining    = Math.max(0, finalTotal - paidAmt);

    // Build service rows
    let serviceRowsHTML = '';
    if (services.length > 0) {
        services.forEach((svc, idx) => {
            const price    = Number(svc.price) || 0;
            const crew     = (svc.crew || []).join(', ') || '—';
            const dels     = (svc.deliverables || []).join(', ') || '—';
            serviceRowsHTML += `
                <tr>
                    <td>
                        <div class="inv-svc-label">${svc.label}</div>
                        <div class="inv-svc-sub">👥 ${crew}</div>
                        <div class="inv-svc-sub">📦 ${dels}</div>
                    </td>
                    <td class="tc">1</td>
                    <td class="tr">₹${price.toLocaleString('en-IN')}</td>
                    <td class="tr">₹${price.toLocaleString('en-IN')}</td>
                </tr>`;
        });
    } else {
        serviceRowsHTML = `
            <tr>
                <td><div class="inv-svc-label">Photography & Videography Package</div>
                <div class="inv-svc-sub">${lead.event_type}</div></td>
                <td class="tc">1</td>
                <td class="tr">₹${subtotal.toLocaleString('en-IN')}</td>
                <td class="tr">₹${subtotal.toLocaleString('en-IN')}</td>
            </tr>`;
    }

    const discRowHTML = discAmt > 0 ? `
        <tr class="inv-dis-row">
            <td colspan="3">${p.discountType==='percent' ? `Discount (${p.discountValue}%)` : 'Flat Discount'}</td>
            <td class="tr" style="color:#16a34a">−₹${discAmt.toLocaleString('en-IN')}</td>
        </tr>
        <tr class="inv-after-row">
            <td colspan="3" style="font-size:11px;color:#9ca3af">After Discount</td>
            <td class="tr" style="font-size:11px;color:#9ca3af">₹${afterDis.toLocaleString('en-IN')}</td>
        </tr>` : '';

    const gstRowHTML = gstAmt > 0 ? `
        <tr>
            <td colspan="3">GST (${p.gstRate}%)</td>
            <td class="tr" style="color:#2563eb">+₹${gstAmt.toLocaleString('en-IN')}</td>
        </tr>` : '';

    const paidRowHTML = paidAmt > 0 ? `
        <tr class="inv-paid-row">
            <td colspan="3">Advance Paid</td>
            <td class="tr" style="color:#16a34a">−₹${paidAmt.toLocaleString('en-IN')}</td>
        </tr>
        <tr class="inv-bal-row">
            <td colspan="3" class="inv-balance-label">Balance Due</td>
            <td class="tr inv-balance-val" style="color:${remaining===0?'#16a34a':'#8B1A1A'}">₹${remaining.toLocaleString('en-IN')}</td>
        </tr>` : '';

    const invoiceHTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Invoice ${quoteNo}</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--ink:#1a1a2e;--accent:#8B1A1A;--gold:#c9a84c;--muted:#6b7280;--border:#e8e0d8;--cream:#faf8f5}
body{font-family:'DM Sans',sans-serif;background:var(--cream);color:var(--ink);padding:40px 20px}
.page{max-width:820px;margin:0 auto;background:#fff;border-radius:20px;overflow:hidden;
  box-shadow:0 20px 60px rgba(26,26,46,.12)}
.hdr{background:var(--ink);padding:44px 52px 32px;position:relative;overflow:hidden}
.hdr::before{content:'';position:absolute;top:-60px;right:-60px;width:220px;height:220px;
  border-radius:50%;border:40px solid rgba(201,168,76,.12)}
.hdr-inner{display:flex;justify-content:space-between;align-items:flex-start;position:relative;z-index:1}
.brand{display:flex;align-items:center;gap:14px}
.logo{width:52px;height:52px;background:linear-gradient(135deg,var(--accent),#c0392b);border-radius:13px;
  display:flex;align-items:center;justify-content:center;font-family:'Playfair Display',serif;
  font-size:20px;font-weight:700;color:#fff;box-shadow:0 4px 16px rgba(139,26,26,.4)}
.brand-txt h1{font-family:'Playfair Display',serif;font-size:20px;font-weight:700;color:#fff}
.brand-txt p{font-size:11px;color:rgba(255,255,255,.5);letter-spacing:1.4px;text-transform:uppercase;margin-top:2px}
.meta{text-align:right}
.meta .tag{display:inline-block;background:var(--gold);color:var(--ink);font-size:9px;font-weight:700;
  letter-spacing:2px;text-transform:uppercase;padding:3px 10px;border-radius:20px;margin-bottom:6px}
.meta .num{font-family:'Playfair Display',serif;font-size:26px;font-weight:700;color:#fff;line-height:1}
.meta .dt{font-size:11px;color:rgba(255,255,255,.45);margin-top:3px}
.ribbon{height:4px;background:linear-gradient(90deg,var(--accent),var(--gold),var(--accent))}
.body{padding:40px 52px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-bottom:36px;
  padding-bottom:32px;border-bottom:1.5px solid var(--border)}
.info-block h4{font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;
  color:var(--accent);margin-bottom:10px}
.info-block .cname{font-family:'Playfair Display',serif;font-size:20px;font-weight:600;margin-bottom:6px}
.info-block p{font-size:13px;color:var(--muted);line-height:1.7}
.chips{display:flex;flex-wrap:wrap;gap:7px;margin-top:8px}
.chip{background:#f8ece8;color:var(--accent);font-size:11px;font-weight:500;padding:5px 11px;border-radius:20px}
.tbl-wrap{margin-bottom:28px}
.tbl-title{font-family:'Playfair Display',serif;font-size:15px;font-weight:600;
  margin-bottom:14px;display:flex;align-items:center;gap:10px}
.tbl-title::after{content:'';flex:1;height:1.5px;background:linear-gradient(90deg,var(--border),transparent)}
table{width:100%;border-collapse:separate;border-spacing:0;border-radius:12px;
  overflow:hidden;border:1.5px solid var(--border)}
thead tr{background:var(--ink)}
thead th{padding:12px 18px;font-size:9.5px;font-weight:600;letter-spacing:1.4px;
  text-transform:uppercase;color:rgba(255,255,255,.7);text-align:left}
thead th.tc{text-align:center} thead th.tr{text-align:right}
tbody tr:nth-child(even){background:#fafaf9}
td{padding:16px 18px;vertical-align:top;font-size:13px}
td.tc{text-align:center;color:var(--muted)} td.tr{text-align:right;font-weight:600}
.inv-svc-label{font-size:13.5px;font-weight:600;margin-bottom:3px}
.inv-svc-sub{font-size:11px;color:var(--muted);margin-top:2px}
.inv-dis-row td,.inv-after-row td{background:rgba(220,252,231,.3);font-size:12px;color:var(--muted)}
.inv-paid-row td,.inv-bal-row td{background:rgba(240,253,244,.5)}
.inv-balance-label{font-weight:700;font-size:13px;color:var(--ink)}
.inv-balance-val{font-size:15px!important;font-weight:800!important}
.totals{display:flex;justify-content:flex-end;margin-bottom:32px}
.totals-box{width:280px;background:#fdf6e3;border-radius:12px;padding:20px 24px;
  border:1.5px solid rgba(201,168,76,.3)}
.t-row{display:flex;justify-content:space-between;align-items:center;padding:6px 0;
  font-size:13px;color:var(--muted);border-bottom:1px solid rgba(201,168,76,.15)}
.t-row:last-child{border-bottom:none;padding-top:12px;margin-top:4px}
.t-row.grand{font-family:'Playfair Display',serif;font-size:19px;font-weight:700;color:var(--ink)}
.t-row.grand span:last-child{color:var(--accent)}
.notes{background:var(--cream);border-radius:10px;padding:18px 22px;
  margin-bottom:32px;border-left:3px solid var(--gold)}
.notes h5{font-size:10px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;
  color:var(--gold);margin-bottom:7px}
.notes p{font-size:12px;color:var(--muted);line-height:1.7}
.ftr{background:var(--ink);padding:24px 52px;display:flex;justify-content:space-between;align-items:center}
.ftr p{font-size:11px;color:rgba(255,255,255,.4);line-height:1.6}
.ftr strong{color:rgba(255,255,255,.65)}
.stamp{display:inline-flex;align-items:center;gap:7px;background:rgba(201,168,76,.15);
  border:1px solid rgba(201,168,76,.3);border-radius:7px;padding:7px 14px;
  font-size:10px;color:var(--gold);font-weight:600}
.status-badge{display:inline-block;background:${remaining===0?'rgba(22,163,74,.15)':'rgba(139,26,26,.1)'};
  color:${remaining===0?'#16a34a':'#8B1A1A'};border:1px solid ${remaining===0?'rgba(22,163,74,.3)':'rgba(139,26,26,.25)'};
  padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:.5px;margin-bottom:6px}
@media print{body{background:#fff;padding:0}.page{box-shadow:none;border-radius:0;max-width:100%}}
</style>
</head>
<body>
<div class="page">
  <div class="hdr">
    <div class="hdr-inner">
      <div class="brand">
        <div class="logo">AK</div>
        <div class="brand-txt">
          <h1>AK Photography</h1>
          <p>Premium Visual Storytelling</p>
        </div>
      </div>
      <div class="meta">
        <div class="tag">Invoice</div>
        <div class="num">${quoteNo}</div>
        <div class="dt">Issued: ${dateStr}</div>
      </div>
    </div>
  </div>
  <div class="ribbon"></div>
  <div class="body">
    <div class="grid2">
      <div class="info-block">
        <h4>Billed To</h4>
        <div class="cname">${lead.client_name}</div>
        <p>📞 ${lead.phone}</p>
        <p>✉️ ${lead.email}</p>
      </div>
      <div class="info-block">
        <h4>Event Details</h4>
        <p>📍 ${lead.event_location}</p>
        <div class="chips">
          <span class="chip">🎭 ${lead.event_type}</span>
          <span class="chip">📅 ${_fmtDate(lead.event_start_date)} ${lead.event_start_session}</span>
          <span class="chip">🏁 ${_fmtDate(lead.event_end_date)} ${lead.event_end_session}</span>
        </div>
      </div>
    </div>
    <div class="tbl-wrap">
      <div class="tbl-title">Services &amp; Packages</div>
      <table>
        <thead>
          <tr>
            <th>Service / Package</th>
            <th class="tc">Qty</th>
            <th class="tr">Rate</th>
            <th class="tr">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${serviceRowsHTML}
          ${discRowHTML}
          ${gstRowHTML}
          <tr style="background:#fdf8f5">
            <td colspan="3" style="font-weight:700;color:var(--ink);font-size:14px">Total Amount</td>
            <td class="tr" style="color:var(--accent);font-size:16px;font-weight:800">₹${finalTotal.toLocaleString('en-IN')}</td>
          </tr>
          ${paidRowHTML}
        </tbody>
      </table>
    </div>
    <div class="totals">
      <div class="totals-box">
        <div class="t-row"><span>Subtotal</span><span>₹${subtotal.toLocaleString('en-IN')}</span></div>
        ${discAmt>0?`<div class="t-row"><span>Discount</span><span style="color:#16a34a">−₹${discAmt.toLocaleString('en-IN')}</span></div>`:''}
        ${gstAmt>0?`<div class="t-row"><span>GST (${p.gstRate}%)</span><span style="color:#2563eb">+₹${gstAmt.toLocaleString('en-IN')}</span></div>`:''}
        ${paidAmt>0?`<div class="t-row"><span>Advance Paid</span><span style="color:#16a34a">−₹${paidAmt.toLocaleString('en-IN')}</span></div>`:''}
        <div class="t-row grand"><span>Balance Due</span><span>₹${remaining.toLocaleString('en-IN')}</span></div>
      </div>
    </div>
    <div class="notes">
      <h5>Terms &amp; Notes</h5>
      <p>50% advance required to confirm booking. Balance due on event day. All packages include high-resolution digital delivery. Cancellation policy: 14 days notice required for full refund of advance.</p>
    </div>
  </div>
  <div class="ftr">
    <div><p><strong>AK Photography Studio</strong></p><p>Thank you for choosing us ✨</p></div>
    <div><div class="stamp">✦ Official Invoice</div></div>
  </div>
</div>
</body>
</html>`;

    const win = window.open('', '_blank');
    win.document.write(invoiceHTML);
    win.document.close();
    win.onload = () => setTimeout(() => win.print(), 500);
}

// ── EDIT LEAD FROM PREVIEW ────────────────────────────────────────
function lpEditLead() {
    const leadId = _acceptLeadId;
    _closePreviewModal();
    // Use existing openEditLead — it opens the modal with all fields pre-filled
    setTimeout(() => {
        openEditLead(leadId);
        // After editLead form loads, patch the submit button text
        setTimeout(() => {
            const submitBtn = document.querySelector('#leadForm .form-actions button[type="submit"]');
            if (submitBtn) {
                submitBtn.textContent = 'Save Changes';
                // After save, re-open the preview
                const origListener = submitBtn._lpPatchedHandler;
                if (!submitBtn._lpPatched) {
                    submitBtn._lpPatched = true;
                    submitBtn._lpPatchedHandler = function() {};
                    // We hook into the form submit success flow
                    // The existing form submit already calls openLeadSuccessModal and closes form
                    // We intercept by wrapping closeLeadForm
                    const _origClose = window.closeLeadForm;
                    window.closeLeadForm = function() {
                        _origClose();
                        // Re-fetch lead and reopen preview
                        setTimeout(() => {
                            fetch(`/leads/get/${leadId}/`)
                                .then(r => r.json())
                                .then(updated => {
                                    _acceptLeadData = updated;
                                    _buildAndShowPreview();
                                    window.closeLeadForm = _origClose; // restore
                                });
                        }, 300);
                    };
                }
            }
        }, 600);
    }, 300);
}

// ── CLOSE PREVIEW ─────────────────────────────────────────────────
function _closePreviewModal() {
    const modal = document.getElementById('leadPreviewModal');
    const wrap  = modal.querySelector('.lpm-wrap');
    wrap.classList.remove('in');
    setTimeout(() => modal.classList.remove('show'), 350);
}

function lpClosePreview() {
    // On close without accepting — revert card back to FOLLOW_UP/NEW
    const card = document.querySelector(`.card[data-id="${_acceptLeadId}"]`);
    if (card && card.closest('.column[data-status="ACCEPTED"]')) {
        const prevCol = document.querySelector('.column[data-status="FOLLOW_UP"]') ||
                        document.querySelector('.column[data-status="NEW"]');
        if (prevCol) {
            const head = prevCol.querySelector('.column-head');
            if (head && head.nextSibling) prevCol.insertBefore(card, head.nextSibling);
            else prevCol.appendChild(card);
        }
    }
    _closePreviewModal();
}

// ── LIVE PAYMENT PREVIEW ─────────────────────────────────────────
function lpMpLiveCalc() {
    const lead  = _acceptLeadData;
    const total = Number((lead.pricing_data && lead.pricing_data.finalTotal) || lead.total_amount || 0);
    const paid  = parseFloat(document.getElementById('lpMpPaidInput').value) || 0;
    const remaining = Math.max(0, total - paid);
    const pct   = total > 0 ? Math.min(100, Math.round(paid / total * 100)) : 0;

    const preview = document.getElementById('lpMpLivePreview');
    if (paid > 0) {
        preview.style.display = 'block';
        preview.innerHTML = `
            <span>Paid: ₹${paid.toLocaleString('en-IN')}</span>
            &nbsp;·&nbsp;
            <span>Remaining: ₹${remaining.toLocaleString('en-IN')}</span>
            &nbsp;·&nbsp;
            <span>${pct}% settled</span>
        `;
    } else {
        preview.style.display = 'none';
    }
}

// ── HELPERS ───────────────────────────────────────────────────────
function _fmtDate(d) {
    if (!d) return '—';
    try {
        const dt = new Date(d);
        return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
        return d;
    }
}
function _buildCardDateLine(services) {
    if (!services || services.length === 0) return '—';
    
    return services.map(svc => {
        const label = svc.label || svc.key;
        if (svc.dateTBD) return `${label}: TBD`;
        if (svc.eventDate) {
            try {
                const dt = new Date(svc.eventDate + 'T00:00:00');
                const fmt = dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                return `${label}: ${fmt}${svc.eventSession ? ' ' + svc.eventSession : ''}`;
            } catch { return `${label}: ${svc.eventDate}`; }
        }
        return `${label}: —`;
    }).join(' · ');
}

// ================================================================
// CARD DATE POPUP
// Add this block at the END of dragdrop.js
// (after all existing code, before the closing </script> if inline)
//
// What it does:
//   - Rewrites the date row on every .card to show first date / "TBD"
//   - Clicking the row opens a small popup listing all package dates
//   - No existing logic is touched — pure display enhancement
// ================================================================

(function () {

    // ── Singleton popup element ──────────────────────────────────
    let _popup = null;
    let _activeTrigger = null;

    function _getPopup() {
        if (!_popup) {
            _popup = document.createElement('div');
            _popup.className = 'card-dates-popup';
            _popup.innerHTML = `<div class="cdp-arrow"></div><div class="cdp-inner"></div>`;
            document.body.appendChild(_popup);

            // Close on outside click
            document.addEventListener('click', function (e) {
                if (_popup && !_popup.contains(e.target) &&
                    _activeTrigger && !_activeTrigger.contains(e.target)) {
                    _hidePopup();
                }
            }, true);

            // Close on scroll
            document.addEventListener('scroll', _hidePopup, true);
        }
        return _popup;
    }

    function _hidePopup() {
        if (!_popup) return;
        _popup.classList.remove('cdp-visible');
        if (_activeTrigger) _activeTrigger.classList.remove('open');
        _activeTrigger = null;
    }

    // ── Show popup anchored below a trigger element ──────────────
    function _showPopup(triggerEl, services, clientName) {
        // If same trigger clicked twice → toggle off
        if (_activeTrigger === triggerEl) {
            _hidePopup();
            return;
        }

        _hidePopup();
        _activeTrigger = triggerEl;
        triggerEl.classList.add('open');

        const pop = _getPopup();
        const inner = pop.querySelector('.cdp-inner');
        inner.innerHTML = _buildPopupHTML(services, clientName);

        // Position: below trigger
        document.body.appendChild(pop);
        const rect = triggerEl.getBoundingClientRect();
        pop.style.visibility = 'hidden';
        pop.style.display = 'block';

        // Measure then position
        requestAnimationFrame(() => {
            const pw = pop.offsetWidth;
            const ph = pop.offsetHeight;
            const vw = window.innerWidth;
            const vh = window.innerHeight;

            let top = rect.bottom + 8;
            let left = rect.left;

            // Flip up if not enough space below
            if (top + ph > vh - 10) {
                top = rect.top - ph - 8;
                pop.querySelector('.cdp-arrow').style.cssText =
                    `top:auto;bottom:-6px;transform:rotate(225deg);border-radius:0 0 2px 0`;
            } else {
                pop.querySelector('.cdp-arrow').style.cssText =
                    `top:-6px;bottom:auto;transform:rotate(45deg);border-radius:2px 0 0 0`;
            }

            // Clamp right edge
            if (left + pw > vw - 12) left = vw - pw - 12;
            if (left < 8) left = 8;

            pop.style.left = left + 'px';
            pop.style.top  = top  + 'px';
            pop.style.visibility = 'visible';

            requestAnimationFrame(() => pop.classList.add('cdp-visible'));
        });
    }

    // ── Build popup inner HTML ───────────────────────────────────
    function _buildPopupHTML(services, clientName) {
        if (!services || services.length === 0) {
            return `
                <div class="cdp-header">
                    ${_headerIconHTML()}
                    <div><div class="cdp-header-text">Event Dates</div></div>
                </div>
                <div class="cdp-empty">No package dates saved yet</div>
            `;
        }

        const rows = services.map(svc => {
            const label = svc.label || svc.key || '—';
            const isTBD = svc.dateTBD === true || svc.dateTBD === 'true';
            const date  = svc.eventDate;
            const sess  = svc.eventSession;

            let dateHTML = '';
            if (isTBD) {
                dateHTML = `<span class="cdp-tbd-badge">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    TBD
                </span>`;
            } else if (date) {
                const fmt = _fmtDateShort(date);
                const sessHTML = sess
                    ? `<span class="cdp-session-pill">${sess}</span>`
                    : '';
                dateHTML = `<span class="cdp-date-val">${fmt}${sessHTML}</span>`;
            } else {
                dateHTML = `<span style="color:#9ca3af;font-size:11px">No date set</span>`;
            }

            return `
                <div class="cdp-row">
                    <div class="cdp-dot ${isTBD ? 'cdp-dot--tbd' : ''}"></div>
                    <div class="cdp-row-content">
                        <div class="cdp-pkg-label">${label}</div>
                        ${dateHTML}
                    </div>
                </div>
            `;
        }).join('');

        const confirmedCount = services.filter(s => !s.dateTBD && s.eventDate).length;
        const subText = confirmedCount === services.length
            ? `${confirmedCount} date${confirmedCount !== 1 ? 's' : ''} confirmed`
            : `${confirmedCount} of ${services.length} confirmed`;

        return `
            <div class="cdp-header">
                ${_headerIconHTML()}
                <div>
                    <div class="cdp-header-text">Event Dates</div>
                    <div class="cdp-header-sub">${subText}</div>
                </div>
            </div>
            ${rows}
        `;
    }

    function _headerIconHTML() {
        return `
            <div class="cdp-header-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
                     stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8"  y1="2" x2="8"  y2="6"/>
                    <line x1="3"  y1="10" x2="21" y2="10"/>
                </svg>
            </div>
        `;
    }

    function _fmtDateShort(d) {
        try {
            const dt = new Date(d + 'T00:00:00');
            return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch { return d; }
    }

    // ── Get first display date for card row ──────────────────────
    function _getFirstDateDisplay(services) {
        if (!services || services.length === 0) return null;

        // First confirmed (non-TBD) date
        const confirmed = services.filter(s => !s.dateTBD && s.eventDate);
        if (confirmed.length > 0) {
            // Sort by date
            confirmed.sort((a, b) => a.eventDate.localeCompare(b.eventDate));
            const s = confirmed[0];
            return _fmtDateShort(s.eventDate) + (s.eventSession ? ' · ' + s.eventSession : '');
        }

        // All TBD
        if (services.every(s => s.dateTBD)) {
            return 'All dates TBD';
        }

        return null; // fall back to legacy event_start_date
    }

    // ── Patch a single card's date row ───────────────────────────
    function _patchCardDateRow(card) {
        // Already patched?
        if (card.dataset.datePatchDone === '1') return;

        // Read selected_services from the data attribute we'll add,
        // OR fall back to global window.selectedPackageServices if this is
        // the card being built right now (injectNewLeadCard path).
        let services = null;
        try {
            const raw = card.dataset.selectedServices;
            if (raw) services = JSON.parse(raw);
        } catch (e) {}

        if (!services || services.length === 0) return;

        // Check if any has eventDate or dateTBD set
        const hasDateData = services.some(s => s.eventDate || s.dateTBD);
        if (!hasDateData) return;

        // Find the calendar date row — the one with the 📅 or calendar svg img
        const rows = card.querySelectorAll('.card-row');
        let dateRow = null;
        rows.forEach(r => {
            const text = r.innerText || '';
            // Identify it by presence of session keywords or date pattern
            if (
                r.querySelector('img[src*="calender"]') ||
                r.querySelector('img[src*="calendar"]') ||
                /\d{4}[-/]\d{2}[-/]\d{2}/.test(text) ||
                /Morning|Evening/.test(text) ||
                text.includes('–') ||
                text.includes('TBD')
            ) {
                dateRow = r;
            }
        });

        if (!dateRow) return;

        const firstDisplay = _getFirstDateDisplay(services);
        const calSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;opacity:0.6"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
        const chevronSvg = `<svg class="cdt-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;

        // Preserve any leading <img> the template puts in
        const existingImg = dateRow.querySelector('img');
        const imgHTML = existingImg ? existingImg.outerHTML : calSvg;

        // Replace row contents with trigger
        dateRow.innerHTML = `
            <div class="card-date-trigger" role="button" tabindex="0" aria-label="View event dates">
                ${imgHTML}
                <span class="cdt-main">${firstDisplay || dateRow.innerText.trim() || '—'}</span>
                ${chevronSvg}
            </div>
        `;

        const trigger = dateRow.querySelector('.card-date-trigger');
        trigger.addEventListener('click', function (e) {
            e.stopPropagation();
            _showPopup(trigger, services, card.querySelector('.card-title')?.textContent?.trim());
        });
        trigger.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                _showPopup(trigger, services, card.querySelector('.card-title')?.textContent?.trim());
            }
        });

        card.dataset.datePatchDone = '1';
    }

    // ── Patch all cards currently in DOM ─────────────────────────
    function patchAllCards() {
        document.querySelectorAll('.card[data-selected-services]').forEach(_patchCardDateRow);
    }

    // ── Expose so injectNewLeadCard can call after building ──────
    window._patchCardDateRow = _patchCardDateRow;
    window._patchAllCards    = patchAllCards;

    // ── Run on DOM ready ─────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', patchAllCards);

    // ── MutationObserver: patch cards injected dynamically ───────
    const _cardObserver = new MutationObserver(mutations => {
        mutations.forEach(m => {
            m.addedNodes.forEach(node => {
                if (node.nodeType === 1) {
                    if (node.classList && node.classList.contains('card') && node.dataset.selectedServices) {
                        _patchCardDateRow(node);
                    }
                    node.querySelectorAll && node.querySelectorAll('.card[data-selected-services]')
                        .forEach(_patchCardDateRow);
                }
            });
        });
    });
    _cardObserver.observe(document.body, { childList: true, subtree: true });

})();