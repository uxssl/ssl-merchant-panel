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
  const status = refunded ? 'Success' : ageH < 24 ? pick(['Initiate', 'Processing']) : ageH < 96 ? pick(['Processing', 'Submit To Bank']) : 'Cancelled';
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
// Held payouts are forwarded and added to the store's next settlement.
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
    const status = date > NOW ? 'Pending' : hold ? 'On Hold' : 'Paid';
    const paid = status === 'Paid' ? settle : 0;
    const fwd = status === 'On Hold' ? settle : 0;
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
const DEFAULT_LINK_COLORS = { leftBg: '#ffffff', leftText: '#0f172a', btnBg: '#295cab', btnText: '#ffffff' };
const linkUrl = (ref) => `https://uat-invoice.sslcommerz.com/invoice/pay?refer=${ref}`;
const PAYMENT_LINKS = LINK_NAMES.map((name, i) => {
  const store = wpick(STORES);
  const fixed = rng() < 0.6;
  const amount = fixed ? Math.round((500 + rng() * 9500) / 50) * 50 : null;
  const paymentType = rng() < 0.75 ? 'Reusable' : 'One-time';
  const date = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() - 2 - Math.floor(rng() * 110), 9 + Math.floor(rng() * 9), Math.floor(rng() * 60));
  let payments = TXNS.filter(t => t.store === store.id && t.status === 'success' && t.date > date && idHash(t.id) % LINK_NAMES.length === i)
    .map(t => ({ txn: t, date: t.date, amount: fixed ? amount : t.amount, customer: t.customer }));
  if (paymentType === 'One-time') payments = payments.slice(-1);
  return {
    ref: alnum(13), name, store: store.id, storeName: store.name, date,
    payType: 'Payment Link', paymentType,
    amountType: fixed ? 'Fixed' : 'Any', amount,
    amountText: fixed ? '' : 'Enter the amount you want to pay',
    convFee: rng() < 0.3 ? 1.5 : 0,
    buttonName: 'Pay Now', productDetails: '', topMessage: '', buttonMessage: '',
    domainUrl: store.id === 'demo_online' ? 'https://shop.example.com' : '',
    colors: { ...DEFAULT_LINK_COLORS },
    active: paymentType === 'One-time' ? payments.length === 0 : rng() > 0.15,
    payments,
  };
}).sort((a, b) => b.date - a.date);

const INVOICE_ITEMS = [['Website maintenance (monthly)', 15000], ['Logo design', 8000], ['Catering — per guest', 450], ['Bulk order — T-shirts', 650], ['Consultation hour', 2500], ['Annual service contract', 36000], ['Delivery charge', 120], ['Installation fee', 3000]];
const invoiceTotals = (inv) => {
  const subtotal = inv.items.reduce((s, it) => s + it.qty * it.price, 0);
  const vat = Math.round(subtotal * inv.vatRate) / 100;
  return { subtotal, vat, total: subtotal + vat };
};
const INVOICES = Array.from({ length: 30 }, (_, i) => {
  const store = wpick(STORES);
  const issued = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() - Math.floor(rng() * 75), 10 + Math.floor(rng() * 8), Math.floor(rng() * 60));
  const date = issued > NOW ? new Date(NOW.getTime() - 30 * 60e3) : issued;
  const due = endOfDay(addDays(date, pick([7, 15, 30])));
  const items = Array.from({ length: 1 + Math.floor(rng() * 3) }, () => {
    const [desc, price] = pick(INVOICE_ITEMS);
    return { desc, qty: price > 5000 ? 1 : 1 + Math.floor(rng() * 20), price };
  });
  const name = pick(CUSTOMERS);
  const inv = {
    no: `INV-${date.getFullYear()}-${1040 + i}`, ref: alnum(13), store: store.id, storeName: store.name,
    customer: name, phone: `01•••••${digits(3)}`, email: `${name[0].toLowerCase()}•••••@example.com`,
    date, due, items, vatRate: pick([0, 0, 15]), notes: rng() < 0.4 ? 'Thank you for your business.' : '',
    viewed: rng() < 0.7,
  };
  const r = rng();
  const ageD = (NOW - date) / 864e5;
  if (ageD < 3 && r < 0.3) inv.status = 'Draft';
  else if (r < 0.05) inv.status = 'Cancelled';
  else if (r < 0.6 && ageD > 1) { inv.status = 'Paid'; inv.paidAt = new Date(Math.min(NOW.getTime(), date.getTime() + rng() * (due - date))); }
  else inv.status = NOW > due ? 'Overdue' : 'Sent';
  return inv;
}).sort((a, b) => b.date - a.date);

