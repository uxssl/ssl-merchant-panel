// =====================================================================
// Market Share (share of your own payments by channel, scheme and provider)
// =====================================================================
function renderMarketShare() {
  return analyticsShell('Market Share', 'Which payment channels and providers your customers choose.', (list) => {
    const channels = groupRows(list, 'type', CHANNELS);
    const methods = groupRows(list, 'method');
    const schemes = groupRows(list.filter(t => t.type === 'Card'), 'method');
    const mfs = groupRows(list.filter(t => t.type === 'Mobile Banking'), 'method');
    const others = groupRows(list.filter(t => ['QR', 'Wallet', 'Internet Banking'].includes(t.type)), 'method');
    const top = [...channels].sort((a, b) => b.sales - a.sales)[0];
    const { buckets, weekly } = anBuckets();
    const share = (type) => channels.find(c => c.name === type)?.salesShare || 0;
    return `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        ${metricCard({ title: 'Top Channel', value: top ? top.name : '—', sub: top ? `${fmtPct(top.salesShare)} of sales` : '' })}
        ${metricCard({ title: 'Top Method', value: methods[0]?.name || '—', sub: methods[0] ? `${fmtPct(methods[0].share)} of transactions` : '' })}
        ${metricCard({ title: 'Card Share', value: fmtPct(share('Card')), sub: 'of sales' })}
        ${metricCard({ title: 'Mobile Banking Share', value: fmtPct(share('Mobile Banking')), sub: 'of sales' })}
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        ${anCard('Channel Share', 'Share of successful sales', donut('an-channels', channels, CHANNELS, { value: r => r.sales, label: r => fmtPct(r.salesShare), sub: r => fmtBDTShort(r.sales) }))}
        ${anCard('Sales by Channel', `Per ${weekly ? 'week' : 'day'}`, stackedBar('an-channel-trend', buckets.map(b => b.label),
          CHANNELS.map(c => ({ name: c, data: bucketize(list.filter(t => t.type === c), buckets, salesOf) })), CHANNELS), 'lg:col-span-2')}
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        ${anCard('Card Schemes', 'Share of card transactions', rankBars(schemes, { value: r => r.count, label: r => fmtPct(r.share), sub: r => `${r.count} txns · ${fmtPct(r.rate)} success` }))}
        ${anCard('Mobile Banking', 'Share of MFS transactions', rankBars(mfs, { value: r => r.count, label: r => fmtPct(r.share), sub: r => `${r.count} txns · ${fmtPct(r.rate)} success` }))}
        ${anCard('QR, Wallet & Internet Banking', 'Share of these transactions', rankBars(others, { value: r => r.count, label: r => fmtPct(r.share), sub: r => `${r.count} txns · ${fmtPct(r.rate)} success` }))}
      </div>
      ${anCard('Payment Method Share', 'All methods, by number of transactions', anTable('market-share',
        ['Method', 'Channel', 'Transactions', 'Share of Txns', 'Sales', 'Share of Sales', 'Success Rate'],
        methods.map(r => [r.name, r.items[0].type, r.count, fmtPct(r.share), fmtBDT0(r.sales), fmtPct(r.salesShare), fmtPct(r.rate)]),
        { right: [2, 3, 4, 5, 6] }), '', exportBtn)}
      ${mockNote('Shares are of your own payments only. Industry-wide market share across SSLCOMMERZ merchants is not shown.')}`;
  });
}
