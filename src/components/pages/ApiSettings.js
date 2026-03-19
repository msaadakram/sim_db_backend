'use client';

import React, { useEffect, useState, useCallback } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { FiActivity, FiSave, FiRefreshCw, FiGlobe, FiShield, FiZap, FiAlertTriangle, FiArrowUp, FiArrowDown, FiServer } from 'react-icons/fi';

const API_REGISTRY = {
  api1: { label: 'API 1', domain: 'paksimdetails.xyz', Icon: FiZap, color: 'api1', enabledKey: 'api1Enabled', urlKey: 'api1Url' },
  api2: { label: 'API 2', domain: 'findpakjobs.pk', Icon: FiShield, color: 'api2', enabledKey: 'api2Enabled', urlKey: 'api2Url' },
};

const WEBSITE_PROVIDER_REGISTRY = {
  cuty: { label: 'Cuty', domain: 'cuty.io' },
  exe: { label: 'Exe', domain: 'exe.io' },
  gplinks: { label: 'GPLinks', domain: 'gplinks.com' },
  shrinkearn: { label: 'ShrinkEarn', domain: 'shrinkearn.com' },
};

export default function ApiSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [health, setHealth] = useState({});
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [togglingKey, setTogglingKey] = useState(null);
  const [savingGate, setSavingGate] = useState(false);
  const [gateHealth, setGateHealth] = useState(null);
  const [checkingGateHealth, setCheckingGateHealth] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const { data } = await api.get('/api/admin/settings');
      setSettings({
        ...data,
        websiteGateEnabled: data.websiteGateEnabled ?? true,
        websiteGateFreeQueries: data.websiteGateFreeQueries ?? 3,
        websiteGateFailoverEnabled: data.websiteGateFailoverEnabled ?? true,
        websiteGateUnlockTtlMinutes: data.websiteGateUnlockTtlMinutes ?? 10,
        websiteGateResetWindowMinutes: data.websiteGateResetWindowMinutes ?? 1440,
        websiteGateProbeUrl: data.websiteGateProbeUrl ?? 'https://sim-db-frontend.vercel.app',
        websiteGateProviderRotation: data.websiteGateProviderRotation || Object.keys(WEBSITE_PROVIDER_REGISTRY),
        websiteGateProviderEnabled: {
          cuty: true,
          exe: true,
          gplinks: true,
          shrinkearn: true,
          ...(data.websiteGateProviderEnabled || {}),
        },
      });
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

  const websiteProviderOrder = settings?.websiteGateProviderRotation || Object.keys(WEBSITE_PROVIDER_REGISTRY);

  const moveWebsiteProvider = async (index, direction) => {
    const newOrder = [...websiteProviderOrder];
    const swapIdx = index + direction;
    if (swapIdx < 0 || swapIdx >= newOrder.length) return;

    [newOrder[index], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[index]];
    const prev = settings.websiteGateProviderRotation;
    setSettings((s) => ({ ...s, websiteGateProviderRotation: newOrder }));

    try {
      await api.patch('/api/admin/settings/websiteGateProviderRotation', { value: newOrder });
      toast.success(`Website gate provider order updated: ${newOrder.map((k) => WEBSITE_PROVIDER_REGISTRY[k]?.label || k).join(' → ')}`);
    } catch {
      setSettings((s) => ({ ...s, websiteGateProviderRotation: prev }));
      toast.error('Failed to update provider order');
    }
  };

  const toggleWebsiteProvider = async (provider) => {
    const prev = settings.websiteGateProviderEnabled || {};
    const next = { ...prev, [provider]: !prev[provider] };
    setSettings((s) => ({ ...s, websiteGateProviderEnabled: next }));
    setTogglingKey(`provider-${provider}`);
    try {
      await api.patch('/api/admin/settings/websiteGateProviderEnabled', { value: next });
      toast.success(`${WEBSITE_PROVIDER_REGISTRY[provider]?.label || provider} ${next[provider] ? 'enabled' : 'disabled'} for website gate`);
    } catch {
      setSettings((s) => ({ ...s, websiteGateProviderEnabled: prev }));
      toast.error('Failed to update provider state');
    } finally {
      setTogglingKey(null);
    }
  };

  const saveWebsiteGateConfig = async () => {
    setSavingGate(true);
    try {
      await api.put('/api/admin/settings', {
        websiteGateEnabled: Boolean(settings.websiteGateEnabled),
        websiteGateFreeQueries: Number.parseInt(String(settings.websiteGateFreeQueries || 0), 10),
        websiteGateFailoverEnabled: Boolean(settings.websiteGateFailoverEnabled),
        websiteGateUnlockTtlMinutes: Number.parseInt(String(settings.websiteGateUnlockTtlMinutes || 10), 10),
        websiteGateResetWindowMinutes: Number.parseInt(String(settings.websiteGateResetWindowMinutes || 1440), 10),
        websiteGateProbeUrl: String(settings.websiteGateProbeUrl || '').trim(),
      });
      toast.success('Website gate settings saved');
    } catch {
      toast.error('Failed to save website gate settings');
    } finally {
      setSavingGate(false);
    }
  };

  const checkWebsiteGateHealth = async () => {
    setCheckingGateHealth(true);
    try {
      const { data } = await api.get('/api/admin/website-gate-health');
      setGateHealth(data);
      if (data?.ok) {
        toast.success('Website gate health check passed');
      } else {
        toast.error('Website gate health check found issues');
      }
    } catch (error) {
      const detail = error?.response?.data?.message;
      toast.error(detail || 'Website gate health check failed');
      setGateHealth({ status: 'error', ok: false, message: detail || 'Health check request failed' });
    } finally {
      setCheckingGateHealth(false);
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

      <div className="card" style={{ marginTop: '1rem' }}>
        <div className="card-header">
          <h3><FiServer size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />Website Short-link Gate</h3>
        </div>

        <div className="api-cards-grid" style={{ marginTop: '0.75rem' }}>
          <div className={`api-control-card ${settings.websiteGateEnabled ? 'enabled' : 'disabled'}`}>
            <div className="api-card-header">
              <div className="api-card-icon security"><FiGlobe size={22} /></div>
              <div className="api-card-title">
                <h3>Website Gate Enabled</h3>
                <span className="api-card-domain">Controls short-link requirement after free searches</span>
              </div>
            </div>
            <div className="api-card-footer">
              <span className="api-card-toggle-label">{settings.websiteGateEnabled ? 'Enabled' : 'Disabled'}</span>
              <label className="toggle">
                <input type="checkbox" checked={Boolean(settings.websiteGateEnabled)} onChange={() => setSettings((s) => ({ ...s, websiteGateEnabled: !s.websiteGateEnabled }))} />
                <span className="slider" />
              </label>
            </div>
          </div>

          <div className={`api-control-card ${settings.websiteGateFailoverEnabled ? 'enabled' : 'disabled'}`}>
            <div className="api-card-header">
              <div className="api-card-icon api2"><FiRefreshCw size={22} /></div>
              <div className="api-card-title">
                <h3>Provider Failover</h3>
                <span className="api-card-domain">Auto-tries next provider when one fails</span>
              </div>
            </div>
            <div className="api-card-footer">
              <span className="api-card-toggle-label">{settings.websiteGateFailoverEnabled ? 'Enabled' : 'Disabled'}</span>
              <label className="toggle">
                <input type="checkbox" checked={Boolean(settings.websiteGateFailoverEnabled)} onChange={() => setSettings((s) => ({ ...s, websiteGateFailoverEnabled: !s.websiteGateFailoverEnabled }))} />
                <span className="slider" />
              </label>
            </div>
          </div>
        </div>

        <div className="url-field" style={{ marginTop: '1rem' }}>
          <label>Free website searches before short-link gate</label>
          <input
            className="url-input"
            type="number"
            min="0"
            value={settings.websiteGateFreeQueries ?? 3}
            onChange={(e) => setSettings((s) => ({ ...s, websiteGateFreeQueries: e.target.value }))}
          />
        </div>

        <div className="url-field" style={{ marginTop: '1rem' }}>
          <label>Unlock token TTL (minutes)</label>
          <input
            className="url-input"
            type="number"
            min="1"
            value={settings.websiteGateUnlockTtlMinutes ?? 10}
            onChange={(e) => setSettings((s) => ({ ...s, websiteGateUnlockTtlMinutes: e.target.value }))}
          />
        </div>

        <div className="url-field" style={{ marginTop: '1rem' }}>
          <label>Reset free-search limit every (minutes)</label>
          <input
            className="url-input"
            type="number"
            min="1"
            value={settings.websiteGateResetWindowMinutes ?? 1440}
            onChange={(e) => setSettings((s) => ({ ...s, websiteGateResetWindowMinutes: e.target.value }))}
          />
          <small style={{ color: 'var(--text-secondary)', marginTop: '0.35rem', display: 'block' }}>
            Example: 1440 = daily reset. Users get the free {settings.websiteGateFreeQueries ?? 3} searches again after this window.
          </small>
        </div>

        <div className="url-field" style={{ marginTop: '1rem' }}>
          <label>Production probe URL (for health checker)</label>
          <input
            className="url-input"
            value={settings.websiteGateProbeUrl || ''}
            onChange={(e) => setSettings((s) => ({ ...s, websiteGateProbeUrl: e.target.value }))}
            placeholder="https://sim-db-frontend.vercel.app"
          />
        </div>

        <div className="priority-card" style={{ marginTop: '1rem' }}>
          <div className="priority-header">
            <h3><FiArrowUp size={16} style={{ marginRight: 6 }} />Short-link Provider Priority</h3>
            <span className="priority-desc">Top provider is used first after free searches; if failover is on, the next providers are tried in order.</span>
          </div>
          <div className="priority-list">
            {websiteProviderOrder.map((provider, idx) => {
              const meta = WEBSITE_PROVIDER_REGISTRY[provider];
              const enabled = Boolean(settings.websiteGateProviderEnabled?.[provider]);
              const isFirst = idx === 0;
              const isLast = idx === websiteProviderOrder.length - 1;
              return (
                <div className="priority-list-item" key={provider}>
                  <span className="priority-rank">{idx + 1}</span>
                  <div className="prio-info">
                    <span className="prio-name">{meta?.label || provider}</span>
                    <span className="prio-sub">{meta?.domain || provider}</span>
                  </div>
                  <span className={`status-dot ${enabled ? 'active' : 'inactive'}`}>
                    <span className="dot" />{enabled ? 'Enabled' : 'Disabled'}
                  </span>
                  <div className="priority-arrows">
                    <button className="arrow-btn" disabled={isFirst} onClick={() => moveWebsiteProvider(idx, -1)} title="Move up">
                      <FiArrowUp size={14} />
                    </button>
                    <button className="arrow-btn" disabled={isLast} onClick={() => moveWebsiteProvider(idx, 1)} title="Move down">
                      <FiArrowDown size={14} />
                    </button>
                  </div>
                  <label className={`toggle ${togglingKey === `provider-${provider}` ? 'saving' : ''}`}>
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={() => toggleWebsiteProvider(provider)}
                      disabled={togglingKey === `provider-${provider}`}
                    />
                    <span className="slider" />
                  </label>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ marginTop: '1.25rem' }}>
          <button className="btn btn-primary" style={{ maxWidth: 280 }} onClick={saveWebsiteGateConfig} disabled={savingGate}>
            <FiSave size={16} /> {savingGate ? 'Saving gate config...' : 'Save Website Gate Settings'}
          </button>
        </div>

        <div className="card" style={{ marginTop: '1rem', background: 'var(--card-bg)' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3><FiActivity size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />Website Gate Health Check</h3>
            <button className={`btn btn-ghost btn-sm ${checkingGateHealth ? 'spinning' : ''}`} onClick={checkWebsiteGateHealth} disabled={checkingGateHealth}>
              <FiRefreshCw size={14} /> {checkingGateHealth ? 'Checking...' : 'Run Health Check'}
            </button>
          </div>

          {gateHealth ? (
            <div style={{ fontSize: '0.92rem' }}>
              <p>
                Status:{' '}
                <strong style={{ color: gateHealth.ok ? 'var(--success)' : 'var(--danger)' }}>
                  {gateHealth.status || (gateHealth.ok ? 'healthy' : 'degraded')}
                </strong>
              </p>
              {gateHealth.probeUrl ? <p>Probe URL: <code>{gateHealth.probeUrl}</code></p> : null}
              {gateHealth.checkedAt ? <p>Checked at: {new Date(gateHealth.checkedAt).toLocaleString()}</p> : null}
              {gateHealth.message ? <p style={{ color: 'var(--danger)' }}>{gateHealth.message}</p> : null}

              {Array.isArray(gateHealth.steps) && gateHealth.steps.length ? (
                <div style={{ marginTop: '0.75rem' }}>
                  <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Probe steps</p>
                  <div style={{ display: 'grid', gap: '0.4rem' }}>
                    {gateHealth.steps.map((step) => (
                      <div key={step.step} style={{ padding: '0.55rem 0.65rem', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '0.86rem' }}>
                        <strong>#{step.step}</strong> · status {step.status}
                        {step.provider ? ` · provider ${String(step.provider).toUpperCase()}` : ''}
                        {step.requireShortlink ? ' · shortlink required' : ' · no gate'}
                        {step.redirectUrl ? ' · redirect ok' : ''}
                        {step.error ? ` · error: ${step.error}` : ''}
                        {step.message ? ` · message: ${step.message}` : ''}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <p style={{ color: 'var(--text-secondary)' }}>
              Run the health check to verify live production short-link behavior before users report issues.
            </p>
          )}
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
