import React from 'react';
import {
  PhoneCall,
  LayoutGrid,
  Megaphone,
  BookOpen,
  Calendar,
  Users,
  Power
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

export const Sidebar: React.FC<{ activeMenu?: string; onMenuChange?: (menu: string) => void }> = ({
  activeMenu = 'calling',
  onMenuChange,
}) => {
  const { user, logout } = useAuth();

  const navItems = [
    { id: 'dashboard', icon: LayoutGrid, label: 'Portal Home' },
    { id: 'calling', icon: PhoneCall, label: 'Parent-Connect', active: true },
    { id: 'announcements', icon: Megaphone, label: 'Announcements' },
    { id: 'academics', icon: BookOpen, label: 'Academics' },
    { id: 'schedule', icon: Calendar, label: 'Hostel Calling Schedule' },
    { id: 'contacts', icon: Users, label: 'Family Directory' },
  ];

  return (
    <aside className="w-16 sm:w-18 bg-[#430710] flex flex-col items-center py-4 justify-between shrink-0 select-none shadow-xl border-r border-[#35050c]">
      {/* Top Section with User Avatar */}
      <div className="flex flex-col items-center gap-6 w-full">
        <div className="relative group cursor-pointer">
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-10 h-10 rounded-full object-cover border-2 border-white/80 shadow-md group-hover:scale-105 transition-transform"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#6a101f] border-2 border-white/80 flex items-center justify-center text-white font-bold text-sm shadow-md">
              {user?.name ? user.name[0] : 'U'}
            </div>
          )}
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#430710] rounded-full" />
        </div>

        {/* Navigation Icon List */}
        <nav className="flex flex-col items-center gap-2.5 w-full px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isSelected = activeMenu === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onMenuChange && onMenuChange(item.id)}
                title={item.label}
                className={`relative w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white text-[#540c17] shadow-lg scale-105'
                    : 'text-rose-200/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className={`w-5 h-5 ${isSelected ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
                {item.id === 'calling' && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Power / Logout Button */}
      <div className="flex flex-col items-center gap-3 w-full px-2">
        <button
          onClick={logout}
          title="Sign Out"
          className="w-10 h-10 rounded-full border border-rose-400/40 hover:border-rose-400 flex items-center justify-center text-rose-300 hover:text-white hover:bg-rose-600/30 transition-all cursor-pointer"
        >
          <Power className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
