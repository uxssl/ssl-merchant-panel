// =====================================================================
// Menu structure — SSLCOMMERZ Merchant Portal (Menu Structure & Mapping V1.0)
// =====================================================================
const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard', to: '/dashboard' },
  {
    key: 'transactions', label: 'Transactions', icon: 'credit-card', children: [
      { label: 'All Transactions', to: '/transactions/all' },
      { label: 'Transaction ID Tracking', to: '/transactions/tracking' },
    ]
  },
  {
    key: 'dispute', label: 'Dispute Management', icon: 'scale', children: [
      { label: 'Refund Requests', to: '/dispute/refund-requests' },
      { label: 'Chargeback Requests', to: '/dispute/chargeback-requests' },
    ]
  },
  {
    // Escrow payments are held until delivery is confirmed; more escrow screens will sit here.
    key: 'escrow', label: 'Escrow Management', icon: 'package-check', children: [
      { label: 'Service Delivery', to: '/escrow/service-delivery' },
      { label: 'Escrow Hold Transactions', to: '/escrow/hold-transactions' },
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
    // No sidebar submenu: the item opens the reports landing, which links to each report.
    // `pages` keeps the reports in header search and highlights the item while one is open.
    key: 'analytics', label: 'Analytics & Reports', icon: 'trending-up', to: '/analytics', pages: [
      { label: 'Business Analytics', to: '/analytics/business-analytics' },
      { label: 'Market Share', to: '/analytics/market-share' },
      { label: 'GEO Location', to: '/analytics/geographic-analytics' },
      { label: 'Mobile Operators', to: '/analytics/mobile-operators' },
      { label: 'Users Browsers/Devices', to: '/analytics/browsers-devices' },
      { label: 'Issuer Location', to: '/analytics/issuer-location' },
      { label: 'Saved Card', to: '/analytics/saved-card-analytics' },
      { label: 'Google Pay Transaction Report', to: '/analytics/google-pay-report' },
      { label: 'Bangla QR Transaction Report', to: '/analytics/bangla-qr-report' },
      { label: 'Settlement Report', to: '/analytics/settlement-report' },
      { label: 'Financial Year Report', to: '/analytics/financial-year-report' },
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
    ]
  },
  {
    key: 'account', label: 'Account & Settings', icon: 'settings', children: [
      { label: 'Store List', to: '/account/store-list' },
      { label: 'Store Groups', to: '/account/store-groups' },
      { label: 'Transaction Profile', to: '/account/transaction-profile' },
      { label: 'User Management', to: '/account/user-management' },
      { label: 'Change Password', to: '/account/change-password' },
    ]
  },
  // Pinned to the bottom of the sidebar: extras, help and integration rather than daily work.
  {
    key: 'others', label: 'Others', icon: 'ellipsis', bottom: true, children: [
      { label: 'Refer & Earn', to: '/others/refer-earn' },
      { label: 'Currency Rate Conversion', to: '/others/currency-conversion-rates' },
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
};
