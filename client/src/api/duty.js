import { reportClientError } from './errorlog';

export async function fetchDutyStatus() {
  try {
    const res = await fetch('/api/duty-status');
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to load duty status');
    }
    return res.json();
  } catch (err) {
    await reportClientError({
      scope: 'fetch-duty-status',
      message: err.message || 'Failed to load duty status',
      level: 'error',
    });
    throw err;
  }
}

export async function updateDutyStatus(active) {
  try {
    const res = await fetch('/api/duty-status', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update duty status');
    }

    return res.json();
  } catch (err) {
    await reportClientError({
      scope: 'update-duty-status',
      message: err.message || 'Failed to update duty status',
      level: 'error',
      details: { active },
    });
    throw err;
  }
}
