"use client"
import { motion, useReducedMotion } from "framer-motion"
import * as React from "react"

// Apple spring — mass: 0.8, stiffness: 400, damping: 30 (like iOS)
export const appleSpring = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30,
  mass: 0.8,
}

export const appleEase = [0.32, 0.72, 0, 1] as const

// Page transition — like opening an app on iOS
export function PageTransition({ children }: { children: React.ReactNode }) {
  const shouldReduce = useReducedMotion()
  if (shouldReduce) return <>{children}</>
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  )
}

// Stagger container — like iOS widgets appearing
export function StaggerContainer({ children, className, stagger = 0.04 }: { children: React.ReactNode; className?: string; stagger?: number }) {
  const shouldReduce = useReducedMotion()
  if (shouldReduce) return <div className={className}>{children}</div>
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger } },
      }}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  const shouldReduce = useReducedMotion()
  if (shouldReduce) return <div className={className}>{children}</div>
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 12, scale: 0.98 },
        visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: "easeOut" } },
      }}
    >
      {children}
    </motion.div>
  )
}

// Apple card hover — like App Store cards
export function MotionCard({ children, className, hover = true, ...props }: React.ComponentProps<typeof motion.div> & { hover?: boolean }) {
  const shouldReduce = useReducedMotion()
  if (shouldReduce || !hover) return <div className={className} {...(props as unknown as React.HTMLAttributes<HTMLDivElement>)}>{children as React.ReactNode}</div>
  return (
    <motion.div
      className={className}
      whileHover={{ y: -2, scale: 1.005 }}
      whileTap={{ scale: 0.98 }}
      transition={appleSpring}
      {...(props as unknown as Record<string, unknown>)}
    >
      {children as React.ReactNode}
    </motion.div>
  )
}

// Apple button press — like iOS haptics
export function MotionButton({ children, ...props }: React.ComponentProps<typeof motion.button>) {
  const shouldReduce = useReducedMotion()
  if (shouldReduce) return <button {...(props as unknown as React.ButtonHTMLAttributes<HTMLButtonElement>)}>{children as React.ReactNode}</button>
  return (
    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }} transition={appleSpring} {...(props as unknown as Record<string, unknown>)}>
      {children as React.ReactNode}
    </motion.button>
  )
}

// Count up — like Apple Fitness rings
export function CountUp({ value, className }: { value: number; className?: string }) {
  const shouldReduce = useReducedMotion()
  const [display, setDisplay] = React.useState(shouldReduce ? value : 0)
  React.useEffect(() => {
    if (shouldReduce) { setDisplay(value); return }
    let raf = 0
    let start = performance.now()
    const duration = 600
    const from = 0
    const animate = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 4) // easeOutQuart like Apple
      setDisplay(Math.round(from + (value - from) * eased))
      if (t < 1) raf = requestAnimationFrame(animate)
    }
    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [value, shouldReduce])
  return <span className={className}>{display.toLocaleString("en-IN")}</span>
}
