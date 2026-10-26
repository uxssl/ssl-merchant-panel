// =====================================================================
// Others
// =====================================================================
const OTH = {
  refer: '/others/refer-earn', fx: '/others/currency-conversion-rates', vas: '/others/vas', sms: '/others/sms-purchase',
  dev: '/others/developer-information', faq: '/others/merchant-faq', learn: '/others/instructional-videos-documents',
};
const pageHeader = (title, sub, right = '') => `
  <div class="flex flex-wrap items-start justify-between gap-4">
    <div><h1 class="text-2xl font-bold text-slate-900">${title}</h1><p class="text-slate-500 text-sm">${sub}</p></div>${right}
  </div>`;
let otherDraft = null;

// ----- Refer & Earn ----------------------------------------------------
const REF_CLS = { Invited: 'bg-slate-100 text-slate-600', 'Signed Up': 'bg-blue-50 text-blue-600', Onboarded: 'bg-amber-50 text-amber-600', Live: 'bg-emerald-50 text-emerald-600' };
const BONUS_CLS = { Credited: 'bg-emerald-50 text-emerald-600', Pending: 'bg-amber-50 text-amber-600', 'Not yet eligible': 'bg-slate-100 text-slate-500' };
function renderReferEarn() {
  const link = `https://sslcommerz.com/signup?ref=${REFERRAL_CODE}`;
  const credited = REFERRALS.filter(r => r.bonus === 'Credited').length;
  const pending = REFERRALS.filter(r => r.bonus === 'Pending').length;
  const steps = [['send', 'Share your code', 'Send your link to a business that should take payments online.'], ['user-check', 'They sign up & go live', 'They complete KYC and start taking payments.'], ['gift', 'You earn a bonus', `${fmtBDT0(REFERRAL_BONUS)} per merchant, added to your next settlement (mock).`]];
  return `
    <div class="space-y-6">
      ${pageHeader('Refer & Earn', 'Invite other businesses to SSLCOMMERZ and earn a bonus when they go live.', `<button data-action="new-referral" class="${BTN_PRIMARY} shrink-0">${ic('user-plus', 'w-4 h-4')}Invite a Business</button>`)}
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 rounded-xl bg-gradient-to-br from-primary-700 to-primary-500 text-white p-6 space-y-4">
          <p class="text-xs font-semibold uppercase tracking-wider opacity-80">Your referral code</p>
          <div class="flex items-center gap-3 flex-wrap">
            <span class="font-mono text-2xl font-bold tracking-wider">${REFERRAL_CODE}</span>
            <button data-action="copy" data-value="${REFERRAL_CODE}" class="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white/15 hover:bg-white/25 text-xs font-medium">${ic('copy', 'w-3.5 h-3.5')}Copy code</button>
          </div>
          <div class="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2">
            <span class="font-mono text-xs truncate flex-1">${link}</span>
            <button data-action="copy" data-value="${link}" class="text-xs font-semibold hover:underline">Copy link</button>
          </div>
          <div class="flex flex-wrap gap-2">${['WhatsApp', 'Email', 'SMS'].map(c => `<button data-action="toast" data-msg="Prototype: nothing was sent via ${c}." class="px-3 py-1.5 rounded-full bg-white text-primary-700 text-xs font-semibold hover:bg-primary-50">Share via ${c}</button>`).join('')}</div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          ${steps.map(([icon, t, d], i) => `<div class="flex gap-3"><span class="w-8 h-8 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">${ic(icon, 'w-4 h-4')}</span><div><p class="text-sm font-semibold text-slate-900">${i + 1}. ${t}</p><p class="text-xs text-slate-500">${d}</p></div></div>`).join('')}
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        ${metricCard({ title: 'Invited', value: REFERRALS.length })}
        ${metricCard({ title: 'Went Live', value: REFERRALS.filter(r => r.status === 'Live').length })}
        ${metricCard({ title: 'Bonus Earned', value: fmtBDT0(credited * REFERRAL_BONUS), sub: `${credited} credited` })}
        ${metricCard({ title: 'Bonus Pending', value: fmtBDT0(pending * REFERRAL_BONUS), sub: `${pending} waiting for first payments` })}
      </div>
      ${anCard('Your Referrals', '', dataTable({
        cols: [
          { label: 'Business', cell: r => `<div class="font-medium text-slate-800">${esc(r.name)}</div><div class="text-[11px] font-mono text-slate-500">${r.contact}</div>` },
          { label: 'Invited On', cell: r => `<span class="whitespace-nowrap">${fmtDate(r.date)}</span>` },
          { label: 'Status', cell: r => supBadge(REF_CLS, r.status) },
          { label: 'Bonus Status', cell: r => supBadge(BONUS_CLS, r.bonus) },
          { label: 'Bonus', right: true, cell: r => r.bonus === 'Not yet eligible' ? '<span class="text-slate-400">—</span>' : `<span class="font-semibold whitespace-nowrap">${fmtBDT0(REFERRAL_BONUS)}</span>` },
        ],
        rows: REFERRALS, rowAttrs: () => '', emptyTitle: 'No referrals yet', emptyHint: 'Invite a business to get started.',
      }))}
      ${mockNote('Bonus amount, eligibility and timing are mock — the real Refer & Earn terms come from the SSLCOMMERZ marketing team.')}
    </div>`;
}
function referralFormDrawer() {
  const d = otherDraft;
  return drawerShell({
    title: 'Invite a Business',
    sub: `<span>They get your link with code ${REFERRAL_CODE}</span>`,
    body: `
      ${field('Business Name', `<input data-other="name" value="${esc(d.name)}" class="${INPUT}" placeholder="e.g. Rahim Electronics">`, { required: true, error: formErrors.name })}
      ${field('Mobile Number', `<input data-other="mobile" value="${esc(d.mobile)}" inputmode="numeric" class="${INPUT}" placeholder="01XXXXXXXXX">`, { required: true, error: formErrors.mobile })}
      <p class="text-xs text-slate-500">Only invite businesses that agreed to be contacted.</p>`,
    footer: `<button data-action="close-drawer" class="${BTN_SECONDARY}">Cancel</button><button data-action="save-referral" class="${BTN_PRIMARY}">${ic('send', 'w-4 h-4')}Send Invite</button>`,
  });
}

