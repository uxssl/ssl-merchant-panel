// =====================================================================
// Digital Invoices — old panel flow: choose an invoice configuration (a payment link),
// then bill the customer for one or more service / product items.
// =====================================================================
const INVOICE_CLS = { Unpaid: 'bg-rose-50 text-rose-600', Paid: 'bg-emerald-50 text-emerald-600', Canceled: 'bg-slate-100 text-slate-500' };
const invoiceBadge = (s) => `<span class="${STATUS_BADGE} ${INVOICE_CLS[s]}">${s}</span>`;
const invoiceExpired = (inv) => inv.status === 'Unpaid' && NOW > inv.expires;
// Configurations a new invoice can be billed against: active payment links of the stores in view.
const invoiceConfigs = () => PAYMENT_LINKS.filter(l => l.active && inStores(l.store));
const configLabel = (l) => `${l.storeName} (${l.store}) - ${l.ref} - ${l.name}`;

function invoiceRows(s, withStatus = true) {
  const q = s.search.trim().toLowerCase();
  return INVOICES.filter(inv =>
    inStores(inv.store) &&
    inRange(inv, s.range) &&
    (!q || [inv.no, inv.orderRef, inv.email, inv.phone, inv.customer].some(v => v.toLowerCase().includes(q))) &&
    (s.ref === 'all' || inv.config === s.ref) &&
    (!withStatus || s.status === 'all' || inv.status === s.status)
  );
}

function renderInvoices() {
  const s = pageState();
  const base = invoiceRows(applied(s), false);
  const rows = invoiceRows(applied(s));
  const { totalPages, start, pageRows } = paginate(s, rows);
  const total = (list) => list.reduce((n, inv) => n + invoiceTotal(inv), 0);
  const of = (status) => base.filter(inv => inv.status === status);
  const statusOpts = [{ label: 'All Status', value: 'all' }, ...INVOICE_STATUSES.map(v => ({ label: v, value: v }))];
  const refOpts = [{ label: 'All References', value: 'all' }, ...PAYMENT_LINKS.filter(l => inStores(l.store)).map(l => ({ label: `${l.ref} - ${l.name}`, value: l.ref }))];
  const action = (name, inv, icon, label, cls) => `<button data-action="${name}" data-value="${inv.no}" class="inline-flex items-center gap-1 px-2 py-1 rounded border text-xs font-medium whitespace-nowrap ${cls}">${ic(icon, 'w-3.5 h-3.5')}${label}</button>`;
  const cols = [
    { label: 'Invoice Info', cell: inv => `
      <div class="font-mono text-xs font-semibold text-primary-600">${inv.no}</div>
      <div class="text-[11px] text-slate-500 leading-relaxed">
        <div>Reference: <span class="font-mono text-slate-700">${esc(inv.orderRef)}</span></div>
        <div>Invoice Date: <span class="text-slate-700">${fmtDate(inv.date)}, ${fmtTime(inv.date)}</span></div>
        <div>Expire Date: <span class="${invoiceExpired(inv) ? 'text-rose-600 font-medium' : 'text-slate-700'}">${fmtDate(inv.expires)}${invoiceExpired(inv) ? ' (expired)' : ''}</span></div>
        <div>Created By: <span class="text-slate-700">${esc(inv.createdBy)}</span></div>
      </div>` },
    { label: 'Customer Information', cell: inv => `<div class="text-xs text-slate-500">${esc(inv.email)}</div><div class="font-medium text-slate-800">${esc(inv.customer)}</div><div class="text-xs font-mono text-slate-500">${esc(inv.phone)}</div>` },
    { label: 'Invoice Amount', right: true, cell: inv => `<span class="font-semibold text-slate-900 whitespace-nowrap">${fmtBDT(invoiceTotal(inv))}</span>` },
    { label: 'Payment Status', cell: inv => invoiceBadge(inv.status) },
    { label: 'Action', cell: inv => `<div class="flex flex-wrap gap-1.5">
      ${action('open-invoice', inv, 'eye', 'Detail', 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50')}
      ${action('invoice-download', inv, 'file-down', 'Download', 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50')}
      ${inv.status === 'Unpaid' ? action('invoice-resend', inv, 'mail', 'Resend Email', 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50') : ''}
      ${inv.status === 'Unpaid' ? action('invoice-cancel', inv, 'x', 'Cancel', 'border-rose-200 bg-white text-rose-600 hover:bg-rose-50') : ''}
    </div>` },
  ];
  return `
    <div class="space-y-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">Digital Invoices</h1>
          <p class="text-slate-500 text-sm">Bill a customer for services or products — they get the invoice by email and pay online.</p>
        </div>
        <button data-action="new-invoice" class="${BTN_PRIMARY} shrink-0">${ic('file-plus', 'w-4 h-4')}Create Invoice</button>
      </div>
      <div class="flex flex-col">
        ${listFilterBar(s, 'Invoice Id, Email or Contact No.',
          selectPill('list', 'ref', 'Invoice Reference', refOpts, s.ref) +
          selectPill('list', 'status', 'Status', statusOpts, s.status))}
        <div class="flex flex-col gap-4 pt-4">
          <h2 class="text-sm font-semibold text-slate-900">Overview</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            ${metricCard({ title: 'Total Invoices', value: base.length.toLocaleString(), status: 'all', selected: s.applied.status === 'all' })}
            ${metricCard({ title: 'Unpaid', value: fmtBDTShort(total(of('Unpaid'))), sub: `${of('Unpaid').length} invoices`, status: 'Unpaid', selected: s.applied.status === 'Unpaid' })}
            ${metricCard({ title: 'Paid', value: fmtBDTShort(total(of('Paid'))), sub: `${of('Paid').length} invoices`, status: 'Paid', selected: s.applied.status === 'Paid' })}
            ${metricCard({ title: 'Canceled', value: of('Canceled').length.toLocaleString(), status: 'Canceled', selected: s.applied.status === 'Canceled' })}
          </div>
        </div>
        <div class="space-y-4 pt-6">
          ${listToolbar(rows.length, 'invoices', applied(s))}
          ${dataTable({ cols, rows: pageRows, rowAttrs: inv => `data-action="open-invoice" data-value="${inv.no}"`, emptyTitle: 'No invoices found' })}
          ${pager(s, rows.length, start, pageRows.length, totalPages)}
        </div>
      </div>
    </div>`;
}

