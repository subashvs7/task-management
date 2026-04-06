import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/useAppDispatch';
import { login, clearError } from '../store/slices/authSlice';
import toast from 'react-hot-toast';

// ── Animated background nodes ─────────────────────────────────────────────────
const NODES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: 2 + Math.random() * 4,
  delay: Math.random() * 6,
  duration: 8 + Math.random() * 10,
}));

// ── Demo credentials ───────────────────────────────────────────────────────────
const DEMO_ACCOUNTS = [
  { label: 'Admin',     email: 'admin@example.com',     password: 'password' },
  { label: 'Developer', email: 'developer@example.com', password: 'password' },
];

// ══════════════════════════════════════════════════════════════════════════════
export default function Login() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated } = useAppSelector((s) => s.auth);

  const [form, setForm]         = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [focused, setFocused]   = useState<string | null>(null);
  const [mounted, setMounted]   = useState(false);
  const emailRef                = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); emailRef.current?.focus(); }, []);
  useEffect(() => { if (isAuthenticated) navigate('/dashboard'); }, [isAuthenticated, navigate]);
  useEffect(() => {
    if (error) toast.error(error);
    return () => { dispatch(clearError()); };
  }, [error, dispatch]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await dispatch(login(form));
  };

  const fillDemo = (acc: typeof DEMO_ACCOUNTS[0]) =>
    setForm({ email: acc.email, password: acc.password });

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Inline keyframes & custom styles ─────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .tf-root {
          min-height: 100vh;
          background: #080c14;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Outfit', sans-serif;
          position: relative;
          overflow: hidden;
          padding: 24px;
        }

        /* ── Mesh gradient blobs ── */
        .tf-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          pointer-events: none;
          opacity: 0.18;
        }
        .tf-blob-1 { width: 600px; height: 600px; background: #4f46e5; top: -200px; left: -150px; }
        .tf-blob-2 { width: 500px; height: 500px; background: #7c3aed; bottom: -200px; right: -100px; }
        .tf-blob-3 { width: 350px; height: 350px; background: #2563eb; top: 40%; left: 60%; }

        /* ── Floating nodes ── */
        .tf-node {
          position: absolute;
          border-radius: 50%;
          background: rgba(99, 102, 241, 0.6);
          pointer-events: none;
          animation: tf-float linear infinite;
        }
        @keyframes tf-float {
          0%   { transform: translateY(0px) scale(1);   opacity: 0.3; }
          50%  { transform: translateY(-40px) scale(1.3); opacity: 0.7; }
          100% { transform: translateY(0px) scale(1);   opacity: 0.3; }
        }

        /* ── Grid overlay ── */
        .tf-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px);
          background-size: 48px 48px;
          pointer-events: none;
        }

        /* ── Card ── */
        .tf-card {
          position: relative;
          width: 100%;
          max-width: 440px;
          background: rgba(15, 20, 35, 0.85);
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: 24px;
          padding: 40px;
          backdrop-filter: blur(24px);
          box-shadow:
            0 0 0 1px rgba(99,102,241,0.08),
            0 32px 80px rgba(0,0,0,0.6),
            inset 0 1px 0 rgba(255,255,255,0.05);
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.6s ease, transform 0.6s ease;
        }
        .tf-card.tf-visible {
          opacity: 1;
          transform: translateY(0);
        }

        /* ── Logo ── */
        .tf-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 32px;
        }
        .tf-logo-icon {
          width: 42px; height: 42px;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 8px 24px rgba(79,70,229,0.45);
          flex-shrink: 0;
        }
        .tf-logo-icon svg { width: 22px; height: 22px; color: #fff; }
        .tf-logo-name {
          font-size: 22px;
          font-weight: 800;
          color: #fff;
          letter-spacing: -0.5px;
        }
        .tf-logo-name span { color: #818cf8; }

        /* ── Heading ── */
        .tf-heading { font-size: 24px; font-weight: 700; color: #f1f5f9; margin-bottom: 4px; }
        .tf-subheading { font-size: 13.5px; color: #64748b; margin-bottom: 28px; }

        /* ── Form field ── */
        .tf-field { margin-bottom: 16px; }
        .tf-label {
          display: block;
          font-size: 12.5px;
          font-weight: 600;
          color: #94a3b8;
          letter-spacing: 0.4px;
          text-transform: uppercase;
          margin-bottom: 7px;
        }
        .tf-input-wrap { position: relative; }
        .tf-input {
          width: 100%;
          padding: 13px 16px;
          background: rgba(255,255,255,0.04);
          border: 1.5px solid rgba(99,102,241,0.18);
          border-radius: 12px;
          color: #f1f5f9;
          font-family: 'Outfit', sans-serif;
          font-size: 15px;
          outline: none;
          transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
        }
        .tf-input::placeholder { color: #334155; }
        .tf-input:focus {
          border-color: #6366f1;
          background: rgba(99,102,241,0.07);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.15);
        }
        .tf-input-pass { padding-right: 46px; }
        .tf-eye {
          position: absolute;
          right: 14px; top: 50%;
          transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          color: #475569;
          display: flex; align-items: center;
          padding: 4px;
          transition: color 0.2s;
        }
        .tf-eye:hover { color: #818cf8; }

        /* ── Submit btn ── */
        .tf-btn {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: #fff;
          font-family: 'Outfit', sans-serif;
          font-size: 15.5px;
          font-weight: 600;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          margin-top: 8px;
          position: relative;
          overflow: hidden;
          transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
          box-shadow: 0 8px 24px rgba(79,70,229,0.4);
          letter-spacing: 0.2px;
        }
        .tf-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.12), transparent);
          opacity: 0;
          transition: opacity 0.2s;
        }
        .tf-btn:hover:not(:disabled)::before { opacity: 1; }
        .tf-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 12px 32px rgba(79,70,229,0.55);
        }
        .tf-btn:active:not(:disabled) { transform: translateY(0); }
        .tf-btn:disabled { opacity: 0.55; cursor: not-allowed; }

        /* ── Spinner ── */
        .tf-spinner {
          display: inline-block;
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: tf-spin 0.7s linear infinite;
          vertical-align: middle;
          margin-right: 8px;
        }
        @keyframes tf-spin { to { transform: rotate(360deg); } }

        /* ── Divider ── */
        .tf-divider {
          display: flex; align-items: center;
          gap: 12px;
          margin: 24px 0 16px;
          color: #1e293b;
          font-size: 12px;
          font-weight: 500;
        }
        .tf-divider::before, .tf-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: rgba(99,102,241,0.12);
        }
        .tf-divider span { color: #475569; white-space: nowrap; }

        /* ── Demo chips ── */
        .tf-demo-row { display: flex; gap: 8px; }
        .tf-demo-chip {
          flex: 1;
          padding: 9px 12px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(99,102,241,0.15);
          border-radius: 10px;
          cursor: pointer;
          text-align: left;
          transition: background 0.2s, border-color 0.2s;
        }
        .tf-demo-chip:hover {
          background: rgba(99,102,241,0.1);
          border-color: rgba(99,102,241,0.4);
        }
        .tf-demo-chip-label {
          font-size: 11px;
          font-weight: 700;
          color: #818cf8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          display: block;
          margin-bottom: 2px;
        }
        .tf-demo-chip-email {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10.5px;
          color: #475569;
        }

        /* ── Register link ── */
        .tf-register {
          text-align: center;
          margin-top: 24px;
          font-size: 13.5px;
          color: #475569;
        }
        .tf-register a {
          color: #818cf8;
          font-weight: 600;
          text-decoration: none;
          transition: color 0.2s;
        }
        .tf-register a:hover { color: #a5b4fc; }

        /* ── Active field label colour ── */
        .tf-field.tf-active .tf-label { color: #818cf8; }
      `}</style>

      <div className="tf-root">
        {/* blobs */}
        <div className="tf-blob tf-blob-1" />
        <div className="tf-blob tf-blob-2" />
        <div className="tf-blob tf-blob-3" />

        {/* grid */}
        <div className="tf-grid" />

        {/* floating nodes */}
        {NODES.map((n) => (
          <div
            key={n.id}
            className="tf-node"
            style={{
              left: `${n.x}%`,
              top: `${n.y}%`,
              width: n.size,
              height: n.size,
              animationDuration: `${n.duration}s`,
              animationDelay: `${n.delay}s`,
            }}
          />
        ))}

        {/* ── Card ──────────────────────────────────────────────────────── */}
        <div className={`tf-card ${mounted ? 'tf-visible' : ''}`}>

          {/* Logo */}
          <div className="tf-logo">
            <div className="tf-logo-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M3 12h18M3 18h18" />
                <rect x="9" y="4" width="6" height="4" rx="1" fill="currentColor" stroke="none" opacity="0.5"/>
              </svg>
            </div>
            <div className="tf-logo-name">Task<span>Flow</span></div>
          </div>

          <h2 className="tf-heading">Welcome back</h2>
          <p className="tf-subheading">Sign in to your workspace to continue</p>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div className={`tf-field ${focused === 'email' ? 'tf-active' : ''}`}>
              <label className="tf-label" htmlFor="email">Email address</label>
              <div className="tf-input-wrap">
                <input
                  ref={emailRef}
                  id="email"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                  className="tf-input"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className={`tf-field ${focused === 'password' ? 'tf-active' : ''}`}>
              <label className="tf-label" htmlFor="password">Password</label>
              <div className="tf-input-wrap">
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  className="tf-input tf-input-pass"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="tf-eye"
                  onClick={() => setShowPass((p) => !p)}
                  tabIndex={-1}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading} className="tf-btn">
              {loading ? (
                <><span className="tf-spinner" />Signing in...</>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="tf-divider"><span>Quick access — test accounts</span></div>
          <div className="tf-demo-row">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.label}
                type="button"
                className="tf-demo-chip"
                onClick={() => fillDemo(acc)}
                title={`Fill ${acc.email}`}
              >
                <span className="tf-demo-chip-label">{acc.label}</span>
                <span className="tf-demo-chip-email">{acc.email}</span>
              </button>
            ))}
          </div>

          {/* Register link */}
          <p className="tf-register">
            Don't have an account?{' '}
            <Link to="/register">Create one</Link>
          </p>
        </div>
      </div>
    </>
  );
}