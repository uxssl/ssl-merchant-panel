// =====================================================================
// Payment Links
// =====================================================================
const activeBadge = (on) => `<span class="${STATUS_BADGE} ${on ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}">${on ? 'Active' : 'Inactive'}</span>`;
const linkCollected = (l) => l.payments.reduce((s, p) => s + p.amount, 0);

function linkRows(s) {
  const q = s.search.trim().toLowerCase();
  return PAYMENT_LINKS.filter(l =>
    (s.store === 'all' || l.store === s.store) &&
    inRange(l, s.range) &&
    (!q || l.name.toLowerCase().includes(q) || l.ref.toLowerCase().includes(q)) &&
    (s.status === 'all' || (s.status === 'active') === l.active)
  );
}

function renderPaymentLinks() {
  const s = pageState();
  const rows = linkRows(s);
  const base = linkRows({ ...s, status: 'all' });
  const { totalPages, start, pageRows } = paginate(s, rows);
  const statusOpts = [{ label: 'All Status', value: 'all' }, { label: 'Active', value: 'active' }, { label: 'Inactive', value: 'inactive' }];
  const cols = [
    { label: 'Payment Name', cell: l => `<div class="font-medium text-slate-800">${esc(l.name)}</div><div class="text-[11px] font-mono text-slate-500">${l.ref}</div>` },
    { label: 'Store', cls: 'hidden lg:table-cell', cell: l => esc(l.storeName) },
    { label: 'Amount', cell: l => `<div class="font-semibold text-slate-900 whitespace-nowrap">${l.amountType === 'Fixed' ? fmtBDT(l.amount) : 'Any amount'}</div><div class="text-xs text-slate-500">${l.paymentType}${l.convFee ? ` · +${l.convFee}% fee` : ''}</div>` },
    { label: 'Payments', cls: 'hidden xl:table-cell', right: true, cell: l => `<div class="font-medium text-slate-800">${l.payments.length}</div><div class="text-xs text-slate-500 whitespace-nowrap">${fmtBDT(linkCollected(l))}</div>` },
    { label: 'Created On', cell: l => dateCell(l.date) },
    { label: 'Status', cell: l => activeBadge(l.active) },
    { label: 'Link', cell: l => `<button data-action="copy" data-value="${linkUrl(l.ref)}" class="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 whitespace-nowrap">${ic('copy', 'w-3.5 h-3.5')}Copy</button>` },
  ];
  return `
    <div class="space-y-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">Payment Links</h1>
          <p class="text-slate-500 text-sm">Share a link by SMS, WhatsApp or email and collect payments without a website.</p>
        </div>
        <button data-action="new-link" class="${BTN_PRIMARY} shrink-0">${ic('plus', 'w-4 h-4')}Create Payment Link</button>
      </div>
      <div class="flex flex-col">
        ${listFilterBar(s, 'Payment Name or Refer Id', selectPill('list', 'status', 'Status', statusOpts, s.status, 'circle-dot'))}
        <div class="flex flex-col gap-4 pt-4">
          <h2 class="text-sm font-semibold text-slate-900">Overview</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            ${metricCard({ title: 'Total Links', value: base.length.toLocaleString(), status: 'all', selected: s.status === 'all' })}
            ${metricCard({ title: 'Active Links', value: base.filter(l => l.active).length.toLocaleString(), status: 'active', selected: s.status === 'active' })}
            ${metricCard({ title: 'Payments Received', value: base.reduce((n, l) => n + l.payments.length, 0).toLocaleString() })}
            ${metricCard({ title: 'Amount Collected', value: fmtBDTShort(base.reduce((n, l) => n + linkCollected(l), 0)) })}
          </div>
        </div>
        <div class="space-y-4 pt-6">
          ${listToolbar(rows.length, 'payment links', s)}
          ${dataTable({ cols, rows: pageRows, rowAttrs: l => `data-action="open-link" data-value="${l.ref}"`, emptyTitle: 'No payment links found' })}
          ${pager(s, rows.length, start, pageRows.length, totalPages)}
        </div>
      </div>
    </div>`;
}

