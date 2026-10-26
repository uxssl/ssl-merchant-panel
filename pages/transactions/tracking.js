// =====================================================================
// Transaction ID Tracking
// =====================================================================
function runTracking() {
  const ids = [...new Set(tracking.query.split(/[\s,;]+/).map(x => x.trim()).filter(Boolean))].slice(0, 20);
  tracking.results = ids.map(id => {
    const q = id.toLowerCase();
    return { id, txn: TXNS.find(t => t.id.toLowerCase() === q || t.valId.toLowerCase() === q || t.bankTranId === id) };
  });
}

const settlementTime = (t) => new Date(t.date.getFullYear(), t.date.getMonth(), t.date.getDate() + 1, 11, 0);

function journey(t) {
  const at = (d) => `${fmtShort(d)}, ${fmtTime(d)}`;
  const sec = (n) => new Date(t.date.getTime() + n * 1000);
  const steps = [{ label: 'Initiated', sub: at(t.date), state: 'done' }];
  if (t.status === 'failed') return [...steps, { label: 'Payment failed', sub: t.reason, state: 'failed' }];
  if (t.status === 'cancelled') return [...steps, { label: 'Cancelled', sub: 'Cancelled by customer', state: 'failed' }];
  if (t.status === 'pending') {
    return [...steps,
      { label: 'Authorization', sub: 'Awaiting provider', state: 'current' },
      { label: 'Validated (IPN)', sub: '—', state: 'upcoming' },
      { label: 'Settlement', sub: '—', state: 'upcoming' }];
  }
  steps.push({ label: 'Authorized', sub: at(sec(t.auth)), state: 'done' }, { label: 'Validated (IPN)', sub: at(sec(t.auth + 2)), state: 'done' });
  const settleAt = settlementTime(t);
  steps.push(settleAt <= NOW
    ? { label: 'Settled', sub: at(settleAt), state: 'done' }
    : { label: 'Settlement', sub: `Expected ${at(settleAt)}`, state: 'current' });
  const rf = REFUND_BY_TXN.get(t.id);
  if (rf) steps.push({ label: `Refund · ${rf.status}`, sub: fmtBDT(rf.amount), state: rf.status === 'Success' ? 'done' : rf.status === 'Cancelled' ? 'failed' : 'current' });
  const cb = CB_BY_TXN.get(t.id);
  if (cb) steps.push({ label: `Chargeback · ${cb.status}`, sub: cb.stage, state: CB_PENDING.has(cb.status) ? 'current' : 'done' });
  return steps;
}

const STEP_CLS = {
  done: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200',
  current: 'bg-amber-50 text-amber-600 ring-1 ring-amber-200',
  failed: 'bg-rose-50 text-rose-600 ring-1 ring-rose-200',
  upcoming: 'bg-white text-slate-300 ring-1 ring-slate-200',
};
const STEP_ICON = { done: 'check', current: 'clock', failed: 'x', upcoming: 'circle' };

function stepper(steps) {
  return `
    <ol class="flex items-start">
      ${steps.map((s, i) => `
        <li class="flex-1 min-w-0">
          <div class="flex items-center">
            <span class="w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${STEP_CLS[s.state]}">${ic(STEP_ICON[s.state], 'w-3.5 h-3.5')}</span>
            ${i < steps.length - 1 ? `<span class="flex-1 h-0.5 mx-2 rounded ${s.state === 'done' ? 'bg-emerald-300' : 'bg-slate-200'}"></span>` : ''}
          </div>
          <p class="mt-2 text-xs font-semibold text-slate-800 pr-3">${s.label}</p>
          <p class="text-[11px] text-slate-500 pr-3">${s.sub}</p>
        </li>`).join('')}
    </ol>`;
}

