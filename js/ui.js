// =====================================================================
// Shared UI pieces (ported from KAM panel components)
// =====================================================================
const PILL_ACTIVE = 'bg-[#295cab21] text-primary-600 border-primary-600 font-semibold';
const PILL_IDLE = 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300 font-medium';
const STATUS_BADGE = 'px-2 py-0.5 rounded-full text-xs font-medium capitalize whitespace-nowrap inline-block';
const STATUS_CLASS = {
  success: 'bg-emerald-50 text-emerald-600',
  failed: 'bg-rose-50 text-rose-600',
  pending: 'bg-amber-50 text-amber-600',
  cancelled: 'bg-slate-100 text-slate-500',
  refunded: 'bg-indigo-50 text-indigo-600',
};
const badge = (status) => `<span class="${STATUS_BADGE} ${STATUS_CLASS[status]}">${status}</span>`;

const STATUS_OPTS = [{ label: 'All Statuses', value: 'all' }, ...STATUSES.map(s => ({ label: s.label, value: s.value }))];
const METHOD_OPTS = [{ label: 'All Methods', value: 'all' }, ...METHODS.map(m => ({ label: m.name, value: m.name }))];
// Every account store, including new / inactive ones without transactions, so filters always show a name.
const STORE_OPTS = [{ label: 'All Stores', value: 'all' }, ...ACCOUNT_STORES.map(s => ({ label: s.name, value: s.id }))];

const PRESETS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: 'this_month', label: 'This Month' },
  { value: 'all', label: 'All Time' },
  { value: 'custom', label: 'Custom Range' },
];
const TIME_CHIPS = [
  { value: 'full', label: 'Full day', from: '00:00', to: '23:59' },
  { value: 'business', label: 'Business hours', from: '09:00', to: '18:00' },
  { value: 'morning', label: 'Morning', from: '06:00', to: '12:00' },
  { value: 'evening', label: 'Evening', from: '18:00', to: '23:59' },
];

function presetRange(preset) {
  switch (preset) {
    case 'today': return { from: TODAY, to: NOW };
    case 'yesterday': return { from: addDays(TODAY, -1), to: new Date(TODAY.getTime() - 1) };
    case '7d': return { from: addDays(TODAY, -6), to: NOW };
    case '30d': return { from: addDays(TODAY, -29), to: NOW };
    case 'this_month': return { from: new Date(NOW.getFullYear(), NOW.getMonth(), 1), to: NOW };
    default: return { from: ALL_TIME_START, to: NOW }; // 'all'
  }
}
const makeRange = (preset) => ({ preset, ...presetRange(preset) });

// A range is either continuous (from → to) or a daily window: the same
// hours on every day between two dates. A window may cross midnight.
const minuteOfDay = (hm) => { const [h, m] = hm.split(':').map(Number); return h * 60 + m; };
function inRange(t, r) {
  if (t.date < r.from || t.date > r.to) return false;
  if (!r.daily) return true;
  const m = t.date.getHours() * 60 + t.date.getMinutes();
  const a = minuteOfDay(r.daily.from), b = minuteOfDay(r.daily.to);
  return a <= b ? m >= a && m <= b : m >= a || m <= b;
}
const fmtDuration = (mins) => {
  const d = Math.floor(mins / 1440), h = Math.floor((mins % 1440) / 60), m = mins % 60;
  return [d && `${d}d`, h && `${h}h`, m && `${m}m`].filter(Boolean).join(' ') || '0m';
};
const rangeDetail = (r) => r.daily
  ? `${fmtDate(r.from)} – ${fmtDate(r.to)} · ${r.daily.from}–${r.daily.to} every day`
  : `${fmtDate(r.from)}, ${fmtHM(r.from)} – ${fmtDate(r.to)}, ${fmtHM(r.to)}`;

function rangeLabel(r) {
  if (r.daily) {
    const days = r.preset !== 'custom' ? PRESETS.find(p => p.value === r.preset).label
      : toDateInput(r.from) === toDateInput(r.to) ? fmtDate(r.from) : `${fmtShort(r.from)} – ${fmtShort(r.to)}`;
    return `${days} · ${r.daily.from}–${r.daily.to} daily`;
  }
  if (r.preset !== 'custom') return PRESETS.find(p => p.value === r.preset).label;
  const fullDay = fmtHM(r.from) === '00:00' && fmtHM(r.to) === '23:59';
  const sameDay = toDateInput(r.from) === toDateInput(r.to);
  if (sameDay) return fullDay ? fmtDate(r.from) : `${fmtShort(r.from)}, ${fmtHM(r.from)} – ${fmtHM(r.to)}`;
  return fullDay ? `${fmtShort(r.from)} – ${fmtShort(r.to)}` : `${fmtShort(r.from)}, ${fmtHM(r.from)} – ${fmtShort(r.to)}, ${fmtHM(r.to)}`;
}

