// =====================================================================
// Digital EMI
// =====================================================================
let emiTab = 'settings';
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
    inStores(e.store) &&
    (s.bank === 'all' || e.bank === s.bank) &&
    (s.bstatus === 'all' || e.bankStatus === s.bstatus) &&
    inRange(e, s.range) &&
    (!q || e.ref.toLowerCase().includes(q) || e.txn.id.toLowerCase().includes(q)) &&
    (!withStatus || s.status === 'all' || e.status === s.status)
  );
}

function emiRequestsTab(s) {
  const base = emiRows(applied(s), false);
  const rows = emiRows(applied(s));
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
        selectPill('list', 'status', 'Request Status', statusOpts, s.status) +
        selectPill('list', 'bstatus', 'Bank Status', bankStatusOpts, s.bstatus) +
        selectPill('list', 'bank', 'EMI Issuer Bank', bankOpts, s.bank))}
      <div class="flex flex-col gap-4 pt-4">
        <h2 class="text-sm font-semibold text-slate-900">Overview</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          ${metricCard({ title: 'Total Requests', value: base.length.toLocaleString(), status: 'all', selected: s.applied.status === 'all' && s.applied.bstatus === 'all' })}
          ${metricCard({ title: 'Approved', value: base.filter(e => e.bankStatus === 'Approved').length.toLocaleString(), status: 'Approved', key: 'bstatus', selected: s.applied.bstatus === 'Approved' })}
          ${metricCard({ title: 'Declined', value: base.filter(e => e.status === 'Declined').length.toLocaleString(), status: 'Declined', selected: s.applied.status === 'Declined' })}
          ${metricCard({ title: 'EMI Amount (BDT)', value: fmtBDTShort(base.reduce((n, e) => n + e.charge, 0)) })}
        </div>
      </div>
      <div class="space-y-4 pt-6">
        ${listToolbar(rows.length, 'EMI requests', applied(s))}
        ${dataTable({ cols, rows: pageRows, rowAttrs: e => `data-action="open-emi" data-value="${e.ref}"`, emptyTitle: 'No EMI requests found' })}
        ${pager(s, rows.length, start, pageRows.length, totalPages)}
      </div>
    </div>`;
}

// ---------------------------------------------------------------------
// EMI Settings — the old panel's per-store form: bank channels, tenures, EMI model and agreement.
// Edits stay in a draft until "Update EMI Configuration".
// ---------------------------------------------------------------------
const EMI_MODEL_NOTES = [
  ['EMI with parameters', 'This is product specific EMI configuration. Here, merchant needs to configure EMI parameters at their end. SSL will receive EMI command through these parameters. This way, merchant can provide EMI facility on selective products.'],
  ['AUTO EMI (EMI with specific amount & charges will bear by MERCHANT) - EMI with specific amount', 'This is value specific EMI configuration. Merchant will set a minimum EMI purchase amount. If the minimum purchase amount passes through SSLCOMMERZ gateway then customer will find Pay with EMI option in SSLCOMMERZ payment page.'],
  ['Global EMI (EMI with specific amount & charges will bear by CUSTOMER/USER) - EMI with surcharge', 'In this model, merchant surcharges customer for EMI payment. Customer will find EMI payment option in SSLCOMMERZ payment page. Upon selecting the EMI tenures, EMI charge will be added to the product/service price. This is applicable on all product purchase.'],
];
let emiForm = null; // { store, model, banks, agree, open: Set of collapsed banks }
const emiStoreOptions = () => STORES.filter(st => inStores(st.id));
function loadEmiForm(storeId) {
  const saved = EMI_CONFIG[storeId];
  emiForm = { store: storeId, model: saved.model, banks: structuredClone(saved.banks), agree: saved.model !== 'disable', collapsed: new Set(), error: '' };
}

function emiBankCard(b) {
  const cfg = emiForm.banks[b.name];
  const folded = emiForm.collapsed.has(b.name);
  return `
    <div class="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div class="flex items-center justify-between gap-2 px-4 py-2.5 bg-primary-600 text-white">
        <h3 class="text-sm font-semibold truncate" title="${esc(b.name)}">${esc(b.name)}</h3>
        <button data-action="emi-fold" data-value="${esc(b.name)}" aria-expanded="${!folded}" aria-label="${folded ? 'Show' : 'Hide'} ${esc(b.name)} tenures" class="p-0.5 rounded-full hover:bg-white/15">${ic(folded ? 'circle-plus' : 'circle-minus', 'w-4 h-4')}</button>
      </div>
      ${folded ? '' : `<div class="p-3 space-y-2">
        <label class="flex items-start gap-2 text-xs text-slate-700"><input type="checkbox" data-emi-bank="${esc(b.name)}" ${cfg.on ? 'checked' : ''} class="mt-0.5 rounded border-slate-300 text-primary-600">Want your customers to see this bank as a payment channel?</label>
        <table class="w-full text-xs ${cfg.on ? '' : 'opacity-50'}">
          <thead><tr class="text-left text-slate-500 border-b border-slate-200"><th class="py-1.5 font-semibold">Tenure</th><th class="py-1.5 font-semibold">EMI Charge</th><th class="py-1.5 font-semibold text-center">Status</th></tr></thead>
          <tbody class="divide-y divide-slate-100">
            ${b.tenures.map(m => `<tr>
              <td class="py-1.5 text-slate-700">${m}</td>
              <td class="py-1.5 tabular-nums text-slate-700">${b.rates[m].toFixed(3)}%</td>
              <td class="py-1.5 text-center"><input type="checkbox" data-emi-tenure="${esc(b.name)}|${m}" ${cfg.tenures[m] ? 'checked' : ''} ${cfg.on ? '' : 'disabled'} aria-label="${esc(b.name)} ${m} months" class="rounded border-slate-300 text-primary-600 disabled:opacity-60"></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`}
    </div>`;
}

