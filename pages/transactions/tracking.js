// =====================================================================
// Transaction ID Tracking — old panel "Track Transaction": search by the merchant's
// transaction ID (or SSL / bank / validation ID), a bKash or a Nagad transaction ID.
// =====================================================================
const TRACK_FIELDS = [
  { key: 'merchant', label: 'Merchant Transaction ID', hint: 'Also matches SSL, bank or validation IDs', match: (t, q) => [t.id, t.valId, t.sslId, t.bankTranId].some(v => v.toLowerCase() === q) },
  { key: 'bkash', label: 'bKash Transaction ID', match: (t, q) => t.method === 'bKash' && t.mfsTrxId?.toLowerCase() === q },
  { key: 'nagad', label: 'Nagad Transaction ID', match: (t, q) => t.method === 'Nagad' && t.mfsTrxId?.toLowerCase() === q },
];

function runTracking() {
  const found = new Map();
  const missing = [];
  for (const f of TRACK_FIELDS) {
    for (const id of [...new Set(tracking[f.key].split(/[\s,;]+/).map(x => x.trim()).filter(Boolean))].slice(0, 20)) {
      const t = TXNS.find(x => f.match(x, id.toLowerCase()));
      t ? found.set(t.id, t) : missing.push(`${id} (${f.label})`);
    }
  }
  tracking.results = { txns: [...found.values()].sort((a, b) => b.date - a.date), missing };
}

function renderTracking() {
  const ok = TXNS.filter(t => t.status === 'success');
  const samples = [
    { label: 'Merchant ID', field: 'merchant', value: ok[3].id },
    { label: 'bKash ID', field: 'bkash', value: ok.find(t => t.mfsTrxId && t.method === 'bKash').mfsTrxId },
    { label: 'Nagad ID', field: 'nagad', value: ok.find(t => t.mfsTrxId && t.method === 'Nagad').mfsTrxId },
  ];
  const r = tracking.results;
  const info = (label, value, mono) => `<div class="text-xs"><span class="text-slate-500">${label}:</span> <span class="font-medium text-slate-800 ${mono ? 'font-mono' : ''}">${value}</span></div>`;
  const cols = [
    { label: 'Date', cell: t => dateCell(t.date) },
    { label: 'Merchant Info', cell: t => `<div class="space-y-0.5">${info('Merchant Transaction ID', t.id, true)}${info('SSL Transaction ID', t.sslId, true)}${info('Bank Transaction ID', t.bankTranId, true)}${t.mfsTrxId ? info(`${t.method} Transaction ID`, t.mfsTrxId, true) : ''}</div>` },
    { label: 'Transaction Info', cell: t => `<div class="space-y-0.5">${info('Card Type', esc(t.cardType))}${info('Card Number', t.account, true)}${info('Bank Gateway', esc(t.gateway))}${info('Card Holder Name', esc(t.customer))}${info('Card Issuer Bank', `${esc(t.gateway)} · ${esc(t.issuerCountry || 'Bangladesh')}`)}</div>` },
    { label: 'Store', cls: 'hidden xl:table-cell', cell: t => esc(t.storeName) },
    { label: 'Amount', right: true, cell: t => `<span class="font-semibold text-slate-900 whitespace-nowrap">${fmtBDT(t.amount)}</span>` },
    { label: 'Status', cell: t => badge(t.status === 'refunded' ? 'success' : t.status) },
  ];
  return `
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">Transaction ID Tracking</h1>
        <p class="text-slate-500 text-sm">Find a payment by your transaction ID, or by the customer's bKash or Nagad transaction ID.</p>
      </div>
      <section class="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div class="px-5 py-4 border-b border-slate-100"><h2 class="text-sm font-semibold text-slate-900">Track Transaction</h2></div>
        <div class="p-5 space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            ${TRACK_FIELDS.map(f => field(f.label, `<input id="track-${f.key}" data-track="${f.key}" value="${esc(tracking[f.key])}" placeholder="Enter ${f.label}" class="${INPUT} font-mono">`, { hint: f.hint || '' })).join('')}
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button data-action="track" class="${BTN_PRIMARY}">${ic('search', 'w-4 h-4')}Search</button>
            <button data-action="track-reset" class="${BTN_SECONDARY}">${ic('rotate-ccw', 'w-4 h-4')}Reset</button>
            <span class="text-xs text-slate-500 ml-2">Try a sample:</span>
            ${samples.map(s => `<button data-action="track-sample" data-key="${s.field}" data-value="${s.value}" class="px-2.5 py-1 rounded-full text-[11px] font-medium border ${PILL_IDLE}">${s.label}</button>`).join('')}
          </div>
        </div>
      </section>
      ${r ? `
        <section class="space-y-3">
          <div class="flex items-center justify-between gap-3">
            <h2 class="text-sm font-semibold text-slate-900">Transaction Details <span class="ml-1 text-xs font-normal text-slate-500">${r.txns.length} row${r.txns.length === 1 ? '' : 's'}</span></h2>
          </div>
          ${r.missing.length ? `<div class="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">${ic('circle-alert', 'w-4 h-4 mt-0.5 shrink-0')}<span>Not found in your stores: <span class="font-mono">${r.missing.map(esc).join(', ')}</span></span></div>` : ''}
          ${dataTable({ cols, rows: r.txns, rowAttrs: t => `data-action="open-txn" data-value="${t.id}"`, emptyTitle: 'No transaction found', emptyHint: 'Check the ID and try again.' })}
          ${r.txns.length ? PCI_NOTE : ''}
        </section>` : ''}
    </div>`;
}
