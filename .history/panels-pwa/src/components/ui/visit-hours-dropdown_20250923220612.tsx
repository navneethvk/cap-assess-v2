import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Clock } from 'lucide-react';

interface VisitHoursDropdownProps {
  value: 'Full' | 'Half' | 'Drop-In' | 'Special' | 'none';
  onChange: (value: 'Full' | 'Half' | 'Drop-In' | 'Special' | 'none') => void;
  disabled?: boolean;
  className?: string;
}

const visitHoursConfig = {
  'Full': {
    label: 'Full',
    className: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
    dotColor: 'bg-green-500',
    icon: Clock,
    iconColor: 'text-green-600'
  },
  'Half': {
    label: 'Half',
    className: 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100',
    dotColor: 'bg-yellow-500',
    icon: Clock,
    iconColor: 'text-yellow-600'
  },
  'Drop-In': {
    label: 'Drop-In',
    className: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100',
    dotColor: 'bg-orange-500',
    icon: Clock,
    iconColor: 'text-orange-600'
  },
  'Special': {
    label: 'Special',
    className: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    dotColor: 'bg-blue-500',
    icon: Clock,
    iconColor: 'text-blue-600'
  },
  'none': {
    label: '',
    className: 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100',
    dotColor: 'bg-slate-400',
    icon: Clock,
    iconColor: 'text-slate-400'
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
      <SelectTrigger 
        className={`px-2 py-1 text-[10px] font-medium rounded-full border ${currentConfig.className} ${className} w-auto min-w-0 whitespace-nowrap [&>svg]:hidden`}
      onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <currentConfig.icon className={`w-3 h-3 ${currentConfig.iconColor}`} />
          <span className="hidden md:inline">{currentConfig.label || 'Visit Hours'}</span>
        </div>
      </SelectTrigger>
      <SelectContent className="bg-card border rounded-lg shadow-md">
        {Object.entries(visitHoursConfig).map(([hours, config]) => (
          <SelectItem
            key={hours}
            value={hours}
            className="bg-card hover:bg-accent text-[10px]"
          >
            <div className="flex items-center gap-1.5">
              <config.icon className={`w-3 h-3 ${config.iconColor}`} />
              {config.label}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
