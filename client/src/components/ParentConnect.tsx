import React, { useState, useEffect } from 'react';
import {
  Phone,
  ArrowLeft,
  ShieldCheck,
  AlertCircle,
  Wifi,
  WifiOff,
  UserCheck,
  Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useCall } from '../context/CallContext.js';
import { apiRequest } from '../services/api.js';
import type { Contact, CallHistoryItem } from '../types/index.js';

export const ParentConnect: React.FC = () => {
  const { user, contacts } = useAuth();
  const { initiateCall, activeCall } = useCall();
  const [scheduleInfo, setScheduleInfo] = useState<any>(null);
  const [history, setHistory] = useState<CallHistoryItem[]>([]);
  const [selectedParent, setSelectedParent] = useState<Contact | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchAvailability();
    fetchHistory();
  }, []);

  useEffect(() => {
    if (contacts.length > 0 && !selectedParent) {
      setSelectedParent(contacts[0]);
    }
  }, [contacts]);

  const fetchAvailability = async () => {
    try {
      const data = await apiRequest('/calls/availability');
      setScheduleInfo(data.schedule);
    } catch (e: any) {
      console.warn('Error fetching availability:', e);
    }
  };

  const fetchHistory = async () => {
    try {
      const data = await apiRequest<{ history: CallHistoryItem[] }>('/calls/history');
      setHistory(data.history || []);
    } catch (e) {
      console.warn('Error fetching call history:', e);
    }
  };

  const handleCallParent = async (parent: Contact) => {
    setErrorMessage(null);
    setLoadingAction(parent.uid);
    try {
      if (scheduleInfo && !scheduleInfo.isAllowed) {
        setErrorMessage(scheduleInfo.reason || 'Calling is currently outside permitted hours.');
        return;
      }
      await initiateCall(parent.uid, parent.name, parent.relationship, parent.avatarUrl);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to initiate call.');
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* 1. Top Maroon Header Banner from Screenshot */}
      <div className="bg-[#5b0d18] border border-[#480811] rounded-2xl px-5 py-4 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-full bg-[#480811] border border-white/20 flex items-center justify-center text-white/90 shadow-sm cursor-pointer hover:bg-white/10 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-wide uppercase text-white font-sans">
              Parent-Connect: Voice Calling & Family Link
            </h1>
            <p className="text-xs text-rose-200/80 mt-0.5">
              Secure, private, internet-based encrypted voice channel to verified parents • No SIM required
            </p>
          </div>
        </div>

        {/* Right Green Schedule Status Badge */}
        <div className="self-start md:self-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#dcfce7] border border-emerald-300 text-emerald-900 text-xs font-bold shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              {scheduleInfo?.isAllowed
                ? `Calling Window: Active (${scheduleInfo.schedule?.startTime || '06:00'} - ${scheduleInfo.schedule?.endTime || '23:59'})`
                : 'Calling Window: Restricted by Hostel'}
            </span>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-semibold flex items-center gap-3 animate-fade-in shadow-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 2. Main Beige/Cream Institutional Card from Screenshot */}
      <div className="bg-[#fffefb] border border-[#e8dfcf] rounded-2xl p-6 sm:p-8 shadow-sm">
        
        {/* Top Card Row */}
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 border-b border-[#f0e9dc] pb-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-[#6a101f] text-white text-[10px] font-extrabold uppercase tracking-wider">
                REGISTERED STUDENT
              </span>
              <span className="text-xs font-mono font-bold text-slate-500">
                Roll No: {user?.rollNumber || '24CSE042'}
              </span>
              <span className="text-xs text-slate-300">•</span>
              <span className="text-xs font-mono text-slate-500">
                UID: {user?.uid || 'STU-1001'}
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-[#3a070f] tracking-tight">
              {user?.name || 'Aarav Sharma'}
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Authorized hostel voice terminal. Directly linked to verified parent accounts. All communications operate over direct peer-to-peer WebRTC audio streams without telephone routing or recordings.
            </p>
          </div>

          {/* Metric Stats Cards on the Right (from Screenshot) */}
          <div className="grid grid-cols-3 gap-3 shrink-0 self-stretch lg:self-auto">
            <div className="bg-[#fffcf7] border border-[#e8dfcf] rounded-xl p-3.5 text-center min-w-[95px]">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">STATUS</div>
              <div className="text-xl sm:text-2xl font-black text-[#5b0d18] mt-1">ONLINE</div>
              <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">Terminal Ready</div>
            </div>

            <div className="bg-[#fffcf7] border border-[#e8dfcf] rounded-xl p-3.5 text-center min-w-[95px]">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">MAX CALL</div>
              <div className="text-xl sm:text-2xl font-black text-[#5b0d18] mt-1">
                {scheduleInfo?.schedule?.maxDurationMinutes || 15}m
              </div>
              <div className="text-[10px] text-slate-500 font-semibold mt-0.5">Per Session</div>
            </div>

            <div className="bg-[#fffcf7] border border-[#e8dfcf] rounded-xl p-3.5 text-center min-w-[95px]">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">SECURITY</div>
              <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">100%</div>
              <div className="text-[10px] text-slate-500 font-semibold mt-0.5">P2P Encrypted</div>
            </div>
          </div>
        </div>

        {/* Middle Section: Authorized Parent Contacts Selector */}
        <div className="mt-6 pt-2">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs font-extrabold uppercase tracking-wider text-[#5b0d18] flex items-center gap-1.5">
              <UserCheck className="w-4 h-4" />
              <span>Authorized Parent Relationships ({contacts.length})</span>
            </div>
            <span className="text-xs text-slate-500">
              Select a parent to initiate an encrypted voice call
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contacts.map((parent) => {
              const isSelected = selectedParent?.uid === parent.uid;
              const isOnline = parent.isOnline;

              return (
                <div
                  key={parent.uid}
                  onClick={() => setSelectedParent(parent)}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-[#fff9f4] border-[#720e1e] shadow-sm'
                      : 'bg-[#fffdfa] border-[#e8dfcf] hover:border-[#cbba9e]'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="relative">
                      {parent.avatarUrl ? (
                        <img
                          src={parent.avatarUrl}
                          alt={parent.name}
                          className="w-13 h-13 rounded-xl object-cover border border-[#d8cbb7]"
                        />
                      ) : (
                        <div className="w-13 h-13 rounded-xl bg-[#5b0d18] text-white flex items-center justify-center font-bold text-lg">
                          {parent.name[0]}
                        </div>
                      )}
                      <span
                        className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
                          isOnline ? 'bg-emerald-500' : 'bg-slate-400'
                        }`}
                      />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-[#2e050c] text-base">
                          {parent.name}
                        </h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#fde8eb] text-[#720e1e] border border-[#f8c5cc]">
                          {parent.relationship || 'Parent'}
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 font-mono mt-0.5">
                        UID: {parent.uid}
                      </div>

                      <div className="text-[11px] mt-1 font-semibold flex items-center gap-1.5">
                        {isOnline ? (
                          <span className="text-emerald-700 flex items-center gap-1">
                            <Wifi className="w-3 h-3" /> Smartphone Online (Ready to receive)
                          </span>
                        ) : (
                          <span className="text-slate-500 flex items-center gap-1">
                            <WifiOff className="w-3 h-3" /> Offline (Will trigger Web Push alert)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                      isSelected ? 'bg-[#720e1e] text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {isSelected ? 'Selected' : 'Select'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Red Maroon Action Button from Screenshot ("Open Detailed Review" button style) */}
        {selectedParent && (
          <div className="mt-8 pt-4 border-t border-[#f0e9dc] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-xs text-slate-600 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>
                Calling verified: <strong>{selectedParent.name}</strong> ({selectedParent.relationship})
              </span>
            </div>

            <button
              onClick={() => handleCallParent(selectedParent)}
              disabled={Boolean(activeCall) || (scheduleInfo && !scheduleInfo.isAllowed)}
              className={`px-8 py-3.5 rounded-full font-bold text-sm text-white shadow-md flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
                activeCall
                  ? 'bg-slate-400 cursor-not-allowed'
                  : scheduleInfo && !scheduleInfo.isAllowed
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-[#981427] hover:bg-[#801020] active:scale-98 shadow-[#981427]/30'
              }`}
            >
              <Phone className="w-4 h-4" />
              <span>
                {loadingAction === selectedParent.uid
                  ? 'Initiating Encrypted Call...'
                  : `Open Voice Call with ${selectedParent.relationship || selectedParent.name}`}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* 4. Past Calling Records & Session Archives from Screenshot */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-black text-[#3a070f] uppercase tracking-wide">
              Past Calling Records & Session Archives
            </h3>
            <p className="text-xs text-slate-500">
              Evaluated WebRTC voice calling sessions between student tablet and parent smartphone
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-bold text-slate-600 bg-white border border-[#e8dfcf] px-3 py-1 rounded-lg">
              All Sessions ({history.length})
            </span>
          </div>
        </div>

        {/* Two-Column Cards Layout from Screenshot */}
        {history.length === 0 ? (
          <div className="bg-[#fffefb] border border-[#e8dfcf] rounded-2xl p-8 text-center text-slate-500 text-xs font-medium">
            No past calls recorded for this student terminal.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {history.slice(0, 4).map((call, idx) => (
              <div
                key={call.id || idx}
                className="bg-[#fffefb] border border-[#e8dfcf] rounded-2xl p-5 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded bg-amber-100 text-amber-900 font-extrabold text-[10px] uppercase">
                    VOICE SESSION
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    {new Date(call.initiated_at).toLocaleDateString()} • {new Date(call.initiated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="text-base font-bold text-[#2e050c]">
                  Call with {call.parentName || 'Parent'} ({call.relationship || 'Guardian'})
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#f0e9dc] text-center">
                  <div className="bg-[#fffcf7] p-2 rounded-lg border border-[#e8dfcf]">
                    <div className="text-[9px] font-bold text-slate-500 uppercase">DURATION</div>
                    <div className="text-xs font-mono font-black text-[#5b0d18] mt-0.5">
                      {call.duration_seconds > 0 ? `${call.duration_seconds}s` : '0s'}
                    </div>
                  </div>

                  <div className="bg-[#fffcf7] p-2 rounded-lg border border-[#e8dfcf]">
                    <div className="text-[9px] font-bold text-slate-500 uppercase">STATUS</div>
                    <div className="text-xs font-bold text-emerald-800 capitalize mt-0.5">
                      {call.status}
                    </div>
                  </div>

                  <div className="bg-[#fffcf7] p-2 rounded-lg border border-[#e8dfcf]">
                    <div className="text-[9px] font-bold text-slate-500 uppercase">REASON</div>
                    <div className="text-xs font-medium text-slate-600 truncate mt-0.5">
                      {call.end_reason || 'Normal'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Security Footer Notice */}
      <div className="bg-[#f0e8db] border border-[#d8cbb7] rounded-xl p-3.5 text-xs text-slate-700 flex items-center gap-2">
        <Info className="w-4 h-4 text-[#720e1e] shrink-0" />
        <span>
          <strong>Campus Security Notice:</strong> All voice streams are peer-to-peer encrypted between devices. No audio conversations are recorded, intercepted, or archived.
        </span>
      </div>
    </div>
  );
};
