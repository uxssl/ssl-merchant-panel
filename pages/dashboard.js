// =====================================================================
// Dashboard
// =====================================================================
const DASH_PRESETS = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: 'this_month', label: 'This Month' },
];

function dashData() {
  const { from, to } = presetRange(dash.preset);
  // "Today" compares with the same hours yesterday; other ranges with the same length just before.
  const span = to - from;
  const today = dash.preset === 'today';
  const prevFrom = today ? addDays(from, -1) : new Date(from.getTime() - span);
  const prevTo = today ? addDays(to, -1) : new Date(from.getTime() - 1);
  const inStore = (t) => inStores(t.store);
  const cur = TXNS.filter(t => inStore(t) && t.date >= from && t.date <= to);
  const prev = TXNS.filter(t => inStore(t) && t.date >= prevFrom && t.date <= prevTo);

  const summarize = (list) => {
    const success = list.filter(t => t.status === 'success');
    const sales = success.reduce((s, t) => s + t.amount, 0);
    return { total: list.length, success: success.length, sales, rate: list.length ? success.length / list.length * 100 : 0, avg: success.length ? sales / success.length : 0 };
  };

  const hourly = dash.preset === 'today';
  const buckets = [];
  if (hourly) {
    for (let h = 0; h <= NOW.getHours(); h++) buckets.push({ label: `${pad(h)}:00`, from: new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate(), h), to: new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate(), h, 59, 59, 999) });
  } else {
    for (let d = startOfDay(from); d <= to; d = addDays(d, 1)) buckets.push({ label: fmtShort(d), from: d, to: endOfDay(d) });
  }
  const series = buckets.map(b => ({ label: b.label, from: b.from, to: b.to, ...summarize(cur.filter(t => t.date >= b.from && t.date <= b.to)) }));

  const success = cur.filter(t => t.status === 'success');
  const channelTypes = [...new Set(METHODS.map(m => m.type))];
  // Shares by transaction count: the dashboard shows no taka amounts per channel.
  const channels = channelTypes.map(type => {
    const count = success.filter(t => t.type === type).length;
    return { name: type, count, share: count / (success.length || 1) * 100 };
  }).filter(c => c.count).sort((a, b) => b.count - a.count);

  const stl = SETTLEMENTS.filter(x => inStore(x));
  const pending = stl.filter(x => x.status === 'Pending');
  const pendingSettlement = pending.reduce((s, x) => s + x.settle, 0);
  const nextPayout = pending.length ? new Date(Math.min(...pending.map(x => x.date))) : null;
  const lastPaid = stl.find(x => x.status === 'Paid');
  const lastSettledAt = lastPaid?.date || null;
  const lastSettled = stl.filter(x => x.status === 'Paid' && +x.date === +lastSettledAt).reduce((s, x) => s + x.paid, 0);

  return { from, to, cur, now: summarize(cur), prev: summarize(prev), prevLabel: today ? 'vs same time yesterday' : 'vs previous period', series, channels, pendingSettlement, nextPayout, lastSettled, lastSettledAt };
}

// All dashboard cards share one surface, so radius, border and shadow stay consistent.
const DASH_CARD = 'bg-white rounded-xl border border-slate-200 shadow-sm';
const linkMore = (href, label) => `<a href="${href}" class="text-xs font-medium text-primary-600 hover:text-primary-700 inline-flex items-center gap-1 whitespace-nowrap">${label}${ic('arrow-right', 'w-3.5 h-3.5')}</a>`;

