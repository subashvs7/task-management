import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard':     'Dashboard',
  '/projects':      'Projects',
  '/epics':         'Epics',
  '/user-stories':  'User Stories',
  '/tasks':         'Tasks',
  '/backlog':       'Backlog',
  '/reports':       'Reports',
  '/activity':      'Activity Log',
  '/notifications': 'Notifications',
  '/users':         'Users',
  '/companies':     'Companies',
  '/settings':      'Settings',
};

function getTitle(pathname: string): string {
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname];
  const base = '/' + pathname.split('/')[1];
  return ROUTE_TITLES[base] ?? 'TaskFlow';
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title={getTitle(location.pathname)}
          onMenuToggle={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}