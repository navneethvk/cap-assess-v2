import React from 'react';
import { Clock } from 'lucide-react';
import { PillSelector, type PillOption } from './pill-selector';

interface VisitHoursDropdownProps {
  value: 'Full' | 'Half' | 'Drop-In' | 'Special' | 'none';
  onChange: (value: 'Full' | 'Half' | 'Drop-In' | 'Special' | 'none') => void;
  disabled?: boolean;
  className?: string;
}

const visitHoursOptions: PillOption[] = [
  {
    label: 'Full',
    value: 'Full',
    icon: Clock,
    iconColor: 'text-success'
  },
  {
    label: 'Half',
    value: 'Half',
    icon: Clock,
    iconColor: 'text-warning'
  },
  {
    label: 'Drop-In',
    value: 'Drop-In',
    icon: Clock,
    iconColor: 'text-info'
  },
  {
    label: 'Special',
    value: 'Special',
    icon: Clock,
    iconColor: 'text-primary'
  },
  {
    label: 'Visit Hours',
    value: 'none',
    icon: Clock,
    iconColor: 'text-muted-foreground'
  }
];

export const VisitHoursDropdown: React.FC<VisitHoursDropdownProps> = ({ 
  value, 
  onChange, 
  disabled = false,
  className = ''
}) => {
  return (
    <PillSelector
      value={value}
      onChange={onChange}
      options={visitHoursOptions}
      disabled={disabled}
      className={className}
      size="sm"
    />
  );
};
