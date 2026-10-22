import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS } from '../lib/roles';
import type { Role } from '../types';

interface NavItem {
  to: string;
  label: string;
}

// Пункты сгруппированы по смыслу: рабочие разделы отдельно от настроек,
// иначе «Анкеты» (анкеты подрядчиков) и «Шаблон анкеты» (набор вопросов)
// в плоском списке читаются как одно и то же.
interface NavGroup {
  title?: string;
  items: NavItem[];
}

const PROFILE_NAV: NavItem = { to: '/profile', label: 'Личный кабинет' };

const NAV_BY_ROLE: Record<Role, NavGroup[]> = {
  ADMIN: [
    {
      title: 'Администрирование',
      items: [
        { to: '/users', label: 'Пользователи' },
        { to: '/questions', label: 'Шаблон анкеты' },
      ],
    },
    {
      title: 'Скоринг',
      items: [
        { to: '/companies', label: 'Компании' },
        { to: '/questionnaires', label: 'Анкеты' },
      ],
    },
  ],
  EMPLOYEE: [
    {
      title: 'Скоринг',
      items: [
        { to: '/companies', label: 'Компании' },
        { to: '/questionnaires', label: 'Анкеты' },
      ],
    },
    {
      title: 'Настройки',
      items: [{ to: '/questions', label: 'Шаблон анкеты' }],
    },
  ],
};

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
    isActive
      ? 'bg-blue-50 text-blue-700'
      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
  }`;

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const groups = (user && NAV_BY_ROLE[user.role]) ?? [];

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

      <nav className="flex-1 px-3 py-4 space-y-4">
        {groups.map((group, i) => (
          <div key={group.title ?? i} className="space-y-1">
            {group.title && (
              <div className="px-3 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                {group.title}
              </div>
            )}
            {group.items.map((item) => (
              <NavLink key={item.to} to={item.to} className={linkClass}>
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-gray-200">
        <NavLink to={PROFILE_NAV.to} className={linkClass}>
          {PROFILE_NAV.label}
        </NavLink>

        <div className="mt-3 px-3">
          {user?.name && (
            <div className="text-xs text-gray-600 truncate">{user.name}</div>
          )}
          {user?.role && (
            <div className="text-xs text-gray-400 truncate">
              {ROLE_LABELS[user.role]}
            </div>
          )}
          {user?.organization && (
            <div className="text-xs text-gray-400 mb-3 truncate">{user.organization}</div>
          )}
          <button
            onClick={handleLogout}
            className="mt-2 w-full text-left text-xs text-gray-500 hover:text-red-600 transition-colors"
          >
            Выйти
          </button>
        </div>
      </div>
    </aside>
  );
}
