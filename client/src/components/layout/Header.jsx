import { useApp } from '../../context/AppContext';

export default function Header({ onMenuToggle }) {
  const { isOnDuty, setIsOnDuty, dutyLoading, dutySaving } = useApp();

  return (
    <header className="app-header">
      <div className="app-header-left">
        <button
          type="button"
          className="menu-toggle-btn"
          aria-label="Open navigation"
          onClick={onMenuToggle}
        >
          <span />
          <span />
          <span />
        </button>

        <div className="app-brand-wrap">
          <span className="brand-dot" />
          <h1 className="app-brand">admin<span className="brand-accent">.healthyeluru</span></h1>
        </div>
      </div>

      <div className="app-header-right">
        <label className="on-duty-toggle" title="Toggle to go on duty">
          <input
            type="checkbox"
            checked={isOnDuty}
            disabled={dutyLoading || dutySaving}
            onChange={e => { void setIsOnDuty(e.target.checked); }}
          />
          <span className="toggle-slider" />
          <span className="toggle-label">{isOnDuty ? 'On Duty' : 'Off Duty'}</span>
        </label>
      </div>
    </header>
  );
}
