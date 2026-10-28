// =====================================================================
// Settlement Report
// =====================================================================
// Both settlement reports sit under Analytics & Reports (old /settlements/* links still open them, see state.js).
const SETTLEMENT_PATH = '/analytics/settlement-report';
const FY_PATH = '/analytics/financial-year-report';
const SETTLE_STATUSES = ['Paid', 'Pending', 'On Hold', 'Bounced'];
const SETTLE_TYPES = ['Online', 'Physical', 'Qr Payment', 'Both'];
const SETTLE_CLS = { 'Paid': 'bg-emerald-50 text-emerald-600', 'Pending': 'bg-amber-50 text-amber-600', 'On Hold': 'bg-rose-50 text-rose-600', 'Bounced': 'bg-orange-50 text-orange-700' };
const settleBadge = (s) => `<span class="${STATUS_BADGE} ${SETTLE_CLS[s]}">${s}</span>`;
const fmtBDT0 = (n) => `৳${Math.round(n).toLocaleString('en-US')}`;

function miniTable(headers, rows, { right = [], total } = {}) {
  const al = (i) => right.includes(i) ? 'text-right' : '';
  const label = (i) => esc(String(headers[i]).replace(/<[^>]*>/g, ''));
  return `
    <div class="rounded-md border border-slate-200 overflow-hidden">
      <table data-fit class="w-full text-left text-xs">
        <thead class="bg-slate-50 border-b border-slate-200"><tr>${headers.map((h, i) => `<th class="px-2.5 py-2 font-semibold text-slate-500 uppercase tracking-wider leading-tight ${al(i)}">${h}</th>`).join('')}</tr></thead>
        <tbody class="divide-y divide-slate-100">${rows.map(r => `<tr>${r.map((c, i) => `<td data-label="${label(i)}" class="px-2.5 py-2 text-slate-700 tabular-nums ${right.includes(i) ? 'whitespace-nowrap' : ''} ${al(i)}">${c}</td>`).join('')}</tr>`).join('')}</tbody>
        ${total ? `<tfoot class="bg-slate-50 border-t border-slate-200"><tr>${total.map((c, i) => `<td data-label="${i ? label(i) : ''}" class="px-2.5 py-2 font-semibold text-slate-900 tabular-nums whitespace-nowrap ${al(i)}">${c}</td>`).join('')}</tr></tfoot>` : ''}
      </table>
    </div>`;
}

function settlementRows(s, withStatus = true) {
  const q = s.search.trim().toLowerCase();
  return SETTLEMENTS.filter(x =>
    inStores(x.store) &&
    (s.stype === 'all' || x.type === s.stype) &&
    // Scheduled payouts are dated in the future, so match them on their business day instead.
    (inRange(x, s.range) || (x.status === 'Pending' && inRange({ date: x.day }, s.range))) &&
    (!q || x.ref.toLowerCase().includes(q) || String(x.batch).includes(q)) &&
    (!withStatus || s.status === 'all' || x.status === s.status)
  );
}

// ---------------------------------------------------------------------
// Store Wise Unsettled Amount Summary (old panel): what is not settled yet per store —
// payments, refunds and chargebacks on business days whose settlement is still scheduled.
// ---------------------------------------------------------------------
let unsettledQ = '';
const fmtAmt = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const storeCurrency = (id) => ACCOUNT_STORES.find(a => a.id === id)?.currency || 'BDT';

function unsettledRows() {
  return STORES.filter(st => inStores(st.id)).map(st => {
    const days = new Set(SETTLEMENTS.filter(x => x.store === st.id && x.status === 'Pending').map(x => +x.day));
    const open = (d) => days.has(+startOfDay(d));
    const txns = TXNS.filter(t => t.store === st.id && ['success', 'refunded'].includes(t.status) && open(t.date));
    const refunds = REFUNDS.filter(r => r.store === st.id && r.status === 'Success' && open(r.date));
    const cbs = CHARGEBACKS.filter(c => c.store === st.id && c.status === 'Success' && open(c.date));
    const sum = (list, f) => list.reduce((n, x) => n + f(x), 0);
    const row = {
      id: st.id, name: st.name, currency: storeCurrency(st.id),
      txns: txns.length, txnAmt: sum(txns, t => t.amount), payable: sum(txns, t => t.amount - t.fee),
      refunds: refunds.length, refundAmt: sum(refunds, r => r.amount),
      cbs: cbs.length, cbAmt: sum(cbs, c => c.amount),
    };
    // Deductions larger than the payable carry to the next settlement, so the payable never goes below 0.
    row.total = Math.max(0, row.payable - row.refundAmt - row.cbAmt);
    return row;
  }).filter(r => r.txns || r.refunds || r.cbs);
}

