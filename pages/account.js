// =====================================================================
// Account & Settings
// =====================================================================
const ACC = { storeList: '/account/store-list', groups: '/account/store-groups', users: '/account/user-management', password: '/account/change-password', profile: '/account/transaction-profile' };
const accStore = (id) => ACCOUNT_STORES.find(s => s.id === id);
const groupOf = (id) => STORE_GROUPS.find(g => g.id === id);
const storeTypeIcon = (type) => type === 'Only QR' ? 'qr-code' : type === 'Only Online' ? 'globe' : 'store';
let groupDraft = null;
let userDraft = null;

// ----- Store List (old panel "My Stores") -----------------------------
// Each store sits in at most one store group besides the default "All Stores".
const storeGroupOf = (id) => STORE_GROUPS.find(g => !g.system && g.stores.includes(id));
const storeCfg = (id) => STORE_SETTINGS[id];
let storeDraft = null; // { kind: 'group' | 'ipn' | 'gw', id, ...fields }

// The old panel's View and Settings menus, laid out as one row of labelled actions.
const STORE_ACTIONS = [
  ['open-store', 'eye', 'Details', 'Store Details'], ['store-charge', 'percent', 'Charge', 'Gateway Charge'],
  ['store-bank', 'landmark', 'Bank', 'Settlement Bank Details'], ['store-set-group', 'folder', 'Group', 'Set Group'],
  ['store-ipn', 'webhook', 'IPN', 'IPN Settings'], ['store-gw', 'network', 'Gateway', 'GW Settings'],
];

function storeDrawer(st) {
  const c = storeCfg(st.id).contact;
  return drawerShell({
    title: 'Store Details',
    sub: `<span class="font-mono text-xs">${st.id}</span>${activeBadge(st.status === 'Active')}`,
    body: `
      ${section('Store Information', detailList([
        ['Store ID', `<span class="font-mono">${st.id}</span>`],
        ['Store Name', esc(st.name)],
        ['Base URL of Store', st.baseUrl ? `<span class="font-mono">${esc(st.baseUrl)}</span>` : ''],
        ['Homepage of Store', st.baseUrl ? `<span class="font-mono">${esc(st.baseUrl)}</span>` : ''],
        ['Store Status', activeBadge(st.status === 'Active')],
      ]))}
      ${section('Contact Information', detailList([
        ['Name', esc(c.name)], ['Mailing Address', esc(st.address)], ['Email', esc(c.email)], ['Mobile', `<span class="font-mono">${c.mobile}</span>`], ['Phone', esc(c.phone)], ['Fax', esc(c.fax)],
      ]))}
      <div class="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-600">${ic('shield-check', 'w-4 h-4 mt-px shrink-0 text-slate-500')}<span>Store password and API credentials are not shown here. Find integration details under <a href="#/others/developer-information" class="text-primary-600 hover:underline">Developer / Technical Information</a>; never share them by email or chat.</span></div>`,
    footer: `
      <button data-action="close-drawer" class="${BTN_SECONDARY}">Close</button>
      <button data-action="store-txns" data-value="${st.id}" class="${BTN_PRIMARY}">${ic('list', 'w-4 h-4')}View Transactions</button>`,
  });
}

function storeChargeDrawer(st) {
  const rows = Object.entries(FEE_RATE).map(([type, rate]) => [type, `${(rate * 100).toFixed(2)}%`]);
  return drawerShell({
    title: 'Gateway Charge',
    sub: `<span class="font-mono text-xs">${st.id}</span><span>${esc(st.name)}</span>`,
    body: `${miniTable(['Gateway Type', 'TDR'], rows, { right: [1] })}<p class="text-xs text-slate-500">TDR is the charge per successful payment, deducted before settlement (mock rates).</p>`,
    footer: `<button data-action="close-drawer" class="${BTN_SECONDARY}">Close</button>`,
  });
}

function storeBankDrawer(st) {
  const b = STORE_BANK[st.id];
  return drawerShell({
    title: 'Settlement Bank Details',
    sub: `<span class="font-mono text-xs">${st.id}</span>`,
    body: `
      ${detailList([
        ['Store ID', `<span class="font-mono">${st.id}</span>`], ['Store Name', esc(st.name)],
        ['Account Payee', esc(b?.payee || '')], ['Bank Name', esc(b?.bank || '')], ['Branch Name', esc(b?.branch || '')],
        ['Account No', b ? `<span class="font-mono">${b.account}</span>` : ''], ['Route No', b ? `<span class="font-mono">${b.routing}</span>` : ''],
      ])}
      ${b ? '<p class="text-xs text-slate-500">Account and routing numbers are masked. To change the settlement account, contact your KAM.</p>' : '<p class="text-xs text-slate-500">No settlement account yet — your KAM sets it up after KYC.</p>'}`,
    footer: `<button data-action="close-drawer" class="${BTN_SECONDARY}">Close</button>`,
  });
}

