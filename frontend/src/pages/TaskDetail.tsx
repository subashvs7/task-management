import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Calendar, User, Tag, Send, Plus, Trash2,
  CheckCircle2, Circle, Timer, AlertTriangle,
  PlayCircle, CheckSquare, Edit3, X, Save,
  Paperclip, MessageSquare, Activity, Shield,
  Copy, Share2, ChevronRight, RefreshCw,
  Star, ExternalLink, Award, Hash, GitBranch,
  MoreVertical, ChevronDown, Pencil, Eye, Lock,
  AlarmClock, Gauge, ListChecks, Flame, Target,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../hooks/useAppDispatch';
import { fetchTaskById, updateTask } from '../store/slices/taskSlice';
import Header from '../components/layout/Header';
import Modal from '../components/ui/Modal';
import TaskAttachments from '../components/TaskAttachments';
import api from '../services/api';
import toast from 'react-hot-toast';
import type { Comment, SubTask, User as UserType, TimeLog } from '../types';

// ══════════════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════════════

interface ActivityEntry {
  id: number;
  user?: UserType;
  action: string;
  description: string;
  created_at: string;
}

type TabKey = 'overview' | 'subtasks' | 'time' | 'comments' | 'files' | 'activity';

// ══════════════════════════════════════════════════════════════════════
// Config Maps
// ══════════════════════════════════════════════════════════════════════

const STATUS_MAP: Record<string, { label: string; accent: string; bg: string; ring: string; dot: string }> = {
  backlog:     { label: 'Backlog',     accent: 'text-slate-500',  bg: 'bg-slate-50',   ring: 'ring-slate-200',  dot: '#94a3b8' },
  todo:        { label: 'To Do',       accent: 'text-zinc-600',   bg: 'bg-zinc-50',    ring: 'ring-zinc-200',   dot: '#71717a' },
  in_progress: { label: 'In Progress', accent: 'text-sky-600',    bg: 'bg-sky-50',     ring: 'ring-sky-200',    dot: '#0ea5e9' },
  in_review:   { label: 'In Review',   accent: 'text-violet-600', bg: 'bg-violet-50',  ring: 'ring-violet-200', dot: '#7c3aed' },
  done:        { label: 'Done',        accent: 'text-emerald-600',bg: 'bg-emerald-50', ring: 'ring-emerald-200',dot: '#10b981' },
  closed:      { label: 'Closed',      accent: 'text-stone-500',  bg: 'bg-stone-100',  ring: 'ring-stone-200',  dot: '#78716c' },
};

const PRIORITY_MAP: Record<string, { label: string; color: string; bar: string; glow: string; icon: string }> = {
  low:      { label: 'Low',      color: 'text-emerald-600 bg-emerald-50 ring-emerald-200', bar: '#10b981', glow: '', icon: '▁' },
  medium:   { label: 'Medium',   color: 'text-amber-600 bg-amber-50 ring-amber-200',       bar: '#f59e0b', glow: '', icon: '▄' },
  high:     { label: 'High',     color: 'text-orange-600 bg-orange-50 ring-orange-200',    bar: '#f97316', glow: '', icon: '▆' },
  critical: { label: 'Critical', color: 'text-red-600 bg-red-50 ring-red-200',             bar: '#ef4444', glow: 'shadow-[0_0_12px_rgba(239,68,68,0.3)]', icon: '█' },
};

const TYPE_MAP: Record<string, { emoji: string; color: string }> = {
  task:          { emoji: '◻', color: 'text-blue-500' },
  bug:           { emoji: '⬡', color: 'text-red-500' },
  feature:       { emoji: '◈', color: 'text-violet-500' },
  improvement:   { emoji: '◉', color: 'text-amber-500' },
  test:          { emoji: '◎', color: 'text-cyan-500' },
  research:      { emoji: '◐', color: 'text-indigo-500' },
  design:        { emoji: '◑', color: 'text-pink-500' },
  documentation: { emoji: '◫', color: 'text-teal-500' },
};

const PRESET_LABELS = ['frontend','backend','api','ui/ux','database','devops','testing','security','performance','hotfix'];

// ══════════════════════════════════════════════════════════════════════
// Utility helpers
// ══════════════════════════════════════════════════════════════════════

const fmtTime = (h: number, m: number) => h === 0 && m === 0 ? '0h' : h === 0 ? `${m}m` : m === 0 ? `${h}h` : `${h}h ${m}m`;
const fmtMin  = (t: number) => fmtTime(Math.floor(t / 60), t % 60);

function timeAgo(d: string): string {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60)    return 'just now';
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800)return `${Math.floor(s / 86400)}d ago`;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function labelHue(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 4) - h);
  return Math.abs(h) % 360;
}

// ══════════════════════════════════════════════════════════════════════
// Small reusable components
// ══════════════════════════════════════════════════════════════════════

/** Animated SVG ring showing completion % */
function Ring({ pct, size = 64, thick = 6 }: { pct: number; size?: number; thick?: number }) {
  const r   = (size - thick) / 2;
  const c   = 2 * Math.PI * r;
  const off = c * (1 - pct / 100);
  const col = pct === 100 ? '#10b981' : pct >= 60 ? '#6366f1' : pct >= 30 ? '#f59e0b' : '#94a3b8';
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={thick} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={thick}
        strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset .7s cubic-bezier(.4,0,.2,1), stroke .4s' }} />
    </svg>
  );
}

/** Thin horizontal bar */
function Bar({ pct, color = '#6366f1', height = 3 }: { pct: number; color?: string; height?: number }) {
  return (
    <div className="w-full rounded-full overflow-hidden" style={{ height, background: '#f1f5f9' }}>
      <div style={{ width: `${Math.min(100, pct)}%`, height, background: color, borderRadius: 9999, transition: 'width .6s cubic-bezier(.4,0,.2,1)' }} />
    </div>
  );
}

/** Avatar circle */
function Ava({ user, size = 32 }: { user: UserType; size?: number }) {
  const PALETTE = ['#4f46e5','#0891b2','#059669','#d97706','#dc2626','#7c3aed','#db2777','#0284c7'];
  const bg = PALETTE[user.id % PALETTE.length];
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: bg, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: size * 0.38, fontWeight: 700 }}
      title={user.name}>
      {user.name.charAt(0).toUpperCase()}
    </div>
  );
}

