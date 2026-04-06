<?php

namespace App\Traits;

use App\Models\ActivityLog;
use Illuminate\Support\Facades\Auth;

trait LogsActivity
{
    /**
     * In-memory registry of models created in this request.
     * Key: "ClassName:id"
     * Prevents the spurious `updated` log that fires right after `created`.
     *
     * @var array<string, bool>
     */
    private static array $recentlyCreatedRegistry = [];

    // ── Boot ──────────────────────────────────────────────────────────────────

    protected static function bootLogsActivity(): void
    {
        // ── CREATED ──────────────────────────────────────────────────────────
        static::created(function ($model) {
            // Register this model so the immediately-following `updated` event
            // (which Eloquent fires on the same save cycle) is suppressed.
            $key = static::registryKey($model);
            self::$recentlyCreatedRegistry[$key] = true;

            static::writeLog($model, 'created', null, $model->getAttributes());
        });

        // ── UPDATED ──────────────────────────────────────────────────────────
        static::updated(function ($model) {
            // If we just created this model in the same request, skip the
            // spurious update event that Eloquent fires after insert.
            $key = static::registryKey($model);
            if (isset(self::$recentlyCreatedRegistry[$key])) {
                // Unset so any *genuine* subsequent update IS logged
                unset(self::$recentlyCreatedRegistry[$key]);
                return;
            }

            $dirty   = $model->getDirty();
            $ignored = ['updated_at', 'created_at'];
            $changes = array_diff_key($dirty, array_flip($ignored));

            if (empty($changes)) {
                return; // nothing meaningful changed
            }

            $old = array_intersect_key($model->getOriginal(), $changes);
            static::writeLog($model, 'updated', $old, $changes);
        });

        // ── DELETED ──────────────────────────────────────────────────────────
        static::deleted(function ($model) {
            // Clean up registry entry if model is deleted in same request
            unset(self::$recentlyCreatedRegistry[static::registryKey($model)]);
            static::writeLog($model, 'deleted', $model->getAttributes(), null);
        });
    }

    // ── Registry key ─────────────────────────────────────────────────────────

    private static function registryKey($model): string
    {
        return get_class($model) . ':' . $model->getKey();
    }

    // ── Write one log row ─────────────────────────────────────────────────────

    protected static function writeLog(
        $model,
        string $action,
        ?array $old,
        ?array $new
    ): void {
        try {
            $userId = Auth::id();
            if (! $userId) return;

            $modelName   = class_basename($model);
            $label       = static::friendlyLabel($modelName);
            $displayName = $model->name
                        ?? $model->title
                        ?? $model->subject
                        ?? "#{$model->id}";

            ActivityLog::create([
                'loggable_type' => get_class($model),
                'loggable_id'   => $model->id,
                'user_id'       => $userId,
                'action'        => $action,
                'description'   => "{$action} {$label} \"{$displayName}\"",
                'old_values'    => $old ? static::sanitize($old) : null,
                'new_values'    => $new ? static::sanitize($new) : null,
            ]);

        } catch (\Throwable) {
            // Never break the main flow because of a logging failure
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static function friendlyLabel(string $class): string
    {
        return match ($class) {
            'Task'      => 'task',
            'Project'   => 'project',
            'Epic'      => 'epic',
            'UserStory' => 'user story',
            'Comment'   => 'comment',
            'SubTask'   => 'sub-task',
            default     => strtolower($class),
        };
    }

    private static function sanitize(array $values): array
    {
        $redacted = ['password', 'remember_token', 'api_token', 'two_factor_secret'];
        return array_diff_key($values, array_flip($redacted));
    }
}