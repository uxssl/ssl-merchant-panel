// =====================================================================
// Menu structure — SSLCOMMERZ Merchant Portal (Menu Structure & Mapping V1.0)
// =====================================================================
const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard', to: '/dashboard' },
  {
    key: 'transactions', label: 'Transactions', icon: 'credit-card', children: [
      { label: 'All Transactions', to: '/transactions/all' },
      { label: 'Google Pay Transactions', to: '/transactions/google-pay' },
      { label: 'Bangla QR Transactions', to: '/transactions/bangla-qr' },
      { label: 'Transaction ID Tracking', to: '/transactions/tracking' },
      { label: 'Refund Requests', to: '/transactions/refund-requests' },
      { label: 'Chargeback Requests', to: '/transactions/chargeback-requests' },
    ]
  },
  {
    key: 'settlements', label: 'Settlements & Accounting', icon: 'banknote', children: [
      { label: 'Settlement Report', to: '/settlements/settlement-report' },
      { label: 'Financial Year Report', to: '/settlements/financial-year-report' },
    ]
  },
  {
    key: 'products', label: 'Payment Products', icon: 'qr-code', children: [
      { label: 'Payment Links', to: '/products/payment-links' },
      { label: 'Digital Invoices', to: '/products/digital-invoices' },
      { label: 'Payment QR', to: '/products/payment-qr' },
      { label: 'Digital EMI', to: '/products/digital-emi' },
    ]
  },
  {
    key: 'analytics', label: 'Analytics & Reports', icon: 'trending-up', children: [
      { label: 'Business Analytics', to: '/analytics/business-analytics' },
      { label: 'Market Share', to: '/analytics/market-share' },
      { label: 'Geographic Analytics', to: '/analytics/geographic-analytics' },
      { label: 'Mobile Operators', to: '/analytics/mobile-operators' },
      { label: 'Browsers & Devices', to: '/analytics/browsers-devices' },
      { label: 'Issuer Location', to: '/analytics/issuer-location' },
      { label: 'Saved Card Analytics', to: '/analytics/saved-card-analytics' },
    ]
  },
  {
    key: 'campaigns', label: 'Campaigns', icon: 'megaphone', children: [
      { label: 'Partnership Campaigns', to: '/campaigns/partnership-campaigns' },
      { label: 'Merchant Campaigns', to: '/campaigns/merchant-campaigns' },
      { label: 'Campaign Calendar', to: '/campaigns/campaign-calendar' },
    ]
  },
  {
    key: 'support', label: 'Support & Tickets', icon: 'message-square', children: [
      { label: 'Transaction Tickets', to: '/support/transaction-tickets' },
      { label: 'Tickets & Queries', to: '/support/tickets-queries' },
      { label: 'Service Delivery', to: '/support/service-delivery' },
    ]
  },
  {
    key: 'account', label: 'Account & Settings', icon: 'settings', children: [
      { label: 'My Stores', to: '/account/my-stores' },
      { label: 'Store List', to: '/account/store-list' },
      { label: 'Store Groups', to: '/account/store-groups' },
      { label: 'User Management', to: '/account/user-management' },
      { label: 'Change Password', to: '/account/change-password' },
    ]
  },
  // Pinned to the bottom of the sidebar: extras, help and integration rather than daily work.
  {
    key: 'others', label: 'Others', icon: 'ellipsis', bottom: true, children: [
      { label: 'Refer & Earn', to: '/others/refer-earn' },
      { label: 'Currency Conversion Rates', to: '/others/currency-conversion-rates' },
      { label: 'Value Added Services (VAS)', to: '/others/vas' },
      { label: 'SMS Purchase', to: '/others/sms-purchase' },
    ]
  },
  {
    key: 'help', label: 'Help & Resources', icon: 'life-buoy', bottom: true, children: [
      { label: 'Merchant FAQ', to: '/others/merchant-faq' },
      { label: 'Instructional Videos & Documents', to: '/others/instructional-videos-documents' },
    ]
  },
  { key: 'developer', label: 'Developer', icon: 'code', to: '/others/developer-information', bottom: true },
];

const TXN_VIEWS = {
  '/transactions/all': { key: 'all', title: 'All Transactions', sub: 'Monitor and search all payments across your stores.' },
  '/transactions/google-pay': { key: 'google-pay', title: 'Google Pay Transactions', sub: 'Payments made with Google Pay across your stores.', lockMethod: 'Google Pay' },
  '/transactions/bangla-qr': { key: 'bangla-qr', title: 'Bangla QR Transactions', sub: 'Payments received through Bangla QR across your stores.', lockMethod: 'Bangla QR' },
};
