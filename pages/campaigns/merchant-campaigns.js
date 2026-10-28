// =====================================================================
// Merchant Campaigns — old panel "Merchant Initiated": the merchant creates the campaign,
// picks who talks to the bank (Merchant with card BINs, or SSL with a bank / MFS list)
// and sets each store's discount. Created campaigns can be edited or canceled.
// =====================================================================
let mcDraft = null;
const MC_COLS = [
  { key: 'pct', label: 'Discount Offer %', type: 'number', hint: 'Enter', width: 'w-20' },
  { key: 'observed', label: 'Discount Fully Observed by Merchant', type: 'yesno', width: 'w-28' },
  { key: 'minOrder', label: 'Minimum Order BDT', type: 'number', hint: 'Minimum', width: 'w-24' },
  { key: 'maxPerTxn', label: 'Max Discount Per Transaction', type: 'number', hint: 'Enter Max', width: 'w-24' },
  { key: 'maxPerCard', label: 'Maximum Discount Per Card', type: 'number', hint: 'Enter Card', width: 'w-24' },
  { key: 'perUser', label: 'Recurrent Discount Per User', type: 'number', hint: 'Enter', width: 'w-24' },
  { key: 'remarks', label: 'Remarks', type: 'text', hint: 'Enter Remarks' },
];
const communicatorText = (c) => c.communicator === 'SSL'
  ? [...c.banks, ...c.mfs, ...c.ib].map(esc).join(', ') || '—'
  : c.bins.map(b => `<span class="font-mono">${b}</span>`).join(', ');

function renderMerchantCampaigns() {
  const s = pageState();
  const rows = campaignRows(MERCHANT_CAMPAIGNS, applied(s));
  const { totalPages, start, pageRows } = paginate(s, rows);
  const statusOpts = [{ label: 'All Status', value: 'all' }, ...MC_STATUSES.map(v => ({ label: v, value: v }))];
  const count = (st) => MERCHANT_CAMPAIGNS.filter(c => c.status === st).length;
  const cols = [
    { label: 'Tracking Id', cell: c => `<span class="font-mono text-xs text-slate-700">${c.tracking}</span>` },
    { label: 'Campaign Name', cell: c => `<div class="font-medium text-slate-800">${esc(c.name)}</div><div class="text-xs text-slate-500">Bank communicator: ${c.communicator}</div>` },
    { label: 'Start Date', cell: c => `<span class="whitespace-nowrap">${fmtDate(c.start)}</span>` },
    { label: 'End Date', cell: c => `<span class="whitespace-nowrap">${fmtDate(c.end)}</span>` },
    { label: 'Status', cell: c => campaignBadge(c.status) },
    { label: 'Action', cell: c => `<div class="flex flex-wrap gap-1.5">
      ${mcEditable(c) ? actionBtn('edit-mc', c.id, 'pencil', 'Edit') : ''}
      ${actionBtn('open-mc', c.id, 'eye', 'View')}
      ${mcEditable(c) ? actionBtn('mc-cancel', c.id, 'circle-x', 'Cancel') : ''}
    </div>` },
  ];
  return `
    <div class="space-y-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">Merchant Campaigns</h1>
          <p class="text-slate-500 text-sm">Merchant initiated campaigns — your own discounts, set per store.</p>
        </div>
        <button data-action="new-mc" class="${BTN_PRIMARY} shrink-0">${ic('circle-plus', 'w-4 h-4')}Create Campaign</button>
      </div>
      <div class="flex flex-col">
        ${listFilterBar(s, 'Tracking ID or Campaign Name', selectPill('list', 'status', 'Status', statusOpts, s.status), { noStore: true })}
        <div class="flex flex-col gap-4 pt-4">
          <h2 class="text-sm font-semibold text-slate-900">Overview</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            ${metricCard({ title: 'Total Campaigns', value: MERCHANT_CAMPAIGNS.length, status: 'all', selected: s.applied.status === 'all' })}
            ${MC_STATUSES.map(st => metricCard({ title: st, value: count(st), status: st, selected: s.applied.status === st })).join('')}
          </div>
        </div>
        <div class="space-y-4 pt-6">
          ${listToolbar(rows.length, 'campaigns', applied(s))}
          ${dataTable({ cols, rows: pageRows, rowAttrs: c => `data-action="open-mc" data-value="${c.id}"`, emptyTitle: 'No campaigns found' })}
          ${pager(s, rows.length, start, pageRows.length, totalPages)}
        </div>
      </div>
    </div>`;
}