const QR_CODES = [
  { id: 'QR-DHN-01', store: 'demo_dhanmondi', label: 'Counter 1', terminal: `TID ••••${digits(4)}` },
  { id: 'QR-DHN-02', store: 'demo_dhanmondi', label: 'Counter 2', terminal: `TID ••••${digits(4)}` },
  { id: 'QR-GUL-01', store: 'demo_gulshan', label: 'Main counter', terminal: `TID ••••${digits(4)}` },
  { id: 'QR-ONL-01', store: 'demo_online', label: 'Delivery rider', terminal: `TID ••••${digits(4)}` },
];

// EMI banks, tenures and store rates (% charged to the store) as configured in the KAM panel.
const EMI_DEFAULT_RATE = { 3: 3.0, 6: 4.5, 9: 6.5, 12: 8.5, 18: 11.5, 24: 15.5, 30: 16.5, 36: 19.5 };
const EMI_TENURES = [3, 6, 9, 12, 18, 24, 30, 36];
const EMI_BANKS = [
  { name: 'BRAC BANK LIMITED', tenures: [3, 6, 9, 12, 18, 24] },
  { name: 'BANK ASIA LIMITED', tenures: [3, 6, 9, 12] },
  { name: 'CITY BANK LIMITED', tenures: [3, 6, 9, 12, 18, 24, 30, 36] },
  { name: 'DUTCH BANGLA BANK', tenures: [3, 6, 9, 12, 18, 24, 36] },
  { name: 'EASTERN BANK', tenures: [3, 6, 9, 12, 18, 24, 36] },
  { name: 'LANKABANGLA FINANCE', tenures: [3, 6, 9, 12, 18, 24, 36], rates: { 3: 3.5, 6: 4.5, 9: 6.5, 12: 8.5, 18: 11.5, 24: 15.5, 36: 19.5 } },
  { name: 'MUTUAL TRUST BANK', tenures: [3, 6, 9, 12, 18, 24, 36] },
  { name: 'PRIME BANK', tenures: [3, 6, 9, 12, 18, 24, 36] },
  { name: 'STANDARD CHARTERED BANK', tenures: [3, 6, 9, 12, 18, 24, 36], rates: { 3: 3.5, 6: 5.5, 9: 8.0, 12: 10.5, 18: 13.5, 24: 17.5, 36: 22.5 } },
  { name: 'UNITED COMMERCIAL BANK', tenures: [3, 6, 9, 12, 24] },
].map(b => ({ ...b, rates: b.rates || EMI_DEFAULT_RATE }));
const EMI_STORES = { demo_dhanmondi: true, demo_gulshan: false, demo_online: true };
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

