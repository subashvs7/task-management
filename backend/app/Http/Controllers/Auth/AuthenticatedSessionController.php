<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthenticatedSessionController extends Controller
{
    // ── POST /api/login ───────────────────────────────────────────────
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'email'    => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        // ── Rate limiting ─────────────────────────────────────────────
        $throttleKey = Str::lower($request->input('email')) . '|' . $request->ip();

        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            return response()->json([
                'message' => "Too many login attempts. Try again in {$seconds} seconds.",
            ], 429);
        }

        // ── Attempt auth ──────────────────────────────────────────────
        if (! Auth::attempt($request->only('email', 'password'))) {
            RateLimiter::hit($throttleKey);
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        RateLimiter::clear($throttleKey);

        $user  = Auth::user();
        $token = $user->createToken('api-token')->plainTextToken;

        return response()->json([
            'user'  => $user->load('roles:id,name'),
            'token' => $token,
        ]);
    }

    // ── POST /api/logout ──────────────────────────────────────────────
    public function destroy(Request $request): JsonResponse
    {
        try {
            $request->user()->currentAccessToken()->delete();
        } catch (\Exception $e) {
            // token already gone — ignore
        }

        return response()->json(['message' => 'Logged out successfully']);
    }
}