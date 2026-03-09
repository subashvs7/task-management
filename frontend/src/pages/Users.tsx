import { useEffect, useState, useCallback } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Eye,
  EyeOff,
  AlertTriangle,
  X,
  UserCheck,
  Shield,
  RefreshCw,
  Key,
  Lock,
  Copy,
  Check,
  UserPlus,
} from 'lucide-react';
import Header from '../components/layout/Header';
import api from '../services/api';
import { useAppSelector } from '../hooks/useAppDispatch';
import toast from 'react-hot-toast';

// ══════════════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════════════

interface UserRow {
  id: number;
  name: string;
  email: string;
  phone?: string;
  job_title?: string;
  department?: string;
  is_active: boolean;
  company_id?: number;
  created_at: string;
  roles: { id: number; name: string }[];
  _plainPassword?: string;   // stored locally after create/edit
}

interface FormState {
  name:                  string;
  email:                 string;
  password:              string;
  password_confirmation: string;
  role:                  string;
  phone:                 string;
  job_title:             string;
  department:            string;
  is_active:             boolean;
}

type ModalMode = 'create' | 'edit' | 'view' | 'credentials';

const EMPTY_FORM: FormState = {
  name:                  '',
  email:                 '',
  password:              '',
  password_confirmation: '',
  role:                  'developer',
  phone:                 '',
  job_title:             '',
  department:            '',
  is_active:             true,
};

const ALL_ROLES         = ['admin', 'manager', 'team_leader', 'developer', 'designer', 'tester', 'hr'];
const TEAM_LEADER_ROLES = ['developer', 'designer', 'tester', 'hr'];

// ══════════════════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════════════════

function roleBadgeClass(role: string): string {
  const map: Record<string, string> = {
    admin:       'bg-red-100 text-red-700',
    manager:     'bg-purple-100 text-purple-700',
    team_leader: 'bg-indigo-100 text-indigo-700',
    developer:   'bg-blue-100 text-blue-700',
    designer:    'bg-pink-100 text-pink-700',
    tester:      'bg-orange-100 text-orange-700',
    hr:          'bg-teal-100 text-teal-700',
  };
  return map[role] ?? 'bg-gray-100 text-gray-600';
}

function fmtRole(r: string): string {
  return r.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ══════════════════════════════════════════════════════════════════════
// useAuthRole
// ── Reads role from ALL possible sources in priority order:
//    1. /api/profile  (most reliable)
//    2. /api/users/me
//    3. /api/user     (Laravel default)
//    4. Redux store
//    5. localStorage  (multiple key names)
// ══════════════════════════════════════════════════════════════════════

function extractRole(obj: any): string {
  if (!obj) return '';
  if (Array.isArray(obj.roles) && obj.roles.length > 0)
    return obj.roles[0]?.name ?? '';
  if (typeof obj.role      === 'string' && obj.role)      return obj.role;
  if (typeof obj.role_name === 'string' && obj.role_name) return obj.role_name;
  return '';
}

function roleFromStorage(): string {
  for (const key of ['auth_user', 'user', 'authUser', 'current_user']) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const role = extractRole(JSON.parse(raw));
      if (role) return role;
    } catch {}
  }
  return '';
}

function useAuthRole(): string {
  const { user: authUser } = useAppSelector((s) => s.auth);
  const [apiRole, setApiRole] = useState<string>('');

  // Immediate sync sources
  const reduxRole   = extractRole(authUser);
  const storageRole = roleFromStorage();

  useEffect(() => {
    (async () => {
      // Try /profile → /users/me → /user in order
      for (const endpoint of ['/profile', '/users/me', '/user']) {
        try {
          const res  = await api.get(endpoint);
          const role = extractRole(res.data?.data ?? res.data);
          if (role) { setApiRole(role); return; }
        } catch {}
      }
    })();
  }, []);

  return apiRole || reduxRole || storageRole;
}

// ══════════════════════════════════════════════════════════════════════
// UserAvatar
// ══════════════════════════════════════════════════════════════════════

function UserAvatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const dim   = size === 'sm' ? 'w-7 h-7 text-xs' : size === 'lg' ? 'w-12 h-12 text-base' : 'w-9 h-9 text-sm';
  const pal   = ['bg-indigo-500','bg-blue-500','bg-emerald-500','bg-purple-500','bg-pink-500','bg-orange-500','bg-cyan-500'];
  const color = pal[(name || 'U').charCodeAt(0) % pal.length];
  return (
    <div className={`${dim} ${color} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}>
      {(name || 'U').charAt(0).toUpperCase()}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// PasswordField
// ══════════════════════════════════════════════════════════════════════

function PasswordField({
  name, value, onChange, placeholder, error, disabled,
}: {
  name: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string; error?: string; disabled?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'} name={name} value={value}
          onChange={onChange} placeholder={placeholder} disabled={disabled}
          className={`input w-full pr-10 ${error ? 'border-red-300 focus:ring-red-200' : ''} ${disabled ? 'bg-gray-50' : ''}`}
        />
        <button type="button" onClick={() => setShow((v) => !v)} disabled={disabled}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {error && (
        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> {error}
        </p>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// CredentialsModal
// ── Admin      : see email + stored plaintext pw + set new pw
// ── Manager    : change pw for developer/designer/tester/hr/team_leader
// ── Team Leader: change pw for developer/designer/tester/hr
// ══════════════════════════════════════════════════════════════════════

function CredentialsModal({
  user, authRole, onClose, onSaved,
}: {
  user: UserRow; authRole: string; onClose: () => void; onSaved: () => void;
}) {
  const isAdmin = authRole === 'admin';

  const [newPw,      setNewPw     ] = useState('');
  const [confirmPw,  setConfirmPw ] = useState('');
  const [showNew,    setShowNew   ] = useState(false);
  const [showConf,   setShowConf  ] = useState(false);
  const [showStored, setShowStored] = useState(false);
  const [saving,     setSaving    ] = useState(false);
  const [pwError,    setPwError   ] = useState('');
  const [copied,     setCopied    ] = useState<'email'|'pw'|null>(null);

  const copy = (text: string, field: 'email'|'pw') => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(field);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  const handleSave = async () => {
    if (!newPw)             { setPwError('Password is required');    return; }
    if (newPw.length < 8)   { setPwError('Minimum 8 characters');    return; }
    if (newPw !== confirmPw){ setPwError('Passwords do not match');   return; }
    setPwError('');
    setSaving(true);
    try {
      await api.put(`/users/${user.id}`, {
        name:                  user.name,
        email:                 user.email,
        role:                  user.roles?.[0]?.name ?? 'developer',
        is_active:             user.is_active,
        password:              newPw,
        password_confirmation: confirmPw,
      });
      toast.success('Password updated!');
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
              <Key className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {isAdmin ? 'User Credentials' : 'Change Password'}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <UserAvatar name={user.name} size="sm" />
                <span className="text-xs font-semibold text-gray-600">{user.name}</span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide ${roleBadgeClass(user.roles?.[0]?.name ?? '')}`}>
                  {fmtRole(user.roles?.[0]?.name ?? 'member')}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">

          {/* Admin: current credentials panel */}
          {isAdmin && (
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Current Credentials</p>

              {/* Email */}
              <div className="bg-gray-50 rounded-xl p-3.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Email / Username</p>
                  <p className="text-sm font-semibold text-gray-800 truncate">{user.email}</p>
                </div>
                <button onClick={() => copy(user.email, 'email')}
                  className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-400 hover:text-indigo-600 hover:border-indigo-300 transition-colors"
                  title="Copy email">
                  {copied === 'email' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Stored password */}
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-1">
                      Password (tracked in this session)
                    </p>
                    {user._plainPassword ? (
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-mono font-bold text-gray-800">
                          {showStored ? user._plainPassword : '•'.repeat(Math.min(user._plainPassword.length, 12))}
                        </p>
                        <button type="button" onClick={() => setShowStored(v => !v)}
                          className="text-amber-400 hover:text-amber-600 transition-colors">
                          {showStored ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">
                        Not tracked yet — set a new password below to store it here
                      </p>
                    )}
                  </div>
                  {user._plainPassword && (
                    <button onClick={() => copy(user._plainPassword!, 'pw')}
                      className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-amber-200 text-amber-400 hover:text-amber-600 transition-colors"
                      title="Copy password">
                      {copied === 'pw' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              <div className="border-t border-dashed border-gray-200" />
            </div>
          )}

          {/* Set / change password */}
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              {isAdmin ? 'Set New Password' : 'Change Password'}
            </p>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">New Password</label>
              <div className="relative">
                <input type={showNew ? 'text' : 'password'} value={newPw}
                  onChange={(e) => { setNewPw(e.target.value); setPwError(''); }}
                  placeholder="Minimum 8 characters"
                  className={`input w-full pr-10 ${pwError ? 'border-red-300' : ''}`}
                />
                <button type="button" onClick={() => setShowNew(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Confirm New Password</label>
              <div className="relative">
                <input type={showConf ? 'text' : 'password'} value={confirmPw}
                  onChange={(e) => { setConfirmPw(e.target.value); setPwError(''); }}
                  placeholder="Repeat password"
                  className={`input w-full pr-10 ${pwError ? 'border-red-300' : ''}`}
                />
                <button type="button" onClick={() => setShowConf(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showConf ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {pwError && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {pwError}
              </p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-semibold rounded-xl transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving || !newPw}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Update Password'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// DeleteConfirmModal
// ══════════════════════════════════════════════════════════════════════

function DeleteConfirmModal({
  user, onClose, onDeleted,
}: {
  user: UserRow; onClose: () => void; onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/users/${user.id}`);
      toast.success('User deleted');
      onDeleted();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">Delete User</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Delete <span className="font-semibold text-gray-700">{user.name}</span>? This cannot be undone.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-semibold rounded-xl transition-colors">
            Cancel
          </button>
          <button onClick={handleDelete} disabled={deleting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// UserFormModal — create / edit / view
// ══════════════════════════════════════════════════════════════════════

function UserFormModal({
  mode, user, allowedRoles, onClose, onSaved,
}: {
  mode: Exclude<ModalMode, 'credentials'>;
  user: UserRow | null;
  allowedRoles: string[];
  onClose: () => void;
  onSaved: (plainPassword?: string) => void;
}) {
  const [form,   setForm  ] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user && (mode === 'edit' || mode === 'view')) {
      setForm({
        name:                  user.name,
        email:                 user.email,
        password:              '',
        password_confirmation: '',
        role:                  user.roles?.[0]?.name ?? 'developer',
        phone:                 user.phone      ?? '',
        job_title:             user.job_title  ?? '',
        department:            user.department ?? '',
        is_active:             user.is_active,
      });
    } else {
      setForm({ ...EMPTY_FORM, role: allowedRoles[0] ?? 'developer' });
    }
    setErrors({});
  }, [user, mode, allowedRoles]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setForm((p) => ({ ...p, [name]: val }));
    setErrors((p) => ({ ...p, [name]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'view') return;

    const errs: Record<string, string> = {};
    if (!form.name.trim())  errs.name  = 'Name is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    if (mode === 'create') {
      if (!form.password)                errs.password              = 'Password is required';
      else if (form.password.length < 8) errs.password              = 'Minimum 8 characters';
      if (form.password !== form.password_confirmation)
        errs.password_confirmation = 'Passwords do not match';
    } else if (form.password && form.password !== form.password_confirmation) {
      errs.password_confirmation = 'Passwords do not match';
    }
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    setErrors({});
    try {
      const plainPw = form.password;
      if (mode === 'create') {
        await api.post('/users', form);
        toast.success('User created successfully!');
        onSaved(plainPw);
      } else {
        const payload: Partial<FormState> = { ...form };
        if (!payload.password) { delete payload.password; delete payload.password_confirmation; }
        await api.put(`/users/${user!.id}`, payload);
        toast.success('User updated successfully!');
        onSaved(form.password || undefined);
      }
      onClose();
    } catch (err: any) {
      if (err.response?.data?.errors) {
        const apiErrs: Record<string, string> = {};
        Object.entries(err.response.data.errors).forEach(([k, v]: any) => {
          apiErrs[k] = Array.isArray(v) ? v[0] : v;
        });
        setErrors(apiErrs);
      } else {
        toast.error(err.response?.data?.message ?? 'Something went wrong');
      }
    } finally {
      setSaving(false);
    }
  };

  const readOnly = mode === 'view';
  const title    = mode === 'create' ? 'Create New User' : mode === 'edit' ? 'Edit User' : 'User Details';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
              {mode === 'create'
                ? <UserPlus className="w-5 h-5 text-indigo-600" />
                : mode === 'edit'
                ? <Edit2 className="w-5 h-5 text-indigo-600" />
                : <Shield className="w-5 h-5 text-indigo-600" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">{title}</h2>
              {user && mode !== 'create' && <p className="text-xs text-gray-400">{user.email}</p>}
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Name + Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input name="name" value={form.name} onChange={handleChange} readOnly={readOnly}
                placeholder="John Doe"
                className={`input w-full ${errors.name ? 'border-red-300' : ''} ${readOnly ? 'bg-gray-50' : ''}`}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Email <span className="text-red-500">*</span>
              </label>
              <input name="email" value={form.email} onChange={handleChange} readOnly={readOnly}
                type="email" placeholder="john@example.com"
                className={`input w-full ${errors.email ? 'border-red-300' : ''} ${readOnly ? 'bg-gray-50' : ''}`}
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>
          </div>

          {/* Password fields — only in create/edit mode */}
          {!readOnly && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  {mode === 'create'
                    ? <> Password <span className="text-red-500">*</span></>
                    : <> New Password <span className="text-gray-400 font-normal">(leave blank to keep)</span></>}
                </label>
                <PasswordField
                  name="password" value={form.password} onChange={handleChange}
                  placeholder={mode === 'create' ? 'Min 8 characters' : 'Leave blank to keep'}
                  error={errors.password}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Confirm Password{mode === 'create' && <span className="text-red-500"> *</span>}
                </label>
                <PasswordField
                  name="password_confirmation" value={form.password_confirmation}
                  onChange={handleChange} placeholder="Repeat password"
                  error={errors.password_confirmation}
                />
              </div>
            </div>
          )}

          {/* Role + Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Role</label>
              {readOnly ? (
                <div className="input bg-gray-50">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${roleBadgeClass(form.role)}`}>
                    {fmtRole(form.role)}
                  </span>
                </div>
              ) : (
                <select name="role" value={form.role} onChange={handleChange} className="input w-full">
                  {allowedRoles.map((r) => (
                    <option key={r} value={r}>{fmtRole(r)}</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Status</label>
              {readOnly ? (
                <div className="input bg-gray-50 flex items-center gap-2">
                  {form.is_active
                    ? <><CheckCircle2 className="w-4 h-4 text-emerald-500" /><span className="text-sm text-emerald-600 font-semibold">Active</span></>
                    : <><XCircle className="w-4 h-4 text-gray-400" /><span className="text-sm text-gray-500 font-semibold">Inactive</span></>}
                </div>
              ) : (
                <label className="flex items-center gap-3 input cursor-pointer select-none">
                  <input type="checkbox" name="is_active" checked={form.is_active}
                    onChange={handleChange} className="w-4 h-4 accent-indigo-600" />
                  <span className="text-sm font-semibold text-gray-700">
                    {form.is_active ? 'Active' : 'Inactive'}
                  </span>
                </label>
              )}
            </div>
          </div>

          {/* Phone + Job Title */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Phone</label>
              <input name="phone" value={form.phone} onChange={handleChange} readOnly={readOnly}
                placeholder="+91 98765 43210"
                className={`input w-full ${readOnly ? 'bg-gray-50' : ''}`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Job Title</label>
              <input name="job_title" value={form.job_title} onChange={handleChange} readOnly={readOnly}
                placeholder="e.g. Senior Developer"
                className={`input w-full ${readOnly ? 'bg-gray-50' : ''}`}
              />
            </div>
          </div>

          {/* Department */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Department</label>
            <input name="department" value={form.department} onChange={handleChange} readOnly={readOnly}
              placeholder="e.g. Engineering"
              className={`input w-full ${readOnly ? 'bg-gray-50' : ''}`}
            />
          </div>

          {/* Buttons */}
          {!readOnly ? (
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-semibold rounded-xl transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? 'Saving...' : mode === 'create' ? 'Create User' : 'Save Changes'}
              </button>
            </div>
          ) : (
            <button type="button" onClick={onClose}
              className="w-full px-4 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-semibold rounded-xl transition-colors">
              Close
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// UsersPage — main export
// ══════════════════════════════════════════════════════════════════════

export default function UsersPage() {

  // ── Auth role ─────────────────────────────────────────────────────────
  // useAuthRole tries Redux → localStorage → 3 API endpoints.
  // authRole === '' means still loading. Once resolved, all buttons appear.
  const authRole = useAuthRole();

  // ── Permission flags ──────────────────────────────────────────────────
  const canCreate    = ['admin', 'manager', 'team_leader'].includes(authRole);
  const canDelete    = authRole === 'admin';
  const isPrivileged = ['admin', 'manager', 'team_leader'].includes(authRole);

  const creatableRoles = authRole === 'team_leader' ? TEAM_LEADER_ROLES : ALL_ROLES;

  const canEditUser = (u: UserRow): boolean => {
    if (!isPrivileged) return false;
    const tRole = u.roles?.[0]?.name ?? '';
    if (authRole === 'team_leader') return TEAM_LEADER_ROLES.includes(tRole);
    if (authRole === 'manager')     return tRole !== 'admin';
    return true;
  };

  // Admin   → key icon for all users
  // Manager → key icon for developer/designer/tester/hr/team_leader
  // TL      → key icon for developer/designer/tester/hr
  const canSeeCredentialsFor = (u: UserRow): boolean => {
    if (!isPrivileged) return false;
    const tRole = u.roles?.[0]?.name ?? '';
    if (authRole === 'admin')       return true;
    if (authRole === 'manager')     return ['developer','designer','tester','hr','team_leader'].includes(tRole);
    if (authRole === 'team_leader') return TEAM_LEADER_ROLES.includes(tRole);
    return false;
  };

  // ── State ─────────────────────────────────────────────────────────────
  const [rows,         setRows        ] = useState<UserRow[]>([]);
  const [loading,      setLoading     ] = useState(true);
  const [meta,         setMeta        ] = useState<any>(null);
  const [page,         setPage        ] = useState(1);
  const [search,       setSearch      ] = useState('');
  const [filterRole,   setFilterRole  ] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Plain password store: userId → plaintext (only in this session)
  const [pwStore, setPwStore] = useState<Record<number, string>>({});

  const [modalMode,    setModalMode   ] = useState<Exclude<ModalMode,'credentials'>>('create');
  const [modalUser,    setModalUser   ] = useState<UserRow | null>(null);
  const [showModal,    setShowModal   ] = useState(false);
  const [credUser,     setCredUser    ] = useState<UserRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);

  // ── Data loading ───────────────────────────────────────────────────────

  const load = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const res = await api.get('/users', {
        params: {
          page:   p,
          search: search       || undefined,
          role:   filterRole   || undefined,
          status: filterStatus || undefined,
        },
      });
      setRows(res.data.data ?? res.data);
      setMeta(res.data.meta ?? null);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, search, filterRole, filterStatus]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); load(1); }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // ── Handlers ──────────────────────────────────────────────────────────

  const openCreate      = () => { setModalMode('create'); setModalUser(null);  setShowModal(true); };
  const openEdit        = (u: UserRow) => { setModalMode('edit');   setModalUser(u); setShowModal(true); };
  const openView        = (u: UserRow) => { setModalMode('view');   setModalUser(u); setShowModal(true); };
  const openCredentials = (u: UserRow) => setCredUser({ ...u, _plainPassword: pwStore[u.id] });

  const handleSaved = (userId: number | null, plainPw?: string) => {
    if (userId && plainPw) setPwStore((p) => ({ ...p, [userId]: plainPw }));
    load();
  };

  const handleToggle = async (u: UserRow) => {
    try {
      await api.patch(`/users/${u.id}/toggle-status`);
      toast.success(`User ${u.is_active ? 'deactivated' : 'activated'}`);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed to update status');
    }
  };

  const totalPages = meta?.last_page ?? 1;

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Users" />

      <div className="max-w-7xl mx-auto px-4 py-6 md:px-6 space-y-5">

        {/* ── Page heading ───────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Team Members</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {meta?.total ?? rows.length} member{(meta?.total ?? rows.length) !== 1 ? 's' : ''} in your organisation
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Refresh */}
            <button onClick={() => load()}
              className="w-10 h-10 flex items-center justify-center bg-white border border-gray-200 hover:bg-gray-50 text-gray-500 rounded-xl transition-colors shadow-sm"
              title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* ════════════════════════════════════════════
                CREATE NEW USER BUTTON
                Shows loading spinner while authRole loads,
                then appears for admin / manager / team_leader.
                ════════════════════════════════════════════ */}
            {authRole === '' ? (
              <button disabled
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-300 text-white text-sm font-bold rounded-xl cursor-not-allowed">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </button>
            ) : canCreate ? (
              <button
                onClick={openCreate}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-sm font-bold rounded-xl transition-all shadow-sm ring-2 ring-indigo-500/20"
              >
                <Plus className="w-4 h-4" />
                Create New User
              </button>
            ) : (
              /* Role loaded but no permission — show nothing */
              null
            )}
          </div>
        </div>

        {/* ── Role badge ─────────────────────────────────────────────── */}
        {authRole && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500">Logged in as:</span>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${roleBadgeClass(authRole)}`}>
              {fmtRole(authRole)}
            </span>
            {authRole === 'team_leader' && (
              <span className="text-xs text-gray-400">· Manage: Developer, Designer, Tester, HR</span>
            )}
            {authRole === 'manager' && (
              <span className="text-xs text-gray-400">· Manage all roles except Admin</span>
            )}
          </div>
        )}

        {/* ── Filters ────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="input pl-9 w-full text-sm"
            />
          </div>
          <select value={filterRole}
            onChange={(e) => { setFilterRole(e.target.value); setPage(1); load(1); }}
            className="input text-sm min-w-[150px]">
            <option value="">All Roles</option>
            {ALL_ROLES.map((r) => <option key={r} value={r}>{fmtRole(r)}</option>)}
          </select>
          <select value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); load(1); }}
            className="input text-sm min-w-[130px]">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          {(search || filterRole || filterStatus) && (
            <button
              onClick={() => { setSearch(''); setFilterRole(''); setFilterStatus(''); setPage(1); }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-500 hover:text-red-600 border border-gray-200 rounded-xl hover:bg-red-50 transition-colors">
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>

        {/* ── Table card ─────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/70">
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wide">User</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wide">Role</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wide hidden md:table-cell">Dept / Title</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Phone</th>
                    <th className="px-4 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wide hidden xl:table-cell">Joined</th>
                    <th className="px-4 py-3 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rows.map((u) => {
                    const role      = u.roles?.[0]?.name ?? 'member';
                    const hasTrackedPw = !!pwStore[u.id];
                    return (
                      <tr key={u.id} className="hover:bg-indigo-50/30 transition-colors group">

                        {/* User cell */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <UserAvatar name={u.name} />
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-800 truncate max-w-[180px] group-hover:text-indigo-700 transition-colors">
                                {u.name}
                              </p>
                              <p className="text-xs text-gray-400 truncate max-w-[180px]">{u.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${roleBadgeClass(role)}`}>
                            {role.replace(/_/g, ' ')}
                          </span>
                        </td>

                        {/* Dept / Title */}
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-sm text-gray-600">{u.department || u.job_title || '—'}</span>
                        </td>

                        {/* Phone */}
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-sm text-gray-600">{u.phone || '—'}</span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            u.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {u.is_active
                              ? <><CheckCircle2 className="w-3 h-3" /> Active</>
                              : <><XCircle      className="w-3 h-3" /> Inactive</>}
                          </span>
                        </td>

                        {/* Joined */}
                        <td className="px-4 py-3 hidden xl:table-cell">
                          <span className="text-xs text-gray-500">
                            {new Date(u.created_at).toLocaleDateString('en', {
                              month: 'short', day: 'numeric', year: 'numeric',
                            })}
                          </span>
                        </td>

                        {/* Action buttons */}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">

                            {/* View details */}
                            <button onClick={() => openView(u)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                              title="View details">
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Credentials / Change password */}
                            {canSeeCredentialsFor(u) && (
                              <button onClick={() => openCredentials(u)}
                                className="w-8 h-8 relative flex items-center justify-center rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                                title={authRole === 'admin' ? 'View / change credentials' : 'Change password'}>
                                <Key className="w-4 h-4" />
                                {/* Amber dot = password tracked in this session */}
                                {hasTrackedPw && (
                                  <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-amber-400 rounded-full pointer-events-none" />
                                )}
                              </button>
                            )}

                            {/* Edit user */}
                            {canEditUser(u) && (
                              <button onClick={() => openEdit(u)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                title="Edit user">
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}

                            {/* Toggle active status */}
                            {canEditUser(u) && (
                              <button onClick={() => handleToggle(u)}
                                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                                  u.is_active
                                    ? 'text-gray-400 hover:text-amber-600 hover:bg-amber-50'
                                    : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'
                                }`}
                                title={u.is_active ? 'Deactivate' : 'Activate'}>
                                <UserCheck className="w-4 h-4" />
                              </button>
                            )}

                            {/* Delete — admin only */}
                            {canDelete && (
                              <button onClick={() => setDeleteTarget(u)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                title="Delete user">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Empty state */}
            {!rows.length && !loading && (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center">
                  <Users className="w-8 h-8 text-indigo-200" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-gray-500">No users found</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {(search || filterRole || filterStatus)
                      ? 'Try adjusting your filters'
                      : 'Create your first team member to get started'}
                  </p>
                </div>
                {canCreate && !(search || filterRole || filterStatus) && (
                  <button onClick={openCreate}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm">
                    <Plus className="w-4 h-4" /> Create First User
                  </button>
                )}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-50">
                <p className="text-xs text-gray-500">
                  Page {meta?.current_page ?? page} of {totalPages}
                  {meta?.total ? ` · ${meta.total} users` : ''}
                </p>
                <div className="flex gap-1">
                  <button onClick={() => { const p = page - 1; setPage(p); load(p); }}
                    disabled={page <= 1}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                    const pg    = start + i;
                    if (pg > totalPages) return null;
                    return (
                      <button key={pg} onClick={() => { setPage(pg); load(pg); }}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                          pg === page ? 'bg-indigo-600 text-white' : 'border border-gray-200 text-gray-500 hover:bg-gray-50'
                        }`}>
                        {pg}
                      </button>
                    );
                  })}
                  <button onClick={() => { const p = page + 1; setPage(p); load(p); }}
                    disabled={page >= totalPages}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modals ── */}

      {showModal && (
        <UserFormModal
          mode={modalMode}
          user={modalUser}
          allowedRoles={creatableRoles}
          onClose={() => setShowModal(false)}
          onSaved={(plainPw) => {
            if (modalMode === 'edit' && modalUser) {
              handleSaved(modalUser.id, plainPw);
            } else {
              load();
            }
            setShowModal(false);
          }}
        />
      )}

      {credUser && (
        <CredentialsModal
          user={credUser}
          authRole={authRole}
          onClose={() => setCredUser(null)}
          onSaved={() => { load(); setCredUser(null); }}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          user={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => { load(); setDeleteTarget(null); }}
        />
      )}
    </div>
  );
}