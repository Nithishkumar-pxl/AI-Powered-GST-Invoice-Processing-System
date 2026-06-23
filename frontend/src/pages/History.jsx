// ============================================================
// pages/History.jsx — Invoice History Grid with Search, Download, Delete
// ============================================================

import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import {
  Search, Download, Trash2, RefreshCw, FileText,
  AlertCircle, ChevronLeft, ChevronRight, Filter, Calendar
} from 'lucide-react';

// ── Status Badge ─────────────────────────────────────────────────────────────
function GSTBadge({ rate }) {
  const colors = {
    5:  'bg-green-500/10 text-green-400 border-green-500/20',
    12: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    18: 'bg-brand-500/10 text-brand-400 border-brand-500/20',
    28: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  };
  const cls = colors[Math.round(rate)] || 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${cls}`}>
      {rate}%
    </span>
  );
}

export default function History() {
  const [invoices, setInvoices]   = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [deleting, setDeleting]   = useState(null);
  const limit = 15;

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit, ...(search && { search }) };
      const res = await axios.get('/api/invoices', { params });
      setInvoices(res.data.invoices);
      setTotal(res.data.total);
    } catch {
      setError('Failed to load invoices.');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // ── Download JSON from DB's raw_extracted_json column ──────────────────────
  const handleDownloadJSON = async (invoice) => {
    try {
      const res = await axios.get(`/api/invoices/${invoice.id}`);
      const raw = res.data.invoice.raw_extracted_json;
      const blob = new Blob([JSON.stringify(raw, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `invoice_${invoice.invoice_no || invoice.id}.json`;
      a.click();
    } catch {
      setError('Failed to download JSON.');
    }
  };

  // ── Delete Invoice ──────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this invoice permanently?')) return;
    setDeleting(id);
    try {
      await axios.delete(`/api/invoices/${id}`);
      setInvoices(prev => prev.filter(i => i.id !== id));
      setTotal(t => t - 1);
    } catch {
      setError('Failed to delete invoice.');
    } finally {
      setDeleting(null);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-500" />
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search by vendor, invoice no, or GSTIN…"
            className="w-full bg-gray-900 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm
                       placeholder-navy-600 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
          />
        </div>
        <button
          onClick={fetchInvoices}
          className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 border border-white/10 rounded-xl text-navy-400 hover:text-white text-sm transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Summary Bar */}
      <div className="flex items-center justify-between text-sm">
        <p className="text-navy-400">
          Showing <span className="text-white font-medium">{invoices.length}</span> of{' '}
          <span className="text-white font-medium">{total}</span> invoices
          {search && <> matching "<span className="text-brand-400">{search}</span>"</>}
        </p>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {['Vendor', 'Invoice No', 'Date', 'GSTIN', 'GST Rate', 'Taxable Amt', 'Uploaded By', 'Actions'].map(h => (
                  <th key={h} className="text-left text-navy-500 text-xs font-semibold uppercase tracking-wider px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-white/5">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-white/5 animate-pulse rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-navy-600">
                    <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>No invoices found</p>
                    {search && <p className="text-xs mt-1">Try a different search term</p>}
                  </td>
                </tr>
              ) : (
                invoices.map(inv => (
                  <tr key={inv.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-brand-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FileText className="w-3.5 h-3.5 text-brand-400" />
                        </div>
                        <span className="text-white text-sm font-medium max-w-[160px] truncate">
                          {inv.vendor_name || '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-navy-300 text-sm font-mono">
                      {inv.invoice_no || '—'}
                    </td>
                    <td className="px-4 py-3 text-navy-400 text-sm">
                      {inv.invoice_date
                        ? new Date(inv.invoice_date).toLocaleDateString('en-IN')
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-navy-400 text-sm font-mono">
                      {inv.gstin_no || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {inv.gst_rate ? <GSTBadge rate={parseFloat(inv.gst_rate)} /> : '—'}
                    </td>
                    <td className="px-4 py-3 text-white text-sm font-medium">
                      ₹{parseFloat(inv.taxable_amount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-navy-400 text-sm">
                      {inv.user_name || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDownloadJSON(inv)}
                          title="Download JSON"
                          className="p-1.5 text-navy-500 hover:text-brand-400 hover:bg-brand-500/10 rounded-lg transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(inv.id)}
                          disabled={deleting === inv.id}
                          title="Delete invoice"
                          className="p-1.5 text-navy-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
            <p className="text-navy-500 text-xs">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 text-navy-400 hover:text-white disabled:opacity-30 hover:bg-white/5 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 text-navy-400 hover:text-white disabled:opacity-30 hover:bg-white/5 rounded-lg transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
