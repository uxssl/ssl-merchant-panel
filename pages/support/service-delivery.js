// =====================================================================
// Service Delivery
// =====================================================================
const srOnTime = (r) => r.stage === 'Delivered' && r.stageAt[3] <= r.due;
function srDue(r) {
  if (r.stage === 'Delivered') return srOnTime(r) ? { text: 'Delivered on time', cls: 'text-emerald-600' } : { text: 'Delivered late', cls: 'text-rose-600' };
  if (r.stage === 'Cancelled') return { text: 'Cancelled', cls: 'text-slate-500' };
  const d = Math.ceil((r.due - NOW) / 864e5);
  return d < 0 ? { text: `${-d} day${d < -1 ? 's' : ''} overdue`, cls: 'text-rose-600' } : { text: d === 0 ? 'Due today' : `${d} day${d > 1 ? 's' : ''} left`, cls: d <= 1 ? 'text-amber-600' : 'text-slate-500' };
}
const srDots = (r) => `<div class="flex items-center gap-1" title="${r.stage}">${SERVICE_STAGES.map((_, i) => `<span class="w-2 h-2 rounded-full ${r.stageIndex >= i ? (r.stageIndex === 3 ? 'bg-emerald-500' : 'bg-primary-600') : 'bg-slate-200'}"></span>`).join('')}</div>`;

function srRows(s, withStatus = true) {
  const q = s.search.trim().toLowerCase();
  return SERVICE_REQUESTS.filter(r =>
    inStores(r.store) && (s.stype === 'all' || r.type === s.stype) && inRange(r, s.range) &&
    (!q || r.no.toLowerCase().includes(q) || r.type.toLowerCase().includes(q)) &&
    (!withStatus || s.status === 'all' || (s.status === 'open' ? ['Requested', 'Approved', 'In Progress'].includes(r.stage) : r.stage === s.status)));
}

