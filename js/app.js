// =====================================================================
// Render & events
// =====================================================================
// Opens (or with null closes) the header search / notifications dropdown.
function openHeaderMenu(menu) {
  headerMenu = menu;
  if (menu) { userMenuOpen = false; openDD = null; dtDraft = null; }
  renderHeader();
  lucide.createIcons();
  if (menu === 'search') {
    const input = $('#global-search');
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }
}

// Arrow keys move through the search results without re-rendering the input.
function moveSearchActive(step) {
  const items = [...document.querySelectorAll('[data-search-item]')];
  if (!items.length) return;
  search.active = (search.active + step + items.length) % items.length;
  items.forEach((b, i) => b.classList.toggle('bg-slate-100', i === search.active));
  items[search.active].scrollIntoView({ block: 'nearest' });
}

// The header switcher and each page's Store pill all edit the same stores, on every page at once.
const allStoresIfEvery = (ids) => ids.length >= STORE_OPTS.length - 1 ? [] : ids; // every store ticked = All Stores
function setStores(ids) {
  storeFilter = allStoresIfEvery(ids);
  Object.values(listStates).forEach(s => { s.page = 1; s.storeDraft = null; });
}

// Commits a list page's draft filters (and its Store draft) so the table shows them.
function commitFilters(s) {
  if (s.storeDraft) setStores(s.storeDraft);
  s.applied = snapshotFilters(s);
  s.page = 1;
}

// Keeps "Apply Filters" in step while typing, without re-rendering the input.
function syncApplyButton() {
  const btn = $('#page [data-action="apply-filters"]');
  if (!btn) return;
  const holder = document.createElement('div');
  holder.innerHTML = filterActions(pageState());
  btn.replaceWith(holder.firstElementChild);
}

function renderPage() {
  charts.forEach(c => c.destroy());
  charts = [];
  chartQueue = [];
  anExport = null;
  const path = currentPath();
  const page = $('#page');
  if (path === '/dashboard') {
    page.innerHTML = renderDashboard();
  } else if (TXN_VIEWS[path]) {
    page.innerHTML = renderTransactions(TXN_VIEWS[path]);
  } else if (path === TRACKING_PATH) {
    page.innerHTML = renderTracking();
  } else if (path === REFUND_PATH) {
    page.innerHTML = renderRefunds();
  } else if (path === CB_PATH) {
    page.innerHTML = renderChargebacks();
  } else if (path === SETTLEMENT_PATH) {
    page.innerHTML = renderSettlements();
  } else if (path === SETTLE_LIST_PATH) {
    page.innerHTML = renderSettlementList();
  } else if (path === FY_PATH) {
    page.innerHTML = renderFinancialYear();
  } else if (path === LINKS_PATH) {
    page.innerHTML = renderPaymentLinks();
  } else if (path === INVOICES_PATH) {
    page.innerHTML = renderInvoices();
  } else if (path === QR_PATH) {
    page.innerHTML = renderPaymentQr();
  } else if (path === EMI_PATH) {
    page.innerHTML = renderDigitalEmi();
  } else if (path === TXN_RPT.gpay) {
    page.innerHTML = renderGpayReport();
  } else if (path === TXN_RPT.bqr) {
    page.innerHTML = renderBanglaQrReport();
  } else if (path === AN.home) {
    page.innerHTML = renderReportsHome();
  } else if (path === AN.business) {
    page.innerHTML = renderBusinessAnalytics();
  } else if (path === AN.share) {
    page.innerHTML = renderMarketShare();
  } else if (path === AN.geo) {
    page.innerHTML = renderGeographic();
  } else if (path === AN.operators) {
    page.innerHTML = renderMobileOperators();
  } else if (path === AN.devices) {
    page.innerHTML = renderBrowsersDevices();
  } else if (path === AN.issuer) {
    page.innerHTML = renderIssuerLocation();
  } else if (path === AN.saved) {
    page.innerHTML = renderSavedCards();
  } else if (path === CMP.partner) {
    page.innerHTML = renderPartnerCampaigns();
  } else if (path === CMP.merchant) {
    page.innerHTML = renderMerchantCampaigns();
  } else if (path === CMP.calendar) {
    page.innerHTML = renderCampaignCalendar();
  } else if (path === SUP.txn) {
    page.innerHTML = renderTxnTickets();
  } else if (path === SUP.general) {
    page.innerHTML = renderGeneralTickets();
  } else if (path === SUP.service) {
    page.innerHTML = renderServiceDelivery();
  } else if (path === ESCROW_HOLD_PATH) {
    page.innerHTML = renderEscrowHolds();
  } else if (path === ACC.storeList) {
    page.innerHTML = renderStoreList();
  } else if (path === ACC.groups) {
    page.innerHTML = renderStoreGroups();
  } else if (path === ACC.profile) {
    page.innerHTML = renderTxnProfile();
  } else if (path === ACC.users) {
    page.innerHTML = renderUsers();
  } else if (path === ACC.password) {
    page.innerHTML = renderChangePassword();
  } else if (path === OTH.refer) {
    page.innerHTML = renderReferEarn();
  } else if (path === OTH.fx) {
    page.innerHTML = renderCurrencyRates();
  } else if (path === OTH.vas) {
    page.innerHTML = renderVas();
  } else if (path === OTH.sms) {
    page.innerHTML = renderSmsPurchase();
  } else if (path === OTH.dev) {
    page.innerHTML = renderDeveloper();
  } else if (path === OTH.faq) {
    page.innerHTML = renderFaq();
  } else if (path === OTH.learn) {
    page.innerHTML = renderLearning();
  } else {
    page.innerHTML = renderComingSoon(path);
  }
  // Every report opened from the Analytics & Reports landing gets a way back to it.
  if (NAV.find(n => n.key === 'analytics').pages.some(p => p.to === path)) {
    page.insertAdjacentHTML('afterbegin', `<a href="#${AN.home}" class="inline-flex items-center gap-1.5 mb-3 text-sm font-medium text-slate-500 hover:text-primary-600">${ic('arrow-left', 'w-4 h-4')}Analytics &amp; Reports</a>`);
  }
  page.insertAdjacentHTML('afterbegin', [SETTLEMENT_PATH, SETTLE_LIST_PATH].includes(path) ? settlementStatusBanner() : settlementBanner());
  lucide.createIcons();
  fitTables(page);
  if (path === '/dashboard') mountDashboardCharts();
  if (window.Chart && chartQueue.length) {
    setChartDefaults();
    chartQueue.forEach(({ id, config }) => { const el = document.getElementById(id); if (el) charts.push(new Chart(el, config)); });
  }
  if (openDD === 'txn:range') syncDtPopover();
}

function render() {
  if (renderAuth()) return; // sign-in and recovery screens cover the portal
  const active = document.activeElement;
  const focusId = active?.id;
  const caret = active?.selectionStart;
  renderSidebar();
  renderHeader();
  renderPage();
  makeKeyboardReachable(document.body);
  if (focusId) {
    const el = document.getElementById(focusId);
    if (el) { el.focus(); if (caret != null && el.setSelectionRange) el.setSelectionRange(caret, caret); }
  }
}

function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = 'anim-pop flex items-center gap-2 bg-white border border-slate-200 shadow-lg rounded-lg px-4 py-3 text-sm text-slate-700';
  el.innerHTML = `${ic(type === 'success' ? 'circle-check' : 'info', `w-4 h-4 ${type === 'success' ? 'text-emerald-600' : 'text-primary-600'}`)}<span>${esc(msg)}</span>`;
  $('#toast-root').appendChild(el);
  lucide.createIcons();
  setTimeout(() => el.remove(), 2800);
}

const currentView = () => TXN_VIEWS[currentPath()];

