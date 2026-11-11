import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { CallProvider } from './context/CallContext.js';
import { Navbar } from './components/Navbar.js';
import { Sidebar } from './components/Sidebar.js';
import { IncomingCallModal } from './components/IncomingCallModal.js';
import { InCallScreen } from './components/InCallScreen.js';
import { LoginPage } from './pages/LoginPage.js';
import { StudentDashboardPage } from './pages/StudentDashboardPage.js';
import { ParentDashboardPage } from './pages/ParentDashboardPage.js';
import { AdminDashboardPage } from './pages/AdminDashboardPage.js';
import { X, Sparkles, ArrowRight } from 'lucide-react';

const SWITCH_OPTIONS = [
  { role: 'student', title: 'Student Aarav Sharma', id: '24CSE042', pw: 'Password123!', tag: 'Student (Roll: 24CSE042)' },
  { role: 'parent', title: 'Father Rajesh Sharma', id: 'PAR-2001', pw: 'Password123!', tag: 'Parent (UID: PAR-2001)' },
  { role: 'parent', title: 'Mother Sunita Sharma', id: 'PAR-2002', pw: 'Password123!', tag: 'Parent (UID: PAR-2002)' },
  { role: 'student', title: 'Student Diya Patel', id: '24CSE089', pw: 'Password123!', tag: 'Student (Roll: 24CSE089)' },
  { role: 'admin', title: 'Hostel Warden (Dr. Rao)', id: 'ADM-0001', pw: 'AdminPassword123!', tag: 'Hostel Admin' },
];

const MainContent: React.FC = () => {
  const { user, isLoading, login } = useAuth();
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f6f1e8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#720e1e] border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-600 text-xs tracking-wider uppercase font-bold">
            Loading SIR MV Parent-Connect...
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-[#f6f1e8] text-slate-800 flex flex-col font-sans">
      {/* Top Header Navbar */}
      <Navbar
        onSwitchAccountClick={() => setShowSwitchModal(true)}
        onToggleSidebar={() => setSidebarOpen(prev => !prev)}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Vertical Maroon Sidebar */}
        {sidebarOpen && (
          <Sidebar activeMenu="calling" />
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto">
          {user.role === 'student' && <StudentDashboardPage />}
          {user.role === 'parent' && <ParentDashboardPage />}
          {user.role === 'admin' && <AdminDashboardPage />}
        </main>
      </div>

      {/* Global In-Call Overlay */}
      <InCallScreen />

      {/* Global Incoming Call Alert Modal */}
      <IncomingCallModal />

      {/* Role Switching Sheet for Instant Testing */}
      {showSwitchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#fffefb] border-2 border-[#e8dfcf] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#f0e9dc]">
              <div className="flex items-center gap-2 text-[#720e1e] text-sm font-black uppercase">
                <Sparkles className="w-4 h-4" />
                <span>Switch Testing Role</span>
              </div>
              <button
                onClick={() => setShowSwitchModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mt-2 mb-4">
              Switch immediately between student tablet terminal and parent smartphone mode:
            </p>

            <div className="space-y-2">
              {SWITCH_OPTIONS.map((opt, i) => (
                <button
                  key={i}
                  onClick={async () => {
                    setShowSwitchModal(false);
                    await login(opt.id, opt.pw);
                  }}
                  className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                    user.uid === opt.id || user.rollNumber === opt.id
                      ? 'bg-[#fde8eb] border-[#720e1e] text-[#720e1e] font-bold'
                      : 'bg-[#fffcf7] hover:bg-[#f6eee3] border-[#e8dfcf] text-slate-800'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold">{opt.title}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{opt.tag}</div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-[#720e1e]" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <CallProvider>
        <MainContent />
      </CallProvider>
    </AuthProvider>
  );
}
