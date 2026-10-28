// =====================================================================
// Mock data (deterministic). Card / account numbers are masked — the
// merchant portal never shows a full PAN (PCI-DSS).
// =====================================================================
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20261026);
const pick = (arr) => arr[Math.floor(rng() * arr.length)];
const wpick = (arr) => {
  let r = rng() * arr.reduce((s, x) => s + x.w, 0);
  for (const x of arr) { if ((r -= x.w) < 0) return x; }
  return arr[arr.length - 1];
};
const digits = (n) => Array.from({ length: n }, () => Math.floor(rng() * 10)).join('');
const alnum = (n) => Array.from({ length: n }, () => '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(rng() * 34)]).join('');

const STORES = [
  { id: 'demo_dhanmondi', name: 'Demo Store – Dhanmondi', w: 5 },
  { id: 'demo_gulshan', name: 'Demo Store – Gulshan', w: 3 },
  { id: 'demo_online', name: 'Demo Online Shop', w: 4 },
];
const METHODS = [
  { name: 'VISA', type: 'Card', w: 20 },
  { name: 'Mastercard', type: 'Card', w: 13 },
  { name: 'AMEX', type: 'Card', w: 3 },
  { name: 'DBBL Nexus', type: 'Card', w: 3 },
  { name: 'bKash', type: 'Mobile Banking', w: 22 },
  { name: 'Nagad', type: 'Mobile Banking', w: 10 },
  { name: 'Rocket', type: 'Mobile Banking', w: 4 },
  { name: 'Bangla QR', type: 'QR', w: 14 },
  { name: 'Google Pay', type: 'Wallet', w: 6 },
  { name: 'City Touch', type: 'Internet Banking', w: 3 },
];
const FEE_RATE = { 'Card': 0.02, 'Mobile Banking': 0.015, 'Internet Banking': 0.015, 'QR': 0.01, 'Wallet': 0.02 };
const STATUSES = [
  { value: 'success', label: 'Success', w: 78 },
  { value: 'failed', label: 'Failed', w: 12 },
  { value: 'pending', label: 'Pending', w: 3 },
  { value: 'cancelled', label: 'Cancelled', w: 5 },
  { value: 'refunded', label: 'Refunded', w: 2 },
];
const ISSUERS = ['BRAC Bank', 'City Bank', 'Dutch-Bangla Bank', 'Eastern Bank', 'Standard Chartered', 'Prime Bank'];
const FAIL_REASONS = ['Insufficient balance', 'Declined by issuer', 'OTP verification failed', 'Session timeout at gateway', '3D Secure authentication failed'];
const CUSTOMERS = ['Ayesha Rahman', 'Tanvir Hasan', 'Nusrat Jahan', 'Imran Hossain', 'Farhana Akter', 'Sabbir Ahmed', 'Mehedi Islam', 'Sadia Chowdhury', 'Rakib Uddin', 'Tasnim Kabir', 'Arif Mahmud', 'Shirin Sultana'];
const HOUR_WEIGHTS = [1, .5, .3, .2, .2, .4, 1, 2, 3, 4, 5, 6, 7, 6.5, 6, 5, 5, 5.5, 6.5, 7.5, 8, 7, 4.5, 2.5].map((w, h) => ({ h, w }));

// QA hook: open with ?now=2026-10-26T00:20 to see the portal at another time of day.
const NOW = (() => {
  const q = new URLSearchParams(location.search).get('now');
  const d = q ? new Date(q) : null;
  return d && !Number.isNaN(d.getTime()) ? d : new Date();
})();
const TODAY = startOfDay(NOW);
const DAYS = 70;
const ALL_TIME_START = new Date(2020, 0, 1); // links and invoices can be older than the transaction mock data

function maskAccount(method) {
  switch (method.type) {
    case 'Card': case 'Wallet': return `•••• ${digits(4)}`;
    case 'Mobile Banking': return `01•••••${digits(3)}`;
    case 'Internet Banking': return `A/C ••••${digits(4)}`;
    default: return `•••• ${digits(4)}`;
  }
}

const TXNS = [];
for (let i = 0; i < 2600; i++) {
  const day = Math.floor(rng() * DAYS);
  if (rng() > 0.55 + 0.45 * (1 - day / DAYS)) continue; // gentle upward trend
  const h = wpick(HOUR_WEIGHTS).h;
  const date = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() - day, h, Math.floor(rng() * 60), Math.floor(rng() * 60));
  if (date > NOW) continue;
  const method = wpick(METHODS);
  const store = wpick(STORES);
  const status = wpick(STATUSES).value;
  const amount = Math.round(Math.exp(5 + rng() * 4.8) / 10) * 10;
  const name = pick(CUSTOMERS);
  const ymd = `${String(date.getFullYear()).slice(2)}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
  TXNS.push({
    id: `TXN${ymd}${alnum(6)}`,
    valId: `VAL${alnum(10)}`,
    bankTranId: digits(14),
    date,
    store: store.id,
    storeName: store.name,
    customer: name,
    phone: `01•••••${digits(3)}`,
    email: `${name.split(' ')[0][0].toLowerCase()}•••••@example.com`,
    method: method.name,
    type: method.type,
    account: maskAccount(method),
    issuer: method.type === 'Card' ? pick(ISSUERS) : method.name,
    amount,
    fee: Math.round(amount * FEE_RATE[method.type] * 100) / 100,
    status,
    reason: status === 'failed' ? pick(FAIL_REASONS) : null,
    auth: 4 + Math.floor(rng() * 50),
  });
}
TXNS.sort((a, b) => b.date - a.date);

// Refund and chargeback requests raised against the transactions above.
const REFUND_REMARKS = ['Customer cancelled the order', 'Item out of stock', 'Duplicate payment by customer', 'Partial delivery', 'Service not availed'];
const REQUESTERS = ['demo_merchant', 'manager_dhanmondi', 'manager_gulshan'];
const REFUNDS = [];
for (const t of TXNS) {
  const refunded = t.status === 'refunded';
  if (!refunded && !(t.status === 'success' && rng() < 0.025)) continue;
  const date = new Date(Math.min(NOW.getTime() - 60000, t.date.getTime() + (1 + rng() * 96) * 3600e3));
  const ageH = (NOW - date) / 3600e3;
  const status = refunded ? 'Success' : ageH < 24 ? pick(['Initiate', 'Processing']) : ageH < 96 ? pick(['Processing', 'Submit To Bank']) : 'Cancel';
  const full = rng() < 0.7;
  REFUNDS.push({
    ref: `RF${alnum(10)}`, txn: t, date, status,
    requestedBy: pick(REQUESTERS),
    remarks: pick(REFUND_REMARKS),
    type: full ? 'Full' : 'Partial',
    amount: full ? t.amount : Math.max(10, Math.round(t.amount * (0.3 + rng() * 0.6) / 10) * 10),
    store: t.store, storeName: t.storeName,
  });
}
REFUNDS.sort((a, b) => b.date - a.date);

const CB_REASONS = ['Goods or services not received', 'Unauthorized transaction', 'Duplicate charge', 'Product not as described', 'Credit not processed'];
const CB_STAGES = [{ v: 'Retrieval Request', w: 3 }, { v: 'First Chargeback', w: 6 }, { v: 'Pre-Arbitration', w: 2 }, { v: 'Arbitration', w: 1 }];
const CHARGEBACKS = [];
for (const t of TXNS) {
  if (t.status !== 'success' || !['Card', 'Wallet'].includes(t.type) || rng() > 0.03) continue;
  const date = new Date(t.date.getTime() + (5 + rng() * 30) * 864e5);
  if (date > NOW) continue;
  const ageD = (NOW - date) / 864e5;
  const status = ageD < 2 ? 'Initial' : ageD < 7 ? pick(['Waiting', 'Waiting', 'Processing']) : pick(['Submit To Bank', 'Success', 'Cancel', 'Cancel']);
  CHARGEBACKS.push({
    ref: `CB${alnum(10)}`, txn: t, date, status,
    respondBy: addDays(date, 7),
    stage: wpick(CB_STAGES).v,
    reason: pick(CB_REASONS),
    amount: t.amount, bank: t.type === 'Card' ? t.issuer : pick(ISSUERS), // wallet cards are issued by a bank too
    store: t.store, storeName: t.storeName,
  });
}
CHARGEBACKS.sort((a, b) => b.date - a.date);

const REFUND_BY_TXN = new Map(REFUNDS.map(r => [r.txn.id, r]));
const CB_BY_TXN = new Map(CHARGEBACKS.map(c => [c.txn.id, c]));

// Settlements: one payout per store per business day, paid next day at 11:00 AM (mock rule).
// Held payouts are forwarded and added to the store's next settlement. A payout the bank returned
// (e.g. account name mismatch) is "Bounced": it is forwarded the same way, but the bank details need fixing first.
const SETTLE_TYPE = { demo_dhanmondi: 'Both', demo_gulshan: 'Qr Payment', demo_online: 'Online' };
const STORE_CODE = { demo_dhanmondi: 'DHN', demo_gulshan: 'GUL', demo_online: 'ONL' };
const STORE_BANK = {
  demo_dhanmondi: { payee: 'Demo Merchant Ltd.', bank: 'City Bank', branch: 'Dhanmondi', account: `•••• •••• ${digits(4)}`, routing: `•••••${digits(4)}` },
  demo_gulshan: { payee: 'Demo Merchant Ltd.', bank: 'BRAC Bank', branch: 'Gulshan Avenue', account: `•••• •••• ${digits(4)}`, routing: `•••••${digits(4)}` },
  demo_online: { payee: 'Demo Merchant Ltd.', bank: 'Eastern Bank', branch: 'Motijheel', account: `•••• •••• ${digits(4)}`, routing: `•••••${digits(4)}` },
};
const HOLD_REASONS = [
  { reason: 'Returned by beneficiary bank — account name mismatch', bounce: true },
  { reason: 'Held for KYC document review', bounce: false },
];
const SETTLEMENTS = [];
{
  const groups = new Map();
  for (const t of TXNS) {
    if (t.status !== 'success' && t.status !== 'refunded') continue;
    const key = `${t.store}|${toDateInput(t.date)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(t);
  }
  const entries = [...groups.entries()]
    .map(([key, txns]) => ({ store: key.split('|')[0], day: startOfDay(txns[0].date), txns }))
    .sort((a, b) => a.day - b.day);
  const carry = {};
  let batch = 4100;
  for (const { store, day, txns } of entries) {
    const next = addDays(day, 1);
    const deducted = [
      ...REFUNDS.filter(r => r.status === 'Success' && r.store === store && r.date >= day && r.date < next).map(r => r.amount),
      ...CHARGEBACKS.filter(c => c.status === 'Success' && c.store === store && c.date >= day && c.date < next).map(c => c.amount),
    ].reduce((s, a) => s + a, 0);
    const summary = [...new Set(txns.map(t => t.type))].map(type => {
      const list = txns.filter(t => t.type === type);
      const fee = list.reduce((s, t) => s + t.fee, 0);
      return { type, count: list.length, ssl: fee * 0.4, bank: fee * 0.6, store: list.reduce((s, t) => s + t.amount - t.fee, 0), deduct: 0 };
    });
    if (deducted) summary.push({ type: 'Refund / Chargeback', count: 0, ssl: 0, bank: 0, store: 0, deduct: deducted });
    const payable = summary.reduce((s, r) => s + r.store - r.deduct, 0);
    const opening = carry[store] || 0;
    const settle = opening + payable;
    const date = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1, 11, 0);
    const hold = date <= NOW && rng() < 0.04 ? HOLD_REASONS[rng() < 0.35 ? 0 : 1] : null;
    const status = date > NOW ? 'Pending' : hold ? (hold.bounce ? 'Bounced' : 'On Hold') : 'Paid';
    const paid = status === 'Paid' ? settle : 0;
    const fwd = hold && status !== 'Pending' ? settle : 0;
    carry[store] = fwd;
    const bank = STORE_BANK[store];
    SETTLEMENTS.push({
      ref: `STL${toDateInput(date).slice(2).replace(/-/g, '')}${STORE_CODE[store]}${digits(4)}`,
      batch: batch++,
      date, day, store,
      storeName: STORES.find(s => s.id === store).name,
      type: SETTLE_TYPE[store],
      total: txns.reduce((s, t) => s + t.amount, 0),
      txnCount: txns.length,
      opening, payable, settle, paid, fwd, status,
      holdReason: hold?.reason || null,
      bounce: !!hold?.bounce,
      summary, bank,
      payments: status === 'Paid' ? [{ sl: 1, ref: `BEFTN${digits(10)}`, payee: bank.payee, amount: paid, bank: bank.bank }] : [],
    });
  }
  SETTLEMENTS.sort((a, b) => b.date - a.date || a.store.localeCompare(b.store));
}

