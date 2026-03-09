<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Laravel\Sanctum\PersonalAccessToken;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, HasRoles;

    protected $fillable = [
        "name",
        "email",
        "password",
        "company_id",
        "avatar",
        "phone",
        "is_active",
        "timezone",
        "bio",
        "job_title",
        "department",
        "notification_prefs",
        "appearance_prefs",
        "two_factor_enabled",
        "last_login_at",
        "last_login_ip",
    ];

    protected $hidden = [
        "password",
        "remember_token",
    ];

    protected $casts = [
        "email_verified_at"  => "datetime",
        "password"           => "hashed",
        "is_active"          => "boolean",
        "notification_prefs" => "array",
        "appearance_prefs"   => "array",
        "two_factor_enabled" => "boolean",
        "last_login_at"      => "datetime",
    ];

    // ── Fix: override tokens() to resolve Spatie + Sanctum conflict ──────
    public function tokens(): MorphMany
    {
        return $this->morphMany(PersonalAccessToken::class, "tokenable");
    }

    // ── Relationships ─────────────────────────────────────────────────────

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function assignedTasks(): HasMany
    {
        return $this->hasMany(Task::class, "assigned_to");
    }

    public function reportedTasks(): HasMany
    {
        return $this->hasMany(Task::class, "reporter_id");
    }

    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class);
    }
}