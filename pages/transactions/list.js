// =====================================================================
// Transactions list — old panel "Transaction Report": summary by gateway, the
// transaction details table with status symbols, and the Symbol Meaning legend.
// =====================================================================
// Old panel Status filter. Refunded payments count as successful (they carry the R / PR symbol).
const isOk = (t) => t.status === 'success' || t.status === 'refunded';
const TXN_STATUS_OPTS = [
  { label: 'All Statuses', value: 'all' },
  { label: 'On Hold', value: 'hold', test: t => t.onHold },
  { label: 'Success And Failure', value: 'success-failed', test: t => isOk(t) || t.status === 'failed' },
  { label: 'Success Only', value: 'success', test: isOk },
  { label: 'Failure Only', value: 'failed', test: t => t.status === 'failed' },
  { label: 'On Processing', value: 'pending', test: t => t.status === 'pending' },
  { label: 'Unattempted', value: 'unattempted', test: () => false },
  { label: 'Cancelled by Customer', value: 'cancelled', test: t => t.status === 'cancelled' },
];
const ISSUER_OPTS = [{ label: 'All Transactions', value: 'all' }, { label: 'Local Transaction', value: 'Local' }, { label: 'Foreign Transaction', value: 'Foreign' }];
const EMI_OPTS = [{ label: 'All Transactions', value: 'all' }, { label: 'EMI Transactions', value: 'emi' }, { label: 'Without EMI Transactions', value: 'none' }];
const txnPanels = { summary: true, symbols: false };

function baseTxns(s, view) {
  const q = s.search.trim().toLowerCase();
  return TXNS.filter(t =>
    (!view.lockMethod || t.method === view.lockMethod) &&
    (s.method === 'all' || t.method === s.method) &&
    (s.issuer === 'all' || (t.issuerLocation || 'Local') === s.issuer) &&
    (s.emi === 'all' || (s.emi === 'emi') === !!t.emiTenure) &&
    inStores(t.store) &&
    inRange(t, s.range) &&
    // Old panel search options: Transaction ID (also Val / SSL ID), last 4 digits of the card, card holder name.
    (!q || [t.id, t.valId, t.sslId].some(v => v.toLowerCase().includes(q))) &&
    (!s.last4.trim() || t.account.replace(/\D/g, '').endsWith(s.last4.trim())) &&
    (!s.holder.trim() || t.customer.toLowerCase().includes(s.holder.trim().toLowerCase()))
  );
}

function sortedRows(base, s) {
  const opt = TXN_STATUS_OPTS.find(o => o.value === s.status);
  const rows = opt?.test ? base.filter(opt.test) : [...base];
  const dir = s.sort.dir === 'asc' ? 1 : -1;
  rows.sort((a, b) => (s.sort.key === 'amount' ? a.amount - b.amount : a.date - b.date) * dir);
  return rows;
}

// Status symbols, as explained in Symbol Meaning.
const SYMBOLS = [
  { code: 'S', cls: 'bg-[#0b3a63] text-white', text: 'Payment Settled.', test: t => t.settled },
  { code: 'R', cls: 'bg-[#b8902a] text-white', text: 'Executed Full Refund against the transaction.', test: t => REFUND_BY_TXN.get(t.id)?.status === 'Success' && REFUND_BY_TXN.get(t.id).type === 'Full' },
  { code: 'PR', cls: 'bg-[#b8902a] text-white', text: 'Executed Partial Refund against the transaction.', test: t => REFUND_BY_TXN.get(t.id)?.status === 'Success' && REFUND_BY_TXN.get(t.id).type === 'Partial' },
  { code: 'C', cls: 'bg-rose-600 text-white', text: 'Executed Chargeback request against the transaction.', test: t => CB_BY_TXN.has(t.id) },
  { code: 'Hold', cls: 'bg-slate-200 text-slate-700', text: 'Payment Hold for this transaction.', test: t => t.onHold },
  { code: 'EMI-3', cls: 'bg-lime-400 text-lime-950', text: 'EMI transaction with Tenure. Here, 3 is the EMI Tenure.', test: t => t.emiTenure, label: t => `EMI-${t.emiTenure}` },
  { code: 'DIS', cls: 'bg-cyan-500 text-white', text: 'Customer got instant discount based on special campaign.', test: t => t.discountPct },
  { code: 'ESCROW Hold', cls: 'bg-lime-300 text-lime-950', text: 'The settlement will be hold till the time when the service is confirmed.', test: t => t.escrow },
  { code: 'Shipment Placed', cls: 'bg-violet-600 text-white', text: 'An order has been placed for shipment from Logistics.', test: t => t.shipment },
];
const symbolChip = (cls, text, title = '') => `<span class="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold leading-none whitespace-nowrap ${cls}" ${title ? `title="${esc(title)}"` : ''}>${text}</span>`;
const txnSymbols = (t) => SYMBOLS.filter(x => x.test(t)).map(x => symbolChip(x.cls, x.label ? x.label(t) : x.code, x.text)).join(' ');
const isNew = (t) => NOW - t.date < 10 * 60e3;
const shownStatus = (t) => t.status === 'refunded' ? 'success' : t.status;

