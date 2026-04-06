import { useEffect, useState, useCallback } from 'react';
import {
  Activity, RefreshCw, Filter, Clock,
  PlusCircle, Trash2, Edit3, ArrowRight, Search,
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import type { Project, User as UserType } from '../types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ActivityLogEntry {
  id: number;
  loggable_type: string;
  loggable_id: number;
  user_id: number;
  user?: UserType;
  action: string;
  description: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

interface PaginatedLogs {
  data: ActivityLogEntry[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60)     return 'just now';
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function getActionIcon(action: string) {
  switch (action) {
    case 'created': return <PlusCircle className="w-4 h-4 text-green-500" />;
    case 'updated': return <Edit3      className="w-4 h-4 text-blue-500"  />;
    case 'deleted': return <Trash2     className="w-4 h-4 text-red-500"   />;
    default:        return <Activity   className="w-4 h-4 text-gray-400"  />;
  }
}

function getActionColor(action: string): string {
  switch (action) {
    case 'created': return 'bg-green-100 text-green-700';
    case 'updated': return 'bg-blue-100 text-blue-700';
    case 'deleted': return 'bg-red-100 text-red-700';
    default:        return 'bg-gray-100 text-gray-600';
  }
}

function getLoggableLabel(type: string): string {
  if (type.includes('Task'))      return 'Task';
  if (type.includes('Project'))   return 'Project';
  if (type.includes('Comment'))   return 'Comment';
  if (type.includes('UserStory')) return 'User Story';
  if (type.includes('Epic'))      return 'Epic';
  if (type.includes('SubTask'))   return 'Sub-task';
  return type.split('\\').pop() ?? type;
}

// ── ValueChange ───────────────────────────────────────────────────────────────

function ValueChange({ field, oldVal, newVal }: { field: string; oldVal: unknown; newVal: unknown }) {
  const fmt = (v: unknown) =>
    v === null || v === undefined
      ? <span className="italic text-gray-400">none</span>
      : <span className="font-medium text-gray-800">{String(v)}</span>;

  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-500">
      <span className="text-gray-400 capitalize">{field.replace(/_/g, ' ')}:</span>
      {fmt(oldVal)}
      <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
      {fmt(newVal)}
    </div>
  );
}

// ── ActivityCard ──────────────────────────────────────────────────────────────

function ActivityCard({ log }: { log: ActivityLogEntry }) {
  const [expanded, setExpanded] = useState(false);

  const changedFields = (log.old_values && log.new_values)
    ? Object.keys(log.new_values).filter(k => !['updated_at', 'created_at'].includes(k))
    : [];

  return (
    <div className="flex gap-4 p-4 hover:bg-gray-50 transition-colors rounded-xl">
      {/* Avatar */}
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold">
        {log.user?.name?.charAt(0).toUpperCase() ?? '?'}
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Badges */}
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                {getActionIcon(log.action)}
                {log.action}
              </span>
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                {getLoggableLabel(log.loggable_type)} #{log.loggable_id}
              </span>
            </div>

            {/* Description */}
            <p className="text-sm text-gray-800 leading-relaxed">
              <span className="font-semibold text-gray-900">{log.user?.name ?? 'Unknown'}</span>{' '}
              {log.description}
            </p>

            {/* Expandable changes */}
            {changedFields.length > 0 && (
              <div className="mt-2">
                <button
                  onClick={() => setExpanded(v => !v)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  {expanded ? 'Hide changes' : `Show ${changedFields.length} change${changedFields.length > 1 ? 's' : ''}`}
                </button>
                {expanded && (
                  <div className="mt-2 space-y-1 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    {changedFields.map(field => (
                      <ValueChange
                        key={field}
                        field={field}
                        oldVal={(log.old_values ?? {})[field]}
                        newVal={(log.new_values ?? {})[field]}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Timestamp */}
          <div className="flex-shrink-0 flex items-center gap-1 text-xs text-gray-400 mt-0.5 whitespace-nowrap">
            <Clock className="w-3 h-3" />
            <span title={new Date(log.created_at).toLocaleString()}>{timeAgo(log.created_at)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Pagination numbers ────────────────────────────────────────────────────────

function PageNumbers({ current, total, onPage }: {
  current: number; total: number; onPage: (p: number) => void;
}) {
  const pages: (number | '...')[] = [];

  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    pages.push(1);
    if (current > 3)         pages.push('...');
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
    if (current < total - 2) pages.push('...');
    pages.push(total);
  }

  return (
    <div className="flex items-center gap-1">
      {pages.map((pg, i) =>
        pg === '...'
          ? <span key={`e${i}`} className="px-2 text-gray-400">…</span>
          : <button
              key={pg}
              onClick={() => onPage(pg)}
              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                current === pg ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >{pg}</button>
      )}
    </div>
  );
}

// ══ Main page ══════════════════════════════════════════════════════════════════

export default function ActivityLog() {
  const [paginated,  setPaginated ] = useState<PaginatedLogs | null>(null);
  const [loading,    setLoading   ] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [projects,   setProjects  ] = useState<Project[]>([]);
  const [users,      setUsers     ] = useState<UserType[]>([]);
  const [page,       setPage      ] = useState(1);

  // Filters
  const [filterProject, setFilterProject] = useState('');
  const [filterUser,    setFilterUser   ] = useState('');
  const [filterAction,  setFilterAction ] = useState('');
  const [filterFrom,    setFilterFrom   ] = useState('');
  const [filterTo,      setFilterTo     ] = useState('');
  const [search,        setSearch       ] = useState('');
  const [activeTab,     setActiveTab    ] = useState<'all' | 'my'>('all');

  // ── Fetch ───────────────────────────────────────────────────────────────────

  const fetchLogs = useCallback(async (pageNum = 1, showRefresh = false) => {
    showRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const endpoint = activeTab === 'my' ? '/activity-logs/my' : '/activity-logs';
      const params: Record<string, string | number> = { page: pageNum };
      if (filterProject) params.project_id = filterProject;
      if (filterUser)    params.user_id    = filterUser;
      if (filterAction)  params.action     = filterAction;
      if (filterFrom)    params.from       = filterFrom;
      if (filterTo)      params.to         = filterTo;

      const res = await api.get(endpoint, { params });
      setPaginated(res.data);
      setPage(pageNum);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to load activity logs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, filterProject, filterUser, filterAction, filterFrom, filterTo]);

  useEffect(() => { fetchLogs(1); }, [fetchLogs]);

  useEffect(() => {
    api.get('/projects').then(r => setProjects(r.data.data ?? r.data)).catch(() => {});
    api.get('/activity-logs/users').then(r => setUsers(r.data.data ?? r.data)).catch(() => {});
  }, []);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const clearFilters = () => {
    setFilterProject(''); setFilterUser(''); setFilterAction('');
    setFilterFrom('');    setFilterTo('');   setSearch('');
  };

  const hasActiveFilters = !!(filterProject || filterUser || filterAction || filterFrom || filterTo);

  const allLogs = paginated?.data ?? [];
  const filteredLogs = search
    ? allLogs.filter(log =>
        log.description.toLowerCase().includes(search.toLowerCase()) ||
        log.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
        log.action.toLowerCase().includes(search.toLowerCase())
      )
    : allLogs;

  // Group by date label
  const groupedLogs: Record<string, ActivityLogEntry[]> = {};
  filteredLogs.forEach(log => {
    const d = new Date(log.created_at);
    const today     = new Date();
    const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
    const label =
      d.toDateString() === today.toDateString()     ? 'Today' :
      d.toDateString() === yesterday.toDateString() ? 'Yesterday' :
      d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    (groupedLogs[label] ??= []).push(log);
  });

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-4xl mx-auto">   {/* ← removed extra wrapping <div> */}

      {/* Page header — title only, no bell/avatar (those are in Layout Header) */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-sm text-gray-500 mt-0.5">
            {paginated?.total ?? 0} total activities recorded
          </p>
        </div>
        <button
          onClick={() => fetchLogs(page, true)}
          disabled={refreshing}
          className="btn-secondary flex items-center gap-1.5 text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit">
        {[{ key: 'all', label: 'All Activity' }, { key: 'my', label: 'My Activity' }].map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key as 'all' | 'my'); setPage(1); }}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Filters</span>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="ml-auto text-xs text-red-500 hover:text-red-700 font-medium">
              Clear all
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative sm:col-span-2 lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search activities..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pl-9 w-full"
            />
          </div>

          {/* Project */}
          <select value={filterProject} onChange={e => setFilterProject(e.target.value)} className="input">
            <option value="">All Projects</option>
            {projects.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
          </select>

          {/* User — only on All tab */}
          {activeTab === 'all' && (
            <select value={filterUser} onChange={e => setFilterUser(e.target.value)} className="input">
              <option value="">All Users</option>
              {users.map(u => <option key={u.id} value={String(u.id)}>{u.name}</option>)}
            </select>
          )}

          {/* Action */}
          <select value={filterAction} onChange={e => setFilterAction(e.target.value)} className="input">
            <option value="">All Actions</option>
            <option value="created">Created</option>
            <option value="updated">Updated</option>
            <option value="deleted">Deleted</option>
          </select>
        </div>

        {/* Date range */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <label className="label text-xs">From Date</label>
            <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} className="input text-sm" />
          </div>
          <div>
            <label className="label text-xs">To Date</label>
            <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} className="input text-sm" min={filterFrom || undefined} />
          </div>
        </div>
      </div>

      {/* Activity list */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Activity className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-gray-500 font-medium">No activity found</p>
          <p className="text-gray-400 text-sm mt-1">
            {hasActiveFilters || search ? 'Try adjusting your filters' : 'Activity will appear here as your team works'}
          </p>
          {(hasActiveFilters || search) && (
            <button onClick={clearFilters} className="btn-secondary mt-4 text-sm">Clear filters</button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {Object.entries(groupedLogs).map(([label, logs], idx) => (
            <div key={label}>
              <div className={`px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between ${idx > 0 ? 'border-t border-gray-100' : ''}`}>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
                <span className="text-xs text-gray-400">{logs.length} {logs.length === 1 ? 'activity' : 'activities'}</span>
              </div>
              <div className="divide-y divide-gray-50">
                {logs.map(log => <ActivityCard key={log.id} log={log} />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {(paginated?.last_page ?? 1) > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-gray-500">
            Showing {((page - 1) * (paginated?.per_page ?? 30)) + 1}–
            {Math.min(page * (paginated?.per_page ?? 30), paginated?.total ?? 0)} of {paginated?.total ?? 0}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchLogs(page - 1)}
              disabled={page === 1 || loading}
              className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-50"
            >Previous</button>

            <PageNumbers current={page} total={paginated?.last_page ?? 1} onPage={fetchLogs} />

            <button
              onClick={() => fetchLogs(page + 1)}
              disabled={page === paginated?.last_page || loading}
              className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-50"
            >Next</button>
          </div>
        </div>
      )}
    </div>
  );
}