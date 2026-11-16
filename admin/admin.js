import {
  api, bindForm, feedback, field, formFeedback, heading, html, instant, labelFor, reveal, section, table,
} from './ui.js';
import {
  canEditShipment, renderAudit, renderCustomers, renderNewShipment, renderShipment, renderShipmentList,
} from './shipments.js';

const root = document.querySelector('#admin-app');
const state = {
  config: {},
  user: null,
  setupAvailable: false,
  notice: '',
  renderId: 0,
};
const authBase = '/api/auth';
const roleNames = {
  admin: 'Administrator',
  operator: 'Operator',
  viewer: 'Viewer',
};
const groups = [
  ['Operations', [
    ['overview', 'Overview'], ['shipments', 'Shipments'], ['numbers', 'Tracking Numbers'],
    ['events', 'Tracking Events'], ['customers', 'Customers'], ['documents', 'Shipment Documents', ['admin']],
  ]],
  ['Administration', [
    ['notifications', 'Notifications', ['admin', 'operator']], ['audit', 'Activity Logs', ['admin']],
    ['users', 'Users & Permissions', ['admin']], ['settings', 'Settings'],
  ]],
];

function brand(link = false) {
  const contents = '<span class="brand-mark" aria-hidden="true">SD</span><span><strong>Shipment Desk</strong><small>Operations workspace</small></span>';
  return link ? `<a class="brand" href="#overview">${contents}</a>` : `<div class="brand">${contents}</div>`;
}

function stageLabel() {
  return state.config.environment === 'staging' ? '<span class="stage">Staging · Test records only</span>' : '';
}

function announce(message, error = false) {
  const notice = root.querySelector('[data-notice]');
  if (!notice) return;
  notice.className = message ? `feedback ${error ? 'error' : 'success'}` : '';
  notice.textContent = message || '';
  notice.hidden = !message;
}

function authFrame(title, description, content, footer = '') {
  document.title = `${title} | Shipment Desk`;
  root.innerHTML = `<main class="entry" id="admin-main" tabindex="-1">
    <section class="auth-card" aria-labelledby="auth-title">
      ${brand()}${stageLabel()}
      <h1 id="auth-title">${html(title)}</h1>
      <p class="auth-detail">${html(description)}</p>
      ${content}
      ${footer ? `<div class="auth-links">${footer}</div>` : ''}
    </section>
  </main>`;
}

const authLink = (id, label) => `<button type="button" class="button subtle small-button" id="${id}">${label}</button>`;
const emailField = () => field('email', 'Email address', '', { type: 'email', required: true, autocomplete: 'username', maxlength: 254 });
const passwordField = (isNew = false) => field('password', isNew ? 'New password' : 'Password', '', {
  type: 'password', required: true, autocomplete: isNew ? 'new-password' : 'current-password', maxlength: 128,
  hint: isNew ? 'Use 15 to 128 bytes. A long passphrase works well.' : '',
});
const confirmationField = () => field('verify-password', 'Confirm new password', '', {
  type: 'password', required: true, autocomplete: 'new-password', maxlength: 128,
});

function authForm(fields, button) {
  return `<form id="auth-form">${fields}${feedback}<button class="button" type="submit">${button}</button></form>`;
}

function matchPassword(values) {
  const password = values.get('password');
  const size = new TextEncoder().encode(password).length;
  if (size < 15 || size > 128) throw new Error('Use a password between 15 and 128 bytes.');
  if (password !== values.get('verify-password')) throw new Error('The passwords do not match.');
  return password;
}

