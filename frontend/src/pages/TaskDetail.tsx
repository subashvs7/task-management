import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  User,
  Tag,
  Clock,
  Send,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Timer,
  TrendingUp,
  AlertTriangle,
  PlayCircle,
  CheckSquare,
  BarChart3,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../hooks/useAppDispatch';
import { fetchTaskById, updateTask } from '../store/slices/taskSlice';
import Header from '../components/layout/Header';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import api from '../services/api';
import toast from 'react-hot-toast';
import type { Comment, SubTask, User as UserType, TimeLog } from '../types';

// Helper: format minutes to Xh Ym
function formatTime(hours: number, minutes: number): string {
  if (hours === 0 && minutes === 0) return '0h';
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

// Helper: format total minutes
function formatMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return formatTime(h, m);
}

// Time Progress Bar
function TimeProgressBar({
  estimateHours,
  estimateMinutes,
  loggedHours,
  loggedMinutes,
}: {
  estimateHours: number;
  estimateMinutes: number;
  loggedHours: number;
  loggedMinutes: number;
}) {
  const totalEstimate = estimateHours * 60 + estimateMinutes;
  const totalLogged = loggedHours * 60 + loggedMinutes;

  if (totalEstimate === 0) return null;

  const percentage = Math.min(100, Math.round((totalLogged / totalEstimate) * 100));
  const isOver = totalLogged > totalEstimate;
  const remaining = Math.max(0, totalEstimate - totalLogged);

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-gray-500">
        <span>
          Logged:{' '}
          <span className={`font-semibold ${isOver ? 'text-red-600' : 'text-gray-900'}`}>
            {formatTime(loggedHours, loggedMinutes)}
          </span>
        </span>
        <span>
          Estimate:{' '}
          <span className="font-semibold text-gray-900">
            {formatTime(estimateHours, estimateMinutes)}
          </span>
        </span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-2.5 rounded-full transition-all duration-300 ${
            isOver ? 'bg-red-500' : percentage >= 80 ? 'bg-orange-400' : 'bg-primary-500'
          }`}
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>
      <div className="flex justify-between text-xs">
        <span className={isOver ? 'text-red-500 font-medium' : 'text-gray-400'}>
          {isOver
            ? `${formatMinutes(totalLogged - totalEstimate)} over estimate`
            : `${formatMinutes(remaining)} remaining`}
        </span>
        <span className={`font-medium ${isOver ? 'text-red-500' : 'text-gray-600'}`}>
          {percentage}%
        </span>
      </div>
    </div>
  );
}

// Completion Progress Bar
function CompletionBar({ percentage }: { percentage: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-gray-500">Completion</span>
        <span
          className={`font-semibold ${
            percentage === 100
              ? 'text-green-600'
              : percentage >= 75
              ? 'text-blue-600'
              : 'text-gray-700'
          }`}
        >
          {percentage}%
        </span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-2.5 rounded-full transition-all duration-300 ${
            percentage === 100
              ? 'bg-green-500'
              : percentage >= 75
              ? 'bg-blue-500'
              : percentage >= 50
              ? 'bg-yellow-500'
              : 'bg-gray-400'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentTask, loading } = useAppSelector((state) => state.tasks);
  const { user } = useAppSelector((state) => state.auth);

  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [subTasks, setSubTasks] = useState<SubTask[]>([]);
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [submittingComment, setSubmittingComment] = useState(false);

  // SubTask modal
  const [isSubTaskModalOpen, setIsSubTaskModalOpen] = useState(false);
  const [subTaskForm, setSubTaskForm] = useState({
    title: '',
    status: 'todo',
    assigned_to: '',
  });
  const [savingSubTask, setSavingSubTask] = useState(false);

  // Time log modal
  const [isTimeLogModalOpen, setIsTimeLogModalOpen] = useState(false);
  const [timeLogForm, setTimeLogForm] = useState({
    hours: 0,
    minutes: 0,
    logged_date: new Date().toISOString().split('T')[0],
    description: '',
  });
  const [savingTimeLog, setSavingTimeLog] = useState(false);

  // Completion modal
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
  const [completionForm, setCompletionForm] = useState({
    completion_percentage: 0,
    completion_note: '',
  });
  const [savingCompletion, setSavingCompletion] = useState(false);

  useEffect(() => {
    if (id) dispatch(fetchTaskById(Number(id)));
  }, [id, dispatch]);

  useEffect(() => {
    if (currentTask) {
      setComments(currentTask.comments ?? []);
      setSubTasks(currentTask.sub_tasks ?? currentTask.subTasks ?? []);
      setTimeLogs(currentTask.timeLogs ?? currentTask.time_logs ?? []);
      setCompletionForm({
        completion_percentage: currentTask.completion_percentage ?? 0,
        completion_note: currentTask.completion_note ?? '',
      });
    }
  }, [currentTask]);

  useEffect(() => {
    if (id) {
      api.get(`/tasks/${id}/sub-tasks`).then((r) => setSubTasks(r.data)).catch(() => {});
    }
  }, [id]);

  useEffect(() => {
    api.get('/users').then((r) => setUsers(r.data)).catch(() => {});
  }, []);

  // Status change
  const handleStatusChange = async (status: string) => {
    if (!currentTask) return;
    const result = await dispatch(
      updateTask({
        id: currentTask.id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: { status: status as any },
      })
    );
    if (updateTask.fulfilled.match(result)) {
      toast.success('Status updated');
    }
  };

  // Comment
  const handleSubmitComment = async () => {
    if (!comment.trim() || !currentTask) return;
    setSubmittingComment(true);
    try {
      const res = await api.post(`/tasks/${currentTask.id}/comments`, { body: comment });
      setComments((prev) => [...prev, res.data]);
      setComment('');
      toast.success('Comment added');
    } catch {
      toast.error('Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      await api.delete(`/comments/${commentId}`);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      toast.success('Comment deleted');
    } catch {
      toast.error('Failed to delete comment');
    }
  };

  // SubTask
  const handleCreateSubTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTask || !subTaskForm.title.trim()) {
      toast.error('Sub-task title is required');
      return;
    }
    setSavingSubTask(true);
    try {
      const res = await api.post(`/tasks/${currentTask.id}/sub-tasks`, {
        title: subTaskForm.title,
        status: subTaskForm.status,
        assigned_to: subTaskForm.assigned_to ? Number(subTaskForm.assigned_to) : null,
      });
      setSubTasks((prev) => [...prev, res.data]);
      setSubTaskForm({ title: '', status: 'todo', assigned_to: '' });
      setIsSubTaskModalOpen(false);
      toast.success('Sub-task created!');
    } catch {
      toast.error('Failed to create sub-task');
    } finally {
      setSavingSubTask(false);
    }
  };

  const handleToggleSubTask = async (subTask: SubTask) => {
    if (!currentTask) return;
    const newStatus = subTask.status === 'done' ? 'todo' : 'done';
    try {
      const res = await api.put(
        `/tasks/${currentTask.id}/sub-tasks/${subTask.id}`,
        { status: newStatus }
      );
      setSubTasks((prev) => prev.map((s) => (s.id === subTask.id ? res.data : s)));
    } catch {
      toast.error('Failed to update sub-task');
    }
  };

  const handleDeleteSubTask = async (subTaskId: number) => {
    if (!currentTask) return;
    try {
      await api.delete(`/tasks/${currentTask.id}/sub-tasks/${subTaskId}`);
      setSubTasks((prev) => prev.filter((s) => s.id !== subTaskId));
      toast.success('Sub-task deleted');
    } catch {
      toast.error('Failed to delete sub-task');
    }
  };

  // Time log
  const handleLogTime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTask) return;
    if (timeLogForm.hours === 0 && timeLogForm.minutes === 0) {
      toast.error('Please enter time greater than 0');
      return;
    }
    setSavingTimeLog(true);
    try {
      const res = await api.post(`/tasks/${currentTask.id}/log-time`, {
        hours: Number(timeLogForm.hours),
        minutes: Number(timeLogForm.minutes),
        logged_date: timeLogForm.logged_date,
        description: timeLogForm.description || null,
      });
      setTimeLogs(res.data.task.timeLogs ?? res.data.task.time_logs ?? []);
      // Refresh task to update logged hours
      dispatch(fetchTaskById(currentTask.id));
      setTimeLogForm({
        hours: 0,
        minutes: 0,
        logged_date: new Date().toISOString().split('T')[0],
        description: '',
      });
      setIsTimeLogModalOpen(false);
      toast.success('Time logged successfully!');
    } catch {
      toast.error('Failed to log time');
    } finally {
      setSavingTimeLog(false);
    }
  };

  const handleDeleteTimeLog = async (timeLogId: number) => {
    if (!currentTask) return;
    try {
      const res = await api.delete(
        `/tasks/${currentTask.id}/time-logs/${timeLogId}`
      );
      setTimeLogs(res.data.task.timeLogs ?? res.data.task.time_logs ?? []);
      dispatch(fetchTaskById(currentTask.id));
      toast.success('Time log deleted');
    } catch {
      toast.error('Failed to delete time log');
    }
  };

  // Completion
  const handleUpdateCompletion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTask) return;
    setSavingCompletion(true);
    try {
      await api.patch(`/tasks/${currentTask.id}/completion`, {
        completion_percentage: Number(completionForm.completion_percentage),
        completion_note: completionForm.completion_note || null,
      });
      dispatch(fetchTaskById(currentTask.id));
      setIsCompletionModalOpen(false);
      toast.success('Completion updated!');
    } catch {
      toast.error('Failed to update completion');
    } finally {
      setSavingCompletion(false);
    }
  };

  if (loading || !currentTask) {
    return (
      <div>
        <Header title="Task Detail" />
        <div className="flex justify-center items-center h-64">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const doneSubTasks = subTasks.filter((s) => s.status === 'done').length;
  const totalEstimateMin =
    (currentTask.estimate_hours ?? 0) * 60 + (currentTask.estimate_minutes ?? 0);
  const totalLoggedMin =
    (currentTask.logged_hours ?? 0) * 60 + (currentTask.logged_minutes ?? 0);

  return (
    <div>
      <Header title="Task Detail" />
      <div className="p-6 max-w-6xl mx-auto">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ===== LEFT: Main content ===== */}
          <div className="lg:col-span-2 space-y-5">

            {/* Title + badges */}
            <div className="card">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Badge value={currentTask.type} type="type" />
                <Badge value={currentTask.priority} type="priority" />
                <Badge value={currentTask.status} />
                {currentTask.due_date &&
                  new Date(currentTask.due_date) < new Date() &&
                  !['done', 'closed'].includes(currentTask.status) && (
                    <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full font-medium">
                      <AlertTriangle className="w-3 h-3" />
                      Overdue
                    </span>
                  )}
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-3">
                {currentTask.title}
              </h1>
              {currentTask.description && (
                <p className="text-gray-600 leading-relaxed text-sm">
                  {currentTask.description}
                </p>
              )}
            </div>

            {/* ===== TIME TRACKING CARD ===== */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Timer className="w-4 h-4 text-primary-600" />
                  <h3 className="text-sm font-semibold text-gray-900">
                    Time Tracking
                  </h3>
                </div>
                <button
                  onClick={() => setIsTimeLogModalOpen(true)}
                  className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-800 font-medium transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Log Time
                </button>
              </div>

              {/* Time stats grid */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-blue-600 font-medium mb-1">Estimated</p>
                  <p className="text-lg font-bold text-blue-700">
                    {formatTime(
                      currentTask.estimate_hours ?? 0,
                      currentTask.estimate_minutes ?? 0
                    )}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-green-600 font-medium mb-1">Logged</p>
                  <p className="text-lg font-bold text-green-700">
                    {formatTime(
                      currentTask.logged_hours ?? 0,
                      currentTask.logged_minutes ?? 0
                    )}
                  </p>
                </div>
                <div
                  className={`rounded-lg p-3 text-center ${
                    totalLoggedMin > totalEstimateMin && totalEstimateMin > 0
                      ? 'bg-red-50'
                      : 'bg-gray-50'
                  }`}
                >
                  <p
                    className={`text-xs font-medium mb-1 ${
                      totalLoggedMin > totalEstimateMin && totalEstimateMin > 0
                        ? 'text-red-600'
                        : 'text-gray-600'
                    }`}
                  >
                    Remaining
                  </p>
                  <p
                    className={`text-lg font-bold ${
                      totalLoggedMin > totalEstimateMin && totalEstimateMin > 0
                        ? 'text-red-700'
                        : 'text-gray-700'
                    }`}
                  >
                    {totalEstimateMin > 0
                      ? totalLoggedMin > totalEstimateMin
                        ? `+${formatMinutes(totalLoggedMin - totalEstimateMin)}`
                        : formatMinutes(totalEstimateMin - totalLoggedMin)
                      : '—'}
                  </p>
                </div>
              </div>

              {/* Time progress bar */}
              {totalEstimateMin > 0 && (
                <TimeProgressBar
                  estimateHours={currentTask.estimate_hours ?? 0}
                  estimateMinutes={currentTask.estimate_minutes ?? 0}
                  loggedHours={currentTask.logged_hours ?? 0}
                  loggedMinutes={currentTask.logged_minutes ?? 0}
                />
              )}

              {/* Time log history */}
              {timeLogs.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Time Log History ({timeLogs.length})
                  </p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {timeLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg group"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {log.user?.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-800">
                              {log.user?.name}
                              {' '}
                              <span className="font-bold text-primary-600">
                                +{formatTime(log.hours, log.minutes)}
                              </span>
                            </p>
                            {log.description && (
                              <p className="text-xs text-gray-500 truncate max-w-[200px]">
                                {log.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">
                            {new Date(log.logged_date).toLocaleDateString()}
                          </span>
                          <button
                            onClick={() => handleDeleteTimeLog(log.id)}
                            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {timeLogs.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-3">
                  No time logged yet. Click "Log Time" to track your work.
                </p>
              )}
            </div>

            {/* ===== COMPLETION TRACKING CARD ===== */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary-600" />
                  <h3 className="text-sm font-semibold text-gray-900">
                    Completion Progress
                  </h3>
                </div>
                <button
                  onClick={() => setIsCompletionModalOpen(true)}
                  className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-800 font-medium transition-colors"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  Update
                </button>
              </div>

              <CompletionBar
                percentage={currentTask.completion_percentage ?? 0}
              />

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <PlayCircle className="w-3.5 h-3.5 text-blue-500" />
                    <p className="text-xs text-gray-500 font-medium">Started</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-800">
                    {currentTask.started_at
                      ? new Date(currentTask.started_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <CheckSquare className="w-3.5 h-3.5 text-green-500" />
                    <p className="text-xs text-gray-500 font-medium">Completed</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-800">
                    {currentTask.completed_at
                      ? new Date(currentTask.completed_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </p>
                </div>
              </div>

              {/* Duration */}
              {currentTask.started_at && currentTask.completed_at && (
                <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-100">
                  <p className="text-xs text-green-700 font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Task completed in{' '}
                    {(() => {
                      const start = new Date(currentTask.started_at!);
                      const end = new Date(currentTask.completed_at!);
                      const diffMs = end.getTime() - start.getTime();
                      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                      const diffDays = Math.floor(diffHours / 24);
                      if (diffDays > 0) return `${diffDays}d ${diffHours % 24}h`;
                      if (diffHours > 0) return `${diffHours}h ${Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))}m`;
                      return `${Math.floor(diffMs / (1000 * 60))}m`;
                    })()}
                  </p>
                </div>
              )}

              {/* Completion note */}
              {currentTask.completion_note && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-xs text-blue-600 font-medium mb-1">Note</p>
                  <p className="text-sm text-blue-800">{currentTask.completion_note}</p>
                </div>
              )}
            </div>

            {/* ===== SUB-TASKS ===== */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Sub-tasks
                  </h3>
                  {subTasks.length > 0 && (
                    <span className="text-xs text-gray-500">
                      {doneSubTasks}/{subTasks.length} done
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setIsSubTaskModalOpen(true)}
                  className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-800 font-medium transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Sub-task
                </button>
              </div>

              {subTasks.length > 0 && (
                <div className="w-full bg-gray-100 rounded-full h-1.5 mb-4">
                  <div
                    className="bg-primary-600 h-1.5 rounded-full transition-all duration-300"
                    style={{
                      width: `${(doneSubTasks / subTasks.length) * 100}%`,
                    }}
                  />
                </div>
              )}

              {subTasks.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  No sub-tasks yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {subTasks.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 group transition-colors"
                    >
                      <button
                        onClick={() => handleToggleSubTask(sub)}
                        className="flex-shrink-0"
                      >
                        {sub.status === 'done' ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-300 hover:text-primary-400" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <span
                          className={`text-sm ${
                            sub.status === 'done'
                              ? 'line-through text-gray-400'
                              : 'text-gray-700'
                          }`}
                        >
                          {sub.title}
                        </span>
                        {sub.assignee && (
                          <span className="ml-2 text-xs text-gray-400">
                            → {sub.assignee.name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Badge value={sub.status} />
                        <button
                          onClick={() => handleDeleteSubTask(sub.id)}
                          className="text-red-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ===== COMMENTS ===== */}
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                Comments ({comments.length})
              </h3>

              <div className="space-y-4 mb-4">
                {comments.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">
                    No comments yet.
                  </p>
                )}
                {comments.map((c) => (
                  <div key={c.id} className="flex gap-3 group">
                    <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {c.user?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            {c.user?.name}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(c.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {c.user?.id === user?.id && (
                          <button
                            onClick={() => handleDeleteComment(c.id)}
                            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {c.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-3 border-t border-gray-100">
                <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="input flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmitComment();
                      }
                    }}
                  />
                  <button
                    onClick={handleSubmitComment}
                    disabled={submittingComment || !comment.trim()}
                    className="btn-primary px-3 disabled:opacity-60"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ===== RIGHT: Sidebar ===== */}
          <div className="space-y-4">

            {/* Details */}
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">
                Details
              </h3>
              <div className="space-y-4">

                {/* Status */}
                <div>
                  <p className="text-xs text-gray-400 mb-1">Status</p>
                  <select
                    value={currentTask.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="input text-sm"
                  >
                    <option value="backlog">Backlog</option>
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="in_review">In Review</option>
                    <option value="done">Done</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                {/* Assignee */}
                {currentTask.assignee && (
                  <div className="flex items-start gap-2">
                    <User className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400">Assignee</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold">
                          {currentTask.assignee.name.charAt(0)}
                        </div>
                        <span className="text-sm text-gray-900">
                          {currentTask.assignee.name}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Reporter */}
                {currentTask.reporter && (
                  <div className="flex items-start gap-2">
                    <User className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400">Reporter</p>
                      <span className="text-sm text-gray-900">
                        {currentTask.reporter.name}
                      </span>
                    </div>
                  </div>
                )}

                {/* Due date */}
                {currentTask.due_date && (
                  <div className="flex items-start gap-2">
                    <Calendar className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400">Due Date</p>
                      <span
                        className={`text-sm ${
                          new Date(currentTask.due_date) < new Date() &&
                          !['done', 'closed'].includes(currentTask.status)
                            ? 'text-red-500 font-medium'
                            : 'text-gray-900'
                        }`}
                      >
                        {new Date(currentTask.due_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                )}

                {/* Estimate */}
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">Estimate</p>
                    <span className="text-sm text-gray-900">
                      {(currentTask.estimate_hours ?? 0) === 0 &&
                      (currentTask.estimate_minutes ?? 0) === 0
                        ? 'Not set'
                        : formatTime(
                            currentTask.estimate_hours ?? 0,
                            currentTask.estimate_minutes ?? 0
                          )}
                    </span>
                  </div>
                </div>

                {/* Logged time */}
                <div className="flex items-start gap-2">
                  <Timer className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">Time Logged</p>
                    <span className="text-sm text-gray-900">
                      {(currentTask.logged_hours ?? 0) === 0 &&
                      (currentTask.logged_minutes ?? 0) === 0
                        ? 'None'
                        : formatTime(
                            currentTask.logged_hours ?? 0,
                            currentTask.logged_minutes ?? 0
                          )}
                    </span>
                  </div>
                </div>

                {/* Project */}
                {currentTask.project && (
                  <div className="flex items-start gap-2">
                    <Tag className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400">Project</p>
                      <span className="text-sm text-gray-900">
                        {currentTask.project.name}
                      </span>
                    </div>
                  </div>
                )}

                {/* Created */}
                <div>
                  <p className="text-xs text-gray-400">Created</p>
                  <span className="text-sm text-gray-900">
                    {new Date(currentTask.created_at!).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Attachments */}
            {(currentTask.attachments?.length ?? 0) > 0 && (
              <div className="card">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Attachments ({currentTask.attachments?.length})
                </h3>
                <div className="space-y-2">
                  {currentTask.attachments?.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center gap-2 text-sm p-2 rounded bg-gray-50"
                    >
                      <span className="text-gray-600 truncate">{att.name}</span>
                      <span className="text-xs text-gray-400 ml-auto flex-shrink-0">
                        {(att.size / 1024).toFixed(1)}KB
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== LOG TIME MODAL ===== */}
      <Modal
        isOpen={isTimeLogModalOpen}
        onClose={() => setIsTimeLogModalOpen(false)}
        title="Log Time"
        size="sm"
      >
        <form onSubmit={handleLogTime} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Hours *</label>
              <input
                type="number"
                value={timeLogForm.hours}
                onChange={(e) =>
                  setTimeLogForm((p) => ({ ...p, hours: Number(e.target.value) }))
                }
                className="input"
                min="0"
                max="999"
              />
            </div>
            <div>
              <label className="label">Minutes *</label>
              <input
                type="number"
                value={timeLogForm.minutes}
                onChange={(e) =>
                  setTimeLogForm((p) => ({ ...p, minutes: Number(e.target.value) }))
                }
                className="input"
                min="0"
                max="59"
              />
            </div>
          </div>

          <div>
            <label className="label">Date *</label>
            <input
              type="date"
              value={timeLogForm.logged_date}
              onChange={(e) =>
                setTimeLogForm((p) => ({ ...p, logged_date: e.target.value }))
              }
              className="input"
              max={new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              value={timeLogForm.description}
              onChange={(e) =>
                setTimeLogForm((p) => ({ ...p, description: e.target.value }))
              }
              className="input"
              rows={2}
              placeholder="What did you work on?"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={
                savingTimeLog ||
                (timeLogForm.hours === 0 && timeLogForm.minutes === 0)
              }
              className="btn-primary flex-1 disabled:opacity-60"
            >
              {savingTimeLog ? 'Logging...' : 'Log Time'}
            </button>
            <button
              type="button"
              onClick={() => setIsTimeLogModalOpen(false)}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* ===== UPDATE COMPLETION MODAL ===== */}
      <Modal
        isOpen={isCompletionModalOpen}
        onClose={() => setIsCompletionModalOpen(false)}
        title="Update Completion"
        size="sm"
      >
        <form onSubmit={handleUpdateCompletion} className="space-y-4">
          <div>
            <label className="label">
              Completion Percentage: {completionForm.completion_percentage}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={completionForm.completion_percentage}
              onChange={(e) =>
                setCompletionForm((p) => ({
                  ...p,
                  completion_percentage: Number(e.target.value),
                }))
              }
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Quick select buttons */}
          <div className="flex gap-2">
            {[0, 25, 50, 75, 100].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() =>
                  setCompletionForm((p) => ({
                    ...p,
                    completion_percentage: val,
                  }))
                }
                className={`flex-1 py-1 text-xs rounded-lg font-medium transition-colors ${
                  completionForm.completion_percentage === val
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {val}%
              </button>
            ))}
          </div>

          {/* Completion preview */}
          <CompletionBar percentage={completionForm.completion_percentage} />

          <div>
            <label className="label">Note (optional)</label>
            <textarea
              value={completionForm.completion_note}
              onChange={(e) =>
                setCompletionForm((p) => ({
                  ...p,
                  completion_note: e.target.value,
                }))
              }
              className="input"
              rows={2}
              placeholder="What's the current status?"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={savingCompletion}
              className="btn-primary flex-1 disabled:opacity-60"
            >
              {savingCompletion ? 'Saving...' : 'Update Progress'}
            </button>
            <button
              type="button"
              onClick={() => setIsCompletionModalOpen(false)}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* ===== SUB-TASK MODAL ===== */}
      <Modal
        isOpen={isSubTaskModalOpen}
        onClose={() => {
          setIsSubTaskModalOpen(false);
          setSubTaskForm({ title: '', status: 'todo', assigned_to: '' });
        }}
        title="Add Sub-task"
        size="sm"
      >
        <form onSubmit={handleCreateSubTask} className="space-y-4">
          <div>
            <label className="label">Title *</label>
            <input
              type="text"
              value={subTaskForm.title}
              onChange={(e) =>
                setSubTaskForm((p) => ({ ...p, title: e.target.value }))
              }
              className="input"
              placeholder="Sub-task title..."
              required
              autoFocus
            />
          </div>
          <div>
            <label className="label">Status</label>
            <select
              value={subTaskForm.status}
              onChange={(e) =>
                setSubTaskForm((p) => ({ ...p, status: e.target.value }))
              }
              className="input"
            >
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </div>
          <div>
            <label className="label">Assign To</label>
            <select
              value={subTaskForm.assigned_to}
              onChange={(e) =>
                setSubTaskForm((p) => ({ ...p, assigned_to: e.target.value }))
              }
              className="input"
            >
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={String(u.id)}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={savingSubTask || !subTaskForm.title.trim()}
              className="btn-primary flex-1 disabled:opacity-60"
            >
              {savingSubTask ? 'Creating...' : 'Create Sub-task'}
            </button>
            <button
              type="button"
              onClick={() => setIsSubTaskModalOpen(false)}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}