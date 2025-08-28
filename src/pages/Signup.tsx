import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signup as apiSignup, login as apiLogin } from '../api';
import { useAuth } from '../hooks/useAuth';
import './Signup.css';

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [name, setName] = useState('');
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
      await apiSignup(email, password, name);
      const data = await apiLogin(email, password);
      login(data.token);
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || 'Signup failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="authWrapper">
      <div className="authCard">
        <header className="authHeader">
          <h2 className="authTitle">Create your account</h2>
          <p className="authSubtitle">It only takes a minute</p>
        </header>

        <form onSubmit={handleSubmit} className="authForm" noValidate>
          <div className="field">
            <label htmlFor="name" className="fieldLabel">Name</label>
            <input
              id="name"
              className="textInput"
              type="text"
              placeholder="Your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

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
                autoComplete="new-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
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
            {submitting ? 'Creating account…' : 'Sign Up'}
          </button>
        </form>

        <p className="authAlt">
          Already have an account? <Link className="authLink" to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
