<?php

namespace App\Http\Controllers;

use App\Models\Attachment;
use App\Models\Task;
use App\Models\UserStory;
use App\Models\Project;
use App\Models\Epic;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\Facades\Image;

class AttachmentController extends Controller
{
    // Allowed MIME types
    private array $allowedMimes = [
        // Images
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        // Documents
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        // Text
        'text/plain', 'text/csv', 'text/html', 'text/markdown',
        // Code
        'application/json', 'application/xml', 'application/javascript',
        // Archives
        'application/zip', 'application/x-rar-compressed',
        // Video
        'video/mp4', 'video/webm', 'video/ogg',
        // Audio
        'audio/mpeg', 'audio/ogg', 'audio/wav',
    ];

    // Max file size: 50MB
    private int $maxSize = 52428800;

    // ── Index - list all attachments for a task ────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        try {
            $query = Attachment::with('user');

            // Filter by polymorphic parent
            if ($request->task_id) {
                $query->where('attachable_type', Task::class)
                      ->where('attachable_id', $request->task_id);
            } elseif ($request->story_id) {
                $query->where('attachable_type', UserStory::class)
                      ->where('attachable_id', $request->story_id);
            } elseif ($request->project_id) {
                $query->where('attachable_type', Project::class)
                      ->where('attachable_id', $request->project_id);
            } elseif ($request->epic_id) {
                $query->where('attachable_type', Epic::class)
                      ->where('attachable_id', $request->epic_id);
            }

            if ($request->category) {
                switch ($request->category) {
                    case 'image':
                        $query->where('mime_type', 'like', 'image/%');
                        break;
                    case 'document':
                        $query->whereIn('mime_type', [
                            'application/pdf', 'application/msword',
                            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                        ]);
                        break;
                    case 'video':
                        $query->where('mime_type', 'like', 'video/%');
                        break;
                }
            }

            if ($request->search) {
                $query->where('original_name', 'like', '%' . $request->search . '%');
            }

            $attachments = $query->orderBy('created_at', 'desc')->get();

            return response()->json($attachments);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    // ── Upload single or multiple files ───────────────────────────────────────

