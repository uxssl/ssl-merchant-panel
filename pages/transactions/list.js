// =====================================================================
// Transactions list
// =====================================================================
function baseTxns(s, view) {
  const q = s.search.trim().toLowerCase();
  return TXNS.filter(t =>
    (!view.lockMethod || t.method === view.lockMethod) &&
    (s.method === 'all' || t.method === s.method) &&
    inStores(t.store) &&
    inRange(t, s.range) &&
    (!q || t.id.toLowerCase().includes(q) || t.valId.toLowerCase().includes(q))
  );
}

function sortedRows(base, s) {
  const rows = s.status === 'all' ? [...base] : base.filter(t => t.status === s.status);
  const dir = s.sort.dir === 'asc' ? 1 : -1;
  rows.sort((a, b) => (s.sort.key === 'amount' ? a.amount - b.amount : a.date - b.date) * dir);
  return rows;
}

const TXN_COLS = [
  { key: 'date', label: 'Date & Time', sortable: true },
  { key: 'id', label: 'Transaction ID' },
  // Store and Customer drop out on narrower screens (still shown in the drawer),
  // so the table never needs a horizontal scroll.
  { key: 'store', label: 'Store', cls: 'hidden lg:table-cell' },
  { key: 'customer', label: 'Customer', cls: 'hidden xl:table-cell' },
  { key: 'method', label: 'Payment Method' },
  { key: 'amount', label: 'Amount', sortable: true, right: true },
  { key: 'status', label: 'Status' },
];

function txnCell(key, t) {
  switch (key) {
    case 'date': return `<div class="text-slate-800 font-medium whitespace-nowrap">${fmtDate(t.date)}</div><div class="text-xs text-slate-500">${fmtTime(t.date, true)}</div>`;
    case 'id': return `<div class="flex items-center gap-1.5"><span class="font-mono text-xs text-slate-800">${t.id}</span><button data-action="copy" data-value="${t.id}" class="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100" title="Copy">${ic('copy', 'w-3.5 h-3.5')}</button></div>`;
    case 'store': return esc(t.storeName);
    case 'customer': return `<div>${esc(t.customer)}</div><div class="text-xs text-slate-500 font-mono">${t.phone}</div>`;
    case 'method': return `<div class="font-medium text-slate-800">${t.method} <span class="text-xs font-normal text-slate-500">${t.type}</span></div><div class="text-xs text-slate-500 font-mono whitespace-nowrap">${t.account}</div>`;
    case 'amount': return `<span class="font-semibold text-slate-900 whitespace-nowrap">${fmtBDT(t.amount)}</span>`;
    case 'status': return badge(t.status);
  }
}

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
          ${filterSearch('txn-search', 'Transaction ID / Val ID', s.search)}
          ${dtPill(s.range)}
          ${selectPill('txn', 'status', 'Status', STATUS_OPTS, s.status)}
          ${view.lockMethod
            ? `<span class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border border-slate-200 bg-slate-100 text-slate-600 font-medium">${ic('lock', 'w-3.5 h-3.5')}${view.lockMethod}</span>`
            : selectPill('txn', 'method', 'Payment Method', METHOD_OPTS, s.method)}
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

        <div class="space-y-4 pt-6">
          <div class="data-table-toolbar flex flex-wrap items-center justify-between gap-3">
            <p class="text-sm text-slate-500"><span class="font-semibold text-slate-900">${rows.length.toLocaleString()}</span> transactions · ${ic(s.range.daily ? 'repeat' : 'calendar-clock', 'w-3.5 h-3.5 inline -mt-0.5')} ${rangeDetail(s.range)}</p>
            <div class="flex items-center gap-2">
              <button data-action="export" class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors shadow-sm">${ic('download', 'w-4 h-4')}Export CSV</button>
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
            <table class="hidden md:table w-full text-left text-sm">
              <thead class="bg-slate-50 border-b border-slate-200">
                <tr>
                  ${cols.map(c => `
                    <th class="h-10 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap ${c.right ? 'text-right' : ''} ${c.cls || ''}">
                      ${c.sortable ? `<button data-action="sort" data-value="${c.key}" class="inline-flex items-center gap-1 uppercase tracking-wider hover:text-slate-800 ${s.sort.key === c.key ? 'text-slate-800' : ''}">${c.label}${ic(s.sort.key === c.key ? (s.sort.dir === 'asc' ? 'arrow-up' : 'arrow-down') : 'arrow-up-down', 'w-3 h-3')}</button>` : c.label}
                    </th>`).join('')}
                  <th class="h-10 px-3 w-10"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                ${pageRows.map(t => `
                  <tr data-action="open-txn" data-value="${t.id}" class="hover:bg-slate-50 transition-colors cursor-pointer">
                    ${cols.map(c => `<td class="px-3 py-2 align-middle text-slate-700 ${c.right ? 'text-right' : ''} ${c.cls || ''}">${txnCell(c.key, t)}</td>`).join('')}
                    <td class="px-3 py-2 text-slate-400">${ic('chevron-right', 'w-4 h-4')}</td>
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
      </div>
    </div>`;
}

function exportCsv(view) {
  const s = txnState(view.key);
  const rows = sortedRows(baseTxns(applied(s), view), applied(s));
  if (!rows.length) { toast('Nothing to export for these filters'); return; }
  const cell = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [
    ['Transaction ID', 'Date', 'Time', 'Store', 'Customer', 'Payment Method', 'Card / Account (masked)', 'Amount (BDT)', 'Status'].map(cell).join(','),
    ...rows.map(t => [t.id, fmtDate(t.date), fmtTime(t.date, true), t.storeName, t.customer, t.method, t.account, t.amount.toFixed(2), t.status].map(cell).join(',')),
  ];
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${view.key}-transactions-${toDateInput(NOW)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast(`Exported ${rows.length.toLocaleString()} rows (mock data)`, 'success');
}