function storeSettingsDrawer() {
  const d = storeDraft;
  const st = accStore(d.id);
  const e = formErrors;
  const inp = (key, attrs = '') => `<input data-store="${key}" value="${esc(d[key])}" class="${INPUT}" ${attrs}>`;
  const check = (key, label) => `<label class="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" data-store="${key}" ${d[key] ? 'checked' : ''} class="rounded border-slate-300 text-primary-600">${label}</label>`;
  const color = (key, label) => `<label class="flex items-center gap-2 text-xs text-slate-600"><input type="color" data-store="${key}" value="${safeColor(d[key], '#295cab')}" class="w-8 h-8 rounded border border-slate-200 cursor-pointer shrink-0">${label}</label>`;
  const info = (rows) => section('Store Information', detailList(rows));
  const body = {
    group: `${field('Store Group', `<select data-store="group" class="${INPUT}"><option value="">Select group</option>${options(STORE_GROUPS.filter(g => !g.system && (g.active || g.id === d.group)).map(g => [g.id, g.name]), d.group)}</select>`, { required: true, error: e.group, hint: 'A store belongs to one group. "All Stores" always has every store.' })}`,
    ipn: `
      ${info([['Store Name', esc(st.name)], ['Store ID', `<span class="font-mono">${st.id}</span>`], ['Contact Email', esc(storeCfg(st.id).contact.email)]])}
      ${section('IPN at Email Address', `<div class="space-y-3">${field('Email One', inp('email1', 'type="email"'), { error: e.email1 })}${field('Email Two', inp('email2', 'type="email"'), { error: e.email2 })}${field('Email Three', inp('email3', 'type="email"'), { error: e.email3 })}</div>`)}
      ${section('IPN by SMS at Mobile', `<div class="space-y-3">${field('Mobile One', inp('mobile1', 'inputmode="numeric" placeholder="01XXXXXXXXX"'), { error: e.mobile1 })}${check('sms1', 'Enable SMS')}${field('Mobile Two', inp('mobile2', 'inputmode="numeric" placeholder="01XXXXXXXXX"'), { error: e.mobile2 })}${check('sms2', 'Enable SMS')}</div>`)}
      ${section('IPN at HTTP Listener', `<div class="space-y-3">${field('IPN Listener', inp('listener', 'type="url" placeholder="https://"'), { error: e.listener })}${check('listenerOn', 'Enable')}</div>`)}`,
    gw: `
      ${info([['Store Name', esc(st.name)], ['Store ID', `<span class="font-mono">${st.id}</span>`], ['Store Logo', `<span class="inline-flex w-9 h-9 rounded bg-slate-100 items-center justify-center text-xs font-bold text-slate-500">${esc(st.name[0])}</span>`]])}
      ${section('Gateway Color', `<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">${color('primaryWeb', 'Primary Color (Web)')}${color('activeWeb', 'Active Color (Web)')}${color('primarySdk', 'Primary Color (App SDK)')}${color('activeSdk', 'Active Color (App SDK)')}</div>`)}
      ${section('Gateway Settings', `<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        ${field('Default Pay Group', `<select data-store="payGroup" class="${INPUT}"><option value="">Select Default Pay Group</option>${options(['Cards Payment', 'Internet Banking', 'Mobile Banking'], d.payGroup)}</select>`, { hint: 'Opens first on the payment page' })}
        ${field('Gateway charge paid by customer', `<select data-store="chargeCustomer" class="${INPUT}">${options(['Disabled', 'Enabled'], d.chargeCustomer)}</select>`)}
      </div>`)}`,
  }[d.kind];
  return drawerShell({
    wide: d.kind !== 'group',
    title: { group: 'Set Store Group', ipn: 'IPN Settings', gw: 'Gateway Settings' }[d.kind],
    sub: `<span class="font-mono text-xs">${st.id}</span>`,
    body,
    footer: `
      <button data-action="close-drawer" class="${BTN_SECONDARY}">Close</button>
      <button data-action="save-store-settings" class="${BTN_PRIMARY}">${ic('save', 'w-4 h-4')}Submit</button>`,
  });
}

function validateStoreSettings() {
  const d = storeDraft, e = {};
  const email = (k) => { if (d[k].trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d[k].trim())) e[k] = 'Enter a valid email address.'; };
  const mobile = (k, on) => { if ((d[k].trim() || d[on]) && !/^(88)?01[3-9]\d{8}$/.test(d[k].trim())) e[k] = 'Enter a valid mobile number, like 017XXXXXXXX.'; };
  if (d.kind === 'group' && !d.group) e.group = 'Choose a store group.';
  if (d.kind === 'ipn') {
    ['email1', 'email2', 'email3'].forEach(email);
    mobile('mobile1', 'sms1'); mobile('mobile2', 'sms2');
    if ((d.listener.trim() || d.listenerOn) && !/^https:\/\/\S+\.\S+/.test(d.listener.trim())) e.listener = 'Enter a full https:// URL for your IPN listener.';
  }
  return e;
}

function renderStoreList() {
  const s = pageState();
  const f = applied(s);
  const q = f.search.trim().toLowerCase();
  const rows = ACCOUNT_STORES.filter(st =>
    (!q || st.id.toLowerCase().includes(q) || st.name.toLowerCase().includes(q) || st.baseUrl.includes(q)) &&
    (f.stype === 'all' || storeGroupOf(st.id)?.id === f.stype) && (f.status === 'all' || st.status === f.status));
  const groupOpts = [{ label: 'All Store Groups', value: 'all' }, ...STORE_GROUPS.filter(g => !g.system).map(g => ({ label: g.name, value: g.id }))];
  const statusOpts = [{ label: 'All Status', value: 'all' }, { label: 'Active', value: 'Active' }, { label: 'Inactive', value: 'Inactive' }];
  const active = ACCOUNT_STORES.filter(st => st.status === 'Active').length;
  // Compact counts that double as quick status filters (same handler as the overview cards).
  const stat = (label, value, status) => `
    <button data-action="overview-status" data-value="${status}" aria-pressed="${f.status === status}"
      class="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border bg-white text-sm transition-colors ${f.status === status ? 'border-primary-600 ring-1 ring-primary-100' : 'border-slate-200 hover:border-slate-300'}">
      <span class="text-slate-500">${label}</span><span class="font-semibold text-slate-900 tabular-nums">${value}</span>
    </button>`;
  return `
    <div class="space-y-4">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">Store List</h1>
          <p class="text-slate-500 text-sm">All stores under your merchant account, including inactive ones.</p>
        </div>
        <div class="flex flex-wrap gap-2">
          ${stat('Total', ACCOUNT_STORES.length, 'all')}${stat('Active', active, 'Active')}${stat('Inactive', ACCOUNT_STORES.length - active, 'Inactive')}
        </div>
      </div>
      <div class="flex flex-col">
        ${listFilterBar(s, 'Store ID, Store Name or Base URL',
          selectPill('list', 'stype', 'Store Group', groupOpts, s.stype) +
          selectPill('list', 'status', 'Status', statusOpts, s.status),
          { noDate: true, noStore: true })}
        <div class="space-y-3 pt-4">
          <p class="text-sm text-slate-500"><span class="font-semibold text-slate-900">${rows.length}</span> of ${ACCOUNT_STORES.length} stores</p>
          ${rows.length ? `<div class="store-grid grid grid-cols-1 lg:grid-cols-2 gap-3">${rows.map(storeCard).join('')}</div>` : `
            <div class="bg-white rounded-lg border border-slate-200 px-4 py-10 text-center">
              <p class="text-sm font-medium text-slate-700">No stores match these filters</p>
              <p class="text-xs text-slate-500 mt-1">Try clearing some filters.</p>
            </div>`}
        </div>
      </div>
    </div>`;
}

// One store as a card, kept light: name and type, group and bank, chips only for what needs
// attention, every store action and the Active switch.
function storeCard(st) {
  const bank = STORE_BANK[st.id];
  const live = st.status === 'Active';
  const issues = [
    !storeCfg(st.id).ipn.listenerOn && 'IPN Not Configured',
    !bank ? 'No Settlement Bank' : SETTLEMENT_DISABLED.has(st.id) && 'Settlement Disabled',
  ].filter(Boolean);
  const fact = (label, value) => `<div class="min-w-0"><dt class="text-[11px] text-slate-500">${label}</dt><dd class="text-[13px] font-medium text-slate-800 truncate">${value || '<span class="font-normal text-slate-400">Not set</span>'}</dd></div>`;
  return `
    <article class="bg-white rounded-lg border shadow-sm border-slate-200 flex flex-col">
      <div class="flex items-start gap-2 px-3 pt-3">
        ${ic(storeTypeIcon(st.type), 'w-4 h-4 mt-0.5 shrink-0 portal-icon-muted')}
        <div class="min-w-0">
          <h2 class="text-sm font-semibold text-slate-900 truncate">${esc(st.name)}</h2>
          <p class="text-[11px] text-slate-500"><span class="font-mono">${st.id}</span> · ${esc(st.type)} · ${st.currency}</p>
        </div>
      </div>
      ${live ? '' : `<p class="px-3 pt-1.5 text-[11px] text-rose-600">Not accepting payments. Contact your KAM to reactivate this store.</p>`}
      <dl class="grid grid-cols-2 gap-x-4 px-3 pt-2.5">
        ${fact('Store Group', esc(storeGroupOf(st.id)?.name || ''))}
        ${fact('Settlement Bank', bank ? `${esc(bank.bank)} <span class="font-mono text-xs text-slate-500">•••• ${bank.account.slice(-4)}</span>` : '')}
      </dl>
      ${issues.length ? `<div class="flex flex-wrap gap-1.5 px-3 pt-2">${issues.map(t => `<span class="${STATUS_BADGE} bg-amber-50 text-amber-700">${t}</span>`).join('')}</div>` : ''}
      <div class="h-2.5"></div>
      <!-- Pinned to the bottom so action bars line up across a row, whether or not a card has chips. -->
      <div class="flex flex-wrap items-center gap-0.5 px-1.5 py-1 mt-auto rounded-b-lg border-t border-primary-100 bg-primary-50/60">
        ${STORE_ACTIONS.map(([action, icon, label, title]) => rowAction(action, st.id, icon, label, { title: `${title} of ${st.id}` })).join('')}
        ${rowAction('store-profile', st.id, 'file-text', 'Profile', { title: `Transaction Profile of ${st.id}` })}
        <span class="ml-auto mr-2 inline-flex items-center gap-2">
          <span class="text-xs font-medium ${live ? 'text-emerald-700' : 'text-slate-500'}">${live ? 'Active' : 'Inactive'}</span>
          <button type="button" role="switch" aria-checked="${live}" data-action="store-status" data-value="${st.id}" title="${live ? 'Deactivate' : 'Activate'} ${st.id}" aria-label="${esc(st.name)} active"
            class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${live ? 'bg-emerald-500' : 'bg-slate-300'}">
            <span class="inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${live ? 'translate-x-5' : 'translate-x-0.5'}"></span>
          </button>
        </span>
      </div>
    </article>`;
}

// Turning a store on or off changes whether it can take payments, so the switch asks first.
function storeStatusDrawer(st) {
  const live = st.status === 'Active';
  return drawerShell({
    title: live ? 'Deactivate store?' : 'Activate store?',
    sub: `<span class="font-mono text-xs">${st.id}</span><span>${esc(st.name)}</span>`,
    body: live
      ? `<p class="text-sm text-slate-700">Customers won't be able to pay this store while it is inactive. Payments already made are still settled as usual.</p>`
      : `<p class="text-sm text-slate-700">The store starts taking payments again on its configured channels.</p>`,
    footer: `
      <button data-action="close-drawer" class="${BTN_SECONDARY}">Cancel</button>
      <button data-action="store-status-confirm" data-value="${st.id}" class="${live ? 'flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded shadow-sm hover:bg-rose-700' : BTN_PRIMARY}">${ic(live ? 'circle-pause' : 'circle-play', 'w-4 h-4')}${live ? 'Deactivate' : 'Activate'}</button>`,
  });
}