function payPagePreview(l) {
  const c = {
    leftBg: safeColor(l.colors.leftBg, DEFAULT_LINK_COLORS.leftBg), leftText: safeColor(l.colors.leftText, DEFAULT_LINK_COLORS.leftText),
    btnBg: safeColor(l.colors.btnBg, DEFAULT_LINK_COLORS.btnBg), btnText: safeColor(l.colors.btnText, DEFAULT_LINK_COLORS.btnText),
  };
  const box = (text) => `<div class="h-8 rounded border border-slate-200 px-2 flex items-center text-[11px] text-slate-400">${text}</div>`;
  return `
    <div class="rounded-xl border border-slate-200 overflow-hidden grid grid-cols-5 shadow-sm">
      <div class="col-span-3 p-5" style="background:${c.leftBg};color:${c.leftText}">
        <p class="text-[10px] uppercase tracking-wider opacity-60">Demo Merchant Ltd.</p>
        <h4 class="text-lg font-bold mt-1 break-words">${esc(l.name || 'Payment name')}</h4>
        ${l.topMessage ? `<p class="text-xs mt-2 opacity-80">${esc(l.topMessage)}</p>` : ''}
        ${l.productDetails ? `<p class="text-xs mt-3 opacity-70 whitespace-pre-line">${esc(l.productDetails)}</p>` : ''}
        <p class="text-2xl font-bold mt-4">${l.amountType === 'Fixed' ? fmtBDT(Number(l.amount) || 0) : `<span class="text-sm font-medium opacity-70">${esc(l.amountText || 'Customer enters the amount')}</span>`}</p>
        ${Number(l.convFee) ? `<p class="text-[11px] opacity-70 mt-1">+ ${esc(l.convFee)}% convenience fee</p>` : ''}
      </div>
      <div class="col-span-2 p-4 bg-white space-y-2">
        ${box('Name')}${box('Mobile')}${box('Email (optional)')}
        ${l.amountType === 'Any' ? box('Amount (BDT)') : ''}
        <div class="h-9 rounded flex items-center justify-center text-sm font-semibold" style="background:${c.btnBg};color:${c.btnText}">${esc(l.buttonName || 'Pay Now')}</div>
        ${l.buttonMessage ? `<p class="text-[10px] text-slate-500 text-center">${esc(l.buttonMessage)}</p>` : ''}
      </div>
    </div>`;
}

const LINK_PARAMS = (l) => miniTable(['Parameter', 'Reason', 'Mandatory'], [
  ['Refer Id', 'Identifies this link', 'Yes'],
  ['Name', 'Customer name on the receipt', 'Yes'],
  ['Email Address', 'Receipt by email', 'No'],
  ['Mobile', 'Payment notification by SMS', 'Yes'],
  ['Amount', l.amountType === 'Fixed' ? 'Fixed by you' : 'Entered by the customer', 'Yes'],
  ['Currency', 'BDT', 'Yes'],
]);

function linkDrawer(l) {
  const url = linkUrl(l.ref);
  const share = (icon, label) => `<button data-action="toast" data-msg="Prototype: nothing was sent via ${label}." class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50">${ic(icon, 'w-3.5 h-3.5')}${label}</button>`;
  const last = l.payments[l.payments.length - 1];
  return drawerShell({
    wide: true,
    title: esc(l.name),
    sub: `<span class="font-mono text-xs">${l.ref}</span>${activeBadge(l.active)}`,
    body: `
      <div>
        <div class="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          ${ic('link', 'w-4 h-4 text-slate-400 shrink-0')}
          <span class="font-mono text-xs text-slate-700 truncate flex-1">${url}</span>
          <button data-action="copy" data-value="${url}" class="inline-flex items-center gap-1 px-2 py-1 rounded bg-white border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50">${ic('copy', 'w-3.5 h-3.5')}Copy</button>
        </div>
        <div class="flex flex-wrap gap-2 mt-2">${share('message-circle', 'WhatsApp')}${share('mail', 'Email')}${share('smartphone', 'SMS')}</div>
      </div>
      <div class="grid grid-cols-3 gap-3">
        ${statBox('Payments', l.payments.length)}
        ${statBox('Collected', fmtBDT(linkCollected(l)), 'text-emerald-600')}
        ${statBox('Last Payment', last ? fmtShort(last.date) : '—')}
      </div>
      ${section('Configuration', kvGrid([
        kv('Pay Type', l.payType),
        kv('Payment Type', l.paymentType),
        kv('Amount Type', l.amountType),
        kv(l.amountType === 'Fixed' ? 'Amount' : 'Amount Text', l.amountType === 'Fixed' ? fmtBDT(l.amount) : esc(l.amountText)),
        kv('Convenience Fee', l.convFee ? `${l.convFee}%` : 'Not charged'),
        kv('Pay Button Name', esc(l.buttonName)),
        kv('Store', esc(l.storeName)),
        kv('Domain URL', l.domainUrl ? esc(l.domainUrl) : '—', true),
        kv('Created On', `${fmtDate(l.date)}, ${fmtTime(l.date)}`),
      ]))}
      ${section('Customer Page Preview', payPagePreview(l))}
      ${section('Inputted Parameters', LINK_PARAMS(l))}
      ${section('Recent Payments', l.payments.length ? `<div class="divide-y divide-slate-100 rounded-lg border border-slate-200">
        ${l.payments.slice(-5).reverse().map(p => `
          <button data-action="open-txn" data-value="${p.txn.id}" class="w-full flex items-center justify-between gap-3 px-3 py-2 text-left hover:bg-slate-50">
            <span><span class="block text-sm text-slate-800">${esc(p.customer)}</span><span class="block text-xs text-slate-500">${fmtDate(p.date)}, ${fmtTime(p.date)}</span></span>
            <span class="text-sm font-semibold text-slate-900">${fmtBDT(p.amount)}</span>
          </button>`).join('')}
      </div>` : '<p class="text-sm text-slate-500">No payments yet.</p>')}`,
    footer: `
      <button data-action="toast" data-msg="Prototype: editing is not wired up." class="${BTN_SECONDARY}">${ic('pencil', 'w-4 h-4')}Edit</button>
      <button data-action="link-toggle" data-value="${l.ref}" class="${l.active ? BTN_SECONDARY : BTN_PRIMARY}">${ic(l.active ? 'circle-pause' : 'circle-play', 'w-4 h-4')}${l.active ? 'Deactivate' : 'Activate'}</button>`,
  });
}

