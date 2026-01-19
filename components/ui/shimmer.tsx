"use client";

import { type CSSProperties, type ElementType, type JSX, memo, useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface TextShimmerProps {
  children: string;
  as?: ElementType;
  className?: string;
  duration?: number;
  spread?: number;
}

const ShimmerComponent = ({
  children,
  as: Component = "p",
  className,
  duration = 2,
  spread = 2,
}: TextShimmerProps) => {
  // Use motion.create if available, otherwise fall back to motion(Component)
  let MotionComponent;
  try {
    // Try motion.create first (available in newer framer-motion versions)
    if (typeof (motion as any).create === "function") {
      MotionComponent = (motion as any).create(
        Component as keyof JSX.IntrinsicElements
      );
    } else {
      // Fallback for older versions
      MotionComponent = motion[Component as keyof typeof motion] || motion.p;
    }
  } catch {
    // Final fallback
    MotionComponent = motion[Component as keyof typeof motion] || motion.p;
  }

  const dynamicSpread = useMemo(
    () => (children?.length ?? 0) * spread,
    [children, spread]
  );

  return (
    <MotionComponent
      animate={{ backgroundPosition: "0% center" }}
      className={cn(
        "relative inline-block bg-[length:250%_100%,auto] bg-clip-text text-transparent",
        "[background-repeat:no-repeat,padding-box]",
        className
      )}
      initial={{ backgroundPosition: "100% center" }}
      style={
        {
          "--spread": `${dynamicSpread}px`,
          backgroundImage: `linear-gradient(90deg, transparent calc(50% - var(--spread)), #ffffff calc(50% - var(--spread)), #ffffff calc(50% + var(--spread)), transparent calc(50% + var(--spread))), linear-gradient(#0b0b0c, #0b0b0c)`,
        } as CSSProperties
      }
      transition={{
        repeat: Number.POSITIVE_INFINITY,
        duration,
        ease: "linear",
      }}
    >
      {children}
    </MotionComponent>
  );
};

export const Shimmer = memo(ShimmerComponent);
