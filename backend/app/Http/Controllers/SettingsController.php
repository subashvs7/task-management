<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class SettingsController extends Controller
{
    // GET /api/settings/profile
    public function profile(): JsonResponse
    {
        return response()->json(Auth::user());
    }

    // PUT /api/settings/profile
    public function updateProfile(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            $validated = $request->validate([
                'name'        => 'required|string|max:255',
                'email'       => ['required','email','max:255', Rule::unique('users','email')->ignore($user->id)],
                'phone'       => 'nullable|string|max:30',
                'timezone'    => 'nullable|string|max:60',
                'bio'         => 'nullable|string|max:500',
                'job_title'   => 'nullable|string|max:100',
                'department'  => 'nullable|string|max:100',
            ]);
            $user->update($validated);
            return response()->json(['message' => 'Profile updated', 'user' => $user->fresh()]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    // POST /api/settings/avatar
    public function uploadAvatar(Request $request): JsonResponse
    {
        try {
            $request->validate(['avatar' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:2048']);
            $user = Auth::user();
            if ($user->avatar && Storage::disk('public')->exists($user->avatar)) {
                Storage::disk('public')->delete($user->avatar);
            }
            $path = $request->file('avatar')->store('avatars', 'public');
            $user->update(['avatar' => $path]);
            return response()->json([
                'message'    => 'Avatar updated',
                'avatar_url' => Storage::disk('public')->url($path),
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    // DELETE /api/settings/avatar
    public function deleteAvatar(): JsonResponse
    {
        try {
            $user = Auth::user();
            if ($user->avatar && Storage::disk('public')->exists($user->avatar)) {
                Storage::disk('public')->delete($user->avatar);
            }
            $user->update(['avatar' => null]);
            return response()->json(['message' => 'Avatar removed']);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    // PUT /api/settings/password
    public function changePassword(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'current_password'      => 'required|string',
                'password'              => 'required|string|min:8|confirmed',
                'password_confirmation' => 'required|string',
            ]);
            $user = Auth::user();
            if (!Hash::check($validated['current_password'], $user->password)) {
                return response()->json(['errors' => ['current_password' => ['Current password is incorrect']]], 422);
            }
            $user->update(['password' => Hash::make($validated['password'])]);
            return response()->json(['message' => 'Password changed successfully']);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    // GET /api/settings/notifications
    public function notificationPrefs(): JsonResponse
    {
        $user  = Auth::user();
        $prefs = $user->notification_prefs ?? [
            'email_task_assigned'   => true,
            'email_task_updated'    => true,
            'email_comment_added'   => true,
            'email_due_reminder'    => true,
            'email_project_updates' => false,
            'push_task_assigned'    => true,
            'push_task_updated'     => false,
            'push_comment_added'    => true,
            'push_due_reminder'     => true,
            'digest_frequency'      => 'daily',
        ];
        return response()->json($prefs);
    }

    // PUT /api/settings/notifications
    public function updateNotificationPrefs(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'email_task_assigned'   => 'boolean',
                'email_task_updated'    => 'boolean',
                'email_comment_added'   => 'boolean',
                'email_due_reminder'    => 'boolean',
                'email_project_updates' => 'boolean',
                'push_task_assigned'    => 'boolean',
                'push_task_updated'     => 'boolean',
                'push_comment_added'    => 'boolean',
                'push_due_reminder'     => 'boolean',
                'digest_frequency'      => 'in:none,daily,weekly',
            ]);
            Auth::user()->update(['notification_prefs' => $validated]);
            return response()->json(['message' => 'Notification preferences saved']);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    // GET /api/settings/appearance
    public function appearance(): JsonResponse
    {
        $prefs = Auth::user()->appearance_prefs ?? [
            'theme'           => 'light',
            'accent_color'    => 'indigo',
            'sidebar_compact' => false,
            'density'         => 'comfortable',
            'date_format'     => 'MMM D, YYYY',
            'time_format'     => '12h',
            'language'        => 'en',
        ];
        return response()->json($prefs);
    }

    // PUT /api/settings/appearance
    public function updateAppearance(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'theme'           => 'in:light,dark,system',
                'accent_color'    => 'in:indigo,blue,green,red,orange,purple,pink',
                'sidebar_compact' => 'boolean',
                'density'         => 'in:compact,comfortable,spacious',
                'date_format'     => 'nullable|string|max:30',
                'time_format'     => 'in:12h,24h',
                'language'        => 'nullable|string|max:10',
            ]);
            Auth::user()->update(['appearance_prefs' => $validated]);
            return response()->json(['message' => 'Appearance preferences saved']);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    // GET /api/settings/security
// GET /api/settings/security
public function security(): JsonResponse
{
    try {
        $user = Auth::user();

        return response()->json([
            'two_factor_enabled' => $user->two_factor_enabled ?? false,
            'last_login_at'      => $user->last_login_at ?? null,
            'last_login_ip'      => $user->last_login_ip ?? null,
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'message' => $e->getMessage(),
            'line'    => $e->getLine(),
            'file'    => $e->getFile(),
        ], 500);
    }
}

    // DELETE /api/settings/account
    public function deleteAccount(Request $request): JsonResponse
    {
        try {
            $request->validate(['password' => 'required|string']);
            $user = Auth::user();
            if (!Hash::check($request->password, $user->password)) {
                return response()->json(['errors' => ['password' => ['Incorrect password']]], 422);
            }
            Auth::logout();
            $user->delete();
            return response()->json(['message' => 'Account deleted']);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }
}