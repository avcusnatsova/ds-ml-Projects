import { useLocation } from 'react-router-dom';
import { Bell, Search, UserCircle, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const location = useLocation();
  const { role } = useAuth();
  const path = location.pathname;
  
  let title = 'Dashboard';
  if (path.includes('/create')) title = 'Create Shipment';
  else if (path.includes('/upload')) title = 'Upload Documents';
  else if (path.includes('/tracking')) title = 'Live Tracking';
  else if (path.includes('/timeline')) title = 'Shipment Timeline';
  else if (path.includes('/alerts')) title = 'Alerts';
  else if (path.includes('/verify')) title = 'Final Verification';
  else if (path.includes('/analytics')) title = 'Analytics & Audit';
  else if (path.includes('/tamper')) title = 'Tamper Detection';

  return (
    <header className="bg-[#0a0a0b]/80 border-b border-white/10 h-16 flex items-center justify-between px-4 md:px-8 sticky top-0 z-10 backdrop-blur-md">
      <div className="flex items-center gap-3 pl-28">
        <h1 className="text-lg md:text-xl font-semibold text-white truncate">{title}</h1>
      </div>
      
      <div className="flex items-center gap-2 md:gap-6">
        <div className="relative hidden md:block">
          <Search className="w-5 h-5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search..." 
            className="pl-10 pr-4 py-2 border border-white/10 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent w-48 lg:w-64 bg-white/5 text-white placeholder-gray-500"
          />
        </div>
        <button className="relative p-2 text-gray-400 hover:text-white transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-[#0a0a0b]"></span>
        </button>
        <div className="flex items-center gap-2 border-l pl-3 md:pl-6 border-white/10 cursor-pointer">
          <UserCircle className="w-8 h-8 text-white/80" />
          <div className="hidden sm:flex flex-col">
            <span className="text-sm font-medium text-white leading-tight">{role || 'Guest'}</span>
            <span className="text-xs text-gray-400">System User</span>
          </div>
        </div>
      </div>
    </header>
  );
}

