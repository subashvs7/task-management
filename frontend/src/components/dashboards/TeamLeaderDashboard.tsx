import { CheckCircle, Clock, Users, AlertTriangle } from 'lucide-react';
import type { Task } from '../../types';
import Badge from '../ui/Badge';
import { Link } from 'react-router-dom';

interface TeamLeaderDashboardData {
  my_tasks: number;
  my_in_progress_tasks: number;
  team_tasks: number;
  overdue_tasks: number;
  my_recent_tasks: Task[];
}

export default function TeamLeaderDashboard({ data }: { data: TeamLeaderDashboardData }) {
  const stats = [
    { label: 'My Tasks', value: data.my_tasks, icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'In Progress', value: data.my_in_progress_tasks, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: 'Team Tasks', value: data.team_tasks, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Overdue', value: data.overdue_tasks, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
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
      <div className="card">
        <h3 className="text-base font-semibold text-gray-900 mb-4">My Recent Tasks</h3>
        <div className="space-y-3">
          {data.my_recent_tasks?.map((task) => (
            <Link
              key={task.id}
              to={`/tasks/${task.id}`}
              className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{task.title}</p>
                <p className="text-xs text-gray-500">{task.project?.name}</p>
              </div>
              <Badge value={task.status} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}