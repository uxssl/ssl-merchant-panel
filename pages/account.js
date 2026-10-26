// =====================================================================
// Account & Settings
// =====================================================================
const ACC = { myStores: '/account/my-stores', storeList: '/account/store-list', groups: '/account/store-groups', users: '/account/user-management', password: '/account/change-password' };
const accStore = (id) => ACCOUNT_STORES.find(s => s.id === id);
const groupOf = (id) => STORE_GROUPS.find(g => g.id === id);
const storeTypeIcon = (type) => type === 'Only QR' ? 'qr-code' : type === 'Only Online' ? 'globe' : 'store';
let groupDraft = null;
let userDraft = null;

function storeStats(id) {
  const ok = TXNS.filter(t => t.store === id && t.status === 'success');
  const monthStart = new Date(NOW.getFullYear(), NOW.getMonth(), 1);
  const last30 = TXNS.filter(t => t.store === id && t.date >= addDays(TODAY, -29));
  const lastPaid = SETTLEMENTS.find(x => x.store === id && x.status === 'Paid');
  return {
    today: ok.filter(t => t.date >= TODAY).reduce((s, t) => s + t.amount, 0),
    month: ok.filter(t => t.date >= monthStart).reduce((s, t) => s + t.amount, 0),
    rate: last30.length ? pct(last30.filter(t => t.status === 'success').length, last30.length) : null,
    lastPaid,
  };
}

// ----- My Stores --------------------------------------------------------
function renderMyStores() {
  const active = ACCOUNT_STORES.filter(s => s.status === 'Active');
  return `
    <div class="space-y-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">My Stores</h1>
          <p class="text-slate-500 text-sm">Each store at a glance — sales, settlement and quick links.</p>
        </div>
        <button data-action="toast" data-msg="Prototype: new store requests go through your KAM." class="${BTN_PRIMARY} shrink-0">${ic('plus', 'w-4 h-4')}Request New Store</button>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        ${active.map(st => {
          const k = storeStats(st.id);
          const bank = STORE_BANK[st.id];
          return `
            <div class="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
              <div class="px-5 py-4 border-b border-slate-100 flex items-start gap-3">
                <span class="w-10 h-10 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">${ic(storeTypeIcon(st.type), 'w-5 h-5')}</span>
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-semibold text-slate-900 truncate">${esc(st.name)}</p>
                  <p class="text-xs text-slate-500"><span class="font-mono">${st.id}</span> · ${st.type} · ${st.currency}</p>
                </div>
                ${activeBadge(true)}
              </div>
              <div class="p-5 grid grid-cols-2 gap-3 flex-1">
                ${statBox('Today', st.currency === 'BDT' ? fmtBDTShort(k.today) : '—')}
                ${statBox('This Month', st.currency === 'BDT' ? fmtBDTShort(k.month) : '—')}
                ${statBox('Success Rate (30d)', k.rate == null ? '—' : fmtPct(k.rate))}
                ${statBox('Last Settlement', k.lastPaid ? fmtShort(k.lastPaid.date) : '—')}
                <div class="col-span-2 text-xs text-slate-500 flex items-center gap-1.5">${ic('landmark', 'w-3.5 h-3.5')}${bank ? `${bank.bank} · <span class="font-mono">${bank.account}</span>` : 'Settlement account not set up yet'}</div>
                ${st.currency === 'USD' ? '<p class="col-span-2 text-xs text-amber-700 bg-amber-50 rounded px-2 py-1.5">New store — no payments yet.</p>' : ''}
              </div>
              <div class="px-5 py-3 border-t border-slate-100 flex flex-wrap gap-2">
                <button data-action="store-txns" data-value="${st.id}" class="px-2.5 py-1.5 rounded border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50">Transactions</button>
                <button data-action="store-settlements" data-value="${st.id}" class="px-2.5 py-1.5 rounded border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50">Settlements</button>
                ${st.type !== 'Only Online' ? `<a href="#/products/payment-qr" class="px-2.5 py-1.5 rounded border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50">QR</a>` : ''}
                <button data-action="open-store" data-value="${st.id}" class="ml-auto px-2.5 py-1.5 rounded text-xs font-semibold text-primary-600 hover:bg-primary-50">Store details</button>
              </div>
            </div>`;
        }).join('')}
      </div>
      ${ACCOUNT_STORES.some(s => s.status !== 'Active') ? `<p class="text-xs text-slate-500">${ACCOUNT_STORES.filter(s => s.status !== 'Active').length} inactive store hidden here — see <a href="#/account/store-list" class="text-primary-600 hover:underline">Store List</a>.</p>` : ''}
    </div>`;
}