// Financial years run 1 July – 30 June (Bangladesh / NBR tax year). Monthly figures are synthetic.
const FY_STORE_SINCE = { demo_dhanmondi: new Date(2022, 0, 1), demo_gulshan: new Date(2023, 2, 1), demo_online: new Date(2024, 8, 1) };
const FY_SHARE = { demo_dhanmondi: 0.42, demo_gulshan: 0.25, demo_online: 0.33 };
const FY_SEASON = [1, 1, .95, 1.05, 1.1, 1.25, 1.05, .95, 1.1, 1.2, 1.3, 1.0]; // Jul → Jun
const CURRENT_FY = NOW.getMonth() >= 6 ? NOW.getFullYear() : NOW.getFullYear() - 1;
const FY_YEARS = [CURRENT_FY, CURRENT_FY - 1, CURRENT_FY - 2, CURRENT_FY - 3];
const fyLabel = (y) => `${y}–${y + 1}`;

function fyMonths(y, storeId) {
  const months = [];
  for (let m = 0; m < 12; m++) {
    const start = new Date(y, 6 + m, 1);
    if (start > NOW) break;
    const end = new Date(y, 7 + m, 0, 23, 59, 59);
    const active = start >= FY_STORE_SINCE[storeId] || end >= FY_STORE_SINCE[storeId];
    let gross = 0;
    if (active) {
      const r = mulberry32(y * 1000 + m * 10 + STORES.findIndex(s => s.id === storeId))();
      const years = (start - new Date(2023, 6, 1)) / (365 * 864e5);
      const elapsed = end > NOW ? (NOW - start) / (end - start) : 1;
      gross = Math.round(1.55e6 * Math.pow(1.3, years) * FY_SEASON[m] * FY_SHARE[storeId] * (0.9 + r * 0.2) * elapsed / 10) * 10;
    }
    const fees = gross * 0.017;
    const refunds = gross * 0.008;
    months.push({ start, txns: Math.round(gross / 3900), gross, fees, refunds, net: gross - fees - refunds });
  }
  return months;
}

function fyStatus(y, storeId) {
  if (y === CURRENT_FY) return 'In Progress';
  if (y === CURRENT_FY - 1 && storeId === 'demo_gulshan') return 'Processing';
  return 'Generated';
}

// Payment products (links, invoices, QR, EMI). Kept in memory so create / activate / send work in the prototype.
const idHash = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const LINK_NAMES = ['Eid Collection Pre-order', 'Monthly Subscription Box', 'Workshop Registration', 'Gift Card', 'Custom Order Advance', 'Delivery Charge', 'Membership Renewal', 'Course Fee — Batch 7', 'Event Ticket', 'Corporate Order Deposit'];
const DEFAULT_LINK_COLORS = { leftBg: '#295cab', leftText: '#ffffff', rightBg: '#ffffff', rightText: '#0f172a' };
// Fields a merchant can show on the customer page ("Click to add customize fields" in the old panel).
const LINK_CUSTOM_FIELDS = ['Customer Name', 'Customer Address Line 1', 'Customer Address Line 2', 'Customer City', 'Customer State', 'Customer Postcode', 'Customer Country', 'Customer Email', 'Customer Phone', 'Customer Fax', 'Shipment Name', 'Shipment Address 1', 'Shipment Address 2', 'Shipment City', 'Shipment State', 'Shipment Postcode', 'Shipment Country', 'Product Amount', 'VAT', 'TDS', 'Discount Amount', 'Convenience Fee', 'Additional Field A', 'Additional Field B', 'Additional Field C', 'Additional Field D'];
const LINK_FIELD_TYPES = ['Text Field', 'Select Field', 'Date Field'];
const linkUrl = (ref) => `https://uat-invoice.sslcommerz.com/invoice/pay?refer=${ref}`;
const PAYMENT_LINKS = LINK_NAMES.map((name, i) => {
  const store = wpick(STORES);
  const fixed = rng() < 0.6;
  const amount = fixed ? Math.round((500 + rng() * 9500) / 50) * 50 : null;
  const date = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() - 2 - Math.floor(rng() * 110), 9 + Math.floor(rng() * 9), Math.floor(rng() * 60));
  const payments = TXNS.filter(t => t.store === store.id && t.status === 'success' && t.date > date && idHash(t.id) % LINK_NAMES.length === i)
    .map(t => ({ txn: t, date: t.date, amount: fixed ? amount : t.amount, customer: t.customer }));
  return {
    ref: alnum(13), name, store: store.id, storeName: store.name, date,
    alias: rng() < 0.4 ? 'Mobile Number' : '', buttonName: 'Pay Now',
    amountType: fixed ? 'Fixed' : 'Dynamic', amount, amountList: '', productList: '', category: '', cart: 'No',
    preQrApi: '', billApi: '', ipnUrl: store.id === 'demo_online' ? 'https://shop.example.com/ipn' : '', smsMobile: '',
    termsUrl: '', showTerms: 'No', validity: '0', topMessage: '', footerMessage: '', banner: '',
    customOn: false, custom: {},
    colors: { ...DEFAULT_LINK_COLORS },
    active: rng() > 0.15,
    payments,
  };
}).sort((a, b) => b.date - a.date);

