<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            // Add missing task type enum values that TaskController validates
            // Original migration only had: task, bug, feature, improvement, test
            // TaskController validates: task, bug, feature, improvement, test, research, design, documentation
            // MySQL ENUM must be altered to add new values
            $table->enum('type', [
                'task', 'bug', 'feature', 'improvement',
                'test', 'research', 'design', 'documentation',
            ])->default('task')->change();
        });

        Schema::table('projects', function (Blueprint $table) {
            // Add color column used in Reports and ProjectDetail
            if (! Schema::hasColumn('projects', 'color')) {
                $table->string('color', 20)->nullable()->default('#6366f1')->after('status');
            }
        });
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->enum('type', [
                'task', 'bug', 'feature', 'improvement', 'test',
            ])->default('task')->change();
        });

        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn('color');
        });
    }
};