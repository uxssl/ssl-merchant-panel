// =====================================================================
// Campaign Calendar
// =====================================================================
const cal = { month: new Date(NOW.getFullYear(), NOW.getMonth(), 1), partner: true, merchant: true };
const CAL_STYLE = {
  partner: 'background:#f0f4fa;border-left:3px solid #295cab',
  merchant: 'background:#fdf0ea;border-left:3px solid #eb6834',
};

function calendarItems() {
  return [
    ...(cal.partner ? PARTNER_CAMPAIGNS.map(c => ({ kind: 'partner', id: c.id, name: c.name, start: c.start, end: c.end, sub: campaignBadge(c.status), deadline: partnerEditable(c) ? c.last : null })) : []),
    ...(cal.merchant ? MERCHANT_CAMPAIGNS.filter(c => c.status !== 'Canceled').map(c => ({ kind: 'merchant', id: c.id, name: c.name, start: c.start, end: c.end, sub: campaignBadge(c.status), deadline: null })) : []),
  ].sort((a, b) => a.start - b.start);
}

function renderCampaignCalendar() {
  const first = cal.month;
  const offset = first.getDay(); // weeks start on Sunday, as in the old panel
  const gridStart = addDays(first, -offset);
  const items = calendarItems();
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weeks = [];
  for (let w = 0; w < 6; w++) {
    const ws = addDays(gridStart, w * 7), we = endOfDay(addDays(ws, 6));
    if (w > 3 && ws.getMonth() !== first.getMonth()) break;
    const inWeek = items.filter(i => i.start <= we && i.end >= ws);
    const lanes = [];
    const bars = inWeek.map(i => {
      const s = Math.max(0, Math.round((startOfDay(i.start) - ws) / 864e5));
      const e = Math.min(6, Math.round((startOfDay(i.end) - ws) / 864e5));
      let lane = lanes.findIndex(end => end < s);
      if (lane === -1) { lane = lanes.length; lanes.push(e); } else lanes[lane] = e;
      return { ...i, s, e, lane };
    });
    weeks.push({ ws, bars, deadlines: items.filter(i => i.deadline && i.deadline >= ws && i.deadline <= we) });
  }
  const MAX_LANES = 3;
  const monthItems = items.filter(i => i.start <= endOfDay(new Date(first.getFullYear(), first.getMonth() + 1, 0)) && i.end >= first);
  const toggle = (key, label, color) => `<label class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 bg-white text-xs font-medium text-slate-700 cursor-pointer hover:bg-slate-50">
    <input type="checkbox" data-cal-toggle="${key}" ${cal[key] ? 'checked' : ''} class="rounded border-slate-300 text-primary-600"><span class="w-2.5 h-2.5 rounded-sm" style="background:${color}"></span>${label}</label>`;
  return `
    <div class="space-y-6">
      <div class="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">Campaign Calendar</h1>
          <p class="text-slate-500 text-sm">Partner offers and your own campaigns on one timeline, with last participation dates.</p>
        </div>
        <div class="flex items-center gap-2">${toggle('partner', 'Partnership', '#295cab')}${toggle('merchant', 'My campaigns', '#eb6834')}</div>
      </div>

      <div class="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div class="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <button data-action="cal-nav" data-value="-1" class="p-1.5 rounded-md border border-slate-200 hover:bg-slate-50" title="Previous month">${ic('chevron-left', 'w-4 h-4')}</button>
            <button data-action="cal-nav" data-value="1" class="p-1.5 rounded-md border border-slate-200 hover:bg-slate-50" title="Next month">${ic('chevron-right', 'w-4 h-4')}</button>
            <h2 class="text-base font-semibold text-slate-900 ml-2">${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][first.getMonth()]} ${first.getFullYear()}</h2>
          </div>
          <button data-action="cal-nav" data-value="0" class="px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50">Today</button>
        </div>
        <div class="grid grid-cols-7 border-b border-slate-200 bg-slate-50">${DAYS.map(d => `<div class="px-2 py-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">${d}</div>`).join('')}</div>
        ${weeks.map(({ ws, bars, deadlines }) => `
          <div class="relative border-b border-slate-100 last:border-0">
            <div class="grid grid-cols-7">
              ${Array.from({ length: 7 }, (_, i) => {
                const day = addDays(ws, i);
                const isToday = +startOfDay(day) === +TODAY;
                const out = day.getMonth() !== first.getMonth();
                const dl = deadlines.filter(x => +startOfDay(x.deadline) === +startOfDay(day));
                const more = bars.filter(b => b.lane >= MAX_LANES && b.s <= i && b.e >= i).length;
                return `<div class="min-h-[120px] border-r border-slate-100 last:border-0 p-1.5 ${out ? 'bg-slate-50/60' : ''}">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-semibold w-6 h-6 inline-flex items-center justify-center rounded-full ${isToday ? 'bg-primary-600 text-white' : out ? 'text-slate-300' : 'text-slate-700'}">${day.getDate()}</span>
                    ${dl.length ? `<span class="text-[10px] font-semibold text-amber-700 bg-amber-50 rounded px-1" title="${dl.map(x => `Last participation date: ${esc(x.name)}`).join(', ')}">Update by</span>` : ''}
                  </div>
                  ${more ? `<p class="absolute bottom-1 text-[10px] text-slate-500" style="left:calc(${i} * 100% / 7 + 6px)">+${more} more</p>` : ''}
                </div>`;
              }).join('')}
            </div>
            <div class="absolute inset-x-0 top-8 grid grid-cols-7 gap-y-1 px-0.5 pointer-events-none">
              ${bars.filter(b => b.lane < MAX_LANES).map(b => `
                <button data-action="${b.kind === 'partner' ? 'open-partner' : 'open-mc'}" data-value="${b.id}"
                  class="pointer-events-auto mx-0.5 h-6 rounded text-left px-1.5 text-[11px] font-medium text-slate-800 truncate hover:brightness-95"
                  style="grid-column:${b.s + 1} / ${b.e + 2};grid-row:${b.lane + 1};${CAL_STYLE[b.kind]}" title="${esc(b.name)} · ${periodText(b)}">${esc(b.name)}</button>`).join('')}
            </div>
          </div>`).join('')}
      </div>

      ${anCard('This Month', `${monthItems.length} campaign${monthItems.length === 1 ? '' : 's'}`, monthItems.length ? `<div class="divide-y divide-slate-100 -my-2">${monthItems.map(i => `
        <button data-action="${i.kind === 'partner' ? 'open-partner' : 'open-mc'}" data-value="${i.id}" class="w-full flex items-center gap-3 py-2.5 text-left hover:bg-slate-50 rounded">
          <span class="w-1 self-stretch rounded" style="background:${i.kind === 'partner' ? '#295cab' : '#eb6834'}"></span>
          <span class="flex-1 min-w-0"><span class="block text-sm font-medium text-slate-800 truncate">${esc(i.name)}</span><span class="block text-xs text-slate-500">${periodText(i)} · ${i.kind === 'partner' ? 'Partnership' : 'My campaign'}${i.deadline ? ` · <span class="text-amber-700 font-medium">update by ${fmtShort(i.deadline)}</span>` : ''}</span></span>
          ${i.sub}${ic('chevron-right', 'w-4 h-4 text-slate-400')}
        </button>`).join('')}</div>` : '<p class="text-sm text-slate-500">No campaigns this month.</p>')}
    </div>`;
}