// Digital invoices are billed against a payment link configuration ("Choose a Invoice Configuration").
const INVOICE_ITEMS = [['Website maintenance (monthly)', 15000], ['Logo design', 8000], ['Catering — per guest', 450], ['Bulk order — T-shirts', 650], ['Consultation hour', 2500], ['Annual service contract', 36000], ['Delivery charge', 120], ['Installation fee', 3000]];
const INVOICE_STATUSES = ['Unpaid', 'Paid', 'Canceled'];
const invoiceTotal = (inv) => inv.items.reduce((s, it) => s + it.qty * it.price, 0);
// "0" validity means the invoice stays payable for at most one month.
const invoiceExpiry = (date, validity) => endOfDay(addDays(date, Number(validity) > 0 ? Number(validity) : 30));
const INVOICES = Array.from({ length: 30 }, () => {
  const link = pick(PAYMENT_LINKS);
  const issued = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() - Math.floor(rng() * 75), 10 + Math.floor(rng() * 8), Math.floor(rng() * 60));
  const date = issued > NOW ? new Date(NOW.getTime() - 30 * 60e3) : issued;
  const items = Array.from({ length: 1 + Math.floor(rng() * 3) }, () => {
    const [desc, price] = pick(INVOICE_ITEMS);
    return { desc, qty: price > 5000 ? 1 : 1 + Math.floor(rng() * 20), price };
  });
  const name = pick(CUSTOMERS);
  const inv = {
    no: `INV${alnum(13)}`, orderRef: `ORD-${digits(6)}`, config: link.ref, configName: link.name, store: link.store, storeName: link.storeName,
    customer: name, phone: `01•••••${digits(3)}`, email: `${name[0].toLowerCase()}•••••@example.com`, customerId: rng() < 0.3 ? `•••••${digits(4)}` : '',
    date, expires: invoiceExpiry(date, link.validity), items, createdBy: pick(['demo_merchant', 'accounts_team', 'manager_dhanmondi']),
  };
  const r = rng();
  if (r < 0.08) inv.status = 'Canceled';
  else if (r < 0.6 && (NOW - date) / 864e5 > 1) { inv.status = 'Paid'; inv.paidAt = new Date(Math.min(NOW.getTime(), date.getTime() + rng() * 5 * 864e5)); }
  else inv.status = 'Unpaid';
  return inv;
}).sort((a, b) => b.date - a.date);

const QR_CODES = [
  { id: 'QR-DHN-01', store: 'demo_dhanmondi', label: 'Counter 1', terminal: `TID ••••${digits(4)}` },
  { id: 'QR-DHN-02', store: 'demo_dhanmondi', label: 'Counter 2', terminal: `TID ••••${digits(4)}` },
  { id: 'QR-GUL-01', store: 'demo_gulshan', label: 'Main counter', terminal: `TID ••••${digits(4)}` },
  { id: 'QR-ONL-01', store: 'demo_online', label: 'Delivery rider', terminal: `TID ••••${digits(4)}` },
];

// EMI banks, tenures and store rates (% charged to the store), as listed on the old panel's EMI Settings.
const EMI_DEFAULT_RATE = { 3: 3.0, 6: 4.5, 9: 6.5, 12: 8.5, 18: 11.5, 24: 15.5, 30: 16.5, 36: 19.5 };
const [EMI_T8, EMI_T36, EMI_T24, EMI_T12] = [[3, 6, 9, 12, 18, 24, 30, 36], [3, 6, 9, 12, 18, 24, 36], [3, 6, 9, 12, 18, 24], [3, 6, 9, 12]];
const EMI_BANKS = [
  { name: 'AB BANK LIMITED', tenures: EMI_T8 },
  { name: 'AL-ARAFAH ISLAMI BANK LIMITED', tenures: EMI_T36 },
  { name: 'BANK ASIA LIMITED', tenures: EMI_T24 },
  { name: 'BRAC BANK LIMITED', tenures: EMI_T36 },
  { name: 'CITY BANK LIMITED', tenures: EMI_T8 },
  { name: 'DHAKA BANK LIMITED', tenures: EMI_T12 },
  { name: 'DUTCH BANGLA BANK', tenures: EMI_T36 },
  { name: 'EASTERN BANK', tenures: EMI_T36 },
  { name: 'EXIM BANK', tenures: EMI_T12 },
  { name: 'IFIC BANK', tenures: EMI_T8 },
  { name: 'ISLAMI BANK BANGLADESH', tenures: EMI_T36 },
  { name: 'JAMUNA BANK', tenures: EMI_T36 },
  { name: 'LANKABANGLA FINANCE', tenures: EMI_T24, rates: { ...EMI_DEFAULT_RATE, 3: 3.5 } },
  { name: 'MERCANTILE BANK', tenures: EMI_T8 },
  { name: 'MUTUAL TRUST BANK', tenures: EMI_T36 },
  { name: 'NATIONAL BANK', tenures: EMI_T24 },
  { name: 'NCC BANK', tenures: EMI_T36 },
  { name: 'ONE BANK', tenures: EMI_T12 },
  { name: 'PREMIER BANK', tenures: EMI_T12 },
  { name: 'PRIME BANK', tenures: EMI_T36 },
  { name: 'PUBALI BANK', tenures: EMI_T24 },
  { name: 'SHAHJALAL ISLAMI BANK', tenures: EMI_T12 },
  { name: 'SOUTHEAST BANK', tenures: EMI_T8 },
  { name: 'STANDARD BANK', tenures: EMI_T24 },
  { name: 'STANDARD CHARTERED BANK', tenures: EMI_T36, rates: { 3: 3.5, 6: 5.5, 9: 8.0, 12: 10.5, 18: 13.5, 24: 17.5, 36: 22.5 } },
  { name: 'UNITED COMMERCIAL BANK', tenures: [3, 6, 9, 12, 24] },
  { name: 'Trust Bank Limited', tenures: EMI_T36 },
  { name: 'Modhumoti Bank Limited', tenures: EMI_T24 },
  { name: 'NRB COMMERCIAL BANK LTD', tenures: EMI_T24 },
  { name: 'NRB Bank Limited', tenures: EMI_T36 },
  { name: 'Meghna Bank Limited', tenures: EMI_T36 },
  { name: 'SBAC Bank', tenures: EMI_T24 },
  { name: 'Midland Bank Ltd', tenures: EMI_T8 },
  { name: 'Uttara Bank Ltd', tenures: EMI_T24 },
  { name: 'Shimanto Bank', tenures: EMI_T24 },
  { name: 'Community Bank Bangladesh Limited', tenures: EMI_T36 },
  { name: 'Bengal Commercial Bank Ltd', tenures: [3, 6, 9, 12, 24, 36] },
  { name: 'CITIZENS BANK PLC', tenures: EMI_T12 },
].map(b => ({ ...b, rates: b.rates || EMI_DEFAULT_RATE }));
const EMI_STORES = { demo_dhanmondi: true, demo_gulshan: false, demo_online: true };
// Saved EMI Settings per store: model, which banks show as a channel and which tenures are on.
const EMI_MODELS = [
  ['disable', 'Disable'],
  ['params', 'Enable (EMI with parameters)'],
  ['auto', 'AUTO EMI (EMI with specific amount & charges will bear by MERCHANT)'],
  ['global', 'Global EMI (EMI with specific amount & charges will bear by CUSTOMER/USER)'],
];
const EMI_CONFIG = Object.fromEntries(STORES.map(st => [st.id, {
  model: EMI_STORES[st.id] ? 'params' : 'disable',
  banks: Object.fromEntries(EMI_BANKS.map(b => [b.name, { on: true, tenures: Object.fromEntries(b.tenures.map(m => [m, true])) }])),
}]));
const EMI_REQUESTS = [];
for (const t of TXNS) {
  if (t.type !== 'Card' || t.status !== 'success' || t.amount < 5000 || !EMI_STORES[t.store] || rng() > 0.3) continue;
  const bank = pick(EMI_BANKS);
  const tenure = pick(bank.tenures);
  const ageD = (NOW - t.date) / 864e5;
  let status, bankStatus;
  if (ageD < 1) { status = 'Initial'; bankStatus = 'Not Sent'; }
  else if (ageD < 3) { status = 'Processing'; bankStatus = pick(['Not Sent', 'Sent']); }
  else if (rng() < 0.78) { status = 'Requested'; bankStatus = rng() < 0.85 ? 'Approved' : 'Sent'; }
  else { status = 'Declined'; bankStatus = 'Cancel'; }
  EMI_REQUESTS.push({
    ref: `EMI${alnum(9)}`, txn: t, date: new Date(t.date.getTime() + 90e3), store: t.store, storeName: t.storeName,
    bank: bank.name, tenure, rate: bank.rates[tenure], charge: Math.round(t.amount * bank.rates[tenure]) / 100,
    status, bankStatus, remarks: 'Customer opted for EMI at checkout',
  });
}