function signIn(error = '') {
  authFrame('Sign in', 'Use your administrative account and authenticator to continue.',
    authForm(emailField() + passwordField(), 'Continue to Verification'),
    authLink('open-reset', 'Use password reset token') + authLink('open-recover', 'Use recovery code') +
    (state.setupAvailable ? authLink('open-setup', 'Set up first administrator') : ''));
  const form = root.querySelector('#auth-form');
  if (error) formFeedback(form, error);
  bindForm(form, async values => {
    const response = await api(authBase + '/login', {
      method: 'POST',
      body: { email: values.get('email'), password: values.get('password') },
    });
    showMfa(response);
  });
  root.querySelector('#open-reset').addEventListener('click', () => showPasswordRecovery('reset'));
  root.querySelector('#open-recover').addEventListener('click', () => showPasswordRecovery('recover'));
  root.querySelector('#open-setup')?.addEventListener('click', showSetup);
}

function showSetup() {
  const token = field('setupToken', 'Setup token', '', { type: 'password', required: true, autocomplete: 'off', maxlength: 256 });
  authFrame('Set up first administrator', 'Use the setup token configured for this deployment and create the account you will use to administer shipments.',
    authForm(token + emailField() + passwordField(true) + confirmationField(), 'Set Up Authenticator'),
    authLink('auth-back', 'Back to sign in'));
  root.querySelector('#auth-back').addEventListener('click', () => signIn());
  bindForm(root.querySelector('#auth-form'), async values => {
    const response = await api(authBase + '/setup', {
      method: 'POST',
      body: { setupToken: values.get('setupToken').trim(), email: values.get('email'), password: matchPassword(values) },
    });
    state.setupAvailable = false;
    showMfa(response);
  });
}

function showPasswordRecovery(kind) {
  const isRecoveryCode = kind === 'recover';
  const credentials = isRecoveryCode ? emailField() + field('recoveryCode', 'One-time recovery code', '', {
    type: 'password', required: true, autocomplete: 'off', maxlength: 128,
  }) : field('token', 'One-time reset token', '', {
    type: 'password', required: true, autocomplete: 'off', maxlength: 128,
  });
  authFrame('Reset password', isRecoveryCode
    ? 'Enter one of the recovery codes saved during authenticator setup.'
    : 'Enter the temporary token issued by an administrator.',
  authForm(credentials + passwordField(true) + confirmationField(), 'Reset Password'), authLink('auth-back', 'Back to sign in'));
  root.querySelector('#auth-back').addEventListener('click', () => signIn());
  bindForm(root.querySelector('#auth-form'), async values => {
    const body = { password: matchPassword(values) };
    if (isRecoveryCode) {
      body.email = values.get('email');
      body.recoveryCode = values.get('recoveryCode').trim();
    } else {
      body.token = values.get('token').trim();
    }
    const response = await api(authBase + '/' + kind, { method: 'POST', body });
    showMfa(response);
  });
}

function showMfa({ challenge, mfaSetup }) {
  const setup = mfaSetup ? `<div class="secret-line">
    <div class="field"><label for="authenticator-secret">Authenticator setup key</label>
      <input type="text" id="authenticator-secret" value="${html(mfaSetup.secret)}" readonly autocomplete="off" spellcheck="false">
    </div>
    <button type="button" class="button secondary" id="copy-key">Copy key</button>
  </div>` : '';
  const code = field('code', 'Six-digit verification code', '', {
    required: true, maxlength: 6, pattern: '[0-9]{6}', inputmode: 'numeric', autocomplete: 'one-time-code',
  });
  authFrame(mfaSetup ? 'Set up verification' : 'Verify your sign-in', mfaSetup
    ? 'Add a time-based account in your authenticator, enter the setup key, then type the six-digit code it generates.'
    : 'Enter the current six-digit code from your authenticator.',
  setup + authForm(code, 'Verify and Sign In'), authLink('auth-back', 'Back to sign in'));
  root.querySelector('#copy-key')?.addEventListener('click', () => {
    reveal(root.querySelector('#authenticator-secret'), mfaSetup.secret);
  });
  root.querySelector('#auth-back').addEventListener('click', () => signIn());
  bindForm(root.querySelector('#auth-form'), async values => {
    const { user, recoveryCodes } = await api(authBase + '/mfa', {
      method: 'POST', body: { challenge, code: values.get('code').trim() },
    });
    if (recoveryCodes?.length) showRecoveryCodes(user, recoveryCodes);
    else enterWorkspace(user);
  });
  root.querySelector('#code').focus();
}

