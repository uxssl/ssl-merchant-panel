// =====================================================================
// Services & Add-ons — self-service activation (docs/service-activation-flow.md)
// =====================================================================
// Digital mapping decides per store which services it may buy, replacing the manual work-order
// check. Offers open from the dashboard's "Activate Services" button, this page, and banners on locked features.
const SERVICES_PATH = '/others/services';
const SVC_MIN_AGE_DAYS = 90;
const SVC_OTP_MOBILE = '01•••••••47'; // masked registered mobile; the full number never reaches the page
const svcOf = (id) => SERVICE_CATALOG.find(s => s.id === id);
const svcPlan = (svc, id) => svc.plans.find(p => p.id === id);
const svcTotal = (p) => p.fee * (1 + SERVICE_VAT);
const svcFrom = (svc) => Math.min(...svc.plans.map(p => p.fee));
const svcLimit = (n) => `৳${n.toLocaleString('en-US')}`;
const SVC_STATE_CLS = { Active: 'bg-emerald-50 text-emerald-600', 'Under review': 'bg-amber-50 text-amber-600', Declined: 'bg-rose-50 text-rose-600' };

// The mapping rules: shared store checks first, then the service's own (EMI must not already be on).
function svcMapping(svc, st) {
  const order = SERVICE_ORDERS.find(o => o.svc === svc.id && o.store === st.id && o.status !== 'Declined');
  if (order) return { state: order.status === 'Active' ? 'active' : 'review', order };
  if (svc.id === 'emi' && st.emi === 'EMI Enabled') return { state: 'active', legacy: true };
  if (st.status !== 'Active') return { state: 'ineligible', reason: 'Store is inactive' };
  if (st.currency !== 'BDT') return { state: 'ineligible', reason: `Available on BDT stores only (this store settles in ${st.currency})` };
  const age = Math.floor((TODAY - st.created) / 864e5);
  if (age < SVC_MIN_AGE_DAYS) return { state: 'ineligible', reason: `Live for ${age} days — eligible after ${SVC_MIN_AGE_DAYS} days` };
  return { state: 'eligible', why: ['Active store', 'KYC verified', `Live since ${fmtDate(st.created)}`] };
}
const svcPairs = () => SERVICE_CATALOG.flatMap(svc => ACCOUNT_STORES.map(st => ({ svc, st, m: svcMapping(svc, st) })));
const svcOffers = () => svcPairs().filter(o => o.m.state === 'eligible');

// ----- Offers dialog: opened by the merchant, never on its own ------------
let svcDraft = null; // { step, svc, store, plan, pay, agree, otp, order }
function openServiceFlow(key) {
  svcDraft = { step: 'offers', pay: 'settlement', agree: false, otp: '' };
  if (key) pickServiceOffer(key);
  formErrors = {};
  drawer = { kind: 'svc', item: null };
  renderDrawer();
}
function pickServiceOffer(key) {
  const [svc, store] = key.split('|');
  Object.assign(svcDraft, { step: 'plan', svc, store, plan: (svcOf(svc).plans.find(p => p.recommended) || svcOf(svc).plans[0]).id, agree: false, otp: '' });
}

// Centered dialog; reuses the drawer root, so Escape, focus trap and focus return behave the same.
function svcModalShell({ title, sub, body, footer }) {
  // Animate only on open; moving between steps redraws in place without flashing.
  const opening = !$('#drawer-root').firstElementChild;
  return `
    <div class="fixed inset-0 z-[150] flex items-end sm:items-center justify-center sm:p-4">
      <div data-action="close-drawer" data-backdrop aria-hidden="true" class="fixed inset-0 bg-slate-900/30 backdrop-blur-sm ${opening ? 'anim-fade' : ''}"></div>
      <div id="drawer-panel" role="dialog" aria-modal="true" aria-labelledby="drawer-title" class="relative w-full sm:max-w-2xl max-h-[92vh] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col ${opening ? 'anim-pop' : ''}">
        <div class="px-5 sm:px-6 pt-5 pb-4 border-b border-slate-100 flex items-start justify-between gap-3">
          <div class="min-w-0">
            <h2 id="drawer-title" class="text-lg font-semibold text-slate-900">${title}</h2>
            <div class="text-sm text-slate-500 mt-0.5">${sub}</div>
          </div>
          <button data-action="close-drawer" data-drawer-close aria-label="Close" class="p-2 -mr-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors shrink-0">${ic('x', 'w-5 h-5')}</button>
        </div>
        <div class="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-5">${body}</div>
        <div class="px-5 sm:px-6 py-4 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2">${footer}</div>
      </div>
    </div>`;
}

