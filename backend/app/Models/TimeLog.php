<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TimeLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'task_id',
        'user_id',
        'hours',
        'minutes',
        'logged_date',
        'description',
    ];

    protected $casts = [
        'logged_date' => 'date',
        'hours'       => 'integer',
        'minutes'     => 'integer',
    ];

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // Total in minutes
    public function getTotalMinutesAttribute(): int
    {
        return ($this->hours * 60) + $this->minutes;
    }
}