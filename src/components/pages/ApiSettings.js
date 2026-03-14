'use client';

import React, { useEffect, useState, useCallback } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { FiActivity, FiSave, FiRefreshCw, FiGlobe, FiShield, FiZap, FiAlertTriangle, FiArrowUp, FiArrowDown, FiServer } from 'react-icons/fi';

const API_REGISTRY = {
  api1: { label: 'API 1', domain: 'paksimdetails.xyz', Icon: FiZap, color: 'api1', enabledKey: 'api1Enabled', urlKey: 'api1Url' },
  api2: { label: 'API 2', domain: 'findpakjobs.pk', Icon: FiShield, color: 'api2', enabledKey: 'api2Enabled', urlKey: 'api2Url' },
};

export default function ApiSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [health, setHealth] = useState({});
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [togglingKey, setTogglingKey] = useState(null);

  const fetchSettings = useCallback(async () => {
    try {
      const { data } = await api.get('/api/admin/settings');
      setSettings(data);
    } catch {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  const checkHealth = useCallback(async () => {
    setCheckingHealth(true);
    try {
      const { data } = await api.get('/api/admin/api-health');
      setHealth(data);
    } catch {
      toast.error('Health check failed');
    } finally {
      setCheckingHealth(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    checkHealth();
  }, [fetchSettings, checkHealth]);

  const toggleSetting = async (key) => {
    const prev = settings[key];
    const next = !prev;
    setSettings((s) => ({ ...s, [key]: next }));
    setTogglingKey(key);
    try {
      await api.patch(`/api/admin/settings/${key}`, { value: next });
      toast.success(
        key === 'api1Enabled'
          ? `API 1 ${next ? 'enabled' : 'disabled'}`
          : key === 'api2Enabled'
          ? `API 2 ${next ? 'enabled' : 'disabled'}`
          : `API Key ${next ? 'required' : 'not required'}`
      );
    } catch {
      setSettings((s) => ({ ...s, [key]: prev }));
      toast.error('Failed to update setting');
    } finally {
      setTogglingKey(null);
    }
  };

  const saveUrls = async () => {
    setSaving(true);
    try {
      await api.put('/api/admin/settings', {
        api1Url: settings.api1Url,
        api2Url: settings.api2Url,
      });
      toast.success('API URLs saved');
      checkHealth();
    } catch {
      toast.error('Failed to save URLs');
    } finally {
      setSaving(false);
    }
  };

  const setVal = (key, v) => setSettings((s) => ({ ...s, [key]: v }));

  const priorityOrder = settings?.apiPriority || Object.keys(API_REGISTRY);

  const movePriority = async (index, direction) => {
    const newOrder = [...priorityOrder];
    const swapIdx = index + direction;
    if (swapIdx < 0 || swapIdx >= newOrder.length) return;
    [newOrder[index], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[index]];
    const prev = settings.apiPriority;
    setSettings((s) => ({ ...s, apiPriority: newOrder }));
    try {
      await api.patch('/api/admin/settings/apiPriority', { value: newOrder });
      toast.success(`Priority updated: ${newOrder.map((k) => API_REGISTRY[k]?.label || k).join(' → ')}`);
    } catch {
      setSettings((s) => ({ ...s, apiPriority: prev }));
      toast.error('Failed to update priority');
    }
  };

  if (loading) return <div className="spinner" />;
  if (!settings) return <p>Failed to load settings.</p>;

  const renderHealthBadge = (h) => {
    if (!h) return <span className="health-badge health-unknown"><FiActivity size={12} /> Checking...</span>;
    if (h.status === 'online')
      return <span className="health-badge health-online"><FiActivity size={12} /> Online &middot; {h.latency}ms</span>;
    return <span className="health-badge health-offline"><FiAlertTriangle size={12} /> Offline</span>;
  };

  const getRoleForApi = (apiId) => {
    const idx = priorityOrder.indexOf(apiId);
    if (idx === 0) return 'Primary';
    if (idx === priorityOrder.length - 1) return `Fallback ${priorityOrder.length > 2 ? idx : ''}`.trim();
    return `Fallback ${idx}`;
  };

  return (
    <div className="api-settings">
      <div className="status-banner">
        <div className="status-banner-inner">
          {priorityOrder.map((apiId) => {
            const meta = API_REGISTRY[apiId];
            if (!meta) return null;
            const { Icon, color } = meta;
            return (
              <div className="status-item" key={apiId}>
                <div className={`status-icon-wrap ${color}`}><Icon size={20} /></div>
                <div>
                  <div className="status-name">{meta.label} — {getRoleForApi(apiId)}</div>
                  {renderHealthBadge(health[apiId])}
                </div>
              </div>
            );
          })}
          <button
            className={`btn btn-ghost btn-sm refresh-btn ${checkingHealth ? 'spinning' : ''}`}
            onClick={checkHealth}
            disabled={checkingHealth}
          >
            <FiRefreshCw size={16} />
            {checkingHealth ? 'Checking...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="priority-card">
        <div className="priority-header">
          <h3><FiArrowUp size={16} style={{ marginRight: 6 }} />Failover Priority</h3>
          <span className="priority-desc">Drag APIs up/down to set failover order. The topmost API is tried first.</span>
        </div>
        <div className="priority-list">
          {priorityOrder.map((apiId, idx) => {
            const meta = API_REGISTRY[apiId];
            if (!meta) return null;
            const { Icon, color, label, domain } = meta;
            const isFirst = idx === 0;
            const isLast = idx === priorityOrder.length - 1;
            return (
              <div className="priority-list-item" key={apiId}>
                <span className="priority-rank">{idx + 1}</span>
                <div className={`prio-icon ${color}`}><Icon size={18} /></div>
                <div className="prio-info">
                  <span className="prio-name">{label}</span>
                  <span className="prio-sub">{domain}</span>
                </div>
                <span className={`prio-role-badge ${isFirst ? 'badge-primary' : 'badge-fallback'}`}>
                  {isFirst ? 'Primary' : `Fallback ${priorityOrder.length > 2 ? idx : ''}`}
                </span>
                <div className="priority-arrows">
                  <button className="arrow-btn" disabled={isFirst} onClick={() => movePriority(idx, -1)} title="Move up">
                    <FiArrowUp size={14} />
                  </button>
                  <button className="arrow-btn" disabled={isLast} onClick={() => movePriority(idx, 1)} title="Move down">
                    <FiArrowDown size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="priority-flow">
          {priorityOrder.map((apiId, idx) => {
            const meta = API_REGISTRY[apiId];
            if (!meta) return null;
            return (
              <React.Fragment key={apiId}>
                {idx > 0 && (
                  <>
                    <div className="flow-arrow">→</div>
                    <div className="flow-step">
                      <span className="flow-badge flow-fail">Error / No Data</span>
                    </div>
                    <div className="flow-arrow">→</div>
                  </>
                )}
                <div className="flow-step">
                  <span className={`flow-badge flow-${meta.color}`}>{meta.label}</span>
                  <span className="flow-label">{idx === 0 ? 'Primary' : `Fallback ${priorityOrder.length > 2 ? idx : ''}`}</span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="api-cards-grid">
        {priorityOrder.map((apiId) => {
          const meta = API_REGISTRY[apiId];
          if (!meta) return null;
          const { Icon, color, label, domain, enabledKey } = meta;
          const enabled = settings[enabledKey];
          const role = getRoleForApi(apiId);
          return (
            <div className={`api-control-card ${enabled ? 'enabled' : 'disabled'}`} key={apiId}>
              <div className="api-card-header">
                <div className={`api-card-icon ${color}`}><Icon size={22} /></div>
                <div className="api-card-title">
                  <h3>{label} — {role}</h3>
                  <span className="api-card-domain">{domain}</span>
                </div>
              </div>
              <div className="api-card-body">
                <div className="api-card-status-row">
                  <span className="api-card-status-label">Status</span>
                  <span className={`status-dot ${enabled ? 'active' : 'inactive'}`}>
                    <span className="dot" />{enabled ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="api-card-status-row">
                  <span className="api-card-status-label">Health</span>
                  {renderHealthBadge(health[apiId])}
                </div>
                <div className="api-card-status-row">
                  <span className="api-card-status-label">Priority</span>
                  <span className={`badge ${role === 'Primary' ? 'badge-info' : 'badge-warning'}`}>{role}</span>
                </div>
              </div>
              <div className="api-card-footer">
                <span className="api-card-toggle-label">
                  {togglingKey === enabledKey ? 'Saving...' : enabled ? 'Enabled' : 'Disabled'}
                </span>
                <label className={`toggle ${togglingKey === enabledKey ? 'saving' : ''}`}>
                  <input type="checkbox" checked={enabled} onChange={() => toggleSetting(enabledKey)} disabled={togglingKey === enabledKey} />
                  <span className="slider" />
                </label>
              </div>
            </div>
          );
        })}

        <div className={`api-control-card security-card ${settings.apiKeyRequired ? 'enabled' : 'disabled'}`}>
          <div className="api-card-header">
            <div className="api-card-icon security"><FiGlobe size={22} /></div>
            <div className="api-card-title">
              <h3>API Key Auth</h3>
              <span className="api-card-domain">Public access control</span>
            </div>
          </div>
          <div className="api-card-body">
            <div className="api-card-status-row">
              <span className="api-card-status-label">Mode</span>
              <span className={`status-dot ${settings.apiKeyRequired ? 'active' : 'inactive'}`}>
                <span className="dot" />{settings.apiKeyRequired ? 'Protected' : 'Open'}
              </span>
            </div>
            <div className="api-card-status-row">
              <span className="api-card-status-label">Endpoint</span>
              <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>/api/search</span>
            </div>
          </div>
          <div className="api-card-footer">
            <span className="api-card-toggle-label">
              {togglingKey === 'apiKeyRequired' ? 'Saving...' : settings.apiKeyRequired ? 'Required' : 'Not Required'}
            </span>
            <label className={`toggle ${togglingKey === 'apiKeyRequired' ? 'saving' : ''}`}>
              <input type="checkbox" checked={settings.apiKeyRequired} onChange={() => toggleSetting('apiKeyRequired')} disabled={togglingKey === 'apiKeyRequired'} />
              <span className="slider" />
            </label>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3><FiGlobe size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />API Endpoints</h3>
        </div>
        {Object.entries(API_REGISTRY).map(([apiId, meta]) => (
          <div className="url-field" key={apiId} style={{ marginTop: apiId === 'api1' ? 0 : '1.25rem' }}>
            <label>{meta.label} URL ({meta.domain})</label>
            <div className="url-input-wrap">
              <span className="url-prefix">GET</span>
              <input
                className="url-input"
                value={settings[meta.urlKey] || ''}
                onChange={(e) => setVal(meta.urlKey, e.target.value)}
                placeholder={`https://${meta.domain}/...`}
              />
            </div>
          </div>
        ))}
        <div style={{ marginTop: '1.5rem' }}>
          <button className="btn btn-primary" style={{ maxWidth: 200 }} onClick={saveUrls} disabled={saving}>
            <FiSave size={16} /> {saving ? 'Saving...' : 'Save URLs'}
          </button>
        </div>
      </div>
    </div>
  );
}
