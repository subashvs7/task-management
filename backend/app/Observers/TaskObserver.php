<?php

namespace App\Observers;

use App\Models\ActivityLog;
use App\Models\Task;
use Illuminate\Support\Facades\Auth;

class TaskObserver
{
    public function created(Task $task): void
    {
        $this->log($task, 'created', 'Task created: ' . $task->title, null, $task->toArray());
    }

    public function updated(Task $task): void
    {
        $dirty = $task->getDirty();
        $original = $task->getOriginal();

        $ignoredFields = ['updated_at'];
        $changes = array_diff_key($dirty, array_flip($ignoredFields));

        if (empty($changes)) return;

        $oldValues = [];
        $newValues = [];

        foreach ($changes as $field => $newValue) {
            $oldValues[$field] = $original[$field] ?? null;
            $newValues[$field] = $newValue;
        }

        $description = $this->buildDescription($task, $changes, $oldValues, $newValues);

        $this->log($task, 'updated', $description, $oldValues, $newValues);
    }

    public function deleted(Task $task): void
    {
        $this->log($task, 'deleted', 'Task deleted: ' . $task->title, $task->toArray(), null);
    }

    private function buildDescription(Task $task, array $changes, array $old, array $new): string
    {
        $parts = [];

        if (isset($changes['status'])) {
            $parts[] = 'Status changed from "' . ($old['status'] ?? 'none') . '" to "' . $new['status'] . '"';
        }
        if (isset($changes['assigned_to'])) {
            $parts[] = 'Assignee changed';
        }
        if (isset($changes['priority'])) {
            $parts[] = 'Priority changed from "' . ($old['priority'] ?? 'none') . '" to "' . $new['priority'] . '"';
        }
        if (isset($changes['title'])) {
            $parts[] = 'Title updated';
        }
        if (isset($changes['due_date'])) {
            $parts[] = 'Due date changed';
        }
        if (isset($changes['story_id'])) {
            $parts[] = 'Linked story changed';
        }

        return empty($parts)
            ? 'Task updated: ' . $task->title
            : implode('; ', $parts) . ' on "' . $task->title . '"';
    }

    private function log(
        Task $task,
        string $action,
        string $description,
        ?array $oldValues,
        ?array $newValues
    ): void {
        try {
            ActivityLog::create([
                'loggable_type' => Task::class,
                'loggable_id'   => $task->id,
                'user_id'       => Auth::id() ?? $task->assigned_to ?? 1,
                'action'        => $action,
                'description'   => $description,
                'old_values'    => $oldValues,
                'new_values'    => $newValues,
            ]);
        } catch (\Exception $e) {
            // Silent fail — don't break main flow
        }
    }
}