import { BarChart3, Users, FolderOpen, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import type { Project } from '../../types';

interface AdminDashboardData {
  total_projects: number;
  active_projects: number;
  total_users: number;
  total_tasks: number;
  tasks_by_status: {
    todo: number;
    in_progress: number;
    done: number;
  };
  recent_projects: Project[];
}

interface Props {
  data: AdminDashboardData;
}

export default function AdminDashboard({ data }: Props) {
  const stats = [
    {
      label: 'Total Projects',
      value: data.total_projects,
      icon: FolderOpen,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Active Projects',
      value: data.active_projects,
      icon: BarChart3,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Total Users',
      value: data.total_users,
      icon: Users,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      label: 'Total Tasks',
      value: data.total_tasks,
      icon: CheckCircle,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card flex items-center gap-4">
            <div className={`p-3 rounded-lg ${stat.bg}`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Status */}
        <div className="card">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Tasks by Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">To Do</span>
              </div>
              <span className="font-semibold">{data.tasks_by_status.todo}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-gray-600">In Progress</span>
              </div>
              <span className="font-semibold">{data.tasks_by_status.in_progress}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm text-gray-600">Done</span>
              </div>
              <span className="font-semibold">{data.tasks_by_status.done}</span>
            </div>
          </div>
        </div>

        {/* Recent Projects */}
        <div className="card">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Recent Projects</h3>
          <div className="space-y-3">
            {data.recent_projects?.length === 0 && (
              <p className="text-sm text-gray-400">No projects yet</p>
            )}
            {data.recent_projects?.map((project) => (
              <div key={project.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{project.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{project.status.replace('_', ' ')}</p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    project.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {project.priority}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}