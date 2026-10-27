// =====================================================================
// Others
// =====================================================================
const OTH = {
  refer: '/others/refer-earn', fx: '/transactions/currency-rates', vas: '/others/vas', sms: '/others/sms-purchase',
  dev: '/others/developer-information', faq: '/others/merchant-faq', learn: '/others/instructional-videos-documents',
};
const pageHeader = (title, sub, right = '') => `
  <div class="flex flex-wrap items-start justify-between gap-4">
    <div><h1 class="text-2xl font-bold text-slate-900">${title}</h1><p class="text-slate-500 text-sm">${sub}</p></div>${right}
  </div>`;
let otherDraft = null;

// ----- Refer & Earn (old panel) ---------------------------------------
const REF_CLS = { Referred: 'bg-slate-100 text-slate-600', 'In Review': 'bg-amber-50 text-amber-600', Onboarded: 'bg-emerald-50 text-emerald-600' };
const DISB_CLS = { Disbursed: 'bg-emerald-50 text-emerald-600', Pending: 'bg-amber-50 text-amber-600', 'Not Eligible': 'bg-slate-100 text-slate-500' };
function renderReferEarn() {
  const s = pageState();
  const f = applied(s);
  const rows = REFERRALS.filter(r => inStores(r.store) && inRange(r, f.range) && (f.bstatus === 'all' || r.disbursement === f.bstatus));
  const disbursed = REFERRALS.filter(r => r.disbursement === 'Disbursed');
  const opts = [{ label: 'All Disbursement Status', value: 'all' }, ...DISBURSEMENT_STATUSES.map(v => ({ label: v, value: v }))];
  return `
    <div class="space-y-6">
      ${pageHeader('Refer & Earn', `Refer other businesses to SSLCOMMERZ with your code <span class="font-mono font-semibold text-slate-700">${REFERRAL_CODE}</span> and earn when they are onboarded.`, `<button data-action="new-referral" class="${BTN_PRIMARY} shrink-0">${ic('circle-plus', 'w-4 h-4')}Create Merchant Referral</button>`)}
      <div class="flex flex-col">
        <div class="filter-bar-container flex items-center gap-3 flex-wrap">
          ${dtPill(s.range, s.defaultPreset)}
          ${storePill('list', 'Store ID')}
          ${selectPill('list', 'bstatus', 'Disbursement Status', opts, s.bstatus)}
          ${filterActions(s)}
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
          ${metricCard({ title: 'Total Onboarded', value: REFERRALS.filter(r => r.status === 'Onboarded').length })}
          ${metricCard({ title: 'Total Disbursement', value: fmtBDT0(disbursed.length * REFERRAL_BONUS), sub: `${disbursed.length} disbursed` })}
        </div>
        <div class="space-y-4 pt-6">
          <h2 class="text-sm font-semibold text-slate-900">Refer &amp; Earn List <span class="ml-1 text-xs font-normal text-slate-500">${rows.length} rows</span></h2>
          ${dataTable({
            cols: [
              { label: 'Referred On', cell: r => `<span class="whitespace-nowrap">${fmtDate(r.date)}</span>` },
              { label: 'Store', cell: r => `<span class="font-mono text-xs">${r.store}</span>` },
              { label: 'Email of Referred Person', cell: r => esc(r.email) },
              { label: 'Phone Number', cell: r => `<span class="font-mono text-xs">${r.phone}</span>` },
              { label: 'Status', cell: r => supBadge(REF_CLS, r.status) },
              { label: 'Disbursement Status', cell: r => supBadge(DISB_CLS, r.disbursement) },
              { label: 'Amount', right: true, cell: r => r.disbursement === 'Not Eligible' ? '<span class="text-slate-400">—</span>' : `<span class="font-semibold whitespace-nowrap">${fmtBDT0(REFERRAL_BONUS)}</span>` },
            ],
            rows, rowAttrs: () => '', emptyTitle: 'No referrals in this period', emptyHint: 'Create a merchant referral to get started.', serial: 1,
          })}
        </div>
      </div>
      ${mockNote('Bonus amount, eligibility and timing are mock — the real Refer & Earn terms come from the SSLCOMMERZ marketing team. Contacts are masked.')}
    </div>`;
}
function referralFormDrawer() {
  const d = otherDraft;
  return drawerShell({
    title: 'Refer A Merchant',
    sub: '<span>You can refer more than one merchant</span>',
    body: `
      ${field('My Store', `<select data-other="store" class="${INPUT}"><option value="">Select Store</option>${options(STORES.map(st => [st.id, st.name]), d.store)}</select>`, { required: true, error: formErrors.store, hint: 'Your store under which you want to make the referral' })}
      ${field('Referral Code', `<input value="${REFERRAL_CODE}" disabled class="${INPUT} bg-slate-50 font-mono text-slate-500">`)}
      ${field('Email of the person you want to refer', `<input data-other="email" type="email" value="${esc(d.email)}" class="${INPUT}">`, { required: true, error: formErrors.email })}
      ${field('Phone number of the person you want to refer', `<input data-other="phone" value="${esc(d.phone)}" inputmode="numeric" placeholder="01XXXXXXXXX" class="${INPUT}">`, { required: true, error: formErrors.phone })}
      <p class="text-xs text-slate-500">By clicking submit, you agree to our <button data-action="toast" data-msg="Prototype: the Refer & Earn terms are not linked yet." class="font-semibold text-primary-600 hover:underline">terms &amp; conditions</button>. Only refer people who agreed to be contacted.</p>`,
    footer: `<button data-action="close-drawer" class="${BTN_SECONDARY}">Cancel</button><button data-action="save-referral" class="${BTN_PRIMARY}">Submit</button>`,
  });
}

