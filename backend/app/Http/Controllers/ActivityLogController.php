<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ActivityLogController extends Controller
{
    // ══════════════════════════════════════════════════════════════════
    // GET /api/activity-logs
    // ══════════════════════════════════════════════════════════════════

    public function index(Request $request): JsonResponse
    {
        try {
            $authUser  = $request->user();
            $authRole  = $authUser->getRoleNames()->first();
            $companyId = $authUser->company_id;

            $query = ActivityLog::with('user')
                ->orderBy('created_at', 'desc');

            // Scope to company — only show logs for users in same company
            if ($companyId) {
                $companyUserIds = User::where('company_id', $companyId)->pluck('id');
                $query->whereIn('user_id', $companyUserIds);
            }

            // Non-admin / non-manager roles only see their own logs
            if (!in_array($authRole, ['admin', 'manager', 'hr'])) {
                $query->where('user_id', $authUser->id);
            }

            if ($request->filled('project_id')) {
                $projectId = $request->project_id;
                $query->where(function ($q) use ($projectId) {
                    $q->where(function ($q2) use ($projectId) {
                        $q2->where('loggable_type', Task::class)
                            ->whereIn('loggable_id', function ($sub) use ($projectId) {
                                $sub->select('id')->from('tasks')->where('project_id', $projectId);
                            });
                    })->orWhere(function ($q2) use ($projectId) {
                        $q2->where('loggable_type', Project::class)
                            ->where('loggable_id', $projectId);
                    });
                });
            }

            if ($request->filled('user_id')) {
                $query->where('user_id', $request->user_id);
            }

            if ($request->filled('action')) {
                $query->where('action', $request->action);
            }

            if ($request->filled('from')) {
                $query->whereDate('created_at', '>=', $request->from);
            }

            if ($request->filled('to')) {
                $query->whereDate('created_at', '<=', $request->to);
            }

            return response()->json($query->paginate(30));
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    // ══════════════════════════════════════════════════════════════════
    // GET /api/activity-logs/my  — current user's own activity
    // ══════════════════════════════════════════════════════════════════

    public function myActivity(Request $request): JsonResponse
    {
        try {
            $logs = ActivityLog::with('user')
                ->where('user_id', $request->user()->id)
                ->orderBy('created_at', 'desc')
                ->paginate(30);

            return response()->json($logs);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    // ══════════════════════════════════════════════════════════════════
    // GET /api/activity-logs/users
    // Returns users visible to the current role for the filter dropdown.
    // Avoids calling /api/users which requires admin/manager/hr/team_leader.
    // ══════════════════════════════════════════════════════════════════

    public function users(Request $request): JsonResponse
    {
        try {
            $authUser  = $request->user();
            $authRole  = $authUser->getRoleNames()->first();
            $companyId = $authUser->company_id;

            // admin / manager / hr  → all company users
            // everyone else         → only themselves (so the filter still works)
            if (in_array($authRole, ['admin', 'manager', 'hr', 'team_leader'])) {
                $users = User::when($companyId, fn($q) => $q->where('company_id', $companyId))
                    ->orderBy('name')
                    ->get(['id', 'name', 'email']);
            } else {
                $users = collect([$authUser->only('id', 'name', 'email')]);
            }

            return response()->json($users);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    // ══════════════════════════════════════════════════════════════════
    // GET /api/activity-logs/project/{project}
    // ══════════════════════════════════════════════════════════════════

    public function forProject(Request $request, Project $project): JsonResponse
    {
        try {
            $taskIds = Task::where('project_id', $project->id)->pluck('id');

            $logs = ActivityLog::with('user')
                ->where(function ($q) use ($project, $taskIds) {
                    $q->where(function ($q2) use ($project) {
                        $q2->where('loggable_type', Project::class)
                            ->where('loggable_id', $project->id);
                    })->orWhere(function ($q2) use ($taskIds) {
                        $q2->where('loggable_type', Task::class)
                            ->whereIn('loggable_id', $taskIds);
                    });
                })
                ->orderBy('created_at', 'desc')
                ->paginate(50);

            return response()->json($logs);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    // ══════════════════════════════════════════════════════════════════
    // GET /api/activity-logs/task/{task}
    // ══════════════════════════════════════════════════════════════════

    public function forTask(Request $request, Task $task): JsonResponse
    {
        try {
            $logs = ActivityLog::with('user')
                ->where('loggable_type', Task::class)
                ->where('loggable_id', $task->id)
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json($logs);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }
}