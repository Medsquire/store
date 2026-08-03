import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchOrders, updateOrderStatus } from '../api/orders';

const NEXT_STATUS = { new: 'accepted', accepted: 'picked', picked: 'delivered' };

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
      setOrders(data);
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