const actions = {
  'toggle-sidebar': () => { collapsed = !collapsed; render(); },
  'mobile-nav': () => { mobileNav = !mobileNav; renderSidebar(); lucide.createIcons(); },
  'nav-parent': (el) => {
    const key = el.dataset.key;
    if (navCollapsed) { collapsed = false; expanded = key; }
    else expanded = expanded === key ? null : key;
    render();
  },
  'user-menu': () => { userMenuOpen = !userMenuOpen; headerMenu = null; renderHeader(); lucide.createIcons(); },
  'header-menu': (el) => {
    const menu = el.dataset.value;
    if (menu === 'search' && headerMenu === 'search') return; // clicks inside the open search box keep it open
    openHeaderMenu(headerMenu === menu ? null : menu);
  },
  'search-clear': () => { search.q = ''; search.active = 0; openHeaderMenu('search'); },
  'search-go': (el) => {
    const { kind, value } = el.dataset;
    search.q = ''; search.active = 0;
    openHeaderMenu(null);
    if (kind === 'page') { location.hash = '#' + value; return; }
    const item = { txn: () => TXNS.find(t => t.id === value), invoice: () => INVOICES.find(i => i.no === value), link: () => PAYMENT_LINKS.find(l => l.ref === value), store: () => accStore(value) }[kind]();
    drawer = { kind, item }; renderDrawer();
  },
  'notif-open': (el) => {
    const n = NOTIFICATIONS[Number(el.dataset.value)];
    n.read = true;
    openHeaderMenu(null);
    const item = { cb: () => CHARGEBACKS.find(c => c.ref === n.value), settlement: () => SETTLEMENTS.find(x => x.ref === n.value), refund: () => REFUNDS.find(r => r.ref === n.value), invoice: () => INVOICES.find(i => i.no === n.value), tt: () => TXN_TICKETS.find(t => t.no === n.value) }[n.kind]();
    formErrors = {};
    drawer = { kind: n.kind, item }; renderDrawer();
  },
  'notif-read-all': () => { NOTIFICATIONS.forEach(n => { n.read = true; }); openHeaderMenu('notifications'); },
  'toast': (el) => toast(el.dataset.msg),
  'alert-close': (el) => {
    snoozedAlerts[el.dataset.value] = Date.now();
    render();
    setTimeout(render, ALERT_SNOOZE_MS + 100);
  },
  'go': (el) => { location.hash = '#' + el.dataset.value; },
  'dd-toggle': (el) => {
    const key = el.dataset.key;
    openDD = openDD === key ? null : key;
    if (openDD === 'txn:range') dtDraft = draftFromRange(pageState().range);
    render();
  },
  'dd-select': (el) => {
    const { scope, key, value } = el.dataset;
    if (scope === 'dash') dash[key] = value;
    else if (scope === 'an') an[key] = value;
    else { const s = pageState(); s[key] = value; s.page = 1; }
    openDD = null;
    render();
  },
  // Multi-select: the store list stays open so several stores can be ticked in a row.
  'store-toggle': (el) => {
    const { scope, value: id } = el.dataset;
    const draft = DRAFT_SCOPES.includes(scope);
    const ids = draft ? pageState().storeDraft ?? storeFilter : storeFilter;
    const next = id === 'all' ? [] : ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id];
    if (draft) pageState().storeDraft = allStoresIfEvery(next);
    else setStores(next);
    render();
  },
  'apply-filters': () => { commitFilters(pageState()); render(); },
  'dt-preset': (el) => {
    const preset = el.dataset.value;
    if (preset === 'custom') dtDraft.preset = 'custom';
    else if (dtDraft.mode === 'daily') {
      const r = presetRange(preset);
      dtDraft = { ...dtDraft, preset, fromDate: toDateInput(r.from), toDate: toDateInput(r.to) };
    }
    else dtDraft = draftFromRange(makeRange(preset));
    render();
  },
  'dt-mode': (el) => {
    const mode = el.dataset.value;
    if (mode === dtDraft.mode) return;
    if (mode === 'daily') dtDraft = { ...dtDraft, mode, fromTime: '09:00', toTime: '18:00' };
    else if (dtDraft.preset !== 'custom') dtDraft = draftFromRange(makeRange(dtDraft.preset));
    else dtDraft = { ...dtDraft, mode, fromTime: '00:00', toTime: '23:59' };
    render();
  },
  'dt-chip': (el) => {
    const chip = TIME_CHIPS.find(c => c.value === el.dataset.value);
    // In daily mode a chip only changes the window, not which days are picked.
    const preset = dtDraft.mode === 'daily' ? dtDraft.preset : 'custom';
    dtDraft = { ...dtDraft, preset, fromTime: chip.from, toTime: chip.to };
    render();
  },
  'dt-cancel': () => { openDD = null; dtDraft = null; render(); },
  'dt-apply': () => {
    const r = draftRange();
    if (draftError(r)) return;
    const s = pageState();
    if (dtDraft.mode === 'daily') {
      s.range = { preset: dtDraft.preset, from: r.from, to: dtDraft.preset === 'custom' ? r.to : presetRange(dtDraft.preset).to, daily: r.daily };
    } else {
      s.range = dtDraft.preset === 'custom' ? { preset: 'custom', from: r.from, to: r.to } : makeRange(dtDraft.preset);
    }
    s.page = 1;
    openDD = null; dtDraft = null;
    render();
  },
  'clear-search': () => { pageState().search = ''; render(); },
  'clear-filters': () => {
    const s = pageState();
    Object.assign(s, { search: '', range: makeRange(s.defaultPreset), method: 'all', page: 1 });
    LIST_FILTER_KEYS.forEach(k => { s[k] = k === 'status' && s.defaultStatus ? s.defaultStatus : 'all'; });
    TEXT_FILTER_KEYS.forEach(k => { s[k] = ''; });
    if ($('#page [data-store-pill]')) s.storeDraft = [];
    commitFilters(s); // as on the KAM reports page, Clear resets and applies at once
    render();
  },
  'overview-status': (el) => {
    const s = pageState();
    // Overview cards are quick filters: they apply at once, leaving other pending edits as drafts.
    const keys = el.dataset.value === 'all' ? ['status', 'bstatus'] : [el.dataset.key || 'status'];
    keys.forEach(k => { s[k] = s.applied[k] = el.dataset.value; });
    s.page = 1;
    render();
  },
  'sort': (el) => {
    const s = pageState();
    const key = el.dataset.value;
    s.sort = s.sort.key === key ? { key, dir: s.sort.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' };
    render();
  },
  'page': (el) => { pageState().page += Number(el.dataset.value); render(); },
  'col-toggle': (el) => {
    const hidden = pageState().hidden;
    const key = el.dataset.value;
    hidden.has(key) ? hidden.delete(key) : hidden.add(key);
    render();
  },
  'export': () => {
    const path = currentPath();
    if (TXN_VIEWS[path]) return exportCsv(TXN_VIEWS[path]);
    if (path === REFUND_PATH) {
      return downloadCsv('refund-requests',
        ['Refund Ref. ID', 'Merchant Ref. Code', 'Requested On', 'Transaction ID', 'Store', 'Card / Ref No (masked)', 'Refund Type', 'Refund Amount (BDT)', 'Transaction Amount (BDT)', 'Request Status', 'Approval Status'],
        refundRows(applied(pageState())).map(r => [r.ref, r.merchantRef, `${fmtDate(r.date)} ${fmtTime(r.date, true)}`, r.txn.id, r.storeName, r.txn.account, r.type, r.amount.toFixed(2), r.txn.amount.toFixed(2), r.requestStatus, r.status]));
    }
    if (path === LINKS_PATH) {
      return downloadCsv('payment-links', ['Payment Name', 'Refer Id', 'Store', 'Amount Type', 'Amount', 'Amount List', 'Cart to Pay', 'Payments', 'Collected (BDT)', 'Created On', 'Status', 'Payment URL'],
        linkRows(applied(pageState())).map(l => [l.name, l.ref, l.storeName, l.amountType, l.amount ?? '', l.amountList, l.cart, l.payments.length, linkCollected(l).toFixed(2), fmtDate(l.date), l.active ? 'Active' : 'Inactive', linkUrl(l.ref)]));
    }
    if (path === INVOICES_PATH) {
      return downloadCsv('invoices', ['Invoice Id', 'Reference/Order ID', 'Invoice Reference', 'Customer', 'Email', 'Mobile', 'Store', 'Invoice Date', 'Expire Date', 'Created By', 'Invoice Amount (BDT)', 'Payment Status'],
        invoiceRows(applied(pageState())).map(inv => [inv.no, inv.orderRef, inv.config, inv.customer, inv.email, inv.phone, inv.storeName, fmtDate(inv.date), fmtDate(inv.expires), inv.createdBy, invoiceTotal(inv).toFixed(2), inv.status]));
    }
    if (path === TXN_RPT.gpay || path === TXN_RPT.bqr) {
      const gp = path === TXN_RPT.gpay;
      return downloadCsv(gp ? 'google-pay-report' : 'bangla-qr-report', gp ? ['Date', 'OTP Based Amount', 'OTP Based Total Transactions', 'Direct Payment Amount', 'Direct Payment Total Transactions', 'Total Transactions', 'Total Amount'] : ['Date', 'Transaction Amount (BDT)', 'Total Transactions'],
        rptDays(gp ? 'Google Pay' : 'Bangla QR').map(d => gp ? [fmtDate(d.day), d.otpAmt.toFixed(2), d.otpN, d.directAmt.toFixed(2), d.directN, d.n, d.amount.toFixed(2)] : [fmtDate(d.day), d.amount.toFixed(2), d.n]));
    }
    if (path === CMP.partner) {
      return downloadCsv('partnership-campaigns', ['Tracking Id', 'Campaign Name', 'Bank Name', 'Start Date', 'End Date', 'Merchant Last Participation Date', 'Status', 'Stores Joined'],
        campaignRows(PARTNER_CAMPAIGNS, applied(pageState())).map(c => [c.tracking, c.name, c.bank, fmtDate(c.start), fmtDate(c.end), fmtDate(c.last), c.status, joinedStores(c).map(storeName).join('; ')]));
    }
    if (path === CMP.merchant) {
      return downloadCsv('merchant-campaigns', ['Tracking Id', 'Campaign Name', 'Start Date', 'End Date', 'Bank Communicator', 'Card BIN / Banks', 'Status', 'Stores'],
        campaignRows(MERCHANT_CAMPAIGNS, applied(pageState())).map(c => [c.tracking, c.name, fmtDate(c.start), fmtDate(c.end), c.communicator, (c.communicator === 'SSL' ? [...c.banks, ...c.mfs, ...c.ib] : c.bins).join('; '), c.status, joinedStores(c).map(storeName).join('; ')]));
    }
    if (path === EMI_PATH) {
      return downloadCsv('emi-requests', ['EMI Ref. Id', 'Requested On', 'Store', 'Transaction ID', 'TXN Amount', 'EMI Amount', 'Tenure', 'EMI Issuer Bank', 'Status', 'Bank Status'],
        emiRows(applied(pageState())).map(e => [e.ref, `${fmtDate(e.date)} ${fmtTime(e.date, true)}`, e.storeName, e.txn.id, e.txn.amount.toFixed(2), e.charge.toFixed(2), `${e.tenure} Months`, e.bank, e.status, e.bankStatus]));
    }
    if (path === ESCROW_HOLD_PATH) {
      return downloadCsv('escrow-hold-transactions', ['Transaction ID', 'Invoice ID', 'Store', 'Customer', 'Payment Date', 'Amount (BDT)', 'On Hold (days)', 'Hold Reason', 'Status'],
        escrowHoldRows(applied(pageState())).map(t => [t.id, t.invoiceId, t.storeName, t.customer, `${fmtDate(t.date)} ${fmtTime(t.date, true)}`, t.amount.toFixed(2), heldDays(t), holdStage(t).reason, 'ESCROW Hold']));
    }
    if (path === SETTLEMENT_PATH || path === SETTLE_LIST_PATH) {
      return downloadCsv('settlement-report',
        ['Settlement Date', 'Reference No', 'Batch No', 'Store', 'Settlement Type', 'Opening Amt', 'Payable Amt', 'Settle Amt', 'Paid Amt', 'Fwd Amt', 'Status', 'Bank', 'Account (masked)'],
        settlementRows(applied(pageState())).map(x => [`${fmtDate(x.date)} ${fmtTime(x.date)}`, x.ref, x.batch, x.storeName, x.type, x.opening.toFixed(2), x.payable.toFixed(2), x.settle.toFixed(2), x.paid.toFixed(2), x.fwd.toFixed(2), x.status, `${x.bank.bank} - ${x.bank.branch}`, x.bank.account]));
    }
    if (path === CB_PATH) {
      return downloadCsv('chargeback-requests',
        ['Chargeback Ref. ID', 'Merchant Ref. Code', 'Requested On', 'Transaction ID', 'Store', 'Card / Ref No (masked)', 'Reason', 'Chargeback Amount (BDT)', 'Request Status (SSL)', 'Approval Status (My)'],
        cbRows(applied(pageState())).map(c => [c.ref, c.merchantRef, `${fmtDate(c.date)} ${fmtTime(c.date, true)}`, c.txn.id, c.storeName, c.txn.account, c.reason, c.amount.toFixed(2), c.status, MY_CB_LABEL[c.myStatus]]));
    }
  },
  'copy': async (el) => {
    const value = el.dataset.value;
    try {
      await navigator.clipboard.writeText(value);
      toast('Copied to clipboard', 'success');
    } catch {
      // Clipboard API is unavailable on file:// and some browsers; fall back to a hidden textarea.
      const ta = Object.assign(document.createElement('textarea'), { value });
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      toast(ok ? 'Copied to clipboard' : 'Could not copy — select the text and copy it manually', ok ? 'success' : 'info');
    }
  },
  'open-txn': (el) => {
    const t = TXNS.find(x => x.id === el.dataset.value);
    drawer = { kind: 'txn', item: t };
    renderDrawer();
    // As in the old panel, opening a successful payment clears its "read" mark.
    if (!t.viewed) { t.viewed = true; if (TXN_VIEWS[currentPath()]) render(); }
  },
  'rpt-view': (el) => { rptView[el.dataset.key] = el.dataset.value; render(); },
  'txn-panel': (el) => { txnPanels[el.dataset.value] = !txnPanels[el.dataset.value]; render(); },
  'txn-symbols': () => { txnPanels.symbols = true; render(); $('#symbol-meaning')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); },
  'ipn-resend': () => toast('IPN resent to your listener URL (prototype — nothing was sent)', 'success'),
  'new-refund': () => { refundDraft = newRefundDraft(); formErrors = {}; drawer = { kind: 'refund-new', item: null }; renderDrawer(); },
  'refund-for-txn': (el) => { refundDraft = newRefundDraft(el.dataset.value); lookupRefundTxn(); drawer = { kind: 'refund-new', item: null }; renderDrawer(); },
  'refund-lookup': () => { lookupRefundTxn(); renderDrawer(); },
  'refund-open': () => { refundDraft.open = true; formErrors = {}; renderDrawer(); },
  'save-refund': () => {
    formErrors = validateRefund();
    if (Object.keys(formErrors).length) { renderDrawer(); return; }
    const d = refundDraft, t = d.txn, now = new Date();
    const stamp = `${String(now.getFullYear()).slice(2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const rf = {
      ref: `R${stamp}-${String(Math.floor(Math.random() * 1e5)).padStart(5, '0')}`, txn: t, date: new Date(NOW), // NOW keeps it inside 'All Time' status: 'Initiate', requestStatus: 'Success',
      requestedBy: 'demo_merchant', remarks: d.remarks.trim(), type: d.type, amount: d.type === 'Full' ? t.amount : Number(d.amount),
      merchantRef: d.merchantRef.trim(), store: t.store, storeName: t.storeName,
    };
    REFUNDS.unshift(rf);
    REFUND_BY_TXN.set(t.id, rf);
    refundDraft = null; formErrors = {};
    drawer = { kind: 'refund', item: rf };
    renderDrawer(); render();
    toast('Refund request created (prototype — nothing was sent to the bank)', 'success');
  },
  'refund-cancel': (el) => {
    const rf = REFUNDS.find(r => r.ref === el.dataset.value);
    Object.assign(rf, { status: 'Cancel', requestStatus: 'Cancel', approvedOn: new Date(), approvedBy: 'demo_merchant', approvalRemarks: 'Cancelled at merchant request' });
    renderDrawer(); render();
    toast('Refund request cancelled (prototype)', 'success');
  },
  'cb-approve': (el) => {
    const c = CHARGEBACKS.find(x => x.ref === el.dataset.value);
    Object.assign(c, { myStatus: 'Approve', status: 'Processing', approvedOn: new Date(), approvedBy: 'demo_merchant', approvalRemarks: 'Approved by merchant' });
    renderDrawer(); render();
    toast('Chargeback approved — the amount will be adjusted from settlement (prototype)', 'success');
  },
  'cb-deny': (el) => { cbDecision = { ref: el.dataset.value, remarks: '' }; formErrors = {}; renderDrawer(); },
  'cb-deny-cancel': () => { cbDecision = null; formErrors = {}; renderDrawer(); },
  'cb-deny-submit': (el) => {
    cbDecision.remarks = $('#cb-remarks').value.trim();
    formErrors = cbDecision.remarks ? {} : { cbRemarks: 'Write why you are denying it — the bank sees this.' };
    if (formErrors.cbRemarks) { renderDrawer(); return; }
    const c = CHARGEBACKS.find(x => x.ref === el.dataset.value);
    Object.assign(c, { myStatus: 'Deny', status: 'Processing', approvedOn: new Date(), approvedBy: 'demo_merchant', approvalRemarks: cbDecision.remarks });
    cbDecision = null;
    renderDrawer(); render();
    toast('Chargeback denied — SSLCOMMERZ will send your reason to the bank (prototype)', 'success');
  },
  'open-refund': (el) => { drawer = { kind: 'refund', item: REFUNDS.find(r => r.ref === el.dataset.value) }; renderDrawer(); },
  'open-cb': (el) => { cbDecision = null; formErrors = {}; drawer = { kind: 'cb', item: CHARGEBACKS.find(c => c.ref === el.dataset.value) }; renderDrawer(); },
  'open-settlement': (el) => { drawer = { kind: 'settlement', item: SETTLEMENTS.find(x => x.ref === el.dataset.value) }; renderDrawer(); },
  'open-fy': (el) => { drawer = { kind: 'fy', item: { y: Number(el.dataset.year), storeId: el.dataset.store } }; renderDrawer(); },
  'fy-toggle': (el) => { const y = Number(el.dataset.value); fyOpen.has(y) ? fyOpen.delete(y) : fyOpen.add(y); render(); },
  'settlement-txns': (el) => {
    // Opens All Transactions on the settlement's business day for that store.
    const x = SETTLEMENTS.find(st => st.ref === el.dataset.value);
    setStores([x.store]);
    const s = txnState('all');
    Object.assign(s, { search: '', status: 'all', method: 'all', range: { preset: 'custom', from: x.day, to: endOfDay(x.day) } });
    commitFilters(s);
    drawer = null; renderDrawer();
    location.hash = '#/transactions/all';
  },
  'close-drawer': () => closeDrawer(),
  'new-referral': () => { otherDraft = { store: '', email: '', phone: '' }; formErrors = {}; drawer = { kind: 'referral-new', item: null }; renderDrawer(); },
  'save-referral': () => {
    const d = otherDraft;
    formErrors = {};
    if (!d.store) formErrors.store = 'Select your store.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) formErrors.email = 'Enter a valid email address.';
    if (!/^01[3-9]\d{8}$/.test(d.phone.trim())) formErrors.phone = 'Enter an 11-digit mobile number starting with 01.';
    if (Object.keys(formErrors).length) { renderDrawer(); return; }
    const [user, domain] = d.email.trim().split('@');
    REFERRALS.unshift({ store: d.store, status: 'Referred', disbursement: 'Pending', date: new Date(TODAY), email: `${user[0]}•••@${domain}`, phone: `01•••••${d.phone.trim().slice(-3)}` });
    otherDraft = null; drawer = null; renderDrawer(); render();
    toast('Referral added — prototype, nothing was sent', 'success');
  },
  'vas-apply': (el) => {
    VAS_SERVICES.find(v => v.id === el.dataset.value).applied = true;
    render();
    toast('Prototype: no request was sent to the team', 'success');
  },
  'sms-select': (el) => { otherDraft = { pkg: el.dataset.value, agree: false, letter: '' }; formErrors = {}; drawer = { kind: 'sms-buy', item: null }; renderDrawer(); },
  'sms-submit': () => {
    const d = otherDraft;
    formErrors = {};
    if (!d.agree) formErrors.agree = 'Agree to the terms and conditions first.';
    else if (!d.letter) formErrors.letter = 'Upload the signed declaration letter.';
    if (Object.keys(formErrors).length) { renderDrawer(); return; }
    SMS_REQUESTS.unshift({ ref: `SMS-${String(SMS_REQUESTS.length + 1).padStart(4, '0')}`, pkg: d.pkg, date: new Date(TODAY), letter: d.letter, status: 'Pending' });
    otherDraft = null; drawer = null; renderDrawer(); render();
    toast('Request submitted — prototype, nothing was uploaded or charged', 'success');
  },
  'faq-toggle': (el) => { faqState.open = faqState.open === el.dataset.value ? null : el.dataset.value; $('#faq-list').innerHTML = faqList(); lucide.createIcons(); },
  'open-video': (el) => { drawer = { kind: 'video', item: VIDEOS.find(v => v.id === el.dataset.value) }; renderDrawer(); },
  'open-store': (el) => { openDD = null; render(); drawer = { kind: 'store', item: accStore(el.dataset.value) }; renderDrawer(); },
  'store-status': (el) => { drawer = { kind: 'store-status', item: accStore(el.dataset.value) }; renderDrawer(); },
  'store-status-confirm': (el) => {
    const st = accStore(el.dataset.value);
    st.status = st.status === 'Active' ? 'Inactive' : 'Active';
    drawer = null; renderDrawer(); render();
    toast(`${st.name} is now ${st.status.toLowerCase()} (prototype)`, 'success');
  },
  'store-charge': (el) => { openDD = null; render(); drawer = { kind: 'store-charge', item: accStore(el.dataset.value) }; renderDrawer(); },
  'store-bank': (el) => { openDD = null; render(); drawer = { kind: 'store-bank', item: accStore(el.dataset.value) }; renderDrawer(); },
  'store-set-group': (el) => openStoreSettings('group', el.dataset.value, { group: storeGroupOf(el.dataset.value)?.id || '' }),
  'store-ipn': (el) => openStoreSettings('ipn', el.dataset.value, { ...storeCfg(el.dataset.value).ipn }),
  'store-gw': (el) => openStoreSettings('gw', el.dataset.value, { ...storeCfg(el.dataset.value).gw }),
  'save-store-settings': () => {
    formErrors = validateStoreSettings();
    if (Object.keys(formErrors).length) { renderDrawer(); return; }
    const { kind, id, ...fields } = storeDraft;
    if (kind === 'group') {
      STORE_GROUPS.forEach(g => { if (!g.system) g.stores = g.stores.filter(x => x !== id); });
      groupOf(fields.group).stores.push(id);
    } else {
      Object.assign(storeCfg(id)[kind], Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])));
    }
    storeDraft = null; drawer = null; formErrors = {};
    renderDrawer(); render();
    toast(`${{ group: 'Store group', ipn: 'IPN settings', gw: 'Gateway settings' }[kind]} saved for ${id} (prototype)`, 'success');
  },
  'store-profile': (el) => {
    (listStates[ACC.profile] ||= defaultListState('30d')).store = el.dataset.value;
    location.hash = '#' + ACC.profile;
  },
  'store-txns': (el) => {
    Object.assign(txnState('all'), { search: '', status: 'all', method: 'all', store: el.dataset.value, range: makeRange('30d'), page: 1 });
    drawer = null; renderDrawer();
    location.hash = '#/transactions/all';
  },
  'store-settlements': (el) => {
    const s = (listStates[SETTLEMENT_PATH] ||= defaultListState('30d'));
    Object.assign(s, { search: '', status: 'all', stype: 'all', store: el.dataset.value, page: 1 });
    location.hash = '#' + SETTLEMENT_PATH;
  },
  'open-group': (el) => { drawer = { kind: 'group', item: groupOf(el.dataset.value) }; renderDrawer(); },
  'new-group': () => { groupDraft = { id: null, name: '', status: '' }; formErrors = {}; drawer = { kind: 'group-new', item: null }; renderDrawer(); },
  'edit-group': (el) => { const g = groupOf(el.dataset.value); groupDraft = { id: g.id, name: g.name, status: g.active ? 'Active' : 'Inactive' }; formErrors = {}; drawer = { kind: 'group-new', item: null }; renderDrawer(); },
  'save-group': () => {
    const d = groupDraft;
    formErrors = {};
    if (!d.name.trim()) formErrors.name = 'Enter a group name.';
    else if (STORE_GROUPS.some(g => g.id !== d.id && g.name.toLowerCase() === d.name.trim().toLowerCase())) formErrors.name = 'A group with this name already exists.';
    if (!d.status) formErrors.status = 'Choose a status.';
    if (Object.keys(formErrors).length) { renderDrawer(); return; }
    let g = d.id && groupOf(d.id);
    if (g) Object.assign(g, { name: d.name.trim(), active: d.status === 'Active' });
    else { g = { id: `G${STORE_GROUPS.length + 1}${alnum(3)}`, name: d.name.trim(), description: '', stores: [], active: d.status === 'Active', created: new Date(NOW) }; STORE_GROUPS.push(g); }
    groupDraft = null; drawer = null;
    renderDrawer(); render();
    toast('Store group saved (prototype)', 'success');
  },
  'group-toggle': (el) => {
    const g = groupOf(el.dataset.value);
    g.active = !g.active;
    if (drawer) renderDrawer();
    render();
    toast(`Store group ${g.active ? 'activated' : 'deactivated'} (prototype)`, 'success');
  },
  'delete-group': (el) => {
    STORE_GROUPS.splice(STORE_GROUPS.findIndex(g => g.id === el.dataset.value), 1);
    drawer = null; renderDrawer(); render();
    toast('Store group deleted (prototype)', 'success');
  },
  'open-user': (el) => { drawer = { kind: 'user', item: USERS.find(u => u.login === el.dataset.value) }; renderDrawer(); },
  'new-user': () => { userDraft = newUserDraft(); formErrors = {}; drawer = { kind: 'user-new', item: null }; renderDrawer(); },
  'edit-user': (el) => { userDraft = newUserDraft(USERS.find(u => u.login === el.dataset.value)); formErrors = {}; drawer = { kind: 'user-new', item: null }; renderDrawer(); },
  'user-reset': (el) => { drawer = { kind: 'user-reset', item: USERS.find(u => u.login === el.dataset.value) }; renderDrawer(); },
  'user-reset-confirm': (el) => {
    drawer = null; renderDrawer();
    toast(`Reset link sent to ${el.dataset.value}'s registered email and mobile (prototype)`, 'success');
  },
  'user-unlock': (el) => {
    const u = USERS.find(x => x.login === el.dataset.value);
    u.locked = false;
    if (drawer?.kind === 'user') renderDrawer();
    render();
    toast(`${u.login} is unlocked — they can sign in with their current password (prototype)`, 'success');
  },
  'user-policy': () => { userDraft.showPolicy = !userDraft.showPolicy; renderDrawer(); },
  'save-user': () => {
    formErrors = validateUser();
    if (Object.keys(formErrors).length) { renderDrawer(); return; }
    const d = userDraft;
    const email = d.email.trim(), mobile = d.mobile.trim();
    // Only masked contact details are kept, and the password is never stored (prototype).
    const fields = {
      first: d.first.trim(), middle: d.middle.trim(), last: d.last.trim(), phone: d.phone.trim(),
      role: d.role, group: d.group, appRole: d.appRole, status: d.status,
      ...(email ? { email: `${email[0]}•••••@${email.split('@')[1]}` } : {}),
      ...(mobile ? { mobile: `01•••••${mobile.slice(-3)}` } : {}),
    };
    fields.name = `${fields.first} ${fields.last}`.trim();
    let user = d.login0 && USERS.find(u => u.login === d.login0);
    if (user) Object.assign(user, fields);
    else { user = { login: d.login.trim(), ...fields, addedBy: 'demo_merchant', lastLogin: new Date(NOW), created: new Date(NOW) }; USERS.push(user); }
    userDraft = null;
    drawer = { kind: 'user', item: user };
    renderDrawer(); render();
    toast(d.login0 ? 'User updated (prototype)' : 'User created — prototype, nothing was sent and the password was not stored', 'success');
  },
  'pw-toggle': (el) => {
    const input = $(`#${el.dataset.value}`);
    input.type = input.type === 'password' ? 'text' : 'password';
    el.innerHTML = ic(input.type === 'password' ? 'eye' : 'eye-off', 'w-4 h-4');
    lucide.createIcons();
  },
  'pw-clear': () => { ['pw-old', 'pw-new', 'pw-confirm'].forEach(id => { $(`#${id}`).value = ''; setPwError(id, ''); }); syncPasswordRules(); },
  'pw-save': () => {
    const oldPw = $('#pw-old').value, newPw = $('#pw-new').value, confirmPw = $('#pw-confirm').value;
    const failed = PASSWORD_RULES.filter(r => !r.test(newPw));
    setPwError('pw-old', oldPw ? '' : 'Enter your current password.');
    setPwError('pw-new', !newPw ? 'Enter a new password.' : failed.length ? `Doesn't meet ${failed.length} of the rules on the right.` : newPw === oldPw ? 'The new password must be different from the current one.' : '');
    setPwError('pw-confirm', confirmPw !== newPw || !confirmPw ? 'Passwords do not match.' : '');
    if (!oldPw || !newPw || failed.length || newPw === oldPw || confirmPw !== newPw) return;
    actions['pw-clear']();
    toast('Prototype: the password was not changed — there is no server behind this page', 'success');
  },
  'open-tt': (el) => { formErrors = {}; drawer = { kind: 'tt', item: TXN_TICKETS.find(t => t.no === el.dataset.value) }; renderDrawer(); },
  'open-gt': (el) => { formErrors = {}; drawer = { kind: 'gt', item: GEN_TICKETS.find(t => t.no === el.dataset.value) }; renderDrawer(); },
  'new-tt': (el) => { ticketDraft = { txnId: el.dataset.value || '', queries: [], text: '' }; formErrors = {}; drawer = { kind: 'tt-new', item: null }; renderDrawer(); },
  'new-gt': () => { ticketDraft = { title: '', type: '', store: '', text: '', attachment: null }; formErrors = {}; drawer = { kind: 'gt-new', item: null }; renderDrawer(); },
  'save-tt': () => {
    const d = ticketDraft;
    const txn = TXNS.find(t => t.id.toLowerCase() === d.txnId.trim().toLowerCase());
    formErrors = {};
    if (!txn) formErrors.txnId = 'Enter a Transaction ID from one of your stores.';
    if (!d.queries.length) formErrors.queries = 'Choose at least one query type.';
    if (!d.text.trim()) formErrors.text = 'Describe the issue.';
    if (Object.keys(formErrors).length) { renderDrawer(); return; }
    const ticket = {
      no: `TT${ymd(NOW)}${digits(4)}`, date: new Date(NOW), txn, store: txn.store, storeName: txn.storeName, queries: [...d.queries],
      status: 'Requested', requestedBy: 'demo_merchant', role: 'Merchant Admin', email: 'm•••••@example.com', mobile: '01•••••000',
      note: d.text.trim(), feedbackBy: null, feedbackOn: null, feedback: null,
      messages: [{ from: 'merchant', name: 'demo_merchant', at: new Date(NOW), text: d.text.trim() }],
    };
    TXN_TICKETS.unshift(ticket);
    ticketDraft = null;
    drawer = { kind: 'tt', item: ticket };
    renderDrawer(); render();
    toast('Ticket submitted (prototype — saved in this page only)', 'success');
  },
  'save-gt': () => {
    const d = ticketDraft;
    formErrors = {};
    if (!d.title.trim()) formErrors.title = 'Enter a title.';
    if (!d.type) formErrors.type = 'Choose an issue type.';
    if (!d.text.trim()) formErrors.text = 'Describe the issue.';
    if (Object.keys(formErrors).length) { renderDrawer(); return; }
    const ticket = {
      no: `MT${ymd(NOW)}${digits(4)}`, date: new Date(NOW), title: d.title.trim(), type: d.type, description: d.text.trim(),
      attachment: d.attachment, status: 'Pending', remarks: '—', createdBy: 'demo_merchant', resolvedBy: null, resolvedAt: null, store: d.store || null,
      messages: [{ from: 'merchant', name: 'demo_merchant', at: new Date(NOW), text: d.text.trim() }],
    };
    GEN_TICKETS.unshift(ticket);
    ticketDraft = null;
    drawer = { kind: 'gt', item: ticket };
    renderDrawer(); render();
    toast('Ticket submitted (prototype — saved in this page only)', 'success');
  },
  'get-deliverables': () => {
    const rows = pendingDeliverables();
    downloadCsv('ServiceDeliverables', DELIVERY_COLUMNS, rows.map((t, i) => [i + 1, t.id, `${toDateInput(t.date)} ${pad(t.date.getHours())}:${pad(t.date.getMinutes())}`, t.bankTranId, t.store, t.invoiceId, '', '', '', '', '', '', '']));
  },
  'upload-delivery': () => { deliveryDraft = { file: null, error: '' }; formErrors = {}; drawer = { kind: 'delivery-upload', item: null }; renderDrawer(); },
  'save-delivery': async () => {
    if (!deliveryDraft.file) { formErrors = { file: 'Choose the delivery file (.csv) to upload.' }; renderDrawer(); return; }
    const result = processDeliveryFile(deliveryDraft.file.name, await deliveryDraft.file.text());
    if (result.error) { formErrors = { file: result.error }; renderDrawer(); return; }
    deliveryDraft = null; drawer = null; formErrors = {};
    renderDrawer(); render();
    toast(result.status === 'Success' ? `${result.found} of ${result.rows} transactions marked delivered (prototype)` : 'No matching escrow transaction found in the file', result.status === 'Success' ? 'success' : 'info');
  },
  'send-reply': (el) => {
    const text = $('#reply-text').value.trim();
    const list = el.dataset.kind === 'tt' ? TXN_TICKETS : GEN_TICKETS;
    const ticket = list.find(t => t.no === el.dataset.value);
    formErrors = text ? {} : { reply: 'Write a message first.' };
    if (text) ticket.messages.push({ from: 'merchant', name: 'demo_merchant', at: new Date(NOW), text });
    renderDrawer();
    if (text) toast('Reply added (prototype — not sent to support)', 'success');
  },
  'open-partner': (el) => { partnerDraft = null; formErrors = {}; drawer = { kind: 'partner', item: PARTNER_CAMPAIGNS.find(c => c.id === el.dataset.value) }; renderDrawer(); },
  'edit-partner': (el) => { partnerDraft = newPartnerDraft(PARTNER_CAMPAIGNS.find(c => c.id === el.dataset.value)); formErrors = {}; drawer = { kind: 'partner-edit', item: null }; renderDrawer(); },
  'save-partner': () => {
    formErrors = validatePartner();
    if (Object.keys(formErrors).length) { renderDrawer(); return; }
    const c = PARTNER_CAMPAIGNS.find(x => x.id === partnerDraft.id);
    c.discounts = Object.fromEntries(Object.entries(partnerDraft.rows).filter(([, r]) => r.on).map(([id, r]) => [id,
      pDiscount(Number(r.pct), r.burned, Number(r.minOrder), Number(r.maxPerTxn), Number(r.perUser), r.remarks.trim())]));
    partnerDraft = null;
    drawer = { kind: 'partner', item: c };
    renderDrawer(); render();
    toast(joinedStores(c).length ? `Discounts updated for ${joinedStores(c).length} store${joinedStores(c).length > 1 ? 's' : ''} (prototype)` : 'All stores removed from this campaign (prototype)', 'success');
  },
  'open-mc': (el) => { mcDraft = null; formErrors = {}; drawer = { kind: 'mc', item: MERCHANT_CAMPAIGNS.find(c => c.id === el.dataset.value) }; renderDrawer(); },
  'new-mc': () => { mcDraft = newMcDraft(); formErrors = {}; drawer = { kind: 'mc-new', item: null }; renderDrawer(); },
  'edit-mc': (el) => { mcDraft = newMcDraft(MERCHANT_CAMPAIGNS.find(c => c.id === el.dataset.value)); formErrors = {}; drawer = { kind: 'mc-new', item: null }; renderDrawer(); },
  'mc-bin-remove': (el) => { mcDraft.bins.splice(mcDraft.bins.indexOf(el.dataset.value), 1); renderDrawer(); },
  'save-mc': () => {
    if (mcDraft.binInput.trim()) { addMcBin(); if (formErrors.bins) return; }
    formErrors = validateMc();
    if (Object.keys(formErrors).length) { renderDrawer(); return; }
    const d = mcDraft;
    const fields = {
      name: d.name.trim(), start: new Date(`${d.start}T00:00`), end: endOfDay(new Date(`${d.end}T00:00`)), communicator: d.communicator,
      bins: d.communicator === 'Merchant' ? [...d.bins] : [], banks: d.communicator === 'SSL' ? [...d.banks] : [], mfs: d.communicator === 'SSL' ? [...d.mfs] : [], ib: d.communicator === 'SSL' ? [...d.ib] : [],
      discounts: Object.fromEntries(Object.entries(d.rows).filter(([, r]) => r.on).map(([id, r]) => [id,
        mDiscount(Number(r.pct), r.observed, Number(r.minOrder), Number(r.maxPerTxn), Number(r.maxPerCard), Number(r.perUser), r.remarks.trim())])),
    };
    let c = d.id && MERCHANT_CAMPAIGNS.find(x => x.id === d.id);
    if (c) Object.assign(c, fields);
    else {
      const created = new Date();
      c = { id: `MC${alnum(6)}`, tracking: trackingId(created), created, status: 'Created', ...fields };
      MERCHANT_CAMPAIGNS.unshift(c);
    }
    mcDraft = null; formErrors = {};
    drawer = { kind: 'mc', item: c };
    renderDrawer(); render();
    toast(d.id ? 'Campaign updated (prototype)' : 'Campaign created (prototype — saved in this page only)', 'success');
  },
  'mc-cancel': (el) => {
    const c = MERCHANT_CAMPAIGNS.find(x => x.id === el.dataset.value);
    c.status = 'Canceled';
    if (drawer) renderDrawer();
    render();
    toast('Campaign canceled (prototype)', 'success');
  },
  'cal-nav': (el) => {
    const step = Number(el.dataset.value);
    cal.month = step === 0 ? new Date(NOW.getFullYear(), NOW.getMonth(), 1) : new Date(cal.month.getFullYear(), cal.month.getMonth() + step, 1);
    render();
  },
  'open-link': (el) => { drawer = { kind: 'link', item: PAYMENT_LINKS.find(l => l.ref === el.dataset.value) }; renderDrawer(); },
  'open-invoice': (el) => { drawer = { kind: 'invoice', item: INVOICES.find(i => i.no === el.dataset.value) }; renderDrawer(); },
  'open-emi': (el) => { drawer = { kind: 'emi', item: EMI_REQUESTS.find(e => e.ref === el.dataset.value) }; renderDrawer(); },
  'new-link': () => { linkDraft = newLinkDraft(); formErrors = {}; drawer = { kind: 'link-new', item: null }; renderDrawer(); },
  'save-link': () => {
    const d = linkDraft;
    formErrors = validateLink();
    if (Object.keys(formErrors).length) { renderDrawer(); return; }
    const store = STORES.find(st => st.id === d.store);
    const amount = Number(d.amount) > 0 ? Number(d.amount) : null;
    const link = {
      ...d, ref: alnum(13), name: d.name.trim(), store: store.id, storeName: store.name, date: new Date(NOW), // NOW keeps it inside 'All Time'
      amount, amountType: d.amountType || (amount ? 'Fixed' : 'Dynamic'), cart: d.cart || 'No', showTerms: d.showTerms || 'No',
      buttonName: d.buttonName.trim() || 'Pay Now', validity: d.validity.trim(),
      custom: structuredClone(d.custom), colors: { ...d.colors }, active: true, payments: [],
    };
    PAYMENT_LINKS.unshift(link);
    linkDraft = null;
    drawer = { kind: 'link', item: link };
    renderDrawer(); render();
    toast('Payment link created (prototype — saved in this page only)', 'success');
  },
  'link-toggle': (el) => {
    const l = PAYMENT_LINKS.find(x => x.ref === el.dataset.value);
    l.active = !l.active;
    renderDrawer(); render();
    toast(`Link ${l.active ? 'activated' : 'deactivated'} (prototype)`, 'success');
  },
  'new-invoice': () => { invDraft = newInvoiceDraft(); formErrors = {}; drawer = { kind: 'invoice-new', item: null }; renderDrawer(); },
  'inv-proceed': () => {
    formErrors = invDraft.config ? {} : { config: 'Choose a configuration.' };
    if (!formErrors.config) invDraft.step = 'form';
    renderDrawer();
  },
  'inv-back': () => { invDraft.step = 'config'; formErrors = {}; renderDrawer(); },
  'inv-add-item': () => { invDraft.items.push({ desc: '', qty: '1', price: '' }); renderDrawer(); },
  'inv-remove-item': (el) => { invDraft.items.splice(Number(el.dataset.value), 1); renderDrawer(); },
  'save-invoice': () => {
    formErrors = validateInvoice();
    if (Object.keys(formErrors).length) { renderDrawer(); return; }
    const d = invDraft;
    const link = PAYMENT_LINKS.find(l => l.ref === d.config);
    const phone = d.phone.trim();
    const email = d.email.trim();
    const id = d.customerId.trim();
    const inv = {
      no: `INV${alnum(13)}`, orderRef: d.orderRef.trim(), config: link.ref, configName: link.name, store: link.store, storeName: link.storeName,
      // Only masked contact details are kept, the same as the rest of the portal.
      customer: d.customer.trim(), phone: `01•••••${phone.slice(-3)}`, email: `${email[0]}•••••@${email.split('@')[1]}`, customerId: id ? `•••••${id.slice(-4)}` : '',
      date: new Date(NOW), expires: invoiceExpiry(NOW, link.validity), createdBy: USERS[0].login,
      items: d.items.map(it => ({ desc: it.desc.trim(), qty: Number(it.qty), price: Number(it.price) })),
      status: 'Unpaid',
    };
    INVOICES.unshift(inv);
    invDraft = null; formErrors = {};
    drawer = { kind: 'invoice', item: inv };
    renderDrawer(); render();
    toast('Invoice created — prototype, no email or SMS was sent', 'success');
  },
  'invoice-resend': (el) => {
    INVOICES.find(i => i.no === el.dataset.value).resentAt = new Date();
    if (drawer) renderDrawer();
    toast('Invoice email resent — prototype, nothing was sent', 'success');
  },
  'invoice-download': () => toast('Prototype: invoice PDF download is not wired up.'),
  'invoice-cancel': (el) => {
    INVOICES.find(i => i.no === el.dataset.value).status = 'Canceled';
    if (drawer) renderDrawer();
    render();
    toast('Invoice canceled (prototype)', 'success');
  },
  'qr-generate': () => {
    qrGen.store = $('#qr-store').value;
    qrGen.amount = $('#qr-amount').value;
    const amount = Number(qrGen.amount);
    qrGen.error = amount >= 1 && amount <= 500000 ? '' : 'Enter an amount between ৳1 and ৳500,000.';
    qrGen.result = qrGen.error ? null : { store: qrGen.store, amount, ref: `DQR${alnum(8)}`, at: new Date() };
    render();
  },
  'qr-txns': (el) => {
    const s = txnState('all');
    Object.assign(s, { search: '', status: 'all', method: 'Bangla QR', range: makeRange('today'), page: 1 });
    s.applied = snapshotFilters(s);
    location.hash = '#/transactions/all';
  },
  'an-preset': (el) => { an.preset = el.dataset.value; render(); },
  'an-export': () => { if (anExport) downloadCsv(anExport.name, anExport.header, anExport.rows); },
  'emi-tab': (el) => { emiTab = el.dataset.value; openDD = null; render(); },
  'emi-fold': (el) => { const c = emiForm.collapsed, name = el.dataset.value; c.has(name) ? c.delete(name) : c.add(name); render(); },
  'emi-all': (el) => {
    const on = el.dataset.value === 'on';
    for (const b of EMI_BANKS) emiForm.banks[b.name] = { on, tenures: Object.fromEntries(b.tenures.map(m => [m, on])) };
    render();
  },
  'emi-save': () => {
    const f = emiForm;
    const enabled = f.model !== 'disable';
    f.error = !f.agree ? 'Agree to the terms and conditions to update the EMI configuration.'
      : enabled && !EMI_BANKS.some(b => f.banks[b.name].on && b.tenures.some(m => f.banks[b.name].tenures[m])) ? 'Turn on at least one bank with one tenure, or set EMI Status to Disable.' : '';
    if (!f.error) {
      EMI_CONFIG[f.store] = { model: f.model, banks: structuredClone(f.banks) };
      EMI_STORES[f.store] = enabled;
      toast(`EMI configuration updated for ${STORES.find(st => st.id === f.store).name} (prototype)`, 'success');
    }
    render();
  },
  'track': () => { runTracking(); render(); },
  'track-reset': () => { Object.assign(tracking, { merchant: '', bkash: '', nagad: '', results: null }); render(); },
  'track-sample': (el) => { Object.assign(tracking, { merchant: '', bkash: '', nagad: '' }, { [el.dataset.key]: el.dataset.value }); runTracking(); render(); },
  'cb-needs-response': () => {
    const s = pageState();
    Object.assign(s, { status: 'action', range: makeRange('all'), page: 1 });
    render();
  },
  'goto-list': (el) => {
    const s = (listStates[el.dataset.path] ||= defaultListState('30d'));
    Object.assign(s, { search: '', status: el.dataset.status, range: makeRange('all') });
    commitFilters(s);
    location.hash = '#' + el.dataset.path;
  },
  'dash-preset': (el) => { dash.preset = el.dataset.value; render(); },
  'open-contacts': () => { drawer = { kind: 'contacts', item: null }; renderDrawer(); },
  // Dashboard quick action: open Payment QR with the generator's amount field ready.
  'quick-qr': () => { pendingFocus = '#qr-amount'; location.hash = '#/products/payment-qr'; },
  'goto-txn': (el) => {
    const s = txnState('all');
    Object.assign(s, { search: '', range: makeRange(dash.preset), status: el.dataset.status, method: 'all' });
    commitFilters(s);
    location.hash = '#/transactions/all';
  },
  ...authActions,
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (el && actions[el.dataset.action]) actions[el.dataset.action](el, e);
});

