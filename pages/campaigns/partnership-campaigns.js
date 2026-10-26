// =====================================================================
// Partnership Campaigns
// =====================================================================
let partnerTab = 'open';
let joinDraft = null;

function partnerCard(c) {
  const perf = partnerPerf(c);
  const left = daysLeft(c.confirm);
  return `
    <div class="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
      <div class="px-5 py-4 bg-gradient-to-br from-primary-700 to-primary-500 text-white">
        <p class="text-[11px] font-semibold uppercase tracking-wider opacity-80">${esc(c.partner)} · ${c.kind === 'MFS' ? 'MFS' : 'Bank'} partner</p>
        <p class="text-2xl font-bold mt-1">${c.pct}% OFF</p>
        <p class="text-xs opacity-90">up to ${fmtBDT0(c.max)} · min. order ${fmtBDT0(c.minOrder)}</p>
      </div>
      <div class="p-5 space-y-3 flex-1">
        <div class="flex items-start justify-between gap-2">
          <h3 class="text-sm font-semibold text-slate-900">${esc(c.partner)} ${esc(c.name)}</h3>
          ${phaseBadge(c)}
        </div>
        <dl class="grid grid-cols-2 gap-2 text-xs">
          <div><dt class="text-slate-500">Campaign period</dt><dd class="text-slate-800 font-medium">${periodText(c)}</dd></div>
          <div><dt class="text-slate-500">Enroll by</dt><dd class="font-medium ${canJoin(c) && left <= 3 ? 'text-rose-600' : 'text-slate-800'}">${fmtDate(c.confirm)}${canJoin(c) ? ` · ${left <= 0 ? 'today' : `${left}d left`}` : ''}</dd></div>
          <div class="col-span-2"><dt class="text-slate-500">Eligible</dt><dd class="text-slate-800">${esc(c.cards)}</dd></div>
          <div class="col-span-2"><dt class="text-slate-500">Sectors</dt><dd class="text-slate-800">${esc(c.sectors)}</dd></div>
        </dl>
        ${perf.txns.length ? `<p class="text-xs text-emerald-700 bg-emerald-50 rounded px-2 py-1.5">${perf.txns.length} payments · ${fmtBDTShort(perf.sales)} sales · ${fmtBDTShort(perf.discount)} discount given</p>` : ''}
        ${c.canOnboard === 'No' && c.participation === 'Not joined' ? '<p class="text-xs text-slate-500 bg-slate-50 rounded px-2 py-1.5">Not open to your sector</p>' : ''}
      </div>
      <div class="px-5 py-3 border-t border-slate-100 flex items-center justify-between gap-2">
        ${pBadge(c.participation)}
        <div class="flex gap-2">
          <button data-action="open-partner" data-value="${c.id}" class="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50">Details</button>
          ${canJoin(c) ? `<button data-action="join-partner" data-value="${c.id}" class="px-3 py-1.5 text-xs font-semibold text-white bg-primary-600 rounded hover:bg-primary-700">Join</button>` : ''}
        </div>
      </div>
    </div>`;
}

function renderPartnerCampaigns() {
  const open = PARTNER_CAMPAIGNS.filter(canJoin);
  const mine = PARTNER_CAMPAIGNS.filter(c => JOINED.includes(c.participation) && phaseOf(c) !== 'Ended');
  const past = PARTNER_CAMPAIGNS.filter(c => phaseOf(c) === 'Ended');
  const discount = PARTNER_CAMPAIGNS.reduce((s, c) => s + partnerPerf(c).discount, 0);
  const lists = { open, mine, all: PARTNER_CAMPAIGNS, past };
  const list = lists[partnerTab];
  const tab = (value, label, n) => `<button data-action="partner-tab" data-value="${value}" class="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${partnerTab === value ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}">${label}<span class="text-[11px] ${partnerTab === value ? 'opacity-80' : 'text-slate-400'}">${n}</span></button>`;
  return `
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">Partnership Campaigns</h1>
        <p class="text-slate-500 text-sm">Bank and MFS offers you can join — the partner shares the discount cost with you.</p>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        ${metricCard({ title: 'Open to Join', value: open.length, sub: open.length ? `Next deadline ${fmtShort(open.map(c => c.confirm).sort((a, b) => a - b)[0])}` : 'Nothing open right now' })}
        ${metricCard({ title: 'Joined', value: mine.length, sub: `${mine.filter(c => c.participation === 'Created').length} awaiting approval` })}
        ${metricCard({ title: 'Running Now', value: PARTNER_CAMPAIGNS.filter(c => phaseOf(c) === 'Running' && c.participation === 'Bank Approved').length, sub: 'with your stores' })}
        ${metricCard({ title: 'Discount Given', value: fmtBDTShort(discount), sub: 'across partner campaigns' })}
      </div>
      <div class="inline-flex p-1 bg-white border border-slate-200 rounded-full shadow-sm">
        ${tab('open', 'Open to Join', open.length)}${tab('mine', 'My Campaigns', mine.length)}${tab('all', 'All', PARTNER_CAMPAIGNS.length)}${tab('past', 'Past', past.length)}
      </div>
      ${list.length ? `<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">${list.map(partnerCard).join('')}</div>` : `
        <div class="flex flex-col items-center justify-center py-14 text-center rounded-xl border border-dashed border-slate-300">
          ${ic('megaphone', 'w-6 h-6 text-slate-300')}
          <p class="text-sm font-semibold text-slate-900 mt-3">No campaigns here</p>
          <p class="text-xs text-slate-500">New partner offers appear in "Open to Join" when banks announce them.</p>
        </div>`}
    </div>`;
}

