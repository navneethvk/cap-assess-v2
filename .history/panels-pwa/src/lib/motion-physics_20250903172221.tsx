import React from 'react';
import { motion } from 'motion/react';
import { physicsPresets, animationVariants } from '../components/ui/motion-constants';

// Physics-enhanced Motion components
interface PhysicsMotionProps extends React.ComponentProps<typeof motion.div> {
  preset?: keyof typeof animationVariants;
  spring?: keyof typeof physicsPresets.springs;
  enablePhysics?: boolean;
}

export const PhysicsMotion = React.forwardRef<HTMLDivElement, PhysicsMotionProps>(
  ({ 
    preset = 'button', 
    spring = 'gentle', 
    enablePhysics = true, 
    transition,
    variants,
    ...props 
  }, ref) => {
    const defaultVariants = enablePhysics ? animationVariants[preset] : undefined;
    const defaultTransition = enablePhysics ? physicsPresets.springs[spring] : transition;

    return (
      <motion.div
        ref={ref}
        variants={variants || defaultVariants}
        transition={defaultTransition}
        {...props}
      />
    );
  }
);

PhysicsMotion.displayName = "PhysicsMotion";

// Specialized components for magnetic-liquid interactions
export const PhysicsButton = React.forwardRef<HTMLDivElement, PhysicsMotionProps>(
  (props, ref) => (
    <PhysicsMotion
      ref={ref}
      preset="button"
      spring="magnetic"
      initial="initial"
      whileHover="hover"
      whileTap="tap"
      style={{ transformOrigin: 'center', transformStyle: 'preserve-3d' }}
      {...props}
    />
  )
);

PhysicsButton.displayName = "PhysicsButton";

export const MagneticButton = React.forwardRef<HTMLDivElement, PhysicsMotionProps>(
  (props, ref) => (
    <PhysicsMotion
      ref={ref}
      preset="magneticButton"
      spring="fluid"
      initial="initial"
      whileHover="hover"
      whileTap="tap"
      style={{ transformOrigin: 'center', transformStyle: 'preserve-3d' }}
      {...props}
    />
  )
);

MagneticButton.displayName = "MagneticButton";

export const PhysicsCard = React.forwardRef<HTMLDivElement, PhysicsMotionProps>(
  (props, ref) => (
    <PhysicsMotion
      ref={ref}
      preset="card"
      spring="liquid"
      initial="initial"
      whileHover="hover"
      whileTap="tap"
      style={{ transformOrigin: 'center', transformStyle: 'preserve-3d' }}
      {...props}
    />
  )
);

PhysicsCard.displayName = "PhysicsCard";

export const FadeSlide = React.forwardRef<HTMLDivElement, PhysicsMotionProps>(
  (props, ref) => (
    <PhysicsMotion
      ref={ref}
      preset="fadeSlide"
      spring="gentle"
      initial="initial"
      animate="animate"
      exit="exit"
      {...props}
    />
  )
);

FadeSlide.displayName = "FadeSlide";

export const StaggerContainer = React.forwardRef<HTMLDivElement, PhysicsMotionProps>(
  (props, ref) => (
    <PhysicsMotion
      ref={ref}
      preset="stagger"
      initial="initial"
      animate="animate"
      {...props}
    />
  )
);

StaggerContainer.displayName = "StaggerContainer";

export const StaggerItem = React.forwardRef<HTMLDivElement, PhysicsMotionProps>(
  (props, ref) => (
    <PhysicsMotion
      ref={ref}
      preset="staggerItem"
      spring="gentle"
      {...props}
    />
  )
);

StaggerItem.displayName = "StaggerItem";

// Re-export constants for backward compatibility
export { physicsPresets, animationVariants };