document.addEventListener('mousedown', (e) => {
  if (openDD && !e.target.closest('[data-dd-root]')) { openDD = null; dtDraft = null; render(); }
  if (userMenuOpen && !e.target.closest('[data-user-root]')) { userMenuOpen = false; renderHeader(); lucide.createIcons(); }
  if (headerMenu && !e.target.closest('[data-header-menu]')) openHeaderMenu(null);
});

const syncLinkPreview = () => { const el = $('#link-preview'); if (el) el.innerHTML = payPagePreview(linkDraft); lucide.createIcons(); };
const setLinkCustom = (ref, value) => {
  const [f, key] = ref.split('|');
  (linkDraft.custom[f] ||= { type: LINK_FIELD_TYPES[0] })[key] = value;
  syncLinkPreview();
};

// Ticking a store row enables its discount inputs without redrawing the (long) form.
function syncDiscountRow(scope, id, on) {
  document.querySelectorAll(`[data-${scope}-row^="${id}|"]`).forEach(el => { el.disabled = !on; });
  document.querySelector(`[data-${scope}-on="${id}"]`)?.closest('tr')?.classList.toggle('bg-primary-50/40', on);
}

function openStoreSettings(kind, id, fields) {
  openDD = null; render();
  storeDraft = { kind, id, ...fields }; formErrors = {};
  drawer = { kind: 'store-settings', item: null };
  renderDrawer();
}

