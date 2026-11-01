import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './lib/auth';
import ProtectedRoute, { RoleHome } from './components/ProtectedRoute';
import { LoadingState } from './components/QueryState';
// #27: har sahifa alohida yuklanadi (code-splitting) — birinchi ochilish tezroq
import { lazy, Suspense } from 'react';
const PublicPageSettingsPage = lazy(() => import('./pages/PublicPageSettingsPage'));
const TelegramBotPage = lazy(() => import('./pages/TelegramBotPage'));
const SuperTelegramBotsPage = lazy(() => import('./pages/SuperTelegramBotsPage'));
const SuperStaffBotPage = lazy(() => import('./pages/SuperStaffBotPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const CompaniesPage = lazy(() => import('./pages/CompaniesPage'));
const CompanyDetailPage = lazy(() => import('./pages/CompanyDetailPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const PlansPage = lazy(() => import('./pages/PlansPage'));
const CatalogPage = lazy(() => import('./pages/CatalogPage'));
const MenuPage = lazy(() => import('./pages/MenuPage'));
const ModifiersPage = lazy(() => import('./pages/ModifiersPage'));
const TablesPage = lazy(() => import('./pages/TablesPage'));
const OrdersPage = lazy(() => import('./pages/OrdersPage'));
const CashShiftsPage = lazy(() => import('./pages/CashShiftsPage'));
const BranchesPage = lazy(() => import('./pages/BranchesPage'));
const StaffPage = lazy(() => import('./pages/StaffPage'));
const KitchenPage = lazy(() => import('./pages/KitchenPage'));
const WaiterPage = lazy(() => import('./pages/WaiterPage'));
const TgMenuPage = lazy(() => import('./pages/tg/TgMenuPage'));
const TgCartPage = lazy(() => import('./pages/tg/TgCartPage'));
const TgOrderStatusPage = lazy(() => import('./pages/tg/TgOrderStatusPage'));
const PrintersPage = lazy(() => import('./pages/PrintersPage'));
const DeliveryPage = lazy(() => import('./pages/DeliveryPage'));
const KitchenStationsPage = lazy(() => import('./pages/KitchenStationsPage'));
const StaffTgEntryPage = lazy(() => import('./pages/StaffTgEntryPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

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
      {/* #27: lazy sahifa yuklanguncha eski sahifa ko'rinib turadi (butun ekran spinnerga almashmaydi) */}
      <BrowserRouter future={{ v7_startTransition: true }}>
        <AuthProvider>
          <Suspense fallback={<LoadingState large />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            {/* Telegram Mini App (public, customer-facing) */}
            <Route path="/tg" element={<TgMenuPage />} />
            <Route path="/tg/cart" element={<TgCartPage />} />
            <Route path="/tg/order/:id" element={<TgOrderStatusPage />} />
            {/* #37: xodimlar boti Mini App'i */}
            <Route path="/tg/staff" element={<StaffTgEntryPage />} />

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
              path="/catalog"
              element={
                <ProtectedRoute requiredRole="super_admin">
                  <CatalogPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/public-page"
              element={
                <ProtectedRoute requiredRole="company_admin">
                  <PublicPageSettingsPage />
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
                <ProtectedRoute requiredRole={['company_admin', 'manager', 'waiter', 'cashier']}>
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
              path="/printers"
              element={
                <ProtectedRoute requiredRole={['company_admin', 'manager']}>
                  <PrintersPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/delivery"
              element={
                <ProtectedRoute requiredRole={['company_admin', 'manager', 'cashier']}>
                  <DeliveryPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/kitchen-stations"
              element={
                <ProtectedRoute requiredRole={['company_admin', 'manager']}>
                  <KitchenStationsPage />
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

            <Route
              path="/telegram-bot"
              element={
                <ProtectedRoute requiredRole="company_admin">
                  <TelegramBotPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/telegram-bots"
              element={
                <ProtectedRoute requiredRole="super_admin">
                  <SuperTelegramBotsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/staff-bot"
              element={
                <ProtectedRoute requiredRole="super_admin">
                  <SuperStaffBotPage />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<ProtectedRoute><RoleHome /></ProtectedRoute>} />
            {/* #27: production'da "/" — serverdagi landing; kirgan foydalanuvchi /home ga yo'naltiriladi */}
            <Route path="/home" element={<ProtectedRoute><RoleHome /></ProtectedRoute>} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
