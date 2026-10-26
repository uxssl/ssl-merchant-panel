// =====================================================================
// Sidebar & header (KAM layout: Sidebar.tsx, Header.tsx)
// =====================================================================
const tip = (text) => `<span class="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 hidden group-hover:block z-50 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg shadow-xl whitespace-nowrap">${text}</span>`;

function navItem(item, path) {
  if (!item.children) {
    const active = item.to === path;
    const cls = active ? 'bg-white text-primary-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:bg-slate-100';
    if (navCollapsed) {
      return `<div class="relative group"><a href="#${item.to}" class="w-full flex items-center justify-center p-2.5 rounded-md transition-all duration-200 ${cls}">${ic(item.icon, 'w-5 h-5')}</a>${tip(item.label)}</div>`;
    }
    return `<a href="#${item.to}" class="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${cls}">${ic(item.icon, 'w-5 h-5 min-w-[20px]')}<span class="truncate">${item.label}</span></a>`;
  }

  const parentActive = item.children.some(c => c.to === path);
  const open = expanded === item.key;
  if (navCollapsed) {
    const cls = parentActive ? 'bg-white text-primary-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:bg-slate-100';
    return `<div class="relative group"><button data-action="nav-parent" data-key="${item.key}" class="w-full flex items-center justify-center p-2.5 rounded-md transition-all duration-200 ${cls}">${ic(item.icon, 'w-5 h-5')}</button>${tip(item.label)}</div>`;
  }
  return `
    <div>
      <button data-action="nav-parent" data-key="${item.key}" class="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-slate-100 ${open || parentActive ? 'text-slate-900' : 'text-slate-600'}">
        <span class="flex items-center gap-3 min-w-0">${ic(item.icon, `w-5 h-5 min-w-[20px] ${parentActive ? 'text-primary-600' : ''}`)}<span class="text-left leading-snug">${item.label}</span></span>
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
      ${NAV.map(item => navItem(item, path)).join('')}
    </nav>`;
  $('#main-wrap').classList.toggle('pl-64', !phone && !navCollapsed);
  $('#main-wrap').classList.toggle('pl-20', !phone && navCollapsed);
}

// Global store switcher — the same choice drives every page's Store filter.
function storeSwitcher() {
  const open = openDD === 'global:store';
  const selected = STORE_OPTS.find(o => o.value === storeFilter);
  return `
    <div class="relative" data-dd-root>
      <button data-action="dd-toggle" data-key="global:store" aria-haspopup="listbox" aria-expanded="${open}" title="Store" class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors border ${storeFilter !== 'all' ? PILL_ACTIVE : PILL_IDLE}">
        ${ic('store', 'w-4 h-4')}<span class="hidden sm:inline max-w-[160px] truncate">${esc(selected.label)}</span>${ic('chevron-down', 'w-3 h-3')}
      </button>
      ${open ? `
        <div class="absolute top-full right-0 mt-2 min-w-[220px] bg-white rounded-lg shadow-lg border border-slate-200 z-50 py-1 max-h-72 overflow-y-auto anim-pop">
          <p class="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Viewing store</p>
          ${STORE_OPTS.map(o => `
            <button data-action="dd-select" data-scope="global" data-key="store" data-value="${o.value}"
              class="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 ${o.value === storeFilter ? 'text-primary-600 font-medium bg-slate-50' : 'text-slate-700'}">${esc(o.label)}</button>`).join('')}
        </div>` : ''}
    </div>`;
}

function renderHeader() {
  $('#header').innerHTML = `
    <div class="flex items-center flex-1 max-w-2xl gap-3 min-w-0">
      <button data-action="mobile-nav" aria-label="Open menu" class="md:hidden p-2 -ml-2 rounded-lg text-slate-500 hover:bg-slate-100">${ic('menu', 'w-5 h-5')}</button>
      <button data-action="toast" data-msg="Global search isn't part of this prototype yet." class="flex items-center flex-1 min-w-0 max-w-sm gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100 hover:border-slate-300 transition-colors text-left cursor-text">
        ${ic('search', 'w-4 h-4 text-slate-400')}
        <span class="text-sm text-slate-500 flex-1 truncate">Search transactions, invoices, stores...</span>
        <kbd class="hidden sm:inline-block px-1.5 py-0.5 text-xs font-medium text-slate-500 bg-white border border-slate-200 rounded shadow-sm">⌘K</kbd>
      </button>
      <span class="hidden lg:inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 whitespace-nowrap">${ic('flask-conical', 'w-3.5 h-3.5')}Prototype · Mock data</span>
    </div>
    <div class="flex items-center gap-4">
      ${storeSwitcher()}
      <button data-action="toast" data-msg="Notifications aren't part of this prototype yet." class="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-full transition-colors relative">
        ${ic('bell', 'w-5 h-5')}
        <span class="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
      </button>
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