document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.id === 'global-search') {
    search.q = t.value; search.active = 0;
    if (headerMenu !== 'search') { openHeaderMenu('search'); return; }
    $('#search-results').innerHTML = searchResults(); lucide.createIcons();
  }
  if (t.dataset.track) tracking[t.dataset.track] = t.value;
  if (t.id === 'fx-search') { fxQuery = t.value; $('#fx-table').innerHTML = fxTable(); }
  if (t.id === 'unsettled-search') { unsettledQ = t.value; $('#unsettled-table').innerHTML = unsettledTable(); fitTables($('#unsettled-table')); }
  if (t.id === 'qr-amount') qrGen.amount = t.value;
  if (t.dataset.link && linkDraft && t.type !== 'checkbox' && t.tagName !== 'SELECT') {
    linkDraft[t.dataset.link] = t.value;
    syncLinkPreview();
  }
  if (t.dataset.linkCf && linkDraft && t.type !== 'checkbox' && t.tagName !== 'SELECT') setLinkCustom(t.dataset.linkCf, t.value);
  if (t.dataset.linkColor && linkDraft) { linkDraft.colors[t.dataset.linkColor] = t.value; syncLinkPreview(); }
  if (t.dataset.inv && invDraft && t.tagName !== 'SELECT') invDraft[t.dataset.inv] = t.value;
  if (t.dataset.refund && refundDraft && t.tagName !== 'SELECT') refundDraft[t.dataset.refund] = t.value;
  if (t.id === 'cb-remarks' && cbDecision) cbDecision.remarks = t.value;
  if (t.dataset.mc && mcDraft && t.tagName !== 'SELECT') mcDraft[t.dataset.mc] = t.value;
  for (const [scope, draft] of [['pc', partnerDraft], ['mc', mcDraft]]) {
    const cell = draft && t.tagName !== 'SELECT' && t.getAttribute(`data-${scope}-row`);
    if (cell) { const [id, key] = cell.split('|'); draft.rows[id][key] = t.value; }
  }
  if (t.dataset.group && groupDraft && t.tagName !== 'SELECT') groupDraft[t.dataset.group] = t.value;
  if (t.dataset.other && otherDraft) otherDraft[t.dataset.other] = t.value;
  if (t.dataset.user && userDraft && t.tagName !== 'SELECT') userDraft[t.dataset.user] = t.value;
  if (t.dataset.store && storeDraft && t.type !== 'checkbox' && t.tagName !== 'SELECT') storeDraft[t.dataset.store] = t.value;
  if (t.id === 'pw-new') syncPasswordRules();
  if (['pw-old', 'pw-new', 'pw-confirm'].includes(t.id)) setPwError(t.id, '');
  if (t.dataset.ticket && ticketDraft && t.tagName !== 'SELECT') {
    ticketDraft[t.dataset.ticket] = t.value;
    if (t.dataset.ticket === 'txnId') $('#tt-lookup').innerHTML = ttLookup(t.value);
  }
  if (t.dataset.invItem && invDraft) {
    const [i, key] = t.dataset.invItem.split(':');
    invDraft.items[Number(i)][key] = t.value;
    syncInvoiceTotals();
  }
  if (e.target.id === 'txn-search' || e.target.id === 'list-search') {
    pageState().search = e.target.value;
    syncApplyButton();
  }
  if (t.dataset.filter) { pageState()[t.dataset.filter] = t.value; syncApplyButton(); }
});

