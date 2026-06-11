import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './lib/auth';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CompaniesPage from './pages/CompaniesPage';
import CompanyDetailPage from './pages/CompanyDetailPage';
import HistoryPage from './pages/HistoryPage';
import PlansPage from './pages/PlansPage';
import MenuPage from './pages/MenuPage';
import ModifiersPage from './pages/ModifiersPage';
import TablesPage from './pages/TablesPage';
import OrdersPage from './pages/OrdersPage';
import CashShiftsPage from './pages/CashShiftsPage';
import BranchesPage from './pages/BranchesPage';
import StaffPage from './pages/StaffPage';
import KitchenPage from './pages/KitchenPage';
import WaiterPage from './pages/WaiterPage';
import TgMenuPage from './pages/tg/TgMenuPage';
import TgCartPage from './pages/tg/TgCartPage';
import TgOrderStatusPage from './pages/tg/TgOrderStatusPage';
import NotFoundPage from './pages/NotFoundPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            {/* Telegram Mini App (public, customer-facing) */}
            <Route path="/tg" element={<TgMenuPage />} />
            <Route path="/tg/cart" element={<TgCartPage />} />
            <Route path="/tg/order/:id" element={<TgOrderStatusPage />} />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/companies"
              element={
                <ProtectedRoute requiredRole="super_admin">
                  <CompaniesPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/companies/:id"
              element={
                <ProtectedRoute requiredRole="super_admin">
                  <CompanyDetailPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/plans"
              element={
                <ProtectedRoute requiredRole="super_admin">
                  <PlansPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/history"
              element={
                <ProtectedRoute requiredRole="super_admin">
                  <HistoryPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/menu"
              element={
                <ProtectedRoute requiredRole={['company_admin', 'manager']}>
                  <MenuPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/modifiers"
              element={
                <ProtectedRoute requiredRole={['company_admin', 'manager']}>
                  <ModifiersPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/tables"
              element={
                <ProtectedRoute requiredRole={['company_admin', 'manager', 'waiter']}>
                  <TablesPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/waiter"
              element={
                <ProtectedRoute requiredRole={['company_admin', 'manager', 'waiter']}>
                  <WaiterPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/orders"
              element={
                <ProtectedRoute requiredRole={['company_admin', 'manager', 'waiter', 'cashier']}>
                  <OrdersPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/kitchen"
              element={
                <ProtectedRoute requiredRole={['company_admin', 'manager', 'chef']}>
                  <KitchenPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/cash-shifts"
              element={
                <ProtectedRoute requiredRole={['company_admin', 'cashier']}>
                  <CashShiftsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/branches"
              element={
                <ProtectedRoute requiredRole="company_admin">
                  <BranchesPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/staff"
              element={
                <ProtectedRoute requiredRole="company_admin">
                  <StaffPage />
                </ProtectedRoute>
              }
            />

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
