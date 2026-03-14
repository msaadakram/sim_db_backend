'use client';

import React, { useEffect, useState } from 'react';
import api from '../api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';
import {
  FiSearch, FiCheckCircle, FiXCircle, FiClock, FiTrendingUp,
  FiActivity, FiDatabase, FiZap, FiCalendar,
} from 'react-icons/fi';

const COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#22c55e'];

function formatTime(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatHourLabel(value) {
  const hour = Number.parseInt(value, 10);
  if (Number.isNaN(hour)) return value;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const normalized = hour % 12 === 0 ? 12 : hour % 12;
  return `${normalized}${suffix}`;
}

export default function Overview() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/api/admin/stats');
      setStats(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="spinner" />;
  if (!stats) return <p>Failed to load statistics.</p>;

  const successRate = stats.total > 0 ? ((stats.success / stats.total) * 100).toFixed(1) : 0;

  const dailyData = (stats.daily || []).map((d) => ({
    date: d._id.slice(5),
    searches: d.count,
    success: d.successCount || 0,
    failed: d.failCount || 0,
    avgTime: Math.round(d.avgTime || 0),
  }));

  const hourlyData = (stats.hourly || []).map((h) => ({
    hour: h.label || `${String(h.hourNumber ?? 0).padStart(2, '0')}:00`,
    hourNumber: h.hourNumber ?? 0,
    count: h.count || 0,
  }));

  const now = new Date();
  const monthlyRaw = stats.monthly || [];
  const monthMap = new Map(monthlyRaw.map((m) => [m._id, m.count]));
  const monthlyData = Array.from({ length: 12 }, (_, idx) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - idx), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return {
      month: d.toLocaleString('en-US', { month: 'short' }),
      fullMonth: d.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
      count: monthMap.get(key) || 0,
    };
  });
  const monthlyTotal = monthlyData.reduce((sum, m) => sum + m.count, 0);
  const monthlyPeak = monthlyData.reduce((best, point) => {
    if (!best || point.count > best.count) return point;
    return best;
  }, null);

  const yearlyRaw = stats.yearly || [];
  const yearMap = new Map(yearlyRaw.map((y) => [y._id, y.count]));
  const yearlyData = Array.from({ length: 5 }, (_, idx) => {
    const year = now.getFullYear() - (4 - idx);
    return {
      year: String(year),
      count: yearMap.get(year) || 0,
    };
  });

  const hourlyPeak = hourlyData.reduce((best, point) => {
    if (!best || point.count > best.count) return point;
    return best;
  }, null);

  const pieData = [
    { name: 'API 1', value: stats.api1Count7d || 0 },
    { name: 'API 2', value: stats.api2Count7d || 0 },
  ].filter((d) => d.value > 0);

  const topQueries = (stats.topQueries || []).slice(0, 5);
  const recentLogs = (stats.recentLogs || []).slice(0, 8);
  const chartTooltipStyle = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    color: 'var(--text-primary)',
    boxShadow: '0 10px 30px -14px rgba(0,0,0,0.6)',
    fontSize: '0.82rem',
  };

  return (
    <div className="overview-page">
      <div className="overview-stat-grid">
        <div className="overview-stat-card hero-card">
          <div className="ov-stat-icon blue"><FiSearch size={22} /></div>
          <div className="ov-stat-info">
            <span className="ov-stat-label">Total Searches</span>
            <span className="ov-stat-value">{stats.total.toLocaleString()}</span>
            <span className="ov-stat-sub">
              <FiTrendingUp size={13} /> {stats.todayCount || 0} today
            </span>
          </div>
        </div>

        <div className="overview-stat-card">
          <div className="ov-stat-icon green"><FiCheckCircle size={22} /></div>
          <div className="ov-stat-info">
            <span className="ov-stat-label">Successful</span>
            <span className="ov-stat-value green-text">{stats.success.toLocaleString()}</span>
            <span className="ov-stat-sub">{successRate}% rate</span>
          </div>
        </div>

        <div className="overview-stat-card">
          <div className="ov-stat-icon red"><FiXCircle size={22} /></div>
          <div className="ov-stat-info">
            <span className="ov-stat-label">Failed</span>
            <span className="ov-stat-value red-text">{stats.failed.toLocaleString()}</span>
            <span className="ov-stat-sub">{stats.total > 0 ? (100 - successRate).toFixed(1) : 0}% rate</span>
          </div>
        </div>

        <div className="overview-stat-card">
          <div className="ov-stat-icon yellow"><FiClock size={22} /></div>
          <div className="ov-stat-info">
            <span className="ov-stat-label">Avg Response</span>
            <span className="ov-stat-value">{formatTime(stats.avgResponseTime)}</span>
            <span className="ov-stat-sub">per request</span>
          </div>
        </div>
      </div>

      <div className="overview-charts-row">
        <div className="overview-chart-card main-chart">
          <div className="ov-chart-header">
            <div>
              <h3><FiActivity size={16} /> Search Activity</h3>
              <p className="ov-chart-sub">Last 7 days</p>
            </div>
            <span className="ov-period-chip">7D</span>
          </div>
          <div className="ov-chart-body">
            {dailyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={dailyData}>
                  <defs>
                    <linearGradient id="gradSuccess" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradFailed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} />
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    formatter={(value, name) => [value, name === 'success' ? 'Successful' : name === 'failed' ? 'Failed' : name]}
                  />
                  <Area type="monotone" dataKey="success" stroke="#22c55e" strokeWidth={2}
                    fill="url(#gradSuccess)" name="success" />
                  <Area type="monotone" dataKey="failed" stroke="#ef4444" strokeWidth={2}
                    fill="url(#gradFailed)" name="failed" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="ov-empty">No data for the last 7 days</div>
            )}
          </div>
        </div>
      </div>

      <div className="overview-hourly-row">
        <div className="overview-chart-card hourly-traffic-card">
          <div className="ov-chart-header">
            <div>
              <h3><FiZap size={16} /> Hourly Traffic</h3>
              <p className="ov-chart-sub">Last 24 hours</p>
            </div>
            <div className="ov-head-right">
              <span className="ov-period-chip">24H</span>
              <span className="ov-chart-kpi">
                Peak {hourlyPeak ? `${hourlyPeak.hour}` : '--:--'}
              </span>
            </div>
          </div>
          <div className="ov-chart-body">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={hourlyData}>
                <defs>
                  <linearGradient id="gradHourly" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="hourNumber"
                  stroke="var(--text-muted)"
                  fontSize={11}
                  interval={2}
                  tickFormatter={(value) => formatHourLabel(value)}
                />
                <YAxis stroke="var(--text-muted)" fontSize={11} />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  labelFormatter={(_, payload) => {
                    const point = payload?.[0]?.payload;
                    if (!point) return 'Time';
                    return `${point.hour} (${formatHourLabel(point.hourNumber)})`;
                  }}
                  formatter={(value) => [value.toLocaleString(), 'Searches']}
                />
                <Area
                  type="natural"
                  dataKey="count"
                  stroke="#8b5cf6"
                  strokeWidth={2.5}
                  fill="url(#gradHourly)"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="overview-bottom-row">
        <div className="overview-chart-card">
          <div className="ov-chart-header">
            <div>
              <h3><FiSearch size={16} /> Top Queries</h3>
              <p className="ov-chart-sub">Most searched (last 7 days)</p>
            </div>
            <span className="ov-period-chip">7D</span>
          </div>
          <div className="ov-chart-body top-queries-body">
            {topQueries.length > 0 ? (
              <div className="top-queries-list">
                {topQueries.map((q, i) => {
                  const maxCount = topQueries[0]?.count || 1;
                  const pct = ((q.count / maxCount) * 100).toFixed(0);
                  return (
                    <div className="top-query-item" key={i}>
                      <div className="tq-rank">#{i + 1}</div>
                      <div className="tq-info">
                        <div className="tq-query">{q._id}</div>
                        <div className="tq-bar-wrap">
                          <div className="tq-bar" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <div className="tq-count">{q.count}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="ov-empty">No queries yet</div>
            )}
          </div>
        </div>

        <div className="overview-chart-card">
          <div className="ov-chart-header">
            <div>
              <h3><FiDatabase size={16} /> API Distribution</h3>
              <p className="ov-chart-sub">Last 7 days</p>
            </div>
            <span className="ov-period-chip">7D</span>
          </div>
          <div className="ov-chart-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={5}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {pieData.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    formatter={(value) => [value.toLocaleString(), 'Requests']}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={10}
                    formatter={(value) => <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="ov-empty">No API usage data</div>
            )}
          </div>
          <div className="pie-stats-row">
            <div className="pie-stat">
              <span className="pie-dot" style={{ background: COLORS[0] }} />
              <span className="pie-label">API 1</span>
              <span className="pie-val">{(stats.api1Count7d || 0).toLocaleString()}</span>
            </div>
            <div className="pie-stat">
              <span className="pie-dot" style={{ background: COLORS[1] }} />
              <span className="pie-label">API 2</span>
              <span className="pie-val">{(stats.api2Count7d || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="overview-chart-card">
          <div className="ov-chart-header">
            <div>
              <h3><FiActivity size={16} /> Recent Activity</h3>
              <p className="ov-chart-sub">Latest searches</p>
            </div>
            <span className="ov-period-chip">Live</span>
          </div>
          <div className="ov-chart-body activity-body">
            {recentLogs.length > 0 ? (
              <div className="activity-list">
                {recentLogs.map((log, i) => (
                  <div className="activity-item" key={i}>
                    <div className={`activity-dot ${log.success ? 'act-success' : 'act-fail'}`} />
                    <div className="activity-info">
                      <span className="act-query">{log.query}</span>
                      <span className="act-meta">
                        {log.apiUsed?.toUpperCase() || 'N/A'} &middot; {log.responseTime}ms
                      </span>
                    </div>
                    <span className="act-time">{timeAgo(log.createdAt)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="ov-empty">No recent activity</div>
            )}
          </div>
        </div>
      </div>

      <div className="overview-trends-row">
        <div className="overview-chart-card monthly-trend-card">
          <div className="ov-chart-header">
            <div>
              <h3><FiCalendar size={16} /> Monthly Trend</h3>
              <p className="ov-chart-sub">Last 12 months</p>
            </div>
            <div className="monthly-kpis">
              <span className="ov-period-chip">12M</span>
              <span className="monthly-kpi-chip">
                Total: {monthlyTotal.toLocaleString()}
              </span>
              <span className="monthly-kpi-chip muted">
                Peak: {monthlyPeak ? `${monthlyPeak.month} (${monthlyPeak.count.toLocaleString()})` : 'N/A'}
              </span>
            </div>
          </div>
          <div className="ov-chart-body">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData}>
                <defs>
                  <linearGradient id="monthlyBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.65} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} />
                <YAxis stroke="var(--text-muted)" fontSize={11} />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullMonth || 'Month'}
                  formatter={(value) => [value.toLocaleString(), 'Searches']}
                />
                <Bar dataKey="count" fill="url(#monthlyBarGrad)" radius={[8, 8, 0, 0]} name="Searches" barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="overview-chart-card yearly-trend-card">
          <div className="ov-chart-header">
            <div>
              <h3><FiTrendingUp size={16} /> Yearly Trend</h3>
              <p className="ov-chart-sub">Last 5 years</p>
            </div>
            <span className="ov-period-chip">5Y</span>
          </div>
          <div className="ov-chart-body">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={yearlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="year" stroke="var(--text-muted)" fontSize={11} />
                <YAxis stroke="var(--text-muted)" fontSize={11} />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  formatter={(value) => [value.toLocaleString(), 'Searches']}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#22c55e"
                  strokeWidth={2.5}
                  dot={{ r: 3, strokeWidth: 1.5, fill: '#22c55e', stroke: '#0f172a' }}
                  activeDot={{ r: 5 }}
                  name="Searches"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
