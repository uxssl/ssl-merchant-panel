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
// Old panel request / approval statuses shown next to each other.
const REQ_STATUS_CLS = { Success: 'bg-emerald-50 text-emerald-600', Processing: 'bg-amber-50 text-amber-600', Cancel: 'bg-rose-50 text-rose-600' };
const MY_CB_LABEL = { Initial: 'Initial', Waiting: 'Waiting', Processing: 'Processing', Approve: 'Approved', Deny: 'Denied', Cancel: 'Cancelled' };
const MY_CB_CLS = { Initial: 'bg-blue-50 text-blue-600', Waiting: 'bg-amber-50 text-amber-600', Processing: 'bg-amber-50 text-amber-600', Approve: 'bg-emerald-50 text-emerald-600', Deny: 'bg-rose-50 text-rose-600', Cancel: 'bg-slate-100 text-slate-500' };
const reqBadge = (s) => `<span class="${STATUS_BADGE} ${REQ_STATUS_CLS[s]}">${s}</span>`;
const myCbBadge = (s) => `<span class="${STATUS_BADGE} ${MY_CB_CLS[s]}">${MY_CB_LABEL[s]}</span>`;
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
      <div id="drawer-panel" role="dialog" aria-modal="true" aria-labelledby="drawer-title" class="relative h-full w-full ${wide === 'xl' ? 'max-w-4xl' : wide ? 'max-w-2xl' : 'max-w-xl'} bg-white shadow-2xl flex flex-col anim-drawer">
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