let linkDraft = null;
const newLinkDraft = () => ({
  name: '', store: STORES[0].id, paymentType: 'Reusable', amountType: 'Fixed', amount: '', amountText: '',
  convOn: false, convFee: '', buttonName: 'Pay Now', productDetails: '', topMessage: '', buttonMessage: '',
  colors: { ...DEFAULT_LINK_COLORS },
});

function linkFormDrawer() {
  const d = linkDraft;
  const inp = (key, attrs = '') => `<input data-link="${key}" value="${esc(d[key])}" class="${INPUT}" ${attrs}>`;
  const color = (key, label) => `<label class="flex items-center gap-2 text-xs text-slate-600"><input type="color" data-link-color="${key}" value="${safeColor(d.colors[key], DEFAULT_LINK_COLORS[key])}" class="w-8 h-8 rounded border border-slate-200 cursor-pointer">${label}</label>`;
  return drawerShell({
    wide: true,
    title: 'Create Payment Link',
    sub: '<span>Customers pay on an SSLCOMMERZ-hosted page</span>',
    body: `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        ${field('Payment Name', inp('name', 'placeholder="e.g. Purchase to pay"'), { required: true, error: formErrors.name })}
        ${field('Store', `<select data-link="store" class="${INPUT}">${storeOptions(d.store)}</select>`, { required: true })}
        ${field('Payment Type', `<select data-link="paymentType" data-rerender class="${INPUT}">${options([['Reusable', 'Reusable — many customers can pay'], ['One-time', 'One-time — closes after first payment']], d.paymentType)}</select>`)}
        ${field('Amount Type', `<select data-link="amountType" data-rerender class="${INPUT}">${options([['Fixed', 'Fixed'], ['Any', 'Any — customer enters amount']], d.amountType)}</select>`)}
        ${d.amountType === 'Fixed'
          ? field('Amount (BDT)', inp('amount', 'type="number" min="1" step="1" placeholder="500"'), { required: true, error: formErrors.amount })
          : field('Amount Text', inp('amountText', 'placeholder="(optional)"'), { hint: 'Shown above the amount box' })}
        ${field('Pay Button Name', inp('buttonName'))}
      </div>
      <div class="rounded-lg border border-slate-200 p-3">
        <label class="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" data-link="convOn" data-rerender ${d.convOn ? 'checked' : ''} class="rounded border-slate-300 text-primary-600">Charge a convenience fee to the customer</label>
        ${d.convOn ? `<div class="mt-3 max-w-[200px]">${field('Convenience Fee (%)', inp('convFee', 'type="number" min="0" max="10" step="0.1" placeholder="e.g. 2.1"'), { error: formErrors.convFee })}</div>` : ''}
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        ${field('Top Message', inp('topMessage', 'placeholder="(optional)"'))}
        ${field('Button Message', inp('buttonMessage', 'placeholder="(optional)"'))}
        <div class="sm:col-span-2">${field('Product Details', `<textarea data-link="productDetails" rows="2" class="${INPUT}" placeholder="(optional)">${esc(d.productDetails)}</textarea>`)}</div>
      </div>
      <div>
        <p class="text-xs font-bold text-slate-700 mb-2">Page Colors</p>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          ${color('leftBg', 'Left background')}${color('leftText', 'Left text')}${color('btnBg', 'Button background')}${color('btnText', 'Button text')}
        </div>
      </div>
      ${section('Live Preview', `<div id="link-preview">${payPagePreview(d)}</div>`)}`,
    footer: `
      <button data-action="close-drawer" class="${BTN_SECONDARY}">Cancel</button>
      <button data-action="save-link" class="${BTN_PRIMARY}">${ic('link', 'w-4 h-4')}Create Link</button>`,
  });
}
