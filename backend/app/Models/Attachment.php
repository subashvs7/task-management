<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Facades\Storage;
use App\Traits\LogsActivity;

class Attachment extends Model
{
    use LogsActivity;
    use HasFactory;

    protected $fillable = [
        'attachable_type',
        'attachable_id',
        'user_id',
        'name',
        'original_name',
        'path',
        'disk',
        'mime_type',
        'extension',
        'size',
        'description',
        'thumbnail_path',
        'width',
        'height',
        'version',
    ];

    protected $casts = [
        'size'    => 'integer',
        'width'   => 'integer',
        'height'  => 'integer',
        'version' => 'integer',
    ];

    protected $appends = ['url', 'thumbnail_url', 'formatted_size', 'is_image', 'file_category'];

    // ── Relationships ──────────────────────────────────────────────────────────

    public function attachable(): MorphTo
    {
        return $this->morphTo();
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // ── Accessors ──────────────────────────────────────────────────────────────

    public function getUrlAttribute(): string
    {
        return Storage::disk($this->disk)->url($this->path);
    }

    public function getThumbnailUrlAttribute(): ?string
    {
        if (!$this->thumbnail_path) return null;
        return Storage::disk($this->disk)->url($this->thumbnail_path);
    }

    public function getFormattedSizeAttribute(): string
    {
        $bytes = $this->size;
        if ($bytes < 1024)       return $bytes . ' B';
        if ($bytes < 1048576)    return round($bytes / 1024, 1) . ' KB';
        if ($bytes < 1073741824) return round($bytes / 1048576, 1) . ' MB';
        return round($bytes / 1073741824, 2) . ' GB';
    }

    public function getIsImageAttribute(): bool
    {
        return str_starts_with($this->mime_type, 'image/');
    }

    public function getFileCategoryAttribute(): string
    {
        $mime = $this->mime_type;
        if (str_starts_with($mime, 'image/'))       return 'image';
        if (str_starts_with($mime, 'video/'))       return 'video';
        if (str_starts_with($mime, 'audio/'))       return 'audio';
        if ($mime === 'application/pdf')             return 'pdf';
        if (in_array($mime, [
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ])) return 'word';
        if (in_array($mime, [
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/csv',
        ])) return 'excel';
        if (in_array($mime, [
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        ])) return 'powerpoint';
        if (in_array($mime, ['application/zip', 'application/x-rar-compressed', 'application/x-tar'])) return 'archive';
        if (str_starts_with($mime, 'text/')) return 'text';
        if (in_array($mime, [
            'application/javascript', 'application/json',
            'application/xml', 'text/html',
        ])) return 'code';
        return 'other';
    }

    // ── Scopes ─────────────────────────────────────────────────────────────────

    public function scopeImages($query)
    {
        return $query->where('mime_type', 'like', 'image/%');
    }

    public function scopeDocuments($query)
    {
        return $query->where('mime_type', 'not like', 'image/%')
                     ->where('mime_type', 'not like', 'video/%');
    }
}