function selectPill(scope, key, label, options, value, icon) {
  const ddKey = `${scope}:${key}`;
  const active = value && value !== 'all';
  const selected = options.find(o => o.value === value);
  return `
    <div class="relative" data-dd-root>
      <button data-action="dd-toggle" data-key="${ddKey}" aria-haspopup="listbox" aria-expanded="${openDD === ddKey}" class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors border ${active ? PILL_ACTIVE : PILL_IDLE}">
        ${icon ? ic(icon, 'w-4 h-4') : ''}${active ? esc(selected?.label ?? value) : label}${ic('chevron-down', 'w-3 h-3')}
      </button>
      ${openDD === ddKey ? `
        <div class="absolute top-full left-0 mt-2 min-w-[200px] bg-white rounded-lg shadow-lg border border-slate-200 z-50 py-1 max-h-72 overflow-y-auto anim-pop">
          ${options.map(o => `
            <button data-action="dd-select" data-scope="${scope}" data-key="${key}" data-value="${o.value}"
              class="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 ${o.value === value ? 'text-primary-600 font-medium bg-slate-50' : 'text-slate-700'}">${esc(o.label)}</button>`).join('')}
        </div>` : ''}
    </div>`;
}

// ---------------------------------------------------------------------
// Date & time range picker — KAM date-range pill, extended with time
// ---------------------------------------------------------------------
function dtPill(range, defaultPreset = '7d') {
  const active = range.preset !== defaultPreset || !!range.daily;
  return `
    <div class="relative" data-dd-root>
      <button data-action="dd-toggle" data-key="txn:range" class="inline-flex items-center gap-2 px-3 py-1.5 border rounded-full text-sm transition-colors ${active ? PILL_ACTIVE : PILL_IDLE}">
        ${ic('calendar-clock', 'w-4 h-4')}<span class="truncate">${rangeLabel(range)}</span>${ic('chevron-down', 'w-3 h-3')}
      </button>
      ${openDD === 'txn:range' ? dtPopover() : ''}
    </div>`;
}

function draftFromRange(r) {
  return {
    mode: r.daily ? 'daily' : 'continuous',
    preset: r.preset,
    fromDate: toDateInput(r.from),
    toDate: toDateInput(r.to),
    fromTime: r.daily ? r.daily.from : fmtHM(r.from),
    toTime: r.daily ? r.daily.to : fmtHM(r.to),
  };
}

function dtPopover() {
  const d = dtDraft;
  const daily = d.mode === 'daily';
  const modeBtn = (value, text, icon) => `
    <button data-action="dt-mode" data-value="${value}" class="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${d.mode === value ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}">
      ${ic(icon, 'w-3.5 h-3.5')}${text}</button>`;
  const inputCls = 'w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500';
  const label = (t) => `<p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">${t}</p>`;
  return `
    <div class="fixed left-4 right-4 top-20 max-h-[calc(100vh-6rem)] overflow-y-auto sm:overflow-hidden sm:max-h-none sm:absolute sm:left-0 sm:right-auto sm:top-full sm:mt-2 sm:w-[580px] bg-white rounded-xl shadow-xl border border-slate-200 z-50 anim-pop flex flex-col sm:flex-row">
      <div class="sm:w-44 border-b sm:border-b-0 sm:border-r border-slate-100 py-3 flex flex-wrap sm:block">
        <p class="w-full px-4 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Quick select</p>
        ${PRESETS.map(p => `
          <button data-action="dt-preset" data-value="${p.value}" data-preset-btn="${p.value}"
            class="sm:w-full text-left px-4 py-2 text-xs font-medium transition-colors hover:bg-slate-50 ${d.preset === p.value ? 'text-primary-600 bg-primary-50' : 'text-slate-700'}">${p.label}</button>`).join('')}
      </div>
      <div class="flex-1 p-4 bg-slate-50/50 flex flex-col gap-4">
        <div>
          <div class="flex p-1 bg-white border border-slate-200 rounded-full">
            ${modeBtn('continuous', 'Continuous range', 'move-horizontal')}
            ${modeBtn('daily', 'Same time every day', 'repeat')}
          </div>
          <p class="text-[11px] text-slate-500 mt-2 px-1">${daily
            ? 'Only the chosen hours on each day, e.g. 09:00–18:00 from 20 Oct to 26 Oct.'
            : 'One unbroken period, e.g. 20 Oct 09:00 → 26 Oct 18:00.'}</p>
        </div>
        ${daily ? `
        <div>
          ${label('Dates')}
          <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <input type="date" data-dt="fromDate" value="${d.fromDate}" max="${toDateInput(NOW)}" class="${inputCls}">
            <span class="text-xs text-slate-400">to</span>
            <input type="date" data-dt="toDate" value="${d.toDate}" max="${toDateInput(NOW)}" class="${inputCls}">
          </div>
        </div>
        <div>
          ${label('Every day between')}
          <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <input type="time" data-dt="fromTime" value="${d.fromTime}" class="${inputCls}">
            <span class="text-xs text-slate-400">and</span>
            <input type="time" data-dt="toTime" value="${d.toTime}" class="${inputCls}">
          </div>
        </div>` : `
        <div>
          ${label('From')}
          <div class="grid grid-cols-[1fr_120px] gap-2">
            <input type="date" data-dt="fromDate" value="${d.fromDate}" max="${toDateInput(NOW)}" class="${inputCls}">
            <input type="time" data-dt="fromTime" value="${d.fromTime}" class="${inputCls}">
          </div>
        </div>
        <div>
          ${label('To')}
          <div class="grid grid-cols-[1fr_120px] gap-2">
            <input type="date" data-dt="toDate" value="${d.toDate}" max="${toDateInput(NOW)}" class="${inputCls}">
            <input type="time" data-dt="toTime" value="${d.toTime}" class="${inputCls}">
          </div>
        </div>`}
        <div>
          ${label(daily ? 'Quick window' : 'Quick time · sets From & To time')}
          <div class="flex flex-wrap gap-2">
            ${TIME_CHIPS.map(c => {
              const on = d.fromTime === c.from && d.toTime === c.to;
              return `<button data-action="dt-chip" data-value="${c.value}" data-chip-btn="${c.value}"
                class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] border transition-colors ${on ? PILL_ACTIVE : PILL_IDLE}">
                ${c.label} <span class="opacity-60">${c.from}–${c.to}</span></button>`;
            }).join('')}
          </div>
        </div>
        <p id="dt-error" class="hidden text-[11px] font-medium text-rose-600"></p>
        <div class="flex items-center justify-between gap-3 pt-3 mt-auto border-t border-slate-200">
          <p id="dt-summary" class="text-[11px] text-slate-500"></p>
          <div class="flex gap-2">
            <button data-action="dt-cancel" class="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded hover:bg-slate-200">Cancel</button>
            <button id="dt-apply" data-action="dt-apply" class="px-3 py-1.5 text-xs font-medium text-white bg-primary-600 rounded hover:bg-primary-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">Apply</button>
          </div>
        </div>
      </div>
    </div>`;
}

