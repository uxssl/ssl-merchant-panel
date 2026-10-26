// =====================================================================
// Analytics & Reports — shared pieces
// =====================================================================
const AN = {
  business: '/analytics/business-analytics', share: '/analytics/market-share', geo: '/analytics/geographic-analytics',
  operators: '/analytics/mobile-operators', devices: '/analytics/browsers-devices', issuer: '/analytics/issuer-location',
  saved: '/analytics/saved-card-analytics',
};
const an = { preset: '30d' };
const AN_PRESETS = [{ value: '7d', label: '7 Days' }, { value: '30d', label: '30 Days' }, { value: 'this_month', label: 'This Month' }, { value: 'all', label: 'All Time' }];
// Categorical order checked with the dataviz palette validator (light surface): KAM primary first.
const SERIES = ['#295cab', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#6250d6'];
const SEQ = ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95', '#0d366b'];
const CHANNELS = ['Card', 'Mobile Banking', 'QR', 'Wallet', 'Internet Banking'];
let chartQueue = [];
let anExport = null;
const queueChart = (id, config) => chartQueue.push({ id, config });

function setChartDefaults() {
  Chart.defaults.font.family = 'Inter, sans-serif';
  Chart.defaults.font.size = 11;
  Chart.defaults.color = '#64748b';
}

const anRange = () => {
  const r = presetRange(an.preset);
  return an.preset === 'all' ? { from: startOfDay(TXNS[TXNS.length - 1].date), to: r.to } : r;
};
const anTxns = () => {
  const { from, to } = anRange();
  return TXNS.filter(t => inStores(t.store) && t.date >= from && t.date <= to);
};
const pct = (a, b) => b ? a / b * 100 : 0;
const fmtPct = (n) => `${n.toFixed(1)}%`;
const okList = (list) => list.filter(t => t.status === 'success');
const salesOf = (list) => okList(list).reduce((s, t) => s + t.amount, 0);
const rateOf = (list) => pct(okList(list).length, list.length);

function groupRows(list, key, order) {
  const groups = new Map();
  for (const t of list) {
    const k = typeof key === 'function' ? key(t) : t[key];
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(t);
  }
  const totalSales = salesOf(list) || 1;
  const rows = [...groups].map(([name, items]) => ({
    name, items, count: items.length, share: pct(items.length, list.length),
    sales: salesOf(items), salesShare: salesOf(items) / totalSales * 100,
    rate: rateOf(items), avg: okList(items).length ? salesOf(items) / okList(items).length : 0,
  }));
  return order ? order.map(n => rows.find(r => r.name === n)).filter(Boolean) : rows.sort((a, b) => b.count - a.count);
}

function anBuckets() {
  const { from, to } = anRange();
  const days = Math.round((startOfDay(to) - startOfDay(from)) / 864e5) + 1;
  const step = days > 35 ? 7 : 1;
  const out = [];
  for (let d = startOfDay(from); d <= to; d = addDays(d, step)) {
    out.push({ label: step === 7 ? `Wk ${fmtShort(d)}` : fmtShort(d), from: d, to: endOfDay(addDays(d, step - 1)) });
  }
  return { buckets: out, weekly: step === 7 };
}
const bucketize = (list, buckets, fn) => buckets.map(b => fn(list.filter(t => t.date >= b.from && t.date <= b.to)));

const anCard = (title, sub, body, cls = '', right = '') => `
  <div class="bg-white rounded-lg border border-slate-200 shadow-sm ${cls}">
    ${cardHead(title, sub, right)}
    <div class="p-5">${body}</div>
  </div>`;

// Ranked bars in one hue — magnitude only, so no categorical colours needed.
function rankBars(rows, { value, label, sub, max }) {
  const m = max ?? Math.max(...rows.map(value), 1);
  if (!rows.length) return '<p class="text-sm text-slate-500">No data for this period.</p>';
  return `<div class="space-y-3">${rows.map(r => `
    <div>
      <div class="flex items-center justify-between gap-3 text-sm"><span class="font-medium text-slate-700 truncate">${esc(r.name)}</span><span class="font-semibold text-slate-900 tabular-nums whitespace-nowrap">${label(r)}</span></div>
      <div class="mt-1.5 h-1.5 rounded-full bg-slate-100 overflow-hidden"><div class="h-full rounded-full bg-primary-600" style="width:${Math.max(1.5, value(r) / m * 100)}%"></div></div>
      ${sub ? `<p class="text-[11px] text-slate-500 mt-1">${sub(r)}</p>` : ''}
    </div>`).join('')}</div>`;
}

// Donut + legend list. Colour follows the entity's slot in the fixed order, never its rank.
function donut(id, rows, order, { value = r => r.count, label = r => fmtPct(r.share), sub = r => `${r.count.toLocaleString()} txns` } = {}) {
  const colorOf = (name) => SERIES[order.indexOf(name)];
  queueChart(id, {
    type: 'doughnut',
    data: { labels: rows.map(r => r.name), datasets: [{ data: rows.map(value), backgroundColor: rows.map(r => colorOf(r.name)), borderColor: '#ffffff', borderWidth: 2, hoverOffset: 4 }] },
    options: {
      maintainAspectRatio: false, cutout: '64%',
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${label(rows[c.dataIndex])} · ${c.label}` } } },
    },
  });
  return `
    <div class="flex items-center gap-6 flex-wrap">
      <div class="w-36 h-36 shrink-0"><canvas id="${id}" role="img" aria-label="Share chart; values listed alongside"></canvas></div>
      <ul class="flex-1 min-w-[170px] space-y-2.5">
        ${rows.map(r => `<li class="flex items-center gap-2 text-sm">
          <span class="w-2.5 h-2.5 rounded-sm shrink-0" style="background:${colorOf(r.name)}"></span>
          <span class="flex-1 min-w-0"><span class="block text-slate-700 truncate">${esc(r.name)}</span><span class="block text-[11px] text-slate-500">${sub(r)}</span></span>
          <span class="font-semibold text-slate-900 tabular-nums">${label(r)}</span>
        </li>`).join('')}
      </ul>
    </div>`;
}

function barChart(id, labels, data, { label, fmt = (v) => v, max } = {}) {
  queueChart(id, {
    type: 'bar',
    data: { labels, datasets: [{ label, data, backgroundColor: '#295cab', hoverBackgroundColor: '#4a75ba', borderRadius: 4, maxBarThickness: 28 }] },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${fmt(c.raw)} · ${label}` } } },
      scales: { x: { grid: { display: false } }, y: { grid: { color: '#f1f5f9' }, beginAtZero: true, max, ticks: { callback: (v) => fmt(v) } } },
    },
  });
  return `<div class="h-64"><canvas id="${id}" role="img" aria-label="${esc(label)} chart; values in the table below"></canvas></div>`;
}