function storeDrawer(st) {
  const bank = STORE_BANK[st.id];
  return drawerShell({
    wide: true,
    title: esc(st.name),
    sub: `<span class="font-mono text-xs">${st.id}</span>${activeBadge(st.status === 'Active')}`,
    body: `
      ${section('Store Information', kvGrid([
        kv('Store Id', st.id, true), kv('Store Name', esc(st.name)), kv('Type', st.type), kv('Currency', st.currency), kv('EMI Status', st.emi), kv('Created On', fmtDate(st.created)),
      ]))}
      ${section('Account Information', bank ? kvGrid([
        kv('Account Payee', esc(bank.payee)), kv('Bank', bank.bank), kv('Branch Name', bank.branch),
        kv('Account Number', bank.account, true), kv('Routing Number', bank.routing, true), kv('Payment Type', 'BEFTN'),
      ]) : '<p class="text-sm text-slate-500">No settlement account yet — your KAM sets it up after KYC.</p>')}
      ${section('Settlement Information', kvGrid([
        kv('Settl. Status', st.status === 'Active' ? activeBadge(true) : activeBadge(false)), kv('Settl. Day', 'Next working day (mock)'), kv('Settl. Type', 'Daily'),
        kv('Max Trans Amount', '৳5,00,000 (mock)'), kv('Min Trans Amount', '৳10 (mock)'),
      ]))}
      ${section('Tran. Config', kvGrid([
        kv('Base URL of Store', st.baseUrl || '—', true), kv('Home Page of Store', st.baseUrl || '—', true),
        kv('Default Gateway Duration', '30 minutes (mock)'), kv('Store Status', st.status),
      ]))}
      ${section('Contact Information', kvGrid([
        kv('Name', 'Demo Merchant Ltd.'), kv('Mailing Address', esc(st.address)), kv('Email', 'm•••••@example.com'), kv('Mobile', '01•••••000', true),
      ]))}
      <div class="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-600">${ic('shield-check', 'w-4 h-4 mt-px shrink-0 text-slate-500')}<span>Store password and API credentials are not shown here. Find integration details under <a href="#/others/developer-information" class="text-primary-600 hover:underline">Developer / Technical Information</a>; never share them by email or chat.</span></div>`,
    footer: `
      <button data-action="toast" data-msg="Prototype: store change requests go through your KAM." class="${BTN_SECONDARY}">${ic('pencil', 'w-4 h-4')}Request Change</button>
      <button data-action="store-txns" data-value="${st.id}" class="${BTN_PRIMARY}">${ic('list', 'w-4 h-4')}View Transactions</button>`,
  });
}

