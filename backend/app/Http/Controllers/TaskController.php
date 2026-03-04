<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Task;
use App\Models\TimeLog;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class TaskController extends Controller
{
    // ── Index with advanced filters ────────────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        try {
            $query = Task::with('project', 'story', 'assignee', 'reporter', 'parent')
                ->withCount(['subTasks', 'comments', 'attachments']);

            // Filters
            if ($request->project_id)  $query->where('project_id',  $request->project_id);
            if ($request->story_id)    $query->where('story_id',    $request->story_id);
            if ($request->assigned_to) $query->where('assigned_to', $request->assigned_to);
            if ($request->reporter_id) $query->where('reporter_id', $request->reporter_id);
            if ($request->parent_id)   $query->where('parent_id',   $request->parent_id);
            if ($request->status)      $query->where('status',      $request->status);
            if ($request->priority)    $query->where('priority',    $request->priority);
            if ($request->type)        $query->where('type',        $request->type);

            if ($request->search) {
                $query->where(function ($q) use ($request) {
                    $q->where('title',       'like', '%' . $request->search . '%')
                      ->orWhere('description','like', '%' . $request->search . '%');
                });
            }

            if ($request->due_from) $query->whereDate('due_date', '>=', $request->due_from);
            if ($request->due_to)   $query->whereDate('due_date', '<=', $request->due_to);

            if ($request->overdue === 'true') {
                $query->where('due_date', '<', now())
                      ->whereNotIn('status', ['done', 'closed']);
            }

            if ($request->has_no_assignee === 'true') {
                $query->whereNull('assigned_to');
            }

            // Sort
            $sortBy  = $request->sort_by  ?? 'created_at';
            $sortDir = $request->sort_dir ?? 'desc';
            $allowed = ['created_at','updated_at','due_date','priority','title','sort_order','completion_percentage'];
            if (in_array($sortBy, $allowed)) {
                $query->orderBy($sortBy, $sortDir);
            }

            $perPage = $request->per_page ?? 50;
            $tasks   = $query->paginate($perPage);

            return response()->json($tasks);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    // ── Kanban grouped by status ───────────────────────────────────────────────

    public function kanban(Request $request): JsonResponse
    {
        try {
            $query = Task::with('assignee', 'project', 'story')
                ->withCount(['subTasks', 'comments', 'attachments']);

            if ($request->project_id) $query->where('project_id', $request->project_id);
            if ($request->story_id)   $query->where('story_id',   $request->story_id);
            if ($request->assigned_to) $query->where('assigned_to', $request->assigned_to);

            $tasks = $query->orderBy('sort_order')->orderBy('created_at')->get();

            $columns = [
                'backlog'     => [],
                'todo'        => [],
                'in_progress' => [],
                'in_review'   => [],
                'done'        => [],
                'closed'      => [],
            ];

            foreach ($tasks as $task) {
                $status = $task->status ?? 'backlog';
                if (array_key_exists($status, $columns)) {
                    $columns[$status][] = $task;
                }
            }

            return response()->json($columns);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    // ── Store ──────────────────────────────────────────────────────────────────

    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'project_id'            => 'required|exists:projects,id',
                'story_id'              => 'nullable|exists:user_stories,id',
                'parent_id'             => 'nullable|exists:tasks,id',
                'title'                 => 'required|string|max:500',
                'description'           => 'nullable|string',
                'status'                => 'nullable|in:backlog,todo,in_progress,in_review,done,closed',
                'priority'              => 'nullable|in:low,medium,high,critical',
                'type'                  => 'nullable|in:task,bug,feature,improvement,test,research,design,documentation',
                'due_date'              => 'nullable|date',
                'assigned_to'           => 'nullable|exists:users,id',
                'reporter_id'           => 'nullable|exists:users,id',
                'estimate_hours'        => 'nullable|integer|min:0',
                'estimate_minutes'      => 'nullable|integer|min:0|max:59',
                'completion_percentage' => 'nullable|integer|min:0|max:100',
                'completion_note'       => 'nullable|string',
                'labels'                => 'nullable|array',
                'labels.*'              => 'string|max:50',
                'environment'           => 'nullable|string|max:100',
                'version'               => 'nullable|string|max:50',
                'acceptance_criteria'   => 'nullable|string',
                'sort_order'            => 'nullable|integer',
            ]);

            $task = Task::create([
                'project_id'            => $validated['project_id'],
                'story_id'              => $validated['story_id']    ?? null,
                'parent_id'             => $validated['parent_id']   ?? null,
                'title'                 => $validated['title'],
                'description'           => $validated['description'] ?? null,
                'status'                => $validated['status']      ?? 'todo',
                'priority'              => $validated['priority']    ?? 'medium',
                'type'                  => $validated['type']        ?? 'task',
                'due_date'              => $validated['due_date']    ?? null,
                'assigned_to'           => $validated['assigned_to'] ?? null,
                'reporter_id'           => $validated['reporter_id'] ?? Auth::id(),
                'estimate_hours'        => $validated['estimate_hours']   ?? 0,
                'estimate_minutes'      => $validated['estimate_minutes'] ?? 0,
                'logged_hours'          => 0,
                'logged_minutes'        => 0,
                'completion_percentage' => $validated['completion_percentage'] ?? 0,
                'completion_note'       => $validated['completion_note']       ?? null,
                'labels'                => $validated['labels']       ?? [],
                'environment'           => $validated['environment']  ?? null,
                'version'               => $validated['version']      ?? null,
                'acceptance_criteria'   => $validated['acceptance_criteria'] ?? null,
                'sort_order'            => $validated['sort_order']   ?? 0,
            ]);

            // Send assignment notification
            if ($task->assigned_to && $task->assigned_to !== Auth::id()) {
                try {
                    $assignee = User::find($task->assigned_to);
                    if ($assignee) {
                        $assignee->notify(new \App\Notifications\TaskAssigned($task));
                    }
                } catch (\Exception $e) {
                    // Don't fail if notification fails
                }
            }

            return response()->json(
                $task->load('project', 'story', 'assignee', 'reporter')
                     ->loadCount(['subTasks', 'comments', 'attachments']),
                201
            );
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    // ── Show ───────────────────────────────────────────────────────────────────

    public function show(Task $task): JsonResponse
    {
        try {
            $task->load([
                'project', 'story', 'assignee', 'reporter', 'parent',
                'subTasks.assignee',
                'timeLogs.user',
                'comments.user',
                'attachments.user',
                'activityLogs.user',
            ]);
            $task->loadCount(['subTasks', 'comments', 'attachments', 'timeLogs']);

            // Child tasks (subtask parent_id)
            $task->child_tasks = Task::where('parent_id', $task->id)
                ->with('assignee')
                ->orderBy('sort_order')
                ->get();

            return response()->json($task);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    // ── Update ─────────────────────────────────────────────────────────────────

    public function update(Request $request, Task $task): JsonResponse
    {
        try {
            $validated = $request->validate([
                'title'                 => 'sometimes|required|string|max:500',
                'description'           => 'nullable|string',
                'status'                => 'nullable|in:backlog,todo,in_progress,in_review,done,closed',
                'priority'              => 'nullable|in:low,medium,high,critical',
                'type'                  => 'nullable|in:task,bug,feature,improvement,test,research,design,documentation',
                'due_date'              => 'nullable|date',
                'assigned_to'           => 'nullable|exists:users,id',
                'reporter_id'           => 'nullable|exists:users,id',
                'story_id'              => 'nullable|exists:user_stories,id',
                'parent_id'             => 'nullable|exists:tasks,id',
                'estimate_hours'        => 'nullable|integer|min:0',
                'estimate_minutes'      => 'nullable|integer|min:0|max:59',
                'logged_hours'          => 'nullable|integer|min:0',
                'logged_minutes'        => 'nullable|integer|min:0|max:59',
                'completion_percentage' => 'nullable|integer|min:0|max:100',
                'completion_note'       => 'nullable|string',
                'started_at'            => 'nullable|date',
                'completed_at'          => 'nullable|date',
                'labels'                => 'nullable|array',
                'labels.*'              => 'string|max:50',
                'environment'           => 'nullable|string|max:100',
                'version'               => 'nullable|string|max:50',
                'acceptance_criteria'   => 'nullable|string',
                'sort_order'            => 'nullable|integer',
            ]);

            $oldAssignee = $task->assigned_to;
            $task->update($validated);

            // Send notification if assignee changed
            if (
                isset($validated['assigned_to']) &&
                $validated['assigned_to'] &&
                $validated['assigned_to'] != $oldAssignee &&
                $validated['assigned_to'] != Auth::id()
            ) {
                try {
                    $assignee = User::find($validated['assigned_to']);
                    if ($assignee) {
                        $assignee->notify(new \App\Notifications\TaskAssigned($task));
                    }
                } catch (\Exception $e) {}
            }

            return response()->json(
                $task->fresh()->load('project', 'story', 'assignee', 'reporter')
                     ->loadCount(['subTasks', 'comments', 'attachments'])
            );
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    // ── Destroy ────────────────────────────────────────────────────────────────

    public function destroy(Task $task): JsonResponse
    {
        try {
            // Delete attachments from storage
            foreach ($task->attachments as $att) {
                Storage::disk('public')->delete($att->path);
            }
            $task->delete();
            return response()->json(['message' => 'Task deleted successfully']);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    // ── Update status (kanban drag) ────────────────────────────────────────────

    public function updateStatus(Request $request, Task $task): JsonResponse
    {
        try {
            $validated = $request->validate([
                'status'     => 'required|in:backlog,todo,in_progress,in_review,done,closed',
                'sort_order' => 'nullable|integer',
            ]);

            $data = ['status' => $validated['status']];

            if ($validated['status'] === 'in_progress' && !$task->started_at) {
                $data['started_at'] = now();
            }
            if (in_array($validated['status'], ['done', 'closed']) && !$task->completed_at) {
                $data['completed_at']          = now();
                $data['completion_percentage'] = 100;
            }
            if (!in_array($validated['status'], ['done', 'closed'])) {
                $data['completed_at'] = null;
            }
            if (isset($validated['sort_order'])) {
                $data['sort_order'] = $validated['sort_order'];
            }

            $task->update($data);

            return response()->json($task->fresh()->load('assignee', 'project'));
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    // ── Log time ───────────────────────────────────────────────────────────────

    public function logTime(Request $request, Task $task): JsonResponse
    {
        try {
            $validated = $request->validate([
                'hours'       => 'required|integer|min:0',
                'minutes'     => 'required|integer|min:0|max:59',
                'logged_date' => 'nullable|date',
                'description' => 'nullable|string|max:500',
            ]);

            // Create time log entry
            $timeLog = TimeLog::create([
                'task_id'     => $task->id,
                'user_id'     => Auth::id(),
                'hours'       => $validated['hours'],
                'minutes'     => $validated['minutes'],
                'logged_date' => $validated['logged_date'] ?? now()->toDateString(),
                'description' => $validated['description'] ?? null,
            ]);

            // Recalculate totals from all time logs
            $this->recalculateLoggedTime($task);

            return response()->json([
                'task'     => $task->fresh()->load('assignee', 'timeLogs.user'),
                'time_log' => $timeLog->load('user'),
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    // ── Delete time log ────────────────────────────────────────────────────────

    public function deleteTimeLog(Task $task, TimeLog $timeLog): JsonResponse
    {
        try {
            if ($timeLog->task_id !== $task->id) {
                return response()->json(['message' => 'Time log does not belong to this task'], 403);
            }
            $timeLog->delete();
            $this->recalculateLoggedTime($task);

            return response()->json($task->fresh()->load('timeLogs.user'));
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    // ── Update completion ──────────────────────────────────────────────────────

    public function updateCompletion(Request $request, Task $task): JsonResponse
    {
        try {
            $validated = $request->validate([
                'completion_percentage' => 'required|integer|min:0|max:100',
                'completion_note'       => 'nullable|string|max:1000',
            ]);

            $data = [
                'completion_percentage' => $validated['completion_percentage'],
                'completion_note'       => $validated['completion_note'] ?? $task->completion_note,
            ];

            if ($validated['completion_percentage'] === 100) {
                $data['status']       = 'done';
                $data['completed_at'] = $task->completed_at ?? now();
            } elseif ($validated['completion_percentage'] > 0 && in_array($task->status, ['backlog', 'todo'])) {
                $data['status']     = 'in_progress';
                $data['started_at'] = $task->started_at ?? now();
            }

            $task->update($data);

            return response()->json($task->fresh()->load('assignee', 'project'));
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    // ── Task statistics ────────────────────────────────────────────────────────

    public function stats(Request $request): JsonResponse
    {
        try {
            $query = Task::query();
            if ($request->project_id) $query->where('project_id', $request->project_id);

            $tasks = $query->with('assignee')->get();

            $overdue = $tasks->filter(fn($t) =>
                $t->due_date &&
                Carbon::parse($t->due_date)->isPast() &&
                !in_array($t->status, ['done', 'closed'])
            );

            $topAssignees = $tasks->groupBy('assigned_to')
                ->map(fn($group) => [
                    'user'       => $group->first()->assignee,
                    'total'      => $group->count(),
                    'done'       => $group->whereIn('status', ['done','closed'])->count(),
                    'in_progress'=> $group->where('status', 'in_progress')->count(),
                ])
                ->filter(fn($a) => $a['user'] !== null)
                ->sortByDesc('total')
                ->values()
                ->take(5);

            return response()->json([
                'total'               => $tasks->count(),
                'by_status'           => $tasks->groupBy('status')->map->count(),
                'by_priority'         => $tasks->groupBy('priority')->map->count(),
                'by_type'             => $tasks->groupBy('type')->map->count(),
                'overdue_count'       => $overdue->count(),
                'overdue_tasks'       => $overdue->take(10)->values(),
                'top_assignees'       => $topAssignees,
                'total_estimate_min'  => $tasks->sum(fn($t) =>
                    ($t->estimate_hours ?? 0) * 60 + ($t->estimate_minutes ?? 0)
                ),
                'total_logged_min'    => $tasks->sum(fn($t) =>
                    ($t->logged_hours ?? 0) * 60 + ($t->logged_minutes ?? 0)
                ),
                'avg_completion'      => $tasks->count() > 0
                    ? round($tasks->avg('completion_percentage'))
                    : 0,
                'completed_this_week' => $tasks->filter(fn($t) =>
                    $t->completed_at &&
                    Carbon::parse($t->completed_at)->isCurrentWeek()
                )->count(),
                'created_this_week'   => $tasks->filter(fn($t) =>
                    Carbon::parse($t->created_at)->isCurrentWeek()
                )->count(),
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    // ── Bulk update ────────────────────────────────────────────────────────────

    public function bulkUpdate(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'task_ids'   => 'required|array',
                'task_ids.*' => 'exists:tasks,id',
                'action'     => 'required|in:status,priority,assign,delete',
                'value'      => 'nullable|string',
            ]);

            $tasks = Task::whereIn('id', $validated['task_ids'])->get();

            switch ($validated['action']) {
                case 'status':
                    Task::whereIn('id', $validated['task_ids'])
                        ->update(['status' => $validated['value']]);
                    break;
                case 'priority':
                    Task::whereIn('id', $validated['task_ids'])
                        ->update(['priority' => $validated['value']]);
                    break;
                case 'assign':
                    Task::whereIn('id', $validated['task_ids'])
                        ->update(['assigned_to' => $validated['value'] ?: null]);
                    break;
                case 'delete':
                    Task::whereIn('id', $validated['task_ids'])->delete();
                    break;
            }

            return response()->json([
                'message' => ucfirst($validated['action']) . ' applied to ' . count($validated['task_ids']) . ' tasks',
                'count'   => count($validated['task_ids']),
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    // ── Duplicate task ─────────────────────────────────────────────────────────

    public function duplicate(Task $task): JsonResponse
    {
        try {
            $new = $task->replicate();
            $new->title      = $task->title . ' (Copy)';
            $new->status     = 'todo';
            $new->started_at = null;
            $new->completed_at = null;
            $new->completion_percentage = 0;
            $new->logged_hours   = 0;
            $new->logged_minutes = 0;
            $new->save();

            return response()->json(
                $new->load('project', 'assignee', 'reporter'),
                201
            );
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    private function recalculateLoggedTime(Task $task): void
    {
        $logs         = TimeLog::where('task_id', $task->id)->get();
        $totalMinutes = $logs->sum(fn($l) => ($l->hours * 60) + $l->minutes);
        $task->update([
            'logged_hours'   => intdiv($totalMinutes, 60),
            'logged_minutes' => $totalMinutes % 60,
        ]);
    }
}