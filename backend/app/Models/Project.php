<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Traits\LogsActivity;

class Project extends Model
{
    use LogsActivity;
    use HasFactory;

   protected $fillable = [
    'company_id',
    'name',
    'key',
    'description',
    'status',
    'priority',
    'color',        // ← ADD THIS
    'start_date',
    'end_date',
    'owner_id',
];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function epics(): HasMany
    {
        return $this->hasMany(Epic::class);
    }

    public function userStories(): HasMany
    {
        return $this->hasMany(UserStory::class);
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }
}