const TXN_COLS = [
  { key: 'date', label: 'Date', sortable: true },
  { key: 'info', label: 'Transaction ID / Other Info' },
  { key: 'card', label: 'Card / Ref No', drop: true },
  { key: 'store', label: 'Store', cls: 'hidden lg:table-cell', drop: true },
  { key: 'amount', label: 'Amount', sortable: true, right: true },
  { key: 'status', label: 'Status' },
  { key: 'action', label: 'Action' },
];

function txnCell(key, t) {
  switch (key) {
    case 'date': return `<div class="text-slate-800 font-medium whitespace-nowrap">${fmtDate(t.date)}${isNew(t) ? ' <span class="text-[11px] font-semibold text-primary-600">(new)</span>' : ''}</div><div class="text-xs text-slate-500">${fmtTime(t.date, true)}</div>`;
    case 'info': return `
      <div class="flex items-center gap-1.5"><span class="font-mono text-xs text-slate-800">${t.id}</span><button data-action="copy" data-value="${t.id}" class="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100" title="Copy">${ic('copy', 'w-3.5 h-3.5')}</button></div>
      <div class="text-xs font-medium text-slate-700">${esc(t.customer)}</div>
      <div class="text-[11px] text-slate-500">${esc(t.email)}</div>
      <div class="text-[11px] text-slate-500 font-mono">${t.phone}</div>`;
    case 'card': return `
      <div class="font-mono text-xs text-slate-800 whitespace-nowrap">${t.account}</div>
      <div class="text-xs font-medium text-slate-700">${t.method} <span class="font-normal text-slate-500">${t.type}</span></div>
      <div class="text-[11px] text-slate-500">${esc(t.gateway)}</div>
      <div class="text-[11px] text-slate-500">${esc(t.issuerCountry || 'Bangladesh')}</div>`;
    case 'store': return esc(t.storeName);
    case 'amount': return `
      <div class="font-semibold text-slate-900 whitespace-nowrap">${fmtBDT(t.amount)}</div>
      ${isOk(t) ? `<div class="text-[11px] text-slate-500 whitespace-nowrap">Charge: <span class="font-medium text-slate-700">${fmtBDT(t.fee)}</span></div>
      <div class="text-[11px] text-slate-500 whitespace-nowrap">Receivable: <span class="font-medium text-slate-700">${fmtBDT(t.amount - t.fee)}</span></div>` : ''}`;
    case 'status': return `<div class="flex flex-col items-start gap-1">${t.onHold ? symbolChip('bg-slate-200 text-slate-700', 'Success', 'Payment Hold for this transaction.') : badge(shownStatus(t))}${!t.viewed ? symbolChip('bg-[#0b3a63] text-white', 'read', 'Details not viewed yet') : ''}<div class="flex flex-wrap gap-1">${txnSymbols(t)}</div></div>`;
    case 'action': return `<div class="flex items-center gap-1">
      ${rowAction('open-txn', t.id, 'eye', 'Details', { title: `Details of ${t.id}` })}
      ${rowAction('new-tt', t.id, 'circle-help', 'Ticket', { title: `Raise a ticket about ${t.id}` })}
    </div>`;
  }
}

