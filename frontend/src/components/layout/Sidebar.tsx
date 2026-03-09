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
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { logout } from '../../store/slices/authSlice';

// ── Nav items  (order matches the task-creation flow) ─────────────────────────
//
//  WORKSPACE   → Dashboard
//  PLANNING    → Projects → Epics → User Stories → Tasks → Backlog
//  INSIGHTS    → Reports → Activity Log → Notifications
//  ADMIN       → Users (admin/hr) → Companies (admin only)

const NAV_GROUPS = [
  {
    label: 'Workspace',
    items: [
      { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    label: 'Planning',
    items: [
      { to: '/projects',     icon: FolderKanban,    label: 'Projects'     },
      { to: '/epics',        icon: Layers,          label: 'Epics'        },
      { to: '/user-stories', icon: ScrollText,      label: 'User Stories' },
      { to: '/tasks',        icon: CheckSquare,     label: 'Tasks'        },
      { to: '/backlog',      icon: BookOpen,        label: 'Backlog'      },
    ],
  },
  {
    label: 'Insights',
    items: [
      { to: '/reports',       icon: BarChart2,  label: 'Reports'      },
      { to: '/activity',      icon: Activity,   label: 'Activity Log' },
      { to: '/notifications', icon: Bell,       label: 'Notifications'},
    ],
  },
  {
    label: 'Admin',
    items: [
      { to: '/users',     icon: Users,     label: 'Users',     roles: ['admin', 'hr']  },
      { to: '/companies', icon: Building2, label: 'Companies', roles: ['admin']        },
    ],
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const dispatch  = useAppDispatch();
  const { user }  = useAppSelector((state) => state.auth);
  const userRole  = (user as any)?.roles?.[0]?.name ?? '';

  const handleLogout = async () => {
    await dispatch(logout());
  };

  const initials = user?.name
    ? user.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col min-h-screen">

      {/* ── Logo ─────────────────────────────────────────────────────────── */}
      <div className="px-5 py-5 border-b border-gray-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <FolderKanban className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-white tracking-tight leading-none">TaskFlow</h1>
            <p className="text-[10px] text-gray-500 font-medium mt-0.5">Project Suite</p>
          </div>
        </div>
      </div>

      {/* ── User info ─────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-gray-800/60">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {initials}
          </div>
          <div className="overflow-hidden flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate leading-tight">{user?.name}</p>
            <p className="text-[10px] text-gray-400 capitalize truncate mt-0.5">
              {userRole.replace(/_/g, ' ')}
            </p>
          </div>
        </div>
      </div>

      {/* ── Navigation ────────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter((item) => {
            if (!('roles' in item)) return true;
            return item.roles?.includes(userRole);
          });
          if (!visibleItems.length) return null;

          return (
            <div key={group.label}>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-3 mb-1.5">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {visibleItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      [
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                        isActive
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40'
                          : 'text-gray-400 hover:bg-gray-800 hover:text-white',
                      ].join(' ')
                    }
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <div className="px-3 py-3 border-t border-gray-800 space-y-0.5">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            [
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
              isActive
                ? 'bg-indigo-600 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white',
            ].join(' ')
          }
        >
          <Settings className="w-4 h-4 flex-shrink-0" />
          Settings
        </NavLink>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:bg-red-500/15 hover:text-red-400 transition-all duration-150"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          Logout
        </button>
      </div>

    </aside>
  );
}