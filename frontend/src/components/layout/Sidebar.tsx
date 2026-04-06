import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  Layers,
  ScrollText,
  CheckSquare,
  BookOpen,
  Users,
  Building2,
  Bell,
  Settings,
  LogOut,
  Activity,
  BarChart2,
  X,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { logout } from '../../store/slices/authSlice';

const NAV_GROUPS = [
  {
    label: 'Workspace',
    items: [{ to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' }],
  },
  {
    label: 'Planning',
    items: [
      { to: '/projects', icon: FolderKanban, label: 'Projects' },
      { to: '/epics', icon: Layers, label: 'Epics' },
      { to: '/user-stories', icon: ScrollText, label: 'User Stories' },
      { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
      { to: '/backlog', icon: BookOpen, label: 'Backlog' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { to: '/reports', icon: BarChart2, label: 'Reports' },
      { to: '/activity', icon: Activity, label: 'Activity Log' },
      { to: '/notifications', icon: Bell, label: 'Notifications' },
    ],
  },
  {
    label: 'Admin',
    items: [
      { to: '/users', icon: Users, label: 'Users', roles: ['admin', 'hr'] },
      { to: '/companies', icon: Building2, label: 'Companies', roles: ['admin'] },
    ],
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const userRole = (user as any)?.roles?.[0]?.name ?? '';

  const handleLogout = async () => {
    await dispatch(logout());
    onClose();
  };

  const initials =
    user?.name
      ? user.name
          .split(' ')
          .map((w: string) => w[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)
      : 'U';

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 lg:hidden z-40"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-72 bg-gray-900 text-white flex flex-col
          transform transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:w-64 min-h-screen lg:border-r lg:border-gray-800
        `}
      >
        {/* Header / Logo */}
        <div className="px-5 py-5 border-b border-gray-800 flex items-center justify-between lg:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <FolderKanban className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold tracking-tight leading-none">TaskFlow</h1>
              <p className="text-[10px] text-gray-500 font-medium mt-0.5">Project Suite</p>
            </div>
          </div>

          {/* Close button - mobile only */}
          <button
            onClick={onClose}
            className="lg:hidden text-gray-400 hover:text-white"
            aria-label="Close menu"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* User info */}
        <div className="px-4 py-3 border-b border-gray-800">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-gray-800/60">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {initials}
            </div>
            <div className="overflow-hidden flex-1 min-w-0">
              <p className="text-sm font-semibold truncate leading-tight">{user?.name}</p>
              <p className="text-[10px] text-gray-400 capitalize truncate mt-0.5">
                {userRole.replace(/_/g, ' ')}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-5">
          {NAV_GROUPS.map((group) => {
            const visibleItems = group.items.filter((item) =>
              !('roles' in item) ? true : item.roles?.includes(userRole)
            );

            if (!visibleItems.length) return null;

            return (
              <div key={group.label}>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-3 mb-2">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {visibleItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={onClose}           // ← close on mobile nav click
                      className={({ isActive }) =>
                        [
                          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                          isActive
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/30'
                            : 'text-gray-300 hover:bg-gray-800 hover:text-white',
                        ].join(' ')
                      }
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-gray-800 space-y-1">
          <NavLink
            to="/settings"
            onClick={onClose}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                isActive ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white',
              ].join(' ')
            }
          >
            <Settings className="w-5 h-5 flex-shrink-0" />
            Settings
          </NavLink>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:bg-red-900/30 hover:text-red-300 transition-all"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}