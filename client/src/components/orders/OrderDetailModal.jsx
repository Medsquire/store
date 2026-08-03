import { useEffect, useRef } from 'react';

function calcTotal(items = []) {
  return items.reduce((s, i) => s + Number(i.price) * Number(i.qty), 0);
}

const STATUS_LABEL = {
  new:       { label: 'New',        color: '#ffd166', text: '#9a6f00' },
  accepted:  { label: 'Accepted',   color: '#74c0fc', text: '#0958a5' },
  picked:    { label: 'Picked Up',  color: '#f4a261', text: '#8a3a00' },
  delivered: { label: 'Delivered',  color: '#6bcb77', text: '#1a5c1a' },
};

export default function OrderDetailModal({ order, onClose, onAdvance }) {
  const mapRef     = useRef(null);
  const mapInst    = useRef(null);

  const id       = order._id || order.id || '';
  const shortId  = String(id).slice(-6).toUpperCase();
  const total    = calcTotal(order.items);
  const lat      = order.location?.coords?.latitude;
  const lng      = order.location?.coords?.longitude;
  const hasCoords= lat && lng;
  const statusInfo = STATUS_LABEL[order.status] || STATUS_LABEL.new;

  /* ---- Init Leaflet map when modal opens ---- */
  useEffect(() => {
    const L = window.L;
    if (!L || !mapRef.current || mapInst.current) return;

    const center = hasCoords ? [lat, lng] : [16.7107, 81.0952];
    const map = L.map(mapRef.current, { zoomControl: true }).setView(center, hasCoords ? 16 : 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    if (hasCoords) {
      const icon = L.divIcon({
        html: `<div style="
          background:linear-gradient(135deg,#1f4f46,#2d7a6e);
          width:34px;height:34px;border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);border:3px solid #fff;
          box-shadow:0 2px 10px rgba(0,0,0,0.3)">
        </div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 34],
        className: '',
      });

      L.marker([lat, lng], { icon })
        .addTo(map)
        .bindPopup(
          `<b>📞 ${order.phonenumber || '—'}</b><br>${order.location?.text || ''}`,
          { maxWidth: 200 }
        )
        .openPopup();
    }

    mapInst.current = map;
    // Invalidate size after a tick so Leaflet measures the container correctly
    setTimeout(() => map.invalidateSize(), 50);

    return () => {
      map.remove();
      mapInst.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- Close on Escape key ---- */
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const NEXT_ACTION = { new: 'Accept Order', accepted: 'Mark Picked Up', picked: 'Mark Delivered' };
  const nextLabel   = NEXT_ACTION[order.status];

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-dialog">

        {/* ── Header ── */}
        <div className="modal-header">
          <div>
            <span className="modal-order-id">Order #{shortId}</span>
            <span
              className="modal-status-badge"
              style={{ background: statusInfo.color, color: statusInfo.text }}
            >
              {statusInfo.label}
            </span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">

          {/* ── Map ── */}
          <div className="modal-section">
            <h4 className="modal-section-title">📍 Delivery Location</h4>
            {!hasCoords && (
              <p className="modal-no-location">No GPS coordinates available.</p>
            )}
            <div ref={mapRef} className="modal-map" />
            {order.location?.text && (
              <p className="modal-address-text">{order.location.text}</p>
            )}
            {order.address?.address1 && (
              <p className="modal-address-text" style={{ marginTop: 2 }}>
                {order.address.address1}
              </p>
            )}
            {hasCoords && (
              <a
                className="modal-maps-link"
                href={`https://maps.google.com/?q=${lat},${lng}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open in Google Maps ↗
              </a>
            )}
          </div>

          {/* ── Customer Info ── */}
          <div className="modal-section">
            <h4 className="modal-section-title">👤 Customer Details</h4>
            <div className="modal-info-grid">
              <div className="modal-info-row">
                <span className="modal-info-label">Phone</span>
                <span className="modal-info-value">📞 {order.phonenumber || '—'}</span>
              </div>
              <div className="modal-info-row">
                <span className="modal-info-label">Placed</span>
                <span className="modal-info-value">
                  {order.createdAt
                    ? new Date(order.createdAt).toLocaleString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })
                    : '—'}
                </span>
              </div>
              {order.deliveryInstructions && (
                <div className="modal-info-row">
                  <span className="modal-info-label">Note</span>
                  <span className="modal-info-value" style={{ color: '#9a6f00' }}>
                    📝 {order.deliveryInstructions}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ── Items ── */}
          <div className="modal-section">
            <h4 className="modal-section-title">🛒 Order Items</h4>
            <div className="modal-items-table">
              <div className="modal-items-head">
                <span>Item</span>
                <span>Category</span>
                <span className="text-center">Qty</span>
                <span className="text-right">Unit Price</span>
                <span className="text-right">Subtotal</span>
              </div>
              {(order.items || []).map((item, i) => (
                <div key={i} className="modal-item-row">
                  {item.image ? (
                    <span className="modal-item-name-with-img">
                      <img src={item.image} alt={item.name} className="modal-item-img" />
                      {item.name}
                    </span>
                  ) : (
                    <span className="modal-item-name">{item.name}</span>
                  )}
                  <span className="modal-item-cat">{item.category || '—'}</span>
                  <span className="text-center modal-item-qty">
                    {item.qty} {item.category === 'Vegetables' ? 'kg' : 'pcs'}
                  </span>
                  <span className="text-right">₹{Number(item.price).toFixed(2)}</span>
                  <span className="text-right modal-item-subtotal">
                    ₹{(Number(item.price) * Number(item.qty)).toFixed(2)}
                  </span>
                </div>
              ))}
              <div className="modal-items-total">
                <span>Total</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
            </div>
          </div>

        </div>

        {/* ── Footer Actions ── */}
        <div className="modal-footer">
          <button className="modal-btn secondary" onClick={onClose}>Close</button>
          {nextLabel && (
            <button
              className="modal-btn primary"
              onClick={() => { onAdvance(id, order.status); onClose(); }}
            >
              {nextLabel}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
