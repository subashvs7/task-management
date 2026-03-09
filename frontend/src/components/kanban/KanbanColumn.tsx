import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { Task, TaskStatus } from "../../types";
import KanbanCard from "./KanbanCard";

interface Props {
  id: TaskStatus;
  label: string;
  color: string;
  tasks: Task[];
  isOver?: boolean;
}

export default function KanbanColumn({ id, label, color, tasks }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id });

  // Filter out any undefined/null tasks defensively
  const safeTasks = tasks.filter(
    (t): t is Task => t != null && typeof t === "object" && "id" in t,
  );

  return (
    <div
      className={`flex-shrink-0 w-72 rounded-xl flex flex-col transition-all duration-150 ${color} ${
        isOver ? "ring-2 ring-primary-400 ring-offset-1 brightness-95" : ""
      }`}
    >
      {/* Header */}
      <div className="p-3 border-b border-black/5 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">{label}</h3>
        <span className="text-xs bg-white/80 text-gray-500 px-2 py-0.5 rounded-full font-medium">
          {safeTasks.length}
        </span>
      </div>

      {/* Drop zone */}
      <div ref={setNodeRef} className="flex-1 p-2 min-h-[150px]">
        <SortableContext
          items={safeTasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {safeTasks.map((task) => (
              <KanbanCard key={task.id} task={task} />
            ))}
          </div>
        </SortableContext>

        {safeTasks.length === 0 && (
          <div
            className={`mt-1 h-24 rounded-lg border-2 border-dashed flex items-center justify-center transition-colors ${
              isOver ? "border-primary-400 bg-primary-50/50" : "border-gray-200"
            }`}
          >
            <p className="text-xs text-gray-400">Drop here</p>
          </div>
        )}
      </div>
    </div>
  );
}
