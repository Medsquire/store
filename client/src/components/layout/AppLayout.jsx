import { useEffect, useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';

export default function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!sidebarOpen) {
      return;
    }

    document.body.classList.add('layout-menu-open');
    return () => {
      document.body.classList.remove('layout-menu-open');
    };
  }, [sidebarOpen]);

  return (
    <div className="app-shell">
      <Header onMenuToggle={() => setSidebarOpen(true)} />

      <div className="app-body">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="app-main">
          {children}
        </main>
      </div>

      <Footer />
    </div>
  );
}
