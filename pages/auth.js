// =====================================================================
// Sign in, Forgot Password and Forgot Login ID — self-service, no SSL support needed.
// Full-screen over the portal. Nothing typed here is stored or sent (prototype); a real
// server sends the code / Login ID only to contacts already registered for the user.
// =====================================================================
const AUTH = { signIn: '/sign-in', forgotPw: '/forgot-password', forgotId: '/forgot-login-id' };
const OTP_TTL_MS = 5 * 60e3;      // code expires after 5 minutes
const OTP_RESEND_MS = 30e3;       // a new code can be requested after 30 seconds
const OTP_MAX_TRIES = 3;          // three wrong codes cancel the request

let authFlow;
const resetAuthFlow = () => { authFlow = { step: 'start', login: '', contact: '', sentAt: 0, tries: 0, error: '' }; };
resetAuthFlow();

// Shows a contact the user typed without echoing it in full.
const maskContact = (v) => v.includes('@') ? `${v[0]}•••••@${v.split('@')[1]}` : `${v.slice(0, 2)}•••••${v.slice(-3)}`;

const authInput = (id, label, attrs = '', extra = '') => `
  <label class="block">
    <span class="flex items-center justify-between mb-1.5"><span class="text-xs font-bold text-slate-700">${label}</span>${extra}</span>
    <input id="${id}" ${attrs} class="${INPUT}">
  </label>`;
const authPw = (id, label, autocomplete, extra = '') => `
  <label class="block">
    <span class="flex items-center justify-between mb-1.5"><span class="text-xs font-bold text-slate-700">${label}</span>${extra}</span>
    <span class="relative block">
      <input id="${id}" type="password" autocomplete="${autocomplete}" class="${INPUT} pr-10">
      <button type="button" data-action="pw-toggle" data-value="${id}" class="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600" title="Show / hide">${ic('eye', 'w-4 h-4')}</button>
    </span>
    <span id="${id}-error" class="hidden block text-[11px] font-medium text-rose-600 mt-1"></span>
  </label>`;
const authError = () => authFlow.error ? `<p role="alert" class="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">${ic('circle-alert', 'w-4 h-4 shrink-0')}${authFlow.error}</p>` : '';
const authHead = (icon, title, text) => `
  <div class="space-y-2">
    <span class="w-10 h-10 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center">${ic(icon, 'w-5 h-5')}</span>
    <h1 class="text-xl font-bold text-slate-900">${title}</h1>
    <p class="text-sm text-slate-500">${text}</p>
  </div>`;
const authBtn = (action, label, icon) => `<button type="button" data-action="${action}" class="${BTN_PRIMARY} w-full justify-center">${icon ? ic(icon, 'w-4 h-4') : ''}${label}</button>`;
const backToSignIn = `<a href="#${AUTH.signIn}" class="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-primary-600">${ic('arrow-left', 'w-4 h-4')}Back to sign in</a>`;
const linkCls = 'text-xs font-medium text-primary-600 hover:underline';

function signInScreen() {
  return `
    ${authHead('log-in', 'Sign in to Merchant Portal', 'Use the Login ID and password you got from SSLCOMMERZ or your portal admin.')}
    ${authInput('auth-login', 'Login ID', 'autocomplete="username" autocapitalize="off" spellcheck="false"', `<a href="#${AUTH.forgotId}" class="${linkCls}">Forgot Login ID?</a>`)}
    ${authPw('auth-pw', 'Password', 'current-password', `<a href="#${AUTH.forgotPw}" class="${linkCls}">Forgot password?</a>`)}
    ${authError()}
    ${authBtn('auth-sign-in', 'Sign in')}
    <p class="flex items-start gap-2 text-[11px] text-slate-500">${ic('lock', 'w-3.5 h-3.5 shrink-0 mt-px')}5 wrong passwords lock the account for 30 minutes. Reset your password to unlock it right away.</p>`;
}

