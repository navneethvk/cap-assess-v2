import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Target, Flag } from 'lucide-react';

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
    dotColor: 'bg-green-500',
    icon: Target,
    iconColor: 'text-green-600'
  },
  'Partially Met/Slow Pace': {
    label: 'Partially Met/Slow Pace',
    className: 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100',
    dotColor: 'bg-yellow-500',
    icon: Target,
    iconColor: 'text-yellow-600'
  },
  'Not Met': {
    label: 'Not Met',
    className: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100',
    dotColor: 'bg-orange-500',
    icon: Target,
    iconColor: 'text-orange-600'
  },
  'Red Flag': {
    label: 'Red Flag',
    className: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
    dotColor: 'bg-red-500',
    icon: Flag,
    iconColor: 'text-red-600'
  },
  'none': {
    label: '',
    className: 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100',
    dotColor: 'bg-slate-400',
    icon: Target,
    iconColor: 'text-slate-400'
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
      <SelectTrigger 
        className={`px-2 py-1 text-[10px] font-medium rounded-full border ${currentConfig.className} ${className} w-auto min-w-0 whitespace-nowrap [&>svg]:hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <currentConfig.icon className={`w-3 h-3 ${currentConfig.iconColor}`} />
          <span className="hidden md:inline">{currentConfig.label || 'Quality'}</span>
        </div>
      </SelectTrigger>
      <SelectContent className="bg-card border rounded-lg shadow-md">
        {Object.entries(qualityConfig).map(([quality, config]) => (
          <SelectItem
            key={quality}
            value={quality}
            className="bg-white hover:bg-slate-100 text-[10px]"
            style={{ backgroundColor: 'white' }}
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