function draftRange() {
  if (dtDraft.mode === 'daily') {
    return {
      from: parseDT(dtDraft.fromDate, '00:00', false),
      to: parseDT(dtDraft.toDate, '23:59', true),
      daily: dtDraft.fromTime && dtDraft.toTime ? { from: dtDraft.fromTime, to: dtDraft.toTime } : null,
    };
  }
  return { from: parseDT(dtDraft.fromDate, dtDraft.fromTime, false), to: parseDT(dtDraft.toDate, dtDraft.toTime, true) };
}

function draftError(r) {
  const daily = dtDraft.mode === 'daily';
  if (!r.from || !r.to || (daily && !r.daily)) return daily ? 'Pick both dates and both times.' : 'Pick a date and time for both From and To.';
  if (r.from > r.to) return daily ? 'The start date must be on or before the end date.' : '“From” must be earlier than “To”.';
  if (daily && r.daily.from === r.daily.to) return 'Start and end time can’t be the same.';
  return '';
}

// Updates the open popover in place, so native date/time inputs keep focus while typing.
function syncDtPopover() {
  if (!dtDraft) return;
  document.querySelectorAll('[data-preset-btn]').forEach(b => {
    const on = b.dataset.presetBtn === dtDraft.preset;
    b.classList.toggle('text-primary-600', on); b.classList.toggle('bg-primary-50', on); b.classList.toggle('text-slate-700', !on);
  });
  document.querySelectorAll('[data-chip-btn]').forEach(b => {
    const c = TIME_CHIPS.find(x => x.value === b.dataset.chipBtn);
    const on = dtDraft.fromTime === c.from && dtDraft.toTime === c.to;
    b.className = b.className.replace(on ? PILL_IDLE : PILL_ACTIVE, on ? PILL_ACTIVE : PILL_IDLE);
  });
  const r = draftRange();
  const err = $('#dt-error'), sum = $('#dt-summary'), apply = $('#dt-apply');
  const msg = draftError(r);
  err.textContent = msg; err.classList.toggle('hidden', !msg); apply.disabled = !!msg;
  if (msg) { sum.textContent = ''; return; }
  const count = TXNS.filter(t => inRange(t, r)).length;
  if (r.daily) {
    const a = minuteOfDay(r.daily.from), b = minuteOfDay(r.daily.to);
    const days = Math.round((startOfDay(r.to) - startOfDay(r.from)) / 864e5) + 1;
    sum.innerHTML = `${days} day${days > 1 ? 's' : ''} × <span class="font-semibold text-slate-700">${fmtDuration(b > a ? b - a : 1440 - a + b)}</span> window${b < a ? ' (crosses midnight)' : ''} · ${count.toLocaleString()} txns`;
  } else {
    sum.innerHTML = `${fmtShort(r.from)} ${fmtHM(r.from)} → ${fmtShort(r.to)} ${fmtHM(r.to)} · <span class="font-semibold text-slate-700">${fmtDuration(Math.round((r.to - r.from) / 60000))}</span> · ${count.toLocaleString()} txns`;
  }
}
