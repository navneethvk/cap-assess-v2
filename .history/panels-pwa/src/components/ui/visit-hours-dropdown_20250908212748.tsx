import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface VisitHoursDropdownProps {
  value: 'Full' | 'Half' | 'Drop-In' | 'Special' | 'none';
  onChange: (value: 'Full' | 'Half' | 'Drop-In' | 'Special' | 'none') => void;
  disabled?: boolean;
  className?: string;
}

const visitHoursConfig = {
  'Full': {
    label: 'Full',
    className: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    dotColor: 'bg-blue-500'
  },
  'Half': {
    label: 'Half',
    className: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100',
    dotColor: 'bg-indigo-500'
  },
  'Drop-In': {
    label: 'Drop-In',
    className: 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100',
    dotColor: 'bg-teal-500'
  },
  'Special': {
    label: 'Special',
    className: 'bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100',
    dotColor: 'bg-pink-500'
  },
  'none': {
    label: '',
    className: 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100',
    dotColor: 'bg-slate-400'
  }
};

export const VisitHoursDropdown: React.FC<VisitHoursDropdownProps> = ({ 
  value, 
  onChange, 
  disabled = false,
  className = ''
}) => {
  const currentConfig = visitHoursConfig[value];

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={`px-2 py-1 text-[10px] font-medium rounded-full border ${currentConfig.className} ${className} w-auto min-w-0`}>
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${currentConfig.dotColor}`} />
          <span>{currentConfig.label || 'Visit Hours'}</span>
        </div>
      </SelectTrigger>
      <SelectContent className="bg-white dark:bg-[hsl(var(--card))] border rounded-lg shadow-md">
        {Object.entries(visitHoursConfig).map(([hours, config]) => (
          <SelectItem
            key={hours}
            value={hours}
            className="bg-white hover:bg-slate-100 text-[10px]"
            style={{ backgroundColor: 'white' }}
          >
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
              {config.label}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
