import { reportClientError } from './errorlog';

export async function submitStore(formData) {
  try {
    const res = await fetch('/api/stores', { method: 'POST', body: formData });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const baseMessage =
        err.error ||
        err.message ||
        (Array.isArray(err.errors) ? err.errors.join(' ') : '') ||
        'Failed to submit store';
      const message = err.issueId ? `${baseMessage} (Issue: ${err.issueId})` : baseMessage;

      await reportClientError({
        scope: 'submit-store',
        message,
        level: res.status >= 500 ? 'error' : 'warn',
        details: {
          status: res.status,
          response: err,
        },
      });

      const apiError = new Error(message);
      apiError.logged = true;
      throw apiError;
    }
    return res.json();
  } catch (err) {
    if (!err.logged) {
      await reportClientError({
        scope: 'submit-store-network',
        message: err.message || 'Store submission failed',
        level: 'error',
      });
    }
    throw err;
  }
}

export async function fetchStores() {
  const res = await fetch('/api/stores');
  if (!res.ok) throw new Error('Failed to fetch stores');
  return res.json();
}

export async function fetchStoreByGuid(guid) {
  const res = await fetch(`/api/stores/${encodeURIComponent(guid)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch store details');
  }
  return res.json();
}
