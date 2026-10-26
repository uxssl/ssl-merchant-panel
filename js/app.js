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
  } else if (path === ACC.myStores) {
    page.innerHTML = renderMyStores();
  } else if (path === ACC.storeList) {
    page.innerHTML = renderStoreList();
  } else if (path === ACC.groups) {
    page.innerHTML = renderStoreGroups();
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
  lucide.createIcons();
  if (path === '/dashboard') mountDashboardCharts();
  if (window.Chart && chartQueue.length) {
    setChartDefaults();
    chartQueue.forEach(({ id, config }) => { const el = document.getElementById(id); if (el) charts.push(new Chart(el, config)); });
  }
  if (openDD === 'txn:range') syncDtPopover();
}

function render() {
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
    const to = NAV.find(n => n.key === key).to;
    // A parent with its own page opens it (the hashchange render expands it); clicking it again on that page toggles the list.
    if (to && currentPath() !== to) { if (navCollapsed) collapsed = false; location.hash = '#' + to; return; }
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
    else if (scope === 'learn') learn[key] = value;
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
    LIST_FILTER_KEYS.forEach(k => { s[k] = 'all'; });
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
        ['Refund Ref. ID', 'Requested On', 'Transaction ID', 'Store', 'Refund Type', 'Refund Amount (BDT)', 'Transaction Amount (BDT)', 'Status'],
        refundRows(applied(pageState())).map(r => [r.ref, `${fmtDate(r.date)} ${fmtTime(r.date, true)}`, r.txn.id, r.storeName, r.type, r.amount.toFixed(2), r.txn.amount.toFixed(2), r.status]));
    }
    if (path === LINKS_PATH) {
      return downloadCsv('payment-links', ['Payment Name', 'Refer Id', 'Store', 'Amount Type', 'Amount', 'Payment Type', 'Payments', 'Collected (BDT)', 'Created On', 'Status', 'Payment URL'],
        linkRows(applied(pageState())).map(l => [l.name, l.ref, l.storeName, l.amountType, l.amount ?? '', l.paymentType, l.payments.length, linkCollected(l).toFixed(2), fmtDate(l.date), l.active ? 'Active' : 'Inactive', linkUrl(l.ref)]));
    }
    if (path === INVOICES_PATH) {
      return downloadCsv('invoices', ['Invoice No', 'Customer', 'Store', 'Issue Date', 'Due Date', 'Subtotal', 'VAT', 'Total (BDT)', 'Status'],
        invoiceRows(applied(pageState())).map(inv => { const t = invoiceTotals(inv); return [inv.no, inv.customer, inv.storeName, fmtDate(inv.date), fmtDate(inv.due), t.subtotal.toFixed(2), t.vat.toFixed(2), t.total.toFixed(2), inv.status]; }));
    }
    if (path === EMI_PATH) {
      return downloadCsv('emi-requests', ['EMI Ref. Id', 'Requested On', 'Store', 'Transaction ID', 'TXN Amount', 'EMI Amount', 'Tenure', 'EMI Issuer Bank', 'Status', 'Bank Status'],
        emiRows(applied(pageState())).map(e => [e.ref, `${fmtDate(e.date)} ${fmtTime(e.date, true)}`, e.storeName, e.txn.id, e.txn.amount.toFixed(2), e.charge.toFixed(2), `${e.tenure} Months`, e.bank, e.status, e.bankStatus]));
    }
    if (path === SETTLEMENT_PATH) {
      return downloadCsv('settlement-report',
        ['Settlement Date', 'Reference No', 'Batch No', 'Store', 'Settlement Type', 'Opening Amt', 'Payable Amt', 'Settle Amt', 'Paid Amt', 'Fwd Amt', 'Status', 'Bank', 'Account (masked)'],
        settlementRows(applied(pageState())).map(x => [`${fmtDate(x.date)} ${fmtTime(x.date)}`, x.ref, x.batch, x.storeName, x.type, x.opening.toFixed(2), x.payable.toFixed(2), x.settle.toFixed(2), x.paid.toFixed(2), x.fwd.toFixed(2), x.status, `${x.bank.bank} - ${x.bank.branch}`, x.bank.account]));
    }
    if (path === CB_PATH) {
      return downloadCsv('chargeback-requests',
        ['Chargeback Ref. ID', 'Requested On', 'Transaction ID', 'Store', 'Stage', 'Reason', 'Amount (BDT)', 'Respond By', 'Status'],
        cbRows(applied(pageState())).map(c => [c.ref, `${fmtDate(c.date)} ${fmtTime(c.date, true)}`, c.txn.id, c.storeName, c.stage, c.reason, c.amount.toFixed(2), CB_OPEN.has(c.status) ? fmtDate(c.respondBy) : '', c.status]));
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
  'open-txn': (el) => { drawer = { kind: 'txn', item: TXNS.find(t => t.id === el.dataset.value) }; renderDrawer(); },
  'open-refund': (el) => { drawer = { kind: 'refund', item: REFUNDS.find(r => r.ref === el.dataset.value) }; renderDrawer(); },
  'open-cb': (el) => { drawer = { kind: 'cb', item: CHARGEBACKS.find(c => c.ref === el.dataset.value) }; renderDrawer(); },
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
  'new-referral': () => { otherDraft = { name: '', mobile: '' }; formErrors = {}; drawer = { kind: 'referral-new', item: null }; renderDrawer(); },
  'save-referral': () => {
    const d = otherDraft;
    formErrors = {};
    if (!d.name.trim()) formErrors.name = 'Enter the business name.';
    if (!/^01[3-9]\d{8}$/.test(d.mobile.trim())) formErrors.mobile = 'Enter an 11-digit mobile number starting with 01.';
    if (Object.keys(formErrors).length) { renderDrawer(); return; }
    REFERRALS.unshift({ name: d.name.trim(), status: 'Invited', bonus: 'Not yet eligible', date: new Date(TODAY), contact: `01•••••${d.mobile.trim().slice(-3)}` });
    otherDraft = null; drawer = null; renderDrawer(); render();
    toast('Invite added — prototype, no SMS was sent', 'success');
  },
  'fx-dir': (el) => { fx.dir = el.dataset.value; render(); },
  'fx-chart': (el) => { fx.chart = el.dataset.value; render(); },
  'vas-tab': (el) => { vasTab = el.dataset.value; render(); },
  'vas-interest': (el) => {
    VAS_SERVICES.find(v => v.id === el.dataset.value).status = 'Requested';
    render();
    toast('Your KAM will contact you (prototype — no lead was created)', 'success');
  },
  'sms-buy': (el) => { otherDraft = { pkg: el.dataset.value, pay: 'settlement' }; drawer = { kind: 'sms-buy', item: null }; renderDrawer(); },
  'sms-confirm': () => {
    otherDraft = null; drawer = null; renderDrawer();
    toast('Prototype: no purchase was made and no money was charged', 'success');
  },
  'dev-tab': (el) => { devTab = el.dataset.value; render(); },
  'faq-toggle': (el) => { faqState.open = faqState.open === el.dataset.value ? null : el.dataset.value; $('#faq-list').innerHTML = faqList(); lucide.createIcons(); },
  'faq-cat': (el) => { faqState.cat = el.dataset.value; faqState.open = null; render(); },
  'learn-tab': (el) => { learn.tab = el.dataset.value; render(); },
  'open-video': (el) => { drawer = { kind: 'video', item: VIDEOS.find(v => v.id === el.dataset.value) }; renderDrawer(); },
  'open-store': (el) => { drawer = { kind: 'store', item: accStore(el.dataset.value) }; renderDrawer(); },
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
  'new-group': () => { groupDraft = { id: null, name: '', description: '', stores: [] }; formErrors = {}; drawer = { kind: 'group-new', item: null }; renderDrawer(); },
  'edit-group': (el) => { const g = groupOf(el.dataset.value); groupDraft = { id: g.id, name: g.name, description: g.description, stores: [...g.stores] }; formErrors = {}; drawer = { kind: 'group-new', item: null }; renderDrawer(); },
  'save-group': () => {
    const d = groupDraft;
    formErrors = {};
    if (!d.name.trim()) formErrors.name = 'Enter a group name.';
    else if (STORE_GROUPS.some(g => g.id !== d.id && g.name.toLowerCase() === d.name.trim().toLowerCase())) formErrors.name = 'A group with this name already exists.';
    if (!d.stores.length) formErrors.stores = 'Choose at least one store.';
    if (Object.keys(formErrors).length) { renderDrawer(); return; }
    let g = d.id && groupOf(d.id);
    if (g) Object.assign(g, { name: d.name.trim(), description: d.description.trim(), stores: [...d.stores] });
    else { g = { id: `G${STORE_GROUPS.length + 1}${alnum(3)}`, name: d.name.trim(), description: d.description.trim(), stores: [...d.stores] }; STORE_GROUPS.push(g); }
    groupDraft = null;
    drawer = { kind: 'group', item: g };
    renderDrawer(); render();
    toast('Store group saved (prototype)', 'success');
  },
  'delete-group': (el) => {
    STORE_GROUPS.splice(STORE_GROUPS.findIndex(g => g.id === el.dataset.value), 1);
    drawer = null; renderDrawer(); render();
    toast('Store group deleted (prototype)', 'success');
  },
  'open-user': (el) => { drawer = { kind: 'user', item: USERS.find(u => u.login === el.dataset.value) }; renderDrawer(); },
  'new-user': () => { userDraft = { name: '', mobile: '', email: '', login: '', role: '', group: 'G1', appRole: 'Merchant App Role', ips: '', status: 'Active' }; formErrors = {}; drawer = { kind: 'user-new', item: null }; renderDrawer(); },
  'save-user': () => {
    formErrors = validateUser();
    if (Object.keys(formErrors).length) { renderDrawer(); return; }
    const d = userDraft;
    const email = d.email.trim();
    const user = {
      login: d.login.trim(), name: d.name.trim(), role: d.role, group: d.group, status: d.status, appRole: d.appRole,
      ips: d.ips.split(',').map(x => x.trim()).filter(Boolean).join(', '),
      // Keep only masked contact details, like the rest of the portal.
      email: `${email[0]}•••••@${email.split('@')[1]}`, mobile: `01•••••${d.mobile.trim().slice(-3)}`,
      lastLogin: new Date(NOW), created: new Date(NOW),
    };
    USERS.push(user);
    userDraft = null;
    drawer = { kind: 'user', item: user };
    renderDrawer(); render();
    toast('User added — prototype, no invitation email was sent', 'success');
  },
  'user-toggle': (el) => {
    const u = USERS.find(x => x.login === el.dataset.value);
    u.status = u.status === 'Active' ? 'Inactive' : 'Active';
    renderDrawer(); render();
    toast(`User ${u.status === 'Active' ? 'activated' : 'deactivated'} (prototype)`, 'success');
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
  'open-sr': (el) => { drawer = { kind: 'sr', item: SERVICE_REQUESTS.find(r => r.no === el.dataset.value) }; renderDrawer(); },
  'new-tt': (el) => { ticketDraft = { txnId: el.dataset.value || '', queries: [], text: '' }; formErrors = {}; drawer = { kind: 'tt-new', item: null }; renderDrawer(); },
  'new-gt': () => { ticketDraft = { title: '', type: '', store: '', text: '', attachment: null }; formErrors = {}; drawer = { kind: 'gt-new', item: null }; renderDrawer(); },
  'new-sr': () => { ticketDraft = { type: '', store: STORES[0].id, qty: '1', text: '' }; formErrors = {}; drawer = { kind: 'sr-new', item: null }; renderDrawer(); },
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
  'save-sr': () => {
    const d = ticketDraft;
    const type = SERVICE_TYPES.find(t => t.v === d.type);
    const qty = Number(d.qty) || 1;
    formErrors = {};
    if (!type) formErrors.type = 'Choose a service.';
    if (qty < 1 || qty > 50) formErrors.qty = 'Enter 1–50.';
    if (Object.keys(formErrors).length) { renderDrawer(); return; }
    const store = STORES.find(st => st.id === d.store);
    const req = {
      no: `SR${ymd(NOW)}${digits(4)}`, date: new Date(NOW), type: type.v, sla: type.sla, due: endOfDay(addDays(TODAY, type.sla)),
      store: store.id, storeName: store.name, qty: ['QR Standee Delivery', 'Branding Materials'].includes(type.v) ? qty : 1,
      stage: 'Requested', stageIndex: 0, stageAt: [new Date(NOW)], assignee: 'Assigned after approval', notes: d.text.trim(), rating: null,
    };
    SERVICE_REQUESTS.unshift(req);
    ticketDraft = null;
    drawer = { kind: 'sr', item: req };
    renderDrawer(); render();
    toast('Service requested (prototype — saved in this page only)', 'success');
  },
  'cancel-sr': (el) => {
    Object.assign(SERVICE_REQUESTS.find(r => r.no === el.dataset.value), { stage: 'Cancelled', stageIndex: -1 });
    renderDrawer(); render();
    toast('Request cancelled (prototype)', 'success');
  },
  'rate-sr': (el) => {
    SERVICE_REQUESTS.find(r => r.no === el.dataset.value).rating = Number(el.dataset.rating);
    renderDrawer();
    toast('Thanks for the rating (prototype)', 'success');
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
  'partner-tab': (el) => { partnerTab = el.dataset.value; render(); },
  'open-partner': (el) => { drawer = { kind: 'partner', item: PARTNER_CAMPAIGNS.find(c => c.id === el.dataset.value) }; renderDrawer(); },
  'join-partner': (el) => {
    const c = PARTNER_CAMPAIGNS.find(x => x.id === el.dataset.value);
    joinDraft = { id: c.id, stores: [], agree: false };
    formErrors = {};
    drawer = { kind: 'partner-join', item: null };
    renderDrawer();
  },
  'submit-join': () => {
    formErrors = {};
    if (!joinDraft.stores.length) formErrors.stores = 'Choose at least one store.';
    if (!joinDraft.agree) formErrors.agree = 'Accept the cost share to continue.';
    if (Object.keys(formErrors).length) { renderDrawer(); return; }
    const c = PARTNER_CAMPAIGNS.find(x => x.id === joinDraft.id);
    Object.assign(c, { participation: 'Created', stores: [...joinDraft.stores] });
    joinDraft = null;
    drawer = { kind: 'partner', item: c };
    renderDrawer(); render();
    toast('Request sent to your KAM (prototype)', 'success');
  },
  'withdraw-partner': (el) => {
    const c = PARTNER_CAMPAIGNS.find(x => x.id === el.dataset.value);
    Object.assign(c, { participation: 'Not joined', stores: [] });
    renderDrawer(); render();
    toast('Request withdrawn (prototype)', 'success');
  },
  'open-mc': (el) => { drawer = { kind: 'mc', item: MERCHANT_CAMPAIGNS.find(c => c.id === el.dataset.value) }; renderDrawer(); },
  'new-mc': () => { mcDraft = newMcDraft(); formErrors = {}; drawer = { kind: 'mc-new', item: null }; renderDrawer(); },
  'save-mc': (el) => {
    formErrors = validateMc();
    if (Object.keys(formErrors).length) { renderDrawer(); return; }
    const d = mcDraft;
    const c = {
      id: `MC${alnum(6)}`, tracking: alnum(20), name: d.name.trim(), description: d.description.trim(),
      start: new Date(`${d.start}T00:00`), end: endOfDay(new Date(`${d.end}T00:00`)),
      stores: [...d.stores], banks: [...d.banks], mfs: [...d.mfs], ib: [...d.ib],
      type: d.type, value: Number(d.value), max: d.type === 'Percentage' ? Number(d.max) : Number(d.value),
      minOrder: Number(d.minOrder) || 0, perUser: Number(d.perUser), status: el.dataset.value,
    };
    MERCHANT_CAMPAIGNS.unshift(c);
    mcDraft = null; formErrors = {};
    drawer = { kind: 'mc', item: c };
    renderDrawer(); render();
    toast(c.status === 'Pending' ? 'Submitted to your KAM for approval (prototype)' : 'Saved as draft (prototype)', 'success');
  },
  'mc-submit': (el) => { MERCHANT_CAMPAIGNS.find(c => c.id === el.dataset.value).status = 'Pending'; renderDrawer(); render(); toast('Submitted to your KAM for approval (prototype)', 'success'); },
  'mc-close': (el) => { MERCHANT_CAMPAIGNS.find(c => c.id === el.dataset.value).status = 'Closed'; renderDrawer(); render(); toast('Campaign closed (prototype)', 'success'); },
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
    formErrors = {};
    if (!d.name.trim()) formErrors.name = 'Enter a payment name.';
    if (d.amountType === 'Fixed' && !(Number(d.amount) > 0)) formErrors.amount = 'Enter an amount greater than 0.';
    if (d.convOn && !(Number(d.convFee) > 0 && Number(d.convFee) <= 10)) formErrors.convFee = 'Enter a fee between 0.1 and 10.';
    if (Object.keys(formErrors).length) { renderDrawer(); return; }
    const store = STORES.find(st => st.id === d.store);
    const link = {
      ref: alnum(13), name: d.name.trim(), store: store.id, storeName: store.name, date: new Date(NOW), // NOW keeps it inside 'All Time'
      payType: 'Payment Link', paymentType: d.paymentType, amountType: d.amountType,
      amount: d.amountType === 'Fixed' ? Number(d.amount) : null, amountText: d.amountText,
      convFee: d.convOn ? Number(d.convFee) : 0, buttonName: d.buttonName || 'Pay Now',
      productDetails: d.productDetails, topMessage: d.topMessage, buttonMessage: d.buttonMessage,
      domainUrl: '', colors: { ...d.colors }, active: true, payments: [],
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
  'inv-add-item': () => { invDraft.items.push({ desc: '', qty: '1', price: '' }); renderDrawer(); },
  'inv-remove-item': (el) => { invDraft.items.splice(Number(el.dataset.value), 1); renderDrawer(); },
  'save-invoice': (el) => {
    formErrors = validateInvoice();
    if (Object.keys(formErrors).length) { renderDrawer(); return; }
    const d = invDraft;
    const store = STORES.find(st => st.id === d.store);
    const phone = d.phone.trim();
    const email = d.email.trim();
    const inv = {
      no: `INV-${NOW.getFullYear()}-${1040 + INVOICES.length}`, ref: alnum(13), store: store.id, storeName: store.name,
      // Only masked contact details are kept, the same as the rest of the portal.
      customer: d.customer.trim(), phone: `01•••••${phone.slice(-3)}`, email: email ? `${email[0]}•••••@${email.split('@')[1]}` : '—',
      date: new Date(NOW), due: endOfDay(new Date(`${d.due}T00:00`)), vatRate: Number(d.vatRate) || 0, notes: d.notes.trim(),
      items: d.items.filter(it => it.desc.trim() && Number(it.qty) > 0 && Number(it.price) > 0).map(it => ({ desc: it.desc.trim(), qty: Number(it.qty), price: Number(it.price) })),
      status: el.dataset.value, viewed: false,
    };
    INVOICES.unshift(inv);
    invDraft = null; formErrors = {};
    drawer = { kind: 'invoice', item: inv };
    renderDrawer(); render();
    toast(inv.status === 'Sent' ? 'Invoice created — prototype, no SMS or email was sent' : 'Invoice saved as draft (prototype)', 'success');
  },
  'invoice-send': (el) => {
    const inv = INVOICES.find(i => i.no === el.dataset.value);
    inv.status = NOW > inv.due ? 'Overdue' : 'Sent';
    renderDrawer(); render();
    toast('Marked as sent — prototype, no SMS or email was sent', 'success');
  },
  'invoice-cancel': (el) => {
    INVOICES.find(i => i.no === el.dataset.value).status = 'Cancelled';
    renderDrawer(); render();
    toast('Invoice cancelled (prototype)', 'success');
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
    Object.assign(txnState('bangla-qr'), { search: '', status: 'all', store: el.dataset.value, range: makeRange('today'), page: 1 });
    location.hash = '#/transactions/bangla-qr';
  },
  'an-preset': (el) => { an.preset = el.dataset.value; render(); },
  'an-export': () => { if (anExport) downloadCsv(anExport.name, anExport.header, anExport.rows); },
  'emi-tab': (el) => { emiTab = el.dataset.value; openDD = null; render(); },
  'track': () => { tracking.query = $('#track-input').value; runTracking(); render(); },
  'track-sample': (el) => { tracking.query = el.dataset.value; runTracking(); render(); },
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

document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.id === 'global-search') {
    search.q = t.value; search.active = 0;
    if (headerMenu !== 'search') { openHeaderMenu('search'); return; }
    $('#search-results').innerHTML = searchResults(); lucide.createIcons();
  }
  if (t.id === 'track-input') tracking.query = t.value;
  if (t.id === 'qr-amount') qrGen.amount = t.value;
  if (t.id === 'emi-calc-amount') { emiCalc.amount = t.value; $('#emi-calc-result').innerHTML = emiCalcResult(); }
  if (t.dataset.link && linkDraft && t.type !== 'checkbox' && t.tagName !== 'SELECT') {
    linkDraft[t.dataset.link] = t.value;
    $('#link-preview').innerHTML = payPagePreview(linkDraft);
  }
  if (t.dataset.linkColor && linkDraft) { linkDraft.colors[t.dataset.linkColor] = t.value; $('#link-preview').innerHTML = payPagePreview(linkDraft); }
  if (t.dataset.inv && invDraft && t.tagName !== 'SELECT') invDraft[t.dataset.inv] = t.value;
  if (t.dataset.mc && mcDraft && t.tagName !== 'SELECT') mcDraft[t.dataset.mc] = t.value;
  if (t.dataset.group && groupDraft) groupDraft[t.dataset.group] = t.value;
  if (t.dataset.other && otherDraft) otherDraft[t.dataset.other] = t.value;
  if (t.id === 'fx-amount') { fx.amount = t.value; $('#fx-result').innerHTML = fxResult(); }
  if (t.id === 'faq-search') { faqState.q = t.value; faqState.open = null; $('#faq-list').innerHTML = faqList(); lucide.createIcons(); }
  if (t.id === 'learn-search') { learn.q = t.value; render(); }
  if (t.dataset.user && userDraft && t.tagName !== 'SELECT') userDraft[t.dataset.user] = t.value;
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
  if (t.id === 'emi-calc-bank') { emiCalc.bank = t.value; $('#emi-calc-result').innerHTML = emiCalcResult(); }
  if (t.dataset.link && linkDraft && (t.type === 'checkbox' || t.tagName === 'SELECT')) {
    linkDraft[t.dataset.link] = t.type === 'checkbox' ? t.checked : t.value;
    if (t.hasAttribute('data-rerender')) renderDrawer(); else $('#link-preview').innerHTML = payPagePreview(linkDraft);
  }
  if (t.dataset.inv && invDraft && t.tagName === 'SELECT') { invDraft[t.dataset.inv] = t.value; syncInvoiceTotals(); }
  if (t.dataset.mc && mcDraft && t.tagName === 'SELECT') { mcDraft[t.dataset.mc] = t.value; if (t.hasAttribute('data-rerender')) renderDrawer(); }
  if (t.dataset.mcCheck && mcDraft) {
    const list = mcDraft[t.dataset.mcCheck];
    t.checked ? list.push(t.value) : list.splice(list.indexOf(t.value), 1);
    renderDrawer();
  }
  if (t.dataset.joinStore && joinDraft) {
    const list = joinDraft.stores;
    t.checked ? list.push(t.dataset.joinStore) : list.splice(list.indexOf(t.dataset.joinStore), 1);
  }
  if (t.hasAttribute('data-join-agree') && joinDraft) joinDraft.agree = t.checked;
  if (t.dataset.calToggle) { cal[t.dataset.calToggle] = t.checked; render(); }
  if (t.dataset.user && userDraft && t.tagName === 'SELECT') userDraft[t.dataset.user] = t.value;
  if (t.id === 'fx-code') { fx.code = t.value; $('#fx-result').innerHTML = fxResult(); }
  if (t.dataset.otherRadio && otherDraft) { otherDraft[t.dataset.otherRadio] = t.value; renderDrawer(); }
  if (t.id === 'sms-alert') { sms.lowAlert = t.checked; render(); }
  if (t.id === 'sms-threshold') { sms.threshold = Number(t.value); render(); }
  if (t.dataset.groupStore && groupDraft) {
    const list = groupDraft.stores;
    t.checked ? list.push(t.dataset.groupStore) : list.splice(list.indexOf(t.dataset.groupStore), 1);
  }
  if (t.dataset.ticket && ticketDraft && t.tagName === 'SELECT') { ticketDraft[t.dataset.ticket] = t.value; if (t.hasAttribute('data-rerender')) renderDrawer(); }
  if (t.hasAttribute('data-ticket-query') && ticketDraft) {
    t.checked ? ticketDraft.queries.push(t.value) : ticketDraft.queries.splice(ticketDraft.queries.indexOf(t.value), 1);
  }
  if (t.hasAttribute('data-ticket-file') && ticketDraft) { ticketDraft.attachment = t.files[0]?.name || null; renderDrawer(); }
});

document.addEventListener('keydown', (e) => {
  const t = e.target;
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (!drawer) openHeaderMenu('search'); return; }
  if (t.id === 'global-search' && headerMenu === 'search') {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); moveSearchActive(e.key === 'ArrowDown' ? 1 : -1); return; }
    if (e.key === 'Enter') { e.preventDefault(); document.querySelector(`[data-search-item="${search.active}"]`)?.click(); return; }
  }
  if (e.key === 'Enter' && (t.id === 'txn-search' || t.id === 'list-search')) { commitFilters(pageState()); render(); return; }
  if (e.key === 'Enter' && t.id === 'track-input') { tracking.query = t.value; runTracking(); render(); return; }
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
