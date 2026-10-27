// =====================================================================
// State
// =====================================================================
let collapsed = window.innerWidth < 1024; // icon-only rail on tablets
let navCollapsed = collapsed;             // what is actually drawn (never collapsed on phones)
let mobileNav = false;                    // phone menu open
const isPhone = () => window.innerWidth < 768;
let expanded = null;
let openDD = null;
let dtDraft = null;
let userMenuOpen = false;
let headerMenu = null; // 'search' | 'notifications'
const search = { q: '', active: 0 };
let pendingFocus = null; // selector to focus once the next route has rendered
let drawer = null; // { kind: 'txn' | 'refund' | 'cb', item }
let charts = [];

// One store selection for the whole portal: the header switcher and every page's Store pill share it (setStores).
let storeFilter = []; // store ids; empty = all stores
const inStores = (id) => !storeFilter.length || storeFilter.includes(id);

// List filters are edited as a draft on the list state itself; `applied` holds what the table
// shows, and "Apply Filters" copies the draft across (KAM reports page behaviour).
const FILTER_KEYS = ['search', 'range', 'status', 'method', 'stage', 'stype', 'bstatus', 'bank', 'currency', 'emi', 'role', 'ref', 'issuer', 'last4', 'holder', 'refId', 'mref', 'card'];
const snapshotFilters = (s) => Object.fromEntries(FILTER_KEYS.map(k => [k, s[k]]));
const applied = (s) => ({ ...s, ...s.applied });
const sameStores = (a, b) => a.length === b.length && a.every(id => b.includes(id));
const filtersDirty = (s) => JSON.stringify(snapshotFilters(s)) !== JSON.stringify(s.applied) || (!!s.storeDraft && !sameStores(s.storeDraft, storeFilter));

const listStates = {};
const defaultListState = (preset) => {
  const s = { defaultPreset: preset, search: '', range: makeRange(preset), status: 'all', method: 'all', stage: 'all', stype: 'all', bstatus: 'all', bank: 'all', currency: 'all', emi: 'all', role: 'all', ref: 'all', issuer: 'all', last4: '', holder: '', refId: '', mref: '', card: '', page: 1, pageSize: 20, sort: { key: 'date', dir: 'desc' }, hidden: new Set(), storeDraft: null };
  s.applied = snapshotFilters(s);
  return s;
};
// The transaction list opens on "Success Only", as in the old panel; Clear returns to it.
const txnState = (key) => (listStates[key] ||= (() => { const s = defaultListState('7d'); Object.assign(s, { status: 'success', defaultStatus: 'success' }); s.applied = snapshotFilters(s); return s; })());
// Links and invoices live longer than a month, so their lists open on All Time.
const LIST_DEFAULT_PRESET = { '/products/payment-links': 'all', '/products/digital-invoices': 'all', '/campaigns/partnership-campaigns': 'all', '/campaigns/merchant-campaigns': 'all', '/support/tickets-queries': 'all', '/support/service-delivery': 'all' };
// Filter state of whichever list page is open (transactions, refunds or chargebacks).
const pageState = () => {
  const path = currentPath();
  return TXN_VIEWS[path] ? txnState(TXN_VIEWS[path].key) : (listStates[path] ||= defaultListState(LIST_DEFAULT_PRESET[path] || '30d'));
};
const tracking = { merchant: '', bkash: '', nagad: '', results: null };

const dash = { preset: '7d' };

// Pages that moved in the menu keep their old links working.
const MOVED_PATHS = { '/account/my-stores': '/account/store-list', '/transactions/google-pay': '/analytics/google-pay-report', '/transactions/bangla-qr': '/analytics/bangla-qr-report', '/settlements/settlement-report': '/analytics/settlement-report', '/settlements/financial-year-report': '/analytics/financial-year-report' };
const currentPath = () => { const p = (location.hash || '#/dashboard').slice(1); return MOVED_PATHS[p] || p; };
const activeParent = (path) => NAV.find(n => n.children?.some(c => c.to === path))?.key || null;
