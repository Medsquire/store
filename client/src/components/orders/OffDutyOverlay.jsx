export default function OffDutyOverlay({ visible }) {
  if (!visible) return null;
  return (
    <div className="off-duty-overlay">
      <div className="off-duty-box">
        <div className="off-duty-icon">◉</div>
        <h2>You are Off Duty</h2>
        <p>
          Toggle <strong>On Duty</strong> in the top bar to start receiving live orders.
        </p>
      </div>
    </div>
  );
}
