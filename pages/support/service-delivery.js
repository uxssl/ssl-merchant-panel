// =====================================================================
// Service Delivery — old panel: escrow payments are held until the merchant confirms delivery.
// "Get Deliverables" downloads the pending list; the merchant fills in the delivery columns
// and sends it back with "Upload Delivery File". Each upload is listed with what matched.
// =====================================================================
const DELIVERY_COLUMNS = ['SL', 'Transaction ID', 'Transaction Date', 'SSL Bank ID', 'Store ID', 'Invoice ID', 'Delivery Company Code', 'Delivery Date', 'Delivery Ref ID', 'Delivered to Name', 'Delivered to Phone', 'Delivered to Email', 'Remarks'];
const DELIVERY_REQUIRED = ['SSL Bank ID', 'Store ID', 'Delivery Company Code', 'Delivery Date', 'Delivered to Phone'];
const DELIVERY_NOTES = [
  'Per file transaction upload limit <strong>1000</strong>.',
  `${DELIVERY_REQUIRED.join(', ')} are required.`,
  '<strong>Delivery Date</strong> must be Y-m-d, like 2021-07-07, and <strong>Delivered to Phone</strong> must be a valid number, like 88017XXXXXXXX or 017XXXXXXXX.',
];
const pendingDeliverables = () => TXNS.filter(t => t.escrow && !t.delivered && inStores(t.store));
let deliveryDraft = null;

function deliveryRows(s) {
  return DELIVERY_FILES.filter(f => inRange({ date: f.uploaded }, s.range)).sort((a, b) => b.uploaded - a.uploaded);
}

function renderServiceDelivery() {
  const s = pageState();
  const rows = deliveryRows(applied(s));
  const { totalPages, start, pageRows } = paginate(s, rows);
  const pending = pendingDeliverables();
  const held = pending.reduce((n, t) => n + t.amount, 0);
  const cols = [
    { label: 'File Name', cell: f => `<span class="inline-flex items-center gap-1.5 font-mono text-xs text-slate-800 break-all">${ic('file-spreadsheet', 'w-4 h-4 text-slate-400 shrink-0')}${esc(f.name)}</span>` },
    { label: 'Upload Date', cell: f => dateCell(f.uploaded) },
    { label: 'Total Rows', right: true, cell: f => f.rows.toLocaleString() },
    { label: 'Trans Found', right: true, cell: f => f.found.toLocaleString() },
    { label: 'Trans Amt', right: true, cell: f => `<span class="font-semibold text-slate-900 whitespace-nowrap">${fmtAmt(f.amount)}</span>` },
    { label: 'Status', cell: f => `<span class="${STATUS_BADGE} ${f.status === 'Success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}">${f.status}</span>` },
  ];
  return `
    <div class="space-y-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">Service Delivery</h1>
          <p class="text-slate-500 text-sm">Confirm delivery for escrow payments so they can be settled.</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button data-action="get-deliverables" class="${BTN_SECONDARY}">${ic('download', 'w-4 h-4')}Get Deliverables</button>
          <button data-action="upload-delivery" class="${BTN_PRIMARY}">${ic('circle-plus', 'w-4 h-4')}Upload Delivery File</button>
        </div>
      </div>
      ${alertSnoozed('escrow-delivery') ? '' : `<div class="flex items-center gap-3 rounded-xl border border-lime-200 bg-lime-50 px-4 py-3">
        <span class="w-8 h-8 rounded-full bg-white text-lime-700 flex items-center justify-center shrink-0 ring-1 ring-lime-200">${ic('package-check', 'w-4 h-4')}</span>
        <div class="flex-1 min-w-0 text-sm">
          <p class="font-semibold text-lime-900">${pending.length ? `${pending.length} escrow payment${pending.length > 1 ? 's' : ''} (${fmtBDT(held)}) waiting for delivery confirmation` : 'No escrow payment is waiting for delivery confirmation'}</p>
          <p class="text-xs text-lime-800 mt-0.5">Get Deliverables downloads them as a file. Fill in the delivery columns, then upload it.</p>
        </div>
        <span class="flex text-lime-800">${alertClose('escrow-delivery')}</span>
      </div>`}
      <div class="flex flex-col">
        <div class="filter-bar-container flex items-center gap-3 flex-wrap">
          ${dtPill(s.range, s.defaultPreset)}
          ${filterActions(s)}
        </div>
        <div class="space-y-4 pt-6">
          <h2 class="text-sm font-semibold text-slate-900">Delivery File List <span class="ml-1 text-xs font-normal text-slate-500">${rows.length} row${rows.length === 1 ? '' : 's'}</span></h2>
          ${dataTable({ cols, rows: pageRows, rowAttrs: () => '', emptyTitle: 'No delivery file uploaded in this period' })}
          ${pager(s, rows.length, start, pageRows.length, totalPages)}
        </div>
      </div>
    </div>`;
}

function deliveryUploadDrawer() {
  const d = deliveryDraft;
  return drawerShell({
    title: 'Service Delivery File Upload',
    sub: '<span>Upload the deliverables file with the delivery columns filled in</span>',
    body: `
      ${field('Upload Delivery File', `<input id="delivery-file" type="file" accept=".csv,text/csv" class="block w-full text-sm text-slate-600 file:mr-3 file:px-3 file:py-1.5 file:rounded file:border file:border-slate-200 file:bg-white file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-50">`, { required: true, error: formErrors.file, hint: d.file ? `Selected: ${esc(d.file.name)}` : 'CSV, with the same columns as the Get Deliverables file.' })}
      <ul class="space-y-1.5 text-xs text-slate-600 list-disc pl-5">${DELIVERY_NOTES.map(n => `<li>${n}</li>`).join('')}</ul>`,
    footer: `
      <button data-action="close-drawer" class="${BTN_SECONDARY}">Close</button>
      <button data-action="save-delivery" class="${BTN_PRIMARY}">${ic('upload', 'w-4 h-4')}Upload</button>`,
  });
}

// Reads the uploaded CSV, checks the required columns and formats, and marks matching escrow payments delivered.
function processDeliveryFile(name, text) {
  const parse = (line) => { const out = []; let cur = '', q = false; for (const ch of line) { if (ch === '"') q = !q; else if (ch === ',' && !q) { out.push(cur.trim()); cur = ''; } else cur += ch; } out.push(cur.trim()); return out; };
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { error: 'The file has no rows.' };
  const head = parse(lines[0]);
  const col = (h) => head.indexOf(h);
  const missing = DELIVERY_REQUIRED.filter(h => col(h) < 0);
  if (missing.length) return { error: `Missing column${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}.` };
  const rows = lines.slice(1).map(parse);
  if (rows.length > 1000) return { error: 'One file can have at most 1000 transactions.' };
  let found = 0, amount = 0;
  rows.forEach((r, i) => {
    const bad = DELIVERY_REQUIRED.find(h => !r[col(h)]) ||
      (!/^\d{4}-\d{2}-\d{2}$/.test(r[col('Delivery Date')]) && 'Delivery Date') ||
      (!/^(88)?01[3-9]\d{8}$/.test(r[col('Delivered to Phone')]) && 'Delivered to Phone');
    if (bad) return;
    const t = TXNS.find(x => x.escrow && !x.delivered && x.bankTranId === r[col('SSL Bank ID')] && x.store === r[col('Store ID')]);
    if (t) { t.delivered = true; t.escrow = false; found++; amount += t.amount; }
  });
  const file = { name, uploaded: new Date(NOW), rows: rows.length, found, amount, status: found ? 'Success' : 'Failed' };
  DELIVERY_FILES.unshift(file);
  return file;
}
