// ============================================================
// pages/UserManagement.jsx — Admin-Only User Management Panel
// Features: User table, Create modal, Role change, Status toggle, Delete
// ============================================================

import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import {
  Users, Plus, Edit2, Trash2, Shield, User,
  CheckCircle, XCircle, AlertCircle, Loader2, X, Save
} from 'lucide-react';

// ── Role Badge ────────────────────────────────────────────────────────────────
function RoleBadge({ role }) {
  return role === 'admin' ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-semibold rounded-full">
      <Shield className="w-3 h-3" /> Admin
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-navy-500/10 border border-navy-500/20 text-navy-400 text-xs font-semibold rounded-full">
      <User className="w-3 h-3" /> User
    </span>
  );
}

// ── Status Toggle ─────────────────────────────────────────────────────────────
function StatusToggle({ userId, status, onToggle, disabled }) {
  const active = status === 'active';
  return (
    <button
      onClick={() => onToggle(userId, active ? 'suspended' : 'active')}
      disabled={disabled}
      title={active ? 'Click to suspend' : 'Click to activate'}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none
        ${active ? 'bg-green-500' : 'bg-gray-700'} disabled:opacity-50`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow
        ${active ? 'translate-x-6' : 'translate-x-1'}`}
      />
    </button>
  );
}

// ── Create / Edit User Modal ──────────────────────────────────────────────────
function UserModal({ mode, user, onSave, onClose, loading, error }) {
  const [form, setForm] = useState(
    user
      ? { name: user.name, email: user.email, role: user.role, password: '' }
      : { name: '', email: '', password: '', role: 'user' }
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h3 className="text-white font-semibold">
            {mode === 'create' ? 'Create New User' : 'Edit User'}
          </h3>
          <button onClick={onClose} className="text-navy-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-sm">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}

          {[
            { label: 'Full Name',  key: 'name',  type: 'text' },
            { label: 'Email',      key: 'email', type: 'email' },
            ...(mode === 'create' ? [{ label: 'Password', key: 'password', type: 'password' }] : []),
          ].map(({ label, key, type }) => (
            <div key={key}>
              <label className="block text-navy-400 text-xs font-semibold uppercase tracking-wider mb-1.5">
                {label}
              </label>
              <input
                type={type}
                value={form[key]}
                onChange={e => setForm({ ...form, [key]: e.target.value })}
                className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm
                           focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
                required
              />
            </div>
          ))}

          {/* Role Selector */}
          <div>
            <label className="block text-navy-400 text-xs font-semibold uppercase tracking-wider mb-1.5">
              Role
            </label>
            <div className="flex gap-3">
              {['user', 'admin'].map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setForm({ ...form, role: r })}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all
                    ${form.role === r
                      ? 'bg-brand-500 border-brand-500 text-white'
                      : 'bg-gray-800 border-white/10 text-navy-400 hover:text-white'
                    }`}
                >
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex gap-3 px-6 pb-5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-white/10 text-navy-400 hover:text-white text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {loading ? 'Saving…' : mode === 'create' ? 'Create User' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function UserManagement() {
  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [modalMode, setModalMode] = useState(null); // null | 'create' | 'edit'
  const [editUser, setEditUser]   = useState(null);
  const [saving, setSaving]       = useState(false);
  const [modalError, setModalError] = useState('');
  const [togglingId, setTogglingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/admin/users');
      setUsers(res.data.users);
    } catch {
      setError('Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // ── Create User ─────────────────────────────────────────────────────────────
  const handleCreate = async (form) => {
    setSaving(true);
    setModalError('');
    try {
      const res = await axios.post('/api/admin/users', form);
      setUsers(prev => [{ ...res.data.user, invoices_processed: 0 }, ...prev]);
      setModalMode(null);
    } catch (err) {
      setModalError(err.response?.data?.error || 'Failed to create user.');
    } finally {
      setSaving(false);
    }
  };

  // ── Edit User ───────────────────────────────────────────────────────────────
  const handleEdit = async (form) => {
    setSaving(true);
    setModalError('');
    try {
      const res = await axios.put(`/api/admin/users/${editUser.id}`, form);
      setUsers(prev => prev.map(u =>
        u.id === editUser.id ? { ...u, ...res.data.user } : u
      ));
      setModalMode(null);
      setEditUser(null);
    } catch (err) {
      setModalError(err.response?.data?.error || 'Failed to update user.');
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle Status ───────────────────────────────────────────────────────────
  const handleToggleStatus = async (userId, newStatus) => {
    setTogglingId(userId);
    try {
      const res = await axios.put(`/api/admin/users/${userId}`, { status: newStatus });
      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, status: res.data.user.status } : u
      ));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update status.');
    } finally {
      setTogglingId(null);
    }
  };

  // ── Delete User ─────────────────────────────────────────────────────────────
  const handleDelete = async (userId) => {
    if (!window.confirm('Delete this user? Their invoices will remain but be unlinked.')) return;
    setDeletingId(userId);
    try {
      await axios.delete(`/api/admin/users/${userId}`);
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete user.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header + Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-semibold text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-400" />
            Platform Users
          </h3>
          <p className="text-navy-500 text-sm mt-0.5">{users.length} total accounts</p>
        </div>
        <button
          onClick={() => { setModalMode('create'); setEditUser(null); setModalError(''); }}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create User
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4" /> {error}
          <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-gray-900 border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {['User', 'Email', 'Role', 'Status', 'Invoices', 'Joined', 'Actions'].map(h => (
                  <th key={h} className="text-left text-navy-500 text-xs font-semibold uppercase tracking-wider px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-white/5">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-5 bg-white/5 animate-pulse rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-navy-600 text-sm">
                    <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    No users found
                  </td>
                </tr>
              ) : (
                users.map(u => (
                  <tr key={u.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                    {/* Avatar + Name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-brand-300 text-xs font-bold">
                            {u.name?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-white text-sm font-medium max-w-[140px] truncate">
                          {u.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-navy-400 text-sm">{u.email}</td>
                    <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <StatusToggle
                          userId={u.id}
                          status={u.status}
                          onToggle={handleToggleStatus}
                          disabled={togglingId === u.id}
                        />
                        <span className={`text-xs ${u.status === 'active' ? 'text-green-400' : 'text-red-400'}`}>
                          {u.status === 'active' ? 'Active' : 'Suspended'}
                        </span>
                      </div>
                    </td>
                    {/* Invoice Count Badge */}
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-navy-900 rounded-full text-white text-xs font-bold">
                        {u.invoices_processed}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-navy-500 text-sm">
                      {new Date(u.created_at).toLocaleDateString('en-IN')}
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setEditUser(u); setModalMode('edit'); setModalError(''); }}
                          className="p-1.5 text-navy-500 hover:text-brand-400 hover:bg-brand-500/10 rounded-lg transition-colors"
                          title="Edit user"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(u.id)}
                          disabled={deletingId === u.id}
                          className="p-1.5 text-navy-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete user"
                        >
                          {deletingId === u.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Trash2 className="w-3.5 h-3.5" />
                          }
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalMode && (
        <UserModal
          mode={modalMode}
          user={editUser}
          onSave={modalMode === 'create' ? handleCreate : handleEdit}
          onClose={() => { setModalMode(null); setEditUser(null); }}
          loading={saving}
          error={modalError}
        />
      )}
    </div>
  );
}