document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.dt && dtDraft) {
    dtDraft[t.dataset.dt] = t.value;
    // Changing the daily window keeps the chosen days; anything else is a custom range.
    if (dtDraft.mode !== 'daily' || t.type === 'date') dtDraft.preset = 'custom';
    syncDtPopover();
  }
  if (t.dataset.change === 'page-size') { const s = pageState(); s.pageSize = Number(t.value); s.page = 1; render(); }
  if (t.id === 'qr-store') qrGen.store = t.value;
  if (t.id === 'emi-store') { loadEmiForm(t.value); render(); }
  if (t.id === 'emi-model') emiForm.model = t.value;
  if (t.id === 'emi-agree') { emiForm.agree = t.checked; if (emiForm.error) { emiForm.error = ''; render(); } }
  if (t.dataset.emiBank && emiForm) { emiForm.banks[t.dataset.emiBank].on = t.checked; render(); }
  if (t.dataset.emiTenure && emiForm) { const [bank, m] = t.dataset.emiTenure.split('|'); emiForm.banks[bank].tenures[m] = t.checked; }
  if (t.dataset.link && linkDraft && (t.type === 'checkbox' || t.tagName === 'SELECT')) {
    linkDraft[t.dataset.link] = t.type === 'checkbox' ? t.checked : t.value;
    if (t.hasAttribute('data-rerender')) renderDrawer(); else syncLinkPreview();
  }
  if (t.dataset.linkCf && linkDraft && (t.type === 'checkbox' || t.tagName === 'SELECT')) setLinkCustom(t.dataset.linkCf, t.type === 'checkbox' ? t.checked : t.value);
  if (t.hasAttribute('data-link-banner') && linkDraft) { linkDraft.banner = t.files[0]?.name || ''; renderDrawer(); }
  if (t.dataset.inv && invDraft && t.tagName === 'SELECT') { invDraft[t.dataset.inv] = t.value; syncInvoiceTotals(); }
  if (t.id === 'delivery-file' && deliveryDraft) { deliveryDraft.file = t.files[0] || null; formErrors = {}; renderDrawer(); }
  if (t.dataset.refund && refundDraft && t.tagName === 'SELECT') { refundDraft[t.dataset.refund] = t.value; if (t.hasAttribute('data-rerender')) renderDrawer(); }
  if (t.dataset.mc && mcDraft && t.tagName === 'SELECT') { mcDraft[t.dataset.mc] = t.value; if (t.hasAttribute('data-rerender')) renderDrawer(); }
  if (t.dataset.mcCheck && mcDraft) {
    const list = mcDraft[t.dataset.mcCheck];
    t.checked ? list.push(t.value) : list.splice(list.indexOf(t.value), 1);
  }
  for (const [scope, draft] of [['pc', partnerDraft], ['mc', mcDraft]]) {
    if (!draft) continue;
    const on = t.getAttribute(`data-${scope}-on`), cell = t.getAttribute(`data-${scope}-row`);
    if (on) { draft.rows[on].on = t.checked; syncDiscountRow(scope, on, t.checked); }
    if (cell && t.tagName === 'SELECT') { const [id, key] = cell.split('|'); draft.rows[id][key] = t.value; }
  }
  if (t.dataset.calToggle) { cal[t.dataset.calToggle] = t.checked; render(); }
  if (t.dataset.user && userDraft && t.tagName === 'SELECT') userDraft[t.dataset.user] = t.value;
  if (t.dataset.store && storeDraft && (t.type === 'checkbox' || t.tagName === 'SELECT')) storeDraft[t.dataset.store] = t.type === 'checkbox' ? t.checked : t.value;
  if (t.dataset.otherRadio && otherDraft) { otherDraft[t.dataset.otherRadio] = t.value; renderDrawer(); }
  if (t.dataset.otherCheck && otherDraft) { otherDraft[t.dataset.otherCheck] = t.checked; formErrors = {}; renderDrawer(); }
  if (t.hasAttribute('data-other-file') && otherDraft) {
    const f = t.files[0];
    const bad = f && (!/\.(pdf|jpe?g|png)$/i.test(f.name) ? 'Only PDF, JPG, JPEG or PNG files.' : f.size > 2 * 1024 * 1024 ? 'File size should not exceed 2MB.' : '');
    otherDraft.letter = f && !bad ? f.name : '';
    formErrors = { ...formErrors, letter: bad || undefined };
    renderDrawer();
  }
  if (t.dataset.group && groupDraft && t.tagName === 'SELECT') groupDraft[t.dataset.group] = t.value;
  if (t.dataset.ticket && ticketDraft && t.tagName === 'SELECT') { ticketDraft[t.dataset.ticket] = t.value; if (t.hasAttribute('data-rerender')) renderDrawer(); }
  if (t.hasAttribute('data-ticket-query') && ticketDraft) {
    t.checked ? ticketDraft.queries.push(t.value) : ticketDraft.queries.splice(ticketDraft.queries.indexOf(t.value), 1);
  }
  if (t.hasAttribute('data-ticket-file') && ticketDraft) {
    const f = t.files[0];
    const bad = f && (!/\.(pdf|jpe?g|png)$/i.test(f.name) ? 'Only PDF, JPG, JPEG or PNG files.' : f.size > 2 * 1024 * 1024 ? 'File size should not exceed 2MB.' : '');
    ticketDraft.attachment = f && !bad ? f.name : null;
    formErrors = { ...formErrors, attachment: bad || undefined };
    renderDrawer();
  }
});

