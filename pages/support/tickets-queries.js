// =====================================================================
// Tickets & Queries
// =====================================================================
function gtRows(s, withStatus = true) {
  const q = s.search.trim().toLowerCase();
  return GEN_TICKETS.filter(t =>
    inRange(t, s.range) && (s.stype === 'all' || t.type === s.stype) &&
    (!q || t.no.toLowerCase().includes(q) || t.title.toLowerCase().includes(q)) &&
    (!withStatus || s.status === 'all' || (s.status === 'open' ? ['Pending', 'Processing'].includes(t.status) : t.status === s.status)));
}

function renderGeneralTickets() {
  const s = pageState();
  const base = gtRows(applied(s), false);
  const rows = gtRows(applied(s));
  const { totalPages, start, pageRows } = paginate(s, rows);
  const firstReply = base.filter(t => t.messages.length > 1).map(t => (t.messages[1].at - t.date) / 3600e3);
  const statusOpts = [{ label: 'All Status', value: 'all' }, { label: 'Open (Pending + Processing)', value: 'open' }, ...Object.keys(GT_CLS).map(v => ({ label: v, value: v }))];
  const typeOpts = [{ label: 'All Issue Type', value: 'all' }, ...ISSUE_TYPES.map(v => ({ label: v, value: v }))];
  const cols = [
    { label: 'Created At', cell: t => dateCell(t.date) },
    { label: 'Resolved On', cls: 'hidden xl:table-cell', cell: t => t.resolvedAt ? dateCell(t.resolvedAt) : '<span class="text-slate-400">—</span>' },
    { label: 'Ticket No', cell: t => `<span class="font-mono text-xs text-slate-800">${t.no}</span>` },
    { label: 'Title', cell: t => `<div class="font-medium text-slate-800">${esc(t.title)}</div><div class="text-xs text-slate-500 lg:hidden">${t.type}</div>` },
    { label: 'Issue Type', cls: 'hidden lg:table-cell', cell: t => `<span class="text-xs text-slate-600">${t.type}</span>` },
    { label: 'Attachment', cell: t => t.attachment ? `<span class="inline-flex items-center gap-1 text-xs text-slate-600 max-w-[160px]" title="${esc(t.attachment)}">${ic('paperclip', 'w-3.5 h-3.5 shrink-0')}<span class="truncate">${esc(t.attachment)}</span></span>` : '<span class="text-slate-400">—</span>' },
    { label: 'Created By', cell: t => `<span class="font-mono text-xs text-slate-700">${esc(t.createdBy)}</span>` },
    { label: 'Status', cell: t => supBadge(GT_CLS, t.status) },
  ];
  return `
    <div class="space-y-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">Tickets & Queries</h1>
          <p class="text-slate-500 text-sm">General questions and requests — gateway, QR, EMI, payment links and account changes.</p>
        </div>
        <button data-action="new-gt" class="${BTN_PRIMARY} shrink-0">${ic('plus', 'w-4 h-4')}New Ticket</button>
      </div>
      <div class="flex flex-col">
        ${listFilterBar(s, 'Ticket No or Title',
          selectPill('list', 'status', 'Status', statusOpts, s.status) +
          selectPill('list', 'stype', 'Issue Type', typeOpts, s.stype))}
        <div class="flex flex-col gap-4 pt-4">
          <h2 class="text-sm font-semibold text-slate-900">Overview</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            ${metricCard({ title: 'Open', value: base.filter(t => ['Pending', 'Processing'].includes(t.status)).length, status: 'open', selected: s.applied.status === 'open' })}
            ${metricCard({ title: 'Completed', value: base.filter(t => t.status === 'Completed').length, status: 'Completed', selected: s.applied.status === 'Completed' })}
            ${metricCard({ title: 'Declined', value: base.filter(t => t.status === 'Declined').length, status: 'Declined', selected: s.applied.status === 'Declined' })}
            ${metricCard({ title: 'Avg. First Reply', value: firstReply.length ? hoursText(firstReply.reduce((a, b) => a + b, 0) / firstReply.length) : '—' })}
          </div>
        </div>
        <div class="space-y-4 pt-6">
          ${listToolbar(rows.length, 'tickets', applied(s))}
          ${dataTable({ cols, rows: pageRows, rowAttrs: t => `data-action="open-gt" data-value="${t.no}"`, emptyTitle: 'No tickets found' })}
          ${pager(s, rows.length, start, pageRows.length, totalPages)}
        </div>
      </div>
      ${kamCard()}
    </div>`;
}

