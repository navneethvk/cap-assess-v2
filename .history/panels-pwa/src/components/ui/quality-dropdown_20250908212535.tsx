import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface QualityDropdownProps {
  value: 'Objectives Met' | 'Partially Met/Slow Pace' | 'Not Met' | 'Red Flag' | 'none';
  onChange: (value: 'Objectives Met' | 'Partially Met/Slow Pace' | 'Not Met' | 'Red Flag' | 'none') => void;
  disabled?: boolean;
  className?: string;
}

const qualityConfig = {
  'Objectives Met': {
    label: 'Objectives Met',
    className: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
    dotColor: 'bg-green-500'
  },
  'Partially Met/Slow Pace': {
    label: 'Partially Met/Slow Pace',
    className: 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100',
    dotColor: 'bg-yellow-500'
  },
  'Not Met': {
    label: 'Not Met',
    className: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100',
    dotColor: 'bg-orange-500'
  },
  'Red Flag': {
    label: 'Red Flag',
    className: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
    dotColor: 'bg-red-500'
  },
  'none': {
    label: '',
    className: 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100',
    dotColor: 'bg-slate-400'
  }
};

export const QualityDropdown: React.FC<QualityDropdownProps> = ({ 
  value, 
  onChange, 
  disabled = false,
  className = ''
}) => {
  const currentConfig = qualityConfig[value];

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={`px-2 py-1 text-[10px] font-medium rounded-full border ${currentConfig.className} ${className} w-auto min-w-0`}>
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${currentConfig.dotColor}`} />
          <span>{currentConfig.label || 'Quality'}</span>
        </div>
      </SelectTrigger>
      <SelectContent className="bg-white dark:bg-[hsl(var(--card))] border rounded-lg shadow-md">
        {Object.entries(qualityConfig).map(([quality, config]) => (
          <SelectItem
            key={quality}
            value={quality}
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
