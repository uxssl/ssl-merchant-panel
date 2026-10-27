// =====================================================================
// Account & Settings
// =====================================================================
const ACC = { storeList: '/account/store-list', groups: '/account/store-groups', users: '/account/user-management', password: '/account/change-password' };
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

const STORE_VIEW_MENU = [['store-charge', 'Gateway Charge'], ['open-store', 'Store Details'], ['store-bank', 'Settlement Bank Details']];
const STORE_SET_MENU = [['store-set-group', 'Set Group'], ['store-ipn', 'IPN Settings'], ['store-gw', 'GW Settings']];
const rowMenu = (key, icon, cls, items, id, label) => `
  <div class="relative" data-dd-root>
    <button data-action="dd-toggle" data-key="${key}" aria-haspopup="menu" aria-expanded="${openDD === key}" aria-label="${label}" title="${label}" class="inline-flex items-center gap-0.5 px-2 py-1 rounded text-white ${cls}">${ic(icon, 'w-3.5 h-3.5')}${ic('chevron-down', 'w-3 h-3')}</button>
    ${openDD === key ? `<div role="menu" class="absolute right-0 top-full mt-1 w-52 bg-white rounded-lg shadow-lg border border-slate-200 z-50 py-1 anim-pop">
      ${items.map(([action, text]) => `<button role="menuitem" data-action="${action}" data-value="${id}" class="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">${text}</button>`).join('')}
    </div>` : ''}
  </div>`;

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
  const cols = [
    { label: 'Store ID', cell: st => `<span class="font-mono text-xs text-slate-800">${st.id}</span>` },
    { label: 'Store Name', cell: st => `<span class="font-medium text-slate-800">${esc(st.name)}</span>` },
    { label: 'Base URL', cls: 'hidden lg:table-cell', cell: st => st.baseUrl ? `<span class="font-mono text-xs">${esc(st.baseUrl.replace(/^https?:\/\//, ''))}</span>` : '<span class="text-slate-400">—</span>' },
    { label: 'Group', cell: st => storeGroupOf(st.id) ? `<span class="text-xs text-slate-700">${esc(storeGroupOf(st.id).name)}</span>` : '<span class="text-slate-400">—</span>' },
    { label: 'Status', cell: st => activeBadge(st.status === 'Active') },
    { label: 'Action', cell: st => `<div class="flex items-center gap-1">
      ${rowMenu(`store-view:${st.id}`, 'eye', 'bg-[#0b3a63] hover:opacity-90', STORE_VIEW_MENU, st.id, `View menu for ${st.id}`)}
      ${rowMenu(`store-set:${st.id}`, 'settings', 'bg-cyan-600 hover:bg-cyan-700', STORE_SET_MENU, st.id, `Settings menu for ${st.id}`)}
    </div>` },
  ];
  return `
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">Store List</h1>
        <p class="text-slate-500 text-sm">All stores under your merchant account, including inactive ones.</p>
      </div>
      <div class="flex flex-col">
        ${listFilterBar(s, 'Store ID, Store Name or Base URL',
          selectPill('list', 'stype', 'Store Group', groupOpts, s.stype) +
          selectPill('list', 'status', 'Status', statusOpts, s.status),
          { noDate: true, noStore: true })}
        <div class="space-y-4 pt-6">
          <p class="text-sm text-slate-500"><span class="font-semibold text-slate-900">${rows.length}</span> of ${ACCOUNT_STORES.length} stores</p>
          ${dataTable({ cols, rows, rowAttrs: () => '', emptyTitle: 'No stores match these filters', emptyHint: 'Try clearing some filters.', menus: true })}
        </div>
      </div>
    </div>`;
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
    { label: 'Action', cell: g => `<button data-action="edit-group" data-value="${g.id}" title="Edit" aria-label="Edit ${esc(g.name)}" class="p-1.5 rounded bg-[#0b3a63] text-white hover:opacity-90">${ic('square-pen', 'w-3.5 h-3.5')}</button>` },
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
      <button data-action="open-user" data-value="${u.login}" title="Details" aria-label="Details of ${u.login}" class="p-1.5 rounded bg-[#0b3a63] text-white hover:opacity-90">${ic('eye', 'w-3.5 h-3.5')}</button>
      <button data-action="edit-user" data-value="${u.login}" title="Update" aria-label="Update ${u.login}" class="p-1.5 rounded bg-cyan-600 text-white hover:bg-cyan-700">${ic('square-pen', 'w-3.5 h-3.5')}</button>
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
      <button data-action="edit-user" data-value="${u.login}" class="${BTN_PRIMARY}">${ic('square-pen', 'w-4 h-4')}Update</button>`,
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
