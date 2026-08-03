function calcTotal(items = []) {
  return items.reduce((s, i) => s + Number(i.price) * Number(i.qty), 0);
}

const STAGES = ['new', 'accepted', 'picked', 'delivered'];

export default function StatsBar({ orders, isOnDuty }) {
  const buckets = { new: 0, accepted: 0, picked: 0, delivered: 0 };
  orders.forEach(o => {
    const stage = STAGES.includes(o.status) ? o.status : 'new';
    buckets[stage]++;
  });

  const revenue = orders
    .filter(o => o.status === 'delivered')
    .reduce((s, o) => s + calcTotal(o.items), 0);

  return (
    <div className="admin-stats-bar">
      <div className="stat-pill">
        <span className="stat-pill-value">{orders.length}</span>
        <span className="stat-pill-label">Total Today</span>
      </div>
      <div className="stat-pill new">
        <span className="stat-pill-value">{buckets.new}</span>
        <span className="stat-pill-label">New</span>
      </div>
      <div className="stat-pill accepted">
        <span className="stat-pill-value">{buckets.accepted}</span>
        <span className="stat-pill-label">Accepted</span>
      </div>
      <div className="stat-pill picked">
        <span className="stat-pill-value">{buckets.picked}</span>
        <span className="stat-pill-label">Picked Up</span>
      </div>
      <div className="stat-pill delivered">
        <span className="stat-pill-value">{buckets.delivered}</span>
        <span className="stat-pill-label">Delivered</span>
      </div>
      <div className="stat-pill revenue">
        <span className="stat-pill-value">₹{revenue.toFixed(0)}</span>
        <span className="stat-pill-label">Revenue</span>
      </div>
      <div
        className={`duty-badge ${isOnDuty ? 'duty-badge--on' : 'duty-badge--off'}`}
        style={{ marginLeft: 'auto' }}
      >
        {isOnDuty ? '● On Duty' : '○ Off Duty'}
      </div>
      {isOnDuty && (
        <div className="refresh-indicator" style={{ display: 'flex' }}>
          <span className="refresh-pulse" />
          &nbsp;Live
        </div>
      )}
    </div>
  );
}
