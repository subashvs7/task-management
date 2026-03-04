<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'avatar'))             $table->string('avatar')->nullable()->after('email');
            if (!Schema::hasColumn('users', 'phone'))              $table->string('phone', 30)->nullable()->after('avatar');
            if (!Schema::hasColumn('users', 'timezone'))           $table->string('timezone', 60)->nullable()->after('phone');
            if (!Schema::hasColumn('users', 'bio'))                $table->text('bio')->nullable()->after('timezone');
            if (!Schema::hasColumn('users', 'job_title'))          $table->string('job_title', 100)->nullable()->after('bio');
            if (!Schema::hasColumn('users', 'department'))         $table->string('department', 100)->nullable()->after('job_title');
            if (!Schema::hasColumn('users', 'notification_prefs')) $table->json('notification_prefs')->nullable()->after('department');
            if (!Schema::hasColumn('users', 'appearance_prefs'))   $table->json('appearance_prefs')->nullable()->after('notification_prefs');
            if (!Schema::hasColumn('users', 'two_factor_enabled')) $table->boolean('two_factor_enabled')->default(false)->after('appearance_prefs');
            if (!Schema::hasColumn('users', 'last_login_at'))      $table->timestamp('last_login_at')->nullable()->after('two_factor_enabled');
            if (!Schema::hasColumn('users', 'last_login_ip'))      $table->string('last_login_ip', 45)->nullable()->after('last_login_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'avatar','phone','timezone','bio','job_title','department',
                'notification_prefs','appearance_prefs',
                'two_factor_enabled','last_login_at','last_login_ip',
            ]);
        });
    }
};