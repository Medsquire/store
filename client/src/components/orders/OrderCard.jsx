const NEXT_ACTION = {
  new:      'Accept Order',
  accepted: 'Mark Picked Up',
  picked:   'Mark Delivered',
};

function calcTotal(items = []) {
  return items.reduce((s, i) => s + Number(i.price) * Number(i.qty), 0);
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function toWhatsappUrl(order, shortId, total, address) {
  const rawPhone = String(order.phonenumber || '').trim();
  const phone = rawPhone.replace(/\D/g, '');
  const itemsText = (order.items || [])
    .map(item => {
      const qty = `${item.qty} ${item.category === 'Vegetables' ? 'kg' : 'pcs'}`;
      const lineTotal = (Number(item.price) * Number(item.qty)).toFixed(2);
      return `- ${item.name} (${qty}) = Rs.${lineTotal}`;
    })
    .join('\n');

  const message = [
    `Order #${shortId}`,
    `Phone: ${rawPhone || '-'}`,
    `Address: ${address}`,
    '',
    'Items:',
    itemsText || '- No items -',
    '',
    `Total: Rs.${total.toFixed(2)}`
  ].join('\n');

  const encoded = encodeURIComponent(message);
  if (phone.length >= 10) {
    return `https://wa.me/${phone}?text=${encoded}`;
  }
  return `https://wa.me/?text=${encoded}`;
}

export default function OrderCard({ order, stage, onAdvance, onView }) {
  const id          = order._id || order.id || '';
  const shortId     = String(id).slice(-6).toUpperCase();
  const total       = calcTotal(order.items);
  const address     = order.location?.text || order.address?.address1 || '—';
  const actionLabel = NEXT_ACTION[stage];

  const onShareWhatsapp = () => {
    const shareUrl = toWhatsappUrl(order, shortId, total, address);
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="kcard">
      <div className="kcard-header">
        <span className="kcard-id">#{shortId}</span>
        <div className="kcard-meta">
          <button
            type="button"
            className="kcard-wa-btn"
            onClick={onShareWhatsapp}
            title="Share on WhatsApp"
            aria-label="Share order on WhatsApp"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M20.52 3.48A11.8 11.8 0 0 0 12.05 0a11.91 11.91 0 0 0-10.3 17.9L0 24l6.27-1.64a11.93 11.93 0 0 0 5.76 1.47h.01A11.96 11.96 0 0 0 24 11.95a11.8 11.8 0 0 0-3.48-8.47zm-8.48 18.3h-.01a9.9 9.9 0 0 1-5.05-1.38l-.36-.21-3.72.98 1-3.62-.24-.37a9.89 9.89 0 0 1 8.38-15.24 9.82 9.82 0 0 1 7 2.9 9.94 9.94 0 0 1-7 16.94zm5.43-7.42c-.3-.15-1.78-.88-2.06-.97-.27-.1-.47-.15-.66.15-.2.3-.76.97-.94 1.17-.17.2-.34.22-.64.07-.3-.15-1.25-.46-2.38-1.48a8.99 8.99 0 0 1-1.65-2.06c-.17-.3-.02-.46.13-.6.13-.12.3-.32.45-.47.15-.15.2-.25.3-.42.1-.17.05-.32-.02-.47-.08-.15-.67-1.62-.93-2.23-.24-.57-.48-.5-.66-.51h-.57c-.2 0-.5.08-.76.37-.27.3-1.02 1-1.02 2.42 0 1.42 1.04 2.8 1.18 2.99.15.2 2.03 3.11 4.93 4.36.69.3 1.23.48 1.65.62.7.22 1.34.19 1.85.12.57-.08 1.78-.73 2.04-1.43.25-.7.25-1.3.17-1.43-.08-.12-.28-.2-.57-.35z"/>
            </svg>
          </button>
          <span className="kcard-time">{timeAgo(order.createdAt)}</span>
        </div>
      </div>

      <div className="kcard-phone">📞 {order.phonenumber || '—'}</div>
      <div className="kcard-address">📍 {address}</div>

      {order.deliveryInstructions && (
        <div className="kcard-note">📝 {order.deliveryInstructions}</div>
      )}

      <div className="kcard-items">
        {(order.items || []).map((item, i) => (
          <div key={i} className="kcard-item-row">
            <span className="kcard-item-name">{item.name}</span>
            <span className="kcard-item-qty">
              {item.qty} {item.category === 'Vegetables' ? 'kg' : 'pcs'}
            </span>
            <span className="kcard-item-price">
              ₹{(Number(item.price) * Number(item.qty)).toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      <div className="kcard-total">Total: ₹{total.toFixed(2)}</div>

      <div className="kcard-footer">
        <button className="kcard-btn view" onClick={() => onView(order)}>View</button>
        {actionLabel ? (
          <button className="kcard-btn primary" onClick={() => onAdvance(id, stage)}>
            {actionLabel}
          </button>
        ) : (
          <span className="kcard-done-tag">✓ Delivered</span>
        )}
      </div>
    </div>
  );
}
