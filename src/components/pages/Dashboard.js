'use client';

import React, { useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import {
  FiHome,
  FiSettings,
  FiFileText,
  FiKey,
  FiUsers,
  FiLogOut,
  FiSun,
  FiMoon,
  FiMenu,
  FiSearch,
  FiLock,
} from 'react-icons/fi';
import Overview from './Overview';
import ApiSettings from './ApiSettings';
import Logs from './Logs';
import ApiKeys from './ApiKeys';
import ChangePassword from './ChangePassword';
import Subscribers from './Subscribers';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Overview', icon: FiHome },
  { path: '/dashboard/settings', label: 'API Settings', icon: FiSettings },
  { path: '/dashboard/logs', label: 'Logs', icon: FiFileText },
  { path: '/dashboard/subscribers', label: 'Subscribers', icon: FiUsers },
  { path: '/dashboard/keys', label: 'API Keys', icon: FiKey },
  { path: '/dashboard/password', label: 'Change Password', icon: FiLock },
];

export default function Dashboard({ onLogout, theme, toggleTheme }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="layout">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>
            <FiSearch size={18} /> SIM <span>Finder</span>
          </h2>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => {
                navigate(item.path);
                setSidebarOpen(false);
              }}
            >
              <item.icon />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="nav-item" onClick={onLogout}>
            <FiLogOut /> Logout
          </button>
        </div>
      </aside>

      <div className="main-content">
        <div className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <FiMenu />
            </button>
            <h1>
              {NAV_ITEMS.find((i) => i.path === location.pathname)?.label || 'Dashboard'}
            </h1>
          </div>
          <div className="topbar-right">
            <button className="theme-btn" onClick={toggleTheme} title="Toggle theme">
              {theme === 'dark' ? <FiSun size={18} /> : <FiMoon size={18} />}
            </button>
          </div>
        </div>

        <Routes>
          <Route index element={<Overview />} />
          <Route path="settings" element={<ApiSettings />} />
          <Route path="logs" element={<Logs />} />
          <Route path="subscribers" element={<Subscribers />} />
          <Route path="keys" element={<ApiKeys />} />
          <Route path="password" element={<ChangePassword />} />
        </Routes>
      </div>
    </div>
  );
}
