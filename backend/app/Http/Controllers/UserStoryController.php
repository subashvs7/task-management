<?php

namespace App\Http\Controllers;

use App\Models\Task;
use App\Models\User;
use App\Models\UserStory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserStoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        try {
            $query = UserStory::with('project', 'epic', 'assignee', 'reporter')
                ->withCount('tasks');

            if ($request->project_id) {
                $query->where('project_id', $request->project_id);
            }
            if ($request->epic_id) {
                $query->where('epic_id', $request->epic_id);
            }
            if ($request->status) {
                $query->where('status', $request->status);
            }
            if ($request->priority) {
                $query->where('priority', $request->priority);
            }
            if ($request->sprint) {
                $query->where('sprint', $request->sprint);
            }
            if ($request->assignee_id) {
                $query->where('assignee_id', $request->assignee_id);
            }
            if ($request->search) {
                $query->where(function ($q) use ($request) {
                    $q->where('name', 'like', '%' . $request->search . '%')
                      ->orWhere('description', 'like', '%' . $request->search . '%');
                });
            }

            $stories = $query->orderBy('sort_order')->orderBy('created_at', 'desc')->get();

            // Enrich each story with task stats + developer objects
            $stories->each(function ($story) {
                $tasks = Task::where('story_id', $story->id)->get();

                $story->completed_tasks   = $tasks->whereIn('status', ['done', 'closed'])->count();
                $story->in_progress_tasks = $tasks->where('status', 'in_progress')->count();
                $story->overdue_tasks     = $tasks->filter(fn($t) =>
                    $t->due_date &&
                    \Carbon\Carbon::parse($t->due_date)->isPast() &&
                    !in_array($t->status, ['done', 'closed'])
                )->count();

                // Attach developer objects
                if (!empty($story->developer_ids)) {
                    $story->developers = User::whereIn('id', $story->developer_ids)
                        ->select('id', 'name', 'email', 'avatar')
                        ->get();
                } else {
                    $story->developers = collect();
                }
            });

            return response()->json($stories);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'project_id'            => 'required|exists:projects,id',
                'epic_id'               => 'nullable|exists:epics,id',
                'name'                  => 'required|string|max:255',
                'description'           => 'nullable|string',
                'status'                => 'nullable|in:todo,in_progress,done,closed',
                'priority'              => 'nullable|in:low,medium,high,critical',
                'story_points'          => 'nullable|integer|min:0',
                'assignee_id'           => 'nullable|exists:users,id',
                'reporter_id'           => 'nullable|exists:users,id',
                'developer_ids'         => 'nullable|array',
                'developer_ids.*'       => 'exists:users,id',
                'sprint'                => 'nullable|string|max:100',
                'estimate_hours'        => 'nullable|integer|min:0',
                'estimate_minutes'      => 'nullable|integer|min:0|max:59',
                'completion_percentage' => 'nullable|integer|min:0|max:100',
                'completion_note'       => 'nullable|string',
                'acceptance_criteria'   => 'nullable|string',
                'color'                 => 'nullable|string|max:7',
                'sort_order'            => 'nullable|integer',
            ]);

            $story = UserStory::create([
                'project_id'            => $validated['project_id'],
                'epic_id'               => $validated['epic_id'] ?? null,
                'name'                  => $validated['name'],
                'description'           => $validated['description'] ?? null,
                'status'                => $validated['status'] ?? 'todo',
                'priority'              => $validated['priority'] ?? 'medium',
                'story_points'          => $validated['story_points'] ?? 0,
                'assignee_id'           => $validated['assignee_id'] ?? null,
                'reporter_id'           => $validated['reporter_id'] ?? null,
                'developer_ids'         => $validated['developer_ids'] ?? [],
                'sprint'                => $validated['sprint'] ?? null,
                'estimate_hours'        => $validated['estimate_hours'] ?? 0,
                'estimate_minutes'      => $validated['estimate_minutes'] ?? 0,
                'logged_hours'          => 0,
                'logged_minutes'        => 0,
                'completion_percentage' => $validated['completion_percentage'] ?? 0,
                'completion_note'       => $validated['completion_note'] ?? null,
                'acceptance_criteria'   => $validated['acceptance_criteria'] ?? null,
                'color'                 => $validated['color'] ?? '#6366f1',
                'sort_order'            => $validated['sort_order'] ?? 0,
            ]);

            $story->load('project', 'epic', 'assignee', 'reporter');
            $story->loadCount('tasks');

            // Attach developers
            if (!empty($story->developer_ids)) {
                $story->developers = User::whereIn('id', $story->developer_ids)
                    ->select('id', 'name', 'email', 'avatar')
                    ->get();
            } else {
                $story->developers = collect();
            }

            return response()->json($story, 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function show(UserStory $userStory): JsonResponse
    {
        try {
            $userStory->load('project', 'epic', 'assignee', 'reporter', 'tasks.assignee');
            $userStory->loadCount('tasks');

            $tasks = $userStory->tasks;

            $userStory->completed_tasks   = $tasks->whereIn('status', ['done', 'closed'])->count();
            $userStory->in_progress_tasks = $tasks->where('status', 'in_progress')->count();

            // Attach developer objects
            if (!empty($userStory->developer_ids)) {
                $userStory->developers = User::whereIn('id', $userStory->developer_ids)
                    ->select('id', 'name', 'email', 'avatar')
                    ->get();
            } else {
                $userStory->developers = collect();
            }

            // Time stats from tasks
            $userStory->tasks_logged_minutes = $tasks->sum(fn($t) =>
                ($t->logged_hours ?? 0) * 60 + ($t->logged_minutes ?? 0)
            );
            $userStory->tasks_estimate_minutes = $tasks->sum(fn($t) =>
                ($t->estimate_hours ?? 0) * 60 + ($t->estimate_minutes ?? 0)
            );

            return response()->json($userStory);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function update(Request $request, UserStory $userStory): JsonResponse
    {
        try {
            $validated = $request->validate([
                'name'                  => 'sometimes|required|string|max:255',
                'description'           => 'nullable|string',
                'status'                => 'nullable|in:todo,in_progress,done,closed',
                'priority'              => 'nullable|in:low,medium,high,critical',
                'story_points'          => 'nullable|integer|min:0',
                'assignee_id'           => 'nullable|exists:users,id',
                'reporter_id'           => 'nullable|exists:users,id',
                'developer_ids'         => 'nullable|array',
                'developer_ids.*'       => 'exists:users,id',
                'sprint'                => 'nullable|string|max:100',
                'epic_id'               => 'nullable|exists:epics,id',
                'estimate_hours'        => 'nullable|integer|min:0',
                'estimate_minutes'      => 'nullable|integer|min:0|max:59',
                'logged_hours'          => 'nullable|integer|min:0',
                'logged_minutes'        => 'nullable|integer|min:0|max:59',
                'completion_percentage' => 'nullable|integer|min:0|max:100',
                'completion_note'       => 'nullable|string',
                'started_at'            => 'nullable|date',
                'completed_at'          => 'nullable|date',
                'acceptance_criteria'   => 'nullable|string',
                'color'                 => 'nullable|string|max:7',
                'sort_order'            => 'nullable|integer',
            ]);

            $userStory->update($validated);

            $fresh = $userStory->fresh()->load('project', 'epic', 'assignee', 'reporter');
            $fresh->loadCount('tasks');

            if (!empty($fresh->developer_ids)) {
                $fresh->developers = User::whereIn('id', $fresh->developer_ids)
                    ->select('id', 'name', 'email', 'avatar')
                    ->get();
            } else {
                $fresh->developers = collect();
            }

            return response()->json($fresh);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function destroy(UserStory $userStory): JsonResponse
    {
        try {
            $userStory->delete();
            return response()->json(['message' => 'User story deleted successfully']);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    // Log time to a user story
    public function logTime(Request $request, UserStory $userStory): JsonResponse
    {
        try {
            $validated = $request->validate([
                'hours'       => 'required|integer|min:0',
                'minutes'     => 'required|integer|min:0|max:59',
                'description' => 'nullable|string|max:500',
            ]);

            $totalMinutes = ($userStory->logged_hours * 60 + $userStory->logged_minutes)
                + ($validated['hours'] * 60 + $validated['minutes']);

            $userStory->update([
                'logged_hours'   => intdiv($totalMinutes, 60),
                'logged_minutes' => $totalMinutes % 60,
            ]);

            return response()->json($userStory->fresh()->load('project', 'epic', 'assignee'));
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    // Update completion percentage
    public function updateCompletion(Request $request, UserStory $userStory): JsonResponse
    {
        try {
            $validated = $request->validate([
                'completion_percentage' => 'required|integer|min:0|max:100',
                'completion_note'       => 'nullable|string|max:1000',
            ]);

            $data = [
                'completion_percentage' => $validated['completion_percentage'],
                'completion_note'       => $validated['completion_note'] ?? $userStory->completion_note,
            ];

            if ($validated['completion_percentage'] === 100) {
                $data['status']       = 'done';
                $data['completed_at'] = $userStory->completed_at ?? now();
            } elseif ($validated['completion_percentage'] > 0 && $userStory->status === 'todo') {
                $data['status']     = 'in_progress';
                $data['started_at'] = $userStory->started_at ?? now();
            }

            $userStory->update($data);

            return response()->json($userStory->fresh()->load('project', 'epic', 'assignee'));
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    // Get all unique sprints for filter
    public function sprints(Request $request): JsonResponse
    {
        try {
            $query = UserStory::whereNotNull('sprint')->distinct();
            if ($request->project_id) {
                $query->where('project_id', $request->project_id);
            }
            $sprints = $query->pluck('sprint')->filter()->values();
            return response()->json($sprints);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    // Stats for dashboard/reporting
    public function stats(Request $request): JsonResponse
    {
        try {
            $query = UserStory::query();
            if ($request->project_id) {
                $query->where('project_id', $request->project_id);
            }

            $stories = $query->get();

            return response()->json([
                'total'              => $stories->count(),
                'by_status'          => $stories->groupBy('status')->map->count(),
                'by_priority'        => $stories->groupBy('priority')->map->count(),
                'total_points'       => $stories->sum('story_points'),
                'done_points'        => $stories->where('status', 'done')->sum('story_points'),
                'total_estimate_min' => $stories->sum(fn($s) =>
                    ($s->estimate_hours ?? 0) * 60 + ($s->estimate_minutes ?? 0)
                ),
                'total_logged_min'   => $stories->sum(fn($s) =>
                    ($s->logged_hours ?? 0) * 60 + ($s->logged_minutes ?? 0)
                ),
                'avg_completion'     => $stories->count() > 0
                    ? round($stories->avg('completion_percentage'))
                    : 0,
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }
}