// ----- Currency Conversion Rates ---------------------------------------
const fx = { amount: '100', code: 'USD', dir: 'toBdt', chart: 'USD' };
const fmtRate = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
function fxResult() {
  const r = FX_RATES.find(x => x.code === fx.code);
  const a = Number(fx.amount) || 0;
  return fx.dir === 'toBdt'
    ? `<p class="text-2xl font-bold text-slate-900">${fmtBDT(a * r.mid)}</p><p class="text-xs text-slate-500">${fmtNumber(a)} ${r.code} × ${fmtRate(r.mid)}</p>`
    : `<p class="text-2xl font-bold text-slate-900">${(a / r.mid).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${r.code}</p><p class="text-xs text-slate-500">${fmtBDT(a)} ÷ ${fmtRate(r.mid)}</p>`;
}
function renderCurrencyRates() {
  const r = FX_RATES.find(x => x.code === fx.chart);
  const updated = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate(), 10, 0);
  return `
    <div class="space-y-6">
      ${pageHeader('Currency Conversion Rates', `Rates used to convert foreign-currency payments to BDT. Updated ${fmtDate(updated)}, ${fmtTime(updated)}.`)}
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          ${cardHead('Today\'s Rates', 'BDT per 1 unit of currency (mock)', exportBtn)}
          ${anTable('currency-rates', ['Currency', 'Buying', 'Selling', 'Mid', 'Change'],
            FX_RATES.map(x => [`<span class="font-semibold">${x.code}</span> <span class="text-slate-500">${x.name}</span>`, fmtRate(x.buy), fmtRate(x.sell), fmtRate(x.mid),
              `<span class="${x.change >= 0 ? 'text-emerald-600' : 'text-rose-600'}">${x.change >= 0 ? '▲' : '▼'} ${Math.abs(x.change).toFixed(2)}%</span>`]), { right: [1, 2, 3, 4] }).replace('rounded-md border', 'border-0')}
        </div>
        <div class="bg-white rounded-lg border border-slate-200 shadow-sm">
          ${cardHead('Converter', 'Uses the mid rate')}
          <div class="p-5 space-y-4">
            <div class="inline-flex p-1 bg-slate-50 border border-slate-200 rounded-full">
              ${[['toBdt', 'To BDT'], ['fromBdt', 'From BDT']].map(([v, l]) => `<button data-action="fx-dir" data-value="${v}" class="px-3 py-1 rounded-full text-xs font-semibold ${fx.dir === v ? 'bg-primary-600 text-white' : 'text-slate-600'}">${l}</button>`).join('')}
            </div>
            <div class="grid grid-cols-[1fr_110px] gap-2">
              ${field(fx.dir === 'toBdt' ? 'Amount' : 'Amount (BDT)', `<input id="fx-amount" type="number" min="0" value="${esc(fx.amount)}" class="${INPUT}">`)}
              ${field('Currency', `<select id="fx-code" class="${INPUT}">${options(FX_RATES.map(x => x.code), fx.code)}</select>`)}
            </div>
            <div id="fx-result" class="rounded-lg bg-slate-50 border border-slate-100 p-4">${fxResult()}</div>
          </div>
        </div>
      </div>
      ${anCard(`${r.code} — last 30 days`, 'Mid rate, BDT per unit', `
        <div class="flex flex-wrap gap-1.5 mb-3">${FX_RATES.slice(0, 5).map(x => `<button data-action="fx-chart" data-value="${x.code}" class="px-2.5 py-1 rounded-full text-xs font-medium border ${fx.chart === x.code ? PILL_ACTIVE : PILL_IDLE}">${x.code}</button>`).join('')}</div>
        ${lineChart('fx-trend', r.history.map((_, i) => fmtShort(addDays(TODAY, i - 29))), r.history.map(v => Math.round(v * 100) / 100), { label: `BDT per ${r.code}`, fmt: (v) => Number(v).toFixed(2) })}`)}
      ${mockNote('Indicative rates for reference only — not Bangladesh Bank\'s official rates. Foreign-currency payments are converted at the rate on the settlement date. All figures are mock.')}
    </div>`;
}

