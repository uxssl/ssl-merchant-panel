// =====================================================================
// Payment QR (Bangla QR)
// =====================================================================
const qrGen = { store: STORES[0].id, amount: '', result: null, error: '' };

// A QR-looking pattern for the mockup only — it encodes nothing and cannot be scanned.
function sampleQr(seed, cls) {
  const n = 25;
  const r = mulberry32(idHash(seed));
  const inFinder = (x, y) => (x < 8 && y < 8) || (x >= n - 8 && y < 8) || (x < 8 && y >= n - 8);
  let path = '';
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!inFinder(x, y) && r() < 0.5) path += `M${x} ${y}h1v1h-1z`;
  const finder = (x, y) => `<rect x="${x}" y="${y}" width="7" height="7" fill="#0f172a"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="#fff"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3" fill="#0f172a"/>`;
  return `<svg viewBox="-1 -1 ${n + 2} ${n + 2}" class="${cls}" shape-rendering="crispEdges" role="img" aria-label="Sample QR pattern, not scannable"><rect x="-1" y="-1" width="${n + 2}" height="${n + 2}" fill="#fff"/><path d="${path}" fill="#0f172a"/>${finder(0, 0)}${finder(n - 7, 0)}${finder(0, n - 7)}</svg>`;
}

function qrFrame(seed, caption) {
  return `
    <div class="rounded-xl border-2 border-primary-600 bg-white p-3 text-center w-44 mx-auto">
      <p class="text-[10px] font-bold uppercase tracking-widest text-primary-600">Bangla QR</p>
      ${sampleQr(seed, 'w-36 h-36 mx-auto mt-1')}
      <p class="text-[11px] font-semibold text-slate-800 mt-1 truncate">${caption}</p>
      <p class="text-[9px] text-slate-400">Sample pattern — not scannable</p>
    </div>`;
}

