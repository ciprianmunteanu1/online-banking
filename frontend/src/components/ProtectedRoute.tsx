import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { accessToken } = useAuth();
  if (!accessToken) return <Navigate to="/" replace />;
  return <>{children}</>;
}
