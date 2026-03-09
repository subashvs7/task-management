<?php

use App\Http\Controllers\ActivityLogController;
use App\Http\Controllers\AttachmentController;
use App\Http\Controllers\CommentController;
use App\Http\Controllers\CompanyController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EpicController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\ReportsController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\SubTaskController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\UserStoryController;
use Illuminate\Support\Facades\Route;

// ── Public auth routes ────────────────────────────────────────────────────────

Route::post('/login',    [\App\Http\Controllers\Auth\AuthenticatedSessionController::class, 'store']);
Route::post('/register', [\App\Http\Controllers\Auth\RegisteredUserController::class,       'store']);
Route::post('/logout',   [\App\Http\Controllers\Auth\AuthenticatedSessionController::class, 'destroy'])
    ->middleware('auth:sanctum');

// ── All authenticated routes ──────────────────────────────────────────────────

Route::middleware('auth:sanctum')->group(function () {

    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index']);

    // Users — named sub-routes MUST come before {id} catch-all
    Route::get   ('users/roles',              [UserController::class, 'roles']);
    Route::get   ('users/me',                 [UserController::class, 'me']);
    Route::get   ('users',                    [UserController::class, 'index']);
    Route::post  ('users',                    [UserController::class, 'store']);
    Route::get   ('users/{id}',               [UserController::class, 'show']);
    Route::put   ('users/{id}',               [UserController::class, 'update']);
    Route::patch ('users/{id}/toggle-status', [UserController::class, 'toggleStatus']);
    Route::delete('users/{id}',               [UserController::class, 'destroy']);

    // Companies
    Route::apiResource('companies', CompanyController::class);

    // Projects — named sub-routes MUST come before apiResource({project}) catch-all
    Route::get('projects/users',           [ProjectController::class, 'users']);   // role-scoped dropdown
    Route::get('projects/{project}/stats', [ProjectController::class, 'stats']);   // project stats page
    Route::apiResource('projects', ProjectController::class);

    // Epics
    Route::get('epics/{epic}/stats', [EpicController::class, 'stats']);
    Route::apiResource('epics', EpicController::class);

    // User Stories
    Route::get  ('/user-stories/sprints',                    [UserStoryController::class, 'sprints']);
    Route::get  ('/user-stories/stats',                      [UserStoryController::class, 'stats']);
    Route::post ('/user-stories/{userStory}/log-time',       [UserStoryController::class, 'logTime']);
    Route::patch('/user-stories/{userStory}/completion',     [UserStoryController::class, 'updateCompletion']);
    Route::apiResource('user-stories', UserStoryController::class);

    // Tasks — named sub-routes MUST come before apiResource catch-all
    Route::get   ('/tasks/users',                        [TaskController::class, 'users']);          // role-scoped assignee dropdown
    Route::get   ('/tasks/kanban',                       [TaskController::class, 'kanban']);
    Route::get   ('/tasks/stats',                        [TaskController::class, 'stats']);
    Route::post  ('/tasks/bulk-update',                  [TaskController::class, 'bulkUpdate']);
    Route::patch ('/tasks/{task}/status',                [TaskController::class, 'updateStatus']);
    Route::post  ('/tasks/{task}/log-time',              [TaskController::class, 'logTime']);
    Route::delete('/tasks/{task}/time-logs/{timeLog}',   [TaskController::class, 'deleteTimeLog']);
    Route::patch ('/tasks/{task}/completion',            [TaskController::class, 'updateCompletion']);
    Route::post  ('/tasks/{task}/duplicate',             [TaskController::class, 'duplicate']);
    Route::apiResource('tasks', TaskController::class);

    // Sub-tasks & Comments (shallow nested)
    // ── Sub-tasks (explicit routes so both nested & flat URLs work) ──────────
    Route::get   ('tasks/{task}/sub-tasks',              [SubTaskController::class, 'index']);
    Route::post  ('tasks/{task}/sub-tasks',              [SubTaskController::class, 'store']);
    Route::put   ('tasks/{task}/sub-tasks/{subTask}',    [SubTaskController::class, 'update']);  // TaskDetail uses nested
    Route::delete('tasks/{task}/sub-tasks/{subTask}',    [SubTaskController::class, 'destroy']); // TaskDetail uses nested
    Route::put   ('sub-tasks/{subTask}',                 [SubTaskController::class, 'updateFlat']); // Tasks.tsx uses flat
    Route::delete('sub-tasks/{subTask}',                 [SubTaskController::class, 'destroyFlat']);
    Route::apiResource('tasks.comments',  CommentController::class)->shallow();

    // Attachments
    Route::get   ('/attachments',                       [AttachmentController::class, 'index']);
    Route::get   ('/attachments/stats',                 [AttachmentController::class, 'stats']);
    Route::post  ('/attachments',                       [AttachmentController::class, 'store']);
    Route::delete('/attachments/bulk',                  [AttachmentController::class, 'bulkDestroy']);
    Route::get   ('/attachments/{attachment}/download', [AttachmentController::class, 'download']);
    Route::apiResource('attachments', AttachmentController::class)->except(['index', 'store']);

    // Activity Logs — named sub-routes (my, users) MUST come before param routes
    Route::get('/activity-logs',                   [ActivityLogController::class, 'index']);
    Route::get('/activity-logs/my',                [ActivityLogController::class, 'myActivity']);
    Route::get('/activity-logs/users',             [ActivityLogController::class, 'users']);          // filter dropdown
    Route::get('/activity-logs/project/{project}', [ActivityLogController::class, 'forProject']);
    Route::get('/activity-logs/task/{task}',       [ActivityLogController::class, 'forTask']);

    // Notifications
    Route::get   ('/notifications',            [NotificationController::class, 'index']);
    Route::get   ('/notifications/unread',     [NotificationController::class, 'unread']);
    Route::post  ('/notifications/read-all',   [NotificationController::class, 'markAllAsRead']);
    Route::delete('/notifications/delete-all', [NotificationController::class, 'destroyAll']);
    Route::patch ('/notifications/{id}/read',  [NotificationController::class, 'markAsRead']);
    Route::delete('/notifications/{id}',       [NotificationController::class, 'destroy']);

    // Reports — moved INSIDE auth:sanctum (were outside — caused 401 errors)
    Route::prefix('reports')->group(function () {
        Route::get('overview', [ReportsController::class, 'overview']);
        Route::get('tasks',    [ReportsController::class, 'tasks']);
        Route::get('projects', [ReportsController::class, 'projects']);
        Route::get('team',     [ReportsController::class, 'team']);
        Route::get('workload', [ReportsController::class, 'workload']);
    });

    // Settings — moved INSIDE auth:sanctum (were outside — caused 401 errors)
    Route::prefix('settings')->group(function () {
        Route::get   ('profile',       [SettingsController::class, 'profile']);
        Route::put   ('profile',       [SettingsController::class, 'updateProfile']);
        Route::post  ('avatar',        [SettingsController::class, 'uploadAvatar']);
        Route::delete('avatar',        [SettingsController::class, 'deleteAvatar']);
        Route::put   ('password',      [SettingsController::class, 'changePassword']);
        Route::get   ('notifications', [SettingsController::class, 'notificationPrefs']);
        Route::put   ('notifications', [SettingsController::class, 'updateNotificationPrefs']);
        Route::get   ('appearance',    [SettingsController::class, 'appearance']);
        Route::put   ('appearance',    [SettingsController::class, 'updateAppearance']);
        Route::get   ('security',      [SettingsController::class, 'security']);
        Route::delete('account',       [SettingsController::class, 'deleteAccount']);
    });
});