const SVC_STEPS = [['plan', 'Choose plan'], ['review', 'Review & agree'], ['otp', 'Confirm']];
function svcStepper(step) {
  const at = SVC_STEPS.findIndex(s => s[0] === step);
  return `<ol class="flex items-center gap-2 text-xs" aria-label="Activation steps">
    ${SVC_STEPS.map(([, label], i) => `
      <li class="flex items-center gap-2 ${i ? 'flex-1' : ''}" ${i === at ? 'aria-current="step"' : ''}>
        ${i ? `<span class="h-px flex-1 ${i <= at ? 'bg-primary-600' : 'bg-slate-200'}"></span>` : ''}
        <span class="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 ${i < at ? 'bg-primary-600 text-white' : i === at ? 'bg-primary-600 text-white ring-4 ring-primary-100' : 'bg-slate-100 text-slate-500'}">${i < at ? ic('check', 'w-3 h-3') : i + 1}</span>
        <span class="whitespace-nowrap ${i === at ? 'font-semibold text-slate-900' : 'text-slate-500'} ${i === at ? '' : 'hidden sm:inline'}">${label}</span>
      </li>`).join('')}
  </ol>`;
}

const svcSummary = (svc, st, p) => `
  <div class="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
    <span class="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">${ic(svc.icon, 'w-4.5 h-4.5 text-primary-600')}</span>
    <div class="min-w-0 flex-1">
      <p class="text-sm font-semibold text-slate-900">${svc.name}${p ? ` · ${p.name}` : ''}</p>
      <p class="text-xs text-slate-500 truncate">${esc(st.name)} <span class="font-mono">(${st.id})</span></p>
    </div>
    ${p ? `<p class="w-full sm:w-auto pl-12 sm:pl-0 sm:text-right text-xs text-slate-500 shrink-0">${svc.limitLabel}<span class="block text-sm font-bold text-slate-900">${svcLimit(p.limit)}</span></p>` : ''}
  </div>`;

function svcOffersStep() {
  const offers = svcOffers();
  return svcModalShell({
    title: 'Services your stores can activate',
    sub: 'Your stores already qualify — switch these on yourself, no paperwork or work order needed.',
    body: `
      <ul class="space-y-3">
        ${offers.slice(0, 3).map(({ svc, st, m }) => `
          <li class="rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:border-primary-300 transition-colors">
            <span class="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">${ic(svc.icon, 'w-5 h-5 text-primary-600')}</span>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-slate-900">${svc.name} <span class="font-normal text-slate-500">for</span> ${esc(st.name)}</p>
              <p class="text-xs text-slate-500 mt-0.5">${svc.pitch}</p>
              <p class="mt-2 flex flex-wrap gap-1.5">${m.why.map(w => `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-medium">${ic('check', 'w-3 h-3')}${w}</span>`).join('')}</p>
            </div>
            <div class="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
              <p class="text-xs text-slate-500">from <span class="font-semibold text-slate-900">${fmtBDT(svcFrom(svc))}</span> + VAT</p>
              <button data-action="svc-pick" data-value="${svc.id}|${st.id}" aria-label="Activate ${svc.name} for ${esc(st.name)}" class="${BTN_PRIMARY} rounded-md">Activate${ic('arrow-right', 'w-4 h-4')}</button>
            </div>
          </li>`).join('')}
      </ul>
      ${offers.length > 3 ? `<p class="text-xs text-slate-500">${offers.length - 3} more on <a href="#${SERVICES_PATH}" class="font-semibold text-primary-600 hover:underline">Services &amp; Add-ons</a>.</p>` : ''}`,
    footer: `
      <a href="#${SERVICES_PATH}" class="mr-auto text-sm font-medium text-primary-600 hover:underline">See all services</a>
      <button data-action="close-drawer" class="${BTN_SECONDARY}">Close</button>`,
  });
}

