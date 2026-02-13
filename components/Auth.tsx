import React, { useState } from 'react';
import { Eye, EyeOff, RefreshCw } from 'lucide-react';
import { User } from '../types';
import { STORAGE_KEYS } from '../constants';

interface AuthProps {
  onLogin: (user: User) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [showPw,      setShowPw]      = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');

  const handle = (isRegister: boolean) => {
    if (!email || !password) { setError('Please enter your email and password.'); return; }
    setLoading(true); setError('');
    setTimeout(() => {
      const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
      if (isRegister) {
        if (users.find((u: any) => u.email === email)) {
          setError('An account with that email already exists.'); setLoading(false); return;
        }
        const u: User = { id: `u-${Date.now()}`, email, name: email.split('@')[0], createdAt: new Date().toISOString() };
        users.push({ ...u, password });
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(u));
        onLogin(u);
      } else {
        const found = users.find((u: any) => u.email === email && u.password === password);
        if (!found) { setError('Incorrect email or password.'); setLoading(false); return; }
        const clean = { id: found.id, email: found.email, name: found.name, createdAt: found.createdAt };
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(clean));
        onLogin(clean);
      }
      setLoading(false);
    }, 900);
  };

  // ── styles ──────────────────────────────────────────────────────────────────
  const s = {
    page: {
      minHeight: '100%', display: 'flex', flexDirection: 'column' as const,
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(160deg, #2c2418 0%, #1a1410 55%, #0f0c09 100%)',
      padding: '40px 24px',
      position: 'relative' as const, overflow: 'hidden',
    },
    // Subtle grain texture via SVG data-uri bg
    grain: {
      position: 'absolute' as const, inset: 0, opacity: 0.04,
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      backgroundSize: '200px 200px',
    },
    inner: {
      position: 'relative' as const, width: '100%', maxWidth: 400,
      display: 'flex', flexDirection: 'column' as const, alignItems: 'center',
      gap: 0,
    },
    // Ornamental top rule
    ornament: {
      display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28, width: '100%', justifyContent: 'center',
    },
    ornamentLine: { flex: 1, height: 1, background: 'rgba(255,255,255,0.12)', maxWidth: 60 },
    ornamentDot:  { width: 4, height: 4, borderRadius: '50%', background: '#c9a85c' },

    wordmark: {
      fontFamily: "'Playfair Display', 'Didot', 'Bodoni MT', Georgia, serif",
      fontSize: 56, fontWeight: 700, letterSpacing: '-0.01em',
      color: '#f5ede0', lineHeight: 1, marginBottom: 16,
      textShadow: '0 2px 32px rgba(201,168,92,0.25)',
    },
    tagline: {
      fontFamily: "Georgia, 'Times New Roman', serif",
      fontSize: 15, lineHeight: 1.7, textAlign: 'center' as const,
      color: 'rgba(245,237,224,0.55)', fontStyle: 'italic',
      maxWidth: 300, marginBottom: 40,
    },

    card: {
      width: '100%', background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 24, padding: '32px 28px',
      backdropFilter: 'blur(12px)',
      boxShadow: '0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
    },

    inputWrap: { position: 'relative' as const, marginBottom: 14 },
    input: {
      width: '100%', padding: '15px 18px',
      borderRadius: 14, border: '1px solid rgba(255,255,255,0.14)',
      background: 'rgba(255,255,255,0.07)',
      color: '#f5ede0', fontSize: 15,
      fontFamily: 'Georgia, serif',
      outline: 'none', boxSizing: 'border-box' as const,
      letterSpacing: '0.01em',
    },

    btnRow: { display: 'flex', gap: 10, marginTop: 22 },
    btnSignIn: {
      flex: 1, padding: '15px 10px',
      borderRadius: 14, border: 'none',
      background: 'linear-gradient(135deg, #c9a85c 0%, #a87c30 100%)',
      color: '#1a1410', fontSize: 12, fontWeight: 800,
      letterSpacing: '0.12em', textTransform: 'uppercase' as const,
      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      boxShadow: '0 4px 16px rgba(201,168,92,0.35)',
    },
    btnSignUp: {
      flex: 1, padding: '15px 10px',
      borderRadius: 14,
      border: '1px solid rgba(255,255,255,0.18)',
      background: 'rgba(255,255,255,0.08)',
      color: 'rgba(245,237,224,0.85)', fontSize: 12, fontWeight: 800,
      letterSpacing: '0.12em', textTransform: 'uppercase' as const,
      cursor: 'pointer',
    },

    error: {
      width: '100%', marginBottom: 16,
      padding: '10px 14px', borderRadius: 10,
      background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
      fontSize: 12, color: '#fca5a5', textAlign: 'center' as const, lineHeight: 1.4,
    },

    footer: {
      marginTop: 28, fontSize: 10, color: 'rgba(255,255,255,0.2)',
      letterSpacing: '0.14em', textTransform: 'uppercase' as const,
      textAlign: 'center' as const,
    },
  };

  return (
    <div style={s.page}>
      {/* Grain overlay */}
      <div style={s.grain} />

      {/* Soft radial glow behind wordmark */}
      <div style={{
        position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: 320, height: 320, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(201,168,92,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={s.inner}>

        {/* Ornament */}
        <div style={s.ornament}>
          <div style={s.ornamentLine} />
          <div style={s.ornamentDot} />
          <div style={{ ...s.ornamentDot, width: 6, height: 6, background: '#c9a85c', opacity: 0.7 }} />
          <div style={s.ornamentDot} />
          <div style={s.ornamentLine} />
        </div>

        {/* Wordmark */}
        <h1 style={s.wordmark}>Eternal</h1>

        {/* Tagline */}
        <p style={s.tagline}>
          Where your family's memories live, speak, and grow across generations.
        </p>

        {/* Error */}
        {error && <div style={s.error}>{error}</div>}

        {/* Form card */}
        <div style={s.card}>
          {/* Email */}
          <div style={s.inputWrap}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handle(false)}
              placeholder="Email address"
              style={s.input}
            />
          </div>

          {/* Password */}
          <div style={{ ...s.inputWrap, marginBottom: 0 }}>
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handle(false)}
              placeholder="Password"
              style={{ ...s.input, paddingRight: 48 }}
            />
            <button
              onClick={() => setShowPw(!showPw)}
              style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 4 }}
            >
              {showPw ? <Eye size={17} /> : <EyeOff size={17} />}
            </button>
          </div>

          {/* Buttons */}
          <div style={s.btnRow}>
            <button onClick={() => handle(false)} disabled={loading} style={{ ...s.btnSignIn, opacity: loading ? 0.7 : 1 }}>
              {loading ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : 'Sign In'}
            </button>
            <button onClick={() => handle(true)} disabled={loading} style={{ ...s.btnSignUp, opacity: loading ? 0.7 : 1 }}>
              Sign Up
            </button>
          </div>
        </div>

        {/* Footer */}
        <p style={s.footer}>Eternal · Family Archive Platform</p>
      </div>

      {/* CSS for spin animation */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: rgba(245,237,224,0.28); }
        input:focus { border-color: rgba(201,168,92,0.4) !important; background: rgba(255,255,255,0.1) !important; }
      `}</style>
    </div>
  );
};

export default Auth;
