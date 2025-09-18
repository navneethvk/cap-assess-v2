import React from 'react';
import { Button } from '@/components/ui/button';
import { useButtonStore, type ButtonType } from '@/store/buttonStore';
import { cn } from '@/lib/utils';

interface StatefulButtonProps {
  id: string;
  type: ButtonType;
  children: React.ReactNode;
  originalText?: string;
  className?: string;
  onClick?: () => void;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  disabled?: boolean;
  asChild?: boolean;
}

export const StatefulButton: React.FC<StatefulButtonProps> = ({
  id,
  type,
  children,
  originalText,
  className,
  onClick,
  variant = 'default',
  size = 'default',
  disabled = false,
  asChild = false,
  ...props
}) => {
  const { setPressedButton, clearPressedButton, isPressedButton } = useButtonStore();
  const isPressed = isPressedButton(id);
  
  const handleClick = () => {
    // Only handle state changes if not used as a child (asChild=false)
    // When asChild=true, let the parent component handle the state
    if (!asChild) {
      if (isPressed) {
        // If already pressed, clear it (for popup/expandable types)
        clearPressedButton(id);
      } else {
        // Set as pressed
        setPressedButton(id, type, originalText || (typeof children === 'string' ? children : ''));
      }
    }
    
    // Call the original onClick handler
    onClick?.();
  };
  
  
  // When asChild is true, we need to render differently to pass styles to the child
  if (asChild) {
    return (
      <Button
        variant={variant}
        size={size}
        className={cn(
          className,
          // Add pressed visual state - move to pressed position for all pressed buttons
          isPressed && 'transform translate-x-1 translate-y-1 shadow-none'
        )}
        onClick={handleClick}
        disabled={disabled}
        asChild={true}
        {...props}
      >
        <div className="flex flex-col h-12 px-3 btn-ghost">
          {children}
        </div>
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={cn(
        className,
        // Add pressed visual state - move to pressed position for all pressed buttons
        isPressed && 'transform translate-x-1 translate-y-1 shadow-none'
      )}
      onClick={handleClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </Button>
  );
};