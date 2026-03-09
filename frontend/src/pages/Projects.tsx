import { useEffect, useState, useCallback } from 'react';
import {
  Plus, Search, Grid3X3, List, Filter, MoreVertical,
  Calendar, Users, CheckSquare, TrendingUp, Star,
  Archive, Trash2, Edit3, Eye, X, ChevronDown,
  FolderKanban, Clock, AlertCircle, CheckCircle2,
  ArrowUpRight, BarChart2, Layers, Zap
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/useAppDispatch';
import {
  fetchProjects,
  createProject,
  updateProject,
  deleteProject,
} from '../store/slices/projectSlice';
import Header from '../components/layout/Header';
import Modal from '../components/ui/Modal';
import api from '../services/api';
import toast from 'react-hot-toast';
import type { Project, User } from '../types';

// ─── Types ───────────────────────────────────────────────────────────────────
type ViewMode = 'grid' | 'list';
type SortBy = 'name' | 'created_at' | 'status' | 'priority';
type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';

interface ProjectStats {
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  overdue_tasks: number;
  members_count: number;
}

interface ProjectWithStats extends Project {
  stats?: ProjectStats;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const STATUS_OPTIONS: { value: string; label: string; color: string; bg: string }[] = [
  { value: 'planning',  label: 'Planning',   color: 'text-purple-700', bg: 'bg-purple-100' },
  { value: 'active',    label: 'Active',     color: 'text-emerald-700', bg: 'bg-emerald-100' },
  { value: 'on_hold',   label: 'On Hold',    color: 'text-amber-700',  bg: 'bg-amber-100' },
  { value: 'completed', label: 'Completed',  color: 'text-blue-700',   bg: 'bg-blue-100' },
  { value: 'cancelled', label: 'Cancelled',  color: 'text-red-700',    bg: 'bg-red-100' },
];

const PRIORITY_OPTIONS: { value: string; label: string; color: string; dot: string }[] = [
  { value: 'low',      label: 'Low',      color: 'text-gray-600',  dot: 'bg-gray-400' },
  { value: 'medium',   label: 'Medium',   color: 'text-blue-600',  dot: 'bg-blue-400' },
  { value: 'high',     label: 'High',     color: 'text-orange-600',dot: 'bg-orange-400' },
  { value: 'critical', label: 'Critical', color: 'text-red-600',   dot: 'bg-red-500' },
];

const EMPTY_FORM = {
  name: '',
  key: '',
  description: '',
  status: 'active',
  priority: 'medium',
  start_date: '',
  end_date: '',
  owner_id: '',
};

// ─── Helper components ────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const opt = STATUS_OPTIONS.find((s) => s.value === status);
  if (!opt) return null;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${opt.bg} ${opt.color}`}>
      {opt.label}
    </span>
  );
}

function PriorityDot({ priority }: { priority: string }) {
  const opt = PRIORITY_OPTIONS.find((p) => p.value === priority);
  if (!opt) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${opt.color}`}>
      <span className={`w-2 h-2 rounded-full ${opt.dot}`} />
      {opt.label}
    </span>
  );
}

function ProgressRing({ percentage }: { percentage: number }) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percentage / 100) * circ;
  const color = percentage === 100 ? '#10b981' : percentage >= 60 ? '#3b82f6' : percentage >= 30 ? '#f59e0b' : '#e5e7eb';
  return (
    <div className="relative w-14 h-14 flex items-center justify-center">
      <svg className="w-14 h-14 -rotate-90" viewBox="0 0 50 50">
        <circle cx="25" cy="25" r={r} fill="none" stroke="#f3f4f6" strokeWidth="4" />
        <circle
          cx="25" cy="25" r={r} fill="none"
          stroke={color} strokeWidth="4"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <span className="absolute text-xs font-bold text-gray-700">{percentage}%</span>
    </div>
  );
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
      <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── Project Card (Grid View) ─────────────────────────────────────────────────
