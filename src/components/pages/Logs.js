'use client';

import React, { useEffect, useState, useCallback } from 'react';
import api from '../api';
import toast from 'react-hot-toast';

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/admin/logs?page=${page}&limit=25`);
      setLogs(data.logs);
      setPages(data.pages);
      setTotal(data.total);
    } catch {
      toast.error('Failed to load logs');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const clearLogs = async () => {
    if (!window.confirm('Clear all logs? This cannot be undone.')) return;
    try {
      await api.delete('/api/admin/logs');
      toast.success('Logs cleared');
      setPage(1);
      fetchLogs();
    } catch {
      toast.error('Failed to clear logs');
    }
  };

  const formatDate = (d) => {
    const date = new Date(d);
    return date.toLocaleString();
  };

  return (
    <>
      <div className="card">
        <div className="card-header">
          <h3>Request Logs ({total.toLocaleString()} total)</h3>
          <button className="btn btn-danger btn-sm" onClick={clearLogs}>
            Clear All
          </button>
        </div>

        {loading ? (
          <div className="spinner" />
        ) : logs.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', padding: '1rem 0' }}>No logs yet.</p>
        ) : (
          <>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Query</th>
                    <th>Type</th>
                    <th>API</th>
                    <th>Status</th>
                    <th>Response</th>
                    <th>IP</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log._id}>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                        {formatDate(log.createdAt)}
                      </td>
                      <td style={{ fontFamily: 'monospace' }}>{log.query}</td>
                      <td>
                        <span className="badge badge-info">{log.queryType}</span>
                      </td>
                      <td>{log.apiUsed}</td>
                      <td>
                        <span className={`badge ${log.success ? 'badge-success' : 'badge-danger'}`}>
                          {log.success ? 'OK' : 'FAIL'}
                        </span>
                      </td>
                      <td>{log.responseTime} ms</td>
                      <td style={{ fontSize: '0.8rem' }}>{log.ip}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pages > 1 && (
              <div className="pagination">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Prev
                </button>
                {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
                  const start = Math.max(1, page - 3);
                  const num = start + i;
                  if (num > pages) return null;
                  return (
                    <button
                      key={num}
                      className={num === page ? 'active' : ''}
                      onClick={() => setPage(num)}
                    >
                      {num}
                    </button>
                  );
                })}
                <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
