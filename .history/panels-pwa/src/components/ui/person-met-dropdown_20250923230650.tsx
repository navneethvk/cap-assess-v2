import React from 'react';
import { User } from 'lucide-react';
import { PillSelector, type PillOption } from './pill-selector';

interface PersonMetDropdownProps {
  value: 'Primary PoC' | 'Project Coordinator' | 'Staff' | 'none';
  onChange: (value: 'Primary PoC' | 'Project Coordinator' | 'Staff' | 'none') => void;
  disabled?: boolean;
  className?: string;
}

const personMetOptions: PillOption[] = [
  {
    label: 'Primary PoC',
    value: 'Primary PoC',
    icon: User,
    iconColor: 'text-success'
  },
  {
    label: 'Project Coordinator',
    value: 'Project Coordinator',
    icon: User,
    iconColor: 'text-warning'
  },
  {
    label: 'Staff',
    value: 'Staff',
    icon: User,
    iconColor: 'text-info'
  },
  {
    label: 'Person Met',
    value: 'none',
    icon: User,
    iconColor: 'text-muted-foreground'
  }
];

export const PersonMetDropdown: React.FC<PersonMetDropdownProps> = ({ 
  value, 
  onChange, 
  disabled = false,
  className = ''
}) => {
  return (
    <PillSelector
      value={value}
      onChange={onChange}
      options={personMetOptions}
      disabled={disabled}
      className={className}
      size="sm"
    />
  );
};

// Export the options for direct usage
export { personMetOptions };
