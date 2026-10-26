// =====================================================================
// Digital Invoices
// =====================================================================
const INVOICE_STATUSES = ['Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled'];
const INVOICE_CLS = { Draft: 'bg-slate-100 text-slate-600', Sent: 'bg-blue-50 text-blue-600', Paid: 'bg-emerald-50 text-emerald-600', Overdue: 'bg-rose-50 text-rose-600', Cancelled: 'bg-slate-100 text-slate-400' };
const invoiceBadge = (s) => `<span class="${STATUS_BADGE} ${INVOICE_CLS[s]}">${s}</span>`;
const dueText = (inv) => {
  if (inv.status === 'Paid') return { text: `Paid ${fmtShort(inv.paidAt)}`, cls: 'text-emerald-600' };
  if (inv.status === 'Cancelled' || inv.status === 'Draft') return { text: '', cls: '' };
  const days = Math.ceil((inv.due - NOW) / 864e5);
  if (days < 0) return { text: `${-days} day${days < -1 ? 's' : ''} overdue`, cls: 'text-rose-600' };
  return { text: days === 0 ? 'Due today' : `Due in ${days} day${days > 1 ? 's' : ''}`, cls: days <= 3 ? 'text-amber-600' : 'text-slate-500' };
};

function invoiceRows(s, withStatus = true) {
  const q = s.search.trim().toLowerCase();
  return INVOICES.filter(inv =>
    (s.store === 'all' || inv.store === s.store) &&
    inRange(inv, s.range) &&
    (!q || inv.no.toLowerCase().includes(q) || inv.customer.toLowerCase().includes(q)) &&
    (!withStatus || s.status === 'all' || (s.status === 'open' ? ['Sent', 'Overdue'].includes(inv.status) : inv.status === s.status))
  );
}

function renderInvoices() {
  const s = pageState();
  const base = invoiceRows(s, false);
  const rows = invoiceRows(s);
  const { totalPages, start, pageRows } = paginate(s, rows);
  const total = (list) => list.reduce((n, inv) => n + invoiceTotals(inv).total, 0);
  const open = base.filter(inv => ['Sent', 'Overdue'].includes(inv.status));
  const overdue = base.filter(inv => inv.status === 'Overdue');
  const paid = base.filter(inv => inv.status === 'Paid');
  const statusOpts = [{ label: 'All Status', value: 'all' }, { label: 'Outstanding (Sent + Overdue)', value: 'open' }, ...INVOICE_STATUSES.map(v => ({ label: v, value: v }))];
  const cols = [
    { label: 'Invoice No', cell: inv => `<div class="font-mono text-xs font-semibold text-slate-800">${inv.no}</div><div class="text-xs text-slate-500">${esc(inv.customer)}</div>` },
    { label: 'Issue Date', cell: inv => `<span class="whitespace-nowrap">${fmtDate(inv.date)}</span>` },
    { label: 'Due Date', cell: inv => { const d = dueText(inv); return `<div class="whitespace-nowrap">${fmtDate(inv.due)}</div>${d.text ? `<div class="text-xs font-medium ${d.cls}">${d.text}</div>` : ''}`; } },
    { label: 'Store', cls: 'hidden lg:table-cell', cell: inv => esc(inv.storeName) },
    { label: 'Amount', right: true, cell: inv => `<span class="font-semibold text-slate-900 whitespace-nowrap">${fmtBDT(invoiceTotals(inv).total)}</span>` },
    { label: 'Status', cell: inv => invoiceBadge(inv.status) },
  ];
  return `
    <div class="space-y-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">Digital Invoices</h1>
          <p class="text-slate-500 text-sm">Bill a specific customer for a fixed amount — they pay online from the invoice link.</p>
        </div>
        <button data-action="new-invoice" class="${BTN_PRIMARY} shrink-0">${ic('file-plus', 'w-4 h-4')}Create Invoice</button>
      </div>
      <div class="flex flex-col">
        ${listFilterBar(s, 'Invoice No or Customer', selectPill('list', 'status', 'Status', statusOpts, s.status, 'circle-dot'))}
        <div class="flex flex-col gap-4 pt-4">
          <h2 class="text-sm font-semibold text-slate-900">Overview</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            ${metricCard({ title: 'Total Invoices', value: base.length.toLocaleString(), status: 'all', selected: s.status === 'all' })}
            ${metricCard({ title: 'Outstanding', value: fmtBDTShort(total(open)), sub: `${open.length} unpaid`, status: 'open', selected: s.status === 'open' })}
            ${metricCard({ title: 'Overdue', value: fmtBDTShort(total(overdue)), sub: `${overdue.length} invoices`, status: 'Overdue', selected: s.status === 'Overdue' })}
            ${metricCard({ title: 'Paid', value: fmtBDTShort(total(paid)), sub: `${paid.length} invoices`, status: 'Paid', selected: s.status === 'Paid' })}
          </div>
        </div>
        <div class="space-y-4 pt-6">
          ${listToolbar(rows.length, 'invoices', s)}
          ${dataTable({ cols, rows: pageRows, rowAttrs: inv => `data-action="open-invoice" data-value="${inv.no}"`, emptyTitle: 'No invoices found' })}
          ${pager(s, rows.length, start, pageRows.length, totalPages)}
        </div>
      </div>
    </div>`;
}

