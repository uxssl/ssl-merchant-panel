// =====================================================================
// Sidebar & header (KAM layout: Sidebar.tsx, Header.tsx)
// =====================================================================
const tip = (text) => `<span class="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 hidden group-hover:block z-50 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg shadow-xl whitespace-nowrap">${text}</span>`;

function navItem(item, path) {
  if (!item.children) {
    const active = item.to === path || !!item.pages?.some(p => p.to === path);
    const cls = active ? 'bg-white text-primary-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:bg-slate-100';
    if (navCollapsed) {
      return `<div class="relative group"><a href="#${item.to}" aria-label="${esc(item.label)}" class="w-full flex items-center justify-center p-2.5 rounded-md transition-all duration-200 ${cls}">${ic(item.icon, `w-5 h-5 ${active ? '' : 'portal-icon-control'}`)}</a>${tip(item.label)}</div>`;
    }
    return `<a href="#${item.to}" class="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${cls}">${ic(item.icon, `w-5 h-5 min-w-[20px] ${active ? '' : 'portal-icon-muted'}`)}<span class="truncate">${item.label}</span></a>`;
  }

  const parentActive = item.children.some(c => c.to === path);
  const open = expanded === item.key;
  if (navCollapsed) {
    const cls = parentActive ? 'bg-white text-primary-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:bg-slate-100';
    return `<div class="relative group"><button data-action="nav-parent" data-key="${item.key}" aria-label="${esc(item.label)}" class="w-full flex items-center justify-center p-2.5 rounded-md transition-all duration-200 ${cls}">${ic(item.icon, `w-5 h-5 ${parentActive ? '' : 'portal-icon-control'}`)}</button>${tip(item.label)}</div>`;
  }
  return `
    <div>
      <button data-action="nav-parent" data-key="${item.key}" class="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-slate-100 ${open || parentActive ? 'text-slate-900' : 'text-slate-600'}">
        <span class="flex items-center gap-3 min-w-0">${ic(item.icon, `w-5 h-5 min-w-[20px] ${parentActive ? 'text-primary-600' : 'portal-icon-muted'}`)}<span class="text-left leading-snug">${item.label}</span></span>
        ${ic('chevron-down', `w-4 h-4 shrink-0 ${open ? 'rotate-180' : ''}`)}
      </button>
      ${open ? `
        <div class="ml-9 space-y-1 mt-1 mb-2">
          ${item.children.map(c => `<a href="#${c.to}" class="block px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${c.to === path ? 'text-primary-600 bg-slate-100' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}">${c.label}</a>`).join('')}
        </div>` : ''}
    </div>`;
}

function renderSidebar() {
  const path = currentPath();
  const el = $('#sidebar');
  const phone = isPhone();
  navCollapsed = collapsed && !phone;
  el.className = `sidebar-container bg-slate-50 border-r border-slate-200 h-screen flex flex-col fixed left-0 top-0 z-[100] transition-all duration-300 ease-in-out ${navCollapsed ? 'w-20' : 'w-64'} ${phone ? (mobileNav ? 'translate-x-0 shadow-2xl' : '-translate-x-full') : ''}`;
  $('#nav-backdrop').classList.toggle('hidden', !(phone && mobileNav));
  const toggleBtn = (icon, title) => `<button data-action="toggle-sidebar" class="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors" title="${title}">${ic(icon, 'w-5 h-5')}</button>`;
  el.innerHTML = `
    <div class="h-16 flex items-center border-b border-slate-100 shrink-0 ${navCollapsed ? 'px-4 justify-center' : 'px-6 justify-between'}">
      ${navCollapsed ? toggleBtn('panel-left-open', 'Expand sidebar') : `<img src="${LOGO}" alt="SSLCOMMERZ" class="h-8">${phone ? `<button data-action="mobile-nav" aria-label="Close menu" class="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">${ic('x', 'w-5 h-5')}</button>` : toggleBtn('panel-left-close', 'Collapse sidebar')}`}
    </div>
    <nav class="flex-1 py-4 space-y-1 scrollbar-hide ${navCollapsed ? 'px-2 overflow-visible' : 'px-3 overflow-y-auto'}">
      ${NAV.filter(item => !item.bottom).map(item => navItem(item, path)).join('')}
    </nav>
    <nav aria-label="More and help" class="shrink-0 border-t border-slate-200 py-3 space-y-1 ${navCollapsed ? 'px-2 overflow-visible' : 'px-3 max-h-[50vh] overflow-y-auto scrollbar-hide'}">
      ${NAV.filter(item => item.bottom).map(item => navItem(item, path)).join('')}
    </nav>`;
  $('#main-wrap').classList.toggle('pl-64', !phone && !navCollapsed);
  $('#main-wrap').classList.toggle('pl-20', !phone && navCollapsed);
}

