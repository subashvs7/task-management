import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Plus, Search, Filter, X, ChevronDown, ChevronUp, ChevronRight,
  Calendar, Clock, Users, Target, AlertTriangle, CheckCircle2,
  Circle, Timer, Zap, BarChart3, Edit3, Trash2, Eye,
  ArrowRight, TrendingUp, BookOpen, Layers, Star, Flag,
  PlayCircle, CheckSquare, MoreVertical, Grid3X3, List,
  Activity, User, Tag, RefreshCw, Download,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '../components/layout/Header';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import api from '../services/api';
import toast from 'react-hot-toast';
import type { Project, Epic, Task } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Developer {
  id: number;
  name: string;
  email: string;
  avatar?: string;
}

interface UserStoryFull {
  id: number;
  project_id: number;
  epic_id?: number;
  name: string;
  description?: string;
  status: string;
  priority: string;
  story_points: number;
  assignee_id?: number;
  reporter_id?: number;
  developer_ids?: number[];
  developers?: Developer[];
  assignee?: Developer;
  reporter?: Developer;
  sprint?: string;
  estimate_hours: number;
  estimate_minutes: number;
  logged_hours: number;
  logged_minutes: number;
  completion_percentage: number;
  completion_note?: string;
  started_at?: string;
  completed_at?: string;
  acceptance_criteria?: string;
  color?: string;
  sort_order?: number;
  project?: Project;
  epic?: Epic;
  tasks?: Task[];
  tasks_count?: number;
  completed_tasks?: number;
  in_progress_tasks?: number;
  overdue_tasks?: number;
  created_at?: string;
  updated_at?: string;
}

