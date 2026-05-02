import React from 'react';

interface RiskBadgeProps {
  score: number;
  className?: string;
}

export function RiskBadge({ score, className = '' }: RiskBadgeProps) {
  const roundedScore = Math.round(score);
  
  if (roundedScore > 50) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200 ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
        {roundedScore}% HIGH RISK
      </span>
    );
  }
  
  if (roundedScore > 20) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200 ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
        {roundedScore}% MEDIUM RISK
      </span>
    );
  }
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200 ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
      {roundedScore}% LOW RISK
    </span>
  );
}
