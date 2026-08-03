import { NavLink } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

export default function Navbar() {
  const { isOnDuty, setIsOnDuty } = useApp();

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <span className="brand-dot" />
          admin<span className="brand-accent">.healthyeluru</span>
        </div>

        <ul className="nav-links">
          <li>
            <NavLink
              to="/orders"
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              Live Orders
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/pricelist"
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              Price List
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/order-list"
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              Order List
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/stores"
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              Store List
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/store"
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              Store Enrollment
            </NavLink>
          </li>
        </ul>

        <div className="navbar-right">
          <label className="on-duty-toggle" title="Toggle to go on duty">
            <input
              type="checkbox"
              checked={isOnDuty}
              onChange={e => setIsOnDuty(e.target.checked)}
            />
            <span className="toggle-slider" />
            <span className="toggle-label">{isOnDuty ? 'On Duty' : 'Off Duty'}</span>
          </label>
        </div>
      </div>
    </nav>
  );
}
