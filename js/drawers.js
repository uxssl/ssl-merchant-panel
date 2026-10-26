// =====================================================================
// Refund & chargeback statuses (labels as in the KAM panel)
// =====================================================================
const REFUND_STATUSES = ['Initiate', 'Processing', 'Submit To Bank', 'Success', 'Cancelled'];
const REFUND_OPEN = new Set(['Initiate', 'Processing', 'Submit To Bank']);
const REFUND_CLS = {
  'Initiate': 'bg-blue-50 text-blue-600',
  'Processing': 'bg-amber-50 text-amber-600',
  'Submit To Bank': 'bg-slate-100 text-slate-600',
  'Success': 'bg-emerald-50 text-emerald-600',
  'Cancelled': 'bg-rose-50 text-rose-600',
};
const CB_STATUSES = ['Initial', 'Waiting', 'Processing', 'Submit To Bank', 'Success', 'Cancel'];
const CB_OPEN = new Set(['Initial', 'Waiting']); // the merchant still has to respond
const CB_PENDING = new Set(['Initial', 'Waiting', 'Processing', 'Submit To Bank']);
const CB_CLS = {
  'Initial': 'bg-blue-50 text-blue-600',
  'Waiting': 'bg-amber-50 text-amber-600',
  'Processing': 'bg-amber-50 text-amber-600',
  'Submit To Bank': 'bg-slate-100 text-slate-600',
  'Success': 'bg-emerald-50 text-emerald-600',
  'Cancel': 'bg-rose-50 text-rose-600',
};
const refundBadge = (s) => `<span class="${STATUS_BADGE} ${REFUND_CLS[s]}">${s}</span>`;
const cbBadge = (s) => `<span class="${STATUS_BADGE} ${CB_CLS[s]}">${s}</span>`;

function respondBy(c) {
  if (!CB_OPEN.has(c.status)) return null;
  const ms = c.respondBy - NOW;
  if (ms < 0) return { text: 'Overdue', cls: 'text-rose-600' };
  const days = Math.floor(ms / 864e5);
  return { text: days === 0 ? 'Less than a day left' : `${days} day${days > 1 ? 's' : ''} left`, cls: days <= 2 ? 'text-rose-600' : 'text-amber-600' };
}

// =====================================================================
// Detail drawers (KAM Drawer.tsx)
// =====================================================================
const kv = (k, v, mono) => `<div><dt class="text-xs text-slate-500">${k}</dt><dd class="mt-0.5 font-medium text-slate-800 break-all ${mono ? 'font-mono text-xs' : ''}">${v}</dd></div>`;
const kvGrid = (items) => `<dl class="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">${items.join('')}</dl>`;
const section = (title, body) => `<section><h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">${title}</h3>${body}</section>`;
const statBox = (label, value, valueCls = 'text-slate-900') => `<div class="p-3 rounded border bg-slate-50 border-slate-100"><p class="text-[10px] text-slate-500 uppercase tracking-wide">${label}</p><p class="text-lg font-bold mt-1 ${valueCls}">${value}</p></div>`;
const linkBtn = (action, value, text) => `<button data-action="${action}" data-value="${value}" class="font-mono text-xs text-primary-600 hover:underline">${text}</button>`;
const DOT = { slate: 'bg-slate-300', emerald: 'bg-emerald-500', rose: 'bg-rose-500', amber: 'bg-amber-500', indigo: 'bg-indigo-500', blue: 'bg-blue-500' };
const timeline = (steps) => `
  <ol class="relative border-l border-slate-200 ml-1.5 space-y-4">
    ${steps.map(st => `<li class="ml-4">
      <span class="absolute -left-[5px] mt-1.5 w-2.5 h-2.5 rounded-full ring-4 ring-white ${DOT[st.tone]}"></span>
      <p class="text-sm font-medium text-slate-800">${st.label}</p>
      <p class="text-xs text-slate-500">${st.at ? `${fmtDate(st.at)}, ${fmtTime(st.at, true)}` : st.note || ''}</p>
    </li>`).join('')}
  </ol>`;