// Analytics attributes for each mock transaction: customer location, mobile operator, device,
// card issuer and saved-card use. Uses its own random stream so the data above stays unchanged.
const DIVISIONS = [
  { v: 'Dhaka', w: 48, districts: [{ v: 'Dhaka', w: 70 }, { v: 'Gazipur', w: 12 }, { v: 'Narayanganj', w: 10 }, { v: 'Tangail', w: 8 }] },
  { v: 'Chattogram', w: 18, districts: [{ v: 'Chattogram', w: 70 }, { v: "Cox's Bazar", w: 15 }, { v: 'Cumilla', w: 15 }] },
  { v: 'Khulna', w: 7, districts: [{ v: 'Khulna', w: 70 }, { v: 'Jashore', w: 30 }] },
  { v: 'Rajshahi', w: 7, districts: [{ v: 'Rajshahi', w: 60 }, { v: 'Bogura', w: 40 }] },
  { v: 'Sylhet', w: 6, districts: [{ v: 'Sylhet', w: 80 }, { v: 'Moulvibazar', w: 20 }] },
  { v: 'Rangpur', w: 5, districts: [{ v: 'Rangpur', w: 70 }, { v: 'Dinajpur', w: 30 }] },
  { v: 'Mymensingh', w: 5, districts: [{ v: 'Mymensingh', w: 100 }] },
  { v: 'Barishal', w: 4, districts: [{ v: 'Barishal', w: 100 }] },
];
const FOREIGN_COUNTRIES = [{ v: 'United States', w: 30 }, { v: 'United Kingdom', w: 20 }, { v: 'United Arab Emirates', w: 15 }, { v: 'Saudi Arabia', w: 12 }, { v: 'Canada', w: 8 }, { v: 'Malaysia', w: 8 }, { v: 'Singapore', w: 7 }];
const OPERATORS = ['Grameenphone', 'Robi', 'Banglalink', 'Teletalk'];
{
  const r = mulberry32(9090);
  const wp = (arr) => { let x = r() * arr.reduce((s, a) => s + a.w, 0); for (const a of arr) { if ((x -= a.w) < 0) return a; } return arr[arr.length - 1]; };
  for (const t of TXNS) {
    const online = t.store === 'demo_online';
    const failed = t.status === 'failed';
    if (online && r() < 0.03) { t.division = 'International'; t.district = wp(FOREIGN_COUNTRIES).v; }
    else if (!online && r() < 0.92) { t.division = 'Dhaka'; t.district = 'Dhaka'; }
    else { const d = wp(DIVISIONS); t.division = d.v; t.district = wp(d.districts).v; }

    // OTP failures lean towards one operator in the mock, to show how the page surfaces it.
    t.operator = wp(t.reason === 'OTP verification failed'
      ? [{ v: 'Grameenphone', w: 30 }, { v: 'Robi', w: 20 }, { v: 'Banglalink', w: 42 }, { v: 'Teletalk', w: 8 }]
      : [{ v: 'Grameenphone', w: 47 }, { v: 'Robi', w: 26 }, { v: 'Banglalink', w: 23 }, { v: 'Teletalk', w: 4 }]).v;

    if (t.method === 'Bangla QR') {
      Object.assign(t, { integration: 'QR', device: 'Mobile', os: r() < 0.8 ? 'Android' : 'iOS', browser: 'Banking / MFS app' });
    } else {
      t.integration = online && r() < 0.3 ? 'Mobile SDK' : 'Hosted page';
      t.device = t.integration === 'Mobile SDK' ? 'Mobile' : wp([{ v: 'Mobile', w: 62 }, { v: 'Desktop', w: 30 }, { v: 'Tablet', w: 8 }]).v;
      t.os = t.device === 'Mobile' ? (r() < 0.8 ? 'Android' : 'iOS') : t.device === 'Tablet' ? (r() < 0.55 ? 'Android' : 'iPadOS') : wp([{ v: 'Windows', w: 85 }, { v: 'macOS', w: 12 }, { v: 'Linux', w: 3 }]).v;
      t.browser = t.integration === 'Mobile SDK' ? 'In-app (SDK)'
        : ['iOS', 'iPadOS', 'macOS'].includes(t.os) && r() < 0.7 ? 'Safari'
        : t.device === 'Desktop' ? wp([{ v: 'Chrome', w: 72 }, { v: 'Edge', w: 16 }, { v: 'Firefox', w: 12 }]).v
        : wp([{ v: 'Chrome', w: 55 }, { v: 'Facebook in-app', w: failed ? 40 : 15 }, { v: 'Samsung Internet', w: 12 }, { v: 'Opera', w: 6 }]).v;
    }

    if (t.type === 'Card' || t.type === 'Wallet') {
      const foreignChance = t.method === 'DBBL Nexus' ? 0 : (online ? 0.14 : 0.06) * (failed ? 2 : 1);
      t.issuerLocation = r() < foreignChance ? 'Foreign' : 'Local';
      t.issuerCountry = t.issuerLocation === 'Foreign' ? wp(FOREIGN_COUNTRIES).v : 'Bangladesh';
      t.issuerBank = t.issuerLocation === 'Foreign' ? `Foreign issuer (${t.issuerCountry})`
        : t.method === 'DBBL Nexus' ? 'Dutch-Bangla Bank'
        : t.type === 'Card' ? t.issuer : ISSUERS[Math.floor(r() * ISSUERS.length)];
      if (online) {
        t.savedCard = r() < (t.status === 'success' ? 0.32 : 0.12);
        t.cardSaved = !t.savedCard && t.status === 'success' && r() < 0.15;
        if (t.savedCard) t.auth = 4 + Math.floor(r() * 12); // saved cards skip card entry
      }
    }
    t.custId = `${t.store}-${Math.floor(r() * (online ? 700 : 400))}`;
  }
}

