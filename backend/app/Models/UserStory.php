<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Traits\LogsActivity;

class UserStory extends Model
{
    use HasFactory;
    use LogsActivity;

    protected $fillable = [
        'project_id',
        'epic_id',
        'name',
        'description',
        'status',
        'priority',
        'story_points',
        'assignee_id',
        'reporter_id',
        'developer_ids',
        'sprint',
        'estimate_hours',
        'estimate_minutes',
        'logged_hours',
        'logged_minutes',
        'completion_percentage',
        'completion_note',
        'started_at',
        'completed_at',
        'acceptance_criteria',
        'color',
        'sort_order',
    ];

    protected $casts = [
        'developer_ids'         => 'array',
        'story_points'          => 'integer',
        'estimate_hours'        => 'integer',
        'estimate_minutes'      => 'integer',
        'logged_hours'          => 'integer',
        'logged_minutes'        => 'integer',
        'completion_percentage' => 'integer',
        'sort_order'            => 'integer',
        'started_at'            => 'datetime',
        'completed_at'          => 'datetime',
    ];

    protected static function boot(): void
    {
        parent::boot();

        static::updated(function (UserStory $story) {
            // Auto set started_at when moved to in_progress
            if ($story->isDirty('status')) {
                if ($story->status === 'in_progress' && !$story->started_at) {
                    $story->updateQuietly(['started_at' => now()]);
                }
                if (in_array($story->status, ['done', 'closed']) && !$story->completed_at) {
                    $story->updateQuietly([
                        'completed_at'          => now(),
                        'completion_percentage' => 100,
                    ]);
                }
                if (!in_array($story->status, ['done', 'closed']) && $story->completed_at) {
                    $story->updateQuietly(['completed_at' => null]);
                }
            }
            // Auto update completion from percentage
            if ($story->isDirty('completion_percentage')) {
                if ($story->completion_percentage === 100 && $story->status !== 'done') {
                    $story->updateQuietly([
                        'status'       => 'done',
                        'completed_at' => $story->completed_at ?? now(),
                    ]);
                } elseif ($story->completion_percentage > 0 && $story->status === 'todo') {
                    $story->updateQuietly([
                        'status'     => 'in_progress',
                        'started_at' => $story->started_at ?? now(),
                    ]);
                }
            }
        });
    }

    // ── Accessors ──────────────────────────────────────────────────────────────

    public function getEstimateTotalMinutesAttribute(): int
    {
        return ($this->estimate_hours * 60) + $this->estimate_minutes;
    }

    public function getLoggedTotalMinutesAttribute(): int
    {
        return ($this->logged_hours * 60) + $this->logged_minutes;
    }

    public function getTimeRemainingMinutesAttribute(): int
    {
        return max(0, $this->estimate_total_minutes - $this->logged_total_minutes);
    }

    public function getIsOverdueAttribute(): bool
    {
        return false; // Stories don't have due_date by default; extend if needed
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

    public function epic(): BelongsTo
    {
        return $this->belongsTo(Epic::class);
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assignee_id');
    }

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reporter_id');
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class, 'story_id');
    }

    // Get developer User models from developer_ids JSON array
    public function getDevelopersAttribute()
    {
        if (empty($this->developer_ids)) return collect();
        return User::whereIn('id', $this->developer_ids)->get();
    }
}