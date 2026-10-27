// =====================================================================
// Campaigns — shared
// =====================================================================
const CMP = { partner: '/campaigns/partnership-campaigns', merchant: '/campaigns/merchant-campaigns', calendar: '/campaigns/campaign-calendar' };
const CAMPAIGN_CLS = { Pending: 'bg-amber-50 text-amber-600', 'Sent to Bank (Closed)': 'bg-indigo-50 text-indigo-600', Created: 'bg-blue-50 text-blue-600', Approved: 'bg-emerald-50 text-emerald-600', Canceled: 'bg-slate-100 text-slate-500' };
const campaignBadge = (s) => `<span class="${STATUS_BADGE} normal-case ${CAMPAIGN_CLS[s]}">${s}</span>`;
const periodText = (c) => `${fmtShort(c.start)} – ${fmtDate(c.end)}`;
const storeName = (id) => STORES.find(s => s.id === id).name;
const joinedStores = (c) => STORES.filter(st => c.discounts[st.id]).map(st => st.id);
// Partnership campaigns take store discounts until the last participation date.
const partnerEditable = (c) => c.status === 'Pending' && NOW <= c.last;
const mcEditable = (c) => c.status === 'Created';

// Old panel lists: search by date range and Tracking ID / Campaign Name.
function campaignRows(list, s) {
  const q = s.search.trim().toLowerCase();
  return list.filter(c =>
    (!storeFilter.length || !joinedStores(c).length || joinedStores(c).some(id => storeFilter.includes(id))) &&
    (s.status === 'all' || c.status === s.status) &&
    (!q || c.name.toLowerCase().includes(q) || c.tracking.toLowerCase().includes(q)) &&
    (s.range.preset === 'all' || (c.end >= s.range.from && c.start <= s.range.to)) // 'All Time' keeps upcoming campaigns
  ).sort((a, b) => b.created - a.created);
}

const CELL = 'w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 disabled:bg-slate-100 disabled:text-slate-400';
const actionBtn = (action, id, icon, label) => rowAction(action, id, icon, label, { title: `${label} campaign ${id}` });

// Per-store discount table used by the Update (partnership) and Create / Edit (merchant) forms.
// cols: [{ key, label, type: 'number' | 'text' | 'yesno', width }]
function storeDiscountTable(draft, cols, scope) {
  return `
    <div class="overflow-x-auto rounded-lg border border-slate-200">
      <table class="min-w-[900px] w-full text-left text-xs">
        <thead class="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          <tr><th class="px-3 py-2">Store</th>${cols.map(c => `<th class="px-2 py-2 ${c.width || ''}">${c.label}</th>`).join('')}</tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${STORES.map(st => {
            const row = draft.rows[st.id];
            const err = formErrors[`row:${st.id}`];
            return `<tr class="${row.on ? 'bg-primary-50/40' : ''}">
              <td class="px-3 py-2 align-top"><label class="flex items-center gap-2 font-medium text-slate-800 whitespace-nowrap"><input type="checkbox" data-${scope}-on="${st.id}" ${row.on ? 'checked' : ''} class="rounded border-slate-300 text-primary-600">${esc(st.name)}</label>${err ? `<p class="text-[11px] font-medium text-rose-600 mt-1 max-w-[180px]">${err}</p>` : ''}</td>
              ${cols.map(c => `<td class="px-2 py-2 align-top">${c.type === 'yesno'
                ? `<select data-${scope}-row="${st.id}|${c.key}" ${row.on ? '' : 'disabled'} aria-label="${esc(st.name)} ${c.label}" class="${CELL}">${c.placeholder ? `<option value="">${c.placeholder}</option>` : ''}${options(['Yes', 'No'], row[c.key])}</select>`
                : `<input data-${scope}-row="${st.id}|${c.key}" value="${esc(row[c.key])}" ${c.type === 'number' ? 'type="number" min="0" step="any"' : ''} placeholder="${c.hint || ''}" ${row.on ? '' : 'disabled'} aria-label="${esc(st.name)} ${c.label}" class="${CELL}">`}</td>`).join('')}
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

// Shared checks for a ticked store row; returns an error message or ''.
function discountRowError(row, { maxPerCard = false } = {}) {
  const num = (v) => v !== '' && Number(v) >= 0;
  if (!(Number(row.pct) > 0 && Number(row.pct) <= 100)) return 'Enter a discount offer between 1 and 100%.';
  if (!row.burned && !row.observed) return 'Choose whether the discount is fully covered by you.';
  if (!num(row.minOrder)) return 'Enter the minimum order amount (0 for none).';
  if (!(Number(row.maxPerTxn) > 0)) return 'Enter the max discount per transaction.';
  if (maxPerCard && !(Number(row.maxPerCard) > 0)) return 'Enter the maximum discount per card.';
  if (!(Number.isInteger(Number(row.perUser)) && Number(row.perUser) >= 1)) return 'Enter how many times one user can get the discount (1 or more).';
  return '';
}
