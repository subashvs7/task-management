import { useState, useEffect, useRef,useCallback } from 'react';
import {
  User, Lock, Bell, Palette, Shield, Trash2,
  Camera, Eye, EyeOff, Save, Check,
  Upload, AlertTriangle, ChevronRight,
   Monitor, Moon, Sun,
  CheckCircle2, Loader2,
} from 'lucide-react';

import api from '../services/api';
import toast from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import { logout } from '../store/slices/authSlice';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileForm {
  name: string;
  email: string;
  phone: string;
  timezone: string;
  bio: string;
  job_title: string;
  department: string;
}

interface PasswordForm {
  current_password: string;
  password: string;
  password_confirmation: string;
}

interface NotifPrefs {
  email_task_assigned: boolean;
  email_task_updated: boolean;
  email_comment_added: boolean;
  email_due_reminder: boolean;
  email_project_updates: boolean;
  push_task_assigned: boolean;
  push_task_updated: boolean;
  push_comment_added: boolean;
  push_due_reminder: boolean;
  digest_frequency: string;
}

interface AppearancePrefs {
  theme: string;
  accent_color: string;
  sidebar_compact: boolean;
  density: string;
  date_format: string;
  time_format: string;
  language: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'profile',       label: 'Profile',        icon: User    },
  { key: 'password',      label: 'Password',       icon: Lock    },
  { key: 'notifications', label: 'Notifications',  icon: Bell    },
  { key: 'appearance',    label: 'Appearance',     icon: Palette },
  { key: 'security',      label: 'Security',       icon: Shield  },
  { key: 'danger',        label: 'Danger Zone',    icon: Trash2  },
];

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo', 'Asia/Shanghai',
  'Australia/Sydney', 'Pacific/Auckland',
];

const ACCENT_COLORS = [
  { key: 'indigo', label: 'Indigo', hex: '#6366f1' },
  { key: 'blue',   label: 'Blue',   hex: '#3b82f6' },
  { key: 'purple', label: 'Purple', hex: '#a855f7' },
  { key: 'green',  label: 'Green',  hex: '#22c55e' },
  { key: 'red',    label: 'Red',    hex: '#ef4444' },
  { key: 'orange', label: 'Orange', hex: '#f97316' },
  { key: 'pink',   label: 'Pink',   hex: '#ec4899' },
];

// ─── Toggle switch ────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
        checked ? 'bg-indigo-600' : 'bg-gray-200'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-50">
        <h3 className="text-base font-bold text-gray-900">{title}</h3>
        {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// ─── Form field ───────────────────────────────────────────────────────────────

function Field({
  label, error, required, hint, children,
}: {
  label: string; error?: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{error}</p>}
    </div>
  );
}

// ─── Password input ───────────────────────────────────────────────────────────

function PasswordInput({
  name, value, onChange, placeholder, error,
}: {
  name: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string; error?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`input pr-10 w-full ${error ? 'border-red-300 focus:ring-red-200' : ''}`}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {error && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{error}</p>}
    </div>
  );
}

