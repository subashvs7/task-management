import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/useAppDispatch';
import api from '../services/api';
import { useState } from 'react';
import Header from '../components/layout/Header';
import AdminDashboard from '../components/dashboards/AdminDashboard';
import ManagerDashboard from '../components/dashboards/ManagerDashboard';
import TeamLeaderDashboard from '../components/dashboards/TeamLeaderDashboard';
import DeveloperDashboard from '../components/dashboards/DeveloperDashboard';
import DesignerDashboard from '../components/dashboards/DesignerDashboard';
import TesterDashboard from '../components/dashboards/TesterDashboard';
import HrDashboard from '../components/dashboards/HrDashboard';
import type { DashboardData } from '../types';

export default function Dashboard() {
  const { user } = useAppSelector((state) => state.auth);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard').then((res) => {
      setDashboardData(res.data);
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  const role = dashboardData?.role ?? user?.roles?.[0]?.name ?? 'developer';

  const renderDashboard = () => {
    if (!dashboardData) return null;
    const data = dashboardData.data as Record<string, unknown>;

    switch (role) {
      case 'admin':
        return <AdminDashboard data={data as Parameters<typeof AdminDashboard>[0]['data']} />;
      case 'manager':
        return <ManagerDashboard data={data as Parameters<typeof ManagerDashboard>[0]['data']} />;
      case 'team_leader':
        return <TeamLeaderDashboard data={data as Parameters<typeof TeamLeaderDashboard>[0]['data']} />;
      case 'designer':
        return <DesignerDashboard data={data as Parameters<typeof DeveloperDashboard>[0]['data']} />;
      case 'tester':
        return <TesterDashboard data={data as Parameters<typeof TesterDashboard>[0]['data']} />;
      case 'hr':
        return <HrDashboard data={data as Parameters<typeof HrDashboard>[0]['data']} />;
      default:
        return <DeveloperDashboard data={data as Parameters<typeof DeveloperDashboard>[0]['data']} />;
    }
  };

  return (
    <div>
      <Header title="Dashboard" />
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-gray-900">
                Welcome back, {user?.name}! 👋
              </h3>
              <p className="text-gray-500 capitalize mt-1">
                {role.replace('_', ' ')} Dashboard
              </p>
            </div>
            {renderDashboard()}
          </>
        )}
      </div>
    </div>
  );
}