function invoicePaper(inv) {
  const t = invoiceTotals(inv);
  return `
    <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-base font-bold text-slate-900">Demo Merchant Ltd.</p>
          <p class="text-xs text-slate-500">${esc(inv.storeName)}</p>
        </div>
        <div class="text-right">
          <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Invoice</p>
          <p class="font-mono text-sm font-semibold text-slate-900">${inv.no}</p>
        </div>
      </div>
      <div class="grid grid-cols-3 gap-4 mt-6 text-xs">
        <div><p class="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">Billed to</p><p class="font-medium text-slate-800 mt-1">${esc(inv.customer)}</p><p class="text-slate-500 font-mono">${inv.phone}</p><p class="text-slate-500">${inv.email}</p></div>
        <div><p class="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">Issue date</p><p class="font-medium text-slate-800 mt-1">${fmtDate(inv.date)}</p></div>
        <div><p class="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">Due date</p><p class="font-medium text-slate-800 mt-1">${fmtDate(inv.due)}</p></div>
      </div>
      <div class="mt-5">${miniTable(['Description', 'Qty', 'Unit Price', 'Amount'], inv.items.map(it => [esc(it.desc), it.qty, fmtBDT(it.price), fmtBDT(it.qty * it.price)]), { right: [1, 2, 3] })}</div>
      <div class="mt-4 ml-auto w-64 text-sm space-y-1">
        <div class="flex justify-between"><span class="text-slate-500">Subtotal</span><span class="tabular-nums">${fmtBDT(t.subtotal)}</span></div>
        <div class="flex justify-between"><span class="text-slate-500">VAT (${inv.vatRate}%)</span><span class="tabular-nums">${fmtBDT(t.vat)}</span></div>
        <div class="flex justify-between border-t border-slate-200 pt-1 font-bold text-slate-900"><span>Total</span><span class="tabular-nums">${fmtBDT(t.total)}</span></div>
      </div>
      ${inv.notes ? `<p class="mt-4 text-xs text-slate-500">${esc(inv.notes)}</p>` : ''}
      <div class="mt-5 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 flex items-center gap-2">
        ${ic('link', 'w-3.5 h-3.5 text-slate-400')}<span class="font-mono text-[11px] text-slate-600 truncate flex-1">${linkUrl(inv.ref)}</span>
        <button data-action="copy" data-value="${linkUrl(inv.ref)}" class="text-xs font-medium text-primary-600 hover:underline">Copy</button>
      </div>
    </div>`;
}

