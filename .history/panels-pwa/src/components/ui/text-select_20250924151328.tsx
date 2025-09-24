import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

// Helper hook for Firestore collection-based options
export const useFirestoreSelectOptions = <T extends { id: string }>(
  collectionPath: string,
  labelField: keyof T,
  valueField: keyof T = 'id' as keyof T,
  descriptionField?: keyof T
) => {
  const [options, setOptions] = React.useState<TextSelectOption[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    // This would integrate with your existing Firestore hooks
    // For now, returning a function that can be used with existing hooks
    setLoading(false);
  }, [collectionPath, labelField, valueField, descriptionField]);

  return { options, loading, error };
};

export interface TextSelectOption {
  label: string;
  value: string;
  description?: string; // Optional description for richer options
}

interface TextSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: TextSelectOption[] | (() => Promise<TextSelectOption[]>); // Support both static and async options
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  error?: string;
  searchable?: boolean; // Future enhancement
}

export const TextSelect: React.FC<TextSelectProps> = ({ 
  value, 
  onChange, 
  options,
  placeholder = "Select an option",
  disabled = false,
  className = '',
  triggerClassName = '',
  contentClassName = '',
  size = 'md',
  loading = false,
  error
}) => {
  const [resolvedOptions, setResolvedOptions] = React.useState<TextSelectOption[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  // Handle both static options and async function options
  React.useEffect(() => {
    if (Array.isArray(options)) {
      setResolvedOptions(options);
    } else if (typeof options === 'function') {
      setIsLoading(true);
      options()
        .then(setResolvedOptions)
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [options]);

  const sizeClasses = {
    sm: 'h-8 text-xs px-2',
    md: 'h-10 text-sm px-3',
    lg: 'h-12 text-base px-4'
  };

  const isDisabled = disabled || loading || isLoading;

  return (
    <div className={cn('w-full', className)}>
      <Select value={value} onValueChange={onChange} disabled={isDisabled}>
        <SelectTrigger 
          className={cn(
            'w-full border-border bg-card text-foreground transition-colors',
            'hover:bg-accent/50 hover:border-primary/50',
            'focus:ring-2 focus:ring-primary/20 focus:border-primary',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            sizeClasses[size],
            error && 'border-destructive focus:border-destructive focus:ring-destructive/20',
            triggerClassName
          )}
          style={{ 
            backgroundColor: 'hsl(var(--card))', 
            color: 'hsl(var(--foreground))',
            borderColor: error ? 'hsl(var(--destructive))' : 'hsl(var(--border))',
            border: error ? '1px solid hsl(var(--destructive))' : '1px solid hsl(var(--border))'
          }}
        >
          <SelectValue placeholder={isLoading ? "Loading..." : placeholder} />
        </SelectTrigger>
        <SelectContent 
          className={cn(
            'shadow-xl rounded-lg overflow-hidden border border-border bg-card text-foreground',
            'max-h-[320px] overflow-y-auto',
            contentClassName
          )}
          style={{ 
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            boxShadow: '0 24px 50px rgba(0, 0, 0, 0.15)',
            color: 'hsl(var(--foreground))'
          }}
        >
          {isLoading ? (
            <SelectItem value="loading" disabled className="text-muted-foreground">
              Loading options...
            </SelectItem>
          ) : resolvedOptions.length === 0 ? (
            <SelectItem value="empty" disabled className="text-muted-foreground">
              No options available
            </SelectItem>
          ) : (
            resolvedOptions.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                className={cn(
                  'cursor-pointer transition-colors',
                  'hover:bg-primary/10 hover:text-primary',
                  'focus:bg-primary/10 focus:text-primary',
                  'data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary'
                )}
                style={{ 
                  backgroundColor: 'transparent', 
                  color: '#f1f5f9'
                }}
              >
                <div className="flex flex-col">
                  <span>{option.label}</span>
                  {option.description && (
                    <span className="text-xs text-muted-foreground mt-0.5">
                      {option.description}
                    </span>
                  )}
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
      {error && (
        <p className="text-xs text-destructive mt-1">{error}</p>
      )}
    </div>
  );
};
