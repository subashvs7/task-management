<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            if (!Schema::hasColumn('tasks', 'labels')) {
                $table->json('labels')->nullable()->after('sort_order');
            }
            if (!Schema::hasColumn('tasks', 'environment')) {
                $table->string('environment', 100)->nullable()->after('labels');
            }
            if (!Schema::hasColumn('tasks', 'version')) {
                $table->string('version', 50)->nullable()->after('environment');
            }
            if (!Schema::hasColumn('tasks', 'acceptance_criteria')) {
                $table->text('acceptance_criteria')->nullable()->after('version');
            }
        });
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropColumn(['labels', 'environment', 'version', 'acceptance_criteria']);
        });
    }
};