function svcPlanStep(svc, st) {
  const d = svcDraft;
  return svcModalShell({
    title: `Activate ${svc.name}`,
    sub: svcStepper('plan'),
    body: `
      ${svcSummary(svc, st)}
      <fieldset>
        <legend class="text-xs font-bold text-slate-700 mb-2">Choose a plan</legend>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          ${svc.plans.map(p => {
            const on = d.plan === p.id;
            return `
            <label class="relative flex flex-col gap-1 rounded-xl border-2 p-4 cursor-pointer transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary-500/40 ${on ? 'border-primary-600 bg-primary-50/50' : 'border-slate-200 hover:border-slate-300'}">
              <input type="radio" name="svc-plan" data-svc="plan" value="${p.id}" ${on ? 'checked' : ''} class="sr-only">
              ${p.recommended ? '<span class="absolute -top-2.5 left-3 px-2 py-0.5 rounded-full bg-primary-600 text-white text-[10px] font-semibold uppercase tracking-wide">Recommended</span>' : ''}
              <span class="flex items-center justify-between text-xs font-semibold text-slate-500">${p.name}${on ? ic('circle-check', 'w-4 h-4 text-primary-600') : '<span class="w-4 h-4 rounded-full border border-slate-300"></span>'}</span>
              <span class="text-xl font-bold text-slate-900">${svcLimit(p.limit)}</span>
              <span class="text-[11px] text-slate-500">${svc.limitLabel}</span>
              <span class="mt-2 pt-2 border-t border-slate-200 text-sm font-semibold text-slate-800">${fmtBDT(p.fee)} <span class="text-[11px] font-normal text-slate-500">one-time + VAT</span></span>
              <span class="text-[11px] ${p.review ? 'text-amber-700' : 'text-emerald-700'} inline-flex items-center gap-1">${ic(p.review ? 'clock' : 'zap', 'w-3 h-3')}${p.review ? 'Active after a quick KAM review' : 'Active instantly'}</span>
            </label>`;
          }).join('')}
        </div>
      </fieldset>
      <p class="text-xs text-slate-500">Need a higher limit? Ask your Key Account Manager after activation.</p>`,
    footer: `
      <button data-action="svc-back" data-value="offers" class="mr-auto ${BTN_SECONDARY}">${ic('arrow-left', 'w-4 h-4')}Back</button>
      <button data-action="svc-next" class="${BTN_PRIMARY}">Continue${ic('arrow-right', 'w-4 h-4')}</button>`,
  });
}

