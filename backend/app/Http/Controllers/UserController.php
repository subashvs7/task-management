<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = User::with('roles', 'company');

        if ($request->has('company_id')) {
            $query->where('company_id', $request->company_id);
        } elseif ($request->user()->company_id) {
            $query->where('company_id', $request->user()->company_id);
        }

        if ($request->has('role')) {
            $query->role($request->role);
        }

        $users = $query->get();
        return response()->json($users);
    }

    public function show(User $user): JsonResponse
    {
        $user->load('roles', 'company', 'assignedTasks');
        return response()->json($user);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|email|unique:users,email,' . $user->id,
            'phone' => 'nullable|string|max:20',
            'avatar' => 'nullable|string',
            'is_active' => 'boolean',
            'company_id' => 'nullable|exists:companies,id',
            'role' => 'nullable|string|exists:roles,name',
        ]);

        if (isset($validated['role'])) {
            $user->syncRoles([$validated['role']]);
            unset($validated['role']);
        }

        $user->update($validated);
        return response()->json($user->load('roles', 'company'));
    }

    public function destroy(User $user): JsonResponse
    {
        $user->delete();
        return response()->json(['message' => 'User deleted successfully']);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('roles', 'company');
        return response()->json($user);
    }
}