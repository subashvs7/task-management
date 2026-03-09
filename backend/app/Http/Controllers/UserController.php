<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    // ══════════════════════════════════════════════════════════════════
    // GET /api/users/me  — auth user WITH roles (fixes button not showing)
    // ══════════════════════════════════════════════════════════════════

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('roles:id,name');
        return response()->json($user);
    }

    // ══════════════════════════════════════════════════════════════════
    // GET /api/users
    // ══════════════════════════════════════════════════════════════════

    public function index(Request $request): JsonResponse
    {
        try {
            $authUser  = Auth::user();
            $authRole  = $authUser->getRoleNames()->first();
            $companyId = $authUser->company_id;

            if (!in_array($authRole, ['admin', 'manager', 'team_leader', 'hr'])) {
                return response()->json(['message' => 'Forbidden'], 403);
            }

            $query = User::with('roles:id,name')
                ->when($companyId, fn($q) => $q->where('company_id', $companyId));

            if ($authRole === 'manager') {
                $query->whereDoesntHave('roles', fn($q) => $q->where('name', 'admin'));
            }

            if ($authRole === 'team_leader') {
                $query->whereHas('roles', fn($q) => $q->whereIn('name', [
                    'developer', 'designer', 'tester', 'hr',
                ]));
            }

            if ($request->filled('search')) {
                $query->where(fn($q) => $q
                    ->where('name',  'like', '%' . $request->search . '%')
                    ->orWhere('email', 'like', '%' . $request->search . '%')
                );
            }

            if ($request->filled('role')) {
                $query->whereHas('roles', fn($q) => $q->where('name', $request->role));
            }

            if ($request->filled('status')) {
                $query->where('is_active', $request->status === 'active');
            }

            $users = $query->orderBy('name')->paginate(20);

            return response()->json($users);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    // ══════════════════════════════════════════════════════════════════
    // POST /api/users  — admin / manager / team_leader
    // ══════════════════════════════════════════════════════════════════

    public function store(Request $request): JsonResponse
    {
        try {
            $authUser  = Auth::user();
            $authRole  = $authUser->getRoleNames()->first();
            $companyId = $authUser->company_id;

            if (!in_array($authRole, ['admin', 'manager', 'team_leader'])) {
                return response()->json(['message' => 'Forbidden'], 403);
            }

            $allowedRoles = $this->getAllowedRoles($authRole);

            $validated = $request->validate([
                'name'       => 'required|string|max:255',
                'email'      => 'required|email|max:255|unique:users,email',
                'password'   => 'required|string|min:8|confirmed',
                'role'       => ['required', 'string', Rule::in($allowedRoles)],
                'phone'      => 'nullable|string|max:30',
                'job_title'  => 'nullable|string|max:100',
                'department' => 'nullable|string|max:100',
                'is_active'  => 'boolean',
            ]);

            $user = User::create([
                'name'       => $validated['name'],
                'email'      => $validated['email'],
                'password'   => Hash::make($validated['password']),
                'company_id' => $companyId,
                'phone'      => $validated['phone']      ?? null,
                'job_title'  => $validated['job_title']  ?? null,
                'department' => $validated['department'] ?? null,
                'is_active'  => $validated['is_active']  ?? true,
            ]);

            $user->assignRole($validated['role']);

            return response()->json([
                'message' => 'User created successfully',
                'user'    => $user->load('roles:id,name'),
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    // ══════════════════════════════════════════════════════════════════
    // GET /api/users/{id}
    // ══════════════════════════════════════════════════════════════════

    public function show(int $id): JsonResponse
    {
        try {
            $authUser  = Auth::user();
            $authRole  = $authUser->getRoleNames()->first();
            $companyId = $authUser->company_id;

            if (!in_array($authRole, ['admin', 'manager', 'team_leader', 'hr'])) {
                return response()->json(['message' => 'Forbidden'], 403);
            }

            $user = User::with('roles:id,name')
                ->when($companyId, fn($q) => $q->where('company_id', $companyId))
                ->findOrFail($id);

            return response()->json($user);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException) {
            return response()->json(['message' => 'User not found'], 404);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    // ══════════════════════════════════════════════════════════════════
    // PUT /api/users/{id}  — admin / manager / team_leader
    // ══════════════════════════════════════════════════════════════════

    public function update(Request $request, int $id): JsonResponse
    {
        try {
            $authUser  = Auth::user();
            $authRole  = $authUser->getRoleNames()->first();
            $companyId = $authUser->company_id;

            if (!in_array($authRole, ['admin', 'manager', 'team_leader'])) {
                return response()->json(['message' => 'Forbidden'], 403);
            }

            $user = User::with('roles:id,name')
                ->when($companyId, fn($q) => $q->where('company_id', $companyId))
                ->findOrFail($id);

            $targetRole = $user->getRoleNames()->first();

            if ($authRole === 'manager' && $targetRole === 'admin') {
                return response()->json(['message' => 'Forbidden'], 403);
            }

            if ($authRole === 'team_leader' && !in_array($targetRole, [
                'developer', 'designer', 'tester', 'hr',
            ])) {
                return response()->json(['message' => 'Forbidden'], 403);
            }

            $allowedRoles = $this->getAllowedRoles($authRole);

            $validated = $request->validate([
                'name'       => 'required|string|max:255',
                'email'      => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($id)],
                'role'       => ['required', 'string', Rule::in($allowedRoles)],
                'phone'      => 'nullable|string|max:30',
                'job_title'  => 'nullable|string|max:100',
                'department' => 'nullable|string|max:100',
                'is_active'  => 'boolean',
                'password'   => 'nullable|string|min:8|confirmed',
            ]);

            $user->update([
                'name'       => $validated['name'],
                'email'      => $validated['email'],
                'phone'      => $validated['phone']      ?? $user->phone,
                'job_title'  => $validated['job_title']  ?? $user->job_title,
                'department' => $validated['department'] ?? $user->department,
                'is_active'  => $validated['is_active']  ?? $user->is_active,
            ]);

            if (!empty($validated['password'])) {
                $user->update(['password' => Hash::make($validated['password'])]);
            }

            $user->syncRoles([$validated['role']]);

            return response()->json([
                'message' => 'User updated successfully',
                'user'    => $user->fresh()->load('roles:id,name'),
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['errors' => $e->errors()], 422);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException) {
            return response()->json(['message' => 'User not found'], 404);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    // ══════════════════════════════════════════════════════════════════
    // PATCH /api/users/{id}/toggle-status
    // ══════════════════════════════════════════════════════════════════

    public function toggleStatus(int $id): JsonResponse
    {
        try {
            $authUser  = Auth::user();
            $authRole  = $authUser->getRoleNames()->first();
            $companyId = $authUser->company_id;

            if (!in_array($authRole, ['admin', 'manager', 'team_leader'])) {
                return response()->json(['message' => 'Forbidden'], 403);
            }

            $user = User::when($companyId, fn($q) => $q->where('company_id', $companyId))
                ->findOrFail($id);

            if ($user->id === $authUser->id) {
                return response()->json(['message' => 'Cannot deactivate your own account'], 422);
            }

            $targetRole = $user->getRoleNames()->first();

            if ($authRole === 'manager' && $targetRole === 'admin') {
                return response()->json(['message' => 'Forbidden'], 403);
            }

            if ($authRole === 'team_leader' && !in_array($targetRole, [
                'developer', 'designer', 'tester', 'hr',
            ])) {
                return response()->json(['message' => 'Forbidden'], 403);
            }

            $user->update(['is_active' => !$user->is_active]);

            return response()->json([
                'message'   => 'Status updated',
                'is_active' => $user->is_active,
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException) {
            return response()->json(['message' => 'User not found'], 404);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    // ══════════════════════════════════════════════════════════════════
    // DELETE /api/users/{id}  — admin only
    // ══════════════════════════════════════════════════════════════════

    public function destroy(int $id): JsonResponse
    {
        try {
            $authUser  = Auth::user();
            $authRole  = $authUser->getRoleNames()->first();
            $companyId = $authUser->company_id;

            if ($authRole !== 'admin') {
                return response()->json(['message' => 'Only admins can delete users'], 403);
            }

            if ((int) $id === $authUser->id) {
                return response()->json(['message' => 'Cannot delete your own account'], 422);
            }

            $user = User::when($companyId, fn($q) => $q->where('company_id', $companyId))
                ->findOrFail($id);

            $user->delete();

            return response()->json(['message' => 'User deleted successfully']);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException) {
            return response()->json(['message' => 'User not found'], 404);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    // ══════════════════════════════════════════════════════════════════
    // GET /api/users/roles
    // ══════════════════════════════════════════════════════════════════

    public function roles(): JsonResponse
    {
        try {
            $authRole = Auth::user()->getRoleNames()->first();
            return response()->json(['roles' => $this->getAllowedRoles($authRole)]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    // ── helper ────────────────────────────────────────────────────────

    private function getAllowedRoles(string $authRole): array
    {
        return match ($authRole) {
            'admin'       => ['admin', 'manager', 'team_leader', 'developer', 'designer', 'tester', 'hr'],
            'manager'     => ['manager', 'team_leader', 'developer', 'designer', 'tester', 'hr'],
            'team_leader' => ['developer', 'designer', 'tester', 'hr'],
            default       => [],
        };
    }
}