function invoiceDrawer(inv) {
  const steps = [{ label: 'Invoice created', at: inv.date, tone: 'slate' }];
  if (inv.status !== 'Draft') steps.push({ label: 'Sent to customer by SMS & email', at: new Date(Math.min(NOW.getTime(), inv.date.getTime() + 600e3)), tone: 'blue' });
  if (inv.viewed && !['Draft', 'Cancelled'].includes(inv.status)) steps.push({ label: 'Viewed by customer', at: new Date(Math.min(NOW.getTime(), inv.date.getTime() + 5 * 3600e3)), tone: 'amber' });
  if (inv.status === 'Paid') steps.push({ label: 'Paid online', at: inv.paidAt, tone: 'emerald' });
  if (inv.status === 'Overdue') steps.push({ label: 'Payment overdue', at: inv.due, tone: 'rose' });
  if (inv.status === 'Cancelled') steps.push({ label: 'Invoice cancelled', note: 'No payment can be made on this link', tone: 'slate' });
  const canCancel = ['Draft', 'Sent', 'Overdue'].includes(inv.status);
  return drawerShell({
    wide: true,
    title: 'Invoice',
    sub: `<span class="font-mono text-xs">${inv.no}</span>${invoiceBadge(inv.status)}`,
    body: `
      ${invoicePaper(inv)}
      ${section('Activity', timeline(steps))}
      <p class="flex items-center gap-1.5 text-[11px] text-slate-400">${ic('shield-check', 'w-3.5 h-3.5')}Customer phone and email are masked in the portal.</p>`,
    footer: `
      ${canCancel ? `<button data-action="invoice-cancel" data-value="${inv.no}" class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-rose-600 bg-white border border-rose-200 rounded shadow-sm hover:bg-rose-50">${ic('x', 'w-4 h-4')}Cancel Invoice</button>` : ''}
      <button data-action="toast" data-msg="Prototype: PDF download is not wired up." class="${BTN_SECONDARY}">${ic('file-down', 'w-4 h-4')}Download PDF</button>
      ${inv.status === 'Draft' ? `<button data-action="invoice-send" data-value="${inv.no}" class="${BTN_PRIMARY}">${ic('send', 'w-4 h-4')}Send Invoice</button>` : ''}
      ${['Sent', 'Overdue'].includes(inv.status) ? `<button data-action="toast" data-msg="Prototype: no reminder was sent." class="${BTN_PRIMARY}">${ic('bell-ring', 'w-4 h-4')}Send Reminder</button>` : ''}`,
  });
}

let invDraft = null;
const newInvoiceDraft = () => ({
  customer: '', phone: '', email: '', store: STORES[0].id,
  due: toDateInput(addDays(TODAY, 15)), vatRate: '0', notes: '',
  items: [{ desc: '', qty: '1', price: '' }],
});
const draftTotals = () => invoiceTotals({ vatRate: Number(invDraft.vatRate) || 0, items: invDraft.items.map(it => ({ qty: Number(it.qty) || 0, price: Number(it.price) || 0 })) });

function invoiceFormDrawer() {
  const d = invDraft;
  const t = draftTotals();
  const inp = (key, attrs = '') => `<input data-inv="${key}" value="${esc(d[key])}" class="${INPUT}" ${attrs}>`;
  return drawerShell({
    wide: true,
    title: 'Create Invoice',
    sub: '<span>The customer gets an SMS and email with a pay link</span>',
    body: `
      ${section('Customer', `<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        ${field('Customer Name', inp('customer', 'placeholder="Full name"'), { required: true, error: formErrors.customer })}
        ${field('Mobile', inp('phone', 'inputmode="numeric" placeholder="01XXXXXXXXX"'), { required: true, error: formErrors.phone })}
        ${field('Email', inp('email', 'type="email" placeholder="(optional)"'), { error: formErrors.email })}
        ${field('Store', `<select data-inv="store" class="${INPUT}">${storeOptions(d.store)}</select>`, { required: true })}
      </div>`)}
      ${section('Items', `
        <div class="space-y-2">
          <div class="grid grid-cols-[1fr_70px_110px_32px] gap-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-0.5"><span>Description</span><span>Qty</span><span>Unit Price</span><span></span></div>
          ${d.items.map((it, i) => `
            <div class="grid grid-cols-[1fr_70px_110px_32px] gap-2">
              <input data-inv-item="${i}:desc" value="${esc(it.desc)}" placeholder="Item or service" class="${INPUT}">
              <input data-inv-item="${i}:qty" value="${esc(it.qty)}" type="number" min="1" class="${INPUT}">
              <input data-inv-item="${i}:price" value="${esc(it.price)}" type="number" min="0" placeholder="0" class="${INPUT}">
              <button data-action="inv-remove-item" data-value="${i}" ${d.items.length === 1 ? 'disabled' : ''} class="flex items-center justify-center rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-30" title="Remove">${ic('trash-2', 'w-4 h-4')}</button>
            </div>`).join('')}
          ${formErrors.items ? `<p class="text-[11px] font-medium text-rose-600">${formErrors.items}</p>` : ''}
          <button data-action="inv-add-item" class="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700">${ic('plus', 'w-3.5 h-3.5')}Add item</button>
        </div>`)}
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        ${field('Due Date', inp('due', `type="date" min="${toDateInput(NOW)}"`), { required: true, error: formErrors.due })}
        ${field('VAT (%)', `<select data-inv="vatRate" class="${INPUT}">${options([['0', 'No VAT'], ['5', '5%'], ['7.5', '7.5%'], ['15', '15%']], d.vatRate)}</select>`, { hint: 'Mock options' })}
        <div class="rounded-lg bg-slate-50 border border-slate-100 p-3 text-sm space-y-0.5" id="inv-totals">
          <div class="flex justify-between"><span class="text-slate-500">Subtotal</span><span class="tabular-nums">${fmtBDT(t.subtotal)}</span></div>
          <div class="flex justify-between"><span class="text-slate-500">VAT</span><span class="tabular-nums">${fmtBDT(t.vat)}</span></div>
          <div class="flex justify-between font-bold text-slate-900"><span>Total</span><span class="tabular-nums">${fmtBDT(t.total)}</span></div>
        </div>
      </div>
      ${field('Notes', `<textarea data-inv="notes" rows="2" class="${INPUT}" placeholder="(optional) Shown on the invoice">${esc(d.notes)}</textarea>`)}`,
    footer: `
      <button data-action="close-drawer" class="${BTN_SECONDARY}">Cancel</button>
      <button data-action="save-invoice" data-value="Draft" class="${BTN_SECONDARY}">${ic('save', 'w-4 h-4')}Save as Draft</button>
      <button data-action="save-invoice" data-value="Sent" class="${BTN_PRIMARY}">${ic('send', 'w-4 h-4')}Send Invoice</button>`,
  });
}

function syncInvoiceTotals() {
  const t = draftTotals();
  const el = $('#inv-totals');
  if (el) el.querySelectorAll('.tabular-nums').forEach((n, i) => { n.textContent = fmtBDT([t.subtotal, t.vat, t.total][i]); });
}

function validateInvoice() {
  const d = invDraft, e = {};
  if (!d.customer.trim()) e.customer = 'Enter the customer name.';
  if (!/^01[3-9]\d{8}$/.test(d.phone.trim())) e.phone = 'Enter an 11-digit mobile number starting with 01.';
  if (d.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) e.email = 'Enter a valid email or leave it empty.';
  if (!d.items.some(it => it.desc.trim() && Number(it.qty) > 0 && Number(it.price) > 0)) e.items = 'Add at least one item with a description, quantity and price.';
  if (!d.due || d.due < toDateInput(NOW)) e.due = 'Pick today or a later date.';
  return e;
}
