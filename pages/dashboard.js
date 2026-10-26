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
  const series = buckets.map(b => ({ label: b.label, ...summarize(cur.filter(t => t.date >= b.from && t.date <= b.to)) }));

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

function spark(values, color) {
  if (values.length < 2) return '';
  const max = Math.max(...values), min = Math.min(...values);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${38 - ((v - min) / ((max - min) || 1)) * 34}`).join(' ');
  return `<svg viewBox="0 0 100 40" preserveAspectRatio="none" class="w-full h-full"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}

function statCard({ title, value, cur, prev, series, pp, empty, prevEmpty, vs = 'vs previous period' }) {
  // Rates and averages can't be compared when either period has no payments.
  let delta = null;
  if (!empty && !prevEmpty) delta = pp ? cur - prev : prev ? (cur - prev) / prev * 100 : null;
  const up = delta !== null && delta >= 0;
  const text = empty ? 'No payments in this period yet' : delta === null ? 'No data to compare with' : `${up ? '+' : ''}${delta.toFixed(1)}${pp ? ' pts' : '%'} ${vs}`;
  return `
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col hover:shadow-md transition-shadow">
      <p class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">${title}</p>
      <div class="flex items-end justify-between gap-3">
        <div class="min-w-0">
          <p class="text-2xl font-bold text-slate-900 truncate">${value}</p>
          <p class="text-xs mt-1 font-medium ${delta === null ? 'text-slate-400' : up ? 'text-emerald-600' : 'text-rose-600'}">${text}</p>
        </div>
        <div class="w-24 h-10 shrink-0">${spark(series, '#295cab')}</div>
      </div>
    </div>`;
}

const cardHead = (title, sub, right = '') => `
  <div class="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
    <div><h3 class="text-sm font-semibold text-slate-900">${title}</h3>${sub ? `<p class="text-xs text-slate-500 mt-0.5">${sub}</p>` : ''}</div>${right}
  </div>`;