function renderPaymentQr() {
  const qrTx = TXNS.filter(t => t.method === 'Bangla QR' && t.status === 'success');
  const monthStart = new Date(NOW.getFullYear(), NOW.getMonth(), 1);
  const today = qrTx.filter(t => t.date >= TODAY);
  const month = qrTx.filter(t => t.date >= monthStart);
  const sum = (list) => list.reduce((s, t) => s + t.amount, 0);
  const g = qrGen;
  return `
    <div class="space-y-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">Payment QR</h1>
          <p class="text-slate-500 text-sm">Bangla QR codes for your stores — customers scan with any bank or MFS app.</p>
        </div>
        <button data-action="toast" data-msg="Prototype: QR request form is not wired up." class="${BTN_PRIMARY} shrink-0">${ic('plus', 'w-4 h-4')}Request New QR</button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        ${metricCard({ title: 'Collected Today', value: fmtBDTShort(sum(today)), sub: `${today.length} QR payments` })}
        ${metricCard({ title: 'This Month', value: fmtBDTShort(sum(month)), sub: `${month.length} QR payments` })}
        ${metricCard({ title: 'Average Ticket', value: fmtBDT(month.length ? sum(month) / month.length : 0) })}
        ${metricCard({ title: 'Active QR Codes', value: QR_CODES.length, sub: `${new Set(QR_CODES.map(q => q.store)).size} stores` })}
      </div>

      <div class="space-y-3">
        <h2 class="text-sm font-semibold text-slate-900">Your QR Codes</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          ${QR_CODES.map(q => {
            const store = STORES.find(s => s.id === q.store);
            const todayStore = today.filter(t => t.store === q.store);
            return `
              <div class="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
                <div class="px-4 py-3 border-b border-slate-100 flex items-start justify-between gap-2">
                  <div class="min-w-0"><p class="text-sm font-semibold text-slate-900 truncate">${esc(store.name)}</p><p class="text-xs text-slate-500">${q.label} · Static</p></div>
                  ${activeBadge(true)}
                </div>
                <div class="p-4">${qrFrame(q.id, 'Demo Merchant Ltd.')}</div>
                <dl class="px-4 pb-3 grid grid-cols-2 gap-2 text-xs">
                  <div><dt class="text-slate-500">QR ID</dt><dd class="font-mono text-slate-800">${q.id}</dd></div>
                  <div><dt class="text-slate-500">Terminal</dt><dd class="font-mono text-slate-800">${q.terminal}</dd></div>
                  <div class="col-span-2"><dt class="text-slate-500">Store collected today</dt><dd class="font-semibold text-slate-900">${fmtBDT(sum(todayStore))} <span class="font-normal text-slate-500">· ${todayStore.length} payments</span></dd></div>
                </dl>
                <div class="mt-auto px-4 py-3 border-t border-slate-100 flex flex-wrap gap-2">
                  <button data-action="toast" data-msg="Prototype: QR download is not wired up." class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50">${ic('download', 'w-3.5 h-3.5')}Download</button>
                  <button data-action="toast" data-msg="Prototype: standee printing is not wired up." class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50">${ic('printer', 'w-3.5 h-3.5')}Standee</button>
                  <button data-action="qr-txns" data-value="${q.store}" class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-slate-200 text-xs font-medium text-primary-600 hover:bg-primary-50">${ic('list', 'w-3.5 h-3.5')}Payments</button>
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="bg-white rounded-lg border border-slate-200 shadow-sm">
          ${cardHead('Amount QR', 'One-time QR for a fixed amount, e.g. at the counter')}
          <div class="p-5 space-y-4">
            ${field('Store', `<select id="qr-store" class="${INPUT}">${storeOptions(g.store)}</select>`)}
            ${field('Amount (BDT)', `<input id="qr-amount" type="number" min="1" value="${esc(g.amount)}" placeholder="e.g. 1250" class="${INPUT}">`, { error: g.error })}
            <button data-action="qr-generate" class="${BTN_PRIMARY} w-full justify-center">${ic('qr-code', 'w-4 h-4')}Generate QR</button>
            ${g.result ? `
              <div class="pt-2 text-center space-y-2">
                ${qrFrame(g.result.ref, fmtBDT(g.result.amount))}
                <p class="text-xs text-slate-500">${esc(STORES.find(s => s.id === g.result.store).name)} · <span class="font-mono">${g.result.ref}</span></p>
                <p class="text-xs font-medium text-amber-600">Valid until ${fmtTime(new Date(g.result.at.getTime() + 15 * 60e3))} (15 minutes, mock)</p>
              </div>` : ''}
          </div>
        </div>
        <div class="bg-white rounded-lg border border-slate-200 shadow-sm lg:col-span-2 overflow-hidden">
          ${cardHead('Recent QR Payments', 'Latest Bangla QR payments across your stores', `<a href="#/analytics/bangla-qr-report" class="text-xs font-medium text-primary-600 hover:text-primary-700 inline-flex items-center gap-1">View all${ic('arrow-right', 'w-3.5 h-3.5')}</a>`)}
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-50 border-b border-slate-200"><tr>
              ${['Date & Time', 'Transaction ID', 'Store', 'Amount'].map((h, i) => `<th class="h-10 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap ${i === 3 ? 'text-right' : ''} ${i === 2 ? 'hidden md:table-cell' : ''}">${h}</th>`).join('')}
            </tr></thead>
            <tbody class="divide-y divide-slate-100">
              ${qrTx.slice(0, 8).map(t => `
                <tr data-action="open-txn" data-value="${t.id}" class="hover:bg-slate-50 cursor-pointer">
                  <td class="px-4 py-2.5">${dateCell(t.date)}</td>
                  <td class="px-4 py-2.5 font-mono text-xs text-slate-800">${t.id}</td>
                  <td class="px-4 py-2.5 hidden md:table-cell">${esc(t.storeName)}</td>
                  <td class="px-4 py-2.5 text-right font-semibold text-slate-900 whitespace-nowrap">${fmtBDT(t.amount)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
}
