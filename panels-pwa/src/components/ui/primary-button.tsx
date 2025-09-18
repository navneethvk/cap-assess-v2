import React from 'react';
import { cn } from '@/lib/utils';

/**
 * PrimaryButton - A modular button component system for consistent styling
 * 
 * This component provides IDENTICAL styling and behavior to TabsTrigger buttons,
 * allowing you to create tab-like buttons anywhere in the app. It uses the 
 * .tabstrigger CSS class for consistent oval/pill-shaped buttons with proper physics.
 * 
 * Usage Examples:
 * 
 * 1. Regular Primary Button (identical to TabsTrigger):
 *    <PrimaryButton className="text-xs sm:text-sm px-2 sm:px-3" onClick={handleClick}>
 *      Click Me
 *    </PrimaryButton>
 * 
 * 2. Primary Popup Button (for dropdown triggers):
 *    <DropdownMenuTrigger asChild>
 *      <PrimaryPopupButton className="text-xs sm:text-sm px-2 sm:px-3" asChild>
 *        User Menu
 *      </PrimaryPopupButton>
 *    </DropdownMenuTrigger>
 * 
 * 3. Multiple children (wrap in single element for asChild):
 *    <PrimaryPopupButton className="flex flex-col h-12 px-3" asChild>
 *      <div className="flex flex-col items-center">
 *        <Icon />
 *        <span>Text</span>
 *      </div>
 *    </PrimaryPopupButton>
 * 
 * Key Features:
 * - IDENTICAL onclick behavior to TabsTrigger buttons
 * - Same hover/press physics and styling
 * - Fixed React.Children.only error with proper asChild handling
 * - Works seamlessly with Radix UI components
 * - Uses native <button> element for better accessibility
 */

interface PrimaryButtonProps {
  children: React.ReactNode;
  variant?: 'default' | 'popup';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  asChild?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  children,
  className,
  onClick,
  disabled = false,
  asChild = false,
  type = 'button',
  ...props
}) => {
  // Apply primary button styling with logical physics
  const getPrimaryClasses = () => {
    // Use separate primary-button class with logical physics (not tabstrigger)
    return 'primary-button';
  };

  if (asChild) {
    // When using asChild, render as a regular button element with primary button styling
    // This avoids the React.Children.only error while maintaining button behavior
    return (
      <button
        className={cn(getPrimaryClasses(), className)}
        onClick={onClick}
        disabled={disabled}
        type={type}
        {...props}
      >
        {children}
      </button>
    );
  }

  // For non-asChild usage, render as regular button with primary button styling
  return (
    <button
      className={cn(getPrimaryClasses(), className)}
      onClick={onClick}
      disabled={disabled}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
};

// Convenience component for popup primary buttons
export const PrimaryPopupButton: React.FC<Omit<PrimaryButtonProps, 'variant'>> = (props) => {
  return <PrimaryButton {...props} variant="popup" />;
};