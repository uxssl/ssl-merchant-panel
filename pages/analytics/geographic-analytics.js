// =====================================================================
// Geographic Analytics
// =====================================================================
function renderGeographic() {
  return analyticsShell('GEO Location', 'Where your customers pay from, by division and district.', (list) => {
    const divisions = groupRows(list, 'division').sort((a, b) => b.sales - a.sales);
    const local = list.filter(t => t.division !== 'International');
    const districts = groupRows(local, 'district').sort((a, b) => b.sales - a.sales);
    const intl = groupRows(list.filter(t => t.division === 'International'), 'district');
    const AREA = ['Dhaka division', 'Outside Dhaka', 'International'];
    const areas = groupRows(list, t => t.division === 'Dhaka' ? AREA[0] : t.division === 'International' ? AREA[2] : AREA[1], AREA);
    const share = (n) => areas.find(a => a.name === n)?.share || 0;
    return `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        ${metricCard({ title: 'Top Division', value: divisions[0]?.name || '—', sub: divisions[0] ? `${fmtPct(divisions[0].salesShare)} of sales` : '' })}
        ${metricCard({ title: 'Outside Dhaka', value: fmtPct(share(AREA[1])), sub: 'of transactions' })}
        ${metricCard({ title: 'International', value: fmtPct(share(AREA[2])), sub: `${intl.length} countries` })}
        ${metricCard({ title: 'Districts Reached', value: districts.length, sub: `of 64 districts` })}
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        ${anCard('Dhaka vs Rest', 'Share of transactions', donut('an-area', areas, AREA))}
        ${anCard('Sales by Division', 'Successful sales', rankBars(divisions, { value: r => r.sales, label: r => fmtBDTShort(r.sales), sub: r => `${fmtPct(r.salesShare)} of sales · ${r.count} txns` }), 'lg:col-span-2')}
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        ${anCard('Top Districts', 'By successful sales', rankBars(districts.slice(0, 8), { value: r => r.sales, label: r => fmtBDTShort(r.sales), sub: r => `${r.count} txns · ${fmtPct(r.rate)} success` }))}
        ${anCard('International Customers', 'Payments from outside Bangladesh', rankBars(intl, { value: r => r.count, label: r => `${r.count} txns`, sub: r => `${fmtBDTShort(r.sales)} · ${fmtPct(r.rate)} success` }))}
      </div>
      ${anCard('Division Table', 'All divisions', anTable('geographic-analytics',
        ['Division', 'Transactions', 'Share', 'Sales', 'Share of Sales', 'Success Rate', 'Avg. Ticket'],
        divisions.map(r => [r.name, r.count, fmtPct(r.share), fmtBDT0(r.sales), fmtPct(r.salesShare), fmtPct(r.rate), fmtBDT0(r.avg)]),
        { right: [1, 2, 3, 4, 5, 6] }), '', exportBtn)}
      ${mockNote('Location is approximated from the customer\'s IP address and billing details. Figures are mock data.')}`;
  });
}