function trackCard(t) {
  const rf = REFUND_BY_TXN.get(t.id);
  const cb = CB_BY_TXN.get(t.id);
  const chip = (action, value, icon, text, badgeHtml) => `<button data-action="${action}" data-value="${value}" class="inline-flex items-center gap-2 pl-2.5 pr-1.5 py-1 rounded-full bg-white border border-slate-200 hover:border-slate-300 text-xs text-slate-700">${ic(icon, 'w-3.5 h-3.5 text-slate-500')}${text}${badgeHtml}</button>`;
  const related = [
    rf && chip('open-refund', rf.ref, 'undo-2', `Refund <span class="font-mono">${rf.ref}</span>`, refundBadge(rf.status)),
    cb && chip('open-cb', cb.ref, 'shield-alert', `Chargeback <span class="font-mono">${cb.ref}</span>`, cbBadge(cb.status)),
  ].filter(Boolean);
  return `
    <div class="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div class="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-4">
        <div class="min-w-0">
          <div class="flex items-center gap-2 flex-wrap"><span class="font-mono text-sm font-semibold text-slate-900">${t.id}</span>${badge(t.status)}</div>
          <p class="text-xs text-slate-500 mt-1">${fmtDate(t.date)}, ${fmtTime(t.date, true)} · ${esc(t.storeName)} · ${t.method} <span class="font-mono">${t.account}</span></p>
        </div>
        <div class="text-right shrink-0">
          <p class="text-xl font-bold text-slate-900">${fmtBDT(t.amount)}</p>
          <button data-action="open-txn" data-value="${t.id}" class="text-xs font-medium text-primary-600 hover:text-primary-700 hover:underline">View details</button>
        </div>
      </div>
      <div class="px-5 py-5">${stepper(journey(t))}</div>
      ${related.length ? `<div class="px-5 py-3 border-t border-slate-100 bg-slate-50/50 rounded-b-xl flex flex-wrap items-center gap-2"><span class="text-xs text-slate-500">Related:</span>${related.join('')}</div>` : ''}
    </div>`;
}

function renderTracking() {
  const settled = TXNS.find(t => t.status === 'success' && settlementTime(t) < addDays(NOW, -1) && !REFUND_BY_TXN.has(t.id) && !CB_BY_TXN.has(t.id));
  const samples = [
    { label: 'Settled', t: settled },
    { label: 'Failed', t: TXNS.find(t => t.status === 'failed') },
    { label: 'With refund', t: REFUNDS[0]?.txn },
    { label: 'With chargeback', t: CHARGEBACKS[0]?.txn },
  ].filter(s => s.t);
  const res = tracking.results;
  const found = res ? res.filter(r => r.txn).length : 0;

  return `
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">Transaction ID Tracking</h1>
        <p class="text-slate-500 text-sm">Follow a payment from checkout to settlement — including any refund or chargeback on it.</p>
      </div>

      <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <label for="track-input" class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Transaction ID</label>
        <div class="mt-2 flex gap-2">
          <div class="relative flex-1">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">${ic('search', 'w-4 h-4')}</span>
            <input id="track-input" type="text" value="${esc(tracking.query)}" autocomplete="off"
              placeholder="Transaction ID, Val ID or Bank Transaction ID — paste several to track them together"
              class="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500">
          </div>
          <button data-action="track" class="${BTN_PRIMARY} rounded-lg px-5">${ic('scan-search', 'w-4 h-4')}Track</button>
        </div>
        <p class="text-xs text-slate-500 mt-2">Separate multiple IDs with a comma or space (up to 20).</p>
        <div class="mt-3 flex flex-wrap items-center gap-2">
          <span class="text-xs text-slate-500">Try a sample:</span>
          ${samples.map(s => `<button data-action="track-sample" data-value="${s.t.id}" class="px-2.5 py-1 rounded-full text-[11px] font-medium border ${PILL_IDLE}">${s.label}</button>`).join('')}
          <button data-action="track-sample" data-value="${samples.map(s => s.t.id).join(', ')}" class="px-2.5 py-1 rounded-full text-[11px] font-medium border ${PILL_IDLE}">All ${samples.length} at once</button>
        </div>
      </div>

      ${!res ? `
        <div class="flex flex-col items-center justify-center py-14 px-4 text-center rounded-xl border border-dashed border-slate-300">
          <div class="w-12 h-12 rounded-full bg-white flex items-center justify-center mb-4 ring-1 ring-slate-200">${ic('route', 'w-6 h-6 text-slate-300')}</div>
          <h3 class="text-sm font-semibold text-slate-900 mb-1">Track a payment</h3>
          <p class="text-xs text-slate-500 max-w-sm">Enter an ID above to see each step — initiated, authorized, validated, settled — plus any refund or chargeback.</p>
        </div>` : `
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-semibold text-slate-900">Results</h2>
            <p class="text-xs text-slate-500">${found} of ${res.length} ID${res.length > 1 ? 's' : ''} found</p>
          </div>
          ${res.map(r => r.txn ? trackCard(r.txn) : `
            <div class="bg-white rounded-xl border border-dashed border-slate-300 px-5 py-4 flex items-center gap-3">
              <span class="w-9 h-9 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">${ic('search-x', 'w-4 h-4')}</span>
              <div>
                <p class="text-sm font-semibold text-slate-900">No transaction found for <span class="font-mono">${esc(r.id)}</span></p>
                <p class="text-xs text-slate-500">Check the ID, or make sure it belongs to one of your stores.</p>
              </div>
            </div>`).join('')}
        </div>`}
    </div>`;
}
