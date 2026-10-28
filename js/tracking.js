// =====================================================================
// UX analytics — click heatmap and scroll depth per page and feature
// =====================================================================
// Records where people click and how far they scroll, so UI changes can be judged on usage.
// Privacy rules (payment portal, PCI-DSS scope): only the route, the control's data-action /
// data-key / id and a click position are kept. Never text, input values, data-value (record ids),
// query strings or keystrokes. Off when the browser sends Do Not Track or Global Privacy Control.
// Prototype: events stay in this browser's localStorage. In production set ANALYTICS.endpoint to a
// first-party collector (no third-party heatmap scripts), and only start after the merchant consents.
const ANALYTICS = {
  enabled: navigator.doNotTrack !== '1' && !navigator.globalPrivacyControl,
  endpoint: null, // e.g. '[PLACEHOLDER_FIRST_PARTY_COLLECTOR_URL]'
  storeKey: 'portal-ux-events',
  maxEvents: 2000,
};

const uxTrack = (() => {
  const queue = [];
  const route = () => (location.hash || '#/dashboard').slice(1).split('?')[0];
  const viewport = () => innerWidth < 768 ? 'phone' : innerWidth < 1024 ? 'tablet' : 'desktop';
  let visit = { route: route(), start: Date.now(), depth: 0 };

  const load = () => { try { return JSON.parse(localStorage.getItem(ANALYTICS.storeKey)) || []; } catch { return []; } };
  function flush() {
    if (!queue.length) return;
    const batch = queue.splice(0);
    if (ANALYTICS.endpoint) {
      navigator.sendBeacon?.(ANALYTICS.endpoint, JSON.stringify(batch));
      return;
    }
    try { localStorage.setItem(ANALYTICS.storeKey, JSON.stringify(load().concat(batch).slice(-ANALYTICS.maxEvents))); } catch { /* storage full or blocked */ }
  }
  const push = (e) => { queue.push({ ...e, vp: viewport(), ts: Date.now() }); if (queue.length >= 20) flush(); };

  // Scroll depth: the furthest point of the page seen, as a share of its height.
  function measureDepth() {
    const h = document.documentElement.scrollHeight;
    visit.depth = Math.max(visit.depth, Math.min(100, Math.round((scrollY + innerHeight) / h * 100)));
  }
  function endVisit() {
    measureDepth();
    push({ type: 'scroll', route: visit.route, depth: visit.depth, ms: Date.now() - visit.start });
    visit = { route: route(), start: Date.now(), depth: 0 };
  }

  // Click position is relative to #page (x as a share of its width), so it lines up with or without the sidebar.
  function onClick(e) {
    const page = document.getElementById('page');
    if (!page || !page.contains(e.target) && !e.target.closest('#header, #sidebar, #drawer-root')) return;
    const box = page.getBoundingClientRect();
    const el = e.target.closest('[data-action], a, button, input, select, [id]');
    push({
      type: 'click', route: route(),
      x: Math.round((e.clientX - box.left) / box.width * 1000) / 1000,
      y: Math.round(e.clientY - box.top),
      inPage: page.contains(e.target),
      feature: el?.dataset.action || null,
      key: el?.dataset.key || null,
      id: el?.id || null,
    });
  }

  if (ANALYTICS.enabled) {
    document.addEventListener('click', onClick, true);
    addEventListener('scroll', measureDepth, { passive: true });
    addEventListener('hashchange', endVisit); // runs before app.js resets the scroll position
    addEventListener('pagehide', () => { endVisit(); flush(); });
    setInterval(flush, 15000);
  }

  // Reviewing the data (console, or Shift+Alt+H for the heatmap of the open page).
  function events() { flush(); return load(); }
  function report() {
    const byFeature = {};
    events().forEach(e => {
      const k = `${e.route} · ${e.type === 'click' ? e.feature || e.id || '(no control)' : 'scroll'}`;
      const r = byFeature[k] ||= { clicks: 0, visits: 0, depthSum: 0 };
      if (e.type === 'click') r.clicks++; else { r.visits++; r.depthSum += e.depth; }
    });
    console.table(Object.fromEntries(Object.entries(byFeature).map(([k, r]) => [k, r.visits ? { visits: r.visits, avgScrollDepth: `${Math.round(r.depthSum / r.visits)}%` } : { clicks: r.clicks }])));
  }
  function heatmap() {
    const old = document.getElementById('ux-heatmap');
    if (old) { old.remove(); return; }
    const page = document.getElementById('page');
    const box = page.getBoundingClientRect();
    const layer = document.createElement('div');
    layer.id = 'ux-heatmap';
    layer.setAttribute('aria-hidden', 'true');
    layer.style.cssText = `position:absolute;left:${box.left + scrollX}px;top:${box.top + scrollY}px;width:${box.width}px;height:${page.scrollHeight}px;pointer-events:none;z-index:150`;
    const clicks = events().filter(e => e.type === 'click' && e.inPage && e.route === route());
    layer.innerHTML = clicks.map(e => `<span style="position:absolute;left:${e.x * box.width - 18}px;top:${e.y - 18}px;width:36px;height:36px;border-radius:50%;background:radial-gradient(circle,rgba(239,68,68,.55),rgba(239,68,68,0) 70%)"></span>`).join('');
    document.body.appendChild(layer);
    toast(`${clicks.length} recorded click${clicks.length === 1 ? '' : 's'} on this page (Shift+Alt+H to hide)`);
  }
  document.addEventListener('keydown', (e) => { if (e.shiftKey && e.altKey && e.code === 'KeyH') heatmap(); });
  addEventListener('hashchange', () => document.getElementById('ux-heatmap')?.remove());

  return { events, report, heatmap, clear: () => { queue.length = 0; try { localStorage.removeItem(ANALYTICS.storeKey); } catch { /* blocked */ } } };
})();