// ----- Currency Rate Conversion (old panel, under Transactions) -------
let fxQuery = '';
const fxRows = () => FX_RATES.filter(x => !fxQuery.trim() || x.code.toLowerCase().includes(fxQuery.trim().toLowerCase())).sort((a, b) => b.requests - a.requests);
function fxTable() {
  const rows = fxRows();
  return rows.length ? miniTable(['#', 'Currency', 'Convert Rate', 'Last Updated', 'Convert Request'],
    rows.map((x, i) => [`<span class="text-slate-400">${i + 1}</span>`, `<span class="font-semibold">${x.code}</span>`, x.rate.toFixed(4), `${toDateInput(x.updated).split('-').reverse().join('-')} ${pad(x.updated.getHours())}:${pad(x.updated.getMinutes())}`, x.requests.toLocaleString()]),
    { right: [2, 4] }) : '<p class="text-sm text-slate-500 py-6 text-center">No currency matches your search.</p>';
}
function renderCurrencyRates() {
  return `
    <div class="space-y-6">
      ${pageHeader('Currency Rate Conversion', 'BDT per 1 unit of each currency, used to convert foreign-currency payments.')}
      <section class="bg-white rounded-lg border border-slate-200 shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-100">
          <h2 class="text-sm font-semibold text-slate-900">Currency Conversion Rate List <span class="ml-1 text-xs font-normal text-slate-500">${FX_RATES.length} rows</span></h2>
          <label class="relative w-full sm:w-56">${ic('search', 'w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2')}<input id="fx-search" value="${esc(fxQuery)}" placeholder="Search currency" aria-label="Search currency" class="${INPUT} pl-8"></label>
        </div>
        <div id="fx-table" class="p-4">${fxTable()}</div>
      </section>
      ${mockNote('Indicative rates for reference only — not Bangladesh Bank\'s official rates. Foreign-currency payments are converted at the rate on the settlement date. All figures are mock.')}
    </div>`;
}

// ----- Value Added Services (old panel) -------------------------------
function renderVas() {
  return `
    <div class="space-y-6">
      ${pageHeader('Value Added Services (VAS)', 'Extra services for your business from SSLCOMMERZ, SSL Wireless and partners.')}
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        ${VAS_SERVICES.map(v => `
          <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div class="px-5 py-3 bg-primary-600 text-white text-sm font-semibold">${v.name}</div>
            <div class="h-28 bg-gradient-to-br from-primary-50 to-slate-50 flex items-center justify-center text-primary-600">${ic(v.icon, 'w-12 h-12')}</div>
            <div class="p-5 flex flex-col gap-4 flex-1">
              <p class="text-sm text-slate-600 flex-1">${v.desc}</p>
              ${v.applied ? '<p class="text-center px-3 py-2 text-xs font-medium text-amber-700 bg-amber-50 rounded">Applied — the team will contact you</p>'
                : `<button data-action="vas-apply" data-value="${v.id}" class="self-center px-5 py-2 text-sm font-semibold text-white bg-[#0b3a63] rounded-full hover:opacity-90">Apply Now</button>`}
            </div>
          </div>`).join('')}
      </div>
      ${mockNote('"Apply Now" asks the team to contact you — nothing is purchased. Prototype: no request is sent.')}
    </div>`;
}

