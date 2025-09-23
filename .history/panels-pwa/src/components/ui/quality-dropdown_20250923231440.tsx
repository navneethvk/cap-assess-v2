import React from 'react';
import { Target, Flag } from 'lucide-react';
import { PillSelector, type PillOption } from './pill-selector';

interface QualityDropdownProps {
  value: 'Objectives Met' | 'Partially Met/Slow Pace' | 'Not Met' | 'Red Flag' | 'none';
  onChange: (value: 'Objectives Met' | 'Partially Met/Slow Pace' | 'Not Met' | 'Red Flag' | 'none') => void;
  disabled?: boolean;
  className?: string;
}

const qualityOptions: PillOption[] = [
  {
    label: 'Objectives Met',
    value: 'Objectives Met',
    icon: Target,
    iconColor: 'text-success'
  },
  {
    label: 'Partially Met/Slow Pace',
    value: 'Partially Met/Slow Pace',
    icon: Target,
    iconColor: 'text-warning'
  },
  {
    label: 'Not Met',
    value: 'Not Met',
    icon: Target,
    iconColor: 'text-info'
  },
  {
    label: 'Red Flag',
    value: 'Red Flag',
    icon: Flag,
    iconColor: 'text-destructive'
  },
  {
    label: 'Quality',
    value: 'none',
    icon: Target,
    iconColor: 'text-muted-foreground'
  }
];

export const QualityDropdown: React.FC<QualityDropdownProps> = ({ 
  value, 
  onChange, 
  disabled = false,
  className = ''
}) => {
  return (
    <PillSelector
      value={value}
      onChange={onChange}
      options={qualityOptions}
      disabled={disabled}
      className={className}
      size="sm"
    />
  );
};

// Export the options for direct usage
export { qualityOptions };