// Campaigns (mock). Partnership campaigns are run by banks / MFS partners and stores opt in;
// merchant campaigns are the merchant's own discounts. Both are kept in memory so join / create work.
const dayAt = (offset) => startOfDay(addDays(TODAY, offset));
const PARTNER_CAMPAIGNS = [
  { name: 'Eid Card Offer', partner: 'BRAC Bank', kind: 'Bank', match: 'BRAC Bank', cards: 'BRAC Bank Visa & Mastercard credit cards', sectors: 'E-commerce, Lifestyle', start: -10, end: 20, confirm: -12, canOnboard: 'Yes', pct: 15, max: 500, minOrder: 1000, perUser: 2, merchantShare: 50, participation: 'Bank Approved', stores: ['demo_dhanmondi', 'demo_online'] },
  { name: 'Weekend Dining Offer', partner: 'City Bank', kind: 'Bank', match: 'City Bank', cards: 'City Bank American Express cards', sectors: 'Food & Beverage, Lifestyle', start: -3, end: 25, confirm: 4, canOnboard: 'Yes', pct: 20, max: 750, minOrder: 1500, perUser: 4, merchantShare: 40, participation: 'Not joined', stores: [] },
  { name: 'Cashback Fest', partner: 'bKash', kind: 'MFS', match: 'bKash', cards: 'bKash wallet payments', sectors: 'All sectors', start: 6, end: 36, confirm: 3, canOnboard: 'Yes', pct: 10, max: 200, minOrder: 500, perUser: 3, merchantShare: 30, participation: 'Created', stores: ['demo_online'] },
  { name: 'Pay Day Offer', partner: 'Nagad', kind: 'MFS', match: 'Nagad', cards: 'Nagad wallet payments', sectors: 'All sectors', start: 12, end: 19, confirm: 8, canOnboard: 'Yes', pct: 8, max: 150, minOrder: 300, perUser: 2, merchantShare: 50, participation: 'Not joined', stores: [] },
  { name: 'Winter Sale', partner: 'Eastern Bank', kind: 'Bank', match: 'Eastern Bank', cards: 'EBL credit & debit cards', sectors: 'Travel, Hospitality', start: 20, end: 50, confirm: 15, canOnboard: 'No', pct: 12, max: 1000, minOrder: 3000, perUser: 1, merchantShare: 50, participation: 'Not joined', stores: [] },
  { name: 'Card Festival', partner: 'Prime Bank', kind: 'Bank', match: 'Prime Bank', cards: 'Prime Bank Visa cards', sectors: 'E-commerce, Retail', start: 2, end: 30, confirm: 1, canOnboard: 'Yes', pct: 10, max: 400, minOrder: 1000, perUser: 2, merchantShare: 50, participation: 'KAM Approved', stores: ['demo_dhanmondi', 'demo_gulshan'] },
  { name: 'Nexus Shopping Week', partner: 'Dutch-Bangla Bank', kind: 'Bank', match: 'Dutch-Bangla Bank', cards: 'DBBL Nexus debit cards', sectors: 'Retail', start: -40, end: -25, confirm: -45, canOnboard: 'Yes', pct: 10, max: 300, minOrder: 800, perUser: 2, merchantShare: 50, participation: 'Bank Approved', stores: ['demo_dhanmondi', 'demo_gulshan', 'demo_online'] },
  { name: 'Online Shopping Offer', partner: 'Standard Chartered', kind: 'Bank', match: 'Standard Chartered', cards: 'Standard Chartered credit cards', sectors: 'E-commerce', start: -60, end: -30, confirm: -62, canOnboard: 'Yes', pct: 15, max: 600, minOrder: 2000, perUser: 1, merchantShare: 50, participation: 'Rejected', rejectReason: 'Store category was not eligible for this offer', stores: ['demo_online'] },
].map(c => ({ ...c, id: `PC${alnum(6)}`, tracking: alnum(20), start: dayAt(c.start), end: endOfDay(dayAt(c.end)), confirm: endOfDay(dayAt(c.confirm)) }));

const MERCHANT_CAMPAIGNS = [
  { name: 'Puja Special — 10% off', description: 'Festive discount on selected bank cards and bKash.', start: -18, end: 5, stores: ['demo_dhanmondi', 'demo_gulshan'], banks: ['BRAC Bank', 'City Bank', 'Eastern Bank'], mfs: ['bKash'], ib: [], type: 'Percentage', value: 10, max: 300, minOrder: 1500, perUser: 1, status: 'Running' },
  { name: 'Free Delivery Weekend', description: 'Flat discount equal to the delivery charge.', start: -2, end: 12, stores: ['demo_online'], banks: [], mfs: ['bKash', 'Nagad'], ib: [], type: 'Flat', value: 120, max: 120, minOrder: 2000, perUser: 2, status: 'Running' },
  { name: 'Winter Collection Launch', description: 'Launch offer for the new winter collection.', start: 10, end: 40, stores: ['demo_dhanmondi', 'demo_gulshan', 'demo_online'], banks: ['BRAC Bank', 'City Bank', 'Dutch-Bangla Bank', 'Eastern Bank', 'Standard Chartered', 'Prime Bank'], mfs: [], ib: ['City Touch'], type: 'Percentage', value: 12, max: 600, minOrder: 2500, perUser: 1, status: 'Pending' },
  { name: 'Black Friday Preview', description: 'Early-access discount for returning customers.', start: 25, end: 31, stores: ['demo_online'], banks: ['City Bank'], mfs: ['bKash'], ib: [], type: 'Percentage', value: 20, max: 1000, minOrder: 3000, perUser: 1, status: 'Created' },
  { name: 'Back to School', description: 'Discount on stationery and bags.', start: -45, end: -30, stores: ['demo_gulshan'], banks: ['Prime Bank'], mfs: ['bKash', 'Nagad', 'Rocket'], ib: [], type: 'Percentage', value: 8, max: 200, minOrder: 1000, perUser: 2, status: 'Closed' },
  { name: 'Independence Day Offer', description: 'Flat discount across all stores.', start: -64, end: -58, stores: ['demo_dhanmondi', 'demo_online'], banks: ['Dutch-Bangla Bank'], mfs: ['bKash'], ib: [], type: 'Flat', value: 200, max: 200, minOrder: 1500, perUser: 1, status: 'Closed' },
].map(c => ({ ...c, id: `MC${alnum(6)}`, tracking: alnum(20), start: dayAt(c.start), end: endOfDay(dayAt(c.end)) }));

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

