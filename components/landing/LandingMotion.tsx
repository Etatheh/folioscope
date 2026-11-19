"use client";

import { Children, useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import type { Lang } from "@/lib/i18n";
import ProductPreview from "./ProductPreview";
import { Reveal } from "@/components/ui/Reveal";
import styles from "./landing.module.css";

export function TiltPreview({ lang }: { lang: Lang }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const rotateX = useTransform(scrollYProgress, [0, 1], [12, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.94, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [32, 0]);
  return <div ref={ref} className={styles.perspective}><Reveal delay={0.68}>
    <motion.div style={reduced ? {} : { rotateX, scale, y, transformOrigin: "center top" }}>
      <ProductPreview lang={lang} />
    </motion.div>
  </Reveal></div>;
}

export function FeatureRail({ children, lang }: { children: ReactNode; lang: Lang }) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const [index, setIndex] = useState(0);
  const [atEnd, setAtEnd] = useState(false);
  const reduced = useReducedMotion();
  const items = Children.toArray(children);
  useEffect(() => {
    const rail = ref.current;
    if (!rail) return;
    const observer = new ResizeObserver(() => setAtEnd(rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 2));
    observer.observe(rail);
    return () => observer.disconnect();
  }, []);
  function go(next: number) {
    const rail = ref.current;
    const card = rail?.children[Math.max(0, Math.min(next, items.length - 1))] as HTMLElement | undefined;
    if (rail && card) rail.scrollTo({ left: card.offsetLeft, behavior: reduced ? "instant" : "smooth" });
  }
  return <div>
    <div className={styles.railToolbar}>
      <p>{lang === "zh" ? "左右滑动，探索你的研究工具" : "Your research toolkit. Swipe to explore."}</p>
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm text-slate-400" aria-live="polite">{String(index + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}</span>
        <button type="button" className={styles.railButton} aria-label={lang === "zh" ? "上一项功能" : "Previous feature"} disabled={index === 0} onClick={() => go(index - 1)}>‹</button>
        <button type="button" className={styles.railButton} aria-label={lang === "zh" ? "下一项功能" : "Next feature"} disabled={atEnd} onClick={() => go(index + 1)}>›</button>
      </div>
    </div>
    <div ref={ref} className={styles.rail} role="region" aria-label={lang === "zh" ? "核心功能" : "Core features"} tabIndex={0}
      onScroll={() => {
        const rail = ref.current;
        if (!rail) return;
        const step = (rail.children[0] as HTMLElement)?.offsetWidth + 20;
        setIndex(Math.min(items.length - 1, Math.round(rail.scrollLeft / step)));
        setAtEnd(rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 2);
      }}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
          event.preventDefault(); go(index + (event.key === "ArrowRight" ? 1 : -1));
        }
      }}
      onPointerDown={(event) => {
        if (event.pointerType !== "mouse" || event.button !== 0 || (event.target as HTMLElement).closest("a,button")) return;
        drag.current = { x: event.clientX, left: event.currentTarget.scrollLeft, moved: false };
      }}
      onPointerMove={(event) => {
        if (!drag.current) return;
        const delta = event.clientX - drag.current.x;
        if (Math.abs(delta) > 5 && !drag.current.moved) {
          drag.current.moved = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          event.currentTarget.dataset.dragging = "true";
        }
        if (drag.current.moved) event.currentTarget.scrollLeft = drag.current.left - delta;
      }}
      onPointerUp={(event) => {
        const moved = drag.current?.moved;
        drag.current = null;
        delete event.currentTarget.dataset.dragging;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        if (moved) go(index);
      }}
      onPointerCancel={(event) => { drag.current = null; delete event.currentTarget.dataset.dragging; }}
      onPointerLeave={() => { if (!drag.current?.moved) drag.current = null; }}
    >{items}</div>
  </div>;
}

export function ResearchStory({ lang }: { lang: Lang }) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const zh = lang === "zh";
  const steps = zh ? [
    ["从全球视野开始。", "将美股、欧洲和亚太市场汇聚在同一个工作空间，结合技术指标与估值，发现值得深入研究的标的。"],
    ["让历史检验你的想法。", "配置组合权重，比较一次性投入与定投策略。用长达 10 年的历史数据，对照标普 500，理解收益与回撤。"],
    ["从财报中提炼重点。", "借助 DeepSeek AI 梳理财报、估值与风险，将市场观察转化为更清晰的研究思路。"],
  ] : [
    ["Start with the bigger picture.", "Bring U.S., European and Asia-Pacific markets into one workspace. Read technical indicators and valuations to find what deserves a closer look."],
    ["Put your thesis through time.", "Set your weights. Compare lump sum and DCA strategies across up to 10 years of history, benchmarked against the S&P 500."],
    ["Find the signal in the filings.", "Explore financial reports, valuations and risks with DeepSeek AI. Turn market observations into a clearer research perspective."],
  ];
  useEffect(() => {
    const nodes = ref.current?.querySelectorAll<HTMLElement>("[data-step]");
    if (!nodes) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.step));
    }, { rootMargin: "-35% 0px -40% 0px", threshold: 0 });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} className={styles.story}>
    <div className={styles.steps}>{steps.map(([title, desc], i) => <div key={title} data-step={i} className={styles.step}>
      <Reveal><button type="button" aria-pressed={active === i} onClick={() => setActive(i)} className={styles.stepButton}>
        <span className={styles.stepLine} style={{ opacity: active === i ? 1 : 0.2 }} />
        <span className="block text-sm tracking-widest text-violet-300">{["MARKETS", "SIMULATOR", "AI RESEARCH"][i]}</span>
        <span className="mt-5 block text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl">{title}</span>
      </button>
      <p className="mt-5 max-w-md text-base leading-8 text-slate-400">{desc}</p></Reveal>
    </div>)}</div>
    <div className={styles.sticky}><Reveal><ProductPreview lang={lang} active={active} onChange={setActive} compact /></Reveal></div>
  </div>;
}
