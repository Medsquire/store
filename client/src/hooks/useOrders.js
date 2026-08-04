import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchOrders, updateOrderStatus } from '../api/orders';

const NEXT_STATUS = { new: 'accepted', accepted: 'picked', picked: 'delivered' };

function normalizeStatus(status) {
  if (status === 'ordered') return 'new';
  if (status === 'in_progress') return 'accepted';
  if (status === 'out_for_delivery') return 'picked';
  return status;
}

function toMillis(value) {
  const ts = value ? new Date(value).getTime() : 0;
  return Number.isFinite(ts) ? ts : 0;
}

function normalizeAndSortOrders(list) {
  return [...(Array.isArray(list) ? list : [])]
    .map(order => ({ ...order, status: normalizeStatus(order.status || 'new') }))
    .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
}

export function useOrders(isOnDuty) {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const intervalRef           = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchOrders();
      setOrders(normalizeAndSortOrders(data));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Always load once on mount (for stats even when off duty)
  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 5 s when on duty
  useEffect(() => {
    if (isOnDuty) {
      intervalRef.current = setInterval(load, 5000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isOnDuty, load]);

  const advance = useCallback(async (orderId, currentStage) => {
    const nextStatus = NEXT_STATUS[currentStage];
    if (!nextStatus) return;

    // Optimistic UI update
    setOrders(prev =>
      prev.map(o => (o._id || o.id) === orderId ? { ...o, status: nextStatus } : o)
    );

    try {
      await updateOrderStatus(orderId, nextStatus);
    } catch (err) {
      console.error('advance order failed:', err.message);
      // Revert on failure
      setOrders(prev =>
        prev.map(o => (o._id || o.id) === orderId ? { ...o, status: currentStage } : o)
      );
    }
  }, []);

  return { orders, loading, error, advance, refresh: load };
}
