import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const navItems = [
  { to: '/', label: 'Дашборд', icon: '▦', exact: true },
  { to: '/assets', label: 'Техника', icon: '🖥' },
  { to: '/movements', label: 'Перемещения', icon: '📦' },
  { to: '/repairs', label: 'Ремонты', icon: '🔧' },
  { to: '/reports', label: 'Отчёты', icon: '📊' },
  { to: '/admin', label: 'Справочники', icon: '⚙' },
];

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-brand-800 text-white flex flex-col shadow-xl flex-shrink-0">
        <div className="px-6 py-5 border-b border-brand-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <span className="text-brand-800 font-bold text-sm">ИТ</span>
            </div>
            <div>
              <div className="font-bold text-sm leading-tight">ИТ-Техника</div>
              <div className="text-brand-200 text-xs">АО «ИРЗ»</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'text-brand-100 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {user && (
          <div className="px-4 py-4 border-t border-brand-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-brand-600 rounded-full flex items-center justify-center text-sm font-semibold">
                {(user.first_name?.[0] || user.username[0]).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {user.first_name ? `${user.first_name} ${user.last_name}` : user.username}
                </div>
                <div className="text-xs text-brand-200 capitalize">{user.role}</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full text-left text-xs text-brand-200 hover:text-white transition-colors px-1"
            >
              Выйти
            </button>
          </div>
        )}
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
