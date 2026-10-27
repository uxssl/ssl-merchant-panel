// =====================================================================
// Saved Card Analytics
// =====================================================================
function renderSavedCards() {
  return analyticsShell('Save Card & MOTO Transactions', 'How saved (tokenized) cards speed up checkout for returning customers.', (all) => {
    const cards = all.filter(t => t.savedCard !== undefined);
    if (!cards.length) {
      return anCard('Saved cards are available on online checkout', '', `<p class="text-sm text-slate-500">Saved cards are offered on the hosted checkout of <strong>Demo Online Shop</strong>. Include that store (or All Stores) to see this report.</p>`);
    }
    const saved = cards.filter(t => t.savedCard);
    const fresh = cards.filter(t => !t.savedCard);
    const avgTime = (l) => l.length ? l.reduce((s, t) => s + t.auth, 0) / l.length : 0;
    const newTokens = cards.filter(t => t.cardSaved).length;
    const repeat = groupRows(okList(saved), 'custId').filter(c => c.count > 1).length;
    const { buckets, weekly } = anBuckets();
    const trend = bucketize(cards, buckets, (l) => l.length ? pct(l.filter(t => t.savedCard).length, l.length) : null);
    const schemes = groupRows(saved, 'method');
    const row = (label, l) => [label, l.length, fmtPct(rateOf(l)), fmtBDT0(okList(l).length ? salesOf(l) / okList(l).length : 0), `${Math.round(avgTime(l))} s`];
    return `
      <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        ${metricCard({ title: 'Saved-card Payments', value: saved.length.toLocaleString(), sub: fmtBDTShort(salesOf(saved)) })}
        ${metricCard({ title: 'Share of Card Payments', value: fmtPct(pct(saved.length, cards.length)) })}
        ${metricCard({ title: 'Success Rate', value: fmtPct(rateOf(saved)), sub: `${fmtPct(rateOf(fresh))} with a new card` })}
        ${metricCard({ title: 'Avg. Time to Pay', value: `${Math.round(avgTime(saved))} s`, sub: `${Math.round(avgTime(fresh))} s with a new card` })}
        ${metricCard({ title: 'Cards Saved', value: newTokens.toLocaleString(), sub: `${repeat} repeat customers` })}
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        ${anCard('Saved-card Share', `Share of card payments per ${weekly ? 'week' : 'day'}`, lineChart('an-saved', buckets.map(b => b.label), trend, { label: 'Saved-card share', fmt: (v) => `${Math.round(v)}%`, min: 0, max: 60 }), 'lg:col-span-2')}
        ${anCard('Saved Cards by Scheme', 'Share of saved-card payments', rankBars(schemes, { value: r => r.count, label: r => fmtPct(r.share), sub: r => `${r.count} payments` }))}
      </div>
      ${anCard('Saved vs New Card', 'Card payments on online checkout', anTable('saved-card-analytics',
        ['Card', 'Payments', 'Success Rate', 'Avg. Ticket', 'Avg. Time to Pay'],
        [row('Saved card', saved), row('New card', fresh)],
        { right: [1, 2, 3, 4] }), '', exportBtn)}
      ${mockNote('Cards are tokenized and stored by SSLCOMMERZ under PCI-DSS — your store never sees or keeps card numbers. Time to pay and all figures are mock data.')}`;
  });
}
