/* ================================================================
   PACKAGE EDITOR — TABLE LAYOUT PATCH (FIXED v3)
   Fixes:
   - EXACT same grid columns for header AND service row (perfect alignment)
   - Deliverables as horizontal wrapping pills (like Image 2)
   - Delete button properly inside the grid (no floating outside)
   - No logic changes
   ================================================================ */

(function () {
    'use strict';

    function waitAndPatch() {
        if (typeof buildEpPane !== 'function' ||
            typeof _editState === 'undefined' ||
            typeof PACKAGE_CATALOG === 'undefined') {
            setTimeout(waitAndPatch, 80);
            return;
        }
        patchPanel();
    }

    function patchPanel() {

        /* ── 1. CSS ─────────────────────────────────────────────── */
        if (!document.getElementById('ep-table-patch-styles')) {
            const style = document.createElement('style');
            style.id = 'ep-table-patch-styles';
            style.textContent = `

                /* ── Widen the panel ── */
                .pkg-edit-panel {
                    width: min(98vw, 1400px) !important;
                    max-width: 1400px !important;
                }

                /* ── Header bar ── */
                .pkg-ep-header-top {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 16px 24px 0;
                }
                .pkg-ep-total-bar {
                    font-size: 15px;
                    color: #1a1a2e;
                    font-weight: 500;
                }
                .pkg-ep-total-bar strong {
                    font-size: 20px;
                    font-weight: 700;
                    color: #1a1a2e;
                    margin-left: 4px;
                }
                .pkg-ep-save-top {
                    background: #22c55e;
                    color: #fff;
                    border: none;
                    border-radius: 8px;
                    padding: 10px 24px;
                    font-size: 13px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: background .2s, transform .15s;
                    box-shadow: 0 3px 10px rgba(34,197,94,.3);
                }
                .pkg-ep-save-top:hover { background: #16a34a; transform: translateY(-1px); }

                /* ================================================================
                   CRITICAL: Header and service-row use IDENTICAL grid columns
                   so every column header sits exactly above its content.
                   Columns: Service+Crew | Deliverables | Team Roles | Qty | Cost | SubTotal | Delete
                   ================================================================ */
                .ep-table-header,
                .ep-service-row {
                    display: grid;
                    grid-template-columns:
                        420px   /* Service Name & Crew */
                        320px   /* Deliverables */
                        180px   /* Team Roles */
                        60px    /* Qty */
                        130px   /* Service Cost */
                        130px   /* Sub Total */
                        40px;   /* Delete */
                    column-gap: 0;
                    align-items: start;
                }

                /* ── Table column header ── */
                .ep-table-header {
                    padding: 10px 0;
                    background: #f3f4f6;
                    border-radius: 8px 8px 0 0;
                    margin-bottom: 0;
                    font-size: 10px;
                    font-weight: 700;
                    letter-spacing: 0.8px;
                    text-transform: uppercase;
                    color: #6b7280;
                    border-bottom: 1.5px solid #e5e7eb;
                }
                .ep-table-header > span {
                    display: flex;
                    align-items: center;
                    padding: 0 14px;
                }
                .ep-table-header > span:nth-child(4) { justify-content: center; }
                .ep-table-header > span:nth-child(5),
                .ep-table-header > span:nth-child(6) { justify-content: flex-end; }
                .ep-table-header > span:nth-child(7) { justify-content: center; }

                /* ── Service row ── */
                .ep-service-row {
                    align-items: stretch;
                    background: #fff;
                    border: 1.5px solid #e5e7eb;
                    border-top: none;
                    margin-bottom: 0;
                }
                .ep-service-row + .ep-service-row {
                    border-top: 1px solid #e5e7eb;
                }

                /* Wrap header + row together */
                .ep-table-wrap {
                    border-radius: 10px;
                    overflow: hidden;
                    border: 1.5px solid #e5e7eb;
                    margin-bottom: 10px;
                }

                /* Every direct child of ep-service-row is a cell */
                .ep-service-row > div {
                    padding: 14px;
                    border-right: 1px solid #f0f0f0;
                    min-height: 80px;
                }
                .ep-service-row > div:last-child { border-right: none; }

                /* ── Crew animations ── */
                @keyframes epCrewIn {
                    from { opacity: 0; transform: translateX(-10px) scale(0.97); }
                    to   { opacity: 1; transform: translateX(0) scale(1); }
                }
                @keyframes epRoleIn {
                    from { opacity: 0; transform: scale(0.5); }
                    to   { opacity: 1; transform: scale(1); }
                }

                /* ── Cell 1: Service Name + Crew ── */
                .ep-svc-name-cell {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .ep-svc-title {
                    font-size: 14px;
                    font-weight: 700;
                    color: #1a1a2e;
                    margin-bottom: 2px;
                }
                .ep-svc-crew-list {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                /* ONE-LINE crew item */
                .ep-svc-crew-item {
                    display: flex;
                    align-items: center;
                    gap: 7px;
                    padding: 6px 10px;
                    background: #fafafa;
                    border: 1.5px solid #e5e7eb;
                    border-radius: 8px;
                    animation: epCrewIn .22s cubic-bezier(.34,1.4,.64,1) both;
                }
                .ep-svc-crew-item:hover {
                    border-color: #d1d5db;
                    box-shadow: 0 1px 4px rgba(0,0,0,.06);
                }
                .ep-crew-icon-sq {
                    width: 24px;
                    height: 24px;
                    border-radius: 5px;
                    background: #f3f4f6;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    font-size: 12px;
                }
                .ep-crew-role-sel {
                    flex: 1;
                    min-width: 0;
                    font-size: 12px;
                    border: 1.5px solid #e5e7eb;
                    border-radius: 6px;
                    padding: 3px 7px;
                    color: #374151;
                    background: #fff;
                    outline: none;
                    cursor: pointer;
                }
                .ep-crew-role-sel:focus { border-color: #22c55e; }
                .ep-crew-badge-included {
                    flex-shrink: 0;
                    font-size: 10px;
                    font-weight: 700;
                    color: #16a34a;
                    background: #dcfce7;
                    border: 1px solid #86efac;
                    border-radius: 20px;
                    padding: 2px 8px;
                    white-space: nowrap;
                }
                .ep-crew-stepper {
                    display: flex;
                    align-items: center;
                    border: 1.5px solid #e5e7eb;
                    border-radius: 7px;
                    overflow: hidden;
                    flex-shrink: 0;
                }
                .ep-crew-stepper button {
                    width: 24px;
                    height: 24px;
                    border: none;
                    background: #f9fafb;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 700;
                    color: #374151;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: background .12s, color .12s;
                    padding: 0;
                }
                .ep-crew-stepper button:hover { background: #22c55e; color: #fff; }
                .ep-crew-qty-val {
                    padding: 0 9px;
                    font-size: 13px;
                    font-weight: 700;
                    color: #1a1a2e;
                    min-width: 26px;
                    text-align: center;
                    display: inline-block;
                    transition: transform .18s cubic-bezier(.34,1.56,.64,1), color .15s;
                }
                .ep-crew-del-btn {
                    width: 20px;
                    height: 20px;
                    border: 1.5px solid #e5e7eb;
                    border-radius: 4px;
                    background: none;
                    cursor: pointer;
                    font-size: 9px;
                    color: #9ca3af;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    transition: all .15s;
                }
                .ep-crew-del-btn:hover { border-color: #ef4444; color: #ef4444; background: #fef2f2; }

                /* Extra price row */
                .ep-crew-extra-price {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    padding: 3px 10px 4px 40px;
                }
                .ep-crew-price-lbl {
                    font-size: 11px;
                    color: #b45309;
                    white-space: nowrap;
                }
                .ep-crew-price-inp {
                    width: 85px;
                    border: 1.5px solid #fcd34d;
                    border-radius: 6px;
                    padding: 3px 7px;
                    font-size: 11px;
                    outline: none;
                    background: #fffbeb;
                }

                /* Add Crew button */
                .ep-svc-action-btn {
                    font-size: 11px;
                    font-weight: 600;
                    color: #16a34a;
                    background: none;
                    border: 1.5px dashed #86efac;
                    border-radius: 7px;
                    padding: 5px 12px;
                    cursor: pointer;
                    align-self: flex-start;
                    transition: all .15s;
                    margin-top: 2px;
                }
                .ep-svc-action-btn:hover { background: #f0fdf4; border-color: #16a34a; }

                /* ── Cell 2: Deliverables ──
                   HORIZONTAL wrapping pills — same as Image 2
                ── */
                .ep-dels-cell {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .ep-dels-title {
                    font-size: 10px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.6px;
                    color: #9ca3af;
                    margin-bottom: 2px;
                }

                /* Chips wrap HORIZONTALLY — matches Image 2 exactly */
                .ep-svc-dels {
                    display: flex;
                    flex-direction: row;  /* horizontal */
                    flex-wrap: wrap;       /* wrap to next line if needed */
                    gap: 6px;
                    align-items: flex-start;
                }

                /* Individual chip — pill style like Image 2 */
                .ep-svc-del-tag {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 11.5px;
                    font-weight: 500;
                    padding: 4px 10px;
                    border-radius: 20px;
                    white-space: nowrap;
                    animation: epCrewIn .18s ease both;
                    cursor: default;
                }
                .ep-svc-del-tag.base {
                    background: #f0fdf4;
                    color: #16a34a;
                    border: 1px solid #86efac;
                }
                .ep-svc-del-tag.extra {
                    background: #fffbeb;
                    color: #b45309;
                    border: 1px solid #fcd34d;
                }
                .ep-chip-rm {
                    cursor: pointer;
                    opacity: 0.5;
                    font-size: 10px;
                    line-height: 1;
                    transition: opacity .15s;
                    margin-left: 2px;
                }
                .ep-chip-rm:hover { opacity: 1; }

                /* Add deliverable inline form */
                .ep-del-inline-form {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    padding: 8px;
                    background: #f9fafb;
                    border: 1.5px solid #e5e7eb;
                    border-radius: 8px;
                }
                .ep-mini-input {
                    border: 1.5px solid #e5e7eb;
                    border-radius: 6px;
                    padding: 5px 9px;
                    font-size: 12px;
                    font-family: inherit;
                    outline: none;
                    width: 100%;
                    box-sizing: border-box;
                }
                .ep-mini-input:focus { border-color: #22c55e; }
                .ep-inline-btns {
                    display: flex;
                    gap: 6px;
                    justify-content: flex-end;
                }
                .ep-btn-ghost {
                    padding: 4px 10px;
                    border-radius: 6px;
                    background: none;
                    border: 1px solid #e5e7eb;
                    color: #6b7280;
                    font-size: 11px;
                    font-weight: 600;
                    cursor: pointer;
                }
                .ep-btn-add {
                    padding: 5px 14px;
                    border-radius: 6px;
                    background: #22c55e;
                    color: #fff;
                    border: none;
                    font-size: 11px;
                    font-weight: 700;
                    cursor: pointer;
                }

                /* ── Cell 3: Team Roles ── */
                .ep-roles-cell {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 8px;
                }
                .ep-roles-title {
                    font-size: 10px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.6px;
                    color: #9ca3af;
                    margin-bottom: 2px;
                }
                .ep-roles-circles {
                    display: flex;
                    flex-direction: row;
                    flex-wrap: wrap;
                    gap: 8px;
                    align-items: flex-start;
                }
                .ep-role-circle-wrap {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 3px;
                    position: relative;
                    animation: epRoleIn .22s cubic-bezier(.34,1.56,.64,1) both;
                }
                .ep-role-circle-btn {
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    border: 2px solid currentColor;
                    background: #fff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 10px;
                    font-weight: 800;
                    cursor: default;
                    position: relative;
                    transition: transform .15s;
                }
                .ep-role-circle-wrap:hover .ep-role-circle-btn { transform: scale(1.08); }
                .ep-role-rm {
                    position: absolute;
                    top: -4px;
                    right: -4px;
                    width: 14px;
                    height: 14px;
                    border-radius: 50%;
                    background: #ef4444;
                    color: #fff;
                    font-size: 8px;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    opacity: 0;
                    transition: opacity .15s;
                    z-index: 1;
                }
                .ep-role-circle-wrap:hover .ep-role-rm { opacity: 1; }
                .ep-role-abbr-lbl {
                    font-size: 9px;
                    font-weight: 700;
                    color: #6b7280;
                }
                .ep-add-team-role-link {
                    font-size: 11px;
                    font-weight: 600;
                    color: #16a34a;
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 0;
                    opacity: 0.8;
                    transition: opacity .15s;
                    text-decoration: underline;
                    text-underline-offset: 2px;
                    white-space: nowrap;
                }
                .ep-add-team-role-link:hover { opacity: 1; }

                /* ── Cell 4: Qty ── */
                .ep-qty-cell {
                    display: flex;
                    justify-content: center;
                    align-items: flex-start;
                    padding-top: 18px !important;
                }
                .ep-qty-fixed {
                    font-size: 14px;
                    font-weight: 700;
                    color: #374151;
                }

                /* ── Cell 5: Service Cost ── */
                .ep-cost-cell {
                    display: flex;
                    justify-content: flex-end;
                    align-items: flex-start;
                    padding-top: 18px !important;
                }
                .ep-cost-val {
                    font-size: 13px;
                    font-weight: 600;
                    color: #374151;
                    text-align: right;
                }

                /* ── Cell 6: Sub Total ── */
                .ep-subtotal-cell {
                    display: flex;
                    justify-content: flex-end;
                    align-items: flex-start;
                    padding-top: 18px !important;
                }
                .ep-subtotal-val {
                    font-size: 13px;
                    font-weight: 700;
                    color: #1a1a2e;
                    text-align: right;
                }

                /* ── Cell 7: Delete — INSIDE the grid, properly aligned ── */
                .ep-del-cell {
                    display: flex;
                    justify-content: center;
                    align-items: flex-start;
                    padding-top: 16px !important;
                    border-right: none !important;
                }
                .ep-svc-del-btn {
                    width: 24px;
                    height: 24px;
                    border: 1.5px solid #e5e7eb;
                    border-radius: 50%;
                    background: none;
                    cursor: pointer;
                    font-size: 10px;
                    color: #9ca3af;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all .15s;
                    flex-shrink: 0;
                }
                .ep-svc-del-btn:hover {
                    border-color: #ef4444;
                    color: #ef4444;
                    background: #fef2f2;
                    transform: scale(1.1);
                }

                /* ── Pricing section ── */
                .ep-pricing-section { margin-top: 12px; }
                .ep-pricing-box {
                    background: #fdf6e3;
                    border: 1.5px solid rgba(201,168,76,.3);
                    border-radius: 10px;
                    padding: 14px 18px;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                .ep-price-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 13px;
                    color: #6b7280;
                }
                .ep-price-row.ep-price-total {
                    font-weight: 700;
                    color: #1a1a2e;
                    border-top: 1.5px solid rgba(201,168,76,.3);
                    padding-top: 8px;
                    margin-top: 4px;
                }
                .ep-price-crew-desc {
                    font-size: 11px;
                    color: #9ca3af;
                    font-weight: 400;
                    margin-left: 4px;
                }
                .ep-crew-charge-lbl {
                    font-size: 11px;
                    color: #9ca3af;
                    margin-left: 4px;
                }

                /* ── Role dropdown ── */
                .ep-role-dropdown {
                    position: fixed;
                    z-index: 9999;
                    background: #fff;
                    border: 1.5px solid #e5e7eb;
                    border-radius: 10px;
                    box-shadow: 0 8px 28px rgba(0,0,0,.13);
                    padding: 6px;
                    min-width: 210px;
                    animation: epCrewIn .15s ease both;
                }
                .ep-role-dropdown-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px 10px;
                    border-radius: 7px;
                    cursor: pointer;
                    font-size: 13px;
                    color: #374151;
                    transition: background .12s;
                }
                .ep-role-dropdown-item:hover { background: #f0fdf4; }
                .ep-role-dd-dot {
                    width: 22px;
                    height: 22px;
                    border-radius: 50%;
                    color: #fff;
                    font-size: 9px;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
            `;
            document.head.appendChild(style);
        }

        /* ── 2. Header ── */
        const _origBuildEditPanel = window.buildEditPanel;
        window.buildEditPanel = function () {
            _origBuildEditPanel.apply(this, arguments);
            const headerTop = document.querySelector('.pkg-ep-header-top');
            if (headerTop) {
                const total = _calcGrandTotal();
                headerTop.innerHTML = `
                    <div class="pkg-ep-total-bar">
                        Service Total Cost : <strong id="pkg-ep-header-total">₹ ${total.toLocaleString('en-IN')}</strong>
                    </div>
                    <button type="button" class="pkg-ep-save-top" onclick="savePkgEditPanel()">Save Service</button>
                `;
            }
        };

        /* ── 3. Footer total sync ── */
        const _origUpdateEpFooterTotal = window.updateEpFooterTotal;
        window.updateEpFooterTotal = function () {
            _origUpdateEpFooterTotal.apply(this, arguments);
            const el = document.getElementById('pkg-ep-header-total');
            if (el) el.textContent = '₹ ' + _calcGrandTotal().toLocaleString('en-IN');
        };

        /* ── 4. Main pane builder ── */
        window.buildEpPane = function (key) {
            const state  = _editState[key];
            const pkg    = PACKAGE_CATALOG[key];
            const pkgTot = _pkgTotal(key);

            const pane = document.createElement('div');
            pane.className = 'ep-pane';
            pane.id = 'eppane-' + key;

            /* Wrap in a table-wrap div for proper rounded border */
            const tableWrap = document.createElement('div');
            tableWrap.className = 'ep-table-wrap';

            /* Header row — 7 columns, SAME grid as service row */
            tableWrap.innerHTML = `
                <div class="ep-table-header">
                    <span>Service Name &amp; Crew</span>
                    <span>Deliverables</span>
                    <span>Team Roles</span>
                    <span class="tc">Qty</span>
                    <span class="tr">Service Cost</span>
                    <span class="tr">Sub Total</span>
                    <span></span>
                </div>
            `;

            /* Service row — SAME 7 columns */
            const row = document.createElement('div');
            row.className = 'ep-service-row';
            row.id = 'ep-svcrow-' + key;

            /* Cell 1: Name + Crew */
            const nameCell = document.createElement('div');
            nameCell.className = 'ep-svc-name-cell';
            nameCell.id = 'ep-namecell-' + key;
            _buildNameCell(key, nameCell);
            row.appendChild(nameCell);

            /* Cell 2: Deliverables */
            const delsCell = document.createElement('div');
            delsCell.className = 'ep-dels-cell';
            delsCell.id = 'ep-delscell-' + key;
            _buildDelsCell(key, delsCell);
            row.appendChild(delsCell);

            /* Cell 3: Team Roles */
            const rolesCell = document.createElement('div');
            rolesCell.className = 'ep-roles-cell';
            rolesCell.id = 'ep-rolescell-' + key;
            _buildRolesCell(key, rolesCell);
            row.appendChild(rolesCell);

            /* Cell 4: Qty */
            const qtyCell = document.createElement('div');
            qtyCell.className = 'ep-qty-cell';
            qtyCell.innerHTML = `<span class="ep-qty-fixed">1</span>`;
            row.appendChild(qtyCell);

            /* Cell 5: Service Cost */
            const costCell = document.createElement('div');
            costCell.className = 'ep-cost-cell';
            costCell.innerHTML = `<span class="ep-cost-val" id="ep-cost-${key}">INR ${pkgTot.toLocaleString('en-IN')}</span>`;
            row.appendChild(costCell);

            /* Cell 6: Sub Total */
            const subCell = document.createElement('div');
            subCell.className = 'ep-subtotal-cell';
            subCell.innerHTML = `<span class="ep-subtotal-val" id="ep-sub-${key}">INR ${pkgTot.toLocaleString('en-IN')}</span>`;
            row.appendChild(subCell);

            /* Cell 7: Delete — INSIDE the grid */
            const delCell = document.createElement('div');
            delCell.className = 'ep-del-cell';
            delCell.innerHTML = `<button type="button" class="ep-svc-del-btn" title="Remove package"
                onclick="_removePkgFromEditor('${key}')">✕</button>`;
            row.appendChild(delCell);

            tableWrap.appendChild(row);
            pane.appendChild(tableWrap);

            /* Pricing breakdown */
            const priceDiv = document.createElement('div');
            priceDiv.className = 'ep-pricing-section';
            priceDiv.id = 'ep-pricing-section-' + key;
            _buildPricingSection(key, priceDiv);
            pane.appendChild(priceDiv);

            return pane;
        };

        /* Remove package helper */
        window._removePkgFromEditor = function (key) {
            removePkgTag(key);
            closePkgEditPanel();
            if (_selectedKeys.length > 0) setTimeout(() => openPackageEditor(), 100);
        };

        /* ================================================================
           NAME CELL
           ================================================================ */
        window._buildNameCell = function (key, cell) {
            const state = _editState[key];
            const pkg   = PACKAGE_CATALOG[key];

            let html = `<div class="ep-svc-title">${pkg.label}</div>
                        <div class="ep-svc-crew-list" id="ep-crew-list-${key}">`;
            state.crew.forEach((c, i) => { html += _crewItemHTML(key, i, c); });
            html += `</div>
                <button type="button" class="ep-svc-action-btn" onclick="_epAddCrewRow('${key}')">+ Add Crew</button>
            `;
            cell.innerHTML = html;
        };

        function _crewItemHTML(key, i, c) {
            const isExtra  = c.isExtra || (c.qty > c.baseQty);
            const extraQty = c.isExtra ? c.qty : Math.max(0, c.qty - c.baseQty);
            const badge    = (!c.isExtra && c.qty <= c.baseQty)
                ? `<span class="ep-crew-badge-included">INCLUDED</span>` : '';

            const priceRow = isExtra ? `
                <div class="ep-crew-extra-price">
                    <span class="ep-crew-price-lbl">
                        ${c.isExtra ? `+${c.qty} person${c.qty > 1 ? 's' : ''} × ₹` : `+${extraQty} extra × ₹`}
                    </span>
                    <input type="number" class="ep-crew-price-inp" min="0"
                        id="ep-cprice-${key}-${i}"
                        placeholder="price/head"
                        value="${c.pricePerHead || ''}"
                        onchange="epCrewPriceChange('${key}',${i},this.value)"
                        oninput="epCrewPriceChange('${key}',${i},this.value)">
                </div>` : '';

            return `
                <div class="ep-svc-crew-item" id="ep-crow2-${key}-${i}">
                    <span class="ep-crew-icon-sq">📷</span>
                    <select class="ep-crew-role-sel" onchange="epCrewRoleChange('${key}',${i},this.value)">
                        ${EP_CREW_ROLES.map(r => `<option${r === c.role ? ' selected' : ''}>${r}</option>`).join('')}
                    </select>
                    ${badge}
                    <div class="ep-crew-stepper">
                        <button type="button" onclick="epChangeQty('${key}',${i},-1)">−</button>
                        <span class="ep-crew-qty-val" id="ep-qty-${key}-${i}">${c.qty}</span>
                        <button type="button" onclick="epChangeQty('${key}',${i},1)">+</button>
                    </div>
                    <button type="button" class="ep-crew-del-btn" onclick="_epRemoveCrewRow('${key}',${i})">✕</button>
                </div>
                ${priceRow}
            `;
        }

        /* ================================================================
           DELIVERABLES CELL — horizontal wrapping chips
           ================================================================ */
        window._buildDelsCell = function (key, cell) {
            const state = _editState[key];
            let html = `<div class="ep-dels-title">Deliverables</div>
                        <div class="ep-svc-dels" id="ep-dels-${key}">`;
            state.deliverables.forEach((d, i) => { html += _delChipHTML(key, i, d); });
            html += `</div>
                <button type="button" class="ep-svc-action-btn" id="ep-addtrig-${key}"
                    onclick="_showEpDelInline('${key}')">+ Add</button>
                <div id="ep-del-inline-${key}" style="display:none;" class="ep-del-inline-form">
                    <input class="ep-mini-input" placeholder="e.g. Instagram Reels" id="ep-iname-${key}">
                    <input class="ep-mini-input" type="number" placeholder="Extra ₹" id="ep-iprice-${key}" style="width:80px">
                    <div class="ep-inline-btns">
                        <button type="button" class="ep-btn-ghost" onclick="_cancelEpDel('${key}')">Cancel</button>
                        <button type="button" class="ep-btn-add" onclick="_confirmEpDel('${key}')">＋ Add</button>
                    </div>
                </div>
            `;
            cell.innerHTML = html;
        };

        function _delChipHTML(key, i, d) {
            const extra = d.isExtra && d.extraPrice ? ` +₹${d.extraPrice}` : '';
            const cls   = d.isExtra ? 'extra' : 'base';
            return `<span class="ep-svc-del-tag ${cls}" id="ep-chip2-${key}-${i}">
                        ${d.label}${extra}
                        <span class="ep-chip-rm" onclick="_epRemoveChip('${key}',${i})">✕</span>
                    </span>`;
        }

        /* ================================================================
           TEAM ROLES CELL
           ================================================================ */
        window._buildRolesCell = function (key, cell) {
            const state = _editState[key];
            let html = `<div class="ep-roles-title">Team Roles</div>
                        <div class="ep-roles-circles" id="ep-roles-circles-${key}">`;
            (state.teamRoles || []).forEach((r, i) => {
                const abbr  = (ROLE_ABBR  || {})[r.role] || r.role.slice(0, 2).toUpperCase();
                const color = (ROLE_COLORS || {})[r.role] || '#8B1A1A';
                html += `
                    <div class="ep-role-circle-wrap" style="animation-delay:${i * 40}ms">
                        <div class="ep-role-circle-btn" style="color:${color};border-color:${color}" title="${r.role}">
                            ${abbr}
                            <span class="ep-role-rm" onclick="removeTeamRole('${key}',${i})">✕</span>
                        </div>
                        <div class="ep-role-abbr-lbl">${abbr}</div>
                    </div>
                `;
            });
            html += `</div>
                <button type="button" class="ep-add-team-role-link" id="ep-add-role-btn-${key}"
                    onclick="showRoleDropdown('${key}', this)">+ Add Team Role</button>
            `;
            cell.innerHTML = html;
        };

        /* ================================================================
           PRICING SECTION
           ================================================================ */
        window._buildPricingSection = function (key, div) {
            const state    = _editState[key];
            const pkg      = PACKAGE_CATALOG[key];
            const crewCost = state.extraCrewCost || 0;
            const delCost  = state.extraDelCost  || 0;
            const total    = pkg.price + crewCost + delCost;

            div.innerHTML = `
                <div class="ep-pricing-box">
                    <div class="ep-price-row">
                        <span>Base Package
                            <small class="ep-price-crew-desc">
                                (${pkg.crew.map(c => c.role + ' ×' + c.qty).join(', ')})
                            </small>
                        </span>
                        <span>₹${pkg.price.toLocaleString('en-IN')}</span>
                    </div>
                    <div class="ep-price-row ep-crew-charge-row" id="ep-crewrow-${key}"
                        style="${crewCost > 0 ? '' : 'display:none'}">
                        <span>Extra Crew / Qty
                            <span class="ep-crew-charge-lbl" id="ep-crewlabel-${key}"></span>
                        </span>
                        <span id="ep-crewval-${key}" style="color:#b45309">₹${crewCost.toLocaleString('en-IN')}</span>
                    </div>
                    <div class="ep-price-row" id="ep-extrarow-${key}"
                        style="${delCost > 0 ? '' : 'display:none'}">
                        <span>Extra Deliverables</span>
                        <span id="ep-extraval-${key}" style="color:#b45309">₹${delCost.toLocaleString('en-IN')}</span>
                    </div>
                    <div class="ep-price-row ep-price-total">
                        <span>Package Total</span>
                        <span id="ep-subval-${key}">₹${total.toLocaleString('en-IN')}</span>
                    </div>
                </div>
            `;
        };

        /* ================================================================
           CREW ACTIONS — all auto-sync team roles
           ================================================================ */
        window._epAddCrewRow = function (key) {
            _editState[key].crew.push({
                role: EP_CREW_ROLES[0], qty: 1,
                baseQty: 0, pricePerHead: 0, isExtra: true
            });
            _refreshNameCell(key);
            _fullSyncTeamRoles(key);
            syncSelectedServicesToWindow();
        };

        window._epRemoveCrewRow = function (key, i) {
            const el = document.getElementById('ep-crow2-' + key + '-' + i);
            if (el) {
                el.style.transition = 'opacity .16s, transform .16s';
                el.style.opacity = '0';
                el.style.transform = 'translateX(14px)';
                setTimeout(() => {
                    _editState[key].crew.splice(i, 1);
                    _refreshNameCell(key);
                    recalcCrewCost(key);
                    syncSelectedServicesToWindow();
                    _fullSyncTeamRoles(key);
                }, 170);
            }
        };

        window.epChangeQty = function (key, i, delta) {
            const c = _editState[key].crew[i];
            c.qty = Math.max(1, Math.min(9, c.qty + delta));

            const el = document.getElementById('ep-qty-' + key + '-' + i);
            if (el) {
                el.innerText = c.qty;
                el.style.transform = 'scale(1.55)';
                el.style.color = '#22c55e';
                setTimeout(() => { el.style.transform = 'scale(1)'; el.style.color = ''; }, 200);
            }

            _refreshNameCell(key);
            recalcCrewCost(key);
            syncSelectedServicesToWindow();
            _fullSyncTeamRoles(key);
        };

        window.epRemoveCrew  = function (key, i) { window._epRemoveCrewRow(key, i); };
        window.refreshEpCrew = function (key)    { _refreshNameCell(key); };

        /* ================================================================
           FULL TEAM ROLES SYNC
           ================================================================ */
        window._fullSyncTeamRoles = function (key) {
            const state = _editState[key];
            if (!state) return;

            const crewMap = {};
            state.crew.forEach(c => {
                crewMap[c.role] = (crewMap[c.role] || 0) + c.qty;
            });

            const existingByRole = {};
            (state.teamRoles || []).forEach(r => {
                if (!existingByRole[r.role]) existingByRole[r.role] = [];
                existingByRole[r.role].push(r.assigned || null);
            });

            const newRoles = [];
            Object.entries(crewMap).forEach(([role, qty]) => {
                const prev = existingByRole[role] || [];
                for (let q = 0; q < qty; q++) {
                    newRoles.push({ role, assigned: prev[q] || null });
                }
            });

            const crewRoleSet = new Set(Object.keys(crewMap));
            (state.teamRoles || []).forEach(r => {
                if (!crewRoleSet.has(r.role) && r._manual === true) newRoles.push({ ...r });
            });

            state.teamRoles = newRoles;

            const cell = document.getElementById('ep-rolescell-' + key);
            if (cell) _buildRolesCell(key, cell);
        };

        const _origSyncTeamRoles = window.syncTeamRolesFromCrew;
        window.syncTeamRolesFromCrew = function (key) {
            if (typeof _origSyncTeamRoles === 'function') _origSyncTeamRoles.apply(this, arguments);
            const cell = document.getElementById('ep-rolescell-' + key);
            if (cell) _buildRolesCell(key, cell);
        };

        window.renderTeamRoleBadges = function (key, _ignored) {
            const cell = document.getElementById('ep-rolescell-' + key);
            if (cell) _buildRolesCell(key, cell);
        };

        /* ================================================================
           DELIVERABLE ACTIONS
           ================================================================ */
        window._showEpDelInline = function (key) {
            const f = document.getElementById('ep-del-inline-' + key);
            const b = document.getElementById('ep-addtrig-' + key);
            if (f) f.style.display = 'block';
            if (b) b.style.display = 'none';
            document.getElementById('ep-iname-' + key)?.focus();
        };

        window._cancelEpDel = function (key) {
            const f = document.getElementById('ep-del-inline-' + key);
            const b = document.getElementById('ep-addtrig-' + key);
            if (f) f.style.display = 'none';
            if (b) b.style.display = '';
            ['ep-iname-' + key, 'ep-iprice-' + key].forEach(id => {
                const el = document.getElementById(id); if (el) el.value = '';
            });
        };

        window._confirmEpDel = function (key) {
            const nameEl = document.getElementById('ep-iname-' + key);
            const price  = parseInt(document.getElementById('ep-iprice-' + key)?.value) || 0;
            const name   = nameEl?.value.trim();
            if (!name) {
                if (nameEl) { nameEl.style.borderColor = '#ef4444'; setTimeout(() => nameEl.style.borderColor = '', 400); }
                return;
            }
            _editState[key].deliverables.push({ key: 'EXTRA_' + Date.now(), label: name, isExtra: true, extraPrice: price });
            if (price > 0) _editState[key].extraDelCost = (_editState[key].extraDelCost || 0) + price;
            _refreshDelsCell(key);
            updateEpBlockPrice(key);
            window._cancelEpDel(key);
        };

        window.cancelEpInline  = window._cancelEpDel;
        window.confirmEpInline = window._confirmEpDel;
        window.refreshEpChips  = function (key) { _refreshDelsCell(key); };

        window.epRemoveChip = function (key, i) {
            const d = _editState[key].deliverables[i];
            if (d.isExtra && d.extraPrice)
                _editState[key].extraDelCost = Math.max(0, (_editState[key].extraDelCost || 0) - d.extraPrice);
            _editState[key].deliverables.splice(i, 1);
            _refreshDelsCell(key);
            updateEpBlockPrice(key);
        };
        window._epRemoveChip = window.epRemoveChip;

        /* ================================================================
           PRICING OVERRIDE
           ================================================================ */
        const _origUpdateEpBlockPrice = window.updateEpBlockPrice;
        window.updateEpBlockPrice = function (key) {
            _origUpdateEpBlockPrice.apply(this, arguments);

            const total  = _pkgTotal(key);
            const costEl = document.getElementById('ep-cost-' + key);
            const subEl  = document.getElementById('ep-sub-'  + key);
            if (costEl) costEl.textContent = 'INR ' + total.toLocaleString('en-IN');
            if (subEl)  subEl.textContent  = 'INR ' + total.toLocaleString('en-IN');

            const hdrEl = document.getElementById('pkg-ep-header-total');
            if (hdrEl) hdrEl.textContent = '₹ ' + _calcGrandTotal().toLocaleString('en-IN');

            const ps = document.getElementById('ep-pricing-section-' + key);
            if (ps) _buildPricingSection(key, ps);
        };

        /* ================================================================
           ROLE DROPDOWN
           ================================================================ */
        window.showRoleDropdown = function (key, triggerBtn) {
            document.querySelectorAll('.ep-role-dropdown').forEach(d => d.remove());

            const dropdown = document.createElement('div');
            dropdown.className = 'ep-role-dropdown';

            EP_CREW_ROLES.forEach(role => {
                const item = document.createElement('div');
                item.className = 'ep-role-dropdown-item';
                const abbr  = (ROLE_ABBR  || {})[role] || role.slice(0, 2).toUpperCase();
                const color = (ROLE_COLORS || {})[role] || '#8B1A1A';
                item.innerHTML = `<span class="ep-role-dd-dot" style="background:${color}">${abbr}</span>${role}`;
                item.onclick = () => { addTeamRole(key, role); dropdown.remove(); };
                dropdown.appendChild(item);
            });

            document.body.appendChild(dropdown);
            const rect = triggerBtn.getBoundingClientRect();
            dropdown.style.top  = (rect.bottom + 6) + 'px';
            dropdown.style.left = rect.left + 'px';

            setTimeout(() => {
                document.addEventListener('click', function closeDD(e) {
                    if (!dropdown.contains(e.target) && e.target !== triggerBtn) {
                        dropdown.remove();
                        document.removeEventListener('click', closeDD);
                    }
                });
            }, 10);
        };

        /* ================================================================
           HELPERS
           ================================================================ */
        function _pkgTotal(key) {
            const s = _editState[key];
            return PACKAGE_CATALOG[key].price + (s?.extraCrewCost || 0) + (s?.extraDelCost || 0);
        }

        function _calcGrandTotal() {
            return _selectedKeys.reduce((sum, k) => sum + _pkgTotal(k), 0);
        }

        window._refreshNameCell = function (key) {
            const cell = document.getElementById('ep-namecell-' + key);
            if (!cell) return;
            _buildNameCell(key, cell);
        };

        window._refreshDelsCell = function (key) {
            const cell = document.getElementById('ep-delscell-' + key);
            if (!cell) return;
            _buildDelsCell(key, cell);
        };

        window._refreshRolesCell = function (key) {
            const cell = document.getElementById('ep-rolescell-' + key);
            if (!cell) return;
            _buildRolesCell(key, cell);
        };

        console.log('[PkgEditor] v3 alignment patch applied ✓');
    }

    /* Boot */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(waitAndPatch, 160));
    } else {
        setTimeout(waitAndPatch, 160);
    }

})();