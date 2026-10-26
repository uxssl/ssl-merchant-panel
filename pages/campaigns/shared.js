// =====================================================================
// Campaigns — shared
// =====================================================================
const CMP = { partner: '/campaigns/partnership-campaigns', merchant: '/campaigns/merchant-campaigns', calendar: '/campaigns/campaign-calendar' };
const PARTICIPATION_CLS = { 'Not joined': 'bg-slate-100 text-slate-500', 'Created': 'bg-slate-100 text-slate-600', 'KAM Approved': 'bg-blue-50 text-blue-600', 'Bank Approved': 'bg-emerald-50 text-emerald-600', 'Rejected': 'bg-rose-50 text-rose-600', 'Closed': 'bg-rose-50 text-rose-600' };
const MC_CLS = { Running: 'bg-emerald-50 text-emerald-600', Pending: 'bg-amber-50 text-amber-600', Created: 'bg-slate-100 text-slate-500', Closed: 'bg-rose-50 text-rose-600' };
const PHASE_CLS = { Upcoming: 'bg-blue-50 text-blue-600', Running: 'bg-emerald-50 text-emerald-600', Ended: 'bg-slate-100 text-slate-500' };
const pBadge = (s) => `<span class="${STATUS_BADGE} ${PARTICIPATION_CLS[s]}">${s === 'Created' ? 'Requested' : s}</span>`;
const mcBadge = (s) => `<span class="${STATUS_BADGE} ${MC_CLS[s]}">${s}</span>`;
const phaseOf = (c) => NOW < c.start ? 'Upcoming' : NOW > c.end ? 'Ended' : 'Running';
const phaseBadge = (c) => `<span class="${STATUS_BADGE} ${PHASE_CLS[phaseOf(c)]}">${phaseOf(c)}</span>`;
const periodText = (c) => `${fmtShort(c.start)} – ${fmtDate(c.end)}`;
const daysLeft = (d) => Math.ceil((d - NOW) / 864e5);
const canJoin = (c) => c.participation === 'Not joined' && c.canOnboard === 'Yes' && NOW <= c.confirm && phaseOf(c) !== 'Ended';
const JOINED = ['Created', 'KAM Approved', 'Bank Approved'];
const storeNames = (ids) => ids.map(id => STORES.find(s => s.id === id).name);

function partnerPerf(c) {
  if (c.participation !== 'Bank Approved') return { txns: [], sales: 0, discount: 0 };
  const txns = TXNS.filter(t => t.status === 'success' && c.stores.includes(t.store) && t.date >= c.start && t.date <= c.end && t.amount >= c.minOrder &&
    (c.kind === 'MFS' ? t.method === c.match : t.issuerLocation === 'Local' && t.issuerBank === c.match));
  return { txns, sales: txns.reduce((s, t) => s + t.amount, 0), discount: txns.reduce((s, t) => s + Math.min(c.max, t.amount * c.pct / 100), 0) };
}
const mcDiscountOf = (c, t) => c.type === 'Percentage' ? Math.min(c.max, t.amount * c.value / 100) : Math.min(c.value, t.amount);
function merchantPerf(c) {
  if (!['Running', 'Closed'].includes(c.status)) return { txns: [], sales: 0, discount: 0 };
  const txns = TXNS.filter(t => t.status === 'success' && c.stores.includes(t.store) && t.date >= c.start && t.date <= c.end && t.amount >= c.minOrder &&
    ((t.issuerLocation === 'Local' && c.banks.includes(t.issuerBank)) || c.mfs.includes(t.method) || c.ib.includes(t.method)));
  return { txns, sales: txns.reduce((s, t) => s + t.amount, 0), discount: txns.reduce((s, t) => s + mcDiscountOf(c, t), 0) };
}
const offerText = (c) => `${c.pct}% off up to ${fmtBDT0(c.max)}`;
const mcOfferText = (c) => c.type === 'Percentage' ? `${c.value}% off up to ${fmtBDT0(c.max)}` : `${fmtBDT0(c.value)} off`;
