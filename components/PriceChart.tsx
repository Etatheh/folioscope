"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type TouchEvent as ReactTouchEvent,
} from "react";
import type { IntradayPoint, IntradaySession } from "@/lib/intraday";
import type { Candle } from "@/lib/us-stocks";
import { dict, type Lang } from "@/lib/i18n";
import { aggregateCandles, bollinger, macd, rsi, sma } from "./chart/indicators";

const W = 760;
const H_PRICE = 300;
const H_VOL = 64;
const GAP = 10;
const PAD_L = 10;
const PAD_R = 54;
const PAD_T = 8;
const LABEL_H = 18;

// The 5D chart needs a left price axis because the right axis shows % change.
const INTRADAY_PAD_L = 50;

const H_TOTAL = PAD_T + H_PRICE + GAP + H_VOL + LABEL_H;
const VOL_TOP = PAD_T + H_PRICE + GAP;
const VOL_BOTTOM = VOL_TOP + H_VOL;
const SUB_TAB_H = 14;
const SUB_TOP = VOL_TOP + SUB_TAB_H;

type Period = "5d" | "daily" | "weekly" | "monthly";
type SubChart = "vol" | "rsi" | "macd";

type HoverState = { index: number; y: number } | null;

type IntradayFlatPoint = IntradayPoint & {
  date: string;
  sessionIndex: number;
  /** close of the previous session (or the close before the 5-day window) */
  prevClose: number;
  /** exact SVG x position */
  x: number;
};

const PERIOD_KEYS: Period[] = ["5d", "daily", "weekly", "monthly"];

// New chart controls are English-only per the project's English-first policy.
const CHART_TEXT = {
  "5d": "5D",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  price: "Price",
  avg: "AVG",
  baseline: "Baseline",
  volume: "Vol",
  loadingIntraday: "Loading 5D intraday…",
  intradayUnavailable: "5D intraday unavailable",
  retry: "Retry",
} as const;

const MA_CONFIG = [
  { key: "ma5" as const, label: "MA5", color: "#60a5fa" },
  { key: "ma10" as const, label: "MA10", color: "#a78bfa" },
  { key: "ma20" as const, label: "MA20", color: "#fbbf24" },
];

const BOLL_COLOR = "#f472b6";
const BOLL_MID_COLOR = "#c084fc";

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;

const fmtVolumeCompact = (n: number) => {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(Math.round(n));
};

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

function nearestIndex(xs: readonly number[], target: number): number {
  let best = 0;
  let bestDiff = Infinity;
  for (let i = 0; i < xs.length; i++) {
    const diff = Math.abs(xs[i] - target);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i;
    }
  }
  return best;
}

function linePath(
  values: readonly (number | null)[],
  xAt: (i: number) => number,
  yAt: (value: number) => number
): string {
  let d = "";
  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    if (value === null) continue;
    const previous = i > 0 ? values[i - 1] : null;
    d += `${previous === null ? "M" : "L"}${xAt(i).toFixed(1)} ${yAt(value).toFixed(1)}`;
  }
  return d;
}

function bandPath(
  upper: readonly (number | null)[],
  lower: readonly (number | null)[],
  xAt: (i: number) => number,
  yAt: (value: number) => number
): string {
  const first = upper.findIndex(
    (value, i) => value !== null && lower[i] !== null
  );
  if (first < 0) return "";

  let d = "";
  for (let i = first; i < upper.length; i++) {
    if (upper[i] === null || lower[i] === null) continue;
    d += `${d ? "L" : "M"}${xAt(i).toFixed(1)} ${yAt(upper[i] as number).toFixed(1)}`;
  }
  for (let i = upper.length - 1; i >= first; i--) {
    if (upper[i] === null || lower[i] === null) continue;
    d += `L${xAt(i).toFixed(1)} ${yAt(lower[i] as number).toFixed(1)}`;
  }
  return d ? `${d}Z` : "";
}

function sliceFrom<T>(values: readonly T[], start: number): T[] {
  return values.slice(start);
}

function LegendLine({
  color,
  label,
  dashed = false,
}: {
  color: string;
  label: string;
  dashed?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {dashed ? (
        <span
          className="inline-block w-4 border-t border-dashed"
          style={{ borderColor: color }}
        />
      ) : (
        <span
          className="inline-block h-0.5 w-4 rounded"
          style={{ background: color }}
        />
      )}
      {label}
    </span>
  );
}