// Old panel "Transaction Details": ids & gateway, amounts, card & customer IP on one side;
// risk, bank processing, refund / settlement / chargeback, merchant API validation, discount and IPN on the other.
function txnDrawer(t) {
  const ok = t.status === 'success' || t.status === 'refunded';
  const rf = REFUND_BY_TXN.get(t.id);
  const cb = CB_BY_TXN.get(t.id);
  const settlement = SETTLEMENTS.find(x => x.store === t.store && +x.day === +startOfDay(t.date));
  const yesNo = (v, yes = 'text-rose-600', no = 'text-emerald-600') => `<span class="font-semibold ${v ? yes : no}">${v ? 'Yes' : 'No'}</span>`;
  const when = (d) => d ? `${fmtDate(d)}, ${fmtTime(d, true)}` : '—';
  const discount = t.discountPct ? t.amount * t.discountPct / 100 : 0;
  const card = (title, body) => `<section class="rounded-lg border border-slate-200 p-4"><h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">${title}</h3>${body}</section>`;
  const steps = [{ label: 'Payment initiated', at: t.date, tone: 'slate' }, { label: `Directed to ${t.gateway}`, at: t.directedAt, tone: 'slate' }];
  if (ok) steps.push({ label: 'Payment authorized', at: t.returnedAt, tone: 'emerald' }, ...(t.apiValidated ? [{ label: 'Validated by merchant (IPN / API)', at: new Date(t.returnedAt.getTime() + 2e3), tone: 'emerald' }] : []));
  else if (t.status === 'failed') steps.push({ label: `Payment failed — ${t.reason}`, at: t.returnedAt, tone: 'rose' });
  else if (t.status === 'cancelled') steps.push({ label: 'Cancelled by customer', at: t.returnedAt, tone: 'slate' });
  else steps.push({ label: 'Awaiting confirmation from provider', note: 'On processing', tone: 'amber' });

  return drawerShell({
    wide: 'xl',
    title: 'Transaction Details',
    sub: `<span class="text-xs">${fmtDate(t.date)}, ${fmtTime(t.date)} · ${fmtBDT(t.amount)}</span>${t.onHold ? '<span class="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-200 text-slate-700">On hold</span>' : badge(t.status === 'refunded' ? 'success' : t.status)}`,
    body: `
      ${t.reason ? `<div class="flex items-start gap-2 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">${ic('circle-alert', 'w-4 h-4 mt-0.5 shrink-0')}<span><span class="font-semibold">Failure reason:</span> ${t.reason}</span></div>` : ''}
      ${typeof txnSymbols === 'function' && txnSymbols(t) ? `<div class="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">Symbols: ${txnSymbols(t)}</div>` : ''}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="space-y-4">
          ${card('Transaction Information', kvGrid([
            kv('Transaction ID', `${t.id} <button data-action="copy" data-value="${t.id}" class="text-primary-600 hover:underline font-sans">Copy</button>`, true),
            kv('SSL ID', t.sslId, true),
            kv('Bank ID', t.bankTranId, true),
            kv('Bank Gateway', esc(t.gateway)),
          ]))}
          ${card('Amount', kvGrid([
            kv('Store', esc(t.storeName)),
            kv('Amount', fmtBDT(t.amount)),
            kv('Charges', ok ? fmtBDT(t.fee) : '—'),
            kv('Discount Charge', fmtBDT(discount)),
            kv('Receivable', ok ? fmtBDT(t.amount - t.fee) : '—'),
            kv('Currency', 'BDT'),
          ]))}
          ${card('Card &amp; Customer IP Information', kvGrid([
            kv('Card Type', esc(t.cardType)),
            kv('Card Holder', esc(t.customer)),
            kv('Card Number', t.account, true),
            kv('Card Issued Bank', `${esc(t.gateway)}${t.issuerCountry ? ` · ${esc(t.issuerCountry)}` : ''}`),
            kv('Customer\'s IP', t.ip, true),
            kv('Customer Contact', `${t.phone}<br>${esc(t.email)}`, true),
          ]))}
        </div>
        <div class="space-y-4">
          ${card('Risk Transaction', `<div class="flex items-center justify-between text-sm"><span class="text-slate-600">Flagged as a risk transaction</span>${yesNo(t.risk)}</div>`)}
          ${card('Bank Processing Information', kvGrid([kv('Directed To Bank', when(t.directedAt)), kv('Returned From Bank', when(t.returnedAt))]))}
          ${card('Refund, Settlement &amp; Chargeback', `<dl class="space-y-2 text-sm">
            <div class="flex items-center justify-between gap-3"><dt class="text-slate-500">Refund Request</dt><dd>${rf ? `<button data-action="open-refund" data-value="${rf.ref}" class="font-medium text-primary-600 hover:underline">Yes · ${fmtBDT(rf.amount)}</button> ${refundBadge(rf.status)}` : '<span class="font-medium text-slate-800">No</span>'}</dd></div>
            <div class="flex items-center justify-between gap-3"><dt class="text-slate-500">Payment Settled</dt><dd class="text-right">${!ok ? '<span class="text-slate-400">—</span>' : t.settled && settlement ? `<button data-action="open-settlement" data-value="${settlement.ref}" class="font-medium text-primary-600 hover:underline">Settled · ${fmtShort(settlement.date)}</button>` : t.onHold ? '<span class="font-medium text-amber-600">On hold</span>' : '<span class="font-medium text-slate-800">Settlement will be initiated</span>'}</dd></div>
            <div class="flex items-center justify-between gap-3"><dt class="text-slate-500">Chargeback Request(s)</dt><dd>${cb ? `<button data-action="open-cb" data-value="${cb.ref}" class="font-medium text-primary-600 hover:underline">Yes</button> ${cbBadge(cb.status)}` : '<span class="font-medium text-slate-800">No</span>'}</dd></div>
          </dl>`)}
          ${card('Merchant API Validation', kvGrid([
            kv('API Validated by Merchant', yesNo(t.apiValidated, 'text-emerald-600', 'text-amber-600')),
            kv('Merchant Amount', ok ? fmtBDT(t.amount) : '—'),
            kv('Merchant Currency', 'BDT'),
            kv('Validation ID', t.valId, true),
          ]))}
          ${card('Discount Information', kvGrid([
            kv('Discount Percentage', `${(t.discountPct || 0).toFixed(2)} %`),
            kv('Discount Remarks', t.discountRemarks ? esc(t.discountRemarks) : '—'),
          ]))}
          ${card('IPN Resend', `<div class="flex items-center justify-between gap-3 text-sm"><span class="text-slate-600">Send the payment notification (IPN) to your listener again.</span><button data-action="ipn-resend" data-value="${t.id}" ${ok ? '' : 'disabled'} class="shrink-0 px-3 py-1.5 rounded-md border border-primary-200 text-xs font-semibold text-primary-600 hover:bg-primary-50 disabled:opacity-40">Resend IPN</button></div>`)}
        </div>
      </div>
      ${section('Timeline', timeline(steps))}
      ${PCI_NOTE}`,
    footer: `
      <button data-action="new-tt" data-value="${t.id}" class="${BTN_SECONDARY}">${ic('life-buoy', 'w-4 h-4')}Raise Ticket</button>
      <button data-action="toast" data-msg="Prototype: receipt download is not wired up." class="${BTN_SECONDARY}">${ic('file-down', 'w-4 h-4')}Download Receipt</button>
      ${ok && !rf ? `<button data-action="refund-for-txn" data-value="${t.id}" class="${BTN_PRIMARY}">${ic('undo-2', 'w-4 h-4')}Request Refund</button>` : ''}`,
  });
}