function svcReviewStep(svc, st, p) {
  const d = svcDraft;
  const vat = p.fee * SERVICE_VAT;
  const payOpt = (value, title, hint) => `
    <label class="flex items-start gap-3 rounded-lg border p-3 cursor-pointer ${d.pay === value ? 'border-primary-600 bg-primary-50/40' : 'border-slate-200 hover:border-slate-300'}">
      <input type="radio" name="svc-pay" data-svc="pay" value="${value}" ${d.pay === value ? 'checked' : ''} class="mt-0.5 text-primary-600 border-slate-300">
      <span><span class="block text-sm font-medium text-slate-800">${title}</span><span class="block text-xs text-slate-500">${hint}</span></span>
    </label>`;
  return svcModalShell({
    title: `Activate ${svc.name}`,
    sub: svcStepper('review'),
    body: `
      ${svcSummary(svc, st, p)}
      ${section('Price', `<dl class="text-sm divide-y divide-slate-100 rounded-lg border border-slate-200">
        <div class="flex justify-between px-4 py-2"><dt class="text-slate-600">Activation fee (one-time)</dt><dd class="tabular-nums text-slate-800">${fmtBDT(p.fee)}</dd></div>
        <div class="flex justify-between px-4 py-2"><dt class="text-slate-600">VAT (${SERVICE_VAT * 100}%)</dt><dd class="tabular-nums text-slate-800">${fmtBDT(vat)}</dd></div>
        <div class="flex justify-between px-4 py-2 bg-slate-50 rounded-b-lg"><dt class="font-semibold text-slate-900">Total</dt><dd class="tabular-nums font-bold text-slate-900">${fmtBDT(p.fee + vat)}</dd></div>
      </dl>`)}
      ${section('Payment', `<div class="space-y-2">
        ${payOpt('settlement', 'Deduct from next settlement', `Adjusted against ${esc(st.name)}'s next payout — nothing to pay now.`)}
        ${payOpt('online', 'Pay online now', 'Opens the SSLCOMMERZ secure checkout. Card details are never entered in this portal.')}
      </div>`)}
      ${section('Terms & Conditions', `<ul class="list-disc pl-5 space-y-1.5 text-sm text-slate-600">
        ${svc.terms.map(t => `<li>${t}</li>`).join('')}
        <li>Fees are non-refundable once the service is active. ${p.review ? 'This plan is reviewed first; no fee is taken if it is declined.' : ''}</li>
      </ul>
      <label class="mt-3 flex items-start gap-2 text-sm text-slate-700"><input type="checkbox" data-svc="agree" ${d.agree ? 'checked' : ''} class="mt-0.5 rounded border-slate-300 text-primary-600">I agree to the ${svc.name} terms and conditions on behalf of ${esc(MERCHANT_NAME.replace(/\.$/, ''))}.</label>
      ${formErrors.agree ? `<p class="text-[11px] font-medium text-rose-600 mt-1">${formErrors.agree}</p>` : ''}`)}`,
    footer: `
      <button data-action="svc-back" data-value="plan" class="mr-auto ${BTN_SECONDARY}">${ic('arrow-left', 'w-4 h-4')}Back</button>
      <button data-action="svc-next" class="${BTN_PRIMARY}">${ic('shield-check', 'w-4 h-4')}Agree &amp; continue</button>`,
  });
}

function svcOtpStep(svc, st, p) {
  return svcModalShell({
    title: `Activate ${svc.name}`,
    sub: svcStepper('otp'),
    body: `
      ${svcSummary(svc, st, p)}
      <div class="text-center space-y-3 py-2">
        <span class="mx-auto w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center">${ic('smartphone', 'w-6 h-6 text-primary-600')}</span>
        <p class="text-sm text-slate-700">Enter the 6-digit code sent to your registered mobile <span class="font-mono font-semibold">${SVC_OTP_MOBILE}</span></p>
        <input id="svc-otp" data-svc="otp" value="${esc(svcDraft.otp)}" inputmode="numeric" autocomplete="one-time-code" maxlength="6" aria-label="One-time code" aria-invalid="${!!formErrors.otp}" placeholder="••••••" class="${INPUT} max-w-[12rem] mx-auto text-center text-lg tracking-[0.5em] font-mono">
        ${formErrors.otp ? `<p class="text-[11px] font-medium text-rose-600">${formErrors.otp}</p>` : '<p class="text-[11px] text-slate-500">Code expires in 5 minutes.</p>'}
        <button data-action="toast" data-msg="Prototype: no code was sent." class="text-xs font-semibold text-primary-600 hover:underline">Resend code</button>
      </div>
      <p class="text-[11px] text-slate-500 text-center">You confirm a purchase of <strong class="text-slate-700">${fmtBDT(svcTotal(p))}</strong> (incl. VAT) — ${svcDraft.pay === 'settlement' ? 'deducted from the next settlement' : 'paid via SSLCOMMERZ checkout'}.</p>`,
    footer: `
      <button data-action="svc-back" data-value="review" class="mr-auto ${BTN_SECONDARY}">${ic('arrow-left', 'w-4 h-4')}Back</button>
      <button data-action="svc-confirm" class="${BTN_PRIMARY}">${ic('lock', 'w-4 h-4')}Confirm &amp; activate</button>`,
  });
}

