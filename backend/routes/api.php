<?php

use App\Http\Controllers\ActivityLogController;
use App\Http\Controllers\AttachmentController;
use App\Http\Controllers\CommentController;
use App\Http\Controllers\CompanyController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EpicController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\SubTaskController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\UserStoryController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [\App\Http\Controllers\Auth\AuthenticatedSessionController::class, 'store']);
Route::post('/register', [\App\Http\Controllers\Auth\RegisteredUserController::class, 'store']);
Route::post('/logout', [\App\Http\Controllers\Auth\AuthenticatedSessionController::class, 'destroy'])
    ->middleware('auth:sanctum');

Route::middleware('auth:sanctum')->group(function () {

    Route::get('/user', [UserController::class, 'me']);
    Route::get('/dashboard', [DashboardController::class, 'index']);

    Route::apiResource('companies', CompanyController::class);

    Route::get('/users', [UserController::class, 'index']);
    Route::get('/users/{user}', [UserController::class, 'show']);
    Route::put('/users/{user}', [UserController::class, 'update']);
    Route::delete('/users/{user}', [UserController::class, 'destroy']);

    Route::apiResource('projects', ProjectController::class);
    Route::get('/epics/{epic}/stats', [EpicController::class, 'stats']);
Route::apiResource('epics', EpicController::class);

Route::get('/user-stories/sprints', [UserStoryController::class, 'sprints']);
Route::get('/user-stories/stats',   [UserStoryController::class, 'stats']);
Route::post('/user-stories/{userStory}/log-time',         [UserStoryController::class, 'logTime']);
Route::patch('/user-stories/{userStory}/completion',      [UserStoryController::class, 'updateCompletion']);

    Route::apiResource('user-stories', UserStoryController::class);

   Route::get('/tasks/kanban',                    [TaskController::class, 'kanban']);
Route::get('/tasks/stats',                     [TaskController::class, 'stats']);
Route::post('/tasks/bulk-update',              [TaskController::class, 'bulkUpdate']);
Route::patch('/tasks/{task}/status',           [TaskController::class, 'updateStatus']);
Route::post('/tasks/{task}/log-time',          [TaskController::class, 'logTime']);
Route::delete('/tasks/{task}/time-logs/{timeLog}', [TaskController::class, 'deleteTimeLog']);
Route::patch('/tasks/{task}/completion',       [TaskController::class, 'updateCompletion']);
Route::post('/tasks/{task}/duplicate',         [TaskController::class, 'duplicate']);

// Nested resources under task
Route::apiResource('tasks.sub-tasks',  SubTaskController::class)->shallow();
Route::apiResource('tasks.comments',   CommentController::class)->shallow();
Route::get('/attachments',           [AttachmentController::class, 'index']);
Route::get('/attachments/stats',     [AttachmentController::class, 'stats']);
Route::post('/attachments',          [AttachmentController::class, 'store']);
Route::delete('/attachments/bulk',   [AttachmentController::class, 'bulkDestroy']);
Route::get('/attachments/{attachment}/download', [AttachmentController::class, 'download']);
Route::apiResource('attachments', AttachmentController::class)->except(['index', 'store']);


// Task CRUD
Route::apiResource('tasks', TaskController::class);

    // Sub-tasks
    Route::get('/tasks/{task}/sub-tasks', [SubTaskController::class, 'index']);
    Route::post('/tasks/{task}/sub-tasks', [SubTaskController::class, 'store']);
    Route::put('/tasks/{task}/sub-tasks/{subTask}', [SubTaskController::class, 'update']);
    Route::delete('/tasks/{task}/sub-tasks/{subTask}', [SubTaskController::class, 'destroy']);

    // Comments
    Route::post('/tasks/{task}/comments', [CommentController::class, 'store']);
    Route::put('/comments/{comment}', [CommentController::class, 'update']);
    Route::delete('/comments/{comment}', [CommentController::class, 'destroy']);

    // Attachments
    Route::post('/tasks/{task}/attachments', [AttachmentController::class, 'store']);
    Route::delete('/attachments/{attachment}', [AttachmentController::class, 'destroy']);

    // Activity Logs
    Route::get('/activity-logs', [ActivityLogController::class, 'index']);
    Route::get('/activity-logs/my', [ActivityLogController::class, 'myActivity']);
    Route::get('/activity-logs/project/{project}', [ActivityLogController::class, 'forProject']);
    Route::get('/activity-logs/task/{task}', [ActivityLogController::class, 'forTask']);

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread', [NotificationController::class, 'unread']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
    Route::delete('/notifications/delete-all', [NotificationController::class, 'destroyAll']);
    Route::patch('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::delete('/notifications/{id}', [NotificationController::class, 'destroy']);
});

Route::prefix('settings')->group(function () {
    Route::get   ('profile',          [\App\Http\Controllers\SettingsController::class, 'profile']);
    Route::put   ('profile',          [\App\Http\Controllers\SettingsController::class, 'updateProfile']);
    Route::post  ('avatar',           [\App\Http\Controllers\SettingsController::class, 'uploadAvatar']);
    Route::delete('avatar',           [\App\Http\Controllers\SettingsController::class, 'deleteAvatar']);
    Route::put   ('password',         [\App\Http\Controllers\SettingsController::class, 'changePassword']);
    Route::get   ('notifications',    [\App\Http\Controllers\SettingsController::class, 'notificationPrefs']);
    Route::put   ('notifications',    [\App\Http\Controllers\SettingsController::class, 'updateNotificationPrefs']);
    Route::get   ('appearance',       [\App\Http\Controllers\SettingsController::class, 'appearance']);
    Route::put   ('appearance',       [\App\Http\Controllers\SettingsController::class, 'updateAppearance']);
    Route::get   ('security',         [\App\Http\Controllers\SettingsController::class, 'security']);
    Route::delete('account',          [\App\Http\Controllers\SettingsController::class, 'deleteAccount']);
});