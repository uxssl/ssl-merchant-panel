// =====================================================================
// Browsers & Devices
// =====================================================================
function renderBrowsersDevices() {
  return analyticsShell('Users Browsers/Devices', 'What customers use to pay — device, operating system and browser.', (list) => {
    const DEVICES = ['Mobile', 'Desktop', 'Tablet'];
    const devices = groupRows(list, 'device', DEVICES);
    const os = groupRows(list, 'os');
    const browsers = groupRows(list, 'browser');
    const integ = groupRows(list, 'integration');
    const dShare = (n) => devices.find(d => d.name === n)?.share || 0;
    const fb = browsers.find(b => b.name === 'Facebook in-app');
    const chrome = browsers.find(b => b.name === 'Chrome');
    return `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        ${metricCard({ title: 'Mobile', value: fmtPct(dShare('Mobile')), sub: 'of transactions' })}
        ${metricCard({ title: 'Desktop', value: fmtPct(dShare('Desktop')), sub: 'of transactions' })}
        ${metricCard({ title: 'Tablet', value: fmtPct(dShare('Tablet')), sub: 'of transactions' })}
        ${metricCard({ title: 'Mobile SDK (App)', value: fmtPct(integ.find(i => i.name === 'Mobile SDK')?.share || 0), sub: 'paid inside your app' })}
      </div>
      ${fb && chrome && fb.rate < chrome.rate - 5 ? insight(`Payments from the Facebook in-app browser succeed ${fmtPct(fb.rate)} of the time vs ${fmtPct(chrome.rate)} on Chrome. Links shared on Facebook may convert better if customers open them in their browser.`) : ''}
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        ${anCard('Device Type', 'Share of transactions', donut('an-devices', devices, DEVICES))}
        ${anCard('Operating System', 'Share of transactions', rankBars(os, { value: r => r.count, label: r => fmtPct(r.share), sub: r => `${r.count} txns · ${fmtPct(r.rate)} success` }))}
        ${anCard('Browser / App', 'Share of transactions', rankBars(browsers, { value: r => r.count, label: r => fmtPct(r.share), sub: r => `${r.count} txns · ${fmtPct(r.rate)} success` }))}
      </div>
      ${anCard('Browser Table', 'Success rate by browser or app', anTable('browsers-devices',
        ['Browser / App', 'Transactions', 'Share', 'Success Rate', 'Sales', 'Avg. Ticket'],
        browsers.map(r => [r.name, r.count, fmtPct(r.share), fmtPct(r.rate), fmtBDT0(r.sales), fmtBDT0(r.avg)]),
        { right: [1, 2, 3, 4, 5] }), '', exportBtn)}
      ${mockNote('Device and browser come from the checkout page\'s user agent; Bangla QR payments are made in the customer\'s banking or MFS app. Figures are mock data.')}`;
  });
}