function svcDoneStep(svc, st, p) {
  const o = svcDraft.order;
  const live = o.status === 'Active';
  return svcModalShell({
    title: live ? `${svc.name} is active` : 'Sent for review',
    sub: live ? `Switched on for ${esc(st.name)} — customers can use it right away.` : 'Your KAM will review this plan, usually within one working day (mock).',
    body: `
      <div class="text-center py-2">
        <span class="mx-auto w-14 h-14 rounded-full ${live ? 'bg-emerald-50' : 'bg-amber-50'} flex items-center justify-center">${ic(live ? 'circle-check' : 'clock', `w-7 h-7 ${live ? 'text-emerald-600' : 'text-amber-600'}`)}</span>
      </div>
      ${svcSummary(svc, st, p)}
      ${kvGrid([
        kv('Reference', o.ref, true),
        kv('Status', `<span class="${STATUS_BADGE} ${SVC_STATE_CLS[o.status]}">${o.status}</span>`),
        kv('Total (incl. VAT)', fmtBDT(svcTotal(p))),
        kv('Payment', live ? (svcDraft.pay === 'settlement' ? 'Next settlement' : 'SSLCOMMERZ checkout') : 'After approval'),
      ])}
      ${mockNote('Prototype: no OTP was checked, nothing was charged and no request was sent.')}`,
    footer: `
      <button data-action="close-drawer" class="${BTN_SECONDARY}">Done</button>
      ${live ? `<button data-action="svc-configure" data-value="${svc.id}|${st.id}" class="${BTN_PRIMARY}">${ic('settings-2', 'w-4 h-4')}${svc.id === 'emi' ? 'Set up EMI banks' : `Open ${svc.name}`}</button>` : ''}`,
  });
}

function svcFlowModal() {
  const d = svcDraft;
  if (d.step === 'offers') return svcOffersStep();
  const svc = svcOf(d.svc), st = accStore(d.store), p = svcPlan(svc, d.plan);
  return { plan: svcPlanStep, review: svcReviewStep, otp: svcOtpStep, done: svcDoneStep }[d.step](svc, st, p);
}

// Buying: re-check the mapping at confirm time (it may have changed since the pop-up opened).
function confirmServiceOrder() {
  const d = svcDraft;
  formErrors = {};
  if (!/^\d{6}$/.test(d.otp.trim())) formErrors.otp = 'Enter the 6-digit code.';
  const svc = svcOf(d.svc), st = accStore(d.store), p = svcPlan(svc, d.plan);
  if (!formErrors.otp && svcMapping(svc, st).state !== 'eligible') formErrors.otp = 'This store is no longer eligible. Contact your KAM.';
  if (Object.keys(formErrors).length) return false;
  const order = { ref: `SVC${ymd(TODAY)}${digits(4)}`, svc: svc.id, store: st.id, plan: p.id, date: new Date(NOW), status: p.review ? 'Under review' : 'Active', by: 'demo_merchant' };
  SERVICE_ORDERS.unshift(order);
  if (order.status === 'Active' && svc.id === 'emi') {
    st.emi = 'EMI Enabled';
    EMI_STORES[st.id] = true;
    EMI_CONFIG[st.id].model = 'params';
    if (emiForm?.store === st.id) emiForm = null;
  }
  d.order = order;
  d.step = 'done';
  return true;
}

// Banner on a page whose feature is off for the chosen store (Digital EMI settings).
function svcBanner(svcId, storeId) {
  const svc = svcOf(svcId), st = accStore(storeId);
  if (!st) return '';
  const m = svcMapping(svc, st);
  if (m.state === 'review') return `<div class="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">${ic('clock', 'w-4 h-4 shrink-0')}<span>${svc.name} for ${esc(st.name)} is under review (${m.order.ref}). It switches on once approved.</span></div>`;
  if (m.state !== 'eligible') return '';
  return `
    <div class="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-primary-200 bg-primary-50 px-4 py-3">
      <span class="w-9 h-9 rounded-lg bg-white flex items-center justify-center shrink-0">${ic(svc.icon, 'w-4.5 h-4.5 text-primary-600')}</span>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold text-slate-900">${svc.name} is not active on ${esc(st.name)}</p>
        <p class="text-xs text-slate-600">This store qualifies — activate it yourself in about 2 minutes, from ${fmtBDT(svcFrom(svc))} + VAT.</p>
      </div>
      <button data-action="svc-open" data-value="${svc.id}|${st.id}" class="${BTN_PRIMARY} rounded-md shrink-0">${ic('zap', 'w-4 h-4')}Activate now</button>
    </div>`;
}