// Old merchant panel fields for each transaction: SSL / bank ids, the bank gateway, risk flag,
// bank round trip, merchant API validation, discount, EMI, escrow and the customer's IP.
// Own random stream, so the data above stays unchanged. IPs use documentation ranges only.
const BANK_GATEWAY = { 'Mobile Banking': (t) => `${t.method} Limited`, QR: () => 'Bangla QR (NPSB)', Wallet: () => 'Google Pay', 'Internet Banking': () => 'City Bank PLC' };
const DISCOUNT_REMARKS = ['Puja Special campaign', 'Card Holder Weekend', 'Bank partner offer'];
{
  const r = mulberry32(4242);
  const ra = (n) => Array.from({ length: n }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'[Math.floor(r() * 57)]).join('');
  const rd = (n) => Array.from({ length: n }, () => Math.floor(r() * 10)).join('');
  const paidDays = new Set(SETTLEMENTS.filter(x => x.status === 'Paid').map(x => `${x.store}|${+x.day}`));
  for (const t of TXNS) {
    const ok = t.status === 'success' || t.status === 'refunded';
    const stamp = `${String(t.date.getFullYear()).slice(2)}${pad(t.date.getMonth() + 1)}${pad(t.date.getDate())}${pad(t.date.getHours())}${pad(t.date.getMinutes())}${pad(t.date.getSeconds())}`;
    t.sslId = `${stamp}${rd(4)}${ra(13)}`;
    t.tid = rd(9);
    t.gateway = t.type === 'Card' ? (t.issuerBank || t.issuer) : BANK_GATEWAY[t.type](t);
    t.cardType = `${t.method.toUpperCase()}-${t.gateway}`;
    if (['bKash', 'Nagad'].includes(t.method)) t.mfsTrxId = ra(10).toUpperCase();
    t.ip = r() < 0.5 ? `203.0.113.${1 + Math.floor(r() * 254)}` : `198.51.100.${1 + Math.floor(r() * 254)}`;
    t.risk = t.type === 'Card' && ok && r() < 0.03;
    t.directedAt = new Date(t.date.getTime() + 3e3);
    t.returnedAt = t.status === 'pending' ? null : new Date(t.date.getTime() + t.auth * 1e3);
    t.apiValidated = ok && r() < 0.93;
    t.settled = ok && paidDays.has(`${t.store}|${+startOfDay(t.date)}`);
    t.viewed = !ok || NOW - t.date > 3 * 864e5 || r() < 0.6; // unviewed success payments get the "read" mark
    t.onHold = ok && !t.settled && r() < 0.015;
    if (ok && r() < 0.06) { t.discountPct = r() < 0.5 ? 5 : 10; t.discountRemarks = DISCOUNT_REMARKS[Math.floor(r() * DISCOUNT_REMARKS.length)]; }
    if (t.type === 'Card' && ok && t.amount >= 5000 && r() < 0.12) t.emiTenure = [3, 6, 9, 12][Math.floor(r() * 4)];
    if (t.store === 'demo_online' && ok && r() < 0.06) { t.escrow = true; t.shipment = r() < 0.5; t.invoiceId = `ORD-${rd(6)}`; }
  }
}

// Old panel refund / chargeback fields: request vs approval status, merchant reference code,
// approval remarks, who approved and when. Chargebacks get the merchant's own decision ("My Status").
const MERCHANT_NAME = 'Demo Merchant Ltd.';
{
  const r = mulberry32(5151);
  const rd = (n) => Array.from({ length: n }, () => Math.floor(r() * 10)).join('');
  const later = (d, h) => new Date(Math.min(NOW.getTime(), d.getTime() + h * 3600e3));
  for (const x of REFUNDS) {
    x.requestStatus = x.status === 'Initiate' ? 'Processing' : x.status === 'Cancel' && r() < 0.5 ? 'Cancel' : 'Success';
    x.merchantRef = r() < 0.4 ? `MR-${rd(6)}` : '';
    if (['Submit To Bank', 'Success', 'Cancel'].includes(x.status)) {
      x.approvedOn = later(x.date, 2 + r() * 20);
      x.approvedBy = 'SSL Operations';
      x.approvalRemarks = x.status === 'Success' ? `Refund Trans ID- R${rd(10)}` : x.status === 'Cancel' ? (x.requestStatus === 'Cancel' ? 'Cancelled at merchant request' : 'Refund window expired for this channel') : 'Submitted to the issuing bank';
    }
  }
  for (const c of CHARGEBACKS) {
    c.myStatus = c.status === 'Initial' ? 'Initial' : c.status === 'Waiting' ? 'Waiting'
      : c.status === 'Success' ? 'Approve' : c.status === 'Cancel' ? (r() < 0.8 ? 'Deny' : 'Cancel') : r() < 0.5 ? 'Approve' : 'Deny';
    c.merchantRef = r() < 0.3 ? `MR-${rd(6)}` : '';
    c.requestedBy = 'SSL Dispute Desk';
    if (!['Initial', 'Waiting'].includes(c.myStatus)) {
      c.approvedOn = later(c.date, 6 + r() * 60);
      c.approvedBy = REQUESTERS[Math.floor(r() * REQUESTERS.length)];
      c.approvalRemarks = c.myStatus === 'Approve' ? 'Full refund' : c.myStatus === 'Deny' ? 'Delivery proof shared with the bank' : 'Withdrawn by the bank';
    }
  }
}

// Campaigns (mock), following the old panel. Partnership-initiated campaigns are set up by SSL / the bank;
// stores take part by filling in their discount before the last participation date. Merchant-initiated
// campaigns are the merchant's own, with a per-store discount table. Kept in memory so update / create work.
const dayAt = (offset) => startOfDay(addDays(TODAY, offset));
// Old panel tracking ids: 6 random characters + ddMMyyyy + HHmmss of creation.
const trackingId = (d) => `${alnum(6)}${pad(d.getDate())}${pad(d.getMonth() + 1)}${d.getFullYear()}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
const CAMPAIGN_BANKS = ['AB BANK LIMITED', 'AL-ARAFAH ISLAMI BANK LIMITED', 'BANK ASIA LIMITED', 'BRAC BANK LIMITED', 'CITY BANK LIMITED', 'DHAKA BANK LIMITED', 'DUTCH BANGLA BANK', 'EASTERN BANK', 'EXIM BANK', 'FIRST SECURITY ISLAMI BANK', 'IFIC BANK', 'ISLAMI BANK BANGLADESH', 'JAMUNA BANK', 'MERCANTILE BANK', 'MUTUAL TRUST BANK', 'NCC BANK', 'ONE BANK', 'PRIME BANK', 'PUBALI BANK', 'SOUTHEAST BANK', 'STANDARD CHARTERED BANK', 'UNITED COMMERCIAL BANK'];
const CAMPAIGN_MFS = ['Bkash', 'Upay', 'Nagad', 'Islamic Wallet', 'Pocket', 'Pathao Pay', 'STPay'];
const CAMPAIGN_IB = ['AB Direct'];
const PARTNER_STATUSES = ['Pending', 'Sent to Bank (Closed)'];
const MC_STATUSES = ['Created', 'Approved', 'Canceled'];
const pDiscount = (pct, burned, minOrder, maxPerTxn, perUser, remarks = '') => ({ pct, burned, minOrder, maxPerTxn, perUser, remarks });
const PARTNER_CAMPAIGNS = [
  { name: 'Winter Shopping Campaign 2026', bank: '', start: 14, end: 45, last: 8, created: -6, status: 'Pending', discounts: {} },
  { name: 'Victory Day Campaign 2026', bank: 'CITY BANK LIMITED', start: 40, end: 50, last: 30, created: -2, status: 'Pending', discounts: {} },
  { name: 'Black Friday Campaign 2026', bank: '', start: 31, end: 36, last: 20, created: -9, status: 'Pending', discounts: { demo_online: pDiscount(15, 'No', 1500, 500, 2, 'Online store only') } },
  { name: 'Durga Puja Campaign 2026', bank: 'BRAC BANK LIMITED', start: -20, end: 2, last: -25, created: -40, status: 'Sent to Bank (Closed)', discounts: { demo_dhanmondi: pDiscount(10, 'No', 1000, 300, 2), demo_gulshan: pDiscount(10, 'No', 1000, 300, 2) } },
  { name: 'Eid Ul Adha Campaign 2026', bank: '', start: -150, end: -125, last: -155, created: -170, status: 'Sent to Bank (Closed)', discounts: { demo_dhanmondi: pDiscount(12, 'Yes', 2000, 400, 1, 'Festive offer'), demo_online: pDiscount(12, 'Yes', 2000, 400, 1) } },
  { name: 'Ramadan Campaign 2026', bank: '', start: -240, end: -210, last: -245, created: -260, status: 'Pending', discounts: {} },
  { name: 'Pohela Boishakh Campaign 2026', bank: 'EASTERN BANK', start: -195, end: -190, last: -200, created: -215, status: 'Sent to Bank (Closed)', discounts: { demo_gulshan: pDiscount(8, 'No', 800, 200, 3) } },
].map(c => {
  const created = new Date(dayAt(c.created).getTime() + (9 + Math.floor(rng() * 9)) * 3600e3 + Math.floor(rng() * 3600) * 1e3);
  return { ...c, id: `PC${alnum(6)}`, tracking: trackingId(created), created, start: dayAt(c.start), end: endOfDay(dayAt(c.end)), last: endOfDay(dayAt(c.last)) };
});

const mDiscount = (pct, observed, minOrder, maxPerTxn, maxPerCard, perUser, remarks = '') => ({ pct, observed, minOrder, maxPerTxn, maxPerCard, perUser, remarks });
const MERCHANT_CAMPAIGNS = [
  { name: 'Year End Sale', start: 20, end: 35, created: -1, communicator: 'SSL', bins: [], banks: ['BRAC BANK LIMITED', 'CITY BANK LIMITED', 'EASTERN BANK'], mfs: ['Bkash'], ib: [], status: 'Created', discounts: { demo_dhanmondi: mDiscount(10, 'Yes', 1500, 300, 600, 2), demo_online: mDiscount(10, 'Yes', 1500, 300, 600, 2) } },
  { name: 'Card Holder Weekend', start: -3, end: 10, created: -12, communicator: 'Merchant', bins: ['412345', '523456'], banks: [], mfs: [], ib: [], status: 'Approved', discounts: { demo_online: mDiscount(15, 'Yes', 2000, 500, 1000, 1, 'Selected BINs only') } },
  { name: 'Puja Special', start: -30, end: -14, created: -45, communicator: 'SSL', bins: [], banks: ['DUTCH BANGLA BANK', 'PRIME BANK'], mfs: ['Bkash', 'Nagad'], ib: ['AB Direct'], status: 'Approved', discounts: { demo_dhanmondi: mDiscount(8, 'No', 1000, 200, 400, 2), demo_gulshan: mDiscount(8, 'No', 1000, 200, 400, 2) } },
  { name: 'Back to School', start: -70, end: -60, created: -80, communicator: 'Merchant', bins: ['434567'], banks: [], mfs: [], ib: [], status: 'Canceled', discounts: { demo_gulshan: mDiscount(5, 'Yes', 800, 100, 200, 1) } },
].map(c => {
  const created = new Date(dayAt(c.created).getTime() + (10 + Math.floor(rng() * 8)) * 3600e3 + Math.floor(rng() * 3600) * 1e3);
  return { ...c, id: `MC${alnum(6)}`, tracking: trackingId(created), created, start: dayAt(c.start), end: endOfDay(dayAt(c.end)) };
});

// Support (mock): transaction tickets, general tickets & queries, and service delivery requests.
const AGENTS = ['Support Desk — Rafiq', 'Support Desk — Nabila', 'Your KAM — Farzana'];
const ymd = (d) => `${String(d.getFullYear()).slice(2)}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
const capAt = (d) => new Date(Math.min(NOW.getTime(), d.getTime()));
const TXN_QUERIES = ['Transaction status confirmation', 'Amount debited but order not confirmed', 'Refund status', 'Settlement not received', 'Duplicate payment', 'Customer dispute'];
const TXN_QUERY_TEXT = {
  'Transaction status confirmation': 'Customer says the payment went through but our system shows it as failed. Please confirm the final status.',
  'Amount debited but order not confirmed': 'Customer was charged but the order was not created on our side. Please check with the bank.',
  'Refund status': 'Customer is asking when the refund will reach their account.',
  'Settlement not received': 'This payment does not appear in any settlement yet.',
  'Duplicate payment': 'Customer paid twice for the same order. Please advise on the refund.',
  'Customer dispute': 'Customer claims they did not make this payment.',
};
const TXN_REPLY = {
  'Transaction status confirmation': 'The bank confirmed this transaction. The final status is shown on the transaction.',
  'Amount debited but order not confirmed': 'The amount was reversed by the issuer. It reaches the customer within 7–10 working days (mock).',
  'Refund status': 'The refund was submitted to the bank. The customer will receive it within 7–10 working days (mock).',
  'Settlement not received': 'This payment is included in the next settlement batch.',
  'Duplicate payment': 'One of the two payments has been refunded in full.',
  'Customer dispute': 'We shared the authorization details with the issuer. No chargeback has been raised.',
};
const TXN_TICKETS = [];
{
  const pool = TXNS.filter(t => NOW - t.date > 12 * 3600e3);
  for (let i = 0; i < 22; i++) {
    const t = pool[Math.floor(rng() * Math.min(pool.length, 900))];
    const queries = [pick(TXN_QUERIES), ...(rng() < 0.25 ? [pick(TXN_QUERIES)] : [])].filter((q, j, a) => a.indexOf(q) === j);
    const date = capAt(new Date(t.date.getTime() + (1 + rng() * 30) * 3600e3));
    const solved = (NOW - date) > 2 * 864e5 ? rng() < 0.85 : rng() < 0.3;
    const answeredAt = capAt(new Date(date.getTime() + (3 + rng() * 40) * 3600e3));
    const agent = pick(AGENTS);
    const user = pick(REQUESTERS);
    TXN_TICKETS.push({
      no: `TT${ymd(date)}${digits(4)}`, date, txn: t, store: t.store, storeName: t.storeName, queries,
      status: solved ? 'Solved' : 'Requested', requestedBy: user, role: user === 'demo_merchant' ? 'Merchant Admin' : 'Store Manager',
      email: `${user[0]}•••••@example.com`, mobile: `01•••••${digits(3)}`,
      note: TXN_QUERY_TEXT[queries[0]],
      feedbackBy: solved ? agent : null, feedbackOn: solved ? answeredAt : null, feedback: solved ? TXN_REPLY[queries[0]] : null,
      messages: [
        { from: 'merchant', name: user, at: date, text: TXN_QUERY_TEXT[queries[0]] },
        ...(solved ? [{ from: 'support', name: agent, at: answeredAt, text: TXN_REPLY[queries[0]] }] : []),
      ],
    });
  }
  TXN_TICKETS.sort((a, b) => b.date - a.date);
}

const ISSUE_TYPES = ['Payment Gateway', 'Qr Related Query', 'Emi Related Query', 'Payment Link', 'Others'];
const GEN_TOPICS = [
  ['Payment Gateway', 'Checkout page not loading on iOS', 'Some iPhone customers see a blank checkout page.', 'screenshot.png'],
  ['Payment Gateway', 'IPN not received for some payments', 'Our server did not receive IPN for a few successful payments yesterday.', null],
  ['Qr Related Query', 'Need a second QR for a new counter', 'We opened a new counter at the Dhanmondi store and need another QR.', null],
  ['Qr Related Query', 'QR payments missing from report', 'Two QR payments from this morning are not in the transaction list.', 'qr_receipt.jpg'],
  ['Emi Related Query', 'Enable EMI for Gulshan store', 'Please enable EMI for Demo Store – Gulshan.', 'trade_license.pdf'],
  ['Emi Related Query', 'EMI rate clarification', 'What is the store rate for 24-month EMI with City Bank?', null],
  ['Payment Link', 'Payment link shows expired', 'A reusable link shows "expired" to customers.', 'link_error.png'],
  ['Payment Link', 'Change button color on payment page', 'Can we use our brand color on the pay button?', null],
  ['Others', 'Update settlement bank account', 'We are moving our settlement account to a new bank.', 'bank_letter.pdf'],
  ['Others', 'Add a new portal user', 'Please add our accountant as a read-only user.', null],
  ['Others', 'VAT certificate request', 'Need the VAT certificate for last financial year.', null],
  ['Others', 'Invoice for service charge', 'Please share the service charge invoice for September.', null],
  ['Payment Gateway', 'Card payments failing with 3D Secure', 'Several card payments fail at the OTP step.', null],
  ['Payment Link', 'Payment link for USD', 'Can we create a payment link in USD?', null],
];
const GEN_REPLY = { Completed: 'This is done. Please check and let us know if anything else is needed.', Declined: 'We are unable to process this request. Your KAM will explain the details.', Processing: 'We are looking into this and will update you shortly.' };
const GEN_TICKETS = GEN_TOPICS.map(([type, title, description, attachment], i) => {
  const date = new Date(NOW.getTime() - (2 + rng() * 40 * 24) * 3600e3);
  const ageD = (NOW - date) / 864e5;
  const status = ageD < 1 ? 'Pending' : ageD < 4 ? pick(['Pending', 'Processing']) : rng() < 0.85 ? 'Completed' : 'Declined';
  const agent = pick(AGENTS);
  const user = pick(REQUESTERS);
  const resolvedAt = ['Completed', 'Declined'].includes(status) ? capAt(new Date(date.getTime() + (6 + rng() * 60) * 3600e3)) : null;
  const replyAt = capAt(new Date(date.getTime() + (2 + rng() * 10) * 3600e3));
  return {
    no: `MT${ymd(date)}${digits(4)}`, date, title, type, description, attachment, status,
    remarks: status === 'Declined' ? 'Not supported for this merchant category.' : status === 'Completed' ? 'Resolved' : '—',
    createdBy: user, resolvedBy: resolvedAt ? agent : null, resolvedAt, store: i % 3 === 0 ? 'demo_gulshan' : null,
    messages: [
      { from: 'merchant', name: user, at: date, text: description },
      ...(status !== 'Pending' ? [{ from: 'support', name: agent, at: resolvedAt || replyAt, text: GEN_REPLY[status] }] : []),
    ],
  };
}).sort((a, b) => b.date - a.date);

// Service delivery (old panel): escrow payments wait for the merchant's delivery file
// (SSL Bank ID, Store ID, Delivery Company Code, Delivery Date, Delivered to Phone) before they settle.
const DELIVERY_FILES = [
  { days: 1, rows: 1, found: 0, amount: 0 },
  { days: 3, rows: 19, found: 12, amount: 21140 },
  { days: 9, rows: 50, found: 3, amount: 3890 },
  { days: 16, rows: 8, found: 8, amount: 12650 },
  { days: 27, rows: 4, found: 0, amount: 0 },
].map(f => {
  const uploaded = new Date(NOW.getTime() - (f.days * 24 + 2) * 3600e3);
  const stamp = Math.floor(uploaded.getTime() / 1000);
  return { ...f, uploaded, name: `${stamp}${digits(4)}_ServiceDeliverables_${stamp - 12}.csv`, status: f.found ? 'Success' : 'Failed' };
});

// Account (mock): store configuration, store groups and portal users. Credentials are never part of this data.
const ACCOUNT_STORES = [
  { id: 'demo_dhanmondi', name: 'Demo Store – Dhanmondi', type: 'Online & QR', baseUrl: 'https://dhanmondi.example.com', currency: 'BDT', emi: 'EMI Enabled', status: 'Active', created: new Date(2022, 0, 12), address: 'House [PLACEHOLDER], Road [PLACEHOLDER], Dhanmondi, Dhaka' },
  { id: 'demo_gulshan', name: 'Demo Store – Gulshan', type: 'Only QR', baseUrl: '', currency: 'BDT', emi: 'No EMI', status: 'Active', created: new Date(2023, 2, 4), address: 'House [PLACEHOLDER], Gulshan Avenue, Dhaka' },
  { id: 'demo_online', name: 'Demo Online Shop', type: 'Only Online', baseUrl: 'https://shop.example.com', currency: 'BDT', emi: 'EMI Enabled', status: 'Active', created: new Date(2024, 8, 1), address: 'House [PLACEHOLDER], Banani, Dhaka' },
  { id: 'demo_usd', name: 'Demo Export Shop (USD)', type: 'Only Online', baseUrl: 'https://export.example.com', currency: 'USD', emi: 'No EMI', status: 'Active', created: new Date(2026, 8, 20), address: 'House [PLACEHOLDER], Banani, Dhaka' },
  { id: 'demo_popup', name: 'Demo Pop-up Store', type: 'Only QR', baseUrl: '', currency: 'BDT', emi: 'No EMI', status: 'Inactive', created: new Date(2025, 11, 1), address: 'Bashundhara City, Dhaka' },
];
const STORE_GROUPS = [
  { id: 'G1', name: 'All Stores', description: 'Every store under this merchant account.', stores: ACCOUNT_STORES.map(s => s.id), system: true, active: true, created: new Date(2022, 0, 12, 11, 1) },
  { id: 'G2', name: 'Physical Stores', description: 'Counters that take Bangla QR and cards in person.', stores: ['demo_dhanmondi', 'demo_gulshan'], active: true, created: new Date(2023, 2, 4, 13, 43) },
  { id: 'G3', name: 'Online Business', description: 'Web and app checkout stores.', stores: ['demo_online', 'demo_usd'], active: true, created: new Date(2024, 8, 1, 10, 10) },
  { id: 'G4', name: 'Pop-up Events', description: 'Seasonal fair counters.', stores: ['demo_popup'], active: false, created: new Date(2025, 11, 1, 17, 53) },
];
// Old panel user roles and Merchant App roles.
const USER_ROLES = ['Admin and Finance', 'ESCROW Report View', 'Escrow User - Report and Settlement', 'ECOMMERCE', 'Manage Invoice and View Reports', 'Merchant Admin', 'Merchant View and Settlement', 'QR Merchant Admin', 'Report View', 'Supports', 'Supports and Settlement', 'Transaction Tracking by ID'];
const APP_ROLES = [['account_opening', 'Account Opening'], ['counter_user', 'Counter User'], ['cpqrc_user', 'cpqrc_user'], ['emi_locker_user', 'emi_locker_user'], ['hyperlocal-delivery', 'hyperlocal-delivery'], ['internal-hyperlocal-delivery', 'internal-hyperlocal-delivery'], ['loan-user', 'loan-user'], ['pdr', 'PDR']];
const USERS = [
  { login: 'demo_merchant', first: 'Demo', last: 'Admin', role: 'Merchant Admin', group: 'G1', status: 'Active', lastLogin: addDays(NOW, -1), appRole: '' },
  { login: 'manager_dhanmondi', first: 'Store Manager', last: 'Dhanmondi', role: 'Merchant View and Settlement', group: 'G2', status: 'Active', lastLogin: addDays(NOW, -2), appRole: 'counter_user' },
  { login: 'manager_gulshan', first: 'Store Manager', last: 'Gulshan', role: 'QR Merchant Admin', group: 'G2', status: 'Active', lastLogin: addDays(NOW, -5), appRole: 'counter_user' },
  { login: 'accounts_team', first: 'Accounts', last: 'Team', role: 'Admin and Finance', group: 'G1', status: 'Active', lastLogin: addDays(NOW, -3), appRole: '' },
  { login: 'care_agent', first: 'Customer Care', last: 'Agent', role: 'Supports', group: 'G3', status: 'Active', lastLogin: addDays(NOW, -0.3), appRole: '' },
  { login: 'invoice_user', first: 'Invoice', last: 'User', role: 'Manage Invoice and View Reports', group: 'G3', status: 'Inactive', lastLogin: addDays(NOW, -40), appRole: '' },
  { login: 'old_manager', first: 'Former', last: 'Manager', role: 'Report View', group: 'G2', status: 'Inactive', lastLogin: addDays(NOW, -64), appRole: '' },
].map((u, i) => ({ ...u, middle: '', name: `${u.first} ${u.last}`.trim(), email: `${u.login[0]}•••••@example.com`, mobile: `01•••••${digits(3)}`, phone: '', addedBy: i ? 'demo_merchant' : 'SSL Onboarding', created: addDays(NOW, -(400 - i * 50)) }));

// Per-store settings from the old Store List menus: contact, IPN and gateway settings, and charges (TDR).
const STORE_SETTINGS = Object.fromEntries(ACCOUNT_STORES.map(st => [st.id, {
  contact: { name: 'Demo Merchant Ltd.', email: 'm•••••@example.com', mobile: '01•••••000', phone: '', fax: '' },
  ipn: { email1: 'o•••••@example.com', email2: '', email3: '', mobile1: '', sms1: false, mobile2: '', sms2: false, listener: st.baseUrl ? `${st.baseUrl}/ipn` : '', listenerOn: !!st.baseUrl },
  gw: { primaryWeb: '#295cab', activeWeb: '#1d4a91', primarySdk: '#295cab', activeSdk: '#1d4a91', payGroup: '', chargeCustomer: 'Disabled' },
}]));

// Settlement switched off by SSL while the store still takes payments (mock). Drives the
// portal-wide banner and the Transaction Profile; only the KAM can turn it back on.
const SETTLEMENT_DISABLED = new Set(['demo_gulshan']);

// Transaction Profile (mock, read-only): what SSL has configured for each store.
// Limits and channels are illustrative; the real profile comes from onboarding / KAM setup.
const TXN_PROFILES = Object.fromEntries(ACCOUNT_STORES.map((st, i) => {
  const qr = st.type !== 'Only Online', online = st.type !== 'Only QR', usd = st.currency === 'USD';
  return [st.id, {
    mid: `MID-${1002450 + i * 7}`, business: ['Retail / Electronics', 'Retail / Grocery', 'E-commerce / Fashion', 'Export / Garments', 'Retail / Events'][i],
    mode: st.status === 'Active' ? 'Live' : 'Sandbox', frequency: usd ? 'T+3' : 'T+1',
    channels: METHODS.filter(m => (online || m.type === 'QR') && (qr || m.type !== 'QR') && !(m.name === 'AMEX' && !usd) && !(m.name === 'Google Pay' && i > 0)).map(m => m.name),
    limits: { minTxn: usd ? 1 : 10, maxTxn: usd ? 5000 : qr && !online ? 50000 : 500000, daily: usd ? 25000 : 2000000, monthly: usd ? 300000 : 30000000 },
    caps: {
      'Regular Payment': online, 'Refund': true, 'Partial Refund': online, 'Digital EMI': st.emi === 'EMI Enabled', 'Payment Link': online,
      'Digital Invoice': online, 'Payment QR': qr, 'Saved Card': st.id === 'demo_online', 'Escrow': st.id === 'demo_online',
    },
  }];
}));

// Others (mock): referrals, FX rates, value added services, SMS credits, FAQ and learning material.
const REFERRAL_CODE = 'DEMO-MRC-7Q4K';
const REFERRAL_BONUS = 1000; // mock bonus per referred merchant that goes live
// Old panel "Refer & Earn": who you referred (contacts masked), from which store, and the disbursement.
const DISBURSEMENT_STATUSES = ['Disbursed', 'Pending', 'Not Eligible'];
const REFERRALS = [
  ['demo_dhanmondi', 'Onboarded', 'Disbursed'], ['demo_online', 'Onboarded', 'Disbursed'], ['demo_online', 'Onboarded', 'Pending'],
  ['demo_gulshan', 'In Review', 'Not Eligible'], ['demo_dhanmondi', 'Referred', 'Not Eligible'], ['demo_online', 'Referred', 'Not Eligible'],
].map(([store, status, disbursement], i) => ({ store, status, disbursement, date: addDays(TODAY, -(4 + i * 9)), email: `${'rmbsct'[i]}•••••@example.com`, phone: `01•••••${digits(3)}` }));

// Currency Rate Conversion (old panel): BDT per 1 unit, when it was last updated and how many
// payments were converted at it. Indicative mock rates only.
const FX_RATES = [
  ['USD', 121.95, 0], ['SGD', 94.25, 0], ['INR', 1.4513, 1], ['AED', 33.2002, 1], ['EUR', 132.3259, 0], ['MYR', 28.3272, 1], ['QAR', 33.4948, 1],
  ['GBP', 155.5169, 0], ['SAR', 32.5093, 1], ['AUD', 80.0584, 1], ['CAD', 88.3886, 1], ['THB', 3.4718, 1], ['JPY', 0.8059, 1], ['NGN', 0.0795, 1],
  ['SEK', 11.4484, 1], ['IDR', 0.0074, 1], ['NPR', 0.9040, 1], ['LKR', 0.4029, 1], ['OMR', 316.7602, 1], ['MVR', 7.9200, 1],
].map(([code, rate, fresh], i) => ({
  code, rate,
  updated: new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() - (fresh ? 0 : 2), fresh ? 8 : 14, fresh ? 1 : 16),
  requests: Math.round(4000000 / Math.pow(i + 1, 2.9)) + 13000 - i * 450,
}));