// ----- Value Added Services --------------------------------------------
const VAS_CLS = { Subscribed: 'bg-emerald-50 text-emerald-600', Requested: 'bg-amber-50 text-amber-600', Available: 'bg-slate-100 text-slate-500' };
let vasTab = 'all';
function renderVas() {
  const list = VAS_SERVICES.filter(v => vasTab === 'all' || (vasTab === 'mine' ? v.status !== 'Available' : v.status === 'Available'));
  const tab = (value, label) => `<button data-action="vas-tab" data-value="${value}" class="px-4 py-1.5 rounded-full text-sm font-semibold ${vasTab === value ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}">${label}</button>`;
  return `
    <div class="space-y-6">
      ${pageHeader('Value Added Services (VAS)', 'Extra services for your business from SSLCOMMERZ and partners. Tell us what you need and your KAM will follow up.')}
      <div class="inline-flex p-1 bg-white border border-slate-200 rounded-full shadow-sm">${tab('all', 'All Services')}${tab('available', 'Available')}${tab('mine', 'My Services')}</div>
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        ${list.map(v => `
          <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3">
            <div class="flex items-start justify-between gap-2">
              <span class="w-10 h-10 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center">${ic(v.icon, 'w-5 h-5')}</span>
              ${supBadge(VAS_CLS, v.status)}
            </div>
            <div><p class="text-sm font-semibold text-slate-900">${v.name}</p><p class="text-xs text-slate-500 mt-1">${v.desc}</p></div>
            <p class="text-xs font-medium text-slate-700 mt-auto">${v.price} <span class="text-slate-400">(mock)</span></p>
            ${v.status === 'Subscribed' ? (v.link ? `<a href="#${v.link}" class="text-center px-3 py-1.5 text-xs font-semibold text-primary-600 border border-primary-200 rounded hover:bg-primary-50">Manage</a>` : `<button data-action="toast" data-msg="Prototype: service management is not wired up." class="px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200 rounded hover:bg-slate-50">Manage</button>`)
              : v.status === 'Requested' ? '<p class="text-center px-3 py-1.5 text-xs text-amber-700 bg-amber-50 rounded">Your KAM will contact you</p>'
              : `<button data-action="vas-interest" data-value="${v.id}" class="px-3 py-1.5 text-xs font-semibold text-white bg-primary-600 rounded hover:bg-primary-700">I'm Interested</button>`}
          </div>`).join('')}
      </div>
      ${mockNote('Services and prices are mock examples. "I\'m Interested" creates a lead for your KAM — nothing is purchased.')}
    </div>`;
}