const SERVICE_TYPES = [
  { v: 'QR Standee Delivery', sla: 5 }, { v: 'POS Terminal Installation', sla: 7 }, { v: 'Branding Materials', sla: 10 },
  { v: 'Store Activation', sla: 3 }, { v: 'Integration Support', sla: 2 }, { v: 'Staff Training', sla: 5 },
];
const SERVICE_STAGES = ['Requested', 'Approved', 'In Progress', 'Delivered'];
const SERVICE_REQUESTS = Array.from({ length: 15 }, (_, i) => {
  const type = SERVICE_TYPES[i % SERVICE_TYPES.length];
  const store = wpick(STORES);
  const date = new Date(NOW.getTime() - (4 + rng() * 20 * 24) * 3600e3);
  const due = endOfDay(addDays(date, type.sla));
  const ageD = (NOW - date) / 864e5;
  const late = rng() < 0.3;
  const stageIndex = ageD < 1 ? 0 : ageD < 2 ? 1 : ageD < type.sla + (late ? 4 : 0) ? 2 : 3;
  const cancelled = stageIndex < 3 && rng() < 0.08;
  const stageAt = [date, capAt(new Date(date.getTime() + 20 * 3600e3)), capAt(new Date(date.getTime() + 44 * 3600e3)),
    capAt(new Date(date.getTime() + (late ? type.sla + 2 : Math.max(1, type.sla - 1)) * 864e5))];
  return {
    no: `SR${ymd(date)}${digits(4)}`, date, type: type.v, sla: type.sla, due, store: store.id, storeName: store.name,
    qty: type.v === 'QR Standee Delivery' ? 1 + Math.floor(rng() * 3) : type.v === 'Branding Materials' ? 5 + Math.floor(rng() * 20) : 1,
    stage: cancelled ? 'Cancelled' : SERVICE_STAGES[stageIndex], stageIndex: cancelled ? -1 : stageIndex, stageAt,
    assignee: type.v.includes('Support') || type.v.includes('Training') ? 'Integration team' : type.v === 'Store Activation' ? 'Onboarding team' : 'Field operations',
    notes: rng() < 0.5 ? 'Please call the store manager before visiting.' : '',
    rating: stageIndex === 3 && rng() < 0.6 ? 3 + Math.floor(rng() * 3) : null,
  };
}).sort((a, b) => b.date - a.date);

