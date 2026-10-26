// =====================================================================
// Digital EMI
// =====================================================================
let emiTab = 'requests';
const emiCalc = { amount: '50000', bank: EMI_BANKS[2].name };
const EMI_REQ_STATUSES = ['Requested', 'Processing', 'Initial', 'Declined'];
const EMI_BANK_STATUSES = ['Approved', 'Sent', 'Not Sent', 'Cancel'];
const EMI_CLS = { Requested: 'bg-amber-50 text-amber-600', Declined: 'bg-rose-50 text-rose-600', Processing: 'bg-blue-50 text-blue-600', Initial: 'bg-slate-100 text-slate-500' };
const EMI_BANK_CLS = { Approved: 'bg-emerald-50 text-emerald-600', Cancel: 'bg-rose-50 text-rose-600', Sent: 'bg-blue-50 text-blue-600', 'Not Sent': 'bg-slate-100 text-slate-500' };
const emiBadge = (s) => `<span class="${STATUS_BADGE} ${EMI_CLS[s]}">${s}</span>`;
const emiBankBadge = (s) => `<span class="${STATUS_BADGE} ${EMI_BANK_CLS[s]}">${s}</span>`;
const titleCase = (s) => s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

function emiRows(s, withStatus = true) {
  const q = s.search.trim().toLowerCase();
  return EMI_REQUESTS.filter(e =>
    (s.store === 'all' || e.store === s.store) &&
    (s.bank === 'all' || e.bank === s.bank) &&
    (s.bstatus === 'all' || e.bankStatus === s.bstatus) &&
    inRange(e, s.range) &&
    (!q || e.ref.toLowerCase().includes(q) || e.txn.id.toLowerCase().includes(q)) &&
    (!withStatus || s.status === 'all' || e.status === s.status)
  );
}

function emiRequestsTab(s) {
  const base = emiRows(s, false);
  const rows = emiRows(s);
  const { totalPages, start, pageRows } = paginate(s, rows);
  const statusOpts = [{ label: 'All Status', value: 'all' }, ...EMI_REQ_STATUSES.map(v => ({ label: v, value: v }))];
  const bankStatusOpts = [{ label: 'All', value: 'all' }, ...EMI_BANK_STATUSES.map(v => ({ label: v, value: v }))];
  const bankOpts = [{ label: 'All Banks', value: 'all' }, ...EMI_BANKS.map(b => ({ label: titleCase(b.name), value: b.name }))];
  const cols = [
    { label: 'Requested On', cell: e => dateCell(e.date) },
    { label: 'EMI Ref. Id', cell: e => `${idCell(e.ref)}<div class="2xl:hidden text-[11px] text-slate-500 font-mono">${e.txn.id}</div>` },
    { label: 'Store', cls: 'hidden xl:table-cell', cell: e => esc(e.storeName) },
    { label: 'Transaction ID', cls: 'hidden 2xl:table-cell', cell: e => `<span class="font-mono text-xs">${e.txn.id}</span>` },
    { label: 'TXN Amount', right: true, cell: e => `<span class="font-semibold text-slate-900 whitespace-nowrap">${fmtBDT(e.txn.amount)}</span>` },
    { label: 'EMI Amount', right: true, cell: e => `<div class="font-medium text-slate-800 whitespace-nowrap">${fmtBDT(e.charge)}</div><div class="text-xs text-slate-500">${e.tenure} months · ${titleCase(e.bank).replace(/ Limited$/, '')}</div>` },
    { label: 'Status', cell: e => `${emiBadge(e.status)}<div class="xl:hidden mt-1">${emiBankBadge(e.bankStatus)}</div>` },
    { label: 'Bank Status', cls: 'hidden xl:table-cell', cell: e => emiBankBadge(e.bankStatus) },
  ];
  return `
    <div class="flex flex-col">
      ${listFilterBar(s, 'EMI Ref ID or Transaction ID',
        selectPill('list', 'status', 'Request Status', statusOpts, s.status, 'circle-dot') +
        selectPill('list', 'bstatus', 'Bank Status', bankStatusOpts, s.bstatus, 'landmark') +
        selectPill('list', 'bank', 'EMI Issuer Bank', bankOpts, s.bank, 'building-2'))}
      <div class="flex flex-col gap-4 pt-4">
        <h2 class="text-sm font-semibold text-slate-900">Overview</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          ${metricCard({ title: 'Total Requests', value: base.length.toLocaleString(), status: 'all', selected: s.status === 'all' && s.bstatus === 'all' })}
          ${metricCard({ title: 'Approved', value: base.filter(e => e.bankStatus === 'Approved').length.toLocaleString(), status: 'Approved', key: 'bstatus', selected: s.bstatus === 'Approved' })}
          ${metricCard({ title: 'Declined', value: base.filter(e => e.status === 'Declined').length.toLocaleString(), status: 'Declined', selected: s.status === 'Declined' })}
          ${metricCard({ title: 'EMI Amount (BDT)', value: fmtBDTShort(base.reduce((n, e) => n + e.charge, 0)) })}
        </div>
      </div>
      <div class="space-y-4 pt-6">
        ${listToolbar(rows.length, 'EMI requests', s)}
        ${dataTable({ cols, rows: pageRows, rowAttrs: e => `data-action="open-emi" data-value="${e.ref}"`, emptyTitle: 'No EMI requests found' })}
        ${pager(s, rows.length, start, pageRows.length, totalPages)}
      </div>
    </div>`;
}

