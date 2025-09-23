import React from 'react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

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
  const [open, setOpen] = React.useState(false);
  const currentOption = options.find(opt => opt.value === value);
  const IconComponent = currentOption?.icon;

  const sizeClasses = {
    sm: 'px-2 py-1 text-[10px]',
    md: 'px-3 py-1.5 text-xs'
  };

  const handleSelect = (newValue: string) => {
    onChange(newValue);
    setOpen(false);
  };

  return (
    <Popover open={open && !disabled} onOpenChange={(next) => !disabled && setOpen(next)}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'font-medium rounded-full border transition-colors w-auto min-w-0 whitespace-nowrap flex items-center gap-1.5',
            'bg-card text-foreground border-border hover:bg-accent/50 disabled:opacity-50 disabled:cursor-not-allowed',
            sizeClasses[size],
            className
          )}
          style={{ 
            backgroundColor: 'hsl(var(--card))', 
            color: 'hsl(var(--foreground))',
            borderColor: 'hsl(var(--border))'
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (disabled) return;
            setOpen((prev) => !prev);
          }}
        >
          {IconComponent && (
            <IconComponent className={cn(
              'w-3 h-3',
              currentOption?.iconColor || 'text-foreground'
            )} />
          )}
          <span className="hidden md:inline">{currentOption?.label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-fit p-1 bg-card border border-border rounded-lg shadow-lg"
        sideOffset={6}
        align="center"
      >
        <div className="flex flex-col gap-1">
          {options.map((option) => {
            const OptionIcon = option.icon;
            const isActive = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-foreground hover:bg-accent/60'
                )}
                style={{
                  backgroundColor: isActive ? 'hsl(var(--primary))' : 'hsl(var(--card))',
                  color: isActive ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))'
                }}
              >
                {OptionIcon && (
                  <OptionIcon
                    className={cn(
                      'w-3 h-3',
                      option.iconColor || (isActive ? 'text-primary-foreground' : 'text-foreground')
                    )}
                  />
                )}
                {option.label}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};