function mcDrawer(c) {
  const stores = joinedStores(c);
  return drawerShell({
    wide: 'xl',
    title: 'Campaign Details',
    sub: `<span class="font-mono text-xs">${c.tracking}</span>${campaignBadge(c.status)}`,
    body: `
      ${section('Campaign Information', kvGrid([
        kv('Tracking ID', c.tracking, true),
        kv('Campaign Name', esc(c.name)),
        kv('Status', campaignBadge(c.status)),
        kv('Bank Communicator', c.communicator === 'SSL' ? 'SSL — contacts the bank for you' : 'Merchant'),
        kv('Start Date', fmtDate(c.start)),
        kv('End Date', fmtDate(c.end)),
        `<div class="col-span-2">${kv(c.communicator === 'SSL' ? 'Banks, MFS & Internet Banking' : 'Card BIN', communicatorText(c))}</div>`,
      ]))}
      ${section('Campaign - Merchant Discount List', `<div>${miniTable(
        ['Store', 'Offer Modality Percent', 'Shared With Partners Percent', 'Minimum Order Amount', 'Max Discount Amount (Per Transaction)', 'Maximum Discount Amount (Per Card)', 'Recurrent Discount Limit', 'Remarks'],
        stores.map(id => { const d = c.discounts[id]; return [esc(storeName(id)), `${d.pct}%`, d.observed === 'Yes' ? '0%' : 'Shared', fmtBDT0(d.minOrder), fmtBDT0(d.maxPerTxn), fmtBDT0(d.maxPerCard), d.perUser, d.remarks ? esc(d.remarks) : '—']; }))}</div>`)}`,
    footer: mcEditable(c) ? `
      <button data-action="mc-cancel" data-value="${c.id}" class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-rose-600 bg-white border border-rose-200 rounded shadow-sm hover:bg-rose-50">${ic('circle-x', 'w-4 h-4')}Cancel Campaign</button>
      <button data-action="edit-mc" data-value="${c.id}" class="${BTN_PRIMARY}">${ic('pencil', 'w-4 h-4')}Edit</button>` : `<p class="text-xs text-slate-500 mr-auto self-center">${c.status === 'Canceled' ? 'This campaign was canceled.' : 'Approved campaigns can no longer be edited.'}</p>`,
  });
}

const newMcDraft = (c) => {
  const blank = { pct: '', observed: 'Yes', minOrder: '', maxPerTxn: '', maxPerCard: '', perUser: '', remarks: '' };
  return {
    id: c?.id || null, name: c?.name || '', start: c ? toDateInput(c.start) : '', end: c ? toDateInput(c.end) : '',
    communicator: c?.communicator || '', bins: [...(c?.bins || [])], binInput: '', banks: [...(c?.banks || [])], mfs: [...(c?.mfs || [])], ib: [...(c?.ib || [])],
    rows: Object.fromEntries(STORES.map(st => { const d = c?.discounts[st.id]; return [st.id, d ? { on: true, ...Object.fromEntries(Object.entries(d).map(([k, v]) => [k, String(v)])) } : { on: false, ...blank }]; })),
  };
};

