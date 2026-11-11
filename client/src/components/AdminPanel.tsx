import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Clock,
  PhoneCall,
  Users,
  CheckCircle,
  Save,
  Plus,
  Radio
} from 'lucide-react';
import { apiRequest } from '../services/api.js';
import type { CallHistoryItem, ScheduleRule } from '../types/index.js';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'monitor' | 'schedules' | 'relationships' | 'history'>('monitor');
  const [stats, setStats] = useState<any>(null);
  const [activeCalls, setActiveCalls] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<ScheduleRule[]>([]);
  const [relationships, setRelationships] = useState<any[]>([]);
  const [callHistory, setCallHistory] = useState<CallHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // New relationship form
  const [newRelStudent, setNewRelStudent] = useState('');
  const [newRelParent, setNewRelParent] = useState('');
  const [newRelType, setNewRelType] = useState('Father');

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const overview = await apiRequest('/admin/overview');
      setStats(overview.stats);
      setActiveCalls(overview.activeCalls || []);

      const schedData = await apiRequest<{ schedules: ScheduleRule[] }>('/admin/schedules');
      setSchedules(schedData.schedules || []);

      const relData = await apiRequest<{ relationships: any[] }>('/admin/relationships');
      setRelationships(relData.relationships || []);

      const histData = await apiRequest<{ history: CallHistoryItem[] }>('/admin/calls');
      setCallHistory(histData.history || []);
    } catch (e) {
      console.warn('Failed to load admin data:', e);
    }
  };

  const handleUpdateSchedule = async (schedule: ScheduleRule) => {
    try {
      setLoading(true);
      await apiRequest(`/admin/schedules/${schedule.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          max_duration_minutes: schedule.max_duration_minutes,
          is_active: schedule.is_active
        })
      });
      setSaveMessage(`Schedule for ${DAYS[schedule.day_of_week]} updated successfully.`);
      setTimeout(() => setSaveMessage(null), 3000);
      loadData();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRelationship = async (relId: number, currentStatus: boolean) => {
    try {
      await apiRequest(`/admin/relationships/${relId}/toggle`, {
        method: 'PUT',
        body: JSON.stringify({ isAuthorized: !currentStatus })
      });
      loadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleAddRelationship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRelStudent || !newRelParent) return;
    try {
      await apiRequest('/admin/relationships', {
        method: 'POST',
        body: JSON.stringify({
          studentUid: newRelStudent.trim(),
          parentUid: newRelParent.trim(),
          relationship: newRelType
        })
      });
      setNewRelStudent('');
      setNewRelParent('');
      setSaveMessage('New relationship authorized successfully.');
      setTimeout(() => setSaveMessage(null), 3000);
      loadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Admin Maroon Banner */}
      <div className="bg-[#5b0d18] border border-[#480811] rounded-2xl px-5 py-4 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-full bg-[#480811] border border-white/20 flex items-center justify-center text-white/90">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-wide uppercase text-white font-sans">
              Parent-Connect: Hostel Warden & Administration
            </h1>
            <p className="text-xs text-rose-200/80 mt-0.5">
              Configure calling schedules, monitor active sessions, and authorize student-parent links
            </p>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex flex-wrap items-center bg-[#430710] p-1 rounded-xl border border-white/10 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('monitor')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'monitor' ? 'bg-white text-[#5b0d18] shadow' : 'text-rose-100/80 hover:text-white'
            }`}
          >
            <Radio className="w-3 h-3 text-rose-500 animate-pulse" />
            Live Monitor ({activeCalls.length})
          </button>
          <button
            onClick={() => setActiveTab('schedules')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'schedules' ? 'bg-white text-[#5b0d18] shadow' : 'text-rose-100/80 hover:text-white'
            }`}
          >
            <Clock className="w-3 h-3" />
            Calling Schedule
          </button>
          <button
            onClick={() => setActiveTab('relationships')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'relationships' ? 'bg-white text-[#5b0d18] shadow' : 'text-rose-100/80 hover:text-white'
            }`}
          >
            <Users className="w-3 h-3" />
            Parent Linking
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'history' ? 'bg-white text-[#5b0d18] shadow' : 'text-rose-100/80 hover:text-white'
            }`}
          >
            <PhoneCall className="w-3 h-3" />
            Audit Logs
          </button>
        </div>
      </div>

      {saveMessage && (
        <div className="p-3 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-700" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* Top Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#fffefb] border border-[#e8dfcf] p-4 rounded-xl shadow-sm text-center">
          <div className="text-[10px] font-bold text-slate-500 uppercase">ACTIVE CALLS NOW</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{activeCalls.length}</div>
        </div>
        <div className="bg-[#fffefb] border border-[#e8dfcf] p-4 rounded-xl shadow-sm text-center">
          <div className="text-[10px] font-bold text-slate-500 uppercase">TOTAL LOGGED</div>
          <div className="text-2xl font-black text-[#5b0d18] mt-1">{stats?.totalCalls || 0}</div>
        </div>
        <div className="bg-[#fffefb] border border-[#e8dfcf] p-4 rounded-xl shadow-sm text-center">
          <div className="text-[10px] font-bold text-slate-500 uppercase">STUDENTS</div>
          <div className="text-2xl font-black text-slate-800 mt-1">{stats?.totalStudents || 0}</div>
        </div>
        <div className="bg-[#fffefb] border border-[#e8dfcf] p-4 rounded-xl shadow-sm text-center">
          <div className="text-[10px] font-bold text-slate-500 uppercase">PARENTS</div>
          <div className="text-2xl font-black text-slate-800 mt-1">{stats?.totalParents || 0}</div>
        </div>
      </div>

      {/* Tab 1: Live Monitor */}
      {activeTab === 'monitor' && (
        <div className="bg-[#fffefb] border border-[#e8dfcf] rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-[#3a070f] uppercase tracking-wide mb-4">
            Active Real-Time Voice Sessions
          </h3>
          {activeCalls.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-[#e8dfcf] rounded-xl">
              No voice calls currently active on the network.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeCalls.map((call) => (
                <div key={call.id} className="p-4 rounded-xl bg-[#fffcf7] border border-[#e8dfcf] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                    <div>
                      <div className="text-sm font-bold text-[#2e050c]">
                        {call.studentName} ({call.studentRoll}) 📞 {call.parentName}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Relation: {call.relationship || 'Parent'} • Status: <span className="text-emerald-800 font-bold capitalize">{call.status}</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full">
                    Streaming
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Calling Schedules */}
      {activeTab === 'schedules' && (
        <div className="bg-[#fffefb] border border-[#e8dfcf] rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-[#3a070f] uppercase tracking-wide">
            Administrator Calling Time Windows & Duration Limits
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f6eee3] text-slate-700 font-bold border-b border-[#e8dfcf]">
                <tr>
                  <th className="py-3 px-4 rounded-l-lg">Day of Week</th>
                  <th className="py-3 px-4">Start Time (24h)</th>
                  <th className="py-3 px-4">End Time (24h)</th>
                  <th className="py-3 px-4">Max Duration (Mins)</th>
                  <th className="py-3 px-4">Active</th>
                  <th className="py-3 px-4 rounded-r-lg text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0e9dc]">
                {schedules.map((sch) => (
                  <tr key={sch.id} className="hover:bg-[#fff9f4]">
                    <td className="py-3 px-4 font-bold text-[#2e050c]">{DAYS[sch.day_of_week]}</td>
                    <td className="py-3 px-4">
                      <input
                        type="time"
                        value={sch.start_time}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSchedules(prev => prev.map(s => s.id === sch.id ? { ...s, start_time: val } : s));
                        }}
                        className="bg-[#fffcf7] border border-[#d8cbb7] px-2 py-1 rounded text-slate-900 font-mono text-xs"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="time"
                        value={sch.end_time}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSchedules(prev => prev.map(s => s.id === sch.id ? { ...s, end_time: val } : s));
                        }}
                        className="bg-[#fffcf7] border border-[#d8cbb7] px-2 py-1 rounded text-slate-900 font-mono text-xs"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={sch.max_duration_minutes}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setSchedules(prev => prev.map(s => s.id === sch.id ? { ...s, max_duration_minutes: val } : s));
                        }}
                        className="bg-[#fffcf7] border border-[#d8cbb7] px-2 py-1 rounded text-slate-900 font-mono text-xs w-16"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={Boolean(sch.is_active)}
                        onChange={(e) => {
                          const val = e.target.checked ? 1 : 0;
                          setSchedules(prev => prev.map(s => s.id === sch.id ? { ...s, is_active: val } : s));
                        }}
                        className="w-4 h-4 rounded text-[#801020]"
                      />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleUpdateSchedule(sch)}
                        disabled={loading}
                        className="px-3 py-1 bg-[#801020] hover:bg-[#680b18] text-white rounded-lg text-xs font-bold cursor-pointer inline-flex items-center gap-1 shadow-sm"
                      >
                        <Save className="w-3 h-3" />
                        Save
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Parent Linking */}
      {activeTab === 'relationships' && (
        <div className="bg-[#fffefb] border border-[#e8dfcf] rounded-2xl p-6 shadow-sm space-y-6">
          <form onSubmit={handleAddRelationship} className="p-4 bg-[#fffcf7] border border-[#e8dfcf] rounded-xl flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-[#3a070f]">Link Parent & Student:</span>
            <input
              type="text"
              placeholder="Student UID (STU-1001)"
              value={newRelStudent}
              onChange={(e) => setNewRelStudent(e.target.value)}
              className="bg-white border border-[#d8cbb7] px-3 py-1.5 rounded-lg text-xs text-slate-800"
              required
            />
            <input
              type="text"
              placeholder="Parent UID (PAR-2001)"
              value={newRelParent}
              onChange={(e) => setNewRelParent(e.target.value)}
              className="bg-white border border-[#d8cbb7] px-3 py-1.5 rounded-lg text-xs text-slate-800"
              required
            />
            <select
              value={newRelType}
              onChange={(e) => setNewRelType(e.target.value)}
              className="bg-white border border-[#d8cbb7] px-3 py-1.5 rounded-lg text-xs text-slate-800 font-medium"
            >
              <option value="Father">Father</option>
              <option value="Mother">Mother</option>
              <option value="Guardian">Guardian</option>
            </select>
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#801020] hover:bg-[#680b18] text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Authorize Link
            </button>
          </form>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f6eee3] text-slate-700 font-bold border-b border-[#e8dfcf]">
                <tr>
                  <th className="py-3 px-4 rounded-l-lg">Student</th>
                  <th className="py-3 px-4">Roll No</th>
                  <th className="py-3 px-4">Parent</th>
                  <th className="py-3 px-4">Relationship</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 rounded-r-lg text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0e9dc]">
                {relationships.map((rel) => (
                  <tr key={rel.id} className="hover:bg-[#fff9f4]">
                    <td className="py-3 px-4 font-bold text-[#2e050c]">
                      {rel.studentName} <span className="text-slate-400 font-mono">({rel.studentUid})</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">{rel.studentRoll || '—'}</td>
                    <td className="py-3 px-4 font-bold text-[#2e050c]">
                      {rel.parentName} <span className="text-slate-400 font-mono">({rel.parentUid})</span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">{rel.relationship}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        rel.isAuthorized ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {rel.isAuthorized ? 'Authorized' : 'Blocked'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleToggleRelationship(rel.id, Boolean(rel.isAuthorized))}
                        className={`px-3 py-1 rounded text-xs font-bold cursor-pointer ${
                          rel.isAuthorized ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {rel.isAuthorized ? 'Revoke' : 'Authorize'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Audit Logs */}
      {activeTab === 'history' && (
        <div className="bg-[#fffefb] border border-[#e8dfcf] rounded-2xl p-6 shadow-sm overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f6eee3] text-slate-700 font-bold border-b border-[#e8dfcf]">
              <tr>
                <th className="py-3 px-4 rounded-l-lg">Time</th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Parent</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 rounded-r-lg">End Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0e9dc]">
              {callHistory.map((call) => (
                <tr key={call.id} className="hover:bg-[#fff9f4]">
                  <td className="py-3 px-4 text-slate-500 font-mono">
                    {new Date(call.initiated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-3 px-4 font-bold text-[#2e050c]">
                    {call.studentName} ({call.studentRoll})
                  </td>
                  <td className="py-3 px-4 text-slate-700">{call.parentName}</td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-700">
                    {call.duration_seconds > 0 ? `${call.duration_seconds}s` : '0s'}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                      call.status === 'ended' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {call.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500">{call.end_reason || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
