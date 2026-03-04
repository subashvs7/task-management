<?php

namespace App\Http\Controllers;

use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class ProjectController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        try {
            $query = Project::withCount(['tasks', 'userStories']);

            if ($request->search) {
                $query->where(function ($q) use ($request) {
                    $q->where('name', 'like', '%' . $request->search . '%')
                      ->orWhere('description', 'like', '%' . $request->search . '%');
                });
            }

            if ($request->status) {
                $query->where('status', $request->status);
            }

            $projects = $query->orderBy('created_at', 'desc')->get();

            return response()->json(['data' => $projects]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'name'        => 'required|string|max:255',
                'description' => 'nullable|string',
                'status'      => 'nullable|in:active,inactive,completed,on_hold',
                'color'       => 'nullable|string|max:7',
                'start_date'  => 'nullable|date',
                'end_date'    => 'nullable|date',
                'owner_id'    => 'nullable|exists:users,id',
            ]);

            $project = Project::create([
                'name'        => $validated['name'],
                'description' => $validated['description'] ?? null,
                'status'      => $validated['status']      ?? 'active',
                'color'       => $validated['color']       ?? '#6366f1',
                'start_date'  => $validated['start_date']  ?? null,
                'end_date'    => $validated['end_date']    ?? null,
                'owner_id'    => $validated['owner_id']    ?? Auth::id(),
                'key'         => strtoupper(Str::random(4)),
            ]);

            return response()->json($project, 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'file'    => $e->getFile(),
                'line'    => $e->getLine(),
            ], 500);
        }
    }

    public function show(Project $project): JsonResponse
    {
        try {
            $project->loadCount(['tasks', 'userStories']);
            return response()->json($project);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function update(Request $request, Project $project): JsonResponse
    {
        try {
            $validated = $request->validate([
                'name'        => 'sometimes|required|string|max:255',
                'description' => 'nullable|string',
                'status'      => 'nullable|in:active,inactive,completed,on_hold',
                'color'       => 'nullable|string|max:7',
                'start_date'  => 'nullable|date',
                'end_date'    => 'nullable|date',
                'owner_id'    => 'nullable|exists:users,id',
            ]);

            $project->update($validated);

            return response()->json($project->fresh());
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

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