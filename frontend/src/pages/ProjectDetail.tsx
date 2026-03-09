import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Edit3, Trash2, Plus, CheckSquare,
  Clock, AlertCircle, Users, Calendar, BarChart2,
  CheckCircle2, Circle, TrendingUp, Layers, ScrollText,
  Activity, Eye, MoreHorizontal, Target, Zap,
  FolderKanban, Timer
} from 'lucide-react';
import Header from '../components/layout/Header';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import api from '../services/api';
import toast from 'react-hot-toast';
import type { Project, Task, Epic, UserStory, User } from '../types';

// ── Types ─────────────────────────────────────────────────────────────────────
interface ProjectStats {
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  overdue_tasks: number;
  total_estimate_minutes: number;
  total_logged_minutes: number;
  avg_completion: number;
  members_count: number;
  members: User[];
}

interface TasksByStatus {
  backlog?: number;
  todo?: number;
  in_progress?: number;
  in_review?: number;
  done?: number;
  closed?: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatMinutes(min: number): string {
  if (!min) return '0h';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    planning:  { bg: 'bg-purple-100',  text: 'text-purple-700' },
    active:    { bg: 'bg-emerald-100', text: 'text-emerald-700' },
    on_hold:   { bg: 'bg-amber-100',   text: 'text-amber-700' },
    completed: { bg: 'bg-blue-100',    text: 'text-blue-700' },
    cancelled: { bg: 'bg-red-100',     text: 'text-red-700' },
  };
  const s = map[status] ?? { bg: 'bg-gray-100', text: 'text-gray-700' };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${s.bg} ${s.text}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function StatCard({
  label, value, sub, icon: Icon, color
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.FC<{ className?: string }>;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <p className="text-2xl font-black text-gray-900">{value}</p>
      <p className="text-sm font-medium text-gray-600 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function ProgressBar({ value, max, color = 'bg-primary-500', label }: {
  value: number; max: number; color?: string; label?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      {label && (
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{label}</span>
          <span className="font-semibold">{value}/{max}</span>
        </div>
      )}
      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [tasksByStatus, setTasksByStatus] = useState<TasksByStatus>({});
  const [tasksByPriority, setTasksByPriority] = useState<Record<string, number>>({});
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [epics, setEpics] = useState<Epic[]>([]);
  const [userStories, setUserStories] = useState<UserStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'epics' | 'stories' | 'members'>('overview');

  // Quick task modal
  const [isQuickTaskOpen, setIsQuickTaskOpen] = useState(false);
  const [quickTaskForm, setQuickTaskForm] = useState({
    title: '', priority: 'medium', type: 'task', due_date: '', assigned_to: '',
  });
  const [savingTask, setSavingTask] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  const fetchProject = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [detailRes, statsRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/projects/${id}/stats`),
      ]);
      setProject(detailRes.data.project);
      setTasksByStatus(detailRes.data.tasks_by_status ?? {});
      setTasksByPriority(detailRes.data.tasks_by_priority ?? {});
      setRecentTasks(detailRes.data.recent_tasks ?? []);
      setStats(statsRes.data);
    } catch {
      toast.error('Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchEpics = useCallback(async () => {
    if (!id) return;
    try {
      const res = await api.get('/epics', { params: { project_id: id } });
      setEpics(res.data);
    } catch {
      setEpics([]);
    }
  }, [id]);

  const fetchStories = useCallback(async () => {
    if (!id) return;
    try {
      const res = await api.get('/user-stories', { params: { project_id: id } });
      setUserStories(res.data.data ?? res.data);
    } catch {
      setUserStories([]);
    }
  }, [id]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  useEffect(() => {
    if (activeTab === 'epics') fetchEpics();
    if (activeTab === 'stories') fetchStories();
  }, [activeTab, fetchEpics, fetchStories]);

  useEffect(() => {
    api.get('/projects/users').then((r) => setAllUsers(r.data.data ?? r.data)).catch(() => {});
  }, []);

  const handleQuickTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskForm.title.trim() || !id) return;
    setSavingTask(true);
    try {
      await api.post('/tasks', {
        project_id:  Number(id),
        title:       quickTaskForm.title,
        priority:    quickTaskForm.priority,
        type:        quickTaskForm.type,
        due_date:    quickTaskForm.due_date || null,
        assigned_to: quickTaskForm.assigned_to ? Number(quickTaskForm.assigned_to) : null,
        status:      'todo',
      });
      toast.success('Task created!');
      setIsQuickTaskOpen(false);
      setQuickTaskForm({ title: '', priority: 'medium', type: 'task', due_date: '', assigned_to: '' });
      fetchProject();
    } catch {
      toast.error('Failed to create task');
    } finally {
      setSavingTask(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!window.confirm('Delete this project and all its data? This cannot be undone.')) return;
    try {
      await api.delete(`/projects/${id}`);
      toast.success('Project deleted');
      navigate('/projects');
    } catch {
      toast.error('Failed to delete project');
    }
  };

  if (loading || !project) {
    return (
      <div>
        <Header title="Project" />
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading project...</p>
        </div>
      </div>
    );
  }

  const completionPct = stats && stats.total_tasks > 0
    ? Math.round((stats.completed_tasks / stats.total_tasks) * 100)
    : 0;

  const daysLeft = project.end_date
    ? Math.ceil((new Date(project.end_date).getTime() - Date.now()) / 86400000)
    : null;

  const TABS = [
    { key: 'overview', label: 'Overview',     icon: BarChart2 },
    { key: 'tasks',    label: 'Tasks',         icon: CheckSquare },
    { key: 'epics',    label: 'Epics',         icon: Layers },
    { key: 'stories',  label: 'User Stories',  icon: ScrollText },
    { key: 'members',  label: 'Members',       icon: Users },
  ] as const;

  return (
    <div>
      <Header title="Project Detail" />
      <div className="p-6 max-w-7xl mx-auto">

        {/* ── Back ── */}
        <button
          onClick={() => navigate('/projects')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          All Projects
        </button>

        {/* ── Project header ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <StatusBadge status={project.status} />
                {project.key && (
                  <span className="text-xs font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded">
                    {project.key}
                  </span>
                )}
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    project.priority === 'critical' ? 'bg-red-100 text-red-700' :
                    project.priority === 'high'     ? 'bg-orange-100 text-orange-700' :
                    project.priority === 'medium'   ? 'bg-blue-100 text-blue-700' :
                                                      'bg-gray-100 text-gray-600'
                  }`}
                >
                  {project.priority} priority
                </span>
              </div>

              <h1 className="text-2xl font-black text-gray-900 mb-2">{project.name}</h1>

              {project.description && (
                <p className="text-sm text-gray-500 leading-relaxed max-w-2xl">
                  {project.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-5 mt-3 text-xs text-gray-400">
                {project.owner && (
                  <span className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold">
                      {project.owner.name.charAt(0)}
                    </div>
                    {project.owner.name}
                  </span>
                )}
                {project.start_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(project.start_date).toLocaleDateString()} →{' '}
                    {project.end_date
                      ? new Date(project.end_date).toLocaleDateString()
                      : 'No end date'}
                  </span>
                )}
                {daysLeft !== null && (
                  <span
                    className={`font-medium ${
                      daysLeft < 0 ? 'text-red-500' :
                      daysLeft <= 7 ? 'text-orange-500' : 'text-gray-500'
                    }`}
                  >
                    {daysLeft < 0
                      ? `${Math.abs(daysLeft)} days overdue`
                      : daysLeft === 0
                      ? 'Due today'
                      : `${daysLeft} days left`}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setIsQuickTaskOpen(true)}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Task
              </button>
              <Link
                to={`/tasks?project_id=${project.id}`}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                <Eye className="w-4 h-4" />
                All Tasks
              </Link>
              <button
                onClick={handleDeleteProject}
                className="p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                title="Delete project"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Overall progress */}
          {stats && stats.total_tasks > 0 && (
            <div className="mt-5 pt-5 border-t border-gray-100">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium text-gray-700">Overall Progress</span>
                <span className="font-bold text-gray-900">{completionPct}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-3 rounded-full transition-all duration-700 ${
                    completionPct === 100 ? 'bg-emerald-500' :
                    completionPct >= 60   ? 'bg-primary-500' :
                    completionPct >= 30   ? 'bg-amber-500'   : 'bg-gray-400'
                  }`}
                  style={{ width: `${completionPct}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>{stats.completed_tasks} completed</span>
                <span>{stats.total_tasks - stats.completed_tasks} remaining</span>
              </div>
            </div>
          )}
        </div>

        {/* ── Stat cards ── */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <StatCard
              label="Total Tasks"
              value={stats.total_tasks}
              sub={`${stats.completed_tasks} completed`}
              icon={CheckSquare}
              color="bg-gradient-to-br from-blue-500 to-blue-600"
            />
            <StatCard
              label="In Progress"
              value={stats.in_progress_tasks}
              icon={Zap}
              color="bg-gradient-to-br from-amber-400 to-amber-600"
            />
            <StatCard
              label="Overdue"
              value={stats.overdue_tasks}
              icon={AlertCircle}
              color={stats.overdue_tasks > 0
                ? 'bg-gradient-to-br from-red-500 to-red-600'
                : 'bg-gradient-to-br from-gray-400 to-gray-500'}
            />
            <StatCard
              label="Time Logged"
              value={formatMinutes(stats.total_logged_minutes)}
              sub={`of ${formatMinutes(stats.total_estimate_minutes)} estimated`}
              icon={Timer}
              color="bg-gradient-to-br from-violet-500 to-violet-600"
            />
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 mb-6 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-white shadow text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Tasks by status */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-primary-600" />
                Tasks by Status
              </h3>
              {Object.keys(tasksByStatus).length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No tasks yet</p>
              ) : (
                <div className="space-y-3">
                  {[
                    { key: 'backlog',    label: 'Backlog',     color: 'bg-gray-400' },
                    { key: 'todo',       label: 'To Do',       color: 'bg-blue-400' },
                    { key: 'in_progress',label: 'In Progress', color: 'bg-amber-400' },
                    { key: 'in_review',  label: 'In Review',   color: 'bg-violet-400' },
                    { key: 'done',       label: 'Done',        color: 'bg-emerald-500' },
                    { key: 'closed',     label: 'Closed',      color: 'bg-gray-500' },
                  ].map(({ key, label, color }) => {
                    const val = (tasksByStatus as Record<string, number>)[key] ?? 0;
                    const total = Object.values(tasksByStatus).reduce((a, b) => a + (b as number), 0);
                    if (val === 0) return null;
                    return (
                      <div key={key}>
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span className="font-medium">{label}</span>
                          <span>{val} ({total > 0 ? Math.round((val / total) * 100) : 0}%)</span>
                        </div>
                        <ProgressBar value={val} max={total} color={color} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Tasks by priority */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Target className="w-4 h-4 text-primary-600" />
                Tasks by Priority
              </h3>
              {Object.keys(tasksByPriority).length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No tasks yet</p>
              ) : (
                <div className="space-y-3">
                  {[
                    { key: 'critical', label: 'Critical', color: 'bg-red-500' },
                    { key: 'high',     label: 'High',     color: 'bg-orange-400' },
                    { key: 'medium',   label: 'Medium',   color: 'bg-blue-400' },
                    { key: 'low',      label: 'Low',      color: 'bg-gray-400' },
                  ].map(({ key, label, color }) => {
                    const val = tasksByPriority[key] ?? 0;
                    const total = Object.values(tasksByPriority).reduce((a, b) => a + b, 0);
                    if (val === 0) return null;
                    return (
                      <div key={key}>
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span className="font-medium">{label}</span>
                          <span>{val} ({total > 0 ? Math.round((val / total) * 100) : 0}%)</span>
                        </div>
                        <ProgressBar value={val} max={total} color={color} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent tasks */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary-600" />
                  Recent Tasks
                </h3>
                <Link
                  to={`/tasks?project_id=${id}`}
                  className="text-xs text-primary-600 hover:text-primary-800 font-medium"
                >
                  View all →
                </Link>
              </div>
              {recentTasks.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No tasks yet</p>
              ) : (
                <div className="space-y-2">
                  {recentTasks.map((task) => (
                    <Link
                      key={task.id}
                      to={`/tasks/${task.id}`}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        {['done', 'closed'].includes(task.status) ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-gray-300 flex-shrink-0" />
                        )}
                        <span className="text-sm font-medium text-gray-800 group-hover:text-primary-600 transition-colors truncate max-w-xs">
                          {task.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge value={task.priority} type="priority" />
                        <Badge value={task.status} />
                        {task.assignee && (
                          <div className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold">
                            {task.assignee.name.charAt(0)}
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TASKS TAB */}
        {activeTab === 'tasks' && (
          <TasksTab projectId={Number(id)} onAddTask={() => setIsQuickTaskOpen(true)} />
        )}

        {/* EPICS TAB */}
        {activeTab === 'epics' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">Epics ({epics.length})</h3>
              <Link to="/epics" className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                New Epic
              </Link>
            </div>
            {epics.length === 0 ? (
              <div className="text-center py-16">
                <Layers className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">No epics yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {epics.map((epic) => (
                  <div key={epic.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{epic.name}</p>
                      {epic.description && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{epic.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge value={epic.priority} type="priority" />
                      <Badge value={epic.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* USER STORIES TAB */}
        {activeTab === 'stories' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">User Stories ({userStories.length})</h3>
              <Link to="/user-stories" className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                New Story
              </Link>
            </div>
            {userStories.length === 0 ? (
              <div className="text-center py-16">
                <ScrollText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">No user stories yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {userStories.map((story) => (
                  <div key={story.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{story.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {story.sprint && (
                          <span className="text-xs text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                            {story.sprint}
                          </span>
                        )}
                        {story.story_points > 0 && (
                          <span className="text-xs text-gray-400">{story.story_points} pts</span>
                        )}
                        {story.assignee && (
                          <span className="text-xs text-gray-400">→ {story.assignee.name}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge value={story.priority} type="priority" />
                      <Badge value={story.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MEMBERS TAB */}
        {activeTab === 'members' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">
                Team Members ({stats?.members_count ?? 0})
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">People assigned to tasks in this project</p>
            </div>
            {!stats?.members?.length ? (
              <div className="text-center py-16">
                <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">No members yet</p>
              </div>
            ) : (
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{member.name}</p>
                      <p className="text-xs text-gray-400 truncate">{member.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Quick Task Modal ── */}
      <Modal
        isOpen={isQuickTaskOpen}
        onClose={() => setIsQuickTaskOpen(false)}
        title="Add Task"
        size="sm"
      >
        <form onSubmit={handleQuickTask} className="space-y-4">
          <div>
            <label className="label">Task Title *</label>
            <input
              type="text"
              value={quickTaskForm.title}
              onChange={(e) => setQuickTaskForm((p) => ({ ...p, title: e.target.value }))}
              className="input"
              placeholder="What needs to be done?"
              required
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Type</label>
              <select
                value={quickTaskForm.type}
                onChange={(e) => setQuickTaskForm((p) => ({ ...p, type: e.target.value }))}
                className="input"
              >
                <option value="task">Task</option>
                <option value="bug">Bug</option>
                <option value="feature">Feature</option>
                <option value="improvement">Improvement</option>
                <option value="test">Test</option>
              </select>
            </div>
            <div>
              <label className="label">Priority</label>
              <select
                value={quickTaskForm.priority}
                onChange={(e) => setQuickTaskForm((p) => ({ ...p, priority: e.target.value }))}
                className="input"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Assign To</label>
            <select
              value={quickTaskForm.assigned_to}
              onChange={(e) => setQuickTaskForm((p) => ({ ...p, assigned_to: e.target.value }))}
              className="input"
            >
              <option value="">Unassigned</option>
              {allUsers.map((u) => (
                <option key={u.id} value={String(u.id)}>{u.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Due Date</label>
            <input
              type="date"
              value={quickTaskForm.due_date}
              onChange={(e) => setQuickTaskForm((p) => ({ ...p, due_date: e.target.value }))}
              className="input"
            />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={savingTask} className="btn-primary flex-1 disabled:opacity-60">
              {savingTask ? 'Creating...' : 'Create Task'}
            </button>
            <button type="button" onClick={() => setIsQuickTaskOpen(false)} className="btn-secondary flex-1">
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ── Tasks tab sub-component ────────────────────────────────────────────────────
function TasksTab({ projectId, onAddTask }: { projectId: number; onAddTask: () => void }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string | number> = { project_id: projectId };
    if (filterStatus) params.status = filterStatus;
    if (filterPriority) params.priority = filterPriority;
    api.get('/tasks', { params })
      .then((r) => setTasks(r.data.data ?? r.data))
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, [projectId, filterStatus, filterPriority]);

  const filtered = tasks.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-4 border-b border-gray-100">
        <input
          type="text"
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input flex-1 min-w-[160px] text-sm py-1.5"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="input text-sm py-1.5 w-36"
        >
          <option value="">All Status</option>
          <option value="backlog">Backlog</option>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="in_review">In Review</option>
          <option value="done">Done</option>
        </select>
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="input text-sm py-1.5 w-36"
        >
          <option value="">All Priority</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
        <button onClick={onAddTask} className="btn-primary text-sm py-1.5 px-3 flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          Add Task
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <CheckSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No tasks found</p>
        </div>
      ) : (
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Title</th>
              <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Priority</th>
              <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Assignee</th>
              <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Progress</th>
              <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Due</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((task) => (
              <tr key={task.id} className="hover:bg-gray-50/70 transition-colors">
                <td className="py-3 px-4">
                  <Link
                    to={`/tasks/${task.id}`}
                    className="text-sm font-medium text-gray-800 hover:text-primary-600 transition-colors line-clamp-1"
                  >
                    {task.title}
                  </Link>
                </td>
                <td className="py-3 px-4">
                  <Badge value={task.status} />
                </td>
                <td className="py-3 px-4">
                  <Badge value={task.priority} type="priority" />
                </td>
                <td className="py-3 px-4">
                  {task.assignee ? (
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {task.assignee.name.charAt(0)}
                      </div>
                      <span className="text-xs text-gray-600 truncate max-w-[80px]">
                        {task.assignee.name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2 w-24">
                    <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-primary-500"
                        style={{ width: `${task.completion_percentage ?? 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 w-8">
                      {task.completion_percentage ?? 0}%
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  {task.due_date ? (
                    <span
                      className={`text-xs ${
                        new Date(task.due_date) < new Date() &&
                        !['done', 'closed'].includes(task.status)
                          ? 'text-red-500 font-medium'
                          : 'text-gray-500'
                      }`}
                    >
                      {new Date(task.due_date).toLocaleDateString()}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}