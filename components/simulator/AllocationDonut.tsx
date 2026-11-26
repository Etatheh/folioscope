"use client";

import styles from "./simulator.module.css";

type Holding = { symbol: string; percent: number; color: string };

export default function AllocationDonut({ holdings, active, onActive, lang }: {
  holdings: Holding[];
  active: string | null;
  onActive: (symbol: string | null) => void;
  lang: "en" | "zh";
}) {
  const radius = 78;
  const circumference = 2 * Math.PI * radius;
  const nonZeroCount = holdings.filter((holding) => holding.percent > 0).length;
  const smallestArc = Math.min(...holdings.filter((holding) => holding.percent > 0).map((holding) => holding.percent / 100 * circumference));
  const gap = nonZeroCount > 1 ? Math.min(4, smallestArc / 3) : 0;

  return (
    <div className={styles.allocation}>
      <div className={styles.sectionHeading}>
        <h3>{lang === "zh" ? "持仓分布" : "Portfolio allocation"}</h3>
        <span>{lang === "zh" ? "目标权重" : "Target weights"}</span>
      </div>
      <div className={styles.donutLayout}>
        <svg viewBox="0 0 200 200" className={styles.donut} role="group" aria-label={lang === "zh" ? "目标持仓权重" : "Target portfolio weights"}>
          <circle cx="100" cy="100" r={radius} fill="none" stroke="#1F1F26" strokeWidth="10" />
          {holdings.map((holding, index) => {
            const length = holding.percent / 100 * circumference;
            const start = holdings.slice(0, index).reduce((sum, item) => sum + item.percent, 0) / 100 * circumference;
            if (!length) return null;
            // Each round cap extends past its path endpoint. Trim both angular
            // cap extents as well as the visible gap; tiny allocations taper
            // only when a full-width cap cannot fit inside their sector.
            const strokeWidth = nonZeroCount > 1 ? Math.min(10, (length - gap) / 2) : 10;
            const trim = nonZeroCount > 1 ? 2 * radius * Math.asin(strokeWidth / (2 * radius)) + gap : 0;
            return (
              <circle
                key={holding.symbol} cx="100" cy="100" r={radius}
                fill="none" stroke={holding.color} strokeWidth={strokeWidth} strokeLinecap="round"
                strokeDasharray={nonZeroCount === 1 ? undefined : `${length - trim} ${circumference - length + trim}`}
                strokeDashoffset={-start - trim / 2} transform="rotate(-90 100 100)"
                opacity={active && active !== holding.symbol ? 0.25 : 1}
                tabIndex={0} role="img" aria-label={`${holding.symbol}: ${holding.percent}%`}
                onPointerEnter={() => onActive(holding.symbol)} onPointerLeave={() => onActive(null)}
                onFocus={() => onActive(holding.symbol)} onBlur={() => onActive(null)}
                className={styles.sector}
              />
            );
          })}
          <text x="100" y="96" textAnchor="middle" fill="#FAFAFA" fontSize="26" fontWeight="600" letterSpacing="-0.8">
            {holdings.length}
            <tspan fontSize="12" fontWeight="400" letterSpacing="0" fill="#A1A1AA"> {lang === "zh" ? "项资产" : "assets"}</tspan>
          </text>
          <text x="100" y="119" textAnchor="middle" fill="#A1A1AA" fontSize="12">
            {`${holdings.length ? "100" : "0"}% ${lang === "zh" ? "已配置" : "allocated"}`}
          </text>
        </svg>
        <div className={styles.donutLegend}>
          {holdings.map((holding) => (
            <button key={holding.symbol} type="button" onPointerEnter={() => onActive(holding.symbol)} onPointerLeave={() => onActive(null)} onFocus={() => onActive(holding.symbol)} onBlur={() => onActive(null)} onClick={() => onActive(holding.symbol)} data-active={active === holding.symbol}>
              <i style={{ background: holding.color }} /><span>{holding.symbol}</span><b>{holding.percent}%</b>
            </button>
          ))}
        </div>
      </div>
      <p className={styles.allocationHint}>{lang === "zh" ? "悬停持仓，联动查看权重" : "Hover a holding to explore its allocation"}</p>
    </div>
  );
}
