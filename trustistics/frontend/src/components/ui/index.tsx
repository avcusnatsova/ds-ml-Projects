import type { ReactNode } from 'react';
import { cn } from '../layout/Sidebar'; // using cn from there for now

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("bg-white rounded-xl shadow-lg border border-gray-200", className)}>
      {children}
    </div>
  );
}

export function Badge({ children, variant = 'default' }: { children: ReactNode, variant?: 'default' | 'success' | 'warning' | 'danger' }) {
  const variants = {
    default: 'bg-teal-100 text-teal-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-amber-100 text-amber-800',
    danger: 'bg-red-100 text-red-800',
  };

  return (
    <span className={cn("px-2.5 py-1 rounded-full text-xs font-semibold", variants[variant])}>
      {children}
    </span>
  );
}
export * from './RiskBadge';
export * from './ProgressTracker';
export * from './StaggeredMenu';
export { default as SoftAurora } from './SoftAurora';
