<?php
use Illuminate\Support\Str;

$dir = __DIR__ . '/../app/Models';
$files = glob($dir . '/*.php');
$tables = ['users', 'companies', 'projects', 'epics', 'tasks', 'sub_tasks', 'user_stories', 'comments', 'attachments', 'time_logs', 'activity_logs'];
$tablesList = implode("', '", $tables);

echo "=== Creating Migration ===\n";
$migrationName = '2026_04_16_000001_add_status_to_all_tables.php';
$migrationPath = __DIR__ . '/../database/migrations/' . $migrationName;

$migration = <<<PHP
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        \$tables = ['{$tablesList}'];
        
        foreach (\$tables as \$table) {
            if (Schema::hasTable(\$table) && !Schema::hasColumn(\$table, 'status')) {
                Schema::table(\$table, function (Blueprint \$table) {
                    \$table->enum('status', ['active', 'deleted'])->default('active')->after('updated_at');
                });
            }
        }
    }

    public function down(): void
    {
        \$tables = ['{$tablesList}'];
        
        foreach (\$tables as \$table) {
            if (Schema::hasTable(\$table) && Schema::hasColumn(\$table, 'status')) {
                Schema::table(\$table, function (Blueprint \$table) {
                    \$table->dropColumn('status');
                });
            }
        }
    }
};
PHP;

file_put_contents($migrationPath, $migration);
echo "Created migration: $migrationName\n\n";

echo "=== Updating Models ===\n";

foreach ($files as $file) {
    $modelName = basename($file, '.php');
    $contents = file_get_contents($file);
    
    // Remove SoftDeletes trait if exists
    if (strpos($contents, 'use SoftDeletes;') !== false) {
        $contents = str_replace('use SoftDeletes;', '', $contents);
        // Remove extra blank lines that might result
        $contents = preg_replace('/\n\s*\n/', "\n\n", $contents);
        $contents = trim($contents) . "\n";
    }
    
    if (strpos($contents, 'const STATUS_ACTIVE') !== false) {
        echo "Skipped (already has status): $modelName\n";
        continue;
    }
    
    $hasStatus = false;
    if (strpos($contents, 'protected \$table') !== false) {
        preg_match('/protected \$table\s*=\s*[\'"]([^\'"]+)[\'"]/', $contents, $matches);
        $tableName = $matches[1] ?? strtolower(Str::snake($modelName) . 's');
    } else {
        $tableName = strtolower(Str::snake($modelName) . 's');
    }
    
    $insertAfter = '';
    if (strpos($contents, 'use HasFactory') !== false) {
        $insertAfter = 'use HasFactory;';
    } elseif (strpos($contents, 'extends Model') !== false) {
        $insertAfter = 'extends Model';
    }
    
    $newCode = '';
    if (!empty($insertAfter)) {
        $newCode = '
    
    const STATUS_ACTIVE = \'active\';
    const STATUS_DELETED = \'deleted\';
    
    protected \$attributes = [
        \'status\' => self::STATUS_ACTIVE,
    ];
    
    public function scopeActive(\$query)
    {
        return \$query->where(\'status\', self::STATUS_ACTIVE);
    }
    
    public function delete(): bool
    {
        \$this->status = self::STATUS_DELETED;
        return \$this->save();
    }
    
    public function restore(): bool
    {
        \$this->status = self::STATUS_ACTIVE;
        return \$this->save();
    }
    
    public function isDeleted(): bool
    {
        return \$this->status === self::STATUS_DELETED;
    }';
    }
    
    if (!empty($insertAfter) && !empty($newCode)) {
        $contents = str_replace($insertAfter, $insertAfter . $newCode, $contents);
        file_put_contents($file, $contents);
        echo "Updated: $modelName\n";
    } else {
        echo "Skipped (could not find insertion point): $modelName\n";
    }
}

echo "\nDone! Run migration with: php artisan migrate\n";