// Old panel "Transaction Summary": successful payments by gateway and card type.
function txnGatewaySummary(rows) {
  const ok = rows.filter(isOk);
  const groups = new Map();
  for (const t of ok) {
    const key = `${t.gateway}|${t.method}`;
    const g = groups.get(key) || { gateway: t.gateway, method: t.method, n: 0, amount: 0, fee: 0 };
    g.n++; g.amount += t.amount; g.fee += t.fee;
    groups.set(key, g);
  }
  const list = [...groups.values()].sort((a, b) => b.amount - a.amount);
  const sum = (k) => list.reduce((n, g) => n + g[k], 0);
  if (!list.length) return '<p class="text-sm text-slate-500 py-4 text-center">No successful payments for these filters.</p>';
  return `<div class="max-h-80 overflow-y-auto">${miniTable(['Gateway', 'Card Type', 'No. of Transaction', 'Amount', 'SSL Charge', 'Receivable'],
    list.map(g => [esc(g.gateway), g.method, g.n.toLocaleString(), fmtBDT(g.amount), fmtBDT(g.fee), fmtBDT(g.amount - g.fee)]),
    { right: [2, 3, 4, 5], total: ['Total', '', sum('n').toLocaleString(), fmtBDT(sum('amount')), fmtBDT(sum('fee')), fmtBDT(sum('amount') - sum('fee'))] })}</div>`;
}

function symbolLegend() {
  const row = (chip, text) => `<li class="flex items-center justify-between gap-4 px-3 py-2"><span class="text-sm text-slate-700">${text}</span>${chip}</li>`;
  return `
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ul class="divide-y divide-slate-100 rounded-lg border border-slate-200">
        ${row('<span class="text-xs font-semibold text-primary-600">(new)</span>', 'Marked on last transactions which are occurred within last ten minutes.')}
        ${row(symbolChip('bg-[#0b3a63] text-white', 'read'), 'Marked which success transaction details is not viewed till now. Opening the details updates SSLCOMMERZ support team that it is under processing to deliver.')}
        ${SYMBOLS.slice(0, 3).map(x => row(symbolChip(x.cls, x.code), x.text)).join('')}
      </ul>
      <ul class="divide-y divide-slate-100 rounded-lg border border-slate-200">
        ${SYMBOLS.slice(3).map(x => row(symbolChip(x.cls, x.code === 'Hold' ? 'Success' : x.code), x.text)).join('')}
      </ul>
    </div>`;
}

const panelCard = (key, title, sub, body) => `
  <section class="bg-white rounded-lg border border-slate-200 shadow-sm">
    <button data-action="txn-panel" data-value="${key}" aria-expanded="${txnPanels[key]}" class="w-full flex items-center justify-between gap-3 px-4 py-3 text-left">
      <span><span class="block text-sm font-semibold text-slate-900">${title}</span>${sub ? `<span class="block text-xs text-slate-500">${sub}</span>` : ''}</span>
      ${ic(txnPanels[key] ? 'circle-minus' : 'circle-plus', 'w-5 h-5 text-slate-500 shrink-0')}
    </button>
    ${txnPanels[key] ? `<div class="px-4 pb-4">${body}</div>` : ''}
  </section>`;

function metricCard({ title, value, status, selected, sub, key = 'status' }) {
  return `
    <div ${status ? `data-action="overview-status" data-key="${key}" data-value="${status}"` : ''}
      class="metric-card-container bg-white p-4 rounded-xl border shadow-sm transition-all text-left ${status ? 'cursor-pointer hover:border-slate-300 hover:shadow-md' : ''} ${selected ? 'border-primary-600 ring-1 ring-primary-100' : 'border-slate-200'}">
      <p class="text-xs font-semibold text-slate-500 uppercase">${title}</p>
      <p class="text-2xl font-bold mt-2 text-slate-900">${value}</p>
      ${sub ? `<p class="text-xs text-slate-500 mt-1">${sub}</p>` : ''}
    </div>`;
}

