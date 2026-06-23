// ============================================================
// pages/Dashboard.jsx — Summary Stats & Recent Activity
// ============================================================

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  FileText, IndianRupee, Users, Clock, TrendingUp,
  CheckCircle, AlertCircle, Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color, loading }) {
  return (
    <div className="bg-gray-900 border border-white/5 rounded-2xl p-6 flex items-start gap-4">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-navy-400 text-xs font-semibold uppercase tracking-wider">{label}</p>
        {loading
          ? <div className="h-8 w-24 bg-white/5 animate-pulse rounded mt-1" />
          : <p className="text-white text-2xl font-bold mt-0.5">{value}</p>
        }
        {sub && <p className="text-navy-500 text-xs mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ── Recent Invoice Row ────────────────────────────────────────────────────────
function InvoiceRow({ invoice }) {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-white/5 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center flex-shrink-0">
        <FileText className="w-4 h-4 text-brand-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">
          {invoice.vendor_name || 'Unknown Vendor'}
        </p>
        <p className="text-navy-500 text-xs">
          {invoice.invoice_no} · {invoice.invoice_date
            ? new Date(invoice.invoice_date).toLocaleDateString('en-IN')
            : 'No date'}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-white text-sm font-medium">
          ₹{parseFloat(invoice.taxable_amount || 0).toLocaleString('en-IN')}
        </p>
        <p className="text-brand-400 text-xs">{invoice.gst_rate}% GST</p>
      </div>
    </div>
  );
}

export default function Dashboard({ setActivePage }) {
  const { user } = useAuth();
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    axios.get('/api/invoices/stats/dashboard')
      .then(r => setStats(r.data))
      .catch(() => setError('Failed to load dashboard stats.'))
      .finally(() => setLoading(false));
  }, []);

  const statCards = [
    {
      icon: FileText, label: 'Total Invoices', color: 'bg-navy-700',
      value: stats?.totalInvoices?.toLocaleString() || '0',
      sub: 'All time',
    },
    {
      icon: IndianRupee, label: 'Total GST Extracted', color: 'bg-brand-600',
      value: `₹${parseFloat(stats?.totalGst || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
      sub: 'Sum across all invoices',
    },
    {
      icon: Users, label: 'Active Users', color: 'bg-green-700',
      value: user?.role === 'admin' ? (stats?.activeUsers || '—') : '—',
      sub: user?.role === 'admin' ? 'Platform-wide' : 'Admin only',
    },
    {
      icon: Clock, label: 'Recent Activity', color: 'bg-purple-700',
      value: stats?.recentInvoices?.length || '0',
      sub: 'Invoices in last batch',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-brand-600 to-brand-500 rounded-2xl p-6 flex items-center justify-between">
        <div>
          <h3 className="text-white font-bold text-xl">Welcome back, {user?.name?.split(' ')[0]} 👋</h3>
          <p className="text-brand-100 text-sm mt-1">
            Your AI-powered GST extraction dashboard
          </p>
        </div>
        <button
          onClick={() => setActivePage('upload')}
          className="bg-white text-brand-600 font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-brand-50 transition-colors shadow-lg"
        >
          + New Invoice
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <StatCard key={i} {...card} loading={loading} />
        ))}
      </div>

      {/* Recent Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-white/5 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-white font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand-400" /> Recent Invoices
            </h4>
            <button
              onClick={() => setActivePage('history')}
              className="text-brand-400 text-xs hover:text-brand-300"
            >
              View all →
            </button>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="h-12 bg-white/5 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : stats?.recentInvoices?.length > 0 ? (
            stats.recentInvoices.map(inv => <InvoiceRow key={inv.id} invoice={inv} />)
          ) : (
            <div className="text-center py-8 text-navy-500 text-sm">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No invoices yet. Upload your first one!
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-900 border border-white/5 rounded-2xl p-6">
          <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-400" /> Quick Actions
          </h4>
          <div className="space-y-3">
            {[
              { label: 'Upload Invoice', desc: 'Process a new PDF or image', page: 'upload', color: 'brand' },
              { label: 'View History', desc: 'Browse all extracted invoices', page: 'history', color: 'navy' },
              ...(user?.role === 'admin' ? [
                { label: 'Manage Users', desc: 'Create, edit, or suspend accounts', page: 'users', color: 'purple' }
              ] : []),
            ].map(({ label, desc, page, color }) => (
              <button
                key={page}
                onClick={() => setActivePage(page)}
                className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all
                  bg-${color}-500/5 border-${color}-500/20 hover:bg-${color}-500/10`}
              >
                <div className="text-left">
                  <p className="text-white text-sm font-medium">{label}</p>
                  <p className="text-navy-500 text-xs">{desc}</p>
                </div>
                <span className="text-navy-400">→</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