document.addEventListener('keydown', (e) => {
  const t = e.target;
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (!drawer && !AUTH_SCREENS[currentPath()]) openHeaderMenu('search'); return; }
  if (t.id === 'global-search' && headerMenu === 'search') {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); moveSearchActive(e.key === 'ArrowDown' ? 1 : -1); return; }
    if (e.key === 'Enter') { e.preventDefault(); document.querySelector(`[data-search-item="${search.active}"]`)?.click(); return; }
  }
  if (e.key === 'Enter' && (t.id === 'txn-search' || t.id === 'list-search' || t.dataset?.filter)) { commitFilters(pageState()); render(); return; }
  // Enter in a sign-in or recovery field presses that screen's main button.
  if (e.key === 'Enter' && t.tagName === 'INPUT' && t.closest('#auth-root')) { e.preventDefault(); $('#auth-root button.w-full[data-action^="auth-"]')?.click(); return; }
  if (e.key === 'Enter' && t.dataset.track) { runTracking(); render(); return; }
  if (e.key === 'Enter' && t.id === 'refund-txn' && refundDraft) { e.preventDefault(); lookupRefundTxn(); renderDrawer(); return; }
  if (e.key === 'Enter' && t.id === 'mc-bin' && mcDraft) { e.preventDefault(); addMcBin(); return; }
  if ((e.key === 'Enter' || e.key === ' ') && t.getAttribute?.('role') === 'button' && t.dataset.action) { e.preventDefault(); t.click(); return; }
  if (e.key === 'Tab' && drawer) {
    // Keep focus inside the open drawer.
    const items = [...$('#drawer-panel').querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select, textarea, [tabindex="0"]')].filter(x => x.offsetParent !== null);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (!$('#drawer-panel').contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    return;
  }
  if (e.key !== 'Escape') return;
  if (drawer) closeDrawer();
  else if (headerMenu) { const menu = headerMenu; openHeaderMenu(null); (menu === 'search' ? $('#global-search') : $('[data-action="header-menu"][data-value="notifications"]'))?.focus(); }
  else if (openDD) { const key = openDD; openDD = null; dtDraft = null; render(); document.querySelector(`[data-key="${key}"]`)?.focus(); }
  else if (userMenuOpen) { userMenuOpen = false; renderHeader(); lucide.createIcons(); }
  else if (mobileNav) { mobileNav = false; renderSidebar(); }
});

window.addEventListener('hashchange', () => {
  if (AUTH_SCREENS[currentPath()]) resetAuthFlow();
  openDD = null; dtDraft = null; userMenuOpen = false; headerMenu = null; mobileNav = false;
  if (drawer) { drawerReturnFocus = null; closeDrawer(); }
  expanded = activeParent(currentPath());
  render();
  $('#page').scrollTop = 0;
  window.scrollTo(0, 0);
  if (pendingFocus) { $(pendingFocus)?.focus(); pendingFocus = null; }
});

let lastWidthClass = innerWidth < 768 ? 'phone' : innerWidth < 1024 ? 'tablet' : 'desktop';
window.addEventListener('resize', () => {
  const cls = innerWidth < 768 ? 'phone' : innerWidth < 1024 ? 'tablet' : 'desktop';
  if (cls === lastWidthClass) return;
  lastWidthClass = cls;
  collapsed = cls === 'tablet';
  mobileNav = false;
  render();
});

expanded = activeParent(currentPath());
render();
requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.remove('no-anim')));