function renderTransactions(view) {
  const s = txnState(view.key);
  const f = applied(s);
  const base = baseTxns(f, view);
  const rows = sortedRows(base, f);
  const totalPages = Math.max(1, Math.ceil(rows.length / s.pageSize));
  s.page = Math.min(s.page, totalPages);
  const start = (s.page - 1) * s.pageSize;
  const pageRows = rows.slice(start, start + s.pageSize);
  const cols = TXN_COLS.filter(c => !s.hidden.has(c.key));

  const success = base.filter(t => t.status === 'success');
  const failed = base.filter(t => t.status === 'failed');
  const successAmount = success.reduce((sum, t) => sum + t.amount, 0);

  return `
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">${view.title}</h1>
        <p class="text-slate-500 text-sm">${view.sub}</p>
      </div>

      <div class="flex flex-col">
        <div class="filter-bar-container flex items-center gap-3 flex-wrap">
          ${dtPill(s.range, '7d')}
          ${filterSearch('txn-search', 'Transaction ID', s.search)}
          ${filterText('last4', 'Last 4 Digit of Card No.', s.last4)}
          ${filterText('holder', 'Card Holder Given Name', s.holder)}
          ${selectPill('txn', 'status', 'Status', TXN_STATUS_OPTS, s.status)}
          ${selectPill('txn', 'method', 'Gateway', METHOD_OPTS, s.method)}
          ${selectPill('txn', 'issuer', 'Issuer Location', ISSUER_OPTS, s.issuer)}
          ${selectPill('txn', 'emi', 'EMI Status', EMI_OPTS, s.emi)}
          ${storePill('txn', 'Store')}
          ${filterActions(s)}
        </div>

        <div class="flex flex-col gap-4 pt-4">
          <h2 class="text-sm font-semibold text-slate-900">Overview</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            ${metricCard({ title: 'Total Transactions', value: base.length.toLocaleString(), status: 'all', selected: s.applied.status === 'all' })}
            ${metricCard({ title: 'Success Transactions', value: success.length.toLocaleString(), status: 'success', selected: s.applied.status === 'success' })}
            ${metricCard({ title: 'Failed Transactions', value: failed.length.toLocaleString(), status: 'failed', selected: s.applied.status === 'failed' })}
            ${metricCard({ title: 'Total Amount (Success)', value: fmtBDTShort(successAmount), sub: fmtBDT(successAmount) })}
          </div>
        </div>

        <div class="pt-6">${panelCard('summary', 'Transaction Summary', 'Successful payments by gateway and card type', txnGatewaySummary(rows))}</div>

        <div class="space-y-4 pt-6">
          <div class="data-table-toolbar flex flex-wrap items-center justify-between gap-3">
            <p class="text-sm text-slate-500"><span class="font-semibold text-slate-900">${rows.length.toLocaleString()}</span> transactions · ${ic(s.range.daily ? 'repeat' : 'calendar-clock', 'w-3.5 h-3.5 inline -mt-0.5')} ${rangeDetail(s.range)}</p>
            <div class="flex items-center gap-2">
              <button data-action="txn-symbols" class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-primary-600">${ic('info', 'w-4 h-4')}Symbol Meaning</button>
              <button data-action="export" class="${BTN_EXPORT}">${ic('download', 'w-4 h-4')}Export CSV</button>
              <div class="relative" data-dd-root>
                <button data-action="dd-toggle" data-key="txn:cols" class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors shadow-sm">${ic('settings-2', 'w-4 h-4')}View Column</button>
                ${openDD === 'txn:cols' ? `
                  <div class="absolute right-0 top-full mt-1 w-52 bg-white border border-slate-200 rounded-lg shadow-lg z-50 p-1 anim-pop">
                    <div class="text-xs font-semibold text-slate-500 px-2 py-1">Toggle columns</div>
                    ${TXN_COLS.map(c => {
                      const on = !s.hidden.has(c.key);
                      return `<button data-action="col-toggle" data-value="${c.key}" class="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded text-sm text-slate-700">
                        <span class="w-4 h-4 rounded border flex items-center justify-center ${on ? 'bg-primary-600 border-primary-600' : 'border-slate-300 bg-white'}">${on ? ic('check', 'w-2.5 h-2.5 text-white') : ''}</span>${c.label}</button>`;
                    }).join('')}
                  </div>` : ''}
              </div>
            </div>
          </div>

          ${!pageRows.length ? `<div class="rounded-md border border-slate-200 bg-white shadow-sm">${emptyBlock('No transactions found')}</div>` : `
          <div class="rounded-md border border-slate-200 bg-white shadow-sm overflow-hidden">
            ${cardList(TXN_COLS.filter(c => !s.hidden.has(c.key)), pageRows, t => `data-action="open-txn" data-value="${t.id}"`, (c, t) => txnCell(c.key, t))}
            <table data-fit class="hidden md:table w-full text-left text-sm">
              <thead class="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th class="fit-drop h-10 px-3 w-10 text-xs font-semibold text-slate-500 uppercase tracking-wider">#</th>
                  ${cols.map(c => `
                    <th class="h-10 px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider leading-tight ${c.right ? 'text-right' : ''} ${c.cls || ''} ${c.drop ? 'fit-drop' : ''}">
                      ${c.sortable ? `<button data-action="sort" data-value="${c.key}" class="inline-flex items-center gap-1 uppercase tracking-wider hover:text-slate-800 ${s.sort.key === c.key ? 'text-slate-800' : ''}">${c.label}${ic(s.sort.key === c.key ? (s.sort.dir === 'asc' ? 'arrow-up' : 'arrow-down') : 'arrow-up-down', 'w-3 h-3')}</button>` : c.label}
                    </th>`).join('')}
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                ${pageRows.map((t, i) => `
                  <tr data-action="open-txn" data-value="${t.id}" class="hover:bg-slate-50 transition-colors cursor-pointer">
                    <td data-label="#" class="fit-drop px-3 py-2 align-top text-slate-400">${start + i + 1}</td>
                    ${cols.map(c => `<td data-label="${esc(c.label)}" class="px-3 py-2 align-middle text-slate-700 ${c.right ? 'text-right' : ''} ${c.cls || ''} ${c.drop ? 'fit-drop' : ''}">${txnCell(c.key, t)}</td>`).join('')}
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>`}

          <div class="flex flex-wrap items-center justify-between gap-3 px-2">
            <div class="flex items-center gap-3 text-sm text-slate-500">
              <span>Showing ${rows.length ? start + 1 : 0}–${start + pageRows.length} of ${rows.length.toLocaleString()}</span>
              <select data-change="page-size" class="px-2 py-1 bg-white border border-slate-200 rounded text-sm text-slate-600 focus:outline-none focus:border-primary-500">
                ${[10, 20, 50, 100].map(n => `<option value="${n}" ${n === s.pageSize ? 'selected' : ''}>${n} / page</option>`).join('')}
              </select>
            </div>
            <div class="flex items-center space-x-2">
              <button data-action="page" data-value="-1" ${s.page <= 1 ? 'disabled' : ''} class="px-3 py-1 text-sm border border-slate-200 rounded bg-white hover:bg-slate-50 disabled:opacity-50">Previous</button>
              <span class="text-sm text-slate-600">Page ${s.page} of ${totalPages}</span>
              <button data-action="page" data-value="1" ${s.page >= totalPages ? 'disabled' : ''} class="px-3 py-1 text-sm border border-slate-200 rounded bg-white hover:bg-slate-50 disabled:opacity-50">Next</button>
            </div>
          </div>
        </div>

        <div id="symbol-meaning" class="pt-6">${panelCard('symbols', 'Symbol Meaning', 'What the marks next to a status mean · searching from and to must be within 90 days', symbolLegend())}</div>
      </div>
    </div>`;
}

function exportCsv(view) {
  const s = txnState(view.key);
  const rows = sortedRows(baseTxns(applied(s), view), applied(s));
  if (!rows.length) { toast('Nothing to export for these filters'); return; }
  const cell = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [
    ['Transaction ID', 'SSL ID', 'Date', 'Time', 'Store', 'Customer', 'Gateway', 'Card Type', 'Card / Ref No (masked)', 'Issuer Country', 'Amount (BDT)', 'Charge (BDT)', 'Receivable (BDT)', 'Status', 'Symbols'].map(cell).join(','),
    ...rows.map(t => [t.id, t.sslId, fmtDate(t.date), fmtTime(t.date, true), t.storeName, t.customer, t.gateway, t.method, t.account, t.issuerCountry || 'Bangladesh', t.amount.toFixed(2), isOk(t) ? t.fee.toFixed(2) : '', isOk(t) ? (t.amount - t.fee).toFixed(2) : '', shownStatus(t), SYMBOLS.filter(x => x.test(t)).map(x => x.label ? x.label(t) : x.code).join(' ')].map(cell).join(',')),
  ];
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${view.key}-transactions-${toDateInput(NOW)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast(`Exported ${rows.length.toLocaleString()} rows (mock data)`, 'success');
}
