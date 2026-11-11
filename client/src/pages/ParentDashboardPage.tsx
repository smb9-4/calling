import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Bell,
  UserCheck,
  History,
  Mic
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { apiRequest } from '../services/api.js';
import { pushNotificationService } from '../services/pushNotification.js';
import type { CallHistoryItem } from '../types/index.js';

export const ParentDashboardPage: React.FC = () => {
  const { user, contacts } = useAuth();
  const [history, setHistory] = useState<CallHistoryItem[]>([]);
  const [pushStatus, setPushStatus] = useState<'prompt' | 'granted' | 'denied' | 'unsupported'>('prompt');
  const [micTestStatus, setMicTestStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
    checkNotificationStatus();
    pushNotificationService.registerServiceWorker();
  }, []);

  const checkNotificationStatus = () => {
    if (!('Notification' in window)) {
      setPushStatus('unsupported');
    } else if (Notification.permission === 'granted') {
      setPushStatus('granted');
    } else if (Notification.permission === 'denied') {
      setPushStatus('denied');
    } else {
      setPushStatus('prompt');
    }
  };

  const handleEnablePush = async () => {
    const success = await pushNotificationService.requestPermissionAndSubscribe();
    if (success) {
      setPushStatus('granted');
    } else {
      checkNotificationStatus();
    }
  };

  const handleTestMic = async () => {
    try {
      setMicTestStatus('Checking microphone...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      setMicTestStatus('Microphone is active! Ready to receive calls.');
      setTimeout(() => setMicTestStatus(null), 4000);
    } catch (e: any) {
      setMicTestStatus('Error: ' + e.message);
    }
  };

  const fetchHistory = async () => {
    try {
      const data = await apiRequest<{ history: CallHistoryItem[] }>('/calls/history');
      setHistory(data.history || []);
    } catch (e) {
      console.warn('Failed to fetch history:', e);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      
      {/* Top Institutional Maroon Banner */}
      <div className="bg-[#5b0d18] border border-[#480811] rounded-2xl p-6 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-14 h-14 rounded-full object-cover border-2 border-amber-300 shadow-md"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-[#7a1222] border-2 border-amber-300 flex items-center justify-center text-white text-xl font-bold">
              {user?.name ? user.name[0] : 'P'}
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase bg-amber-400 text-[#4a0812] px-2 py-0.5 rounded tracking-wider">
                PARENT PORTAL
              </span>
              <span className="text-xs text-rose-200/90 font-mono">
                UID: {user?.uid}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
              {user?.name}
            </h1>
            <p className="text-xs text-rose-200/80 mt-0.5">
              SIR MV PU COLLEGE • Verified Parent Account
            </p>
          </div>
        </div>

        <div className="self-start sm:self-auto">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#dcfce7] border border-emerald-300 text-emerald-900 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Ready for Calls
          </span>
        </div>
      </div>

      {/* Background Alerts Notification Card */}
      {pushStatus !== 'granted' && (
        <div className="bg-[#fffefb] border-2 border-amber-300 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-900 shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#3a070f]">
                Enable Smartphone Incoming Call Alerts
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                Allows your phone to ring and notify you when your child calls, even if this browser tab is minimized.
              </div>
            </div>
          </div>

          <button
            onClick={handleEnablePush}
            className="px-5 py-2.5 bg-[#801020] hover:bg-[#680b18] text-white rounded-xl text-xs font-bold shrink-0 shadow-sm cursor-pointer"
          >
            Enable Phone Alerts
          </button>
        </div>
      )}

      {/* Linked Children Cards */}
      <div className="bg-[#fffefb] border border-[#e8dfcf] rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#f0e9dc]">
          <UserCheck className="w-5 h-5 text-[#801020]" />
          <h2 className="text-base font-black text-[#3a070f] uppercase tracking-wide">
            Registered Children (Authorized Student Callers)
          </h2>
        </div>

        {contacts.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No student linked to this parent account. Please contact college warden.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {contacts.map((student) => (
              <div
                key={student.uid}
                className="bg-[#fffcf7] border border-[#e8dfcf] rounded-xl p-4 flex items-center gap-3.5 shadow-sm"
              >
                {student.avatarUrl ? (
                  <img
                    src={student.avatarUrl}
                    alt={student.name}
                    className="w-13 h-13 rounded-xl object-cover border border-[#d8cbb7]"
                  />
                ) : (
                  <div className="w-13 h-13 rounded-xl bg-[#5b0d18] flex items-center justify-center font-bold text-white text-base">
                    {student.name[0]}
                  </div>
                )}

                <div>
                  <div className="font-bold text-[#2e050c] text-base">
                    {student.name}
                  </div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">
                    Roll No: {student.rollNumber || 'N/A'}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-[#fde8eb] text-[#720e1e] border border-[#f8c5cc]">
                      Authorized Student
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      UID: {student.uid}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Microphone Diagnostic Test Button */}
        <div className="mt-6 pt-4 border-t border-[#f0e9dc] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="text-slate-600 flex items-center gap-1.5">
            <Smartphone className="w-4 h-4 text-emerald-700" />
            <span>Keep this webpage open in your browser tab to receive calls directly.</span>
          </div>

          <button
            onClick={handleTestMic}
            className="px-3.5 py-2 rounded-xl bg-[#fff9f4] hover:bg-[#faeee4] text-[#720e1e] border border-[#e8dfcf] font-bold text-xs cursor-pointer inline-flex items-center gap-1.5"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Test Phone Mic</span>
          </button>
        </div>

        {micTestStatus && (
          <div className="mt-3 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300 p-2.5 rounded-xl">
            {micTestStatus}
          </div>
        )}
      </div>

      {/* Recent Calls Log */}
      <div className="bg-[#fffefb] border border-[#e8dfcf] rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#f0e9dc]">
          <History className="w-5 h-5 text-[#801020]" />
          <h2 className="text-base font-black text-[#3a070f] uppercase tracking-wide">
            Recent Voice Calls
          </h2>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            No past calls recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-[#f0e9dc]">
            {history.slice(0, 5).map((call) => (
              <div key={call.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-[#2e050c]">
                    {call.studentName || 'Student'} ({call.studentRoll || 'N/A'})
                  </div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">
                    {new Date(call.initiated_at).toLocaleDateString()} • {new Date(call.initiated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-slate-700">
                    {call.duration_seconds > 0 ? `${call.duration_seconds}s` : '0s'}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${
                    call.status === 'ended' ? 'bg-[#dcfce7] text-emerald-900' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {call.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