// Account (mock): store configuration, store groups and portal users. Credentials are never part of this data.
const ACCOUNT_STORES = [
  { id: 'demo_dhanmondi', name: 'Demo Store – Dhanmondi', type: 'Online & QR', baseUrl: 'https://dhanmondi.example.com', currency: 'BDT', emi: 'EMI Enabled', status: 'Active', created: new Date(2022, 0, 12), address: 'House [PLACEHOLDER], Road [PLACEHOLDER], Dhanmondi, Dhaka' },
  { id: 'demo_gulshan', name: 'Demo Store – Gulshan', type: 'Only QR', baseUrl: '', currency: 'BDT', emi: 'No EMI', status: 'Active', created: new Date(2023, 2, 4), address: 'House [PLACEHOLDER], Gulshan Avenue, Dhaka' },
  { id: 'demo_online', name: 'Demo Online Shop', type: 'Only Online', baseUrl: 'https://shop.example.com', currency: 'BDT', emi: 'EMI Enabled', status: 'Active', created: new Date(2024, 8, 1), address: 'House [PLACEHOLDER], Banani, Dhaka' },
  { id: 'demo_usd', name: 'Demo Export Shop (USD)', type: 'Only Online', baseUrl: 'https://export.example.com', currency: 'USD', emi: 'No EMI', status: 'Active', created: new Date(2026, 8, 20), address: 'House [PLACEHOLDER], Banani, Dhaka' },
  { id: 'demo_popup', name: 'Demo Pop-up Store', type: 'Only QR', baseUrl: '', currency: 'BDT', emi: 'No EMI', status: 'Inactive', created: new Date(2025, 11, 1), address: 'Bashundhara City, Dhaka' },
];
const STORE_GROUPS = [
  { id: 'G1', name: 'All Stores', description: 'Every store under this merchant account.', stores: ACCOUNT_STORES.map(s => s.id), system: true },
  { id: 'G2', name: 'Physical Stores', description: 'Counters that take Bangla QR and cards in person.', stores: ['demo_dhanmondi', 'demo_gulshan', 'demo_popup'] },
  { id: 'G3', name: 'Online Business', description: 'Web and app checkout stores.', stores: ['demo_online', 'demo_usd'] },
];
const USER_ROLES = ['Merchant Admin', 'Merchant User', 'Support Agent'];
const USERS = [
  { login: 'demo_merchant', name: 'Demo Merchant Admin', role: 'Merchant Admin', group: 'G1', status: 'Active', lastLogin: addDays(NOW, -1), ips: '' },
  { login: 'manager_dhanmondi', name: 'Store Manager — Dhanmondi', role: 'Merchant User', group: 'G2', status: 'Active', lastLogin: addDays(NOW, -2), ips: '' },
  { login: 'manager_gulshan', name: 'Store Manager — Gulshan', role: 'Merchant User', group: 'G2', status: 'Active', lastLogin: addDays(NOW, -5), ips: '' },
  { login: 'accounts_team', name: 'Accounts Team', role: 'Merchant User', group: 'G1', status: 'Active', lastLogin: addDays(NOW, -3), ips: '203.0.113.10, 203.0.113.11' },
  { login: 'care_agent', name: 'Customer Care Agent', role: 'Support Agent', group: 'G3', status: 'Active', lastLogin: addDays(NOW, -0.3), ips: '' },
  { login: 'old_manager', name: 'Former Store Manager', role: 'Merchant User', group: 'G2', status: 'Inactive', lastLogin: addDays(NOW, -64), ips: '' },
].map((u, i) => ({ ...u, email: `${u.login[0]}•••••@example.com`, mobile: `01•••••${digits(3)}`, appRole: 'Merchant App Role', created: addDays(NOW, -(400 - i * 50)) }));

// Others (mock): referrals, FX rates, value added services, SMS credits, FAQ and learning material.
const REFERRAL_CODE = 'DEMO-MRC-7Q4K';
const REFERRAL_BONUS = 1000; // mock bonus per referred merchant that goes live
const REFERRALS = [
  ['Dhaka Food Court', 'Live', 'Credited'], ['Style Boutique BD', 'Live', 'Credited'], ['Fresh Grocery BD', 'Live', 'Pending'],
  ['Sunrise Academy', 'Onboarded', 'Pending'], ['Urban Fashion Hub', 'Signed Up', 'Not yet eligible'], ['Bright Mobile Store', 'Invited', 'Not yet eligible'],
  ['Cloud Kitchen Express', 'Invited', 'Not yet eligible'], ['Metro Electronics', 'Signed Up', 'Not yet eligible'],
].map(([name, status, bonus], i) => ({ name, status, bonus, date: addDays(TODAY, -(4 + i * 9)), contact: `01•••••${digits(3)}` }));

