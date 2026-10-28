// =====================================================================
// Refund Requests — old panel layout: five totals, Request Status and Approval Status,
// and "Create Refund Request" (look up a Transaction ID, then fill in the refund).
// =====================================================================
const REFUND_REQ_STATUSES = ['Success', 'Processing', 'Cancel'];

function refundRows(s, withStatus = true) {
  const q = s.search.trim().toLowerCase();
  return REFUNDS.filter(r =>
    inStores(r.store) &&
    inRange(r, s.range) &&
    (!q || r.txn.id.toLowerCase().includes(q)) &&
    (!s.refId.trim() || r.ref.toLowerCase().includes(s.refId.trim().toLowerCase())) &&
    (!s.mref.trim() || r.merchantRef.toLowerCase().includes(s.mref.trim().toLowerCase())) &&
    (!s.card.replace(/\D/g, '') || r.txn.account.replace(/\D/g, '').endsWith(s.card.replace(/\D/g, ''))) &&
    (s.bstatus === 'all' || r.requestStatus === s.bstatus) &&
    (!withStatus || s.status === 'all' || (s.status === 'pending' ? REFUND_OPEN.has(r.status) : r.status === s.status))
  );
}

function renderRefunds() {
  const s = pageState();
  const base = refundRows(applied(s), false);
  const rows = refundRows(applied(s));
  const { totalPages, start, pageRows } = paginate(s, rows);
  const success = base.filter(r => r.status === 'Success');
  const sum = (list) => list.reduce((n, r) => n + r.amount, 0);
  const approvalOpts = [{ label: 'All Approval Status', value: 'all' }, { label: 'Pending (open)', value: 'pending' }, ...REFUND_STATUSES.map(v => ({ label: v, value: v }))];
  const requestOpts = [{ label: 'All Request Status', value: 'all' }, ...REFUND_REQ_STATUSES.map(v => ({ label: v, value: v }))];
  const cols = [
    { label: 'Requested On', cell: r => dateCell(r.date) },
    { label: 'Refund Ref. Id / Merchant Ref. Code', cell: r => `${idCell(r.ref)}${r.merchantRef ? `<div class="text-[11px] font-mono text-slate-500">${esc(r.merchantRef)}</div>` : ''}` },
    { label: 'Transaction ID / Store Name', cell: r => `<div class="font-mono text-xs font-semibold text-slate-800">${r.txn.id}</div><div class="text-[11px] text-slate-500">${r.store} - ${esc(r.storeName)}</div>` },
    { label: 'Refund Amount', right: true, cell: r => `<div class="font-semibold text-slate-900 whitespace-nowrap">${fmtBDT(r.amount)}</div><div class="text-xs text-slate-500">${r.type}</div>` },
    { label: 'Card / Ref No', cls: 'hidden 2xl:table-cell', cell: r => `<span class="font-mono text-xs">${r.txn.account}</span>` },
    { label: 'Request Status', cell: r => reqBadge(r.requestStatus) },
    { label: 'Approval Status', cell: r => refundBadge(r.status) },
  ];

  return `
    <div class="space-y-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">Refund Requests</h1>
          <p class="text-slate-500 text-sm">Refunds you've requested for customers — from your request to SSLCOMMERZ approval.</p>
        </div>
        <button data-action="new-refund" class="${BTN_PRIMARY} shrink-0">${ic('circle-plus', 'w-4 h-4')}Create Refund Request</button>
      </div>

      <div class="flex flex-col">
        ${listFilterBar(s, 'Transaction ID',
          selectPill('list', 'bstatus', 'Refund Request Status', requestOpts, s.bstatus) +
          selectPill('list', 'status', 'Refund Approval Status', approvalOpts, s.status),
          { fields: [['refId', 'Refund Reference Id'], ['mref', 'Merchant Ref. Code'], ['card', 'Card No. (last digits)']] })}

        <div class="flex flex-col gap-4 pt-4">
          <h2 class="text-sm font-semibold text-slate-900">Overview</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
            ${metricCard({ title: 'Total Requests', value: base.length.toLocaleString(), status: 'all', selected: s.applied.status === 'all' })}
            ${metricCard({ title: 'Total Pending Requests', value: base.filter(r => REFUND_OPEN.has(r.status)).length.toLocaleString(), status: 'pending', selected: s.applied.status === 'pending' })}
            ${metricCard({ title: 'Total Successful Refunds', value: success.length.toLocaleString(), status: 'Success', selected: s.applied.status === 'Success' })}
            ${metricCard({ title: 'Requested Amount', value: fmtBDT(sum(base)) })}
            ${metricCard({ title: 'Refunded Amount', value: fmtBDT(sum(success)) })}
          </div>
        </div>

        <div class="space-y-4 pt-6">
          ${listToolbar(rows.length, 'refund requests', applied(s))}
          ${dataTable({ cols, rows: pageRows, rowAttrs: r => `data-action="open-refund" data-value="${r.ref}"`, emptyTitle: 'No refund requests found', serial: start + 1 })}
          ${pager(s, rows.length, start, pageRows.length, totalPages)}
        </div>
      </div>
    </div>`;
}

// Old panel "Refund Details" / "Chargeback Information": one label / value list.
const detailList = (rows) => `<dl class="divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm">${rows.map(([k, v]) => `
  <div class="grid grid-cols-5 gap-3 px-3 py-2"><dt class="col-span-2 font-medium text-slate-600">${k}</dt><dd class="col-span-3 text-slate-800 break-words">${v === '' || v == null ? '<span class="text-slate-300">—</span>' : v}</dd></div>`).join('')}</dl>`;
