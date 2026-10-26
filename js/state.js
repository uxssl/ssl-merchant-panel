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
let drawer = null; // { kind: 'txn' | 'refund' | 'cb', item }
let charts = [];

// One store choice for the whole portal: the header switcher and every page's Store filter share it (setStore).
let storeFilter = 'all';

const listStates = {};
const defaultListState = (preset) => ({ defaultPreset: preset, search: '', range: makeRange(preset), status: 'all', method: 'all', store: storeFilter, stage: 'all', stype: 'all', bstatus: 'all', bank: 'all', currency: 'all', emi: 'all', role: 'all', page: 1, pageSize: 20, sort: { key: 'date', dir: 'desc' }, hidden: new Set() });
const txnState = (key) => (listStates[key] ||= defaultListState('7d'));
// Links and invoices live longer than a month, so their lists open on All Time.
const LIST_DEFAULT_PRESET = { '/products/payment-links': 'all', '/products/digital-invoices': 'all', '/campaigns/merchant-campaigns': 'all', '/support/tickets-queries': 'all', '/support/service-delivery': 'all' };
// Filter state of whichever list page is open (transactions, refunds or chargebacks).
const pageState = () => {
  const path = currentPath();
  return TXN_VIEWS[path] ? txnState(TXN_VIEWS[path].key) : (listStates[path] ||= defaultListState(LIST_DEFAULT_PRESET[path] || '30d'));
};
const tracking = { query: '', results: null };

const dash = { preset: '7d', store: 'all' };

const currentPath = () => (location.hash || '#/dashboard').slice(1);
const activeParent = (path) => NAV.find(n => n.children?.some(c => c.to === path))?.key || null;
