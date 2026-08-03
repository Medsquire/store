import OrderCard from './OrderCard';

export default function KanbanColumn({ stage, label, orders, onAdvance, onView, mobileVisible }) {
  return (
    <div className={`kanban-col ${mobileVisible ? 'mobile-visible' : 'mobile-hidden'}`} data-stage={stage}>
      <div className={`kanban-col-header ${stage}`}>
        <span className="col-dot" />
        {label}
        <span className="col-count">{orders.length}</span>
      </div>
      <div className="kanban-cards">
        {orders.length === 0 ? (
          <p className="kanban-empty">No {stage} orders</p>
        ) : (
          orders.map(order => (
            <OrderCard
              key={order._id || order.id}
              order={order}
              stage={stage}
              onAdvance={onAdvance}
              onView={onView}
            />
          ))
        )}
      </div>
    </div>
  );
}
