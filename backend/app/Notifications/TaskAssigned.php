<?php

namespace App\Notifications;

use App\Models\Task;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TaskAssigned extends Notification
{
    use Queueable;

    public function __construct(public readonly Task $task) {}

    // database only — remove broadcast until Pusher/Reverb is configured,
    // as ShouldBroadcast + no driver = runtime exception on every assignment
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Task Assigned: ' . $this->task->title)
            ->greeting('Hello ' . $notifiable->name . '!')
            ->line('A task has been assigned to you.')
            ->line('Task: '     . $this->task->title)
            ->line('Priority: ' . ucfirst($this->task->priority))
            ->line('Status: '   . ucfirst(str_replace('_', ' ', $this->task->status)))
            ->action('View Task', url('/tasks/' . $this->task->id))
            ->line('Please review the task and get started!');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'task_id'    => $this->task->id,
            'task_title' => $this->task->title,
            'project_id' => $this->task->project_id,
            'message'    => 'You have been assigned to task: ' . $this->task->title,
            'type'       => 'TaskAssigned',
        ];
    }
}