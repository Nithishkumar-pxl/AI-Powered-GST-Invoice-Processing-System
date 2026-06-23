// ============================================================
// pages/LoginPage.jsx — Authentication Screen
// ============================================================

import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { FileText, Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [form, setForm]       = useState({ email: '', password: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode]       = useState('login'); // 'login' | 'register'
  const [regForm, setRegForm] = useState({ name: '', email: '', password: '' });

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post('/api/auth/login', form);
      login(res.data.user, res.data.token);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await axios.post('/api/auth/register', regForm);
      setMode('login');
      setForm({ email: regForm.email, password: '' });
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-500 rounded-2xl mb-4 shadow-lg shadow-brand-500/30">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">GSTract</h1>
          <p className="text-navy-300 mt-1 text-sm">AI-Powered Invoice Processing System</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8 shadow-2xl">
          {/* Tab Toggle */}
          <div className="flex bg-white/5 rounded-xl p-1 mb-6">
            {['login', 'register'].map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                  mode === m
                    ? 'bg-brand-500 text-white shadow'
                    : 'text-navy-300 hover:text-white'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          {/* Error Alert */}
          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 mb-5 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Login Form */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-navy-300 text-xs font-semibold uppercase tracking-wider mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400" />
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={e => setForm({...form, email: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-navy-500 text-sm focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
                    placeholder="you@company.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-navy-300 text-xs font-semibold uppercase tracking-wider mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400" />
                  <input
                    type="password"
                    required
                    value={form.password}
                    onChange={e => setForm({...form, password: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-navy-500 text-sm focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
                    placeholder="••••••••"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 mt-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
          )}

          {/* Register Form */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              {[
                { label: 'Full Name', key: 'name', type: 'text', placeholder: 'Jane Doe' },
                { label: 'Email',     key: 'email', type: 'email', placeholder: 'you@company.com' },
                { label: 'Password', key: 'password', type: 'password', placeholder: 'Min 8 characters' },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="block text-navy-300 text-xs font-semibold uppercase tracking-wider mb-2">{label}</label>
                  <input
                    type={type}
                    required
                    value={regForm[key]}
                    onChange={e => setRegForm({...regForm, [key]: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-navy-500 text-sm focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
                    placeholder={placeholder}
                  />
                </div>
              ))}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {loading ? 'Creating account…' : 'Create Account'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-navy-500 text-xs mt-6">
          Default admin: admin@gstextract.com
        </p>
      </div>
    </div>
  );
}
