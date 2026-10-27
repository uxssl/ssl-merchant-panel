// =====================================================================
// Partnership Campaigns — old panel "Partnership Initiated": SSL / the bank sets up the
// campaign, and the merchant adds each store's discount with "Update" before the
// last participation date. Then it is sent to the bank and closes.
// =====================================================================
let partnerDraft = null;
const PARTNER_COLS = [
  { key: 'pct', label: 'Discount Offer %', type: 'number', hint: 'Enter Offer', width: 'w-24' },
  { key: 'burned', label: 'Fully Burned By Merchant', type: 'yesno', placeholder: 'Select Option', width: 'w-32' },
  { key: 'minOrder', label: 'Minimum Order Amount', type: 'number', hint: 'Enter Minimum Order', width: 'w-28' },
  { key: 'maxPerTxn', label: 'Max Discount Per Transaction', type: 'number', hint: 'Enter Max Discount', width: 'w-28' },
  { key: 'perUser', label: 'Recurrent Discount Per User', type: 'number', hint: 'Enter Recurrent Discount', width: 'w-28' },
  { key: 'remarks', label: 'Remarks', type: 'text', hint: 'Enter Remarks' },
];

function renderPartnerCampaigns() {
  const s = pageState();
  const rows = campaignRows(PARTNER_CAMPAIGNS, applied(s));
  const { totalPages, start, pageRows } = paginate(s, rows);
  const statusOpts = [{ label: 'All Status', value: 'all' }, ...PARTNER_STATUSES.map(v => ({ label: v, value: v }))];
  const open = PARTNER_CAMPAIGNS.filter(partnerEditable);
  const cols = [
    { label: 'Tracking Id', cell: c => `<span class="font-mono text-xs text-slate-700">${c.tracking}</span>` },
    { label: 'Campaign Name', cell: c => `<div class="font-medium text-slate-800">${esc(c.name)}</div>${c.bank ? `<div class="text-xs text-slate-500">${esc(c.bank)}</div>` : ''}` },
    { label: 'Start Date', cell: c => `<span class="whitespace-nowrap">${fmtDate(c.start)}</span>` },
    { label: 'End Date', cell: c => `<span class="whitespace-nowrap">${fmtDate(c.end)}</span>` },
    { label: 'Status', cell: c => `${campaignBadge(c.status)}${partnerEditable(c) ? `<div class="text-[11px] text-amber-600 mt-1 whitespace-nowrap">Update by ${fmtDate(c.last)}</div>` : ''}` },
    { label: 'Action', cell: c => `<div class="flex flex-wrap gap-1.5">
      ${partnerEditable(c) ? actionBtn('edit-partner', c.id, 'pencil', 'Update') : ''}
      ${actionBtn('open-partner', c.id, 'eye', 'View')}
    </div>` },
  ];
  return `
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">Partnership Campaigns</h1>
        <p class="text-slate-500 text-sm">Partnership initiated campaigns — add each store's discount before the last participation date.</p>
      </div>
      <div class="flex flex-col">
        ${listFilterBar(s, 'Tracking ID or Campaign Name', selectPill('list', 'status', 'Status', statusOpts, s.status), { noStore: true })}
        <div class="flex flex-col gap-4 pt-4">
          <h2 class="text-sm font-semibold text-slate-900">Overview</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            ${metricCard({ title: 'Total Campaigns', value: PARTNER_CAMPAIGNS.length, status: 'all', selected: s.applied.status === 'all' })}
            ${metricCard({ title: 'Pending', value: PARTNER_CAMPAIGNS.filter(c => c.status === 'Pending').length, sub: open.length ? `${open.length} open for your update · next by ${fmtShort(open.map(c => c.last).sort((a, b) => a - b)[0])}` : 'None open for update', status: 'Pending', selected: s.applied.status === 'Pending' })}
            ${metricCard({ title: 'Sent to Bank (Closed)', value: PARTNER_CAMPAIGNS.filter(c => c.status === 'Sent to Bank (Closed)').length, status: 'Sent to Bank (Closed)', selected: s.applied.status === 'Sent to Bank (Closed)' })}
          </div>
        </div>
        <div class="space-y-4 pt-6">
          ${listToolbar(rows.length, 'campaigns', applied(s))}
          ${dataTable({ cols, rows: pageRows, rowAttrs: c => `data-action="open-partner" data-value="${c.id}"`, emptyTitle: 'No campaigns found' })}
          ${pager(s, rows.length, start, pageRows.length, totalPages)}
        </div>
      </div>
    </div>`;
}