// ----- SMS Purchase ----------------------------------------------------
const pkgOf = (id) => SMS_PACKAGES.find(p => p.id === id);
const pkgPrice = (p) => p.sms * p.rate;
function renderSmsPurchase() {
  const monthSent = sms.daily.reduce((a, b) => a + b, 0);
  const avg = monthSent / 30;
  return `
    <div class="space-y-6">
      ${pageHeader('SMS Purchase', 'Buy SMS credits for payment confirmations and customer messages.')}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        ${metricCard({ title: 'SMS Balance', value: sms.balance.toLocaleString(), sub: sms.balance < sms.threshold ? '<span class="text-rose-600 font-semibold">Below your alert level</span>' : `about ${Math.floor(sms.balance / avg)} days left` })}
        ${metricCard({ title: 'Sent (30 days)', value: monthSent.toLocaleString(), sub: `~${Math.round(avg)} per day` })}
        ${metricCard({ title: 'Sender ID', value: `<span class="font-mono text-lg">${sms.senderId}</span>`, sub: 'Approved (mock)' })}
        ${metricCard({ title: 'Low-balance Alert', value: sms.lowAlert ? 'On' : 'Off', sub: `at ${sms.threshold.toLocaleString()} SMS` })}
      </div>
      <div class="space-y-3">
        <h2 class="text-sm font-semibold text-slate-900">Buy SMS</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          ${SMS_PACKAGES.map(p => `
            <div class="relative bg-white rounded-xl border ${p.popular ? 'border-primary-600 ring-1 ring-primary-100' : 'border-slate-200'} shadow-sm p-5 flex flex-col gap-2">
              ${p.popular ? '<span class="absolute -top-2.5 left-5 px-2 py-0.5 rounded-full bg-primary-600 text-white text-[10px] font-bold uppercase tracking-wide">Popular</span>' : ''}
              <p class="text-2xl font-bold text-slate-900">${p.sms.toLocaleString()} <span class="text-sm font-medium text-slate-500">SMS</span></p>
              <p class="text-xs text-slate-500">৳${p.rate.toFixed(2)} per SMS</p>
              <p class="text-lg font-semibold text-slate-900 mt-2">${fmtBDT(pkgPrice(p))} <span class="text-xs font-normal text-slate-500">+ ${SMS_VAT}% VAT</span></p>
              <button data-action="sms-buy" data-value="${p.id}" class="mt-2 px-3 py-2 text-sm font-semibold rounded ${p.popular ? 'text-white bg-primary-600 hover:bg-primary-700' : 'text-primary-600 border border-primary-200 hover:bg-primary-50'}">Buy</button>
            </div>`).join('')}
        </div>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        ${anCard('SMS Sent', 'Per day, last 30 days', barChart('sms-daily', sms.daily.map((_, i) => fmtShort(addDays(TODAY, i - 29))), sms.daily, { label: 'SMS sent', fmt: (v) => Math.round(v) }), 'lg:col-span-2')}
        ${anCard('Alert Settings', '', `
          <label class="flex items-center gap-2 text-sm text-slate-700"><input id="sms-alert" type="checkbox" ${sms.lowAlert ? 'checked' : ''} class="rounded border-slate-300 text-primary-600">Email me when balance is low</label>
          <div class="mt-4">${field('Alert when balance falls below', `<select id="sms-threshold" class="${INPUT}">${options([['500', '500 SMS'], ['1000', '1,000 SMS'], ['2500', '2,500 SMS'], ['5000', '5,000 SMS']], String(sms.threshold))}</select>`)}</div>
          <p class="text-xs text-slate-500 mt-4">To change your Sender ID, raise a ticket — operators approve new IDs (mock).</p>`)}
      </div>
      ${anCard('Purchase History', '', miniTable(['Date', 'Reference', 'Package', 'Amount (incl. VAT)', 'Payment', 'Status'],
        sms.history.map(h => { const p = pkgOf(h.pkg); return [fmtDate(h.date), `<span class="font-mono">${h.ref}</span>`, `${p.sms.toLocaleString()} SMS`, fmtBDT(pkgPrice(p) * (1 + SMS_VAT / 100)), h.payment, supBadge({ Completed: 'bg-emerald-50 text-emerald-600' }, h.status)]; }), { right: [3] }))}
    </div>`;
}
function smsBuyDrawer() {
  const p = pkgOf(otherDraft.pkg);
  const price = pkgPrice(p), vat = price * SMS_VAT / 100;
  return drawerShell({
    title: `Buy ${p.sms.toLocaleString()} SMS`,
    sub: '<span>Credits are added as soon as payment completes</span>',
    body: `
      <div class="rounded-lg border border-slate-200 divide-y divide-slate-100 text-sm">
        <div class="flex justify-between px-4 py-2.5"><span class="text-slate-500">${p.sms.toLocaleString()} SMS × ৳${p.rate.toFixed(2)}</span><span class="tabular-nums">${fmtBDT(price)}</span></div>
        <div class="flex justify-between px-4 py-2.5"><span class="text-slate-500">VAT (${SMS_VAT}%, mock)</span><span class="tabular-nums">${fmtBDT(vat)}</span></div>
        <div class="flex justify-between px-4 py-2.5 font-bold text-slate-900"><span>Total</span><span class="tabular-nums">${fmtBDT(price + vat)}</span></div>
      </div>
      ${section('Pay with', `<div class="space-y-2">${[['settlement', 'Deduct from next settlement', 'No payment needed now'], ['online', 'Pay now with SSLCOMMERZ checkout', 'Card, MFS or internet banking']].map(([v, t, s]) => `
        <label class="flex items-start gap-3 rounded-lg border ${otherDraft.pay === v ? 'border-primary-600 bg-primary-50/40' : 'border-slate-200'} px-3 py-2.5 cursor-pointer">
          <input type="radio" name="sms-pay" data-other-radio="pay" value="${v}" ${otherDraft.pay === v ? 'checked' : ''} class="mt-0.5 text-primary-600">
          <span><span class="block text-sm font-medium text-slate-800">${t}</span><span class="block text-xs text-slate-500">${s}</span></span></label>`).join('')}</div>`)}
      <p class="text-xs text-slate-500">New balance after purchase: <strong>${(sms.balance + p.sms).toLocaleString()} SMS</strong>.</p>`,
    footer: `<button data-action="close-drawer" class="${BTN_SECONDARY}">Cancel</button><button data-action="sms-confirm" class="${BTN_PRIMARY}">${ic('shopping-cart', 'w-4 h-4')}Confirm Purchase</button>`,
  });
}