// Old panel Value Added Services: each has "Apply Now", which asks the team to call you back.
const VAS_SERVICES = [
  ['isms', 'Business SMS (iSMS)', 'message-square-text', 'Upload your customer list with mobile numbers in Excel and send them SMS about your latest products and services, any time of the day.'],
  ['ibot', 'Chatbot (iBot)', 'bot', 'Have a chatbot ready so customers get automated responses and solutions from you, 24/7 — no need to pay someone to answer every call.'],
  ['topup', 'Virtual Recharge Platform (Topup)', 'smartphone-charging', 'Earn income and provide mobile airtime / recharge to your customers on a system in use for over a decade.'],
  ['ngage', 'Ngage 360', 'palette', 'Creative design for your Facebook page, video or copywriting from our sister concern Ngage360 — they call you to understand your needs.'],
  ['email', 'Email marketing', 'mail', 'Inform your customers about your products with our email marketing service.'],
  ['web', 'Web development', 'layout-template', 'Create or update your website with a team that has worked in this space for about 15 years.'],
  ['app', 'APP development', 'app-window', 'Build a mobile app for your business with the same experienced team.'],
  ['ssl', 'SSL Certificate', 'shield-check', 'Secure your website with an SSL certificate, set up for you.'],
  ['custom', 'Customized Solution', 'puzzle', 'Need something specific? Tell us what you need and we will plan a solution with you.'],
  ['voice', 'Voice SMS', 'phone-call', 'Reach customers with recorded voice messages instead of text.'],
  ['cashbaba', 'Cash Baba', 'wallet', 'List your brand in the Cashbaba wallet Marketplace so its customers can discover and shop from your store with a single tap.'],
].map(([id, name, icon, desc]) => ({ id, name, icon, desc, applied: false }));

