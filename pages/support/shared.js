// =====================================================================
// Support & Tickets — shared
// =====================================================================
const SUP = { txn: '/support/transaction-tickets', general: '/support/tickets-queries', service: '/support/service-delivery' };
const TT_CLS = { Requested: 'bg-amber-50 text-amber-600', Solved: 'bg-emerald-50 text-emerald-600' };
const GT_CLS = { Pending: 'bg-amber-50 text-amber-600', Processing: 'bg-blue-50 text-blue-600', Declined: 'bg-rose-50 text-rose-600', Completed: 'bg-emerald-50 text-emerald-600' };
const SR_CLS = { Requested: 'bg-slate-100 text-slate-600', Approved: 'bg-blue-50 text-blue-600', 'In Progress': 'bg-amber-50 text-amber-600', Delivered: 'bg-emerald-50 text-emerald-600', Cancelled: 'bg-rose-50 text-rose-600' };
const supBadge = (cls, s) => `<span class="${STATUS_BADGE} ${cls[s]}">${s}</span>`;
const hoursText = (h) => h < 24 ? `${Math.round(h)} h` : `${(h / 24).toFixed(1)} days`;
let ticketDraft = null;

// Conversation shared by both ticket types; replies stay in page memory.
function thread(kind, item, open) {
  return `
    <div class="space-y-3">
      ${item.messages.map(m => `
        <div class="flex ${m.from === 'merchant' ? 'justify-end' : 'justify-start'}">
          <div class="max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm ${m.from === 'merchant' ? 'bg-primary-600 text-white rounded-br-sm' : 'bg-slate-100 text-slate-800 rounded-bl-sm'}">
            <p class="whitespace-pre-line">${esc(m.text)}</p>
            <p class="text-[10px] mt-1 ${m.from === 'merchant' ? 'text-white/70' : 'text-slate-500'}">${esc(m.name)} · ${fmtShort(m.at)}, ${fmtTime(m.at)}</p>
          </div>
        </div>`).join('')}
      ${open ? `
        <div class="pt-2">
          <textarea id="reply-text" rows="2" class="${INPUT}" placeholder="Write a reply to support…"></textarea>
          ${formErrors.reply ? `<p class="text-[11px] font-medium text-rose-600 mt-1">${formErrors.reply}</p>` : ''}
          <div class="flex justify-end mt-2"><button data-action="send-reply" data-kind="${kind}" data-value="${item.no}" class="${BTN_PRIMARY} py-1.5">${ic('send', 'w-4 h-4')}Send Reply</button></div>
        </div>` : '<p class="text-xs text-slate-500 text-center">This ticket is closed. Raise a new ticket if you need more help.</p>'}
    </div>`;
}

function kamCard() {
  return `
    <div class="bg-white rounded-lg border border-slate-200 shadow-sm p-5 flex items-center gap-4 flex-wrap">
      <div class="w-11 h-11 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center">${ic('headset', 'w-5 h-5')}</div>
      <div class="flex-1 min-w-[200px]">
        <p class="text-sm font-semibold text-slate-900">Need help faster?</p>
        <p class="text-xs text-slate-500">Your KAM: Farzana (mock) · Support hotline [PLACEHOLDER] · Sat–Thu, 9 AM – 6 PM (mock)</p>
      </div>
      <a href="#/others/merchant-faq" class="text-xs font-semibold text-primary-600 hover:underline">Browse Merchant FAQ</a>
    </div>`;
}