function renderDashboard() {
  const d = dashData();
  const peak = d.byHour.indexOf(Math.max(...d.byHour));
  const failedCount = d.cur.filter(t => t.status === 'failed').length;
  const pendingCount = d.cur.filter(t => t.status === 'pending').length;
  const recent = d.cur.slice(0, 6);
  const hourLabel = (h) => `${pad(h % 12 || 12)} ${h >= 12 ? 'PM' : 'AM'}`;

  const attention = [
    { icon: 'circle-x', tone: 'text-rose-600 bg-rose-50', title: 'Failed transactions', sub: 'In the selected period', value: failedCount, action: `data-action="goto-txn" data-status="failed"` },
    { icon: 'clock', tone: 'text-amber-600 bg-amber-50', title: 'Pending transactions', sub: 'Waiting for provider confirmation', value: pendingCount, action: `data-action="goto-txn" data-status="pending"` },
    { icon: 'undo-2', tone: 'text-indigo-600 bg-indigo-50', title: 'Refund requests', sub: 'Open — in review or with the bank', value: REFUNDS.filter(r => REFUND_OPEN.has(r.status)).length, action: `data-action="goto-list" data-path="${REFUND_PATH}" data-status="pending"` },
    { icon: 'shield-alert', tone: 'text-slate-600 bg-slate-100', title: 'Chargebacks to respond', sub: 'Waiting for your evidence', value: CHARGEBACKS.filter(c => CB_OPEN.has(c.status)).length, action: `data-action="goto-list" data-path="${CB_PATH}" data-status="action"` },
  ];
  const quick = [
    { icon: 'link', label: 'Create Payment Link', to: '/products/payment-links' },
    { icon: 'qr-code', label: 'Generate Payment QR', to: '/products/payment-qr' },
    { icon: 'file-text', label: 'Create Digital Invoice', to: '/products/digital-invoices' },
  ];

  return `
    <div class="space-y-6">
      <div class="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p class="text-slate-500 text-sm">Welcome back, Demo Merchant. Here's how your stores are performing.</p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          ${storePill('dash', 'All Stores')}
          <div class="inline-flex p-1 bg-white border border-slate-200 rounded-full shadow-sm">
            ${DASH_PRESETS.map(p => `<button data-action="dash-preset" data-value="${p.value}" class="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${dash.preset === p.value ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}">${p.label}</button>`).join('')}
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-4">
        <h2 class="text-sm font-semibold text-slate-900">Overview <span class="font-normal text-slate-500 text-xs ml-1">${fmtDate(d.from)}, ${fmtHM(d.from)} – ${fmtDate(d.to)}, ${fmtHM(d.to)}</span></h2>
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          ${statCard({ title: 'Total Sales', value: fmtBDTShort(d.now.sales), cur: d.now.sales, prev: d.prev.sales, vs: d.prevLabel, empty: !d.now.total, prevEmpty: !d.prev.total, series: d.series.map(x => x.sales) })}
          ${statCard({ title: 'Successful Transactions', value: d.now.success.toLocaleString(), cur: d.now.success, prev: d.prev.success, vs: d.prevLabel, empty: !d.now.total, prevEmpty: !d.prev.total, series: d.series.map(x => x.success) })}
          ${statCard({ title: 'Success Rate', value: d.now.total ? `${d.now.rate.toFixed(1)}%` : '—', cur: d.now.rate, prev: d.prev.rate, pp: true, empty: !d.now.total, prevEmpty: !d.prev.total, vs: d.prevLabel, series: d.series.map(x => x.rate) })}
          ${statCard({ title: 'Avg. Ticket Size', value: d.now.success ? fmtBDT(d.now.avg) : '—', cur: d.now.avg, prev: d.prev.avg, empty: !d.now.success, prevEmpty: !d.prev.success, vs: d.prevLabel, series: d.series.map(x => x.avg) })}
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="bg-white rounded-lg border border-slate-200 shadow-sm lg:col-span-2">
          ${cardHead('Sales Trend', dash.preset === 'today' ? 'Successful sales per hour' : 'Successful sales per day')}
          <div class="p-5 h-72"><canvas id="chart-sales"></canvas></div>
        </div>
        <div class="bg-white rounded-lg border border-slate-200 shadow-sm">
          ${cardHead('Payment Channels', 'Share of successful sales')}
          <div class="p-5 space-y-4">
            ${d.channels.map(c => `
              <div>
                <div class="flex items-center justify-between text-sm"><span class="font-medium text-slate-700">${c.type}</span><span class="font-semibold text-slate-900">${fmtBDTShort(c.amount)}</span></div>
                <div class="mt-1.5 h-1.5 rounded-full bg-slate-100 overflow-hidden"><div class="h-full rounded-full bg-primary-600" style="width:${c.share.toFixed(1)}%"></div></div>
                <p class="text-[11px] text-slate-500 mt-1">${c.count.toLocaleString()} transactions · ${c.share.toFixed(1)}%</p>
              </div>`).join('')}
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="bg-white rounded-lg border border-slate-200 shadow-sm lg:col-span-2">
          ${cardHead('Transactions by Hour', Math.max(...d.byHour) ? `Peak hour: ${hourLabel(peak)} – ${hourLabel((peak + 1) % 24)}` : 'No payments in this period yet')}
          <div class="p-5 h-56"><canvas id="chart-hours"></canvas></div>
        </div>
        <div class="bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col">
          ${cardHead('Settlement', 'Estimated, mock values', `<a href="#/settlements/settlement-report" class="text-xs font-medium text-primary-600 hover:text-primary-700">Report</a>`)}
          <div class="p-5 space-y-4 flex-1">
            <div>
              <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Pending Settlement</p>
              <p class="text-2xl font-bold text-slate-900 mt-1">${fmtBDT(d.pendingSettlement)}</p>
              <p class="text-xs text-slate-500 mt-0.5">Next payout: ${d.nextPayout ? `${fmtDate(d.nextPayout)}, ${fmtTime(d.nextPayout)}` : '—'} (est.)</p>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="p-3 rounded border bg-slate-50 border-slate-100"><p class="text-[10px] text-slate-500 uppercase tracking-wide">Last Settled</p><p class="text-sm font-bold text-slate-900 mt-1">${fmtBDTShort(d.lastSettled)}</p><p class="text-[10px] text-slate-400 mt-0.5">${d.lastSettledAt ? `${fmtShort(d.lastSettledAt)}, ${fmtTime(d.lastSettledAt)}` : '—'}</p></div>
              <div class="p-3 rounded border bg-slate-50 border-slate-100"><p class="text-[10px] text-slate-500 uppercase tracking-wide">Settlement Account</p><p class="text-sm font-bold text-slate-900 mt-1 font-mono whitespace-nowrap">A/C •••• ••••</p><p class="text-[10px] text-slate-400 mt-0.5">Primary bank (masked)</p></div>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="bg-white rounded-lg border border-slate-200 shadow-sm lg:col-span-2 overflow-hidden">
          ${cardHead('Recent Transactions', 'Latest payments in the selected period', `<a href="#/transactions/all" class="text-xs font-medium text-primary-600 hover:text-primary-700 inline-flex items-center gap-1">View all${ic('arrow-right', 'w-3.5 h-3.5')}</a>`)}
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-50 border-b border-slate-200"><tr>
              ${['Date & Time', 'Transaction ID', 'Payment Method', 'Amount', 'Status'].map((h, i) => `<th class="h-10 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap ${i === 3 ? 'text-right' : ''} ${i === 1 ? 'hidden lg:table-cell' : i === 2 ? 'hidden sm:table-cell' : ''}">${h}</th>`).join('')}
            </tr></thead>
            <tbody class="divide-y divide-slate-100">
              ${recent.length ? recent.map(t => `
                <tr data-action="open-txn" data-value="${t.id}" class="hover:bg-slate-50 transition-colors cursor-pointer">
                  <td class="px-4 py-2.5">${txnCell('date', t)}</td>
                  <td class="px-4 py-2.5 hidden lg:table-cell"><span class="font-mono text-xs text-slate-800">${t.id}</span></td>
                  <td class="px-4 py-2.5 hidden sm:table-cell">${txnCell('method', t)}</td>
                  <td class="px-4 py-2.5 text-right">${txnCell('amount', t)}</td>
                  <td class="px-4 py-2.5">${badge(t.status)}</td>
                </tr>`).join('') : `<tr><td colspan="5" class="h-24 text-center text-slate-500">No transactions in this period yet.</td></tr>`}
            </tbody>
          </table>
        </div>

        <div class="space-y-6">
          <div class="bg-white rounded-lg border border-slate-200 shadow-sm">
            ${cardHead('Needs Attention')}
            <div class="divide-y divide-slate-100">
              ${attention.map(a => `
                <button ${a.action} class="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-slate-50 transition-colors">
                  <span class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${a.tone}">${ic(a.icon, 'w-4 h-4')}</span>
                  <span class="flex-1 min-w-0"><span class="block text-sm font-medium text-slate-800">${a.title}</span><span class="block text-xs text-slate-500">${a.sub}</span></span>
                  <span class="text-sm font-bold text-slate-900">${a.value}</span>${ic('chevron-right', 'w-4 h-4 text-slate-400')}
                </button>`).join('')}
            </div>
          </div>
          <div class="bg-white rounded-lg border border-slate-200 shadow-sm">
            ${cardHead('Quick Actions')}
            <div class="p-3 grid gap-1">
              ${quick.map(q => `<a href="#${q.to}" class="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-primary-600 transition-colors"><span class="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center">${ic(q.icon, 'w-4 h-4')}</span>${q.label}</a>`).join('')}
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
      datasets: [
        { type: 'bar', label: 'Sales', data: d.series.map(x => x.sales), backgroundColor: '#295cab', hoverBackgroundColor: '#4a75ba', borderRadius: 4, maxBarThickness: 28 },
      ],
    },
    options: {
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (c) => ` ${fmtBDT(c.raw)} · Sales`, afterLabel: (c) => ` ${d.series[c.dataIndex].success} successful of ${d.series[c.dataIndex].total} transactions` } },
      },
      scales: {
        x: { grid: { display: false } },
        y: { grid, beginAtZero: true, ticks: { callback: (v) => v >= 1e5 ? `${v / 1e5}L` : v >= 1e3 ? `${v / 1e3}k` : v } },
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
      scales: { x: { grid: { display: false } }, y: { grid, ticks: { precision: 0 } } },
    },
  }));
}
