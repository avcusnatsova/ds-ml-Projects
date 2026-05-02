import React from 'react';
import { Package, Truck, Building2, ShieldCheck, CheckCircle2 } from 'lucide-react';

const STEPS = [
  { key: 'CREATED',    label: 'Created',    icon: Package },
  { key: 'IN_TRANSIT',  label: 'In Transit', icon: Truck },
  { key: 'IN_STORAGE',  label: 'In Storage', icon: Building2 },
  { key: 'AT_CUSTOMS',  label: 'At Customs', icon: ShieldCheck },
  { key: 'DELIVERED',   label: 'Delivered',  icon: CheckCircle2 },
] as const;

// Map non-standard statuses to a step index
function getStepIndex(status?: string): number {
  if (!status) return 0;
  const upper = status.toUpperCase();
  const idx = STEPS.findIndex(s => s.key === upper);
  if (idx >= 0) return idx;
  // FLAGGED / REJECTED should show wherever the shipment was last at
  if (upper === 'FLAGGED' || upper === 'REJECTED' || upper === 'CUSTODY_TRANSFER') return 1;
  return 0;
}

interface ProgressTrackerProps {
  status?: string;
  compact?: boolean;
  className?: string;
}

export function ProgressTracker({ status, compact = false, className = '' }: ProgressTrackerProps) {
  const currentIdx = getStepIndex(status);
  const isFlagged = status?.toUpperCase() === 'FLAGGED' || status?.toUpperCase() === 'REJECTED';

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between relative">
        {/* Background connector line */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 z-0" style={{ marginLeft: '16px', marginRight: '16px' }} />
        {/* Active connector line */}
        <div
          className={`absolute top-4 left-0 h-0.5 z-10 transition-all duration-700 ease-out ${isFlagged ? 'bg-red-400' : 'bg-teal-500'}`}
          style={{
            marginLeft: '16px',
            width: `calc(${(currentIdx / (STEPS.length - 1)) * 100}% - 32px)`,
          }}
        />

        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isCompleted = idx < currentIdx;
          const isActive = idx === currentIdx;
          const isPending = idx > currentIdx;

          let dotClasses = '';
          let iconColor = '';
          let labelColor = 'text-gray-400';

          if (isCompleted) {
            dotClasses = 'bg-teal-500 border-teal-500 text-white';
            iconColor = 'text-white';
            labelColor = 'text-teal-700';
          } else if (isActive && isFlagged) {
            dotClasses = 'bg-red-500 border-red-500 text-white ring-4 ring-red-100';
            iconColor = 'text-white';
            labelColor = 'text-red-700 font-bold';
          } else if (isActive) {
            dotClasses = 'bg-teal-500 border-teal-500 text-white ring-4 ring-teal-100';
            iconColor = 'text-white';
            labelColor = 'text-teal-700 font-bold';
          } else {
            dotClasses = 'bg-white border-gray-300 text-gray-400';
            iconColor = 'text-gray-400';
            labelColor = 'text-gray-400';
          }

          return (
            <div key={step.key} className="flex flex-col items-center relative z-20" style={{ minWidth: compact ? '40px' : '60px' }}>
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${dotClasses}`}>
                <Icon className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} ${iconColor}`} />
              </div>
              {!compact && (
                <span className={`text-[10px] mt-1.5 text-center leading-tight whitespace-nowrap transition-colors ${labelColor}`}>
                  {step.label}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