// ----- Store Groups (old panel: a list with name, created on and status) -----
const groupTime = (d) => `${toDateInput(d).split('-').reverse().join('-')} ${fmtTime(d)}`;
function renderStoreGroups() {
  const s = pageState();
  const f = applied(s);
  const q = f.search.trim().toLowerCase();
  const rows = STORE_GROUPS.filter(g => !g.system && (!q || g.name.toLowerCase().includes(q)) && (f.status === 'all' || (f.status === 'Active') === g.active))
    .sort((a, b) => b.created - a.created);
  const statusOpts = [{ label: 'All Status', value: 'all' }, { label: 'Active', value: 'Active' }, { label: 'De-active', value: 'Inactive' }];
  const cols = [
    { label: 'Group Name', cell: g => `<span class="font-medium text-slate-800">${esc(g.name)}</span>` },
    { label: 'Stores', cls: 'hidden md:table-cell', cell: g => `<span class="text-xs text-slate-600">${g.stores.length ? g.stores.map(id => esc(accStore(id).name)).join(', ') : '—'}</span>` },
    { label: 'Created On', cell: g => `<span class="whitespace-nowrap">${groupTime(g.created)}</span>` },
    { label: 'Status', cell: g => `<span class="${STATUS_BADGE} ${g.active ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}">${g.active ? 'Active' : 'De-active'}</span>` },
    { label: 'Action', cell: g => rowAction('edit-group', g.id, 'pencil', 'Edit', { title: `Edit ${g.name}` }) },
  ];
  return `
    <div class="space-y-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">Store Groups</h1>
          <p class="text-slate-500 text-sm">Groups decide which stores a portal user can see. Add stores to a group from Store List → Set Group.</p>
        </div>
        <button data-action="new-group" class="${BTN_PRIMARY} shrink-0">${ic('circle-plus', 'w-4 h-4')}Create Store Group</button>
      </div>
      <div class="flex flex-col">
        ${listFilterBar(s, 'Group Name', selectPill('list', 'status', 'Status', statusOpts, s.status), { noDate: true, noStore: true })}
        <div class="space-y-4 pt-6">
          <h2 class="text-sm font-semibold text-slate-900">Store Group List <span class="ml-1 text-xs font-normal text-slate-500">${rows.length} rows</span></h2>
          ${dataTable({ cols, rows, rowAttrs: g => `data-action="open-group" data-value="${g.id}"`, emptyTitle: 'No store groups match', serial: 1 })}
        </div>
      </div>
    </div>`;
}