function emiCalcResult() {
  const amount = Number(emiCalc.amount) || 0;
  const bank = EMI_BANKS.find(b => b.name === emiCalc.bank);
  if (amount < 5000) return `<p class="text-xs text-slate-500">Enter an amount of ৳5,000 or more (mock minimum).</p>`;
  return miniTable(['Tenure', 'Customer pays / month', 'Your EMI charge', 'You receive'],
    bank.tenures.map(m => [`${m} months`, fmtBDT(amount / m), `${fmtBDT(amount * bank.rates[m] / 100)} <span class="text-slate-400">(${bank.rates[m].toFixed(1)}%)</span>`, fmtBDT(amount - amount * bank.rates[m] / 100)]),
    { right: [1, 2, 3] });
}

function emiPlansTab() {
  return `
    <div class="space-y-6">
      <div class="bg-white rounded-lg border border-slate-200 shadow-sm">
        ${cardHead('EMI Availability', 'Stores where customers can choose EMI at checkout')}
        <div class="p-5 flex flex-wrap gap-3">
          ${STORES.map(st => `
            <div class="flex items-center gap-2 px-3 py-2 rounded-lg border ${EMI_STORES[st.id] ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-slate-50'}">
              ${ic(EMI_STORES[st.id] ? 'circle-check' : 'circle-minus', `w-4 h-4 ${EMI_STORES[st.id] ? 'text-emerald-600' : 'text-slate-400'}`)}
              <span class="text-sm font-medium text-slate-800">${esc(st.name)}</span>
              <span class="text-xs ${EMI_STORES[st.id] ? 'text-emerald-600' : 'text-slate-500'}">${EMI_STORES[st.id] ? 'Enabled' : 'Not enabled'}</span>
            </div>`).join('')}
          <p class="basis-full text-xs text-slate-500">To enable EMI for another store or change rates, contact your KAM.</p>
        </div>
      </div>

      <div class="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        ${cardHead('EMI Configuration', 'Store Rate by bank and tenure — the charge deducted from your settlement for each EMI payment')}
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50 border-b border-slate-200"><tr>
            <th class="h-10 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Bank</th>
            ${EMI_TENURES.map(m => `<th class="h-10 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right whitespace-nowrap">${m}m</th>`).join('')}
          </tr></thead>
          <tbody class="divide-y divide-slate-100">
            ${EMI_BANKS.map(b => `<tr class="hover:bg-slate-50">
              <td class="px-4 py-2.5 font-medium text-slate-800">${titleCase(b.name)}</td>
              ${EMI_TENURES.map(m => `<td class="px-2 py-2.5 text-right tabular-nums ${b.tenures.includes(m) ? 'text-slate-700' : 'text-slate-300'}">${b.tenures.includes(m) ? `${b.rates[m].toFixed(1)}%` : '—'}</td>`).join('')}
            </tr>`).join('')}
          </tbody>
        </table>
        <p class="px-4 py-3 text-[11px] text-slate-500 border-t border-slate-100">Rates follow the KAM panel's EMI configuration and are mock values. Bank rates are not shown to merchants.</p>
      </div>

      <div class="bg-white rounded-lg border border-slate-200 shadow-sm">
        ${cardHead('EMI Calculator', 'What your customer pays each month and what you receive')}
        <div class="p-5 space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
            ${field('Product Price (BDT)', `<input id="emi-calc-amount" type="number" min="0" value="${esc(emiCalc.amount)}" class="${INPUT}">`)}
            ${field('Bank', `<select id="emi-calc-bank" class="${INPUT}">${options(EMI_BANKS.map(b => [b.name, titleCase(b.name)]), emiCalc.bank)}</select>`)}
          </div>
          <div id="emi-calc-result">${emiCalcResult()}</div>
        </div>
      </div>
    </div>`;
}

