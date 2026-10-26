// =====================================================================
// Business Analytics
// =====================================================================
function renderBusinessAnalytics() {
  return analyticsShell('Business Analytics', 'How your business is performing — sales, customers and payment success.', (list) => {
    const ok = okList(list);
    const customers = groupRows(ok, 'custId');
    const repeat = customers.filter(c => c.count > 1).length;
    const { buckets, weekly } = anBuckets();
    const daily = bucketize(list, buckets, (l) => ({ count: l.length, ok: okList(l).length, sales: salesOf(l), rate: l.length ? rateOf(l) : null }));
    const stores = groupRows(list, 'storeName');
    const reasons = groupRows(list.filter(t => t.status === 'failed'), 'reason');
    const DAY_ORDER = [6, 0, 1, 2, 3, 4, 5];
    const DAY_LABEL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const grid = DAY_ORDER.map(d => Array.from({ length: 24 }, (_, h) => ok.filter(t => t.date.getDay() === d && t.date.getHours() === h).length));
    const peak = Math.max(1, ...grid.flat());
    const level = (n) => n ? SEQ[Math.min(SEQ.length - 1, Math.floor(n / peak * SEQ.length))] : '#f8fafc';
    return `
      <div class="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-6 gap-4">
        ${metricCard({ title: 'Gross Sales', value: fmtBDTShort(salesOf(list)) })}
        ${metricCard({ title: 'Transactions', value: list.length.toLocaleString(), sub: `${ok.length.toLocaleString()} successful` })}
        ${metricCard({ title: 'Success Rate', value: fmtPct(rateOf(list)) })}
        ${metricCard({ title: 'Avg. Ticket', value: fmtBDT0(ok.length ? salesOf(list) / ok.length : 0) })}
        ${metricCard({ title: 'Unique Customers', value: customers.length.toLocaleString() })}
        ${metricCard({ title: 'Repeat Customers', value: fmtPct(pct(repeat, customers.length)), sub: `${repeat} paid more than once` })}
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        ${anCard('Sales', `Successful sales per ${weekly ? 'week' : 'day'}`, barChart('an-sales', buckets.map(b => b.label), daily.map(d => d.sales), { label: 'Sales', fmt: (v) => v >= 1e5 ? `৳${(v / 1e5).toFixed(1)}L` : v >= 1e3 ? `৳${Math.round(v / 1e3)}k` : `৳${v}` }), 'lg:col-span-2')}
        ${anCard('Sales by Store', 'Share of successful sales', rankBars(stores, { value: r => r.sales, label: r => fmtBDTShort(r.sales), sub: r => `${fmtPct(r.salesShare)} of sales · ${fmtPct(r.rate)} success` }))}
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        ${anCard('Success Rate', `Successful ÷ all transactions per ${weekly ? 'week' : 'day'}`, lineChart('an-rate', buckets.map(b => b.label), daily.map(d => d.rate), { label: 'Success rate', fmt: (v) => `${Math.round(v)}%`, min: 50, max: 100 }), 'lg:col-span-2')}
        ${anCard('Top Failure Reasons', `${reasons.reduce((s, r) => s + r.count, 0)} failed payments`, rankBars(reasons, { value: r => r.count, label: r => r.count, sub: r => `${fmtPct(r.share)} of failures` }))}
      </div>
      ${anCard('When Customers Pay', 'Successful payments by weekday and hour — darker means busier', `
        <div class="grid gap-[2px] items-center" style="grid-template-columns:36px repeat(24,minmax(0,1fr))">
          <span></span>${Array.from({ length: 24 }, (_, h) => `<span class="text-[10px] text-slate-400 text-center">${h % 3 === 0 ? pad(h) : ''}</span>`).join('')}
          ${grid.map((row, i) => `<span class="text-[11px] text-slate-500">${DAY_LABEL[DAY_ORDER[i]]}</span>${row.map((n, h) => `<span class="h-6 rounded-sm hover:ring-2 hover:ring-slate-900/30" style="background:${level(n)}" title="${DAY_LABEL[DAY_ORDER[i]]} ${pad(h)}:00–${pad(h)}:59 · ${n} payments"></span>`).join('')}`).join('')}
        </div>
        <div class="flex items-center gap-1.5 mt-3 text-[11px] text-slate-500">Less ${SEQ.map(c => `<span class="w-4 h-3 rounded-sm" style="background:${c}"></span>`).join('')} More</div>`)}
      ${anCard('Summary Table', `Per ${weekly ? 'week' : 'day'}, newest first`, anTable('business-analytics',
        [weekly ? 'Week of' : 'Date', 'Transactions', 'Successful', 'Success Rate', 'Gross Sales'],
        buckets.map((b, i) => [b.label, daily[i].count, daily[i].ok, daily[i].rate == null ? '—' : fmtPct(daily[i].rate), fmtBDT0(daily[i].sales)]).reverse(),
        { right: [1, 2, 3, 4] }), '', exportBtn)}`;
  });
}
