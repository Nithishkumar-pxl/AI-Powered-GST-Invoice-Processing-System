// ============================================================
// components/Layout.jsx — App Shell with Side Navigation
// Dynamically shows "User Management" tab for admin users.
// ============================================================

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Upload, FileSearch, History,
  Users, LogOut, FileText, Menu, X, ChevronRight
} from 'lucide-react';

const NAV_ITEMS = [
  { key: 'dashboard',  label: 'Dashboard',   icon: LayoutDashboard },
  { key: 'upload',     label: 'Upload',       icon: Upload },
  { key: 'history',   label: 'History',      icon: History },
  { key: 'users',     label: 'User Mgmt',    icon: Users, adminOnly: true },
];

export default function Layout({ activePage, setActivePage }) {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const visibleItems = NAV_ITEMS.filter(item => !item.adminOnly || user?.role === 'admin');

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className={`
        flex flex-col bg-navy-950 border-r border-white/5 transition-all duration-300
        ${sidebarOpen ? 'w-60' : 'w-16'}
      `}>
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/5">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <FileText className="w-4 h-4 text-white" />
          </div>
          {sidebarOpen && (
            <span className="font-bold text-white text-lg tracking-tight">GSTract</span>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="ml-auto text-navy-400 hover:text-white transition-colors"
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-3 space-y-1">
          {visibleItems.map(({ key, label, icon: Icon, adminOnly }) => (
            <button
              key={key}
              onClick={() => setActivePage(key)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                transition-all duration-150 group relative
                ${activePage === key
                  ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
                  : 'text-navy-400 hover:bg-white/5 hover:text-white'
                }
              `}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {sidebarOpen && (
                <>
                  <span>{label}</span>
                  {adminOnly && (
                    <span className="ml-auto text-[10px] font-bold bg-brand-500/20 text-brand-300 px-1.5 py-0.5 rounded-md">
                      ADMIN
                    </span>
                  )}
                  {activePage === key && (
                    <ChevronRight className="ml-auto w-3 h-3" />
                  )}
                </>
              )}
            </button>
          ))}
        </nav>

        {/* User Profile & Logout */}
        <div className="border-t border-white/5 p-3">
          {sidebarOpen ? (
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-brand-300 text-xs font-bold">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-medium truncate">{user?.name}</p>
                <p className="text-navy-400 text-[10px] truncate">{user?.role}</p>
              </div>
              <button onClick={logout} className="text-navy-400 hover:text-red-400 transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button onClick={logout} className="w-full flex justify-center p-2 text-navy-400 hover:text-red-400 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>

      {/* ── Main Content ────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto bg-gray-950">
        {/* Top Header Bar */}
        <header className="bg-gray-950/80 backdrop-blur border-b border-white/5 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h2 className="text-white font-semibold capitalize">
              {visibleItems.find(i => i.key === activePage)?.label || 'Dashboard'}
            </h2>
            <p className="text-navy-500 text-xs">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          {user?.role === 'admin' && (
            <span className="px-3 py-1 bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-semibold rounded-full">
              Administrator
            </span>
          )}
        </header>

        {/* Page Content */}
        <div className="p-6">
          {/* This slot is filled by App.jsx based on activePage */}
        </div>
      </main>
    </div>
  );
}
