// =====================================================================
// Chargeback Requests
// =====================================================================
const CB_MY_STATUSES = ['Cancel', 'Approve', 'Processing', 'Initial', 'Waiting', 'Deny'];

function cbRows(s, withStatus = true) {
  const q = s.search.trim().toLowerCase();
  const statusOk = (c) => s.status === 'all'
    || (s.status === 'action' ? CB_OPEN.has(c.status) : s.status === 'pending' ? CB_PENDING.has(c.status) : c.status === s.status);
  return CHARGEBACKS.filter(c =>
    inStores(c.store) &&
    (s.bstatus === 'all' || c.myStatus === s.bstatus) &&
    inRange(c, s.range) &&
    (!q || c.txn.id.toLowerCase().includes(q)) &&
    (!s.refId.trim() || c.ref.toLowerCase().includes(s.refId.trim().toLowerCase())) &&
    (!s.mref.trim() || c.merchantRef.toLowerCase().includes(s.mref.trim().toLowerCase())) &&
    (!s.card.replace(/\D/g, '') || c.txn.account.replace(/\D/g, '').endsWith(s.card.replace(/\D/g, ''))) &&
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
  const sslOpts = [
    { label: 'All SSL Status', value: 'all' },
    { label: 'Needs your response', value: 'action' },
    { label: 'Pending (open)', value: 'pending' },
    ...CB_STATUSES.map(v => ({ label: v, value: v })),
  ];
  const myOpts = [{ label: 'All My Status', value: 'all' }, ...CB_MY_STATUSES.map(v => ({ label: v, value: v }))];
  const cols = [
    { label: 'Requested On', cell: c => dateCell(c.date) },
    { label: 'Chargeback Ref. Id / Merchant Ref. Code', cell: c => `${idCell(c.ref)}${c.merchantRef ? `<div class="text-[11px] font-mono text-slate-500">${esc(c.merchantRef)}</div>` : ''}` },
    { label: 'Transaction ID / Store Name', cell: c => `<div class="font-mono text-xs font-semibold text-slate-800">${c.txn.id}</div><div class="text-[11px] text-slate-500">${c.store} - ${esc(c.storeName)}</div>` },
    { label: 'Chargeback Amount', right: true, cell: c => { const rb = respondBy(c); return `<div class="font-semibold text-slate-900 whitespace-nowrap">${fmtBDT(c.amount)}</div>${rb ? `<div class="text-[11px] font-semibold whitespace-nowrap ${rb.cls}">Respond: ${rb.text}</div>` : ''}`; } },
    { label: 'Request Status', cell: c => cbBadge(c.status) },
    { label: 'Approval Status', cell: c => myCbBadge(c.myStatus) },
    { label: 'Action', cell: c => rowAction('open-cb', c.ref, 'eye', 'Details', { title: `Details of ${c.ref}` }) },
  ];

  return `
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">Chargeback Requests</h1>
        <p class="text-slate-500 text-sm">Disputes customers raised through their card issuer. Approve them, or deny with your reason before the deadline.</p>
      </div>

      ${needAction.length && !alertSnoozed('cb-response') ? `
        <div class="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <span class="w-8 h-8 rounded-full bg-white text-amber-600 flex items-center justify-center shrink-0 ring-1 ring-amber-200">${ic('triangle-alert', 'w-4 h-4')}</span>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-amber-900">${needAction.length} chargeback${needAction.length > 1 ? 's need' : ' needs'} your response</p>
            <p class="text-xs text-amber-800 mt-0.5">Earliest deadline: ${fmtDate(needAction[0].respondBy)}, ${fmtTime(needAction[0].respondBy)} (mock rule).</p>
          </div>
          <button data-action="cb-needs-response" class="shrink-0 px-3 py-1.5 text-xs font-semibold text-amber-900 bg-white border border-amber-200 rounded-full hover:bg-amber-100">Show them</button>
          <span class="flex text-amber-800">${alertClose('cb-response')}</span>
        </div>` : ''}

      <div class="flex flex-col">
        ${listFilterBar(s, 'Transaction ID',
          selectPill('list', 'bstatus', 'My Status', myOpts, s.bstatus) +
          selectPill('list', 'status', 'SSL Status', sslOpts, s.status),
          { fields: [['refId', 'Chargeback Reference Id'], ['mref', 'Merchant Ref. Code'], ['card', 'Card No. (last digits)']] })}

        <div class="flex flex-col gap-4 pt-4">
          <h2 class="text-sm font-semibold text-slate-900">Overview</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            ${metricCard({ title: 'Total Requests', value: base.length.toLocaleString(), status: 'all', selected: s.applied.status === 'all' })}
            ${metricCard({ title: 'Total Pending Requests', value: base.filter(c => CB_PENDING.has(c.status)).length.toLocaleString(), status: 'pending', selected: s.applied.status === 'pending' })}
            ${metricCard({ title: 'Total Successful Chargebacks', value: success.length.toLocaleString(), status: 'Success', selected: s.applied.status === 'Success' })}
            ${metricCard({ title: 'Chargeback Amount', value: fmtBDTShort(cbAmount), sub: fmtBDT(cbAmount) })}
          </div>
        </div>

        <div class="space-y-4 pt-6">
          ${listToolbar(rows.length, 'chargebacks', applied(s))}
          ${dataTable({ cols, rows: pageRows, rowAttrs: c => `data-action="open-cb" data-value="${c.ref}"`, emptyTitle: 'No chargebacks found', serial: start + 1 })}
          ${pager(s, rows.length, start, pageRows.length, totalPages)}
        </div>
      </div>
    </div>`;
}
