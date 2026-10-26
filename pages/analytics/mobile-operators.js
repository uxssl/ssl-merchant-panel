// =====================================================================
// Mobile Operators
// =====================================================================
function renderMobileOperators() {
  return analyticsShell('Mobile Operators', 'Your customers\' mobile networks — and how OTP delivery affects success.', (list) => {
    const ops = groupRows(list, 'operator', OPERATORS);
    const otp = (r) => r.items.filter(t => t.reason === 'OTP verification failed').length;
    const otpRate = (r) => pct(otp(r), r.count);
    // Only call out operators with enough payments for the rate to mean something.
    const worst = ops.filter(r => r.count >= 100).sort((a, b) => otpRate(b) - otpRate(a))[0];
    const avgOtp = pct(list.filter(t => t.reason === 'OTP verification failed').length, list.length);
    return `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        ${ops.map(r => metricCard({ title: r.name, value: fmtPct(r.share), sub: `${fmtPct(r.rate)} success · ${r.count} txns` })).join('')}
      </div>
      ${worst && otpRate(worst) > avgOtp * 1.3 ? insight(`${worst.name} customers fail OTP verification ${fmtPct(otpRate(worst))} of the time vs ${fmtPct(avgOtp)} on average. Raise it with your KAM if this continues.`) : ''}
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        ${anCard('Operator Share', 'Share of transactions', donut('an-ops', ops, OPERATORS))}
        ${anCard('Success Rate by Operator', 'Successful ÷ all transactions', rankBars(ops, { value: r => r.rate, label: r => fmtPct(r.rate), max: 100, sub: r => `${okList(r.items).length} of ${r.count} succeeded` }))}
        ${anCard('OTP Failures', 'Share of each operator\'s transactions', rankBars(ops, { value: otpRate, label: r => fmtPct(otpRate(r)), sub: r => `${otp(r)} OTP failures` }))}
      </div>
      ${anCard('Operator Table', '', anTable('mobile-operators',
        ['Operator', 'Transactions', 'Share', 'Success Rate', 'OTP Failures', 'Sales', 'Avg. Ticket'],
        ops.map(r => [r.name, r.count, fmtPct(r.share), fmtPct(r.rate), otp(r), fmtBDT0(r.sales), fmtBDT0(r.avg)]),
        { right: [1, 2, 3, 4, 5, 6] }), '', exportBtn)}
      ${mockNote('Operator is detected from the customer\'s mobile number prefix. Figures are mock data.')}`;
  });
}
