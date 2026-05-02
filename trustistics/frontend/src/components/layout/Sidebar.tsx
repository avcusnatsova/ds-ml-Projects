import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  PackagePlus, 
  FileUp, 
  MapPin, 
  Clock, 
  Bell, 
  ShieldCheck, 
  BarChart3,
  Thermometer,
  LogOut,
  ClipboardList,
  Truck,
  Building2,
  ShieldAlert
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const allNavItems = [
  // Supplier
  { name: 'Dashboard', path: '/supplier', icon: LayoutDashboard, roles: ['Supplier'] },
  { name: 'Create Shipment', path: '/supplier/create', icon: PackagePlus, roles: ['Supplier'] },
  { name: 'Upload Docs', path: '/supplier/upload', icon: FileUp, roles: ['Supplier'] },
  
  // Driver
  { name: 'Vehicle Manifest', path: '/driver', icon: Truck, roles: ['Driver'] },
  { name: 'Record Handoff', path: '/driver/handoff', icon: ClipboardList, roles: ['Driver'] },

  // Warehouse Manager
  { name: 'Warehouse Dashboard', path: '/warehouse', icon: Building2, roles: ['Warehouse Manager'] },
  { name: 'Storage Intake', path: '/warehouse/intake', icon: ClipboardList, roles: ['Warehouse Manager'] },

  // Customs Officer
  { name: 'Customs Dashboard', path: '/customs', icon: ShieldCheck, roles: ['Customs Officer'] },
  { name: 'Clearance Report', path: '/customs/clearance', icon: FileUp, roles: ['Customs Officer'] },

  // General Shared (for demo, let's keep them on Supplier or specific roles)
  { name: 'Live Tracking', path: '/supplier/tracking', icon: MapPin, roles: ['Supplier'] },
  { name: 'Timeline', path: '/supplier/timeline', icon: Clock, roles: ['Supplier'] },
  { name: 'Alerts', path: '/supplier/alerts', icon: Bell, roles: ['Supplier'] },
  { name: 'Analytics', path: '/supplier/analytics', icon: BarChart3, roles: ['Supplier'] },
  { name: 'Tamper Detection', path: '/supplier/tamper', icon: ShieldAlert, roles: ['Supplier'] },
];



export function Sidebar({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (val: boolean) => void }) {
  const location = useLocation();
  const { role, logout } = useAuth();

  const allowedItems = allNavItems.filter(item => role && item.roles.includes(role));

  return (
    <aside className={cn(
      "w-64 bg-slate-900 text-white h-screen flex flex-col fixed left-0 top-0 z-50 transition-transform duration-300 lg:translate-x-0",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      <div className="p-6 flex flex-col gap-4 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Thermometer className="w-8 h-8 text-teal-400" />
            <span className="text-xl font-bold tracking-wider text-white">Trust<span className="text-teal-400">istics</span></span>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-2 text-slate-400 hover:text-white"
          >
            <ShieldAlert className="w-6 h-6" />
          </button>
        </div>
        {role && (
          <div className="inline-flex items-center justify-center px-3 py-1 bg-teal-500/20 text-teal-400 text-xs font-semibold rounded-full border border-teal-500/30">
            {role} View
          </div>
        )}
      </div>

      <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto custom-scrollbar">
        {allowedItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || (location.pathname.startsWith(item.path) && item.path !== '/supplier' && item.path !== '/driver' && item.path !== '/warehouse' && item.path !== '/customs');
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                isActive 
                  ? "bg-teal-600 text-white" 
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button 
          onClick={() => logout && logout()}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
}