const BTN_SECONDARY = 'flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded shadow-sm hover:bg-slate-50';
const BTN_PRIMARY = 'flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded shadow-sm hover:bg-primary-700';
const PCI_NOTE = `<p class="flex items-center gap-1.5 text-[11px] text-slate-400">${ic('shield-check', 'w-3.5 h-3.5')}Card and account numbers are masked (PCI-DSS). Full card numbers are never shown in the merchant portal.</p>`;

function drawerShell({ title, sub, body, footer, wide = false }) {
  return `
    <div class="fixed inset-0 z-[150] flex justify-end">
      <div data-action="close-drawer" data-backdrop aria-hidden="true" class="fixed inset-0 bg-slate-900/20 backdrop-blur-sm anim-fade"></div>
      <div id="drawer-panel" role="dialog" aria-modal="true" aria-labelledby="drawer-title" class="relative h-full w-full ${wide ? 'max-w-2xl' : 'max-w-xl'} bg-white shadow-2xl flex flex-col anim-drawer">
        <div class="px-4 sm:px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
          <div class="min-w-0">
            <h2 id="drawer-title" class="text-lg font-semibold text-slate-900">${title}</h2>
            <div class="text-sm text-slate-500 mt-1 flex items-center gap-2">${sub}</div>
          </div>
          <button data-action="close-drawer" data-drawer-close aria-label="Close" class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors shrink-0">${ic('x', 'w-5 h-5')}</button>
        </div>
        <div class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">${body}</div>
        <div class="px-4 sm:px-6 py-4 border-t border-slate-100 flex flex-wrap justify-end gap-2">${footer}</div>
      </div>
    </div>`;
}

const txnSummary = (t) => kvGrid([
  kv('Transaction ID', linkBtn('open-txn', t.id, t.id)),
  kv('Transaction Date', `${fmtDate(t.date)}, ${fmtTime(t.date, true)}`),
  kv('Transaction Amount', fmtBDT(t.amount)),
  kv('Payment Method', `${t.method} <span class="text-slate-500 font-normal">· ${t.type}</span>`),
  kv('Card / Account', t.account, true),
  kv('Issuer', t.issuer),
]);
const storeSummary = (x) => kvGrid([kv('Store Name', esc(x.storeName)), kv('Store ID', x.store, true)]);

