/* ================= CSRF ================= */
const csrfToken = document.querySelector(
  'input[name="csrfmiddlewaretoken"]'
)?.value;

const submitLocks = {};

function withSubmitLock(key, btn, asyncFn) {
  if (submitLocks[key]) return; // 🔒 block duplicate
  submitLocks[key] = true;

  const originalText = btn?.innerText;
  if (btn) {
    btn.disabled = true;
    btn.innerText = "Please wait...";
  }

  Promise.resolve(asyncFn())
    .catch(err => {
      console.error(err);
      alert("Something went wrong. Please try again.");
    })
    .finally(() => {
      submitLocks[key] = false;
      if (btn) {
        btn.disabled = false;
        btn.innerText = originalText;
      }
    });
}
  let currentInvoiceId = null;

document.addEventListener("DOMContentLoaded", () => {
function renderInvoice(data) {
  document.getElementById("serviceList").innerHTML =
     renderServiceHeader() +
    data.items.map(renderServiceRow).join("");

  document.getElementById("invSubtotal").innerText = `₹${data.subtotal}`;
  document.getElementById("invTotal").innerText = `₹${data.total}`;
  injectTaxUI();
}
/* ================= ELEMENTS ================= */
const popup = document.getElementById("invoicePopup");
const overlay = document.getElementById("overlay");
const openBtn = document.getElementById("newInvoiceBtn");
const closeBtn = document.getElementById("closePopup");
const nextBtn = document.getElementById("nextBtn");
const input = document.getElementById("clientInput");
const errorMsg = document.getElementById("errorMsg");



/* ================= POPUP ================= */
function openPopup() {
  popup.classList.remove("hidden");
  overlay.classList.remove("hidden");
  resetForm();
}

function closePopup() {
  popup.classList.add("hidden");
  overlay.classList.add("hidden");
  resetForm();
}

function resetForm() {
  input.value = "";
  input.classList.remove("error");
  errorMsg.textContent = "";
}

function showError(msg) {
  errorMsg.textContent = msg;
  input.classList.add("error");
}

function clearError() {
  errorMsg.textContent = "";
  input.classList.remove("error");
}

/* ================= EVENTS ================= */
openBtn.addEventListener("click", openPopup);
closeBtn.addEventListener("click", closePopup);
overlay.addEventListener("click", closePopup);

/* ================= INPUT VALIDATION ================= */
input.addEventListener("input", () => {
  const value = input.value.trim();
  if (!value) return clearError();

  const allowed = /^[a-zA-Z0-9 &.]+$/;
  if (!allowed.test(value)) {
    showError("Special characters are not allowed");
  } else {
    clearError();
  }
});

// /* ================= NEXT (CREATE INVOICE) ================= */
// nextBtn.addEventListener("click", () => {
//   const value = input.value.trim();

//   if (!value) return showError("Please enter client name or project ID");
//   if (value.length < 3) return showError("Enter valid characters");

//   const projectIdMatch = value.match(/^[a-zA-Z]{1,5}\s?(\d+)$/);

//   if (!projectIdMatch) {
//     showError("Enter a valid project ID (ex: AK 45)");
//     return;
//   }

//   const projectId = projectIdMatch[1];

//   fetch("/invoice/create/", {
//     method: "POST",
//     headers: { "X-CSRFToken": csrfToken },
//     body: new URLSearchParams({ project_id: projectId })
//   })
//     .then(r => r.json())
//     .then(data => {
//   clearError(); // ✅ IMPORTANT

//   currentInvoiceId = data.invoice_id;

// document.getElementById("invClient").innerText = data.client;
// document.getElementById("invEmail").innerText = data.email || "";
//  renderInvoice(data);

//   document.getElementById("invoiceModal").classList.remove("hidden");

//   closePopup();
// })

//     .catch(() => showError("Project not found"));
// });

nextBtn.addEventListener("click", () => {
  withSubmitLock("create-invoice", nextBtn, async () => {
    const value = input.value.trim();

    if (!value) return showError("Please enter client name or project ID");

    const projectIdMatch = value.match(/^[a-zA-Z]{1,5}\s?(\d+)$/);
    if (!projectIdMatch) return showError("Enter a valid project ID");

    const projectId = projectIdMatch[1];

    const r = await fetch("/invoice/create/", {
      method: "POST",
      headers: { "X-CSRFToken": csrfToken },
      body: new URLSearchParams({ project_id: projectId })
    });

    const data = await r.json();

    currentInvoiceId = data.invoice_id;
    document.getElementById("invClient").innerText = data.client;
    document.getElementById("invEmail").innerText = data.email || "";
    renderInvoice(data);

    document.getElementById("invoiceModal").classList.remove("hidden");
    closePopup();
  });
});

/* ================= ADD ITEM ================= */
function saveItem() {
  const select = document.getElementById("serviceSelect");
  const qtyInput = document.getElementById("qtyInput");

  const selectedKey = select.value;
  let selectedService = null;

  Object.values(SERVICE_CATALOG).forEach(group => {
    group.forEach(service => {
      if (service.key === selectedKey) {
        selectedService = service;
      }
    });
  });

  if (!selectedService || !currentInvoiceId) return;

  fetch("/invoice/add-item/", {
    method: "POST",
    headers: {
      "X-CSRFToken": csrfToken,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      invoice_id: currentInvoiceId,
      service_key: selectedService.key,
      service_label: selectedService.label,
      quantity: qtyInput.value || 1,
      unit_price: selectedService.price || 0,
      members: JSON.stringify(selectedService.members || {})
    })
  })
    .then(r => r.json())
    .then(renderInvoice)
    .then(() => {
      document.getElementById("addItemPopup").classList.remove("active");
      qtyInput.value = 1;
    });
}

/* ================= RENDER SERVICE ROW ================= */
function renderServiceRow(item) {
  const crew = item.members?.crew || [];
  const deliverables = item.members?.deliverables || [];

  // PACKAGE
  if (crew.length) {
    return `
      <div class="package-card">
        <div class="package-main">
          <div class="packgage-item">
            <div class="pkg-title">${item.label}</div>
            <ul class="pkg-list">
              ${crew.map(c => `<li>1 ${c}</li>`).join("")}
            </ul>
          </div>

          <div class="pkg-qty">${item.qty}</div>
          <div class="pkg-price">₹ ${item.price}</div>
          <div class="pkg-amount">₹ ${item.amount}</div>
        </div>

        <div class="package-deliverables">
          ${deliverables.map(d => `
            <div class="deliverable-row">
              <div>${d}</div>
              <input type="number" value="1" min="1">
              <input type="number" value="0">
              <div class="del-amount">₹ 0</div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  // EXTRA ITEM
  return `
    <div class="package-card" style="background:#fff7f7;border-color:#f1c2c2">
      <div class="package-main">
        <div class="pkg-title">${item.label}</div>
        <div class="pkg-qty">${item.qty}</div>
        <div class="pkg-price">₹ ${item.price}</div>
        <div class="pkg-amount">₹ ${item.amount}</div>
      </div>
    </div>
  `;
}

/* ================= RENDER INVOICE (SINGLE SOURCE) ================= */


/* ================= UPDATE QTY ================= */
function updateQty(id, qty) {
  if (qty < 1) return;

  fetch("/invoice/update-qty/", {
    method: "POST",
    headers: { "X-CSRFToken": csrfToken },
    body: new URLSearchParams({
      item_id: id,
      quantity: qty
    })
  })
    .then(r => r.json())
    .then(renderInvoice);
}

/* ================= DELETE ITEM ================= */
function deleteItem(id) {
  fetch("/invoice/delete-item/", {
    method: "POST",
    headers: { "X-CSRFToken": csrfToken },
    body: new URLSearchParams({ item_id: id })
  })
    .then(r => r.json())
    .then(renderInvoice);
}
let isGeneratingInvoice = false;

document.querySelector(".generate-btn").onclick = function () {
  if (isGeneratingInvoice) return; // 🔒 block double click
  isGeneratingInvoice = true;

  const btn = this; // 🔥 reference clicked button
  btn.disabled = true;
  btn.innerText = "Generating...";

  const dueDate = document.getElementById("invDueDate").value;

  fetch("/invoice/generate/", {
    method: "POST",
    headers: { "X-CSRFToken": csrfToken },
    body: new URLSearchParams({
      invoice_id: currentInvoiceId,
      due_date: dueDate
    })
  })
    .then(() => fetch(`/invoice/preview/${currentInvoiceId}/`))
    .then(r => r.json())
    .then(data => {
      closeInvoice();
      openGeneratedInvoice(data);
    })
    .catch(() => {
      alert("Failed to generate invoice. Please try again.");
    })
    .finally(() => {
      // 🔓 unlock (only if modal still exists)
      isGeneratingInvoice = false;
      btn.disabled = false;
      btn.innerText = "GENERATE INVOICE";
    });
};

// /* ================= GENERATE INVOICE ================= */
// document.querySelector(".generate-btn").onclick = () => {
//   const dueDate = document.getElementById("invDueDate").value;
//   fetch("/invoice/generate/", {
//     method: "POST",
//     headers: { "X-CSRFToken": csrfToken },
//     body: new URLSearchParams({ invoice_id: currentInvoiceId,due_date: dueDate })
//   })
//     .then(() =>
//       fetch(`/invoice/preview/${currentInvoiceId}/`)
//     )
//     .then(r => r.json())
//     .then(data => {
//       closeInvoice();
//                    // close editor
//       openGeneratedInvoice(data);     // open preview
        
//     });
// };

/* ================= OPEN ADD ITEM ================= */
function openAddItem() {
  const select = document.getElementById("serviceSelect");
  select.innerHTML = "";

  Object.entries(SERVICE_CATALOG).forEach(([group, services]) => {
    const optgroup = document.createElement("optgroup");
    optgroup.label =
      group === "PRE" ? "Pre Production" :
      group === "POST" ? "Post Production" :
      "General / Add-ons";

    services.forEach(service => {
      const option = document.createElement("option");
      option.value = service.key;
      option.textContent = service.label;
      optgroup.appendChild(option);
    });

    select.appendChild(optgroup);
  });

  document.getElementById("addItemPopup").classList.add("active");
}
});

