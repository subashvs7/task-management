import { useEffect, useState, useCallback } from 'react';
import {
  BarChart2, CheckSquare, FolderKanban, Users, AlertTriangle,
  ChevronRight, RefreshCw, Target, Loader2, Filter,
  Flame, Activity, CheckCircle2,
} from 'lucide-react';
import Header from '../components/layout/Header';
import api from '../services/api';

// ══ Types ══════════════════════════════════════════════════════════════════════

interface OverviewData {
  summary: Record<string, number>;
  tasks_by_status: Record<string, number>;
  tasks_by_priority: Record<string, number>;
  tasks_by_type: Record<string, number>;
  projects_by_status: Record<string, number>;
}
interface TasksData {
  date_range: { from: string; to: string };
  dates: string[];
  created: number[];
  completed: number[];
  top_assignees: any[];
  overdue_tasks: any[];
}
interface ProjectsData { projects: any[] }
interface TeamData     { members: any[]  }
interface WorkloadData { workload: any[] }
type TabKey = 'overview' | 'tasks' | 'projects' | 'team' | 'workload';

// ══ Helpers ════════════════════════════════════════════════════════════════════

function fmt(n?: number | null): string {
  if (n == null) return '0';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

function pct(a: number, b: number): number {
  return b > 0 ? Math.round((a / b) * 100) : 0;
}

function fmtDate(d?: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ══ UI Atoms ═══════════════════════════════════════════════════════════════════

function StatCard({ label, value, icon: Icon, bg, tc, sub, pctVal }: {
  label: string; value: string | number; icon: React.ElementType;
  bg: string; tc: string; sub?: string; pctVal?: number;
}) {
  return (
    <div className="relative bg-white rounded-2xl border border-gray-100 shadow-sm p-5 overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest truncate">{label}</p>
          <p className="text-3xl font-extrabold text-gray-900 mt-1 leading-none">{fmt(Number(value))}</p>
          {sub && <p className="text-xs text-gray-400 mt-1.5">{sub}</p>}
          {pctVal !== undefined && (
            <div className="mt-2.5 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Completion</span>
                <span className={`font-bold ${pctVal >= 70 ? 'text-emerald-600' : pctVal >= 40 ? 'text-yellow-600' : 'text-red-500'}`}>
                  {pctVal}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-1.5 rounded-full transition-all duration-700 ${pctVal >= 70 ? 'bg-emerald-500' : pctVal >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: pctVal + '%' }}
                />
              </div>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${bg}`}>
          <Icon className={`w-6 h-6 ${tc}`} />
        </div>
      </div>
      <div className={`absolute -bottom-4 -right-4 w-20 h-20 rounded-full opacity-[0.06] ${bg}`} />
    </div>
  );
}

function Card({ title, subtitle, action, onAction, children }: {
  title: string; subtitle?: string; action?: string;
  onAction?: () => void; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
        <div>
          <h3 className="text-sm font-bold text-gray-900">{title}</h3>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {action && (
          <button onClick={onAction}
            className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
            {action} <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const m: Record<string, string> = {
    todo: 'bg-gray-100 text-gray-600',
    backlog: 'bg-slate-100 text-slate-600',
    in_progress: 'bg-blue-100 text-blue-700',
    in_review: 'bg-purple-100 text-purple-700',
    done: 'bg-emerald-100 text-emerald-700',
    closed: 'bg-gray-200 text-gray-500',
    active: 'bg-emerald-100 text-emerald-700',
    completed: 'bg-blue-100 text-blue-700',
    on_hold: 'bg-amber-100 text-amber-700',
    inactive: 'bg-gray-100 text-gray-500',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide whitespace-nowrap ${m[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function Avatar({ name }: { name: string }) {
  const p = ['bg-indigo-500','bg-blue-500','bg-emerald-500','bg-purple-500','bg-pink-500','bg-orange-500'];
  const c = p[(name || 'U').charCodeAt(0) % p.length];
  return (
    <div className={`w-8 h-8 ${c} rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
      {(name || 'U').charAt(0).toUpperCase()}
    </div>
  );
}

function ProgressBar({ value, color = 'bg-indigo-500' }: { value: number; color?: string }) {
  return (
    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
      <div
        className={`h-2 ${color} rounded-full transition-all duration-700`}
        style={{ width: Math.min(100, Math.max(0, value)) + '%' }}
      />
    </div>
  );
}

// ══ Charts ═════════════════════════════════════════════════════════════════════

function DonutChart({ slices, size = 110 }: {
  slices: { label: string; value: number; color: string }[];
  size?: number;
}) {
  const total = slices.reduce((s, d) => s + d.value, 0) || 1;
  const r = 36;
  const circ = 2 * Math.PI * r;
  let cum = 0;

  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} viewBox="0 0 100 100" className="flex-shrink-0">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#f3f4f6" strokeWidth="14" />
        {slices.map((s, i) => {
          const dash   = (s.value / total) * circ;
          const gap    = circ - dash;
          const offset = -(cum / total) * circ + circ * 0.25;
          cum += s.value;
          return (
            <circle
              key={i}
              cx="50" cy="50" r={r}
              fill="none"
              stroke={s.color}
              strokeWidth="14"
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={offset}
            />
          );
        })}
        <text x="50" y="55" textAnchor="middle" fontSize="14" fontWeight="800" fill="#111827">
          {total}
        </text>
      </svg>
      <div className="space-y-1.5 flex-1 min-w-0">
        {slices.map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
            <span className="text-xs text-gray-600 truncate flex-1">{s.label}</span>
            <span className="text-xs font-bold text-gray-800 ml-1">{s.value}</span>
            <span className="text-[10px] text-gray-400 w-7 text-right">{pct(s.value, total)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Sparkline({ data, color = '#6366f1', height = 56 }: {
  data: number[]; color?: string; height?: number;
}) {
  if (!data.length || data.every((v) => v === 0)) {
    return (
      <div className="flex items-center justify-center text-xs text-gray-300" style={{ height }}>
        No data
      </div>
    );
  }
  const W = 300;
  const max = Math.max(...data, 1);
  const step = W / Math.max(data.length - 1, 1);
  const pts = data
    .map((v, i) => `${i * step},${height - (v / max) * (height - 8) - 4}`)
    .join(' ');
  const last = (data.length - 1) * step;
  const area = `M 0,${height} L ${pts.split(' ').join(' L ')} L ${last},${height} Z`;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" style={{ height }}>
      <defs>
        <linearGradient id={`sg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg-${color.replace('#','')})`} />
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ══ Tab: Overview ══════════════════════════════════════════════════════════════

function OverviewTab({ data }: { data: OverviewData }) {
  const s  = data.summary;
  const ts = data.tasks_by_status;
  const tp = data.tasks_by_priority;
  const tt = data.tasks_by_type;
  const ps = data.projects_by_status;

  return (
    <div className="space-y-6">
      {/* Summary stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Projects"   value={s.total_projects  ?? 0}
          icon={FolderKanban}  bg="bg-indigo-50"  tc="text-indigo-600"
          sub={`${s.active_projects ?? 0} active`} />
        <StatCard label="Total Tasks"      value={s.total_tasks     ?? 0}
          icon={CheckSquare}   bg="bg-blue-50"    tc="text-blue-600"
          sub={`${s.completed_tasks ?? 0} completed`}
          pctVal={s.completion_rate} />
        <StatCard label="Overdue Tasks"    value={s.overdue_tasks   ?? 0}
          icon={AlertTriangle} bg="bg-red-50"     tc="text-red-500" />
        <StatCard label="Team Members"     value={s.total_users     ?? 0}
          icon={Users}         bg="bg-emerald-50" tc="text-emerald-600"
          sub={`${s.active_users ?? 0} active`} />
      </div>

      {/* Four donuts */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        <Card title="Tasks by Status">
          <DonutChart slices={[
            { label: 'Backlog',     value: ts.backlog     ?? 0, color: '#94a3b8' },
            { label: 'Todo',        value: ts.todo        ?? 0, color: '#64748b' },
            { label: 'In Progress', value: ts.in_progress ?? 0, color: '#6366f1' },
            { label: 'In Review',   value: ts.in_review   ?? 0, color: '#a855f7' },
            { label: 'Done',        value: ts.done        ?? 0, color: '#10b981' },
            { label: 'Closed',      value: ts.closed      ?? 0, color: '#d1d5db' },
          ]} />
        </Card>
        <Card title="Tasks by Priority">
          <DonutChart slices={[
            { label: 'Critical', value: tp.critical ?? 0, color: '#ef4444' },
            { label: 'High',     value: tp.high     ?? 0, color: '#f97316' },
            { label: 'Medium',   value: tp.medium   ?? 0, color: '#eab308' },
            { label: 'Low',      value: tp.low      ?? 0, color: '#22c55e' },
          ]} />
        </Card>
        <Card title="Tasks by Type">
          <DonutChart slices={[
            { label: 'Task',        value: tt.task        ?? 0, color: '#6366f1' },
            { label: 'Bug',         value: tt.bug         ?? 0, color: '#ef4444' },
            { label: 'Feature',     value: tt.feature     ?? 0, color: '#a855f7' },
            { label: 'Improvement', value: tt.improvement ?? 0, color: '#22c55e' },
          ]} />
        </Card>
        <Card title="Projects by Status">
          <DonutChart slices={[
            { label: 'Active',    value: ps.active    ?? 0, color: '#10b981' },
            { label: 'Completed', value: ps.completed ?? 0, color: '#6366f1' },
            { label: 'On Hold',   value: ps.on_hold   ?? 0, color: '#eab308' },
            { label: 'Inactive',  value: ps.inactive  ?? 0, color: '#94a3b8' },
          ]} />
        </Card>
      </div>

      {/* Completion highlight banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl p-6 text-white relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 15% 50%, white 0%, transparent 60%)' }}
        />
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <p className="text-indigo-200 text-sm font-medium">Overall Completion Rate</p>
            <p className="text-5xl font-extrabold mt-1 leading-none">{s.completion_rate ?? 0}%</p>
            <p className="text-indigo-200 text-sm mt-2">
              {s.completed_tasks ?? 0} of {s.total_tasks ?? 0} tasks completed
            </p>
          </div>
          <div className="w-20 h-20 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0">
            <Target className="w-9 h-9 text-white" />
          </div>
        </div>
        <div className="relative mt-4 h-2 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-2 bg-white rounded-full transition-all duration-1000"
            style={{ width: (s.completion_rate ?? 0) + '%' }}
          />
        </div>
      </div>
    </div>
  );
}

// ══ Tab: Tasks ════════════════════════════════════════════════════════════════

function TasksTab({ data, dateFrom, dateTo, onDateChange, tabLoading }: {
  data: TasksData | null;
  dateFrom: string;
  dateTo: string;
  onDateChange: (from: string, to: string) => void;
  tabLoading: boolean;
}) {
  const [from, setFrom] = useState(dateFrom);
  const [to,   setTo  ] = useState(dateTo);

  // keep local state in sync when parent prop changes
  useEffect(() => { setFrom(dateFrom); }, [dateFrom]);
  useEffect(() => { setTo(dateTo);     }, [dateTo]);

  const applyRange = (f: string, t: string) => {
    setFrom(f);
    setTo(t);
    onDateChange(f, t);
  };

  const PRESETS = [
    { label: '7 days',  days: 7  },
    { label: '30 days', days: 30 },
    { label: '90 days', days: 90 },
  ];

  return (
    <div className="space-y-5">
      {/* Date range toolbar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className="input text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className="input text-sm" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {PRESETS.map((p) => {
              const f = new Date(Date.now() - p.days * 86400000).toISOString().split('T')[0];
              const t = new Date().toISOString().split('T')[0];
              return (
                <button key={p.label}
                  onClick={() => applyRange(f, t)}
                  className="px-3 py-2 text-xs font-semibold bg-gray-100 hover:bg-indigo-100 hover:text-indigo-700 rounded-xl transition-colors">
                  Last {p.label}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => applyRange(from, to)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors">
            <Filter className="w-4 h-4" /> Apply
          </button>
        </div>
      </div>

      {tabLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
      ) : !data ? (
        <div className="flex justify-center py-20 text-sm text-gray-400">No data loaded</div>
      ) : (
        <>
          {/* Sparkline chart */}
          <Card
            title="Tasks Created vs Completed"
            subtitle={`${fmtDate(data.date_range?.from)} — ${fmtDate(data.date_range?.to)}`}
          >
            <div className="space-y-4">
              <div className="flex gap-5 text-xs font-semibold flex-wrap">
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-1.5 rounded-full bg-indigo-500 inline-block" />
                  Created ({(data.created ?? []).reduce((a, b) => a + b, 0)})
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  Completed ({(data.completed ?? []).reduce((a, b) => a + b, 0)})
                </span>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Created</p>
                <Sparkline data={data.created ?? []} color="#6366f1" height={56} />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Completed</p>
                <Sparkline data={data.completed ?? []} color="#10b981" height={56} />
              </div>
              {(data.dates ?? []).length > 1 && (
                <div className="flex justify-between text-[10px] text-gray-400 pt-1 border-t border-gray-50">
                  <span>{fmtDate(data.dates[0])}</span>
                  <span>{fmtDate(data.dates[Math.floor((data.dates.length - 1) / 2)])}</span>
                  <span>{fmtDate(data.dates[data.dates.length - 1])}</span>
                </div>
              )}
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Top assignees */}
            <Card title="Top Assignees" subtitle="By total tasks in selected period">
              <div className="space-y-4">
                {(data.top_assignees ?? []).slice(0, 8).map((a: any) => (
                  <div key={a.assigned_to} className="flex items-center gap-3">
                    <Avatar name={a.assignee?.name ?? '?'} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold text-gray-800 truncate">{a.assignee?.name ?? 'Unknown'}</p>
                        <span className="text-xs font-bold text-gray-600 flex-shrink-0 ml-2">{a.total} tasks</span>
                      </div>
                      <ProgressBar
                        value={pct(a.done ?? 0, a.total ?? 0)}
                        color={pct(a.done ?? 0, a.total ?? 0) >= 70 ? 'bg-emerald-500' : pct(a.done ?? 0, a.total ?? 0) >= 40 ? 'bg-yellow-500' : 'bg-red-400'}
                      />
                      <div className="flex gap-3 mt-1">
                        <span className="text-[10px] text-emerald-600 font-medium">{a.done ?? 0} done</span>
                        {(a.overdue ?? 0) > 0 && (
                          <span className="text-[10px] text-red-500 font-medium">{a.overdue} overdue</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {!(data.top_assignees ?? []).length && (
                  <p className="text-sm text-gray-400 text-center py-8">No data for this period</p>
                )}
              </div>
            </Card>

            {/* Overdue tasks */}
            <Card title="Overdue Tasks" subtitle="Sorted by oldest due date">
              <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
                {(data.overdue_tasks ?? []).map((t: any) => {
                  const days = Math.floor((Date.now() - new Date(t.due_date).getTime()) / 86400000);
                  return (
                    <div key={t.id}
                      className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                        t.priority === 'critical' ? 'bg-red-500' :
                        t.priority === 'high'     ? 'bg-orange-500' : 'bg-yellow-400'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{t.title}</p>
                        <p className="text-xs text-gray-400 truncate">{t.project?.name ?? ''}</p>
                      </div>
                      <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                        <span className="text-xs font-bold text-red-500">{days}d overdue</span>
                        {t.assignee?.name && (
                          <span className="text-[10px] text-gray-400">{t.assignee.name}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {!(data.overdue_tasks ?? []).length && (
                  <p className="text-sm text-gray-400 text-center py-8">No overdue tasks 🎉</p>
                )}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

// ══ Tab: Projects ════════════════════════════════════════════════════════════

function ProjectsTab({ data, tabLoading }: { data: ProjectsData | null; tabLoading: boolean }) {
  const [search,  setSearch ] = useState('');
  const [sortKey, setSortKey] = useState<'tasks_count' | 'completion_pct' | 'overdue_count'>('tasks_count');

  const projects = (data?.projects ?? [])
    .filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (b[sortKey] ?? 0) - (a[sortKey] ?? 0));

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search projects..."
          className="input flex-1 min-w-[200px] text-sm"
        />
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as typeof sortKey)}
          className="input text-sm w-44"
        >
          <option value="tasks_count">Sort: Most Tasks</option>
          <option value="completion_pct">Sort: Completion %</option>
          <option value="overdue_count">Sort: Most Overdue</option>
        </select>
        <span className="text-xs text-gray-500 font-medium">{projects.length} projects</span>
      </div>

      {tabLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Project</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide min-w-[140px]">Progress</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wide">Tasks</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wide">Done</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wide">Overdue</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Owner</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {projects.map((p: any) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: p.color ?? '#6366f1' }} />
                        <span className="font-semibold text-gray-800 truncate max-w-[180px]">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ProgressBar
                          value={p.completion_pct ?? 0}
                          color={
                            (p.completion_pct ?? 0) >= 70 ? 'bg-emerald-500' :
                            (p.completion_pct ?? 0) >= 40 ? 'bg-yellow-500' : 'bg-red-400'
                          }
                        />
                        <span className="text-xs font-bold text-gray-700 w-9 flex-shrink-0 text-right">
                          {p.completion_pct ?? 0}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-bold text-gray-700">{p.tasks_count ?? 0}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-bold text-emerald-600">{p.done_count ?? 0}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-sm font-bold ${(p.overdue_count ?? 0) > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                        {p.overdue_count ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {p.owner ? (
                        <div className="flex items-center gap-2">
                          <Avatar name={p.owner.name} />
                          <span className="text-xs text-gray-600 truncate max-w-[100px]">{p.owner.name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!projects.length && (
            <div className="text-center py-12 text-sm text-gray-400">No projects found</div>
          )}
        </div>
      )}
    </div>
  );
}

// ══ Tab: Team ════════════════════════════════════════════════════════════════

function TeamTab({ data, tabLoading }: { data: TeamData | null; tabLoading: boolean }) {
  const [search, setSearch] = useState('');

  const members = (data?.members ?? [])
    .filter((m) => !search || m.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search team members..."
          className="input w-full max-w-sm text-sm"
        />
      </div>

      {tabLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Member</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide min-w-[140px]">Progress</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wide">Total</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wide">Done</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wide">Active</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wide">Overdue</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {members.map((m: any) => (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={m.name} />
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 truncate max-w-[140px]">{m.name}</p>
                          <p className="text-xs text-gray-400 truncate max-w-[140px]">{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase rounded-full capitalize whitespace-nowrap">
                        {(m.role ?? 'member').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ProgressBar
                          value={m.completion_pct ?? 0}
                          color={
                            (m.completion_pct ?? 0) >= 70 ? 'bg-emerald-500' :
                            (m.completion_pct ?? 0) >= 40 ? 'bg-yellow-500' : 'bg-indigo-400'
                          }
                        />
                        <span className="text-xs font-bold text-gray-700 w-9 flex-shrink-0 text-right">
                          {m.completion_pct ?? 0}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-bold text-gray-700">{m.total_tasks ?? 0}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-bold text-emerald-600">{m.done_tasks ?? 0}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-bold text-blue-600">{m.in_progress ?? 0}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-bold ${(m.overdue_tasks ?? 0) > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                        {m.overdue_tasks ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${m.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        {m.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!members.length && (
            <div className="text-center py-12 text-sm text-gray-400">No team members found</div>
          )}
        </div>
      )}
    </div>
  );
}

// ══ Tab: Workload ════════════════════════════════════════════════════════════

function WorkloadTab({ data, tabLoading }: { data: WorkloadData | null; tabLoading: boolean }) {
  const list     = data?.workload ?? [];
  const maxTasks = Math.max(...list.map((w: any) => w.open_tasks ?? 0), 1);

  const totalOpen     = list.reduce((s: number, w: any) => s + (w.open_tasks ?? 0), 0);
  const totalCritical = list.reduce((s: number, w: any) => s + (w.critical   ?? 0), 0);
  const totalOverdue  = list.reduce((s: number, w: any) => s + (w.overdue    ?? 0), 0);
  const riskMembers   = list.filter((w: any) => (w.critical ?? 0) > 0 || (w.overdue ?? 0) > 0);

  return (
    <div className="space-y-5">
      {tabLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Active Members"   value={list.length}
              icon={Users}         bg="bg-indigo-50"  tc="text-indigo-600" />
            <StatCard label="Total Open Tasks" value={totalOpen}
              icon={CheckSquare}   bg="bg-blue-50"    tc="text-blue-600" />
            <StatCard label="Critical Tasks"   value={totalCritical}
              icon={Flame}         bg="bg-red-50"     tc="text-red-500" />
            <StatCard label="Overdue Tasks"    value={totalOverdue}
              icon={AlertTriangle} bg="bg-amber-50"   tc="text-amber-500" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Open tasks per member */}
            <Card title="Open Tasks per Member" subtitle="Current work distribution">
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {list.slice(0, 15).map((w: any) => (
                  <div key={w.id} className="flex items-center gap-3">
                    <Avatar name={w.name} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold text-gray-800 truncate max-w-[140px]">{w.name}</p>
                        <span className="text-xs font-bold text-gray-600 ml-1 flex-shrink-0">{w.open_tasks}</span>
                      </div>
                      <ProgressBar
                        value={pct(w.open_tasks ?? 0, maxTasks)}
                        color={
                          (w.open_tasks ?? 0) > 10 ? 'bg-red-400' :
                          (w.open_tasks ?? 0) > 5  ? 'bg-yellow-500' : 'bg-emerald-500'
                        }
                      />
                    </div>
                  </div>
                ))}
                {!list.length && (
                  <p className="text-sm text-gray-400 text-center py-8">No active members</p>
                )}
              </div>
            </Card>

            {/* Risk members */}
            <Card title="Risk Overview" subtitle="Members with critical or overdue tasks">
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {riskMembers.slice(0, 15).map((w: any) => (
                  <div key={w.id}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                    <Avatar name={w.name} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{w.name}</p>
                      <div className="flex gap-3 mt-0.5 flex-wrap">
                        {(w.critical ?? 0) > 0 && (
                          <span className="text-xs font-bold text-red-600 flex items-center gap-1">
                            <Flame className="w-3 h-3" />
                            {w.critical} critical
                          </span>
                        )}
                        {(w.overdue ?? 0) > 0 && (
                          <span className="text-xs font-bold text-orange-500 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {w.overdue} overdue
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">{w.open_tasks} open</span>
                  </div>
                ))}
                {!riskMembers.length && (
                  <div className="flex flex-col items-center justify-center py-8 gap-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                    <p className="text-sm text-gray-400">No risk items — all clear!</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

// ══ Main Reports page ════════════════════════════════════════════════════════

export default function Reports() {
  const [activeTab,    setActiveTab   ] = useState<TabKey>('overview');
  const [overviewData, setOverviewData] = useState<OverviewData  | null>(null);
  const [tasksData,    setTasksData   ] = useState<TasksData     | null>(null);
  const [projectsData, setProjectsData] = useState<ProjectsData | null>(null);
  const [teamData,     setTeamData    ] = useState<TeamData      | null>(null);
  const [workloadData, setWorkloadData] = useState<WorkloadData  | null>(null);
  const [tabLoading,   setTabLoading  ] = useState(false);
  const [dateFrom,     setDateFrom    ] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]);
  const [dateTo,       setDateTo      ] = useState(() => new Date().toISOString().split('T')[0]);

  const loadTab = useCallback(async (tab: TabKey, from?: string, to?: string) => {
    setTabLoading(true);
    try {
      if (tab === 'overview') {
        const r = await api.get('/reports/overview');
        setOverviewData(r.data);
      } else if (tab === 'tasks') {
        const r = await api.get('/reports/tasks', {
          params: { from: from ?? dateFrom, to: to ?? dateTo },
        });
        setTasksData(r.data);
      } else if (tab === 'projects') {
        const r = await api.get('/reports/projects');
        setProjectsData(r.data);
      } else if (tab === 'team') {
        const r = await api.get('/reports/team');
        setTeamData(r.data);
      } else if (tab === 'workload') {
        const r = await api.get('/reports/workload');
        setWorkloadData(r.data);
      }
    } catch (e: any) {
      console.error('Reports load error:', e?.response?.data?.message ?? e?.message);
    } finally {
      setTabLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    loadTab(activeTab);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleDateChange = (from: string, to: string) => {
    setDateFrom(from);
    setDateTo(to);
    loadTab('tasks', from, to);
  };

  const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: 'overview', label: 'Overview',  icon: BarChart2    },
    { key: 'tasks',    label: 'Tasks',     icon: CheckSquare  },
    { key: 'projects', label: 'Projects',  icon: FolderKanban },
    { key: 'team',     label: 'Team',      icon: Users        },
    { key: 'workload', label: 'Workload',  icon: Activity     },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Reports" />

      <div className="max-w-7xl mx-auto px-4 py-6 md:px-6 space-y-5">

        {/* Page heading */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Reports & Analytics</h1>
            <p className="text-sm text-gray-500 mt-0.5">Track performance, workload and project health</p>
          </div>
          <button
            onClick={() => loadTab(activeTab)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-sm font-semibold text-gray-600 rounded-xl transition-colors shadow-sm flex-shrink-0"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:block">Refresh</span>
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={[
                'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap',
                activeTab === tab.key
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800',
              ].join(' ')}
            >
              <tab.icon className="w-4 h-4 flex-shrink-0" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'overview' && (
          overviewData
            ? <OverviewTab data={overviewData} />
            : tabLoading
              ? <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-indigo-400 animate-spin" /></div>
              : null
        )}
        {activeTab === 'tasks' && (
          <TasksTab
            data={tasksData}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateChange={handleDateChange}
            tabLoading={tabLoading}
          />
        )}
        {activeTab === 'projects' && (
          <ProjectsTab data={projectsData} tabLoading={tabLoading} />
        )}
        {activeTab === 'team' && (
          <TeamTab data={teamData} tabLoading={tabLoading} />
        )}
        {activeTab === 'workload' && (
          <WorkloadTab data={workloadData} tabLoading={tabLoading} />
        )}
      </div>
    </div>
  );
}