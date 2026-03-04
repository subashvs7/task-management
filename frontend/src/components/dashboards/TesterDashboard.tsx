import { Bug, CheckCircle, Eye, ListTodo } from 'lucide-react';
import type { Task } from '../../types';
import Badge from '../ui/Badge';
import { Link } from 'react-router-dom';

interface TesterDashboardData {
  my_tasks: number;
  open_bugs: number;
  closed_bugs: number;
  in_review_tasks: number;
  recent_tasks: Task[];
}

export default function TesterDashboard({ data }: { data: TesterDashboardData }) {
  const stats = [
    { label: 'My Tasks', value: data.my_tasks, icon: ListTodo, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Open Bugs', value: data.open_bugs, icon: Bug, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Closed Bugs', value: data.closed_bugs, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'In Review', value: data.in_review_tasks, icon: Eye, color: 'text-purple-600', bg: 'bg-purple-50' },
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
        <h3 className="text-base font-semibold text-gray-900 mb-4">Recent Tasks</h3>
        <div className="space-y-3">
          {data.recent_tasks?.map((task) => (
            <Link
              key={task.id}
              to={`/tasks/${task.id}`}
              className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{task.title}</p>
                <p className="text-xs text-gray-500">{task.project?.name}</p>
              </div>
              <div className="flex gap-2">
                <Badge value={task.type} type="type" />
                <Badge value={task.status} type="status" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}