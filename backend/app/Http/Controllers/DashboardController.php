<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user      = $request->user()->load('roles:id,name');
        $role      = $user->getRoleNames()->first();
        $companyId = $user->company_id;

        $data = match ($role) {
            'admin'       => $this->adminData($companyId),
            'manager'     => $this->managerData($companyId),
            'team_leader' => $this->teamLeaderData($user),
            'developer'   => $this->developerData($user),
            'designer'    => $this->designerData($user),
            'tester'      => $this->testerData($user),
            'hr'          => $this->hrData($companyId),
            default       => $this->developerData($user),
        };

        return response()->json([
            'role' => $role,
            'user' => array_merge(
                $user->only('id', 'name', 'email', 'avatar', 'job_title', 'department'),
                ['roles' => $user->roles]
            ),
            'data' => $data,
        ]);
    }

    private function adminData(?int $companyId): array
    {
        $pq = Project::query()->when($companyId, fn($q) => $q->where('company_id', $companyId));
        $uq = User::query()->when($companyId,    fn($q) => $q->where('company_id', $companyId));
        $tq = Task::query()->when($companyId,    fn($q) => $q->whereHas('project', fn($q2) => $q2->where('company_id', $companyId)));

        $total = (clone $tq)->count();
        $done  = (clone $tq)->where('status', 'done')->count();

        $tasksByStatus   = (clone $tq)->select('status',   DB::raw('count(*) as count'))->groupBy('status')->pluck('count','status')->toArray();
        $tasksByPriority = (clone $tq)->select('priority', DB::raw('count(*) as count'))->groupBy('priority')->pluck('count','priority')->toArray();

        $usersByRole = DB::table('model_has_roles')
            ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
            ->join('users', 'users.id', '=', 'model_has_roles.model_id')
            ->when($companyId, fn($q) => $q->where('users.company_id', $companyId))
            ->select('roles.name as role', DB::raw('count(*) as count'))
            ->groupBy('roles.name')->pluck('count','role')->toArray();

        $topAssignees = User::withCount(['assignedTasks as task_count' => fn($q) =>
            $q->when($companyId, fn($q2) => $q2->whereHas('project', fn($q3) => $q3->where('company_id', $companyId)))])
            ->when($companyId, fn($q) => $q->where('company_id', $companyId))
            ->orderByDesc('task_count')->limit(5)->with('roles:id,name')
            ->get(['id','name','email','avatar']);

        return [
            'total_projects'    => (clone $pq)->count(),
            'active_projects'   => (clone $pq)->where('status','active')->count(),
            'total_users'       => (clone $uq)->count(),
            'active_users'      => (clone $uq)->where('is_active',true)->count(),
            'total_tasks'       => $total,
            'done_tasks'        => $done,
            'overdue_tasks'     => (clone $tq)->where('due_date','<',now())->whereNotIn('status',['done','closed'])->count(),
            'due_this_week'     => (clone $tq)->whereBetween('due_date',[now()->startOfWeek(),now()->endOfWeek()])->whereNotIn('status',['done','closed'])->count(),
            'completion_rate'   => $total > 0 ? round(($done/$total)*100) : 0,
            'projects_by_status'  => (clone $pq)->select('status',DB::raw('count(*) as count'))->groupBy('status')->pluck('count','status')->toArray(),
            'tasks_by_status'     => $tasksByStatus,
            'tasks_by_priority'   => $tasksByPriority,
            'users_by_role'       => $usersByRole,
            'top_assignees'       => $topAssignees,
            'recent_projects'     => (clone $pq)->latest()->limit(6)->with('owner')->get(),
            'recent_tasks'        => (clone $tq)->latest()->limit(8)->with(['assignee','project'])->get(),
        ];
    }

    private function managerData(?int $companyId): array
    {
        $pq = Project::query()->when($companyId, fn($q) => $q->where('company_id', $companyId));
        $tq = Task::query()->when($companyId,    fn($q) => $q->whereHas('project', fn($q2) => $q2->where('company_id', $companyId)));

        $total = (clone $tq)->count();
        $done  = (clone $tq)->where('status','done')->count();

        $teamWorkload = User::withCount(['assignedTasks as open_tasks' => fn($q) =>
            $q->whereNotIn('status',['done','closed'])
              ->when($companyId, fn($q2) => $q2->whereHas('project', fn($q3) => $q3->where('company_id', $companyId)))])
            ->when($companyId, fn($q) => $q->where('company_id', $companyId))
            ->orderByDesc('open_tasks')->limit(6)->with('roles:id,name')
            ->get(['id','name','email','avatar']);

        return [
            'total_projects'     => (clone $pq)->count(),
            'active_projects'    => (clone $pq)->where('status','active')->count(),
            'completed_projects' => (clone $pq)->where('status','completed')->count(),
            'total_tasks'        => $total,
            'done_tasks'         => $done,
            'overdue_tasks'      => (clone $tq)->where('due_date','<',now())->whereNotIn('status',['done','closed'])->count(),
            'due_this_week'      => (clone $tq)->whereBetween('due_date',[now()->startOfWeek(),now()->endOfWeek()])->whereNotIn('status',['done','closed'])->count(),
            'completion_rate'    => $total > 0 ? round(($done/$total)*100) : 0,
            'tasks_by_status'    => (clone $tq)->select('status',DB::raw('count(*) as count'))->groupBy('status')->pluck('count','status')->toArray(),
            'tasks_by_priority'  => (clone $tq)->select('priority',DB::raw('count(*) as count'))->groupBy('priority')->pluck('count','priority')->toArray(),
            'team_workload'      => $teamWorkload,
            'recent_projects'    => (clone $pq)->latest()->limit(6)->with('owner')->get(),
            'recent_tasks'       => (clone $tq)->latest()->limit(8)->with(['assignee','project'])->get(),
        ];
    }

    private function teamLeaderData(User $user): array
    {
        $cid  = $user->company_id;
        $myTq = Task::where('assigned_to', $user->id);
        $teamTq = Task::whereHas('project', fn($q) => $q->where('company_id', $cid));
        $myTotal = (clone $myTq)->count();
        $myDone  = (clone $myTq)->where('status','done')->count();

        return [
            'my_tasks'            => $myTotal,
            'my_todo'             => (clone $myTq)->where('status','todo')->count(),
            'my_in_progress'      => (clone $myTq)->where('status','in_progress')->count(),
            'my_done'             => $myDone,
            'my_overdue'          => (clone $myTq)->where('due_date','<',now())->whereNotIn('status',['done','closed'])->count(),
            'my_completion_rate'  => $myTotal > 0 ? round(($myDone/$myTotal)*100) : 0,
            'team_tasks'          => (clone $teamTq)->count(),
            'team_overdue'        => (clone $teamTq)->where('due_date','<',now())->whereNotIn('status',['done','closed'])->count(),
            'my_tasks_by_status'    => (clone $myTq)->select('status',DB::raw('count(*) as count'))->groupBy('status')->pluck('count','status')->toArray(),
            'my_tasks_by_priority'  => (clone $myTq)->select('priority',DB::raw('count(*) as count'))->groupBy('priority')->pluck('count','priority')->toArray(),
            'my_recent_tasks'     => (clone $myTq)->latest()->limit(8)->with('project')->get(),
        ];
    }

    private function developerData(User $user): array
    {
        $tq    = Task::where('assigned_to', $user->id);
        $total = (clone $tq)->count();
        $done  = (clone $tq)->where('status','done')->count();

        return [
            'my_tasks'          => $total,
            'todo_tasks'        => (clone $tq)->where('status','todo')->count(),
            'in_progress_tasks' => (clone $tq)->where('status','in_progress')->count(),
            'in_review_tasks'   => (clone $tq)->where('status','in_review')->count(),
            'done_tasks'        => $done,
            'overdue_tasks'     => (clone $tq)->where('due_date','<',now())->whereNotIn('status',['done','closed'])->count(),
            'due_today'         => (clone $tq)->whereDate('due_date',today())->whereNotIn('status',['done','closed'])->count(),
            'completion_rate'   => $total > 0 ? round(($done/$total)*100) : 0,
            'tasks_by_status'   => (clone $tq)->select('status',DB::raw('count(*) as count'))->groupBy('status')->pluck('count','status')->toArray(),
            'tasks_by_priority' => (clone $tq)->select('priority',DB::raw('count(*) as count'))->groupBy('priority')->pluck('count','priority')->toArray(),
            'tasks_by_type'     => (clone $tq)->select('type',DB::raw('count(*) as count'))->groupBy('type')->pluck('count','type')->toArray(),
            'recent_tasks'      => (clone $tq)->latest()->limit(8)->with('project')->get(),
            'urgent_tasks'      => (clone $tq)->whereIn('priority',['critical','high'])->whereNotIn('status',['done','closed'])->latest()->limit(4)->with('project')->get(),
        ];
    }

    private function designerData(User $user): array
    {
        $data = $this->developerData($user);
        $tq   = Task::where('assigned_to', $user->id);
        $data['design_tasks'] = (clone $tq)->whereIn('type',['feature','improvement'])->count();
        $data['review_tasks'] = (clone $tq)->where('status','in_review')->count();
        return $data;
    }

    private function testerData(User $user): array
    {
        $tq   = Task::where('assigned_to', $user->id);
        $bugs = (clone $tq)->where('type','bug');
        $total    = (clone $tq)->count();
        $done     = (clone $tq)->where('status','done')->count();
        $bugTotal = (clone $bugs)->count();
        $bugDone  = (clone $bugs)->whereIn('status',['done','closed'])->count();

        return [
            'my_tasks'          => $total,
            'open_bugs'         => (clone $bugs)->whereNotIn('status',['done','closed'])->count(),
            'closed_bugs'       => $bugDone,
            'total_bugs'        => $bugTotal,
            'in_review_tasks'   => (clone $tq)->where('status','in_review')->count(),
            'overdue_tasks'     => (clone $tq)->where('due_date','<',now())->whereNotIn('status',['done','closed'])->count(),
            'completion_rate'   => $total > 0 ? round(($done/$total)*100) : 0,
            'bug_fix_rate'      => $bugTotal > 0 ? round(($bugDone/$bugTotal)*100) : 0,
            'tasks_by_status'   => (clone $tq)->select('status',DB::raw('count(*) as count'))->groupBy('status')->pluck('count','status')->toArray(),
            'recent_tasks'      => (clone $tq)->latest()->limit(8)->with('project')->get(),
            'critical_bugs'     => (clone $bugs)->where('priority','critical')->whereNotIn('status',['done','closed'])->latest()->limit(4)->with('project')->get(),
        ];
    }

    private function hrData(?int $companyId): array
    {
        $uq = User::query()->when($companyId, fn($q) => $q->where('company_id', $companyId));
        $total  = (clone $uq)->count();
        $active = (clone $uq)->where('is_active',true)->count();

        $byRole = DB::table('model_has_roles')
            ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
            ->join('users', 'users.id', '=', 'model_has_roles.model_id')
            ->when($companyId, fn($q) => $q->where('users.company_id', $companyId))
            ->select('roles.name as role', DB::raw('count(*) as count'))
            ->groupBy('roles.name')->pluck('count','role')->toArray();

        $newThisMonth = (clone $uq)->whereYear('created_at',now()->year)->whereMonth('created_at',now()->month)->count();
        $newLastMonth = (clone $uq)->whereYear('created_at',now()->subMonth()->year)->whereMonth('created_at',now()->subMonth()->month)->count();

        return [
            'total_employees'    => $total,
            'active_employees'   => $active,
            'inactive_employees' => $total - $active,
            'new_this_month'     => $newThisMonth,
            'new_last_month'     => $newLastMonth,
            'headcount_growth'   => $newLastMonth > 0
                ? round((($newThisMonth - $newLastMonth) / $newLastMonth) * 100)
                : ($newThisMonth > 0 ? 100 : 0),
            'employees_by_role'  => $byRole,
            'recent_hires'       => (clone $uq)->latest()->limit(8)->with('roles:id,name')
                ->get(['id','name','email','avatar','job_title','department','is_active','created_at']),
        ];
    }
}