function SubTabs({
  active,
  left,
  onChange,
}: {
  active: SubChart;
  left: number;
  onChange: (tab: SubChart) => void;
}) {
  const tabs: { key: SubChart; label: string }[] = [
    { key: "vol", label: "VOL" },
    { key: "rsi", label: "RSI" },
    { key: "macd", label: "MACD" },
  ];

  return (
    <g>
      {tabs.map((tab, index) => {
        const x = left + index * 37;
        const selected = active === tab.key;
        return (
          <g
            key={tab.key}
            role="button"
            tabIndex={0}
            aria-label={tab.label}
            onClick={() => onChange(tab.key)}
            onKeyDown={(event: ReactKeyboardEvent<SVGGElement>) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onChange(tab.key);
              }
            }}
            style={{ cursor: "pointer" }}
          >
            <rect
              x={x}
              y={VOL_TOP}
              width={34}
              height={SUB_TAB_H - 2}
              rx={3}
              fill={
                selected ? "rgba(168,85,247,0.22)" : "rgba(255,255,255,0.025)"
              }
              stroke={
                selected
                  ? "rgba(192,132,252,0.4)"
                  : "rgba(255,255,255,0.05)"
              }
              strokeWidth={0.8}
            />
            <text
              x={x + 17}
              y={VOL_TOP + SUB_TAB_H - 5}
              textAnchor="middle"
              fontSize={8.5}
              fill={selected ? "#e9d5ff" : "#64748b"}
            >
              {tab.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function AxisPill({
  x,
  y,
  width,
  text,
  tone = "price",
}: {
  x: number;
  y: number;
  width: number;
  text: string;
  tone?: "price" | "pct";
}) {
  return (
    <g pointerEvents="none">
      <rect
        x={x}
        y={y}
        width={width}
        height={16}
        rx={3}
        fill="#111827"
        stroke={tone === "pct" ? "#a78bfa" : "#6366f1"}
        strokeOpacity={0.65}
      />
      <text
        x={x + width / 2}
        y={y + 11.5}
        textAnchor="middle"
        fontSize={9.5}
        fill="#e2e8f0"
      >
        {text}
      </text>
    </g>
  );
}

export default function PriceChart({
  bars,
  symbol,
  lang = "en",
  fallbackPrevClose = 0,
}: {
  bars: Candle[];
  symbol: string;
  lang?: Lang;
  fallbackPrevClose?: number;
}) {
  const tx = dict[lang].detail;
  const [period, setPeriod] = useState<Period>("daily");
  const [showMa, setShowMa] = useState(true);
  const [showBoll, setShowBoll] = useState(false);
  const [subChart, setSubChart] = useState<SubChart>("vol");
  const [hover, setHover] = useState<HoverState>(null);

  const [intraday, setIntraday] = useState<IntradaySession[] | null>(null);
  const [intradayLoading, setIntradayLoading] = useState(false);
  const [intradayError, setIntradayError] = useState(false);
  const inFlight = useRef(false);

  const loadIntraday = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setIntradayLoading(true);
    setIntradayError(false);
    try {
      const response = await fetch(
        `/api/markets/intraday?symbol=${encodeURIComponent(symbol)}`,
        { cache: "no-store" }
      );
      const payload = (await response.json()) as {
        ok?: boolean;
        sessions?: IntradaySession[];
      };
      if (!response.ok || !payload.ok || !Array.isArray(payload.sessions)) {
        throw new Error("intraday unavailable");
      }
      setIntraday(payload.sessions);
    } catch {
      setIntradayError(true);
    } finally {
      inFlight.current = false;
      setIntradayLoading(false);
    }
  }, [symbol]);

  const selectPeriod = (next: Period) => {
    setPeriod(next);
    setHover(null);
    if (next === "5d" && !intraday) void loadIntraday();
  };

  const weeklyBars = useMemo(() => aggregateCandles(bars, "weekly"), [bars]);
  const monthlyBars = useMemo(() => aggregateCandles(bars, "monthly"), [bars]);

  const candle = useMemo(() => {
    const full =
      period === "weekly"
        ? weeklyBars
        : period === "monthly"
          ? monthlyBars
          : bars;
    const closes = full.map((bar) => bar.close);
    const ma5 = sma(closes, 5);
    const ma10 = sma(closes, 10);
    const ma20 = sma(closes, 20);
    const boll = bollinger(closes, 20, 2);
    const rsi14 = rsi(closes, 14);
    const macdSeries = macd(closes, 12, 26, 9);

    const window =
      period === "daily" ? 130 : period === "weekly" ? 78 : 60;
    const start = Math.max(0, full.length - window);

    return {
      bars: sliceFrom(full, start),
      ma5: sliceFrom(ma5, start),
      ma10: sliceFrom(ma10, start),
      ma20: sliceFrom(ma20, start),
      boll: {
        mid: sliceFrom(boll.mid, start),
        upper: sliceFrom(boll.upper, start),
        lower: sliceFrom(boll.lower, start),
      },
      rsi: sliceFrom(rsi14, start),
      macd: {
        dif: sliceFrom(macdSeries.dif, start),
        dea: sliceFrom(macdSeries.dea, start),
        hist: sliceFrom(macdSeries.hist, start),
      },
    };
  }, [period, bars, weeklyBars, monthlyBars]);

  const intradayModel = useMemo(() => {
    if (!intraday || intraday.length === 0) return null;

    const firstDate = intraday[0].date;
    let baseline =
      fallbackPrevClose > 0 ? fallbackPrevClose : 0;
    for (let i = bars.length - 1; i >= 0; i--) {
      if (bars[i].date < firstDate) {
        baseline = bars[i].close;
        break;
      }
    }

    const plotLeft = INTRADAY_PAD_L;
    const plotRight = W - PAD_R;
    const sessionWidth = (plotRight - plotLeft) / intraday.length;

    const points: IntradayFlatPoint[] = [];
    const sessionPoints: IntradayFlatPoint[][] = [];
    const sessionCenters: { date: string; x: number }[] = [];
    let previousClose = baseline;

    intraday.forEach((session, sessionIndex) => {
      const list: IntradayFlatPoint[] = [];
      session.points.forEach((point, pointIndex) => {
        const x =
          plotLeft +
          sessionWidth * sessionIndex +
          (sessionWidth * (pointIndex + 0.5)) / session.points.length;
        const flat: IntradayFlatPoint = {
          ...point,
          date: session.date,
          sessionIndex,
          prevClose: previousClose,
          x,
        };
        list.push(flat);
        points.push(flat);
      });
      sessionPoints.push(list);
      sessionCenters.push({
        date: session.date,
        x: plotLeft + sessionWidth * (sessionIndex + 0.5),
      });

      const last = session.points[session.points.length - 1];
      if (last && last.close > 0) previousClose = last.close;
    });

    const latest = points[points.length - 1] ?? null;
    const indicatorCloses = points.map((point) => point.close);

    return {
      points,
      sessionPoints,
      sessionCenters,
      plotLeft,
      plotRight,
      sessionWidth,
      baseline: baseline > 0 ? baseline : latest?.prevClose ?? latest?.close ?? 0,
      latest,
      latestAvg: latest?.vwap ?? null,
      rsi: rsi(indicatorCloses, 14),
      macd: macd(indicatorCloses, 12, 26, 9),
    };
  }, [intraday, bars, fallbackPrevClose]);

  const isIntraday = period === "5d";
  const activeCount = isIntraday
    ? (intradayModel?.points.length ?? 0)
    : candle.bars.length;
  const activeIndex =
    hover && hover.index < activeCount ? hover.index : activeCount - 1;

  const hud = useMemo(() => {
    if (isIntraday) {
      const point = intradayModel?.points[activeIndex];
      if (!point) return null;
      return {
        label: `${point.date.slice(5)} ${point.time}`,
        open: point.open,
        high: point.high,
        low: point.low,
        close: point.close,
        pct:
          point.prevClose > 0
            ? ((point.close - point.prevClose) / point.prevClose) * 100
            : null,
        volume: point.volume,
        avg: point.vwap,
      };
    }

    const bar = candle.bars[activeIndex];
    if (!bar) return null;
    const previous = activeIndex > 0 ? candle.bars[activeIndex - 1].close : null;
    return {
      label: period === "monthly" ? bar.date.slice(0, 7) : bar.date,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
      pct:
        previous !== null && previous > 0
          ? ((bar.close - previous) / previous) * 100
          : null,
      volume: bar.volume,
      avg: null as number | null,
    };
  }, [isIntraday, intradayModel, activeIndex, period, candle.bars]);

  const hudUp = hud
    ? hud.pct !== null
      ? hud.pct >= 0
      : hud.close >= hud.open
    : true;

  const updateHover = useCallback(
    (
      svg: SVGSVGElement,
      clientX: number,
      clientY: number,
      xs: readonly number[]
    ) => {
      const rect = svg.getBoundingClientRect();
      if (!rect.width || !rect.height || xs.length === 0) return;
      const svgX = ((clientX - rect.left) / rect.width) * W;
      const svgY = ((clientY - rect.top) / rect.height) * H_TOTAL;
      setHover({
        index: nearestIndex(xs, svgX),
        y: clamp(svgY, PAD_T, PAD_T + H_PRICE),
      });
    },
    []
  );

  const periodLabels: Record<Period, string> = {
    "5d": CHART_TEXT["5d"],
    daily: CHART_TEXT.daily,
    weekly: CHART_TEXT.weekly,
    monthly: CHART_TEXT.monthly,
  };

  const placeholder = (message: string, retry = false) => (
    <svg
      viewBox={`0 0 ${W} ${H_TOTAL}`}
      className="w-full select-none"
      role="img"
      aria-label={`${symbol} ${message}`}
    >
      <rect x={0} y={0} width={W} height={H_TOTAL} fill="transparent" />
      <text
        x={W / 2}
        y={H_TOTAL / 2 - 8}
        textAnchor="middle"
        fontSize="12"
        fill="#64748b"
      >
        {message}
      </text>
      {retry && (
        <g
          role="button"
          tabIndex={0}
          onClick={() => void loadIntraday()}
          onKeyDown={(event: ReactKeyboardEvent<SVGGElement>) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              void loadIntraday();
            }
          }}
          style={{ cursor: "pointer" }}
        >
          <rect
            x={W / 2 - 34}
            y={H_TOTAL / 2 + 10}
            width={68}
            height={22}
            rx={11}
            fill="rgba(168,85,247,0.12)"
            stroke="rgba(192,132,252,0.35)"
          />
          <text
            x={W / 2}
            y={H_TOTAL / 2 + 25}
            textAnchor="middle"
            fontSize={11}
            fill="#c4b5fd"
          >
            {CHART_TEXT.retry}
          </text>
        </g>
      )}
    </svg>
  );

  const renderIntraday = () => {
    if (intradayLoading) return placeholder(CHART_TEXT.loadingIntraday);
    if (intradayError) return placeholder(CHART_TEXT.intradayUnavailable, true);
    if (!intradayModel || intradayModel.points.length === 0) {
      return placeholder(CHART_TEXT.intradayUnavailable);
    }

    const {
      points,
      sessionPoints,
      sessionCenters,
      plotLeft,
      plotRight,
      sessionWidth,
      baseline,
      rsi: intradayRsi,
      macd: intradayMacd,
    } = intradayModel;

    const closes = points.map((point) => point.close);
    const vwaps = points.map((point) => point.vwap);
    const rawMin = Math.min(...closes, ...vwaps, baseline);
    const rawMax = Math.max(...closes, ...vwaps, baseline);
    const pad = (rawMax - rawMin) * 0.06 || Math.max(0.01, rawMax * 0.001);
    const min = rawMin - pad;
    const max = rawMax + pad;

    const priceY = (price: number) =>
      PAD_T + ((max - price) / (max - min)) * (H_PRICE - PAD_T);
    const pctAt = (price: number) =>
      baseline > 0 ? ((price - baseline) / baseline) * 100 : 0;

    const maxVolume = Math.max(1, ...points.map((point) => point.volume));
    const volumeY = (volume: number) =>
      VOL_BOTTOM - (volume / maxVolume) * (VOL_BOTTOM - SUB_TOP);
    const xAt = (index: number) => points[index]?.x ?? plotLeft;
    const rsiY = (value: number) =>
      SUB_TOP + (1 - value / 100) * (VOL_BOTTOM - SUB_TOP);
    const macdValues = [
      ...intradayMacd.dif,
      ...intradayMacd.dea,
      ...intradayMacd.hist,
    ].filter((value): value is number => value !== null);
    const macdMax = Math.max(1e-9, ...macdValues.map((value) => Math.abs(value)));
    const macdMid = (SUB_TOP + VOL_BOTTOM) / 2;
    const macdY = (value: number) =>
      macdMid - (value / macdMax) * ((VOL_BOTTOM - SUB_TOP) / 2 - 2);
    const lastIntradayRsi =
      [...intradayRsi].reverse().find((value) => value !== null) ?? null;

    const levels = [0, 1, 2, 3, 4].map(
      (index) => min + ((max - min) * index) / 4
    );
    const baselineY = priceY(baseline);
    const xs = points.map((point) => point.x);

    const hovered =
      hover && hover.index < points.length ? points[hover.index] : null;
    const hoverY = hover ? hover.y : null;
    const pointerPrice =
      hoverY !== null
        ? max - ((hoverY - PAD_T) / (H_PRICE - PAD_T)) * (max - min)
        : null;

    return (
      <svg
        viewBox={`0 0 ${W} ${H_TOTAL}`}
        className="w-full select-none"
        style={{ touchAction: "pan-y" }}
        onMouseMove={(event: ReactMouseEvent<SVGSVGElement>) =>
          updateHover(event.currentTarget, event.clientX, event.clientY, xs)
        }
        onMouseLeave={() => setHover(null)}
        onTouchStart={(event: ReactTouchEvent<SVGSVGElement>) => {
          const touch = event.touches[0];
          if (touch) {
            updateHover(
              event.currentTarget,
              touch.clientX,
              touch.clientY,
              xs
            );
          }
        }}
        onTouchMove={(event: ReactTouchEvent<SVGSVGElement>) => {
          const touch = event.touches[0];
          if (touch) {
            updateHover(
              event.currentTarget,
              touch.clientX,
              touch.clientY,
              xs
            );
          }
        }}
        onTouchEnd={() => setHover(null)}
        onTouchCancel={() => setHover(null)}
        role="img"
        aria-label={`${symbol} ${CHART_TEXT["5d"]}`}
      >
        <defs>
          <linearGradient id="intraday-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#818cf8" stopOpacity="0.26" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="intraday-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#818cf8" />
          </linearGradient>
        </defs>

        {levels.map((price) => (
          <g key={price}>
            <line
              x1={plotLeft}
              x2={plotRight}
              y1={priceY(price)}
              y2={priceY(price)}
              stroke="rgba(148,163,184,0.10)"
            />
            <text
              x={4}
              y={priceY(price) + 3.5}
              fontSize="9.5"
              fill="#64748b"
            >
              {fmt(price)}
            </text>
            <text
              x={plotRight + 6}
              y={priceY(price) + 3.5}
              fontSize="9.5"
              fill="#64748b"
            >
              {fmtPct(pctAt(price))}
            </text>
          </g>
        ))}

        {sessionCenters.slice(1).map((center) => {
          const separatorX = center.x - sessionWidth / 2;
          return (
            <line
              key={center.date}
              x1={separatorX}
              x2={separatorX}
              y1={PAD_T}
              y2={VOL_BOTTOM}
              stroke="rgba(148,163,184,0.20)"
              strokeDasharray="3 4"
            />
          );
        })}

        <line
          x1={plotLeft}
          x2={plotRight}
          y1={baselineY}
          y2={baselineY}
          stroke="#fbbf24"
          strokeOpacity="0.42"
          strokeDasharray="5 4"
        />

        {sessionPoints.map((session, sessionIndex) => {
          if (session.length === 0) return null;
          const priceD = session
            .map(
              (point, index) =>
                `${index ? "L" : "M"}${point.x.toFixed(1)} ${priceY(
                  point.close
                ).toFixed(1)}`
            )
            .join("");
          const avgD = session
            .map(
              (point, index) =>
                `${index ? "L" : "M"}${point.x.toFixed(1)} ${priceY(
                  point.vwap
                ).toFixed(1)}`
            )
            .join("");
          const first = session[0];
          const last = session[session.length - 1];
          const areaD = `${priceD}L${last.x.toFixed(1)} ${(
            PAD_T + H_PRICE
          ).toFixed(1)}L${first.x.toFixed(1)} ${(PAD_T + H_PRICE).toFixed(1)}Z`;

          return (
            <g key={`session-line-${sessionIndex}`}>
              <path d={areaD} fill="url(#intraday-area)" />
              <path
                d={priceD}
                fill="none"
                stroke="#818cf8"
                strokeWidth="5"
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity="0.10"
              />
              <path
                d={priceD}
                fill="none"
                stroke="url(#intraday-line)"
                strokeWidth="1.8"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <path
                d={avgD}
                fill="none"
                stroke="#fbbf24"
                strokeWidth="1.15"
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity="0.9"
              />
            </g>
          );
        })}

        {subChart === "vol" &&
          points.map((point) => {
            const up = point.close >= point.open;
            const pointsInSession = sessionPoints[point.sessionIndex].length;
            const width = Math.max(
              1,
              Math.min(7, (sessionWidth / Math.max(1, pointsInSession)) * 0.55)
            );
            const top = volumeY(point.volume);
            return (
              <rect
                key={`${point.date}-${point.time}`}
                x={point.x - width / 2}
                y={top}
                width={width}
                height={Math.max(1, VOL_BOTTOM - top)}
                fill={up ? "#34d399" : "#fb7185"}
                opacity="0.28"
              />
            );
          })}

        {subChart === "rsi" && (
          <>
            <line
              x1={plotLeft}
              x2={plotRight}
              y1={rsiY(70)}
              y2={rsiY(70)}
              stroke="rgba(251,113,133,0.22)"
              strokeDasharray="3 4"
            />
            <line
              x1={plotLeft}
              x2={plotRight}
              y1={rsiY(30)}
              y2={rsiY(30)}
              stroke="rgba(52,211,153,0.22)"
              strokeDasharray="3 4"
            />
            <line
              x1={plotLeft}
              x2={plotRight}
              y1={rsiY(50)}
              y2={rsiY(50)}
              stroke="rgba(148,163,184,0.10)"
            />
            <path
              d={linePath(intradayRsi, xAt, rsiY)}
              fill="none"
              stroke="#c084fc"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            <text
              x={plotRight + 6}
              y={rsiY(70) + 3.5}
              fontSize="9"
              fill="#475569"
            >
              70
            </text>
            <text
              x={plotRight + 6}
              y={rsiY(30) + 3.5}
              fontSize="9"
              fill="#475569"
            >
              30
            </text>
            {lastIntradayRsi !== null && (
              <text
                x={plotRight - 2}
                y={SUB_TOP + 9}
                textAnchor="end"
                fontSize="9"
                fill="#a78bfa"
              >
                RSI(14) {lastIntradayRsi.toFixed(1)}
              </text>
            )}
          </>
        )}

        {subChart === "macd" && (
          <>
            <line
              x1={plotLeft}
              x2={plotRight}
              y1={macdMid}
              y2={macdMid}
              stroke="rgba(148,163,184,0.16)"
            />
            {intradayMacd.hist.map((value, index) => {
              if (value === null) return null;
              const point = points[index];
              if (!point) return null;
              const pointsInSession = sessionPoints[point.sessionIndex].length;
              const width = Math.max(
                1,
                Math.min(
                  4,
                  (sessionWidth / Math.max(1, pointsInSession)) * 0.5
                )
              );
              const y = macdY(value);
              return (
                <rect
                  key={`intraday-hist-${index}`}
                  x={point.x - width / 2}
                  y={Math.min(y, macdMid)}
                  width={width}
                  height={Math.max(1, Math.abs(macdMid - y))}
                  fill={value >= 0 ? "#34d399" : "#fb7185"}
                  opacity="0.45"
                />
              );
            })}
            <path
              d={linePath(intradayMacd.dif, xAt, macdY)}
              fill="none"
              stroke="#60a5fa"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            <path
              d={linePath(intradayMacd.dea, xAt, macdY)}
              fill="none"
              stroke="#fbbf24"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            <text
              x={plotRight - 2}
              y={SUB_TOP + 9}
              textAnchor="end"
              fontSize="9"
              fill="#93c5fd"
            >
              MACD(12,26,9)
            </text>
          </>
        )}

        <line
          x1={plotLeft}
          x2={plotRight}
          y1={VOL_BOTTOM}
          y2={VOL_BOTTOM}
          stroke="rgba(148,163,184,0.10)"
        />

        {sessionCenters.map((center) => (
          <text
            key={`label-${center.date}`}
            x={center.x}
            y={H_TOTAL - 4}
            fontSize="10"
            fill="#64748b"
            textAnchor="middle"
          >
            {center.date.slice(5)}
          </text>
        ))}

        <SubTabs active={subChart} left={plotLeft} onChange={setSubChart} />

        {hovered && hoverY !== null && pointerPrice !== null && (
          <g>
            <line
              x1={plotLeft}
              x2={plotRight}
              y1={hoverY}
              y2={hoverY}
              stroke="#94a3b8"
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.55"
            />
            <line
              x1={hovered.x}
              x2={hovered.x}
              y1={PAD_T}
              y2={VOL_BOTTOM}
              stroke="#94a3b8"
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.55"
            />
            <circle
              cx={hovered.x}
              cy={priceY(hovered.close)}
              r="3.5"
              fill={hovered.close >= hovered.prevClose ? "#34d399" : "#fb7185"}
              stroke="#030712"
              strokeWidth="1.5"
            />
            <AxisPill
              x={2}
              y={clamp(hoverY - 8, PAD_T, PAD_T + H_PRICE - 16)}
              width={46}
              text={fmt(pointerPrice)}
            />
            <AxisPill
              x={plotRight + 2}
              y={clamp(hoverY - 8, PAD_T, PAD_T + H_PRICE - 16)}
              width={50}
              text={fmtPct(pctAt(pointerPrice))}
              tone="pct"
            />
            <AxisPill
              x={clamp(
                hovered.x - 39,
                plotLeft,
                plotRight - 78
              )}
              y={H_TOTAL - 16}
              width={78}
              text={`${hovered.date.slice(5)} ${hovered.time}`}
              tone="pct"
            />
          </g>
        )}
      </svg>
    );
  };

  const renderCandles = () => {
    const view = candle.bars;
    const n = view.length;
    if (n === 0) return placeholder(tx.noKline);

    const slot = (W - PAD_L - PAD_R) / n;
    const xAt = (index: number) => PAD_L + slot * (index + 0.5);
    const xs = view.map((_, index) => xAt(index));

    let min = Infinity;
    let max = -Infinity;
    let maxVolume = 0;
    for (const bar of view) {
      if (bar.low < min) min = bar.low;
      if (bar.high > max) max = bar.high;
      if (bar.volume > maxVolume) maxVolume = bar.volume;
    }
    if (showMa) {
      for (const series of [candle.ma5, candle.ma10, candle.ma20]) {
        for (const value of series) {
          if (value === null) continue;
          if (value < min) min = value;
          if (value > max) max = value;
        }
      }
    }
    if (showBoll) {
      for (const series of [candle.boll.upper, candle.boll.lower, candle.boll.mid]) {
        for (const value of series) {
          if (value === null) continue;
          if (value < min) min = value;
          if (value > max) max = value;
        }
      }
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      min = 0;
      max = 1;
    }
    const padding = (max - min) * 0.05 || 1;
    min -= padding;
    max += padding;

    const priceY = (price: number) =>
      PAD_T + ((max - price) / (max - min)) * (H_PRICE - PAD_T);
    const volumeY = (volume: number) =>
      VOL_BOTTOM - (volume / (maxVolume || 1)) * (VOL_BOTTOM - SUB_TOP);

    const gridLevels = [0, 1, 2, 3, 4].map(
      (index) => min + ((max - min) * index) / 4
    );

    const rsiY = (value: number) =>
      SUB_TOP + (1 - value / 100) * (VOL_BOTTOM - SUB_TOP);
    const macdValues = [
      ...candle.macd.dif,
      ...candle.macd.dea,
      ...candle.macd.hist,
    ].filter((value): value is number => value !== null);
    const macdMax = Math.max(1e-9, ...macdValues.map((value) => Math.abs(value)));
    const macdMid = (SUB_TOP + VOL_BOTTOM) / 2;
    const macdY = (value: number) =>
      macdMid - (value / macdMax) * ((VOL_BOTTOM - SUB_TOP) / 2 - 2);

    const hovered = hover && hover.index < n ? view[hover.index] : null;
    const hoverY = hover ? hover.y : null;
    const pointerPrice =
      hoverY !== null
        ? max - ((hoverY - PAD_T) / (H_PRICE - PAD_T)) * (max - min)
        : null;

    const lastRsi = [...candle.rsi].reverse().find((value) => value !== null) ?? null;

    return (
      <svg
        viewBox={`0 0 ${W} ${H_TOTAL}`}
        className="w-full select-none"
        style={{ touchAction: "pan-y" }}
        onMouseMove={(event: ReactMouseEvent<SVGSVGElement>) =>
          updateHover(event.currentTarget, event.clientX, event.clientY, xs)
        }
        onMouseLeave={() => setHover(null)}
        onTouchStart={(event: ReactTouchEvent<SVGSVGElement>) => {
          const touch = event.touches[0];
          if (touch) {
            updateHover(
              event.currentTarget,
              touch.clientX,
              touch.clientY,
              xs
            );
          }
        }}
        onTouchMove={(event: ReactTouchEvent<SVGSVGElement>) => {
          const touch = event.touches[0];
          if (touch) {
            updateHover(
              event.currentTarget,
              touch.clientX,
              touch.clientY,
              xs
            );
          }
        }}
        onTouchEnd={() => setHover(null)}
        onTouchCancel={() => setHover(null)}
        role="img"
        aria-label={`${symbol} ${periodLabels[period]}`}
      >
        {gridLevels.map((price) => (
          <g key={price}>
            <line
              x1={PAD_L}
              x2={W - PAD_R}
              y1={priceY(price)}
              y2={priceY(price)}
              stroke="rgba(148,163,184,0.10)"
            />
            <text
              x={W - PAD_R + 6}
              y={priceY(price) + 3.5}
              fontSize="10"
              fill="#64748b"
            >
              {fmt(price)}
            </text>
          </g>
        ))}

        <line
          x1={PAD_L}
          x2={W - PAD_R}
          y1={VOL_BOTTOM}
          y2={VOL_BOTTOM}
          stroke="rgba(148,163,184,0.10)"
        />

        {showBoll && (
          <>
            <path
              d={bandPath(candle.boll.upper, candle.boll.lower, xAt, priceY)}
              fill="rgba(192,132,252,0.06)"
              stroke="none"
            />
            <path
              d={linePath(candle.boll.upper, xAt, priceY)}
              fill="none"
              stroke={BOLL_COLOR}
              strokeWidth="1"
              strokeDasharray="4 3"
              opacity="0.55"
            />
            <path
              d={linePath(candle.boll.lower, xAt, priceY)}
              fill="none"
              stroke={BOLL_COLOR}
              strokeWidth="1"
              strokeDasharray="4 3"
              opacity="0.55"
            />
            <path
              d={linePath(candle.boll.mid, xAt, priceY)}
              fill="none"
              stroke={BOLL_MID_COLOR}
              strokeWidth="1.1"
              opacity="0.8"
            />
          </>
        )}

        {subChart === "vol" &&
          view.map((bar, index) => {
            const up = bar.close >= bar.open;
            const width = Math.max(2, Math.min(slot * 0.55, 14));
            const top = volumeY(bar.volume);
            return (
              <rect
                key={`volume-${index}`}
                x={xAt(index) - width / 2}
                y={top}
                width={width}
                height={Math.max(1, VOL_BOTTOM - top)}
                fill={up ? "#34d399" : "#fb7185"}
                opacity="0.3"
              />
            );
          })}

        {subChart === "rsi" && (
          <>
            <line
              x1={PAD_L}
              x2={W - PAD_R}
              y1={rsiY(70)}
              y2={rsiY(70)}
              stroke="rgba(251,113,133,0.22)"
              strokeDasharray="3 4"
            />
            <line
              x1={PAD_L}
              x2={W - PAD_R}
              y1={rsiY(30)}
              y2={rsiY(30)}
              stroke="rgba(52,211,153,0.22)"
              strokeDasharray="3 4"
            />
            <line
              x1={PAD_L}
              x2={W - PAD_R}
              y1={rsiY(50)}
              y2={rsiY(50)}
              stroke="rgba(148,163,184,0.10)"
            />
            <path
              d={linePath(candle.rsi, xAt, rsiY)}
              fill="none"
              stroke="#c084fc"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            <text
              x={W - PAD_R + 6}
              y={rsiY(70) + 3.5}
              fontSize="9"
              fill="#475569"
            >
              70
            </text>
            <text
              x={W - PAD_R + 6}
              y={rsiY(30) + 3.5}
              fontSize="9"
              fill="#475569"
            >
              30
            </text>
            {lastRsi !== null && (
              <text
                x={W - PAD_R - 2}
                y={SUB_TOP + 9}
                textAnchor="end"
                fontSize="9"
                fill="#a78bfa"
              >
                RSI(14) {lastRsi.toFixed(1)}
              </text>
            )}
          </>
        )}

        {subChart === "macd" && (
          <>
            <line
              x1={PAD_L}
              x2={W - PAD_R}
              y1={macdMid}
              y2={macdMid}
              stroke="rgba(148,163,184,0.16)"
            />
            {candle.macd.hist.map((value, index) => {
              if (value === null) return null;
              const width = Math.max(1, Math.min(slot * 0.5, 4));
              const y = macdY(value);
              return (
                <rect
                  key={`hist-${index}`}
                  x={xAt(index) - width / 2}
                  y={Math.min(y, macdMid)}
                  width={width}
                  height={Math.max(1, Math.abs(macdMid - y))}
                  fill={value >= 0 ? "#34d399" : "#fb7185"}
                  opacity="0.45"
                />
              );
            })}
            <path
              d={linePath(candle.macd.dif, xAt, macdY)}
              fill="none"
              stroke="#60a5fa"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            <path
              d={linePath(candle.macd.dea, xAt, macdY)}
              fill="none"
              stroke="#fbbf24"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            <text
              x={W - PAD_R - 2}
              y={SUB_TOP + 9}
              textAnchor="end"
              fontSize="9"
              fill="#93c5fd"
            >
              MACD(12,26,9)
            </text>
          </>
        )}

        {view.map((bar, index) => {
          const up = bar.close >= bar.open;
          const width = Math.max(2, Math.min(slot * 0.55, 14));
          const yHigh = priceY(bar.high);
          const yLow = priceY(bar.low);
          const yOpen = priceY(bar.open);
          const yClose = priceY(bar.close);
          const bodyTop = Math.min(yOpen, yClose);
          const bodyHeight = Math.max(1.5, Math.abs(yOpen - yClose));
          const color = up ? "#34d399" : "#fb7185";
          return (
            <g key={`candle-${index}`}>
              <line
                x1={xAt(index)}
                x2={xAt(index)}
                y1={yHigh}
                y2={yLow}
                stroke={color}
                strokeWidth="1"
              />
              <rect
                x={xAt(index) - width / 2}
                y={bodyTop}
                width={width}
                height={bodyHeight}
                fill={color}
              />
            </g>
          );
        })}

        {showMa &&
          MA_CONFIG.map(({ key, color }) => (
            <path
              key={key}
              d={linePath(
                key === "ma5"
                  ? candle.ma5
                  : key === "ma10"
                    ? candle.ma10
                    : candle.ma20,
                xAt,
                priceY
              )}
              fill="none"
              stroke={color}
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          ))}

        <SubTabs active={subChart} left={PAD_L} onChange={setSubChart} />

        {view.map((bar, index) =>
          index % Math.max(1, Math.ceil(n / 6)) === 0 || index === n - 1 ? (
            <text
              key={`axis-${index}`}
              x={xAt(index)}
              y={H_TOTAL - 4}
              fontSize="10"
              fill="#64748b"
              textAnchor="middle"
            >
              {period === "monthly" ? bar.date.slice(0, 7) : bar.date.slice(5)}
            </text>
          ) : null
        )}

        {hovered && hoverY !== null && pointerPrice !== null && (
          <g>
            <line
              x1={PAD_L}
              x2={W - PAD_R}
              y1={hoverY}
              y2={hoverY}
              stroke="#94a3b8"
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.55"
            />
            <line
              x1={xAt(hover!.index)}
              x2={xAt(hover!.index)}
              y1={PAD_T}
              y2={VOL_BOTTOM}
              stroke="#94a3b8"
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.55"
            />
            <circle
              cx={xAt(hover!.index)}
              cy={priceY(hovered.close)}
              r="3.5"
              fill={hovered.close >= hovered.open ? "#34d399" : "#fb7185"}
              stroke="#030712"
              strokeWidth="1.5"
            />
            <AxisPill
              x={W - PAD_R + 2}
              y={clamp(hoverY - 8, PAD_T, PAD_T + H_PRICE - 16)}
              width={50}
              text={fmt(pointerPrice)}
            />
            <AxisPill
              x={clamp(
                xAt(hover!.index) - 32,
                PAD_L,
                W - PAD_R - 64
              )}
              y={H_TOTAL - 16}
              width={64}
              text={period === "monthly" ? hovered.date.slice(0, 7) : hovered.date.slice(5)}
              tone="pct"
            />
          </g>
        )}
      </svg>
    );
  };

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          role="group"
          aria-label="Chart period"
          className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-1"
        >
          {PERIOD_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => selectPeriod(key)}
              aria-pressed={period === key}
              className={`rounded-md px-2.5 py-1 text-[11px] transition ${
                period === key
                  ? "bg-purple-500/20 text-white shadow-[inset_0_0_0_1px_rgba(192,132,252,0.35)]"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {periodLabels[key]}
            </button>
          ))}
        </div>

        {isIntraday ? (
          <div className="flex flex-wrap items-center gap-2 text-[10px] tabular-nums">
            {intradayModel?.latest && (
              <>
                <span className="text-slate-500">
                  {CHART_TEXT.price}{" "}
                  <span
                    className={
                      (intradayModel.latest.close >=
                      intradayModel.latest.prevClose
                        ? "text-emerald-400"
                        : "text-rose-400")
                    }
                  >
                    {fmt(intradayModel.latest.close)}
                  </span>
                </span>
                {intradayModel.latestAvg !== null && (
                  <span className="text-slate-500">
                    {CHART_TEXT.avg}{" "}
                    <span className="text-amber-300">
                      {fmt(intradayModel.latestAvg)}
                    </span>
                  </span>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowMa((value) => !value)}
              aria-pressed={showMa}
              className={`rounded-full border px-2.5 py-1 text-[10px] transition ${
                showMa
                  ? "border-purple-400/30 bg-purple-500/10 text-purple-200"
                  : "border-white/10 bg-white/[0.02] text-slate-500 hover:text-slate-300"
              }`}
            >
              MA
            </button>
            <button
              type="button"
              onClick={() => setShowBoll((value) => !value)}
              aria-pressed={showBoll}
              className={`rounded-full border px-2.5 py-1 text-[10px] transition ${
                showBoll
                  ? "border-pink-400/30 bg-pink-500/10 text-pink-200"
                  : "border-white/10 bg-white/[0.02] text-slate-500 hover:text-slate-300"
              }`}
            >
              BOLL
            </button>
          </div>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-0.5 rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1.5 text-[10px] leading-5 tabular-nums sm:flex-nowrap sm:overflow-x-auto sm:text-[11px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {hud ? (
          <>
            <span className="shrink-0 text-slate-500">{hud.label}</span>
            <span className="shrink-0 text-slate-600">
              {tx.openC}{" "}
              <span className="text-slate-300">{fmt(hud.open)}</span>
            </span>
            <span className="shrink-0 text-slate-600">
              {tx.highC}{" "}
              <span className="text-slate-300">{fmt(hud.high)}</span>
            </span>
            <span className="shrink-0 text-slate-600">
              {tx.lowC}{" "}
              <span className="text-slate-300">{fmt(hud.low)}</span>
            </span>
            <span
              className={`shrink-0 ${
                hudUp ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {tx.closeC} {fmt(hud.close)}
            </span>
            <span
              className={`shrink-0 ${
                hud.pct === null || hud.pct >= 0
                  ? "text-emerald-400"
                  : "text-rose-400"
              }`}
            >
              {hud.pct === null ? "—" : fmtPct(hud.pct)}
            </span>
            <span className="shrink-0 text-slate-600">
              {CHART_TEXT.volume}{" "}
              <span className="text-slate-300">
                {fmtVolumeCompact(hud.volume)}
              </span>
            </span>
          </>
        ) : (
          <span className="text-slate-500">{tx.hoverHint}</span>
        )}
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500">
        {isIntraday ? (
          <>
            <LegendLine color="#818cf8" label={CHART_TEXT.price} />
            <LegendLine color="#fbbf24" label={CHART_TEXT.avg} />
            {intradayModel && (
              <span className="text-amber-400/80">
                {CHART_TEXT.baseline} {fmt(intradayModel.baseline)}
              </span>
            )}
          </>
        ) : (
          <>
            {showMa &&
              MA_CONFIG.map(({ label, color }) => (
                <LegendLine key={label} color={color} label={label} />
              ))}
            {showBoll && (
              <LegendLine
                color={BOLL_COLOR}
                label="BOLL(20, 2)"
                dashed
              />
            )}
            {!showMa && !showBoll && <span>{tx.hoverHint}</span>}
          </>
        )}
      </div>

      <div className="mt-1">
        {isIntraday ? renderIntraday() : renderCandles()}
      </div>
    </div>
  );
}