// =====================================================================
// Shared list-page pieces (Refund & Chargeback Requests)
// =====================================================================
const TRACKING_PATH = '/transactions/tracking';
const REFUND_PATH = '/transactions/refund-requests';
const CB_PATH = '/transactions/chargeback-requests';

const dateCell = (d) => `<div class="text-slate-800 font-medium whitespace-nowrap">${fmtDate(d)}</div><div class="text-xs text-slate-500">${fmtTime(d, true)}</div>`;
const idCell = (id, sub) => `
  <div class="flex items-center gap-1.5"><span class="font-mono text-xs text-slate-800">${id}</span><button data-action="copy" data-value="${id}" class="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100" title="Copy">${ic('copy', 'w-3.5 h-3.5')}</button></div>
  ${sub ? `<div class="text-[11px] text-slate-500 font-mono">${sub}</div>` : ''}`;

function paginate(s, rows) {
  const totalPages = Math.max(1, Math.ceil(rows.length / s.pageSize));
  s.page = Math.min(s.page, totalPages);
  const start = (s.page - 1) * s.pageSize;
  return { totalPages, start, pageRows: rows.slice(start, start + s.pageSize) };
}

const LIST_FILTER_KEYS = ['status', 'stage', 'stype', 'bstatus', 'bank', 'currency', 'emi', 'role', 'ref', 'issuer'];
const TEXT_FILTER_KEYS = ['last4', 'holder', 'refId', 'mref', 'card'];
// Same order as the KAM report filters: text filter, date, pills, then Apply Filters / Clear.
// fields: [[key, placeholder]] extra text filters shown after the main search.
function listFilterBar(s, placeholder, pills, { noDate = false, noStore = false, fields = [] } = {}) {
  return `
    <div class="filter-bar-container flex items-center gap-3 flex-wrap">
      ${filterSearch('list-search', placeholder, s.search)}
      ${fields.map(([key, label]) => filterText(key, label, s[key])).join('')}
      ${noDate ? '' : dtPill(s.range, s.defaultPreset)}
      ${pills}
      ${noStore ? '' : storePill('list', 'Store')}
      ${filterActions(s)}
    </div>`;
}

function listToolbar(count, noun, s) {
  return `
    <div class="data-table-toolbar flex flex-wrap items-center justify-between gap-3">
      <p class="text-sm text-slate-500"><span class="font-semibold text-slate-900">${count.toLocaleString()}</span> ${noun} · ${ic(s.range.daily ? 'repeat' : 'calendar-clock', 'w-3.5 h-3.5 inline -mt-0.5')} ${rangeDetail(s.range)}</p>
      <button data-action="export" class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors shadow-sm shrink-0">${ic('download', 'w-4 h-4')}Export CSV</button>
    </div>`;
}

// Same look as the transactions table; no horizontal scroll (low-priority columns hide on narrow screens).
function emptyBlock(title, hint = 'Try a wider date &amp; time range or clear some filters.') {
  return `
    <div class="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div class="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-4">${ic('search', 'w-6 h-6 text-slate-300')}</div>
      <h3 class="text-sm font-semibold text-slate-900 mb-1">${title}</h3>
      <p class="text-xs text-slate-500">${hint}</p>
    </div>`;
}

// Phones get one card per row instead of a squeezed table: first column as the title, the rest as label / value pairs.
function cardList(cols, rows, rowAttrs, cellOf) {
  return `
    <div class="md:hidden divide-y divide-slate-100">
      ${rows.map(r => `
        <div ${rowAttrs(r)} class="px-4 py-3 ${rowAttrs(r) ? 'hover:bg-slate-50 cursor-pointer' : ''}">
          <div class="flex items-start justify-between gap-3"><div class="min-w-0 text-sm text-slate-800">${cellOf(cols[0], r)}</div>${rowAttrs(r) ? ic('chevron-right', 'w-4 h-4 text-slate-300 shrink-0 mt-0.5') : ''}</div>
          <dl class="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            ${cols.slice(1).map(c => `<div class="min-w-0"><dt class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">${c.label}</dt><dd class="text-slate-700 break-words">${cellOf(c, r)}</dd></div>`).join('')}
          </dl>
        </div>`).join('')}
    </div>`;
}

// menus: rows hold dropdown menus, so the table must not clip them.
// serial: the row number of the first row, to show the old panel's "#" column.
function dataTable({ cols, rows, rowAttrs, emptyTitle, emptyHint, menus = false, serial }) {
  if (serial !== undefined) cols = [{ label: '#', cls: 'hidden md:table-cell w-10 text-slate-400', num: true }, ...cols];
  const cellCls = (c) => `${c.right ? 'text-right' : ''} ${c.cls || ''}`;
  if (!rows.length) return `<div class="rounded-md border border-slate-200 bg-white shadow-sm">${emptyBlock(emptyTitle, emptyHint)}</div>`;
  return `
    <div class="rounded-md border border-slate-200 bg-white shadow-sm ${menus ? '' : 'overflow-hidden'}">
      ${cardList(cols.filter(c => !c.num), rows, rowAttrs, (c, r) => c.cell(r))}
      <table class="hidden md:table w-full text-left text-sm">
        <thead class="bg-slate-50 border-b border-slate-200">
          <tr>
            ${cols.map(c => `<th class="h-10 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap ${cellCls(c)}">${c.label}</th>`).join('')}
            <th class="h-10 px-3 w-10"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${rows.map(r => `
            <tr ${rowAttrs(r)} class="${rowAttrs(r) ? 'hover:bg-slate-50 cursor-pointer' : ''} transition-colors">
              ${cols.map(c => `<td class="px-3 py-2 align-middle text-slate-700 ${cellCls(c)}">${c.num ? serial + rows.indexOf(r) : c.cell(r)}</td>`).join('')}
              <td class="px-3 py-2 text-slate-400">${rowAttrs(r) ? ic('chevron-right', 'w-4 h-4') : ''}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

function pager(s, total, start, shown, totalPages) {
  return `
    <div class="flex flex-wrap items-center justify-between gap-3 px-2">
      <div class="flex items-center gap-3 text-sm text-slate-500">
        <span>Showing ${total ? start + 1 : 0}–${start + shown} of ${total.toLocaleString()}</span>
        <select data-change="page-size" class="px-2 py-1 bg-white border border-slate-200 rounded text-sm text-slate-600 focus:outline-none focus:border-primary-500">
          ${[10, 20, 50, 100].map(n => `<option value="${n}" ${n === s.pageSize ? 'selected' : ''}>${n} / page</option>`).join('')}
        </select>
      </div>
      <div class="flex items-center space-x-2">
        <button data-action="page" data-value="-1" ${s.page <= 1 ? 'disabled' : ''} class="px-3 py-1 text-sm border border-slate-200 rounded bg-white hover:bg-slate-50 disabled:opacity-50">Previous</button>
        <span class="text-sm text-slate-600">Page ${s.page} of ${totalPages}</span>
        <button data-action="page" data-value="1" ${s.page >= totalPages ? 'disabled' : ''} class="px-3 py-1 text-sm border border-slate-200 rounded bg-white hover:bg-slate-50 disabled:opacity-50">Next</button>
      </div>
    </div>`;
}

function downloadCsv(name, header, rows) {
  if (!rows.length) { toast('Nothing to export for these filters'); return; }
  const cell = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [header.map(cell).join(','), ...rows.map(r => r.map(cell).join(','))];
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${name}-${toDateInput(NOW)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast(`Exported ${rows.length.toLocaleString()} rows (mock data)`, 'success');
}
