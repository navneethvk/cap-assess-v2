import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PersonMetDropdownProps {
  value: 'Primary PoC' | 'Project Coordinator' | 'Staff' | 'none';
  onChange: (value: 'Primary PoC' | 'Project Coordinator' | 'Staff' | 'none') => void;
  disabled?: boolean;
  className?: string;
}

const personMetConfig = {
  'Primary PoC': {
    label: 'Primary PoC',
    className: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
    dotColor: 'bg-purple-500'
  },
  'Project Coordinator': {
    label: 'Project Coordinator',
    className: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100',
    dotColor: 'bg-orange-500'
  },
  'Staff': {
    label: 'Staff',
    className: 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100',
    dotColor: 'bg-gray-500'
  },
  'none': {
    label: 'Person Met',
    className: 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100',
    dotColor: 'bg-slate-400'
  }
};

export const PersonMetDropdown: React.FC<PersonMetDropdownProps> = ({ 
  value, 
  onChange, 
  disabled = false,
  className = ''
}) => {
  const currentConfig = personMetConfig[value];

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={`h-6 px-2 py-0 text-xs font-medium rounded-full border ${currentConfig.className} ${className} w-auto min-w-0`}>
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${currentConfig.dotColor}`} />
          <span>{currentConfig.label}</span>
        </div>
      </SelectTrigger>
      <SelectContent className="bg-white dark:bg-[hsl(var(--card))] border rounded-lg shadow-md">
        {Object.entries(personMetConfig).map(([personType, config]) => (
          <SelectItem
            key={personType}
            value={personType}
            className="bg-white hover:bg-slate-100 text-xs"
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
