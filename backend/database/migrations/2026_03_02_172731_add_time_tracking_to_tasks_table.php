<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->integer('estimate_hours')->default(0)->change();
            $table->integer('estimate_minutes')->default(0)->after('estimate_hours');
            $table->integer('logged_hours')->default(0)->change();
            $table->integer('logged_minutes')->default(0)->after('logged_hours');
            $table->timestamp('started_at')->nullable()->after('logged_minutes');
            $table->timestamp('completed_at')->nullable()->after('started_at');
            $table->integer('completion_percentage')->default(0)->after('completed_at');
            $table->text('completion_note')->nullable()->after('completion_percentage');
        });
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropColumn([
                'estimate_minutes',
                'logged_minutes',
                'started_at',
                'completed_at',
                'completion_percentage',
                'completion_note',
            ]);
        });
    }
};