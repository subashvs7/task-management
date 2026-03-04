export interface User {
  id: number;
  name: string;
  email: string;
  company_id?: number;
  avatar?: string;
  phone?: string;
  is_active?: boolean;
  roles?: Role[];
  company?: Company;
  created_at?: string;
}

export interface Role {
  id: number;
  name: string;
}

export interface Company {
  id: number;
  name: string;
  slug?: string;
  logo?: string;
  website?: string;
  description?: string;
  is_active?: boolean;
}

export interface Project {
  id: number;
  company_id?: number;
  name: string;
  key?: string;
  description?: string;
  status: string;
  priority: string;
  start_date?: string;
  end_date?: string;
  owner_id?: number;
  owner?: User;
  company?: Company;
  tasks_count?: number;
  epics_count?: number;
  user_stories_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Epic {
  id: number;
  project_id: number;
  name: string;
  description?: string;
  status: string;
  priority: string;
  start_date?: string;
  end_date?: string;
  project?: Project;
  userStories?: UserStory[];
  user_stories_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface UserStory {
  id: number;
  project_id: number;
  epic_id?: number;
  name: string;
  description?: string;
  status: string;
  priority: string;
  story_points: number;
  assignee_id?: number;
  reporter_id?: number;
  sprint?: string;
  project?: Project;
  epic?: Epic;
  assignee?: User;
  reporter?: User;
  tasks?: Task[];
  tasks_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface TimeLog {
  id: number;
  task_id: number;
  user_id: number;
  hours: number;
  minutes: number;
  logged_date: string;
  description?: string;
  user?: User;
  created_at?: string;
}

export type TaskStatus =
  | 'backlog'
  | 'todo'
  | 'in_progress'
  | 'in_review'
  | 'done'
  | 'closed';

export interface Task {
  id: number;
  project_id: number;
  story_id?: number;
  parent_id?: number;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: string;
  type: string;
  due_date?: string;
  assigned_to?: number;
  reporter_id?: number;
  estimate_hours: number;
  estimate_minutes: number;
  logged_hours: number;
  logged_minutes: number;
  started_at?: string;
  completed_at?: string;
  completion_percentage: number;
  completion_note?: string;
  sort_order?: number;
  project?: Project;
  story?: UserStory;
  parent?: Task;
  children?: Task[];
  assignee?: User;
  reporter?: User;
  subTasks?: SubTask[];
  sub_tasks?: SubTask[];
  comments?: Comment[];
  attachments?: Attachment[];
  timeLogs?: TimeLog[];
  time_logs?: TimeLog[];
  activityLogs?: ActivityLogEntry[];
  created_at?: string;
  updated_at?: string;
}

export interface SubTask {
  id: number;
  task_id: number;
  title: string;
  status: string;
  assigned_to?: number;
  assignee?: User;
  completed_at?: string;
  created_at?: string;
}

export interface Comment {
  id: number;
  body: string;
  user_id: number;
  user?: User;
  created_at: string;
  updated_at?: string;
}

export interface Attachment {
  id: number;
  name: string;
  path: string;
  mime_type?: string;
  size: number;
  user?: User;
  created_at?: string;
}

export interface ActivityLogEntry {
  id: number;
  loggable_type: string;
  loggable_id: number;
  user_id: number;
  user?: User;
  action: string;
  description: string;
  old_values?: Record<string, unknown> | null;
  new_values?: Record<string, unknown> | null;
  created_at: string;
}

export interface Notification {
  id: string;
  type: string;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export interface DashboardData {
  totalProjects?: number;
  activeProjects?: number;
  totalUsers?: number;
  totalTasks?: number;
  myTasks?: number;
  inProgress?: number;
  completed?: number;
  overdue?: number;
  tasksByStatus?: Record<string, number>;
  tasksByPriority?: Record<string, number>;
  recentProjects?: Project[];
  recentTasks?: Task[];
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}