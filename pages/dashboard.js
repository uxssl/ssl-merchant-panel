// =====================================================================
// Dashboard
// =====================================================================
const DASH_PRESETS = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: 'this_month', label: 'This Month' },
];

function dashData() {
  const { from, to } = presetRange(dash.preset);
  // "Today" compares with the same hours yesterday; other ranges with the same length just before.
  const span = to - from;
  const today = dash.preset === 'today';
  const prevFrom = today ? addDays(from, -1) : new Date(from.getTime() - span);
  const prevTo = today ? addDays(to, -1) : new Date(from.getTime() - 1);
  const inStore = (t) => inStores(t.store);
  const cur = TXNS.filter(t => inStore(t) && t.date >= from && t.date <= to);
  const prev = TXNS.filter(t => inStore(t) && t.date >= prevFrom && t.date <= prevTo);

  const summarize = (list) => {
    const success = list.filter(t => t.status === 'success');
    const sales = success.reduce((s, t) => s + t.amount, 0);
    return { total: list.length, success: success.length, sales, rate: list.length ? success.length / list.length * 100 : 0, avg: success.length ? sales / success.length : 0 };
  };

  const hourly = dash.preset === 'today';
  const buckets = [];
  if (hourly) {
    for (let h = 0; h <= NOW.getHours(); h++) buckets.push({ label: `${pad(h)}:00`, from: new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate(), h), to: new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate(), h, 59, 59, 999) });
  } else {
    for (let d = startOfDay(from); d <= to; d = addDays(d, 1)) buckets.push({ label: fmtShort(d), from: d, to: endOfDay(d) });
  }
  const series = buckets.map(b => ({ label: b.label, from: b.from, to: b.to, ...summarize(cur.filter(t => t.date >= b.from && t.date <= b.to)) }));

  const byHour = Array.from({ length: 24 }, (_, h) => cur.filter(t => t.date.getHours() === h).length);

  const success = cur.filter(t => t.status === 'success');
  const channelTypes = [...new Set(METHODS.map(m => m.type))];
  const totalSales = success.reduce((s, t) => s + t.amount, 0) || 1;
  const channels = channelTypes.map(type => {
    const list = success.filter(t => t.type === type);
    const amount = list.reduce((s, t) => s + t.amount, 0);
    return { type, amount, count: list.length, share: amount / totalSales * 100 };
  }).sort((a, b) => b.amount - a.amount);

  const stl = SETTLEMENTS.filter(x => inStore(x));
  const pending = stl.filter(x => x.status === 'Pending');
  const pendingSettlement = pending.reduce((s, x) => s + x.settle, 0);
  const nextPayout = pending.length ? new Date(Math.min(...pending.map(x => x.date))) : null;
  const lastPaid = stl.find(x => x.status === 'Paid');
  const lastSettledAt = lastPaid?.date || null;
  const lastSettled = stl.filter(x => x.status === 'Paid' && +x.date === +lastSettledAt).reduce((s, x) => s + x.paid, 0);

  return { from, to, cur, now: summarize(cur), prev: summarize(prev), prevLabel: today ? 'vs same time yesterday' : 'vs previous period', series, byHour, channels, pendingSettlement, nextPayout, lastSettled, lastSettledAt };
}

// All dashboard cards share one surface, so radius, border and shadow stay consistent.
const DASH_CARD = 'bg-white rounded-xl border border-slate-200 shadow-sm';
const linkMore = (href, label) => `<a href="${href}" class="text-xs font-medium text-primary-600 hover:text-primary-700 inline-flex items-center gap-1 whitespace-nowrap">${label}${ic('arrow-right', 'w-3.5 h-3.5')}</a>`;

