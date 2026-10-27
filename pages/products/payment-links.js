// =====================================================================
// Payment Links
// =====================================================================
const activeBadge = (on) => `<span class="${STATUS_BADGE} ${on ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}">${on ? 'Active' : 'Inactive'}</span>`;
const linkCollected = (l) => l.payments.reduce((s, p) => s + p.amount, 0);

function linkRows(s) {
  const q = s.search.trim().toLowerCase();
  return PAYMENT_LINKS.filter(l =>
    inStores(l.store) &&
    inRange(l, s.range) &&
    (!q || l.name.toLowerCase().includes(q) || l.ref.toLowerCase().includes(q)) &&
    (s.status === 'all' || (s.status === 'active') === l.active)
  );
}

function renderPaymentLinks() {
  const s = pageState();
  const rows = linkRows(applied(s));
  const base = linkRows({ ...s, status: 'all' });
  const { totalPages, start, pageRows } = paginate(s, rows);
  const statusOpts = [{ label: 'All Status', value: 'all' }, { label: 'Active', value: 'active' }, { label: 'Inactive', value: 'inactive' }];
  const cols = [
    { label: 'Payment Name', cell: l => `<div class="font-medium text-slate-800">${esc(l.name)}</div><div class="text-[11px] font-mono text-slate-500">${l.ref}</div>` },
    { label: 'Store', cls: 'hidden lg:table-cell', cell: l => esc(l.storeName) },
    { label: 'Amount', cell: l => `<div class="font-semibold text-slate-900 whitespace-nowrap">${linkAmountLabel(l)}</div><div class="text-xs text-slate-500">${l.amountType}${l.cart === 'Yes' ? ' · cart' : ''}</div>` },
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
        ${listFilterBar(s, 'Payment Name or Refer Id', selectPill('list', 'status', 'Status', statusOpts, s.status))}
        <div class="flex flex-col gap-4 pt-4">
          <h2 class="text-sm font-semibold text-slate-900">Overview</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            ${metricCard({ title: 'Total Links', value: base.length.toLocaleString(), status: 'all', selected: s.applied.status === 'all' })}
            ${metricCard({ title: 'Active Links', value: base.filter(l => l.active).length.toLocaleString(), status: 'active', selected: s.applied.status === 'active' })}
            ${metricCard({ title: 'Payments Received', value: base.reduce((n, l) => n + l.payments.length, 0).toLocaleString() })}
            ${metricCard({ title: 'Amount Collected', value: fmtBDTShort(base.reduce((n, l) => n + linkCollected(l), 0)) })}
          </div>
        </div>
        <div class="space-y-4 pt-6">
          ${listToolbar(rows.length, 'payment links', applied(s))}
          ${dataTable({ cols, rows: pageRows, rowAttrs: l => `data-action="open-link" data-value="${l.ref}"`, emptyTitle: 'No payment links found' })}
          ${pager(s, rows.length, start, pageRows.length, totalPages)}
        </div>
      </div>
    </div>`;
}

// Old panel syntax: one "AMOUNT|Product Name" per line, amounts unique.
function parseProducts(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const items = [];
  for (const line of lines) {
    const [amount, name, extra] = line.split('|');
    if (extra !== undefined || !name?.trim() || !(Number(amount) > 0)) return { items, error: `Check "${line}" — use AMOUNT|Product Name.` };
    if (/[:;]/.test(name)) return { items, error: 'Do not use ":" or ";" in product names.' };
    if (items.some(it => it.amount === Number(amount))) return { items, error: `Amount ${amount} is used twice — each AMOUNT must be unique.` };
    items.push({ amount: Number(amount), name: name.trim() });
  }
  return { items, error: '' };
}
const amountListOf = (text) => text.split(',').map(v => v.trim()).filter(Boolean);
const linkAmountLabel = (l) => Number(l.amount) > 0 ? fmtBDT(Number(l.amount)) : l.productList ? 'Product list' : l.amountList ? 'Amount list' : 'Any amount';
const shownCustomFields = (l) => LINK_CUSTOM_FIELDS.filter(f => l.custom[f]?.display).map(f => ({ ...l.custom[f], name: f }));

function payPagePreview(l) {
  const c = Object.fromEntries(Object.keys(DEFAULT_LINK_COLORS).map(k => [k, safeColor(l.colors[k], DEFAULT_LINK_COLORS[k])]));
  const box = (text, req) => `<div class="h-8 rounded px-2 flex items-center text-[11px] opacity-70" style="border:1px solid ${c.rightText}40">${esc(text)}${req ? ' *' : ''}</div>`;
  const products = parseProducts(l.productList || '').items;
  const amounts = amountListOf(l.amountList || '');
  const fields = l.customOn ? shownCustomFields(l).map(f => box(f.label || f.placeholder || f.name, f.mandatory)) : [box('Name', true), box('Mobile', true), box('Email')];
  return `
    <div class="rounded-xl border border-slate-200 overflow-hidden grid grid-cols-5 shadow-sm">
      <div class="col-span-3 p-5 space-y-3" style="background:${c.leftBg};color:${c.leftText}">
        ${l.banner ? `<div class="h-12 rounded flex items-center justify-center text-[11px] opacity-70" style="border:1px dashed ${c.leftText}66">${ic('image', 'w-3.5 h-3.5 mr-1')}${esc(l.banner)}</div>` : ''}
        <p class="text-[10px] uppercase tracking-wider opacity-60">Demo Merchant Ltd.</p>
        <h4 class="text-lg font-bold break-words">${esc(l.name || 'Name of the payment')}</h4>
        ${Number(l.amount) > 0 ? `<p class="text-2xl font-bold">${fmtBDT(Number(l.amount))}</p>` : ''}
        ${amounts.length ? `<div class="flex flex-wrap gap-1.5">${amounts.map(a => `<span class="px-2 py-0.5 rounded-full text-xs" style="border:1px solid ${c.leftText}66">${esc(a)}</span>`).join('')}</div>` : ''}
        ${products.length ? `<ul class="text-xs space-y-1">${products.map(p => `<li class="flex justify-between gap-3"><span class="opacity-80">${esc(p.name)}</span><span class="font-semibold">${fmtBDT(p.amount)}</span></li>`).join('')}</ul>` : ''}
      </div>
      <div class="col-span-2 p-4 space-y-2" style="background:${c.rightBg};color:${c.rightText}">
        ${l.topMessage ? `<p class="text-[11px] opacity-80">${esc(l.topMessage)}</p>` : ''}
        ${l.alias ? box(l.alias, true) : ''}
        ${fields.join('')}
        ${l.amountType !== 'Fixed' && !Number(l.amount) && !products.length ? box('Amount (BDT)', true) : ''}
        ${l.showTerms === 'Yes' ? `<p class="flex items-center gap-1.5 text-[10px] opacity-70"><span class="w-3 h-3 rounded-sm" style="border:1px solid ${c.rightText}66"></span>I agree to the terms and conditions</p>` : ''}
        <div class="h-9 rounded flex items-center justify-center text-sm font-semibold bg-primary-600 text-white">${esc(l.buttonName || 'Pay Now')}</div>
        ${l.footerMessage ? `<p class="text-[10px] opacity-70 text-center">${esc(l.footerMessage)}</p>` : ''}
      </div>
    </div>`;
}

const LINK_PARAMS = (l) => miniTable(['Parameter', 'Reason', 'Mandatory'], [
  ['Refer Id', 'Identifies this link', 'Yes'],
  ...(l.alias ? [[esc(l.alias), 'Alias of the transaction reference', 'Yes']] : []),
  ...(l.customOn ? shownCustomFields(l).map(f => [esc(f.label || f.name), f.type || 'Text Field', f.mandatory ? 'Yes' : 'No']) : [
    ['Name', 'Customer name on the receipt', 'Yes'],
    ['Email Address', 'Receipt by email', 'No'],
    ['Mobile', 'Payment notification by SMS', 'Yes'],
  ]),
  ['Amount', l.amountType === 'Fixed' ? 'Fixed by you' : 'Entered by the customer', 'Yes'],
  ['Currency', 'BDT', 'Yes'],
]);

function linkDrawer(l) {
  const url = linkUrl(l.ref);
  const share = (icon, label) => `<button data-action="toast" data-msg="Prototype: nothing was sent via ${label}." class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50">${ic(icon, 'w-3.5 h-3.5')}${label}</button>`;
  const last = l.payments[l.payments.length - 1];
  const products = parseProducts(l.productList).items;
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
        kv('Store', esc(l.storeName)),
        kv('Pay Button', esc(l.buttonName || 'Pay Now')),
        kv('Amount Type', l.amountType),
        kv('Amount (BDT)', Number(l.amount) > 0 ? fmtBDT(Number(l.amount)) : '—'),
        kv('Amount List', l.amountList ? esc(l.amountList) : '—'),
        kv('Product List', products.length ? `${products.length} product${products.length > 1 ? 's' : ''}` : '—'),
        kv('Cart to Pay', l.cart === 'Yes' ? 'Yes — multiple items' : 'No — single item'),
        kv('Alias of Transaction Reference', l.alias ? esc(l.alias) : '—'),
        kv('Invoice Validity', Number(l.validity) > 0 ? `${l.validity} days` : 'Max one month'),
        kv('Terms and Condition', l.showTerms === 'Yes' ? 'Displayed' : 'Not displayed'),
        kv('IPN URL', l.ipnUrl ? esc(l.ipnUrl) : '—', true),
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

// ---------------------------------------------------------------------
// Create Payment Link — the old panel's "Add New Payment Link" fields, with its notes under each field.
// ---------------------------------------------------------------------
let linkDraft = null;
const newLinkDraft = () => ({
  store: '', name: '', alias: '', buttonName: 'Pay Now',
  amount: '', amountList: '', productList: '', category: '', cart: '', amountType: '',
  preQrApi: '', billApi: '', ipnUrl: '', smsMobile: '', termsUrl: '', showTerms: '', validity: '0',
  topMessage: '', footerMessage: '', banner: '', customOn: false, custom: {},
  colors: { ...DEFAULT_LINK_COLORS },
});
const CELL_INPUT = 'w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500';

function customFieldsTable(d) {
  const cell = (f, key, attrs = '') => `<input data-link-cf="${f}|${key}" value="${esc(d.custom[f]?.[key] || '')}" aria-label="${f} ${key}" class="${CELL_INPUT}" ${attrs}>`;
  const check = (f, key, label) => `<input type="checkbox" data-link-cf="${f}|${key}" ${d.custom[f]?.[key] ? 'checked' : ''} aria-label="${f}: ${label}" class="rounded border-slate-300 text-primary-600">`;
  return `
    <div class="overflow-x-auto rounded-lg border border-slate-200">
      <table class="min-w-[860px] w-full text-left text-xs">
        <thead class="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          <tr><th class="px-3 py-2">Field</th><th class="px-2 py-2">Field Type</th><th class="px-2 py-2">Display Name</th><th class="px-2 py-2">Placeholder</th><th class="px-2 py-2">Default Value</th><th class="px-2 py-2">Other Value</th><th class="px-2 py-2 text-center">Mandatory</th><th class="px-2 py-2 text-center">Display</th></tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${LINK_CUSTOM_FIELDS.map(f => `<tr>
            <td class="px-3 py-1.5 font-medium text-slate-700 whitespace-nowrap">${f}</td>
            <td class="px-2 py-1.5 w-32"><select data-link-cf="${f}|type" aria-label="${f} field type" class="${CELL_INPUT}">${options(LINK_FIELD_TYPES, d.custom[f]?.type || LINK_FIELD_TYPES[0])}</select></td>
            <td class="px-2 py-1.5">${cell(f, 'label')}</td>
            <td class="px-2 py-1.5">${cell(f, 'placeholder')}</td>
            <td class="px-2 py-1.5">${cell(f, 'def')}</td>
            <td class="px-2 py-1.5">${cell(f, 'other')}</td>
            <td class="px-2 py-1.5 text-center">${check(f, 'mandatory', 'mandatory')}</td>
            <td class="px-2 py-1.5 text-center">${check(f, 'display', 'display')}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

function linkFormDrawer() {
  const d = linkDraft;
  const e = formErrors;
  const inp = (key, attrs = '') => `<input data-link="${key}" value="${esc(d[key])}" class="${INPUT}" ${attrs}>`;
  const area = (key, rows = 3) => `<textarea data-link="${key}" rows="${rows}" class="${INPUT}">${esc(d[key])}</textarea>`;
  const pick = (key, list) => `<select data-link="${key}" class="${INPUT}"><option value="">Select option</option>${options(list, d[key])}</select>`;
  const color = (key, label) => `<label class="flex items-center gap-2 text-xs text-slate-600"><input type="color" data-link-color="${key}" value="${safeColor(d.colors[key], DEFAULT_LINK_COLORS[key])}" class="w-8 h-8 rounded border border-slate-200 cursor-pointer shrink-0">${label}</label>`;
  const grid = (cells, cols = 'sm:grid-cols-2 lg:grid-cols-3') => `<div class="grid grid-cols-1 ${cols} gap-4">${cells.join('')}</div>`;
  return drawerShell({
    wide: 'xl',
    title: 'Create Payment Link',
    sub: '<span>Add New Payment Link — customers pay on an SSLCOMMERZ-hosted page</span>',
    body: `
      ${section('Store Information', grid([
        field('Store', `<select data-link="store" class="${INPUT}"><option value="">Select store</option>${storeOptions(d.store)}</select>`, { required: true, error: e.store }),
      ]))}
      ${section('Pay or Subscription', grid([
        field('Name of the Payment', inp('name'), { required: true, error: e.name, hint: '* A brief description of this payment link.' }),
        field('Alias of Transaction Reference', inp('alias'), { hint: '* It is alias display name of the primary reference key. Example: Mobile Number, Account Number, Invoice Number, Roll Number, etc. Keep empty, if you do not want this field.' }),
        field('Pay Button', inp('buttonName')),
      ]))}
      ${section('Transaction Information', `<div class="space-y-4">
        ${grid([
          field('Amount (BDT)', inp('amount', 'type="number" min="0" step="any"'), { error: e.amount, hint: "* Keep it unchanged, if you don't want to collect same amount from all customers." }),
          field('Amount List', inp('amountList', 'placeholder="e.g. 500,1000,2000"'), { error: e.amountList, hint: '* Comma separated amount list to display.' }),
          field('Product List with Amount', area('productList'), { error: e.productList, hint: '* Syntax: AMOUNT|Product Name (Amount), one product per line. Example: 200|Product Name 1 (200 BDT). Do not use "|", ":" and ";" within your text, and each AMOUNT must be unique. (Only applicable for Payment Link)' }),
          field('Item or Product Category', inp('category', 'placeholder="e.g. Small,Regular"'), { hint: '* Depends on "Product List with Amount" — with no products, no category is shown. Separate names with commas, e.g. Small,Regular. An item named "Creamy Hot Chocolate (Regular)" is shown under "Regular"; "All" and "Others" are added automatically. (Only applicable for Payment Link)' }),
          field('Is Support Cart to Pay', pick('cart', [['No', 'No - Single Item Payment'], ['Yes', 'Yes - Support to add Multiple Items in Cart']])),
          field('Currency', `<input value="BDT" disabled class="${INPUT} bg-slate-50 text-slate-500">`),
        ])}
        ${grid([
          field('Amount Type', pick('amountType', ['Dynamic', 'Fixed']), { error: e.amountType }),
          field('Pre QR Query API', inp('preQrApi', 'type="url" placeholder="https://"'), { error: e.preQrApi }),
          field('Bill Query API', inp('billApi', 'type="url" placeholder="https://"'), { error: e.billApi }),
          field('IPN URL', inp('ipnUrl', 'type="url" placeholder="https://"'), { error: e.ipnUrl }),
          field('Mobile Number (SMS Notification)', inp('smsMobile', 'inputmode="numeric" placeholder="01XXXXXXXXX"'), { error: e.smsMobile }),
          field('Terms and Agreement URL', inp('termsUrl', 'type="url" placeholder="https://"'), { error: e.termsUrl }),
          field('Enable Terms and Condition', pick('showTerms', [['Yes', 'Display Terms & Conditions'], ['No', "Don't Display Terms & Conditions"]])),
          field('Invoice Validity', inp('validity', 'type="number" min="0" step="1"'), { error: e.validity, hint: '* How long a invoice will be valid. It is mentioned in day(s). "0" means, invoice validity will be max one month.' }),
        ])}
      </div>`)}
      ${section('Additional Message', `<div class="space-y-4">
        ${field('Message on Top', inp('topMessage'), { hint: '* This message will be displayed on the top of the fields.' })}
        ${field('Message on Footer', inp('footerMessage'), { hint: '* This message will be displayed after the pay button.' })}
      </div>`)}
      ${section('Page Structure', `<div class="space-y-4">
        ${grid([color('leftBg', 'Left Site Background Color'), color('leftText', 'Left Site Font Color'), color('rightBg', 'Right Site Background Color'), color('rightText', 'Right Site Font Color')], 'sm:grid-cols-2 lg:grid-cols-4')}
        ${field('Upload Banner', `<input type="file" accept="image/*" data-link-banner class="block w-full text-sm text-slate-600 file:mr-3 file:px-3 file:py-1.5 file:rounded file:border file:border-slate-200 file:bg-white file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-50">`, { hint: d.banner ? `Selected: ${esc(d.banner)} (prototype — not uploaded)` : '' })}
      </div>`)}
      <div class="space-y-3">
        <label class="inline-flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" data-link="customOn" data-rerender ${d.customOn ? 'checked' : ''} class="rounded border-slate-300 text-primary-600">Click to add customize fields</label>
        ${d.customOn ? customFieldsTable(d) : ''}
      </div>
      ${section('Live Preview', `<div id="link-preview">${payPagePreview(d)}</div>`)}`,
    footer: `
      <button data-action="close-drawer" class="${BTN_SECONDARY}">Cancel</button>
      <button data-action="save-link" class="${BTN_PRIMARY}">${ic('link', 'w-4 h-4')}Create New</button>`,
  });
}

function validateLink() {
  const d = linkDraft, e = {};
  const url = (key) => { if (d[key].trim() && !/^https?:\/\/\S+\.\S+/.test(d[key].trim())) e[key] = 'Enter a full URL starting with https://'; };
  if (!d.store) e.store = 'Choose a store.';
  if (!d.name.trim()) e.name = 'Enter the name of the payment.';
  if (d.amount !== '' && !(Number(d.amount) > 0)) e.amount = 'Enter an amount greater than 0.';
  if (amountListOf(d.amountList).some(v => !(Number(v) > 0))) e.amountList = 'Use numbers separated by commas, e.g. 500,1000.';
  const products = parseProducts(d.productList);
  if (products.error) e.productList = products.error;
  if (d.amountType === 'Fixed' && !(Number(d.amount) > 0) && !d.amountList.trim() && !products.items.length) e.amount = 'A Fixed link needs an amount, an amount list or a product list.';
  ['preQrApi', 'billApi', 'ipnUrl', 'termsUrl'].forEach(url);
  if (d.showTerms === 'Yes' && !d.termsUrl.trim()) e.termsUrl = 'Add the terms URL to display Terms & Conditions.';
  if (d.smsMobile.trim() && !/^01[3-9]\d{8}$/.test(d.smsMobile.trim())) e.smsMobile = 'Enter an 11-digit mobile number starting with 01.';
  if (!/^\d+$/.test(d.validity.trim())) e.validity = 'Enter a whole number of days (0 or more).';
  return e;
}
