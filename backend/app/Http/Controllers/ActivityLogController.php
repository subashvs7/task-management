<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Project;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ActivityLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        try {
            $query = ActivityLog::with('user')
                ->orderBy('created_at', 'desc');

            if ($request->has('project_id') && $request->project_id) {
                $projectId = $request->project_id;
                $query->where(function ($q) use ($projectId) {
                    $q->where(function ($q2) use ($projectId) {
                        $q2->where('loggable_type', Task::class)
                            ->whereIn('loggable_id', function ($sub) use ($projectId) {
                                $sub->select('id')
                                    ->from('tasks')
                                    ->where('project_id', $projectId);
                            });
                    })->orWhere(function ($q2) use ($projectId) {
                        $q2->where('loggable_type', Project::class)
                            ->where('loggable_id', $projectId);
                    });
                });
            }

            if ($request->has('user_id') && $request->user_id) {
                $query->where('user_id', $request->user_id);
            }

            if ($request->has('action') && $request->action) {
                $query->where('action', $request->action);
            }

            if ($request->has('from') && $request->from) {
                $query->whereDate('created_at', '>=', $request->from);
            }

            if ($request->has('to') && $request->to) {
                $query->whereDate('created_at', '<=', $request->to);
            }

            $logs = $query->paginate(30);

            return response()->json($logs);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

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
}