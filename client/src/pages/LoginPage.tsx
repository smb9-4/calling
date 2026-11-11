import React, { useState } from 'react';
import { Shield, User, Lock, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

const DEMO_ACCOUNTS = [
  {
    role: 'student',
    title: 'Student Aarav Sharma',
    identifier: '24CSE042',
    password: 'Password123!',
    tag: 'Roll: 24CSE042',
    desc: 'Linked to Father Rajesh & Mother Sunita'
  },
  {
    role: 'parent',
    title: 'Father Rajesh Sharma',
    identifier: 'PAR-2001',
    password: 'Password123!',
    tag: 'Parent UID: PAR-2001',
    desc: 'Receives calls on phone from student Aarav'
  },
  {
    role: 'parent',
    title: 'Mother Sunita Sharma',
    identifier: 'PAR-2002',
    password: 'Password123!',
    tag: 'Parent UID: PAR-2002',
    desc: 'Receives calls on phone from student Aarav'
  },
  {
    role: 'student',
    title: 'Student Diya Patel',
    identifier: '24CSE089',
    password: 'Password123!',
    tag: 'Roll: 24CSE089',
    desc: 'Linked to Father Vikram'
  },
  {
    role: 'admin',
    title: 'Hostel Warden (Dr. Rao)',
    identifier: 'ADM-0001',
    password: 'AdminPassword123!',
    tag: 'Admin UID: ADM-0001',
    desc: 'Hostel Administrator / Schedule Manager'
  }
];

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await login(identifier, password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (acc: typeof DEMO_ACCOUNTS[0]) => {
    setIdentifier(acc.identifier);
    setPassword(acc.password);
    setError(null);
    setIsLoading(true);
    try {
      await login(acc.identifier, acc.password);
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f1e8] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* College Emblem & Branding */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-18 h-18 rounded-full bg-[#5b0d18] border-3 border-amber-400 mx-auto flex items-center justify-center text-amber-300 font-serif font-black text-2xl shadow-lg">
          MV
        </div>
        <h2 className="mt-4 text-2xl sm:text-3xl font-black text-[#430710] tracking-wider uppercase font-sans">
          SIR MV PU COLLEGE
        </h2>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#5b0d18] text-white text-xs font-bold uppercase tracking-wider mt-2 shadow-sm">
          <span>Parent-Connect Portal</span>
        </div>
        <p className="mt-2 text-xs text-slate-600 max-w-sm mx-auto">
          Private, internet-based encrypted voice link between hostel students and registered parents.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#fffefb] border border-[#e8dfcf] py-8 px-6 sm:px-10 rounded-2xl shadow-md">
          
          {error && (
            <div className="mb-6 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Roll Number or UID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. 24CSE042 or PAR-2001"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full bg-[#fffcf7] border border-[#d8cbb7] rounded-xl py-2.5 pl-10 pr-4 text-slate-900 text-sm focus:outline-none focus:border-[#720e1e] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  placeholder="Password123!"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#fffcf7] border border-[#d8cbb7] rounded-xl py-2.5 pl-10 pr-4 text-slate-900 text-sm focus:outline-none focus:border-[#720e1e] transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 bg-[#801020] hover:bg-[#680b18] active:scale-98 text-white rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>{isLoading ? 'Signing In...' : 'Sign In to Parent-Connect'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick 1-Click Demo Accounts */}
          <div className="mt-6 pt-5 border-t border-[#f0e9dc]">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#801020] uppercase tracking-wider mb-2.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Quick 1-Click Test Sign-In</span>
            </div>

            <div className="space-y-2">
              {DEMO_ACCOUNTS.map((acc, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickLogin(acc)}
                  className="w-full p-2.5 rounded-xl bg-[#fffcf7] hover:bg-[#f6eee3] border border-[#e8dfcf] text-left flex items-center justify-between transition-all cursor-pointer group"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#3a070f] group-hover:text-[#801020]">
                        {acc.title}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#f2e9dc] text-slate-700">
                        {acc.tag}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {acc.desc}
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#801020]" />
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-700" />
            <span>Encrypted WebRTC Audio • No SIM or Mobile Recharge Required</span>
          </div>
        </div>
      </div>
    </div>
  );
};
