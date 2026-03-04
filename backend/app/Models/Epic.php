<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Epic extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'name',
        'description',
        'status',
        'priority',
        'start_date',
        'end_date',
        'color',
        'goal',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date'   => 'date',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function userStories(): HasMany
    {
        return $this->hasMany(UserStory::class);
    }

    public function getIsOverdueAttribute(): bool
    {
        return $this->end_date &&
            $this->end_date->isPast() &&
            !in_array($this->status, ['done', 'closed']);
    }

    public function getDurationDaysAttribute(): ?int
    {
        if (!$this->start_date || !$this->end_date) return null;
        return $this->start_date->diffInDays($this->end_date);
    }
}