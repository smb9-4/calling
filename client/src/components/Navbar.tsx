import React from 'react';
import { Menu, Bell, ChevronDown, RefreshCw, PhoneCall } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

export const Navbar: React.FC<{ onSwitchAccountClick?: () => void; onToggleSidebar?: () => void }> = ({
  onSwitchAccountClick,
  onToggleSidebar
}) => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <header className="h-14 sm:h-16 bg-[#4a0812] border-b border-[#3b060e] text-white px-3 sm:px-6 flex items-center justify-between select-none shadow-md z-30 shrink-0">
      
      {/* Left: Hamburger & College Crest & Title */}
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg hover:bg-white/10 text-white/90 hover:text-white transition-colors cursor-pointer"
          title="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* College Emblem Crest */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#6a101f] border-2 border-amber-400/80 flex items-center justify-center shadow-inner overflow-hidden shrink-0">
            <span className="text-amber-300 font-serif font-black text-xs sm:text-sm tracking-tighter">
              MV
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm sm:text-base tracking-wider text-white uppercase font-sans">
                SIR MV PU COLLEGE
              </span>
              <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-200 text-[10px] font-bold tracking-wide uppercase">
                <PhoneCall className="w-2.5 h-2.5" />
                Parent-Connect
              </span>
            </div>
            <div className="text-[10px] text-rose-200/70 hidden sm:block tracking-wide">
              Official Campus Internet Voice Calling Portal
            </div>
          </div>
        </div>
      </div>

      {/* Right: Notifications & Student Section Badge */}
      <div className="flex items-center gap-2 sm:gap-4">
        
        {/* Switch Account button for testing */}
        {onSwitchAccountClick && (
          <button
            onClick={onSwitchAccountClick}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs text-rose-100 font-medium transition-all cursor-pointer"
            title="Switch User / Role"
          >
            <RefreshCw className="w-3 h-3 text-amber-300" />
            <span>Switch Role</span>
          </button>
        )}

        {/* Notifications Icon with Badge */}
        <div className="relative p-1.5 rounded-full hover:bg-white/10 cursor-pointer text-white/90">
          <Bell className="w-5 h-5" />
          <span className="absolute 1 top-0 right-0 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border border-[#4a0812]">
            3
          </span>
        </div>

        {/* User Pill from Screenshot */}
        <div
          onClick={onSwitchAccountClick}
          className="flex items-center gap-2.5 pl-2 pr-3 py-1 rounded-2xl bg-black/25 hover:bg-black/35 border border-white/10 cursor-pointer transition-colors"
        >
          {/* Blue Avatar Circle with Role Letter */}
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#0088cc] flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-sm">
            {user.role === 'student' ? 'S' : user.role === 'parent' ? 'P' : 'A'}
          </div>

          <div className="text-left hidden sm:block leading-tight">
            <div className="text-xs font-bold text-white tracking-tight">
              {user.role === 'student' ? 'Student Section' : user.role === 'parent' ? 'Parent Portal' : 'Admin Section'}
            </div>
            <div className="text-[10px] text-amber-300 font-bold uppercase tracking-wider">
              {user.role}
            </div>
          </div>

          <ChevronDown className="w-3.5 h-3.5 text-white/70" />
        </div>
      </div>
    </header>
  );
};
