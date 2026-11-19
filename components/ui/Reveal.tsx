"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import styles from "./reveal.module.css";

const elements = {
  div: motion.div,
  section: motion.section,
  article: motion.article,
  p: motion.p,
  h1: motion.h1,
  h2: motion.h2,
};
type Element = keyof typeof elements;
const ease = [0.16, 1, 0.3, 1] as const;
const viewport = { once: true, amount: 0.15 } as const;
const hidden = { opacity: 0, y: 20, scale: 0.98, filter: "blur(6px)" };
const EntranceComplete = createContext(true);

/** Allows an inner illustration to start after its outer card has entered. */
export function useEntranceComplete() {
  return useContext(EntranceComplete);
}

type RevealProps = {
  children: ReactNode;
  className?: string;
  as?: Element;
  id?: string;
  /** Initial page content enters on mount; other content enters in view. */
  scroll?: boolean;
  delay?: number;
  /** Receive timing and visibility from a surrounding StaggerGroup. */
  inherit?: boolean;
};

/** Hidden HTML is emitted on the server, with the same hydration state.
 * CSS handles reduced motion before hydration; never hide content in an effect.
 */
export function Reveal({ children, className = "", as = "div", id, scroll = true, delay = 0.24, inherit = false }: RevealProps) {
  const reduced = useReducedMotion();
  const [complete, setComplete] = useState(false);
  const Component = elements[as];
  const variants: Variants = {
    hidden,
    visible: {
      opacity: 1, y: 0, scale: 1, filter: "blur(0px)",
      transition: { duration: reduced ? 0 : 0.8, delay: reduced || inherit ? 0 : delay, ease },
      // A filter/transform left on a wrapper would create a containing block
      // for descendant fixed tooltips and drawers, even with zero blur.
      transitionEnd: { filter: "none", transform: "none" },
    },
  };
  return <Component
    id={id}
    className={`${styles.item} ${className}`}
    variants={variants}
    onAnimationComplete={(definition) => { if (definition === "visible") setComplete(true); }}
    {...(inherit ? {} : { initial: "hidden", ...(scroll ? { whileInView: "visible", viewport } : { animate: "visible" }) })}
  ><EntranceComplete.Provider value={complete || !!reduced}>{children}</EntranceComplete.Provider></Component>;
}

export function StaggerGroup({ children, className = "", as = "div", id, scroll = true, delay = 0.24 }: Omit<RevealProps, "inherit">) {
  const reduced = useReducedMotion();
  const Component = elements[as];
  const variants: Variants = {
    hidden: {},
    visible: { transition: { delayChildren: reduced ? 0 : delay, staggerChildren: reduced ? 0 : 0.11 } },
  };
  return <Component id={id} className={className} variants={variants} initial="hidden"
    {...(scroll ? { whileInView: "visible", viewport } : { animate: "visible" })}
  >{children}</Component>;
}
