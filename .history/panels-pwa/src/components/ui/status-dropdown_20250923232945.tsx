import React from 'react';
import { Check, Clock, X } from 'lucide-react';
import { PillSelector, type PillOption } from './pill-selector';

interface StatusDropdownProps {
  value: 'Scheduled' | 'Complete' | 'Cancelled';
  onChange: (value: 'Scheduled' | 'Complete' | 'Cancelled') => void;
  disabled?: boolean;
  className?: string;
}

const statusOptions: PillOption[] = [
  {
    label: 'Scheduled',
    value: 'Scheduled',
    icon: Clock,
    iconColor: 'text-primary'
  },
  {
    label: 'Complete',
    value: 'Complete',
    icon: Check,
    iconColor: 'text-success'
  },
  {
    label: 'Cancelled',
    value: 'Cancelled',
    icon: X,
    iconColor: 'text-destructive'
  }
];

export const StatusDropdown: React.FC<StatusDropdownProps> = ({ 
  value, 
  onChange, 
  disabled = false,
  className = ''
}) => {
  return (
    <PillSelector
      value={value}
      onChange={onChange}
      options={statusOptions}
      disabled={disabled}
      className={className}
      size="sm"
      title="Status"
      titlePlacement="inline"
      showDropdownIndicator
    />
  );
};

// Export the options for direct usage
export { statusOptions };
