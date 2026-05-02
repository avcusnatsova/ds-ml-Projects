import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

export type Role = 'Supplier' | 'Driver' | 'Warehouse Manager' | 'Customs Officer' | 'Delivery Partner' | 'Customer' | null;

interface AuthContextType {
  role: Role;
  login: (role: Role) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const savedRole = localStorage.getItem('app_role') as Role;
    if (savedRole) {
      setRole(savedRole);
    }
  }, []);

  const login = (newRole: Role) => {
    setRole(newRole);
    if (newRole) {
      localStorage.setItem('app_role', newRole);
      
      // Role-based routing on login
      switch(newRole) {
        case 'Supplier':
          navigate('/supplier');
          break;
        case 'Driver':
          navigate('/driver');
          break;
        case 'Warehouse Manager':
          navigate('/warehouse');
          break;
        case 'Customs Officer':
          navigate('/customs');
          break;
        case 'Delivery Partner':
          navigate('/driver'); // Fallback to driver dashboard for now
          break;
        case 'Customer':
          navigate('/login'); // Customer doesn't have a dashboard, they use verify/:id. We can just keep them here or redirect to a generic page.
          break;
      }
    }
  };

  const logout = () => {
    setRole(null);
    localStorage.removeItem('app_role');
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ role, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
