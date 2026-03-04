import { Users, UserCheck, UserX, Briefcase } from 'lucide-react';

interface HrDashboardData {
  total_employees: number;
  active_employees: number;
}

export default function HrDashboard({ data }: { data: HrDashboardData }) {
  const inactive = (data.total_employees ?? 0) - (data.active_employees ?? 0);

  const stats = [
    { label: 'Total Employees', value: data.total_employees, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Active', value: data.active_employees, icon: UserCheck, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Inactive', value: inactive, icon: UserX, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Departments', value: '-', icon: Briefcase, color: 'text-purple-600', bg: 'bg-purple-50' },
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
    </div>
  );
}