import { useEffect, useState } from 'react';
import {
  Plus,
  Search,
  FolderKanban,
  Calendar,
  Users,
  CheckSquare,
  MoreVertical,
  Edit3,
  Trash2,
  Eye,
  TrendingUp,
  Clock,
  AlertCircle,
  Filter,
  Grid3X3,
  List,
  Star,
  StarOff,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '../components/layout/Header';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import { useAppDispatch, useAppSelector } from '../hooks/useAppDispatch';
import {
  fetchProjects,
  createProject,
  updateProject,
  deleteProject,
} from '../store/slices/projectSlice';
import type { Project } from '../types';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = ['planning', 'active', 'on_hold', 'completed', 'cancelled'];
const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'critical'];

const STATUS_COLORS: Record<string, string> = {
  planning:  'bg-gray-100 text-gray-700',
  active:    'bg-green-100 text-green-700',
  on_hold:   'bg-yellow-100 text-yellow-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-700',
};

const PRIORITY_COLORS: Record<string, string> = {
  low:      'bg-gray-100 text-gray-600',
  medium:   'bg-yellow-100 text-yellow-700',
  high:     'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

function ProjectProgress({ done, total }: { done: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-500">
        <span>{done}/{total} tasks</span>
        <span className="font-semibold text-gray-700">{pct}%</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all duration-500 ${
            pct === 100 ? 'bg-green-500' : pct >= 50 ? 'bg-primary-500' : 'bg-yellow-400'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ProjectCard({
  project,
  onEdit,
  onDelete,
  onToggleStar,
  starred,
}: {
  project: Project;
  onEdit: (p: Project) => void;
  onDelete: (p: Project) => void;
  onToggleStar: (id: number) => void;
  starred: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isOverdue =
    project.end_date &&
    new Date(project.end_date) < new Date() &&
    project.status !== 'completed' &&
    project.status !== 'cancelled';

  const doneCount = 0; // In real app derive from project.tasks
  const totalCount = project.tasks_count ?? 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col overflow-hidden group">
      {/* Top color bar by priority */}
      <div
        className={`h-1.5 w-full ${
          project.priority === 'critical'
            ? 'bg-red-400'
            : project.priority === 'high'
            ? 'bg-orange-400'
            : project.priority === 'medium'
            ? 'bg-yellow-400'
            : 'bg-green-400'
        }`}
      />

      <div className="p-5 flex flex-col flex-1">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
              <FolderKanban className="w-4 h-4 text-primary-600" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-gray-900 truncate leading-tight">
                {project.name}
              </h3>
              {project.key && (
                <span className="text-xs text-gray-400 font-mono">{project.key}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => onToggleStar(project.id)}
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {starred ? (
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              ) : (
                <StarOff className="w-4 h-4 text-gray-300 group-hover:text-gray-400" />
              )}
            </button>
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <MoreVertical className="w-4 h-4 text-gray-400" />
              </button>
              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-7 z-20 bg-white rounded-xl shadow-lg border border-gray-100 py-1 w-40 overflow-hidden">
                    <Link
                      to={`/projects/${project.id}`}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      onClick={() => setMenuOpen(false)}
                    >
                      <Eye className="w-3.5 h-3.5" /> View Details
                    </Link>
                    <button
                      onClick={() => { onEdit(project); setMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => { onDelete(project); setMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        {project.description && (
          <p className="text-xs text-gray-500 line-clamp-2 mb-3 leading-relaxed">
            {project.description}
          </p>
        )}

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[project.status] ?? 'bg-gray-100 text-gray-600'}`}>
            {project.status.replace('_', ' ')}
          </span>
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[project.priority] ?? 'bg-gray-100 text-gray-600'}`}>
            {project.priority}
          </span>
          {isOverdue && (
            <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-red-100 text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Overdue
            </span>
          )}
        </div>

        {/* Progress */}
        <div className="mb-4">
          <ProjectProgress done={doneCount} total={totalCount} />
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
          <span className="flex items-center gap-1">
            <CheckSquare className="w-3.5 h-3.5" />
            {project.tasks_count ?? 0} tasks
          </span>
          {project.epics_count !== undefined && (
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              {project.epics_count} epics
            </span>
          )}
          {project.user_stories_count !== undefined && (
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {project.user_stories_count} stories
            </span>
          )}
        </div>

        {/* Dates */}
        {(project.start_date || project.end_date) && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-4">
            <Clock className="w-3.5 h-3.5 flex-shrink-0" />
            <span>
              {project.start_date
                ? new Date(project.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : 'No start'}
              {' → '}
              {project.end_date
                ? new Date(project.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : 'No end'}
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="mt-auto pt-3 border-t border-gray-50 flex items-center justify-between">
          {project.owner && (
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold">
                {project.owner.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs text-gray-500 truncate max-w-[90px]">
                {project.owner.name}
              </span>
            </div>
          )}
          <Link
            to={`/projects/${project.id}`}
            className="text-xs text-primary-600 hover:text-primary-800 font-medium transition-colors ml-auto"
          >
            Open →
          </Link>
        </div>
      </div>
    </div>
  );
}

function ProjectRow({
  project,
  onEdit,
  onDelete,
  onToggleStar,
  starred,
}: {
  project: Project;
  onEdit: (p: Project) => void;
  onDelete: (p: Project) => void;
  onToggleStar: (id: number) => void;
  starred: boolean;
}) {
  const isOverdue =
    project.end_date &&
    new Date(project.end_date) < new Date() &&
    project.status !== 'completed';

  return (
    <tr className="hover:bg-gray-50 transition-colors group">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => onToggleStar(project.id)}>
            {starred ? (
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            ) : (
              <StarOff className="w-4 h-4 text-gray-300 group-hover:text-gray-400" />
            )}
          </button>
          <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
            <FolderKanban className="w-3.5 h-3.5 text-primary-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{project.name}</p>
            {project.key && (
              <p className="text-xs text-gray-400 font-mono">{project.key}</p>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[project.status] ?? 'bg-gray-100 text-gray-600'}`}>
          {project.status.replace('_', ' ')}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${PRIORITY_COLORS[project.priority] ?? 'bg-gray-100 text-gray-600'}`}>
          {project.priority}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="w-32">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{project.tasks_count ?? 0} tasks</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div className="h-1.5 rounded-full bg-primary-500 w-0" />
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        {project.end_date ? (
          <span className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
            {isOverdue && <AlertCircle className="w-3 h-3" />}
            {new Date(project.end_date).toLocaleDateString()}
          </span>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        {project.owner ? (
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold">
              {project.owner.name.charAt(0)}
            </div>
            <span className="text-xs text-gray-600">{project.owner.name}</span>
          </div>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Link
            to={`/projects/${project.id}`}
            className="p-1.5 rounded-lg hover:bg-primary-50 text-primary-600 transition-colors"
            title="View"
          >
            <Eye className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={() => onEdit(project)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
            title="Edit"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(project)}
            className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function Projects() {
  const dispatch = useAppDispatch();
  const { projects, loading } = useAppSelector((state) => state.projects);

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [starredIds, setStarredIds] = useState<number[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('starred_projects') ?? '[]');
    } catch { return []; }
  });
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed'>('all');

  const [form, setForm] = useState({
    name: '',
    key: '',
    description: '',
    status: 'active',
    priority: 'medium',
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    dispatch(fetchProjects());
  }, [dispatch]);

  const resetForm = () => {
    setForm({ name: '', key: '', description: '', status: 'active', priority: 'medium', start_date: '', end_date: '' });
    setEditProject(null);
  };

  const openEdit = (p: Project) => {
    setEditProject(p);
    setForm({
      name: p.name,
      key: p.key ?? '',
      description: p.description ?? '',
      status: p.status,
      priority: p.priority,
      start_date: p.start_date ?? '',
      end_date: p.end_date ?? '',
    });
    setIsModalOpen(true);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Project name is required'); return; }
    try {
      const payload = {
        name: form.name.trim(),
        key: form.key.trim().toUpperCase() || form.name.substring(0, 3).toUpperCase(),
        description: form.description || null,
        status: form.status,
        priority: form.priority,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      };
      if (editProject) {
        await dispatch(updateProject({ id: editProject.id, data: payload })).unwrap();
        toast.success('Project updated!');
      } else {
        await dispatch(createProject(payload)).unwrap();
        toast.success('Project created!');
      }
      setIsModalOpen(false);
      resetForm();
    } catch {
      toast.error('Failed to save project');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await dispatch(deleteProject(deleteConfirm.id)).unwrap();
      toast.success('Project deleted');
      setDeleteConfirm(null);
    } catch {
      toast.error('Failed to delete project');
    }
  };

  const handleToggleStar = (id: number) => {
    setStarredIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      localStorage.setItem('starred_projects', JSON.stringify(next));
      return next;
    });
  };

  const allProjects = Array.isArray(projects) ? projects : [];

  const filtered = allProjects.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.key ?? '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus ? p.status === filterStatus : true;
    const matchPriority = filterPriority ? p.priority === filterPriority : true;
    const matchStarred = showStarredOnly ? starredIds.includes(p.id) : true;
    const matchTab =
      activeTab === 'all' ? true :
      activeTab === 'active' ? p.status === 'active' :
      p.status === 'completed';
    return matchSearch && matchStatus && matchPriority && matchStarred && matchTab;
  });

  // Stats
  const stats = {
    total:     allProjects.length,
    active:    allProjects.filter((p) => p.status === 'active').length,
    completed: allProjects.filter((p) => p.status === 'completed').length,
    overdue:   allProjects.filter((p) =>
      p.end_date && new Date(p.end_date) < new Date() &&
      !['completed', 'cancelled'].includes(p.status)
    ).length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Projects" />
      <div className="p-6">

        {/* Stats cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Projects', value: stats.total,     icon: FolderKanban, color: 'text-primary-600 bg-primary-50' },
            { label: 'Active',         value: stats.active,    icon: TrendingUp,   color: 'text-green-600 bg-green-50' },
            { label: 'Completed',      value: stats.completed, icon: CheckSquare,  color: 'text-blue-600 bg-blue-50' },
            { label: 'Overdue',        value: stats.overdue,   icon: AlertCircle,  color: 'text-red-600 bg-red-50' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-9 w-full"
              />
            </div>

            {/* Status filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input w-36"
            >
              <option value="">All Status</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>

            {/* Priority filter */}
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="input w-36"
            >
              <option value="">All Priority</option>
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            {/* Starred filter */}
            <button
              onClick={() => setShowStarredOnly((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                showStarredOnly
                  ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Star className="w-4 h-4" />
              Starred
            </button>

            {/* View toggle */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 ml-auto">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => { resetForm(); setIsModalOpen(true); }}
              className="btn-primary flex items-center gap-2 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              New Project
            </button>
          </div>

          {/* Tab filters */}
          <div className="flex items-center gap-1 mt-3 border-t border-gray-50 pt-3">
            {[
              { key: 'all',       label: `All (${allProjects.length})` },
              { key: 'active',    label: `Active (${stats.active})` },
              { key: 'completed', label: `Completed (${stats.completed})` },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
            {(search || filterStatus || filterPriority || showStarredOnly) && (
              <button
                onClick={() => { setSearch(''); setFilterStatus(''); setFilterPriority(''); setShowStarredOnly(false); }}
                className="ml-auto text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1"
              >
                <Filter className="w-3 h-3" /> Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl border border-gray-100">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FolderKanban className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-500 font-semibold text-lg">No projects found</p>
            <p className="text-gray-400 text-sm mt-1">
              {search || filterStatus || filterPriority
                ? 'Try adjusting your filters'
                : 'Create your first project to get started'}
            </p>
            {!search && !filterStatus && !filterPriority && (
              <button
                onClick={() => { resetForm(); setIsModalOpen(true); }}
                className="btn-primary mt-4"
              >
                Create Project
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onEdit={openEdit}
                onDelete={setDeleteConfirm}
                onToggleStar={handleToggleStar}
                starred={starredIds.includes(p.id)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Project', 'Status', 'Priority', 'Progress', 'Due Date', 'Owner', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((p) => (
                  <ProjectRow
                    key={p.id}
                    project={p}
                    onEdit={openEdit}
                    onDelete={setDeleteConfirm}
                    onToggleStar={handleToggleStar}
                    starred={starredIds.includes(p.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Result count */}
        {filtered.length > 0 && (
          <p className="text-xs text-gray-400 mt-4 text-center">
            Showing {filtered.length} of {allProjects.length} projects
          </p>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title={editProject ? 'Edit Project' : 'Create New Project'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="label">Project Name *</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className="input"
                placeholder="e.g. E-Commerce Platform"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="label">Key</label>
              <input
                type="text"
                name="key"
                value={form.key}
                onChange={(e) => setForm((p) => ({ ...p, key: e.target.value.toUpperCase() }))}
                className="input font-mono"
                placeholder="ECP"
                maxLength={6}
              />
            </div>
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              className="input"
              rows={3}
              placeholder="Describe the project goals and scope..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Status</label>
              <select name="status" value={form.status} onChange={handleChange} className="input">
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Priority</label>
              <select name="priority" value={form.priority} onChange={handleChange} className="input">
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start Date</label>
              <input type="date" name="start_date" value={form.start_date} onChange={handleChange} className="input" />
            </div>
            <div>
              <label className="label">End Date</label>
              <input type="date" name="end_date" value={form.end_date} onChange={handleChange} className="input" min={form.start_date || undefined} />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1">
              {editProject ? 'Update Project' : 'Create Project'}
            </button>
            <button type="button" onClick={() => { setIsModalOpen(false); resetForm(); }} className="btn-secondary flex-1">
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Project"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl border border-red-100">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">
              Are you sure you want to delete{' '}
              <span className="font-bold">{deleteConfirm?.name}</span>? This will
              permanently delete all tasks, epics, and user stories in this project.
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={handleDelete} className="btn-danger flex-1">
              Yes, Delete
            </button>
            <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}