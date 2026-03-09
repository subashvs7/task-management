<?php

namespace App\Http\Controllers;

use App\Models\SubTask;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SubTaskController extends Controller
{
    // ── GET /tasks/{task}/sub-tasks ────────────────────────────────────────────

    public function index(Task $task): JsonResponse
    {
        $subTasks = $task->subTasks()
            ->with('assignee')
            ->orderBy('created_at', 'asc')
            ->get();

        return response()->json($subTasks);
    }

    // ── POST /tasks/{task}/sub-tasks ───────────────────────────────────────────

    public function store(Request $request, Task $task): JsonResponse
    {
        $validated = $request->validate([
            'title'       => 'required|string|max:255',
            'status'      => 'nullable|in:todo,in_progress,done',
            'assigned_to' => 'nullable|exists:users,id',
        ]);

        $subTask = SubTask::create([
            'task_id'     => $task->id,
            'title'       => $validated['title'],
            'status'      => $validated['status'] ?? 'todo',
            'assigned_to' => $validated['assigned_to'] ?? null,
        ]);

        return response()->json($subTask->load('assignee'), 201);
    }

    // ── PUT /tasks/{task}/sub-tasks/{subTask}  (TaskDetail.tsx uses nested URL)

    public function update(Request $request, Task $task, SubTask $subTask): JsonResponse
    {
        // Verify ownership
        if ($subTask->task_id !== $task->id) {
            return response()->json(['message' => 'Sub-task does not belong to this task'], 403);
        }

        return $this->doUpdate($request, $subTask);
    }

    // ── DELETE /tasks/{task}/sub-tasks/{subTask}  (TaskDetail.tsx nested URL) ─

    public function destroy(Task $task, SubTask $subTask): JsonResponse
    {
        if ($subTask->task_id !== $task->id) {
            return response()->json(['message' => 'Sub-task does not belong to this task'], 403);
        }

        $subTask->delete();
        return response()->json(['message' => 'Sub-task deleted successfully']);
    }

    // ── PUT /sub-tasks/{subTask}  (Tasks.tsx drawer uses flat URL) ────────────

    public function updateFlat(Request $request, SubTask $subTask): JsonResponse
    {
        return $this->doUpdate($request, $subTask);
    }

    // ── DELETE /sub-tasks/{subTask}  (flat URL fallback) ──────────────────────

    public function destroyFlat(SubTask $subTask): JsonResponse
    {
        $subTask->delete();
        return response()->json(['message' => 'Sub-task deleted successfully']);
    }

    // ── Shared update logic ────────────────────────────────────────────────────

    private function doUpdate(Request $request, SubTask $subTask): JsonResponse
    {
        $validated = $request->validate([
            'title'       => 'sometimes|required|string|max:255',
            'status'      => 'nullable|in:todo,in_progress,done',
            'assigned_to' => 'nullable|exists:users,id',
        ]);

        if (isset($validated['status'])) {
            if ($validated['status'] === 'done' && $subTask->status !== 'done') {
                $validated['completed_at'] = now();
            } elseif ($validated['status'] !== 'done') {
                $validated['completed_at'] = null;
            }
        }

        $subTask->update($validated);

        return response()->json($subTask->fresh()->load('assignee'));
    }
}