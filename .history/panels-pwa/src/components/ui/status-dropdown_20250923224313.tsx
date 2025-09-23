import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
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
    className: 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20',
    dotColor: 'bg-primary',
    icon: Clock,
    iconColor: 'text-primary'
  },
  Complete: {
    label: 'Complete',
    className: 'bg-success/10 text-success border-success/20 hover:bg-success/20',
    dotColor: 'bg-success',
    icon: Check,
    iconColor: 'text-success'
  },
  Cancelled: {
    label: 'Cancelled',
    className: 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20',
    dotColor: 'bg-destructive',
    icon: X,
    iconColor: 'text-destructive'
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
        className={`px-2 py-1 text-[10px] font-medium rounded-full border ${currentStatus.className} ${className} w-auto min-w-0 whitespace-nowrap [&>svg]:hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <currentStatus.icon className={`w-3 h-3 ${currentStatus.iconColor}`} />
          <span className="hidden md:inline">{currentStatus.label}</span>
        </div>
      </SelectTrigger>
      <SelectContent 
        className="bg-card border border-border rounded-lg shadow-md" 
        style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
      >
        {Object.entries(statusConfig).map(([status, config]) => (
          <SelectItem
            key={status}
            value={status}
            className="bg-card hover:bg-accent text-[10px]"
            style={{ backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}
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