// ----- Store List ------------------------------------------------------
function renderStoreList() {
  const s = pageState();
  const q = s.search.trim().toLowerCase();
  const rows = ACCOUNT_STORES.filter(st =>
    (!q || st.id.includes(q) || st.name.toLowerCase().includes(q) || st.baseUrl.includes(q)) &&
    (s.currency === 'all' || st.currency === s.currency) && (s.emi === 'all' || st.emi === s.emi) &&
    (s.stype === 'all' || st.type === s.stype) && (s.status === 'all' || st.status === s.status));
  const opts = (list, all) => [{ label: all, value: 'all' }, ...list.map(v => ({ label: v, value: v }))];
  const cols = [
    { label: 'Store', cell: st => `<div class="font-medium text-slate-800">${esc(st.name)}</div><div class="text-[11px] font-mono text-slate-500">${st.id}</div>` },
    { label: 'Base URL', cls: 'hidden xl:table-cell', cell: st => st.baseUrl ? `<span class="font-mono text-xs">${st.baseUrl}</span>` : '<span class="text-slate-400">—</span>' },
    { label: 'Currency', cell: st => st.currency },
    { label: 'EMI Status', cls: 'hidden md:table-cell', cell: st => `<span class="${STATUS_BADGE} ${st.emi === 'EMI Enabled' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}">${st.emi}</span>` },
    { label: 'Type', cell: st => `<span class="inline-flex items-center gap-1.5 text-xs">${ic(storeTypeIcon(st.type), 'w-3.5 h-3.5 text-slate-400')}${st.type}</span>` },
    { label: 'Status', cell: st => activeBadge(st.status === 'Active') },
  ];
  return `
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">Store List</h1>
        <p class="text-slate-500 text-sm">All stores under your merchant account, including inactive ones.</p>
      </div>
      <div class="flex flex-col">
        ${listFilterBar(s, 'Store ID, name or Base URL',
          selectPill('list', 'currency', 'Currency', opts(['BDT', 'USD', 'EUR'], 'All Currencies'), s.currency, 'banknote') +
          selectPill('list', 'emi', 'EMI Status', opts(['EMI Enabled', 'No EMI'], 'All'), s.emi, 'percent') +
          selectPill('list', 'stype', 'Type', opts(['Only Online', 'Only QR', 'Online & QR'], 'All Types'), s.stype, 'layers') +
          selectPill('list', 'status', 'Status', opts(['Active', 'Inactive'], 'All Status'), s.status, 'circle-dot'),
          { noDate: true, noStore: true })}
        <div class="space-y-4 pt-6">
          <p class="text-sm text-slate-500"><span class="font-semibold text-slate-900">${rows.length}</span> of ${ACCOUNT_STORES.length} stores</p>
          ${dataTable({ cols, rows, rowAttrs: st => `data-action="open-store" data-value="${st.id}"`, emptyTitle: 'No stores match these filters', emptyHint: 'Try clearing some filters.' })}
        </div>
      </div>
    </div>`;
}

// ----- Store Groups ----------------------------------------------------
function renderStoreGroups() {
  return `
    <div class="space-y-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">Store Groups</h1>
          <p class="text-slate-500 text-sm">Group stores to control which stores each portal user can see.</p>
        </div>
        <button data-action="new-group" class="${BTN_PRIMARY} shrink-0">${ic('plus', 'w-4 h-4')}Create Group</button>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        ${STORE_GROUPS.map(g => {
          const users = USERS.filter(u => u.group === g.id);
          return `
            <button data-action="open-group" data-value="${g.id}" class="text-left bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all p-5 flex flex-col gap-3">
              <div class="flex items-start justify-between gap-2">
                <div><p class="text-sm font-semibold text-slate-900">${esc(g.name)}</p><p class="text-xs text-slate-500 mt-0.5">${esc(g.description || '')}</p></div>
                ${g.system ? '<span class="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Default</span>' : ''}
              </div>
              <div class="flex flex-wrap gap-1.5">${g.stores.map(id => `<span class="px-2 py-0.5 rounded-full bg-slate-100 text-xs text-slate-700">${esc(accStore(id).name)}</span>`).join('')}</div>
              <p class="text-xs text-slate-500 mt-auto flex items-center gap-1.5">${ic('users', 'w-3.5 h-3.5')}${users.length} user${users.length === 1 ? '' : 's'} · ${g.stores.length} store${g.stores.length === 1 ? '' : 's'}</p>
            </button>`;
        }).join('')}
      </div>
    </div>`;
}