function emiSettingsTab() {
  const stores = emiStoreOptions();
  if (!emiForm || !stores.some(st => st.id === emiForm.store)) loadEmiForm(stores[0].id);
  const f = emiForm;
  return `
    <div class="space-y-4">
      <div class="max-w-sm">${field('My Store', `<select id="emi-store" class="${INPUT}">${options(stores.map(st => [st.id, `${st.name} (${st.id})`]), f.store)}</select>`)}</div>
      <div class="bg-white rounded-lg border border-slate-200 shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
          <div>
            <h2 class="text-sm font-semibold text-slate-900">EMI Settings</h2>
            <p class="text-xs text-slate-500">EMI Charge is the % deducted from your settlement for each EMI payment.</p>
          </div>
          <div class="flex gap-2">
            <button data-action="emi-all" data-value="on" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700">${ic('circle-check', 'w-3.5 h-3.5')}Check All</button>
            <button data-action="emi-all" data-value="off" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700">${ic('circle-x', 'w-3.5 h-3.5')}Uncheck All</button>
          </div>
        </div>
        <div class="p-5 space-y-6">
          <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 items-start">${EMI_BANKS.map(emiBankCard).join('')}</div>
          <div class="max-w-xl space-y-3">
            ${field('EMI Status', `<select id="emi-model" class="${INPUT}">${options(EMI_MODELS, f.model)}</select>`, { required: true })}
            <ul class="rounded-lg bg-primary-50 border border-primary-100 p-4 space-y-2 text-xs text-slate-700 list-disc pl-8">
              ${EMI_MODEL_NOTES.map(([t, d]) => `<li><span class="font-semibold text-slate-900">${t}:</span> ${d}</li>`).join('')}
            </ul>
            <label class="flex items-start gap-2 text-sm text-slate-700"><input type="checkbox" id="emi-agree" ${f.agree ? 'checked' : ''} class="mt-0.5 rounded border-slate-300 text-primary-600"><span>I have agreed with the <button data-action="toast" data-msg="Prototype: the EMI terms and conditions are not linked yet." class="font-semibold text-primary-600 hover:underline">terms and conditions</button> to enable the EMI service with SSLCOMMERZ. <span class="text-rose-500">*</span></span></label>
            ${f.error ? `<p class="text-[11px] font-medium text-rose-600">${f.error}</p>` : ''}
            <button data-action="emi-save" class="${BTN_PRIMARY}">${ic('save', 'w-4 h-4')}Update EMI Configuration</button>
          </div>
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
          <p class="text-slate-500 text-sm">Choose the banks and tenures your card customers can pay in monthly instalments with.</p>
        </div>
        <div class="inline-flex p-1 bg-white border border-slate-200 rounded-full shadow-sm">
          ${tab('settings', 'EMI Settings', 'settings-2')}${tab('requests', 'EMI Requests', 'list')}
        </div>
      </div>
      ${emiTab === 'settings' ? emiSettingsTab() : emiRequestsTab(s)}
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