// ----- Purchase SMS (old panel) ----------------------------------------
const SMS_STEPS = ['Download the letter below', 'Sign the letter', 'Select one of your packages below', 'Agree to your terms and conditions', 'Go to the next page', 'Upload a signed letter', 'Submit and wait to hear back from us'];
const pkgOf = (id) => SMS_PACKAGES.find(p => p.id === id);
function renderSmsPurchase() {
  return `
    <div class="space-y-6">
      ${pageHeader('Purchase SMS', 'Send SMS to your customers from your own sender ID.')}
      <section class="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
        <h2 class="text-base font-semibold text-slate-900 mb-3">Grow your business by sending SMS to your customers, in 7 simple steps:</h2>
        <ol class="space-y-2">${SMS_STEPS.map((t, i) => `<li class="flex items-center gap-3 text-sm text-slate-700"><span class="w-6 h-6 rounded-full bg-[#0b3a63] text-white text-xs font-semibold flex items-center justify-center shrink-0">${i + 1}</span>${t}</li>`).join('')}</ol>
      </section>
      <section class="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-4">
        <h2 class="text-sm font-semibold text-slate-900">SMS Packages</h2>
        <div class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600 space-y-2">
          <p><strong>Merchandise Acknowledgment:</strong> Please complete the Declaration Regarding SMS Service to acknowledge compliance and responsibility for using SSL's SMS service. After selecting a package, you will see the Terms &amp; Conditions. Once you agree to them, the option to upload the declaration letter appears.</p>
          <p>Download the declaration letter <button data-action="toast" data-msg="Prototype: the declaration letter is not attached yet." class="font-semibold text-primary-600 hover:underline inline-flex items-center gap-1">here ${ic('download', 'w-3.5 h-3.5')}</button></p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          ${SMS_PACKAGES.map(p => `
            <div class="rounded-xl border border-slate-200 overflow-hidden flex flex-col">
              <div class="px-5 py-3 bg-primary-600 text-white text-sm font-semibold">${p.name}</div>
              <div class="p-5 text-center space-y-2 flex-1">
                <p class="text-xs text-slate-500">SMS Quantity: <strong class="text-slate-800">${p.sms.toLocaleString()}</strong></p>
                <p class="text-2xl font-bold text-emerald-600">BDT ${p.price.toFixed(2)}</p>
                <p class="text-xs text-slate-500">VAT &amp; Tax included</p>
                <p class="text-xs text-slate-500">24/7 Service &amp; API Support</p>
              </div>
              <div class="px-5 pb-5 text-center"><button data-action="sms-select" data-value="${p.id}" class="px-6 py-2 text-sm font-semibold text-white bg-[#0b3a63] rounded-full hover:opacity-90">Select</button></div>
            </div>`).join('')}
        </div>
      </section>
      ${SMS_REQUESTS.length ? anCard('Your SMS Purchase Requests', '', miniTable(['Date', 'Reference', 'Package', 'Signed Letter', 'Status'],
        SMS_REQUESTS.map(r => { const p = pkgOf(r.pkg); return [fmtDate(r.date), `<span class="font-mono">${r.ref}</span>`, `${p.name} · ${p.sms.toLocaleString()} SMS · BDT ${p.price.toFixed(2)}`, esc(r.letter), supBadge({ Approved: 'bg-emerald-50 text-emerald-600', Pending: 'bg-amber-50 text-amber-600' }, r.status)]; }))) : ''}
    </div>`;
}
function smsBuyDrawer() {
  const d = otherDraft;
  const p = pkgOf(d.pkg);
  return drawerShell({
    title: `${p.name} Package`,
    sub: `<span>${p.sms.toLocaleString()} SMS · BDT ${p.price.toFixed(2)} (VAT &amp; tax included)</span>`,
    body: `
      ${section('Terms & Conditions', `<ul class="list-disc pl-5 space-y-1.5 text-sm text-slate-600">
        <li>SMS may only be sent to customers who agreed to receive them; promotional SMS follow BTRC rules.</li>
        <li>You are responsible for the content you send from your sender ID.</li>
        <li>Credits are added after the signed declaration letter is verified and payment is confirmed.</li>
      </ul>
      <label class="mt-3 flex items-start gap-2 text-sm text-slate-700"><input type="checkbox" data-other-check="agree" ${d.agree ? 'checked' : ''} class="mt-0.5 rounded border-slate-300 text-primary-600">I agree to the terms and conditions.</label>
      ${formErrors.agree ? `<p class="text-[11px] font-medium text-rose-600 mt-1">${formErrors.agree}</p>` : ''}`)}
      ${d.agree ? field('Upload signed declaration letter', `<input type="file" data-other-file accept=".pdf,.jpg,.jpeg,.png" class="block w-full text-sm text-slate-600 file:mr-3 file:px-3 file:py-1.5 file:rounded file:border file:border-slate-200 file:bg-white file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-50">`, { required: true, error: formErrors.letter, hint: d.letter ? `Selected: ${esc(d.letter)} (prototype — not uploaded)` : 'PDF, JPG or PNG, up to 2MB.' }) : ''}`,
    footer: `<button data-action="close-drawer" class="${BTN_SECONDARY}">Cancel</button><button data-action="sms-submit" ${d.agree ? '' : 'disabled'} class="${BTN_PRIMARY} disabled:opacity-50 disabled:cursor-not-allowed">${ic('send', 'w-4 h-4')}Submit</button>`,
  });
}

