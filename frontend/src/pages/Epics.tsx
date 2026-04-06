import { useEffect, useState, useCallback } from 'react';
import {
  Plus, Search, ChevronDown, ChevronUp, Calendar, BookOpen,
  Layers, BarChart3, Clock, Users, Target, AlertTriangle,
  CheckCircle2, Circle, TrendingUp, Filter, Grid3X3, List,
  MoreVertical, Edit3, Trash2, Eye, X, Timer, Zap,
  ArrowUpRight, Star, Flag, Activity,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import api from '../services/api';
import toast from 'react-hot-toast';
import type { Project, UserStory } from '../types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface EpicStats {
  tasks_count: number;
  completed_tasks: number;
  in_progress_tasks: number;
  overdue_tasks: number;
  total_estimate_minutes: number;
  total_logged_minutes: number;
  completion_percentage: number;
  total_story_points: number;
}

interface EpicFull extends EpicStats {
  id: number;
  project_id: number;
  name: string;
  description?: string;
  status: string;
  priority: string;
  start_date?: string;
  end_date?: string;
  color?: string;
  goal?: string;
  project?: Project;
  user_stories_count?: number;
  created_at?: string;
  updated_at?: string;
}

interface DetailStats {
  tasks_by_status: Record<string, number>;
  tasks_by_priority: Record<string, number>;
  overdue_tasks: Array<{ id: number; title: string; due_date: string; priority: string; assignee?: { name: string } }>;
  top_assignees: Array<{ user: { name: string; id: number }; count: number; done: number }>;
  total_story_points: number;
  done_story_points: number;
  total_tasks: number;
  done_tasks: number;
  total_estimate_minutes: number;
  total_logged_minutes: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const EPIC_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
  '#eab308', '#22c55e', '#10b981', '#06b6d4', '#3b82f6',
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  open:        { label: 'Open',        color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200',   dot: 'bg-blue-400' },
  in_progress: { label: 'In Progress', color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200', dot: 'bg-yellow-400' },
  done:        { label: 'Done',        color: 'text-green-700',  bg: 'bg-green-50 border-green-200',  dot: 'bg-green-400' },
  closed:      { label: 'Closed',      color: 'text-gray-600',   bg: 'bg-gray-50 border-gray-200',   dot: 'bg-gray-400' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  low:      { label: 'Low',      color: 'text-green-600',  icon: '▼' },
  medium:   { label: 'Medium',   color: 'text-yellow-600', icon: '●' },
  high:     { label: 'High',     color: 'text-orange-600', icon: '▲' },
  critical: { label: 'Critical', color: 'text-red-600',    icon: '⚑' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatMinutes(total: number): string {
  if (total === 0) return '0h';
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function getDaysLeft(endDate?: string): { label: string; urgent: boolean; overdue: boolean } | null {
  if (!endDate) return null;
  const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000);
  if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, urgent: true, overdue: true };
  if (diff === 0) return { label: 'Due today', urgent: true, overdue: false };
  if (diff <= 7) return { label: `${diff}d left`, urgent: true, overdue: false };
  return { label: `${diff}d left`, urgent: false, overdue: false };
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── Mini Progress Ring ───────────────────────────────────────────────────────

function ProgressRing({
  pct, size = 44, stroke = 4, color = '#6366f1',
}: {
  pct: number; size?: number; stroke?: number; color?: string;
}) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
    </svg>
  );
}

// ─── Epic Card (Grid) ─────────────────────────────────────────────────────────

function EpicCard({
  epic, onEdit, onDelete, onView, onToggleExpand, expanded,
}: {
  epic: EpicFull;
  onEdit: () => void;
  onDelete: () => void;
  onView: () => void;
  onToggleExpand: () => void;
  expanded: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const status   = STATUS_CONFIG[epic.status] ?? STATUS_CONFIG.open;
  const priority = PRIORITY_CONFIG[epic.priority] ?? PRIORITY_CONFIG.medium;
  const daysLeft = getDaysLeft(epic.end_date);
  const color    = epic.color ?? '#6366f1';
  const pct      = epic.completion_percentage ?? 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden group">
      {/* Color top bar */}
      <div className="h-1.5 w-full" style={{ background: color }} />

      <div className="p-5 flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Progress ring */}
            <div className="relative flex-shrink-0 cursor-pointer" onClick={onView}>
              <ProgressRing pct={pct} size={44} color={color} />
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gray-700">
                {pct}%
              </span>
            </div>
            <div className="min-w-0">
              <h3
                className="text-sm font-bold text-gray-900 truncate leading-tight cursor-pointer hover:text-indigo-600 transition-colors"
                onClick={onView}
              >
                {epic.name}
              </h3>
              {epic.project && (
                <p className="text-xs text-gray-400 mt-0.5 truncate">{epic.project.name}</p>
              )}
            </div>
          </div>

          {/* 3-dot menu */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100"
            >
              <MoreVertical className="w-4 h-4 text-gray-400" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-7 z-20 bg-white rounded-xl shadow-xl border border-gray-100 py-1 w-36 overflow-hidden">
                  <button onClick={() => { onView(); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    <Eye className="w-3.5 h-3.5" /> View Details
                  </button>
                  <button onClick={() => { onEdit(); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button onClick={() => { onDelete(); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Description */}
        {epic.description && (
          <p className="text-xs text-gray-500 line-clamp-2 mb-3 leading-relaxed">
            {epic.description}
          </p>
        )}

        {/* Goal */}
        {epic.goal && (
          <div className="flex items-start gap-1.5 mb-3 p-2.5 rounded-lg bg-indigo-50 border border-indigo-100">
            <Target className="w-3.5 h-3.5 text-indigo-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-indigo-700 line-clamp-2 leading-relaxed">{epic.goal}</p>
          </div>
        )}

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium border ${status.bg} ${status.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </span>
          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${priority.color} bg-gray-50`}>
            {priority.icon} {priority.label}
          </span>
          {daysLeft && (
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              daysLeft.overdue ? 'bg-red-100 text-red-700' :
              daysLeft.urgent  ? 'bg-orange-100 text-orange-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {daysLeft.label}
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-1.5 rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: color }}
            />
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center p-2 bg-gray-50 rounded-xl">
            <p className="text-sm font-bold text-gray-800">{epic.tasks_count}</p>
            <p className="text-[10px] text-gray-500">Tasks</p>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-xl">
            <p className="text-sm font-bold text-gray-800">{epic.user_stories_count ?? 0}</p>
            <p className="text-[10px] text-gray-500">Stories</p>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-xl">
            <p className="text-sm font-bold text-gray-800">{epic.total_story_points ?? 0}</p>
            <p className="text-[10px] text-gray-500">Points</p>
          </div>
        </div>

        {/* Time tracking */}
        {(epic.total_estimate_minutes ?? 0) > 0 && (
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
            <Timer className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="font-medium text-gray-700">
              {formatMinutes(epic.total_logged_minutes ?? 0)}
            </span>
            <span className="text-gray-400">/</span>
            <span>{formatMinutes(epic.total_estimate_minutes ?? 0)}</span>
          </div>
        )}

        {/* Overdue warning */}
        {(epic.overdue_tasks ?? 0) > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 px-2.5 py-1.5 rounded-lg mb-3 border border-red-100">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            {epic.overdue_tasks} overdue task{(epic.overdue_tasks ?? 0) > 1 ? 's' : ''}
          </div>
        )}

        {/* Footer */}
        <div className="mt-auto pt-3 border-t border-gray-50 flex items-center justify-between">
          {epic.start_date && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(epic.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              {epic.end_date && (
                <> → {new Date(epic.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>
              )}
            </span>
          )}
          <button
            onClick={onToggleExpand}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors ml-auto"
          >
            Stories
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Inline stories */}
      {expanded && <EpicStoriesInline epicId={epic.id} color={color} />}
    </div>
  );
}

// ─── Epic Row (List view) ─────────────────────────────────────────────────────

function EpicRow({
  epic, onEdit, onDelete, onView,
}: {
  epic: EpicFull;
  onEdit: () => void;
  onDelete: () => void;
  onView: () => void;
}) {
  const status   = STATUS_CONFIG[epic.status] ?? STATUS_CONFIG.open;
  const priority = PRIORITY_CONFIG[epic.priority] ?? PRIORITY_CONFIG.medium;
  const color    = epic.color ?? '#6366f1';
  const pct      = epic.completion_percentage ?? 0;
  const daysLeft = getDaysLeft(epic.end_date);

  return (
    <tr className="hover:bg-gray-50 transition-colors group border-b border-gray-50 last:border-0">
      {/* Color dot + Name */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
          <div>
            <button
              onClick={onView}
              className="text-sm font-semibold text-gray-900 hover:text-indigo-600 transition-colors text-left"
            >
              {epic.name}
            </button>
            {epic.project && (
              <p className="text-xs text-gray-400">{epic.project.name}</p>
            )}
          </div>
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-3.5">
        <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium border ${status.bg} ${status.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </span>
      </td>

      {/* Priority */}
      <td className="px-4 py-3.5">
        <span className={`text-xs font-semibold ${priority.color}`}>
          {priority.icon} {priority.label}
        </span>
      </td>

      {/* Progress */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2 w-32">
          <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className="h-2 rounded-full transition-all"
              style={{ width: `${pct}%`, background: color }}
            />
          </div>
          <span className="text-xs text-gray-500 font-medium w-8">{pct}%</span>
        </div>
      </td>

      {/* Tasks */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-1.5 text-xs">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
          <span className="font-medium text-gray-700">{epic.completed_tasks}</span>
          <span className="text-gray-400">/ {epic.tasks_count}</span>
        </div>
      </td>

      {/* Stories */}
      <td className="px-4 py-3.5">
        <span className="text-xs text-gray-600">{epic.user_stories_count ?? 0}</span>
      </td>

      {/* Points */}
      <td className="px-4 py-3.5">
        <span className="text-xs text-indigo-600 font-medium">{epic.total_story_points ?? 0} pts</span>
      </td>

      {/* Due */}
      <td className="px-4 py-3.5">
        {daysLeft ? (
          <span className={`text-xs font-medium ${
            daysLeft.overdue ? 'text-red-600' :
            daysLeft.urgent  ? 'text-orange-600' :
            'text-gray-500'
          }`}>
            {daysLeft.overdue && <AlertTriangle className="w-3 h-3 inline mr-0.5" />}
            {daysLeft.label}
          </span>
        ) : <span className="text-xs text-gray-400">—</span>}
      </td>

      {/* Actions */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onView}  className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-500 transition-colors" title="View"><Eye className="w-3.5 h-3.5" /></button>
          <button onClick={onEdit}  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors" title="Edit"><Edit3 className="w-3.5 h-3.5" /></button>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </td>
    </tr>
  );
}

// ─── Inline stories under card ────────────────────────────────────────────────

function EpicStoriesInline({ epicId, color }: { epicId: number; color: string }) {
  const [stories, setStories] = useState<UserStory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/user-stories', { params: { epic_id: epicId } })
      .then((r) => setStories(r.data.data ?? r.data))
      .catch(() => setStories([]))
      .finally(() => setLoading(false));
  }, [epicId]);

  if (loading) return (
    <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
      <p className="text-xs text-gray-400 animate-pulse">Loading stories…</p>
    </div>
  );

  return (
    <div className="border-t border-gray-100 bg-gray-50/60">
      <div className="px-5 py-2 flex items-center justify-between">
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
          User Stories ({stories.length})
        </span>
        <Link to="/user-stories" className="text-xs text-indigo-500 hover:text-indigo-700 font-medium">
          Manage →
        </Link>
      </div>
      {stories.length === 0 ? (
        <p className="px-5 pb-4 text-xs text-gray-400">No stories yet.</p>
      ) : (
        <div className="px-4 pb-3 space-y-1.5">
          {stories.map((s) => (
            <div key={s.id} className="flex items-center justify-between bg-white rounded-xl px-3 py-2.5 border border-gray-100 hover:border-indigo-200 transition-colors">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-1 h-4 rounded-full flex-shrink-0" style={{ background: color }} />
                <span className="text-xs font-medium text-gray-800 truncate">{s.name}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                {s.story_points > 0 && (
                  <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-bold">
                    {s.story_points}
                  </span>
                )}
                <Badge value={s.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Epic Detail Drawer ───────────────────────────────────────────────────────

function EpicDetailDrawer({ epic, onClose, onEdit }: {
  epic: EpicFull;
  onClose: () => void;
  onEdit: () => void;
}) {
  const [stats, setStats] = useState<DetailStats | null>(null);
  const [stories, setStories] = useState<UserStory[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'stories' | 'tasks'>('overview');
  const [loadingStats, setLoadingStats] = useState(true);
  const color = epic.color ?? '#6366f1';
  const pct   = epic.completion_percentage ?? 0;

  useEffect(() => {
    setLoadingStats(true);
    Promise.all([
      api.get(`/epics/${epic.id}/stats`).catch(() => ({ data: null })),
      api.get('/user-stories', { params: { epic_id: epic.id } }).catch(() => ({ data: [] })),
    ]).then(([sRes, storiesRes]) => {
      setStats(sRes.data);
      setStories(storiesRes.data.data ?? storiesRes.data ?? []);
    }).finally(() => setLoadingStats(false));
  }, [epic.id]);

  const status = STATUS_CONFIG[epic.status] ?? STATUS_CONFIG.open;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="w-full max-w-xl bg-white shadow-2xl flex flex-col h-full overflow-hidden">
        {/* Drawer header */}
        <div className="relative overflow-hidden" style={{ background: color }}>
          <div className="absolute inset-0 opacity-20"
            style={{ background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)' }} />
          <div className="relative p-6 pb-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-white/70 uppercase tracking-widest">Epic</span>
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-white/20 text-white`}>
                    {status.label}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white leading-tight">{epic.name}</h2>
                {epic.project && (
                  <p className="text-sm text-white/70 mt-1">{epic.project.name}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={onEdit}
                  className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors">
                  <Edit3 className="w-4 h-4" />
                </button>
                <button onClick={onClose}
                  className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Progress */}
            <div>
              <div className="flex justify-between text-xs text-white/80 mb-1.5">
                <span>Completion</span>
                <span className="font-bold text-white">{pct}%</span>
              </div>
              <div className="w-full bg-white/30 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-white transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Quick stats row */}
        <div className="grid grid-cols-4 border-b border-gray-100">
          {[
            { icon: CheckCircle2, label: 'Done',    value: epic.completed_tasks ?? 0,        color: 'text-green-500' },
            { icon: Activity,     label: 'Active',  value: epic.in_progress_tasks ?? 0,      color: 'text-blue-500' },
            { icon: BookOpen,     label: 'Stories', value: epic.user_stories_count ?? 0,     color: 'text-purple-500' },
            { icon: AlertTriangle,label: 'Overdue', value: epic.overdue_tasks ?? 0,          color: 'text-red-500' },
          ].map((s) => (
            <div key={s.label} className="py-3 flex flex-col items-center gap-1 border-r border-gray-100 last:border-0">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <span className="text-lg font-bold text-gray-900">{s.value}</span>
              <span className="text-[10px] text-gray-400 font-medium">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 bg-gray-50">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'stories',  label: `Stories (${stories.length})` },
            { key: 'tasks',    label: `Tasks (${stats?.total_tasks ?? 0})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.key
                  ? 'border-indigo-500 text-indigo-600 bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {activeTab === 'overview' && (
            <>
              {/* Description */}
              {epic.description && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Description</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{epic.description}</p>
                </div>
              )}

              {/* Goal */}
              {epic.goal && (
                <div className="p-4 rounded-2xl border border-indigo-100 bg-indigo-50">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-indigo-500" />
                    <p className="text-sm font-semibold text-indigo-700">Epic Goal</p>
                  </div>
                  <p className="text-sm text-indigo-600 leading-relaxed">{epic.goal}</p>
                </div>
              )}

              {/* Dates */}
              {(epic.start_date || epic.end_date) && (
                <div className="grid grid-cols-2 gap-3">
                  {epic.start_date && (
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <p className="text-xs text-gray-400 mb-1">Start Date</p>
                      <p className="text-sm font-semibold text-gray-800">
                        {new Date(epic.start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  )}
                  {epic.end_date && (
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <p className="text-xs text-gray-400 mb-1">End Date</p>
                      <p className={`text-sm font-semibold ${
                        getDaysLeft(epic.end_date)?.overdue ? 'text-red-600' : 'text-gray-800'
                      }`}>
                        {new Date(epic.end_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                      {getDaysLeft(epic.end_date) && (
                        <p className={`text-xs mt-0.5 ${
                          getDaysLeft(epic.end_date)!.overdue ? 'text-red-500' : 'text-gray-400'
                        }`}>
                          {getDaysLeft(epic.end_date)!.label}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Time tracking */}
              {loadingStats ? (
                <div className="animate-pulse h-24 bg-gray-100 rounded-2xl" />
              ) : stats && (
                <>
                  {stats.total_estimate_minutes > 0 && (
                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                      <div className="flex items-center gap-2 mb-3">
                        <Timer className="w-4 h-4 text-gray-500" />
                        <p className="text-sm font-semibold text-gray-700">Time Tracking</p>
                      </div>
                      <div className="grid grid-cols-3 gap-3 mb-3">
                        <div className="text-center">
                          <p className="text-lg font-bold text-gray-800">
                            {formatMinutes(stats.total_estimate_minutes)}
                          </p>
                          <p className="text-[10px] text-gray-400">Estimated</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold" style={{ color }}>
                            {formatMinutes(stats.total_logged_minutes)}
                          </p>
                          <p className="text-[10px] text-gray-400">Logged</p>
                        </div>
                        <div className="text-center">
                          <p className={`text-lg font-bold ${
                            stats.total_logged_minutes > stats.total_estimate_minutes
                              ? 'text-red-500' : 'text-gray-800'
                          }`}>
                            {formatMinutes(Math.abs(stats.total_estimate_minutes - stats.total_logged_minutes))}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {stats.total_logged_minutes > stats.total_estimate_minutes ? 'Over' : 'Left'}
                          </p>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, (stats.total_logged_minutes / stats.total_estimate_minutes) * 100)}%`,
                            background: stats.total_logged_minutes > stats.total_estimate_minutes ? '#ef4444' : color,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Story points */}
                  {stats.total_story_points > 0 && (
                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-indigo-500" />
                          <p className="text-sm font-semibold text-gray-700">Story Points</p>
                        </div>
                        <span className="text-sm font-bold text-indigo-600">
                          {stats.done_story_points} / {stats.total_story_points}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            width: `${Math.round((stats.done_story_points / stats.total_story_points) * 100)}%`,
                            background: color,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Tasks by status */}
                  {Object.keys(stats.tasks_by_status).length > 0 && (
                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                      <div className="flex items-center gap-2 mb-3">
                        <BarChart3 className="w-4 h-4 text-gray-500" />
                        <p className="text-sm font-semibold text-gray-700">Tasks by Status</p>
                      </div>
                      <div className="space-y-2">
                        {Object.entries(stats.tasks_by_status).map(([st, count]) => {
                          const statusPct = stats.total_tasks === 0 ? 0 : Math.round((count / stats.total_tasks) * 100);
                          const colors: Record<string, string> = {
                            backlog: '#94a3b8', todo: '#60a5fa', in_progress: '#fbbf24',
                            in_review: '#a78bfa', done: '#4ade80', closed: '#6b7280',
                          };
                          return (
                            <div key={st}>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="capitalize text-gray-600">{st.replace('_', ' ')}</span>
                                <span className="text-gray-400">{count}</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div
                                  className="h-1.5 rounded-full transition-all"
                                  style={{ width: `${statusPct}%`, background: colors[st] ?? '#94a3b8' }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Top assignees */}
                  {stats.top_assignees.length > 0 && (
                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                      <div className="flex items-center gap-2 mb-3">
                        <Users className="w-4 h-4 text-gray-500" />
                        <p className="text-sm font-semibold text-gray-700">Top Contributors</p>
                      </div>
                      <div className="space-y-2.5">
                        {stats.top_assignees.map((a) => (
                          <div key={a.user.id} className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                              style={{ background: color }}>
                              {a.user.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between text-xs mb-1">
                                <span className="font-medium text-gray-700 truncate">{a.user.name}</span>
                                <span className="text-gray-400">{a.done}/{a.count}</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div
                                  className="h-1.5 rounded-full transition-all"
                                  style={{
                                    width: `${a.count === 0 ? 0 : Math.round((a.done / a.count) * 100)}%`,
                                    background: color,
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Overdue tasks */}
                  {stats.overdue_tasks.length > 0 && (
                    <div className="p-4 rounded-2xl bg-red-50 border border-red-100">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <p className="text-sm font-semibold text-red-700">
                          Overdue Tasks ({stats.overdue_tasks.length})
                        </p>
                      </div>
                      <div className="space-y-2">
                        {stats.overdue_tasks.slice(0, 5).map((task) => (
                          <Link
                            key={task.id}
                            to={`/tasks/${task.id}`}
                            className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-red-100 hover:border-red-300 transition-colors group"
                          >
                            <span className="text-xs font-medium text-gray-800 truncate group-hover:text-red-600">
                              {task.title}
                            </span>
                            <span className="text-xs text-red-500 flex-shrink-0 ml-2">
                              {new Date(task.due_date).toLocaleDateString()}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {activeTab === 'stories' && (
            <div className="space-y-2">
              {stories.length === 0 ? (
                <div className="text-center py-10">
                  <BookOpen className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">No user stories yet</p>
                  <Link to="/user-stories" className="text-xs text-indigo-500 mt-1 inline-block">
                    Create a story →
                  </Link>
                </div>
              ) : stories.map((s) => (
                <div key={s.id} className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 hover:border-indigo-200 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="text-sm font-semibold text-gray-800 leading-tight">{s.name}</p>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {s.story_points > 0 && (
                        <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-bold">
                          {s.story_points} pts
                        </span>
                      )}
                      <Badge value={s.status} />
                    </div>
                  </div>
                  {s.sprint && (
                    <p className="text-xs text-gray-400">Sprint: {s.sprint}</p>
                  )}
                  {s.assignee && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <div className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
                        style={{ background: color }}>
                        {s.assignee.name.charAt(0)}
                      </div>
                      <span className="text-xs text-gray-500">{s.assignee.name}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="space-y-2">
              {(stats?.total_tasks ?? 0) === 0 ? (
                <div className="text-center py-10">
                  <CheckCircle2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">No tasks found</p>
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-6">
                  View tasks linked to stories in this epic via the{' '}
                  <Link to="/tasks" className="text-indigo-500 hover:underline">Tasks page</Link>.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Drawer footer */}
        <div className="p-4 border-t border-gray-100 flex gap-3 bg-gray-50">
          <Link
            to="/user-stories"
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-white transition-colors"
          >
            <BookOpen className="w-4 h-4" /> Stories
          </Link>
          <button
            onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium text-white transition-colors"
            style={{ background: color }}
          >
            <Edit3 className="w-4 h-4" /> Edit Epic
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Epics Page ──────────────────────────────────────────────────────────

const EMPTY_FORM = {
  project_id: '', name: '', description: '', status: 'open',
  priority: 'medium', start_date: '', end_date: '', color: '#6366f1', goal: '',
};

export default function Epics() {
  const [epics, setEpics] = useState<EpicFull[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch]             = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterStatus, setFilterStatus]   = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [viewMode, setViewMode]           = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab]         = useState<'all' | 'open' | 'in_progress' | 'done'>('all');

  const [expandedId, setExpandedId]   = useState<number | null>(null);
  const [detailEpic, setDetailEpic]   = useState<EpicFull | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editEpic, setEditEpic]       = useState<EpicFull | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EpicFull | null>(null);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [saving, setSaving]           = useState(false);

  const fetchEpics = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterProject) params.project_id = filterProject;
      if (filterStatus)  params.status      = filterStatus;
      if (filterPriority) params.priority   = filterPriority;
      if (search)         params.search     = search;
      const res = await api.get('/epics', { params });
      setEpics(res.data);
    } catch { toast.error('Failed to load epics'); }
    finally { setLoading(false); }
  }, [filterProject, filterStatus, filterPriority, search]);

  useEffect(() => { fetchEpics(); }, [filterProject, filterStatus, filterPriority]);
  useEffect(() => {
    api.get('/projects').then((r) => setProjects(r.data.data ?? r.data));
  }, []);

  const resetForm = () => { setForm(EMPTY_FORM); setEditEpic(null); };

  const openCreate = () => { resetForm(); setIsModalOpen(true); };
  const openEdit   = (epic: EpicFull) => {
    setEditEpic(epic);
    setForm({
      project_id:  String(epic.project_id),
      name:        epic.name,
      description: epic.description ?? '',
      status:      epic.status,
      priority:    epic.priority,
      start_date:  epic.start_date ?? '',
      end_date:    epic.end_date ?? '',
      color:       epic.color ?? '#6366f1',
      goal:        epic.goal ?? '',
    });
    setDetailEpic(null);
    setIsModalOpen(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.project_id) { toast.error('Select a project'); return; }
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const payload = {
        project_id:  Number(form.project_id),
        name:        form.name.trim(),
        description: form.description || null,
        status:      form.status,
        priority:    form.priority,
        start_date:  form.start_date || null,
        end_date:    form.end_date || null,
        color:       form.color,
        goal:        form.goal || null,
      };
      if (editEpic) {
        const res = await api.put(`/epics/${editEpic.id}`, payload);
        setEpics((prev) => prev.map((e) => e.id === editEpic.id ? { ...e, ...res.data } : e));
        toast.success('Epic updated!');
      } else {
        const res = await api.post('/epics', payload);
        setEpics((prev) => [res.data, ...prev]);
        toast.success('Epic created!');
      }
      setIsModalOpen(false);
      resetForm();
    } catch {
      toast.error('Failed to save epic');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/epics/${deleteTarget.id}`);
      setEpics((prev) => prev.filter((e) => e.id !== deleteTarget.id));
      toast.success('Epic deleted');
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEpics();
  };

  // Filter locally by search + tab
  const filtered = epics.filter((ep) => {
    const matchSearch = !search ||
      ep.name.toLowerCase().includes(search.toLowerCase()) ||
      (ep.description ?? '').toLowerCase().includes(search.toLowerCase());
    const matchTab = activeTab === 'all' || ep.status === activeTab;
    return matchSearch && matchTab;
  });

  // Summary stats
  const stats = {
    total:       epics.length,
    open:        epics.filter((e) => e.status === 'open').length,
    in_progress: epics.filter((e) => e.status === 'in_progress').length,
    done:        epics.filter((e) => e.status === 'done').length,
    overdue:     epics.filter((e) =>
      e.end_date && new Date(e.end_date) < new Date() && !['done', 'closed'].includes(e.status)
    ).length,
    total_tasks:     epics.reduce((a, e) => a + (e.tasks_count ?? 0), 0),
    total_points:    epics.reduce((a, e) => a + (e.total_story_points ?? 0), 0),
  };

  const hasFilters = filterProject || filterStatus || filterPriority;

  return (
    <div className="min-h-screen bg-gray-50">
      
      <div className="p-6 max-w-7xl mx-auto">

        {/* ── Top stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
          {[
            { label: 'Total',       value: stats.total,       color: 'text-gray-700',   bg: 'bg-white' },
            { label: 'Open',        value: stats.open,        color: 'text-blue-700',   bg: 'bg-blue-50' },
            { label: 'In Progress', value: stats.in_progress, color: 'text-yellow-700', bg: 'bg-yellow-50' },
            { label: 'Done',        value: stats.done,        color: 'text-green-700',  bg: 'bg-green-50' },
            { label: 'Overdue',     value: stats.overdue,     color: 'text-red-700',    bg: 'bg-red-50' },
            { label: 'Total Tasks', value: stats.total_tasks, color: 'text-purple-700', bg: 'bg-purple-50' },
            { label: 'Story Pts',   value: stats.total_points,color: 'text-indigo-700', bg: 'bg-indigo-50' },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} rounded-2xl border border-gray-100 shadow-sm p-4 text-center`}>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 font-medium mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Toolbar ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <form onSubmit={handleSearch} className="relative min-w-[180px] flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text" placeholder="Search epics…"
                value={search} onChange={(e) => setSearch(e.target.value)}
                className="input pl-9 w-full"
              />
            </form>

            <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)} className="input w-44">
              <option value="">All Projects</option>
              {projects.map((p) => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
            </select>

            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input w-36">
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
              <option value="closed">Closed</option>
            </select>

            <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="input w-36">
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>

            {hasFilters && (
              <button
                onClick={() => { setFilterProject(''); setFilterStatus(''); setFilterPriority(''); }}
                className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            )}

            {/* View mode */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 ml-auto">
              <button onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white shadow text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}>
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white shadow text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}>
                <List className="w-4 h-4" />
              </button>
            </div>

            <button onClick={openCreate} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> New Epic
            </button>
          </div>

          {/* Tab filters */}
          <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-50">
            {[
              { key: 'all',         label: `All (${epics.length})` },
              { key: 'open',        label: `Open (${stats.open})` },
              { key: 'in_progress', label: `In Progress (${stats.in_progress})` },
              { key: 'done',        label: `Done (${stats.done})` },
            ].map((tab) => (
              <button key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl border border-gray-100">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Layers className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-500 font-semibold text-lg">No epics found</p>
            <p className="text-gray-400 text-sm mt-1">
              {search || hasFilters ? 'Try adjusting filters' : 'Create your first epic to group user stories'}
            </p>
            {!search && !hasFilters && (
              <button onClick={openCreate} className="btn-primary mt-4">Create Epic</button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((epic) => (
              <EpicCard
                key={epic.id}
                epic={epic}
                onEdit={() => openEdit(epic)}
                onDelete={() => setDeleteTarget(epic)}
                onView={() => setDetailEpic(epic)}
                onToggleExpand={() => setExpandedId(expandedId === epic.id ? null : epic.id)}
                expanded={expandedId === epic.id}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Epic', 'Status', 'Priority', 'Progress', 'Tasks', 'Stories', 'Points', 'Due', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((epic) => (
                  <EpicRow
                    key={epic.id}
                    epic={epic}
                    onEdit={() => openEdit(epic)}
                    onDelete={() => setDeleteTarget(epic)}
                    onView={() => setDetailEpic(epic)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length > 0 && (
          <p className="text-xs text-gray-400 text-center mt-4">
            Showing {filtered.length} of {epics.length} epics
          </p>
        )}
      </div>

      {/* ── Detail Drawer ── */}
      {detailEpic && (
        <EpicDetailDrawer
          epic={detailEpic}
          onClose={() => setDetailEpic(null)}
          onEdit={() => openEdit(detailEpic)}
        />
      )}

      {/* ── Create / Edit Modal ── */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title={editEpic ? 'Edit Epic' : 'Create New Epic'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Name */}
          <div>
            <label className="label">Epic Name *</label>
            <input name="name" value={form.name} onChange={handleChange}
              className="input" placeholder="e.g. User Authentication System"
              required autoFocus />
          </div>

          {/* Project */}
          <div>
            <label className="label">Project *</label>
            <select name="project_id" value={form.project_id} onChange={handleChange}
              className="input" required>
              <option value="">Select a project…</option>
              {projects.map((p) => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="label">Description</label>
            <textarea name="description" value={form.description} onChange={handleChange}
              className="input" rows={2} placeholder="What does this epic cover?" />
          </div>

          {/* Goal */}
          <div>
            <label className="label flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-indigo-500" />
              Epic Goal
            </label>
            <textarea name="goal" value={form.goal} onChange={handleChange}
              className="input" rows={2}
              placeholder="What is the desired outcome of this epic?" />
          </div>

          {/* Status + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Status</label>
              <select name="status" value={form.status} onChange={handleChange} className="input">
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label className="label">Priority</label>
              <select name="priority" value={form.priority} onChange={handleChange} className="input">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start Date</label>
              <input type="date" name="start_date" value={form.start_date}
                onChange={handleChange} className="input" />
            </div>
            <div>
              <label className="label">End Date</label>
              <input type="date" name="end_date" value={form.end_date}
                onChange={handleChange} className="input" min={form.start_date || undefined} />
            </div>
          </div>

          {/* Color picker */}
          <div>
            <label className="label">Epic Color</label>
            <div className="flex items-center gap-2 flex-wrap">
              {EPIC_COLORS.map((c) => (
                <button
                  key={c} type="button"
                  onClick={() => setForm((p) => ({ ...p, color: c }))}
                  className={`w-7 h-7 rounded-full transition-all duration-150 ${
                    form.color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-125' : 'hover:scale-110'
                  }`}
                  style={{ background: c }}
                />
              ))}
              <input
                type="color" name="color" value={form.color}
                onChange={handleChange}
                className="w-8 h-8 rounded-full cursor-pointer border-2 border-gray-200"
                title="Custom color"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="btn-primary flex-1 disabled:opacity-60">
              {saving ? 'Saving…' : editEpic ? 'Update Epic' : 'Create Epic'}
            </button>
            <button type="button"
              onClick={() => { setIsModalOpen(false); resetForm(); }}
              className="btn-secondary flex-1">
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Delete Confirm ── */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Epic"
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-50 rounded-xl border border-red-100 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 leading-relaxed">
              Delete <span className="font-bold">{deleteTarget?.name}</span>?
              This will remove the epic and unlink all associated user stories.
              Tasks will not be deleted.
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={handleDelete} className="btn-danger flex-1">
              Yes, Delete
            </button>
            <button onClick={() => setDeleteTarget(null)} className="btn-secondary flex-1">
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}