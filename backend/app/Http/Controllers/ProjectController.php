<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class ProjectController extends Controller
{
    // ══ GET /api/projects ════════════════════════════════════════════

    public function index(Request $request): JsonResponse
    {
        try {
            $user      = $request->user();
            $companyId = $user->company_id;

            $query = Project::withCount(['tasks', 'userStories'])
                ->with('owner:id,name,email');

            if ($companyId) {
                $query->where('company_id', $companyId);
            }

            if ($request->filled('search')) {
                $s = $request->search;
                $query->where(function ($q) use ($s) {
                    $q->where('name', 'like', "%{$s}%")
                      ->orWhere('description', 'like', "%{$s}%")
                      ->orWhere('key', 'like', "%{$s}%");
                });
            }

            if ($request->filled('status'))   $query->where('status',   $request->status);
            if ($request->filled('priority'))  $query->where('priority', $request->priority);

            $projects = $query->orderBy('created_at', 'desc')->get();

            return response()->json(['data' => $projects]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    // ══ POST /api/projects ═══════════════════════════════════════════

    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'name'        => 'required|string|max:255',
                'key'         => 'nullable|string|max:10',
                'description' => 'nullable|string',
                'status'      => 'nullable|in:planning,active,inactive,completed,on_hold,cancelled',
                'priority'    => 'nullable|in:low,medium,high,critical',
                'color'       => 'nullable|string|max:7',
                'start_date'  => 'nullable|date',
                'end_date'    => 'nullable|date|after_or_equal:start_date',
                'owner_id'    => 'nullable|exists:users,id',
            ]);

            $project = Project::create([
                'company_id'  => $request->user()->company_id,
                'name'        => $validated['name'],
                'key'         => $validated['key'] ?? strtoupper(Str::random(4)),
                'description' => $validated['description']  ?? null,
                'status'      => $validated['status']       ?? 'active',
                'priority'    => $validated['priority']     ?? 'medium',
                'color'       => $validated['color']        ?? '#6366f1',
                'start_date'  => $validated['start_date']   ?? null,
                'end_date'    => $validated['end_date']     ?? null,
                'owner_id'    => $validated['owner_id']     ?? Auth::id(),
            ]);

            return response()->json($project->load('owner:id,name,email'), 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    // ══ GET /api/projects/users  (scoped by role — for dropdowns) ════
    // NOTE: This route must be registered BEFORE apiResource('projects')
    //       so it is not swallowed by the {project} param route.

    public function users(Request $request): JsonResponse
    {
        try {
            $authUser  = $request->user();
            $authRole  = $authUser->getRoleNames()->first();
            $companyId = $authUser->company_id;

            if (in_array($authRole, ['admin', 'manager', 'hr', 'team_leader'])) {
                $users = User::when($companyId, fn($q) => $q->where('company_id', $companyId))
                    ->where('is_active', true)
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

    // ══ GET /api/projects/{project} ══════════════════════════════════
    // Returns: project + tasks_by_status + tasks_by_priority + recent_tasks

    public function show(Project $project): JsonResponse
    {
        try {
            $project->loadCount(['tasks', 'userStories'])
                    ->load('owner:id,name,email');

            $tasksByStatus = Task::where('project_id', $project->id)
                ->selectRaw('status, count(*) as count')
                ->groupBy('status')
                ->pluck('count', 'status')
                ->toArray();

            $tasksByPriority = Task::where('project_id', $project->id)
                ->selectRaw('priority, count(*) as count')
                ->groupBy('priority')
                ->pluck('count', 'priority')
                ->toArray();

            $recentTasks = Task::where('project_id', $project->id)
                ->with(['assignee:id,name,email', 'project:id,name'])
                ->orderBy('updated_at', 'desc')
                ->limit(10)
                ->get();

            return response()->json([
                'project'           => $project,
                'tasks_by_status'   => $tasksByStatus,
                'tasks_by_priority' => $tasksByPriority,
                'recent_tasks'      => $recentTasks,
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    // ══ GET /api/projects/{project}/stats ════════════════════════════

    public function stats(Project $project): JsonResponse
    {
        try {
            $taskBase = Task::where('project_id', $project->id);

            $totalTasks     = (clone $taskBase)->count();
            $completedTasks = (clone $taskBase)->where('status', 'done')->count();
            $inProgress     = (clone $taskBase)->where('status', 'in_progress')->count();
            $overdue        = (clone $taskBase)
                ->whereDate('due_date', '<', now())
                ->whereNotIn('status', ['done', 'closed'])
                ->count();

            // Time tracking — guard against missing columns gracefully
            try {
                $timeData = (clone $taskBase)
                    ->selectRaw('
                        COALESCE(SUM(estimate_hours * 60 + COALESCE(estimate_minutes, 0)), 0) AS est_min,
                        COALESCE(SUM(logged_hours   * 60 + COALESCE(logged_minutes,   0)), 0) AS log_min,
                        COALESCE(AVG(completion_percentage), 0) AS avg_pct
                    ')
                    ->first();
                $estMin  = (int) ($timeData->est_min ?? 0);
                $logMin  = (int) ($timeData->log_min ?? 0);
                $avgPct  = round($timeData->avg_pct  ?? 0, 1);
            } catch (\Exception) {
                $estMin = $logMin = 0;
                $avgPct = 0.0;
            }

            // Members — distinct assigned users
            $memberIds = Task::where('project_id', $project->id)
                ->whereNotNull('assigned_to')
                ->pluck('assigned_to')
                ->unique();

            $members = User::whereIn('id', $memberIds)
                ->get(['id', 'name', 'email']);

            return response()->json([
                'total_tasks'            => $totalTasks,
                'completed_tasks'        => $completedTasks,
                'in_progress_tasks'      => $inProgress,
                'overdue_tasks'          => $overdue,
                'total_estimate_minutes' => $estMin,
                'total_logged_minutes'   => $logMin,
                'avg_completion'         => $avgPct,
                'members_count'          => $members->count(),
                'members'               => $members,
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    // ══ PUT /api/projects/{project} ══════════════════════════════════

    public function update(Request $request, Project $project): JsonResponse
    {
        try {
            $validated = $request->validate([
                'name'        => 'sometimes|required|string|max:255',
                'key'         => 'nullable|string|max:10',
                'description' => 'nullable|string',
                'status'      => 'nullable|in:planning,active,inactive,completed,on_hold,cancelled',
                'priority'    => 'nullable|in:low,medium,high,critical',
                'color'       => 'nullable|string|max:7',
                'start_date'  => 'nullable|date',
                'end_date'    => 'nullable|date',
                'owner_id'    => 'nullable|exists:users,id',
            ]);

            $project->update($validated);

            return response()->json($project->fresh()->load('owner:id,name,email'));
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    // ══ DELETE /api/projects/{project} ═══════════════════════════════

    public function destroy(Project $project): JsonResponse
    {
        try {
            $project->delete();
            return response()->json(['message' => 'Project deleted']);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }
}