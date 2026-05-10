import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AssetsPage from './pages/AssetsPage';
import AssetDetailPage from './pages/AssetDetailPage';
import AssetFormPage from './pages/AssetFormPage';
import RepairsPage from './pages/RepairsPage';
import RepairDetailPage from './pages/RepairDetailPage';
import ReportsPage from './pages/ReportsPage';
import MovementsPage from './pages/MovementsPage';
import WarehouseStockPage from './pages/WarehouseStockPage';
import AdminPage from './pages/AdminPage';
function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const token = localStorage.getItem('access_token');
  if (!user && !token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const loadMe = useAuthStore((s) => s.loadMe);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="assets" element={<AssetsPage />} />
          <Route path="assets/new" element={<AssetFormPage />} />
          <Route path="assets/:id" element={<AssetDetailPage />} />
          <Route path="assets/:id/edit" element={<AssetFormPage />} />
          <Route path="movements" element={<MovementsPage />} />
          <Route path="warehouse-stock" element={<WarehouseStockPage />} />
          <Route path="repairs" element={<RepairsPage />} />
          <Route path="repairs/:id" element={<RepairDetailPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="admin" element={<AdminPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
