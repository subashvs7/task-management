<?php

namespace App\Observers;

use App\Models\ActivityLog;
use App\Models\Project;
use Illuminate\Support\Facades\Auth;

class ProjectObserver
{
    public function created(Project $project): void
    {
        $this->log($project, 'created', 'Project created: ' . $project->name, null, $project->toArray());
    }

    public function updated(Project $project): void
    {
        $dirty = $project->getDirty();
        $original = $project->getOriginal();

        $ignoredFields = ['updated_at'];
        $changes = array_diff_key($dirty, array_flip($ignoredFields));

        if (empty($changes)) return;

        $oldValues = [];
        $newValues = [];

        foreach ($changes as $field => $newValue) {
            $oldValues[$field] = $original[$field] ?? null;
            $newValues[$field] = $newValue;
        }

        $parts = [];
        if (isset($changes['status'])) {
            $parts[] = 'Status changed from "' . ($oldValues['status'] ?? 'none') . '" to "' . $newValues['status'] . '"';
        }
        if (isset($changes['name'])) {
            $parts[] = 'Name updated';
        }
        if (isset($changes['priority'])) {
            $parts[] = 'Priority changed to "' . $newValues['priority'] . '"';
        }

        $description = empty($parts)
            ? 'Project updated: ' . $project->name
            : implode('; ', $parts) . ' on "' . $project->name . '"';

        $this->log($project, 'updated', $description, $oldValues, $newValues);
    }

    public function deleted(Project $project): void
    {
        $this->log($project, 'deleted', 'Project deleted: ' . $project->name, $project->toArray(), null);
    }

    private function log(
        Project $project,
        string $action,
        string $description,
        ?array $oldValues,
        ?array $newValues
    ): void {
        try {
            ActivityLog::create([
                'loggable_type' => Project::class,
                'loggable_id'   => $project->id,
                'user_id'       => Auth::id() ?? 1,
                'action'        => $action,
                'description'   => $description,
                'old_values'    => $oldValues,
                'new_values'    => $newValues,
            ]);
        } catch (\Exception $e) {
            // Silent fail
        }
    }
}