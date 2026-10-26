// =====================================================================
// Financial Year Report
// =====================================================================
const fyOpen = new Set([CURRENT_FY - 1]);
const FY_CLS = {
  'Generated': 'bg-emerald-50 text-emerald-600 border border-emerald-100',
  'Processing': 'bg-amber-50 text-amber-600 border border-amber-100',
  'In Progress': 'bg-blue-50 text-blue-600 border border-blue-100',
};
const fyBadge = (s) => `<span class="px-2 py-1 rounded-full text-[10px] font-medium uppercase tracking-wide whitespace-nowrap ${FY_CLS[s]}">${s}</span>`;
const fyStores = (y) => STORES.filter(st => fyMonths(y, st.id).some(m => m.gross > 0));
const addMonths = (a, b) => a.map((m, i) => ({ ...m, txns: m.txns + b[i].txns, gross: m.gross + b[i].gross, fees: m.fees + b[i].fees, refunds: m.refunds + b[i].refunds, net: m.net + b[i].net }));
function fyTotals(y, storeId = 'all') {
  const ids = storeId === 'all' ? STORES.map(s => s.id) : [storeId];
  const months = ids.map(id => fyMonths(y, id)).reduce(addMonths);
  const t = (k) => months.reduce((s, m) => s + m[k], 0);
  return { months, txns: t('txns'), gross: t('gross'), fees: t('fees'), refunds: t('refunds'), net: t('net') };
}

function fyCard(y) {
  const open = fyOpen.has(y);
  const tot = fyTotals(y);
  const stores = fyStores(y);
  const current = y === CURRENT_FY;
  const max = Math.max(...tot.months.map(m => m.gross), 1);
  const monthLabels = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const downloadCell = (status, storeId) => status === 'Processing'
    ? `<span class="inline-flex items-center gap-1.5 text-xs text-amber-600 font-medium">${ic('loader', 'w-3.5 h-3.5')}Generating…</span>`
    : `<div class="inline-flex flex-wrap justify-end gap-1.5">
        <button data-action="toast" data-msg="Prototype: ${status === 'In Progress' ? 'provisional ' : ''}PDF statement is not wired up." class="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 inline-flex items-center gap-1">${ic('file-down', 'w-3.5 h-3.5')}${status === 'In Progress' ? 'Provisional PDF' : 'PDF'}</button>
        ${status === 'Generated' ? `<button data-action="toast" data-msg="Prototype: Excel statement is not wired up." class="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 inline-flex items-center gap-1">${ic('sheet', 'w-3.5 h-3.5')}Excel</button>` : ''}
      </div>`;
  const row = (storeId, name, sub, status) => `
    <tr class="hover:bg-slate-50/50 transition-colors">
      <td class="px-3 sm:px-5 py-3"><div class="font-medium text-slate-900">${name}</div><div class="text-[11px] text-slate-500 font-mono">${sub}</div><div class="sm:hidden mt-1 flex items-center gap-2">${fyBadge(status)}<button data-action="open-fy" data-year="${y}" data-store="${storeId}" class="text-xs font-medium text-primary-600 hover:underline">View</button></div></td>
      <td class="hidden sm:table-cell px-5 py-3">${fyBadge(status)}</td>
      <td class="hidden sm:table-cell px-5 py-3 text-center"><button data-action="open-fy" data-year="${y}" data-store="${storeId}" class="text-xs font-medium text-primary-600 hover:text-primary-700 hover:underline">View</button></td>
      <td class="px-3 sm:px-5 py-3 text-right">${downloadCell(status, storeId)}</td>
    </tr>`;
  const allStatus = current ? 'In Progress' : stores.some(st => fyStatus(y, st.id) === 'Processing') ? 'Processing' : 'Generated';

  return `
    <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <button data-action="fy-toggle" data-value="${y}" class="w-full p-5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4 text-left">
        <div class="flex items-center gap-4 min-w-0">
          <span class="p-1.5 rounded-md ${open ? 'bg-slate-100' : 'bg-slate-50'}">${ic(open ? 'chevron-down' : 'chevron-right', 'w-4 h-4 text-slate-500')}</span>
          <div class="min-w-0">
            <h3 class="text-lg font-medium text-slate-900 flex items-center gap-2">FY ${fyLabel(y)} ${current ? fyBadge('In Progress') : ''}</h3>
            <p class="text-xs text-slate-500 font-medium mt-0.5">01 Jul ${y} – 30 Jun ${y + 1}${current ? ` · to date (${fmtShort(NOW)})` : ''} · Reports for ${stores.length} store${stores.length > 1 ? 's' : ''}</p>
          </div>
        </div>
        <div class="flex items-center gap-8 shrink-0">
          <div class="text-right hidden md:block"><p class="text-[11px] font-medium text-slate-500 uppercase tracking-tight">Gross Sales</p><p class="text-sm font-bold text-slate-900 tabular-nums">${fmtBDTShort(tot.gross)}</p></div>
          <div class="text-right"><p class="text-[11px] font-medium text-slate-500 uppercase tracking-tight">Net Settled</p><p class="text-sm font-bold text-slate-900 tabular-nums">${fmtBDTShort(tot.net)}</p></div>
        </div>
      </button>
      ${open ? `
        <div class="border-t border-slate-100 bg-slate-50/30 p-5 space-y-5">
          <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
            ${statBox('Transactions', tot.txns.toLocaleString())}
            ${statBox('Gross Sales', fmtBDTShort(tot.gross))}
            ${statBox('Gateway Fees', fmtBDTShort(tot.fees))}
            ${statBox('Refunds & Chargebacks', fmtBDTShort(tot.refunds))}
            ${statBox('Net Settled', fmtBDTShort(tot.net), 'text-emerald-600')}
          </div>
          <div>
            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Monthly gross sales</p>
            <div class="flex items-end gap-2 h-28 px-1">
              ${monthLabels.map((label, i) => {
                const m = tot.months[i];
                const h = m ? Math.max(2, m.gross / max * 100) : 0;
                return `<div class="flex-1 flex flex-col items-center justify-end h-full gap-1" title="${label}: ${m ? fmtBDT0(m.gross) : 'not started'}">
                  <div class="w-full rounded-t ${m ? 'bg-primary-600' : 'bg-slate-100 border border-dashed border-slate-300'}" style="height:${m ? h : 100}%"></div>
                  <span class="text-[10px] text-slate-500">${label}</span>
                </div>`;
              }).join('')}
            </div>
          </div>
          <div class="rounded-lg border border-slate-200 overflow-hidden bg-white">
            <table class="w-full text-sm text-left">
              <thead><tr class="text-[11px] uppercase tracking-wider text-slate-500 font-medium border-b border-slate-200 bg-slate-50">
                <th class="px-3 sm:px-5 py-3">Store</th><th class="hidden sm:table-cell px-5 py-3">Status</th><th class="hidden sm:table-cell px-5 py-3 text-center">Details</th><th class="px-3 sm:px-5 py-3 text-right">Download</th>
              </tr></thead>
              <tbody class="divide-y divide-slate-100">
                ${row('all', 'All stores (consolidated)', `${stores.length} stores`, allStatus)}
                ${stores.map(st => row(st.id, esc(st.name), st.id, fyStatus(y, st.id))).join('')}
              </tbody>
            </table>
          </div>
        </div>` : ''}
    </div>`;
}