function forgotPwScreen() {
  const f = authFlow;
  if (f.step === 'otp') return `
    ${authHead('message-square-lock', 'Enter verification code', `If <span class="font-mono text-slate-700">${esc(f.login)}</span> is an active portal user, a 6-digit code was sent to its registered mobile number and email. It expires in 5 minutes.`)}
    ${authInput('auth-otp', '6-digit code', 'inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="••••••"')}
    ${authError()}
    ${authBtn('auth-verify', 'Verify code', 'shield-check')}
    <div class="flex flex-wrap items-center justify-between gap-2">
      <button type="button" data-action="auth-resend" class="${linkCls}">Send a new code</button>
      <button type="button" data-action="auth-restart" class="${linkCls}">Use a different Login ID</button>
    </div>
    <p class="text-[11px] text-slate-400">Prototype: any 6 digits work. ${OTP_MAX_TRIES} wrong codes cancel the request.</p>`;
  if (f.step === 'new') return `
    ${authHead('key-round', 'Set a new password', `For <span class="font-mono text-slate-700">${esc(f.login)}</span>. You can't reuse a previous password.`)}
    ${authPw('pw-new', 'New Password', 'new-password')}
    <div>
      <div class="h-1.5 rounded-full bg-slate-100 overflow-hidden"><div id="pw-meter" class="h-full rounded-full transition-all" style="width:0%"></div></div>
      <p id="pw-meter-label" class="text-[11px] text-slate-500 mt-1">Strength: —</p>
    </div>
    <ul id="pw-rules" class="space-y-1.5">
      ${PASSWORD_RULES.map((r, i) => `<li data-rule="${i}" class="flex items-start gap-2 text-xs text-slate-600 leading-relaxed"><span class="mt-0.5 shrink-0 text-slate-300" data-rule-icon>${ic('circle', 'w-3.5 h-3.5')}</span><span>${esc(r.text)}</span></li>`).join('')}
    </ul>
    ${authPw('pw-confirm', 'Confirm New Password', 'new-password')}
    ${authBtn('auth-reset', 'Reset password', 'key-round')}`;
  if (f.step === 'done') return `
    ${authHead('circle-check', 'Password reset', 'You can sign in with your new password now. If the account was locked, it is unlocked.')}
    <p class="text-xs text-slate-500">We signed out every other session and sent a confirmation to your registered email and mobile. If you didn't do this, contact your KAM right away.</p>
    <a href="#${AUTH.signIn}" class="${BTN_PRIMARY} w-full justify-center">Back to sign in</a>`;
  return `
    ${authHead('key-round', 'Reset your password', "Enter your Login ID. We'll send a verification code to the mobile number and email registered for it.")}
    ${authInput('auth-login', 'Login ID', `autocomplete="username" autocapitalize="off" spellcheck="false" value="${esc(f.login)}"`)}
    ${authError()}
    ${authBtn('auth-send-code', 'Send verification code', 'send')}
    ${backToSignIn}`;
}

function forgotIdScreen() {
  const f = authFlow;
  if (f.step === 'done') return `
    ${authHead('mail-check', 'Check your email or SMS', `If <span class="font-medium text-slate-700">${esc(maskContact(f.contact))}</span> is registered for a portal user, we've sent the Login ID linked to it there.`)}
    <p class="text-xs text-slate-500">For security, Login IDs are never shown on this screen. Nothing arrived? Ask your portal admin or your KAM.</p>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <a href="#${AUTH.signIn}" class="${BTN_SECONDARY} justify-center">Back to sign in</a>
      <a href="#${AUTH.forgotPw}" class="${BTN_PRIMARY} justify-center">Reset password</a>
    </div>`;
  return `
    ${authHead('user-search', 'Find your Login ID', 'Enter the email address or mobile number registered for you in the portal.')}
    ${authInput('auth-contact', 'Email or mobile number', `autocomplete="email" autocapitalize="off" spellcheck="false" placeholder="name@company.com or 01XXXXXXXXX" value="${esc(f.contact)}"`)}
    ${authError()}
    ${authBtn('auth-send-id', 'Send my Login ID', 'send')}
    ${backToSignIn}`;
}

const AUTH_SCREENS = { [AUTH.signIn]: signInScreen, [AUTH.forgotPw]: forgotPwScreen, [AUTH.forgotId]: forgotIdScreen };

// Draws the auth screen when one is open; returns false on portal pages so render() carries on.
function renderAuth() {
  const root = $('#auth-root');
  const screen = AUTH_SCREENS[currentPath()];
  document.body.classList.toggle('overflow-hidden', !!screen);
  if (!screen) { root.innerHTML = ''; return false; }
  root.innerHTML = `
    <div class="fixed inset-0 z-[140] overflow-y-auto bg-slate-50">
      <div class="min-h-full flex flex-col items-center justify-center px-4 py-10">
        <img src="${LOGO}" alt="SSLCOMMERZ" class="h-9 mb-6">
        <div class="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-5">${screen()}</div>
        <p class="mt-6 flex items-center gap-1.5 text-[11px] text-slate-400">${ic('shield-check', 'w-3.5 h-3.5')}Prototype: nothing you type here is stored or sent.</p>
      </div>
    </div>`;
  lucide.createIcons();
  makeKeyboardReachable(root);
  root.querySelector('input')?.focus();
  return true;
}

const authActions = {
  'auth-sign-in': () => {
    authFlow.error = !$('#auth-login').value.trim() || !$('#auth-pw').value ? 'Enter your Login ID and password.' : '';
    if (authFlow.error) return renderAuth();
    toast('Prototype: signed in without checking the password', 'success');
    location.hash = '#/dashboard';
  },
  'auth-send-code': () => {
    const login = $('#auth-login').value.trim();
    // The same answer whether or not the Login ID exists, so the screen can't be used to find valid IDs.
    Object.assign(authFlow, login ? { step: 'otp', login, sentAt: Date.now(), tries: 0, error: '' } : { error: 'Enter your Login ID.' });
    renderAuth();
  },
  'auth-resend': () => {
    const wait = Math.ceil((OTP_RESEND_MS - (Date.now() - authFlow.sentAt)) / 1000);
    if (wait > 0) { authFlow.error = `You can ask for a new code in ${wait} second${wait > 1 ? 's' : ''}.`; return renderAuth(); }
    Object.assign(authFlow, { sentAt: Date.now(), tries: 0, error: '' });
    renderAuth();
    toast('A new code was sent (prototype)', 'success');
  },
  'auth-restart': () => { Object.assign(authFlow, { step: 'start', error: '' }); renderAuth(); },
  'auth-verify': () => {
    const code = $('#auth-otp').value.trim();
    if (Date.now() - authFlow.sentAt > OTP_TTL_MS) { Object.assign(authFlow, { step: 'start', error: 'That code expired. Request a new one.' }); return renderAuth(); }
    if (!/^\d{6}$/.test(code)) {
      authFlow.tries++;
      Object.assign(authFlow, authFlow.tries >= OTP_MAX_TRIES ? { step: 'start', error: 'Too many wrong codes. Request a new one.' } : { error: `Enter the 6-digit code. ${OTP_MAX_TRIES - authFlow.tries} tr${OTP_MAX_TRIES - authFlow.tries > 1 ? 'ies' : 'y'} left.` });
      return renderAuth();
    }
    Object.assign(authFlow, { step: 'new', error: '' });
    renderAuth();
  },
  'auth-reset': () => {
    const pw = $('#pw-new').value, confirm = $('#pw-confirm').value;
    const failed = PASSWORD_RULES.filter(r => !r.test(pw));
    setPwError('pw-new', !pw ? 'Enter a new password.' : failed.length ? `Doesn't meet ${failed.length} of the rules above.` : '');
    setPwError('pw-confirm', !confirm || confirm !== pw ? 'Passwords do not match.' : '');
    if (!pw || failed.length || confirm !== pw) return;
    Object.assign(authFlow, { step: 'done', error: '' });
    renderAuth();
  },
  'auth-send-id': () => {
    const v = $('#auth-contact').value.trim();
    const ok = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) || /^01[3-9]\d{8}$/.test(v);
    Object.assign(authFlow, ok ? { step: 'done', contact: v, error: '' } : { contact: v, error: 'Enter a valid email address or an 11-digit mobile number (01XXXXXXXXX).' });
    renderAuth();
  },
};