function groupDrawer(g) {
  const users = USERS.filter(u => u.group === g.id);
  return drawerShell({
    title: esc(g.name),
    sub: `<span>${g.stores.length} stores · ${users.length} users</span>${activeBadge(g.active)}`,
    body: `
      ${g.description ? `<p class="text-sm text-slate-600">${esc(g.description)}</p>` : ''}
      ${g.active ? '' : `<p class="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">${ic('circle-alert', 'w-4 h-4 mt-0.5 shrink-0')}Inactive — it can’t be given to new users${users.length ? ', and its users can’t see these stores until it is activated again' : ''}.</p>`}
      ${section('Stores', `<div class="divide-y divide-slate-100 rounded-lg border border-slate-200">${g.stores.map(id => { const st = accStore(id); return `<div class="flex items-center justify-between px-3 py-2.5"><span><span class="block text-sm text-slate-800">${esc(st.name)}</span><span class="block text-[11px] font-mono text-slate-500">${st.id}</span></span>${activeBadge(st.status === 'Active')}</div>`; }).join('')}</div>`)}
      ${section('Users with access', users.length ? `<div class="divide-y divide-slate-100 rounded-lg border border-slate-200">${users.map(u => `<button data-action="open-user" data-value="${u.login}" class="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-slate-50"><span><span class="block text-sm text-slate-800">${esc(u.name)}</span><span class="block text-[11px] text-slate-500">${u.role}</span></span>${activeBadge(u.status === 'Active')}</button>`).join('')}</div>` : '<p class="text-sm text-slate-500">No users are assigned to this group.</p>')}`,
    footer: g.system ? '<span class="text-xs text-slate-500">The default group always contains every store.</span>' : `
      ${users.length ? '' : `<button data-action="delete-group" data-value="${g.id}" class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-rose-600 bg-white border border-rose-200 rounded shadow-sm hover:bg-rose-50">${ic('trash-2', 'w-4 h-4')}Delete Group</button>`}
      <button data-action="group-toggle" data-value="${g.id}" class="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white border rounded shadow-sm ${g.active ? 'text-rose-600 border-rose-200 hover:bg-rose-50' : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'}">${ic(g.active ? 'circle-pause' : 'circle-play', 'w-4 h-4')}${g.active ? 'Deactivate' : 'Activate'}</button>
      <button data-action="edit-group" data-value="${g.id}" class="${BTN_PRIMARY}">${ic('pencil', 'w-4 h-4')}Edit Group</button>`,
  });
}

function groupFormDrawer() {
  const d = groupDraft;
  return drawerShell({
    title: d.id ? 'Update Store Group' : 'Create Store Group',
    sub: '<span>Add stores to the group from Store List → Set Group</span>',
    body: `
      ${field('Store Group Name', `<input data-group="name" value="${esc(d.name)}" class="${INPUT}">`, { required: true, error: formErrors.name })}
      ${field('Status', `<select data-group="status" class="${INPUT}"><option value="">Select status</option>${options([['Active', 'Active'], ['Inactive', 'De-active']], d.status)}</select>`, { required: true, error: formErrors.status })}`,
    footer: `
      <button data-action="close-drawer" class="${BTN_SECONDARY}">Close</button>
      <button data-action="save-group" class="${BTN_PRIMARY}">Submit</button>`,
  });
}

// ----- User Management (old panel "My Users") ------------------------
const appRoleLabel = (v) => APP_ROLES.find(([k]) => k === v)?.[1] || '—';
const userStatus = (s) => `<span class="${STATUS_BADGE} ${s === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}">${s === 'Active' ? 'Active' : 'De-active'}</span>`;

function renderUsers() {
  const s = pageState();
  const f = applied(s);
  const q = f.search.trim().toLowerCase();
  const rows = USERS.filter(u =>
    (!q || [u.login, u.first, u.last, u.email].some(v => v.toLowerCase().includes(q))) &&
    (f.status === 'all' || u.status === f.status) && (f.role === 'all' || u.role === f.role) && (f.stype === 'all' || u.group === f.stype));
  const opts = (list, all) => [{ label: all, value: 'all' }, ...list.map(v => Array.isArray(v) ? { label: v[1], value: v[0] } : { label: v, value: v })];
  const cols = [
    { label: 'Login ID', cell: u => `<span class="font-mono text-xs text-slate-800">${esc(u.login)}</span>` },
    { label: 'First Name', cell: u => esc(u.first) },
    { label: 'Last Name', cls: 'hidden md:table-cell', cell: u => esc(u.last) || '<span class="text-slate-400">—</span>' },
    { label: 'Email Address', cls: 'hidden lg:table-cell', cell: u => `<span class="text-xs">${esc(u.email)}</span>` },
    { label: 'Role', cell: u => `<span class="text-xs text-slate-700">${u.role}</span>` },
    { label: 'Allowed Store', cls: 'hidden xl:table-cell', cell: u => `<span class="text-xs text-slate-600">${esc(groupOf(u.group)?.name || '—')}</span>` },
    { label: 'Status', cell: u => userStatus(u.status) },
    { label: 'Action', cell: u => `<div class="flex items-center gap-1">
      ${rowAction('open-user', u.login, 'eye', 'Details', { title: `Details of ${u.login}` })}
      ${rowAction('edit-user', u.login, 'pencil', 'Update', { title: `Update ${u.login}` })}
    </div>` },
  ];
  return `
    <div class="space-y-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">User Management</h1>
          <p class="text-slate-500 text-sm">Who can sign in to this portal, their role, and which store group they see.</p>
        </div>
        <button data-action="new-user" class="${BTN_PRIMARY} shrink-0">${ic('circle-plus', 'w-4 h-4')}Create User</button>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        ${metricCard({ title: 'Total Users', value: USERS.length, status: 'all', selected: s.applied.status === 'all' })}
        ${metricCard({ title: 'Active', value: USERS.filter(u => u.status === 'Active').length, status: 'Active', selected: s.applied.status === 'Active' })}
        ${metricCard({ title: 'De-active', value: USERS.filter(u => u.status === 'Inactive').length, status: 'Inactive', selected: s.applied.status === 'Inactive' })}
      </div>
      <div class="flex flex-col">
        ${listFilterBar(s, 'Login ID, First Name, Last Name or Email',
          selectPill('list', 'role', 'User Role', opts(USER_ROLES, 'All Roles'), s.role) +
          selectPill('list', 'stype', 'Allowed Store', opts(STORE_GROUPS.map(g => [g.id, g.name]), 'All Store Groups'), s.stype) +
          selectPill('list', 'status', 'Status', opts([['Active', 'Active'], ['Inactive', 'De-active']], 'All Status'), s.status), { noDate: true, noStore: true })}
        <div class="space-y-4 pt-6">
          ${dataTable({ cols, rows, rowAttrs: u => `data-action="open-user" data-value="${u.login}"`, emptyTitle: 'No users match these filters', emptyHint: 'Try clearing some filters.' })}
        </div>
      </div>
    </div>`;
}

function userDrawer(u) {
  const g = groupOf(u.group);
  const isSelf = u.login === 'demo_merchant';
  return drawerShell({
    title: 'User Details',
    sub: `<span class="font-mono text-xs">${esc(u.login)}</span>${userStatus(u.status)}`,
    body: `
      ${section('Login Information', detailList([
        ['User Login ID', `<span class="font-mono">${esc(u.login)}</span>`],
        ['Password', '<span class="text-slate-400">-----</span> <span class="text-xs text-slate-400">(never shown)</span>'],
        ['User Role', esc(u.role)],
        ['Allowed Store Groups', esc(g?.name || '')],
        ['Merchant App Role', appRoleLabel(u.appRole)],
        ['Status', userStatus(u.status)],
      ]))}
      ${section('Contact Information', detailList([
        ['Name', esc([u.first, u.middle, u.last].filter(Boolean).join(' '))],
        ['Email', esc(u.email)],
        ['Mobile', `<span class="font-mono">${u.mobile}</span>`],
        ['Phone', esc(u.phone)],
        ['User Added By', esc(u.addedBy)],
        ['Added On', `${fmtDate(u.created)}, ${fmtTime(u.created)}`],
      ]))}
      ${g ? section('Stores this user can see', `<div class="flex flex-wrap gap-1.5">${g.stores.map(id => `<span class="px-2 py-0.5 rounded-full bg-slate-100 text-xs text-slate-700">${esc(accStore(id).name)}</span>`).join('')}</div>`) : ''}`,
    footer: isSelf ? '<span class="text-xs text-slate-500">This is your own account — change your password from Change Password.</span>' : `
      <button data-action="close-drawer" class="${BTN_SECONDARY}">Close</button>
      <button data-action="edit-user" data-value="${u.login}" class="${BTN_PRIMARY}">${ic('pencil', 'w-4 h-4')}Update</button>`,
  });
}

const newUserDraft = (u) => ({
  login0: u?.login || null, first: u?.first || '', middle: u?.middle || '', last: u?.last || '',
  mobile: '', phone: u?.phone || '', email: '', login: u?.login || '', password: '', confirm: '',
  role: u?.role || '', group: u?.group || 'G1', appRole: u?.appRole || '', status: u?.status || '', showPolicy: false,
});

function userFormDrawer() {
  const d = userDraft;
  const e = formErrors;
  const edit = !!d.login0;
  const u = edit && USERS.find(x => x.login === d.login0);
  const inp = (key, attrs = '') => `<input data-user="${key}" value="${esc(d[key])}" class="${INPUT}" ${attrs}>`;
  const sel = (key, list, placeholder) => `<select data-user="${key}" class="${INPUT}">${placeholder ? `<option value="">${placeholder}</option>` : ''}${options(list, d[key])}</select>`;
  return drawerShell({
    wide: 'xl',
    title: edit ? 'Update User' : 'Create User',
    sub: `<span>${edit ? `<span class="font-mono">${esc(d.login0)}</span>` : 'New portal user for Demo Merchant Ltd.'}</span>`,
    body: `
      ${section('Profile Information', `<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        ${field('First Name', inp('first'), { required: true, error: e.first })}
        ${field('Middle Name', inp('middle'))}
        ${field('Last Name', inp('last'))}
        ${field('Mobile Number', inp('mobile', `inputmode="numeric" placeholder="${edit ? esc(u.mobile) + ' (unchanged)' : '01XXXXXXXXX'}"`), { required: !edit, error: e.mobile })}
        ${field('Phone Number', inp('phone'))}
        ${field('Email Address', inp('email', `type="email" placeholder="${edit ? esc(u.email) + ' (unchanged)' : 'name@company.com'}"`), { required: !edit, error: e.email })}
      </div>`)}
      ${section('Login Credentials', `<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        ${field('Login Name', inp('login', `autocomplete="off" ${edit ? 'disabled' : ''}`), { required: true, error: e.login, hint: edit ? '' : 'Letters, numbers and . _ @ - (4–50)' })}
        ${field('Login Password', inp('password', 'type="password" autocomplete="new-password"'), { required: !edit, error: e.password, hint: edit ? 'Leave empty to keep the current password' : '' })}
        ${field('Confirm Password', inp('confirm', 'type="password" autocomplete="new-password"'), { required: !edit, error: e.confirm })}
        ${field('User Role', sel('role', USER_ROLES, 'Select Role'), { required: true, error: e.role })}
        ${field('Allowed Store Groups', sel('group', STORE_GROUPS.filter(g => g.active || g.id === d.group).map(g => [g.id, g.name])), { required: true })}
        ${field('Merchant App Role', sel('appRole', APP_ROLES, 'Select Merchant App Role'))}
        ${field('Login Status', sel('status', [['Active', 'Active'], ['Inactive', 'De-active']], 'Select Login Status'), { required: true, error: e.status })}
      </div>`)}
      <section class="rounded-lg border border-slate-200">
        <button data-action="user-policy" aria-expanded="${d.showPolicy}" class="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-slate-900">Password Policy${ic(d.showPolicy ? 'circle-minus' : 'circle-plus', 'w-5 h-5 text-slate-500')}</button>
        ${d.showPolicy ? `<ul class="px-4 pb-4 space-y-1.5 text-sm">${PASSWORD_RULES.map(r => `<li class="flex items-center gap-2 ${d.password && r.test(d.password) ? 'text-emerald-700' : 'text-slate-600'}">${ic(d.password && r.test(d.password) ? 'circle-check' : 'circle', 'w-4 h-4 shrink-0')}${r.text}</li>`).join('')}</ul>` : ''}
      </section>
      <p class="flex items-start gap-2 text-xs text-slate-500">${ic('shield-check', 'w-4 h-4 shrink-0')}Prototype: passwords are only checked here, never stored or sent. Share the first password with the user in person, not by email or chat.</p>`,
    footer: `
      <button data-action="close-drawer" class="${BTN_SECONDARY}">Cancel</button>
      <button data-action="save-user" class="${BTN_PRIMARY}">${ic(edit ? 'save' : 'circle-plus', 'w-4 h-4')}${edit ? 'Update' : 'Create New'}</button>`,
  });
}

function validateUser() {
  const d = userDraft, e = {};
  const edit = !!d.login0;
  if (!d.first.trim()) e.first = 'Enter the first name.';
  if ((!edit || d.mobile.trim()) && !/^(88)?01[3-9]\d{8}$/.test(d.mobile.trim())) e.mobile = 'Enter a valid mobile number, like 017XXXXXXXX.';
  if ((!edit || d.email.trim()) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) e.email = 'Enter a valid email address.';
  if (!edit) {
    if (!/^[A-Za-z0-9._@-]{4,50}$/.test(d.login.trim())) e.login = 'Use 4–50 letters, numbers or . _ @ -';
    else if (USERS.some(u => u.login.toLowerCase() === d.login.trim().toLowerCase())) e.login = 'This login name is already taken.';
  }
  if (!edit || d.password) {
    const failed = PASSWORD_RULES.filter(r => !r.test(d.password));
    if (!d.password) e.password = 'Enter a password.';
    else if (failed.length) e.password = `Doesn't meet ${failed.length} password policy rule${failed.length > 1 ? 's' : ''} — see Password Policy below.`;
    if (d.confirm !== d.password) e.confirm = 'Passwords do not match.';
  }
  if (!d.role) e.role = 'Choose a role.';
  if (!d.status) e.status = 'Choose a login status.';
  return e;
}

// ----- Change Password -------------------------------------------------
// Rules from the KAM panel's Password Character Policy. "Repeated characters" is read as
// the same character twice in a row (e.g. "aa") — confirm with the security team.
const PASSWORD_RULES = [
  { text: 'Password length must be more/equal to 12 characters', test: (p) => p.length >= 12 },
  { text: 'It must contain minimum a character is UPPERCASE [A-Z]', test: (p) => /[A-Z]/.test(p) },
  { text: 'It must contain minimum a character is LOWERCASE [a-z]', test: (p) => /[a-z]/.test(p) },
  { text: 'It must contain minimum a NUMBER [1-0]', test: (p) => /\d/.test(p) },
  { text: 'It must contain minimum a special character, except ` and ^ and Space', test: (p) => /[^A-Za-z0-9`^\s]/.test(p) && !/[`^\s]/.test(p) },
  { text: 'It must not contain repeated characters.', test: (p) => p.length > 0 && !/(.)\1/.test(p) },
];
const PASSWORD_CHANGE_POLICY = [
  'Password must be changed within 90 days.',
  'From 80th to 90th, user will get alert to change password.',
  'After 30 days, the account will be blocked.',
  'One of previously used passwords cannot be set as new password.',
];

function renderChangePassword() {
  const lastChanged = addDays(TODAY, -62);
  const pwField = (id, label, placeholder) => `
    <label class="block">
      <span class="block text-xs font-bold text-slate-700 mb-1.5">${label} <span class="text-rose-500">*</span></span>
      <span class="relative block">
        <input id="${id}" type="password" autocomplete="${id === 'pw-old' ? 'current-password' : 'new-password'}" placeholder="${placeholder}" class="${INPUT} pr-10">
        <button type="button" data-action="pw-toggle" data-value="${id}" class="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600" title="Show / hide">${ic('eye', 'w-4 h-4')}</button>
      </span>
      <span id="${id}-error" class="hidden block text-[11px] font-medium text-rose-600 mt-1"></span>
    </label>`;
  return `
    <div class="space-y-6 max-w-4xl">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">Change Password</h1>
        <p class="text-slate-500 text-sm">Signed in as <span class="font-mono">demo_merchant</span>. Last changed ${fmtDate(lastChanged)} — expires in ${90 - 62} days (mock).</p>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div class="lg:col-span-3 bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          ${pwField('pw-old', 'Old Password', 'Enter your current password')}
          ${pwField('pw-new', 'New Password', 'Enter your new password')}
          <div>
            <div class="h-1.5 rounded-full bg-slate-100 overflow-hidden"><div id="pw-meter" class="h-full rounded-full transition-all" style="width:0%"></div></div>
            <p id="pw-meter-label" class="text-[11px] text-slate-500 mt-1">Strength: —</p>
          </div>
          ${pwField('pw-confirm', 'Confirm New Password', 'Confirm your new password')}
          <div class="flex justify-end gap-2 pt-2">
            <button data-action="pw-clear" class="${BTN_SECONDARY}">Clear</button>
            <button data-action="pw-save" class="${BTN_PRIMARY}">${ic('key-round', 'w-4 h-4')}Update Password</button>
          </div>
        </div>
        <div class="lg:col-span-2 space-y-6">
          <section class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 class="text-sm font-bold text-slate-900 mb-3">Password Character Policy</h2>
            <ul class="space-y-2.5" id="pw-rules">
              ${PASSWORD_RULES.map((r, i) => `<li data-rule="${i}" class="flex items-start gap-2 text-xs text-slate-600 leading-relaxed"><span class="mt-0.5 shrink-0 text-slate-300" data-rule-icon>${ic('circle', 'w-3.5 h-3.5')}</span><span>${esc(r.text)}</span></li>`).join('')}
            </ul>
          </section>
          <section class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 class="text-sm font-bold text-slate-900 mb-3">Password Change Policy</h2>
            <ul class="space-y-2.5">${PASSWORD_CHANGE_POLICY.map(t => `<li class="flex items-start gap-2 text-xs text-slate-600 leading-relaxed"><span class="mt-1.5 w-1 h-1 rounded-full bg-primary-500 shrink-0"></span><span>${esc(t)}</span></li>`).join('')}</ul>
          </section>
        </div>
      </div>
    </div>`;
}

// Updates the rule checklist and meter in place; passwords are only read from the inputs, never stored.
function syncPasswordRules() {
  const p = $('#pw-new')?.value || '';
  let passed = 0;
  document.querySelectorAll('#pw-rules [data-rule]').forEach(li => {
    const ok = PASSWORD_RULES[Number(li.dataset.rule)].test(p);
    if (ok) passed++;
    li.classList.toggle('text-emerald-700', ok);
    li.classList.toggle('text-slate-600', !ok);
    const icon = li.querySelector('[data-rule-icon]');
    icon.className = `mt-0.5 shrink-0 ${ok ? 'text-emerald-600' : 'text-slate-300'}`;
    icon.innerHTML = ic(ok ? 'circle-check' : 'circle', 'w-3.5 h-3.5');
  });
  lucide.createIcons();
  const levels = [['—', '#e2e8f0'], ['Weak', '#f43f5e'], ['Weak', '#f43f5e'], ['Fair', '#f59e0b'], ['Fair', '#f59e0b'], ['Good', '#3987e5'], ['Strong', '#059669']];
  const [label, color] = p ? levels[passed] : levels[0];
  $('#pw-meter').style.width = `${p ? passed / PASSWORD_RULES.length * 100 : 0}%`;
  $('#pw-meter').style.background = color;
  $('#pw-meter-label').textContent = `Strength: ${label} · ${passed} of ${PASSWORD_RULES.length} rules met`;
}

function setPwError(id, msg) {
  const el = $(`#${id}-error`);
  el.textContent = msg;
  el.classList.toggle('hidden', !msg);
}

// ----- Transaction Profile (read-only) ---------------------------------
// What SSL has configured for one store. Merchants can't edit any of it here:
// changes go through a support ticket or the KAM.
const onOff = (on, yes = 'Enabled', no = 'Disabled') => `<span class="${STATUS_BADGE} ${on ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}">${on ? yes : no}</span>`;
const profileTile = (label, value) => `<div class="rounded-lg border border-slate-200 px-3 py-2.5"><p class="text-[11px] font-medium text-slate-500">${label}</p><p class="mt-1 text-sm font-semibold text-slate-900 break-words">${value}</p></div>`;
const capTile = (name, sub, on) => `<div class="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2.5 ${on ? '' : 'bg-slate-50'}"><div class="min-w-0"><p class="text-sm font-semibold ${on ? 'text-slate-900' : 'text-slate-500'}">${name}</p><p class="text-[11px] text-slate-500">${sub}</p></div>${onOff(on, 'On', 'Off')}</div>`;
const CAP_DESC = {
  'Regular Payment': 'Standard gateway checkout', 'Refund': 'Merchant-initiated refund', 'Partial Refund': 'Refund part of the amount', 'Digital EMI': 'Card instalments',
  'Payment Link': 'Shareable payment links', 'Digital Invoice': 'Invoice-based collection', 'Payment QR': 'Bangla QR collection', 'Saved Card': 'Tokenised card for returning customers', 'Escrow': 'Held until delivery is confirmed',
};

function renderTxnProfile() {
  const s = pageState();
  const st = accStore(s.store && s.store !== 'all' ? s.store : ACCOUNT_STORES[0].id);
  const p = TXN_PROFILES[st.id];
  const bank = STORE_BANK[st.id];
  const settleOn = !SETTLEMENT_DISABLED.has(st.id) && !!bank;
  const live = st.status === 'Active';
  const amt = (n) => st.currency === 'BDT' ? fmtBDT(n) : `${st.currency} ${n.toLocaleString()}`;
  const ipn = storeCfg(st.id).ipn;
  return `
    <div class="space-y-6">
      ${pageHeader('Transaction Profile', 'Payment channels, limits, settlement and gateway settings SSLCOMMERZ has set up for this store. This page is view only.', `
        <div class="flex flex-wrap gap-2">
          <button data-action="new-gt" class="${BTN_SECONDARY}">${ic('message-square', 'w-4 h-4')}Request Change</button>
          <button data-action="open-contacts" class="${BTN_PRIMARY}">${ic('headset', 'w-4 h-4')}Contact KAM</button>
        </div>`)}
      <div class="filter-bar-container flex items-center gap-3 flex-wrap">
        ${selectPill('list', 'store', 'Store', ACCOUNT_STORES.map(a => ({ label: a.name, value: a.id })), st.id)}
        <span class="inline-flex items-center gap-1.5 text-xs text-slate-500">${ic('lock', 'w-3.5 h-3.5')}Read only</span>
      </div>
      ${anCard('Profile Overview', 'Store and merchant-level transaction configuration', `
        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          ${profileTile('Store Name', esc(st.name))}
          ${profileTile('Store ID', `<span class="font-mono">${st.id}</span>`)}
          ${profileTile('Merchant ID', `<span class="font-mono">${p.mid}</span>`)}
          ${profileTile('Business Type', esc(p.business))}
          ${profileTile('Currency', st.currency)}
          ${profileTile('Store Type', esc(st.type))}
          ${profileTile('Transaction Status', onOff(live))}
          ${profileTile('Settlement Status', settleOn ? onOff(true) : `<span class="${STATUS_BADGE} bg-rose-50 text-rose-600">Disabled</span>`)}
        </div>`, '', live ? onOff(true, 'Active Store') : onOff(false, '', 'Inactive Store'))}
      <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
        ${anCard('Payment Channels', 'Channels this store accepts payments through', `
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">${METHODS.map(m => capTile(m.name, m.type, p.channels.includes(m.name))).join('')}</div>`, 'xl:col-span-2')}
        ${anCard('Settlement Profile', 'Where and how often payouts are made', `
          <div class="space-y-3">
            ${detailList([
              ['Status', settleOn ? onOff(true) : `<span class="${STATUS_BADGE} bg-rose-50 text-rose-600">Disabled</span>`],
              ['Frequency', p.frequency], ['Currency', st.currency],
              ['Settlement Bank', bank ? esc(`${bank.bank} — ${bank.branch}`) : ''],
              ['Account No', bank ? `<span class="font-mono">${bank.account}</span>` : ''],
            ])}
            ${!settleOn ? `<p class="text-xs text-rose-700">${bank ? 'Settlement is disabled for this store. Payments are held until your KAM enables it again.' : 'No settlement account yet — your KAM sets it up after KYC.'}</p>` : ''}
          </div>`)}
      </div>
      ${anCard('Transaction Limits', 'Per-payment and cumulative limits for this store', miniTable(['Limit', 'Amount'], [
        ['Minimum per transaction', amt(p.limits.minTxn)], ['Maximum per transaction', amt(p.limits.maxTxn)],
        ['Daily limit', amt(p.limits.daily)], ['Monthly limit', amt(p.limits.monthly)],
      ], { right: [1] }))}
      ${anCard('Transaction Capabilities', 'Services and features available for this store', `
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">${Object.entries(p.caps).map(([k, on]) => capTile(k, CAP_DESC[k], on)).join('')}</div>`)}
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
        ${anCard('Gateway Configuration', 'Payment processing settings', miniTable(['Configuration', 'Current Value', 'Status'], [
          ['Processing Mode', p.mode, onOff(live, 'Active', 'Inactive')],
          ['IPN Listener', ipn.listener ? 'Configured' : 'Not set', onOff(ipn.listenerOn, 'Active', 'Off')],
          ['Gateway Charge (TDR)', `As per agreement · <button data-action="store-charge" data-value="${st.id}" class="font-semibold text-primary-600 hover:underline">View</button>`, '<span class="' + STATUS_BADGE + ' bg-slate-100 text-slate-600">View only</span>'],
          ['Charge to Customer', esc(storeCfg(st.id).gw.chargeCustomer), onOff(storeCfg(st.id).gw.chargeCustomer !== 'Disabled')],
        ]))}
        ${anCard('Dispute &amp; Risk Profile', 'Capability-level status only', miniTable(['Item', 'Status', 'Remarks'], [
          ['Refund', onOff(p.caps.Refund), `Handled under <a href="#${REFUND_PATH}" class="text-primary-600 hover:underline">Dispute Management</a>`],
          ['Chargeback', onOff(true, 'Applicable'), `Handled under <a href="#${CB_PATH}" class="text-primary-600 hover:underline">Dispute Management</a>`],
          ['Escrow', onOff(p.caps.Escrow), p.caps.Escrow ? `Confirm delivery in <a href="#${SUP.service}" class="text-primary-600 hover:underline">Escrow Management</a>` : 'Not used by this store'],
          ['Card Data Display', '<span class="' + STATUS_BADGE + ' bg-slate-100 text-slate-600">Masked</span>', 'Full card numbers are never shown'],
        ]))}
      </div>
      <p class="flex items-start gap-1.5 text-[11px] text-slate-400">${ic('shield-check', 'w-3.5 h-3.5 shrink-0 mt-px')}Gateway, settlement and bank settings can't be edited here. Request a change by ticket or through your KAM; it is applied after SSLCOMMERZ approval. Limits and channels shown are mock data.</p>
    </div>`;
}
