import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '../../services/api';
import type { Task, TaskStatus } from '../../types';

interface TaskState {
  tasks: Task[];
  kanban: Record<TaskStatus, Task[]>;
  currentTask: Task | null;
  loading: boolean;
  error: string | null;
  pagination: {
    current_page: number;
    last_page: number;
    total: number;
  };
}

const initialState: TaskState = {
  tasks: [],
  kanban: {
    backlog: [],
    todo: [],
    in_progress: [],
    in_review: [],
    done: [],
    closed: [],
  },
  currentTask: null,
  loading: false,
  error: null,
  pagination: {
    current_page: 1,
    last_page: 1,
    total: 0,
  },
};

export const fetchTasks = createAsyncThunk(
  'tasks/fetchAll',
  async (params: Record<string, unknown> = {}, { rejectWithValue }) => {
    try {
      const response = await api.get('/tasks', { params });
      return response.data;
    } catch {
      return rejectWithValue('Failed to fetch tasks');
    }
  }
);

export const fetchKanban = createAsyncThunk(
  'tasks/fetchKanban',
  async (params: Record<string, unknown> = {}, { rejectWithValue }) => {
    try {
      const response = await api.get('/tasks/kanban', { params });
      return response.data;
    } catch {
      return rejectWithValue('Failed to fetch kanban');
    }
  }
);

export const createTask = createAsyncThunk(
  'tasks/create',
  async (data: Partial<Task>, { rejectWithValue }) => {
    try {
      const response = await api.post('/tasks', data);
      return response.data;
    } catch {
      return rejectWithValue('Failed to create task');
    }
  }
);

export const updateTask = createAsyncThunk(
  'tasks/update',
  async ({ id, data }: { id: number; data: Partial<Task> }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/tasks/${id}`, data);
      return response.data;
    } catch {
      return rejectWithValue('Failed to update task');
    }
  }
);

export const updateTaskStatus = createAsyncThunk(
  'tasks/updateStatus',
  async (
    { id, status }: { id: number; status: TaskStatus; sort_order?: number },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.patch(`/tasks/${id}/status`, { status });
      return response.data;
    } catch {
      return rejectWithValue('Failed to update task status');
    }
  }
);

export const deleteTask = createAsyncThunk(
  'tasks/delete',
  async (id: number, { rejectWithValue }) => {
    try {
      await api.delete(`/tasks/${id}`);
      return id;
    } catch {
      return rejectWithValue('Failed to delete task');
    }
  }
);

export const fetchTaskById = createAsyncThunk(
  'tasks/fetchById',
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await api.get(`/tasks/${id}`);
      return response.data;
    } catch {
      return rejectWithValue('Failed to fetch task');
    }
  }
);

const taskSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    clearCurrentTask: (state) => {
      state.currentTask = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.loading = false;
        state.tasks = action.payload.data ?? action.payload;
        if (action.payload.current_page) {
          state.pagination = {
            current_page: action.payload.current_page,
            last_page: action.payload.last_page,
            total: action.payload.total,
          };
        }
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchKanban.fulfilled, (state, action) => {
        state.kanban = {
          backlog: action.payload.backlog ?? [],
          todo: action.payload.todo ?? [],
          in_progress: action.payload.in_progress ?? [],
          in_review: action.payload.in_review ?? [],
          done: action.payload.done ?? [],
          closed: action.payload.closed ?? [],
        };
      })
      .addCase(createTask.fulfilled, (state, action) => {
        const task: Task = action.payload;
        state.tasks.unshift(task);
        const status = task.status as TaskStatus;
        if (state.kanban[status]) {
          state.kanban[status].unshift(task);
        }
      })
      .addCase(updateTask.fulfilled, (state, action) => {
        const updated: Task = action.payload;
        const idx = state.tasks.findIndex((t) => t.id === updated.id);
        if (idx !== -1) state.tasks[idx] = updated;
        if (state.currentTask?.id === updated.id) {
          state.currentTask = updated;
        }
      })
      .addCase(updateTaskStatus.fulfilled, (state, action) => {
        const updated: Task = action.payload;
        const idx = state.tasks.findIndex((t) => t.id === updated.id);
        if (idx !== -1) state.tasks[idx] = updated;
      })
      .addCase(deleteTask.fulfilled, (state, action) => {
        const id = action.payload;
        state.tasks = state.tasks.filter((t) => t.id !== id);
        const allStatuses = Object.keys(state.kanban) as TaskStatus[];
        for (const s of allStatuses) {
          state.kanban[s] = state.kanban[s].filter((t) => t.id !== id);
        }
      })
      .addCase(fetchTaskById.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchTaskById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentTask = action.payload;
      });
  },
});

export const { clearCurrentTask } = taskSlice.actions;
export default taskSlice.reducer;