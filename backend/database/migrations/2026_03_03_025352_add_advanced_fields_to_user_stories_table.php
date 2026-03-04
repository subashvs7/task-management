<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_stories', function (Blueprint $table) {
            // Developer assignments (multiple)
            $table->json('developer_ids')->nullable()->after('assignee_id');

            // Estimation
            $table->integer('estimate_hours')->default(0)->after('story_points');
            $table->integer('estimate_minutes')->default(0)->after('estimate_hours');

            // Time logged
            $table->integer('logged_hours')->default(0)->after('estimate_minutes');
            $table->integer('logged_minutes')->default(0)->after('logged_hours');

            // Completion tracking
            $table->integer('completion_percentage')->default(0)->after('logged_minutes');
            $table->text('completion_note')->nullable()->after('completion_percentage');
            $table->timestamp('started_at')->nullable()->after('completion_note');
            $table->timestamp('completed_at')->nullable()->after('started_at');

            // Extra fields
            $table->string('acceptance_criteria')->nullable()->after('completed_at');
            $table->string('color', 7)->default('#6366f1')->after('acceptance_criteria');
            $table->integer('sort_order')->default(0)->after('color');
        });
    }

    public function down(): void
    {
        Schema::table('user_stories', function (Blueprint $table) {
            $table->dropColumn([
                'developer_ids',
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
            ]);
        });
    }
};