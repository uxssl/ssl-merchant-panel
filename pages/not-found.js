// =====================================================================
// Unknown routes (every menu item has its own screen)
// =====================================================================
function renderComingSoon(path) {
  const parent = NAV.find(n => n.children?.some(c => c.to === path));
  const item = parent?.children.find(c => c.to === path);
  const title = item?.label || 'Page not found';
  return `
    <div class="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
      <div class="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mb-6">${ic('map-pin-off', 'w-8 h-8 text-primary-600')}</div>
      <p class="inline-flex rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-[10px] font-bold tracking-widest text-primary-700 uppercase mb-4">${parent ? esc(parent.label) : 'Not Found'}</p>
      <h1 class="text-3xl font-bold text-slate-900 mb-4">${esc(title)}</h1>
      <p class="max-w-md text-slate-500 text-sm leading-relaxed">This page doesn't exist in the portal. Use the menu on the left, or go back to the dashboard.</p>
      <a href="#/dashboard" class="mt-6 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded shadow-sm hover:bg-primary-700">${ic('layout-dashboard', 'w-4 h-4')}Go to Dashboard</a>
    </div>`;
}