// `link` holds the attributes that make the card open its detail (an href or a data-action).
function statCard({ title, value, cur, prev, pp, empty, prevEmpty, vs = 'vs previous period', link }) {
  // Rates and averages can't be compared when either period has no payments.
  let delta = null;
  if (!empty && !prevEmpty) delta = pp ? cur - prev : prev ? (cur - prev) / prev * 100 : null;
  const up = delta !== null && delta >= 0;
  const text = empty ? 'No payments in this period yet' : delta === null ? 'No data to compare with' : `${up ? '+' : ''}${delta.toFixed(1)}${pp ? ' pts' : '%'} ${vs}`;
  const tag = link.includes('href=') ? 'a' : 'button';
  // Compact: the change pill sits beside the value; what it compares with is said once, in the Overview heading.
  const change = delta === null
    ? `<span class="text-[11px] text-slate-400 truncate">${text}</span>`
    : `<span title="${text}" class="shrink-0 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${up ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}">${ic(up ? 'trending-up' : 'trending-down', 'w-3 h-3')}${up ? '+' : ''}${delta.toFixed(1)}${pp ? ' pts' : '%'}</span>`;
  return `
    <${tag} ${link} class="text-left ${DASH_CARD} px-4 py-3.5 flex flex-col gap-1 hover:shadow-md hover:border-primary-200 transition-all">
      <p class="text-xs font-medium text-slate-500 truncate">${title}</p>
      <div class="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 min-w-0">
        <p class="text-lg sm:text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap">${value}</p>${change}
      </div>
    </${tag}>`;
}

const cardHead = (title, sub, right = '') => `
  <div class="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
    <div class="min-w-0"><h3 class="text-sm font-semibold text-slate-900">${title}</h3>${sub ? `<p class="text-xs text-slate-500 mt-0.5">${sub}</p>` : ''}</div>${right}
  </div>`;

// Dashboard cards use a tighter header than the shared cardHead (also used by the analytics pages).
const dashHead = (title, sub, right = '') => `
  <div class="px-4 py-2.5 border-b border-slate-100 flex items-start justify-between gap-3">
    <div class="min-w-0"><h3 class="text-sm font-semibold text-slate-900">${title}</h3>${sub ? `<p class="text-xs text-slate-500">${sub}</p>` : ''}</div>${right}
  </div>`;

// Merchant app download QR — a real, scannable code with the SSLCOMMERZ logo in the middle.
// TODO: set MERCHANT_APP_URL to the merchant app's store link; until then it opens sslcommerz.com.
const MERCHANT_APP_URL = 'https://sslcommerz.com';
function appQr(cls) {
  if (!window.qrcode) return '';
  const qr = qrcode(0, 'H'); // high error correction, so the logo can cover the centre
  qr.addData(MERCHANT_APP_URL);
  qr.make();
  const n = qr.getModuleCount();
  let path = '';
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (qr.isDark(y, x)) path += `M${x} ${y}h1v1h-1z`;
  const lw = n * 0.5, lh = lw * 45 / 234; // logo keeps its 234×45 shape
  return `
    <svg viewBox="-2 -2 ${n + 4} ${n + 4}" class="${cls}" shape-rendering="crispEdges" role="img" aria-label="QR code to download the SSLCOMMERZ Merchant App">
      <rect x="-2" y="-2" width="${n + 4}" height="${n + 4}" fill="#fff"/>
      <path d="${path}" fill="#000"/>
      <rect x="${(n - lw) / 2 - 0.6}" y="${(n - lh) / 2 - 0.6}" width="${lw + 1.2}" height="${lh + 1.2}" fill="#fff"/>
      <image href="${LOGO}" x="${(n - lw) / 2}" y="${(n - lh) / 2}" width="${lw}" height="${lh}"/>
    </svg>`;
}

// The dashboard QR is small to keep the contacts strip compact; this shows it large enough to scan.
function appQrDrawer() {
  return drawerShell({
    title: 'SSLCOMMERZ Merchant App',
    sub: '<span>Scan with your phone camera to download</span>',
    body: `
      <div class="flex flex-col items-center gap-4 py-4 text-center">
        <div class="p-3 rounded-2xl border border-slate-200 bg-white shadow-sm">${appQr('w-64 h-64')}</div>
        <p class="text-sm text-slate-600 max-w-xs">Manage your stores, check payments and settlements, and get alerts on the go.</p>
        <a href="${MERCHANT_APP_URL}" target="_blank" rel="noopener" class="text-sm font-medium text-primary-600 hover:underline inline-flex items-center gap-1">Or open the download page${ic('external-link', 'w-3.5 h-3.5')}</a>
      </div>`,
    footer: `<button data-action="close-drawer" class="${BTN_SECONDARY}">Close</button>`,
  });
}