// ─── Password strength meter ──────────────────────────────────────────────────

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: 'At least 8 characters', pass: password.length >= 8 },
    { label: 'Uppercase letter',       pass: /[A-Z]/.test(password) },
    { label: 'Lowercase letter',       pass: /[a-z]/.test(password) },
    { label: 'Number',                 pass: /[0-9]/.test(password) },
    { label: 'Special character',      pass: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.pass).length;
  const color = score <= 1 ? 'bg-red-500' : score <= 2 ? 'bg-orange-500' : score <= 3 ? 'bg-yellow-500' : score === 4 ? 'bg-blue-500' : 'bg-green-500';
  const label = score <= 1 ? 'Very weak' : score <= 2 ? 'Weak' : score <= 3 ? 'Fair' : score === 4 ? 'Good' : 'Strong';

  if (!password) return null;

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-3">
        <div className="flex gap-1 flex-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i <= score ? color : 'bg-gray-200'}`} />
          ))}
        </div>
        <span className={`text-xs font-semibold ${score <= 2 ? 'text-red-600' : score <= 3 ? 'text-yellow-600' : 'text-green-600'}`}>{label}</span>
      </div>
      <div className="grid grid-cols-1 gap-1">
        {checks.map((c) => (
          <div key={c.label} className={`flex items-center gap-2 text-xs ${c.pass ? 'text-green-600' : 'text-gray-400'}`}>
            {c.pass ? <CheckCircle2 className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-current" />}
            {c.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Notification row ─────────────────────────────────────────────────────────

function NotifRow({
  label, description, checked, onChange,
}: {
  label: string; description: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3.5 border-b border-gray-50 last:border-0">
      <div>
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

// ─── Main Settings page ───────────────────────────────────────────────────────

export default function Settings() {
  const dispatch = useDispatch<AppDispatch>();
  const authUser = useSelector((s: RootState) => (s as any).auth?.user);

  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving]       = useState(false);
  const [errors, setErrors]       = useState<Record<string, string>>({});

  // Avatar
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl]       = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Profile form
  const [profile, setProfile] = useState<ProfileForm>({
    name: '', email: '', phone: '', timezone: 'UTC',
    bio: '', job_title: '', department: '',
  });

  // Password form
  const [pwForm, setPwForm] = useState<PasswordForm>({
    current_password: '', password: '', password_confirmation: '',
  });

  // Notification prefs
  const [notif, setNotif] = useState<NotifPrefs>({
    email_task_assigned: true, email_task_updated: true,
    email_comment_added: true, email_due_reminder: true,
    email_project_updates: false, push_task_assigned: true,
    push_task_updated: false, push_comment_added: true,
    push_due_reminder: true, digest_frequency: 'daily',
  });

  // Appearance prefs
  const [appearance, setAppearance] = useState<AppearancePrefs>({
    theme: 'light', accent_color: 'indigo', sidebar_compact: false,
    density: 'comfortable', date_format: 'MMM D, YYYY',
    time_format: '12h', language: 'en',
  });

  // Security info
  const [security, setSecurity] = useState<any>(null);

  // Delete account
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeleteForm, setShowDeleteForm] = useState(false);

  // ── Fetch all data on mount ────────────────────────────────────────────────

  useEffect(() => {
    fetchProfile();
    fetchNotifications();
    fetchAppearance();
    fetchSecurity();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/settings/profile');
      const u = res.data;
      setProfile({
        name:       u.name       ?? '',
        email:      u.email      ?? '',
        phone:      u.phone      ?? '',
        timezone:   u.timezone   ?? 'UTC',
        bio:        u.bio        ?? '',
        job_title:  u.job_title  ?? '',
        department: u.department ?? '',
      });
      if (u.avatar) setAvatarUrl(`/storage/${u.avatar}`);
    } catch {
      toast.error('Failed to load profile');
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/settings/notifications');
      setNotif(res.data);
    } catch {}
  };

  const fetchAppearance = async () => {
    try {
      const res = await api.get('/settings/appearance');
      setAppearance(res.data);
    } catch {}
  };

  const fetchSecurity = async () => {
    try {
      const res = await api.get('/settings/security');
      setSecurity(res.data);
    } catch {}
  };

  // ── Helpers ────────────────────────────────────────────────────────────────

  const clearErrors = () => setErrors({});

  const handleProfileChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setProfile((p) => ({ ...p, [e.target.name]: e.target.value }));
    setErrors((p) => ({ ...p, [e.target.name]: '' }));
  };

  const handlePwChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPwForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setErrors((p) => ({ ...p, [e.target.name]: '' }));
  };

  // ── Submit handlers ────────────────────────────────────────────────────────

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    clearErrors();
    try {
      await api.put('/settings/profile', profile);
      toast.success('Profile updated!');
    } catch (err: any) {
      if (err.response?.data?.errors) {
        const errs: Record<string, string> = {};
        Object.entries(err.response.data.errors).forEach(([k, v]: any) => { errs[k] = v[0]; });
        setErrors(errs);
      } else {
        toast.error(err.response?.data?.message ?? 'Failed to update profile');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Max avatar size is 2MB'); return; }

    // Show preview immediately
    const url = URL.createObjectURL(file);
    setAvatarUrl(url);

    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const res = await api.post('/settings/avatar', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAvatarUrl(res.data.avatar_url);
      toast.success('Avatar updated!');
    } catch {
      toast.error('Failed to upload avatar');
      setAvatarUrl(null);
    } finally {
      setAvatarUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteAvatar = async () => {
    try {
      await api.delete('/settings/avatar');
      setAvatarUrl(null);
      toast.success('Avatar removed');
    } catch {
      toast.error('Failed to remove avatar');
    }
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.password !== pwForm.password_confirmation) {
      setErrors({ password_confirmation: 'Passwords do not match' });
      return;
    }
    setSaving(true);
    clearErrors();
    try {
      await api.put('/settings/password', pwForm);
      toast.success('Password changed!');
      setPwForm({ current_password: '', password: '', password_confirmation: '' });
    } catch (err: any) {
      if (err.response?.data?.errors) {
        const errs: Record<string, string> = {};
        Object.entries(err.response.data.errors).forEach(([k, v]: any) => { errs[k] = v[0]; });
        setErrors(errs);
      } else {
        toast.error('Failed to change password');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleNotifSave = async () => {
    setSaving(true);
    try {
      await api.put('/settings/notifications', notif);
      toast.success('Notification preferences saved!');
    } catch {
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleAppearanceSave = async () => {
    setSaving(true);
    try {
      await api.put('/settings/appearance', appearance);
      toast.success('Appearance preferences saved!');
    } catch {
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') { toast.error('Type DELETE to confirm'); return; }
    setSaving(true);
    try {
      await api.delete('/settings/account', { data: { password: deletePassword } });
      toast.success('Account deleted');
      dispatch(logout());
    } catch (err: any) {
      if (err.response?.data?.errors) {
        const errs: Record<string, string> = {};
        Object.entries(err.response.data.errors).forEach(([k, v]: any) => { errs[k] = v[0]; });
        setErrors(errs);
      } else {
        toast.error('Failed to delete account');
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const initials = profile.name
    ? profile.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <div className="min-h-screen bg-gray-50">
     

      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
        <div className="flex flex-col gap-6 lg:flex-row">

          {/* ── Sidebar nav ── */}
          <aside className="w-full flex-shrink-0 lg:w-56">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2 sticky top-24">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={[
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 text-left',
                    activeTab === tab.key
                      ? tab.key === 'danger'
                        ? 'bg-red-50 text-red-600'
                        : 'bg-indigo-50 text-indigo-700'
                      : tab.key === 'danger'
                        ? 'text-red-500 hover:bg-red-50'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800',
                  ].join(' ')}
                >
                  <tab.icon className="w-4 h-4 flex-shrink-0" />
                  <span>{tab.label}</span>
                  {activeTab === tab.key && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
                </button>
              ))}
            </div>
          </aside>

          {/* ── Main content ── */}
          <main className="flex-1 min-w-0 space-y-5">

            {/* ══ PROFILE TAB ══ */}
            {activeTab === 'profile' && (
              <>
                {/* Avatar */}
                <Card title="Profile Photo" description="Upload a photo to personalize your account">
                  <div className="flex items-center gap-5">
                    <div className="relative flex-shrink-0">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar"
                          className="w-20 h-20 rounded-2xl object-cover border-2 border-gray-100" />
                      ) : (
                        <div className="w-20 h-20 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
                          {initials}
                        </div>
                      )}
                      {avatarUploading && (
                        <div className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center">
                          <Loader2 className="w-6 h-6 text-white animate-spin" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <input ref={fileInputRef} type="file" accept="image/*"
                        onChange={handleAvatarChange} className="hidden" />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors"
                      >
                        <Camera className="w-4 h-4" /> Change Photo
                      </button>
                      {avatarUrl && (
                        <button onClick={handleDeleteAvatar}
                          className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200 text-sm font-medium rounded-xl transition-colors">
                          <Trash2 className="w-4 h-4" /> Remove
                        </button>
                      )}
                      <p className="text-xs text-gray-400">JPG, PNG, GIF or WebP. Max 2MB.</p>
                    </div>
                  </div>
                </Card>

                {/* Profile info */}
                <Card title="Personal Information" description="Update your name, email and contact details">
                  <form onSubmit={handleProfileSave} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field label="Full Name" required error={errors.name}>
                        <input name="name" value={profile.name} onChange={handleProfileChange}
                          className={`input w-full ${errors.name ? 'border-red-300' : ''}`}
                          placeholder="John Doe" />
                      </Field>
                      <Field label="Email Address" required error={errors.email}>
                        <input name="email" type="email" value={profile.email} onChange={handleProfileChange}
                          className={`input w-full ${errors.email ? 'border-red-300' : ''}`}
                          placeholder="john@example.com" />
                      </Field>
                      <Field label="Phone Number" error={errors.phone}>
                        <input name="phone" value={profile.phone} onChange={handleProfileChange}
                          className="input w-full" placeholder="+1 (555) 000-0000" />
                      </Field>
                      <Field label="Job Title" error={errors.job_title}>
                        <input name="job_title" value={profile.job_title} onChange={handleProfileChange}
                          className="input w-full" placeholder="Senior Developer" />
                      </Field>
                      <Field label="Department" error={errors.department}>
                        <input name="department" value={profile.department} onChange={handleProfileChange}
                          className="input w-full" placeholder="Engineering" />
                      </Field>
                      <Field label="Timezone" error={errors.timezone}>
                        <select name="timezone" value={profile.timezone} onChange={handleProfileChange}
                          className="input w-full">
                          {TIMEZONES.map((tz) => (
                            <option key={tz} value={tz}>{tz}</option>
                          ))}
                        </select>
                      </Field>
                    </div>
                    <Field label="Bio" hint="Brief description about yourself. Max 500 characters.">
                      <textarea name="bio" value={profile.bio} onChange={handleProfileChange}
                        rows={3} maxLength={500}
                        className="input w-full resize-none"
                        placeholder="Tell your team a bit about yourself..." />
                      <p className="text-xs text-gray-400 text-right mt-1">{profile.bio.length}/500</p>
                    </Field>
                    <div className="flex justify-end pt-2">
                      <button type="submit" disabled={saving}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-60">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                </Card>
              </>
            )}

            {/* ══ PASSWORD TAB ══ */}
            {activeTab === 'password' && (
              <Card title="Change Password" description="Use a strong, unique password to keep your account secure">
                <form onSubmit={handlePasswordSave} className="space-y-4 max-w-md">
                  <Field label="Current Password" error={errors.current_password}>
                    <PasswordInput name="current_password" value={pwForm.current_password}
                      onChange={handlePwChange} placeholder="Enter current password"
                      error={errors.current_password} />
                  </Field>
                  <Field label="New Password" error={errors.password}>
                    <PasswordInput name="password" value={pwForm.password}
                      onChange={handlePwChange} placeholder="Enter new password"
                      error={errors.password} />
                    <PasswordStrength password={pwForm.password} />
                  </Field>
                  <Field label="Confirm New Password" error={errors.password_confirmation}>
                    <PasswordInput name="password_confirmation" value={pwForm.password_confirmation}
                      onChange={handlePwChange} placeholder="Confirm new password"
                      error={errors.password_confirmation} />
                    {pwForm.password_confirmation && pwForm.password === pwForm.password_confirmation && (
                      <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Passwords match
                      </p>
                    )}
                  </Field>
                  <div className="pt-2">
                    <button type="submit" disabled={saving}
                      className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-60">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                      {saving ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </form>
              </Card>
            )}

            {/* ══ NOTIFICATIONS TAB ══ */}
            {activeTab === 'notifications' && (
              <>
                <Card title="Email Notifications" description="Choose which events trigger email notifications">
                  <div className="divide-y divide-gray-50">
                    <NotifRow label="Task Assigned" description="When a task is assigned to you"
                      checked={notif.email_task_assigned}
                      onChange={(v) => setNotif((p) => ({ ...p, email_task_assigned: v }))} />
                    <NotifRow label="Task Updated" description="When a task you're watching is updated"
                      checked={notif.email_task_updated}
                      onChange={(v) => setNotif((p) => ({ ...p, email_task_updated: v }))} />
                    <NotifRow label="Comment Added" description="When someone comments on your tasks"
                      checked={notif.email_comment_added}
                      onChange={(v) => setNotif((p) => ({ ...p, email_comment_added: v }))} />
                    <NotifRow label="Due Date Reminder" description="24 hours before a task is due"
                      checked={notif.email_due_reminder}
                      onChange={(v) => setNotif((p) => ({ ...p, email_due_reminder: v }))} />
                    <NotifRow label="Project Updates" description="Weekly project progress summaries"
                      checked={notif.email_project_updates}
                      onChange={(v) => setNotif((p) => ({ ...p, email_project_updates: v }))} />
                  </div>
                </Card>

                <Card title="Push Notifications" description="In-app and browser push notifications">
                  <div className="divide-y divide-gray-50">
                    <NotifRow label="Task Assigned" description="Instant notification when assigned"
                      checked={notif.push_task_assigned}
                      onChange={(v) => setNotif((p) => ({ ...p, push_task_assigned: v }))} />
                    <NotifRow label="Task Updated" description="When watched tasks are updated"
                      checked={notif.push_task_updated}
                      onChange={(v) => setNotif((p) => ({ ...p, push_task_updated: v }))} />
                    <NotifRow label="Comment Added" description="New comments on your tasks"
                      checked={notif.push_comment_added}
                      onChange={(v) => setNotif((p) => ({ ...p, push_comment_added: v }))} />
                    <NotifRow label="Due Date Reminder" description="Reminder before tasks are due"
                      checked={notif.push_due_reminder}
                      onChange={(v) => setNotif((p) => ({ ...p, push_due_reminder: v }))} />
                  </div>
                </Card>

                <Card title="Email Digest" description="Get a summary email instead of individual emails">
                  <div className="space-y-2">
                    {[
                      { value: 'none',   label: 'No digest',    desc: 'Receive individual emails only' },
                      { value: 'daily',  label: 'Daily digest', desc: 'One email per day with all updates' },
                      { value: 'weekly', label: 'Weekly digest',desc: 'One email per week with all updates' },
                    ].map((opt) => (
                      <label key={opt.value}
                        className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                          notif.digest_frequency === opt.value
                            ? 'border-indigo-300 bg-indigo-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input type="radio" name="digest" value={opt.value}
                          checked={notif.digest_frequency === opt.value}
                          onChange={() => setNotif((p) => ({ ...p, digest_frequency: opt.value }))}
                          className="mt-0.5 accent-indigo-600" />
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{opt.label}</p>
                          <p className="text-xs text-gray-500">{opt.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </Card>

                <div className="flex justify-end">
                  <button onClick={handleNotifSave} disabled={saving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-60">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? 'Saving...' : 'Save Preferences'}
                  </button>
                </div>
              </>
            )}

            {/* ══ APPEARANCE TAB ══ */}
            {activeTab === 'appearance' && (
              <>
                <Card title="Theme" description="Choose your preferred color scheme">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'light',  label: 'Light',  icon: Sun,     preview: 'bg-white border-gray-200' },
                      { value: 'dark',   label: 'Dark',   icon: Moon,    preview: 'bg-gray-900 border-gray-700' },
                      { value: 'system', label: 'System', icon: Monitor, preview: 'bg-gradient-to-br from-white to-gray-900 border-gray-400' },
                    ].map((t) => (
                      <button key={t.value}
                        onClick={() => setAppearance((p) => ({ ...p, theme: t.value }))}
                        className={`relative p-4 rounded-2xl border-2 transition-all ${
                          appearance.theme === t.value
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        {appearance.theme === t.value && (
                          <span className="absolute top-2 right-2 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </span>
                        )}
                        <div className={`w-full h-12 rounded-lg mb-3 border ${t.preview}`} />
                        <t.icon className="w-4 h-4 mx-auto text-gray-500 mb-1" />
                        <p className="text-xs font-semibold text-gray-700 text-center">{t.label}</p>
                      </button>
                    ))}
                  </div>
                </Card>

                <Card title="Accent Color" description="Choose the highlight color used throughout the app">
                  <div className="flex flex-wrap gap-3">
                    {ACCENT_COLORS.map((color) => (
                      <button key={color.key}
                        onClick={() => setAppearance((p) => ({ ...p, accent_color: color.key }))}
                        className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                          appearance.accent_color === color.key
                            ? 'border-gray-900 scale-105'
                            : 'border-transparent hover:border-gray-300'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full relative" style={{ background: color.hex }}>
                          {appearance.accent_color === color.key && (
                            <Check className="w-4 h-4 text-white absolute inset-0 m-auto" />
                          )}
                        </div>
                        <span className="text-xs font-medium text-gray-600">{color.label}</span>
                      </button>
                    ))}
                  </div>
                </Card>

                <Card title="Display Density" description="Control the spacing and size of UI elements">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'compact',     label: 'Compact',     desc: 'More content, less spacing' },
                      { value: 'comfortable', label: 'Comfortable', desc: 'Balanced spacing (default)' },
                      { value: 'spacious',    label: 'Spacious',    desc: 'More breathing room' },
                    ].map((d) => (
                      <button key={d.value}
                        onClick={() => setAppearance((p) => ({ ...p, density: d.value }))}
                        className={`p-4 rounded-2xl border-2 text-left transition-all ${
                          appearance.density === d.value
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <p className="text-sm font-bold text-gray-800 mb-0.5">{d.label}</p>
                        <p className="text-xs text-gray-500">{d.desc}</p>
                        {appearance.density === d.value && (
                          <CheckCircle2 className="w-4 h-4 text-indigo-600 mt-2" />
                        )}
                      </button>
                    ))}
                  </div>
                </Card>

                <Card title="Date & Time Format" description="Customize how dates and times are displayed">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Date Format">
                      <select value={appearance.date_format}
                        onChange={(e) => setAppearance((p) => ({ ...p, date_format: e.target.value }))}
                        className="input w-full">
                        <option value="MMM D, YYYY">Jan 5, 2025</option>
                        <option value="DD/MM/YYYY">05/01/2025</option>
                        <option value="MM/DD/YYYY">01/05/2025</option>
                        <option value="YYYY-MM-DD">2025-01-05</option>
                        <option value="D MMMM YYYY">5 January 2025</option>
                      </select>
                    </Field>
                    <Field label="Time Format">
                      <select value={appearance.time_format}
                        onChange={(e) => setAppearance((p) => ({ ...p, time_format: e.target.value }))}
                        className="input w-full">
                        <option value="12h">12-hour (2:30 PM)</option>
                        <option value="24h">24-hour (14:30)</option>
                      </select>
                    </Field>
                  </div>
                </Card>

                <div className="flex justify-end">
                  <button onClick={handleAppearanceSave} disabled={saving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-60">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? 'Saving...' : 'Save Preferences'}
                  </button>
                </div>
              </>
            )}

            {/* ══ SECURITY TAB ══ */}
            {activeTab === 'security' && (
              <>
                <Card title="Login Activity" description="Recent account access information">
                  <div className="space-y-4">
                    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                      <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">Last login</p>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {security?.last_login_at
                            ? new Date(security.last_login_at).toLocaleString()
                            : 'Not available'}
                        </p>
                        {security?.last_login_ip && (
                          <p className="text-xs text-gray-400 mt-0.5">IP: {security.last_login_ip}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>

                <Card title="Two-Factor Authentication" description="Add an extra layer of security to your account">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${security?.two_factor_enabled ? 'bg-green-100' : 'bg-gray-100'}`}>
                        <Shield className={`w-5 h-5 ${security?.two_factor_enabled ? 'text-green-600' : 'text-gray-400'}`} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">
                          2FA is {security?.two_factor_enabled ? 'Enabled' : 'Disabled'}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {security?.two_factor_enabled
                            ? 'Your account is protected with two-factor authentication'
                            : 'Enable 2FA to protect your account with an additional verification step'}
                        </p>
                      </div>
                    </div>
                    <button className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                      security?.two_factor_enabled
                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}>
                      {security?.two_factor_enabled ? 'Disable' : 'Enable'} 2FA
                    </button>
                  </div>
                </Card>

                <Card title="Active Sessions" description="Devices currently logged in to your account">
                  <div className="p-4 bg-gray-50 rounded-xl flex items-start gap-3">
                    <Monitor className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Current session</p>
                      <p className="text-xs text-gray-500 mt-0.5">This device · Active now</p>
                    </div>
                    <span className="ml-auto px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full flex-shrink-0">Active</span>
                  </div>
                </Card>
              </>
            )}

            {/* ══ DANGER ZONE TAB ══ */}
            {activeTab === 'danger' && (
              <>
                <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-red-700">Danger Zone</p>
                    <p className="text-sm text-red-600 mt-0.5">Actions here are irreversible. Please proceed with extreme caution.</p>
                  </div>
                </div>

                <Card title="Export Your Data" description="Download a copy of all your data">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Get a copy of your tasks, projects, comments and profile data in JSON format.</p>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium rounded-xl transition-colors whitespace-nowrap ml-4">
                      <Upload className="w-4 h-4" /> Export Data
                    </button>
                  </div>
                </Card>

                <Card title="Delete Account" description="Permanently delete your account and all associated data">
                  {!showDeleteForm ? (
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-sm text-gray-600">
                        Once your account is deleted, all your data, projects, tasks, and settings will be permanently removed. This action cannot be undone.
                      </p>
                      <button
                        onClick={() => setShowDeleteForm(true)}
                        className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl transition-colors"
                      >
                        <Trash2 className="w-4 h-4" /> Delete Account
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                        <p className="text-sm font-bold text-red-700 mb-1">Are you absolutely sure?</p>
                        <p className="text-sm text-red-600">This will permanently delete your account, all your projects, tasks, comments and uploaded files.</p>
                      </div>

                      <Field label="Enter your password to confirm" error={errors.password}>
                        <PasswordInput name="deletePassword" value={deletePassword}
                          onChange={(e) => setDeletePassword(e.target.value)}
                          placeholder="Your current password" error={errors.password} />
                      </Field>

                      <Field
                        label='Type "DELETE" to confirm'
                        hint='Type the word DELETE in capital letters'
                      >
                        <input
                          value={deleteConfirm}
                          onChange={(e) => setDeleteConfirm(e.target.value)}
                          className={`input w-full font-mono ${deleteConfirm === 'DELETE' ? 'border-red-400 bg-red-50' : ''}`}
                          placeholder="DELETE"
                        />
                      </Field>

                      <div className="flex gap-3">
                        <button
                          onClick={handleDeleteAccount}
                          disabled={saving || deleteConfirm !== 'DELETE' || !deletePassword}
                          className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          {saving ? 'Deleting...' : 'Permanently Delete My Account'}
                        </button>
                        <button
                          onClick={() => { setShowDeleteForm(false); setDeleteConfirm(''); setDeletePassword(''); setErrors({}); }}
                          className="px-5 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium rounded-xl transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </Card>
              </>
            )}

          </main>
        </div>
      </div>
    </div>
  );
}