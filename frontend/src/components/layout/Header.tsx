import { useState, useEffect } from 'react';
import { Bell, Menu } from 'lucide-react';
import { useAppSelector } from '../../hooks/useAppDispatch';
import { Link } from 'react-router-dom';
import api from '../../services/api';

interface HeaderProps {
  title: string;
  onMenuToggle: () => void;
}

export default function Header({ title, onMenuToggle }: HeaderProps) {
  const { user } = useAppSelector((state) => state.auth);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        // ── /notifications/unread returns { count, data }
        const res = await api.get('/notifications/unread');
        setUnreadCount(res.data?.count ?? 0);
      } catch {
        // non-critical — bell just shows no badge
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 60_000); // poll every 60 s
    return () => clearInterval(interval);
  }, []);

  const initials = user?.name?.charAt(0).toUpperCase() ?? '?';
  const roleName = user?.roles?.[0]?.name?.replace(/_/g, ' ') ?? '';

  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3.5 flex items-center justify-between sticky top-0 z-30">

      {/* Left — hamburger + page title */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuToggle}
          className="lg:hidden text-gray-700 hover:text-gray-900 p-1 -ml-1"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      </div>

      {/* Right — bell + user chip */}
      <div className="flex items-center gap-4 sm:gap-6">

        {/* Notification bell */}
        <Link to="/notifications" className="relative text-gray-600 hover:text-gray-800">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>

        {/* User chip */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-gray-800 leading-tight">{user?.name}</p>
            <p className="text-xs text-gray-500 capitalize mt-0.5">{roleName}</p>
          </div>
        </div>

      </div>
    </header>
  );
}