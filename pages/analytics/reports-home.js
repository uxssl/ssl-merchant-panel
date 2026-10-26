// =====================================================================
// Analytics & Reports — landing page: every report, grouped by category
// =====================================================================
AN.home = '/analytics';

// Each group has its own icon tint, so the categories read apart at a glance.
const REPORT_GROUPS = [
  {
    title: 'Business Reports', tone: 'bg-primary-50 text-primary-600', items: [
      { icon: 'trending-up', to: AN.business, title: 'Business Analytics', text: 'Sales, transactions, success rate and repeat customers over time.' },
      { icon: 'chart-pie', to: AN.share, title: 'Market Share', text: 'Which payment channels and providers your customers choose.' },
    ],
  },
  {
    title: 'Customer Insights', tone: 'bg-violet-50 text-violet-600', items: [
      { icon: 'map', to: AN.geo, title: 'Geographic Analytics', text: 'Where your customers pay from, by division and district.' },
      { icon: 'landmark', to: AN.issuer, title: 'Issuer Location', text: 'Card payments by where the card was issued — local or foreign.' },
      { icon: 'smartphone', to: AN.operators, title: 'Mobile Operators', text: 'Customers\' mobile networks and how OTP delivery affects success.' },
      { icon: 'monitor-smartphone', to: AN.devices, title: 'Browsers & Devices', text: 'Device, operating system and browser your customers pay with.' },
      { icon: 'credit-card', to: AN.saved, title: 'Saved Card Analytics', text: 'How saved (tokenized) cards speed up checkout for returning customers.' },
    ],
  },
  {
    title: 'Settlement Reports', tone: 'bg-emerald-50 text-emerald-600', items: [
      { icon: 'banknote', to: SETTLEMENT_PATH, title: 'Settlement Report', text: 'Payouts to your bank account, one per store per business day.' },
      { icon: 'calendar-range', to: FY_PATH, title: 'Financial Year Report', text: 'Sales, fees and settlements for the Bangladesh financial year (Jul – Jun).' },
    ],
  },
];

function renderReportsHome() {
  return `
    <div class="space-y-8">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">Analytics &amp; Reports</h1>
        <p class="text-slate-500 text-sm mt-1">Detailed reports and insights by category.</p>
      </div>
      ${REPORT_GROUPS.map(g => `
        <section class="space-y-4">
          <h2 class="text-base font-semibold text-slate-700 pb-3 border-b border-slate-200">${g.title}</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
            ${g.items.map(r => `
              <a href="#${r.to}" class="group bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4 hover:shadow-md hover:border-primary-200 transition-all">
                <span class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${g.tone}">${ic(r.icon, 'w-5 h-5')}</span>
                <span class="min-w-0">
                  <span class="block text-sm font-semibold text-slate-900 group-hover:text-primary-600 transition-colors">${r.title}</span>
                  <span class="block text-xs text-slate-500 mt-1 leading-relaxed">${r.text}</span>
                </span>
              </a>`).join('')}
          </div>
        </section>`).join('')}
    </div>`;
}
