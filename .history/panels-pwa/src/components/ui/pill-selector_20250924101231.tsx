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
  title?: string;
  titlePlacement?: 'inline' | 'dropdown';
  placeholder?: string;
  placeholderValue?: string;
  placeholderOption?: PillOption;
  showDropdownIndicator?: boolean;
  hidePlaceholderOptionInMenu?: boolean;
  showDropdownTitleWhenPlaceholder?: boolean;
}

export const PillSelector: React.FC<PillSelectorProps> = ({ 
  value, 
  onChange, 
  options,
  disabled = false,
  className = '',
  size = 'sm',
  title,
  titlePlacement = 'inline',
  placeholder,
  placeholderValue,
  placeholderOption,
  showDropdownIndicator = false,
  hidePlaceholderOptionInMenu = true,
  showDropdownTitleWhenPlaceholder = false
}) => {
  const [open, setOpen] = React.useState(false);
  const currentOption = React.useMemo(() => {
    return options.find(opt => opt.value === value) ?? null;
  }, [options, value]);

  const resolvedPlaceholderOption = React.useMemo(() => {
    if (placeholderOption) return placeholderOption;
    if (placeholderValue === undefined) return undefined;
    return options.find(opt => opt.value === placeholderValue);
  }, [placeholderOption, placeholderValue, options]);

  const iconSource = currentOption ?? resolvedPlaceholderOption;
  const IconComponent = iconSource?.icon;
  const iconColor = currentOption?.iconColor ?? resolvedPlaceholderOption?.iconColor ?? 'text-foreground';
  const isPlaceholderSelected = placeholderValue !== undefined
    ? value === placeholderValue
    : !currentOption;

  const sizeClasses = {
    sm: 'px-2 py-1 text-[10px]',
    md: 'px-3 py-1.5 text-xs'
  };

  const effectivePlaceholder = placeholder ?? title ?? 'Select';
  const showInlineTitle = Boolean(title && titlePlacement === 'inline');
  const triggerText = currentOption?.label ?? resolvedPlaceholderOption?.label ?? effectivePlaceholder;

  const selectableOptions = React.useMemo(() => {
    if (placeholderValue === undefined) return options;
    if (!hidePlaceholderOptionInMenu) return options;
    return options.filter(opt => opt.value !== placeholderValue);
  }, [options, placeholderValue, hidePlaceholderOptionInMenu]);

  const handleSelect = (newValue: string) => {
    if (placeholderValue !== undefined && newValue === placeholderValue && hidePlaceholderOptionInMenu) {
      setOpen(false);
      return;
    }
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
          {showInlineTitle && (
            <span className={cn(
              'text-[10px] uppercase tracking-[0.08em] text-muted-foreground',
              isPlaceholderSelected ? '' : 'font-medium'
            )}>
              {title}
            </span>
          )}
          {IconComponent && (
            <IconComponent className={cn(
              'w-3 h-3',
              iconColor
            )} />
          )}
          {(!showInlineTitle || !isPlaceholderSelected) && (
            <span className="text-foreground">{triggerText}</span>
          )}
          {showDropdownIndicator && (
            <svg
              className="w-3 h-3 text-muted-foreground"
              viewBox="0 0 12 12"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 4.5L6 7.5L9 4.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-fit p-1 bg-card border border-border rounded-lg shadow-lg"
        sideOffset={6}
        align="center"
        style={{
          backgroundColor: 'hsl(var(--card))',
          borderColor: 'hsl(var(--border))',
          backdropFilter: 'none'
        }}
      >
        {title && titlePlacement === 'dropdown' && (!isPlaceholderSelected || showDropdownTitleWhenPlaceholder) && (
          <>
            <div className="px-3 pt-1 pb-2 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              {title}
            </div>
            <div className="mx-1 mb-2 h-px bg-border" />
          </>
        )}
        <div className="flex flex-col gap-1">
          {selectableOptions.map((option) => {
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
                  color: isActive ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))',
                  border: '1px solid hsl(var(--border))'
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
