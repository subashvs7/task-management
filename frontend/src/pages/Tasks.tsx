import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Plus, Search, Filter, X, ChevronDown, ChevronUp, ChevronRight,
  Calendar, Clock, Users, Target, AlertTriangle, CheckCircle2,
  Circle, Timer, Zap, BarChart3, Edit3, Trash2, Eye,
  TrendingUp, BookOpen, Layers, Flag, Activity, User,
  PlayCircle, CheckSquare, MoreVertical, Grid3X3, List,
  RefreshCw, Copy, Tag, Paperclip, MessageSquare,
  ArrowUpRight, Flame, Star, Columns, SortAsc, SortDesc,
  Download, Upload, Shield, Bug, Wrench, FlaskConical,
  Microscope, Palette, FileText, Layout, ChevronLeft,
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/layout/Header';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import api from '../services/api';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
}

interface Project {
  id: number;
  name: string;
  key?: string;
  color?: string;
}

interface UserStory {
  id: number;
  name: string;
  status: string;
}

interface Epic {
  id: number;
  name: string;
}

interface TimeLogEntry {
  id: number;
  user?: User;
  hours: number;
  minutes: number;
  logged_date: string;
  description?: string;
  created_at: string;
}

interface SubTask {
  id: number;
  title: string;
  status: string;
  assigned_to?: number;
  assignee?: User;
  completed_at?: string;
}

interface Comment {
  id: number;
  user?: User;
  body: string;
  created_at: string;
  updated_at: string;
}

interface Attachment {
  id: number;
  user?: User;
  name: string;
  path: string;
  mime_type: string;
  size: number;
  created_at: string;
}

interface ActivityEntry {
  id: number;
  user?: User;
  action: string;
  description: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  created_at: string;
}

interface TaskFull {
  id: number;
  project_id: number;
  story_id?: number;
  parent_id?: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  type: string;
  due_date?: string;
  assigned_to?: number;
  reporter_id?: number;
  estimate_hours: number;
  estimate_minutes: number;
  logged_hours: number;
  logged_minutes: number;
  completion_percentage: number;
  completion_note?: string;
  started_at?: string;
  completed_at?: string;
  labels?: string[];
  environment?: string;
  version?: string;
  acceptance_criteria?: string;
  sort_order?: number;
  project?: Project;
  story?: UserStory;
  assignee?: User;
  reporter?: User;
  parent?: TaskFull;
  child_tasks?: TaskFull[];
  sub_tasks?: SubTask[];
  time_logs?: TimeLogEntry[];
  comments?: Comment[];
  attachments?: Attachment[];
  activity_logs?: ActivityEntry[];
  sub_tasks_count?: number;
  comments_count?: number;
  attachments_count?: number;
  time_logs_count?: number;
  created_at: string;
  updated_at: string;
}

