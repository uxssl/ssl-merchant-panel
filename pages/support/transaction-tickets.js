// =====================================================================
// Transaction Tickets
// =====================================================================
function ttRows(s, withStatus = true) {
  const q = s.search.trim().toLowerCase();
  return TXN_TICKETS.filter(t =>
    inStores(t.store) && inRange(t, s.range) &&
    (!q || t.no.toLowerCase().includes(q) || t.txn.id.toLowerCase().includes(q)) &&
    (!withStatus || s.status === 'all' || t.status === s.status));
}

function renderTxnTickets() {
  const s = pageState();
  const base = ttRows(applied(s), false);
  const rows = ttRows(applied(s));
  const { totalPages, start, pageRows } = paginate(s, rows);
  const solved = base.filter(t => t.status === 'Solved');
  const statusOpts = [{ label: 'All Status', value: 'all' }, { label: 'Requested', value: 'Requested' }, { label: 'Solved', value: 'Solved' }];
  const cols = [
    { label: 'Requested On', cell: t => dateCell(t.date) },
    { label: 'Ticket No', cell: t => idCell(t.no) },
    { label: 'Store', cls: 'hidden xl:table-cell', cell: t => esc(t.storeName) },
    { label: 'Transaction ID', cell: t => `<div class="font-mono text-xs text-slate-800">${t.txn.id}</div><div class="text-xs text-slate-500 whitespace-nowrap">${fmtBDT(t.txn.amount)} · ${t.txn.method}</div>` },
    { label: 'Query For', cell: t => `<div class="flex flex-wrap gap-1 max-w-[260px]">${t.queries.map(q => `<span class="px-2 py-0.5 rounded bg-slate-100 text-[11px] text-slate-700">${q}</span>`).join('')}</div>` },
    { label: 'Status', cell: t => supBadge(TT_CLS, t.status) },
  ];
  return `
    <div class="space-y-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">Transaction Tickets</h1>
          <p class="text-slate-500 text-sm">Ask support about a specific payment — status, refund, settlement or a customer dispute.</p>
        </div>
        <button data-action="new-tt" class="${BTN_PRIMARY} shrink-0">${ic('plus', 'w-4 h-4')}Raise Ticket</button>
      </div>
      <div class="flex flex-col">
        ${listFilterBar(s, 'Ticket No or Transaction ID', selectPill('list', 'status', 'Status', statusOpts, s.status))}
        <div class="flex flex-col gap-4 pt-4">
          <h2 class="text-sm font-semibold text-slate-900">Overview</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            ${metricCard({ title: 'Total Requests', value: base.length, status: 'all', selected: s.applied.status === 'all' })}
            ${metricCard({ title: 'Pending Requests', value: base.filter(t => t.status === 'Requested').length, status: 'Requested', selected: s.applied.status === 'Requested' })}
            ${metricCard({ title: 'Solved', value: solved.length, status: 'Solved', selected: s.applied.status === 'Solved' })}
          </div>
        </div>
        <div class="space-y-4 pt-6">
          ${listToolbar(rows.length, 'tickets', applied(s))}
          ${dataTable({ cols, rows: pageRows, rowAttrs: t => `data-action="open-tt" data-value="${t.no}"`, emptyTitle: 'No tickets found' })}
          ${pager(s, rows.length, start, pageRows.length, totalPages)}
        </div>
      </div>
      ${kamCard()}
    </div>`;
}