function renderServiceDelivery() {
  const s = pageState();
  const base = srRows(applied(s), false);
  const rows = srRows(applied(s));
  const { totalPages, start, pageRows } = paginate(s, rows);
  const delivered = base.filter(r => r.stage === 'Delivered');
  const avgDays = delivered.length ? delivered.reduce((n, r) => n + (r.stageAt[3] - r.date) / 864e5, 0) / delivered.length : 0;
  const statusOpts = [{ label: 'All Status', value: 'all' }, { label: 'Open', value: 'open' }, ...Object.keys(SR_CLS).map(v => ({ label: v, value: v }))];
  const typeOpts = [{ label: 'All Services', value: 'all' }, ...SERVICE_TYPES.map(t => ({ label: t.v, value: t.v }))];
  const cols = [
    { label: 'Request No', cell: r => `<span class="font-mono text-xs text-slate-800">${r.no}</span>` },
    { label: 'Service', cell: r => `<div class="font-medium text-slate-800">${r.type}</div><div class="text-xs text-slate-500">${r.qty > 1 ? `Qty ${r.qty} · ` : ''}<span class="lg:hidden">${esc(r.storeName)}</span><span class="hidden lg:inline">${r.assignee}</span></div>` },
    { label: 'Store', cls: 'hidden lg:table-cell', cell: r => esc(r.storeName) },
    { label: 'Requested On', cls: 'hidden xl:table-cell', cell: r => dateCell(r.date) },
    { label: 'Due By', cell: r => { const d = srDue(r); return `<div class="whitespace-nowrap">${fmtDate(r.due)}</div><div class="text-xs font-medium ${d.cls}">${d.text}</div>`; } },
    { label: 'Progress', cell: r => `${srDots(r)}<div class="mt-1">${supBadge(SR_CLS, r.stage)}</div>` },
  ];
  return `
    <div class="space-y-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">Service Delivery</h1>
          <p class="text-slate-500 text-sm">Track service requests — QR standees, POS setup, store activation, integration help — against their delivery time.</p>
        </div>
        <button data-action="new-sr" class="${BTN_PRIMARY} shrink-0">${ic('plus', 'w-4 h-4')}Request Service</button>
      </div>
      <div class="flex flex-col">
        ${listFilterBar(s, 'Request No or Service',
          selectPill('list', 'status', 'Status', statusOpts, s.status) +
          selectPill('list', 'stype', 'Service', typeOpts, s.stype))}
        <div class="flex flex-col gap-4 pt-4">
          <h2 class="text-sm font-semibold text-slate-900">Overview</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            ${metricCard({ title: 'Open Requests', value: base.filter(r => ['Requested', 'Approved', 'In Progress'].includes(r.stage)).length, status: 'open', selected: s.applied.status === 'open' })}
            ${metricCard({ title: 'Delivered', value: delivered.length, status: 'Delivered', selected: s.applied.status === 'Delivered' })}
            ${metricCard({ title: 'On-time Delivery', value: delivered.length ? fmtPct(pct(delivered.filter(srOnTime).length, delivered.length)) : '—', sub: 'within the promised time' })}
            ${metricCard({ title: 'Avg. Delivery Time', value: delivered.length ? `${avgDays.toFixed(1)} days` : '—' })}
          </div>
        </div>
        <div class="space-y-4 pt-6">
          ${listToolbar(rows.length, 'requests', applied(s))}
          ${dataTable({ cols, rows: pageRows, rowAttrs: r => `data-action="open-sr" data-value="${r.no}"`, emptyTitle: 'No service requests found' })}
          ${pager(s, rows.length, start, pageRows.length, totalPages)}
        </div>
      </div>
      ${anCard('Promised Delivery Time', 'Working days from request (mock)', `<div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">${SERVICE_TYPES.map(t => statBox(t.v, `${t.sla} days`)).join('')}</div>`)}
    </div>`;
}

function srDrawer(r) {
  const d = srDue(r);
  const steps = r.stage === 'Cancelled'
    ? [{ label: 'Requested', at: r.date, tone: 'blue' }, { label: 'Request cancelled', note: 'Contact your KAM to request again', tone: 'rose' }]
    : SERVICE_STAGES.map((label, i) => r.stageIndex >= i
      ? { label: i === 3 ? `Delivered${srOnTime(r) ? '' : ' (late)'}` : label, at: r.stageAt[i], tone: i === 3 ? (srOnTime(r) ? 'emerald' : 'rose') : 'blue' }
      : { label, note: 'Pending', tone: 'slate' });
  const stars = (n) => [1, 2, 3, 4, 5].map(i => `<button data-action="rate-sr" data-value="${r.no}" data-rating="${i}" ${r.rating ? 'disabled' : ''} class="p-0.5 ${i <= (n || 0) ? 'text-amber-500' : 'text-slate-300'} ${r.rating ? '' : 'hover:text-amber-400'}" title="${i} star${i > 1 ? 's' : ''}">${ic('star', 'w-5 h-5')}</button>`).join('');
  return drawerShell({
    title: r.type,
    sub: `<span class="font-mono text-xs">${r.no}</span>${supBadge(SR_CLS, r.stage)}`,
    body: `
      <div class="grid grid-cols-3 gap-3">
        ${statBox('Promised', `${r.sla} days`)}
        ${statBox('Due By', fmtShort(r.due))}
        ${statBox('Status', `<span class="text-sm ${d.cls}">${d.text}</span>`)}
      </div>
      ${section('Request', kvGrid([
        kv('Request No', r.no, true),
        kv('Service', r.type),
        kv('Store', esc(r.storeName)),
        kv('Quantity', r.qty),
        kv('Requested On', `${fmtDate(r.date)}, ${fmtTime(r.date)}`),
        kv('Handled By', r.assignee),
        `<div class="col-span-2">${kv('Notes', r.notes ? esc(r.notes) : '—')}</div>`,
      ]))}
      ${section('Progress', timeline(steps))}
      ${r.stage === 'Delivered' ? section('Rate this service', `<div class="flex items-center gap-1">${stars(r.rating)}<span class="ml-2 text-xs text-slate-500">${r.rating ? `You rated ${r.rating} of 5` : 'How was the delivery?'}</span></div>`) : ''}`,
    footer: `
      ${['Requested', 'Approved'].includes(r.stage) ? `<button data-action="cancel-sr" data-value="${r.no}" class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-rose-600 bg-white border border-rose-200 rounded shadow-sm hover:bg-rose-50">${ic('x', 'w-4 h-4')}Cancel Request</button>` : ''}
      <button data-action="close-drawer" class="${BTN_SECONDARY}">Close</button>`,
  });
}

function srFormDrawer() {
  const d = ticketDraft;
  const sla = SERVICE_TYPES.find(t => t.v === d.type)?.sla;
  return drawerShell({
    title: 'Request Service',
    sub: '<span>Your KAM approves the request, then the team schedules it</span>',
    body: `
      ${field('Service', `<select data-ticket="type" data-rerender class="${INPUT}">${options([['', 'Select a service'], ...SERVICE_TYPES.map(t => [t.v, `${t.v} — ${t.sla} days`])], d.type)}</select>`, { required: true, error: formErrors.type })}
      ${field('Store', `<select data-ticket="store" class="${INPUT}">${options(STORES.map(st => [st.id, st.name]), d.store)}</select>`, { required: true })}
      ${['QR Standee Delivery', 'Branding Materials'].includes(d.type) ? field('Quantity', `<input data-ticket="qty" type="number" min="1" max="50" value="${esc(d.qty)}" class="${INPUT}">`, { error: formErrors.qty }) : ''}
      ${field('Notes', `<textarea data-ticket="text" rows="3" class="${INPUT}" placeholder="(optional) Contact person, preferred time…">${esc(d.text)}</textarea>`)}
      ${sla ? `<p class="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded px-3 py-2">Expected by <strong>${fmtDate(addDays(TODAY, sla))}</strong> (${sla} days, mock).</p>` : ''}`,
    footer: `
      <button data-action="close-drawer" class="${BTN_SECONDARY}">Cancel</button>
      <button data-action="save-sr" class="${BTN_PRIMARY}">${ic('send', 'w-4 h-4')}Submit Request</button>`,
  });
}