// ----- Developer / Tech Info (old panel, one page) ---------------------
const SDKS = [
  { name: 'AndroidX SDK', updates: ['Released on 13/10/2020'] },
  { name: 'Android SDK', updates: ['Last Update on 26 July, 2020 (Final version before AndroidX)', 'Previous Update on 22 April, 2020', 'Previous Update on 22 Oct, 2019', 'Previous Update on 4 Sep, 2019', 'Previous Update on 20 Aug, 2019', 'Previous Update on 11 July, 2019'] },
  { name: 'iOS SDK', updates: ['Last Update on 20 Sep, 2022', 'Previous Update on 11 Nov, 2021', 'Previous Update on 26 July, 2020', 'Previous Update on 22 Oct, 2019', 'Previous Update on 12 July, 2019'] },
];
const INTEGRATION_LINKS = {
  'Sandbox System': [
    ['Gateway URL', 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php'],
    ['Validation API', 'https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php'],
    ['Example', 'https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php?val_id=<Validation Id>&store_id=<Store Text Id>&store_passwd=<Store Test Password>'],
    ['Transaction Status Check API', 'https://sandbox.sslcommerz.com/validator/api/merchantTransIDvalidationAPI.php'],
    ['Example', 'https://sandbox.sslcommerz.com/validator/api/merchantTransIDvalidationAPI.php?tran_id=<Transaction Id>&store_id=<Store Text Id>&store_passwd=<Store Test Password>&v=3&format=json'],
  ],
  'Live System': [
    ['Gateway URL', 'https://securepay.sslcommerz.com/gwprocess/v4/api.php'],
    ['Validation API', 'https://securepay.sslcommerz.com/validator/api/validationserverAPI.php'],
    ['Example', 'https://securepay.sslcommerz.com/validator/api/validationserverAPI.php?val_id=<Validation Id>&store_id=<Store Live Id>&store_passwd=<Store Live Password>'],
    ['Transaction Status Check API', 'https://securepay.sslcommerz.com/validator/api/merchantTransIDvalidationAPI.php'],
    ['Example', 'https://securepay.sslcommerz.com/validator/api/merchantTransIDvalidationAPI.php?tran_id=<Transaction Id>&store_id=<Store Live Id>&store_passwd=<Store Live Password>&v=3&format=json'],
  ],
};
const PAY_LOGOS = ['SSLCommerz-Pay-With-logo-All-Size-05.png', 'SSLCommerz-Pay-With-logo-All-Size-04.png', 'SSLCommerz-Pay-With-logo-All-Size-02.png', 'sslcommerz.png', 'SSLCommerz-Pay-With-logo-All-Size-01.png', 'SSLCommerz-Pay-With-logo-All-Size-03.png'];
function renderDeveloper() {
  const urlItem = ([label, url]) => `<div><p class="text-xs font-semibold text-slate-500 mb-1">${label}</p><div class="flex items-start gap-2 rounded-md bg-slate-50 border border-slate-100 px-3 py-2"><code class="text-[11px] text-slate-700 break-all flex-1">${esc(url)}</code><button data-action="copy" data-value="${esc(url)}" class="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-white shrink-0" title="Copy">${ic('copy', 'w-3.5 h-3.5')}</button></div></div>`;
  const dl = (what) => `<button data-action="toast" data-msg="Prototype: ${what} download is not wired up." class="font-semibold text-primary-600 hover:underline">Click here</button> to download`;
  return `
    <div class="space-y-6">
      ${pageHeader('Developer/Tech Info', 'Integration links, SDKs and logos for your developers.')}
      ${anCard('Developer/Tech Panel', '', `<div class="space-y-3 text-sm text-slate-600 leading-relaxed">
        <p>SSLCOMMERZ is the first payment gateway in Bangladesh opening doors for merchants to receive payments on the internet via their online stores. Integrate SSLCOMMERZ with your online store so customers can pay in Bangladeshi Taka with local and international cards, mobile banking and internet banking.</p>
        <p>SSLCOMMERZ uses industry standard Secure Sockets Layer (SSL) technology for data encryption.</p>
        <p>Developer Page: <a href="https://developer.sslcommerz.com/" target="_blank" rel="noopener" class="font-semibold text-primary-600 hover:underline">https://developer.sslcommerz.com/</a></p></div>`)}
      <section class="space-y-3">
        <h2 class="text-sm font-semibold text-slate-900">SDK and Module</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          ${SDKS.map(sdk => `
            <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-2">
              <p class="text-sm font-bold text-slate-900">${sdk.name}</p>
              <p class="text-xs text-slate-600">Lib : ${dl(`${sdk.name} library`)}</p>
              <p class="text-xs text-slate-600">Document : ${dl(`${sdk.name} document`)}</p>
              <ul class="space-y-1 pt-1">${sdk.updates.map((u, i) => `<li class="text-xs ${i ? 'text-slate-500' : 'text-slate-800 font-medium'}">${u}</li>`).join('')}</ul>
            </div>`).join('')}
          <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-2">
            <p class="text-sm font-bold text-slate-900">CMS</p>
            <p class="text-xs text-slate-600">Github Link - <button data-action="toast" data-msg="Prototype: link not wired up." class="font-semibold text-primary-600 hover:underline">Click here</button></p>
            <p class="text-xs text-slate-600">Developer Page - <a href="https://developer.sslcommerz.com/" target="_blank" rel="noopener" class="font-semibold text-primary-600 hover:underline">Click here</a></p>
          </div>
        </div>
      </section>
      ${anCard('Payment Interface', 'There are two ways to display the SSLCOMMERZ payment page for your customer.', `<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        ${[['1', 'Easy Checkout Integration', 'It is an embedded js integration within your site which will display the payment channels in your page.', 'panel-top'], ['2', 'Hosted Payment Integration', 'Here, you will redirect the customer to SSLCOMMERZ Hosted page to display the payment channels.', 'external-link']].map(([n, t, d, icon]) => `
          <div class="rounded-lg border border-slate-200 p-4"><p class="text-sm font-bold text-slate-800">${n}. ${t}</p><p class="text-xs text-slate-500 mt-2">${d}</p>
          <div class="mt-3 h-28 rounded-md bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center text-slate-300">${ic(icon, 'w-8 h-8')}</div></div>`).join('')}
      </div>`)}
      <section class="space-y-3">
        <h2 class="text-sm font-semibold text-slate-900">Integration Links</h2>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          ${Object.entries(INTEGRATION_LINKS).map(([sys, links]) => anCard(sys, sys === 'Live System' ? 'Use only after your store is approved for live' : 'For testing with your sandbox store', `<div class="space-y-3">${links.map(urlItem).join('')}</div>`)).join('')}
        </div>
      </section>
      ${anCard('Pay with Logo', 'Show customers which payment methods you accept', `<div class="grid grid-cols-1 md:grid-cols-2 gap-4">${PAY_LOGOS.map(file => {
        const path = `https://securepay.sslcommerz.com/public/image/${file}`;
        return `<div class="rounded-lg border border-slate-200 p-4 space-y-2">
          <div class="h-16 rounded bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center text-[11px] text-slate-400">Out look — preview not loaded in the prototype</div>
          ${urlItem(['Image Path', path])}
          ${urlItem(['Example', `<a target="_blank" href="https://www.sslcommerz.com/" title="SSLCommerz" alt="SSLCommerz"><img style="width:300px;height:auto;" src="${path}" /></a>`])}</div>`;
      }).join('')}</div>`)}
      <p class="flex items-center gap-1.5 text-[11px] text-slate-400">${ic('shield-check', 'w-3.5 h-3.5')}Store passwords are never shown in the portal. Never share them by chat, email or phone.</p>
    </div>`;
}

