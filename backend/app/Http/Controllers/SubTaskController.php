<?php

namespace App\Http\Controllers;

use App\Models\SubTask;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SubTaskController extends Controller
{
    public function index(Task $task): JsonResponse
    {
        $subTasks = $task->subTasks()->with('assignee')->orderBy('created_at', 'asc')->get();
        return response()->json($subTasks);
    }

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

    public function update(Request $request, Task $task, SubTask $subTask): JsonResponse
    {
        $validated = $request->validate([
            'title'       => 'sometimes|required|string|max:255',
            'status'      => 'nullable|in:todo,in_progress,done',
            'assigned_to' => 'nullable|exists:users,id',
        ]);

        if (isset($validated['status']) && $validated['status'] === 'done' && $subTask->status !== 'done') {
            $validated['completed_at'] = now();
        } elseif (isset($validated['status']) && $validated['status'] !== 'done') {
            $validated['completed_at'] = null;
        }

        $subTask->update($validated);
        return response()->json($subTask->load('assignee'));
    }

    public function destroy(Task $task, SubTask $subTask): JsonResponse
    {
        $subTask->delete();
        return response()->json(['message' => 'Sub-task deleted successfully']);
    }
}