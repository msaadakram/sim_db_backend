'use client';

import React, { useEffect, useState, useCallback } from 'react';
import api from '../api';
import toast from 'react-hot-toast';

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
    <div className="card">
      <div className="card-header" style={{ alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <h3>Newsletter Subscribers ({total.toLocaleString()} total)</h3>
        <button className="btn btn-sm" onClick={exportCsv} disabled={exporting}>
          {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      <form onSubmit={submitSearch} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search email..."
          style={{ flex: 1 }}
        />
        <button className="btn btn-sm" type="submit">
          Search
        </button>
        <button
          className="btn btn-sm"
          type="button"
          onClick={() => {
            setSearchInput('');
            setSearch('');
            setPage(1);
          }}
        >
          Reset
        </button>
      </form>

      {loading ? (
        <div className="spinner" />
      ) : subscribers.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', padding: '1rem 0' }}>No subscribers found.</p>
      ) : (
        <>
          <div className="table-wrapper">
            <table>
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
                    <td style={{ fontFamily: 'monospace' }}>{subscriber.email}</td>
                    <td>{subscriber.source || '-'}</td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                      {formatDate(subscriber.createdAt)}
                    </td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                      {formatDate(subscriber.updatedAt)}
                    </td>
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
  );
}
