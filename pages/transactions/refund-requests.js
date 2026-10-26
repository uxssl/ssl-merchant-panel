// =====================================================================
// Refund Requests
// =====================================================================
function refundRows(s, withStatus = true) {
  const q = s.search.trim().toLowerCase();
  return REFUNDS.filter(r =>
    inStores(r.store) &&
    inRange(r, s.range) &&
    (!q || r.ref.toLowerCase().includes(q) || r.txn.id.toLowerCase().includes(q)) &&
    (!withStatus || s.status === 'all' || (s.status === 'pending' ? REFUND_OPEN.has(r.status) : r.status === s.status))
  );
}

function renderRefunds() {
  const s = pageState();
  const base = refundRows(applied(s), false);
  const rows = refundRows(applied(s));
  const { totalPages, start, pageRows } = paginate(s, rows);
  const success = base.filter(r => r.status === 'Success');
  const refunded = success.reduce((sum, r) => sum + r.amount, 0);
  const statusOpts = [{ label: 'All Statuses', value: 'all' }, { label: 'Pending (open)', value: 'pending' }, ...REFUND_STATUSES.map(v => ({ label: v, value: v }))];
  const cols = [
    { label: 'Requested', cell: r => dateCell(r.date) },
    // Below xl the Transaction ID moves under the Refund Ref. ID so the table never scrolls sideways.
    { label: 'Refund Ref. ID', cell: r => `${idCell(r.ref)}<div class="xl:hidden text-[11px] text-slate-500 font-mono">${r.txn.id}</div>` },
    { label: 'Transaction ID', cls: 'hidden xl:table-cell', cell: r => idCell(r.txn.id) },
    { label: 'Store', cls: 'hidden lg:table-cell', cell: r => esc(r.storeName) },
    { label: 'Refund Amount', right: true, cell: r => `<div class="font-semibold text-slate-900 whitespace-nowrap">${fmtBDT(r.amount)}</div><div class="text-xs text-slate-500 whitespace-nowrap">${r.type}${r.type === 'Partial' ? ` of ${fmtBDT(r.txn.amount)}` : ''}</div>` },
    { label: 'Status', cell: r => refundBadge(r.status) },
  ];

  return `
    <div class="space-y-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">Refund Requests</h1>
          <p class="text-slate-500 text-sm">Refunds you've requested for customers — from approval to the customer's account.</p>
        </div>
        <button data-action="toast" data-msg="Prototype: open a successful transaction and use Request Refund." class="${BTN_PRIMARY} shrink-0">${ic('plus', 'w-4 h-4')}New Refund Request</button>
      </div>

      <div class="flex flex-col">
        ${listFilterBar(s, 'Ref. ID or Transaction ID', selectPill('list', 'status', 'Status', statusOpts, s.status))}

        <div class="flex flex-col gap-4 pt-4">
          <h2 class="text-sm font-semibold text-slate-900">Overview</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            ${metricCard({ title: 'Total Requests', value: base.length.toLocaleString(), status: 'all', selected: s.applied.status === 'all' })}
            ${metricCard({ title: 'Pending Requests', value: base.filter(r => REFUND_OPEN.has(r.status)).length.toLocaleString(), status: 'pending', selected: s.applied.status === 'pending' })}
            ${metricCard({ title: 'Successful Refunds', value: success.length.toLocaleString(), status: 'Success', selected: s.applied.status === 'Success' })}
            ${metricCard({ title: 'Refunded Amount', value: fmtBDTShort(refunded), sub: fmtBDT(refunded) })}
          </div>
        </div>

        <div class="space-y-4 pt-6">
          ${listToolbar(rows.length, 'refund requests', applied(s))}
          ${dataTable({ cols, rows: pageRows, rowAttrs: r => `data-action="open-refund" data-value="${r.ref}"`, emptyTitle: 'No refund requests found' })}
          ${pager(s, rows.length, start, pageRows.length, totalPages)}
        </div>
      </div>
    </div>`;
}
