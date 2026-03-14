'use client';

import React, { useState } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { FiLock, FiEye, FiEyeOff, FiShield, FiCheck } from 'react-icons/fi';

export default function ChangePassword() {
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [saving, setSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { currentPassword, newPassword, confirmPassword } = form;

  const setField = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const getStrength = (pw) => {
    if (!pw) return { level: 0, label: '', color: '' };
    let score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 10) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;

    if (score <= 1) return { level: 1, label: 'Weak', color: 'var(--danger)' };
    if (score <= 2) return { level: 2, label: 'Fair', color: '#f59e0b' };
    if (score <= 3) return { level: 3, label: 'Good', color: '#eab308' };
    if (score <= 4) return { level: 4, label: 'Strong', color: 'var(--success)' };
    return { level: 5, label: 'Very Strong', color: '#10b981' };
  };

  const strength = getStrength(newPassword);
  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;
  const canSubmit = currentPassword && newPassword.length >= 6 && passwordsMatch && !saving;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSaving(true);
    try {
      const { data } = await api.put('/api/auth/change-password', {
        currentPassword,
        newPassword,
      });
      if (data.token) {
        localStorage.setItem('token', data.token);
      }
      toast.success('Password changed successfully!');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to change password';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="change-password-page">
      <div className="cp-card">
        <div className="cp-header">
          <div className="cp-icon-wrap">
            <FiShield size={28} />
          </div>
          <div>
            <h2>Change Password</h2>
            <p className="cp-subtitle">Update your admin account password</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="cp-form">
          <div className="cp-field">
            <label htmlFor="currentPassword">
              <FiLock size={14} /> Current Password
            </label>
            <div className="cp-input-wrap">
              <input
                id="currentPassword"
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setField('currentPassword', e.target.value)}
                placeholder="Enter current password"
                autoComplete="current-password"
              />
              <button type="button" className="cp-eye-btn" onClick={() => setShowCurrent(!showCurrent)} tabIndex={-1}>
                {showCurrent ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
          </div>

          <div className="cp-field">
            <label htmlFor="newPassword">
              <FiLock size={14} /> New Password
            </label>
            <div className="cp-input-wrap">
              <input
                id="newPassword"
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setField('newPassword', e.target.value)}
                placeholder="At least 6 characters"
                autoComplete="new-password"
              />
              <button type="button" className="cp-eye-btn" onClick={() => setShowNew(!showNew)} tabIndex={-1}>
                {showNew ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
            {newPassword && (
              <div className="cp-strength">
                <div className="cp-strength-bar">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="cp-strength-segment"
                      style={{
                        background: i <= strength.level ? strength.color : 'var(--border)',
                      }}
                    />
                  ))}
                </div>
                <span className="cp-strength-label" style={{ color: strength.color }}>
                  {strength.label}
                </span>
              </div>
            )}
          </div>

          <div className="cp-field">
            <label htmlFor="confirmPassword">
              <FiLock size={14} /> Confirm New Password
            </label>
            <div className="cp-input-wrap">
              <input
                id="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setField('confirmPassword', e.target.value)}
                placeholder="Re-enter new password"
                autoComplete="new-password"
              />
              <button type="button" className="cp-eye-btn" onClick={() => setShowConfirm(!showConfirm)} tabIndex={-1}>
                {showConfirm ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
            {confirmPassword && (
              <div className={`cp-match ${passwordsMatch ? 'match' : 'no-match'}`}>
                {passwordsMatch ? (
                  <><FiCheck size={14} /> Passwords match</>
                ) : (
                  'Passwords do not match'
                )}
              </div>
            )}
          </div>

          <button type="submit" className="btn btn-primary cp-submit" disabled={!canSubmit}>
            {saving ? (
              <>Changing...</>
            ) : (
              <><FiShield size={16} /> Change Password</>
            )}
          </button>
        </form>

        <div className="cp-tips">
          <h4>Password Tips</h4>
          <ul>
            <li className={newPassword.length >= 6 ? 'met' : ''}>At least 6 characters</li>
            <li className={/[A-Z]/.test(newPassword) ? 'met' : ''}>Include an uppercase letter</li>
            <li className={/[0-9]/.test(newPassword) ? 'met' : ''}>Include a number</li>
            <li className={/[^A-Za-z0-9]/.test(newPassword) ? 'met' : ''}>Include a special character</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