function gtDrawer(t) {
  return drawerShell({
    wide: true,
    title: esc(t.title),
    sub: `<span class="font-mono text-xs">${t.no}</span>${supBadge(GT_CLS, t.status)}`,
    body: `
      ${section('Ticket', kvGrid([
        kv('Ticket No', t.no, true),
        kv('Title', esc(t.title)),
        kv('Issue Type', t.type),
        kv('Status', supBadge(GT_CLS, t.status)),
        ...(t.store ? [kv('Store', esc(STORES.find(st => st.id === t.store).name))] : []),
      ]))}
      ${section('Details', kvGrid([
        `<div class="col-span-2">${kv('Description', esc(t.description))}</div>`,
        kv('Remarks', esc(t.remarks)),
        kv('Attachment', t.attachment ? `<span class="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-slate-200 text-xs font-normal">${ic('paperclip', 'w-3.5 h-3.5')}${esc(t.attachment)}</span>` : '—'),
      ]))}
      ${section('Metadata', kvGrid([
        kv('Created By', t.createdBy, true),
        kv('Created At', `${fmtDate(t.date)}, ${fmtTime(t.date)}`),
        kv('Resolved By', t.resolvedBy || '—'),
        kv('Resolved On', t.resolvedAt ? `${fmtDate(t.resolvedAt)}, ${fmtTime(t.resolvedAt)}` : '—'),
      ]))}
      ${section('Conversation', thread('gt', t, ['Pending', 'Processing'].includes(t.status)))}`,
    footer: `<button data-action="close-drawer" class="${BTN_SECONDARY}">Close</button>`,
  });
}

function gtFormDrawer() {
  const d = ticketDraft;
  return drawerShell({
    title: 'New Ticket',
    sub: '<span>For questions about a specific payment, use Transaction Tickets</span>',
    body: `
      ${field('Title', `<input data-ticket="title" value="${esc(d.title)}" placeholder="Short summary" class="${INPUT}">`, { required: true, error: formErrors.title })}
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        ${field('Issue Type', `<select data-ticket="type" class="${INPUT}">${options([['', 'Select one'], ...ISSUE_TYPES.map(v => [v, v])], d.type)}</select>`, { required: true, error: formErrors.type })}
        ${field('Store', `<select data-ticket="store" class="${INPUT}">${options([['', 'All / not store-specific'], ...STORES.map(st => [st.id, st.name])], d.store)}</select>`)}
      </div>
      ${field('Description', `<textarea data-ticket="text" rows="5" class="${INPUT}" placeholder="What happened, and what do you need?">${esc(d.text)}</textarea>`, { required: true, error: formErrors.text })}
      ${field('Attachment', `<input type="file" data-ticket-file accept=".png,.jpg,.jpeg,.pdf" class="block w-full text-sm text-slate-600 file:mr-3 file:px-3 file:py-1.5 file:rounded file:border-0 file:bg-slate-100 file:text-slate-700 file:text-xs file:font-medium">`, { hint: d.attachment ? `Selected: ${esc(d.attachment)} — prototype keeps the file name only, nothing is uploaded.` : 'PNG, JPG or PDF. Prototype: nothing is uploaded.' })}`,
    footer: `
      <button data-action="close-drawer" class="${BTN_SECONDARY}">Cancel</button>
      <button data-action="save-gt" class="${BTN_PRIMARY}">${ic('send', 'w-4 h-4')}Submit Ticket</button>`,
  });
}
