export async function submitStore(formData) {
  const res = await fetch('/api/stores', { method: 'POST', body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to submit store');
  }
  return res.json();
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
