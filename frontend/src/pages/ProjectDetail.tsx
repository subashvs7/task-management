import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  CheckSquare,
  Layers,
  ScrollText,
  BarChart3,
  Calendar,
  Clock,
  User,
  Settings,
  Activity,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Circle,
  Timer,
} from 'lucide-react';
import Header from '../components/layout/Header';
import Badge from '../components/ui/Badge';
import api from '../services/api';
import toast from 'react-hot-toast';
import type { Project, Task, Epic, UserStory } from '../types';

type TabType = 'overview' | 'tasks' | 'epics' | 'stories' | 'activity';

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 font-medium mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [epics, setEpics] = useState<Epic[]>([]);
  const [stories, setStories] = useState<UserStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      api.get(`/projects/${id}`),
      api.get('/tasks', { params: { project_id: id, per_page: 100 } }),
      api.get('/epics', { params: { project_id: id } }),
      api.get('/user-stories', { params: { project_id: id } }),
    ])
      .then(([pRes, tRes, eRes, sRes]) => {
        setProject(pRes.data);
        setTasks(tRes.data.data ?? tRes.data);
        setEpics(eRes.data);
        setStories(sRes.data.data ?? sRes.data);
      })
      .catch(() => toast.error('Failed to load project'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div>
        <Header title="Project Detail" />
        <div className="flex justify-center items-center h-64">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div>
        <Header title="Project Detail" />
        <div className="p-6 text-center">
          <p className="text-gray-500">Project not found.</p>
          <button onClick={() => navigate('/projects')} className="btn-primary mt-4">
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  // Task stats
  const tasksByStatus = {
    backlog:     tasks.filter((t) => t.status === 'backlog').length,
    todo:        tasks.filter((t) => t.status === 'todo').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
    in_review:   tasks.filter((t) => t.status === 'in_review').length,
    done:        tasks.filter((t) => t.status === 'done').length,
    closed:      tasks.filter((t) => t.status === 'closed').length,
  };

  const tasksByPriority = {
    low:      tasks.filter((t) => t.priority === 'low').length,
    medium:   tasks.filter((t) => t.priority === 'medium').length,
    high:     tasks.filter((t) => t.priority === 'high').length,
    critical: tasks.filter((t) => t.priority === 'critical').length,
  };

  const overdueTasks = tasks.filter(
    (t) =>
      t.due_date &&
      new Date(t.due_date) < new Date() &&
      !['done', 'closed'].includes(t.status)
  );

  const completedTasks = tasks.filter((t) =>
    ['done', 'closed'].includes(t.status)
  );

  const totalEstimate = tasks.reduce(
    (acc, t) => acc + (t.estimate_hours ?? 0) * 60 + (t.estimate_minutes ?? 0),
    0
  );

  const totalLogged = tasks.reduce(
    (acc, t) => acc + (t.logged_hours ?? 0) * 60 + (t.logged_minutes ?? 0),
    0
  );

  const completion =
    tasks.length === 0
      ? 0
      : Math.round((completedTasks.length / tasks.length) * 100);

  const tabs: { key: TabType; label: string; icon: React.ElementType; count?: number }[] = [
    { key: 'overview', label: 'Overview',    icon: BarChart3 },
    { key: 'tasks',    label: 'Tasks',       icon: CheckSquare,  count: tasks.length },
    { key: 'epics',    label: 'Epics',       icon: Layers,       count: epics.length },
    { key: 'stories',  label: 'Stories',     icon: ScrollText,   count: stories.length },
    { key: 'activity', label: 'Activity',    icon: Activity },
  ];

  const isOverdue =
    project.end_date &&
    new Date(project.end_date) < new Date() &&
    !['completed', 'cancelled'].includes(project.status);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Project Detail" />
      <div className="p-6 max-w-7xl mx-auto">

        {/* Back */}
        <button
          onClick={() => navigate('/projects')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Projects
        </button>

        {/* Project header card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center flex-shrink-0">
                <span className="text-primary-700 font-bold text-lg">
                  {(project.key ?? project.name.substring(0, 2)).toUpperCase()}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
                  {project.key && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md font-mono">
                      {project.key}
                    </span>
                  )}
                  {isOverdue && (
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Overdue
                    </span>
                  )}
                </div>
                {project.description && (
                  <p className="text-sm text-gray-500 max-w-xl">{project.description}</p>
                )}
                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-400">
                  {project.owner && (
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      {project.owner.name}
                    </span>
                  )}
                  {project.start_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(project.start_date).toLocaleDateString()} →{' '}
                      {project.end_date
                        ? new Date(project.end_date).toLocaleDateString()
                        : 'No end'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-sm px-3 py-1.5 rounded-xl font-medium capitalize ${
                project.status === 'active'    ? 'bg-green-100 text-green-700' :
                project.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                project.status === 'on_hold'   ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {project.status.replace('_', ' ')}
              </span>
              <Link
                to={`/tasks?project_id=${project.id}`}
                className="btn-primary flex items-center gap-1.5 text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Task
              </Link>
            </div>
          </div>

          {/* Overall progress bar */}
          <div className="mt-5 pt-5 border-t border-gray-50">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600 font-medium">Overall Progress</span>
              <span className={`font-bold ${completion === 100 ? 'text-green-600' : 'text-primary-600'}`}>
                {completion}%
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  completion === 100 ? 'bg-green-500' : 'bg-primary-500'
                }`}
                style={{ width: `${completion}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1.5">
              <span>{completedTasks.length} of {tasks.length} tasks completed</span>
              {overdueTasks.length > 0 && (
                <span className="text-red-500">
                  {overdueTasks.length} overdue
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5 mb-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                  activeTab === tab.key
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={CheckSquare}  label="Total Tasks"    value={tasks.length}            color="text-primary-600 bg-primary-50" />
              <StatCard icon={CheckCircle2} label="Completed"      value={completedTasks.length}   color="text-green-600 bg-green-50"   sub={`${completion}% done`} />
              <StatCard icon={AlertCircle}  label="Overdue"        value={overdueTasks.length}      color="text-red-600 bg-red-50" />
              <StatCard icon={Timer}        label="Time Logged"    value={`${Math.floor(totalLogged / 60)}h`} color="text-purple-600 bg-purple-50" sub={totalEstimate > 0 ? `of ${Math.floor(totalEstimate / 60)}h est.` : 'no estimate'} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Tasks by status */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary-600" />
                  Tasks by Status
                </h3>
                <div className="space-y-3">
                  {Object.entries(tasksByStatus).map(([status, count]) => {
                    const pct = tasks.length === 0 ? 0 : Math.round((count / tasks.length) * 100);
                    const colors: Record<string, string> = {
                      backlog:     'bg-gray-300',
                      todo:        'bg-blue-400',
                      in_progress: 'bg-yellow-400',
                      in_review:   'bg-purple-400',
                      done:        'bg-green-500',
                      closed:      'bg-gray-500',
                    };
                    return (
                      <div key={status}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="capitalize text-gray-600 font-medium">
                            {status.replace('_', ' ')}
                          </span>
                          <span className="text-gray-500">{count} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${colors[status] ?? 'bg-gray-400'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tasks by priority */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-orange-500" />
                  Tasks by Priority
                </h3>
                <div className="space-y-3">
                  {Object.entries(tasksByPriority).map(([priority, count]) => {
                    const pct = tasks.length === 0 ? 0 : Math.round((count / tasks.length) * 100);
                    const colors: Record<string, string> = {
                      low:      'bg-green-400',
                      medium:   'bg-yellow-400',
                      high:     'bg-orange-400',
                      critical: 'bg-red-500',
                    };
                    return (
                      <div key={priority}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="capitalize text-gray-600 font-medium">{priority}</span>
                          <span className="text-gray-500">{count} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${colors[priority] ?? 'bg-gray-400'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Overdue tasks */}
            {overdueTasks.length > 0 && (
              <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-red-700 mb-4 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Overdue Tasks ({overdueTasks.length})
                </h3>
                <div className="space-y-2">
                  {overdueTasks.slice(0, 5).map((task) => (
                    <Link
                      key={task.id}
                      to={`/tasks/${task.id}`}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-red-50 border border-red-50 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <Circle className="w-4 h-4 text-red-400" />
                        <span className="text-sm text-gray-800 group-hover:text-red-700 font-medium">
                          {task.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge value={task.priority} type="priority" />
                        <span className="text-xs text-red-500 font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {task.due_date
                            ? new Date(task.due_date).toLocaleDateString()
                            : ''}
                        </span>
                      </div>
                    </Link>
                  ))}
                  {overdueTasks.length > 5 && (
                    <p className="text-xs text-gray-400 text-center pt-1">
                      +{overdueTasks.length - 5} more overdue tasks
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Recent tasks */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">Recent Tasks</h3>
                <Link
                  to={`/tasks?project_id=${project.id}`}
                  className="text-xs text-primary-600 hover:text-primary-800 font-medium"
                >
                  View all →
                </Link>
              </div>
              {tasks.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No tasks yet.</p>
              ) : (
                <div className="space-y-2">
                  {tasks.slice(0, 8).map((task) => (
                    <Link
                      key={task.id}
                      to={`/tasks/${task.id}`}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex-shrink-0">
                        {['done', 'closed'].includes(task.status) ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <Circle className="w-4 h-4 text-gray-300 group-hover:text-primary-400" />
                        )}
                      </div>
                      <span
                        className={`text-sm flex-1 truncate ${
                          ['done', 'closed'].includes(task.status)
                            ? 'line-through text-gray-400'
                            : 'text-gray-700 group-hover:text-gray-900'
                        }`}
                      >
                        {task.title}
                      </span>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Badge value={task.priority} type="priority" />
                        <Badge value={task.status} />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-50">
              <h3 className="text-sm font-semibold text-gray-900">
                All Tasks ({tasks.length})
              </h3>
              <Link
                to={`/tasks?project_id=${project.id}`}
                className="btn-primary text-sm flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Task
              </Link>
            </div>
            {tasks.length === 0 ? (
              <div className="text-center py-12">
                <CheckSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400">No tasks yet</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Title', 'Status', 'Priority', 'Type', 'Assignee', 'Due Date', 'Progress'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {tasks.map((task) => (
                    <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          to={`/tasks/${task.id}`}
                          className="text-sm font-medium text-gray-900 hover:text-primary-600 transition-colors"
                        >
                          {task.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3"><Badge value={task.status} /></td>
                      <td className="px-4 py-3"><Badge value={task.priority} type="priority" /></td>
                      <td className="px-4 py-3"><Badge value={task.type} type="type" /></td>
                      <td className="px-4 py-3">
                        {task.assignee ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold">
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
                      <td className="px-4 py-3">
                        {task.due_date ? (
                          <span className={`text-xs ${
                            new Date(task.due_date) < new Date() &&
                            !['done','closed'].includes(task.status)
                              ? 'text-red-500 font-medium'
                              : 'text-gray-500'
                          }`}>
                            {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-100 rounded-full h-1.5">
                            <div
                              className="h-1.5 rounded-full bg-primary-500"
                              style={{ width: `${task.completion_percentage ?? 0}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">
                            {task.completion_percentage ?? 0}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'epics' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">
                Epics ({epics.length})
              </h3>
              <Link to="/epics" className="btn-primary text-sm flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> New Epic
              </Link>
            </div>
            {epics.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <Layers className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400">No epics yet</p>
              </div>
            ) : (
              epics.map((epic) => (
                <div key={epic.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-start gap-4">
                  <div
                    className={`w-1.5 self-stretch rounded-full flex-shrink-0 ${
                      epic.priority === 'critical' ? 'bg-red-400' :
                      epic.priority === 'high'     ? 'bg-orange-400' :
                      epic.priority === 'medium'   ? 'bg-yellow-400' : 'bg-green-400'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <Badge value={epic.status} />
                      <Badge value={epic.priority} type="priority" />
                    </div>
                    <h4 className="text-sm font-semibold text-gray-900">{epic.name}</h4>
                    {epic.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{epic.description}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'stories' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">
                User Stories ({stories.length})
              </h3>
              <Link to="/user-stories" className="btn-primary text-sm flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> New Story
              </Link>
            </div>
            {stories.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <ScrollText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400">No user stories yet</p>
              </div>
            ) : (
              stories.map((story) => (
                <div key={story.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge value={story.status} />
                    <Badge value={story.priority} type="priority" />
                    {story.story_points > 0 && (
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                        {story.story_points} pts
                      </span>
                    )}
                    {story.sprint && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {story.sprint}
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-semibold text-gray-900">{story.name}</h4>
                  {story.assignee && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <div className="w-5 h-5 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold">
                        {story.assignee.name.charAt(0)}
                      </div>
                      <span className="text-xs text-gray-500">{story.assignee.name}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'activity' && (
          <ProjectActivityTab projectId={Number(id)} />
        )}
      </div>
    </div>
  );
}

function ProjectActivityTab({ projectId }: { projectId: number }) {
  const [logs, setLogs] = useState<Array<{
    id: number;
    user?: { name: string };
    action: string;
    description: string;
    created_at: string;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/activity-logs/project/${projectId}`)
      .then((r) => setLogs(r.data.data ?? r.data))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [projectId]);

  const getColor = (action: string) => {
    if (action === 'created') return 'bg-green-100 text-green-700';
    if (action === 'updated') return 'bg-blue-100 text-blue-700';
    if (action === 'deleted') return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-600';
  };

  const timeAgo = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (logs.length === 0) return (
    <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
      <Activity className="w-10 h-10 text-gray-200 mx-auto mb-3" />
      <p className="text-gray-400">No activity yet</p>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="divide-y divide-gray-50">
        {logs.map((log) => (
          <div key={log.id} className="flex items-start gap-4 p-4 hover:bg-gray-50 transition-colors">
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {log.user?.name?.charAt(0).toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getColor(log.action)}`}>
                  {log.action}
                </span>
              </div>
              <p className="text-sm text-gray-700">
                <span className="font-semibold">{log.user?.name ?? 'Unknown'}</span>{' '}
                {log.description}
              </p>
            </div>
            <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(log.created_at)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}