import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { store } from './store';
import { useAppSelector } from './hooks/useAppDispatch';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Epics from './pages/Epics';
import Tasks from './pages/Tasks';
import TaskDetail from './pages/TaskDetail';
import Backlog from './pages/Backlog';
import UserStories from './pages/UserStories';
import Notifications from './pages/Notifications';
import Users from './pages/Users';
import Settings from './pages/Settings';
import ActivityLog from './pages/ActivityLog';
import Reports from './pages/Reports';

// ── Guards ────────────────────────────────────────────────────────────────────

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

// ── Routes ────────────────────────────────────────────────────────────────────

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected — all share the Layout (sidebar + header) */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index                   element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"        element={<Dashboard />} />
          <Route path="projects"         element={<Projects />} />
          <Route path="projects/:id"     element={<ProjectDetail />} />
          <Route path="epics"            element={<Epics />} />
          <Route path="user-stories"     element={<UserStories />} />
          <Route path="tasks"            element={<Tasks />} />
          <Route path="tasks/:id"        element={<TaskDetail />} />
          <Route path="backlog"          element={<Backlog />} />
          <Route path="activity"         element={<ActivityLog />} />
          <Route path="notifications"    element={<Notifications />} />
          <Route path="reports"          element={<Reports />} />
          <Route path="users"            element={<Users />} />
          <Route path="settings"         element={<Settings />} />
          <Route path="*"                element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: '500',
          },
        }}
      />
    </BrowserRouter>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <Provider store={store}>
      <AppRoutes />
    </Provider>
  );
}