function partnerDrawer(c) {
  const perf = partnerPerf(c);
  const order = ['Created', 'KAM Approved', 'Bank Approved'];
  const reached = (s) => JOINED.includes(c.participation) && order.indexOf(c.participation) >= order.indexOf(s);
  const steps = [];
  if (c.participation === 'Not joined') steps.push({ label: 'Not joined yet', note: canJoin(c) ? `Enroll before ${fmtDate(c.confirm)}` : 'Enrollment is closed', tone: 'slate' });
  else {
    const reqAt = new Date(Math.min(NOW.getTime(), c.confirm.getTime() - 3 * 864e5));
    steps.push({ label: 'You requested to join', at: reqAt, tone: 'blue' });
    if (c.participation === 'Rejected') steps.push({ label: `Rejected — ${c.rejectReason}`, at: new Date(Math.min(NOW.getTime(), reqAt.getTime() + 864e5)), tone: 'rose' });
    else {
      steps.push(reached('KAM Approved') ? { label: 'Approved by your KAM', at: new Date(Math.min(NOW.getTime(), reqAt.getTime() + 864e5)), tone: 'amber' } : { label: 'Waiting for KAM approval', note: 'Usually within one working day (mock)', tone: 'slate' });
      steps.push(reached('Bank Approved') ? { label: `Approved by ${c.partner}`, at: new Date(Math.min(NOW.getTime(), reqAt.getTime() + 2 * 864e5)), tone: 'emerald' } : { label: `Waiting for ${c.partner} approval`, note: '', tone: 'slate' });
    }
  }
  const byStore = c.stores.map(id => { const l = perf.txns.filter(t => t.store === id); return [esc(STORES.find(s => s.id === id).name), l.length, fmtBDT0(l.reduce((s, t) => s + t.amount, 0)), fmtBDT0(l.reduce((s, t) => s + Math.min(c.max, t.amount * c.pct / 100), 0))]; });
  return drawerShell({
    wide: true,
    title: `${esc(c.partner)} ${esc(c.name)}`,
    sub: `<span class="font-mono text-xs">${c.tracking}</span>${phaseBadge(c)}${pBadge(c.participation)}`,
    body: `
      <div class="grid grid-cols-3 gap-3">
        ${statBox('Discount', offerText(c))}
        ${statBox('Cost Share', `You ${c.merchantShare}% · ${esc(c.partner)} ${100 - c.merchantShare}%`)}
        ${statBox('Enroll By', fmtDate(c.confirm))}
      </div>
      ${section('Campaign Information', kvGrid([
        kv('Campaign', `${esc(c.partner)} ${esc(c.name)}`),
        kv('Tracking Id', c.tracking, true),
        kv('Eligible Cards / Wallet', esc(c.cards)),
        kv('Sectors', esc(c.sectors)),
        kv('Start Date', fmtDate(c.start)),
        kv('End Date', fmtDate(c.end)),
        kv('Confirmation Expire', fmtDate(c.confirm)),
        kv('Can Onboard', c.canOnboard),
      ]))}
      ${section('Discount Terms', kvGrid([
        kv('Offer Modality %', `${c.pct}%`),
        kv('Fully Consumed by Merchant', c.merchantShare === 100 ? 'Yes' : 'No'),
        kv('Shared With Partners %', `${100 - c.merchantShare}%`),
        kv('Minimum Order Amount', fmtBDT0(c.minOrder)),
        kv('Max Discount Amount Per Transaction', fmtBDT0(c.max)),
        kv('Card Discount Amount', `${c.pct}% of order value`),
        kv('Recurrent Discount Limit Per User', `${c.perUser} time${c.perUser > 1 ? 's' : ''}`),
        kv('Remarks', c.kind === 'MFS' ? 'Applied at the MFS payment page' : 'Applied automatically at checkout for eligible cards'),
      ]))}
      ${section('Your Stores', c.stores.length ? `<div class="flex flex-wrap gap-2">${storeNames(c.stores).map(n => `<span class="px-2.5 py-1 rounded-full bg-slate-100 text-xs font-medium text-slate-700">${esc(n)}</span>`).join('')}</div>` : '<p class="text-sm text-slate-500">No stores enrolled.</p>')}
      ${perf.txns.length ? section('Performance', `
        <div class="grid grid-cols-3 gap-3 mb-3">${statBox('Payments', perf.txns.length)}${statBox('Sales', fmtBDTShort(perf.sales))}${statBox('Discount Given', fmtBDTShort(perf.discount), 'text-rose-600')}</div>
        ${miniTable(['Store', 'Payments', 'Sales', 'Discount'], byStore, { right: [1, 2, 3] })}
        <p class="text-[11px] text-slate-500 mt-2">You fund ${c.merchantShare}% of the discount: ${fmtBDT0(perf.discount * c.merchantShare / 100)} (mock).</p>`) : ''}
      ${section('Approval', timeline(steps))}`,
    footer: `
      ${c.participation === 'Created' ? `<button data-action="withdraw-partner" data-value="${c.id}" class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-rose-600 bg-white border border-rose-200 rounded shadow-sm hover:bg-rose-50">${ic('x', 'w-4 h-4')}Withdraw Request</button>` : ''}
      ${canJoin(c) ? `<button data-action="join-partner" data-value="${c.id}" class="${BTN_PRIMARY}">${ic('circle-plus', 'w-4 h-4')}Join Campaign</button>` : ''}`,
  });
}

function joinDrawer() {
  const c = PARTNER_CAMPAIGNS.find(x => x.id === joinDraft.id);
  return drawerShell({
    title: `Join ${esc(c.partner)} ${esc(c.name)}`,
    sub: `<span>Enroll by ${fmtDate(c.confirm)}</span>`,
    body: `
      <div class="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm space-y-1">
        <p class="font-semibold text-slate-900">${offerText(c)} · min. order ${fmtBDT0(c.minOrder)}</p>
        <p class="text-slate-600">${esc(c.cards)} · ${periodText(c)}</p>
        <p class="text-slate-600">You fund <strong>${c.merchantShare}%</strong> of each discount; ${esc(c.partner)} funds ${100 - c.merchantShare}%.</p>
      </div>
      ${section('Stores to enroll', `<div class="space-y-2">
        ${STORES.map(st => `<label class="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 hover:bg-slate-50 cursor-pointer">
          <input type="checkbox" data-join-store="${st.id}" ${joinDraft.stores.includes(st.id) ? 'checked' : ''} class="rounded border-slate-300 text-primary-600">
          <span class="text-sm text-slate-800">${esc(st.name)}</span></label>`).join('')}
        ${formErrors.stores ? `<p class="text-[11px] font-medium text-rose-600">${formErrors.stores}</p>` : ''}
      </div>`)}
      <label class="flex items-start gap-2 text-sm text-slate-700">
        <input type="checkbox" data-join-agree ${joinDraft.agree ? 'checked' : ''} class="mt-0.5 rounded border-slate-300 text-primary-600">
        <span>I agree to fund ${c.merchantShare}% of the discount, deducted from my settlements for this campaign.</span>
      </label>
      ${formErrors.agree ? `<p class="text-[11px] font-medium text-rose-600 -mt-4">${formErrors.agree}</p>` : ''}
      <p class="text-xs text-slate-500">Your KAM reviews the request first, then ${esc(c.partner)} approves it.</p>`,
    footer: `
      <button data-action="close-drawer" class="${BTN_SECONDARY}">Cancel</button>
      <button data-action="submit-join" class="${BTN_PRIMARY}">${ic('send', 'w-4 h-4')}Send Request</button>`,
  });
}
