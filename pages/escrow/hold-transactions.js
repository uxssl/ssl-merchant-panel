// =====================================================================
// Escrow Hold Transactions — escrow payments still waiting for delivery confirmation.
// Same records as Service Delivery's "Get Deliverables" file; a payment leaves this list
// once an uploaded delivery file marks it delivered (processDeliveryFile).
// =====================================================================
const ESCROW_HOLD_PATH = '/escrow/hold-transactions';
// The panel only knows whether logistics has placed a shipment; either way the money waits for delivery confirmation.
const HOLD_STAGES = [
  { value: 'shipment', label: 'Shipment placed', reason: 'Shipment placed — awaiting delivery confirmation', test: t => t.shipment },
  { value: 'waiting', label: 'Awaiting shipment', reason: 'Delivery confirmation pending', test: t => !t.shipment },
];
const holdStage = (t) => HOLD_STAGES.find(h => h.test(t));
const heldDays = (t) => Math.max(0, Math.floor((NOW - t.date) / 864e5));

function escrowHoldRows(s) {
  const q = s.search.trim().toLowerCase();
  return pendingDeliverables().filter(t =>
    inRange(t, s.range) &&
    (s.stage === 'all' || holdStage(t).value === s.stage) &&
    (!q || [t.id, t.invoiceId, t.customer].some(v => v?.toLowerCase().includes(q)))
  ).sort((a, b) => a.date - b.date); // oldest hold first
}

function renderEscrowHolds() {
  const s = pageState();
  const rows = escrowHoldRows(applied(s));
  const { totalPages, start, pageRows } = paginate(s, rows);
  const all = pendingDeliverables();
  const held = all.reduce((n, t) => n + t.amount, 0);
  const oldest = all.reduce((o, t) => (!o || t.date < o.date ? t : o), null);
  const monthStart = new Date(NOW.getFullYear(), NOW.getMonth(), 1);
  const released = DELIVERY_FILES.filter(f => f.uploaded >= monthStart).reduce((n, f) => n + f.found, 0);
  const stageOpts = [{ label: 'All Hold Stages', value: 'all' }, ...HOLD_STAGES.map(h => ({ label: h.label, value: h.value }))];
  const cols = [
    { label: 'Transaction ID', cell: t => idCell(t.id, `Invoice ${esc(t.invoiceId)}`) },
    { label: 'Store', cls: 'hidden lg:table-cell', cell: t => esc(t.storeName) },
    { label: 'Customer', cls: 'hidden xl:table-cell', cell: t => esc(t.customer) },
    { label: 'Payment Date', cell: t => dateCell(t.date) },
    { label: 'Amount', right: true, cell: t => `<span class="font-semibold text-slate-900 whitespace-nowrap">${fmtBDT(t.amount)}</span>` },
    { label: 'On Hold For', right: true, cell: t => `<span class="whitespace-nowrap ${heldDays(t) > 7 ? 'font-semibold text-amber-700' : 'text-slate-700'}">${heldDays(t)} day${heldDays(t) === 1 ? '' : 's'}</span>` },
    { label: 'Hold Reason', cls: 'hidden md:table-cell', cell: t => `<span class="text-xs text-slate-700">${holdStage(t).reason}</span>` },
    { label: 'Status', cell: t => `<span class="${STATUS_BADGE} bg-lime-100 text-lime-800">ESCROW Hold</span>` },
  ];
  return `
    <div class="space-y-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">Escrow Hold Transactions</h1>
          <p class="text-slate-500 text-sm">Escrow payments held from settlement until you confirm delivery.</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button data-action="get-deliverables" class="${BTN_EXPORT}">${ic('download', 'w-4 h-4')}Get Deliverables</button>
          <a href="#${SUP.service}" class="${BTN_PRIMARY}">${ic('upload', 'w-4 h-4')}Confirm Delivery</a>
        </div>
      </div>
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        ${metricCard({ title: 'Transactions On Hold', value: all.length.toLocaleString(), sub: 'Blocked from settlement' })}
        ${metricCard({ title: 'Total Hold Amount', value: fmtBDT(held), sub: 'Across the selected stores' })}
        ${metricCard({ title: 'Oldest Hold', value: oldest ? `${heldDays(oldest)} days` : '—', sub: oldest ? `Since ${fmtDate(oldest.date)}` : 'Nothing on hold' })}
        ${metricCard({ title: 'Released This Month', value: released.toLocaleString(), sub: 'Delivery confirmed by file upload' })}
      </div>
      <div class="flex flex-col">
        ${listFilterBar(s, 'Transaction ID, Invoice ID or Customer', selectPill('list', 'stage', 'Hold Stage', stageOpts, s.stage))}
        <div class="space-y-4 pt-6">
          ${listToolbar(rows.length, 'transactions on hold', applied(s))}
          ${dataTable({ cols, rows: pageRows, rowAttrs: t => `data-action="open-txn" data-value="${t.id}"`, emptyTitle: all.length ? 'No escrow hold matches these filters' : 'No escrow payment is on hold' })}
          ${pager(s, rows.length, start, pageRows.length, totalPages)}
        </div>
      </div>
      <p class="flex items-start gap-1.5 text-[11px] text-slate-400">${ic('info', 'w-3.5 h-3.5 shrink-0 mt-px')}To release a payment, download it with Get Deliverables, fill in the delivery columns and upload the file under Service Delivery. It is settled in the store's next settlement.</p>
    </div>`;
}