// `link` holds the attributes that make the card open its detail (an href or a data-action).
function statCard({ title, value, cur, prev, pp, empty, prevEmpty, vs = 'vs previous period', link }) {
  // Rates and averages can't be compared when either period has no payments.
  let delta = null;
  if (!empty && !prevEmpty) delta = pp ? cur - prev : prev ? (cur - prev) / prev * 100 : null;
  const up = delta !== null && delta >= 0;
  const text = empty ? 'No payments in this period yet' : delta === null ? 'No data to compare with' : `${up ? '+' : ''}${delta.toFixed(1)}${pp ? ' pts' : '%'} ${vs}`;
  const tag = link.includes('href=') ? 'a' : 'button';
  // Compact: the change pill sits beside the value; what it compares with is said once, in the Overview heading.
  const change = delta === null
    ? `<span class="text-[11px] text-slate-400 truncate">${text}</span>`
    : `<span title="${text}" class="shrink-0 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${up ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}">${ic(up ? 'trending-up' : 'trending-down', 'w-3 h-3')}${up ? '+' : ''}${delta.toFixed(1)}${pp ? ' pts' : '%'}</span>`;
  return `
    <${tag} ${link} class="text-left ${DASH_CARD} px-4 py-3.5 flex flex-col gap-1 hover:shadow-md hover:border-primary-200 transition-all">
      <p class="text-xs font-medium text-slate-500 truncate">${title}</p>
      <div class="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 min-w-0">
        <p class="text-lg sm:text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap">${value}</p>${change}
      </div>
    </${tag}>`;
}

const cardHead = (title, sub, right = '') => `
  <div class="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
    <div class="min-w-0"><h3 class="text-sm font-semibold text-slate-900">${title}</h3>${sub ? `<p class="text-xs text-slate-500 mt-0.5">${sub}</p>` : ''}</div>${right}
  </div>`;

// Dashboard cards use a tighter header than the shared cardHead (also used by the analytics pages).
const dashHead = (title, sub, right = '') => `
  <div class="px-4 py-3 border-b border-slate-100 flex items-start justify-between gap-3">
    <div class="min-w-0"><h3 class="text-sm font-semibold text-slate-900">${title}</h3>${sub ? `<p class="text-xs text-slate-500 mt-0.5 truncate">${sub}</p>` : ''}</div>${right}
  </div>`;

// Merchant app download QR — a real, scannable code with the SSLCOMMERZ logo in the middle.
// TODO: set MERCHANT_APP_URL to the merchant app's store link; until then it opens sslcommerz.com.
const MERCHANT_APP_URL = 'https://sslcommerz.com';
function appQr(cls) {
  if (!window.qrcode) return '';
  const qr = qrcode(0, 'H'); // high error correction, so the logo can cover the centre
  qr.addData(MERCHANT_APP_URL);
  qr.make();
  const n = qr.getModuleCount();
  let path = '';
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (qr.isDark(y, x)) path += `M${x} ${y}h1v1h-1z`;
  const lw = n * 0.5, lh = lw * 45 / 234; // logo keeps its 234×45 shape
  return `
    <svg viewBox="-2 -2 ${n + 4} ${n + 4}" class="${cls}" shape-rendering="crispEdges" role="img" aria-label="QR code to download the SSLCOMMERZ Merchant App">
      <rect x="-2" y="-2" width="${n + 4}" height="${n + 4}" fill="#fff"/>
      <path d="${path}" fill="#000"/>
      <rect x="${(n - lw) / 2 - 0.6}" y="${(n - lh) / 2 - 0.6}" width="${lw + 1.2}" height="${lh + 1.2}" fill="#fff"/>
      <image href="${LOGO}" x="${(n - lw) / 2}" y="${(n - lh) / 2}" width="${lw}" height="${lh}"/>
    </svg>`;
}