function refundDrawer(r) {
  const t = r.txn;
  return drawerShell({
    wide: true,
    title: 'Refund Details',
    sub: `<span class="font-mono text-xs">${r.ref}</span>${reqBadge(r.requestStatus)}${refundBadge(r.status)}`,
    body: `
      <div class="grid grid-cols-3 gap-3">
        ${statBox('Transaction Amount', fmtBDT(t.amount))}
        ${statBox('Refund Amount', fmtBDT(r.amount), 'text-rose-600')}
        ${statBox('Refund Type', r.type)}
      </div>
      ${detailList([
        ['Merchant Name', MERCHANT_NAME],
        ['Store Name', esc(r.storeName)],
        ['Store ID', `<span class="font-mono">${r.store}</span>`],
        ['Homepage of store', esc(storeHome(r.store))],
        ['Bank Name', esc(t.cardType)],
        ['Transaction ID', linkBtn('open-txn', t.id, t.id)],
        ['Transaction Date', at(t.date)],
        ['Transaction Amount', fmtBDT(t.amount)],
        ['Refund Amount', fmtBDT(r.amount)],
        ['Refund Reference ID', `<span class="font-mono">${r.ref}</span>`],
        ['Merchant Reference Code', r.merchantRef ? `<span class="font-mono">${esc(r.merchantRef)}</span>` : ''],
        ['Request Remarks', esc(r.remarks)],
        ['Requested On', at(r.date)],
        ['Requested By', `<span class="font-mono">${r.requestedBy}</span>`],
        ['Request Status', reqBadge(r.requestStatus)],
        ['Approval Remarks', esc(r.approvalRemarks || '')],
        ['Approved On', at(r.approvedOn)],
        ['Approved By', esc(r.approvedBy || '')],
        ['Approval Status', refundBadge(r.status)],
      ])}
      ${PCI_NOTE}`,
    footer: `
      <button data-action="open-txn" data-value="${t.id}" class="${BTN_SECONDARY}">${ic('receipt', 'w-4 h-4')}View Transaction</button>
      ${r.status === 'Initiate' ? `<button data-action="refund-cancel" data-value="${r.ref}" class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-rose-600 bg-white border border-rose-200 rounded shadow-sm hover:bg-rose-50">${ic('x', 'w-4 h-4')}Cancel Request</button>` : ''}`,
  });
}

