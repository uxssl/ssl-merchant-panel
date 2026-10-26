// =====================================================================
// Chargeback Requests
// =====================================================================
function cbRows(s, withStatus = true) {
  const q = s.search.trim().toLowerCase();
  const statusOk = (c) => s.status === 'all'
    || (s.status === 'action' ? CB_OPEN.has(c.status) : s.status === 'pending' ? CB_PENDING.has(c.status) : c.status === s.status);
  return CHARGEBACKS.filter(c =>
    inStores(c.store) &&
    (s.stage === 'all' || c.stage === s.stage) &&
    inRange(c, s.range) &&
    (!q || c.ref.toLowerCase().includes(q) || c.txn.id.toLowerCase().includes(q)) &&
    (!withStatus || statusOk(c))
  );
}

function renderChargebacks() {
  const s = pageState();
  const base = cbRows(applied(s), false);
  const rows = cbRows(applied(s));
  const { totalPages, start, pageRows } = paginate(s, rows);
  const success = base.filter(c => c.status === 'Success');
  const cbAmount = success.reduce((sum, c) => sum + c.amount, 0);
  const needAction = CHARGEBACKS.filter(c => CB_OPEN.has(c.status)).sort((a, b) => a.respondBy - b.respondBy);
  const statusOpts = [
    { label: 'All Statuses', value: 'all' },
    { label: 'Needs your response', value: 'action' },
    { label: 'Pending (open)', value: 'pending' },
    ...CB_STATUSES.map(v => ({ label: v, value: v })),
  ];
  const stageOpts = [{ label: 'All Stages', value: 'all' }, ...CB_STAGES.map(x => ({ label: x.v, value: x.v }))];
  const cols = [
    { label: 'Requested', cell: c => dateCell(c.date) },
    { label: 'Chargeback Ref. ID', cell: c => idCell(c.ref, c.txn.id) },
    { label: 'Store', cls: 'hidden lg:table-cell', cell: c => esc(c.storeName) },
    { label: 'Stage & Reason', cls: 'hidden xl:table-cell', cell: c => `<div class="font-medium text-slate-800">${c.stage}</div><div class="text-xs text-slate-500">${c.reason}</div>` },
    { label: 'Amount', right: true, cell: c => `<span class="font-semibold text-slate-900 whitespace-nowrap">${fmtBDT(c.amount)}</span>` },
    { label: 'Respond By', cell: c => { const rb = respondBy(c); return rb ? `<div class="whitespace-nowrap text-slate-800">${fmtDate(c.respondBy)}</div><div class="text-xs font-semibold ${rb.cls}">${rb.text}</div>` : '<span class="text-slate-400">—</span>'; } },
    { label: 'Status', cell: c => cbBadge(c.status) },
  ];

  return `
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">Chargeback Requests</h1>
        <p class="text-slate-500 text-sm">Disputes customers raised through their card issuer. Respond before the deadline with supporting documents.</p>
      </div>

      ${needAction.length ? `
        <div class="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <span class="w-8 h-8 rounded-full bg-white text-amber-600 flex items-center justify-center shrink-0 ring-1 ring-amber-200">${ic('triangle-alert', 'w-4 h-4')}</span>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-amber-900">${needAction.length} chargeback${needAction.length > 1 ? 's need' : ' needs'} your response</p>
            <p class="text-xs text-amber-800 mt-0.5">Earliest deadline: ${fmtDate(needAction[0].respondBy)}, ${fmtTime(needAction[0].respondBy)}. Submit evidence such as delivery proof or an invoice before then (mock rule).</p>
          </div>
          <button data-action="cb-needs-response" class="shrink-0 px-3 py-1.5 text-xs font-semibold text-amber-900 bg-white border border-amber-200 rounded-full hover:bg-amber-100">Show them</button>
        </div>` : ''}

      <div class="flex flex-col">
        ${listFilterBar(s, 'Ref. ID or Transaction ID',
          selectPill('list', 'status', 'Status', statusOpts, s.status) +
          selectPill('list', 'stage', 'Stage', stageOpts, s.stage))}

        <div class="flex flex-col gap-4 pt-4">
          <h2 class="text-sm font-semibold text-slate-900">Overview</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            ${metricCard({ title: 'Total Requests', value: base.length.toLocaleString(), status: 'all', selected: s.applied.status === 'all' })}
            ${metricCard({ title: 'Pending Requests', value: base.filter(c => CB_PENDING.has(c.status)).length.toLocaleString(), status: 'pending', selected: s.applied.status === 'pending' })}
            ${metricCard({ title: 'Successful Chargeback', value: success.length.toLocaleString(), status: 'Success', selected: s.applied.status === 'Success' })}
            ${metricCard({ title: 'Chargeback Amount', value: fmtBDTShort(cbAmount), sub: fmtBDT(cbAmount) })}
          </div>
        </div>

        <div class="space-y-4 pt-6">
          ${listToolbar(rows.length, 'chargebacks', applied(s))}
          ${dataTable({ cols, rows: pageRows, rowAttrs: c => `data-action="open-cb" data-value="${c.ref}"`, emptyTitle: 'No chargebacks found' })}
          ${pager(s, rows.length, start, pageRows.length, totalPages)}
        </div>
      </div>
    </div>`;
}
