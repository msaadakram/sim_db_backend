'use client';

import React, { useEffect, useState } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { FiPlus, FiTrash2 } from 'react-icons/fi';

export default function ApiKeys() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState('');

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      const { data } = await api.get('/api/admin/apikeys');
      setKeys(data);
    } catch {
      toast.error('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  const createKey = async () => {
    try {
      await api.post('/api/admin/apikeys', { label: label || 'New Key' });
      toast.success('API key created');
      setLabel('');
      fetchKeys();
    } catch {
      toast.error('Failed to create key');
    }
  };

  const deleteKey = async (id) => {
    if (!window.confirm('Delete this API key?')) return;
    try {
      await api.delete(`/api/admin/apikeys/${id}`);
      toast.success('Key deleted');
      fetchKeys();
    } catch {
      toast.error('Failed to delete key');
    }
  };

  const toggleKey = async (id) => {
    try {
      await api.patch(`/api/admin/apikeys/${id}`);
      fetchKeys();
    } catch {
      toast.error('Failed to toggle key');
    }
  };

  if (loading) return <div className="spinner" />;

  return (
    <>
      <div className="card">
        <div className="card-header">
          <h3>Create API Key</h3>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <input
            className="url-input"
            style={{ flex: 1, marginTop: 0 }}
            placeholder="Key label (e.g. Mobile App)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <button className="btn btn-primary btn-sm" onClick={createKey}>
            <FiPlus /> Generate
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>API Keys ({keys.length})</h3>
        </div>

        {keys.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No API keys created yet.</p>
        ) : (
          keys.map((k) => (
            <div className="key-row" key={k._id}>
              <div style={{ flex: '0 0 auto' }}>
                <strong>{k.label}</strong>
                <br />
                <small style={{ color: 'var(--text-muted)' }}>
                  Requests: {k.requestCount}
                </small>
              </div>
              <div className="key-value">{k.key}</div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span className={`badge ${k.active ? 'badge-success' : 'badge-danger'}`}>
                  {k.active ? 'Active' : 'Inactive'}
                </span>
                <label className="toggle">
                  <input type="checkbox" checked={k.active} onChange={() => toggleKey(k._id)} />
                  <span className="slider" />
                </label>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => deleteKey(k._id)}
                  title="Delete"
                >
                  <FiTrash2 />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