function contactsDrawer() {
  const k = SUPPORT_CONTACTS.kam;
  const group = (n, title, icon, text, rows) => section(`${n}. ${title}`, `
    <p class="text-sm text-slate-500 -mt-1 mb-3 flex items-start gap-2">${ic(icon, 'w-5 h-5 mt-0.5 shrink-0 portal-icon-muted')}${text}</p>
    ${kvGrid(rows.map(([label, value]) => kv(label, value)))}`);
  return drawerShell({
    title: 'Key Contact Details',
    sub: '<span>Who to contact for what</span>',
    body: [
      group(1, 'Key Account Manager', 'user-round', 'For any query related to new or existing business, campaigns, enabling new features, products, SMS, new stores, etc.',
        [['Name', `<span class="inline-flex items-center gap-2.5"><img src="${k.photo}" alt="Photo of ${esc(k.name)}" class="w-9 h-9 rounded-full object-cover">${esc(k.name)}</span>`], ['Contact No', `<a href="tel:${k.phone.replace(/[^\d+]/g, '')}" class="text-primary-600 hover:underline">${k.phone}</a>`], ['Email Address', `<a href="mailto:${k.email}" class="text-primary-600 hover:underline">${k.email}</a>`]]),
      ...SUPPORT_CONTACTS.teams.map((t, i) => group(i + 2, t.title, t.icon, t.text,
        t.rows.map(([label, value]) => [label, value.includes('@') ? `<a href="mailto:${value}" class="text-primary-600 hover:underline">${value}</a>` : value]))),
    ].join(''),
    footer: `<button data-action="close-drawer" class="${BTN_SECONDARY}">Close</button>`,
  });
}

