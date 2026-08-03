import { NavLink } from 'react-router-dom';

const items = [
  { to: '/orders', label: 'Live Orders' },
  { to: '/order-list', label: 'Order List' },
  { to: '/pricelist', label: 'Price List' },
  { to: '/stores', label: 'Store List' },
  { to: '/store', label: 'Store Enrollment' }
];

export default function Sidebar({ open, onClose }) {
  return (
    <>
      <aside className={`app-sidebar ${open ? 'open' : ''}`}>
        <div className="app-sidebar-head">
          <h2>Pages</h2>
          <button
            type="button"
            className="app-sidebar-close"
            onClick={onClose}
            aria-label="Close navigation"
          >
            ×
          </button>
        </div>

        <nav className="app-sidebar-nav">
          {items.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `app-side-link${isActive ? ' active' : ''}`}
              onClick={onClose}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <button
        type="button"
        className={`app-sidebar-backdrop ${open ? 'show' : ''}`}
        onClick={onClose}
        aria-label="Close menu overlay"
      />
    </>
  );
}
