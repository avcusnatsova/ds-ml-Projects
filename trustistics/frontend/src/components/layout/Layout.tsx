import { ReactNode } from 'react';
import { useAuth } from '../../context/AuthContext';
import { StaggeredMenu, SoftAurora } from '../ui';
import { Header } from './Header';

const allNavItems = [
  { name: 'Dashboard', path: '/supplier', roles: ['Supplier'] },
  { name: 'Create Shipment', path: '/supplier/create', roles: ['Supplier'] },
  { name: 'Upload Docs', path: '/supplier/upload', roles: ['Supplier'] },
  { name: 'Vehicle Manifest', path: '/driver', roles: ['Driver'] },
  { name: 'Record Handoff', path: '/driver/handoff', roles: ['Driver'] },
  { name: 'Warehouse Dashboard', path: '/warehouse', roles: ['Warehouse Manager'] },
  { name: 'Storage Intake', path: '/warehouse/intake', roles: ['Warehouse Manager'] },
  { name: 'Customs Dashboard', path: '/customs', roles: ['Customs Officer'] },
  { name: 'Clearance Report', path: '/customs/clearance', roles: ['Customs Officer'] },
  { name: 'Live Tracking', path: '/supplier/tracking', roles: ['Supplier'] },
  { name: 'Timeline', path: '/supplier/timeline', roles: ['Supplier'] },
  { name: 'Alerts', path: '/supplier/alerts', roles: ['Supplier'] },
  { name: 'Analytics', path: '/supplier/analytics', roles: ['Supplier'] },
  { name: 'Tamper Detection', path: '/supplier/tamper', roles: ['Supplier'] },
];

export function Layout({ children }: { children: ReactNode }) {
  const { role, logout } = useAuth();
  
  const baseItems = allNavItems
    .filter(item => role && item.roles.includes(role))
    .map(item => ({
      label: item.name,
      link: item.path,
      ariaLabel: `Navigate to ${item.name}`
    }));

  const menuItems = [
    ...baseItems,
    { label: 'Logout', link: '#', ariaLabel: 'Logout from system', onClick: () => logout && logout() }
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0b] flex flex-col relative overflow-x-hidden">
      <div className="aurora-background">
        <SoftAurora 
          speed={0.4} 
          color1="#871364" 
          color2="#4a044e" 
          brightness={1.5}
        />
      </div>

      <StaggeredMenu 
        position="left"
        isFixed={true}
        items={menuItems}
        displaySocials={true}
        displayItemNumbering={false}
        socialItems={[
            { label: 'Blockchain Explorer', link: '#' },
            { label: 'Support', link: '#' }
        ]}
        colors={['#871364', '#6d0f50', '#a11778']}
        accentColor="#871364"
        menuButtonColor="#ffffff"
        openMenuButtonColor="#871364"
        logoUrl=""
      />
      
      <div className="flex-1 flex flex-col w-full min-w-0 transition-all duration-300 relative z-10">
        <Header onMenuClick={() => {}} />
        <main className="flex-1 p-4 md:p-8 relative pl-16 md:pl-20">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
