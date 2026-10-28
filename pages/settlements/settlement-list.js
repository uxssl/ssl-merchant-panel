// =====================================================================
// Settlements — the Settlement Report's payouts as a list, grouped by settlement date.
// Same records and filters; the report (Analytics & Reports) keeps the table, overview and unsettled summary.
// =====================================================================
const SETTLE_LIST_PATH = '/settlements';
const SETTLE_ICON = { 'Paid': 'circle-check', 'Pending': 'clock', 'On Hold': 'circle-pause', 'Bounced': 'undo-2' };
const SETTLE_NOTE_CLS = { 'Paid': 'text-emerald-600', 'Pending': 'text-amber-600', 'On Hold': 'text-rose-600', 'Bounced': 'text-orange-700' };
const settleNote = (x) => x.status === 'Paid' ? `Paid ${fmtBDT(x.paid)}` : x.status === 'Pending' ? `Scheduled ${fmtTime(x.date)}` : `Fwd ${fmtBDT(x.fwd)}`;

function settleDayLabel(d) {
  const days = Math.round((startOfDay(NOW) - startOfDay(d)) / 864e5);
  return days === 0 ? 'Today' : days === 1 ? 'Yesterday' : days === -1 ? 'Tomorrow' : fmtDate(d);
}

function settleListItem(x) {
  return `
    <button type="button" data-action="open-settlement" data-value="${x.ref}" class="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors">
      <span class="w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${SETTLE_CLS[x.status]}">${ic(SETTLE_ICON[x.status], 'w-4 h-4')}</span>
      <span class="flex-1 min-w-0">
        <span class="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span class="text-sm font-semibold text-slate-900">${esc(x.storeName)}</span>
          ${settleBadge(x.status)}
        </span>
        <span class="block mt-0.5 text-xs text-slate-500 truncate"><span class="font-mono">${x.ref}</span> · ${x.type} · ${x.txnCount} transactions · ${x.bank.bank} •••• ${x.bank.account.slice(-4)}</span>
      </span>
      <span class="text-right shrink-0">
        <span class="block text-sm font-bold text-slate-900 tabular-nums whitespace-nowrap">${fmtBDT(x.settle)}</span>
        <span class="block mt-0.5 text-xs whitespace-nowrap ${SETTLE_NOTE_CLS[x.status]}">${settleNote(x)}</span>
      </span>
      ${ic('chevron-right', 'hidden sm:block w-4 h-4 text-slate-300 shrink-0')}
    </button>`;
}

function renderSettlementList() {
  const s = pageState();
  const base = settlementRows(applied(s), false);
  const rows = settlementRows(applied(s)).sort((a, b) => b.date - a.date);
  const { totalPages, start, pageRows } = paginate(s, rows);
  const typeOpts = [{ label: 'All Settlement Type', value: 'all' }, ...SETTLE_TYPES.map(v => ({ label: v, value: v }))];

  // Status tabs replace the status dropdown: each shows how many settlements it holds.
  const tabs = ['all', ...SETTLE_STATUSES].map(v => {
    const n = v === 'all' ? base.length : base.filter(x => x.status === v).length;
    const on = s.applied.status === v;
    return `<button data-action="overview-status" data-value="${v}" aria-pressed="${on}" class="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${on ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-800'}">${v === 'all' ? 'All' : v}<span class="text-xs tabular-nums ${on ? 'text-primary-600' : 'text-slate-400'}">${n}</span></button>`;
  }).join('');

  const days = [];
  pageRows.forEach(x => {
    const key = +startOfDay(x.date);
    const day = days.find(d => d.key === key) || (days.push({ key, date: x.date, items: [] }), days[days.length - 1]);
    day.items.push(x);
  });

  return `
    <div class="space-y-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">Settlements</h1>
          <p class="text-slate-500 text-sm">Every payout to your bank account, day by day. Open one for its full breakdown.</p>
        </div>
        <a href="#${SETTLEMENT_PATH}" class="${BTN_SECONDARY}">${ic('table-2', 'w-4 h-4')}Settlement Report</a>
      </div>

      <div class="flex flex-col">
        ${listFilterBar(s, 'Reference No or Batch No', selectPill('list', 'stype', 'Settlement Type', typeOpts, s.stype))}
        <div class="space-y-4 pt-6">
          <div class="flex gap-1 p-1 rounded-lg bg-slate-100 overflow-x-auto w-fit max-w-full">${tabs}</div>
          ${listToolbar(rows.length, 'settlements', applied(s))}
          <div class="rounded-md border border-slate-200 bg-white shadow-sm overflow-hidden">
            ${days.length ? days.map(d => `
              <section>
                <div class="flex items-center justify-between gap-3 px-4 py-2 bg-slate-50 border-y border-slate-100 first:border-t-0 text-xs font-semibold text-slate-500">
                  <span>${settleDayLabel(d.date)}</span>
                  <span class="tabular-nums">${d.items.length} · ${fmtBDT(d.items.reduce((n, x) => n + x.settle, 0))}</span>
                </div>
                <div class="divide-y divide-slate-100">${d.items.map(settleListItem).join('')}</div>
              </section>`).join('') : emptyBlock('No settlements found', 'Try another status, date range or store.')}
          </div>
          ${pager(s, rows.length, start, pageRows.length, totalPages)}
        </div>
      </div>
    </div>`;
}