function showRecoveryCodes(user, codes) {
  const value = codes.join('\n');
  authFrame('Save your recovery codes', 'Store these one-time codes with your account records. You can use one to recover access if you lose your authenticator.', `
    <div class="field codes">
      <label for="recovery-codes">One-time recovery codes</label>
      <textarea id="recovery-codes" rows="${Math.min(10, codes.length + 1)}" spellcheck="false" readonly>${html(value)}</textarea>
    </div>
    <div class="actions">
      <button type="button" class="button secondary" id="copy-codes">Copy codes</button>
      <button type="button" class="button" id="finish-auth">Continue to Dashboard</button>
    </div>`);
  root.querySelector('#copy-codes').addEventListener('click', () => reveal(root.querySelector('#recovery-codes'), value));
  root.querySelector('#finish-auth').addEventListener('click', () => enterWorkspace(user), { once: true });
}

function navigation(user) {
  return groups.map(([name, items]) => `<div class="nav-group">
    <p class="nav-label">${name}</p>
    ${items.filter(([, , roles]) => !roles || roles.includes(user.role)).map(([key, label]) => (
      `<a class="nav-link" data-nav="${key}" href="#${key}">${html(label)}</a>`
    )).join('')}
  </div>`).join('');
}

function enterWorkspace(user) {
  state.user = user;
  root.innerHTML = `<div class="layout">
    <aside class="sidebar">
      <div class="side-head">${brand(true)}<button type="button" class="button mobile-toggle" aria-expanded="false" aria-controls="main-nav">Menu</button></div>
      <nav id="main-nav" aria-label="Administration">${navigation(user)}</nav>
    </aside>
    <div>
      <div class="topbar">
        ${stageLabel()}
        <div class="user"><div><strong title="${html(user.email)}">${html(user.email)}</strong><small>${html(roleNames[user.role] || user.role)}</small></div>
        <button type="button" id="sign-out" class="button secondary small-button">Sign out</button></div>
      </div>
      <main class="main" id="admin-main" tabindex="-1">
        <p data-notice role="status" hidden></p><div id="admin-view"></div>
      </main>
    </div>
  </div>`;
  const mobile = root.querySelector('.mobile-toggle');
  const nav = root.querySelector('#main-nav');
  function setMenu(open) {
    mobile.setAttribute('aria-expanded', String(open));
    nav.toggleAttribute('data-open', open);
  }
  mobile.addEventListener('click', () => setMenu(!nav.hasAttribute('data-open')));
  nav.addEventListener('click', event => {
    if (event.target.closest('a')) setMenu(false);
  });
  const signOut = root.querySelector('#sign-out');
  signOut.addEventListener('click', async () => {
    signOut.disabled = true;
    try {
      await api(authBase + '/logout', { method: 'POST', body: {} });
      leaveWorkspace();
    } catch (error) {
      announce(error.message, true);
      signOut.disabled = false;
    }
  });
  renderRoute();
}

function leaveWorkspace(error = '') {
  state.user = null;
  state.renderId += 1;
  state.notice = '';
  signIn(error);
}

function go(hash) {
  if (location.hash === hash) return renderRoute();
  location.hash = hash;
}

function routeFromHash() {
  const parts = location.hash.slice(1).split('/');
  return { view: parts[0] || 'overview', shipment: parts[1] || '', tab: parts[2] || 'summary', action: parts[3] || '' };
}

