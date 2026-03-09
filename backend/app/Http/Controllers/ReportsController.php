<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Models\UserStory;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ReportsController extends Controller
{
    // ── GET /api/reports/overview ─────────────────────────────────────────────

    public function overview(Request $request): JsonResponse
    {
        try {
            $companyId = Auth::user()->company_id;

            $projects = Project::when($companyId, fn($q) => $q->where('company_id', $companyId));
            $tasks    = Task::when($companyId, fn($q) => $q->whereHas('project', fn($p) => $p->where('company_id', $companyId)));
            $users    = User::when($companyId, fn($q) => $q->where('company_id', $companyId));

            $totalTasks    = (clone $tasks)->count();
            $doneTasks     = (clone $tasks)->where('status', 'done')->count();
            $overdueTasks  = (clone $tasks)->where('due_date', '<', now())
                                           ->whereNotIn('status', ['done', 'closed'])->count();

            return response()->json([
                'summary' => [
                    'total_projects'   => (clone $projects)->count(),
                    'active_projects'  => (clone $projects)->where('status', 'active')->count(),
                    'total_tasks'      => $totalTasks,
                    'completed_tasks'  => $doneTasks,
                    'overdue_tasks'    => $overdueTasks,
                    'completion_rate'  => $totalTasks > 0 ? round(($doneTasks / $totalTasks) * 100, 1) : 0,
                    'total_users'      => (clone $users)->count(),
                    'active_users'     => (clone $users)->where('is_active', true)->count(),
                ],
                'tasks_by_status' => [
                    'backlog'     => (clone $tasks)->where('status', 'backlog')->count(),
                    'todo'        => (clone $tasks)->where('status', 'todo')->count(),
                    'in_progress' => (clone $tasks)->where('status', 'in_progress')->count(),
                    'in_review'   => (clone $tasks)->where('status', 'in_review')->count(),
                    'done'        => (clone $tasks)->where('status', 'done')->count(),
                    'closed'      => (clone $tasks)->where('status', 'closed')->count(),
                ],
                'tasks_by_priority' => [
                    'critical' => (clone $tasks)->where('priority', 'critical')->count(),
                    'high'     => (clone $tasks)->where('priority', 'high')->count(),
                    'medium'   => (clone $tasks)->where('priority', 'medium')->count(),
                    'low'      => (clone $tasks)->where('priority', 'low')->count(),
                ],
                'tasks_by_type' => [
                    'task'          => (clone $tasks)->where('type', 'task')->count(),
                    'bug'           => (clone $tasks)->where('type', 'bug')->count(),
                    'feature'       => (clone $tasks)->where('type', 'feature')->count(),
                    'improvement'   => (clone $tasks)->where('type', 'improvement')->count(),
                ],
                'projects_by_status' => [
                    'active'    => (clone $projects)->where('status', 'active')->count(),
                    'completed' => (clone $projects)->where('status', 'completed')->count(),
                    'on_hold'   => (clone $projects)->where('status', 'on_hold')->count(),
                    'inactive'  => (clone $projects)->where('status', 'inactive')->count(),
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage(), 'line' => $e->getLine()], 500);
        }
    }

    // ── GET /api/reports/tasks ────────────────────────────────────────────────

    public function tasks(Request $request): JsonResponse
    {
        try {
            $companyId = Auth::user()->company_id;
            $from = $request->input('from', Carbon::now()->subDays(30)->toDateString());
            $to   = $request->input('to',   Carbon::now()->toDateString());

            $base = Task::when($companyId, fn($q) => $q->whereHas('project', fn($p) => $p->where('company_id', $companyId)))
                        ->whereBetween('created_at', [$from . ' 00:00:00', $to . ' 23:59:59']);

            // Daily created vs completed (last 30 days by default)
            $dailyCreated = (clone $base)
                ->select(DB::raw('DATE(created_at) as date'), DB::raw('count(*) as count'))
                ->groupBy('date')
                ->orderBy('date')
                ->get()
                ->keyBy('date');

            $dailyCompleted = Task::when($companyId, fn($q) => $q->whereHas('project', fn($p) => $p->where('company_id', $companyId)))
                ->where('status', 'done')
                ->whereBetween('updated_at', [$from . ' 00:00:00', $to . ' 23:59:59'])
                ->select(DB::raw('DATE(updated_at) as date'), DB::raw('count(*) as count'))
                ->groupBy('date')
                ->orderBy('date')
                ->get()
                ->keyBy('date');

            // Build date range array
            $dates   = [];
            $created = [];
            $completed = [];
            $current = Carbon::parse($from);
            $end     = Carbon::parse($to);
            while ($current->lte($end)) {
                $d = $current->toDateString();
                $dates[]     = $d;
                $created[]   = $dailyCreated->get($d)?->count  ?? 0;
                $completed[] = $dailyCompleted->get($d)?->count ?? 0;
                $current->addDay();
            }

            // Top assignees
            $topAssignees = Task::when($companyId, fn($q) => $q->whereHas('project', fn($p) => $p->where('company_id', $companyId)))
                ->whereNotNull('assigned_to')
                ->select('assigned_to', DB::raw('count(*) as total'),
                    DB::raw('sum(case when status = "done" then 1 else 0 end) as done'),
                    DB::raw('sum(case when due_date < now() and status not in ("done","closed") then 1 else 0 end) as overdue'))
                ->groupBy('assigned_to')
                ->orderByDesc('total')
                ->limit(10)
                ->with('assignee:id,name,email')
                ->get();

            // Overdue tasks list
            $overdueTasks = Task::when($companyId, fn($q) => $q->whereHas('project', fn($p) => $p->where('company_id', $companyId)))
                ->where('due_date', '<', now())
                ->whereNotIn('status', ['done', 'closed'])
                ->with(['project:id,name', 'assignee:id,name'])
                ->orderBy('due_date')
                ->limit(20)
                ->get();

            return response()->json([
                'date_range'    => ['from' => $from, 'to' => $to],
                'dates'         => $dates,
                'created'       => $created,
                'completed'     => $completed,
                'top_assignees' => $topAssignees,
                'overdue_tasks' => $overdueTasks,
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage(), 'line' => $e->getLine()], 500);
        }
    }

    // ── GET /api/reports/projects ─────────────────────────────────────────────

    public function projects(Request $request): JsonResponse
    {
        try {
            $companyId = Auth::user()->company_id;

            $projects = Project::when($companyId, fn($q) => $q->where('company_id', $companyId))
                ->with(['owner:id,name'])
                ->withCount([
                    'tasks',
                    'tasks as done_tasks_count'     => fn($q) => $q->where('status', 'done'),
                    'tasks as overdue_tasks_count'  => fn($q) => $q->where('due_date', '<', now())->whereNotIn('status', ['done', 'closed']),
                    'tasks as in_progress_count'    => fn($q) => $q->where('status', 'in_progress'),
                ])
                ->orderByDesc('created_at')
                ->get()
                ->map(fn($p) => [
                    'id'             => $p->id,
                    'name'           => $p->name,
                    'status'         => $p->status,
                    'color'          => $p->color ?? '#6366f1',
                    'owner'          => $p->owner,
                    'tasks_count'    => $p->tasks_count,
                    'done_count'     => $p->done_tasks_count,
                    'overdue_count'  => $p->overdue_tasks_count,
                    'in_progress'    => $p->in_progress_count,
                    'completion_pct' => $p->tasks_count > 0
                        ? round(($p->done_tasks_count / $p->tasks_count) * 100, 1)
                        : 0,
                    'created_at'     => $p->created_at,
                ]);

            return response()->json(['projects' => $projects]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage(), 'line' => $e->getLine()], 500);
        }
    }

    // ── GET /api/reports/team ─────────────────────────────────────────────────

    public function team(Request $request): JsonResponse
    {
        try {
            $companyId = Auth::user()->company_id;

            $members = User::when($companyId, fn($q) => $q->where('company_id', $companyId))
                ->with('roles:id,name')
                ->withCount([
                    'assignedTasks',
                    'assignedTasks as done_tasks'       => fn($q) => $q->where('status', 'done'),
                    'assignedTasks as overdue_tasks'    => fn($q) => $q->where('due_date', '<', now())->whereNotIn('status', ['done', 'closed']),
                    'assignedTasks as in_progress_tasks'=> fn($q) => $q->where('status', 'in_progress'),
                ])
                ->orderByDesc('assigned_tasks_count')
                ->get()
                ->map(fn($u) => [
                    'id'              => $u->id,
                    'name'            => $u->name,
                    'email'           => $u->email,
                    'avatar'          => $u->avatar,
                    'is_active'       => $u->is_active,
                    'role'            => $u->roles->first()?->name ?? 'member',
                    'total_tasks'     => $u->assigned_tasks_count,
                    'done_tasks'      => $u->done_tasks,
                    'overdue_tasks'   => $u->overdue_tasks,
                    'in_progress'     => $u->in_progress_tasks,
                    'completion_pct'  => $u->assigned_tasks_count > 0
                        ? round(($u->done_tasks / $u->assigned_tasks_count) * 100, 1)
                        : 0,
                ]);

            return response()->json(['members' => $members]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage(), 'line' => $e->getLine()], 500);
        }
    }

    // ── GET /api/reports/workload ─────────────────────────────────────────────

    public function workload(Request $request): JsonResponse
    {
        try {
            $companyId = Auth::user()->company_id;

            $workload = User::when($companyId, fn($q) => $q->where('company_id', $companyId))
                ->where('is_active', true)
                ->withCount([
                    'assignedTasks as open_tasks' => fn($q) => $q->whereNotIn('status', ['done', 'closed']),
                    'assignedTasks as critical'   => fn($q) => $q->where('priority', 'critical')->whereNotIn('status', ['done', 'closed']),
                    'assignedTasks as overdue'    => fn($q) => $q->where('due_date', '<', now())->whereNotIn('status', ['done', 'closed']),
                ])
                ->orderByDesc('open_tasks')
                ->get()
                ->map(fn($u) => [
                    'id'         => $u->id,
                    'name'       => $u->name,
                    'open_tasks' => $u->open_tasks,
                    'critical'   => $u->critical,
                    'overdue'    => $u->overdue,
                ]);

            return response()->json(['workload' => $workload]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage(), 'line' => $e->getLine()], 500);
        }
    }
}