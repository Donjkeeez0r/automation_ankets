import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../types';

interface NavItem {
  to: string;
  label: string;
}

const PROFILE_NAV: NavItem = { to: '/profile', label: 'Личный кабинет' };

const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  ADMIN: [
    { to: '/users', label: 'Пользователи' },
    PROFILE_NAV,
  ],
  EMPLOYEE: [
    { to: '/companies', label: 'Компании' },
    PROFILE_NAV,
  ],
  AUDITOR: [
    { to: '/questionnaires', label: 'Анкеты' },
    { to: '/companies', label: 'Компании' },
    PROFILE_NAV,
  ],
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = (user && NAV_BY_ROLE[user.role]) ?? [PROFILE_NAV];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-gray-200 flex flex-col">
      <div className="px-6 py-5 border-b border-gray-200">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
          КОМПАНИЯ
        </div>
        <div className="text-sm font-semibold text-gray-800 leading-tight">
          Анкетирование ИБ
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-gray-200">
        {user?.name && (
          <div className="text-xs text-gray-500 mb-0.5 truncate">{user.name}</div>
        )}
        {user?.organization && (
          <div className="text-xs text-gray-400 mb-3 truncate">{user.organization}</div>
        )}
        <button
          onClick={handleLogout}
          className="w-full text-left text-xs text-gray-500 hover:text-red-600 transition-colors"
        >
          Выйти
        </button>
      </div>
    </aside>
  );
}
