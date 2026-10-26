// =====================================================================
// Payment Products — shared form pieces
// =====================================================================
const LINKS_PATH = '/products/payment-links';
const INVOICES_PATH = '/products/digital-invoices';
const QR_PATH = '/products/payment-qr';
const EMI_PATH = '/products/digital-emi';

const INPUT = 'w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500';
const field = (label, control, { hint = '', required = false, error = '' } = {}) => `
  <label class="block">
    <span class="block text-xs font-bold text-slate-700 mb-1.5">${label}${required ? ' <span class="text-rose-500">*</span>' : ''}</span>
    ${control}
    ${error ? `<span class="block text-[11px] font-medium text-rose-600 mt-1">${error}</span>` : hint ? `<span class="block text-[11px] text-slate-500 mt-1">${hint}</span>` : ''}
  </label>`;
const options = (list, value) => list.map(o => {
  const [v, l] = Array.isArray(o) ? o : [o, o];
  return `<option value="${esc(v)}" ${v === value ? 'selected' : ''}>${esc(l)}</option>`;
}).join('');
const storeOptions = (value) => options(STORES.map(s => [s.id, s.name]), value);
const safeColor = (c, fallback) => /^#[0-9a-f]{6}$/i.test(c || '') ? c : fallback;
let formErrors = {};