    public function store(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'files'            => 'required|array|min:1|max:10',
                'files.*'          => 'required|file|max:51200', // 50MB per file
                'attachable_type'  => 'required|in:task,user_story,project,epic',
                'attachable_id'    => 'required|integer',
                'description'      => 'nullable|string|max:500',
            ]);

            // Resolve the model class from type string
            $typeMap = [
                'task'       => Task::class,
                'user_story' => UserStory::class,
                'project'    => Project::class,
                'epic'       => Epic::class,
            ];

            $modelClass = $typeMap[$request->attachable_type];
            $model = $modelClass::findOrFail($request->attachable_id);

            $uploaded = [];
            $errors   = [];

            foreach ($request->file('files') as $file) {
                try {
                    // Validate MIME
                    $mime = $file->getMimeType();
                    if (!in_array($mime, $this->allowedMimes)) {
                        $errors[] = $file->getClientOriginalName() . ': File type not allowed';
                        continue;
                    }

                    // Validate size
                    if ($file->getSize() > $this->maxSize) {
                        $errors[] = $file->getClientOriginalName() . ': File too large (max 50MB)';
                        continue;
                    }

                    $ext          = $file->getClientOriginalExtension();
                    $originalName = $file->getClientOriginalName();
                    $uniqueName   = Str::uuid() . '.' . $ext;
                    $folder       = 'attachments/' . $request->attachable_type . '/' . $request->attachable_id;
                    $path         = $file->storeAs($folder, $uniqueName, 'public');

                    $attachment = Attachment::create([
                        'attachable_type' => $modelClass,
                        'attachable_id'   => $request->attachable_id,
                        'user_id'         => Auth::id(),
                        'name'            => $uniqueName,
                        'original_name'   => $originalName,
                        'path'            => $path,
                        'disk'            => 'public',
                        'mime_type'       => $mime,
                        'extension'       => $ext,
                        'size'            => $file->getSize(),
                        'description'     => $request->description ?? null,
                        'version'         => 1,
                    ]);

                    $uploaded[] = $attachment->load('user');
                } catch (\Exception $e) {
                    $errors[] = $file->getClientOriginalName() . ': ' . $e->getMessage();
                }
            }

            return response()->json([
                'uploaded'    => $uploaded,
                'errors'      => $errors,
                'total'       => count($uploaded),
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    // ── Show single attachment ─────────────────────────────────────────────────

    public function show(Attachment $attachment): JsonResponse
    {
        return response()->json($attachment->load('user'));
    }

    // ── Update description ─────────────────────────────────────────────────────

    public function update(Request $request, Attachment $attachment): JsonResponse
    {
        try {
            $validated = $request->validate([
                'description' => 'nullable|string|max:500',
                'original_name' => 'nullable|string|max:255',
            ]);

            $attachment->update($validated);

            return response()->json($attachment->fresh()->load('user'));
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    // ── Delete single ──────────────────────────────────────────────────────────

    public function destroy(Attachment $attachment): JsonResponse
    {
        try {
            // Delete file from storage
            Storage::disk($attachment->disk)->delete($attachment->path);

            // Delete thumbnail if exists
            if ($attachment->thumbnail_path) {
                Storage::disk($attachment->disk)->delete($attachment->thumbnail_path);
            }

            $attachment->delete();

            return response()->json(['message' => 'Attachment deleted successfully']);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    // ── Bulk delete ────────────────────────────────────────────────────────────

    public function bulkDestroy(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'ids'   => 'required|array',
                'ids.*' => 'exists:attachments,id',
            ]);

            $attachments = Attachment::whereIn('id', $validated['ids'])->get();

            foreach ($attachments as $att) {
                Storage::disk($att->disk)->delete($att->path);
                if ($att->thumbnail_path) {
                    Storage::disk($att->disk)->delete($att->thumbnail_path);
                }
                $att->delete();
            }

            return response()->json([
                'message' => count($validated['ids']) . ' attachments deleted',
                'count'   => count($validated['ids']),
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    // ── Download file ──────────────────────────────────────────────────────────

    public function download(Attachment $attachment): Response
    {
        $path = Storage::disk($attachment->disk)->path($attachment->path);

        if (!file_exists($path)) {
            abort(404, 'File not found');
        }

        return response()->download($path, $attachment->original_name);
    }

    // ── Stats for a task's attachments ────────────────────────────────────────

    public function stats(Request $request): JsonResponse
    {
        try {
            $query = Attachment::query();

            if ($request->task_id) {
                $query->where('attachable_type', Task::class)
                      ->where('attachable_id', $request->task_id);
            } elseif ($request->project_id) {
                $query->where('attachable_type', Project::class)
                      ->where('attachable_id', $request->project_id);
            }

            $attachments = $query->get();

            $totalSize = $attachments->sum('size');

            $byCategory = [
                'image'      => $attachments->filter(fn($a) => str_starts_with($a->mime_type, 'image/'))->count(),
                'video'      => $attachments->filter(fn($a) => str_starts_with($a->mime_type, 'video/'))->count(),
                'document'   => $attachments->filter(fn($a) => $a->mime_type === 'application/pdf')->count(),
                'spreadsheet'=> $attachments->filter(fn($a) => str_contains($a->mime_type, 'excel') || str_contains($a->mime_type, 'spreadsheet'))->count(),
                'other'      => $attachments->filter(fn($a) =>
                    !str_starts_with($a->mime_type, 'image/') &&
                    !str_starts_with($a->mime_type, 'video/') &&
                    $a->mime_type !== 'application/pdf'
                )->count(),
            ];

            return response()->json([
                'total'        => $attachments->count(),
                'total_size'   => $totalSize,
                'by_category'  => $byCategory,
                'recent'       => $attachments->sortByDesc('created_at')->take(5)->values(),
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }
}