function invoicePaper(inv) {
  return `
    <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-base font-bold text-slate-900">Demo Merchant Ltd.</p>
          <p class="text-xs text-slate-500">${esc(inv.storeName)} · ${esc(inv.configName)}</p>
        </div>
        <div class="text-right">
          <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Invoice</p>
          <p class="font-mono text-sm font-semibold text-slate-900">${inv.no}</p>
        </div>
      </div>
      <div class="grid grid-cols-3 gap-4 mt-6 text-xs">
        <div><p class="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">Billed to</p><p class="font-medium text-slate-800 mt-1">${esc(inv.customer)}</p><p class="text-slate-500 font-mono">${esc(inv.phone)}</p><p class="text-slate-500">${esc(inv.email)}</p>${inv.customerId ? `<p class="text-slate-500">ID: <span class="font-mono">${esc(inv.customerId)}</span></p>` : ''}</div>
        <div><p class="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">Reference / Order ID</p><p class="font-mono font-medium text-slate-800 mt-1">${esc(inv.orderRef)}</p></div>
        <div><p class="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">Invoice / Expire date</p><p class="font-medium text-slate-800 mt-1">${fmtDate(inv.date)}</p><p class="text-slate-500">Expires ${fmtDate(inv.expires)}</p></div>
      </div>
      <div class="mt-5">${miniTable(['Service / Product', 'Qty', 'Unit Price', 'Total'], inv.items.map(it => [esc(it.desc), it.qty, fmtBDT(it.price), fmtBDT(it.qty * it.price)]), { right: [1, 2, 3] })}</div>
      <div class="mt-4 ml-auto w-64 text-sm">
        <div class="flex justify-between border-t border-slate-200 pt-2 font-bold text-slate-900"><span>Total (BDT)</span><span class="tabular-nums">${fmtBDT(invoiceTotal(inv))}</span></div>
      </div>
      <div class="mt-5 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 flex items-center gap-2">
        ${ic('link', 'w-3.5 h-3.5 text-slate-400')}<span class="font-mono text-[11px] text-slate-600 truncate flex-1">${linkUrl(inv.no)}</span>
        <button data-action="copy" data-value="${linkUrl(inv.no)}" class="text-xs font-medium text-primary-600 hover:underline">Copy</button>
      </div>
    </div>`;
}

