"use client";

import { Children } from "react";
import { motion, useReducedMotion } from "framer-motion";

type StaggerGridProps = {
  children: React.ReactNode;
  className?: string;
  /** Seconds between two items. */
  stagger?: number;
  /** Seconds before the first item appears. */
  delay?: number;
  /** Pixels the items rise while fading in. */
  distance?: number;
};

const EASE = [0.22, 0.61, 0.36, 1] as const;

/**
 * Fades and lifts a list of cards in one after another (watchlist / quote grids).
 * Children are server-rendered nodes; only the wrapper is interactive.
 */
export default function StaggerGrid({
  children,
  className = "",
  stagger = 0.055,
  delay = 0,
  distance = 16,
}: StaggerGridProps) {
  const reduceMotion = useReducedMotion();
  const items = Children.toArray(children);

  return (
    <div className={className}>
      {items.map((child, index) => (
        <motion.div
          key={index}
          className="h-full"
          initial={reduceMotion ? false : { opacity: 0, y: distance }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.5,
            delay: delay + Math.min(index * stagger, 0.8),
            ease: EASE,
          }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
}
