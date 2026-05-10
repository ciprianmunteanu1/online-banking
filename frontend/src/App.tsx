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
import AdminCustomersPage from './pages/AdminCustomersPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
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
            path="/transactions"
            element={<ProtectedRoute><TransactionsPage /></ProtectedRoute>}
          />
          <Route
            path="/beneficiaries"
            element={<ProtectedRoute><BeneficiariesPage /></ProtectedRoute>}
          />
          <Route
            path="/admin/customers"
            element={<ProtectedRoute><AdminCustomersPage /></ProtectedRoute>}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