interface StoryStats {
  total: number;
  by_status: Record<string, number>;
  by_priority: Record<string, number>;
  total_points: number;
  done_points: number;
  total_estimate_min: number;
  total_logged_min: number;
  avg_completion: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STORY_COLORS = [
  '#6366f1','#8b5cf6','#ec4899','#f43f5e','#f97316',
  '#eab308','#22c55e','#10b981','#06b6d4','#3b82f6',
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string; ring: string }> = {
  todo:        { label: 'To Do',       color: 'text-gray-600',   bg: 'bg-gray-50 border-gray-200',     dot: 'bg-gray-400',   ring: 'ring-gray-300' },
  in_progress: { label: 'In Progress', color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200',     dot: 'bg-blue-500',   ring: 'ring-blue-300' },
  done:        { label: 'Done',        color: 'text-green-700',  bg: 'bg-green-50 border-green-200',   dot: 'bg-green-500',  ring: 'ring-green-300' },
  closed:      { label: 'Closed',      color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200', dot: 'bg-purple-500', ring: 'ring-purple-300' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  low:      { label: 'Low',      color: 'text-green-600',  bg: 'bg-green-50',  icon: '↓' },
  medium:   { label: 'Medium',   color: 'text-yellow-600', bg: 'bg-yellow-50', icon: '→' },
  high:     { label: 'High',     color: 'text-orange-600', bg: 'bg-orange-50', icon: '↑' },
  critical: { label: 'Critical', color: 'text-red-600',    bg: 'bg-red-50',    icon: '⚑' },
};

const POINT_OPTIONS = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55];

const EMPTY_FORM = {
  project_id:            '',
  epic_id:               '',
  name:                  '',
  description:           '',
  status:                'todo',
  priority:              'medium',
  story_points:          '0',
  assignee_id:           '',
  reporter_id:           '',
  developer_ids:         [] as number[],
  sprint:                '',
  estimate_hours:        '0',
  estimate_minutes:      '0',
  completion_percentage: '0',
  completion_note:       '',
  acceptance_criteria:   '',
  color:                 '#6366f1',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(h: number, m: number): string {
  if (h === 0 && m === 0) return '—';
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatMinutes(total: number): string {
  if (total === 0) return '0h';
  const h = Math.floor(total / 60);
  const m = total % 60;
  return formatTime(h, m);
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── Avatar Group ─────────────────────────────────────────────────────────────

function AvatarGroup({ users, max = 3, size = 'sm' }: {
  users: Developer[];
  max?: number;
  size?: 'xs' | 'sm' | 'md';
}) {
  const dim = size === 'xs' ? 'w-5 h-5 text-[9px]' : size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm';
  const shown = users.slice(0, max);
  const extra = users.length - max;
  return (
    <div className="flex -space-x-1.5">
      {shown.map((u) => (
        <div
          key={u.id}
          className={`${dim} rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold ring-2 ring-white`}
          title={u.name}
        >
          {u.name.charAt(0).toUpperCase()}
        </div>
      ))}
      {extra > 0 && (
        <div className={`${dim} rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold ring-2 ring-white`}>
          +{extra}
        </div>
      )}
    </div>
  );
}

// ─── Progress Ring ────────────────────────────────────────────────────────────

function ProgressRing({ pct, size = 40, stroke = 3, color = '#6366f1' }: {
  pct: number; size?: number; stroke?: number; color?: string;
}) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={pct === 100 ? '#22c55e' : color}
        strokeWidth={stroke}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
    </svg>
  );
}

// ─── Time Bar ─────────────────────────────────────────────────────────────────

function TimeBar({ loggedMin, estimateMin, color = '#6366f1' }: {
  loggedMin: number; estimateMin: number; color?: string;
}) {
  if (estimateMin === 0) return null;
  const pct = Math.min(100, Math.round((loggedMin / estimateMin) * 100));
  const over = loggedMin > estimateMin;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-500">
        <span>
          <span className={`font-semibold ${over ? 'text-red-600' : 'text-gray-800'}`}>
            {formatMinutes(loggedMin)}
          </span>
          {' / '}
          {formatMinutes(estimateMin)}
        </span>
        <span className={`font-medium ${over ? 'text-red-500' : 'text-gray-500'}`}>{pct}%</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div
          className="h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: over ? '#ef4444' : color }}
        />
      </div>
    </div>
  );
}

// ─── Story Card ───────────────────────────────────────────────────────────────

function StoryCard({
  story, onEdit, onDelete, onView, onToggleTasks,
  showTasks, users,
}: {
  story: UserStoryFull;
  onEdit: () => void;
  onDelete: () => void;
  onView: () => void;
  onToggleTasks: () => void;
  showTasks: boolean;
  users: Developer[];
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const status   = STATUS_CONFIG[story.status] ?? STATUS_CONFIG.todo;
  const priority = PRIORITY_CONFIG[story.priority] ?? PRIORITY_CONFIG.medium;
  const color    = story.color ?? '#6366f1';
  const pct      = story.completion_percentage ?? 0;
  const devs     = story.developers ?? [];
  const estimateMin = (story.estimate_hours ?? 0) * 60 + (story.estimate_minutes ?? 0);
  const loggedMin   = (story.logged_hours ?? 0) * 60 + (story.logged_minutes ?? 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col overflow-hidden group">
      {/* Color accent bar */}
      <div className="h-1.5 w-full flex-shrink-0" style={{ background: color }} />

      <div className="p-5 flex flex-col flex-1 gap-3">
        {/* Row 1: ring + title + menu */}
        <div className="flex items-start gap-3">
          {/* Progress ring */}
          <div className="relative flex-shrink-0 cursor-pointer" onClick={onView}>
            <ProgressRing pct={pct} size={46} color={color} />
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gray-700">
              {pct}%
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <button
              onClick={onView}
              className="text-sm font-bold text-gray-900 text-left leading-snug hover:text-indigo-600 transition-colors line-clamp-2"
            >
              {story.name}
            </button>
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
              {story.project && <span>{story.project.name}</span>}
              {story.epic && (
                <>
                  <ChevronRight className="w-3 h-3" />
                  <span className="text-indigo-500">{story.epic.name}</span>
                </>
              )}
            </div>
          </div>

          {/* 3-dot menu */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100"
            >
              <MoreVertical className="w-4 h-4 text-gray-400" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-8 z-20 bg-white rounded-xl shadow-xl border border-gray-100 py-1 w-36">
                  <button onClick={() => { onView(); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    <Eye className="w-3.5 h-3.5" /> View
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
        {story.description && (
          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed -mt-1">
            {story.description}
          </p>
        )}

        {/* Badges row */}
        <div className="flex flex-wrap gap-1.5">
          <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-medium border ${status.bg} ${status.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </span>
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${priority.color} ${priority.bg}`}>
            {priority.icon} {priority.label}
          </span>
          {story.story_points > 0 && (
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-indigo-100 text-indigo-700">
              {story.story_points} pts
            </span>
          )}
          {story.sprint && (
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
              {story.sprint}
            </span>
          )}
        </div>

        {/* Completion bar */}
        <div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-1.5 rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: pct === 100 ? '#22c55e' : color }}
            />
          </div>
        </div>

        {/* Time tracking */}
        {estimateMin > 0 && (
          <TimeBar loggedMin={loggedMin} estimateMin={estimateMin} color={color} />
        )}

        {/* Developers */}
        {devs.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Devs:</span>
            <AvatarGroup users={devs} max={4} size="xs" />
          </div>
        )}

        {/* Stats + assignee row */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-50">
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
              {story.completed_tasks ?? 0}/{story.tasks_count ?? 0}
            </span>
            {(story.overdue_tasks ?? 0) > 0 && (
              <span className="text-red-500 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {story.overdue_tasks}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {story.assignee && (
              <div
                className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold"
                title={story.assignee.name}
              >
                {story.assignee.name.charAt(0).toUpperCase()}
              </div>
            )}
            <button
              onClick={onToggleTasks}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Tasks
              {showTasks ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </div>

      {/* Inline tasks */}
      {showTasks && <StoryTasksInline storyId={story.id} color={color} />}
    </div>
  );
}

// ─── Inline Tasks ─────────────────────────────────────────────────────────────

function StoryTasksInline({ storyId, color }: { storyId: number; color: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/tasks', { params: { story_id: storyId, per_page: 50 } })
      .then((r) => setTasks(r.data.data ?? r.data))
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, [storyId]);

  if (loading) return (
    <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
      <p className="text-xs text-gray-400 animate-pulse">Loading tasks…</p>
    </div>
  );

  return (
    <div className="border-t border-gray-100 bg-gray-50/60">
      <div className="px-5 py-2 flex items-center justify-between">
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
          Tasks ({tasks.length})
        </span>
        <Link to="/tasks" className="text-xs text-indigo-500 hover:text-indigo-700 font-medium">
          View all →
        </Link>
      </div>
      {tasks.length === 0 ? (
        <p className="px-5 pb-4 text-xs text-gray-400">No tasks linked yet.</p>
      ) : (
        <div className="px-4 pb-3 space-y-1.5 max-h-48 overflow-y-auto">
          {tasks.map((t) => (
            <Link
              key={t.id}
              to={`/tasks/${t.id}`}
              className="flex items-center justify-between bg-white rounded-xl px-3 py-2.5 border border-gray-100 hover:border-indigo-200 transition-colors group"
            >
              <div className="flex items-center gap-2 min-w-0">
                {['done', 'closed'].includes(t.status) ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                )}
                <span className={`text-xs font-medium truncate group-hover:text-indigo-600 ${
                  ['done', 'closed'].includes(t.status) ? 'line-through text-gray-400' : 'text-gray-800'
                }`}>{t.title}</span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                <Badge value={t.priority} type="priority" />
                <Badge value={t.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── List Row ─────────────────────────────────────────────────────────────────

function StoryRow({ story, onEdit, onDelete, onView }: {
  story: UserStoryFull;
  onEdit: () => void;
  onDelete: () => void;
  onView: () => void;
}) {
  const status   = STATUS_CONFIG[story.status] ?? STATUS_CONFIG.todo;
  const priority = PRIORITY_CONFIG[story.priority] ?? PRIORITY_CONFIG.medium;
  const color    = story.color ?? '#6366f1';
  const pct      = story.completion_percentage ?? 0;
  const devs     = story.developers ?? [];
  const estimateMin = (story.estimate_hours ?? 0) * 60 + (story.estimate_minutes ?? 0);
  const loggedMin   = (story.logged_hours ?? 0) * 60 + (story.logged_minutes ?? 0);

  return (
    <tr className="hover:bg-gray-50 transition-colors group border-b border-gray-50 last:border-0">
      {/* Color + Name */}
      <td className="px-4 py-3.5">
        <div className="flex items-start gap-3">
          <div className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: color }} />
          <div className="min-w-0">
            <button onClick={onView}
              className="text-sm font-semibold text-gray-900 hover:text-indigo-600 transition-colors text-left line-clamp-1">
              {story.name}
            </button>
            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-400">
              {story.project && <span>{story.project.name}</span>}
              {story.epic && <><ChevronRight className="w-3 h-3" /><span className="text-indigo-400">{story.epic.name}</span></>}
              {story.sprint && <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">{story.sprint}</span>}
            </div>
          </div>
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-3.5 whitespace-nowrap">
        <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium border ${status.bg} ${status.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </span>
      </td>

      {/* Priority */}
      <td className="px-4 py-3.5 whitespace-nowrap">
        <span className={`text-xs font-semibold ${priority.color}`}>
          {priority.icon} {priority.label}
        </span>
      </td>

      {/* Progress */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2 w-28">
          <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <div className="h-1.5 rounded-full transition-all"
              style={{ width: `${pct}%`, background: pct === 100 ? '#22c55e' : color }} />
          </div>
          <span className="text-xs text-gray-500 font-medium w-7 text-right">{pct}%</span>
        </div>
      </td>

      {/* Points */}
      <td className="px-4 py-3.5 whitespace-nowrap">
        {story.story_points > 0
          ? <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{story.story_points} pts</span>
          : <span className="text-xs text-gray-400">—</span>}
      </td>

      {/* Estimate / Logged */}
      <td className="px-4 py-3.5 whitespace-nowrap">
        {estimateMin > 0 ? (
          <div className="text-xs">
            <span className={loggedMin > estimateMin ? 'text-red-600 font-semibold' : 'text-gray-700 font-semibold'}>
              {formatMinutes(loggedMin)}
            </span>
            <span className="text-gray-400"> / {formatMinutes(estimateMin)}</span>
          </div>
        ) : <span className="text-xs text-gray-400">No estimate</span>}
      </td>

      {/* Assignee + Developers */}
      <td className="px-4 py-3.5">
        <div className="flex flex-col gap-1">
          {story.assignee && (
            <div className="flex items-center gap-1.5" title={story.assignee.name}>
              <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[9px] font-bold">
                {story.assignee.name.charAt(0)}
              </div>
              <span className="text-xs text-gray-600 truncate max-w-[70px]">{story.assignee.name}</span>
            </div>
          )}
          {devs.length > 0 && <AvatarGroup users={devs} max={3} size="xs" />}
        </div>
      </td>

      {/* Tasks */}
      <td className="px-4 py-3.5 whitespace-nowrap">
        <div className="flex items-center gap-1 text-xs">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
          <span className="font-medium text-gray-700">{story.completed_tasks ?? 0}</span>
          <span className="text-gray-400">/ {story.tasks_count ?? 0}</span>
        </div>
      </td>

      {/* Dates */}
      <td className="px-4 py-3.5 whitespace-nowrap">
        {story.completed_at ? (
          <span className="text-xs text-green-600 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            {new Date(story.completed_at).toLocaleDateString()}
          </span>
        ) : story.started_at ? (
          <span className="text-xs text-blue-600 flex items-center gap-1">
            <PlayCircle className="w-3 h-3" />
            {new Date(story.started_at).toLocaleDateString()}
          </span>
        ) : <span className="text-xs text-gray-400">Not started</span>}
      </td>

      {/* Actions */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onView}   className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-500 transition-colors"><Eye className="w-3.5 h-3.5" /></button>
          <button onClick={onEdit}   className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"><Edit3 className="w-3.5 h-3.5" /></button>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </td>
    </tr>
  );
}

// ─── Story Detail Drawer ──────────────────────────────────────────────────────

function StoryDetailDrawer({ story, onClose, onEdit, allUsers }: {
  story: UserStoryFull;
  onClose: () => void;
  onEdit: () => void;
  allUsers: Developer[];
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'time'>('overview');
  const [isLoggingTime, setIsLoggingTime] = useState(false);
  const [timeForm, setTimeForm] = useState({ hours: 0, minutes: 0, description: '' });
  const [isUpdatingCompletion, setIsUpdatingCompletion] = useState(false);
  const [completionValue, setCompletionValue] = useState(story.completion_percentage ?? 0);
  const [completionNote, setCompletionNote] = useState(story.completion_note ?? '');
  const [saving, setSaving] = useState(false);

  const color       = story.color ?? '#6366f1';
  const pct         = story.completion_percentage ?? 0;
  const status      = STATUS_CONFIG[story.status] ?? STATUS_CONFIG.todo;
  const devs        = story.developers ?? [];
  const estimateMin = (story.estimate_hours ?? 0) * 60 + (story.estimate_minutes ?? 0);
  const loggedMin   = (story.logged_hours ?? 0) * 60 + (story.logged_minutes ?? 0);

  useEffect(() => {
    api.get('/tasks', { params: { story_id: story.id, per_page: 100 } })
      .then((r) => setTasks(r.data.data ?? r.data))
      .catch(() => setTasks([]))
      .finally(() => setLoadingTasks(false));
  }, [story.id]);

  const handleLogTime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (timeForm.hours === 0 && timeForm.minutes === 0) {
      toast.error('Enter time > 0');
      return;
    }
    setSaving(true);
    try {
      await api.post(`/user-stories/${story.id}/log-time`, timeForm);
      toast.success('Time logged!');
      setIsLoggingTime(false);
      setTimeForm({ hours: 0, minutes: 0, description: '' });
      onClose(); // refresh parent
    } catch {
      toast.error('Failed to log time');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCompletion = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/user-stories/${story.id}/completion`, {
        completion_percentage: completionValue,
        completion_note: completionNote || null,
      });
      toast.success('Completion updated!');
      setIsUpdatingCompletion(false);
      onClose(); // refresh parent
    } catch {
      toast.error('Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const tasksByStatus = {
    todo:        tasks.filter((t) => t.status === 'todo').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
    in_review:   tasks.filter((t) => t.status === 'in_review').length,
    done:        tasks.filter((t) => ['done', 'closed'].includes(t.status)).length,
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      <div className="w-full max-w-2xl bg-white shadow-2xl flex flex-col h-full overflow-hidden">
        {/* Header with color */}
        <div className="relative overflow-hidden flex-shrink-0" style={{ background: color }}>
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 0%, transparent 60%), radial-gradient(circle at 80% 20%, white 0%, transparent 50%)' }} />

          <div className="relative p-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-xs font-bold text-white/70 uppercase tracking-widest">User Story</span>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold bg-white/20 text-white`}>
                    {status.label}
                  </span>
                  {story.story_points > 0 && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-white/20 text-white">
                      {story.story_points} pts
                    </span>
                  )}
                  {story.sprint && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/20 text-white">
                      {story.sprint}
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-bold text-white leading-snug">{story.name}</h2>
                <div className="flex items-center gap-2 mt-1 text-white/70 text-xs">
                  {story.project && <span>{story.project.name}</span>}
                  {story.epic && <><ChevronRight className="w-3 h-3" /><span>{story.epic.name}</span></>}
                </div>
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

            {/* Completion bar */}
            <div>
              <div className="flex justify-between text-xs text-white/80 mb-1.5">
                <span>Completion Progress</span>
                <span className="font-bold text-white">{pct}%</span>
              </div>
              <div className="w-full bg-white/30 rounded-full h-2">
                <div className="h-2 rounded-full bg-white transition-all duration-700"
                  style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-4 border-b border-gray-100 flex-shrink-0">
          {[
            { icon: CheckSquare,   label: 'Tasks',      value: story.tasks_count ?? tasks.length,   color: 'text-indigo-500' },
            { icon: CheckCircle2,  label: 'Done',       value: story.completed_tasks ?? tasksByStatus.done, color: 'text-green-500' },
            { icon: Timer,         label: 'Estimate',   value: estimateMin > 0 ? formatMinutes(estimateMin) : '—', color: 'text-blue-500' },
            { icon: Activity,      label: 'Logged',     value: loggedMin > 0 ? formatMinutes(loggedMin) : '—',    color: 'text-purple-500' },
          ].map((s) => (
            <div key={s.label} className="py-3 flex flex-col items-center gap-1 border-r border-gray-100 last:border-0">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <span className="text-base font-bold text-gray-900">{s.value}</span>
              <span className="text-[10px] text-gray-400 font-medium">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 bg-gray-50 flex-shrink-0">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'tasks',    label: `Tasks (${tasks.length})` },
            { key: 'time',     label: 'Time & Progress' },
          ].map((tab) => (
            <button key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.key
                  ? 'border-indigo-500 text-indigo-600 bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* ── OVERVIEW TAB ── */}
          {activeTab === 'overview' && (
            <>
              {story.description && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Description</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{story.description}</p>
                </div>
              )}

              {story.acceptance_criteria && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckSquare className="w-4 h-4 text-emerald-600" />
                    <p className="text-sm font-semibold text-emerald-700">Acceptance Criteria</p>
                  </div>
                  <p className="text-sm text-emerald-700 leading-relaxed whitespace-pre-wrap">
                    {story.acceptance_criteria}
                  </p>
                </div>
              )}

              {/* People */}
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">People</p>

                {story.assignee && (
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400">Product Owner / Assignee</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                          {story.assignee.name.charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-gray-800">{story.assignee.name}</span>
                      </div>
                    </div>
                  </div>
                )}

                {devs.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Users className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400 mb-1.5">Developers ({devs.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {devs.map((d) => (
                          <div key={d.id} className="flex items-center gap-1.5 bg-white rounded-xl px-2.5 py-1.5 border border-gray-200 shadow-sm">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
                              style={{ background: color }}>
                              {d.name.charAt(0)}
                            </div>
                            <span className="text-xs font-medium text-gray-700">{d.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {story.reporter && (
                  <div className="flex items-center gap-3">
                    <Flag className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400">Reporter</p>
                      <span className="text-sm text-gray-700">{story.reporter.name}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Timeline */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-1.5 mb-1">
                    <PlayCircle className="w-3.5 h-3.5 text-blue-500" />
                    <p className="text-xs text-gray-400 font-medium">Started</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-800">
                    {story.started_at
                      ? new Date(story.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : '—'}
                  </p>
                </div>
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-1.5 mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    <p className="text-xs text-gray-400 font-medium">Completed</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-800">
                    {story.completed_at
                      ? new Date(story.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : '—'}
                  </p>
                </div>
              </div>

              {/* Duration */}
              {story.started_at && story.completed_at && (
                <div className="p-3.5 bg-green-50 rounded-xl border border-green-100">
                  <p className="text-xs text-green-700 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Completed in {(() => {
                      const days = Math.ceil(
                        (new Date(story.completed_at).getTime() - new Date(story.started_at).getTime()) / 86400000
                      );
                      return days <= 0 ? 'less than a day' : `${days} day${days > 1 ? 's' : ''}`;
                    })()}
                  </p>
                </div>
              )}

              {/* Tasks mini chart */}
              {tasks.length > 0 && (
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Task Breakdown</p>
                  <div className="space-y-2">
                    {Object.entries(tasksByStatus).map(([st, count]) => {
                      const tpct = tasks.length === 0 ? 0 : Math.round((count / tasks.length) * 100);
                      const colors: Record<string, string> = {
                        todo: '#94a3b8', in_progress: '#fbbf24', in_review: '#a78bfa', done: '#4ade80',
                      };
                      return (
                        <div key={st}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="capitalize text-gray-600">{st.replace('_', ' ')}</span>
                            <span className="text-gray-400">{count}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full transition-all"
                              style={{ width: `${tpct}%`, background: colors[st] ?? '#94a3b8' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── TASKS TAB ── */}
          {activeTab === 'tasks' && (
            <div className="space-y-2">
              {loadingTasks ? (
                <div className="flex justify-center py-10">
                  <div className="w-6 h-6 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-10">
                  <CheckSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">No tasks linked yet</p>
                  <Link to="/tasks" className="text-xs text-indigo-500 mt-1 inline-block hover:underline">
                    Create a task →
                  </Link>
                </div>
              ) : tasks.map((t) => (
                <Link key={t.id} to={`/tasks/${t.id}`}
                  className="flex items-center gap-3 p-3.5 bg-gray-50 rounded-xl border border-gray-100 hover:border-indigo-200 transition-colors group">
                  <div className="flex-shrink-0">
                    {['done', 'closed'].includes(t.status)
                      ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                      : <Circle className="w-4 h-4 text-gray-300 group-hover:text-indigo-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate group-hover:text-indigo-600 ${
                      ['done','closed'].includes(t.status) ? 'line-through text-gray-400' : 'text-gray-800'
                    }`}>{t.title}</p>
                    {t.assignee && (
                      <p className="text-xs text-gray-400 mt-0.5">{t.assignee.name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {t.estimate_hours > 0 || t.estimate_minutes > 0 ? (
                      <span className="text-xs text-gray-400">
                        {formatTime(t.estimate_hours ?? 0, t.estimate_minutes ?? 0)}
                      </span>
                    ) : null}
                    <Badge value={t.priority} type="priority" />
                    <Badge value={t.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* ── TIME & PROGRESS TAB ── */}
          {activeTab === 'time' && (
            <div className="space-y-5">
              {/* Estimation vs Logged */}
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4 text-indigo-500" />
                    <p className="text-sm font-semibold text-gray-800">Time Tracking</p>
                  </div>
                  <button
                    onClick={() => setIsLoggingTime(true)}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Log Time
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center p-3 bg-blue-50 rounded-xl">
                    <p className="text-lg font-bold text-blue-700">{formatMinutes(estimateMin)}</p>
                    <p className="text-[10px] text-blue-500 font-medium mt-0.5">Estimated</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-xl">
                    <p className={`text-lg font-bold ${loggedMin > estimateMin && estimateMin > 0 ? 'text-red-600' : 'text-green-700'}`}>
                      {formatMinutes(loggedMin)}
                    </p>
                    <p className="text-[10px] text-green-500 font-medium mt-0.5">Logged</p>
                  </div>
                  <div className="text-center p-3 bg-gray-100 rounded-xl">
                    <p className={`text-lg font-bold ${loggedMin > estimateMin && estimateMin > 0 ? 'text-red-600' : 'text-gray-700'}`}>
                      {estimateMin > 0
                        ? loggedMin > estimateMin
                          ? `+${formatMinutes(loggedMin - estimateMin)}`
                          : formatMinutes(estimateMin - loggedMin)
                        : '—'}
                    </p>
                    <p className="text-[10px] text-gray-500 font-medium mt-0.5">
                      {loggedMin > estimateMin ? 'Over' : 'Remaining'}
                    </p>
                  </div>
                </div>

                {estimateMin > 0 && (
                  <TimeBar loggedMin={loggedMin} estimateMin={estimateMin} color={color} />
                )}
              </div>

              {/* Completion */}
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-indigo-500" />
                    <p className="text-sm font-semibold text-gray-800">Completion</p>
                  </div>
                  <button
                    onClick={() => { setCompletionValue(story.completion_percentage ?? 0); setIsUpdatingCompletion(true); }}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    Update
                  </button>
                </div>

                <div className="flex items-center gap-4 mb-3">
                  <div className="relative">
                    <ProgressRing pct={pct} size={64} stroke={5} color={color} />
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-800">
                      {pct}%
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                      <div className="h-2.5 rounded-full transition-all"
                        style={{ width: `${pct}%`, background: pct === 100 ? '#22c55e' : color }} />
                    </div>
                    {story.completion_note && (
                      <p className="text-xs text-gray-500 italic">"{story.completion_note}"</p>
                    )}
                  </div>
                </div>

                {/* Quick set buttons */}
                <div className="flex gap-2">
                  {[0, 25, 50, 75, 100].map((v) => (
                    <button key={v} type="button"
                      onClick={async () => {
                        try {
                          await api.patch(`/user-stories/${story.id}/completion`, { completion_percentage: v });
                          toast.success('Updated!');
                          onClose();
                        } catch { toast.error('Failed'); }
                      }}
                      className={`flex-1 py-1.5 text-xs rounded-lg font-semibold transition-colors ${
                        pct === v ? 'text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      style={pct === v ? { background: color } : {}}
                    >
                      {v}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Log time form */}
              {isLoggingTime && (
                <form onSubmit={handleLogTime} className="p-4 rounded-2xl border-2 border-indigo-200 bg-indigo-50 space-y-3">
                  <p className="text-sm font-semibold text-indigo-700">Log Time</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label text-xs">Hours</label>
                      <input type="number" min="0" value={timeForm.hours}
                        onChange={(e) => setTimeForm((p) => ({ ...p, hours: Number(e.target.value) }))}
                        className="input" />
                    </div>
                    <div>
                      <label className="label text-xs">Minutes</label>
                      <input type="number" min="0" max="59" value={timeForm.minutes}
                        onChange={(e) => setTimeForm((p) => ({ ...p, minutes: Number(e.target.value) }))}
                        className="input" />
                    </div>
                  </div>
                  <div>
                    <label className="label text-xs">Description</label>
                    <input type="text" value={timeForm.description}
                      onChange={(e) => setTimeForm((p) => ({ ...p, description: e.target.value }))}
                      className="input" placeholder="What did you work on?" />
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" disabled={saving} className="btn-primary flex-1 text-sm disabled:opacity-60">
                      {saving ? 'Logging…' : 'Log Time'}
                    </button>
                    <button type="button" onClick={() => setIsLoggingTime(false)} className="btn-secondary flex-1 text-sm">
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Update completion form */}
              {isUpdatingCompletion && (
                <form onSubmit={handleUpdateCompletion} className="p-4 rounded-2xl border-2 border-indigo-200 bg-indigo-50 space-y-3">
                  <p className="text-sm font-semibold text-indigo-700">Update Completion</p>
                  <div>
                    <label className="label text-xs">Percentage: {completionValue}%</label>
                    <input type="range" min="0" max="100" step="5" value={completionValue}
                      onChange={(e) => setCompletionValue(Number(e.target.value))}
                      className="w-full accent-indigo-600" />
                  </div>
                  <div>
                    <label className="label text-xs">Note (optional)</label>
                    <input type="text" value={completionNote}
                      onChange={(e) => setCompletionNote(e.target.value)}
                      className="input" placeholder="Current status note…" />
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" disabled={saving} className="btn-primary flex-1 text-sm disabled:opacity-60">
                      {saving ? 'Saving…' : 'Update'}
                    </button>
                    <button type="button" onClick={() => setIsUpdatingCompletion(false)} className="btn-secondary flex-1 text-sm">
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Drawer footer */}
        <div className="p-4 border-t border-gray-100 flex gap-3 bg-gray-50 flex-shrink-0">
          <Link to="/tasks"
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-white transition-colors">
            <CheckSquare className="w-4 h-4" /> View Tasks
          </Link>
          <button onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium text-white transition-colors"
            style={{ background: color }}>
            <Edit3 className="w-4 h-4" /> Edit Story
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Developer Multi-Select ────────────────────────────────────────────────────

function DeveloperSelect({ users, selected, onChange }: {
  users: Developer[];
  selected: number[];
  onChange: (ids: number[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectedUsers = users.filter((u) => selected.includes(u.id));

  const toggle = (id: number) => {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="input w-full text-left flex items-center justify-between"
      >
        <div className="flex items-center gap-2 min-w-0">
          {selectedUsers.length === 0 ? (
            <span className="text-gray-400 text-sm">Select developers…</span>
          ) : (
            <>
              <div className="flex -space-x-1">
                {selectedUsers.slice(0, 4).map((u) => (
                  <div key={u.id} className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[9px] font-bold ring-1 ring-white">
                    {u.name.charAt(0)}
                  </div>
                ))}
              </div>
              <span className="text-sm text-gray-700 truncate">
                {selectedUsers.map((u) => u.name).join(', ')}
              </span>
            </>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-30 w-full mt-1 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden max-h-48 overflow-y-auto">
          {users.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-400">No users available</p>
          ) : users.map((u) => {
            const isSelected = selected.includes(u.id);
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => toggle(u.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  isSelected ? 'bg-indigo-50' : 'hover:bg-gray-50'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
                  isSelected ? 'bg-indigo-600' : 'bg-gray-400'
                }`}>
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <span className={`flex-1 text-left ${isSelected ? 'text-indigo-700 font-medium' : 'text-gray-700'}`}>
                  {u.name}
                </span>
                {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-500 flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main UserStories Page ────────────────────────────────────────────────────

export default function UserStories() {
  const [stories, setStories]       = useState<UserStoryFull[]>([]);
  const [projects, setProjects]     = useState<Project[]>([]);
  const [epics, setEpics]           = useState<Epic[]>([]);
  const [users, setUsers]           = useState<Developer[]>([]);
  const [sprints, setSprints]       = useState<string[]>([]);
  const [stats, setStats]           = useState<StoryStats | null>(null);
  const [loading, setLoading]       = useState(true);

  const [search, setSearch]               = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterEpic, setFilterEpic]       = useState('');
  const [filterStatus, setFilterStatus]   = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterSprint, setFilterSprint]   = useState('');
  const [viewMode, setViewMode]           = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab]         = useState<'all' | 'todo' | 'in_progress' | 'done'>('all');

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [detailStory, setDetailStory] = useState<UserStoryFull | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editStory, setEditStory]     = useState<UserStoryFull | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserStoryFull | null>(null);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [saving, setSaving]           = useState(false);

  const fetchStories = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterProject)  params.project_id = filterProject;
      if (filterEpic)     params.epic_id    = filterEpic;
      if (filterStatus)   params.status     = filterStatus;
      if (filterPriority) params.priority   = filterPriority;
      if (filterSprint)   params.sprint     = filterSprint;
      if (search)         params.search     = search;

      const [storiesRes, statsRes] = await Promise.all([
        api.get('/user-stories', { params }),
        api.get('/user-stories/stats', filterProject ? { params: { project_id: filterProject } } : {}),
      ]);

      setStories(storiesRes.data);
      setStats(statsRes.data);
    } catch { toast.error('Failed to load user stories'); }
    finally { setLoading(false); }
  }, [filterProject, filterEpic, filterStatus, filterPriority, filterSprint, search]);

  useEffect(() => { fetchStories(); }, [filterProject, filterEpic, filterStatus, filterPriority, filterSprint]);

  useEffect(() => {
    api.get('/projects').then((r) => setProjects(r.data.data ?? r.data));
    api.get('/tasks/users').then((r) => setUsers(r.data.data ?? r.data)).catch(() => {});
    api.get('/user-stories/sprints').then((r) => setSprints(r.data ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (filterProject) {
      api.get('/epics', { params: { project_id: filterProject } })
        .then((r) => setEpics(r.data));
    } else {
      api.get('/epics').then((r) => setEpics(r.data));
    }
  }, [filterProject]);

  const resetForm = () => { setForm(EMPTY_FORM); setEditStory(null); };

  const openCreate = () => { resetForm(); setIsModalOpen(true); };
  const openEdit = (story: UserStoryFull) => {
    setEditStory(story);
    setForm({
      project_id:            String(story.project_id),
      epic_id:               story.epic_id ? String(story.epic_id) : '',
      name:                  story.name,
      description:           story.description ?? '',
      status:                story.status,
      priority:              story.priority,
      story_points:          String(story.story_points),
      assignee_id:           story.assignee_id ? String(story.assignee_id) : '',
      reporter_id:           story.reporter_id ? String(story.reporter_id) : '',
      developer_ids:         story.developer_ids ?? [],
      sprint:                story.sprint ?? '',
      estimate_hours:        String(story.estimate_hours ?? 0),
      estimate_minutes:      String(story.estimate_minutes ?? 0),
      completion_percentage: String(story.completion_percentage ?? 0),
      completion_note:       story.completion_note ?? '',
      acceptance_criteria:   story.acceptance_criteria ?? '',
      color:                 story.color ?? '#6366f1',
    });
    setDetailStory(null);
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
        project_id:            Number(form.project_id),
        epic_id:               form.epic_id ? Number(form.epic_id) : null,
        name:                  form.name.trim(),
        description:           form.description || null,
        status:                form.status,
        priority:              form.priority,
        story_points:          Number(form.story_points),
        assignee_id:           form.assignee_id ? Number(form.assignee_id) : null,
        reporter_id:           form.reporter_id ? Number(form.reporter_id) : null,
        developer_ids:         form.developer_ids,
        sprint:                form.sprint || null,
        estimate_hours:        Number(form.estimate_hours),
        estimate_minutes:      Number(form.estimate_minutes),
        completion_percentage: Number(form.completion_percentage),
        completion_note:       form.completion_note || null,
        acceptance_criteria:   form.acceptance_criteria || null,
        color:                 form.color,
      };

      if (editStory) {
        const res = await api.put(`/user-stories/${editStory.id}`, payload);
        setStories((prev) => prev.map((s) => s.id === editStory.id ? { ...s, ...res.data } : s));
        toast.success('Story updated!');
      } else {
        const res = await api.post('/user-stories', payload);
        setStories((prev) => [res.data, ...prev]);
        toast.success('Story created!');
      }

      setIsModalOpen(false);
      resetForm();
      fetchStories();
    } catch {
      toast.error('Failed to save story');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/user-stories/${deleteTarget.id}`);
      setStories((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      toast.success('Story deleted');
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to delete');
    }
  };

  const filtered = stories.filter((s) => {
    const matchSearch = !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.description ?? '').toLowerCase().includes(search.toLowerCase());
    const matchTab = activeTab === 'all' || s.status === activeTab;
    return matchSearch && matchTab;
  });

  const hasFilters = filterProject || filterEpic || filterStatus || filterPriority || filterSprint;

  const totalPct = stats && stats.total > 0
    ? Math.round((stats.by_status?.done ?? 0) / stats.total * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="User Stories" />
      <div className="p-6 max-w-7xl mx-auto">

        {/* ── Stats cards ── */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
            {[
              { label: 'Total',      value: stats.total,                         color: 'text-gray-700',   bg: 'bg-white' },
              { label: 'To Do',      value: stats.by_status?.todo ?? 0,           color: 'text-gray-600',   bg: 'bg-gray-50' },
              { label: 'Active',     value: stats.by_status?.in_progress ?? 0,    color: 'text-blue-700',   bg: 'bg-blue-50' },
              { label: 'Done',       value: stats.by_status?.done ?? 0,           color: 'text-green-700',  bg: 'bg-green-50' },
              { label: 'Total Pts',  value: stats.total_points,                  color: 'text-indigo-700', bg: 'bg-indigo-50' },
              { label: 'Done Pts',   value: stats.done_points,                   color: 'text-purple-700', bg: 'bg-purple-50' },
              { label: 'Estimate',   value: formatMinutes(stats.total_estimate_min), color: 'text-sky-700', bg: 'bg-sky-50' },
              { label: 'Avg %',      value: `${stats.avg_completion}%`,          color: 'text-emerald-700',bg: 'bg-emerald-50' },
            ].map((s) => (
              <div key={s.label} className={`${s.bg} rounded-2xl border border-gray-100 shadow-sm p-3.5 text-center`}>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[11px] text-gray-500 font-medium mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Overall progress bar ── */}
        {stats && stats.total > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">Overall Progress</span>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="font-bold text-indigo-600">{stats.done_points}</span>
                <span>/ {stats.total_points} story points done</span>
                <span className="font-bold text-emerald-600 ml-1">{totalPct}%</span>
              </div>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
              <div className="h-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-700"
                style={{ width: `${totalPct}%` }} />
            </div>
          </div>
        )}

        {/* ── Toolbar ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <form onSubmit={(e) => { e.preventDefault(); fetchStories(); }} className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search stories…"
                value={search} onChange={(e) => setSearch(e.target.value)}
                className="input pl-9 w-full" />
            </form>

            <select value={filterProject} onChange={(e) => { setFilterProject(e.target.value); setFilterEpic(''); }} className="input w-44">
              <option value="">All Projects</option>
              {projects.map((p) => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
            </select>

            <select value={filterEpic} onChange={(e) => setFilterEpic(e.target.value)} className="input w-40">
              <option value="">All Epics</option>
              {epics.map((e) => <option key={e.id} value={String(e.id)}>{e.name}</option>)}
            </select>

            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input w-36">
              <option value="">All Statuses</option>
              <option value="todo">To Do</option>
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

            {sprints.length > 0 && (
              <select value={filterSprint} onChange={(e) => setFilterSprint(e.target.value)} className="input w-36">
                <option value="">All Sprints</option>
                {sprints.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            )}

            {hasFilters && (
              <button
                onClick={() => { setFilterProject(''); setFilterEpic(''); setFilterStatus(''); setFilterPriority(''); setFilterSprint(''); }}
                className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50">
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            )}

            {/* View toggle */}
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

            <button onClick={openCreate} className="btn-primary flex items-center gap-2 whitespace-nowrap">
              <Plus className="w-4 h-4" /> New Story
            </button>
          </div>

          {/* Tab filters */}
          <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-50">
            {[
              { key: 'all',         label: `All (${stories.length})` },
              { key: 'todo',        label: `To Do (${stats?.by_status?.todo ?? 0})` },
              { key: 'in_progress', label: `In Progress (${stats?.by_status?.in_progress ?? 0})` },
              { key: 'done',        label: `Done (${stats?.by_status?.done ?? 0})` },
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
            <button onClick={fetchStories} className="ml-auto p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
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
              <BookOpen className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-500 font-semibold text-lg">No user stories found</p>
            <p className="text-gray-400 text-sm mt-1">
              {search || hasFilters ? 'Try adjusting your filters' : 'Create your first story to track requirements'}
            </p>
            {!search && !hasFilters && (
              <button onClick={openCreate} className="btn-primary mt-4">Create Story</button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((story) => (
              <StoryCard
                key={story.id}
                story={story}
                onEdit={() => openEdit(story)}
                onDelete={() => setDeleteTarget(story)}
                onView={() => setDetailStory(story)}
                onToggleTasks={() => setExpandedId(expandedId === story.id ? null : story.id)}
                showTasks={expandedId === story.id}
                users={users}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Story', 'Status', 'Priority', 'Progress', 'Points', 'Time', 'Assignee/Devs', 'Tasks', 'Date', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((story) => (
                  <StoryRow
                    key={story.id}
                    story={story}
                    onEdit={() => openEdit(story)}
                    onDelete={() => setDeleteTarget(story)}
                    onView={() => setDetailStory(story)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length > 0 && (
          <p className="text-xs text-gray-400 text-center mt-4">
            Showing {filtered.length} of {stories.length} stories
          </p>
        )}
      </div>

      {/* ── Detail Drawer ── */}
      {detailStory && (
        <StoryDetailDrawer
          story={detailStory}
          onClose={() => { setDetailStory(null); fetchStories(); }}
          onEdit={() => openEdit(detailStory)}
          allUsers={users}
        />
      )}

      {/* ── Create / Edit Modal ── */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title={editStory ? 'Edit User Story' : 'Create User Story'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">

          {/* Name */}
          <div>
            <label className="label">Story Name *</label>
            <input name="name" value={form.name} onChange={handleChange}
              className="input" placeholder="As a user, I want to…" required autoFocus />
          </div>

          {/* Project + Epic */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Project *</label>
              <select name="project_id" value={form.project_id}
                onChange={(e) => { setForm((p) => ({ ...p, project_id: e.target.value, epic_id: '' })); }}
                className="input" required>
                <option value="">Select project…</option>
                {projects.map((p) => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Epic</label>
              <select name="epic_id" value={form.epic_id} onChange={handleChange} className="input">
                <option value="">No Epic</option>
                {epics
                  .filter((e) => !form.project_id || String(e.project_id) === form.project_id)
                  .map((e) => <option key={e.id} value={String(e.id)}>{e.name}</option>)}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="label">Description</label>
            <textarea name="description" value={form.description} onChange={handleChange}
              className="input" rows={2} placeholder="Describe the feature or requirement…" />
          </div>

          {/* Acceptance Criteria */}
          <div>
            <label className="label flex items-center gap-1.5">
              <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
              Acceptance Criteria
            </label>
            <textarea name="acceptance_criteria" value={form.acceptance_criteria} onChange={handleChange}
              className="input font-mono text-xs" rows={3}
              placeholder="• Given … When … Then …&#10;• Given … When … Then …" />
          </div>

          {/* Status + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Status</label>
              <select name="status" value={form.status} onChange={handleChange} className="input">
                <option value="todo">To Do</option>
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

          {/* Story Points + Sprint */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Story Points</label>
              <div className="flex flex-wrap gap-1.5">
                {POINT_OPTIONS.map((pt) => (
                  <button key={pt} type="button"
                    onClick={() => setForm((p) => ({ ...p, story_points: String(pt) }))}
                    className={`w-9 h-9 rounded-xl text-sm font-bold transition-all ${
                      form.story_points === String(pt)
                        ? 'bg-indigo-600 text-white shadow-md scale-110'
                        : 'bg-gray-100 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'
                    }`}>
                    {pt}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Sprint</label>
              <input name="sprint" value={form.sprint} onChange={handleChange}
                className="input" placeholder="Sprint 1, Sprint 2…"
                list="sprints-list" />
              <datalist id="sprints-list">
                {sprints.map((s) => <option key={s} value={s} />)}
              </datalist>
            </div>
          </div>

          {/* Estimation */}
          <div>
            <label className="label flex items-center gap-1.5">
              <Timer className="w-3.5 h-3.5 text-blue-500" />
              Estimation Time
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Hours</label>
                <input type="number" name="estimate_hours" value={form.estimate_hours}
                  onChange={handleChange} className="input" min="0" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Minutes</label>
                <input type="number" name="estimate_minutes" value={form.estimate_minutes}
                  onChange={handleChange} className="input" min="0" max="59" />
              </div>
            </div>
            {(Number(form.estimate_hours) > 0 || Number(form.estimate_minutes) > 0) && (
              <p className="text-xs text-indigo-600 mt-1 font-medium">
                Total: {formatTime(Number(form.estimate_hours), Number(form.estimate_minutes))}
              </p>
            )}
          </div>

          {/* Assignee + Reporter */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Product Owner / Assignee</label>
              <select name="assignee_id" value={form.assignee_id} onChange={handleChange} className="input">
                <option value="">Unassigned</option>
                {users.map((u) => <option key={u.id} value={String(u.id)}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Reporter</label>
              <select name="reporter_id" value={form.reporter_id} onChange={handleChange} className="input">
                <option value="">Select reporter…</option>
                {users.map((u) => <option key={u.id} value={String(u.id)}>{u.name}</option>)}
              </select>
            </div>
          </div>

          {/* Developer multi-select */}
          <div>
            <label className="label flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-500" />
              Assign Developers
            </label>
            <DeveloperSelect
              users={users}
              selected={form.developer_ids}
              onChange={(ids) => setForm((p) => ({ ...p, developer_ids: ids }))}
            />
            {form.developer_ids.length > 0 && (
              <p className="text-xs text-indigo-600 mt-1">
                {form.developer_ids.length} developer{form.developer_ids.length > 1 ? 's' : ''} selected
              </p>
            )}
          </div>

          {/* Completion */}
          <div>
            <label className="label">Completion: {form.completion_percentage}%</label>
            <input type="range" min="0" max="100" step="5"
              value={form.completion_percentage}
              onChange={(e) => setForm((p) => ({ ...p, completion_percentage: e.target.value }))}
              className="w-full accent-indigo-600" />
            <div className="flex gap-2 mt-2">
              {[0, 25, 50, 75, 100].map((v) => (
                <button key={v} type="button"
                  onClick={() => setForm((p) => ({ ...p, completion_percentage: String(v) }))}
                  className={`flex-1 py-1 text-xs rounded-lg font-semibold transition-colors ${
                    Number(form.completion_percentage) === v
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  {v}%
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="label">Story Color</label>
            <div className="flex items-center gap-2 flex-wrap">
              {STORY_COLORS.map((c) => (
                <button key={c} type="button"
                  onClick={() => setForm((p) => ({ ...p, color: c }))}
                  className={`w-7 h-7 rounded-full transition-all ${
                    form.color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-125' : 'hover:scale-110'
                  }`}
                  style={{ background: c }} />
              ))}
              <input type="color" name="color" value={form.color} onChange={handleChange}
                className="w-8 h-8 rounded-full cursor-pointer border-2 border-gray-200" />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2 sticky bottom-0 bg-white pb-1">
            <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-60">
              {saving ? 'Saving…' : editStory ? 'Update Story' : 'Create Story'}
            </button>
            <button type="button" onClick={() => { setIsModalOpen(false); resetForm(); }}
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
        title="Delete User Story"
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-50 rounded-xl border border-red-100 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 leading-relaxed">
              Delete <span className="font-bold">{deleteTarget?.name}</span>?
              All linked tasks will become unlinked. This cannot be undone.
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={handleDelete} className="btn-danger flex-1">Yes, Delete</button>
            <button onClick={() => setDeleteTarget(null)} className="btn-secondary flex-1">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}