// Indicative BDT rates per unit of foreign currency (mock).
const FX_RATES = [
  ['USD', 'US Dollar', 121.50], ['EUR', 'Euro', 131.80], ['GBP', 'British Pound', 154.20], ['AED', 'UAE Dirham', 33.05],
  ['SAR', 'Saudi Riyal', 32.35], ['SGD', 'Singapore Dollar', 93.40], ['MYR', 'Malaysian Ringgit', 27.60],
  ['CAD', 'Canadian Dollar', 88.90], ['AUD', 'Australian Dollar', 79.70], ['INR', 'Indian Rupee', 1.45],
].map(([code, name, mid]) => {
  const r = mulberry32(idHash(code));
  const history = Array.from({ length: 30 }, (_, i) => mid * (1 + (Math.sin(i / 4 + r() * 3) * 0.006) + (i - 29) * 0.0002));
  const change = (history[29] - history[28]) / history[28] * 100;
  return { code, name, buy: history[29] * 0.995, sell: history[29] * 1.005, mid: history[29], change, history };
});

const VAS_SERVICES = [
  { id: 'sms', name: 'Bulk SMS', icon: 'message-square-text', desc: 'Send payment confirmations, offers and reminders to your customers.', price: 'From ৳0.30 per SMS', status: 'Subscribed', link: '/others/sms-purchase' },
  { id: 'domain', name: 'Domain & Hosting', icon: 'globe', desc: 'Get a .com or .com.bd domain with managed hosting for your shop.', price: 'From ৳2,500 / year', status: 'Subscribed' },
  { id: 'web', name: 'Website Development', icon: 'layout-template', desc: 'A ready e-commerce website with SSLCOMMERZ checkout built in.', price: 'From ৳25,000', status: 'Available' },
  { id: 'email', name: 'Email Marketing', icon: 'mail', desc: 'Newsletters and campaign emails with open and click tracking.', price: 'From ৳1,500 / month', status: 'Available' },
  { id: 'pos', name: 'POS Terminal', icon: 'credit-card', desc: 'Card terminal for in-store payments, settled with your online sales.', price: 'Rental from ৳800 / month', status: 'Requested' },
  { id: 'delivery', name: 'Delivery Integration', icon: 'truck', desc: 'Connect courier partners and collect cash on delivery digitally.', price: 'Per parcel pricing', status: 'Available' },
  { id: 'finance', name: 'Merchant Financing', icon: 'hand-coins', desc: 'Working-capital offers from partner banks based on your sales history.', price: 'Subject to partner approval', status: 'Available' },
  { id: 'workspace', name: 'Business Email (Google Workspace)', icon: 'at-sign', desc: 'Professional email on your own domain for your team.', price: 'From ৳650 / user / month', status: 'Available' },
];

const SMS_PACKAGES = [
  { id: 'p1', sms: 1000, rate: 0.40 }, { id: 'p5', sms: 5000, rate: 0.35 }, { id: 'p10', sms: 10000, rate: 0.32, popular: true }, { id: 'p50', sms: 50000, rate: 0.30 },
];
const SMS_VAT = 15; // mock VAT %
const sms = {
  balance: 2340,
  senderId: 'DemoMerchnt',
  lowAlert: true,
  threshold: 1000,
  daily: Array.from({ length: 30 }, (_, i) => Math.round(60 + 40 * Math.sin(i / 3) + (i % 7 === 5 ? 90 : 0) + i * 1.5)),
  history: [
    { date: addDays(TODAY, -6), pkg: 'p10' }, { date: addDays(TODAY, -38), pkg: 'p5' }, { date: addDays(TODAY, -71), pkg: 'p10' }, { date: addDays(TODAY, -120), pkg: 'p1' },
  ].map((h, i) => ({ ...h, ref: `SMS${ymd(h.date)}${digits(4)}`, payment: i % 2 ? 'Deducted from settlement' : 'Paid online', status: 'Completed' })),
};