// ---------------------------------------------------------------------
// Header search & notifications. Both drop down under their trigger on
// tablet / desktop and span the screen under the header on phones.
// ---------------------------------------------------------------------
const HEADER_PANEL = 'fixed sm:absolute left-4 right-4 top-16 sm:top-full mt-0 sm:mt-2 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden anim-pop';
const PAGE_LINKS = NAV.flatMap(n => [
  ...(n.to ? [{ label: n.label, to: n.to, icon: n.icon }] : []),
  ...(n.children || n.pages || []).map(c => ({ ...c, parent: n.label, icon: n.icon })),
]);
const QUICK_PAGES = ['/transactions/all', '/dispute/refund-requests', '/analytics/settlement-report', '/products/payment-links', '/products/digital-invoices', '/support/transaction-tickets'];

const timeAgo = (d) => {
  const mins = Math.round((NOW - d) / 60000);
  return mins < 60 ? `${Math.max(1, mins)}m ago` : mins < 1440 ? `${Math.round(mins / 60)}h ago` : mins < 2880 ? 'Yesterday' : fmtShort(d);
};

function searchBox() {
  const open = headerMenu === 'search';
  return `
    <div class="relative flex-1 min-w-0 max-w-sm" data-header-menu>
      <div class="flex items-center gap-2 px-3 py-2 bg-slate-50 border rounded-md transition-colors ${open ? 'border-primary-500 ring-2 ring-primary-100 bg-white' : 'border-slate-200 hover:bg-slate-100 hover:border-slate-300'}">
        ${ic('search', 'w-4 h-4 text-slate-400 shrink-0')}
        <input id="global-search" type="text" autocomplete="off" value="${esc(search.q)}" placeholder="Search transactions, invoices, stores..."
          data-action="header-menu" data-value="search" role="combobox" aria-expanded="${open}" aria-controls="search-results" aria-label="Search the portal"
          class="peer flex-1 min-w-0 bg-transparent text-sm text-slate-800 placeholder-slate-500 focus:outline-none">
        <button data-action="search-clear" aria-label="Clear search" class="peer-placeholder-shown:hidden text-slate-400 hover:text-slate-600">${ic('x', 'w-3.5 h-3.5')}</button>
        <kbd class="hidden sm:peer-placeholder-shown:inline-block px-1.5 py-0.5 text-xs font-medium text-slate-500 bg-white border border-slate-200 rounded shadow-sm">⌘K</kbd>
      </div>
      ${open ? `<div class="${HEADER_PANEL} sm:left-0 sm:right-auto sm:w-[480px]"><div id="search-results" role="listbox" class="max-h-[420px] overflow-y-auto py-2">${searchResults()}</div></div>` : ''}
    </div>`;
}