function contactsDrawer() {
  const k = SUPPORT_CONTACTS.kam;
  const group = (n, title, icon, text, rows) => section(`${n}. ${title}`, `
    <p class="text-sm text-slate-500 -mt-1 mb-3 flex items-start gap-2">${ic(icon, 'w-5 h-5 mt-0.5 shrink-0 portal-icon-muted')}${text}</p>
    ${kvGrid(rows.map(([label, value]) => kv(label, value)))}`);
  return drawerShell({
    title: 'Key Contact Details',
    sub: '<span>Who to contact for what</span>',
    body: [
      group(1, 'Key Account Manager', 'user-round', 'For any query related to new or existing business, campaigns, enabling new features, products, SMS, new stores, etc.',
        [['Name', `<span class="inline-flex items-center gap-2.5"><img src="${k.photo}" alt="Photo of ${esc(k.name)}" class="w-9 h-9 rounded-full object-cover">${esc(k.name)}</span>`], ['Contact No', `<a href="tel:${k.phone.replace(/[^\d+]/g, '')}" class="text-primary-600 hover:underline">${k.phone}</a>`], ['Email Address', `<a href="mailto:${k.email}" class="text-primary-600 hover:underline">${k.email}</a>`]]),
      ...SUPPORT_CONTACTS.teams.map((t, i) => group(i + 2, t.title, t.icon, t.text,
        t.rows.map(([label, value]) => [label, value.includes('@') ? `<a href="mailto:${value}" class="text-primary-600 hover:underline">${value}</a>` : value]))),
    ].join(''),
    footer: `<button data-action="close-drawer" class="${BTN_SECONDARY}">Close</button>`,
  });
}