const UNSETTLED_COLS = [
  { label: 'No. of Unsettled Trans', key: 'txns' },
  { label: 'Unsettled Trans Amt', key: 'txnAmt', amt: true },
  { label: 'Unsettled Payable', key: 'payable', amt: true, tint: 'bg-slate-100' },
  { label: 'Currency Type', key: 'currency', text: true },
  { label: 'No. of Unsettled Refund', key: 'refunds' },
  { label: 'Unsettled Refund Amt', key: 'refundAmt', amt: true, tint: 'bg-amber-50' },
  { label: 'No. of Unsettled Chargeback', key: 'cbs' },
  { label: 'Unsettled Chargeback Amount', key: 'cbAmt', amt: true, tint: 'bg-amber-50' },
  { label: 'Total Payable', key: 'total', amt: true, tint: 'bg-emerald-50', strong: true },
];

function unsettledTable() {
  const q = unsettledQ.trim().toLowerCase();
  const rows = unsettledRows().filter(r => !q || r.id.toLowerCase().includes(q) || r.name.toLowerCase().includes(q));
  if (!rows.length) return `<p class="text-sm text-slate-500 px-1 py-6 text-center">${q ? 'No store matches your search.' : 'Everything is settled — no unsettled amount right now.'}</p>`;
  const cell = (c, v) => c.text ? v : c.amt ? fmtAmt(v) : v.toLocaleString();
  // Amounts in different currencies are never added together: one total row per currency.
  const totals = [...new Set(rows.map(r => r.currency))].map(cur => {
    const list = rows.filter(r => r.currency === cur);
    return { name: `Total (${cur})`, currency: cur, ...Object.fromEntries(UNSETTLED_COLS.filter(c => !c.text).map(c => [c.key, list.reduce((n, r) => n + r[c.key], 0)])) };
  });
  const th = (c) => `<th class="h-10 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wider text-right leading-tight ${c.tint || ''} ${c.text ? '!text-left' : ''}">${c.label}</th>`;
  const td = (c, r, foot) => `<td data-label="${esc(c.label)}" class="px-3 py-2 tabular-nums whitespace-nowrap ${c.text ? 'text-left' : 'text-right'} ${c.tint || ''} ${c.strong || foot ? 'font-semibold text-slate-900' : 'text-slate-700'}">${foot && c.text ? '' : cell(c, r[c.key])}</td>`;
  return `
    <div class="rounded-md border border-slate-200 overflow-hidden">
      <table data-fit class="w-full text-left text-sm">
        <thead class="bg-slate-50 border-b border-slate-200"><tr><th class="h-10 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Store ID</th>${UNSETTLED_COLS.map(th).join('')}</tr></thead>
        <tbody class="divide-y divide-slate-100">
          ${rows.map(r => `<tr><td data-label="" class="px-3 py-2"><div class="font-mono text-xs font-medium text-slate-800">${r.id}</div><div class="text-[11px] text-slate-500">${esc(r.name)}</div></td>${UNSETTLED_COLS.map(c => td(c, r)).join('')}</tr>`).join('')}
        </tbody>
        <tfoot class="bg-slate-50 border-t border-slate-200">
          ${totals.map(t => `<tr><td data-label="" class="px-3 py-2 font-semibold text-slate-900">${t.name}</td>${UNSETTLED_COLS.map(c => td(c, t, true)).join('')}</tr>`).join('')}
        </tfoot>
      </table>
    </div>`;
}