const partnerInfo = (c) => kvGrid([
  kv('Tracking Id', c.tracking, true),
  kv('Campaign Name', esc(c.name)),
  kv('Status', campaignBadge(c.status)),
  kv('Bank Name', c.bank ? esc(c.bank) : '—'),
  kv('Start Date', fmtDate(c.start)),
  kv('End Date', fmtDate(c.end)),
  kv('Merchant Last Participation Date', fmtDate(c.last)),
]);

function partnerDrawer(c) {
  const cell = (v) => v === undefined || v === '' ? '<span class="text-slate-300">—</span>' : esc(String(v));
  return drawerShell({
    wide: 'xl',
    title: 'Campaign Details',
    sub: `<span class="font-mono text-xs">${c.tracking}</span>${campaignBadge(c.status)}`,
    body: `
      ${section('Campaign Information', partnerInfo(c))}
      ${section('Campaign - Merchant Discount List', `<div class="overflow-x-auto">${miniTable(
        ['Store Name', 'Offer Modality Percent', 'Fully Burned By Merchant', 'Minimum Order Amount', 'Max Discount Amount (per transaction)', 'Recurrent Discount Limit', 'Remarks'],
        STORES.map(st => { const d = c.discounts[st.id] || {}; return [esc(st.name), d.pct !== undefined ? `${d.pct}%` : cell(), cell(d.burned), d.minOrder !== undefined ? fmtBDT0(d.minOrder) : cell(), d.maxPerTxn !== undefined ? fmtBDT0(d.maxPerTxn) : cell(), cell(d.perUser), cell(d.remarks)]; }))}</div>
        <p class="text-[11px] text-slate-500 mt-2">${joinedStores(c).length ? `${joinedStores(c).length} of ${STORES.length} stores take part.` : 'No store has joined this campaign.'}</p>`)}`,
    footer: partnerEditable(c)
      ? `<button data-action="edit-partner" data-value="${c.id}" class="${BTN_PRIMARY}">${ic('pencil', 'w-4 h-4')}Update</button>`
      : `<p class="text-xs text-slate-500 mr-auto self-center">${c.status === 'Pending' ? `The last participation date (${fmtDate(c.last)}) has passed.` : 'This campaign has been sent to the bank and is closed.'}</p>`,
  });
}

function partnerFormDrawer() {
  const c = PARTNER_CAMPAIGNS.find(x => x.id === partnerDraft.id);
  return drawerShell({
    wide: 'xl',
    title: 'Update Campaign',
    sub: `<span>Tick each store that takes part and enter its discount</span>`,
    body: `
      ${section('Campaign Information', partnerInfo(c))}
      ${section('Discount Information', storeDiscountTable(partnerDraft, PARTNER_COLS, 'pc'))}
      <p class="text-xs text-slate-500">You can change this until ${fmtDate(c.last)}. Untick a store to take it out of the campaign.</p>`,
    footer: `
      <button data-action="open-partner" data-value="${c.id}" class="${BTN_SECONDARY}">Cancel</button>
      <button data-action="save-partner" class="${BTN_PRIMARY}">${ic('save', 'w-4 h-4')}Update</button>`,
  });
}

function newPartnerDraft(c) {
  const blank = { pct: '', burned: '', minOrder: '', maxPerTxn: '', perUser: '', remarks: '' };
  return { id: c.id, rows: Object.fromEntries(STORES.map(st => { const d = c.discounts[st.id]; return [st.id, d ? { on: true, ...Object.fromEntries(Object.entries(d).map(([k, v]) => [k, String(v)])) } : { on: false, ...blank }]; })) };
}

function validatePartner() {
  const e = {};
  for (const [id, row] of Object.entries(partnerDraft.rows)) {
    const err = row.on && discountRowError(row);
    if (err) e[`row:${id}`] = err;
  }
  return e;
}
