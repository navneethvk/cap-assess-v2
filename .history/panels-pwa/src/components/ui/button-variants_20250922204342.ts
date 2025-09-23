import { cva, type VariantProps } from "class-variance-authority"

/**
 * Unified Button Variants System
 * 
 * This consolidates the competing button variant definitions into a single,
 * comprehensive system that supports both standard UI buttons and the
 * custom primary button styling used throughout the app.
 * 
 * Key Features:
 * - Standard shadcn/ui variants for general use
 * - Custom primary button variants with distinctive styling
 * - Consistent sizing and typography
 * - Proper focus states and accessibility
 * - Support for both standard and custom design tokens
 */

export const buttonVariants = cva(
  // Base styles - combining the best of both systems
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        // Standard variants (from shadcn/ui system)
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        
        // Custom primary variants (from custom system)
        primary: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md transition-all duration-200",
        "primary-outline": "border-2 border-primary bg-background shadow-sm hover:bg-accent hover:text-accent-foreground hover:shadow-md transition-all duration-200",
        "primary-ghost": "hover:bg-accent hover:text-accent-foreground hover:shadow-sm transition-all duration-200",
        
        // Tab-like variants for primary button system
        tab: "bg-background text-foreground border border-border hover:bg-accent hover:text-accent-foreground rounded-full transition-all duration-200",
        "tab-active": "bg-primary text-primary-foreground border border-primary rounded-full shadow-sm hover:shadow-md transition-all duration-200",
      },
      size: {
        // Standard sizes
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
        
        // Custom sizes for primary buttons
        "primary-sm": "h-8 rounded-full px-3 text-xs",
        "primary-default": "h-9 rounded-full px-4 text-sm",
        "primary-lg": "h-10 rounded-full px-6 text-base",
        "primary-icon": "h-9 w-9 rounded-full",
      },
      // Additional styling options
      typography: {
        default: "font-medium",
        mono: "font-mono uppercase tracking-wider",
        bold: "font-semibold",
      },
      shadow: {
        none: "",
        sm: "shadow-sm",
        md: "shadow-md",
        lg: "shadow-lg",
        custom: "hover:shadow-[0_0_10px_hsl(var(--primary)/0.5)]",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      typography: "default",
      shadow: "none",
    },
    // Compound variants for specific combinations
    compoundVariants: [
      // Primary button styling combinations
      {
        variant: "primary",
        size: "primary-sm",
        className: "font-mono uppercase tracking-wider"
      },
      {
        variant: "primary",
        size: "primary-default", 
        className: "font-mono uppercase tracking-wider"
      },
      {
        variant: "primary",
        size: "primary-lg",
        className: "font-mono uppercase tracking-wider"
      },
      // Tab variants with rounded styling
      {
        variant: ["tab", "tab-active"],
        className: "rounded-full"
      },
    ],
  }
)

export type ButtonVariants = VariantProps<typeof buttonVariants>

/**
 * Predefined button configurations for common use cases
 */
export const buttonConfigs = {
  // Standard UI buttons
  standard: {
    variant: "default" as const,
    size: "default" as const,
  },
  
  // Primary buttons (tab-like styling)
  primary: {
    variant: "primary" as const,
    size: "primary-default" as const,
    typography: "mono" as const,
  },
  
  // Primary popup buttons (for dropdowns)
  primaryPopup: {
    variant: "tab" as const,
    size: "primary-sm" as const,
    typography: "mono" as const,
  },
  
  // Icon buttons
  icon: {
    size: "icon" as const,
  },
  
  // Small primary buttons
  primarySmall: {
    variant: "primary" as const,
    size: "primary-sm" as const,
    typography: "mono" as const,
  },
} as const

/**
 * Utility function to get button classes for specific use cases
 */
export const getButtonClasses = (config: keyof typeof buttonConfigs, className?: string) => {
  const configData = buttonConfigs[config]
  return buttonVariants({ ...configData, className })
}