/** Inline editable text / textarea */
function Editable({ value, onSave, multiline = false, placeholder = 'Click to edit…' }: {
  value: string; onSave: (v: string) => void; multiline?: boolean; placeholder?: string;
}) {
  const [on, setOn] = useState(false);
  const [v, setV]   = useState(value);
  useEffect(() => { setV(value); }, [value]);
  const commit = () => { onSave(v.trim()); setOn(false); };
  const cancel = () => { setV(value); setOn(false); };

  if (!on) return (
    <div className="group relative cursor-text" onClick={() => setOn(true)}>
      {value
        ? <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap pr-6">{value}</p>
        : <p className="text-sm text-gray-400 italic">{placeholder}</p>}
      <Pencil className="w-3 h-3 text-gray-300 group-hover:text-gray-400 absolute top-0.5 right-0 transition-colors" />
    </div>
  );
  return (
    <div className="space-y-2">
      {multiline
        ? <textarea value={v} onChange={e => setV(e.target.value)} rows={4} autoFocus
            className="input w-full text-sm resize-none leading-relaxed" />
        : <input value={v} onChange={e => setV(e.target.value)} autoFocus className="input w-full text-sm"
            onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel(); }} />}
      <div className="flex gap-2 text-xs">
        <button onClick={commit} className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg font-semibold transition-colors">
          <Save className="w-3 h-3" /> Save
        </button>
        <button onClick={cancel} className="px-3 py-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg font-semibold transition-colors">Cancel</button>
      </div>
    </div>
  );
}

