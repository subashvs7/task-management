import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useSidebar } from '../../context/SidebarContextt';

export default function AppLayout() {
  const { collapsed, mobile } = useSidebar();

  // Offset main content on desktop so it doesn't sit under sidebar
  const offset = !mobile
    ? collapsed ? 'lg:ml-[68px]' : 'lg:ml-64'
    : 'ml-0';

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className={`flex min-h-screen flex-col transition-all duration-300 ${offset}`}>
        <Header />
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}