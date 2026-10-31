import { Navigate } from 'react-router-dom';
import { useAuth, homePathFor } from '../lib/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string | string[];
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole) {
    const allowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!user || !allowed.includes(user.role)) {
      return <Navigate to={homePathFor(user?.role)} replace />;
    }
  }

  return <>{children}</>;
}

/** "/" — rolning ish ekraniga (oshpaz → KDS, ofitsiant → zal, kassir → kassa) */
export function RoleHome() {
  const { user } = useAuth();
  return <Navigate to={homePathFor(user?.role)} replace />;
}
