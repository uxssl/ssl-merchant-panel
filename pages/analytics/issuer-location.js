// =====================================================================
// Issuer Location
// =====================================================================
function renderIssuerLocation() {
  return analyticsShell('Issuer Location', 'Card payments by where the card was issued — local or foreign.', (all) => {
    const list = all.filter(t => t.issuerLocation);
    const LOC = ['Local', 'Foreign'];
    const locs = groupRows(list, 'issuerLocation', LOC);
    const loc = (n) => locs.find(l => l.name === n);
    const countries = groupRows(list.filter(t => t.issuerLocation === 'Foreign'), 'issuerCountry').sort((a, b) => b.sales - a.sales);
    const banks = groupRows(list.filter(t => t.issuerLocation === 'Local'), 'issuerBank').sort((a, b) => b.sales - a.sales);
    if (!list.length) return anCard('No card payments', '', '<p class="text-sm text-slate-500">There are no card payments for this store and period.</p>');
    return `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        ${metricCard({ title: 'Local Cards', value: fmtPct(loc('Local')?.share || 0), sub: `${loc('Local')?.count || 0} card payments` })}
        ${metricCard({ title: 'Foreign Cards', value: fmtPct(loc('Foreign')?.share || 0), sub: `${loc('Foreign')?.count || 0} card payments` })}
        ${metricCard({ title: 'Local Success Rate', value: fmtPct(loc('Local')?.rate || 0) })}
        ${metricCard({ title: 'Foreign Success Rate', value: fmtPct(loc('Foreign')?.rate || 0) })}
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        ${anCard('Local vs Foreign', 'Share of card payments', donut('an-issuer', locs, LOC))}
        ${anCard('Foreign Issuer Countries', 'By successful sales', rankBars(countries, { value: r => r.sales, label: r => fmtBDTShort(r.sales), sub: r => `${r.count} txns · ${fmtPct(r.rate)} success` }))}
        ${anCard('Local Issuer Banks', 'By successful sales', rankBars(banks, { value: r => r.sales, label: r => fmtBDTShort(r.sales), sub: r => `${r.count} txns · ${fmtPct(r.rate)} success` }))}
      </div>
      ${anCard('Issuer Table', 'Local banks and foreign countries', anTable('issuer-location',
        ['Issuer', 'Location', 'Transactions', 'Sales', 'Share of Card Sales', 'Success Rate'],
        [...banks.map(r => [r.name, 'Local', r.count, fmtBDT0(r.sales), fmtPct(pct(r.sales, salesOf(list))), fmtPct(r.rate)]),
         ...countries.map(r => [r.name, 'Foreign', r.count, fmtBDT0(r.sales), fmtPct(pct(r.sales, salesOf(list))), fmtPct(r.rate)])],
        { right: [2, 3, 4, 5] }), '', exportBtn)}
      ${mockNote('Issuer is identified from the card BIN; card numbers are never shown. Foreign card payments are settled to you in BDT. Figures are mock data.')}`;
  });
}