async function renderRoute() {
  if (!state.user) return;
  const { view, shipment, tab, action } = routeFromHash();
  const activeId = ++state.renderId;
  const active = () => state.renderId === activeId && Boolean(state.user);
  const context = { user: state.user, config: state.config, active, go, refresh: renderRoute, notice: message => { state.notice = message; } };
  const current = ['shipment', 'new'].includes(view) ? 'shipments' : view;
  root.querySelectorAll('[data-nav]').forEach(link => {
    if (link.dataset.nav === current) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  const container = root.querySelector('#admin-view');
  container.innerHTML = '<p role="status">Loading…</p>';
  announce(state.notice);
  state.notice = '';

  try {
    if (view === 'new' && canEditShipment(state.user)) {
      renderNewShipment(container, context);
    } else if (view === 'shipment' && /^[0-9a-f-]{36}$/i.test(shipment)) {
      await renderShipment(container, context, shipment, tab, action);
    } else if (['overview', 'shipments', 'numbers', 'events', 'documents'].includes(view) && (view !== 'documents' || state.user.role === 'admin')) {
      await renderShipmentList(container, context, view);
    } else if (view === 'customers') {
      await renderCustomers(container, context);
    } else if (view === 'notifications' && canEditShipment(state.user)) {
      await renderNotifications(container, context);
    } else if (view === 'audit' && state.user.role === 'admin') {
      await renderAudit(container, context);
    } else if (view === 'users' && state.user.role === 'admin') {
      await renderUsers(container, context);
    } else if (view === 'settings') {
      renderSettings(container, context);
    } else {
      container.innerHTML = heading('Page unavailable', 'This section is unavailable for the current account.', '<a class="button secondary" href="#overview">Return to Overview</a>');
    }
  } catch (error) {
    if (!active()) return;
    container.innerHTML = heading('Could not load this page', error.message, '<button type="button" class="button secondary" id="retry-page">Try Again</button>');
    container.querySelector('#retry-page').addEventListener('click', renderRoute);
  }
  if (!active()) return;
  const pageTitle = container.querySelector('h1');
  document.title = `${pageTitle?.textContent || 'Administration'} | Shipment Desk`;
  if (pageTitle) {
    pageTitle.tabIndex = -1;
    if (!container.contains(document.activeElement)) pageTitle.focus({ preventScroll: true });
  }
}

function roleOptions(role) {
  return Object.entries(roleNames).map(([value, text]) => `<option value="${value}"${value === role ? ' selected' : ''}>${text}</option>`).join('');
}

function userRoleControl(user, self) {
  if (self) return html(roleNames[user.role] || user.role);
  return `<form class="role-cell" data-user-role="${html(user.id)}">
    <select name="role" aria-label="Role for ${html(user.email)}">${roleOptions(user.role)}</select>
    <button type="submit" class="button secondary small-button">Save</button>
    ${feedback}
  </form>`;
}

async function renderUsers(container, context) {
  const { users } = await api(authBase + '/users');
  if (!context.active()) return;

  const rows = users.map(user => {
    const self = user.id === context.user.id;
    return [
      `${html(user.email)}${self ? '<small>Current account</small>' : ''}`,
      userRoleControl(user, self),
      user.active ? '<span class="badge success">Active</span>' : '<span class="badge muted">Inactive</span>',
      user.mfaEnabled ? 'Enrolled' : 'Pending',
      `<div class="actions">${user.active ? `<button type="button" class="button secondary small-button" data-reset-user="${html(user.id)}">Reset password</button>` : ''}
        ${self ? '' : `<button type="button" class="button ${user.active ? 'danger' : 'secondary'} small-button" data-toggle-user="${html(user.id)}" data-active="${user.active}">${user.active ? 'Deactivate' : 'Activate'}</button>`}
      </div>`,
    ];
  });
  container.innerHTML = heading('Users & Permissions', 'Create accounts, choose their roles and issue one-time password reset tokens.') +
    '<div id="user-token-output" hidden></div><p data-user-feedback class="feedback error" role="status" hidden></p>' +
    section('Accounts', table(['Email', 'Role', 'Status', 'Authenticator', 'Actions'], rows)) +
    section('Add a User', `<form id="add-user">
      <div class="fields two">
        ${emailField()}
        <div class="field"><label for="new-role">Role</label><select id="new-role" name="role">${roleOptions('viewer')}</select></div>
      </div>
      ${feedback}<div class="form-actions"><button type="submit" class="button">Create User</button></div>
    </form>`, { note: 'New users enrol an authenticator after setting their password.' });

  function showToken(token, email) {
    const output = container.querySelector('#user-token-output');
    output.hidden = false;
    output.innerHTML = section('One-time Password Token', `<p>Give this token to <strong>${html(email)}</strong> through a secure channel. They can use it from the sign-in screen.</p>
      <div class="secret-line">
        <div class="field"><label for="reset-token-output">Password reset token</label>
          <input id="reset-token-output" type="text" value="${html(token)}" readonly autocomplete="off" spellcheck="false">
        </div>
        <button type="button" class="button secondary" id="copy-reset-token">Copy token</button>
      </div>
      <button type="button" class="button" id="finish-user-token">Done</button>`);
    output.querySelector('#copy-reset-token').addEventListener('click', () => reveal(output.querySelector('input'), token));
    output.querySelector('#finish-user-token').addEventListener('click', context.refresh);
    output.scrollIntoView({ block: 'nearest' });
    output.querySelector('input').focus();
  }

  function showError(error) {
    const result = container.querySelector('[data-user-feedback]');
    result.textContent = error.message;
    result.hidden = false;
  }

  bindForm(container.querySelector('#add-user'), async (values, form) => {
    const email = values.get('email');
    const { resetToken } = await api(authBase + '/users', {
      method: 'POST', body: { email, role: values.get('role') },
    });
    if (context.active()) {
      form.reset();
      showToken(resetToken, email);
    }
  });
  container.querySelectorAll('[data-user-role]').forEach(form => bindForm(form, async values => {
    await api(authBase + '/users/' + encodeURIComponent(form.dataset.userRole), { method: 'PATCH', body: { role: values.get('role') } });
    if (!context.active()) return;
    context.notice('User role updated.');
    await context.refresh();
  }));
  container.querySelectorAll('[data-toggle-user]').forEach(button => {
    button.addEventListener('click', async () => {
      const activate = button.dataset.active === 'false';
      if (!activate && !window.confirm('Deactivate this account and end its sessions?')) return;
      button.disabled = true;
      try {
        await api(authBase + '/users/' + encodeURIComponent(button.dataset.toggleUser), { method: 'PATCH', body: { active: activate } });
        if (!context.active()) return;
        context.notice(activate ? 'User activated.' : 'User deactivated.');
        await context.refresh();
      } catch (error) {
        if (context.active()) showError(error);
      } finally {
        button.disabled = false;
      }
    });
  });
  container.querySelectorAll('[data-reset-user]').forEach(button => {
    button.addEventListener('click', async () => {
      if (!window.confirm('Issue a new one-time password reset token?')) return;
      const user = users.find(item => item.id === button.dataset.resetUser);
      if (!user) return;
      button.disabled = true;
      try {
        const { resetToken } = await api(authBase + '/users/' + encodeURIComponent(user.id) + '/reset', { method: 'POST', body: {} });
        if (context.active()) showToken(resetToken, user.email);
      } catch (error) {
        if (context.active()) showError(error);
      } finally {
        button.disabled = false;
      }
    });
  });
}

async function renderNotifications(container, context) {
  const { subscriptions, logs } = await api('/api/admin/notifications?limit=50');
  if (!context.active()) return;
  const subscriptionRows = subscriptions.map(subscription => [
    html(subscription.email),
    subscription.shipmentId ? `<a href="#shipment/${encodeURIComponent(subscription.shipmentId)}/summary">${html(subscription.trackingNumber || 'View shipment')}</a>` : html(subscription.trackingNumber || '—'),
    html(labelFor(subscription.state)), html(instant(subscription.createdAt)),
    ['active', 'pending'].includes(subscription.state)
      ? `<button type="button" class="button danger small-button" data-revoke="${html(subscription.id)}">Revoke</button>`
      : '—',
  ]);
  const logRows = logs.map(log => [
    html(log.trackingNumber || '—'), html(labelFor(log.type)), html(labelFor(log.status)), html(instant(log.createdAt)),
  ]);
  const mail = context.config.notificationsEnabled
    ? 'Email delivery is configured for this deployment.'
    : 'Email delivery is unavailable until an email provider is configured.';
  container.innerHTML = heading('Notifications', mail) + '<p data-notification-feedback class="feedback error" role="status" hidden></p>' +
    section('Subscriptions', table(['Email', 'Shipment', 'State', 'Created', 'Actions'], subscriptionRows, 'No shipment subscriptions have been recorded.')) +
    section('Notification History', table(['Shipment', 'Event', 'Status', 'Created'], logRows, 'No notification activity has been recorded.'));
  container.querySelectorAll('[data-revoke]').forEach(button => {
    button.addEventListener('click', async () => {
      if (!window.confirm('Revoke shipment updates for this subscription?')) return;
      button.disabled = true;
      try {
        await api('/api/admin/notifications/' + encodeURIComponent(button.dataset.revoke), {
          method: 'PATCH', body: { state: 'revoked' },
        });
        if (!context.active()) return;
        context.notice('Subscription revoked.');
        await context.refresh();
      } catch (error) {
        if (!context.active()) return;
        const result = container.querySelector('[data-notification-feedback]');
        result.textContent = error.message;
        result.hidden = false;
      } finally {
        button.disabled = false;
      }
    });
  });
}

function renderSettings(container, context) {
  const { user, config } = context;
  container.innerHTML = heading('Settings', 'Account details and deployment configuration.') +
    section('Account', `<dl class="description-list">
      <div><dt>Email</dt><dd>${html(user.email)}</dd></div>
      <div><dt>Role</dt><dd>${html(roleNames[user.role] || user.role)}</dd></div>
      <div><dt>Sign-in verification</dt><dd>Authenticator required</dd></div>
    </dl>`) +
    section('Deployment', `<dl class="description-list">
      <div><dt>Environment</dt><dd>${html(labelFor(config.environment) || '—')}</dd></div>
      <div><dt>Email notifications</dt><dd>${config.notificationsEnabled ? 'Configured' : 'Configuration required'}</dd></div>
      <div><dt>Tracking portal</dt><dd><a href="/ltl/apps/Tracking">Open public tracking</a></dd></div>
    </dl>`);
}

window.addEventListener('hashchange', renderRoute);
document.addEventListener('admin-session-expired', () => {
  if (state.user) leaveWorkspace('Your session has expired. Sign in again to continue.');
});
document.querySelector('.skip-link').addEventListener('click', event => {
  event.preventDefault();
  document.querySelector('#admin-main')?.focus();
});

async function start() {
  const [configuration, session, setup] = await Promise.allSettled([
    api('/api/config'), api(authBase + '/session'), api(authBase + '/setup'),
  ]);
  if (configuration.status === 'fulfilled') state.config = configuration.value;
  if (setup.status === 'fulfilled') state.setupAvailable = Boolean(setup.value?.available);
  if (session.status === 'fulfilled' && session.value?.user) {
    enterWorkspace(session.value.user);
  } else if (session.status === 'rejected' && session.reason.status !== 401) {
    authFrame('Shipment administration unavailable', session.reason.message,
      '<button type="button" class="button" id="auth-retry">Try Again</button>');
    root.querySelector('#auth-retry').addEventListener('click', start, { once: true });
  } else if (state.setupAvailable) {
    showSetup();
  } else {
    signIn();
  }
}

start();
