import { useEffect, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../hooks/useAppDispatch';
import { fetchTasks, createTask } from '../store/slices/taskSlice';
import { fetchProjects } from '../store/slices/projectSlice';
import Header from '../components/layout/Header';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import type { Task } from '../types';

const STATUS_COLUMNS = [
  { key: 'backlog', label: 'Backlog', color: 'border-gray-300' },
  { key: 'todo', label: 'To Do', color: 'border-blue-300' },
  { key: 'in_progress', label: 'In Progress', color: 'border-yellow-300' },
  { key: 'in_review', label: 'In Review', color: 'border-purple-300' },
  { key: 'done', label: 'Done', color: 'border-green-300' },
];

export default function Backlog() {
  const dispatch = useAppDispatch();
  const { tasks, loading } = useAppSelector((state) => state.tasks);
  const { projects } = useAppSelector((state) => state.projects);
  const { user } = useAppSelector((state) => state.auth);

  const [search, setSearch] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    project_id: '',
    priority: 'medium',
    type: 'task',
    status: 'backlog',
    due_date: '',
    estimate_hours: 0,
  });

  useEffect(() => {
    dispatch(fetchTasks({ status: 'backlog' }));
    dispatch(fetchProjects());
  }, [dispatch]);

  useEffect(() => {
    const params: Record<string, unknown> = {};
    if (selectedProject) params.project_id = selectedProject;
    if (selectedStatus) params.status = selectedStatus;
    if (selectedPriority) params.priority = selectedPriority;
    dispatch(fetchTasks(params));
  }, [selectedProject, selectedStatus, selectedPriority, dispatch]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.project_id) {
      toast.error('Please select a project');
      return;
    }
    const result = await dispatch(
      createTask({
        ...form,
        project_id: Number(form.project_id),
        reporter_id: user?.id,
        estimate_hours: Number(form.estimate_hours),
      })
    );
    if (createTask.fulfilled.match(result)) {
      toast.success('Task added to backlog!');
      setIsModalOpen(false);
      setForm({
        title: '',
        description: '',
        project_id: '',
        priority: 'medium',
        type: 'task',
        status: 'backlog',
        due_date: '',
        estimate_hours: 0,
      });
      dispatch(fetchTasks({}));
    } else {
      toast.error('Failed to create task');
    }
  };

  const filtered = tasks.filter((t) => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase());
    const matchProject = selectedProject ? String(t.project_id) === selectedProject : true;
    const matchStatus = selectedStatus ? t.status === selectedStatus : true;
    const matchPriority = selectedPriority ? t.priority === selectedPriority : true;
    return matchSearch && matchProject && matchStatus && matchPriority;
  });

  // Group by status
  const grouped = STATUS_COLUMNS.reduce<Record<string, Task[]>>((acc, col) => {
    acc[col.key] = filtered.filter((t) => t.status === col.key);
    return acc;
  }, {});

  const totalCount = filtered.length;

  return (
    <div>
      <Header title="Backlog" />
      <div className="p-6">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-9 w-52"
              />
            </div>

            {/* Project filter */}
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="input w-44"
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.name}
                </option>
              ))}
            </select>

            {/* Status filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="input w-40"
            >
              <option value="">All Statuses</option>
              <option value="backlog">Backlog</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="in_review">In Review</option>
              <option value="done">Done</option>
              <option value="closed">Closed</option>
            </select>

            {/* Priority filter */}
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="input w-36"
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add to Backlog
          </button>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-4 mb-6">
          <span className="text-sm text-gray-500">
            Showing <span className="font-semibold text-gray-900">{totalCount}</span> tasks
          </span>
          <div className="flex gap-3">
            {STATUS_COLUMNS.map((col) => (
              <span key={col.key} className="text-xs text-gray-500">
                <span className="font-semibold text-gray-700">{grouped[col.key]?.length ?? 0}</span>{' '}
                {col.label}
              </span>
            ))}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : totalCount === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-sm">No tasks found. Add your first task to the backlog!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {STATUS_COLUMNS.map((col) => {
              const colTasks = grouped[col.key] ?? [];
              if (colTasks.length === 0) return null;
              return (
                <div key={col.key}>
                  {/* Section header */}
                  <div className={`flex items-center gap-3 mb-3 pb-2 border-b-2 ${col.color}`}>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                      {col.label}
                    </h3>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                      {colTasks.length}
                    </span>
                  </div>

                  {/* Task table */}
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          <th className="text-left py-2.5 px-4 font-medium text-gray-500 w-1/2">
                            Title
                          </th>
                          <th className="text-left py-2.5 px-4 font-medium text-gray-500">
                            Project
                          </th>
                          <th className="text-left py-2.5 px-4 font-medium text-gray-500">
                            Type
                          </th>
                          <th className="text-left py-2.5 px-4 font-medium text-gray-500">
                            Priority
                          </th>
                          <th className="text-left py-2.5 px-4 font-medium text-gray-500">
                            Assignee
                          </th>
                          <th className="text-left py-2.5 px-4 font-medium text-gray-500">
                            Due Date
                          </th>
                          <th className="text-left py-2.5 px-4 font-medium text-gray-500">
                            Est.
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {colTasks.map((task, idx) => (
                          <tr
                            key={task.id}
                            className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                              idx === colTasks.length - 1 ? 'border-b-0' : ''
                            }`}
                          >
                            <td className="py-3 px-4">
                              <Link
                                to={`/tasks/${task.id}`}
                                className="font-medium text-gray-900 hover:text-primary-600 transition-colors"
                              >
                                {task.title}
                              </Link>
                              {task.description && (
                                <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                                  {task.description}
                                </p>
                              )}
                            </td>
                            <td className="py-3 px-4 text-gray-500 text-xs">
                              {task.project?.name ?? '—'}
                            </td>
                            <td className="py-3 px-4">
                              <Badge value={task.type} type="type" />
                            </td>
                            <td className="py-3 px-4">
                              <Badge value={task.priority} type="priority" />
                            </td>
                            <td className="py-3 px-4">
                              {task.assignee ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold">
                                    {task.assignee.name.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="text-xs text-gray-600 truncate max-w-[80px]">
                                    {task.assignee.name}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">Unassigned</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-xs text-gray-500">
                              {task.due_date ? (
                                <span
                                  className={
                                    new Date(task.due_date) < new Date() &&
                                    !['done', 'closed'].includes(task.status)
                                      ? 'text-red-500 font-medium'
                                      : ''
                                  }
                                >
                                  {new Date(task.due_date).toLocaleDateString()}
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="py-3 px-4 text-xs text-gray-500">
                              {task.estimate_hours > 0 ? `${task.estimate_hours}h` : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create Task Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Add Task to Backlog"
          size="lg"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Title *</label>
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                className="input"
                placeholder="Task title..."
                required
              />
            </div>

            <div>
              <label className="label">Project *</label>
              <select
                name="project_id"
                value={form.project_id}
                onChange={handleChange}
                className="input"
                required
              >
                <option value="">Select a project</option>
                {projects.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                className="input"
                rows={3}
                placeholder="Describe the task..."
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">Type</label>
                <select name="type" value={form.type} onChange={handleChange} className="input">
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
                  name="priority"
                  value={form.priority}
                  onChange={handleChange}
                  className="input"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="label">Initial Status</label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className="input"
                >
                  <option value="backlog">Backlog</option>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Due Date</label>
                <input
                  type="date"
                  name="due_date"
                  value={form.due_date}
                  onChange={handleChange}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Estimate (hours)</label>
                <input
                  type="number"
                  name="estimate_hours"
                  value={form.estimate_hours}
                  onChange={handleChange}
                  className="input"
                  min="0"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary flex-1">
                Add to Backlog
              </button>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
}