// ----- Merchant FAQ (old panel: lettered categories) --------------------
const faqState = { open: null };
function faqList() {
  return FAQ_GROUPS.map(g => `
    <section class="space-y-2">
      <h2 class="text-base font-semibold text-slate-900">${g.letter}. ${g.title}</h2>
      <div class="space-y-2">${g.items.map((f, i) => `
        <div class="bg-white rounded-lg border border-slate-200 shadow-sm">
          <button data-action="faq-toggle" data-value="${f.id}" class="w-full flex items-center justify-between gap-4 px-4 py-3 text-left hover:bg-slate-50" aria-expanded="${faqState.open === f.id}">
            <span class="text-sm text-slate-800">Q${i + 1}. ${esc(f.q)}</span>${ic(faqState.open === f.id ? 'circle-minus' : 'circle-plus', 'w-4 h-4 text-slate-500 shrink-0')}
          </button>
          ${faqState.open === f.id ? `<div class="px-4 pb-3 text-sm text-slate-600 leading-relaxed">${esc(f.a)}</div>` : ''}
        </div>`).join('')}</div>
    </section>`).join('');
}
function renderFaq() {
  return `
    <div class="space-y-6 max-w-4xl">
      ${pageHeader('Merchant FAQ', 'Answers to common questions about transactions, settlement, EMI and your account.')}
      <div id="faq-list" class="space-y-6">${faqList()}</div>
      ${mockNote('Answers are short mock text — replace with the published SSLCOMMERZ answers.')}
    </div>`;
}

