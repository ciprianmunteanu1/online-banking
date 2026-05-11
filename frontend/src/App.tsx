import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import MfaPage from './pages/MfaPage';
import BeneficiariesPage from './pages/BeneficiariesPage';
import DashboardPage from './pages/DashboardPage';
import RegisterPage from './pages/RegisterPage';
import TransactionsPage from './pages/TransactionsPage';
import TransferPage from './pages/TransferPage';
import MerchantPayPage from './pages/MerchantPayPage';
import CardsPage from './pages/CardsPage';
import StatementsPage from './pages/StatementsPage';
import AdminCustomersPage from './pages/AdminCustomersPage';
import AdminAuditPage from './pages/AdminAuditPage';
import SecurityPage from './pages/SecurityPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { NotificationToaster } from './components/NotificationToaster';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <NotificationToaster />
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/mfa" element={<MfaPage />} />
          <Route
            path="/dashboard"
            element={<ProtectedRoute><DashboardPage /></ProtectedRoute>}
          />
          <Route
            path="/transfer"
            element={<ProtectedRoute><TransferPage /></ProtectedRoute>}
          />
          <Route
            path="/merchants/pay"
            element={<ProtectedRoute><MerchantPayPage /></ProtectedRoute>}
          />
          <Route
            path="/transactions"
            element={<ProtectedRoute><TransactionsPage /></ProtectedRoute>}
          />
          <Route
            path="/beneficiaries"
            element={<ProtectedRoute><BeneficiariesPage /></ProtectedRoute>}
          />
          <Route
            path="/cards"
            element={<ProtectedRoute><CardsPage /></ProtectedRoute>}
          />
          <Route
            path="/statements"
            element={<ProtectedRoute><StatementsPage /></ProtectedRoute>}
          />
          <Route
            path="/admin/customers"
            element={<ProtectedRoute><AdminCustomersPage /></ProtectedRoute>}
          />
          <Route
            path="/admin/audit"
            element={<ProtectedRoute><AdminAuditPage /></ProtectedRoute>}
          />
          <Route
            path="/notifications"
            element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>}
          />
          <Route
            path="/security"
            element={<ProtectedRoute><SecurityPage /></ProtectedRoute>}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