function txnDrawer(t) {
  const sec = (n) => new Date(t.date.getTime() + n * 1000);
  const steps = [
    { label: 'Payment initiated', at: t.date, tone: 'slate' },
    { label: `Customer redirected to ${t.method}`, at: sec(3), tone: 'slate' },
  ];
  if (t.status === 'success' || t.status === 'refunded') {
    steps.push({ label: 'Payment authorized', at: sec(t.auth), tone: 'emerald' }, { label: 'Validated by merchant (IPN)', at: sec(t.auth + 2), tone: 'emerald' });
  } else if (t.status === 'failed') {
    steps.push({ label: `Payment failed — ${t.reason}`, at: sec(t.auth), tone: 'rose' });
  } else if (t.status === 'cancelled') {
    steps.push({ label: 'Cancelled by customer', at: sec(t.auth), tone: 'slate' });
  } else {
    steps.push({ label: 'Awaiting confirmation from provider', at: sec(t.auth), tone: 'amber' });
  }
  const rf = REFUND_BY_TXN.get(t.id);
  const cb = CB_BY_TXN.get(t.id);
  const relatedRow = (action, value, icon, title, sub, badgeHtml) => `
    <button data-action="${action}" data-value="${value}" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-left">
      <span class="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">${ic(icon, 'w-4 h-4')}</span>
      <span class="flex-1 min-w-0"><span class="block text-sm font-medium text-slate-800">${title}</span><span class="block text-xs text-slate-500 font-mono">${sub}</span></span>
      ${badgeHtml}${ic('chevron-right', 'w-4 h-4 text-slate-400')}
    </button>`;
  const related = [
    rf && relatedRow('open-refund', rf.ref, 'undo-2', 'Refund request', `${rf.ref} · ${fmtBDT(rf.amount)}`, refundBadge(rf.status)),
    cb && relatedRow('open-cb', cb.ref, 'shield-alert', 'Chargeback', `${cb.ref} · ${cb.stage}`, cbBadge(cb.status)),
  ].filter(Boolean);

  return drawerShell({
    title: 'Transaction Details',
    sub: `<span class="font-mono text-xs">${t.id}</span>${badge(t.status)}`,
    body: `
      <div class="grid grid-cols-3 gap-3">
        ${statBox('Amount', fmtBDT(t.amount))}
        ${statBox('Gateway Fee <span class="lowercase font-normal opacity-80">(mock)</span>', fmtBDT(t.fee))}
        ${statBox('Store Amount', fmtBDT(t.amount - t.fee))}
      </div>
      ${t.reason ? `<div class="flex items-start gap-2 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">${ic('circle-alert', 'w-4 h-4 mt-0.5 shrink-0')}<span><span class="font-semibold">Failure reason:</span> ${t.reason}</span></div>` : ''}
      ${related.length ? section('Related Requests', `<div class="space-y-2">${related.join('')}</div>`) : ''}
      ${section('Payment Information', kvGrid([
        kv('Transaction ID', t.id, true),
        kv('Validation ID', t.valId, true),
        kv('Bank Transaction ID', t.bankTranId, true),
        kv('Date & Time', `${fmtDate(t.date)}, ${fmtTime(t.date, true)}`),
        kv('Payment Method', `${t.method} <span class="text-slate-500 font-normal">· ${t.type}</span>`),
        kv('Card / Account', t.account, true),
        kv('Issuer', t.issuer),
        kv('Currency', 'BDT'),
      ]))}
      ${section('Customer', kvGrid([kv('Name', esc(t.customer)), kv('Phone', t.phone, true), kv('Email', t.email)]))}
      ${section('Store', storeSummary(t))}
      ${section('Timeline', timeline(steps))}
      ${PCI_NOTE}`,
    footer: `
      <button data-action="new-tt" data-value="${t.id}" class="${BTN_SECONDARY}">${ic('life-buoy', 'w-4 h-4')}Raise Ticket</button>
      <button data-action="toast" data-msg="Prototype: receipt download is not wired up." class="${BTN_SECONDARY}">${ic('file-down', 'w-4 h-4')}Download Receipt</button>
      ${t.status === 'success' && !rf ? `<button data-action="toast" data-msg="Prototype: no refund request was submitted." class="${BTN_PRIMARY}">${ic('undo-2', 'w-4 h-4')}Request Refund</button>` : ''}`,
  });
}

