export const CATEGORIES = ['Vegetables', 'Fruits', 'Medicine', 'Lab', 'Food', 'Snacks', 'Tiffin', 'Juices'];

export async function fetchCategories() {
  const res = await fetch('/api/pricelist/categories');
  if (!res.ok) return CATEGORIES;
  const data = await res.json();
  return data.categories?.length ? data.categories : CATEGORIES;
}

export async function fetchPricelist(category = '') {
  const url = category ? `/api/pricelist?category=${encodeURIComponent(category)}` : '/api/pricelist';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch pricelist');
  const data = await res.json();
  return data.items || [];
}

export async function updateItemPrice(itemId, newprice) {
  const res = await fetch(`/api/pricelist/${itemId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ price: newprice }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update price');
  }
  return res.json();
}

export async function bulkUpdatePrices(updates) {
  // updates = [{ _id, newprice }]
  const res = await fetch('/api/pricelist/bulk-update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ updates }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Bulk update failed');
  }
  return res.json();
}

export async function seedPricelist(items) {
  const res = await fetch('/api/pricelist/seed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Seed failed');
  }
  return res.json();
}