function unsettledSummaryCard() {
  const n = unsettledRows().length;
  return `
    <section class="bg-white rounded-lg border border-slate-200 shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-100">
        <div>
          <h2 class="text-sm font-semibold text-slate-900">Store Wise Unsettled Amount Summary <span class="ml-1 text-xs font-normal text-slate-500">${n} store${n === 1 ? '' : 's'}</span></h2>
          <p class="text-xs text-slate-500">Payments, refunds and chargebacks not settled yet — they go into each store's next settlement.</p>
        </div>
        <label class="relative w-full sm:w-64">
          ${ic('search', 'w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2')}
          <input id="unsettled-search" value="${esc(unsettledQ)}" placeholder="Search store" aria-label="Search stores in the unsettled summary" class="${INPUT} pl-8">
        </label>
      </div>
      <div id="unsettled-table" class="p-4">${unsettledTable()}</div>
    </section>`;
}

function renderSettlements() {
  const s = pageState();
  const base = settlementRows(applied(s), false);
  const rows = settlementRows(applied(s));
  const { totalPages, start, pageRows } = paginate(s, rows);
  const sum = (list, key) => list.reduce((t, x) => t + x[key], 0);
  const paid = base.filter(x => x.status === 'Paid');
  const pending = base.filter(x => x.status === 'Pending');
  const held = base.filter(x => x.status === 'On Hold');
  const bounced = base.filter(x => x.status === 'Bounced');
  const statusOpts = [{ label: 'All Status', value: 'all' }, ...SETTLE_STATUSES.map(v => ({ label: v, value: v }))];
  const typeOpts = [{ label: 'All Settlement Type', value: 'all' }, ...SETTLE_TYPES.map(v => ({ label: v, value: v }))];
  const cols = [
    { label: 'Settlement Date', cell: x => dateCell(x.date) },
    { label: 'Reference No', cell: x => idCell(x.ref, `Batch ${x.batch}`) },
    { label: 'Store', cls: 'hidden lg:table-cell', cell: x => `${esc(x.storeName)}<div class="text-xs text-slate-500">${x.txnCount} transactions</div>` },
    { label: 'Bank Information', cls: 'hidden 2xl:table-cell', cell: x => `<div>${esc(x.bank.payee)}</div><div class="text-xs text-slate-500">${x.bank.bank} - ${x.bank.branch}</div><div class="text-xs text-slate-500 font-mono">${x.bank.account}</div>` },
    { label: 'Type', cls: 'hidden xl:table-cell', cell: x => x.type },
    {
      label: 'Amount', right: true, cell: x => `
        <div class="font-semibold text-slate-900 whitespace-nowrap">${fmtBDT(x.settle)}</div>
        <div class="text-xs whitespace-nowrap ${x.status === 'Paid' ? 'text-emerald-600' : x.status === 'Bounced' ? 'text-orange-700' : 'text-amber-600'}">${x.status === 'Paid' ? `Paid ${fmtBDT(x.paid)}` : x.status === 'Pending' ? 'Scheduled' : `Fwd ${fmtBDT(x.fwd)}`}</div>`
    },
    { label: 'Status', cell: x => settleBadge(x.status) },
  ];

  return `
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">Settlement Report</h1>
        <p class="text-slate-500 text-sm">Payouts to your bank account — one settlement per store per business day.</p>
      </div>
      ${alertSnoozed('settle-min') ? '' : `<div class="flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-medium text-sky-800">${ic('info', 'w-4 h-4 shrink-0')}<p class="flex-1">Merchant Settlement minimum amount will be ${fmtBDT0(2500)}. Search ranges are limited to 30 days.</p>${alertClose('settle-min')}</div>`}

      ${bounced.length && !alertSnoozed('settle-bounced') ? `
        <div class="flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
          <span class="w-8 h-8 rounded-full bg-white text-orange-700 flex items-center justify-center shrink-0 ring-1 ring-orange-200">${ic('undo-2', 'w-4 h-4')}</span>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-orange-900">${fmtBDT(sum(bounced, 'fwd'))} bounced across ${bounced.length} settlement${bounced.length > 1 ? 's' : ''}</p>
            <p class="text-xs text-orange-800 mt-0.5">The bank returned these payouts. Check the bounce reason and the settlement bank account details, or contact your KAM before the next settlement cycle.</p>
          </div>
          <button data-action="overview-status" data-value="Bounced" class="shrink-0 px-3 py-1.5 text-xs font-semibold text-orange-900 bg-white border border-orange-200 rounded-full hover:bg-orange-100">View bounced settlements</button>
          <span class="flex text-orange-800">${alertClose('settle-bounced')}</span>
        </div>` : ''}

      ${held.length && !alertSnoozed('settle-hold') ? `
        <div class="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
          <span class="w-8 h-8 rounded-full bg-white text-rose-600 flex items-center justify-center shrink-0 ring-1 ring-rose-200">${ic('circle-pause', 'w-4 h-4')}</span>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-rose-900">${fmtBDT(sum(held, 'fwd'))} is on hold across ${held.length} settlement${held.length > 1 ? 's' : ''}</p>
            <p class="text-xs text-rose-800 mt-0.5">Held amounts are forwarded to the store's next settlement once the issue is resolved. Check the bank account details or contact your KAM.</p>
          </div>
          <button data-action="overview-status" data-value="On Hold" class="shrink-0 px-3 py-1.5 text-xs font-semibold text-rose-900 bg-white border border-rose-200 rounded-full hover:bg-rose-100">Show them</button>
          <span class="flex text-rose-800">${alertClose('settle-hold')}</span>
        </div>` : ''}

      <div class="flex flex-col">
        ${listFilterBar(s, 'Reference No or Batch No',
          selectPill('list', 'status', 'Settlement Status', statusOpts, s.status) +
          selectPill('list', 'stype', 'Settlement Type', typeOpts, s.stype))}

        <div class="flex flex-col gap-4 pt-4">
          <h2 class="text-sm font-semibold text-slate-900">Overview</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            ${metricCard({ title: 'Settled Amount', value: fmtBDTShort(sum(paid, 'paid')), sub: `${paid.length} paid settlements`, status: 'Paid', selected: s.applied.status === 'Paid' })}
            ${metricCard({ title: 'Pending Settlement', value: fmtBDTShort(sum(pending, 'settle')), sub: `${pending.length} scheduled`, status: 'Pending', selected: s.applied.status === 'Pending' })}
            ${metricCard({ title: 'On Hold', value: fmtBDTShort(sum(held, 'fwd')), sub: `${held.length} held`, status: 'On Hold', selected: s.applied.status === 'On Hold' })}
            ${metricCard({ title: 'Bounce Count', value: bounced.length.toLocaleString(), sub: `Bounce amount ${fmtBDT(sum(bounced, 'fwd'))}`, status: 'Bounced', selected: s.applied.status === 'Bounced' })}
          </div>
        </div>

        <div class="pt-6">${unsettledSummaryCard()}</div>

        <div class="space-y-4 pt-6">
          ${listToolbar(rows.length, 'settlements', applied(s))}
          ${dataTable({ cols, rows: pageRows, rowAttrs: x => `data-action="open-settlement" data-value="${x.ref}"`, emptyTitle: 'No settlements found' })}
          ${pager(s, rows.length, start, pageRows.length, totalPages)}
        </div>
      </div>
    </div>`;
}

