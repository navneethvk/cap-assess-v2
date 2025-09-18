// Physics-based animation presets with magnetic-fluid effects
export const physicsPresets = {
  // Spring configurations with fluid characteristics
  springs: {
    gentle: { stiffness: 400, damping: 30 },
    bouncy: { stiffness: 600, damping: 20 },
    snappy: { stiffness: 800, damping: 25 },
    wobbly: { stiffness: 180, damping: 12 },
    fluid: { stiffness: 300, damping: 35 },
    magnetic: { stiffness: 500, damping: 28 },
    liquid: { stiffness: 250, damping: 40 },
  },

  // Duration-based timing
  durations: {
    fast: 0.15,
    normal: 0.3,
    slow: 0.5,
    fluid: 0.4,
  },

  // Easing curves with liquid feel
  easings: {
    elastic: "easeInOut",
    smooth: "easeInOut", 
    sharp: "easeIn",
    fluid: [0.25, 0.46, 0.45, 0.94],
    magnetic: [0.68, -0.55, 0.265, 1.55],
    liquid: [0.175, 0.885, 0.32, 1.275],
  },
};

// Pre-defined animation variants with magnetic-liquid effects
export const animationVariants = {
  // Modern push button physics - exact values from user's example
  button: {
    initial: { x: 0, y: 0 },
    hover: { 
      x: -5,
      y: -5
    },
    tap: { 
      x: 4,
      y: 4
    },
  },

  // Realistic card interactions - hover lifts, tap presses in
  card: {
    initial: { scale: 1, rotateX: 0, rotateY: 0, y: 0, z: 0 },
    hover: { 
      scale: 1.01, 
      y: -2,
      z: 3,
      rotateX: -1, 
      rotateY: 1
    },
    tap: { 
      scale: 0.99, 
      y: 1,
      z: -3,
      rotateX: 0, 
      rotateY: 0
    },
  },

  // Enhanced modern push button - exact values from user's example
  magneticButton: {
    initial: { x: 0, y: 0 },
    hover: { 
      x: -5,
      y: -5
    },
    tap: { 
      x: 4,
      y: 4
    },
  },

  // Fade and slide entrances
  fadeSlide: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  },

  // Scale entrance
  scaleIn: {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 },
  },

  // Slide from bottom (navigation)
  slideUp: {
    initial: { y: 100 },
    animate: { y: 0 },
    exit: { y: 100 },
  },

  // Stagger children
  stagger: {
    animate: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  },

  // Individual stagger item
  staggerItem: {
    initial: { opacity: 0, x: -20, scale: 0.95 },
    animate: { opacity: 1, x: 0, scale: 1 },
  },
};