function searchResults() {
  const q = search.q.trim().toLowerCase();
  const has = (...fields) => fields.some(f => f && String(f).toLowerCase().includes(q));
  const group = (title, rows) => rows.length ? `<p class="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">${title}</p>${rows.join('')}` : '';
  let i = 0;
  const row = (kind, value, icon, title, sub, right = '') => `
    <button data-action="search-go" data-kind="${kind}" data-value="${esc(value)}" data-search-item="${i}" role="option"
      class="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-slate-50 ${i++ === search.active ? 'bg-slate-100' : ''}">
      <span class="w-8 h-8 shrink-0 flex items-center justify-center">${ic(icon, 'w-5 h-5 portal-icon-muted')}</span>
      <span class="flex-1 min-w-0"><span class="block text-sm font-medium text-slate-800 truncate">${title}</span>${sub ? `<span class="block text-xs text-slate-500 truncate">${sub}</span>` : ''}</span>
      ${right ? `<span class="text-xs font-medium text-slate-600 whitespace-nowrap">${right}</span>` : ''}
    </button>`;

  if (!q) {
    return group('Jump to', PAGE_LINKS.filter(p => QUICK_PAGES.includes(p.to)).map(p => row('page', p.to, p.icon, esc(p.label), esc(p.parent || ''))))
      + `<p class="px-4 pt-3 pb-1 text-xs text-slate-400">Search by transaction ID, Val ID, customer, invoice, payment link, store or page.</p>`;
  }
  const html = [
    group('Pages', PAGE_LINKS.filter(p => has(p.label, p.parent)).slice(0, 4).map(p => row('page', p.to, p.icon, esc(p.label), esc(p.parent || '')))),
    group('Transactions', TXNS.filter(t => has(t.id, t.valId, t.customer)).slice(0, 5).map(t => row('txn', t.id, 'credit-card', `<span class="font-mono">${t.id}</span>`, `${esc(t.customer)} · ${esc(t.storeName)} · ${fmtShort(t.date)}`, fmtBDT(t.amount)))),
    group('Invoices', INVOICES.filter(inv => has(inv.no, inv.customer)).slice(0, 3).map(inv => row('invoice', inv.no, 'file-text', esc(inv.no), `${esc(inv.customer)} · ${inv.status}`))),
    group('Payment Links', PAYMENT_LINKS.filter(l => has(l.name, l.ref)).slice(0, 3).map(l => row('link', l.ref, 'link', esc(l.name), `<span class="font-mono">${l.ref}</span>`))),
    group('Stores', ACCOUNT_STORES.filter(s => has(s.name, s.id)).slice(0, 3).map(s => row('store', s.id, 'store', esc(s.name), `<span class="font-mono">${s.id}</span> · ${s.status}`))),
  ].join('');
  return html || `
    <div class="px-4 py-8 text-center">
      <p class="text-sm font-medium text-slate-700">No results for “${esc(search.q.trim())}”</p>
      <p class="text-xs text-slate-500 mt-1">Check the ID, or look it up in <a href="#/transactions/tracking" class="text-primary-600 hover:underline">Transaction ID Tracking</a>.</p>
    </div>`;
}

function notificationBell() {
  const open = headerMenu === 'notifications';
  const unread = NOTIFICATIONS.filter(n => !n.read).length;
  const TONE = { rose: 'bg-rose-50 text-rose-600', amber: 'bg-amber-50 text-amber-600', emerald: 'bg-emerald-50 text-emerald-600', primary: 'bg-primary-50 text-primary-600' };
  return `
    <div class="sm:relative" data-header-menu>
      <button data-action="header-menu" data-value="notifications" aria-label="Notifications${unread ? ` (${unread} unread)` : ''}" aria-expanded="${open}" class="p-2 rounded-full transition-colors relative ${open ? 'bg-slate-100 text-slate-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}">
        ${ic('bell', 'w-5 h-5')}
        ${unread ? `<span class="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 border-2 border-white text-[10px] font-bold leading-[14px] text-white text-center">${unread}</span>` : ''}
      </button>
      ${open ? `
        <div class="${HEADER_PANEL} sm:left-auto sm:right-0 sm:w-[380px]">
          <div class="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <p class="text-sm font-semibold text-slate-900">Notifications${unread ? `<span class="ml-2 px-1.5 py-0.5 rounded-full bg-primary-50 text-primary-600 text-[11px]">${unread} new</span>` : ''}</p>
            ${unread ? `<button data-action="notif-read-all" class="text-xs font-medium text-primary-600 hover:underline">Mark all as read</button>` : ''}
          </div>
          <div class="max-h-[420px] overflow-y-auto divide-y divide-slate-100">
            ${NOTIFICATIONS.map((n, idx) => `
              <button data-action="notif-open" data-value="${idx}" class="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 ${n.read ? '' : 'bg-primary-50/40'}">
                <span class="w-8 h-8 shrink-0 rounded-full flex items-center justify-center ${TONE[n.tone]}">${ic(n.icon, 'w-4 h-4')}</span>
                <span class="flex-1 min-w-0">
                  <span class="block text-sm ${n.read ? 'text-slate-700' : 'font-semibold text-slate-900'}">${esc(n.title)}</span>
                  <span class="block text-xs text-slate-500 mt-0.5 line-clamp-2">${esc(n.text)}</span>
                  <span class="block text-[11px] text-slate-400 mt-1">${timeAgo(n.date)}</span>
                </span>
                ${n.read ? '' : '<span class="w-2 h-2 mt-1.5 shrink-0 rounded-full bg-primary-600" aria-label="Unread"></span>'}
              </button>`).join('')}
          </div>
        </div>` : ''}
    </div>`;
}

