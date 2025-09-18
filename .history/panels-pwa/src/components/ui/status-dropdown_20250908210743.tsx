import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
    dotColor: 'bg-blue-500'
  },
  Complete: {
    label: 'Complete',
    className: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
    dotColor: 'bg-green-500'
  },
  Cancelled: {
    label: 'Cancelled',
    className: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
    dotColor: 'bg-red-500'
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
      <SelectTrigger className={`h-8 px-3 py-1 text-xs font-medium rounded-full border-2 ${currentStatus.className} ${className}`}>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${currentStatus.dotColor}`} />
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent className="bg-white dark:bg-[hsl(var(--card))] border-2 rounded-xl shadow-md">
        {Object.entries(statusConfig).map(([status, config]) => (
          <SelectItem
            key={status}
            value={status}
            className="bg-white hover:bg-slate-100"
            style={{ backgroundColor: 'white' }}
          >
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${config.dotColor}`} />
              {config.label}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