// ----- Services & Add-ons page ------------------------------------------
function renderServices() {
  const pairs = svcPairs();
  const offers = pairs.filter(o => o.m.state === 'eligible');
  const blocked = pairs.filter(o => o.m.state === 'ineligible');
  const owned = [
    ...SERVICE_ORDERS.map(o => ({ o, svc: svcOf(o.svc), st: accStore(o.store) })),
    ...pairs.filter(x => x.m.legacy).map(({ svc, st }) => ({ svc, st, o: null })),
  ];
  return `
    <div class="space-y-6">
      ${pageHeader('Services & Add-ons', 'Buy and switch on extra services for your stores — no paperwork or work order.')}
      <section class="space-y-3">
        <h2 class="text-sm font-semibold text-slate-900">Available for your stores <span class="ml-1 text-xs font-normal text-slate-500">${offers.length}</span></h2>
        ${offers.length ? `<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          ${offers.map(({ svc, st, m }) => `
            <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3">
              <div class="flex items-start gap-3">
                <span class="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">${ic(svc.icon, 'w-5 h-5 text-primary-600')}</span>
                <div class="min-w-0">
                  <h3 class="text-sm font-semibold text-slate-900">${svc.name}</h3>
                  <p class="text-xs text-slate-500 truncate">${esc(st.name)}</p>
                </div>
              </div>
              <p class="text-sm text-slate-600 flex-1">${svc.pitch}</p>
              <p class="flex flex-wrap gap-1.5">${svc.plans.map(p => `<span class="px-2 py-0.5 rounded-full border border-slate-200 text-[11px] font-medium text-slate-600">${svcLimit(p.limit)}</span>`).join('')}</p>
              <div class="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <p class="text-xs text-slate-500">from <span class="font-semibold text-slate-900">${fmtBDT(svcFrom(svc))}</span> + VAT</p>
                <button data-action="svc-open" data-value="${svc.id}|${st.id}" aria-label="Activate ${svc.name} for ${esc(st.name)}" class="${BTN_PRIMARY} rounded-md">Activate</button>
              </div>
              <p class="sr-only">Eligible because: ${m.why.join(', ')}</p>
            </div>`).join('')}
        </div>` : `<div class="bg-white rounded-xl border border-slate-200 p-6 text-center text-sm text-slate-500">Every service your stores qualify for is already on.</div>`}
      </section>
      ${anCard('Your services', 'Bought here or switched on earlier by your KAM', owned.length ? miniTable(['Service', 'Store', 'Plan', 'Total (incl. VAT)', 'Reference', 'Since', 'Status'],
        owned.map(({ o, svc, st }) => {
          const p = o && svcPlan(svc, o.plan);
          return [svc.name, esc(st.name), p ? `${p.name} · ${svcLimit(p.limit)}` : 'Work order', p ? fmtBDT(svcTotal(p)) : '—', o ? `<span class="font-mono">${o.ref}</span>` : '—', o ? fmtDate(o.date) : fmtDate(st.created), `<span class="${STATUS_BADGE} ${SVC_STATE_CLS[o ? o.status : 'Active']}">${o ? o.status : 'Active'}</span>`];
        }), { right: [3] }) : '<p class="text-sm text-slate-500">No services yet.</p>')}
      ${blocked.length ? anCard('Not available yet', 'These stores do not qualify today. Your KAM can help.', `<ul class="divide-y divide-slate-100">
        ${blocked.map(({ svc, st, m }) => `<li class="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"><span class="text-slate-800"><span class="font-medium">${svc.name}</span> · ${esc(st.name)}</span><span class="inline-flex items-center gap-1.5 text-xs text-slate-500">${ic('info', 'w-3.5 h-3.5')}${m.reason}</span></li>`).join('')}
      </ul>`) : ''}
      ${mockNote('Eligibility is worked out automatically from your store profile. Only Merchant Admins can buy. Prototype: nothing is charged and no request is sent.')}
    </div>`;
}