function ProjectCard({
  project,
  onEdit,
  onDelete,
  onArchive,
}: {
  project: ProjectWithStats;
  onEdit: (p: Project) => void;
  onDelete: (id: number) => void;
  onArchive: (id: number) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const stats = project.stats;
  const total = stats?.total_tasks ?? project.tasks_count ?? 0;
  const done = stats?.completed_tasks ?? 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const overdue = stats?.overdue_tasks ?? 0;

  const daysLeft = project.end_date
    ? Math.ceil((new Date(project.end_date).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <div className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-primary-200 transition-all duration-300 overflow-hidden flex flex-col">
      {/* Color header strip by priority */}
      <div
        className={`h-1.5 w-full ${
          project.priority === 'critical' ? 'bg-gradient-to-r from-red-400 to-red-600' :
          project.priority === 'high'     ? 'bg-gradient-to-r from-orange-400 to-orange-500' :
          project.priority === 'medium'   ? 'bg-gradient-to-r from-blue-400 to-blue-600' :
                                            'bg-gradient-to-r from-gray-200 to-gray-300'
        }`}
      />

      <div className="p-5 flex-1 flex flex-col gap-3">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <StatusBadge status={project.status} />
              {project.key && (
                <span className="text-xs text-gray-400 font-mono bg-gray-50 px-1.5 py-0.5 rounded">
                  {project.key}
                </span>
              )}
            </div>
            <Link
              to={`/projects/${project.id}`}
              className="block text-base font-bold text-gray-900 hover:text-primary-700 transition-colors truncate"
            >
              {project.name}
            </Link>
          </div>

          {/* Menu */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-8 z-20 w-44 bg-white rounded-xl border border-gray-100 shadow-xl py-1 overflow-hidden">
                  <Link
                    to={`/projects/${project.id}`}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View Details
                  </Link>
                  <button
                    onClick={() => { onEdit(project); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit Project
                  </button>
                  <button
                    onClick={() => { onArchive(project.id); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    Archive
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    onClick={() => { onDelete(project.id); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Description */}
        {project.description && (
          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
            {project.description}
          </p>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <CheckSquare className="w-3.5 h-3.5" />
            {done}/{total} tasks
          </span>
          {overdue > 0 && (
            <span className="flex items-center gap-1 text-red-500 font-medium">
              <AlertCircle className="w-3.5 h-3.5" />
              {overdue} overdue
            </span>
          )}
          {stats?.members_count != null && (
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {stats.members_count}
            </span>
          )}
        </div>

        {/* Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Progress</span>
            <span className="font-semibold text-gray-700">{pct}%</span>
          </div>
          <MiniBar value={done} max={total} color={pct === 100 ? 'bg-emerald-500' : 'bg-primary-500'} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 mt-auto">
          <PriorityDot priority={project.priority} />
          {daysLeft !== null && (
            <span
              className={`text-xs font-medium flex items-center gap-1 ${
                daysLeft < 0 ? 'text-red-500' :
                daysLeft <= 7 ? 'text-orange-500' : 'text-gray-400'
              }`}
            >
              <Calendar className="w-3 h-3" />
              {daysLeft < 0
                ? `${Math.abs(daysLeft)}d overdue`
                : daysLeft === 0
                ? 'Due today'
                : `${daysLeft}d left`}
            </span>
          )}
        </div>
      </div>

      {/* View project link */}
      <Link
        to={`/projects/${project.id}`}
        className="border-t border-gray-50 px-5 py-3 flex items-center justify-between text-xs font-medium text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors group/link"
      >
        <span>View project</span>
        <ArrowUpRight className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
      </Link>
    </div>
  );
}

// ─── Project Row (List View) ──────────────────────────────────────────────────
function ProjectRow({
  project,
  onEdit,
  onDelete,
}: {
  project: ProjectWithStats;
  onEdit: (p: Project) => void;
  onDelete: (id: number) => void;
}) {
  const total = project.tasks_count ?? 0;
  const done = project.stats?.completed_tasks ?? 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50/70 transition-colors group">
      <td className="py-3.5 px-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-2 h-8 rounded-full flex-shrink-0 ${
              project.priority === 'critical' ? 'bg-red-500' :
              project.priority === 'high'     ? 'bg-orange-400' :
              project.priority === 'medium'   ? 'bg-blue-400' : 'bg-gray-300'
            }`}
          />
          <div>
            <Link
              to={`/projects/${project.id}`}
              className="text-sm font-semibold text-gray-900 hover:text-primary-600 transition-colors"
            >
              {project.name}
            </Link>
            {project.key && (
              <p className="text-xs text-gray-400 font-mono">{project.key}</p>
            )}
          </div>
        </div>
      </td>
      <td className="py-3.5 px-4">
        <StatusBadge status={project.status} />
      </td>
      <td className="py-3.5 px-4">
        <PriorityDot priority={project.priority} />
      </td>
      <td className="py-3.5 px-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-[80px]">
            <MiniBar value={done} max={total} color={pct === 100 ? 'bg-emerald-500' : 'bg-primary-500'} />
          </div>
          <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
        </div>
      </td>
      <td className="py-3.5 px-4 text-sm text-gray-500">
        {total > 0 ? `${done}/${total}` : '—'}
      </td>
      <td className="py-3.5 px-4 text-sm text-gray-500">
        {project.end_date
          ? new Date(project.end_date).toLocaleDateString()
          : '—'}
      </td>
      <td className="py-3.5 px-4">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Link
            to={`/projects/${project.id}`}
            className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
            title="View"
          >
            <Eye className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={() => onEdit(project)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            title="Edit"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(project.id)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Project Form Modal ───────────────────────────────────────────────────────
function ProjectFormModal({
  isOpen,
  onClose,
  editProject,
  users,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  editProject: Project | null;
  users: User[];
  onSuccess: (p: Project, isEdit: boolean) => void;
}) {
  const dispatch = useAppDispatch();
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'basic' | 'details'>('basic');

  useEffect(() => {
    if (editProject) {
      setForm({
        name: editProject.name,
        key: editProject.key ?? '',
        description: editProject.description ?? '',
        status: editProject.status,
        priority: editProject.priority,
        start_date: editProject.start_date ?? '',
        end_date: editProject.end_date ?? '',
        owner_id: editProject.owner_id ? String(editProject.owner_id) : '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setTab('basic');
  }, [editProject, isOpen]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((p) => {
      const next = { ...p, [name]: value };
      // Auto-generate key from name
      if (name === 'name' && !editProject) {
        next.key = value
          .toUpperCase()
          .replace(/[^A-Z0-9\s]/g, '')
          .split(' ')
          .filter(Boolean)
          .map((w) => w.slice(0, 3))
          .join('-')
          .slice(0, 10);
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Project name is required'); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        key: form.key || undefined,
        description: form.description || null,
        status: form.status,
        priority: form.priority,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        owner_id: form.owner_id ? Number(form.owner_id) : null,
      };
      let result;
      if (editProject) {
        result = await dispatch(updateProject({ id: editProject.id, data: payload }));
        if (updateProject.fulfilled.match(result)) {
          toast.success('Project updated!');
          onSuccess(result.payload as Project, true);
          onClose();
        }
      } else {
        result = await dispatch(createProject(payload));
        if (createProject.fulfilled.match(result)) {
          toast.success('Project created!');
          onSuccess(result.payload as Project, false);
          onClose();
        }
      }
    } catch {
      toast.error('Failed to save project');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editProject ? 'Edit Project' : 'Create New Project'}
      size="lg"
    >
      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-5">
        {(['basic', 'details'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
              tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'basic' ? 'Basic Info' : 'Details & Dates'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {tab === 'basic' ? (
          <>
            <div>
              <label className="label">Project Name *</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className="input"
                placeholder="e.g. Website Redesign"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="label">
                Project Key
                <span className="ml-1 text-xs text-gray-400 font-normal">(auto-generated)</span>
              </label>
              <input
                type="text"
                name="key"
                value={form.key}
                onChange={handleChange}
                className="input font-mono uppercase"
                placeholder="WEB-RED"
                maxLength={10}
              />
            </div>

            <div>
              <label className="label">Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                className="input"
                rows={3}
                placeholder="What is this project about?"
              />
            </div>

            <div>
              <label className="label">Owner</label>
              <select name="owner_id" value={form.owner_id} onChange={handleChange} className="input">
                <option value="">No owner</option>
                {users.map((u) => (
                  <option key={u.id} value={String(u.id)}>{u.name}</option>
                ))}
              </select>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Status</label>
                <select name="status" value={form.status} onChange={handleChange} className="input">
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Priority</label>
                <select name="priority" value={form.priority} onChange={handleChange} className="input">
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Start Date</label>
                <input
                  type="date"
                  name="start_date"
                  value={form.start_date}
                  onChange={handleChange}
                  className="input"
                />
              </div>
              <div>
                <label className="label">End Date</label>
                <input
                  type="date"
                  name="end_date"
                  value={form.end_date}
                  onChange={handleChange}
                  className="input"
                  min={form.start_date || undefined}
                />
              </div>
            </div>

            {/* Visual preview */}
            {(form.status || form.priority) && (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-xs text-gray-500 mb-2 font-medium">Preview</p>
                <div className="flex items-center gap-3">
                  <StatusBadge status={form.status} />
                  <PriorityDot priority={form.priority} />
                </div>
              </div>
            )}
          </>
        )}

        <div className="flex gap-3 pt-2">
          {tab === 'basic' ? (
            <>
              <button
                type="button"
                onClick={() => setTab('details')}
                className="btn-secondary flex-1"
              >
                Next: Details →
              </button>
              <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-60">
                {saving ? 'Saving...' : editProject ? 'Update' : 'Create Project'}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setTab('basic')}
                className="btn-secondary flex-1"
              >
                ← Back
              </button>
              <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-60">
                {saving ? 'Saving...' : editProject ? 'Update Project' : 'Create Project'}
              </button>
            </>
          )}
        </div>
      </form>
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Projects() {
  const dispatch = useAppDispatch();
  const { projects: rawProjects, loading } = useAppSelector((s) => s.projects);
  const { user } = useAppSelector((s) => s.auth);

  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('created_at');
  const [showFilters, setShowFilters] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [starred, setStarred] = useState<Set<number>>(new Set());

  // Fetch projects
  useEffect(() => {
    dispatch(fetchProjects());
  }, [dispatch]);

  // Fetch users
  useEffect(() => {
    api.get('/projects/users').then((r) => setUsers(r.data.data ?? r.data)).catch(() => {});
  }, []);

  // Sync projects from Redux + fetch stats
  useEffect(() => {
    if (rawProjects.length > 0) {
      setProjects(rawProjects.map((p) => ({ ...p })));
    }
  }, [rawProjects]);

  // Summary stats
  const summary = {
    total: projects.length,
    active: projects.filter((p) => p.status === 'active').length,
    completed: projects.filter((p) => p.status === 'completed').length,
    onHold: projects.filter((p) => p.status === 'on_hold').length,
  };

  // Filter + sort
  const filtered = projects
    .filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.description ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (p.key ?? '').toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus ? p.status === filterStatus : true;
      const matchPriority = filterPriority ? p.priority === filterPriority : true;
      return matchSearch && matchStatus && matchPriority;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'status') return a.status.localeCompare(b.status);
      if (sortBy === 'priority') {
        const order = { critical: 0, high: 1, medium: 2, low: 3 };
        return (order[a.priority as keyof typeof order] ?? 9) - (order[b.priority as keyof typeof order] ?? 9);
      }
      return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
    });

  const starredProjects = filtered.filter((p) => starred.has(p.id));
  const unstarredProjects = filtered.filter((p) => !starred.has(p.id));

  const handleToggleStar = (id: number) => {
    setStarred((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleEdit = (p: Project) => {
    setEditProject(p);
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    setDeleting(true);
    try {
      const result = await dispatch(deleteProject(deleteConfirmId));
      if (deleteProject.fulfilled.match(result)) {
        setProjects((prev) => prev.filter((p) => p.id !== deleteConfirmId));
        toast.success('Project deleted');
      }
    } catch {
      toast.error('Failed to delete project');
    } finally {
      setDeleting(false);
      setDeleteConfirmId(null);
    }
  };

  const handleArchive = async (id: number) => {
    try {
      await api.put(`/projects/${id}`, { status: 'cancelled' });
      setProjects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: 'cancelled' } : p))
      );
      toast.success('Project archived');
    } catch {
      toast.error('Failed to archive project');
    }
  };

  const handleFormSuccess = (p: Project, isEdit: boolean) => {
    if (isEdit) {
      setProjects((prev) => prev.map((x) => (x.id === p.id ? { ...x, ...p } : x)));
    } else {
      setProjects((prev) => [p, ...prev]);
    }
  };

  const hasActiveFilters = filterStatus || filterPriority;

  return (
    <div>
      <Header title="Projects" />
      <div className="p-6 max-w-7xl mx-auto">

        {/* ── Summary cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Projects', value: summary.total,     icon: FolderKanban, color: 'from-blue-500 to-blue-600',    bg: 'bg-blue-50',    text: 'text-blue-600' },
            { label: 'Active',         value: summary.active,    icon: Zap,          color: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-50', text: 'text-emerald-600' },
            { label: 'Completed',      value: summary.completed, icon: CheckCircle2, color: 'from-violet-500 to-violet-600', bg: 'bg-violet-50',  text: 'text-violet-600' },
            { label: 'On Hold',        value: summary.onHold,    icon: Clock,        color: 'from-amber-500 to-amber-600',   bg: 'bg-amber-50',   text: 'text-amber-600' },
          ].map((card) => (
            <div key={card.label} className={`${card.bg} rounded-2xl p-4 border border-white shadow-sm`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className={`text-xs font-semibold ${card.text} uppercase tracking-wide mb-1`}>
                    {card.label}
                  </p>
                  <p className="text-3xl font-black text-gray-900">{card.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-sm`}>
                  <card.icon className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Toolbar ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-9 w-full"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                hasActiveFilters
                  ? 'bg-primary-50 border-primary-200 text-primary-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
              {hasActiveFilters && (
                <span className="w-5 h-5 rounded-full bg-primary-600 text-white text-xs flex items-center justify-center">
                  {[filterStatus, filterPriority].filter(Boolean).length}
                </span>
              )}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="input py-2 text-sm w-auto"
            >
              <option value="created_at">Newest first</option>
              <option value="name">Name A–Z</option>
              <option value="status">By status</option>
              <option value="priority">By priority</option>
            </select>

            {/* Clear filters */}
            {hasActiveFilters && (
              <button
                onClick={() => { setFilterStatus(''); setFilterPriority(''); }}
                className="text-xs text-red-500 hover:text-red-700 font-medium"
              >
                Clear filters
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'grid' ? 'bg-white shadow text-primary-600' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'list' ? 'bg-white shadow text-primary-600' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* New project */}
            <button
              onClick={() => { setEditProject(null); setIsModalOpen(true); }}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Project
            </button>
          </div>
        </div>

        {/* ── Expanded filters ── */}
        {showFilters && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 flex flex-wrap gap-4">
            <div className="flex-1 min-w-[160px]">
              <label className="label">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="input"
              >
                <option value="">All statuses</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="label">Priority</label>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="input"
              >
                <option value="">All priorities</option>
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* ── Results count ── */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">
            {filtered.length === projects.length
              ? `${projects.length} projects`
              : `${filtered.length} of ${projects.length} projects`}
          </p>
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-400">Loading projects...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FolderKanban className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-base font-semibold text-gray-700 mb-1">No projects found</h3>
            <p className="text-sm text-gray-400 mb-6">
              {search || hasActiveFilters
                ? 'Try changing your search or filters'
                : 'Create your first project to get started'}
            </p>
            {!search && !hasActiveFilters && (
              <button
                onClick={() => { setEditProject(null); setIsModalOpen(true); }}
                className="btn-primary"
              >
                Create Project
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="space-y-6">
            {/* Starred section */}
            {starredProjects.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                    Starred
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {starredProjects.map((project) => (
                    <div key={project.id} className="relative">
                      <button
                        onClick={() => handleToggleStar(project.id)}
                        className="absolute top-7 right-10 z-10 text-amber-400 hover:text-amber-500 transition-colors"
                        title="Unstar"
                      >
                        <Star className="w-3.5 h-3.5 fill-current" />
                      </button>
                      <ProjectCard
                        project={project}
                        onEdit={handleEdit}
                        onDelete={(id) => setDeleteConfirmId(id)}
                        onArchive={handleArchive}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All projects */}
            <div>
              {starredProjects.length > 0 && (
                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
                  All Projects
                </h3>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {unstarredProjects.map((project) => (
                  <div key={project.id} className="relative">
                    <button
                      onClick={() => handleToggleStar(project.id)}
                      className="absolute top-7 right-10 z-10 text-gray-300 hover:text-amber-400 transition-colors"
                      title="Star project"
                    >
                      <Star className="w-3.5 h-3.5" />
                    </button>
                    <ProjectCard
                      project={project}
                      onEdit={handleEdit}
                      onDelete={(id) => setDeleteConfirmId(id)}
                      onArchive={handleArchive}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* List view */
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Project</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Priority</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide w-40">Progress</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tasks</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Due Date</th>
                  <th className="py-3 px-4 w-24" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((project) => (
                  <ProjectRow
                    key={project.id}
                    project={project}
                    onEdit={handleEdit}
                    onDelete={(id) => setDeleteConfirmId(id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Form Modal ── */}
      <ProjectFormModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditProject(null); }}
        editProject={editProject}
        users={users}
        onSuccess={handleFormSuccess}
      />

      {/* ── Delete confirmation modal ── */}
      <Modal
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete Project"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">This action cannot be undone</p>
              <p className="text-xs text-red-600 mt-0.5">
                All tasks, epics, and user stories in this project will be permanently deleted.
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            Are you sure you want to delete this project?
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="btn-danger flex-1 disabled:opacity-60"
            >
              {deleting ? 'Deleting...' : 'Yes, Delete'}
            </button>
            <button
              onClick={() => setDeleteConfirmId(null)}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}