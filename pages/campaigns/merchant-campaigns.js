// =====================================================================
// Merchant Campaigns
// =====================================================================
const MC_STATUSES = ['Running', 'Pending', 'Created', 'Closed'];
const methodSummary = (c) => [c.banks.length && `${c.banks.length} bank${c.banks.length > 1 ? 's' : ''}`, ...c.mfs, ...c.ib].filter(Boolean).join(' · ') || '—';

function mcRows(s) {
  const q = s.search.trim().toLowerCase();
  return MERCHANT_CAMPAIGNS.filter(c =>
    (!storeFilter.length || c.stores.some(id => storeFilter.includes(id))) &&
    (s.status === 'all' || c.status === s.status) &&
    (!q || c.name.toLowerCase().includes(q) || c.tracking.toLowerCase().includes(q)) &&
    (s.range.preset === 'all' || (c.end >= s.range.from && c.start <= s.range.to)) // 'All Time' keeps upcoming campaigns
  ).sort((a, b) => b.start - a.start);
}

function renderMerchantCampaigns() {
  const s = pageState();
  const rows = mcRows(applied(s));
  const all = MERCHANT_CAMPAIGNS.map(c => ({ c, perf: merchantPerf(c) }));
  const { totalPages, start, pageRows } = paginate(s, rows);
  const statusOpts = [{ label: 'All Status', value: 'all' }, ...MC_STATUSES.map(v => ({ label: v === 'Created' ? 'Created (draft)' : v, value: v }))];
  const cols = [
    { label: 'Campaign', cell: c => `<div class="font-medium text-slate-800">${esc(c.name)}</div><div class="text-[11px] font-mono text-slate-500">${c.tracking}</div>` },
    { label: 'Period', cell: c => { const p = phaseOf(c); const d = daysLeft(c.end); return `<div class="whitespace-nowrap">${periodText(c)}</div><div class="text-xs ${p === 'Running' ? 'text-emerald-600' : 'text-slate-500'}">${p === 'Running' ? `${d} day${d > 1 ? 's' : ''} left` : p === 'Upcoming' ? `Starts in ${daysLeft(c.start)} days` : 'Ended'}</div>`; } },
    { label: 'Discount', cell: c => `<div class="font-medium text-slate-800 whitespace-nowrap">${mcOfferText(c)}</div><div class="text-xs text-slate-500">min. ${fmtBDT0(c.minOrder)}</div>` },
    { label: 'Payment Methods', cls: 'hidden xl:table-cell', cell: c => `<span class="text-xs text-slate-600">${methodSummary(c)}</span>` },
    { label: 'Stores', cls: 'hidden lg:table-cell', cell: c => `<span class="text-xs text-slate-600">${c.stores.length === STORES.length ? 'All stores' : storeNames(c.stores).map(esc).join(', ')}</span>` },
    { label: 'Discount Given', right: true, cls: 'hidden xl:table-cell', cell: c => { const p = merchantPerf(c); return p.txns.length ? `<div class="font-semibold text-slate-900 whitespace-nowrap">${fmtBDT0(p.discount)}</div><div class="text-xs text-slate-500">${p.txns.length} payments</div>` : '<span class="text-slate-400">—</span>'; } },
    { label: 'Status', cell: c => mcBadge(c.status) },
  ];
  return `
    <div class="space-y-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">Merchant Campaigns</h1>
          <p class="text-slate-500 text-sm">Your own discounts on chosen cards, MFS and banks — funded by you, approved by your KAM.</p>
        </div>
        <button data-action="new-mc" class="${BTN_PRIMARY} shrink-0">${ic('plus', 'w-4 h-4')}Create Campaign</button>
      </div>
      <div class="flex flex-col">
        ${listFilterBar(s, 'Campaign name or Tracking Id', selectPill('list', 'status', 'Status', statusOpts, s.status))}
        <div class="flex flex-col gap-4 pt-4">
          <h2 class="text-sm font-semibold text-slate-900">Overview</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            ${metricCard({ title: 'Running', value: MERCHANT_CAMPAIGNS.filter(c => c.status === 'Running').length, status: 'Running', selected: s.applied.status === 'Running' })}
            ${metricCard({ title: 'Pending Approval', value: MERCHANT_CAMPAIGNS.filter(c => c.status === 'Pending').length, status: 'Pending', selected: s.applied.status === 'Pending' })}
            ${metricCard({ title: 'Discount Given', value: fmtBDTShort(all.reduce((n, x) => n + x.perf.discount, 0)), sub: `${all.reduce((n, x) => n + x.perf.txns.length, 0)} payments` })}
            ${metricCard({ title: 'Sales via Campaigns', value: fmtBDTShort(all.reduce((n, x) => n + x.perf.sales, 0)) })}
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
  const perf = merchantPerf(c);
  const chips = (title, list) => list.length ? `<div><p class="text-xs text-slate-500 mb-1.5">${title}</p><div class="flex flex-wrap gap-1.5">${list.map(n => `<span class="px-2 py-0.5 rounded-full bg-slate-100 text-xs text-slate-700">${esc(n)}</span>`).join('')}</div></div>` : '';
  const byStore = c.stores.map(id => { const l = perf.txns.filter(t => t.store === id); return [esc(STORES.find(s => s.id === id).name), l.length, fmtBDT0(l.reduce((s, t) => s + t.amount, 0)), fmtBDT0(l.reduce((s, t) => s + mcDiscountOf(c, t), 0))]; });
  const steps = [{ label: 'Campaign created', note: '', tone: 'slate' }];
  if (c.status !== 'Created') steps.push({ label: 'Submitted to KAM', note: '', tone: 'blue' });
  if (['Running', 'Closed'].includes(c.status)) steps.push({ label: 'Approved by KAM — live at checkout', at: c.start, tone: 'emerald' });
  if (c.status === 'Pending') steps.push({ label: 'Waiting for KAM approval', note: 'Usually within one working day (mock)', tone: 'amber' });
  if (c.status === 'Closed') steps.push({ label: 'Campaign closed', at: c.end < NOW ? c.end : NOW, tone: 'rose' });
  return drawerShell({
    wide: true,
    title: esc(c.name),
    sub: `<span class="font-mono text-xs">${c.tracking}</span>${mcBadge(c.status)}`,
    body: `
      <div class="grid grid-cols-3 gap-3">
        ${statBox('Discount', mcOfferText(c))}
        ${statBox('Payments', perf.txns.length)}
        ${statBox('Discount Given', fmtBDT0(perf.discount), perf.discount ? 'text-rose-600' : 'text-slate-900')}
      </div>
      ${section('Campaign Information', kvGrid([
        kv('Campaign Name', esc(c.name)),
        kv('Tracking Id', c.tracking, true),
        kv('Start Date', fmtDate(c.start)),
        kv('End Date', fmtDate(c.end)),
        kv('Minimum Order Amount', fmtBDT0(c.minOrder)),
        kv('Max Discount Per Transaction', fmtBDT0(c.max)),
        kv('Limit Per Customer', `${c.perUser} time${c.perUser > 1 ? 's' : ''}`),
        kv('Stores', storeNames(c.stores).map(esc).join(', ')),
        `<div class="col-span-2">${kv('Description', esc(c.description || '—'))}</div>`,
      ]))}
      ${section('Payment Methods', `<div class="space-y-3">${chips('Banks (cards)', c.banks)}${chips('Mobile Financial Services', c.mfs)}${chips('Internet Banking', c.ib)}</div>`)}
      ${perf.txns.length ? section('Performance by Store', miniTable(['Store', 'Payments', 'Sales', 'Discount'], byStore, { right: [1, 2, 3] })) : ''}
      ${section('Status', timeline(steps))}`,
    footer: `
      <button data-action="toast" data-msg="Prototype: duplicating is not wired up." class="${BTN_SECONDARY}">${ic('copy', 'w-4 h-4')}Duplicate</button>
      ${['Created', 'Pending'].includes(c.status) ? `<button data-action="toast" data-msg="Prototype: editing is not wired up." class="${BTN_SECONDARY}">${ic('pencil', 'w-4 h-4')}Edit</button>` : ''}
      ${c.status === 'Created' ? `<button data-action="mc-submit" data-value="${c.id}" class="${BTN_PRIMARY}">${ic('send', 'w-4 h-4')}Submit for Approval</button>` : ''}
      ${c.status === 'Running' ? `<button data-action="mc-close" data-value="${c.id}" class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-rose-600 bg-white border border-rose-200 rounded shadow-sm hover:bg-rose-50">${ic('circle-stop', 'w-4 h-4')}Close Campaign</button>` : ''}`,
  });
}

let mcDraft = null;
const MC_BANKS = ['BRAC Bank', 'City Bank', 'Dutch-Bangla Bank', 'Eastern Bank', 'Standard Chartered', 'Prime Bank'];
const MC_MFS = ['bKash', 'Nagad', 'Rocket'];
const MC_IB = ['City Touch'];
const newMcDraft = () => ({ name: '', description: '', start: toDateInput(addDays(TODAY, 3)), end: toDateInput(addDays(TODAY, 17)), stores: [], banks: [], mfs: [], ib: [], type: 'Percentage', value: '', max: '', minOrder: '', perUser: '1' });

function mcFormDrawer() {
  const d = mcDraft;
  const inp = (key, attrs = '') => `<input data-mc="${key}" value="${esc(d[key])}" class="${INPUT}" ${attrs}>`;
  const checks = (group, list, labelOf = (v) => v) => `<div class="flex flex-wrap gap-2">${list.map(v => `
    <label class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs cursor-pointer ${d[group].includes(v) ? 'border-primary-600 bg-primary-50 text-primary-700 font-semibold' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}">
      <input type="checkbox" data-mc-check="${group}" value="${esc(v)}" ${d[group].includes(v) ? 'checked' : ''} class="sr-only">${d[group].includes(v) ? ic('check', 'w-3 h-3') : ''}${esc(labelOf(v))}</label>`).join('')}</div>`;
  return drawerShell({
    wide: true,
    title: 'Create Campaign',
    sub: '<span>Your KAM approves it before it goes live at checkout</span>',
    body: `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="sm:col-span-2">${field('Campaign Name', inp('name', 'placeholder="Enter campaign name"'), { required: true, error: formErrors.name })}</div>
        ${field('Start Date', inp('start', `type="date" min="${toDateInput(NOW)}"`), { required: true, error: formErrors.start })}
        ${field('End Date', inp('end', `type="date" min="${toDateInput(NOW)}"`), { required: true, error: formErrors.end })}
        <div class="sm:col-span-2">${field('Description', `<textarea data-mc="description" rows="2" class="${INPUT}" placeholder="Enter detailed description">${esc(d.description)}</textarea>`)}</div>
      </div>
      ${section('Stores', `${checks('stores', STORES.map(s => s.id), (id) => STORES.find(s => s.id === id).name)}${formErrors.stores ? `<p class="text-[11px] font-medium text-rose-600 mt-1">${formErrors.stores}</p>` : ''}`)}
      ${section('Discount', `<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        ${field('Discount Type', `<select data-mc="type" data-rerender class="${INPUT}">${options(['Percentage', 'Flat'], d.type)}</select>`)}
        ${field(d.type === 'Percentage' ? 'Discount (%)' : 'Discount (BDT)', inp('value', 'type="number" min="1"'), { required: true, error: formErrors.value })}
        ${d.type === 'Percentage' ? field('Max Discount Per Txn (BDT)', inp('max', 'type="number" min="1"'), { required: true, error: formErrors.max }) : '<div></div>'}
        ${field('Minimum Order (BDT)', inp('minOrder', 'type="number" min="0" placeholder="0"'))}
        ${field('Limit Per Customer', `<select data-mc="perUser" class="${INPUT}">${options([['1', 'Once'], ['2', '2 times'], ['3', '3 times'], ['5', '5 times']], d.perUser)}</select>`)}
      </div>`)}
      ${section('Payment Methods', `<div class="space-y-3">
        <div><p class="text-xs font-bold text-slate-700 mb-1.5">Banks (cards)</p>${checks('banks', MC_BANKS)}</div>
        <div><p class="text-xs font-bold text-slate-700 mb-1.5">Mobile Financial Services</p>${checks('mfs', MC_MFS)}</div>
        <div><p class="text-xs font-bold text-slate-700 mb-1.5">Internet Banking</p>${checks('ib', MC_IB)}</div>
        ${formErrors.methods ? `<p class="text-[11px] font-medium text-rose-600">${formErrors.methods}</p>` : ''}
      </div>`)}
      <p class="text-xs text-slate-500">The discount is funded by you and deducted from settlements for campaign payments.</p>`,
    footer: `
      <button data-action="close-drawer" class="${BTN_SECONDARY}">Cancel</button>
      <button data-action="save-mc" data-value="Created" class="${BTN_SECONDARY}">${ic('save', 'w-4 h-4')}Save as Draft</button>
      <button data-action="save-mc" data-value="Pending" class="${BTN_PRIMARY}">${ic('send', 'w-4 h-4')}Submit for Approval</button>`,
  });
}

function validateMc() {
  const d = mcDraft, e = {};
  if (!d.name.trim()) e.name = 'Enter a campaign name.';
  if (!d.start || d.start < toDateInput(NOW)) e.start = 'Pick today or a later date.';
  if (!d.end || d.end < d.start) e.end = 'End date must be on or after the start date.';
  if (!d.stores.length) e.stores = 'Choose at least one store.';
  const v = Number(d.value);
  if (!(v > 0) || (d.type === 'Percentage' && v > 90)) e.value = d.type === 'Percentage' ? 'Enter 1–90%.' : 'Enter an amount greater than 0.';
  if (d.type === 'Percentage' && !(Number(d.max) > 0)) e.max = 'Enter a maximum discount.';
  if (!d.banks.length && !d.mfs.length && !d.ib.length) e.methods = 'Choose at least one bank, MFS or internet banking option.';
  return e;
}