// Old panel Purchase SMS: three packages; after choosing one the merchant agrees to the terms
// and uploads the signed declaration letter. Prices include VAT & tax.
const SMS_PACKAGES = [
  { id: 'silver', name: 'Silver', sms: 5000, price: 1900 },
  { id: 'gold', name: 'Gold', sms: 10000, price: 3600 },
  { id: 'platinum', name: 'Platinum', sms: 25000, price: 8750 },
];
const SMS_REQUESTS = [{ ref: `SMS${ymd(addDays(TODAY, -40))}${digits(4)}`, pkg: 'gold', date: addDays(TODAY, -40), letter: 'declaration-letter-signed.pdf', status: 'Approved' }];

// Old panel Merchant FAQ: lettered categories, one question per row (answers are short mock text).
const FAQ_GROUPS = [
  ['Transaction Query', [
    ['How do I check the status of any transaction?', 'Search the Transaction ID in Transactions → All Transactions or Transaction ID Tracking. The status and every step are in the details.'],
    ['bKash transaction failed at SSLCOMMERZ, but amount deducted by bKash. What are the next steps?', 'bKash usually reverses the amount automatically. If it has not, raise a Transaction Ticket with the bKash Transaction ID so the team can check with bKash.'],
    ['My Nagad transaction failed. What should I do?', 'Track it with the Nagad Transaction ID. If the customer was charged, raise a Transaction Ticket from the transaction.'],
    ['My Rocket/Nexus transaction failed at SSLCOMMERZ. What should I do?', 'Check the failure reason in the transaction details, then raise a Transaction Ticket if the customer was charged.'],
  ]],
  ['Settlement Query', [
    ['Why didn’t I receive my settlement report?', 'Settlement reports go to the email set for the store. Check the Settlement Report page, or ask your KAM to update the email.'],
    ['Why didn’t I receive my settlement amount?', 'Settlement is paid once the unsettled amount reaches the minimum. Holds, refunds or chargebacks can also reduce or delay it — see Settlement Report.'],
    ['My settlement is disabled, or bank information is outdated?', 'Contact your KAM with updated bank documents. Settlement resumes once the bank details are verified.'],
  ]],
  ['EMI Query', [
    ['How do I know if a transaction is converted to EMI?', 'EMI payments show the EMI-n mark next to the status in All Transactions, and are listed under Digital EMI → EMI Requests.'],
    ['Why did the customer receive the full bill instead of EMI?', 'The issuing bank converts the payment to EMI. If the bank declined the conversion, the customer is charged the full amount.'],
    ['How do I activate/configure EMI for my store?', 'Go to Payment Products → Digital EMI, choose the store, banks and tenures, set the EMI status and update the configuration.'],
  ]],
  ['Report Panel Credential', [['How do I reset my store credentials?', 'Use Forgot Password on the login page, or ask an admin of your account to update your user.']]],
  ['Store Credential', [['How do I reset my store credentials?', 'Store passwords are never shown in the portal. Ask your KAM to reset them — the new password goes to the registered email.']]],
  ['How to Change Bank Information', [['How do I update my bank information?', 'Send your KAM a signed request with the new bank details and supporting documents.']]],
  ['Change Store Information', [
    ['How do I update my store logo?', 'Open Account & Settings → Store List → settings → GW Settings to see the current logo, and raise a ticket with the new one.'],
    ['How do I update my store URL or SPOC details?', 'Raise a Ticket/Query with the new URL or contact person; the team verifies it before updating.'],
  ]],
  ['Gateway Channel Enable Query', [['How do I activate a payment channel?', 'Ask your KAM. Some channels need extra documents or the bank’s approval.']]],
  ['KAM Name Query', [['How do I find out my KAM?', 'Your KAM is shown on the Dashboard and under Key Contact Details in the header.']]],
  ['Transaction Validation Query', [
    ['Why is my transaction held?', 'Payments can be held for risk checks or for documents. The hold shows on the transaction until it is released.'],
    ['What documents are required for transaction validation?', 'Usually an invoice or delivery proof and the customer’s order details. The team tells you exactly what is needed.'],
  ]],
  ['ESCROW Transaction/File Upload Query', [['How do I upload a service delivery file?', 'Go to Service Delivery, use Get Deliverables, fill in the delivery columns and upload it with Upload Delivery File.']]],
  ['Chargeback Query', [['What documents are needed for a chargeback?', 'Proof of delivery or service, the invoice and any messages with the customer.']]],
  ['Payment Link Query', [['How do I avail myself of the payment link service?', 'Go to Payment Products → Payment Link and create one. Ask your KAM if the menu is not enabled for your store.']]],
].map(([title, items], g) => ({ letter: String.fromCharCode(65 + g), title, items: items.map(([q, a], i) => ({ id: `faq${g}-${i}`, q, a })) }));

