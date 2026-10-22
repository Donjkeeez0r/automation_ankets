import { Navigate, Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../types';

interface LayoutProps {
  // Роли, которым доступны вложенные маршруты; не задано — любая авторизованная
  allowedRoles?: Role[];
}

export default function Layout({ allowedRoles }: LayoutProps) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (allowedRoles && (!user || !allowedRoles.includes(user.role)))
    return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