function renderFinancialYear() {
  const lifetime = FY_YEARS.reduce((s, y) => s + fyTotals(y).net, 0);
  return `
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">Financial Year Report</h1>
        <p class="text-slate-500 text-sm">Year-wise statement of your sales, fees and settlements for the Bangladesh financial year (1 July – 30 June).</p>
      </div>

      <div class="rounded-xl border border-indigo-100 bg-indigo-50/60 p-5 flex items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-indigo-100 rounded-lg">${ic('file-text', 'w-5 h-5 text-indigo-600')}</div>
          <div>
            <h3 class="text-sm font-semibold text-indigo-800 uppercase tracking-wider">Consolidated Summary</h3>
            <p class="text-xs text-indigo-600 font-medium">Financial year reports over ${FY_YEARS.length} years · ${STORES.length} stores</p>
          </div>
        </div>
        <div class="text-right">
          <div class="text-xs text-indigo-500 mb-0.5">Lifetime Net Settled</div>
          <div class="text-2xl font-bold text-indigo-800 tabular-nums">${fmtBDTShort(lifetime)}</div>
        </div>
      </div>

      <div class="space-y-4">${FY_YEARS.map(fyCard).join('')}</div>

      <p class="flex items-start gap-1.5 text-[11px] text-slate-500">${ic('info', 'w-3.5 h-3.5 mt-px shrink-0')}Statements are generated after the financial year closes on 30 June and can be used for VAT / income tax filing with NBR. The current year's statement is provisional. All figures here are mock data.</p>
    </div>`;
}

function fyDrawer({ y, storeId }) {
  const tot = fyTotals(y, storeId);
  const name = storeId === 'all' ? 'All stores (consolidated)' : STORES.find(s => s.id === storeId).name;
  const status = storeId === 'all'
    ? (y === CURRENT_FY ? 'In Progress' : fyStores(y).some(st => fyStatus(y, st.id) === 'Processing') ? 'Processing' : 'Generated')
    : fyStatus(y, storeId);
  const fmtMonth = (d) => `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  return drawerShell({
    wide: true,
    title: `FY ${fyLabel(y)}`,
    sub: `<span>${esc(name)}</span>${fyBadge(status)}`,
    body: `
      <div class="grid grid-cols-3 gap-3">
        ${statBox('Gross Sales', fmtBDTShort(tot.gross))}
        ${statBox('Fees + Refunds', fmtBDTShort(tot.fees + tot.refunds), 'text-rose-600')}
        ${statBox('Net Settled', fmtBDTShort(tot.net), 'text-emerald-600')}
      </div>
      ${section('Monthly Breakdown', miniTable(
        ['Month', 'Transactions', 'Gross Sales', 'Gateway Fees', 'Refunds', 'Net Settled'],
        tot.months.map(m => [fmtMonth(m.start), m.txns.toLocaleString(), fmtBDT0(m.gross), fmtBDT0(m.fees), fmtBDT0(m.refunds), fmtBDT0(m.net)]),
        { right: [1, 2, 3, 4, 5], total: ['Total', tot.txns.toLocaleString(), fmtBDT0(tot.gross), fmtBDT0(tot.fees), fmtBDT0(tot.refunds), fmtBDT0(tot.net)] }))}
      ${y === CURRENT_FY ? `<p class="text-xs text-slate-500">Months after ${fmtMonth(NOW)} will appear as the year progresses. This statement is provisional until 30 Jun ${y + 1}.</p>` : ''}`,
    footer: status === 'Processing'
      ? `<span class="inline-flex items-center gap-2 text-sm text-amber-600 font-medium">${ic('loader', 'w-4 h-4')}Statement is being generated</span>`
      : `<button data-action="toast" data-msg="Prototype: Excel statement is not wired up." class="${BTN_SECONDARY}">${ic('sheet', 'w-4 h-4')}Download Excel</button>
         <button data-action="toast" data-msg="Prototype: PDF statement is not wired up." class="${BTN_PRIMARY}">${ic('file-down', 'w-4 h-4')}Download ${status === 'In Progress' ? 'Provisional ' : ''}PDF</button>`,
  });
}