function renderDashboard() {
  const d = dashData();
  const peak = d.byHour.indexOf(Math.max(...d.byHour));
  const failedCount = d.cur.filter(t => t.status === 'failed').length;
  const pendingCount = d.cur.filter(t => t.status === 'pending').length;
  const recent = d.cur.slice(0, 5);
  const hourLabel = (h) => `${pad(h % 12 || 12)} ${h >= 12 ? 'PM' : 'AM'}`;
  const k = SUPPORT_CONTACTS.kam;
  const activeStores = ACCOUNT_STORES.filter(st => st.status === 'Active').length;

  const escrowHeld = pendingDeliverables().length;
  const attention = [
    // Escrow money stays held until delivery is confirmed, so it leads the list while any is waiting.
    { icon: 'package-check', tone: 'text-amber-700 bg-amber-100', title: 'Escrow hold transactions', sub: 'Funds on hold until you confirm delivery', value: escrowHeld, action: `data-action="go" data-value="${SUP.service}"`, priority: escrowHeld > 0 },
    { icon: 'circle-x', tone: 'text-rose-600 bg-rose-50', title: 'Failed transactions', sub: 'In the selected period', value: failedCount, action: `data-action="goto-txn" data-status="failed"` },
    { icon: 'clock', tone: 'text-amber-600 bg-amber-50', title: 'Pending transactions', sub: 'Waiting for provider confirmation', value: pendingCount, action: `data-action="goto-txn" data-status="pending"` },
    { icon: 'undo-2', tone: 'text-indigo-600 bg-indigo-50', title: 'Refund requests', sub: 'Open — in review or with the bank', value: REFUNDS.filter(r => REFUND_OPEN.has(r.status)).length, action: `data-action="goto-list" data-path="${REFUND_PATH}" data-status="pending"` },
    { icon: 'shield-alert', tone: 'text-slate-600 bg-slate-100', title: 'Chargebacks to respond', sub: 'Waiting for your evidence', value: CHARGEBACKS.filter(c => CB_OPEN.has(c.status)).length, action: `data-action="goto-list" data-path="${CB_PATH}" data-status="action"` },
  ];
  const toReview = attention.reduce((s, a) => s + a.value, 0);
  // Each action opens its create form straight away rather than the product's list.
  const quick = [
    { icon: 'link', label: 'Create Payment Link', hint: 'Share a link and get paid', action: 'data-action="new-link"' },
    { icon: 'qr-code', label: 'Generate Payment QR', hint: 'Bangla QR for a store and amount', action: 'data-action="quick-qr"' },
    { icon: 'file-text', label: 'Create Digital Invoice', hint: 'Bill a customer online', action: 'data-action="new-invoice"' },
  ];
  const contactBtn = (icon, label, value, href, wrap = false) => `
    <a href="${href}" class="min-w-0 flex items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2 hover:border-primary-300 hover:bg-primary-50/40 transition-colors">
      <span class="w-7 h-7 flex items-center justify-center shrink-0">${ic(icon, 'w-5 h-5 portal-icon-muted')}</span>
      <span class="min-w-0"><span class="block text-xs font-semibold text-slate-800">${label}</span><span class="block text-xs ${wrap ? 'text-slate-700 font-medium whitespace-nowrap' : 'text-slate-500 truncate'}">${value}</span></span>
    </a>`;

  return `
    <div class="space-y-4">
      <div class="flex items-end justify-between gap-4 flex-wrap">
        <div class="min-w-0">
          <h1 class="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p class="text-slate-500 text-sm mt-0.5">Welcome back, Demo Merchant. Here's how your stores are performing.</p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <div class="inline-flex p-1 bg-white border border-slate-200 rounded-full shadow-sm">
            ${DASH_PRESETS.map(p => `<button data-action="dash-preset" data-value="${p.value}" class="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${dash.preset === p.value ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}">${p.label}</button>`).join('')}
          </div>
        </div>
      </div>

      <section aria-label="Help and apps" class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div class="${DASH_CARD} lg:col-span-2 p-4 flex flex-col gap-3">
          <div class="flex items-center justify-between gap-3">
            <h3 class="text-sm font-semibold text-slate-900">Key Account Manager</h3>
            <button data-action="open-contacts" class="text-xs font-medium text-primary-600 hover:text-primary-700 inline-flex items-center gap-1 whitespace-nowrap">All contacts${ic('arrow-right', 'w-3.5 h-3.5')}</button>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3 md:items-center">
            <div class="flex items-center gap-3 min-w-0">
              <img src="${k.photo}" alt="Photo of ${esc(k.name)}, your Key Account Manager" class="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow shrink-0">
              <div class="min-w-0"><p class="text-sm font-semibold text-slate-900 truncate">${esc(k.name)}</p><p class="text-xs text-slate-500">Business, campaigns &amp; products</p></div>
            </div>
            ${contactBtn('phone', 'Call', k.phone, `tel:${k.phone.replace(/[^\d+]/g, '')}`, true)}
            ${contactBtn('mail', 'Email', k.email, `mailto:${k.email}`)}
          </div>
        </div>
        <div class="${DASH_CARD} p-4 flex items-center gap-4">
          ${appQr('w-20 h-20 shrink-0')}
          <div class="min-w-0">
            <h3 class="text-sm font-semibold text-slate-900">Merchant App</h3>
            <p class="text-xs text-slate-500 mt-1">Scan to download the app and manage your store on the go.</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="dash-overview" class="space-y-2">
        <div class="flex items-center justify-between gap-3 flex-wrap">
          <h2 id="dash-overview" class="text-sm font-semibold text-slate-900">Overview <span class="ml-1 text-xs font-normal text-slate-500">Change ${d.prevLabel}</span></h2>
          <p class="inline-flex items-center gap-1.5 text-xs text-slate-500">${ic('calendar', 'w-3.5 h-3.5')}${fmtDate(d.from)}, ${fmtHM(d.from)} – ${fmtDate(d.to)}, ${fmtHM(d.to)}</p>
        </div>
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          ${statCard({ title: 'Successful Payment Value', value: fmtBDTShort(d.now.sales), cur: d.now.sales, prev: d.prev.sales, vs: d.prevLabel, empty: !d.now.total, prevEmpty: !d.prev.total, link: 'href="#/analytics/business-analytics"' })}
          ${statCard({ title: 'Successful Transactions', value: d.now.success.toLocaleString(), cur: d.now.success, prev: d.prev.success, vs: d.prevLabel, empty: !d.now.total, prevEmpty: !d.prev.total, link: 'data-action="goto-txn" data-status="success"' })}
          ${statCard({ title: 'Success Rate', value: d.now.total ? `${d.now.rate.toFixed(1)}%` : '—', cur: d.now.rate, prev: d.prev.rate, pp: true, empty: !d.now.total, prevEmpty: !d.prev.total, vs: d.prevLabel, link: 'data-action="goto-txn" data-status="all"' })}
          ${statCard({ title: 'Avg. Ticket Size', value: d.now.success ? fmtBDT(d.now.avg) : '—', cur: d.now.avg, prev: d.prev.avg, empty: !d.now.success, prevEmpty: !d.prev.success, vs: d.prevLabel, link: 'href="#/analytics/business-analytics"' })}
        </div>
      </section>

      <!-- Two independent columns; the hour chart takes any spare height so both end on one line.
           On phones the action column comes first: quick actions and open issues before charts. -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div class="lg:col-span-2 flex flex-col gap-4 min-w-0">
          <div class="${DASH_CARD}">
            ${dashHead('Successful Transactions &amp; Amount', `${dash.preset === 'today' ? 'Hourly' : 'Daily'} successful payment value and count · Select a ${dash.preset === 'today' ? 'bar' : 'day'} to see its transactions`)}
            <div class="px-4 py-3 h-56"><canvas id="chart-sales"></canvas></div>
          </div>

          <div class="${DASH_CARD} overflow-hidden">
            ${dashHead('Recent Transactions', 'Latest payments in the selected period', linkMore('#/transactions/all', 'View all'))}
            <div class="overflow-x-auto">
              <table class="w-full text-left text-sm">
                <thead class="bg-slate-50 border-b border-slate-200"><tr>
                  ${['Date & Time', 'Transaction ID', 'Payment Method', 'Amount', 'Status'].map((h, i) => `<th class="h-9 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap ${i === 3 ? 'text-right' : ''} ${i === 1 ? 'hidden lg:table-cell' : i === 2 ? 'hidden sm:table-cell' : ''}">${h}</th>`).join('')}
                </tr></thead>
                <tbody class="divide-y divide-slate-100">
                  ${recent.length ? recent.map(t => `
                    <tr data-action="open-txn" data-value="${t.id}" class="hover:bg-slate-50 transition-colors cursor-pointer">
                      <td class="px-4 py-2">${txnCell('date', t)}</td>
                      <td class="px-4 py-2 hidden lg:table-cell"><span class="font-mono text-xs text-slate-800">${t.id}</span></td>
                      <td class="px-4 py-2 hidden sm:table-cell">${txnCell('method', t)}</td>
                      <td class="px-4 py-2 text-right">${txnCell('amount', t)}</td>
                      <td class="px-4 py-2">${badge(t.status)}</td>
                    </tr>`).join('') : `<tr><td colspan="5" class="h-24 text-center text-slate-500">No transactions in this period yet.</td></tr>`}
                </tbody>
              </table>
            </div>
          </div>

          <div class="${DASH_CARD} flex-1 flex flex-col">
            ${dashHead('Transactions by Hour', Math.max(...d.byHour) ? `Peak hour: ${hourLabel(peak)} – ${hourLabel((peak + 1) % 24)}` : 'No payments in this period yet')}
            <div class="px-4 py-3 flex-1 min-h-72"><canvas id="chart-hours"></canvas></div>
          </div>
        </div>

        <div class="order-first lg:order-none flex flex-col gap-4 min-w-0">
          <div class="${DASH_CARD}">
            ${dashHead('Needs Attention', 'Issues that may affect payments and payouts', `<span class="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${toReview ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}">${toReview ? `${toReview} to review` : 'All clear'}</span>`)}
            <div class="divide-y divide-slate-100">
              ${attention.map(a => `
                <button ${a.action} class="w-full flex items-center gap-2.5 px-4 py-2 text-left last:rounded-b-xl transition-colors ${a.priority ? 'bg-amber-50/70 hover:bg-amber-50' : 'hover:bg-slate-50'}">
                  <span class="w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${a.tone}">${ic(a.icon, 'w-3.5 h-3.5')}</span>
                  <span class="flex-1 min-w-0"><span class="flex items-center gap-1.5 min-w-0"><span class="text-sm font-medium text-slate-800 truncate">${a.title}</span>${a.priority ? '<span class="shrink-0 rounded px-1.5 py-px text-[10px] font-semibold bg-amber-100 text-amber-800">Priority</span>' : ''}</span><span class="block text-[11px] text-slate-500 truncate">${a.sub}</span></span>
                  <span class="min-w-[2rem] text-right text-sm font-bold ${a.value ? 'text-slate-900' : 'text-slate-300'}">${a.value}</span>${ic('chevron-right', 'w-4 h-4 text-slate-300 shrink-0')}
                </button>`).join('')}
            </div>
          </div>

          <div class="${DASH_CARD}">
            ${dashHead('Quick Actions', 'Start a payment in a few clicks')}
            <div class="p-2 flex flex-col">
              ${quick.map(q => `
                <button ${q.action} class="group w-full flex items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-primary-50/60 transition-colors">
                  <span class="w-8 h-8 flex items-center justify-center shrink-0">${ic(q.icon, 'w-5 h-5 portal-icon-muted')}</span>
                  <span class="flex-1 min-w-0"><span class="block text-sm font-semibold text-slate-800 truncate">${q.label}</span><span class="block text-xs text-slate-500 truncate">${q.hint}</span></span>
                  ${ic('chevron-right', 'w-4 h-4 text-slate-300 group-hover:text-primary-600 shrink-0 transition-colors')}
                </button>`).join('')}
            </div>
          </div>

          <div class="${DASH_CARD}">
            ${dashHead('Settlement', 'Estimated, mock values', linkMore('#/analytics/settlement-report', 'Report'))}
            <div class="p-4 space-y-3">
              <div class="rounded-lg bg-primary-50/60 border border-primary-100 px-3 py-2.5">
                <p class="text-xs font-semibold text-primary-700">Pending Settlement</p>
                <p class="text-xl font-bold tracking-tight text-slate-900 mt-0.5">${fmtBDT(d.pendingSettlement)}</p>
                <p class="text-xs text-slate-500 mt-0.5 inline-flex items-center gap-1.5">${ic('calendar-clock', 'w-3.5 h-3.5')}Next payout: ${d.nextPayout ? `${fmtDate(d.nextPayout)}, ${fmtTime(d.nextPayout)}` : '—'} (est.)</p>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div class="px-3 py-2 rounded-lg border border-slate-200"><p class="text-[11px] font-medium text-slate-500">Last Settled</p><p class="text-sm font-bold text-slate-900 mt-1">${fmtBDTShort(d.lastSettled)}</p><p class="text-[11px] text-slate-400 mt-0.5">${d.lastSettledAt ? `${fmtShort(d.lastSettledAt)}, ${fmtTime(d.lastSettledAt)}` : '—'}</p></div>
                <div class="px-3 py-2 rounded-lg border border-slate-200"><p class="text-[11px] font-medium text-slate-500">Settlement Account</p><p class="text-sm font-bold text-slate-900 mt-1 font-mono whitespace-nowrap">A/C •••• ••••</p><p class="text-[11px] text-slate-400 mt-0.5">Primary bank (masked)</p></div>
              </div>
            </div>
            <a href="#/account/store-list" class="flex items-center gap-3 px-4 py-2.5 border-t border-slate-100 hover:bg-slate-50 rounded-b-xl transition-colors">
              <span class="w-8 h-8 flex items-center justify-center shrink-0">${ic('store', 'w-5 h-5 portal-icon-muted')}</span>
              <span class="flex-1 min-w-0">
                <span class="block text-sm font-semibold text-slate-900">Stores</span>
                <span class="block text-xs text-slate-500">${ACCOUNT_STORES.length} total · <span class="text-emerald-600 font-medium">${activeStores} active</span> · ${ACCOUNT_STORES.length - activeStores} inactive</span>
              </span>
              ${ic('chevron-right', 'w-4 h-4 text-slate-300')}
            </a>
          </div>

          <div class="${DASH_CARD}">
            ${dashHead('Payment Channels', 'Share of successful sales', linkMore('#/analytics/market-share', 'Details'))}
            <div class="p-4 space-y-3">
              ${d.channels.map(c => `
                <div title="${c.count.toLocaleString()} transactions">
                  <div class="flex items-center justify-between gap-3 text-sm"><span class="font-medium text-slate-700">${c.type} <span class="text-xs font-normal text-slate-400">${c.share.toFixed(1)}%</span></span><span class="font-semibold text-slate-900">${fmtBDTShort(c.amount)}</span></div>
                  <div class="mt-1.5 h-1.5 rounded-full bg-slate-100 overflow-hidden"><div class="h-full rounded-full bg-primary-600" style="width:${c.share.toFixed(1)}%"></div></div>
                </div>`).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

function mountDashboardCharts() {
  if (!window.Chart) return;
  const d = dashData();
  setChartDefaults();
  const grid = { color: '#f1f5f9' };
  charts.push(new Chart($('#chart-sales'), {
    data: {
      labels: d.series.map(x => x.label),
      // Combo: successful amount as bars (left axis), successful count as a line (right axis).
      datasets: [
        { type: 'bar', label: 'Successful Amount (BDT)', data: d.series.map(x => x.sales), yAxisID: 'y', backgroundColor: '#c1d2eb', hoverBackgroundColor: '#99b5df', borderRadius: 4, maxBarThickness: 36, order: 1 },
        { type: 'line', label: 'Successful Transactions (count)', data: d.series.map(x => x.success), yAxisID: 'y1', borderColor: '#295cab', backgroundColor: '#fff', borderWidth: 3, pointRadius: 4, pointHoverRadius: 6, pointBorderWidth: 2, tension: 0.25, order: 0 },
      ],
    },
    options: {
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      // Clicking a day (or hour) opens its successful transactions.
      onClick: (_, els) => {
        const b = els.length && d.series[els[0].index];
        if (!b) return;
        const s = txnState('all');
        Object.assign(s, { search: '', status: 'success', method: 'all', range: { preset: 'custom', from: b.from, to: b.to } });
        commitFilters(s);
        location.hash = '#/transactions/all';
      },
      onHover: (e, els) => { e.native.target.style.cursor = els.length ? 'pointer' : 'default'; },
      plugins: {
        legend: { display: true, position: 'top', align: 'start', labels: { boxWidth: 12, boxHeight: 8, sort: (a, b) => a.datasetIndex - b.datasetIndex } },
        tooltip: { callbacks: { label: (c) => c.dataset.yAxisID === 'y' ? ` ${fmtBDT(c.raw)} successful amount` : ` ${c.raw} successful of ${d.series[c.dataIndex].total} transactions` } },
      },
      scales: {
        x: { grid: { display: false } },
        y: { grid, beginAtZero: true, title: { display: true, text: 'Amount (BDT)' }, ticks: { callback: (v) => v >= 1e5 ? `${v / 1e5}L` : v >= 1e3 ? `${v / 1e3}k` : v } },
        y1: { position: 'right', beginAtZero: true, grid: { display: false }, title: { display: true, text: 'Transactions' }, ticks: { precision: 0 } },
      },
    },
  }));
  const peak = Math.max(...d.byHour);
  charts.push(new Chart($('#chart-hours'), {
    type: 'bar',
    data: {
      labels: d.byHour.map((_, h) => pad(h)),
      datasets: [{ label: 'Transactions', data: d.byHour, backgroundColor: d.byHour.map(v => v === peak ? '#295cab' : '#c1d2eb'), borderRadius: 3 }],
    },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { title: (c) => `${c[0].label}:00 – ${c[0].label}:59` } } },
      scales: { x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkipPadding: 8 } }, y: { grid, ticks: { precision: 0 } } },
    },
  }));
}
