"use client"

import { motion, type Variants } from "framer-motion"

type BounceVariant = 'bounce-in' | 'bounce-up' | 'bounce-scale' | 'interactive'

interface BounceProps {
  children: React.ReactNode
  className?: string
  variant?: BounceVariant
  delay?: number
}

const bounceVariants: Record<BounceVariant, Variants> = {
  'bounce-in': {
    hidden: { opacity: 0, y: 25, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 20,
      }
    }
  },
  'bounce-up': {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 20,
      }
    }
  },
  'bounce-scale': {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 15,
      }
    }
  },
  'interactive': {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 15,
      }
    }
  }
}

export const BounceWrapper = ({ 
  children, 
  className, 
  variant = 'interactive',
  delay = 0
}: BounceProps) => {
  const isInteractive = variant === 'interactive'
  
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={bounceVariants[variant]}
      transition={{ delay }}
      whileHover={isInteractive ? { scale: 1.05 } : undefined}
      whileTap={isInteractive ? { scale: 0.95 } : undefined}
    >
      {children}
    </motion.div>
  )
}

