import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Link } from 'react-router-dom';
import { Calendar, User } from 'lucide-react';
import type { Task } from '../../types';
import Badge from '../ui/Badge';

interface Props {
  task: Task;
  isDragging?: boolean;
}

export default function KanbanCard({ task, isDragging }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white rounded-lg border border-gray-200 p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow ${
        isDragging ? 'shadow-lg rotate-2' : ''
      }`}
    >
      <Link to={`/tasks/${task.id}`} onClick={(e) => e.stopPropagation()}>
        <p className="text-sm font-medium text-gray-900 mb-2 line-clamp-2">{task.title}</p>
      </Link>

      <div className="flex flex-wrap gap-1 mb-2">
        <Badge value={task.priority} type="priority" />
        <Badge value={task.type} type="type" />
      </div>

      <div className="flex items-center justify-between text-xs text-gray-400">
        {task.due_date && (
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{new Date(task.due_date).toLocaleDateString()}</span>
          </div>
        )}
        {task.assignee && (
          <div className="flex items-center gap-1">
            <User className="w-3 h-3" />
            <span className="truncate max-w-[80px]">{task.assignee.name}</span>
          </div>
        )}
      </div>
    </div>
  );
}