const FAQ_CATEGORIES = ['Getting Started', 'Payments', 'Settlement', 'Refunds & Chargebacks', 'QR & EMI', 'Account & Security'];
const FAQS = [
  ['Getting Started', 'How do I start taking payments online?', 'Integrate the hosted checkout or Easy Checkout using the guides under Developer / Technical Information, test in the sandbox, then ask your KAM to switch your store to live.'],
  ['Getting Started', 'Can I take payments without a website?', 'Yes. Use Payment Links or Digital Invoices from Payment Products — share the link by SMS, WhatsApp or email.'],
  ['Payments', 'Why did a customer\'s payment fail?', 'Open the transaction — the failure reason is shown (for example insufficient balance or OTP failure). Common causes also appear in Business Analytics.'],
  ['Payments', 'A customer was charged but the order failed. What should I do?', 'Check the transaction status first. If it shows Success, fulfil the order or refund it. If unsure, raise a Transaction Ticket with the Transaction ID.'],
  ['Payments', 'Which payment methods can my customers use?', 'Cards (VISA, Mastercard, AMEX, DBBL Nexus), mobile banking (bKash, Nagad, Rocket), internet banking, Bangla QR and wallets — depending on your store setup.'],
  ['Settlement', 'When will I receive my money?', 'Successful payments are settled to your bank account on the next working day (mock). See Settlement Report for each payout.'],
  ['Settlement', 'Why is a settlement on hold?', 'Usually because of a bank account mismatch or pending documents. The hold reason is shown on the settlement; the amount is forwarded to the next payout once resolved.'],
  ['Refunds & Chargebacks', 'How long does a refund take?', 'After approval it is submitted to the bank. Card refunds usually reach the customer in 7–10 working days (mock).'],
  ['Refunds & Chargebacks', 'What is a chargeback and how do I respond?', 'A customer disputes a card payment through their bank. Open Chargeback Requests and submit evidence (invoice, delivery proof) before the deadline.'],
  ['QR & EMI', 'How do I get another QR for a new counter?', 'Request it from Payment QR or Service Delivery → QR Standee Delivery.'],
  ['QR & EMI', 'Who pays the EMI charge?', 'The store rate shown in Digital EMI → EMI Plans & Rates is deducted from your settlement for each EMI payment.'],
  ['Account & Security', 'How do I add a user for my accounts team?', 'Admins can add users from Account & Settings → User Management and limit their stores with Store Groups.'],
  ['Account & Security', 'Where is my store password?', 'It is never shown in the portal. Request a reset from Developer / Technical Information — it is sent to your registered email.'],
  ['Account & Security', 'How often must I change my password?', 'Every 90 days. You get reminders from the 80th day.'],
].map(([cat, q, a], i) => ({ id: `faq${i}`, cat, q, a }));

const LEARN_CATEGORIES = ['Getting Started', 'Integration', 'Payment Products', 'Reports & Settlement', 'Security'];
const VIDEOS = [
  ['Getting Started', 'Tour of the merchant portal', '4:12', 'English'],
  ['Getting Started', 'মার্চেন্ট পোর্টাল পরিচিতি', '5:03', 'Bangla'],
  ['Integration', 'Hosted checkout in 10 minutes', '9:48', 'English'],
  ['Integration', 'Validating payments with IPN', '7:21', 'English'],
  ['Payment Products', 'Create and share a payment link', '3:35', 'English'],
  ['Payment Products', 'Using Bangla QR at your counter', '4:50', 'Bangla'],
  ['Reports & Settlement', 'Reading your settlement report', '6:02', 'English'],
  ['Security', 'Keeping your account secure', '3:58', 'English'],
].map(([cat, title, duration, lang], i) => ({ id: `vid${i}`, cat, title, duration, lang }));
const DOCS = [
  ['Integration', 'Integration Guide (Hosted & Easy Checkout)', 'PDF', '2.4 MB', 'English', -40],
  ['Integration', 'IPN & Validation API Reference', 'PDF', '1.1 MB', 'English', -95],
  ['Getting Started', 'Merchant Onboarding Checklist', 'PDF', '320 KB', 'English', -20],
  ['Getting Started', 'মার্চেন্ট অনবোর্ডিং নির্দেশিকা', 'PDF', '410 KB', 'Bangla', -20],
  ['Payment Products', 'Payment Links & Invoices — User Guide', 'PDF', '880 KB', 'English', -12],
  ['Payment Products', 'Bangla QR Standee Print File', 'PDF', '3.2 MB', 'English', -60],
  ['Reports & Settlement', 'Settlement & Reconciliation Guide', 'PDF', '1.6 MB', 'English', -33],
  ['Security', 'PCI-DSS Responsibilities for Merchants', 'PDF', '540 KB', 'English', -150],
  ['Reports & Settlement', 'Monthly Statement Template', 'XLSX', '45 KB', 'English', -8],
].map(([cat, title, type, size, lang, days], i) => ({ id: `doc${i}`, cat, title, type, size, lang, updated: addDays(TODAY, days) }));