function settlementDrawer(x) {
  const line = (label, value, cls = 'text-slate-800') => `<div class="flex items-center justify-between py-1.5 text-sm"><span class="text-slate-500">${label}</span><span class="font-medium tabular-nums ${cls}">${value}</span></div>`;
  const totals = (key) => x.summary.reduce((s, r) => s + r[key], 0);
  return drawerShell({
    wide: true,
    title: 'Settlement Details',
    sub: `<span class="font-mono text-xs">${x.ref}</span>${settleBadge(x.status)}`,
    body: `
      <div class="grid grid-cols-3 gap-3">
        ${statBox('Settle Amount', fmtBDT(x.settle))}
        ${statBox('Paid Amount', fmtBDT(x.paid), 'text-emerald-600')}
        ${statBox('Forwarded', fmtBDT(x.fwd), x.fwd ? 'text-amber-600' : 'text-slate-900')}
      </div>
      ${x.holdReason && x.status !== 'Pending' ? `<div class="flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm ${x.bounce ? 'border-orange-200 bg-orange-50 text-orange-800' : 'border-rose-100 bg-rose-50 text-rose-700'}">${ic('circle-alert', 'w-4 h-4 mt-0.5 shrink-0')}<span><span class="font-semibold">${x.bounce ? 'Bounced' : 'On hold'}:</span> ${x.holdReason}. ${x.bounce ? 'Check the settlement bank account details with your KAM; the' : 'The'} amount will be forwarded to the next settlement.</span></div>` : ''}

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
        ${section('General Information', `<dl class="grid grid-cols-1 gap-y-3 text-sm">
          ${kv('Settlement Date', `${fmtDate(x.date)}, ${fmtTime(x.date)}`)}
          ${kv('Business Day', fmtDate(x.day))}
          ${kv('Reference No', x.ref, true)}
          ${kv('Batch No', x.batch, true)}
          ${kv('Store Name', esc(x.storeName))}
          ${kv('Settlement Type', x.type)}
          ${kv('Total Amount', fmtBDT(x.total))}
        </dl>`)}
        ${section('Amount Stacking', `<div class="rounded-lg border border-slate-200 px-4 py-2">
          ${line('Opening Amt', fmtBDT(x.opening))}
          ${line('+ Payable Amt', fmtBDT(x.payable))}
          <div class="border-t border-slate-200 mt-1 pt-1">${line('Settle Amt', fmtBDT(x.settle), 'text-slate-900 font-bold')}</div>
          ${line('Paid Amt', fmtBDT(x.paid), 'text-emerald-600')}
          ${line('Fwd Amt', fmtBDT(x.fwd), 'text-amber-600')}
        </div>`)}
      </div>

      ${section('Transaction Summary', miniTable(
        ['Type', 'No. of Trans', 'SSL Amt', 'Bank Amt', 'Store Amt', 'Deduct Amt'],
        x.summary.map(r => [r.type, r.count || '—', fmtBDT(r.ssl), fmtBDT(r.bank), fmtBDT(r.store), r.deduct ? `<span class="text-rose-600">${fmtBDT(r.deduct)}</span>` : fmtBDT(0)]),
        { right: [1, 2, 3, 4, 5], total: ['Total', x.txnCount, fmtBDT(totals('ssl')), fmtBDT(totals('bank')), fmtBDT(totals('store')), fmtBDT(totals('deduct'))] }))}

      ${section('Payment Information', x.payments.length
        ? miniTable(['Cheque SL', 'Cheque Ref', 'Acct Payee', 'Amount', 'Bank'], x.payments.map(p => [p.sl, `<span class="font-mono">${p.ref}</span>`, esc(p.payee), fmtBDT(p.amount), p.bank]), { right: [3] })
        : `<p class="text-sm text-slate-500 rounded-lg border border-dashed border-slate-300 px-3 py-3">No payment issued yet${x.status === 'Pending' ? ` — scheduled for ${fmtDate(x.date)}, ${fmtTime(x.date)}` : ''}.</p>`)}

      ${section('Bank Account Details', kvGrid([
        kv('Payee Name', esc(x.bank.payee)),
        kv('Bank Name', x.bank.bank),
        kv('Branch Name', x.bank.branch),
        kv('Account Number', x.bank.account, true),
        kv('Routing Number', x.bank.routing, true),
      ]))}
      <p class="flex items-center gap-1.5 text-[11px] text-slate-400">${ic('shield-check', 'w-3.5 h-3.5')}Bank account and routing numbers are masked. SSL Amt / Bank Amt split is mock data.</p>`,
    footer: `
      <button data-action="settlement-txns" data-value="${x.ref}" class="${BTN_SECONDARY}">${ic('list', 'w-4 h-4')}View Transactions</button>
      <button data-action="toast" data-msg="Prototype: settlement email was not resent." class="${BTN_SECONDARY}">${ic('mail', 'w-4 h-4')}Resend Email</button>
      <button data-action="toast" data-msg="Prototype: statement download is not wired up." class="${BTN_PRIMARY}">${ic('file-down', 'w-4 h-4')}Download Statement</button>`,
  });
}