// ----- Developer / Technical Information -------------------------------
const SDKS = [
  { name: 'AndroidX SDK', updates: ['Released on 13/10/2020'] },
  { name: 'Android SDK', updates: ['Last Update on 26/July/2020 (Final version before AndroidX)', 'Previous Update on 22/April/2020', 'Previous Update on 22/Oct/2019', 'Previous Update on 4/Sep/2019', 'Previous Update on 20/Aug/2019', 'Previous Update on 11/July/2019'] },
  { name: 'iOS SDK', updates: ['Last Update on 20/Sep/2022', 'Previous Update on 11/Nov/2021', 'Previous Update on 26/July/2020', 'Previous Update on 22/Oct/2019', 'Previous Update on 12/July/2019'] },
];
const INTEGRATION_LINKS = {
  'Sandbox System': [
    ['Gateway URL', 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php'],
    ['Validation API', 'https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php'],
    ['Example', 'https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php?val_id=<Validation Id>&store_id=<Store Text Id>&store_passwd=<Store Test Password>'],
    ['Transaction Status Check API', 'https://sandbox.sslcommerz.com/validator/api/merchantTransIDvalidationAPI.php'],
    ['Example', 'https://sandbox.sslcommerz.com/validator/api/merchantTransIDvalidationAPI.php?tran_id=<Transaction ID>&store_id=<Store Text Id>&store_passwd=<Store Test Password>'],
  ],
  'Live System': [
    ['Gateway URL', 'https://securepay.sslcommerz.com/gwprocess/v4/api.php'],
    ['Validation API', 'https://securepay.sslcommerz.com/validator/api/validationserverAPI.php'],
    ['Example', 'https://securepay.sslcommerz.com/validator/api/validationserverAPI.php?val_id=<Validation Id>&store_id=<Store Live Id>&store_passwd=<Store Live Password>'],
    ['Transaction Status Check API', 'https://securepay.sslcommerz.com/validator/api/merchantTransIDvalidationAPI.php'],
    ['Example', 'https://securepay.sslcommerz.com/validator/api/merchantTransIDvalidationAPI.php?tran_id=<Transaction ID>&store_id=<Store Live Id>&store_passwd=<Store Live Password>'],
  ],
};
let devTab = 'credentials';
function renderDeveloper() {
  const tab = (value, label, icon) => `<button data-action="dev-tab" data-value="${value}" class="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold ${devTab === value ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}">${ic(icon, 'w-4 h-4')}${label}</button>`;
  const urlItem = ([label, url]) => `<div><p class="text-xs font-semibold text-slate-500 mb-1">${label}</p><div class="flex items-start gap-2 rounded-md bg-slate-50 border border-slate-100 px-3 py-2"><code class="text-[11px] text-slate-700 break-all flex-1">${esc(url)}</code><button data-action="copy" data-value="${esc(url)}" class="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-white shrink-0" title="Copy">${ic('copy', 'w-3.5 h-3.5')}</button></div></div>`;
  const body = {
    credentials: `
      <div class="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">${ic('shield-alert', 'w-4 h-4 mt-0.5 shrink-0')}<span>Store passwords are never shown in the portal. A reset sends a new password to the store's registered email. Never share credentials by chat, email or phone — SSLCOMMERZ will never ask for them.</span></div>
      <div class="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        ${cardHead('Store Credentials', 'Live system')}
        ${miniTable(['Store', 'Store ID', 'Store Password', 'IPN URL', ''],
          ACCOUNT_STORES.filter(s => s.status === 'Active').map(st => [esc(st.name), `<span class="font-mono">${st.id}</span>`, '<span class="font-mono text-slate-400">••••••••••••</span>',
            st.baseUrl ? `<span class="font-mono text-[11px] break-all">${st.baseUrl}/sslcommerz/ipn</span>` : '<span class="text-slate-400">Not needed (QR only)</span>',
            `<button data-action="toast" data-msg="Prototype: no reset email was sent." class="text-xs font-semibold text-primary-600 hover:underline whitespace-nowrap">Reset password</button>`])).replace('rounded-md border', 'border-0')}
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        ${anCard('Sandbox (test) account', '', `<p class="text-sm text-slate-600">Create a free sandbox store to test your integration before going live.</p><a href="https://developer.sslcommerz.com/" target="_blank" rel="noopener" class="inline-flex items-center gap-1.5 mt-3 text-sm font-semibold text-primary-600 hover:underline">developer.sslcommerz.com ${ic('external-link', 'w-3.5 h-3.5')}</a>`)}
        ${anCard('Request a technical change', '', `<p class="text-sm text-slate-600">Change IPN URL, allowed domains or callback URLs through a ticket so the change is verified.</p><button data-action="go" data-value="/support/tickets-queries" class="mt-3 text-sm font-semibold text-primary-600 hover:underline">Raise a ticket</button>`)}
      </div>`,
    integration: `
      ${anCard('Payment Interface', 'There are two ways to display the SSLCOMMERZ payment page for your customer.', `<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        ${[['1', 'Easy Checkout Integration', 'It is a embedded js integration within your site which will display the payment channels in your page.', 'panel-top'], ['2', 'Hosted Payment Integration', 'Here, you will redirect the customer to SSLCOMMERZ Hosted page to display the payment channels', 'external-link']].map(([n, t, d, icon]) => `
          <div class="rounded-lg border border-slate-200 p-4"><p class="text-sm font-bold text-slate-800 flex items-center gap-2"><span class="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs flex items-center justify-center">${n}</span>${t}</p><p class="text-xs text-slate-500 mt-2">${d}</p>
          <div class="mt-3 h-28 rounded-md bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center text-slate-300">${ic(icon, 'w-8 h-8')}</div></div>`).join('')}
      </div>`)}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        ${Object.entries(INTEGRATION_LINKS).map(([sys, links]) => anCard(sys, sys === 'Live System' ? 'Use only after your store is approved for live' : 'For testing with your sandbox store', `<div class="space-y-3">${links.map(urlItem).join('')}</div>`)).join('')}
      </div>
      ${anCard('Developer Page', '', `<a href="https://developer.sslcommerz.com/" target="_blank" rel="noopener" class="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:underline">https://developer.sslcommerz.com/ ${ic('external-link', 'w-3.5 h-3.5')}</a>`)}`,
    sdk: `
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        ${SDKS.map(sdk => `
          <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
            <p class="text-sm font-bold text-slate-900 flex items-center gap-2">${ic(sdk.name.startsWith('iOS') ? 'smartphone' : 'tablet-smartphone', 'w-4 h-4 text-primary-600')}${sdk.name}</p>
            <div class="flex gap-2">
              <button data-action="toast" data-msg="Prototype: SDK download is not wired up." class="px-2.5 py-1.5 rounded border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50">Lib</button>
              <button data-action="toast" data-msg="Prototype: document download is not wired up." class="px-2.5 py-1.5 rounded border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50">Document</button>
            </div>
            <ul class="space-y-1">${sdk.updates.map((u, i) => `<li class="text-xs ${i ? 'text-slate-500' : 'text-slate-800 font-medium'}">${u}</li>`).join('')}</ul>
          </div>`).join('')}
      </div>
      ${anCard('CMS', 'Plugins for WooCommerce, Magento, OpenCart and more', `<div class="flex flex-wrap gap-4 text-sm"><span class="text-slate-600">Github Link — <button data-action="toast" data-msg="Prototype: link not wired up." class="font-semibold text-primary-600 hover:underline">Click here</button></span><span class="text-slate-600">Developer Page — <a href="https://developer.sslcommerz.com/" target="_blank" rel="noopener" class="font-semibold text-primary-600 hover:underline">Click here</a></span></div>`)}`,
    logo: `
      ${anCard('Pay with Logo', 'Show customers which payment methods you accept', `<div class="grid grid-cols-1 md:grid-cols-2 gap-4">${[1, 2, 3, 4, 5].map(n => {
        const path = `https://securepay.sslcommerz.com/public/image/SSLCommerz-Pay-With-logo-All-Size-0${n}.png`;
        return `<div class="rounded-lg border border-slate-200 p-4 space-y-2"><p class="text-xs font-bold text-slate-700">Size-0${n}</p>
          <div class="h-16 rounded bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center text-[11px] text-slate-400">Preview (image not loaded in prototype)</div>
          ${urlItem(['Image Path', path])}
          ${urlItem(['Example Code', `<img src="${path}" alt="Pay with SSLCOMMERZ">`])}</div>`;
      }).join('')}</div>`)}`,
  };
  return `
    <div class="space-y-6">
      ${pageHeader('Developer / Technical Information', 'Credentials, integration links, SDKs and logos for your developers.')}
      <div class="inline-flex flex-wrap p-1 bg-white border border-slate-200 rounded-full shadow-sm">${tab('credentials', 'Credentials', 'key-round')}${tab('integration', 'Integration', 'plug')}${tab('sdk', 'SDK & Module', 'package')}${tab('logo', 'Pay with Logo', 'image')}</div>
      ${body[devTab]}
    </div>`;
}

// ----- Merchant FAQ ----------------------------------------------------
const faqState = { q: '', cat: 'all', open: null };
function faqList() {
  const q = faqState.q.trim().toLowerCase();
  const list = FAQS.filter(f => (faqState.cat === 'all' || f.cat === faqState.cat) && (!q || f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q)));
  if (!list.length) return `<div class="text-center py-10 text-sm text-slate-500">No answers match “${esc(faqState.q)}”. <button data-action="go" data-value="/support/tickets-queries" class="text-primary-600 font-semibold hover:underline">Ask support</button></div>`;
  return `<div class="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">${list.map(f => `
    <div>
      <button data-action="faq-toggle" data-value="${f.id}" class="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-slate-50" aria-expanded="${faqState.open === f.id}">
        <span><span class="block text-sm font-medium text-slate-900">${esc(f.q)}</span><span class="block text-[11px] text-slate-500 mt-0.5">${f.cat}</span></span>
        ${ic(faqState.open === f.id ? 'minus' : 'plus', 'w-4 h-4 text-slate-400 shrink-0')}
      </button>
      ${faqState.open === f.id ? `<div class="px-5 pb-4 -mt-1 text-sm text-slate-600 leading-relaxed">${esc(f.a)}</div>` : ''}
    </div>`).join('')}</div>`;
}
function renderFaq() {
  return `
    <div class="space-y-6 max-w-4xl">
      ${pageHeader('Merchant FAQ', 'Quick answers to common questions about payments, settlement and your account.')}
      <div class="relative">
        <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">${ic('search', 'w-4 h-4')}</span>
        <input id="faq-search" type="text" value="${esc(faqState.q)}" placeholder="Search questions, e.g. refund, settlement, QR" class="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 shadow-sm">
      </div>
      <div class="flex flex-wrap gap-2">${['all', ...FAQ_CATEGORIES].map(c => `<button data-action="faq-cat" data-value="${c}" class="px-3 py-1.5 rounded-full text-sm border ${faqState.cat === c ? PILL_ACTIVE : PILL_IDLE}">${c === 'all' ? 'All' : c}</button>`).join('')}</div>
      <div id="faq-list">${faqList()}</div>
      ${kamCard()}
      ${mockNote('Answers that mention timelines or charges use mock values — replace with the published SSLCOMMERZ policy.')}
    </div>`;
}

