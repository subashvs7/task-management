<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attachments', function (Blueprint $table) {
            $table->id();

            // Polymorphic - can attach to tasks, user_stories, epics, projects, comments
            $table->morphs('attachable');

            $table->unsignedBigInteger('user_id')->nullable();
            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();

            $table->string('name');             // original file name
            $table->string('original_name');    // original name for display
            $table->string('path');             // storage path
            $table->string('disk')->default('public'); // storage disk
            $table->string('mime_type', 100);
            $table->string('extension', 20)->nullable();
            $table->unsignedBigInteger('size'); // bytes
            $table->text('description')->nullable();

            // For images - store thumbnail path
            $table->string('thumbnail_path')->nullable();
            $table->integer('width')->nullable();
            $table->integer('height')->nullable();

            // For versioning/replace
            $table->unsignedInteger('version')->default(1);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attachments');
    }
};