function refundDrawer(r) {
  const t = r.txn;
  const after = (h) => new Date(Math.min(NOW.getTime(), r.date.getTime() + h * 3600e3));
  const order = ['Initiate', 'Processing', 'Submit To Bank', 'Success'];
  const reached = (s) => order.indexOf(r.status) >= order.indexOf(s);
  const steps = [{ label: `Refund requested by ${r.requestedBy}`, at: r.date, tone: 'blue' }];
  if (r.status === 'Cancelled') {
    steps.push({ label: 'Request cancelled', at: after(26), tone: 'rose' });
  } else {
    steps.push(reached('Processing')
      ? { label: 'Approved by SSLCOMMERZ', at: after(3), tone: 'amber' }
      : { label: 'Waiting for approval', note: 'Usually reviewed within one working day (mock)', tone: 'slate' });
    if (reached('Submit To Bank')) steps.push({ label: `Submitted to ${t.issuer}`, at: after(20), tone: 'amber' });
    if (reached('Success')) steps.push({ label: 'Refunded to customer', at: after(48), tone: 'emerald' });
    else steps.push({ label: 'Refund to customer', note: 'Pending', tone: 'slate' });
  }

  return drawerShell({
    title: 'Refund Details',
    sub: `<span class="font-mono text-xs">${r.ref}</span>${refundBadge(r.status)}`,
    body: `
      <div class="grid grid-cols-3 gap-3">
        ${statBox('Transaction Amount', fmtBDT(t.amount))}
        ${statBox('Refund Amount', fmtBDT(r.amount), 'text-rose-600')}
        ${statBox('Refund Type', r.type)}
      </div>
      ${section('Refund Information', kvGrid([
        kv('Refund Reference ID', r.ref, true),
        kv('Request Status', refundBadge(r.status)),
        kv('Requested On', `${fmtDate(r.date)}, ${fmtTime(r.date, true)}`),
        kv('Requested By', r.requestedBy, true),
        kv('Merchant\'s Remarks', esc(r.remarks)),
      ]))}
      ${section('Transaction Details', txnSummary(t))}
      ${section('Store', storeSummary(r))}
      ${section('Progress', timeline(steps))}
      ${PCI_NOTE}`,
    footer: `
      <button data-action="open-txn" data-value="${t.id}" class="${BTN_SECONDARY}">${ic('receipt', 'w-4 h-4')}View Transaction</button>
      ${r.status === 'Initiate' ? `<button data-action="toast" data-msg="Prototype: the refund request was not cancelled." class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-rose-600 bg-white border border-rose-200 rounded shadow-sm hover:bg-rose-50">${ic('x', 'w-4 h-4')}Cancel Request</button>` : ''}`,
  });
}

function cbDrawer(c) {
  const t = c.txn;
  const rb = respondBy(c);
  const after = (h) => new Date(Math.min(NOW.getTime(), c.date.getTime() + h * 3600e3));
  const steps = [
    { label: `Chargeback raised by ${c.bank}`, at: c.date, tone: 'blue' },
    { label: 'Merchant notified by email & portal', at: after(1), tone: 'slate' },
  ];
  if (CB_OPEN.has(c.status)) steps.push({ label: 'Waiting for your response', note: `Respond by ${fmtDate(c.respondBy)}, ${fmtTime(c.respondBy)}`, tone: 'amber' });
  if (['Processing', 'Submit To Bank', 'Success', 'Cancel'].includes(c.status)) steps.push({ label: 'Evidence received — under review', at: after(72), tone: 'amber' });
  if (['Submit To Bank', 'Success', 'Cancel'].includes(c.status)) steps.push({ label: `Submitted to ${c.bank}`, at: after(120), tone: 'amber' });
  if (c.status === 'Success') steps.push({ label: 'Chargeback accepted — amount adjusted from settlement', at: after(200), tone: 'rose' });
  if (c.status === 'Cancel') steps.push({ label: 'Chargeback cancelled — no amount adjusted', at: after(200), tone: 'emerald' });

  return drawerShell({
    title: 'Chargeback Information',
    sub: `<span class="font-mono text-xs">${c.ref}</span>${cbBadge(c.status)}`,
    body: `
      <div class="grid grid-cols-3 gap-3">
        ${statBox('Transaction Amount', fmtBDT(t.amount))}
        ${statBox('Chargeback Amount', fmtBDT(c.amount), 'text-rose-600')}
        ${statBox('Respond By', rb ? `${fmtShort(c.respondBy)}<span class="block text-[11px] font-semibold ${rb.cls}">${rb.text}</span>` : '—')}
      </div>
      ${rb ? `<div class="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">${ic('triangle-alert', 'w-4 h-4 mt-0.5 shrink-0')}<span>Upload delivery proof, invoice or customer communication before the deadline. Without a response the chargeback may be accepted automatically (mock rule).</span></div>` : ''}
      ${section('Key Information', kvGrid([
        kv('Chargeback Reference ID', c.ref, true),
        kv('Request Status', cbBadge(c.status)),
        kv('Chargeback Reason', c.reason),
        kv('Chargeback Stage', c.stage),
        kv('Bank Name', c.bank),
        kv('Requested On', `${fmtDate(c.date)}, ${fmtTime(c.date, true)}`),
      ]))}
      ${section('Transaction Details', txnSummary(t))}
      ${section('Store', storeSummary(c))}
      ${section('Progress', timeline(steps))}
      ${PCI_NOTE}`,
    footer: `
      <button data-action="open-txn" data-value="${t.id}" class="${BTN_SECONDARY}">${ic('receipt', 'w-4 h-4')}View Transaction</button>
      ${rb ? `<button data-action="toast" data-msg="Prototype: evidence upload is not wired up." class="${BTN_PRIMARY}">${ic('upload', 'w-4 h-4')}Submit Evidence</button>` : ''}`,
  });
}

