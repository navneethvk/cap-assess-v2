import * as React from "react"
import { Slot } from "@radix-ui/react-slot"

import { cn } from "@/lib/utils"
import { buttonVariants, type ButtonVariants, buttonConfigs, getButtonClasses } from "./button-variants"

export interface ButtonProps
  extends React.ComponentProps<"button">,
    ButtonVariants {
  asChild?: boolean
}

/**
 * Unified Button Component
 * 
 * This component provides a consistent button system that supports both
 * standard UI buttons and custom primary button styling. It consolidates
 * the competing button variant systems into a single, comprehensive API.
 * 
 * Usage Examples:
 * 
 * 1. Standard button:
 *    <Button variant="default" size="default">Click me</Button>
 * 
 * 2. Primary button (tab-like styling):
 *    <Button variant="primary" size="primary-default">Primary</Button>
 * 
 * 3. Using predefined configs:
 *    <Button {...buttonConfigs.primary}>Primary Button</Button>
 * 
 * 4. With custom styling:
 *    <Button variant="primary" size="primary-sm" typography="mono" shadow="custom">
 *      Custom Button
 *    </Button>
 * 
 * 5. As child component (for Radix UI):
 *    <Button asChild>
 *      <Link to="/path">Navigation</Link>
 *    </Button>
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, typography, shadow, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, typography, shadow, className }))}
        ref={ref}
        data-slot="button"
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { 
  Button, 
  buttonVariants, 
  buttonConfigs, 
  getButtonClasses,
  type ButtonVariants 
}