// ----- Instructional Videos & Documents --------------------------------
const learn = { tab: 'videos', cat: 'all', q: '' };
function renderLearning() {
  const q = learn.q.trim().toLowerCase();
  const match = (x) => (learn.cat === 'all' || x.cat === learn.cat) && (!q || x.title.toLowerCase().includes(q));
  const vids = VIDEOS.filter(match), docs = DOCS.filter(match);
  const tab = (value, label, n) => `<button data-action="learn-tab" data-value="${value}" class="px-4 py-1.5 rounded-full text-sm font-semibold ${learn.tab === value ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}">${label} <span class="text-[11px] opacity-70">${n}</span></button>`;
  return `
    <div class="space-y-6">
      ${pageHeader('Instructional Videos & Documents', 'Guides and short videos for you and your team, in English and Bangla.')}
      <div class="flex items-center gap-3 flex-wrap">
        <div class="inline-flex p-1 bg-white border border-slate-200 rounded-full shadow-sm">${tab('videos', 'Videos', vids.length)}${tab('docs', 'Documents', docs.length)}</div>
        <div class="relative flex items-center">
          <span class="absolute left-3 text-slate-400 pointer-events-none">${ic('search', 'w-4 h-4')}</span>
          <input id="learn-search" type="text" value="${esc(learn.q)}" placeholder="Search by title" class="py-1.5 pl-9 pr-3 w-56 bg-white border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500">
        </div>
        ${selectPill('learn', 'cat', 'Category', [{ label: 'All Categories', value: 'all' }, ...LEARN_CATEGORIES.map(c => ({ label: c, value: c }))], learn.cat)}
      </div>
      ${learn.tab === 'videos' ? (vids.length ? `<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">${vids.map(v => `
        <button data-action="open-video" data-value="${v.id}" class="text-left bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
          <div class="relative h-32 bg-gradient-to-br from-primary-700 to-primary-400 flex items-center justify-center">
            <span class="w-11 h-11 rounded-full bg-white/90 text-primary-700 flex items-center justify-center">${ic('play', 'w-5 h-5 ml-0.5')}</span>
            <span class="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/50 text-white text-[10px] font-semibold">${v.duration}</span>
          </div>
          <div class="p-4"><p class="text-sm font-semibold text-slate-900">${esc(v.title)}</p><p class="text-xs text-slate-500 mt-1">${v.cat} · ${v.lang}</p></div>
        </button>`).join('')}</div>` : '<p class="text-sm text-slate-500">No videos match.</p>')
      : anCard('Documents', '', docs.length ? `<div class="divide-y divide-slate-100 -my-2">${docs.map(d => `
        <div class="flex items-center gap-3 py-3">
          <span class="w-9 h-9 rounded-lg ${d.type === 'PDF' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'} flex items-center justify-center shrink-0">${ic(d.type === 'PDF' ? 'file-text' : 'sheet', 'w-4 h-4')}</span>
          <div class="flex-1 min-w-0"><p class="text-sm font-medium text-slate-800 truncate">${esc(d.title)}</p><p class="text-xs text-slate-500">${d.cat} · ${d.type} · ${d.size} · ${d.lang} · updated ${fmtDate(d.updated)}</p></div>
          <button data-action="toast" data-msg="Prototype: document download is not wired up." class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50">${ic('download', 'w-3.5 h-3.5')}Download</button>
        </div>`).join('')}</div>` : '<p class="text-sm text-slate-500">No documents match.</p>')}
    </div>`;
}
function videoDrawer(v) {
  return drawerShell({
    wide: true,
    title: esc(v.title),
    sub: `<span>${v.cat} · ${v.lang} · ${v.duration}</span>`,
    body: `
      <div class="aspect-video rounded-xl bg-slate-900 flex flex-col items-center justify-center text-slate-400 gap-2">${ic('circle-play', 'w-12 h-12')}<p class="text-xs">Video player placeholder — no video is loaded in the prototype.</p></div>
      ${section('About this video', `<p class="text-sm text-slate-600">A short walkthrough for merchants. Related guides are under Documents.</p>`)}`,
    footer: `<button data-action="close-drawer" class="${BTN_SECONDARY}">Close</button>`,
  });
}