const storeHome = (id) => ACCOUNT_STORES.find(a => a.id === id)?.baseUrl || '';
const at = (d) => d ? `${fmtDate(d)}, ${fmtTime(d)}` : '';

// ---------------------------------------------------------------------
// Create Refund Request: look the transaction up, then the refund form.
// ---------------------------------------------------------------------
let refundDraft = null;
const newRefundDraft = (txnId = '') => ({ txnId, txn: null, looked: false, open: false, type: 'Full', amount: '', merchantRef: '', remarks: '' });
const refundBlock = (t) => {
  if (!['success', 'refunded'].includes(t.status)) return 'Only successful transactions can be refunded.';
  const rf = REFUND_BY_TXN.get(t.id);
  if (rf && rf.status !== 'Cancel') return `This transaction already has refund request <button data-action="open-refund" data-value="${rf.ref}" class="font-mono text-primary-600 hover:underline">${rf.ref}</button> (${rf.status}).`;
  return '';
};

function refundFormDrawer() {
  const d = refundDraft;
  const e = formErrors;
  const t = d.txn;
  const block = t && refundBlock(t);
  const inp = (key, attrs = '') => `<input data-refund="${key}" value="${esc(d[key])}" class="${INPUT}" ${attrs}>`;
  return drawerShell({
    title: 'Create Refund Request',
    sub: '<span>Enter the Transaction ID and press Search</span>',
    body: `
      <div class="flex items-end gap-2">
        <div class="flex-1">${field('Transaction ID', inp('txnId', 'id="refund-txn" placeholder="e.g. TXN261026ABC123"'), { required: true, error: e.txnId })}</div>
        <button data-action="refund-lookup" class="${BTN_SECONDARY} mb-px ${e.txnId ? 'mb-[22px]' : ''}">${ic('search', 'w-4 h-4')}Search</button>
      </div>
      ${t ? `
        ${detailList([
          ['Transaction ID', `<span class="font-mono">${t.id}</span>`],
          ['Transaction TID', `<span class="font-mono">${t.tid}</span>`],
          ['Store', esc(t.storeName)],
          ['Card/Ref No', `<span class="font-mono">${t.account}</span>`],
          ['Amount', fmtBDT(t.amount)],
          ['Status', badge(t.status === 'refunded' ? 'success' : t.status)],
        ])}
        ${block ? `<p class="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">${ic('circle-alert', 'w-4 h-4 mt-0.5 shrink-0')}<span>${block}</span></p>`
          : !d.open ? `<div class="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-4 py-3"><span class="text-sm font-medium text-slate-700">New Refund Request</span><button data-action="refund-open" class="px-3 py-1.5 rounded-full text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700">Create Refund</button></div>`
          : section('Refund', `<div class="space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                ${field('Refund Type', `<select data-refund="type" data-rerender class="${INPUT}">${options(['Full', 'Partial'], d.type)}</select>`)}
                ${field('Refund Amount (BDT)', d.type === 'Full' ? `<input value="${t.amount.toFixed(2)}" disabled class="${INPUT} bg-slate-50 text-slate-500">` : inp('amount', `type="number" min="1" max="${t.amount}" step="any"`), { required: true, error: e.amount, hint: d.type === 'Partial' ? `Up to ${fmtBDT(t.amount)}` : '' })}
                <div class="sm:col-span-2">${field('Merchant Reference Code', inp('merchantRef', 'placeholder="(optional) your own reference"'))}</div>
              </div>
              ${field('Remarks', `<textarea data-refund="remarks" rows="3" class="${INPUT}" placeholder="Why is this payment being refunded?">${esc(d.remarks)}</textarea>`, { required: true, error: e.remarks })}
              <p class="text-xs text-slate-500">SSLCOMMERZ reviews the request, then sends it to the bank. The amount is adjusted from your settlement.</p>
            </div>`)}` : d.looked ? '' : '<p class="text-sm text-slate-500">The transaction details appear here after Search.</p>'}`,
    footer: `
      <button data-action="close-drawer" class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-rose-500 rounded shadow-sm hover:bg-rose-600">Cancel</button>
      ${t && !block && d.open ? `<button data-action="save-refund" class="${BTN_PRIMARY}">${ic('send', 'w-4 h-4')}Submit Refund Request</button>` : ''}`,
  });
}

function lookupRefundTxn() {
  const d = refundDraft;
  const q = d.txnId.trim().toLowerCase();
  d.looked = true; d.open = false;
  d.txn = q ? TXNS.find(t => inStores(t.store) && [t.id, t.valId, t.sslId].some(v => v.toLowerCase() === q)) || null : null;
  formErrors = !q ? { txnId: 'Enter a Transaction ID.' } : !d.txn ? { txnId: 'No transaction with this ID in your stores.' } : {};
}

function validateRefund() {
  const d = refundDraft, e = {};
  const amt = Number(d.amount);
  if (d.type === 'Partial' && !(amt > 0 && amt < d.txn.amount)) e.amount = `Enter an amount above 0 and below ${fmtBDT(d.txn.amount)}.`;
  if (!d.remarks.trim()) e.remarks = 'Add a short reason for the refund.';
  return e;
}