function mcFormDrawer() {
  const d = mcDraft;
  const e = formErrors;
  const inp = (key, attrs = '') => `<input data-mc="${key}" value="${esc(d[key])}" class="${INPUT}" ${attrs}>`;
  const box = (title, sub, group, list) => `
    <div>
      <p class="text-sm font-semibold text-slate-800 mb-2">${title}${sub ? ` <span class="text-xs font-normal text-slate-500">${sub}</span>` : ''}</p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
        ${list.map(v => `<label class="flex items-center gap-2 rounded-md bg-white border border-slate-200 px-3 py-2 text-xs text-slate-700 cursor-pointer hover:border-primary-300"><input type="checkbox" data-mc-check="${group}" value="${esc(v)}" ${d[group].includes(v) ? 'checked' : ''} class="rounded border-slate-300 text-primary-600">${esc(v)}</label>`).join('')}
      </div>
    </div>`;
  return drawerShell({
    wide: 'xl',
    title: d.id ? 'Edit Campaign' : 'Create Campaign',
    sub: '<span>Merchant initiated campaign</span>',
    body: `
      ${section('Campaign Information', `<div class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          ${field('Campaign name', inp('name'), { required: true, error: e.name })}
          ${field('Start Date', inp('start', `type="date" min="${toDateInput(NOW)}"`), { required: true, error: e.start })}
          ${field('End Date', inp('end', `type="date" min="${toDateInput(NOW)}"`), { required: true, error: e.end })}
          ${field('Bank Communicator', `<select data-mc="communicator" data-rerender ${d.id ? 'disabled' : ''} class="${INPUT} disabled:bg-slate-50 disabled:text-slate-500"><option value="">Select</option>${options(['Merchant', 'SSL'], d.communicator)}</select>`, { required: true, error: e.communicator, hint: 'Communication with the bank will be done by.' })}
        </div>
        ${d.communicator === 'Merchant' ? `<div class="max-w-md">${field('Card BIN', `
          <div class="flex flex-wrap items-center gap-1.5 px-2 py-1.5 min-h-[38px] bg-white border border-slate-200 rounded-md focus-within:ring-2 focus-within:ring-primary-500/20 focus-within:border-primary-500">
            ${d.bins.map(b => `<span class="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded bg-primary-50 text-primary-700 text-xs font-mono">${b}<button data-action="mc-bin-remove" data-value="${b}" aria-label="Remove BIN ${b}" class="p-0.5 rounded hover:bg-primary-100">${ic('x', 'w-3 h-3')}</button></span>`).join('')}
            <input id="mc-bin" data-mc="binInput" value="${esc(d.binInput)}" inputmode="numeric" maxlength="6" placeholder="${d.bins.length ? '' : 'Enter a 6-digit BIN'}" class="flex-1 min-w-[120px] text-sm text-slate-700 placeholder-slate-400 focus:outline-none">
          </div>`, { required: true, error: e.bins, hint: 'Type a 6-digit BIN and press Enter to add it. Add as many as you need.' })}</div>` : ''}
        ${d.communicator === 'SSL' ? `
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            ${box('Bank List', '(Whom SSL will contact on your behalf)', 'banks', CAMPAIGN_BANKS)}
            <div class="space-y-4">${box('MFS', '', 'mfs', CAMPAIGN_MFS)}${box('Internet Bank List', '', 'ib', CAMPAIGN_IB)}</div>
          </div>
          ${e.methods ? `<p class="text-[11px] font-medium text-rose-600">${e.methods}</p>` : ''}` : ''}
      </div>`)}
      ${section('Discount Information', `${storeDiscountTable(d, MC_COLS, 'mc')}${e.stores ? `<p class="text-[11px] font-medium text-rose-600 mt-2">${e.stores}</p>` : ''}`)}`,
    footer: `
      <button data-action="${d.id ? 'open-mc' : 'close-drawer'}" ${d.id ? `data-value="${d.id}"` : ''} class="${BTN_SECONDARY}">Cancel</button>
      <button data-action="save-mc" class="${BTN_PRIMARY}">${ic(d.id ? 'save' : 'circle-plus', 'w-4 h-4')}${d.id ? 'Update' : 'Create New'}</button>`,
  });
}

function addMcBin() {
  const v = mcDraft.binInput.trim();
  if (!v) return;
  if (!/^\d{6}$/.test(v)) formErrors = { ...formErrors, bins: 'A card BIN is the first 6 digits of the card number.' };
  else if (mcDraft.bins.includes(v)) formErrors = { ...formErrors, bins: `${v} is already added.` };
  else { mcDraft.bins.push(v); mcDraft.binInput = ''; delete formErrors.bins; }
  renderDrawer();
  $('#mc-bin')?.focus();
}

function validateMc() {
  const d = mcDraft, e = {};
  if (!d.name.trim()) e.name = 'Enter a campaign name.';
  if (!d.start || (!d.id && d.start < toDateInput(NOW))) e.start = 'Pick today or a later date.';
  if (!d.end || d.end < d.start) e.end = 'End date must be on or after the start date.';
  if (!d.communicator) e.communicator = 'Choose who talks to the bank.';
  if (d.communicator === 'Merchant' && !d.bins.length) e.bins = 'Add at least one 6-digit card BIN.';
  if (d.communicator === 'SSL' && !d.banks.length && !d.mfs.length && !d.ib.length) e.methods = 'Choose at least one bank, MFS or internet bank.';
  const on = Object.entries(d.rows).filter(([, r]) => r.on);
  if (!on.length) e.stores = 'Tick at least one store and enter its discount.';
  for (const [id, row] of on) { const err = discountRowError(row, { maxPerCard: true }); if (err) e[`row:${id}`] = err; }
  return e;
}
