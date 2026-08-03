import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import AppLayout from './components/layout/AppLayout';
import OrdersPage from './pages/OrdersPage';
import OrderListPage from './pages/OrderListPage';
import StorePage from './pages/StorePage';
import PriceListPage from './pages/PriceListPage';
import StoreListPage from './pages/StoreListPage';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/"          element={<Navigate to="/orders" replace />} />
            <Route path="/orders"    element={<OrdersPage />} />
            <Route path="/order-list" element={<OrderListPage />} />
            <Route path="/stores"    element={<StoreListPage />} />
            <Route path="/store"     element={<StorePage />} />
            <Route path="/pricelist" element={<PriceListPage />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </AppProvider>
  );
}