function renderDashboard() {
  const d = dashData();
  const k = SUPPORT_CONTACTS.kam;
  const ops = SUPPORT_CONTACTS.teams.find(t => t.title === 'Operations Team');
  const opsRow = (label) => ops.rows.find(r => r[0] === label)[1];
  const activeStores = ACCOUNT_STORES.filter(st => st.status === 'Active').length;

  const escrowHeld = pendingDeliverables().length;
  const attention = [
    // Escrow money stays held until delivery is confirmed, so it leads the list while any is waiting.
    { icon: 'wallet', tone: 'text-amber-700 bg-amber-100', title: 'Escrow hold transactions', sub: 'Funds currently on hold before release or settlement', value: escrowHeld, action: `data-action="go" data-value="${ESCROW_HOLD_PATH}"`, priority: escrowHeld > 0 },
    // Failed and pending payments stay off the dashboard: they resolve on their own and only alarm merchants.
    // Both remain one filter away on the transaction list.
    { icon: 'undo-2', tone: 'text-indigo-600 bg-indigo-50', title: 'Refund requests', sub: 'Open, in review or with the bank', value: REFUNDS.filter(r => REFUND_OPEN.has(r.status)).length, action: `data-action="goto-list" data-path="${REFUND_PATH}" data-status="pending"` },
    { icon: 'shield-alert', tone: 'text-slate-600 bg-slate-100', title: 'Chargebacks to respond', sub: 'Waiting for your evidence', value: CHARGEBACKS.filter(c => CB_OPEN.has(c.status)).length, action: `data-action="goto-list" data-path="${CB_PATH}" data-status="action"` },
  ];
  // Bounced payouts stay listed until the bank details are fixed, so count them across all time.
  const bouncedSettlements = SETTLEMENTS.filter(x => x.status === 'Bounced' && inStores(x.store)).length;
  attention.splice(1, 0, { icon: 'undo-2', tone: 'text-orange-700 bg-orange-50', title: 'Bounced settlements', sub: 'Returned by the bank', value: bouncedSettlements, action: `data-action="goto-list" data-path="${SETTLEMENT_PATH}" data-status="Bounced"` });
  const toReview = attention.reduce((s, a) => s + a.value, 0);
  const offers = svcOffers().length;
  // Shortcuts to the screens merchants open most; Refund Request opens its create form straight away.
  const quick = [
    { icon: 'banknote', label: 'Settlement', hint: 'Day-by-day payouts to your bank account', action: 'data-action="go" data-value="/settlements"', featured: true },
    { icon: 'credit-card', label: 'Transactions', hint: 'Search all payments across your stores', action: 'data-action="go" data-value="/transactions/all"' },
    { icon: 'undo-2', label: 'Refund Request', hint: 'Start a refund for a transaction', action: 'data-action="new-refund"' },
    { icon: 'wallet', label: 'Escrow Hold Transactions', hint: 'Payments held until delivery is confirmed', action: `data-action="go" data-value="${ESCROW_HOLD_PATH}"` },
  ];
  // Contact row: who, then the phone number and email written out as links.
  const contactLink = (icon, value, href) => `
    <a href="${href}" title="${value}" class="flex items-center gap-2 min-w-0 text-xs text-slate-600 hover:text-primary-700 hover:underline">${ic(icon, 'w-3.5 h-3.5 text-primary-500 shrink-0')}<span class="truncate">${value}</span></a>`;
  const contactRow = ({ role, avatar, name, phone, email }) => `
    <div class="flex items-center gap-3.5 px-5 py-3.5 min-w-0">
      ${avatar}
      <div class="flex-1 min-w-0">
        <p class="text-[10px] font-semibold uppercase tracking-wider text-primary-600">${role}</p>
        <p class="text-sm font-semibold text-slate-900 truncate">${name}</p>
        <div class="mt-1.5 flex flex-col gap-1">
          ${contactLink('phone', phone, `tel:${phone.replace(/[^\d+]/g, '')}`)}
          ${contactLink('mail', email, `mailto:${email}`)}
        </div>
      </div>
    </div>`;

  return `
    <div class="space-y-4">
      <!-- One header line; section titles and helper subtitles are left out to keep the page quiet. -->
      <div class="flex items-center justify-between gap-x-4 gap-y-2 flex-wrap">
        <h1 class="text-2xl font-bold text-slate-900">Dashboard</h1>
        <div class="flex items-center gap-3 flex-wrap">
          <p class="inline-flex items-center gap-1.5 text-xs text-slate-500" title="Changes compare ${d.prevLabel.replace('vs ', 'with the ')}">${ic('calendar', 'w-3.5 h-3.5')}${fmtDate(d.from)}, ${fmtHM(d.from)} – ${fmtDate(d.to)}, ${fmtHM(d.to)}</p>
          <div class="inline-flex p-1 bg-white border border-slate-200 rounded-full shadow-sm">
            ${DASH_PRESETS.map(p => `<button data-action="dash-preset" data-value="${p.value}" class="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${dash.preset === p.value ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}">${p.label}</button>`).join('')}
          </div>
        </div>
      </div>

      <!-- Who to reach, as one compact strip: KAM, Operations and the app side by side.
           What each one handles stays one click away under All contacts. -->
      <section aria-label="Your contacts">
        <div class="${DASH_CARD} grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)_auto] divide-y md:divide-y-0 lg:divide-x divide-slate-100">
          ${contactRow({ role: 'Key Account Manager', avatar: `<img src="${k.photo}" alt="Photo of ${esc(k.name)}, your Key Account Manager" class="w-12 h-12 rounded-full object-cover ring-4 ring-primary-50 shrink-0">`, name: esc(k.name), phone: k.phone, email: k.email })}
          ${contactRow({ role: 'Operations Team', avatar: `<span class="w-12 h-12 rounded-full bg-primary-100 ring-4 ring-primary-50 flex items-center justify-center shrink-0">${ic(ops.icon, 'w-5 h-5 text-primary-700')}</span>`, name: 'Operations Desk', phone: opsRow('Telephone No'), email: opsRow('Email Address') })}
          <!-- Click opens the QR at full size, so it scans easily from a phone. -->
          <button data-action="open-app-qr" class="group flex items-center gap-3.5 px-5 py-3 min-w-0 text-left md:col-span-2 lg:col-span-1 md:border-t lg:border-t-0 border-slate-100 hover:bg-primary-50/40 transition-colors">
            <span class="p-1 rounded-lg border border-slate-200 bg-white shrink-0 group-hover:border-primary-300 transition-colors">${appQr('w-16 h-16 block')}</span>
            <span class="min-w-0">
              <span class="block text-[10px] font-semibold uppercase tracking-wider text-primary-600">Merchant App</span>
              <span class="block text-sm font-semibold text-slate-900">Scan to download</span>
              <span class="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-600 group-hover:text-primary-700">${ic('maximize-2', 'w-3.5 h-3.5 text-primary-500')}Enlarge QR</span>
            </span>
          </button>
          <button data-action="open-contacts" class="md:col-span-2 lg:col-span-1 flex lg:flex-col items-center justify-center gap-1.5 px-5 py-2.5 lg:w-28 text-xs font-medium text-primary-700 bg-slate-50/80 hover:bg-primary-50 md:border-t lg:border-t-0 border-slate-100 rounded-b-xl lg:rounded-bl-none lg:rounded-r-xl transition-colors whitespace-nowrap focus-visible:outline-offset-[-2px]">
            <span class="w-8 h-8 rounded-full bg-white border border-slate-200 hidden lg:flex items-center justify-center">${ic('users', 'w-4 h-4 text-primary-600')}</span>
            <span class="inline-flex items-center gap-1">All contacts${ic('arrow-right', 'w-3.5 h-3.5')}</span>
          </button>
        </div>
      </section>

      <!-- Performance first: the numbers, then the trend beside what needs action. -->
      <section aria-label="Overview">
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          ${statCard({ title: 'Successful Payment Value', value: fmtBDTShort(d.now.sales), cur: d.now.sales, prev: d.prev.sales, vs: d.prevLabel, empty: !d.now.total, prevEmpty: !d.prev.total, link: 'href="#/analytics/business-analytics"' })}
          ${statCard({ title: 'Successful Transactions', value: d.now.success.toLocaleString(), cur: d.now.success, prev: d.prev.success, vs: d.prevLabel, empty: !d.now.total, prevEmpty: !d.prev.total, link: 'data-action="goto-txn" data-status="success"' })}
          ${statCard({ title: 'Success Rate', value: d.now.total ? `${d.now.rate.toFixed(1)}%` : '—', cur: d.now.rate, prev: d.prev.rate, pp: true, empty: !d.now.total, prevEmpty: !d.prev.total, vs: d.prevLabel, link: 'data-action="goto-txn" data-status="all"' })}
          ${statCard({ title: 'Avg. Ticket Size', value: d.now.success ? fmtBDT(d.now.avg) : '—', cur: d.now.avg, prev: d.prev.avg, empty: !d.now.success, prevEmpty: !d.prev.success, vs: d.prevLabel, link: 'href="#/analytics/business-analytics"' })}
        </div>
      </section>

      <!-- Quick actions as one strip of buttons rather than a card. -->
      <nav aria-label="Quick actions" class="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
        ${quick.map(q => `
          <button ${q.action} title="${q.hint}" class="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs sm:text-sm font-medium shadow-sm transition-colors ${q.featured ? 'bg-primary-600 border-primary-600 text-white hover:bg-primary-700' : 'bg-white border-slate-200 text-slate-700 hover:border-primary-300 hover:text-primary-700'}">
            ${ic(q.icon, `w-4 h-4 shrink-0 ${q.featured ? '' : 'portal-icon-muted'}`)}${q.label}
          </button>`).join('')}
        ${offers ? `
          <!-- Self-service activation opens only from here; it never pops up on its own. -->
          <button data-action="svc-open" title="Services your stores qualify for — activate them yourself" aria-label="Activate Services, ${offers} available" class="inline-flex items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-left text-xs sm:text-sm font-medium text-primary-700 shadow-sm transition-colors hover:border-primary-300 hover:bg-primary-100 sm:ml-auto">
            ${ic('package-plus', 'w-4 h-4 shrink-0')}Activate Services<span class="min-w-5 h-5 px-1.5 rounded-full bg-primary-600 text-white text-[11px] font-semibold inline-flex items-center justify-center">${offers}</span>
          </button>` : ''}
      </nav>

      <!-- The chart's canvas sits absolutely, so Needs Attention sets the row height and the chart fills it.
           On phones Needs Attention comes first. -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div class="${DASH_CARD} lg:col-span-2 flex flex-col min-w-0">
          ${dashHead('Successful Payments')}
          <div class="px-4 py-3 flex-1 min-h-64 flex flex-col"><div class="relative flex-1"><canvas id="chart-sales" class="absolute inset-0"></canvas></div></div>
        </div>

        <div class="${DASH_CARD} order-first lg:order-none min-w-0 flex flex-col">
          ${dashHead('Needs Attention', '', `<span class="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${toReview ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}">${toReview ? `${toReview} to review` : 'All clear'}</span>`)}
          <div class="flex-1 flex flex-col divide-y divide-slate-100">
            ${attention.map(a => `
              <button ${a.action} title="${a.sub}" class="flex-1 w-full flex items-center gap-2.5 px-4 py-2.5 text-left last:rounded-b-xl transition-colors ${a.priority ? 'bg-amber-50/70 hover:bg-amber-50' : 'hover:bg-slate-50'}">
                <span class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${a.tone}">${ic(a.icon, 'w-4 h-4')}</span>
                <span class="flex-1 min-w-0"><span class="flex flex-wrap items-center gap-x-2 gap-y-0.5"><span class="text-sm font-semibold text-slate-900">${a.title}</span>${a.priority ? '<span class="rounded-full px-2 py-px text-[10px] font-semibold bg-amber-100 text-amber-800">Priority</span>' : ''}</span></span>
                <span class="min-w-[2rem] text-right text-sm font-bold tabular-nums ${a.value ? 'text-slate-900' : 'text-slate-300'}">${a.value}</span>${ic('chevron-right', 'w-4 h-4 text-slate-300 shrink-0')}
              </button>`).join('')}
          </div>
        </div>
      </div>

      <!-- Supporting detail in one row: channels and money on its way. -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="${DASH_CARD} flex flex-col min-w-0">
          ${dashHead('Payment Channels', '', linkMore('#/analytics/market-share', 'Details'))}
          <!-- Same donut and channel colours as Market Share, so a channel reads the same everywhere. -->
          <div class="px-5 py-4 flex-1 flex items-center">
            ${d.channels.length ? donut('chart-channels', d.channels, CHANNELS, { sub: c => `${c.count.toLocaleString()} txns`, bars: true }) : '<p class="text-sm text-slate-500">No successful payments in this period yet.</p>'}
          </div>
        </div>

        <div class="${DASH_CARD} flex flex-col min-w-0">
          ${dashHead('Settlement', '', linkMore('#/analytics/settlement-report', 'Report'))}
          <div class="p-3 flex-1 flex flex-col gap-2">
            <div class="flex-1 flex flex-col justify-center rounded-lg bg-primary-50/60 border border-primary-100 px-4 py-3">
              <p class="text-xs font-semibold text-primary-700">Pending Settlement</p>
              <p class="text-2xl font-bold tracking-tight text-slate-900 my-0.5">${fmtBDT(d.pendingSettlement)}</p>
              <p class="text-xs text-slate-500 inline-flex items-center gap-1.5">${ic('calendar-clock', 'w-3.5 h-3.5')}Next payout: ${d.nextPayout ? `${fmtDate(d.nextPayout)}, ${fmtTime(d.nextPayout)}` : '—'} (est.)</p>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div class="px-3 py-1.5 rounded-lg border border-slate-200"><p class="text-[11px] font-medium text-slate-500">Last Settled</p><p class="text-sm font-bold text-slate-900">${fmtBDTShort(d.lastSettled)}</p><p class="text-[11px] text-slate-400 mt-0.5">${d.lastSettledAt ? `${fmtShort(d.lastSettledAt)}, ${fmtTime(d.lastSettledAt)}` : '—'}</p></div>
              <div class="px-3 py-1.5 rounded-lg border border-slate-200"><p class="text-[11px] font-medium text-slate-500">Settlement Account</p><p class="text-sm font-bold text-slate-900 font-mono whitespace-nowrap">A/C •••• ••••</p></div>
            </div>
          </div>
          <a href="#/account/store-list" class="flex items-center gap-2.5 px-4 py-2 border-t border-slate-100 hover:bg-slate-50 rounded-b-xl transition-colors">
            ${ic('store', 'w-4 h-4 portal-icon-muted shrink-0')}
            <span class="flex-1 min-w-0 text-xs text-slate-500"><span class="font-semibold text-slate-900">Stores</span> · ${ACCOUNT_STORES.length} total · <span class="text-emerald-600 font-medium">${activeStores} active</span> · ${ACCOUNT_STORES.length - activeStores} inactive</span>
            ${ic('chevron-right', 'w-4 h-4 text-slate-300')}
          </a>
        </div>
      </div>
    </div>`;
}

