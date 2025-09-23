import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface PillOption {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  iconColor?: string;
}

interface PillSelectorProps {
  value: string;
  onChange: (value: string) => void;
  options: PillOption[];
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export const PillSelector: React.FC<PillSelectorProps> = ({ 
  value, 
  onChange, 
  options,
  disabled = false,
  className = '',
  size = 'sm'
}) => {
  const currentOption = options.find(opt => opt.value === value);
  const IconComponent = currentOption?.icon;

  const sizeClasses = {
    sm: 'px-2 py-1 text-[10px]',
    md: 'px-3 py-1.5 text-xs'
  };

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger 
        className={cn(
          'font-medium rounded-full border transition-colors w-auto min-w-0 whitespace-nowrap [&>svg]:hidden',
          'bg-card text-foreground border-border hover:bg-accent/50',
          sizeClasses[size],
          className
        )}
        onClick={(e) => e.stopPropagation()}
        style={{ 
          backgroundColor: 'hsl(var(--card))', 
          color: 'hsl(var(--foreground))',
          borderColor: 'hsl(var(--border))'
        }}
      >
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          {IconComponent && (
            <IconComponent className={cn(
              'w-3 h-3',
              currentOption?.iconColor || 'text-foreground'
            )} />
          )}
          <span className="hidden md:inline">{currentOption?.label}</span>
        </div>
      </SelectTrigger>
      <SelectContent 
        className="bg-card border border-border rounded-lg shadow-md" 
        style={{ 
          backgroundColor: 'hsl(var(--card))', 
          borderColor: 'hsl(var(--border))',
          opacity: 1
        }}
      >
        {options.map((option) => {
          const OptionIcon = option.icon;
          return (
            <SelectItem
              key={option.value}
              value={option.value}
              className="bg-card hover:bg-accent text-[10px]"
              style={{ 
                backgroundColor: 'hsl(var(--card))', 
                color: 'hsl(var(--foreground))'
              }}
            >
              <div className="flex items-center gap-1.5">
                {OptionIcon && (
                  <OptionIcon className={cn(
                    'w-3 h-3',
                    option.iconColor || 'text-foreground'
                  )} />
                )}
                {option.label}
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
};
