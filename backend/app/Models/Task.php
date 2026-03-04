<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Task extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id', 'story_id', 'parent_id',
        'title', 'description',
        'status', 'priority', 'type',
        'due_date', 'assigned_to', 'reporter_id',
        'estimate_hours', 'estimate_minutes',
        'logged_hours', 'logged_minutes',
        'completion_percentage', 'completion_note',
        'started_at', 'completed_at',
        'labels', 'environment', 'version',
        'acceptance_criteria', 'sort_order',
    ];

    protected $casts = [
        'due_date'              => 'date',
        'started_at'            => 'datetime',
        'completed_at'          => 'datetime',
        'labels'                => 'array',
        'estimate_hours'        => 'integer',
        'estimate_minutes'      => 'integer',
        'logged_hours'          => 'integer',
        'logged_minutes'        => 'integer',
        'completion_percentage' => 'integer',
        'sort_order'            => 'integer',
    ];

    protected static function boot(): void
    {
        parent::boot();

        static::updated(function (Task $task) {
            if ($task->isDirty('status')) {
                if ($task->status === 'in_progress' && !$task->started_at) {
                    $task->updateQuietly(['started_at' => now()]);
                }
                if (in_array($task->status, ['done', 'closed']) && !$task->completed_at) {
                    $task->updateQuietly([
                        'completed_at'          => now(),
                        'completion_percentage' => 100,
                    ]);
                }
                if (!in_array($task->status, ['done', 'closed'])) {
                    $task->updateQuietly(['completed_at' => null]);
                }
            }

            if ($task->isDirty('completion_percentage')) {
                if ($task->completion_percentage === 100 && $task->status !== 'done') {
                    $task->updateQuietly([
                        'status'       => 'done',
                        'completed_at' => $task->completed_at ?? now(),
                    ]);
                } elseif ($task->completion_percentage > 0 && in_array($task->status, ['backlog', 'todo'])) {
                    $task->updateQuietly([
                        'status'     => 'in_progress',
                        'started_at' => $task->started_at ?? now(),
                    ]);
                }
            }
        });
    }

    // ── Accessors ──────────────────────────────────────────────────────────────

    public function getEstimateTotalMinutesAttribute(): int
    {
        return ($this->estimate_hours ?? 0) * 60 + ($this->estimate_minutes ?? 0);
    }

    public function getLoggedTotalMinutesAttribute(): int
    {
        return ($this->logged_hours ?? 0) * 60 + ($this->logged_minutes ?? 0);
    }

    public function getTimeRemainingMinutesAttribute(): int
    {
        return max(0, $this->estimate_total_minutes - $this->logged_total_minutes);
    }

    public function getIsOverdueAttribute(): bool
    {
        return $this->due_date &&
            Carbon::parse($this->due_date)->isPast() &&
            !in_array($this->status, ['done', 'closed']);
    }

    public function getProgressPercentAttribute(): int
    {
        return $this->completion_percentage ?? 0;
    }

    public function getDurationDaysAttribute(): ?int
    {
        if (!$this->started_at || !$this->completed_at) return null;
        return (int) $this->started_at->diffInDays($this->completed_at);
    }

    // ── Relationships ──────────────────────────────────────────────────────────

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function story(): BelongsTo
    {
        return $this->belongsTo(UserStory::class, 'story_id');
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reporter_id');
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Task::class, 'parent_id');
    }

    public function childTasks(): HasMany
    {
        return $this->hasMany(Task::class, 'parent_id');
    }

    public function subTasks(): HasMany
    {
        return $this->hasMany(SubTask::class);
    }

    public function timeLogs(): HasMany
    {
        return $this->hasMany(TimeLog::class)->orderBy('logged_date', 'desc');
    }

    public function comments(): MorphMany
    {
        return $this->morphMany(Comment::class, 'commentable')->orderBy('created_at', 'desc');
    }

    public function attachments(): MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }

    public function activityLogs(): MorphMany
    {
        return $this->morphMany(ActivityLog::class, 'loggable')->orderBy('created_at', 'desc');
    }
}