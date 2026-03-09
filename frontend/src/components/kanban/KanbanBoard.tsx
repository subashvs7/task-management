import { useEffect, useRef, useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { useAppDispatch, useAppSelector } from "../../hooks/useAppDispatch";
import { fetchKanban, updateTaskStatus } from "../../store/slices/taskSlice";
import KanbanColumn from "./KanbanColumn";
import KanbanCard from "./KanbanCard";
import type { Task, TaskStatus } from "../../types";

export const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: "backlog", label: "Backlog", color: "bg-gray-100" },
  { id: "todo", label: "To Do", color: "bg-blue-50" },
  { id: "in_progress", label: "In Progress", color: "bg-yellow-50" },
  { id: "in_review", label: "In Review", color: "bg-purple-50" },
  { id: "done", label: "Done", color: "bg-green-50" },
];

const COLUMN_IDS = COLUMNS.map((c) => c.id as string);

const EMPTY_KANBAN: Record<TaskStatus, Task[]> = {
  backlog: [],
  todo: [],
  in_progress: [],
  in_review: [],
  done: [],
  closed: [],
};

interface Props {
  projectId?: number;
}

export default function KanbanBoard({ projectId }: Props) {
  const dispatch = useAppDispatch();
  const { kanban } = useAppSelector((state) => state.tasks);

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localKanban, setLocalKanban] =
    useState<Record<TaskStatus, Task[]>>(EMPTY_KANBAN);

  const dragSourceStatus = useRef<TaskStatus | null>(null);
  const isDraggingRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  // Initial fetch
  useEffect(() => {
    dispatch(fetchKanban(projectId ? { project_id: projectId } : {}));
  }, [dispatch, projectId]);

  // Sync Redux kanban → local only when NOT dragging
  useEffect(() => {
    if (!isDraggingRef.current) {
      // Build safe kanban — filter out any undefined entries
      const safe: Record<TaskStatus, Task[]> = {
        backlog: (kanban.backlog ?? []).filter(Boolean),
        todo: (kanban.todo ?? []).filter(Boolean),
        in_progress: (kanban.in_progress ?? []).filter(Boolean),
        in_review: (kanban.in_review ?? []).filter(Boolean),
        done: (kanban.done ?? []).filter(Boolean),
        closed: (kanban.closed ?? []).filter(Boolean),
      };
      setLocalKanban(safe);
    }
  }, [kanban]);

  const findTaskColumn = useCallback(
    (taskId: number, board: Record<TaskStatus, Task[]>): TaskStatus | null => {
      for (const [status, tasks] of Object.entries(board)) {
        if (tasks.some((t) => t?.id === taskId)) {
          return status as TaskStatus;
        }
      }
      return null;
    },
    [],
  );

  const findColumnFromOverId = useCallback(
    (overId: string, board: Record<TaskStatus, Task[]>): TaskStatus | null => {
      // Direct column id
      if (COLUMN_IDS.includes(overId)) {
        return overId as TaskStatus;
      }
      // Over a task card — find which column it belongs to
      const overTaskId = Number(overId);
      if (!isNaN(overTaskId)) {
        return findTaskColumn(overTaskId, board);
      }
      return null;
    },
    [findTaskColumn],
  );

  const handleDragStart = (event: DragStartEvent) => {
    const taskId = Number(event.active.id);

    const sourceStatus = findTaskColumn(taskId, localKanban);
    if (!sourceStatus) return;

    const task = localKanban[sourceStatus].find((t) => t?.id === taskId);
    if (!task) return;

    dragSourceStatus.current = sourceStatus;
    isDraggingRef.current = true;
    setActiveTask(task);
    setIsDragging(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    isDraggingRef.current = false;
    setIsDragging(false);
    setActiveTask(null);

    const taskId = Number(active.id);
    const sourceStatus = dragSourceStatus.current;
    dragSourceStatus.current = null;

    if (!over || !sourceStatus) {
      // Revert — re-sync from Redux
      const safe: Record<TaskStatus, Task[]> = {
        backlog: (kanban.backlog ?? []).filter(Boolean),
        todo: (kanban.todo ?? []).filter(Boolean),
        in_progress: (kanban.in_progress ?? []).filter(Boolean),
        in_review: (kanban.in_review ?? []).filter(Boolean),
        done: (kanban.done ?? []).filter(Boolean),
        closed: (kanban.closed ?? []).filter(Boolean),
      };
      setLocalKanban(safe);
      return;
    }

    const overId = String(over.id);
    const toStatus = findColumnFromOverId(overId, localKanban);

    if (!toStatus || toStatus === sourceStatus) {
      return;
    }

    // Apply optimistic local update
    setLocalKanban((prev) => {
      const next = {
        backlog: [...(prev.backlog ?? [])],
        todo: [...(prev.todo ?? [])],
        in_progress: [...(prev.in_progress ?? [])],
        in_review: [...(prev.in_review ?? [])],
        done: [...(prev.done ?? [])],
        closed: [...(prev.closed ?? [])],
      };

      const sourceList = next[sourceStatus];
      const taskIndex = sourceList.findIndex((t) => t?.id === taskId);
      if (taskIndex === -1) return prev;

      const [movedTask] = sourceList.splice(taskIndex, 1);
      if (!movedTask) return prev;

      const updatedTask: Task = { ...movedTask, status: toStatus };
      next[toStatus].push(updatedTask);

      return next;
    });

    // Persist to backend
    dispatch(updateTaskStatus({ id: taskId, status: toStatus })).then(
      (result) => {
        if (updateTaskStatus.fulfilled.match(result)) {
          // Re-fetch fresh data from server
          dispatch(fetchKanban(projectId ? { project_id: projectId } : {}));
        } else {
          // Failed — revert to Redux state
          const safe: Record<TaskStatus, Task[]> = {
            backlog: (kanban.backlog ?? []).filter(Boolean),
            todo: (kanban.todo ?? []).filter(Boolean),
            in_progress: (kanban.in_progress ?? []).filter(Boolean),
            in_review: (kanban.in_review ?? []).filter(Boolean),
            done: (kanban.done ?? []).filter(Boolean),
            closed: (kanban.closed ?? []).filter(Boolean),
          };
          setLocalKanban(safe);
        }
      },
    );
  };

  const handleDragCancel = () => {
    isDraggingRef.current = false;
    setIsDragging(false);
    setActiveTask(null);
    dragSourceStatus.current = null;

    // Revert to Redux state
    const safe: Record<TaskStatus, Task[]> = {
      backlog: (kanban.backlog ?? []).filter(Boolean),
      todo: (kanban.todo ?? []).filter(Boolean),
      in_progress: (kanban.in_progress ?? []).filter(Boolean),
      in_review: (kanban.in_review ?? []).filter(Boolean),
      done: (kanban.done ?? []).filter(Boolean),
      closed: (kanban.closed ?? []).filter(Boolean),
    };
    setLocalKanban(safe);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[calc(100vh-200px)]">
        {COLUMNS.map((column) => {
          const tasks = (localKanban[column.id] ?? []).filter(Boolean);
          return (
            <KanbanColumn
              key={column.id}
              id={column.id}
              label={column.label}
              color={column.color}
              tasks={tasks}
            />
          );
        })}
      </div>

      <DragOverlay dropAnimation={null}>
        {isDragging && activeTask ? (
          <KanbanCard task={activeTask} isDragging />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
