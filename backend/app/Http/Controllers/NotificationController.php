<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    // ══════════════════════════════════════════════════════════════════
    // GET /api/notifications
    // ══════════════════════════════════════════════════════════════════

    public function index(Request $request): JsonResponse
    {
        try {
            $paginated = $request->user()
                ->notifications()
                ->orderBy('created_at', 'desc')
                ->paginate(20);

            // data column is stored as a JSON string — decode each row
            $paginated->getCollection()->transform(function ($n) {
                $n->data = is_string($n->data)
                    ? json_decode($n->data, true)
                    : $n->data;
                return $n;
            });

            return response()->json($paginated);

        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    // ══════════════════════════════════════════════════════════════════
    // GET /api/notifications/unread
    // GET /api/notifications/unread-count  ← alias used by Header.tsx
    // ══════════════════════════════════════════════════════════════════

    public function unread(Request $request): JsonResponse
    {
        try {
            $count = $request->user()->unreadNotifications()->count();

            return response()->json([
                'count' => $count,
                'data'  => [],
            ]);

        } catch (\Exception $e) {
            return response()->json(['count' => 0, 'data' => []], 200);
        }
    }

    // ══════════════════════════════════════════════════════════════════
    // PATCH /api/notifications/{id}/read
    // ══════════════════════════════════════════════════════════════════

    public function markAsRead(Request $request, string $id): JsonResponse
    {
        try {
            $notification = $request->user()
                ->notifications()
                ->where('id', $id)
                ->first();

            if (! $notification) {
                return response()->json(['message' => 'Notification not found'], 404);
            }

            $notification->markAsRead();

            return response()->json(['message' => 'Notification marked as read']);

        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    // ══════════════════════════════════════════════════════════════════
    // POST /api/notifications/read-all
    // ══════════════════════════════════════════════════════════════════

    public function markAllAsRead(Request $request): JsonResponse
    {
        try {
            $request->user()->unreadNotifications()->update(['read_at' => now()]);
            return response()->json(['message' => 'All notifications marked as read']);

        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    // ══════════════════════════════════════════════════════════════════
    // DELETE /api/notifications/{id}
    // ══════════════════════════════════════════════════════════════════

    public function destroy(Request $request, string $id): JsonResponse
    {
        try {
            $notification = $request->user()
                ->notifications()
                ->where('id', $id)
                ->first();

            if (! $notification) {
                return response()->json(['message' => 'Notification not found'], 404);
            }

            $notification->delete();

            return response()->json(['message' => 'Notification deleted']);

        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    // ══════════════════════════════════════════════════════════════════
    // DELETE /api/notifications/delete-all
    // ══════════════════════════════════════════════════════════════════

    public function destroyAll(Request $request): JsonResponse
    {
        try {
            $request->user()->notifications()->delete();
            return response()->json(['message' => 'All notifications deleted']);

        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }
}