// Old panel Instructional Videos/Documents: four videos and two PDF guides.
const VIDEOS = [
  ['ব্যাংক একাউন্ট দিয়ে রেজিস্ট্রেশন করার পদ্ধতি', 'Bangla'],
  ['SSLCOMMERZ Payment Process Using Card Payment', 'English'],
  ['QR payment process', 'English'],
  ['EMI Payment Facility', 'English'],
].map(([title, lang], i) => ({ id: `vid${i}`, title, lang }));
const DOCS = ['SSLCOMMERZ User Manual', 'SSLCOMMERZ Refund Process'].map((title, i) => ({ id: `doc${i}`, title }));

// Header notifications — built from the records above so each one opens a real drawer.
const NOTIFICATIONS = [
  ...CHARGEBACKS.filter(c => ['Initial', 'Waiting'].includes(c.status)).slice(0, 2).map(c => ({
    kind: 'cb', value: c.ref, icon: 'shield-alert', tone: 'rose', date: c.date,
    title: 'Chargeback raised', text: `${fmtBDT(c.amount)} · ${c.reason}. Respond by ${fmtDate(c.respondBy)}.`,
  })),
  ...[...SETTLEMENTS].sort((a, b) => b.date - a.date).filter(x => x.status === 'Bounced').slice(0, 1).map(x => ({
    kind: 'settlement', value: x.ref, icon: 'undo-2', tone: 'rose', date: x.date,
    title: 'Settlement bounced', text: `${fmtBDT(x.fwd)} · ${x.storeName} · ${x.holdReason}`,
  })),
  ...[...SETTLEMENTS].sort((a, b) => b.date - a.date).filter(x => x.status === 'On Hold').slice(0, 1).map(x => ({
    kind: 'settlement', value: x.ref, icon: 'circle-pause', tone: 'amber', date: x.date,
    title: 'Settlement on hold', text: `${x.storeName} · ${x.holdReason}`,
  })),
  ...[...SETTLEMENTS].sort((a, b) => b.date - a.date).filter(x => x.status === 'Paid').slice(0, 2).map(x => ({
    kind: 'settlement', value: x.ref, icon: 'banknote', tone: 'emerald', date: x.date,
    title: 'Settlement paid', text: `${fmtBDT(x.paid)} sent to ${x.bank.bank} · ${x.storeName}`,
  })),
  ...REFUNDS.filter(r => r.status === 'Success' && NOW - r.date > 3600e3).slice(0, 2).map(r => ({
    kind: 'refund', value: r.ref, icon: 'undo-2', tone: 'primary', date: r.date,
    title: 'Refund completed', text: `${fmtBDT(r.amount)} refunded to ${r.txn.customer} · ${r.storeName}`,
  })),
  ...INVOICES.filter(i => i.status === 'Paid').sort((a, b) => b.paidAt - a.paidAt).slice(0, 2).map(i => ({
    kind: 'invoice', value: i.no, icon: 'file-check', tone: 'emerald', date: i.paidAt,
    title: `Invoice ${i.no} paid`, text: `${i.customer} · ${i.storeName}`,
  })),
  ...TXN_TICKETS.filter(t => t.status === 'Solved').sort((a, b) => b.feedbackOn - a.feedbackOn).slice(0, 2).map(t => ({
    kind: 'tt', value: t.no, icon: 'message-square', tone: 'primary', date: t.feedbackOn,
    title: 'Support replied to your ticket', text: `${t.no} · ${t.queries[0]}`,
  })),
].sort((a, b) => b.date - a.date).slice(0, 10).map((n, i) => ({ ...n, read: i >= 4 }));

// Dashboard support directory (mock). The KAM's real name, phone and email come from the
// merchant's account; team addresses are the ones in the team's v3 dashboard concept.
const SUPPORT_CONTACTS = {
  // Mock number and a placeholder portrait; the real KAM photo and number come from the merchant's account.
  kam: {
    name: 'Farzana Rahman', initials: 'FR', phone: '+880 1700-000000', email: 'farzana.kam@example.com',
    photo: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" fill="#dde6f4"/><circle cx="40" cy="31" r="15" fill="#4a75ba"/><path d="M12 80c2-17 14-27 28-27s26 10 28 27z" fill="#4a75ba"/></svg>')}`,
  },
  teams: [
    { title: 'Operations Team', icon: 'headset', text: 'For transaction, refund, chargeback, EMI and settlement queries.', rows: [['Email Address', 'operation@sslcommerz.com'], ['Telephone No', '+880 9677 725 222']] },
    { title: 'Technical Team', icon: 'code', text: 'For SSLCOMMERZ API(s) and integration.', rows: [['Email Address', 'integration@sslcommerz.com']] },
  ],
};
