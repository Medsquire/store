export async function reportClientError(payload) {
  try {
    await fetch('/api/errorlog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'client',
        timestamp: new Date().toISOString(),
        path: window.location.pathname,
        userAgent: navigator.userAgent,
        ...payload,
      }),
      keepalive: true,
    });
  } catch {
    // Swallow logging failures to avoid cascading UI errors.
  }
}