function invoiceDrawer(inv) {
  const steps = [
    { label: `Invoice created by ${inv.createdBy}`, at: inv.date, tone: 'slate' },
    { label: 'Emailed to customer with a pay link', at: new Date(Math.min(NOW.getTime(), inv.date.getTime() + 60e3)), tone: 'blue' },
  ];
  if (inv.resentAt) steps.push({ label: 'Email resent', at: inv.resentAt, tone: 'blue' });
  if (inv.status === 'Paid') steps.push({ label: 'Paid online', at: inv.paidAt, tone: 'emerald' });
  if (inv.status === 'Canceled') steps.push({ label: 'Invoice canceled', note: 'No payment can be made on this invoice', tone: 'slate' });
  if (inv.status === 'Unpaid') steps.push(invoiceExpired(inv) ? { label: 'Invoice expired', at: inv.expires, tone: 'rose' } : { label: `Payable until ${fmtDate(inv.expires)}`, note: 'Waiting for payment', tone: 'amber' });
  return drawerShell({
    wide: true,
    title: 'Invoice Details',
    sub: `<span class="font-mono text-xs">${inv.no}</span>${invoiceBadge(inv.status)}`,
    body: `
      ${invoicePaper(inv)}
      ${section('Activity', timeline(steps))}
      <p class="flex items-center gap-1.5 text-[11px] text-slate-400">${ic('shield-check', 'w-3.5 h-3.5')}Customer phone, email and ID are masked in the portal.</p>`,
    footer: `
      ${inv.status === 'Unpaid' ? `<button data-action="invoice-cancel" data-value="${inv.no}" class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-rose-600 bg-white border border-rose-200 rounded shadow-sm hover:bg-rose-50">${ic('x', 'w-4 h-4')}Cancel</button>` : ''}
      <button data-action="invoice-download" data-value="${inv.no}" class="${BTN_SECONDARY}">${ic('file-down', 'w-4 h-4')}Download</button>
      ${inv.status === 'Unpaid' ? `<button data-action="invoice-resend" data-value="${inv.no}" class="${BTN_PRIMARY}">${ic('mail', 'w-4 h-4')}Resend Email</button>` : ''}`,
  });
}

// ---------------------------------------------------------------------
// Create Invoice: step 1 picks the configuration, step 2 is the invoice form.
// ---------------------------------------------------------------------
let invDraft = null;
const newInvoiceDraft = () => ({
  step: 'config', config: '',
  orderRef: '', customer: '', email: '', phone: '', customerId: '',
  items: [{ desc: '', qty: '1', price: '' }],
});
const draftItemTotal = (it) => (Number(it.qty) || 0) * (Number(it.price) || 0);

function invoiceConfigDrawer() {
  const d = invDraft;
  const configs = invoiceConfigs();
  return drawerShell({
    title: 'Choose a Invoice Configuration',
    sub: '<span>The invoice uses this payment link\'s store and settings</span>',
    body: `
      ${field('Choose Configuration', `<select data-inv="config" class="${INPUT}"><option value="">Select configuration</option>${options(configs.map(l => [l.ref, configLabel(l)]), d.config)}</select>`, { required: true, error: formErrors.config, hint: configs.length ? '' : 'No active payment link in the selected stores — create one under Payment Links first.' })}`,
    footer: `
      <button data-action="close-drawer" class="${BTN_SECONDARY}">Close</button>
      <button data-action="inv-proceed" class="${BTN_PRIMARY}">Proceed${ic('arrow-right', 'w-4 h-4')}</button>`,
  });
}

function invoiceFormDrawer() {
  const d = invDraft;
  if (d.step === 'config') return invoiceConfigDrawer();
  const link = PAYMENT_LINKS.find(l => l.ref === d.config);
  const e = formErrors;
  const inp = (key, attrs = '') => `<input data-inv="${key}" value="${esc(d[key])}" class="${INPUT}" ${attrs}>`;
  const total = d.items.reduce((n, it) => n + draftItemTotal(it), 0);
  return drawerShell({
    wide: 'xl',
    title: 'Create Invoice',
    sub: `<span>Service / Product Invoice (Invoice# ${esc(link.store)} [${link.ref}])</span>`,
    body: `
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        ${field('Reference/Order ID', inp('orderRef'), { required: true, error: e.orderRef })}
        ${field('Customer/Company Name', inp('customer'), { required: true, error: e.customer })}
        ${field('Email', inp('email', 'type="email"'), { required: true, error: e.email })}
        ${field('Mobile', inp('phone', 'inputmode="numeric" placeholder="01XXXXXXXXX"'), { required: true, error: e.phone })}
        ${field('Currency', `<input value="BDT" disabled class="${INPUT} bg-slate-50 text-slate-500">`)}
        ${field('National ID/ Passport No/ Customer ID', inp('customerId'))}
      </div>
      ${section('Enter the service / Products items you wish to bill', `
        <div class="space-y-3">
          ${d.items.map((it, i) => `
            <div class="grid grid-cols-2 sm:grid-cols-[1fr_90px_130px_130px_32px] gap-3 items-end">
              <div class="col-span-2 sm:col-span-1">${field(`Service Name (#${i + 1})`, `<input data-inv-item="${i}:desc" value="${esc(it.desc)}" class="${INPUT}">`, { required: true })}</div>
              ${field('Quantity', `<input data-inv-item="${i}:qty" value="${esc(it.qty)}" type="number" min="1" step="1" class="${INPUT}">`, { required: true })}
              ${field('Amount (Unit Price)', `<input data-inv-item="${i}:price" value="${esc(it.price)}" type="number" min="0" step="any" class="${INPUT}">`, { required: true })}
              ${field('Total', `<input data-inv-total="${i}" value="${fmtBDT(draftItemTotal(it))}" disabled class="${INPUT} bg-slate-50 text-slate-600 tabular-nums">`)}
              <button data-action="inv-remove-item" data-value="${i}" ${d.items.length === 1 ? 'disabled' : ''} class="h-9 flex items-center justify-center rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-30" title="Remove item" aria-label="Remove item ${i + 1}">${ic('trash-2', 'w-4 h-4')}</button>
            </div>`).join('')}
          ${e.items ? `<p class="text-[11px] font-medium text-rose-600">${e.items}</p>` : ''}
          <div class="flex flex-wrap items-center justify-between gap-3 pt-1">
            <button data-action="inv-add-item" class="${BTN_SECONDARY}">${ic('circle-plus', 'w-4 h-4')}Add More Product / Service Items</button>
            <p class="text-sm text-slate-500">Invoice total <span id="inv-grand-total" class="ml-1 text-base font-bold text-slate-900 tabular-nums">${fmtBDT(total)}</span></p>
          </div>
        </div>`)}
      <p class="text-xs text-slate-500">Billed through <span class="font-medium text-slate-700">${esc(configLabel(link))}</span> · valid ${Number(link.validity) > 0 ? `${link.validity} days` : 'for up to one month'}.</p>`,
    footer: `
      <button data-action="inv-back" class="${BTN_SECONDARY}">${ic('arrow-left', 'w-4 h-4')}Change configuration</button>
      <button data-action="save-invoice" class="${BTN_PRIMARY}">${ic('file-plus', 'w-4 h-4')}Create</button>`,
  });
}

function syncInvoiceTotals() {
  invDraft.items.forEach((it, i) => { const el = $(`[data-inv-total="${i}"]`); if (el) el.value = fmtBDT(draftItemTotal(it)); });
  const total = $('#inv-grand-total');
  if (total) total.textContent = fmtBDT(invDraft.items.reduce((n, it) => n + draftItemTotal(it), 0));
}

function validateInvoice() {
  const d = invDraft, e = {};
  if (!d.orderRef.trim()) e.orderRef = 'Enter the reference or order ID.';
  if (!d.customer.trim()) e.customer = 'Enter the customer or company name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) e.email = 'Enter a valid email — the invoice is sent there.';
  if (!/^01[3-9]\d{8}$/.test(d.phone.trim())) e.phone = 'Enter an 11-digit mobile number starting with 01.';
  if (d.items.some(it => !it.desc.trim() || !(Number(it.qty) >= 1) || !(Number(it.price) > 0))) e.items = 'Fill in every item: service name, a quantity of 1 or more, and a unit price.';
  return e;
}
