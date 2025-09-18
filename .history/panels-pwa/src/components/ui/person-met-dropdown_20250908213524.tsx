import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User } from 'lucide-react';

interface PersonMetDropdownProps {
  value: 'Primary PoC' | 'Project Coordinator' | 'Staff' | 'none';
  onChange: (value: 'Primary PoC' | 'Project Coordinator' | 'Staff' | 'none') => void;
  disabled?: boolean;
  className?: string;
}

const personMetConfig = {
  'Primary PoC': {
    label: 'Primary PoC',
    className: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
    dotColor: 'bg-green-500',
    icon: User,
    iconColor: 'text-green-600'
  },
  'Project Coordinator': {
    label: 'Project Coordinator',
    className: 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100',
    dotColor: 'bg-yellow-500',
    icon: User,
    iconColor: 'text-yellow-600'
  },
  'Staff': {
    label: 'Staff',
    className: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100',
    dotColor: 'bg-orange-500',
    icon: User,
    iconColor: 'text-orange-600'
  },
  'none': {
    label: '',
    className: 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100',
    dotColor: 'bg-slate-400',
    icon: User,
    iconColor: 'text-slate-400'
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
      <SelectTrigger 
        className={`px-2 py-1 text-[10px] font-medium rounded-full border ${currentConfig.className} ${className} w-auto min-w-0`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1.5">
          <currentConfig.icon className={`w-3 h-3 ${currentConfig.iconColor}`} />
        </div>
      </SelectTrigger>
      <SelectContent className="bg-white dark:bg-[hsl(var(--card))] border rounded-lg shadow-md">
        {Object.entries(personMetConfig).map(([personType, config]) => (
          <SelectItem
            key={personType}
            value={personType}
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
