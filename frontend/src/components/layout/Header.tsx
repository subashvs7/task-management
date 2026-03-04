import { useEffect, useState, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { useAppSelector } from '../../hooks/useAppDispatch';
import { Link, useLocation } from 'react-router-dom';
import api from '../../services/api';

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  const { user } = useAppSelector((state) => state.auth);
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnread = useCallback(async () => {
    try {
      const res = await api.get('/notifications/unread');
      setUnreadCount(res.data.count ?? 0);
    } catch {
      // silent fail
    }
  }, []);

  // Fetch on mount and every 30 seconds
  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  // Refresh unread count when navigating away from notifications page
  useEffect(() => {
    if (location.pathname !== '/notifications') {
      fetchUnread();
    }
  }, [location.pathname, fetchUnread]);

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>

      <div className="flex items-center gap-4">
        {/* Notification bell with badge */}
        <Link to="/notifications" className="relative text-gray-500 hover:text-gray-700 transition-colors">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1 leading-none">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>

        {/* User avatar */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-bold">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-700 leading-none">{user?.name}</p>
            <p className="text-xs text-gray-400 capitalize mt-0.5">
              {user?.roles?.[0]?.name?.replace('_', ' ')}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}