let drawerReturnFocus = null;
const FIELD_KEYS = ['id', 'data-link', 'data-link-color', 'data-inv', 'data-inv-item', 'data-mc', 'data-ticket', 'data-user', 'data-group', 'data-other', 'data-join-store', 'data-group-store'];
// Remembers which field had focus so a re-render (validation, add item…) can put it back.
function focusKey(el) {
  if (!el || el === document.body) return null;
  for (const k of FIELD_KEYS) if (el.hasAttribute?.(k)) return `[${k}="${CSS.escape(el.getAttribute(k))}"]`;
  return el.dataset?.action ? `[data-action="${el.dataset.action}"]${el.dataset.value ? `[data-value="${CSS.escape(el.dataset.value)}"]` : ''}` : null;
}

function renderDrawer() {
  const root = $('#drawer-root');
  const wasOpen = !!root.firstElementChild;
  if (!drawer) {
    root.innerHTML = '';
    document.body.style.overflow = '';
    if (wasOpen && drawerReturnFocus?.isConnected) drawerReturnFocus.focus();
    drawerReturnFocus = null;
    return;
  }
  const key = wasOpen ? focusKey(document.activeElement) : null;
  if (!wasOpen) drawerReturnFocus = document.activeElement;
  document.body.style.overflow = 'hidden';
  const render = { txn: txnDrawer, contacts: contactsDrawer, refund: refundDrawer, cb: cbDrawer, settlement: settlementDrawer, fy: fyDrawer, link: linkDrawer, 'link-new': linkFormDrawer, invoice: invoiceDrawer, 'invoice-new': invoiceFormDrawer, emi: emiDrawer, partner: partnerDrawer, 'partner-join': joinDrawer, mc: mcDrawer, 'mc-new': mcFormDrawer, tt: ttDrawer, 'tt-new': ttFormDrawer, gt: gtDrawer, 'gt-new': gtFormDrawer, sr: srDrawer, 'sr-new': srFormDrawer, store: storeDrawer, group: groupDrawer, 'group-new': groupFormDrawer, user: userDrawer, 'user-new': userFormDrawer, 'referral-new': referralFormDrawer, 'sms-buy': smsBuyDrawer, video: videoDrawer }[drawer.kind];
  root.innerHTML = render(drawer.item);
  lucide.createIcons();
  makeKeyboardReachable(root);
  const panel = $('#drawer-panel');
  const firstError = Object.keys(formErrors).length && panel.querySelector('.text-rose-600')?.closest('label, section, div')?.querySelector('input, select, textarea');
  const target = firstError || (key && panel.querySelector(key)) || (!wasOpen && (panel.querySelector('input:not([disabled]), select, textarea') || panel.querySelector('[data-drawer-close]')));
  target?.focus();
}

// Rows and cards that open something are divs/trs; give them a tab stop and a role.
function makeKeyboardReachable(root) {
  root.querySelectorAll('[data-action]:not(button):not(a):not(input):not(select):not(textarea):not([data-backdrop])').forEach(el => {
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
    if (!el.hasAttribute('role')) el.setAttribute('role', 'button');
  });
}

function closeDrawer() {
  drawer = null;
  linkDraft = invDraft = joinDraft = mcDraft = ticketDraft = groupDraft = userDraft = otherDraft = null;
  formErrors = {};
  renderDrawer();
}