// ----- Instructional Videos/Documents (old panel) ---------------------
function renderLearning() {
  return `
    <div class="space-y-6">
      ${pageHeader('Instructional Videos/Documents', 'Short videos and guides for you and your team.')}
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        ${VIDEOS.map(v => `
          <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div class="px-4 py-2.5 bg-primary-600 text-white text-sm font-semibold truncate" title="${esc(v.title)}">${esc(v.title)}</div>
            <button data-action="open-video" data-value="${v.id}" aria-label="Play ${esc(v.title)}" class="w-full h-40 bg-gradient-to-br from-slate-800 to-slate-600 flex items-center justify-center hover:opacity-95">
              <span class="w-14 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center">${ic('play', 'w-5 h-5 ml-0.5')}</span>
            </button>
          </div>`).join('')}
        ${DOCS.map(d => `
          <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div class="px-4 py-2.5 bg-primary-600 text-white text-sm font-semibold truncate">${esc(d.title)}</div>
            <div class="h-40 flex items-center justify-center">
              <button data-action="toast" data-msg="Prototype: the PDF is not attached yet." class="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700">${ic('file-text', 'w-4 h-4')}View PDF</button>
            </div>
          </div>`).join('')}
      </div>
    </div>`;
}
function videoDrawer(v) {
  return drawerShell({
    wide: true,
    title: esc(v.title),
    sub: `<span>${v.lang} · YouTube</span>`,
    body: `<div class="aspect-video rounded-xl bg-slate-900 flex flex-col items-center justify-center text-slate-400 gap-2">${ic('circle-play', 'w-12 h-12')}<p class="text-xs">Video player placeholder — the YouTube video is not embedded in the prototype.</p></div>`,
    footer: `<button data-action="close-drawer" class="${BTN_SECONDARY}">Close</button>`,
  });
}
