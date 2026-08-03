import { useState, useEffect, useCallback } from 'react';
import { fetchOrdersHistory } from '../api/orders';
import OrderDetailModal from '../components/orders/OrderDetailModal';

const STATUS_COLOR = {
  new:       '#ffd166',
  accepted:  '#74c0fc',
  picked:    '#f4a261',
  delivered: '#6bcb77',
};

function calcTotal(items = []) {
  return items.reduce((s, i) => s + Number(i.price) * Number(i.qty), 0);
}

function formatDate(val) {
  if (!val) return '—';
  const d = new Date(val);
  return isNaN(d.getTime()) ? String(val) : d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

const PAGE_SIZE = 5;

export default function OrderListPage() {
  const [orders, setOrders]       = useState([]);
  const [total, setTotal]         = useState(0);
  const [pages, setPages]         = useState(1);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [selected, setSelected]   = useState(null);

  const load = useCallback(async (p) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchOrdersHistory(p, PAGE_SIZE);
      setOrders(data.orders || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
      setPage(data.page || p);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(1); }, [load]);

  const goTo = (p) => { if (p >= 1 && p <= pages) load(p); };

  return (
    <div className="order-list-page">
      <div className="order-list-header">
        <div>
          <h2 className="order-list-title">Previous Orders</h2>
          <span className="order-list-count">{total} total order{total !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {error && <div className="admin-message error" style={{ display: 'block' }}>⚠ {error}</div>}

      {loading ? (
        <div className="order-list-loading">
          <div className="order-list-spinner" />
          <span>Loading orders…</span>
        </div>
      ) : orders.length === 0 ? (
        <div className="order-list-empty">No orders found</div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="order-list-table-wrap">
            <table className="order-list-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Order ID</th>
                  <th>Phone</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order, idx) => {
                  const id      = order._id || order.id || '';
                  const shortId = String(id).slice(-6).toUpperCase();
                  const amt     = calcTotal(order.items);
                  const row     = (page - 1) * PAGE_SIZE + idx + 1;
                  return (
                    <tr key={String(id)} className="order-list-row">
                      <td className="order-list-num">{row}</td>
                      <td className="order-list-id">#{shortId}</td>
                      <td>{order.phonenumber || '—'}</td>
                      <td>{(order.items || []).length} item{(order.items || []).length !== 1 ? 's' : ''}</td>
                      <td>₹{amt.toFixed(0)}</td>
                      <td>
                        <span className="order-list-badge" style={{ background: STATUS_COLOR[order.status] || '#ccc' }}>
                          {order.status || 'new'}
                        </span>
                      </td>
                      <td className="order-list-date">{formatDate(order.createdAt)}</td>
                      <td>
                        <button className="order-list-view-btn" onClick={() => setSelected(order)}>View</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="order-list-cards">
            {orders.map((order, idx) => {
              const id      = order._id || order.id || '';
              const shortId = String(id).slice(-6).toUpperCase();
              const amt     = calcTotal(order.items);
              const row     = (page - 1) * PAGE_SIZE + idx + 1;
              return (
                <div key={String(id)} className="order-card-mobile" onClick={() => setSelected(order)}>
                  <div className="ocm-top">
                    <span className="ocm-num">#{row}</span>
                    <span className="ocm-id">#{shortId}</span>
                    <span
                      className="order-list-badge"
                      style={{ background: STATUS_COLOR[order.status] || '#ccc', marginLeft: 'auto' }}
                    >
                      {order.status || 'new'}
                    </span>
                  </div>
                  <div className="ocm-body">
                    <div className="ocm-row">
                      <span className="ocm-label">Phone</span>
                      <span className="ocm-val">{order.phonenumber || '—'}</span>
                    </div>
                    <div className="ocm-row">
                      <span className="ocm-label">Items</span>
                      <span className="ocm-val">{(order.items || []).length} item{(order.items || []).length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="ocm-row">
                      <span className="ocm-label">Total</span>
                      <span className="ocm-val ocm-amount">₹{amt.toFixed(0)}</span>
                    </div>
                    <div className="ocm-row">
                      <span className="ocm-label">Date</span>
                      <span className="ocm-val ocm-date">{formatDate(order.createdAt)}</span>
                    </div>
                  </div>
                  <div className="ocm-footer">
                    <button className="order-list-view-btn ocm-view-btn" onClick={e => { e.stopPropagation(); setSelected(order); }}>
                      View Details →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="order-list-pagination">
          <button className="page-btn" onClick={() => goTo(1)} disabled={page === 1}>«</button>
          <button className="page-btn" onClick={() => goTo(page - 1)} disabled={page === 1}>‹</button>

          {Array.from({ length: pages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === pages || Math.abs(p - page) <= 2)
            .reduce((acc, p, i, arr) => {
              if (i > 0 && p - arr[i - 1] > 1) acc.push('…');
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              p === '…' ? (
                <span key={`ellipsis-${i}`} className="page-ellipsis">…</span>
              ) : (
                <button
                  key={p}
                  className={`page-btn${p === page ? ' active' : ''}`}
                  onClick={() => goTo(p)}
                >
                  {p}
                </button>
              )
            )}

          <button className="page-btn" onClick={() => goTo(page + 1)} disabled={page === pages}>›</button>
          <button className="page-btn" onClick={() => goTo(pages)} disabled={page === pages}>»</button>
        </div>
      )}

      {selected && (
        <OrderDetailModal
          order={selected}
          onClose={() => setSelected(null)}
          onAdvance={() => {}}
        />
      )}
    </div>
  );
}
