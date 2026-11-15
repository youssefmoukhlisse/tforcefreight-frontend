'use strict';

const params = new URLSearchParams(location.hash.slice(1));
const action = params.get('action');
const token = params.get('token');
history.replaceState(null, '', location.pathname);
const message = document.getElementById('subscription-message');
const submit = document.getElementById('subscription-submit');
if (!['confirm','unsubscribe'].includes(action) || !token || token.length > 100) {
  message.textContent = 'This link is invalid or expired.';
} else {
  const confirm = action === 'confirm';
  message.textContent = confirm
    ? 'Confirm that you want email updates for this shipment.'
    : 'Confirm that you want to stop receiving email updates for this shipment.';
  submit.textContent = confirm ? 'Confirm updates' : 'Unsubscribe';
  submit.hidden = false;
  submit.addEventListener('click', async () => {
    submit.disabled = true;
    try {
      const response = await fetch('/api/tracking/subscriptions/' + action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await response.json();
      message.textContent = data.message || data.error || 'Unable to update subscription.';
      submit.hidden = response.ok || response.status === 404;
    } catch {
      message.textContent = 'Unable to update subscription. Try again.';
    } finally {
      submit.disabled = false;
    }
  });
}
