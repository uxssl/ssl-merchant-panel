// =====================================================================
// Google Pay and Bangla QR transaction reports (old panel): successful payments per day,
// with a Chart View and a List View. Filtered by date range and store.
// =====================================================================
const TXN_RPT = { gpay: '/analytics/google-pay-report', bqr: '/analytics/bangla-qr-report' };
const rptView = { gpay: 'chart', bqr: 'chart' };
// Google Pay payments are either OTP based (card added in the wallet needs an OTP) or direct (mock split).
const gpayKind = (t) => idHash(t.id) % 3 === 0 ? 'direct' : 'otp';

function rptDays(method) {
  const s = applied(pageState());
  const list = TXNS.filter(t => t.method === method && (t.status === 'success' || t.status === 'refunded') && inStores(t.store) && inRange(t, s.range));
  const days = new Map();
  for (const t of list) {
    const key = +startOfDay(t.date);
    const d = days.get(key) || { day: startOfDay(t.date), n: 0, amount: 0, otpN: 0, otpAmt: 0, directN: 0, directAmt: 0 };
    d.n++; d.amount += t.amount;
    if (method === 'Google Pay') { const k = gpayKind(t); d[`${k}N`]++; d[`${k}Amt`] += t.amount; }
    days.set(key, d);
  }
  return [...days.values()].sort((a, b) => b.day - a.day);
}

function rptPage({ key, title, sub, method, cols, row, chart }) {
  const s = pageState();
  const days = rptDays(method);
  const sum = (k) => days.reduce((n, d) => n + d[k], 0);
  const view = rptView[key];
  const tab = (v, icon, label) => `<button data-action="rpt-view" data-key="${key}" data-value="${v}" class="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${view === v ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}">${ic(icon, 'w-4 h-4')}${label}</button>`;
  if (view === 'chart' && days.length) queueChart(`rpt-${key}`, chart([...days].reverse()));
  return `
    <div class="space-y-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">${title}</h1>
          <p class="text-slate-500 text-sm">${sub}</p>
        </div>
        <div class="inline-flex p-1 bg-white border border-slate-200 rounded-full shadow-sm">${tab('chart', 'chart-column', 'Chart View')}${tab('list', 'list', 'List View')}</div>
      </div>
      <div class="filter-bar-container flex items-center gap-3 flex-wrap">
        ${dtPill(s.range, s.defaultPreset)}
        ${storePill('list', 'Store')}
        ${filterActions(s)}
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        ${metricCard({ title: 'Total Transactions', value: sum('n').toLocaleString() })}
        ${metricCard({ title: 'Total Amount', value: fmtBDT(sum('amount')) })}
        ${metricCard({ title: 'Days With Payments', value: days.length.toLocaleString() })}
      </div>
      <section class="bg-white rounded-lg border border-slate-200 shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-100">
          <h2 class="text-sm font-semibold text-slate-900">${title}${view === 'list' ? ' Details' : ''} <span class="ml-1 text-xs font-normal text-slate-500">${days.length} rows</span></h2>
          <button data-action="export" class="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 shadow-sm">${ic('download', 'w-4 h-4')}Export CSV</button>
        </div>
        <div class="p-4">
          ${!days.length ? emptyBlock('No data available for this period')
            : view === 'chart' ? `<div class="h-80"><canvas id="rpt-${key}" aria-label="${title} chart" role="img"></canvas></div>`
            : `<div>${miniTable(['Date', ...cols], days.map(d => [`<span class="whitespace-nowrap">${fmtDate(d.day)}</span>`, ...row(d)]), { right: cols.map((_, i) => i + 1), total: ['Total', ...row(Object.fromEntries(['n', 'amount', 'otpN', 'otpAmt', 'directN', 'directAmt'].map(k => [k, sum(k)])))] })}</div>`}
        </div>
      </section>
    </div>`;
}

const rptAxis = (label) => ({ beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: label } });

function renderGpayReport() {
  return rptPage({
    key: 'gpay', method: 'Google Pay',
    title: 'Google Pay Transaction Report',
    sub: 'Successful Google Pay payments per day — OTP based and direct.',
    cols: ['OTP Based Amount', 'OTP Based Total Transactions', 'Direct Payment Amount', 'Direct Payment Total Transactions', 'Total Transactions', 'Total Amount'],
    row: d => [fmtBDT(d.otpAmt), d.otpN.toLocaleString(), fmtBDT(d.directAmt), d.directN.toLocaleString(), `<strong>${d.n.toLocaleString()}</strong>`, `<strong>${fmtBDT(d.amount)}</strong>`],
    chart: days => ({
      type: 'bar',
      data: { labels: days.map(d => fmtShort(d.day)), datasets: [
        { label: 'OTP Based', data: days.map(d => d.otpN), backgroundColor: SERIES[0], stack: 'n' },
        { label: 'Direct Payment', data: days.map(d => d.directN), backgroundColor: SERIES[1], stack: 'n' },
      ] },
      options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { x: { stacked: true }, y: { ...rptAxis('Total Transactions'), stacked: true } } },
    }),
  });
}

function renderBanglaQrReport() {
  return rptPage({
    key: 'bqr', method: 'Bangla QR',
    title: 'Bangla QR Transaction Report',
    sub: 'Successful Bangla QR payments per day.',
    cols: ['Transaction Amount (BDT)', 'Total Transactions'],
    row: d => [fmtBDT(d.amount), d.n.toLocaleString()],
    chart: days => ({
      type: 'bar',
      data: { labels: days.map(d => fmtShort(d.day)), datasets: [{ label: 'Total Transactions', data: days.map(d => d.n), backgroundColor: SERIES[0] }] },
      options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: rptAxis('Total Transactions') } },
    }),
  });
}
