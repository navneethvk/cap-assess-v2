import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, Clock, X } from 'lucide-react';

interface StatusDropdownProps {
  value: 'Scheduled' | 'Complete' | 'Cancelled';
  onChange: (value: 'Scheduled' | 'Complete' | 'Cancelled') => void;
  disabled?: boolean;
  className?: string;
}

const statusConfig = {
  Scheduled: {
    label: 'Scheduled',
    className: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    dotColor: 'bg-blue-500',
    icon: Clock,
    iconColor: 'text-blue-600'
  },
  Complete: {
    label: 'Complete',
    className: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
    dotColor: 'bg-green-500',
    icon: Check,
    iconColor: 'text-green-600'
  },
  Cancelled: {
    label: 'Cancelled',
    className: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
    dotColor: 'bg-red-500',
    icon: X,
    iconColor: 'text-red-600'
  }
};

export const StatusDropdown: React.FC<StatusDropdownProps> = ({ 
  value, 
  onChange, 
  disabled = false,
  className = ''
}) => {
  const currentStatus = statusConfig[value];

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger 
        className={`px-2 py-1 text-[10px] font-medium rounded-full border ${currentStatus.className} ${className} w-auto min-w-0`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1.5">
          <currentStatus.icon className={`w-3 h-3 ${currentStatus.iconColor}`} />
        </div>
      </SelectTrigger>
      <SelectContent className="bg-white dark:bg-[hsl(var(--card))] border rounded-lg shadow-md">
        {Object.entries(statusConfig).map(([status, config]) => (
          <SelectItem
            key={status}
            value={status}
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
