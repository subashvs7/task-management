<?php

namespace App\Http\Controllers;

use App\Models\Epic;
use App\Models\Task;
use App\Models\UserStory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EpicController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        try {
            $query = Epic::with('project');

            if ($request->project_id) {
                $query->where('project_id', $request->project_id);
            }
            if ($request->status) {
                $query->where('status', $request->status);
            }
            if ($request->priority) {
                $query->where('priority', $request->priority);
            }
            if ($request->search) {
                $query->where(function ($q) use ($request) {
                    $q->where('name', 'like', '%' . $request->search . '%')
                      ->orWhere('description', 'like', '%' . $request->search . '%');
                });
            }

            $epics = $query
                ->withCount('userStories')
                ->orderBy('created_at', 'desc')
                ->get();

            // Enrich with task stats
            $epics->each(function ($epic) {
                $storyIds = $epic->userStories()->pluck('id');
                $tasks    = Task::whereIn('story_id', $storyIds)->get();

                $epic->tasks_count         = $tasks->count();
                $epic->completed_tasks     = $tasks->whereIn('status', ['done', 'closed'])->count();
                $epic->in_progress_tasks   = $tasks->where('status', 'in_progress')->count();
                $epic->overdue_tasks       = $tasks->filter(fn($t) =>
                    $t->due_date &&
                    \Carbon\Carbon::parse($t->due_date)->isPast() &&
                    !in_array($t->status, ['done', 'closed'])
                )->count();

                $totalEstimate = $tasks->sum(fn($t) =>
                    ($t->estimate_hours ?? 0) * 60 + ($t->estimate_minutes ?? 0)
                );
                $totalLogged = $tasks->sum(fn($t) =>
                    ($t->logged_hours ?? 0) * 60 + ($t->logged_minutes ?? 0)
                );

                $epic->total_estimate_minutes = $totalEstimate;
                $epic->total_logged_minutes   = $totalLogged;

                $epic->completion_percentage = $tasks->count() > 0
                    ? round(($epic->completed_tasks / $tasks->count()) * 100)
                    : 0;

                $epic->total_story_points = $epic->userStories()->sum('story_points');
            });

            return response()->json($epics);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'project_id'  => 'required|exists:projects,id',
                'name'        => 'required|string|max:255',
                'description' => 'nullable|string',
                'status'      => 'nullable|in:open,in_progress,done,closed',
                'priority'    => 'nullable|in:low,medium,high,critical',
                'start_date'  => 'nullable|date',
                'end_date'    => 'nullable|date|after_or_equal:start_date',
                'color'       => 'nullable|string|max:7',
                'goal'        => 'nullable|string|max:1000',
            ]);

            $epic = Epic::create([
                'project_id'  => $validated['project_id'],
                'name'        => $validated['name'],
                'description' => $validated['description'] ?? null,
                'status'      => $validated['status'] ?? 'open',
                'priority'    => $validated['priority'] ?? 'medium',
                'start_date'  => $validated['start_date'] ?? null,
                'end_date'    => $validated['end_date'] ?? null,
                'color'       => $validated['color'] ?? '#6366f1',
                'goal'        => $validated['goal'] ?? null,
            ]);

            return response()->json(
                $epic->load('project')->loadCount('userStories'),
                201
            );
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function show(Epic $epic): JsonResponse
    {
        try {
            $epic->load('project', 'userStories.assignee', 'userStories.tasks.assignee');

            $storyIds  = $epic->userStories->pluck('id');
            $tasks     = Task::with('assignee', 'reporter')
                ->whereIn('story_id', $storyIds)
                ->get();

            $epic->all_tasks          = $tasks;
            $epic->tasks_count        = $tasks->count();
            $epic->completed_tasks    = $tasks->whereIn('status', ['done', 'closed'])->count();
            $epic->in_progress_tasks  = $tasks->where('status', 'in_progress')->count();
            $epic->completion_percentage = $tasks->count() > 0
                ? round(($epic->completed_tasks / $tasks->count()) * 100)
                : 0;

            $epic->total_story_points = $epic->userStories->sum('story_points');
            $epic->done_story_points  = $epic->userStories
                ->where('status', 'done')->sum('story_points');

            $epic->total_estimate_minutes = $tasks->sum(fn($t) =>
                ($t->estimate_hours ?? 0) * 60 + ($t->estimate_minutes ?? 0)
            );
            $epic->total_logged_minutes = $tasks->sum(fn($t) =>
                ($t->logged_hours ?? 0) * 60 + ($t->logged_minutes ?? 0)
            );

            // Assignees across all tasks
            $assignees = $tasks->pluck('assignee')->filter()->unique('id')->values();
            $epic->assignees = $assignees;

            return response()->json($epic);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function update(Request $request, Epic $epic): JsonResponse
    {
        try {
            $validated = $request->validate([
                'name'        => 'sometimes|required|string|max:255',
                'description' => 'nullable|string',
                'status'      => 'nullable|in:open,in_progress,done,closed',
                'priority'    => 'nullable|in:low,medium,high,critical',
                'start_date'  => 'nullable|date',
                'end_date'    => 'nullable|date',
                'color'       => 'nullable|string|max:7',
                'goal'        => 'nullable|string|max:1000',
            ]);

            $epic->update($validated);

            return response()->json(
                $epic->fresh()->load('project')->loadCount('userStories')
            );
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function destroy(Epic $epic): JsonResponse
    {
        try {
            $epic->delete();
            return response()->json(['message' => 'Epic deleted successfully']);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function stats(Epic $epic): JsonResponse
    {
        try {
            $storyIds = $epic->userStories()->pluck('id');
            $tasks    = Task::whereIn('story_id', $storyIds)->with('assignee')->get();

            $byStatus   = $tasks->groupBy('status')->map->count();
            $byPriority = $tasks->groupBy('priority')->map->count();
            $byType     = $tasks->groupBy('type')->map->count();

            $overdueTasks = $tasks->filter(fn($t) =>
                $t->due_date &&
                \Carbon\Carbon::parse($t->due_date)->isPast() &&
                !in_array($t->status, ['done', 'closed'])
            );

            $topAssignees = $tasks->groupBy('assigned_to')
                ->map(fn($group) => [
                    'user'  => $group->first()->assignee,
                    'count' => $group->count(),
                    'done'  => $group->whereIn('status', ['done', 'closed'])->count(),
                ])
                ->filter(fn($a) => $a['user'] !== null)
                ->sortByDesc('count')
                ->values()
                ->take(5);

            $stories = $epic->userStories()->get();

            return response()->json([
                'tasks_by_status'   => $byStatus,
                'tasks_by_priority' => $byPriority,
                'tasks_by_type'     => $byType,
                'overdue_tasks'     => $overdueTasks->values(),
                'top_assignees'     => $topAssignees->values(),
                'stories_count'     => $stories->count(),
                'total_story_points' => $stories->sum('story_points'),
                'done_story_points' => $stories->where('status', 'done')->sum('story_points'),
                'total_tasks'       => $tasks->count(),
                'done_tasks'        => $tasks->whereIn('status', ['done', 'closed'])->count(),
                'total_estimate_minutes' => $tasks->sum(fn($t) =>
                    ($t->estimate_hours ?? 0) * 60 + ($t->estimate_minutes ?? 0)
                ),
                'total_logged_minutes' => $tasks->sum(fn($t) =>
                    ($t->logged_hours ?? 0) * 60 + ($t->logged_minutes ?? 0)
                ),
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }
}