let cbDecision = null; // { ref, remarks } while the merchant writes why they deny a chargeback
function cbDrawer(c) {
  const t = c.txn;
  const rb = respondBy(c);
  const deciding = cbDecision?.ref === c.ref;
  return drawerShell({
    wide: true,
    title: 'Chargeback Information',
    sub: `<span class="font-mono text-xs">${c.ref}</span>${cbBadge(c.status)}${myCbBadge(c.myStatus)}`,
    body: `
      <div class="grid grid-cols-3 gap-3">
        ${statBox('Transaction Amount', fmtBDT(t.amount))}
        ${statBox('Chargeback Amount', fmtBDT(c.amount), 'text-rose-600')}
        ${statBox('Respond By', rb ? `${fmtShort(c.respondBy)}<span class="block text-[11px] font-semibold ${rb.cls}">${rb.text}</span>` : '—')}
      </div>
      ${rb ? `<div class="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">${ic('triangle-alert', 'w-4 h-4 mt-0.5 shrink-0')}<span>Approve the chargeback, or deny it with your reason (for example delivery proof) before the deadline. Without a response it may be approved automatically (mock rule).</span></div>` : ''}
      ${deciding ? `<div class="space-y-2 rounded-lg border border-slate-200 p-3">
        ${field('Why are you denying this chargeback?', `<textarea id="cb-remarks" rows="3" class="${INPUT}" placeholder="e.g. Delivered on 12 Oct, signed delivery note attached">${esc(cbDecision.remarks)}</textarea>`, { required: true, error: formErrors.cbRemarks })}
      </div>` : ''}
      ${detailList([
        ['Merchant Name', MERCHANT_NAME],
        ['Store Name', esc(c.storeName)],
        ['Store ID', `<span class="font-mono">${c.store}</span>`],
        ['Homepage of store', esc(storeHome(c.store))],
        ['Bank Name', esc(c.bank)],
        ['Transaction ID', linkBtn('open-txn', t.id, t.id)],
        ['Transaction Date', at(t.date)],
        ['Transaction Amount', fmtBDT(t.amount)],
        ['Chargeback Amount', fmtBDT(c.amount)],
        ['Chargeback Reference ID', `<span class="font-mono">${c.ref}</span>`],
        ['Merchant Reference Code', c.merchantRef ? `<span class="font-mono">${esc(c.merchantRef)}</span>` : ''],
        ['Request Remarks', `${esc(c.reason)} · ${c.stage}`],
        ['Requested On', at(c.date)],
        ['Requested By', esc(c.requestedBy)],
        ['Request Status', cbBadge(c.status)],
        ['Approval Remarks', esc(c.approvalRemarks || '')],
        ['Approved On', at(c.approvedOn)],
        ['Approved By', c.approvedBy ? `<span class="font-mono">${c.approvedBy}</span>` : ''],
        ['Approval Status', myCbBadge(c.myStatus)],
      ])}
      ${PCI_NOTE}`,
    footer: `
      <button data-action="open-txn" data-value="${t.id}" class="${BTN_SECONDARY} mr-auto">${ic('receipt', 'w-4 h-4')}View Transaction</button>
      ${rb && !deciding ? `
        <button data-action="cb-deny" data-value="${c.ref}" class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-rose-600 bg-white border border-rose-200 rounded shadow-sm hover:bg-rose-50">${ic('circle-x', 'w-4 h-4')}Deny</button>
        <button data-action="cb-approve" data-value="${c.ref}" class="${BTN_PRIMARY}">${ic('circle-check', 'w-4 h-4')}Approve</button>` : ''}
      ${deciding ? `
        <button data-action="cb-deny-cancel" class="${BTN_SECONDARY}">Back</button>
        <button data-action="cb-deny-submit" data-value="${c.ref}" class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded shadow-sm hover:bg-rose-700">${ic('send', 'w-4 h-4')}Submit Denial</button>` : ''}`,
  });
}

let drawerReturnFocus = null;
const FIELD_KEYS = ['id', 'data-link', 'data-link-color', 'data-inv', 'data-inv-item', 'data-mc', 'data-ticket', 'data-user', 'data-group', 'data-other', 'data-pc-row', 'data-mc-row', 'data-pc-on', 'data-mc-on', 'data-group-store', 'data-refund', 'data-store'];
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
  const render = { txn: txnDrawer, contacts: contactsDrawer, refund: refundDrawer, cb: cbDrawer, settlement: settlementDrawer, fy: fyDrawer, link: linkDrawer, 'link-new': linkFormDrawer, invoice: invoiceDrawer, 'invoice-new': invoiceFormDrawer, 'refund-new': refundFormDrawer, emi: emiDrawer, partner: partnerDrawer, 'partner-edit': partnerFormDrawer, mc: mcDrawer, 'mc-new': mcFormDrawer, tt: ttDrawer, 'tt-new': ttFormDrawer, gt: gtDrawer, 'gt-new': gtFormDrawer, 'delivery-upload': deliveryUploadDrawer, store: storeDrawer, 'store-charge': storeChargeDrawer, 'store-bank': storeBankDrawer, 'store-settings': storeSettingsDrawer, group: groupDrawer, 'group-new': groupFormDrawer, user: userDrawer, 'user-new': userFormDrawer, 'referral-new': referralFormDrawer, 'sms-buy': smsBuyDrawer, video: videoDrawer }[drawer.kind];
  root.innerHTML = render(drawer.item);
  lucide.createIcons();
  makeKeyboardReachable(root);
  const panel = $('#drawer-panel');
  const firstError = Object.keys(formErrors).length && panel.querySelector('.text-rose-600')?.closest('label, section, div')?.querySelector('input, select, textarea');
  const target = firstError || (key && panel.querySelector(key)) || (!wasOpen && (panel.querySelector('input:not([disabled]), select, textarea') || panel.querySelector('[data-drawer-close]')));
  if (target) target.focus();
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
  linkDraft = invDraft = partnerDraft = mcDraft = refundDraft = cbDecision = storeDraft = ticketDraft = groupDraft = userDraft = otherDraft = null;
  formErrors = {};
  renderDrawer();
}
