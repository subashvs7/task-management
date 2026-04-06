import { useEffect, useState, useCallback } from 'react';
import {
  Bell, BellOff, CheckCheck, Trash2, RefreshCw,
  CheckCircle2, Clock, AlertCircle, Info,
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

// ── Types ─────────────────────────────────────────────────────────────────────

interface NotificationData {
  task_id?:    number;
  task_title?: string;
  project_id?: number;
  message?:    string;
  type?:       string;
  [key: string]: unknown;
}

interface Notification {
  id:              string;
  type:            string;
  notifiable_id:   number;
  notifiable_type: string;
  data:            NotificationData;
  read_at:         string | null;
  created_at:      string;
  updated_at:      string;
}

interface PaginatedNotifications {
  data:         Notification[];
  current_page: number;
  last_page:    number;
  per_page:     number;
  total:        number;
}

type FilterType = 'all' | 'unread' | 'read';

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseData(raw: unknown): NotificationData {
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return {}; }
  }
  return (raw as NotificationData) ?? {};
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60)     return 'just now';
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function getIcon(type: string) {
  if (type.includes('TaskAssigned'))                    return <CheckCircle2 className="w-5 h-5 text-blue-500"   />;
  if (type.includes('Deadline') || type.includes('Due')) return <Clock        className="w-5 h-5 text-orange-500" />;
  if (type.includes('Alert')   || type.includes('Warning')) return <AlertCircle className="w-5 h-5 text-red-500" />;
  return <Info className="w-5 h-5 text-gray-400" />;
}

function getTitle(type: string): string {
  if (type.includes('TaskAssigned')) return 'Task Assigned';
  if (type.includes('Comment'))      return 'New Comment';
  if (type.includes('Deadline'))     return 'Deadline Reminder';
  return 'Notification';
}

// ── NotificationItem ──────────────────────────────────────────────────────────

interface ItemProps {
  notification: Notification;
  onMarkRead:   (id: string) => void;
  onDelete:     (id: string) => void;
  isDeleting:   boolean;
}

