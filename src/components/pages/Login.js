'use client';

import React, { useState } from 'react';
import api from '../api';
import { FiSearch, FiUser, FiLock, FiEye, FiEyeOff, FiArrowRight, FiShield } from 'react-icons/fi';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/login', { username, password });
      onLogin(data.token);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg-orb login-bg-orb-1" />
      <div className="login-bg-orb login-bg-orb-2" />
      <div className="login-bg-orb login-bg-orb-3" />

      <div className="login-container">
        <div className="login-branding">
          <div className="login-brand-content">
            <div className="login-brand-icon">
              <FiSearch size={32} />
            </div>
            <h1 className="login-brand-title">SIM Finder</h1>
            <p className="login-brand-desc">
              Powerful admin dashboard for managing SIM lookup services, API configurations, and real-time analytics.
            </p>
            <div className="login-brand-features">
              <div className="login-brand-feature">
                <FiShield size={18} />
                <span>Secure API Management</span>
              </div>
              <div className="login-brand-feature">
                <FiSearch size={18} />
                <span>Real-time Search Analytics</span>
              </div>
            </div>
          </div>
          <div className="login-brand-footer">
            <span>SIM Finder Admin v1.0</span>
          </div>
        </div>

        <div className="login-form-panel">
          <div className="login-form-inner">
            <div className="login-form-header">
              <h2>Welcome Back</h2>
              <p>Sign in to your admin account</p>
            </div>

            {error && (
              <div className="login-error">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M8 4.5V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <circle cx="8" cy="11.5" r="0.75" fill="currentColor"/>
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
              <div className={`login-field ${focusedField === 'user' ? 'login-field-focused' : ''} ${username ? 'login-field-filled' : ''}`}>
                <label htmlFor="login-username">Username</label>
                <div className="login-input-wrap">
                  <FiUser className="login-input-icon" size={18} />
                  <input
                    id="login-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onFocus={() => setFocusedField('user')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Enter your username"
                    autoFocus
                    required
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className={`login-field ${focusedField === 'pass' ? 'login-field-focused' : ''} ${password ? 'login-field-filled' : ''}`}>
                <label htmlFor="login-password">Password</label>
                <div className="login-input-wrap">
                  <FiLock className="login-input-icon" size={18} />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('pass')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="login-eye-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                  </button>
                </div>
              </div>

              <button
                className={`login-submit ${loading ? 'login-submit-loading' : ''}`}
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="login-spinner" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <FiArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            <div className="login-form-footer">
              <FiShield size={14} />
              <span>Protected by secure authentication</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