/** Collapsible section */
function Section({ title, icon: Icon, badge, children, defaultOpen = true }: {
  title: string; icon: React.ElementType; badge?: number | string;
  children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center">
            <Icon className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <span className="text-sm font-bold text-gray-800">{title}</span>
          {badge !== undefined && badge !== '' && (
            <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{badge}</span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-5 pb-5 pt-1">{children}</div>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Main component
// ══════════════════════════════════════════════════════════════════════

export default function TaskDetail() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentTask, loading } = useAppSelector(s => s.tasks);
  const { user }                 = useAppSelector(s => s.auth);

  // ── data ──
  const [comments,     setComments    ] = useState<Comment[]>([]);
  const [subTasks,     setSubTasks    ] = useState<SubTask[]>([]);
  const [timeLogs,     setTimeLogs    ] = useState<TimeLog[]>([]);
  const [actLogs,      setActLogs     ] = useState<ActivityEntry[]>([]);
  const [users,        setUsers       ] = useState<UserType[]>([]);
  const [labels,       setLabels      ] = useState<string[]>([]);

  // ── ui ──
  const [tab,          setTab         ] = useState<TabKey>('overview');
  const [spinning,     setSpinning    ] = useState(false);
  const [starred,      setStarred     ] = useState(false);
  const [copied,       setCopied      ] = useState(false);
  const [showActions,  setShowActions ] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

  // ── comment ──
  const [newComment,   setNewComment  ] = useState('');
  const [postingCmt,   setPostingCmt  ] = useState(false);

  // ── subtask modal ──
  const [stModal,      setStModal     ] = useState(false);
  const [stForm,       setStForm      ] = useState({ title: '', status: 'todo', assigned_to: '' });
  const [savingSt,     setSavingSt    ] = useState(false);

  // ── time modal ──
  const [tmModal,      setTmModal     ] = useState(false);
  const [tmForm,       setTmForm      ] = useState({ hours: 0, minutes: 0, logged_date: new Date().toISOString().split('T')[0], description: '' });
  const [savingTm,     setSavingTm    ] = useState(false);

  // ── completion modal ──
  const [cpModal,      setCpModal     ] = useState(false);
  const [cpForm,       setCpForm      ] = useState({ completion_percentage: 0, completion_note: '' });
  const [savingCp,     setSavingCp    ] = useState(false);

  // ── label modal ──
  const [lblModal,     setLblModal    ] = useState(false);
  const [lblInput,     setLblInput    ] = useState('');
  const [localLabels,  setLocalLabels ] = useState<string[]>([]);

  // ── confirm delete ──
  const [delTarget,    setDelTarget   ] = useState<{ kind: string; id: number } | null>(null);

  // ── load ──
  const reload = useCallback(async (quiet = false) => {
    if (!id) return;
    if (!quiet) setSpinning(true);
    await dispatch(fetchTaskById(Number(id)));
    setSpinning(false);
  }, [id, dispatch]);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    if (currentTask) {
      setComments(currentTask.comments ?? []);
      setSubTasks(currentTask.sub_tasks ?? currentTask.subTasks ?? []);
      setTimeLogs(currentTask.timeLogs ?? currentTask.time_logs ?? []);
      setActLogs(currentTask.activity_logs ?? []);
      setLabels(currentTask.labels ?? []);
      setLocalLabels(currentTask.labels ?? []);
      setCpForm({ completion_percentage: currentTask.completion_percentage ?? 0, completion_note: currentTask.completion_note ?? '' });
    }
  }, [currentTask]);

  useEffect(() => {
    if (id) api.get(`/tasks/${id}/sub-tasks`).then(r => setSubTasks(r.data)).catch(() => {});
    api.get('/tasks/users').then((r) => setUsers(r.data.data ?? r.data)).catch(() => {});
  }, [id]);

  // close dropdown on outside click
  useEffect(() => {
    const fn = (e: MouseEvent) => { if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) setShowActions(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  // ── guard ──
  if (loading || !currentTask) return (
    <div>
      <Header title="Task Detail" />
      <div className="flex flex-col items-center justify-center h-80 gap-3">
        <div className="w-9 h-9 border-[3px] border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-gray-400 font-medium tracking-wide uppercase">Loading task…</p>
      </div>
    </div>
  );

  // ── derived ──
  const st  = STATUS_MAP[currentTask.status]    ?? STATUS_MAP.todo;
  const pr  = PRIORITY_MAP[currentTask.priority] ?? PRIORITY_MAP.medium;
  const tp  = TYPE_MAP[currentTask.type]         ?? TYPE_MAP.task;
  const pct = currentTask.completion_percentage  ?? 0;
  const estMin = (currentTask.estimate_hours ?? 0) * 60 + (currentTask.estimate_minutes ?? 0);
  const logMin = (currentTask.logged_hours   ?? 0) * 60 + (currentTask.logged_minutes   ?? 0);
  const isOverdue = currentTask.due_date && new Date(currentTask.due_date) < new Date() && !['done','closed'].includes(currentTask.status);
  const doneSubs  = subTasks.filter(s => s.status === 'done').length;
  const subPct    = subTasks.length ? Math.round((doneSubs / subTasks.length) * 100) : 0;

  const TABS: { key: TabKey; icon: React.ElementType; label: string; count?: number }[] = [
    { key: 'overview',  icon: Eye,          label: 'Overview' },
    { key: 'subtasks',  icon: ListChecks,   label: 'Subtasks',  count: subTasks.length },
    { key: 'time',      icon: AlarmClock,   label: 'Time',      count: timeLogs.length },
    { key: 'comments',  icon: MessageSquare,label: 'Comments',  count: comments.length },
    { key: 'files',     icon: Paperclip,    label: 'Files',     count: currentTask.attachments_count ?? currentTask.attachments?.length },
    { key: 'activity',  icon: Activity,     label: 'Activity',  count: actLogs.length },
  ];

  // ── suppress unused but required import warnings ──
  void Hash; void Section;

  // ══════════════════════════════════════════════════════════════════════
  // Handlers
  // ══════════════════════════════════════════════════════════════════════

  const patchField = async (field: string, value: unknown) => {
    try { await api.put(`/tasks/${currentTask.id}`, { [field]: value }); reload(true); toast.success('Saved'); }
    catch { toast.error('Failed to save'); }
  };

  const changeStatus = async (s: string) => {
    const r = await dispatch(updateTask({ id: currentTask.id, data: { status: s as never } }));
    if (updateTask.fulfilled.match(r)) toast.success(`→ ${STATUS_MAP[s]?.label}`);
  };

  const quickPct = async (v: number) => {
    try { await api.patch(`/tasks/${currentTask.id}/completion`, { completion_percentage: v }); reload(true); toast.success(`${v}% set`); }
    catch { toast.error('Failed'); }
  };

  const postComment = async () => {
    if (!newComment.trim()) return;
    setPostingCmt(true);
    try {
      const r = await api.post(`/tasks/${currentTask.id}/comments`, { body: newComment });
      setComments(p => [r.data, ...p]);
      setNewComment('');
      toast.success('Comment posted');
    } catch { toast.error('Failed'); }
    finally { setPostingCmt(false); }
  };

  const deleteComment = async (cid: number) => {
    try { await api.delete(`/comments/${cid}`); setComments(p => p.filter(c => c.id !== cid)); toast.success('Deleted'); }
    catch { toast.error('Failed'); }
  };

  const createSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stForm.title.trim()) return;
    setSavingSt(true);
    try {
      const r = await api.post(`/tasks/${currentTask.id}/sub-tasks`, { title: stForm.title, status: stForm.status, assigned_to: stForm.assigned_to ? Number(stForm.assigned_to) : null });
      setSubTasks(p => [...p, r.data]);
      setStForm({ title: '', status: 'todo', assigned_to: '' });
      setStModal(false);
      toast.success('Subtask created');
    } catch { toast.error('Failed'); }
    finally { setSavingSt(false); }
  };

  const toggleSub = async (sub: SubTask) => {
    const ns = sub.status === 'done' ? 'todo' : 'done';
    try {
      const r = await api.put(`/tasks/${currentTask.id}/sub-tasks/${sub.id}`, { status: ns });
      setSubTasks(p => p.map(s => s.id === sub.id ? r.data : s));
    } catch { toast.error('Failed'); }
  };

  const deleteSub = async (sid: number) => {
    try { await api.delete(`/tasks/${currentTask.id}/sub-tasks/${sid}`); setSubTasks(p => p.filter(s => s.id !== sid)); setDelTarget(null); toast.success('Deleted'); }
    catch { toast.error('Failed'); }
  };

  const logTime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tmForm.hours && !tmForm.minutes) { toast.error('Enter time > 0'); return; }
    setSavingTm(true);
    try {
      const r = await api.post(`/tasks/${currentTask.id}/log-time`, { ...tmForm, hours: Number(tmForm.hours), minutes: Number(tmForm.minutes), description: tmForm.description || null });
      setTimeLogs(r.data.task?.timeLogs ?? r.data.task?.time_logs ?? timeLogs);
      reload(true);
      setTmForm({ hours: 0, minutes: 0, logged_date: new Date().toISOString().split('T')[0], description: '' });
      setTmModal(false);
      toast.success('Time logged!');
    } catch { toast.error('Failed'); }
    finally { setSavingTm(false); }
  };

  const deleteTm = async (lid: number) => {
    try {
      const r = await api.delete(`/tasks/${currentTask.id}/time-logs/${lid}`);
      setTimeLogs(r.data.task?.timeLogs ?? r.data.task?.time_logs ?? timeLogs.filter((l: TimeLog) => l.id !== lid));
      reload(true); setDelTarget(null); toast.success('Removed');
    } catch { toast.error('Failed'); }
  };

  const saveCompletion = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCp(true);
    try {
      await api.patch(`/tasks/${currentTask.id}/completion`, { completion_percentage: cpForm.completion_percentage, completion_note: cpForm.completion_note || null });
      reload(true); setCpModal(false); toast.success('Progress updated!');
    } catch { toast.error('Failed'); }
    finally { setSavingCp(false); }
  };

  const saveLabels = async () => {
    try { await patchField('labels', localLabels); setLabels(localLabels); setLblModal(false); toast.success('Labels saved'); }
    catch { toast.error('Failed'); }
  };

  const copyLink = () => { navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); toast.success('Link copied'); };

  const duplicate = async () => {
    try { const r = await api.post(`/tasks/${currentTask.id}/duplicate`); toast.success('Duplicated!'); navigate(`/tasks/${r.data.id}`); }
    catch { toast.error('Failed to duplicate'); }
  };

  const handleConfirmDelete = () => {
    if (!delTarget) return;
    if (delTarget.kind === 'subtask') deleteSub(delTarget.id);
    if (delTarget.kind === 'timelog') deleteTm(delTarget.id);
  };

  // ══════════════════════════════════════════════════════════════════════
  // Render
  // ══════════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen" style={{ background: '#f8fafc' }}>
      <Header title="Task Detail" />

      <div className="max-w-7xl mx-auto px-6 py-6">

        {/* ── Breadcrumb bar ── */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
            <button onClick={() => navigate(-1)} className="flex items-center gap-1 hover:text-gray-700 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            {currentTask.project && <>
              <ChevronRight className="w-3 h-3" />
              <Link to={`/projects/${currentTask.project.id}`} className="hover:text-indigo-500 transition-colors truncate max-w-[150px]">
                {currentTask.project.name}
              </Link>
            </>}
            <ChevronRight className="w-3 h-3" />
            <span className="text-gray-600 font-bold">#{currentTask.id}</span>
          </div>

          {/* ── Action toolbar ── */}
          <div className="flex items-center gap-2">
            <button onClick={() => reload()}
              className={`p-2 rounded-xl border border-gray-200 bg-white text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-all ${spinning ? 'animate-spin' : ''}`}>
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={() => setStarred(v => !v)}
              className={`p-2 rounded-xl border transition-all ${starred ? 'border-amber-300 bg-amber-50 text-amber-500' : 'border-gray-200 bg-white text-gray-400 hover:text-amber-500 hover:border-amber-200'}`}>
              <Star className="w-4 h-4" fill={starred ? 'currentColor' : 'none'} />
            </button>
            <button onClick={copyLink}
              className="p-2 rounded-xl border border-gray-200 bg-white text-gray-400 hover:text-indigo-500 hover:border-indigo-200 transition-all">
              {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
            </button>

            {/* More menu */}
            <div className="relative" ref={actionsRef}>
              <button onClick={() => setShowActions(v => !v)}
                className="p-2 rounded-xl border border-gray-200 bg-white text-gray-400 hover:text-gray-600 transition-all">
                <MoreVertical className="w-4 h-4" />
              </button>
              {showActions && (
                <div className="absolute right-0 top-10 z-50 w-48 bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden">
                  {[
                    { icon: Copy,      label: 'Duplicate Task', fn: () => { duplicate(); setShowActions(false); } },
                    { icon: Pencil,    label: 'Edit Task',      fn: () => { navigate(`/tasks/${currentTask.id}/edit`); setShowActions(false); } },
                    { icon: GitBranch, label: 'Link to Story',  fn: () => setShowActions(false) },
                    { icon: Lock,      label: 'Lock Task',      fn: () => setShowActions(false) },
                  ].map(a => (
                    <button key={a.label} onClick={a.fn}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                      <a.icon className="w-3.5 h-3.5 text-gray-400" />{a.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={() => navigate(`/tasks/${currentTask.id}/edit`)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-colors shadow-sm shadow-indigo-200">
              <Edit3 className="w-3.5 h-3.5" /> Edit
            </button>
          </div>
        </div>

        {/* ── Hero card ── */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mb-6">
          {/* Priority stripe */}
          <div className="h-1 w-full" style={{ background: pr.bar }} />

          <div className="p-6 pb-5">
            <div className="flex gap-5 items-start">

              {/* Left: metadata + title */}
              <div className="flex-1 min-w-0">
                {/* Chip row */}
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ring-1 ${st.bg} ${st.accent} ${st.ring}`}>
                    <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: st.dot }} />
                    {st.label}
                  </span>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ring-1 ${pr.color} ${pr.glow}`}>
                    <Flame className="w-3 h-3" /> {pr.label}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ring-1 ring-gray-200 bg-gray-50 text-gray-600">
                    <span className={tp.color}>{tp.emoji}</span>
                    <span className="capitalize">{currentTask.type}</span>
                  </span>
                  {isOverdue && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ring-1 ring-red-200 bg-red-50 text-red-600">
                      <AlertTriangle className="w-3 h-3" /> Overdue
                    </span>
                  )}
                  {starred && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ring-1 ring-amber-200 bg-amber-50 text-amber-600">
                      <Star className="w-3 h-3" fill="currentColor" /> Starred
                    </span>
                  )}
                  {/* Labels */}
                  {labels.slice(0, 3).map(l => (
                    <span key={l}
                      style={{ background: `hsl(${labelHue(l)},70%,94%)`, color: `hsl(${labelHue(l)},60%,35%)`, border: `1px solid hsl(${labelHue(l)},50%,82%)` }}
                      className="text-[11px] font-bold px-2 py-0.5 rounded-full">
                      #{l}
                    </span>
                  ))}
                  {labels.length > 3 && <span className="text-[11px] text-gray-400 font-medium">+{labels.length - 3}</span>}
                </div>

                {/* Inline-editable title */}
                <div className="mb-4">
                  <Editable value={currentTask.title} onSave={v => patchField('title', v)} placeholder="Click to set title…" />
                </div>

                {/* Status switcher */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mr-1">Status</span>
                  {Object.entries(STATUS_MAP).map(([key, sc]) => (
                    <button key={key} onClick={() => changeStatus(key)}
                      className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ring-1 transition-all ${
                        currentTask.status === key ? `${sc.bg} ${sc.accent} ${sc.ring} shadow-sm` : 'ring-gray-100 bg-gray-50 text-gray-400 hover:ring-gray-200 hover:text-gray-600'
                      }`}>
                      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: currentTask.status === key ? sc.dot : '#cbd5e1' }} />
                      {sc.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Right: completion ring */}
              <div className="flex-shrink-0 flex flex-col items-center gap-1 cursor-pointer" onClick={() => setCpModal(true)}>
                <div className="relative">
                  <Ring pct={pct} size={80} thick={7} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-black text-gray-800 leading-none">{pct}%</span>
                  </div>
                </div>
                <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Progress</span>
                <button className="text-[10px] text-indigo-500 font-semibold hover:text-indigo-700 transition-colors">Update →</button>
              </div>
            </div>

            {/* ── 4-column stat strip ── */}
            <div className="mt-5 pt-4 border-t border-gray-50 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  icon: User, label: 'Assignee',
                  content: currentTask.assignee
                    ? <div className="flex items-center gap-1.5 mt-0.5"><Ava user={currentTask.assignee} size={20} /><span className="text-sm font-bold text-gray-800 truncate max-w-[90px]">{currentTask.assignee.name}</span></div>
                    : <span className="text-sm text-gray-400 mt-0.5 block">Unassigned</span>,
                },
                {
                  icon: Calendar, label: 'Due Date',
                  content: currentTask.due_date
                    ? <span className={`text-sm font-bold mt-0.5 block ${isOverdue ? 'text-red-500' : 'text-gray-800'}`}>
                        {new Date(currentTask.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    : <span className="text-sm text-gray-400 mt-0.5 block">No deadline</span>,
                },
                {
                  icon: Timer, label: 'Time Tracked',
                  content: <span className="text-sm font-bold text-gray-800 mt-0.5 block">
                    {logMin > 0 ? fmtMin(logMin) : '—'}
                    {estMin > 0 && <span className="text-gray-400 font-normal"> / {fmtMin(estMin)}</span>}
                  </span>,
                },
                {
                  icon: Target, label: 'Subtasks',
                  content: <div className="mt-1 space-y-0.5">
                    <span className="text-sm font-bold text-gray-800">{doneSubs}/{subTasks.length}</span>
                    {subTasks.length > 0 && <Bar pct={subPct} color="#6366f1" />}
                  </div>,
                },
              ].map(s => (
                <div key={s.label} className="bg-gray-50 rounded-2xl px-3.5 py-3">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <s.icon className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{s.label}</span>
                  </div>
                  {s.content}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Main layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ══════════ LEFT (2/3): tabbed panel ══════════ */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">

              {/* Tab bar */}
              <div className="flex border-b border-gray-100 overflow-x-auto scrollbar-none">
                {TABS.map(t => (
                  <button key={t.key} onClick={() => setTab(t.key)}
                    className={`flex items-center gap-1.5 px-4 py-3.5 text-xs font-bold border-b-2 whitespace-nowrap transition-all flex-shrink-0 ${
                      tab === t.key
                        ? 'border-indigo-500 text-indigo-600 bg-indigo-50/60'
                        : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                    }`}>
                    <t.icon className="w-3.5 h-3.5" />
                    {t.label}
                    {t.count !== undefined && t.count > 0 && (
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${tab === t.key ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>{t.count}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="p-5">

                {/* ──────── OVERVIEW ──────── */}
                {tab === 'overview' && (
                  <div className="space-y-6">

                    {/* Description */}
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[.12em] text-gray-400 mb-2">Description</p>
                      <Editable value={currentTask.description ?? ''} onSave={v => patchField('description', v)} multiline placeholder="No description yet — click to add one…" />
                    </div>

                    <hr className="border-gray-50" />

                    {/* Acceptance Criteria */}
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[.12em] text-gray-400 mb-2 flex items-center gap-1.5">
                        <Shield className="w-3 h-3 text-emerald-500" /> Acceptance Criteria
                      </p>
                      <div className="bg-emerald-50 rounded-2xl p-3.5 border border-emerald-100">
                        <Editable value={currentTask.acceptance_criteria ?? ''} onSave={v => patchField('acceptance_criteria', v)} multiline placeholder="• Given… When… Then…" />
                      </div>
                    </div>

                    <hr className="border-gray-50" />

                    {/* Labels */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-black uppercase tracking-[.12em] text-gray-400">Labels</p>
                        <button onClick={() => setLblModal(true)}
                          className="text-[11px] text-indigo-500 hover:text-indigo-700 font-bold flex items-center gap-0.5 transition-colors">
                          <Plus className="w-3 h-3" /> Manage
                        </button>
                      </div>
                      {labels.length > 0
                        ? <div className="flex flex-wrap gap-1.5">
                            {labels.map(l => (
                              <span key={l}
                                style={{ background: `hsl(${labelHue(l)},70%,94%)`, color: `hsl(${labelHue(l)},60%,35%)`, border: `1px solid hsl(${labelHue(l)},50%,82%)` }}
                                className="text-xs font-bold px-2.5 py-1 rounded-full">#{l}</span>
                            ))}
                          </div>
                        : <p className="text-sm text-gray-400 italic">No labels — <button onClick={() => setLblModal(true)} className="text-indigo-500 hover:underline font-medium">add one</button></p>}
                    </div>

                    <hr className="border-gray-50" />

                    {/* Environment / Version */}
                    {(currentTask.environment || currentTask.version) && (
                      <div className="grid grid-cols-2 gap-3">
                        {currentTask.environment && (
                          <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100">
                            <p className="text-[10px] font-black uppercase tracking-[.12em] text-slate-400 mb-1">Environment</p>
                            <p className="text-sm font-bold text-slate-700">{currentTask.environment}</p>
                          </div>
                        )}
                        {currentTask.version && (
                          <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100">
                            <p className="text-[10px] font-black uppercase tracking-[.12em] text-slate-400 mb-1">Version</p>
                            <p className="text-sm font-bold text-slate-700">{currentTask.version}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Completion progress widget */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-black uppercase tracking-[.12em] text-gray-400 flex items-center gap-1.5">
                          <Gauge className="w-3 h-3 text-indigo-500" /> Completion
                        </p>
                        <button onClick={() => setCpModal(true)} className="text-[11px] text-indigo-500 hover:text-indigo-700 font-bold transition-colors">
                          Update →
                        </button>
                      </div>
                      <div className="flex items-center gap-4">
                        <Ring pct={pct} size={52} thick={5} />
                        <div className="flex-1 space-y-2">
                          <Bar pct={pct} color={pct === 100 ? '#10b981' : '#6366f1'} height={5} />
                          <div className="flex gap-1.5">
                            {[0,25,50,75,100].map(v => (
                              <button key={v} onClick={() => quickPct(v)}
                                className={`flex-1 py-1 text-[10px] font-black rounded-lg transition-all ${
                                  pct === v ? v === 100 ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                }`}>{v}%</button>
                            ))}
                          </div>
                        </div>
                      </div>
                      {currentTask.completion_note && (
                        <div className="mt-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                          <p className="text-xs text-indigo-700">{currentTask.completion_note}</p>
                        </div>
                      )}
                    </div>

                    {/* Timeline */}
                    <hr className="border-gray-50" />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[.12em] text-gray-400 mb-3">Timeline</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-100">
                          <div className="flex items-center gap-1.5 mb-1"><PlayCircle className="w-3.5 h-3.5 text-blue-500" /><span className="text-[10px] font-black uppercase tracking-wide text-blue-400">Started</span></div>
                          <p className="text-sm font-bold text-blue-800">
                            {currentTask.started_at ? new Date(currentTask.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : <span className="font-normal text-blue-300">—</span>}
                          </p>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100">
                          <div className="flex items-center gap-1.5 mb-1"><CheckSquare className="w-3.5 h-3.5 text-emerald-500" /><span className="text-[10px] font-black uppercase tracking-wide text-emerald-400">Completed</span></div>
                          <p className="text-sm font-bold text-emerald-800">
                            {currentTask.completed_at ? new Date(currentTask.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : <span className="font-normal text-emerald-300">—</span>}
                          </p>
                        </div>
                      </div>
                      {currentTask.started_at && currentTask.completed_at && (
                        <div className="mt-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-2">
                          <Award className="w-4 h-4 text-emerald-500" />
                          <p className="text-xs font-bold text-emerald-700">
                            Completed in {(() => {
                              const ms = new Date(currentTask.completed_at!).getTime() - new Date(currentTask.started_at!).getTime();
                              const d = Math.floor(ms/86400000), h = Math.floor((ms%86400000)/3600000);
                              return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h` : `${Math.floor(ms/60000)}m`;
                            })()}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ──────── SUBTASKS ──────── */}
                {tab === 'subtasks' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-gray-800">Subtasks</p>
                        <span className="text-xs text-gray-400 font-medium">{doneSubs}/{subTasks.length} done</span>
                      </div>
                      <button onClick={() => setStModal(true)}
                        className="flex items-center gap-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl font-bold transition-colors shadow-sm shadow-indigo-200">
                        <Plus className="w-3.5 h-3.5" /> Add
                      </button>
                    </div>

                    {subTasks.length > 0 && (
                      <div className="space-y-1.5">
                        <Bar pct={subPct} color="#6366f1" height={4} />
                        <p className="text-[10px] text-right text-gray-400 font-semibold">{subPct}% complete</p>
                      </div>
                    )}

                    {subTasks.length === 0 ? (
                      <div className="text-center py-14">
                        <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-gray-100">
                          <ListChecks className="w-7 h-7 text-gray-300" />
                        </div>
                        <p className="text-sm text-gray-400 font-medium">No subtasks yet</p>
                        <button onClick={() => setStModal(true)} className="mt-2 text-xs text-indigo-500 hover:text-indigo-700 font-bold transition-colors">+ Add first subtask</button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {subTasks.map(sub => (
                          <div key={sub.id}
                            className={`group flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${sub.status === 'done' ? 'bg-emerald-50 border-emerald-100' : 'bg-gray-50 border-gray-100 hover:border-indigo-100 hover:bg-indigo-50/20'}`}>
                            <button onClick={() => toggleSub(sub)} className="flex-shrink-0">
                              {sub.status === 'done'
                                ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                : <Circle className="w-5 h-5 text-gray-300 hover:text-indigo-400 transition-colors" />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-semibold ${sub.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800'}`}>{sub.title}</p>
                              {sub.assignee && (
                                <div className="flex items-center gap-1 mt-0.5">
                                  <Ava user={sub.assignee} size={16} />
                                  <span className="text-[11px] text-gray-400">{sub.assignee.name}</span>
                                </div>
                              )}
                            </div>
                            <button onClick={() => setDelTarget({ kind: 'subtask', id: sub.id })}
                              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-all">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ──────── TIME ──────── */}
                {tab === 'time' && (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-gray-800">Time Tracking</p>
                      <button onClick={() => setTmModal(true)}
                        className="flex items-center gap-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl font-bold transition-colors shadow-sm shadow-indigo-200">
                        <Plus className="w-3.5 h-3.5" /> Log Time
                      </button>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Estimated', val: estMin > 0 ? fmtMin(estMin) : '—', c: 'bg-sky-50 border-sky-100', tc: 'text-sky-700', lc: 'text-sky-400' },
                        { label: 'Logged',    val: logMin > 0 ? fmtMin(logMin) : '—', c: logMin > estMin && estMin > 0 ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100', tc: logMin > estMin && estMin > 0 ? 'text-red-700' : 'text-emerald-700', lc: logMin > estMin && estMin > 0 ? 'text-red-400' : 'text-emerald-400' },
                        { label: logMin > estMin && estMin > 0 ? 'Overrun' : 'Remaining', val: estMin > 0 ? fmtMin(Math.abs(estMin - logMin)) : '—', c: 'bg-gray-50 border-gray-100', tc: logMin > estMin ? 'text-red-700' : 'text-gray-700', lc: 'text-gray-400' },
                      ].map(s => (
                        <div key={s.label} className={`rounded-2xl border p-4 text-center ${s.c}`}>
                          <p className={`text-2xl font-black mb-1 ${s.tc}`}>{s.val}</p>
                          <p className={`text-[10px] font-black uppercase tracking-widest ${s.lc}`}>{s.label}</p>
                        </div>
                      ))}
                    </div>

                    {estMin > 0 && (
                      <div>
                        <Bar pct={Math.min(100, (logMin / estMin) * 100)} color={logMin > estMin ? '#ef4444' : '#6366f1'} height={5} />
                        <p className="text-[11px] text-right text-gray-400 font-semibold mt-1">{Math.min(100, Math.round((logMin / estMin) * 100))}% of estimate</p>
                      </div>
                    )}

                    {/* Log list */}
                    {timeLogs.length === 0 ? (
                      <div className="text-center py-12">
                        <AlarmClock className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                        <p className="text-sm text-gray-400">No time logged yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {timeLogs.map(log => (
                          <div key={log.id}
                            className="group flex items-start gap-3 p-3.5 bg-gray-50 rounded-2xl border border-gray-100 hover:border-indigo-100 transition-colors">
                            {log.user && <Ava user={log.user} size={32} />}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-sm font-black text-indigo-600">{fmtTime(log.hours, log.minutes)}</span>
                                {log.user && <span className="text-xs text-gray-500 font-semibold">{log.user.name}</span>}
                              </div>
                              {log.description && <p className="text-xs text-gray-500 mb-0.5">{log.description}</p>}
                              <p className="text-[10px] text-gray-400 font-medium">
                                {log.logged_date ? new Date(log.logged_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : timeAgo(log.created_at)}
                              </p>
                            </div>
                            <button onClick={() => setDelTarget({ kind: 'timelog', id: log.id })}
                              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-all flex-shrink-0">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ──────── COMMENTS ──────── */}
                {tab === 'comments' && (
                  <div className="space-y-5">
                    {/* Compose box */}
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-black flex-shrink-0">
                        {user?.name?.charAt(0).toUpperCase() ?? '?'}
                      </div>
                      <div className="flex-1">
                        <textarea value={newComment} onChange={e => setNewComment(e.target.value)}
                          placeholder="Write a comment… (Enter to post, Shift+Enter for newline)"
                          rows={3} className="input w-full text-sm resize-none"
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); postComment(); } }} />
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-[11px] text-gray-400">Markdown supported</p>
                          <button onClick={postComment} disabled={postingCmt || !newComment.trim()}
                            className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg font-bold transition-colors disabled:opacity-50">
                            <Send className="w-3 h-3" /> {postingCmt ? 'Posting…' : 'Post Comment'}
                          </button>
                        </div>
                      </div>
                    </div>

                    <hr className="border-gray-50" />

                    {comments.length === 0 ? (
                      <div className="text-center py-12">
                        <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                        <p className="text-sm text-gray-400">No comments yet — start the conversation!</p>
                      </div>
                    ) : (
                      <div className="space-y-5">
                        {comments.map(c => (
                          <div key={c.id} className="flex gap-3 group">
                            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-black flex-shrink-0">
                              {c.user?.name?.charAt(0).toUpperCase() ?? '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-sm font-bold text-gray-900">{c.user?.name}</span>
                                <span className="text-[11px] text-gray-400">{timeAgo(c.created_at)}</span>
                              </div>
                              <div className="bg-gray-50 rounded-2xl rounded-tl-sm px-4 py-3 border border-gray-100">
                                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{c.body}</p>
                              </div>
                            </div>
                            {c.user?.id === user?.id && (
                              <button onClick={() => deleteComment(c.id)}
                                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-red-400 self-start transition-all flex-shrink-0">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ──────── FILES ──────── */}
                {tab === 'files' && (
                  <TaskAttachments attachableType="task" attachableId={currentTask.id} showStats />
                )}

                {/* ──────── ACTIVITY ──────── */}
                {tab === 'activity' && (
                  <div className="space-y-3">
                    <p className="text-sm font-bold text-gray-800">Activity Log</p>
                    {actLogs.length === 0 ? (
                      <div className="text-center py-12">
                        <Activity className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                        <p className="text-sm text-gray-400">No activity recorded yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {actLogs.map(log => {
                          const ac = log.action === 'created' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : log.action === 'updated' ? 'bg-blue-50 text-blue-700 ring-blue-200' : 'bg-red-50 text-red-700 ring-red-200';
                          return (
                            <div key={log.id} className="flex items-start gap-3 p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                              <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-black text-gray-600 flex-shrink-0">
                                {log.user?.name?.charAt(0) ?? '?'}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                  <span className={`text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full ring-1 ${ac}`}>{log.action}</span>
                                  <span className="text-xs text-gray-600">{log.description}</span>
                                </div>
                                <p className="text-[10px] text-gray-400 font-medium">{timeAgo(log.created_at)}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ══════════ RIGHT (1/3): Detail sidebar ══════════ */}
          <div className="space-y-4">

            {/* Core details */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
              <p className="text-[10px] font-black uppercase tracking-[.12em] text-gray-400 mb-4">Details</p>
              <div className="space-y-0">
                {[
                  { label: 'Type',     val: <span className={`text-xs font-bold capitalize flex items-center gap-1 ${tp.color}`}><span>{tp.emoji}</span>{currentTask.type}</span> },
                  { label: 'Priority', val: <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ring-1 ${pr.color}`}><span className="mr-1">{pr.icon}</span>{pr.label}</span> },
                  { label: 'Status',   val: <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ring-1 flex items-center gap-1 ${st.bg} ${st.accent} ${st.ring}`}><span className="w-1.5 h-1.5 rounded-full" style={{ background: st.dot }} />{st.label}</span> },
                  { label: 'Assignee', val: currentTask.assignee ? <div className="flex items-center gap-1.5"><Ava user={currentTask.assignee} size={20} /><span className="text-xs font-bold text-gray-800">{currentTask.assignee.name}</span></div> : <span className="text-xs text-gray-400">Unassigned</span> },
                  ...(currentTask.reporter ? [{ label: 'Reporter', val: <div className="flex items-center gap-1.5"><Ava user={currentTask.reporter} size={20} /><span className="text-xs font-bold text-gray-800">{currentTask.reporter.name}</span></div> }] : []),
                  { label: 'Due Date', val: currentTask.due_date ? <span className={`text-xs font-bold ${isOverdue ? 'text-red-500' : 'text-gray-800'}`}>{new Date(currentTask.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span> : <span className="text-xs text-gray-400">Not set</span> },
                  ...(currentTask.project ? [{ label: 'Project', val: <Link to={`/projects/${currentTask.project.id}`} className="text-xs font-bold text-indigo-500 hover:text-indigo-700 flex items-center gap-0.5 transition-colors"><span className="truncate max-w-[100px]">{currentTask.project.name}</span><ExternalLink className="w-3 h-3 flex-shrink-0" /></Link> }] : []),
                  { label: 'Created',  val: <span className="text-xs text-gray-600 font-medium">{timeAgo(currentTask.created_at!)}</span> },
                  { label: 'Updated',  val: <span className="text-xs text-gray-600 font-medium">{timeAgo(currentTask.updated_at!)}</span> },
                ].map((row, i, arr) => (
                  <div key={row.label}>
                    <div className="flex items-center justify-between py-2.5">
                      <span className="text-xs text-gray-400 font-semibold flex-shrink-0">{row.label}</span>
                      <div className="flex justify-end">{row.val}</div>
                    </div>
                    {i < arr.length - 1 && <div className="border-t border-gray-50" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Time summary */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
              <p className="text-[10px] font-black uppercase tracking-[.12em] text-gray-400 mb-4">Time Summary</p>
              <div className="space-y-2.5">
                {[
                  { l: 'Estimate',  v: estMin > 0 ? fmtMin(estMin) : '—', c: 'text-sky-600' },
                  { l: 'Logged',    v: logMin > 0 ? fmtMin(logMin) : '—', c: logMin > estMin && estMin > 0 ? 'text-red-600' : 'text-emerald-600' },
                  { l: 'Remaining', v: estMin > 0 ? fmtMin(Math.max(0, estMin - logMin)) : '—', c: 'text-gray-700' },
                ].map(r => (
                  <div key={r.l} className="flex items-center justify-between">
                    <span className="text-xs text-gray-400 font-semibold">{r.l}</span>
                    <span className={`text-sm font-black ${r.c}`}>{r.v}</span>
                  </div>
                ))}
                {estMin > 0 && (
                  <div className="pt-1">
                    <Bar pct={Math.min(100, (logMin / estMin) * 100)} color={logMin > estMin ? '#ef4444' : '#6366f1'} height={4} />
                  </div>
                )}
              </div>
              <button onClick={() => { setTab('time'); setTmModal(true); }}
                className="w-full mt-4 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl border-2 border-dashed border-gray-200 text-xs font-bold text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Log Time
              </button>
            </div>

            {/* Subtask summary widget */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-black uppercase tracking-[.12em] text-gray-400">Subtasks</p>
                <button onClick={() => setTab('subtasks')} className="text-[11px] text-indigo-500 font-bold hover:text-indigo-700 transition-colors">View all →</button>
              </div>
              {subTasks.length === 0 ? (
                <button onClick={() => { setTab('subtasks'); setStModal(true); }}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-2xl border-2 border-dashed border-gray-200 text-xs font-bold text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Add Subtask
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-gray-500 font-semibold">{doneSubs}/{subTasks.length} done</span>
                    <span className="text-xs font-black text-indigo-600">{subPct}%</span>
                  </div>
                  <Bar pct={subPct} color="#6366f1" height={4} />
                  <div className="space-y-1.5 mt-2">
                    {subTasks.slice(0, 4).map(s => (
                      <div key={s.id} className="flex items-center gap-2 text-xs">
                        {s.status === 'done'
                          ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                          : <Circle className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />}
                        <span className={`truncate ${s.status === 'done' ? 'line-through text-gray-400' : 'text-gray-700 font-medium'}`}>{s.title}</span>
                      </div>
                    ))}
                    {subTasks.length > 4 && <p className="text-[11px] text-gray-400 pl-5">+{subTasks.length - 4} more</p>}
                  </div>
                </div>
              )}
            </div>

            {/* Quick actions */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
              <p className="text-[10px] font-black uppercase tracking-[.12em] text-gray-400 mb-3">Quick Actions</p>
              <div className="space-y-1">
                {[
                  { icon: Copy,        label: 'Duplicate Task',     fn: duplicate },
                  { icon: Share2,      label: 'Copy Link',          fn: copyLink },
                  { icon: Paperclip,   label: 'Manage Attachments', fn: () => setTab('files') },
                  { icon: Tag,         label: 'Manage Labels',      fn: () => setLblModal(true) },
                  { icon: ChevronRight,label: 'Edit Task',          fn: () => navigate(`/tasks/${currentTask.id}/edit`) },
                ].map(a => (
                  <button key={a.label} onClick={a.fn}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 hover:text-indigo-600 transition-colors group">
                    <a.icon className="w-3.5 h-3.5 text-gray-400 group-hover:text-indigo-400 transition-colors" />
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          MODALS
      ══════════════════════════════════════════════════════════════════ */}

      {/* Add Subtask */}
      <Modal isOpen={stModal} onClose={() => setStModal(false)} title="Add Subtask" size="sm">
        <form onSubmit={createSubtask} className="space-y-4">
          <div><label className="label">Title *</label>
            <input type="text" value={stForm.title} onChange={e => setStForm(p => ({ ...p, title: e.target.value }))}
              className="input" placeholder="What needs to be done?" required autoFocus /></div>
          <div><label className="label">Status</label>
            <select value={stForm.status} onChange={e => setStForm(p => ({ ...p, status: e.target.value }))} className="input">
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </select></div>
          <div><label className="label">Assign To</label>
            <select value={stForm.assigned_to} onChange={e => setStForm(p => ({ ...p, assigned_to: e.target.value }))} className="input">
              <option value="">Unassigned</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select></div>
          <div className="flex gap-3">
            <button type="submit" disabled={savingSt || !stForm.title.trim()} className="btn-primary flex-1 disabled:opacity-60">
              {savingSt ? 'Creating…' : 'Create Subtask'}
            </button>
            <button type="button" onClick={() => setStModal(false)} className="btn-secondary flex-1">Cancel</button>
          </div>
        </form>
      </Modal>

      {/* Log Time */}
      <Modal isOpen={tmModal} onClose={() => setTmModal(false)} title="Log Time" size="sm">
        <form onSubmit={logTime} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Hours</label>
              <input type="number" value={tmForm.hours} min="0" max="999"
                onChange={e => setTmForm(p => ({ ...p, hours: Number(e.target.value) }))} className="input" /></div>
            <div><label className="label">Minutes</label>
              <input type="number" value={tmForm.minutes} min="0" max="59"
                onChange={e => setTmForm(p => ({ ...p, minutes: Number(e.target.value) }))} className="input" /></div>
          </div>
          <div><label className="label">Date</label>
            <input type="date" value={tmForm.logged_date} max={new Date().toISOString().split('T')[0]}
              onChange={e => setTmForm(p => ({ ...p, logged_date: e.target.value }))} className="input" /></div>
          <div><label className="label">Description</label>
            <textarea value={tmForm.description} onChange={e => setTmForm(p => ({ ...p, description: e.target.value }))}
              className="input" rows={2} placeholder="What did you work on?" /></div>
          {(tmForm.hours > 0 || tmForm.minutes > 0) && (
            <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 text-center">
              <p className="text-sm font-black text-indigo-700">Logging: {fmtTime(tmForm.hours, tmForm.minutes)}</p>
            </div>
          )}
          <div className="flex gap-3">
            <button type="submit" disabled={savingTm || (!tmForm.hours && !tmForm.minutes)} className="btn-primary flex-1 disabled:opacity-60">
              {savingTm ? 'Logging…' : 'Log Time'}
            </button>
            <button type="button" onClick={() => setTmModal(false)} className="btn-secondary flex-1">Cancel</button>
          </div>
        </form>
      </Modal>

      {/* Update Completion */}
      <Modal isOpen={cpModal} onClose={() => setCpModal(false)} title="Update Progress" size="sm">
        <form onSubmit={saveCompletion} className="space-y-4">
          <div className="flex flex-col items-center py-3">
            <div className="relative">
              <Ring pct={cpForm.completion_percentage} size={110} thick={9} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-gray-800">{cpForm.completion_percentage}%</span>
                <span className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">complete</span>
              </div>
            </div>
          </div>
          <input type="range" min="0" max="100" step="5" value={cpForm.completion_percentage}
            onChange={e => setCpForm(p => ({ ...p, completion_percentage: Number(e.target.value) }))}
            className="w-full accent-indigo-600" />
          <div className="flex gap-1.5">
            {[0,25,50,75,100].map(v => (
              <button key={v} type="button" onClick={() => setCpForm(p => ({ ...p, completion_percentage: v }))}
                className={`flex-1 py-1.5 text-[11px] font-black rounded-xl transition-all ${cpForm.completion_percentage === v ? v === 100 ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                {v}%
              </button>
            ))}
          </div>
          <div><label className="label">Note (optional)</label>
            <textarea value={cpForm.completion_note} onChange={e => setCpForm(p => ({ ...p, completion_note: e.target.value }))}
              className="input" rows={2} placeholder="What's the current status?" /></div>
          <div className="flex gap-3">
            <button type="submit" disabled={savingCp} className="btn-primary flex-1 disabled:opacity-60">
              {savingCp ? 'Saving…' : 'Update Progress'}
            </button>
            <button type="button" onClick={() => setCpModal(false)} className="btn-secondary flex-1">Cancel</button>
          </div>
        </form>
      </Modal>

      {/* Labels */}
      <Modal isOpen={lblModal} onClose={() => setLblModal(false)} title="Manage Labels" size="sm">
        <div className="space-y-4">
          <div className="flex gap-2">
            <input value={lblInput} onChange={e => setLblInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const l = lblInput.trim().toLowerCase();
                  if (l && !localLabels.includes(l)) setLocalLabels(p => [...p, l]);
                  setLblInput('');
                }
              }}
              className="input flex-1" placeholder="Type a label…" autoFocus />
            <button type="button" onClick={() => { const l = lblInput.trim().toLowerCase(); if (l && !localLabels.includes(l)) setLocalLabels(p => [...p, l]); setLblInput(''); }}
              className="btn-secondary px-3">Add</button>
          </div>
          {/* Presets */}
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2">Suggestions</p>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_LABELS.filter(l => !localLabels.includes(l)).map(l => (
                <button key={l} type="button" onClick={() => setLocalLabels(p => [...p, l])}
                  style={{ background: `hsl(${labelHue(l)},60%,94%)`, color: `hsl(${labelHue(l)},55%,38%)`, border: `1px solid hsl(${labelHue(l)},45%,84%)` }}
                  className="text-[11px] font-bold px-2.5 py-1 rounded-full hover:opacity-80 transition-opacity">
                  + {l}
                </button>
              ))}
            </div>
          </div>
          {localLabels.length > 0 && (
            <div className="min-h-[48px] p-3 bg-gray-50 rounded-2xl border border-gray-100 flex flex-wrap gap-1.5">
              {localLabels.map(l => (
                <span key={l}
                  style={{ background: `hsl(${labelHue(l)},70%,94%)`, color: `hsl(${labelHue(l)},60%,35%)`, border: `1px solid hsl(${labelHue(l)},50%,82%)` }}
                  className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full">
                  #{l}
                  <button type="button" onClick={() => setLocalLabels(p => p.filter(x => x !== l))} className="hover:opacity-70 ml-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={saveLabels} className="btn-primary flex-1">Save Labels</button>
            <button onClick={() => setLblModal(false)} className="btn-secondary flex-1">Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Confirm Delete */}
      <Modal isOpen={!!delTarget} onClose={() => setDelTarget(null)} title="Confirm Delete" size="sm">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-50 rounded-2xl border border-red-100">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 font-medium">
              {delTarget?.kind === 'subtask' && 'Delete this subtask? This action cannot be undone.'}
              {delTarget?.kind === 'timelog' && 'Remove this time log entry? This action cannot be undone.'}
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={handleConfirmDelete}
              className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors">
              Delete
            </button>
            <button onClick={() => setDelTarget(null)} className="btn-secondary flex-1">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}