function NotificationItem({ notification, onMarkRead, onDelete, isDeleting }: ItemProps) {
  const isUnread = !notification.read_at;
  const data     = parseData(notification.data);

  return (
    <div className={`group relative flex items-start gap-4 p-4 rounded-xl border transition-all duration-150 ${
      isUnread
        ? 'bg-indigo-50/40 border-indigo-100 hover:bg-indigo-50'
        : 'bg-white border-gray-100 hover:bg-gray-50'
    }`}>

      {/* Unread dot */}
      {isUnread && (
        <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-indigo-500" />
      )}

      {/* Icon */}
      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
        isUnread ? 'bg-indigo-100' : 'bg-gray-100'
      }`}>
        {getIcon(notification.type)}
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0 pr-6">
        <p className={`text-sm font-semibold ${isUnread ? 'text-gray-900' : 'text-gray-600'}`}>
          {getTitle(notification.type)}
        </p>
        <p className={`text-sm mt-0.5 leading-relaxed ${isUnread ? 'text-gray-700' : 'text-gray-500'}`}>
          {data.message ?? 'You have a new notification'}
        </p>

        {data.task_title && (
          <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 bg-white border border-gray-200 rounded-md">
            <CheckCircle2 className="w-3 h-3 text-blue-400" />
            <span className="text-xs text-gray-600 truncate max-w-[200px]">{data.task_title}</span>
          </div>
        )}

        <div className="flex items-center gap-3 mt-2">
          <span className="text-xs text-gray-400">{timeAgo(notification.created_at)}</span>
          {isUnread && (
            <button
              onClick={() => onMarkRead(notification.id)}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Mark as read
            </button>
          )}
        </div>
      </div>

      {/* Delete button */}
      <button
        onClick={() => onDelete(notification.id)}
        disabled={isDeleting}
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all disabled:opacity-50"
        title="Delete"
      >
        {isDeleting
          ? <div className="w-4 h-4 border-2 border-gray-300 border-t-red-400 rounded-full animate-spin" />
          : <Trash2 className="w-4 h-4" />
        }
      </button>
    </div>
  );
}

// ══ Page ══════════════════════════════════════════════════════════════════════

export default function Notifications() {
  const [paginated,   setPaginated  ] = useState<PaginatedNotifications | null>(null);
  const [loading,     setLoading    ] = useState(true);
  const [refreshing,  setRefreshing ] = useState(false);
  const [filter,      setFilter     ] = useState<FilterType>('all');
  const [unreadCount, setUnreadCount] = useState(0);
  const [deletingId,  setDeletingId ] = useState<string | null>(null);
  const [page,        setPage       ] = useState(1);

  // ── Fetch ───────────────────────────────────────────────────────────────────

  const fetchNotifications = useCallback(async (pageNum = 1, showRefresh = false) => {
    showRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const res = await api.get('/notifications', { params: { page: pageNum } });
      setPaginated(res.data);
      setPage(pageNum);
      // Sync unread count from the loaded page
      const unread = (res.data.data as Notification[]).filter((n: Notification) => !n.read_at).length;
      // Only update if we're on page 1 — otherwise keep the real count
      if (pageNum === 1) setUnreadCount(unread);
    } catch {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await api.get('/notifications/unread');
      setUnreadCount(res.data.count ?? 0);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, [fetchNotifications, fetchUnreadCount]);

  // ── Actions ─────────────────────────────────────────────────────────────────

  const handleMarkRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setPaginated(prev => prev ? {
        ...prev,
        data: prev.data.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n),
      } : prev);
      setUnreadCount(c => Math.max(0, c - 1));
    } catch {
      toast.error('Failed to mark as read');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setPaginated(prev => prev ? {
        ...prev,
        data: prev.data.map(n => ({ ...n, read_at: new Date().toISOString() })),
      } : prev);
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark all as read');
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await api.delete(`/notifications/${id}`);
      setPaginated(prev => {
        if (!prev) return prev;
        const wasUnread = prev.data.find(n => n.id === id && !n.read_at);
        if (wasUnread) setUnreadCount(c => Math.max(0, c - 1));
        return { ...prev, data: prev.data.filter(n => n.id !== id), total: prev.total - 1 };
      });
      toast.success('Notification deleted');
    } catch {
      toast.error('Failed to delete notification');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('Delete all notifications? This cannot be undone.')) return;
    try {
      await api.delete('/notifications/delete-all');
      setPaginated(prev => prev ? { ...prev, data: [], total: 0 } : prev);
      setUnreadCount(0);
      toast.success('All notifications deleted');
    } catch {
      toast.error('Failed to delete all notifications');
    }
  };

  // ── Derived ─────────────────────────────────────────────────────────────────

  const allNotifications = paginated?.data ?? [];
  const filtered = allNotifications.filter(n => {
    if (filter === 'unread') return !n.read_at;
    if (filter === 'read')   return !!n.read_at;
    return true;
  });
  const readCount = allNotifications.filter(n => !!n.read_at).length;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-3xl mx-auto">

      {/* Sub-header — actions row (page title is already in Layout Header) */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-500">
          {paginated?.total ?? 0} total
          {unreadCount > 0 && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
              {unreadCount} unread
            </span>
          )}
        </p>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchNotifications(page, true)}
            disabled={refreshing}
            className="btn-secondary flex items-center gap-1.5 text-sm py-1.5 px-3"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead} className="btn-secondary flex items-center gap-1.5 text-sm py-1.5 px-3">
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </button>
          )}

          {allNotifications.length > 0 && (
            <button onClick={handleDeleteAll} className="btn-danger flex items-center gap-1.5 text-sm py-1.5 px-3">
              <Trash2 className="w-4 h-4" />
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit">
        {([
          { key: 'all',    label: `All (${paginated?.total ?? 0})` },
          { key: 'unread', label: `Unread (${unreadCount})` },
          { key: 'read',   label: `Read (${readCount})` },
        ] as { key: FilterType; label: string }[]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filter === tab.key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            {filter === 'unread'
              ? <BellOff className="w-8 h-8 text-gray-300" />
              : <Bell    className="w-8 h-8 text-gray-300" />}
          </div>
          <p className="text-gray-500 font-medium">
            {filter === 'unread' ? 'No unread notifications'
              : filter === 'read' ? 'No read notifications'
              : 'No notifications yet'}
          </p>
          {filter === 'all' && (
            <p className="text-gray-400 text-sm mt-1">You're all caught up!</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(n => (
            <NotificationItem
              key={n.id}
              notification={n}
              onMarkRead={handleMarkRead}
              onDelete={handleDelete}
              isDeleting={deletingId === n.id}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {(paginated?.last_page ?? 1) > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => fetchNotifications(page - 1)}
            disabled={page === 1 || loading}
            className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {paginated?.last_page}
          </span>
          <button
            onClick={() => fetchNotifications(page + 1)}
            disabled={page === paginated?.last_page || loading}
            className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}