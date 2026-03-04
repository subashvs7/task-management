<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $role = $user->getRoleNames()->first();
        $companyId = $user->company_id;

        $data = match ($role) {
            'admin' => $this->adminData($companyId),
            'manager' => $this->managerData($companyId),
            'team_leader' => $this->teamLeaderData($user),
            'developer' => $this->developerData($user),
            'designer' => $this->designerData($user),
            'tester' => $this->testerData($user),
            'hr' => $this->hrData($companyId),
            default => $this->developerData($user),
        };

        return response()->json([
            'role' => $role,
            'user' => $user->only('id', 'name', 'email', 'avatar'),
            'data' => $data,
        ]);
    }

    private function adminData(?int $companyId): array
    {
        $projectQuery = Project::query();
        $userQuery = User::query();
        $taskQuery = Task::query();

        if ($companyId) {
            $projectQuery->where('company_id', $companyId);
            $userQuery->where('company_id', $companyId);
            $taskQuery->whereHas('project', fn($q) => $q->where('company_id', $companyId));
        }

        return [
            'total_projects' => $projectQuery->count(),
            'active_projects' => (clone $projectQuery)->where('status', 'active')->count(),
            'total_users' => $userQuery->count(),
            'total_tasks' => $taskQuery->count(),
            'tasks_by_status' => [
                'todo' => (clone $taskQuery)->where('status', 'todo')->count(),
                'in_progress' => (clone $taskQuery)->where('status', 'in_progress')->count(),
                'done' => (clone $taskQuery)->where('status', 'done')->count(),
            ],
            'recent_projects' => $projectQuery->latest()->limit(5)->with('owner')->get(),
        ];
    }

    private function managerData(?int $companyId): array
    {
        $projectQuery = Project::query();
        $taskQuery = Task::query();

        if ($companyId) {
            $projectQuery->where('company_id', $companyId);
            $taskQuery->whereHas('project', fn($q) => $q->where('company_id', $companyId));
        }

        return [
            'total_projects' => $projectQuery->count(),
            'active_projects' => (clone $projectQuery)->where('status', 'active')->count(),
            'total_tasks' => $taskQuery->count(),
            'overdue_tasks' => (clone $taskQuery)->where('due_date', '<', now())->whereNotIn('status', ['done', 'closed'])->count(),
            'recent_projects' => $projectQuery->latest()->limit(5)->with('owner')->get(),
            'tasks_by_priority' => [
                'critical' => (clone $taskQuery)->where('priority', 'critical')->count(),
                'high' => (clone $taskQuery)->where('priority', 'high')->count(),
                'medium' => (clone $taskQuery)->where('priority', 'medium')->count(),
                'low' => (clone $taskQuery)->where('priority', 'low')->count(),
            ],
        ];
    }

    private function teamLeaderData(User $user): array
    {
        $companyId = $user->company_id;
        $taskQuery = Task::whereHas('project', fn($q) => $q->where('company_id', $companyId));

        return [
            'my_tasks' => Task::where('assigned_to', $user->id)->count(),
            'my_in_progress_tasks' => Task::where('assigned_to', $user->id)->where('status', 'in_progress')->count(),
            'team_tasks' => $taskQuery->count(),
            'overdue_tasks' => $taskQuery->where('due_date', '<', now())->whereNotIn('status', ['done', 'closed'])->count(),
            'my_recent_tasks' => Task::where('assigned_to', $user->id)->latest()->limit(5)->with('project')->get(),
        ];
    }

    private function developerData(User $user): array
    {
        return [
            'my_tasks' => Task::where('assigned_to', $user->id)->count(),
            'todo_tasks' => Task::where('assigned_to', $user->id)->where('status', 'todo')->count(),
            'in_progress_tasks' => Task::where('assigned_to', $user->id)->where('status', 'in_progress')->count(),
            'done_tasks' => Task::where('assigned_to', $user->id)->where('status', 'done')->count(),
            'overdue_tasks' => Task::where('assigned_to', $user->id)->where('due_date', '<', now())->whereNotIn('status', ['done', 'closed'])->count(),
            'recent_tasks' => Task::where('assigned_to', $user->id)->latest()->limit(5)->with('project')->get(),
        ];
    }

    private function designerData(User $user): array
    {
        return $this->developerData($user);
    }

    private function testerData(User $user): array
    {
        $bugs = Task::where('assigned_to', $user->id)->where('type', 'bug');
        return [
            'my_tasks' => Task::where('assigned_to', $user->id)->count(),
            'open_bugs' => (clone $bugs)->whereNotIn('status', ['done', 'closed'])->count(),
            'closed_bugs' => (clone $bugs)->whereIn('status', ['done', 'closed'])->count(),
            'in_review_tasks' => Task::where('assigned_to', $user->id)->where('status', 'in_review')->count(),
            'recent_tasks' => Task::where('assigned_to', $user->id)->latest()->limit(5)->with('project')->get(),
        ];
    }

    private function hrData(?int $companyId): array
    {
        $userQuery = User::query();
        if ($companyId) {
            $userQuery->where('company_id', $companyId);
        }

        return [
            'total_employees' => $userQuery->count(),
            'active_employees' => (clone $userQuery)->where('is_active', true)->count(),
            'roles_breakdown' => User::selectRaw('count(*) as count')
                ->when($companyId, fn($q) => $q->where('company_id', $companyId))
                ->with('roles')
                ->get(),
            'recent_users' => $userQuery->latest()->limit(5)->with('roles')->get(),
        ];
    }
}