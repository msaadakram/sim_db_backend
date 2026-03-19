'use client';

import React, { useEffect, useState, useCallback } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { FiDownload, FiMail, FiRefreshCw, FiSearch, FiUsers } from 'react-icons/fi';

export default function Subscribers() {
  const [subscribers, setSubscribers] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);

  const fetchSubscribers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (search) params.set('search', search);

      const { data } = await api.get(`/api/admin/subscribers?${params.toString()}`);
      setSubscribers(data.subscribers || []);
      setPages(data.pages || 1);
      setTotal(data.total || 0);
    } catch {
      toast.error('Failed to load subscribers');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchSubscribers();
  }, [fetchSubscribers]);

  const formatDate = (value) => {
    if (!value) return '-';
    return new Date(value).toLocaleString();
  };

  const submitSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);

      const response = await api.get(`/api/admin/subscribers/export?${params.toString()}`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `newsletter-subscribers-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('CSV export started');
    } catch {
      toast.error('Failed to export subscribers');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="subscribers-page">
      <div className="subscribers-hero card">
        <div className="subscribers-hero-left">
          <div className="subscribers-hero-icon">
            <FiUsers size={20} />
          </div>
          <div>
            <h3>Newsletter Subscribers</h3>
            <p>Manage and export emails collected from the blog subscription form.</p>
          </div>
        </div>

        <div className="subscribers-kpis">
          <div className="subscribers-kpi-pill">
            <FiMail size={14} />
            <span>{total.toLocaleString()} total</span>
          </div>
          <button className="btn btn-sm subscribers-export-btn" onClick={exportCsv} disabled={exporting}>
            {exporting ? <FiRefreshCw className="spin" /> : <FiDownload />}
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </div>

      <div className="card">
        <form onSubmit={submitSearch} className="subscribers-toolbar">
          <div className="subscribers-search-wrap">
            <FiSearch size={16} />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by email..."
            />
          </div>
          <div className="subscribers-toolbar-actions">
            <button className="btn btn-sm" type="submit">
              Search
            </button>
            <button
              className="btn btn-sm btn-ghost"
              type="button"
              onClick={() => {
                setSearchInput('');
                setSearch('');
                setPage(1);
              }}
            >
              Reset
            </button>
          </div>
        </form>

        {loading ? (
          <div className="spinner" />
        ) : subscribers.length === 0 ? (
          <div className="subscribers-empty-state">
            <FiMail size={28} />
            <p>No subscribers found.</p>
          </div>
        ) : (
          <>
            <div className="table-wrapper subscribers-table-wrap">
              <table className="subscribers-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Source</th>
                    <th>Created</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {subscribers.map((subscriber) => (
                    <tr key={subscriber._id}>
                      <td>
                        <span className="subscribers-email-cell">{subscriber.email}</span>
                      </td>
                      <td>
                        <span className="badge badge-info subscribers-source-badge">
                          {subscriber.source || 'unknown'}
                        </span>
                      </td>
                      <td className="subscribers-time-cell">{formatDate(subscriber.createdAt)}</td>
                      <td className="subscribers-time-cell">{formatDate(subscriber.updatedAt)}</td>
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
    </div>
  );
}