function renderHeader() {
  $('#header').innerHTML = `
    <div class="flex items-center flex-1 max-w-2xl gap-3 min-w-0">
      <button data-action="mobile-nav" aria-label="Open menu" class="md:hidden p-2 -ml-2 rounded-lg text-slate-500 hover:bg-slate-100">${ic('menu', 'w-5 h-5')}</button>
      ${searchBox()}
    </div>
    <div class="flex items-center gap-4">
      ${storePill('global', 'All Stores', { right: true, compact: true, heading: 'Viewing stores' })}
      ${notificationBell()}
      <div class="relative" data-user-root>
        <button data-action="user-menu" class="flex items-center gap-2 pl-2 pr-1 ml-1 hover:bg-slate-50 rounded-full p-1 transition-colors">
          <div class="w-8 h-8 rounded-full ring-2 ring-white shadow-sm bg-slate-700 text-white flex items-center justify-center text-xs font-semibold">D</div>
        </button>
        ${userMenuOpen ? `
          <div class="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 z-20 overflow-hidden anim-pop">
            <div class="h-20" style="background-color:#F5F5FA"></div>
            <div class="px-6 pb-3 -mt-10 text-center">
              <div class="inline-block p-1 bg-white rounded-full mb-3">
                <div class="w-24 h-24 rounded-full border-4 border-white shadow-sm bg-slate-700 text-white flex items-center justify-center text-3xl font-bold">D</div>
              </div>
              <p class="text-sm text-slate-500 font-medium">demo_merchant</p>
              <h3 class="text-xl font-bold text-slate-900 mt-1">Demo Merchant Ltd.</h3>
              <div class="flex flex-col items-center gap-1 mt-2 text-xs text-slate-500">
                <span class="font-semibold text-slate-600">Merchant Admin</span>
                <span>merchant@example.com</span>
              </div>
            </div>
            <div class="p-4 border-t border-slate-100 bg-slate-50/50">
              <div class="flex items-center justify-between text-[11px] text-slate-500 font-medium mb-4 px-1">
                <span>Previous Login</span><span class="text-slate-700">${fmtDate(addDays(NOW, -1))} | 09:42 AM</span>
              </div>
              <button data-action="toast" data-msg="Logout is disabled in the prototype." class="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-all shadow-sm">${ic('log-out', 'w-4 h-4')}Logout</button>
              <a href="#/account/change-password" class="block text-center text-[11px] text-slate-500 font-medium hover:text-primary-600 transition-colors w-full mt-4">Change Password</a>
            </div>
          </div>` : ''}
      </div>
    </div>`;
}

// Portal-wide alert: a store still takes payments but SSL has switched its settlement off.
// `persistent` (Settlement Report) drops the close button, so the alert can't be hidden there.
function settlementBanner(persistent = false) {
  const stores = ACCOUNT_STORES.filter(st => st.status === 'Active' && SETTLEMENT_DISABLED.has(st.id));
  if (!stores.length || (!persistent && alertSnoozed('settlement-disabled'))) return '';
  return `
    <div role="alert" class="${persistent ? '' : 'mb-3 '}flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
      ${ic('circle-alert', 'w-4 h-4 shrink-0 text-rose-600')}
      <p class="flex-1 min-w-[220px] text-xs text-rose-800">
        <span class="text-sm font-semibold text-rose-900">Your settlement is currently disabled. Please contact your KAM.</span>
        Payments are still being accepted for ${stores.map(st => `<span class="font-medium">${esc(st.name)}</span>`).join(', ')}, but won't be paid out until settlement is enabled again.
      </p>
      <button data-action="open-contacts" class="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded shadow-sm hover:bg-slate-50">${ic('headset', 'w-3.5 h-3.5')}Contact KAM</button>
      ${persistent ? '' : `<span class="flex text-rose-700">${alertClose('settlement-disabled')}</span>`}
    </div>`;
}
