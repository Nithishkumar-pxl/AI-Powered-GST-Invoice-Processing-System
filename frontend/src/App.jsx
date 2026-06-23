// ============================================================
// App.jsx — Root Application Component
// Manages routing between pages via activePage state.
// ============================================================

import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import LoginPage       from './pages/LoginPage';
import Dashboard       from './pages/Dashboard';
import UploadAndExtract from './pages/UploadAndExtract';
import History         from './pages/History';
import UserManagement  from './pages/UserManagement';
import {
  LayoutDashboard, Upload, History as HistoryIcon, Users,
  FileText, LogOut, Menu, X, ChevronRight, Shield
} from 'lucide-react';

// ── Navigation Items ──────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard',    icon: LayoutDashboard },
  { key: 'upload',    label: 'Upload',        icon: Upload },
  { key: 'history',  label: 'History',       icon: HistoryIcon },
  { key: 'users',    label: 'User Mgmt',     icon: Users, adminOnly: true },
];

// ── Sidebar Component ─────────────────────────────────────────────────────────
function Sidebar({ activePage, setActivePage, collapsed, setCollapsed, user, logout }) {
  const visibleItems = NAV_ITEMS.filter(i => !i.adminOnly || user?.role === 'admin');

  return (
    <aside className={`
      flex flex-col bg-navy-950 border-r border-white/5 transition-all duration-300 flex-shrink-0
      ${collapsed ? 'w-16' : 'w-60'}
    `}>
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/5 min-h-[65px]">
        <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg shadow-brand-500/20">
          <FileText className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <span className="font-bold text-white text-lg tracking-tight">GSTract</span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto text-navy-500 hover:text-white transition-colors"
        >
          {collapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 p-3 space-y-1">
        {visibleItems.map(({ key, label, icon: Icon, adminOnly }) => {
          const active = activePage === key;
          return (
            <button
              key={key}
              onClick={() => setActivePage(key)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                transition-all duration-150
                ${active
                  ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
                  : 'text-navy-400 hover:bg-white/5 hover:text-white'
                }
              `}
              title={collapsed ? label : undefined}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">{label}</span>
                  {adminOnly && (
                    <span className="text-[9px] font-bold bg-white/10 px-1.5 py-0.5 rounded-md tracking-wider">
                      ADMIN
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="border-t border-white/5 p-3">
        {collapsed ? (
          <button
            onClick={logout}
            className="w-full flex justify-center p-2 text-navy-500 hover:text-red-400 transition-colors rounded-xl hover:bg-red-500/10"
          >
            <LogOut className="w-4 h-4" />
          </button>
        ) : (
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center flex-shrink-0">
              <span className="text-brand-300 text-xs font-bold">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{user?.name}</p>
              <div className="flex items-center gap-1">
                {user?.role === 'admin' && <Shield className="w-2.5 h-2.5 text-brand-400" />}
                <p className="text-navy-500 text-[10px] capitalize">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="text-navy-500 hover:text-red-400 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

// ── Page Titles ───────────────────────────────────────────────────────────────
const PAGE_LABELS = {
  dashboard: 'Dashboard',
  upload:    'Upload & Extract',
  history:   'Invoice History',
  users:     'User Management',
};

// ── App Shell ─────────────────────────────────────────────────────────────────
export default function App() {
  const { user, loading, logout } = useAuth();
  const [activePage, setActivePage] = useState('dashboard');
  const [collapsed, setCollapsed]   = useState(false);

  // Loading splash
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-navy-400 text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  // Not authenticated — show login
  if (!user) return <LoginPage />;

  // Render active page
  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <Dashboard setActivePage={setActivePage} />;
      case 'upload':    return <UploadAndExtract />;
      case 'history':   return <History />;
      case 'users':     return user.role === 'admin' ? <UserManagement /> : <Dashboard setActivePage={setActivePage} />;
      default:          return <Dashboard setActivePage={setActivePage} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden font-sans">
      {/* Sidebar */}
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        user={user}
        logout={logout}
      />

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-gray-950/90 backdrop-blur border-b border-white/5 px-6 py-4 flex items-center justify-between flex-shrink-0 sticky top-0 z-10">
          <div>
            <h1 className="text-white font-semibold">{PAGE_LABELS[activePage]}</h1>
            <p className="text-navy-600 text-xs">
              {new Date().toLocaleDateString('en-IN', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
              })}
            </p>
          </div>
          {user?.role === 'admin' && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-500/10 border border-brand-500/20 rounded-full">
              <Shield className="w-3.5 h-3.5 text-brand-400" />
              <span className="text-brand-400 text-xs font-semibold">Administrator</span>
            </div>
          )}
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-7xl mx-auto">
            {renderPage()}
          </div>
        </main>
      </div>
    </div>
  );
}