function mountDashboardCharts() {
  if (!window.Chart) return;
  const d = dashData();
  setChartDefaults();
  const grid = { color: '#f1f5f9' };
  charts.push(new Chart($('#chart-sales'), {
    data: {
      labels: d.series.map(x => x.label),
      // Combo: successful amount as bars (left axis), successful count as a line (right axis).
      datasets: [
        { type: 'bar', label: 'Successful Amount (BDT)', data: d.series.map(x => x.sales), yAxisID: 'y', backgroundColor: '#c1d2eb', hoverBackgroundColor: '#99b5df', borderRadius: 4, maxBarThickness: 36, order: 1 },
        { type: 'line', label: 'Successful Transactions (count)', data: d.series.map(x => x.success), yAxisID: 'y1', borderColor: '#295cab', backgroundColor: '#fff', borderWidth: 3, pointRadius: 4, pointHoverRadius: 6, pointBorderWidth: 2, tension: 0.25, order: 0 },
      ],
    },
    options: {
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      // Clicking a day (or hour) opens its successful transactions.
      onClick: (_, els) => {
        const b = els.length && d.series[els[0].index];
        if (!b) return;
        const s = txnState('all');
        Object.assign(s, { search: '', status: 'success', method: 'all', range: { preset: 'custom', from: b.from, to: b.to } });
        commitFilters(s);
        location.hash = '#/transactions/all';
      },
      onHover: (e, els) => { e.native.target.style.cursor = els.length ? 'pointer' : 'default'; },
      plugins: {
        legend: { display: true, position: 'top', align: 'start', labels: { boxWidth: 12, boxHeight: 8, sort: (a, b) => a.datasetIndex - b.datasetIndex } },
        tooltip: { callbacks: { label: (c) => c.dataset.yAxisID === 'y' ? ` ${fmtBDT(c.raw)} successful amount` : ` ${c.raw} successful of ${d.series[c.dataIndex].total} transactions` } },
      },
      scales: {
        x: { grid: { display: false } },
        y: { grid, beginAtZero: true, grace: '8%', title: { display: true, text: 'Amount (BDT)' }, ticks: { callback: (v) => v >= 1e5 ? `${v / 1e5}L` : v >= 1e3 ? `${v / 1e3}k` : v } },
        y1: { position: 'right', beginAtZero: true, grace: '8%', grid: { display: false }, title: { display: true, text: 'Transactions' }, ticks: { precision: 0 } },
      },
    },
  }));
}