function groupDrawer(g) {
  const users = USERS.filter(u => u.group === g.id);
  return drawerShell({
    title: esc(g.name),
    sub: `<span>${g.stores.length} stores · ${users.length} users</span>`,
    body: `
      ${g.description ? `<p class="text-sm text-slate-600">${esc(g.description)}</p>` : ''}
      ${section('Stores', `<div class="divide-y divide-slate-100 rounded-lg border border-slate-200">${g.stores.map(id => { const st = accStore(id); return `<div class="flex items-center justify-between px-3 py-2.5"><span><span class="block text-sm text-slate-800">${esc(st.name)}</span><span class="block text-[11px] font-mono text-slate-500">${st.id}</span></span>${activeBadge(st.status === 'Active')}</div>`; }).join('')}</div>`)}
      ${section('Users with access', users.length ? `<div class="divide-y divide-slate-100 rounded-lg border border-slate-200">${users.map(u => `<button data-action="open-user" data-value="${u.login}" class="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-slate-50"><span><span class="block text-sm text-slate-800">${esc(u.name)}</span><span class="block text-[11px] text-slate-500">${u.role}</span></span>${activeBadge(u.status === 'Active')}</button>`).join('')}</div>` : '<p class="text-sm text-slate-500">No users are assigned to this group.</p>')}`,
    footer: g.system ? '<span class="text-xs text-slate-500">The default group always contains every store.</span>' : `
      ${users.length ? '' : `<button data-action="delete-group" data-value="${g.id}" class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-rose-600 bg-white border border-rose-200 rounded shadow-sm hover:bg-rose-50">${ic('trash-2', 'w-4 h-4')}Delete Group</button>`}
      <button data-action="edit-group" data-value="${g.id}" class="${BTN_PRIMARY}">${ic('pencil', 'w-4 h-4')}Edit Group</button>`,
  });
}

function groupFormDrawer() {
  const d = groupDraft;
  return drawerShell({
    title: d.id ? 'Edit Store Group' : 'Create Store Group',
    sub: '<span>Users assigned to this group only see these stores</span>',
    body: `
      ${field('Group Name', `<input data-group="name" value="${esc(d.name)}" placeholder="e.g. Chattogram outlets" class="${INPUT}">`, { required: true, error: formErrors.name })}
      ${field('Description', `<input data-group="description" value="${esc(d.description)}" placeholder="(optional)" class="${INPUT}">`)}
      ${section('Stores', `<div class="space-y-2">${ACCOUNT_STORES.map(st => `
        <label class="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 hover:bg-slate-50 cursor-pointer">
          <input type="checkbox" data-group-store="${st.id}" ${d.stores.includes(st.id) ? 'checked' : ''} class="rounded border-slate-300 text-primary-600">
          <span class="flex-1 text-sm text-slate-800">${esc(st.name)}</span>${st.status !== 'Active' ? activeBadge(false) : ''}</label>`).join('')}
        ${formErrors.stores ? `<p class="text-[11px] font-medium text-rose-600">${formErrors.stores}</p>` : ''}</div>`)}`,
    footer: `
      <button data-action="close-drawer" class="${BTN_SECONDARY}">Cancel</button>
      <button data-action="save-group" class="${BTN_PRIMARY}">${ic('save', 'w-4 h-4')}Save Group</button>`,
  });
}

// ----- User Management -------------------------------------------------
const ROLE_PERMISSIONS = [
  ['View transactions & reports', true, true, true],
  ['Export data (CSV / PDF)', true, true, false],
  ['Refund & chargeback requests', true, false, false],
  ['Payment links & invoices', true, true, false],
  ['Campaigns', true, false, false],
  ['Settlement & financial reports', true, true, false],
  ['Raise support tickets', true, true, true],
  ['Manage users, stores & groups', true, false, false],
];

function renderUsers() {
  const s = pageState();
  const q = s.search.trim().toLowerCase();
  const rows = USERS.filter(u =>
    (!q || u.login.includes(q) || u.name.toLowerCase().includes(q)) &&
    (s.status === 'all' || u.status === s.status) && (s.role === 'all' || u.role === s.role));
  const cols = [
    { label: 'User', cell: u => `<div class="flex items-center gap-2.5"><span class="w-8 h-8 rounded-full bg-slate-700 text-white text-xs font-semibold flex items-center justify-center shrink-0">${esc(u.name[0])}</span><span><span class="block font-medium text-slate-800">${esc(u.name)}</span><span class="block text-[11px] font-mono text-slate-500">${u.login}</span></span></div>` },
    { label: 'Role', cell: u => `<span class="text-xs text-slate-700">${u.role}</span>` },
    { label: 'Store Group', cls: 'hidden lg:table-cell', cell: u => `<span class="text-xs text-slate-600">${esc(groupOf(u.group)?.name || '—')}</span>` },
    { label: 'Email', cls: 'hidden xl:table-cell', cell: u => `<span class="text-xs">${u.email}</span>` },
    { label: 'Last Login', cls: 'hidden md:table-cell', cell: u => `<span class="text-xs whitespace-nowrap">${fmtDate(u.lastLogin)}</span>` },
    { label: 'Status', cell: u => activeBadge(u.status === 'Active') },
  ];
  const opts = (list, all) => [{ label: all, value: 'all' }, ...list.map(v => ({ label: v, value: v }))];
  return `
    <div class="space-y-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">User Management</h1>
          <p class="text-slate-500 text-sm">Who can sign in to this portal, what they can do, and which stores they see.</p>
        </div>
        <button data-action="new-user" class="${BTN_PRIMARY} shrink-0">${ic('user-plus', 'w-4 h-4')}Add User</button>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        ${metricCard({ title: 'Total Users', value: USERS.length, status: 'all', selected: s.status === 'all' })}
        ${metricCard({ title: 'Active', value: USERS.filter(u => u.status === 'Active').length, status: 'Active', selected: s.status === 'Active' })}
        ${metricCard({ title: 'Inactive', value: USERS.filter(u => u.status === 'Inactive').length, status: 'Inactive', selected: s.status === 'Inactive' })}
        ${metricCard({ title: 'Admins', value: USERS.filter(u => u.role === 'Merchant Admin').length, sub: 'can manage users & stores' })}
      </div>
      <div class="flex flex-col">
        ${listFilterBar(s, 'Login ID or User Name',
          selectPill('list', 'status', 'Status', opts(['Active', 'Inactive'], 'All Status'), s.status, 'circle-dot') +
          selectPill('list', 'role', 'Role', opts(USER_ROLES, 'All Roles'), s.role, 'shield'), { noDate: true, noStore: true })}
        <div class="space-y-4 pt-6">
          ${dataTable({ cols, rows, rowAttrs: u => `data-action="open-user" data-value="${u.login}"`, emptyTitle: 'No users match these filters', emptyHint: 'Try clearing some filters.' })}
        </div>
      </div>
      ${anCard('Role Permissions', 'What each role can do (mock)', miniTable(['Feature', ...USER_ROLES],
        ROLE_PERMISSIONS.map(([f, ...allowed]) => [f, ...allowed.map(a => a ? '<span class="text-emerald-600 font-semibold">Yes</span>' : '<span class="text-slate-400">—</span>')]), { right: [] }))}
    </div>`;
}

function userDrawer(u) {
  const g = groupOf(u.group);
  const isSelf = u.login === 'demo_merchant';
  return drawerShell({
    title: esc(u.name),
    sub: `<span class="font-mono text-xs">${u.login}</span>${activeBadge(u.status === 'Active')}`,
    body: `
      ${section('User', kvGrid([
        kv('User Name', esc(u.name)), kv('Login Name', u.login, true), kv('Email Address', u.email), kv('Mobile Number', u.mobile, true),
        kv('User Role', u.role), kv('Merchant App Role', u.appRole), kv('Store Group', esc(g?.name || '—')), kv('Login Status', u.status === 'Active' ? 'Active' : 'De-active'),
        `<div class="col-span-2">${kv('Allowed IP List', u.ips || 'Any IP')}</div>`,
      ]))}
      ${section('Activity', kvGrid([kv('Last Login', `${fmtDate(u.lastLogin)}, ${fmtTime(u.lastLogin)}`), kv('Created On', fmtDate(u.created))]))}
      ${section('Stores this user can see', g ? `<div class="flex flex-wrap gap-1.5">${g.stores.map(id => `<span class="px-2 py-0.5 rounded-full bg-slate-100 text-xs text-slate-700">${esc(accStore(id).name)}</span>`).join('')}</div>` : '—')}
      ${section('Permissions', `<div class="space-y-1.5">${ROLE_PERMISSIONS.map(([f, ...allowed]) => { const on = allowed[USER_ROLES.indexOf(u.role)]; return `<div class="flex items-center gap-2 text-sm ${on ? 'text-slate-800' : 'text-slate-400'}">${ic(on ? 'check' : 'minus', `w-4 h-4 ${on ? 'text-emerald-600' : ''}`)}${f}</div>`; }).join('')}</div>`)}`,
    footer: isSelf ? '<span class="text-xs text-slate-500">This is your own account — change your password from Change Password.</span>' : `
      <button data-action="toast" data-msg="Prototype: no password reset email was sent." class="${BTN_SECONDARY}">${ic('key-round', 'w-4 h-4')}Send Password Reset</button>
      <button data-action="user-toggle" data-value="${u.login}" class="${u.status === 'Active' ? 'flex items-center gap-2 px-4 py-2 text-sm font-medium text-rose-600 bg-white border border-rose-200 rounded shadow-sm hover:bg-rose-50' : BTN_PRIMARY}">${ic(u.status === 'Active' ? 'user-x' : 'user-check', 'w-4 h-4')}${u.status === 'Active' ? 'Deactivate' : 'Activate'}</button>`,
  });
}

function userFormDrawer() {
  const d = userDraft;
  const inp = (key, attrs = '') => `<input data-user="${key}" value="${esc(d[key])}" class="${INPUT}" ${attrs}>`;
  return drawerShell({
    wide: true,
    title: 'Add User',
    sub: '<span>The user gets an email to set their own password</span>',
    body: `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        ${field('Merchant Name', `<input value="Demo Merchant Ltd." disabled class="${INPUT} bg-slate-50 text-slate-500">`)}
        ${field('User Name', inp('name', 'placeholder="Full name"'), { required: true, error: formErrors.name })}
        ${field('Mobile Number', inp('mobile', 'inputmode="numeric" placeholder="01XXXXXXXXX"'), { required: true, error: formErrors.mobile })}
        ${field('Email Address', inp('email', 'type="email" placeholder="name@company.com"'), { required: true, error: formErrors.email })}
        ${field('Login Name', inp('login', 'placeholder="e.g. accounts_2"'), { required: true, error: formErrors.login, hint: 'Lowercase letters, numbers and _ only' })}
        ${field('User Role', `<select data-user="role" class="${INPUT}">${options([['', 'Select user role'], ...USER_ROLES.map(r => [r, r])], d.role)}</select>`, { required: true, error: formErrors.role })}
        ${field('Store Group', `<select data-user="group" class="${INPUT}">${options(STORE_GROUPS.map(g => [g.id, g.name]), d.group)}</select>`)}
        ${field('Merchant App Role', `<select data-user="appRole" class="${INPUT}">${options(['Merchant App Role'], d.appRole)}</select>`)}
        <div class="sm:col-span-2">${field('Allowed IP List', inp('ips', 'placeholder="Multiple IPs could be configured by comma separate."'), { error: formErrors.ips, hint: 'Leave empty to allow any IP' })}</div>
        ${field('Login Status', `<select data-user="status" class="${INPUT}">${options([['Active', 'Active'], ['Inactive', 'De-active']], d.status)}</select>`)}
      </div>
      <p class="text-xs text-slate-500">Passwords are never set or shown by an admin — the new user sets their own from the email link.</p>`,
    footer: `
      <button data-action="close-drawer" class="${BTN_SECONDARY}">Cancel</button>
      <button data-action="save-user" class="${BTN_PRIMARY}">${ic('user-plus', 'w-4 h-4')}Add User</button>`,
  });
}

function validateUser() {
  const d = userDraft, e = {};
  if (!d.name.trim()) e.name = 'Enter the user name.';
  if (!/^01[3-9]\d{8}$/.test(d.mobile.trim())) e.mobile = 'Enter an 11-digit mobile number starting with 01.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) e.email = 'Enter a valid email address.';
  if (!/^[a-z0-9_]{4,30}$/.test(d.login.trim())) e.login = 'Use 4–30 lowercase letters, numbers or _.';
  else if (USERS.some(u => u.login === d.login.trim())) e.login = 'This login name is already taken.';
  if (!d.role) e.role = 'Choose a role.';
  const ips = d.ips.split(',').map(x => x.trim()).filter(Boolean);
  if (ips.some(ip => !/^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/.test(ip))) e.ips = 'Enter IPv4 addresses separated by commas.';
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