function renderDigitalEmi() {
  const s = pageState();
  const tab = (value, label, icon) => `<button data-action="emi-tab" data-value="${value}" class="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${emiTab === value ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}">${ic(icon, 'w-4 h-4')}${label}</button>`;
  return `
    <div class="space-y-6">
      <div class="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">Digital EMI</h1>
          <p class="text-slate-500 text-sm">Let card customers pay in monthly instalments through partner banks.</p>
        </div>
        <div class="inline-flex p-1 bg-white border border-slate-200 rounded-full shadow-sm">
          ${tab('requests', 'EMI Requests', 'list')}${tab('plans', 'EMI Plans & Rates', 'percent')}
        </div>
      </div>
      ${emiTab === 'requests' ? emiRequestsTab(s) : emiPlansTab()}
    </div>`;
}

function emiDrawer(e) {
  const t = e.txn;
  const after = (h) => new Date(Math.min(NOW.getTime(), e.date.getTime() + h * 3600e3));
  const steps = [{ label: 'EMI requested at checkout', at: e.date, tone: 'blue' }];
  if (e.bankStatus !== 'Not Sent') steps.push({ label: `Sent to ${titleCase(e.bank)}`, at: after(26), tone: 'amber' });
  if (e.bankStatus === 'Approved') steps.push({ label: 'Approved by bank — instalments started', at: after(70), tone: 'emerald' });
  if (e.bankStatus === 'Cancel') steps.push({ label: 'Declined by bank — charged as a regular payment', at: after(70), tone: 'rose' });
  if (e.bankStatus === 'Not Sent') steps.push({ label: 'Waiting to be sent to bank', note: 'Usually within one working day (mock)', tone: 'slate' });
  return drawerShell({
    title: 'EMI Details',
    sub: `<span class="font-mono text-xs">${e.ref}</span>${emiBadge(e.status)}${emiBankBadge(e.bankStatus)}`,
    body: `
      <div class="grid grid-cols-3 gap-3">
        ${statBox('TXN Amount', fmtBDT(t.amount))}
        ${statBox('EMI Charge', fmtBDT(e.charge), 'text-rose-600')}
        ${statBox('Customer / Month', fmtBDT(t.amount / e.tenure))}
      </div>
      ${section('Information Details', kvGrid([
        kv('Store Name', esc(e.storeName)),
        kv('Store Id', e.store, true),
        kv('EMI Issuer Bank', titleCase(e.bank)),
        kv('EMI Tenure', `${e.tenure} Months`),
        kv('EMI Charge', `${fmtBDT(e.charge)} (${e.rate.toFixed(1)}%)`),
        kv('EMI Reference ID', e.ref, true),
        kv('Transaction Id', linkBtn('open-txn', t.id, t.id)),
        kv('Transaction Date', `${fmtDate(t.date)}, ${fmtTime(t.date, true)}`),
        kv('Card', t.account, true),
        kv('Requested On', `${fmtDate(e.date)}, ${fmtTime(e.date, true)}`),
        kv('Requested Remarks', e.remarks),
      ]))}
      ${section('Progress', timeline(steps))}
      ${PCI_NOTE}`,
    footer: `<button data-action="open-txn" data-value="${t.id}" class="${BTN_SECONDARY}">${ic('receipt', 'w-4 h-4')}View Transaction</button>`,
  });
}
