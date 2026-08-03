export async function fetchOrders() {
  const res = await fetch('/api/orders');
  if (!res.ok) throw new Error('Failed to fetch orders');
  const data = await res.json();
  return data.orders || [];
}

export async function fetchOrdersHistory(page = 1, limit = 10) {
  const res = await fetch(`/api/orders-history?page=${page}&limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch order history');
  return res.json(); // { orders, total, page, limit, pages }
}

export async function updateOrderStatus(orderId, status) {
  const res = await fetch(`/api/orders/${orderId}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update order');
  }
  return res.json();
}