function closeInvoice() {
  document.getElementById("invoiceModal").classList.add("hidden");
}
/* ================= ADD ITEM LOGIC ================= */
function openAddItem() {
  document.getElementById("addItemModal").classList.remove("hidden");
}

function closeAddItem() {
  document.getElementById("addItemModal").classList.add("hidden");
  document.getElementById("addItemName").value = "";
  document.getElementById("addItemQty").value = 1;
  document.getElementById("addItemPrice").value = "";
}
function renderInvoice(data) {
  document.getElementById("serviceList").innerHTML =
    data.items.map(renderServiceRow).join("");

  document.getElementById("invSubtotal").innerText = `₹${data.subtotal}`;
  document.getElementById("invTotal").innerText = `₹${data.total}`;
  injectTaxUI();
}
// function confirmAddItem() {
//   const name = document.getElementById("addItemName").value.trim();
//   const qty = Number(document.getElementById("addItemQty").value);
//   const price = Number(document.getElementById("addItemPrice").value);

//   if (!name || qty < 1 || price < 0) return;

//   fetch("/invoice/add-item/", {
//     method: "POST",
//     headers: {
//       "X-CSRFToken": csrfToken,
//       "Content-Type": "application/x-www-form-urlencoded"
//     },
//     body: new URLSearchParams({
//       invoice_id: currentInvoiceId,
//       service_key: "EXTRA_" + Date.now(),
//       service_label: name,
//       quantity: qty,
//       unit_price: price,
//       members: JSON.stringify({})
//     })
//   })
//     .then(r => r.json())
//     .then(renderInvoice)
//     .then(closeAddItem);
// }
function confirmAddItem() {
  const btn = document.getElementById("addItemConfirmBtn"); // your submit button

  withSubmitLock("add-item", btn, async () => {
    const name = document.getElementById("addItemName").value.trim();
    const qty = Number(document.getElementById("addItemQty").value);
    const price = Number(document.getElementById("addItemPrice").value);

    if (!name || qty < 1 || price < 0) return;

    const r = await fetch("/invoice/add-item/", {
      method: "POST",
      headers: {
        "X-CSRFToken": csrfToken,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        invoice_id: currentInvoiceId,
        service_key: "EXTRA_" + Date.now(),
        service_label: name,
        quantity: qty,
        unit_price: price,
        members: JSON.stringify({})
      })
    });

    const data = await r.json();
    renderInvoice(data);
    closeAddItem();
  });
}
function renderServiceRow(item) {
  const crew = item.members?.crew || [];
  const deliverables = item.members?.deliverables || [];

  // PACKAGE
  if (crew.length) {
    return `
      <div class="package-card">
        <div class="package-main">
          <div>
            <div class="pkg-title">${item.label}</div>
            <ul class="pkg-list">
              ${crew.map(c => `<li>1 ${c}</li>`).join("")}
            </ul>
          </div>

          <div class="pkg-qty">${item.qty}</div>
          <div class="pkg-price">₹ ${item.price}</div>
          <div class="pkg-amount">₹ ${item.amount}</div>
        </div>

        <div class="package-deliverables">
          ${deliverables.map(d => `
            <div class="deliverable-row">
              <div>${d}</div>
              <input type="number" value="1" min="1">
              <input type="number" value="0">
              <div class="del-amount">₹ 0</div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  // EXTRA ITEM
  return `
    <div class="package-card" style="background:#fff7f7;border-color:#f1c2c2">
      <div class="package-main">
        <div class="pkg-title">${item.label}</div>
        <div class="pkg-qty">${item.qty}</div>
        <div class="pkg-price">₹ ${item.price}</div>
        <div class="pkg-amount">₹ ${item.amount}</div>
      </div>
    </div>
  `;
}

// generated readonly invoice script
function openGeneratedInvoice(data) {
  document.getElementById("giClientTitle").innerText =
    `${data.client} – INVOICE`;

  document.getElementById("giInvoiceCode").innerText = "AK-" + data.invoice_id;
  document.getElementById("giInvoiceNo").innerText = "AK-" + data.invoice_id;

  document.getElementById("giClient").innerText = data.client;
  document.getElementById("giEmail").innerText = data.email || "";
  document.getElementById("giLocation").innerText = data.location || "";

  document.getElementById("giPaid").innerText = data.paid;
  document.getElementById("giDue").innerText = data.total - data.paid;
  document.getElementById("giDueDate").innerText = data.due_date;

  document.getElementById("giGrandTotal").innerText = data.total;

  document.getElementById("giTableBody").innerHTML =
    data.rows.map(r => `
      <tr>
        <td>${r.label}</td>
        <td>₹ ${r.charge}</td>
        <td>${r.hours}</td>
        <td>₹ ${r.total}</td>
      </tr>
    `).join("");

  document.getElementById("generatedInvoiceModal")
    .classList.remove("hidden");
}

function closeGeneratedInvoice() {
  document.getElementById("generatedInvoiceModal")
    .classList.add("hidden");
    window.location.href = "/project-invoice/";
}
function downloadInvoice() {
  const html = document.getElementById("invoicePrintable").outerHTML;

  fetch("/invoice/download/", {
    method: "POST",
    headers: {
      "X-CSRFToken": csrfToken,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      html: html,
      invoice_id: currentInvoiceId
    })
  })
  .then(res => res.blob())
  .then(blob => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AK-${currentInvoiceId}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
  });
}
function shareInvoice() {
  const pdfUrl = `${location.origin}/invoice/download/${currentInvoiceId}/`;
  const msg = `Invoice AK-${currentInvoiceId}\n\nPlease find your invoice PDF:\n${pdfUrl}`;

  window.open(
    `https://wa.me/?text=${encodeURIComponent(msg)}`,
    "_blank"
  );
 }
 function updateInvoiceStatus(id, status, el) {
  withSubmitLock(`status-${id}`, el, async () => {
    await fetch("/invoice/update-status/", {
      method: "POST",
      headers: { "X-CSRFToken": csrfToken },
      body: new URLSearchParams({ invoice_id: id, status })
    });
    location.reload();
  });
}
// function updateInvoiceStatus(id, status, el) {

