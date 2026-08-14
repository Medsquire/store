import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useOrders } from '../hooks/useOrders';
import { useOrderAlarm } from '../hooks/useOrderAlarm';
import StatsBar from '../components/orders/StatsBar';
import OffDutyOverlay from '../components/orders/OffDutyOverlay';
import KanbanBoard from '../components/orders/KanbanBoard';
import OrderDetailModal from '../components/orders/OrderDetailModal';

export default function OrdersPage() {
  const { isOnDuty, dutyLoading } = useApp();
  const { orders, advance, error } = useOrders(isOnDuty);
  useOrderAlarm(isOnDuty ? orders : []);
  const [selectedOrder, setSelectedOrder] = useState(null);

  return (
    <div className="orders-page">
      <StatsBar orders={orders} isOnDuty={isOnDuty} />

      {error && (
        <div className="admin-message error" style={{ display: 'block' }}>
          ⚠ {error}
        </div>
      )}

      <OffDutyOverlay visible={!dutyLoading && !isOnDuty} />
      <KanbanBoard
        orders={orders}
        onAdvance={advance}
        onView={setSelectedOrder}
      />

      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onAdvance={advance}
        />
      )}
    </div>
  );
}
