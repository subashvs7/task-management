import { FolderOpen, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react';
import type { Project } from '../../types';

interface ManagerDashboardData {
  total_projects: number;
  active_projects: number;
  total_tasks: number;
  overdue_tasks: number;
  recent_projects: Project[];
  tasks_by_priority: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export default function ManagerDashboard({ data }: { data: ManagerDashboardData }) {
  const stats = [
    { label: 'Total Projects', value: data.total_projects, icon: FolderOpen, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Active Projects', value: data.active_projects, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Total Tasks', value: data.total_tasks, icon: CheckCircle, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Overdue Tasks', value: data.overdue_tasks, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
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
        <div className="card">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Tasks by Priority</h3>
          <div className="space-y-3">
            {Object.entries(data.tasks_by_priority ?? {}).map(([priority, count]) => (
              <div key={priority} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 capitalize">{priority}</span>
                <span className="font-semibold">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Recent Projects</h3>
          <div className="space-y-3">
            {data.recent_projects?.map((project) => (
              <div key={project.id} className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900">{project.name}</p>
                <span className="text-xs text-gray-500 capitalize">{project.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}