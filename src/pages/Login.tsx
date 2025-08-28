import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { login as apiLogin } from '../api';
import './Login.css';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    setSubmitting(true);
    try {
      const data = await apiLogin(email, password);
      login(data.token);
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="authWrapper">
      <div className="authCard">
        <header className="authHeader">
          <h2 className="authTitle">Welcome back</h2>
          <p className="authSubtitle">Sign in to continue</p>
        </header>

        <form onSubmit={handleSubmit} className="authForm" noValidate>
          <div className="field">
            <label htmlFor="email" className="fieldLabel">Email</label>
            <input
              id="email"
              className="textInput"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-invalid={!!error}
            />
          </div>

          <div className="field">
            <label htmlFor="password" className="fieldLabel">Password</label>
            <div className="pwGroup">
              <input
                id="password"
                className="textInput pwInput"
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="btn btnGhost pwToggle"
                onClick={() => setShowPw((v) => !v)}
                aria-pressed={showPw}
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {error && <p className="formError" role="alert">{error}</p>}

          <button className="btn btnPrimary authSubmit" type="submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Login'}
          </button>
        </form>

        <p className="authAlt">
          Don’t have an account? <Link className="authLink" to="/signup">Sign up</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