//   // 🔹 UI helper (instant color change)
//   el.classList.remove("pending", "completed");

//   if (status === "PENDING") {
//     el.classList.add("pending");
//   } else {
//     el.classList.add("completed");
//   }

//   // 🔹 Backend update
//   fetch("/invoice/update-status/", {
//     method: "POST",
//     headers: { "X-CSRFToken": csrfToken },
//     body: new URLSearchParams({
//       invoice_id: id,
//       status: status
//     })
//   }).then(() => location.reload());
// }

function editInvoice(id) {
  currentInvoiceId = id;

  fetch(`/invoice/edit/${id}/`)
    .then(r => r.json())
    .then(data => {

      // Header
      document.getElementById("invClient").innerText = data.client;
      document.getElementById("invEmail").innerText = data.email || "";

      // Notes
      document.querySelector("textarea").value = data.notes || "";

      // Due date
      if (data.due_date) {
        document.getElementById("invDueDate").value =
          new Date(data.due_date).toISOString().slice(0, 10);
      }

      // FULL editor restore
      renderInvoice(data); // 🔥 uses data.items exactly as saved

      document.getElementById("invoiceModal").classList.remove("hidden");
    });
}

function renderServiceHeader() {
  return `
    <div class="package-card" >
      <div class="package-main" style="font-weight:600;color:#666">
        <div>SERVICE</div>
        <div style="text-align:center">QTY</div>
        <div style="text-align:center">PRICE</div>
        <div style="text-align:center">AMOUNT</div>
      </div>
    </div>
  `;
}
function injectTaxUI() {
  if (document.getElementById("taxInput")) return;

  const totalsBox = document.querySelector(".totals-box");

  const taxHTML = `
    <div id="taxRow" style="display:none">
      <span>Tax</span>
      <strong id="invTax">₹0</strong>
    </div>

    <div class="add-tax" id="taxInputRow">
      <input
        type="number"
        id="taxInput"
        placeholder="Add tax"
        style="width:90px;padding:4px"
      />
      <button id="applyTaxBtn" style="margin-left:8px">Apply</button>
    </div>
  `;

  totalsBox.insertAdjacentHTML("beforeend", taxHTML);

  document.getElementById("applyTaxBtn").onclick = () => {
    const value = document.getElementById("taxInput").value;
    if (!value || isNaN(value)) return;
    applyTax(Number(value));
  };
}
function applyTax(amount) {
  fetch("/invoice/apply-tax/", {
    method: "POST",
    headers: { "X-CSRFToken": csrfToken },
    body: new URLSearchParams({
      invoice_id: currentInvoiceId,
      tax: amount
    })
  })
    .then(r => r.json())
    .then(data => {
      document.getElementById("invSubtotal").innerText = `₹${data.subtotal}`;
      document.getElementById("invTax").innerText = `₹${data.tax}`;
      document.getElementById("invTotal").innerText = `₹${data.total}`;

      document.getElementById("taxRow").style.display = "flex";
      document.getElementById("taxInputRow").style.display = "none";
    });
}