function lineChart(id, labels, data, { label, fmt = (v) => v, min, max } = {}) {
  queueChart(id, {
    type: 'line',
    data: { labels, datasets: [{ label, data, borderColor: '#295cab', backgroundColor: '#295cab', borderWidth: 2, pointRadius: 0, pointHoverRadius: 4, tension: .3, spanGaps: true }] },
    options: {
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${fmt(c.raw)} · ${label}` } } },
      scales: { x: { grid: { display: false } }, y: { grid: { color: '#f1f5f9' }, min, max, ticks: { callback: (v) => fmt(v) } } },
    },
  });
  return `<div class="h-56"><canvas id="${id}" role="img" aria-label="${esc(label)} trend"></canvas></div>`;
}

function stackedBar(id, labels, series, order) {
  queueChart(id, {
    type: 'bar',
    data: { labels, datasets: series.map(s => ({ label: s.name, data: s.data, backgroundColor: SERIES[order.indexOf(s.name)], borderColor: '#ffffff', borderWidth: { top: 2 }, maxBarThickness: 32 })) },
    options: {
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, boxHeight: 10 } }, tooltip: { callbacks: { label: (c) => ` ${fmtBDT0(c.raw)} · ${c.dataset.label}` } } },
      scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, grid: { color: '#f1f5f9' }, ticks: { callback: (v) => v >= 1e5 ? `${v / 1e5}L` : v >= 1e3 ? `${v / 1e3}k` : v } } },
    },
  });
  return `<div class="h-72"><canvas id="${id}" role="img" aria-label="Sales by channel over time; values in the table below"></canvas></div>`;
}

// Main table of each page doubles as the chart's table view and the CSV export.
function anTable(name, header, rows, { right = [] } = {}) {
  anExport = { name, header, rows: rows.map(r => r.map(c => String(c).replace(/<[^>]+>/g, ''))) };
  return miniTable(header, rows, { right });
}
const exportBtn = `<button data-action="an-export" class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 shadow-sm">${ic('download', 'w-3.5 h-3.5')}Export CSV</button>`;
const insight = (text) => `<div class="flex items-start gap-2 rounded-lg border border-primary-100 bg-primary-50 px-3 py-2.5 text-sm text-primary-800">${ic('lightbulb', 'w-4 h-4 mt-0.5 shrink-0')}<span>${text}</span></div>`;
const mockNote = (text) => `<p class="flex items-start gap-1.5 text-[11px] text-slate-500">${ic('info', 'w-3.5 h-3.5 mt-px shrink-0')}${text}</p>`;

function analyticsShell(title, sub, body) {
  const list = anTxns();
  const { from, to } = anRange();
  return `
    <div class="space-y-6">
      <div class="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">${title}</h1>
          <p class="text-slate-500 text-sm">${sub}</p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          ${storePill('an', 'All Stores')}
          <div class="inline-flex p-1 bg-white border border-slate-200 rounded-full shadow-sm">
            ${AN_PRESETS.map(p => `<button data-action="an-preset" data-value="${p.value}" class="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${an.preset === p.value ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}">${p.label}</button>`).join('')}
          </div>
        </div>
      </div>
      <p class="text-xs text-slate-500 -mt-3">${fmtDate(from)} – ${fmtDate(to)} · ${list.length.toLocaleString()} transactions${storeFilter.length ? ` · ${esc(storeLabel(''))}` : ''}</p>
      ${body(list)}
    </div>`;
}