function ttDrawer(t) {
  const x = t.txn;
  return drawerShell({
    wide: true,
    title: 'Transaction Ticket',
    sub: `<span class="font-mono text-xs">${t.no}</span>${supBadge(TT_CLS, t.status)}`,
    body: `
      <button data-action="open-txn" data-value="${x.id}" class="w-full flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-4 py-3 text-left hover:bg-slate-50">
        <span><span class="block font-mono text-xs text-slate-800">${x.id}</span><span class="block text-xs text-slate-500">${fmtDate(x.date)}, ${fmtTime(x.date)} · ${x.method} <span class="font-mono">${x.account}</span></span></span>
        <span class="flex items-center gap-3"><span class="text-sm font-bold text-slate-900">${fmtBDT(x.amount)}</span>${badge(x.status)}${ic('chevron-right', 'w-4 h-4 text-slate-400')}</span>
      </button>
      ${section('Ticket Information', kvGrid([
        kv('Requested On', `${fmtDate(t.date)}, ${fmtTime(t.date)}`),
        kv('Store Name', esc(t.storeName)),
        kv('Transaction ID', t.txn.id, true),
        kv('Status', supBadge(TT_CLS, t.status)),
        `<div class="col-span-2">${kv('Query Type', `<span class="flex flex-wrap gap-1">${t.queries.map(q => `<span class="px-2 py-0.5 rounded bg-slate-100 text-xs font-normal">${q}</span>`).join('')}</span>`)}</div>`,
      ]))}
      ${section('Requester Information', kvGrid([
        kv('Requested By', t.requestedBy, true),
        kv('Account Type', 'Merchant'),
        kv('User Role', t.role),
        kv('Requester Email', t.email),
        kv('Requester Mobile', t.mobile, true),
      ]))}
      ${section('Feedback & Resolution', kvGrid([
        kv('Request Feedback', esc(t.note)),
        kv('Feedback Given By', t.feedbackBy || '—'),
        kv('Feedback Given On', t.feedbackOn ? `${fmtDate(t.feedbackOn)}, ${fmtTime(t.feedbackOn)}` : '—'),
        kv('Feedback Remarks', t.feedback ? esc(t.feedback) : 'Waiting for support'),
      ]))}
      ${section('Conversation', thread('tt', t, t.status === 'Requested'))}`,
    footer: `<button data-action="open-txn" data-value="${x.id}" class="${BTN_SECONDARY}">${ic('receipt', 'w-4 h-4')}View Transaction</button>`,
  });
}

function ttLookup(id) {
  const t = TXNS.find(x => x.id.toLowerCase() === id.trim().toLowerCase());
  if (!t) return id.trim().length >= 10 ? '<p class="text-xs text-slate-500">No transaction with this ID in your stores yet.</p>' : '';
  return `<div class="rounded-lg border border-emerald-200 bg-emerald-50/50 px-3 py-2 text-xs text-slate-700 flex items-center gap-2 flex-wrap">${ic('circle-check', 'w-3.5 h-3.5 text-emerald-600')}${esc(t.storeName)} · ${fmtDate(t.date)} · ${fmtBDT(t.amount)} · ${t.method} ${badge(t.status)}</div>`;
}

function ttFormDrawer() {
  const d = ticketDraft;
  return drawerShell({
    title: 'Raise Transaction Ticket',
    sub: '<span>Support usually replies within one working day (mock)</span>',
    body: `
      ${field('Transaction ID', `<input data-ticket="txnId" value="${esc(d.txnId)}" placeholder="e.g. TXN261024AB12CD" class="${INPUT} font-mono">`, { required: true, error: formErrors.txnId, hint: 'Find it in All Transactions or Transaction ID Tracking.' })}
      <div id="tt-lookup">${ttLookup(d.txnId)}</div>
      ${section('Query For', `<div class="space-y-2">${TXN_QUERIES.map(q => `
        <label class="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" data-ticket-query value="${q}" ${d.queries.includes(q) ? 'checked' : ''} class="rounded border-slate-300 text-primary-600">${q}</label>`).join('')}
        ${formErrors.queries ? `<p class="text-[11px] font-medium text-rose-600">${formErrors.queries}</p>` : ''}</div>`)}
      ${field('Details', `<textarea data-ticket="text" rows="4" class="${INPUT}" placeholder="Describe what the customer reported">${esc(d.text)}</textarea>`, { required: true, error: formErrors.text })}`,
    footer: `
      <button data-action="close-drawer" class="${BTN_SECONDARY}">Cancel</button>
      <button data-action="save-tt" class="${BTN_PRIMARY}">${ic('send', 'w-4 h-4')}Submit Ticket</button>`,
  });
}