// filter logics
function openFilters() {
  document.getElementById("filterDrawer").classList.add("open");
}

function closeFilters() {
  document.getElementById("filterDrawer").classList.remove("open");
}

function applyFilters() {
  const rows = document.querySelectorAll(".invoice-row");
  const today = new Date();

  rows.forEach(row => {
    let show = true;

    // 1️⃣ STATUS
    const statuses = [...document.querySelectorAll(".f-status:checked")].map(i => i.value);
    if (statuses.length && !statuses.includes(row.dataset.status)) show = false;

    // 2️⃣ CREATED DATE
    const from = document.getElementById("createdFrom").value;
    const to = document.getElementById("createdTo").value;
    if (from && row.dataset.created < from) show = false;
    if (to && row.dataset.created > to) show = false;

    // 3️⃣ DUE DATE
    const due = new Date(row.dataset.due);
    const dueFilter = document.getElementById("dueFilter").value;
    if (dueFilter === "today" && due.toDateString() !== today.toDateString()) show = false;
    if (dueFilter === "overdue" && due >= today) show = false;
    if (dueFilter === "next7" && (due < today || due > new Date(today.getTime()+7*86400000))) show = false;

    // 4️⃣ AMOUNT
    const amt = Number(row.dataset.amount);
    const min = Number(document.getElementById("minAmount").value || 0);
    const max = Number(document.getElementById("maxAmount").value || Infinity);
    if (amt < min || amt > max) show = false;

    // 5️⃣ PAYMENT
    const paid = Number(row.dataset.paid);
    if (document.getElementById("paymentState").value === "full" && paid < amt) show = false;
    if (document.getElementById("paymentState").value === "partial" && !(paid > 0 && paid < amt)) show = false;
    if (document.getElementById("paymentState").value === "none" && paid > 0) show = false;

    // 6️⃣ CLIENT
    const search = document.getElementById("clientSearch").value.toLowerCase();
    if (search && !row.dataset.client.includes(search)) show = false;

    // 7️⃣ EVENT TYPE
    const events = [...document.querySelectorAll(".f-event:checked")].map(e => e.value);
    if (events.length && !events.includes(row.dataset.event)) show = false;

    row.style.display = show ? "" : "none";
  });

  sortRows();
  closeFilters();
}

function sortRows() {
  const sort = document.getElementById("sortBy").value;
  const rows = [...document.querySelectorAll(".invoice-row")];

  const compare = {
    created_desc: (a,b)=>b.dataset.created.localeCompare(a.dataset.created),
    created_asc: (a,b)=>a.dataset.created.localeCompare(b.dataset.created),
    amount_desc: (a,b)=>b.dataset.amount-a.dataset.amount,
    amount_asc: (a,b)=>a.dataset.amount-b.dataset.amount,
    due_asc: (a,b)=>a.dataset.due.localeCompare(b.dataset.due),
  };

  rows
    .sort(compare[sort])
    .forEach(row => row.parentElement.appendChild(row));
}

function resetFilters() {
  document.querySelectorAll(".filter-body input, .filter-body select").forEach(el=>{
    if(el.type==="checkbox") el.checked=false;
    else el.value="";
  });
  applyFilters();
}