interface TaskStats {
  total: number;
  by_status: Record<string, number>;
  by_priority: Record<string, number>;
  by_type: Record<string, number>;
  overdue_count: number;
  overdue_tasks: TaskFull[];
  top_assignees: Array<{ user: User; total: number; done: number; in_progress: number }>;
  total_estimate_min: number;
  total_logged_min: number;
  avg_completion: number;
  completed_this_week: number;
  created_this_week: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TASK_TYPES = [
  { value: 'task',          label: 'Task',          icon: CheckSquare,  color: 'text-blue-600',   bg: 'bg-blue-50' },
  { value: 'bug',           label: 'Bug',           icon: Bug,          color: 'text-red-600',    bg: 'bg-red-50' },
  { value: 'feature',       label: 'Feature',       icon: Star,         color: 'text-purple-600', bg: 'bg-purple-50' },
  { value: 'improvement',   label: 'Improvement',   icon: TrendingUp,   color: 'text-green-600',  bg: 'bg-green-50' },
  { value: 'test',          label: 'Test',          icon: FlaskConical, color: 'text-yellow-600', bg: 'bg-yellow-50' },
  { value: 'research',      label: 'Research',      icon: Microscope,   color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { value: 'design',        label: 'Design',        icon: Palette,      color: 'text-pink-600',   bg: 'bg-pink-50' },
  { value: 'documentation', label: 'Documentation', icon: FileText,     color: 'text-gray-600',   bg: 'bg-gray-50' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string; border: string }> = {
  backlog:     { label: 'Backlog',     color: 'text-gray-600',   bg: 'bg-gray-50',     dot: 'bg-gray-400',   border: 'border-gray-200' },
  todo:        { label: 'To Do',       color: 'text-slate-700',  bg: 'bg-slate-50',    dot: 'bg-slate-400',  border: 'border-slate-200' },
  in_progress: { label: 'In Progress', color: 'text-blue-700',   bg: 'bg-blue-50',     dot: 'bg-blue-500',   border: 'border-blue-200' },
  in_review:   { label: 'In Review',   color: 'text-purple-700', bg: 'bg-purple-50',   dot: 'bg-purple-500', border: 'border-purple-200' },
  done:        { label: 'Done',        color: 'text-green-700',  bg: 'bg-green-50',    dot: 'bg-green-500',  border: 'border-green-200' },
  closed:      { label: 'Closed',      color: 'text-gray-700',   bg: 'bg-gray-100',    dot: 'bg-gray-500',   border: 'border-gray-300' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string; ring: string }> = {
  low:      { label: 'Low',      color: 'text-green-600',  bg: 'bg-green-50',  icon: '↓', ring: 'ring-green-200' },
  medium:   { label: 'Medium',   color: 'text-yellow-600', bg: 'bg-yellow-50', icon: '→', ring: 'ring-yellow-200' },
  high:     { label: 'High',     color: 'text-orange-600', bg: 'bg-orange-50', icon: '↑', ring: 'ring-orange-200' },
  critical: { label: 'Critical', color: 'text-red-600',    bg: 'bg-red-50',    icon: '⚑', ring: 'ring-red-200' },
};

const LABEL_COLORS = [
  'bg-red-100 text-red-700', 'bg-blue-100 text-blue-700', 'bg-green-100 text-green-700',
  'bg-yellow-100 text-yellow-700', 'bg-purple-100 text-purple-700', 'bg-pink-100 text-pink-700',
  'bg-indigo-100 text-indigo-700', 'bg-orange-100 text-orange-700', 'bg-teal-100 text-teal-700',
];

const EMPTY_FORM = {
  project_id: '', story_id: '', parent_id: '',
  title: '', description: '',
  status: 'todo', priority: 'medium', type: 'task',
  due_date: '', assigned_to: '', reporter_id: '',
  estimate_hours: '0', estimate_minutes: '0',
  completion_percentage: '0', completion_note: '',
  labels: [] as string[], label_input: '',
  environment: '', version: '',
  acceptance_criteria: '',
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
  return formatTime(Math.floor(total / 60), total % 60);
}
function timeAgo(d: string): string {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function getLabelColor(label: string): string {
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = label.charCodeAt(i) + ((hash << 5) - hash);
  return LABEL_COLORS[Math.abs(hash) % LABEL_COLORS.length];
}
function getTypeConfig(type: string) {
  return TASK_TYPES.find((t) => t.value === type) ?? TASK_TYPES[0];
}

// ─── Progress Ring ────────────────────────────────────────────────────────────

function ProgressRing({ pct, size = 40, stroke = 3, color = '#3b82f6' }: {
  pct: number; size?: number; stroke?: number; color?: string;
}) {
  const r = (size - stroke * 2) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={pct === 100 ? '#22c55e' : color}
        strokeWidth={stroke} strokeDasharray={c} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
    </svg>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ user, size = 'sm' }: { user: User; size?: 'xs' | 'sm' | 'md' | 'lg' }) {
  const cls = size === 'xs' ? 'w-5 h-5 text-[9px]'
    : size === 'sm' ? 'w-7 h-7 text-xs'
    : size === 'md' ? 'w-9 h-9 text-sm'
    : 'w-11 h-11 text-base';
  const colors = ['bg-blue-600','bg-purple-600','bg-green-600','bg-orange-600','bg-pink-600','bg-teal-600'];
  const bg = colors[user.id % colors.length];
  return (
    <div className={`${cls} ${bg} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}
      title={user.name}>
      {user.name.charAt(0).toUpperCase()}
    </div>
  );
}

// ─── Type Badge ───────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: string }) {
  const cfg = getTypeConfig(type);
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.color}`}>
      <cfg.icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

// ─── Labels ───────────────────────────────────────────────────────────────────

function Labels({ labels, max = 3 }: { labels: string[]; max?: number }) {
  if (!labels?.length) return null;
  const shown = labels.slice(0, max);
  const extra = labels.length - max;
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((l) => (
        <span key={l} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getLabelColor(l)}`}>
          {l}
        </span>
      ))}
      {extra > 0 && (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
          +{extra}
        </span>
      )}
    </div>
  );
}

// ─── Task Card (Grid) ─────────────────────────────────────────────────────────

function TaskCard({ task, selected, onSelect, onEdit, onDelete, onDuplicate, onView }: {
  task: TaskFull;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onView: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const status   = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.todo;
  const priority = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.medium;
  const cfg      = getTypeConfig(task.type);
  const pct      = task.completion_percentage ?? 0;
  const estMin   = (task.estimate_hours ?? 0) * 60 + (task.estimate_minutes ?? 0);
  const logMin   = (task.logged_hours ?? 0) * 60 + (task.logged_minutes ?? 0);

  const isOverdue = task.due_date &&
    new Date(task.due_date) < new Date() &&
    !['done','closed'].includes(task.status);

  return (
    <div className={`bg-white rounded-2xl border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col overflow-hidden group ${
      selected ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-100'
    }`}>
      {/* Priority top stripe */}
      <div className={`h-1 w-full flex-shrink-0 ${
        task.priority === 'critical' ? 'bg-red-500' :
        task.priority === 'high'     ? 'bg-orange-400' :
        task.priority === 'medium'   ? 'bg-yellow-400' : 'bg-green-400'
      }`} />

      <div className="p-4 flex flex-col gap-2.5 flex-1">
        {/* Row1: checkbox + type icon + menu */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={selected} onChange={onSelect}
              className="w-4 h-4 rounded accent-blue-600 cursor-pointer flex-shrink-0" />
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.color}`}>
              <cfg.icon className="w-3 h-3" />
              {cfg.label}
            </span>
          </div>
          <div className="relative">
            <button onClick={() => setMenuOpen((v) => !v)}
              className="p-1 rounded-lg hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-all">
              <MoreVertical className="w-4 h-4 text-gray-400" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-7 z-20 bg-white rounded-xl shadow-xl border border-gray-100 py-1 w-36">
                  <button onClick={() => { onView(); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"><Eye className="w-3.5 h-3.5" /> View</button>
                  <button onClick={() => { onEdit(); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"><Edit3 className="w-3.5 h-3.5" /> Edit</button>
                  <button onClick={() => { onDuplicate(); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"><Copy className="w-3.5 h-3.5" /> Duplicate</button>
                  <button onClick={() => { onDelete(); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Title */}
        <button onClick={onView} className="text-sm font-bold text-gray-900 text-left leading-snug hover:text-blue-600 transition-colors line-clamp-2">
          {task.title}
        </button>

        {/* Project / Story breadcrumb */}
        {(task.project || task.story) && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400 flex-wrap">
            {task.project && <span className="truncate max-w-[80px]">{task.project.name}</span>}
            {task.story && <><ChevronRight className="w-3 h-3 flex-shrink-0" /><span className="truncate max-w-[80px] text-blue-400">{task.story.name}</span></>}
          </div>
        )}

        {/* Labels */}
        {task.labels && task.labels.length > 0 && <Labels labels={task.labels} max={3} />}

        {/* Status + Priority */}
        <div className="flex flex-wrap gap-1.5">
          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium border ${status.bg} ${status.color} ${status.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${priority.color} ${priority.bg}`}>
            {priority.icon} {priority.label}
          </span>
          {isOverdue && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
              <AlertTriangle className="w-3 h-3" /> Overdue
            </span>
          )}
        </div>

        {/* Completion bar */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
              <div className="h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: pct === 100 ? '#22c55e' : '#3b82f6' }} />
            </div>
            <span className="text-xs text-gray-500 font-medium w-7 text-right">{pct}%</span>
          </div>
        </div>

        {/* Time tracking */}
        {estMin > 0 && (
          <div className="text-xs text-gray-500 flex items-center gap-1">
            <Timer className="w-3 h-3 flex-shrink-0" />
            <span className={`font-semibold ${logMin > estMin ? 'text-red-600' : 'text-gray-700'}`}>
              {formatMinutes(logMin)}
            </span>
            <span className="text-gray-400">/ {formatMinutes(estMin)}</span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-50 mt-auto">
          {/* Due date */}
          <div className="text-xs">
            {task.due_date ? (
              <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                <Calendar className="w-3 h-3" />
                {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            ) : <span className="text-gray-300">No due date</span>}
          </div>

          {/* Meta icons + assignee */}
          <div className="flex items-center gap-1.5">
            {(task.sub_tasks_count ?? 0) > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-gray-400">
                <CheckSquare className="w-3 h-3" />{task.sub_tasks_count}
              </span>
            )}
            {(task.comments_count ?? 0) > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-gray-400">
                <MessageSquare className="w-3 h-3" />{task.comments_count}
              </span>
            )}
            {(task.attachments_count ?? 0) > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-gray-400">
                <Paperclip className="w-3 h-3" />{task.attachments_count}
              </span>
            )}
            {task.assignee && <Avatar user={task.assignee} size="xs" />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Task Row (List View) ─────────────────────────────────────────────────────

function TaskRow({ task, selected, onSelect, onEdit, onDelete, onDuplicate, onView }: {
  task: TaskFull;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onView: () => void;
}) {
  const status   = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.todo;
  const priority = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.medium;
  const pct      = task.completion_percentage ?? 0;
  const estMin   = (task.estimate_hours ?? 0) * 60 + (task.estimate_minutes ?? 0);
  const logMin   = (task.logged_hours ?? 0) * 60 + (task.logged_minutes ?? 0);
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !['done','closed'].includes(task.status);

  return (
    <tr className={`hover:bg-gray-50 transition-colors group border-b border-gray-50 last:border-0 ${selected ? 'bg-blue-50' : ''}`}>
      <td className="px-3 py-3">
        <input type="checkbox" checked={selected} onChange={onSelect} className="w-4 h-4 rounded accent-blue-600" />
      </td>
      <td className="px-3 py-3">
        <TypeBadge type={task.type} />
      </td>
      <td className="px-3 py-3 max-w-xs">
        <div>
          <button onClick={onView}
            className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors text-left line-clamp-1">
            {task.title}
          </button>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {task.labels && task.labels.length > 0 && <Labels labels={task.labels} max={2} />}
          </div>
        </div>
      </td>
      <td className="px-3 py-3 whitespace-nowrap">
        <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium border ${status.bg} ${status.color} ${status.border}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </span>
      </td>
      <td className="px-3 py-3 whitespace-nowrap">
        <span className={`text-xs font-bold ${priority.color}`}>{priority.icon} {priority.label}</span>
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2 w-24">
          <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <div className="h-1.5 rounded-full transition-all"
              style={{ width: `${pct}%`, background: pct === 100 ? '#22c55e' : '#3b82f6' }} />
          </div>
          <span className="text-xs text-gray-500 font-medium w-7">{pct}%</span>
        </div>
      </td>
      <td className="px-3 py-3 whitespace-nowrap">
        {estMin > 0 ? (
          <div className="text-xs">
            <span className={`font-semibold ${logMin > estMin ? 'text-red-600' : 'text-gray-800'}`}>
              {formatMinutes(logMin)}
            </span>
            <span className="text-gray-400"> / {formatMinutes(estMin)}</span>
          </div>
        ) : <span className="text-xs text-gray-300">—</span>}
      </td>
      <td className="px-3 py-3">
        {task.assignee ? <Avatar user={task.assignee} size="xs" /> : <span className="text-xs text-gray-300">—</span>}
      </td>
      <td className="px-3 py-3 whitespace-nowrap">
        {task.due_date ? (
          <span className={`text-xs font-medium flex items-center gap-1 ${isOverdue ? 'text-red-500' : 'text-gray-500'}`}>
            {isOverdue && <AlertTriangle className="w-3 h-3" />}
            {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        ) : <span className="text-xs text-gray-300">—</span>}
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-3 text-xs text-gray-400">
          {(task.comments_count ?? 0) > 0 && <span className="flex items-center gap-0.5"><MessageSquare className="w-3 h-3" />{task.comments_count}</span>}
          {(task.attachments_count ?? 0) > 0 && <span className="flex items-center gap-0.5"><Paperclip className="w-3 h-3" />{task.attachments_count}</span>}
          {(task.sub_tasks_count ?? 0) > 0 && <span className="flex items-center gap-0.5"><CheckSquare className="w-3 h-3" />{task.sub_tasks_count}</span>}
        </div>
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onView}      className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors"><Eye className="w-3.5 h-3.5" /></button>
          <button onClick={onEdit}      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"><Edit3 className="w-3.5 h-3.5" /></button>
          <button onClick={onDuplicate} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"><Copy className="w-3.5 h-3.5" /></button>
          <button onClick={onDelete}    className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </td>
    </tr>
  );
}

// ─── Task Detail Drawer ───────────────────────────────────────────────────────

function TaskDetailDrawer({ taskId, onClose, onEdit, onRefresh }: {
  taskId: number;
  onClose: () => void;
  onEdit: () => void;
  onRefresh: () => void;
}) {
  const [task, setTask] = useState<TaskFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'subtasks' | 'time' | 'comments' | 'activity'>('overview');
  const [newComment, setNewComment] = useState('');
  const [savingComment, setSavingComment] = useState(false);
  const [timeForm, setTimeForm] = useState({ hours: 0, minutes: 0, logged_date: '', description: '' });
  const [savingTime, setSavingTime] = useState(false);
  const [showTimeForm, setShowTimeForm] = useState(false);
  const [completionVal, setCompletionVal] = useState(0);
  const [showCompletionForm, setShowCompletionForm] = useState(false);
  const [newSubtask, setNewSubtask] = useState('');
  const [savingSubtask, setSavingSubtask] = useState(false);

  const fetchTask = useCallback(async () => {
    try {
      const res = await api.get(`/tasks/${taskId}`);
      setTask(res.data);
      setCompletionVal(res.data.completion_percentage ?? 0);
    } catch {
      toast.error('Failed to load task');
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => { fetchTask(); }, [fetchTask]);

  if (!task && loading) return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-2xl bg-white flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );
  if (!task) return null;

  const status   = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.todo;
  const priority = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.medium;
  const cfg      = getTypeConfig(task.type);
  const pct      = task.completion_percentage ?? 0;
  const estMin   = (task.estimate_hours ?? 0) * 60 + (task.estimate_minutes ?? 0);
  const logMin   = (task.logged_hours ?? 0) * 60 + (task.logged_minutes ?? 0);
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !['done','closed'].includes(task.status);

  // Status color for header
  const headerBg =
    task.priority === 'critical' ? 'from-red-600 to-rose-700' :
    task.priority === 'high'     ? 'from-orange-500 to-orange-600' :
    task.priority === 'medium'   ? 'from-blue-600 to-blue-700' :
    'from-slate-600 to-slate-700';

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSavingComment(true);
    try {
      await api.post(`/tasks/${task.id}/comments`, { body: newComment.trim() });
      toast.success('Comment added!');
      setNewComment('');
      fetchTask();
    } catch { toast.error('Failed to add comment'); }
    finally { setSavingComment(false); }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      await api.delete(`/comments/${commentId}`);
      toast.success('Comment deleted');
      fetchTask();
    } catch { toast.error('Failed to delete comment'); }
  };

  const handleLogTime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (timeForm.hours === 0 && timeForm.minutes === 0) { toast.error('Enter time > 0'); return; }
    setSavingTime(true);
    try {
      await api.post(`/tasks/${task.id}/log-time`, {
        hours:       timeForm.hours,
        minutes:     timeForm.minutes,
        logged_date: timeForm.logged_date || new Date().toISOString().split('T')[0],
        description: timeForm.description || null,
      });
      toast.success('Time logged!');
      setShowTimeForm(false);
      setTimeForm({ hours: 0, minutes: 0, logged_date: '', description: '' });
      fetchTask();
      onRefresh();
    } catch { toast.error('Failed to log time'); }
    finally { setSavingTime(false); }
  };

  const handleDeleteTimeLog = async (logId: number) => {
    try {
      await api.delete(`/tasks/${task.id}/time-logs/${logId}`);
      toast.success('Time log removed');
      fetchTask();
      onRefresh();
    } catch { toast.error('Failed to remove'); }
  };

  const handleUpdateCompletion = async () => {
    try {
      await api.patch(`/tasks/${task.id}/completion`, {
        completion_percentage: completionVal,
      });
      toast.success('Completion updated!');
      setShowCompletionForm(false);
      fetchTask();
      onRefresh();
    } catch { toast.error('Failed to update'); }
  };

  const handleQuickComplete = async (v: number) => {
    try {
      await api.patch(`/tasks/${task.id}/completion`, { completion_percentage: v });
      toast.success(`${v}% set`);
      fetchTask();
      onRefresh();
    } catch { toast.error('Failed'); }
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtask.trim()) return;
    setSavingSubtask(true);
    try {
      await api.post(`/tasks/${task.id}/sub-tasks`, { title: newSubtask.trim(), status: 'todo' });
      toast.success('Subtask added!');
      setNewSubtask('');
      fetchTask();
    } catch { toast.error('Failed to add subtask'); }
    finally { setSavingSubtask(false); }
  };

  const handleToggleSubtask = async (subtaskId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'done' ? 'todo' : 'done';
    try {
      await api.put(`/sub-tasks/${subtaskId}`, { status: newStatus });
      fetchTask();
    } catch { toast.error('Failed to update subtask'); }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await api.patch(`/tasks/${task.id}/status`, { status: newStatus });
      toast.success(`Status → ${STATUS_CONFIG[newStatus]?.label ?? newStatus}`);
      fetchTask();
      onRefresh();
    } catch { toast.error('Failed to update status'); }
  };

  const completedSubtasks = (task.sub_tasks ?? []).filter((s) => s.status === 'done').length;
  const totalSubtasks     = (task.sub_tasks ?? []).length;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      <div className="w-full max-w-2xl bg-white shadow-2xl flex flex-col h-full overflow-hidden">

        {/* ── Gradient Header ── */}
        <div className={`relative bg-gradient-to-br ${headerBg} overflow-hidden flex-shrink-0`}>
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 0%, transparent 50%)' }} />
          <div className="relative p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold bg-white/20 text-white`}>
                  <cfg.icon className="w-3.5 h-3.5" />
                  {cfg.label}
                </span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-white/20 text-white font-medium">
                  {status.label}
                </span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-white/20 text-white font-medium">
                  {priority.icon} {priority.label}
                </span>
                {isOverdue && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-red-400/40 text-red-100 font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Overdue
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Link to={`/tasks/${task.id}`}
                  className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors" title="Open full page">
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
                <button onClick={onEdit} className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors">
                  <Edit3 className="w-4 h-4" />
                </button>
                <button onClick={onClose} className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <h2 className="text-base font-bold text-white leading-snug mb-1">{task.title}</h2>
            <div className="flex items-center gap-2 text-white/70 text-xs flex-wrap">
              {task.project && <span>{task.project.name}</span>}
              {task.story && <><ChevronRight className="w-3 h-3" /><span>{task.story.name}</span></>}
            </div>

            {/* Quick status change */}
            <div className="flex items-center gap-1.5 mt-3 flex-wrap">
              {Object.entries(STATUS_CONFIG).map(([key, sc]) => (
                <button key={key} onClick={() => handleStatusChange(key)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                    task.status === key
                      ? 'bg-white text-gray-800 shadow-sm'
                      : 'bg-white/15 text-white hover:bg-white/25'
                  }`}>
                  {sc.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Quick stats strip ── */}
        <div className="grid grid-cols-4 border-b border-gray-100 flex-shrink-0 bg-white">
          {[
            { label: 'Subtasks',  value: `${completedSubtasks}/${totalSubtasks}`,          icon: CheckSquare,  color: 'text-indigo-500' },
            { label: 'Comments',  value: task.comments?.length ?? task.comments_count ?? 0, icon: MessageSquare,color: 'text-blue-500' },
            { label: 'Estimate',  value: estMin > 0 ? formatMinutes(estMin) : '—',          icon: Timer,        color: 'text-orange-500' },
            { label: 'Logged',    value: logMin > 0 ? formatMinutes(logMin) : '—',          icon: Clock,        color: 'text-green-500' },
          ].map((s) => (
            <div key={s.label} className="py-3 flex flex-col items-center gap-1 border-r border-gray-100 last:border-0">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <span className="text-base font-bold text-gray-900">{s.value}</span>
              <span className="text-[10px] text-gray-400 font-medium">{s.label}</span>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div className="flex border-b border-gray-100 bg-gray-50 flex-shrink-0 overflow-x-auto">
          {[
            { key: 'overview',  label: 'Overview' },
            { key: 'subtasks',  label: `Subtasks (${totalSubtasks})` },
            { key: 'time',      label: 'Time & Progress' },
            { key: 'comments',  label: `Comments (${task.comments?.length ?? task.comments_count ?? 0})` },
            { key: 'activity',  label: 'Activity' },
          ].map((tab) => (
            <button key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 whitespace-nowrap flex-shrink-0 ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600 bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-white">

          {/* OVERVIEW */}
          {activeTab === 'overview' && (
            <>
              {task.description && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Description</p>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{task.description}</p>
                </div>
              )}

              {task.acceptance_criteria && (
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-emerald-600" />
                    <p className="text-sm font-semibold text-emerald-700">Acceptance Criteria</p>
                  </div>
                  <p className="text-sm text-emerald-700 whitespace-pre-wrap leading-relaxed">{task.acceptance_criteria}</p>
                </div>
              )}

              {/* Labels */}
              {task.labels && task.labels.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Labels</p>
                  <div className="flex flex-wrap gap-1.5">
                    {task.labels.map((l) => (
                      <span key={l} className={`text-xs px-2.5 py-1 rounded-full font-medium ${getLabelColor(l)}`}>{l}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* People & Meta */}
              <div className="grid grid-cols-2 gap-3">
                {task.assignee && (
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-400 mb-1.5">Assignee</p>
                    <div className="flex items-center gap-2">
                      <Avatar user={task.assignee} size="sm" />
                      <span className="text-sm font-medium text-gray-800">{task.assignee.name}</span>
                    </div>
                  </div>
                )}
                {task.reporter && (
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-400 mb-1.5">Reporter</p>
                    <div className="flex items-center gap-2">
                      <Avatar user={task.reporter} size="sm" />
                      <span className="text-sm font-medium text-gray-800">{task.reporter.name}</span>
                    </div>
                  </div>
                )}
                {task.due_date && (
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-400 mb-1.5">Due Date</p>
                    <p className={`text-sm font-semibold ${isOverdue ? 'text-red-600' : 'text-gray-800'}`}>
                      {formatDate(task.due_date)}
                      {isOverdue && <span className="text-xs font-normal text-red-500 ml-1">(overdue)</span>}
                    </p>
                  </div>
                )}
                {(task.environment || task.version) && (
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-400 mb-1.5">Environment / Version</p>
                    <p className="text-sm font-medium text-gray-800">
                      {task.environment}{task.environment && task.version ? ' · ' : ''}{task.version}
                    </p>
                  </div>
                )}
              </div>

              {/* Timeline */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-400 mb-1">Started</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {task.started_at ? formatDate(task.started_at) : '—'}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-400 mb-1">Completed</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {task.completed_at ? formatDate(task.completed_at) : '—'}
                  </p>
                </div>
              </div>

              {task.started_at && task.completed_at && (
                <div className="p-3 bg-green-50 rounded-xl border border-green-100">
                  <p className="text-xs text-green-700 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Completed in {Math.ceil((new Date(task.completed_at).getTime() - new Date(task.started_at).getTime()) / 86400000)} days
                  </p>
                </div>
              )}

              {/* Attachments */}
              {task.attachments && task.attachments.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                    Attachments ({task.attachments.length})
                  </p>
                  <div className="space-y-2">
                    {task.attachments.map((att) => (
                      <div key={att.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <Paperclip className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{att.name}</p>
                          <p className="text-xs text-gray-400">{(att.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <a href={`/storage/${att.path}`} target="_blank" rel="noreferrer"
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors">
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* SUBTASKS */}
          {activeTab === 'subtasks' && (
            <div className="space-y-3">
              {/* Add subtask */}
              <form onSubmit={handleAddSubtask} className="flex gap-2">
                <input value={newSubtask} onChange={(e) => setNewSubtask(e.target.value)}
                  className="input flex-1" placeholder="Add a subtask…" />
                <button type="submit" disabled={savingSubtask || !newSubtask.trim()}
                  className="btn-primary px-4 disabled:opacity-60">
                  {savingSubtask ? '…' : <Plus className="w-4 h-4" />}
                </button>
              </form>

              {/* Progress */}
              {totalSubtasks > 0 && (
                <div className="p-3 bg-gray-50 rounded-xl">
                  <div className="flex justify-between text-xs mb-1.5 text-gray-600">
                    <span>Progress</span>
                    <span className="font-semibold">{completedSubtasks}/{totalSubtasks}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="h-2 rounded-full bg-blue-500 transition-all"
                      style={{ width: `${totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0}%` }} />
                  </div>
                </div>
              )}

              {/* Subtask list */}
              {(task.sub_tasks ?? []).length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No subtasks yet. Add one above.</p>
              ) : (task.sub_tasks ?? []).map((st) => (
                <div key={st.id}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border transition-colors ${
                    st.status === 'done' ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'
                  }`}>
                  <button onClick={() => handleToggleSubtask(st.id, st.status)} className="flex-shrink-0">
                    {st.status === 'done'
                      ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                      : <Circle className="w-5 h-5 text-gray-300 hover:text-blue-400 transition-colors" />}
                  </button>
                  <span className={`flex-1 text-sm ${st.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800 font-medium'}`}>
                    {st.title}
                  </span>
                  {st.assignee && <Avatar user={st.assignee} size="xs" />}
                </div>
              ))}
            </div>
          )}

          {/* TIME & PROGRESS */}
          {activeTab === 'time' && (
            <div className="space-y-4">
              {/* Completion tracker */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-500" /> Completion
                  </p>
                  <button onClick={() => setShowCompletionForm((v) => !v)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                    {showCompletionForm ? 'Cancel' : 'Update'}
                  </button>
                </div>

                <div className="flex items-center gap-4 mb-3">
                  <div className="relative flex-shrink-0">
                    <ProgressRing pct={pct} size={64} stroke={5} />
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-800">{pct}%</span>
                  </div>
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                      <div className="h-2.5 rounded-full bg-blue-500 transition-all"
                        style={{ width: `${pct}%` }} />
                    </div>
                    {task.completion_note && (
                      <p className="text-xs text-gray-500 italic">"{task.completion_note}"</p>
                    )}
                  </div>
                </div>

                {/* Quick buttons */}
                <div className="flex gap-2">
                  {[0, 25, 50, 75, 100].map((v) => (
                    <button key={v} onClick={() => handleQuickComplete(v)}
                      className={`flex-1 py-1.5 text-xs rounded-lg font-semibold transition-colors ${
                        pct === v ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                      }`}>
                      {v}%
                    </button>
                  ))}
                </div>

                {showCompletionForm && (
                  <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                    <input type="range" min="0" max="100" step="5"
                      value={completionVal}
                      onChange={(e) => setCompletionVal(Number(e.target.value))}
                      className="w-full accent-blue-600" />
                    <div className="flex gap-2">
                      <button onClick={handleUpdateCompletion}
                        className="btn-primary flex-1 text-sm">Save {completionVal}%</button>
                      <button onClick={() => setShowCompletionForm(false)}
                        className="btn-secondary flex-1 text-sm">Cancel</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Time stats */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <Timer className="w-4 h-4 text-orange-500" /> Time Tracking
                  </p>
                  <button onClick={() => setShowTimeForm((v) => !v)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Log Time
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-3">
                  {[
                    { label: 'Estimated', value: formatMinutes(estMin), color: 'text-blue-700', bg: 'bg-blue-50' },
                    { label: 'Logged',    value: formatMinutes(logMin), color: logMin > estMin && estMin > 0 ? 'text-red-700' : 'text-green-700', bg: logMin > estMin && estMin > 0 ? 'bg-red-50' : 'bg-green-50' },
                    { label: estMin > 0 && logMin > estMin ? 'Over' : 'Remaining', value: estMin > 0 ? formatMinutes(Math.abs(estMin - logMin)) : '—', color: logMin > estMin ? 'text-red-700' : 'text-gray-700', bg: 'bg-gray-100' },
                  ].map((s) => (
                    <div key={s.label} className={`text-center p-3 rounded-xl ${s.bg}`}>
                      <p className={`text-base font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>

                {estMin > 0 && (
                  <div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (logMin / estMin) * 100)}%`,
                          background: logMin > estMin ? '#ef4444' : '#3b82f6',
                        }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1 text-right">
                      {Math.min(100, Math.round((logMin / estMin) * 100))}% of estimate used
                    </p>
                  </div>
                )}

                {/* Log time form */}
                {showTimeForm && (
                  <form onSubmit={handleLogTime} className="mt-3 pt-3 border-t border-gray-200 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-500 font-medium mb-1 block">Hours</label>
                        <input type="number" min="0" value={timeForm.hours}
                          onChange={(e) => setTimeForm((p) => ({ ...p, hours: Number(e.target.value) }))}
                          className="input" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 font-medium mb-1 block">Minutes</label>
                        <input type="number" min="0" max="59" value={timeForm.minutes}
                          onChange={(e) => setTimeForm((p) => ({ ...p, minutes: Number(e.target.value) }))}
                          className="input" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 font-medium mb-1 block">Date</label>
                      <input type="date" value={timeForm.logged_date}
                        onChange={(e) => setTimeForm((p) => ({ ...p, logged_date: e.target.value }))}
                        className="input" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 font-medium mb-1 block">Description</label>
                      <input type="text" value={timeForm.description}
                        onChange={(e) => setTimeForm((p) => ({ ...p, description: e.target.value }))}
                        className="input" placeholder="What did you work on?" />
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" disabled={savingTime}
                        className="btn-primary flex-1 text-sm disabled:opacity-60">
                        {savingTime ? 'Logging…' : 'Log Time'}
                      </button>
                      <button type="button" onClick={() => setShowTimeForm(false)}
                        className="btn-secondary flex-1 text-sm">Cancel</button>
                    </div>
                  </form>
                )}
              </div>

              {/* Time log history */}
              {(task.time_logs ?? []).length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
                    Time Log History ({task.time_logs?.length})
                  </p>
                  <div className="space-y-2">
                    {(task.time_logs ?? []).map((log) => (
                      <div key={log.id}
                        className="flex items-start gap-3 p-3.5 bg-gray-50 rounded-xl border border-gray-100 group">
                        {log.user && <Avatar user={log.user} size="xs" />}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-blue-600">
                              {formatTime(log.hours, log.minutes)}
                            </span>
                            <span className="text-xs text-gray-400">{log.user?.name}</span>
                          </div>
                          {log.description && (
                            <p className="text-xs text-gray-600 mt-0.5">{log.description}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-0.5">
                            {log.logged_date ? formatDate(log.logged_date) : timeAgo(log.created_at)}
                          </p>
                        </div>
                        <button onClick={() => handleDeleteTimeLog(log.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* COMMENTS */}
          {activeTab === 'comments' && (
            <div className="space-y-4">
              <form onSubmit={handleAddComment} className="space-y-2">
                <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)}
                  className="input w-full" rows={3} placeholder="Write a comment…" />
                <button type="submit" disabled={savingComment || !newComment.trim()}
                  className="btn-primary text-sm disabled:opacity-60">
                  {savingComment ? 'Posting…' : 'Post Comment'}
                </button>
              </form>

              {(task.comments ?? []).length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No comments yet</p>
                </div>
              ) : (task.comments ?? []).map((c) => (
                <div key={c.id} className="flex gap-3 group">
                  {c.user && <Avatar user={c.user} size="sm" />}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-800">{c.user?.name}</span>
                      <span className="text-xs text-gray-400">{timeAgo(c.created_at)}</span>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{c.body}</p>
                    </div>
                  </div>
                  <button onClick={() => handleDeleteComment(c.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 opacity-0 group-hover:opacity-100 transition-all self-start flex-shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ACTIVITY */}
          {activeTab === 'activity' && (
            <div className="space-y-2">
              {(task.activity_logs ?? []).length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No activity yet</p>
                </div>
              ) : (task.activity_logs ?? []).map((log) => {
                const actionColor =
                  log.action === 'created' ? 'bg-green-100 text-green-700' :
                  log.action === 'updated' ? 'bg-blue-100 text-blue-700' :
                  'bg-red-100 text-red-700';
                return (
                  <div key={log.id} className="flex gap-3 items-start">
                    <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                      {log.user?.name?.charAt(0) ?? '?'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${actionColor}`}>{log.action}</span>
                        <span className="text-xs text-gray-500">{log.description}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{timeAgo(log.created_at)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Drawer footer */}
        <div className="p-4 border-t border-gray-100 flex gap-3 bg-gray-50 flex-shrink-0">
          <Link to={`/tasks/${task.id}`}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-white transition-colors">
            <ArrowUpRight className="w-4 h-4" /> Full View
          </Link>
          <button onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-sm font-medium text-white transition-colors">
            <Edit3 className="w-4 h-4" /> Edit Task
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Create / Edit Task Modal ─────────────────────────────────────────────────

function TaskFormModal({ isOpen, onClose, editTask, projects, users, stories, onSaved }: {
  isOpen: boolean;
  onClose: () => void;
  editTask: TaskFull | null;
  projects: Project[];
  users: User[];
  stories: UserStory[];
  onSaved: (task: TaskFull) => void;
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [projectStories, setProjectStories] = useState<UserStory[]>([]);
  const [labelInput, setLabelInput] = useState('');

  useEffect(() => {
    if (editTask) {
      setForm({
        project_id:            String(editTask.project_id),
        story_id:              editTask.story_id ? String(editTask.story_id) : '',
        parent_id:             editTask.parent_id ? String(editTask.parent_id) : '',
        title:                 editTask.title,
        description:           editTask.description ?? '',
        status:                editTask.status,
        priority:              editTask.priority,
        type:                  editTask.type,
        due_date:              editTask.due_date ?? '',
        assigned_to:           editTask.assigned_to ? String(editTask.assigned_to) : '',
        reporter_id:           editTask.reporter_id ? String(editTask.reporter_id) : '',
        estimate_hours:        String(editTask.estimate_hours ?? 0),
        estimate_minutes:      String(editTask.estimate_minutes ?? 0),
        completion_percentage: String(editTask.completion_percentage ?? 0),
        completion_note:       editTask.completion_note ?? '',
        labels:                editTask.labels ?? [],
        label_input:           '',
        environment:           editTask.environment ?? '',
        version:               editTask.version ?? '',
        acceptance_criteria:   editTask.acceptance_criteria ?? '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setLabelInput('');
  }, [editTask, isOpen]);

  useEffect(() => {
    if (form.project_id) {
      api.get('/user-stories', { params: { project_id: form.project_id } })
        .then((r) => setProjectStories(r.data.data ?? r.data))
        .catch(() => setProjectStories([]));
    } else {
      setProjectStories([]);
    }
  }, [form.project_id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const addLabel = () => {
    const l = labelInput.trim();
    if (l && !form.labels.includes(l)) {
      setForm((p) => ({ ...p, labels: [...p.labels, l] }));
    }
    setLabelInput('');
  };

  const removeLabel = (label: string) => {
    setForm((p) => ({ ...p, labels: p.labels.filter((l) => l !== label) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.project_id) { toast.error('Select a project'); return; }
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    setSaving(true);
    try {
      const payload = {
        project_id:            Number(form.project_id),
        story_id:              form.story_id  ? Number(form.story_id)  : null,
        parent_id:             form.parent_id ? Number(form.parent_id) : null,
        title:                 form.title.trim(),
        description:           form.description || null,
        status:                form.status,
        priority:              form.priority,
        type:                  form.type,
        due_date:              form.due_date || null,
        assigned_to:           form.assigned_to  ? Number(form.assigned_to)  : null,
        reporter_id:           form.reporter_id  ? Number(form.reporter_id)  : null,
        estimate_hours:        Number(form.estimate_hours),
        estimate_minutes:      Number(form.estimate_minutes),
        completion_percentage: Number(form.completion_percentage),
        completion_note:       form.completion_note || null,
        labels:                form.labels,
        environment:           form.environment || null,
        version:               form.version || null,
        acceptance_criteria:   form.acceptance_criteria || null,
      };

      let res;
      if (editTask) {
        res = await api.put(`/tasks/${editTask.id}`, payload);
        toast.success('Task updated!');
      } else {
        res = await api.post('/tasks', payload);
        toast.success('Task created!');
      }
      onSaved(res.data);
      onClose();
    } catch {
      toast.error('Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}
      title={editTask ? 'Edit Task' : 'Create New Task'}
      size="lg">
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[78vh] overflow-y-auto pr-1">

        {/* Title */}
        <div>
          <label className="label">Title *</label>
          <input name="title" value={form.title} onChange={handleChange}
            className="input" placeholder="What needs to be done?" required autoFocus />
        </div>

        {/* Project + Story */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Project *</label>
            <select name="project_id" value={form.project_id}
              onChange={(e) => { setForm((p) => ({ ...p, project_id: e.target.value, story_id: '' })); }}
              className="input" required>
              <option value="">Select project…</option>
              {projects.map((p) => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">User Story</label>
            <select name="story_id" value={form.story_id} onChange={handleChange} className="input">
              <option value="">No Story</option>
              {projectStories.map((s) => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
            </select>
          </div>
        </div>

        {/* Type + Status */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Type</label>
            <select name="type" value={form.type} onChange={handleChange} className="input">
              {TASK_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select name="status" value={form.status} onChange={handleChange} className="input">
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>

        {/* Priority + Due Date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Priority</label>
            <select name="priority" value={form.priority} onChange={handleChange} className="input">
              {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Due Date</label>
            <input type="date" name="due_date" value={form.due_date} onChange={handleChange} className="input" />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="label">Description</label>
          <textarea name="description" value={form.description} onChange={handleChange}
            className="input" rows={3} placeholder="Describe the task in detail…" />
        </div>

        {/* Acceptance Criteria */}
        <div>
          <label className="label flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-500" /> Acceptance Criteria
          </label>
          <textarea name="acceptance_criteria" value={form.acceptance_criteria} onChange={handleChange}
            className="input font-mono text-xs" rows={3}
            placeholder="• Given … When … Then …" />
        </div>

        {/* Assignee + Reporter */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Assignee</label>
            <select name="assigned_to" value={form.assigned_to} onChange={handleChange} className="input">
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

        {/* Estimation */}
        <div>
          <label className="label flex items-center gap-1.5">
            <Timer className="w-3.5 h-3.5 text-orange-500" /> Estimation
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
            <p className="text-xs text-blue-600 mt-1 font-medium">
              Total: {formatTime(Number(form.estimate_hours), Number(form.estimate_minutes))}
            </p>
          )}
        </div>

        {/* Completion */}
        <div>
          <label className="label">Completion: {form.completion_percentage}%</label>
          <input type="range" min="0" max="100" step="5"
            value={form.completion_percentage}
            onChange={(e) => setForm((p) => ({ ...p, completion_percentage: e.target.value }))}
            className="w-full accent-blue-600" />
          <div className="flex gap-2 mt-2">
            {[0, 25, 50, 75, 100].map((v) => (
              <button key={v} type="button"
                onClick={() => setForm((p) => ({ ...p, completion_percentage: String(v) }))}
                className={`flex-1 py-1 text-xs rounded-lg font-semibold transition-colors ${
                  Number(form.completion_percentage) === v
                    ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>{v}%</button>
            ))}
          </div>
        </div>

        {/* Labels */}
        <div>
          <label className="label flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-indigo-500" /> Labels
          </label>
          <div className="flex gap-2">
            <input value={labelInput} onChange={(e) => setLabelInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLabel(); } }}
              className="input flex-1" placeholder="Add label and press Enter…" />
            <button type="button" onClick={addLabel} className="btn-secondary px-3">Add</button>
          </div>
          {form.labels.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {form.labels.map((l) => (
                <span key={l} className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${getLabelColor(l)}`}>
                  {l}
                  <button type="button" onClick={() => removeLabel(l)} className="hover:opacity-70">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Environment + Version */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Environment</label>
            <input name="environment" value={form.environment} onChange={handleChange}
              className="input" placeholder="Production, Staging…" />
          </div>
          <div>
            <label className="label">Version</label>
            <input name="version" value={form.version} onChange={handleChange}
              className="input" placeholder="v1.0.0, v2.3…" />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-2 sticky bottom-0 bg-white pb-1">
          <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-60">
            {saving ? 'Saving…' : editTask ? 'Update Task' : 'Create Task'}
          </button>
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Bulk Action Bar ──────────────────────────────────────────────────────────

function BulkActionBar({ selectedIds, users, onAction, onClear }: {
  selectedIds: number[];
  users: User[];
  onAction: (action: string, value: string) => void;
  onClear: () => void;
}) {
  const [assignTo, setAssignTo] = useState('');
  const [statusTo, setStatusTo] = useState('');

  if (selectedIds.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-gray-900 text-white rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-4">
      <span className="text-sm font-semibold text-blue-300">{selectedIds.length} selected</span>
      <div className="w-px h-5 bg-gray-600" />

      <select value={statusTo} onChange={(e) => setStatusTo(e.target.value)}
        className="bg-gray-800 text-white text-xs rounded-lg px-2.5 py-1.5 border border-gray-600">
        <option value="">Set status…</option>
        {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
      </select>
      {statusTo && (
        <button onClick={() => { onAction('status', statusTo); setStatusTo(''); }}
          className="text-xs bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-lg font-medium transition-colors">
          Apply
        </button>
      )}

      <select value={assignTo} onChange={(e) => setAssignTo(e.target.value)}
        className="bg-gray-800 text-white text-xs rounded-lg px-2.5 py-1.5 border border-gray-600">
        <option value="">Assign to…</option>
        {users.map((u) => <option key={u.id} value={String(u.id)}>{u.name}</option>)}
      </select>
      {assignTo && (
        <button onClick={() => { onAction('assign', assignTo); setAssignTo(''); }}
          className="text-xs bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-lg font-medium transition-colors">
          Assign
        </button>
      )}

      <div className="w-px h-5 bg-gray-600" />

      <button onClick={() => onAction('delete', '')}
        className="text-xs bg-red-600 hover:bg-red-500 px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1">
        <Trash2 className="w-3.5 h-3.5" /> Delete
      </button>
      <button onClick={onClear}
        className="text-xs text-gray-400 hover:text-white transition-colors ml-1">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Main Tasks Page ──────────────────────────────────────────────────────────

export default function Tasks() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [tasks, setTasks]         = useState<TaskFull[]>([]);
  const [projects, setProjects]   = useState<Project[]>([]);
  const [users, setUsers]         = useState<User[]>([]);
  const [stories, setStories]     = useState<UserStory[]>([]);
  const [stats, setStats]         = useState<TaskStats | null>(null);
  const [loading, setLoading]     = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Filters
  const [search, setSearch]               = useState('');
  const [filterProject, setFilterProject] = useState(searchParams.get('project_id') ?? '');
  const [filterStatus, setFilterStatus]   = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterType, setFilterType]       = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterOverdue, setFilterOverdue] = useState(false);
  const [sortBy, setSortBy]               = useState('created_at');
  const [sortDir, setSortDir]             = useState('desc');
  const [viewMode, setViewMode]           = useState<'grid' | 'list' | 'kanban'>('list');
  const [activeTab, setActiveTab]         = useState<'all' | 'mine' | 'overdue' | 'unassigned'>('all');

  // Selection
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Modals / drawers
  const [isModalOpen, setIsModalOpen]     = useState(false);
  const [editTask, setEditTask]           = useState<TaskFull | null>(null);
  const [detailTaskId, setDetailTaskId]   = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget]   = useState<TaskFull | null>(null);
  const [showStats, setShowStats]         = useState(false);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        page:     currentPage,
        per_page: 50,
        sort_by:  sortBy,
        sort_dir: sortDir,
      };
      if (filterProject)  params.project_id  = filterProject;
      if (filterStatus)   params.status      = filterStatus;
      if (filterPriority) params.priority    = filterPriority;
      if (filterType)     params.type        = filterType;
      if (filterAssignee) params.assigned_to = filterAssignee;
      if (filterOverdue)  params.overdue     = 'true';
      if (search)         params.search      = search;
      if (activeTab === 'unassigned') params.has_no_assignee = 'true';

      const res = await api.get('/tasks', { params });
      const data = res.data;

      // Paginated response
      if (data.data && data.total !== undefined) {
        setTasks(data.data);
        setTotalPages(data.last_page ?? 1);
        setTotalItems(data.total ?? 0);
      } else {
        setTasks(Array.isArray(data) ? data : []);
      }
    } catch { toast.error('Failed to load tasks'); }
    finally { setLoading(false); }
  }, [filterProject, filterStatus, filterPriority, filterType, filterAssignee, filterOverdue, search, sortBy, sortDir, currentPage, activeTab]);

  const fetchStats = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (filterProject) params.project_id = filterProject;
      const res = await api.get('/tasks/stats', { params });
      setStats(res.data);
    } catch {}
  }, [filterProject]);

  useEffect(() => { fetchTasks(); }, [
    filterProject, filterStatus, filterPriority, filterType,
    filterAssignee, filterOverdue, sortBy, sortDir, currentPage, activeTab
  ]);

  useEffect(() => { fetchStats(); }, [filterProject]);

  useEffect(() => {
    api.get('/projects').then((r) => setProjects(r.data.data ?? r.data));
    api.get('/users').then((r) => setUsers(r.data));
    api.get('/user-stories').then((r) => setStories(r.data.data ?? r.data)).catch(() => {});
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchTasks();
  };

  const handleSort = (field: string) => {
    if (sortBy === field) { setSortDir((d) => d === 'asc' ? 'desc' : 'asc'); }
    else { setSortBy(field); setSortDir('asc'); }
  };

  const handleSaved = (task: TaskFull) => {
    if (editTask) {
      setTasks((prev) => prev.map((t) => t.id === task.id ? task : t));
    } else {
      setTasks((prev) => [task, ...prev]);
    }
    setEditTask(null);
    fetchStats();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/tasks/${deleteTarget.id}`);
      setTasks((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      toast.success('Task deleted');
      setDeleteTarget(null);
      fetchStats();
    } catch { toast.error('Failed to delete'); }
  };

  const handleDuplicate = async (task: TaskFull) => {
    try {
      const res = await api.post(`/tasks/${task.id}/duplicate`);
      setTasks((prev) => [res.data, ...prev]);
      toast.success('Task duplicated!');
    } catch { toast.error('Failed to duplicate'); }
  };

  const handleBulkAction = async (action: string, value: string) => {
    if (!selectedIds.length) return;
    if (action === 'delete' && !confirm(`Delete ${selectedIds.length} tasks?`)) return;
    try {
      await api.post('/tasks/bulk-update', { task_ids: selectedIds, action, value });
      toast.success(`${action} applied to ${selectedIds.length} tasks`);
      setSelectedIds([]);
      fetchTasks();
      fetchStats();
    } catch { toast.error('Bulk action failed'); }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedIds(tasks.map((t) => t.id));
  };
  const clearSelection = () => setSelectedIds([]);

  const hasFilters = filterProject || filterStatus || filterPriority || filterType || filterAssignee || filterOverdue;
  const clearFilters = () => {
    setFilterProject(''); setFilterStatus(''); setFilterPriority('');
    setFilterType(''); setFilterAssignee(''); setFilterOverdue(false);
    setCurrentPage(1);
  };

  // Stats for tabs
  const overdueCount    = stats?.overdue_count ?? tasks.filter((t) => t.due_date && new Date(t.due_date) < new Date() && !['done','closed'].includes(t.status)).length;
  const unassignedCount = tasks.filter((t) => !t.assigned_to).length;

  const SortIcon = ({ field }: { field: string }) => (
    sortBy === field
      ? sortDir === 'asc'
        ? <SortAsc className="w-3 h-3 text-blue-500" />
        : <SortDesc className="w-3 h-3 text-blue-500" />
      : <SortAsc className="w-3 h-3 text-gray-300" />
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Tasks" />
      <div className="p-6 max-w-7xl mx-auto">

        {/* ── Stats Cards ── */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-5">
            {[
              { label: 'Total',      value: stats.total,                              color: 'text-gray-700',   bg: 'bg-white' },
              { label: 'Backlog',    value: stats.by_status?.backlog ?? 0,            color: 'text-gray-600',   bg: 'bg-gray-50' },
              { label: 'In Progress',value: stats.by_status?.in_progress ?? 0,       color: 'text-blue-700',   bg: 'bg-blue-50' },
              { label: 'Done',       value: (stats.by_status?.done ?? 0) + (stats.by_status?.closed ?? 0), color: 'text-green-700', bg: 'bg-green-50' },
              { label: 'Overdue',    value: stats.overdue_count,                      color: 'text-red-700',    bg: 'bg-red-50' },
              { label: 'This Week',  value: stats.completed_this_week,                color: 'text-teal-700',   bg: 'bg-teal-50' },
              { label: 'Estimate',   value: formatMinutes(stats.total_estimate_min),  color: 'text-orange-700', bg: 'bg-orange-50' },
              { label: 'Avg %',      value: `${stats.avg_completion}%`,              color: 'text-indigo-700', bg: 'bg-indigo-50' },
            ].map((s) => (
              <div key={s.label} className={`${s.bg} rounded-2xl border border-gray-100 shadow-sm p-3.5 text-center`}>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[11px] text-gray-500 font-medium mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Toolbar ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <form onSubmit={handleSearch} className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search tasks…"
                value={search} onChange={(e) => setSearch(e.target.value)}
                className="input pl-9 w-full" />
            </form>

            <select value={filterProject} onChange={(e) => { setFilterProject(e.target.value); setCurrentPage(1); }} className="input w-40">
              <option value="">All Projects</option>
              {projects.map((p) => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
            </select>

            <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }} className="input w-36">
              <option value="">All Statuses</option>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>

            <select value={filterPriority} onChange={(e) => { setFilterPriority(e.target.value); setCurrentPage(1); }} className="input w-32">
              <option value="">All Priorities</option>
              {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>

            <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }} className="input w-36">
              <option value="">All Types</option>
              {TASK_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>

            <select value={filterAssignee} onChange={(e) => { setFilterAssignee(e.target.value); setCurrentPage(1); }} className="input w-36">
              <option value="">All Assignees</option>
              {users.map((u) => <option key={u.id} value={String(u.id)}>{u.name}</option>)}
            </select>

            <button onClick={() => { setFilterOverdue((v) => !v); setCurrentPage(1); }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                filterOverdue ? 'bg-red-50 border-red-200 text-red-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}>
              <AlertTriangle className="w-3.5 h-3.5" /> Overdue
            </button>

            {hasFilters && (
              <button onClick={clearFilters}
                className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            )}

            {/* View toggle */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 ml-auto">
              {[
                { key: 'list',   icon: List },
                { key: 'grid',   icon: Grid3X3 },
                { key: 'kanban', icon: Columns },
              ].map(({ key, icon: Icon }) => (
                <button key={key} onClick={() => setViewMode(key as typeof viewMode)}
                  className={`p-2 rounded-lg transition-colors ${viewMode === key ? 'bg-white shadow text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}>
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>

            <button onClick={() => { setShowStats((v) => !v); }}
              className={`p-2 rounded-xl transition-colors ${showStats ? 'bg-blue-50 text-blue-600' : 'border border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
              <BarChart3 className="w-4 h-4" />
            </button>

            <button onClick={() => { setEditTask(null); setIsModalOpen(true); }}
              className="btn-primary flex items-center gap-2 whitespace-nowrap">
              <Plus className="w-4 h-4" /> New Task
            </button>
          </div>

          {/* Tab bar */}
          <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-50">
            {[
              { key: 'all',        label: `All (${totalItems || tasks.length})` },
              { key: 'in_progress',label: `Active (${stats?.by_status?.in_progress ?? 0})` },
              { key: 'overdue',    label: `Overdue (${overdueCount})`, danger: true },
              { key: 'unassigned', label: `Unassigned (${unassignedCount})` },
            ].map((tab) => (
              <button key={tab.key}
                onClick={() => {
                  if (tab.key === 'overdue') { setFilterOverdue(true); setActiveTab('overdue'); }
                  else if (tab.key === 'in_progress') { setFilterStatus('in_progress'); setActiveTab('all'); }
                  else if (tab.key === 'unassigned') { setActiveTab('unassigned'); }
                  else { setFilterStatus(''); setFilterOverdue(false); setActiveTab('all'); }
                  setCurrentPage(1);
                }}
                className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-all ${
                  (tab.key === 'overdue' && filterOverdue) ||
                  (tab.key === 'in_progress' && filterStatus === 'in_progress') ||
                  (tab.key === 'unassigned' && activeTab === 'unassigned') ||
                  (tab.key === 'all' && !filterOverdue && filterStatus !== 'in_progress' && activeTab !== 'unassigned')
                    ? tab.danger ? 'bg-red-600 text-white' : 'bg-blue-600 text-white shadow-sm'
                    : tab.danger ? 'text-red-500 hover:bg-red-50' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                }`}>
                {tab.label}
              </button>
            ))}

            {/* Select all / refresh */}
            <div className="flex items-center gap-2 ml-auto">
              {tasks.length > 0 && (
                <button onClick={selectedIds.length === tasks.length ? clearSelection : selectAll}
                  className="text-xs text-gray-500 hover:text-gray-700 font-medium">
                  {selectedIds.length === tasks.length ? 'Deselect all' : 'Select all'}
                </button>
              )}
              <button onClick={fetchTasks}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Stats Panel ── */}
        {showStats && stats && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Status distribution */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">By Status</p>
                <div className="space-y-2">
                  {Object.entries(stats.by_status).map(([st, count]) => {
                    const pct = stats.total === 0 ? 0 : Math.round((count / stats.total) * 100);
                    const colors: Record<string, string> = {
                      backlog: '#94a3b8', todo: '#64748b', in_progress: '#3b82f6',
                      in_review: '#8b5cf6', done: '#22c55e', closed: '#6b7280',
                    };
                    return (
                      <div key={st}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="capitalize text-gray-600">{st.replace('_', ' ')}</span>
                          <span className="text-gray-400">{count}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full transition-all"
                            style={{ width: `${pct}%`, background: colors[st] ?? '#94a3b8' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Priority distribution */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">By Priority</p>
                <div className="space-y-2">
                  {Object.entries(stats.by_priority).map(([pr, count]) => {
                    const pct = stats.total === 0 ? 0 : Math.round((count / stats.total) * 100);
                    const colors: Record<string, string> = {
                      low: '#4ade80', medium: '#fbbf24', high: '#f97316', critical: '#ef4444',
                    };
                    return (
                      <div key={pr}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="capitalize text-gray-600">{pr}</span>
                          <span className="text-gray-400">{count}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full transition-all"
                            style={{ width: `${pct}%`, background: colors[pr] ?? '#94a3b8' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top assignees */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Top Assignees</p>
                <div className="space-y-2.5">
                  {stats.top_assignees.map((a) => (
                    <div key={a.user.id} className="flex items-center gap-2.5">
                      <Avatar user={a.user} size="xs" />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium text-gray-700 truncate">{a.user.name}</span>
                          <span className="text-gray-400">{a.done}/{a.total}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full bg-blue-500 transition-all"
                            style={{ width: `${a.total === 0 ? 0 : Math.round((a.done / a.total) * 100)}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Content ── */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl border border-gray-100">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckSquare className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-500 font-semibold text-lg">No tasks found</p>
            <p className="text-gray-400 text-sm mt-1">
              {search || hasFilters ? 'Try adjusting your filters' : 'Create your first task to get started'}
            </p>
            {!search && !hasFilters && (
              <button onClick={() => { setEditTask(null); setIsModalOpen(true); }} className="btn-primary mt-4">
                Create Task
              </button>
            )}
          </div>

        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task}
                selected={selectedIds.includes(task.id)}
                onSelect={() => toggleSelect(task.id)}
                onEdit={() => { setEditTask(task); setIsModalOpen(true); }}
                onDelete={() => setDeleteTarget(task)}
                onDuplicate={() => handleDuplicate(task)}
                onView={() => setDetailTaskId(task.id)}
              />
            ))}
          </div>

        ) : viewMode === 'list' ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-3 py-3 w-10">
                    <input type="checkbox"
                      checked={selectedIds.length === tasks.length && tasks.length > 0}
                      onChange={selectedIds.length === tasks.length ? clearSelection : selectAll}
                      className="w-4 h-4 rounded accent-blue-600" />
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer" onClick={() => handleSort('title')}>
                    <span className="flex items-center gap-1">Title <SortIcon field="title" /></span>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer" onClick={() => handleSort('priority')}>
                    <span className="flex items-center gap-1">Priority <SortIcon field="priority" /></span>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer" onClick={() => handleSort('completion_percentage')}>
                    <span className="flex items-center gap-1">Progress <SortIcon field="completion_percentage" /></span>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Time</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Assignee</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer" onClick={() => handleSort('due_date')}>
                    <span className="flex items-center gap-1">Due <SortIcon field="due_date" /></span>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Meta</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <TaskRow key={task.id} task={task}
                    selected={selectedIds.includes(task.id)}
                    onSelect={() => toggleSelect(task.id)}
                    onEdit={() => { setEditTask(task); setIsModalOpen(true); }}
                    onDelete={() => setDeleteTarget(task)}
                    onDuplicate={() => handleDuplicate(task)}
                    onView={() => setDetailTaskId(task.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>

        ) : (
          /* Kanban view - redirect to KanbanBoard component */
          <div className="text-center py-10 bg-white rounded-2xl border border-gray-100">
            <Columns className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Kanban view</p>
            <Link to="/kanban" className="btn-primary mt-3 inline-block">Open Kanban Board</Link>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-5">
            <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              const page = currentPage <= 4 ? i + 1
                : currentPage >= totalPages - 3 ? totalPages - 6 + i
                : currentPage - 3 + i;
              if (page < 1 || page > totalPages) return null;
              return (
                <button key={page} onClick={() => setCurrentPage(page)}
                  className={`w-9 h-9 rounded-xl text-sm font-medium transition-colors ${
                    page === currentPage ? 'bg-blue-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}>{page}</button>
              );
            })}
            <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-400 ml-2">
              {totalItems > 0 ? `${totalItems} total tasks` : `${tasks.length} tasks`}
            </span>
          </div>
        )}
      </div>

      {/* ── Detail Drawer ── */}
      {detailTaskId && (
        <TaskDetailDrawer
          taskId={detailTaskId}
          onClose={() => setDetailTaskId(null)}
          onEdit={() => {
            const t = tasks.find((x) => x.id === detailTaskId);
            if (t) { setEditTask(t); setIsModalOpen(true); setDetailTaskId(null); }
          }}
          onRefresh={fetchTasks}
        />
      )}

      {/* ── Create / Edit Modal ── */}
      <TaskFormModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditTask(null); }}
        editTask={editTask}
        projects={projects}
        users={users}
        stories={stories}
        onSaved={handleSaved}
      />

      {/* ── Delete Confirm ── */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Task" size="sm">
        <div className="space-y-4">
          <div className="p-4 bg-red-50 rounded-xl border border-red-100 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">
              Delete <span className="font-bold">"{deleteTarget?.title}"</span>? This will also delete all
              subtasks, comments, attachments, and time logs. This cannot be undone.
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={handleDelete} className="btn-danger flex-1">Yes, Delete</button>
            <button onClick={() => setDeleteTarget(null)} className="btn-secondary flex-1">Cancel</button>
          </div>
        </div>
      </Modal>

      {/* ── Bulk Action Bar ── */}
      <BulkActionBar
        selectedIds={selectedIds}
        users={users}
        onAction={handleBulkAction}
        onClear={clearSelection}
      />
    </div>
  );
}