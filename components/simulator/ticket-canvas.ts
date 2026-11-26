import { SITE_NAME, SITE_URL } from "@/lib/site";
import { niceValueDomain, valueAxisLabel } from "./chart-math";
import type { SimFrequency, SimMode, SimResult } from "./engine";

export type TicketTheme = "light" | "dark";

export type TicketData = {
  result: SimResult;
  holdings: { symbol: string; percent: number }[];
  benchmark: string;
  mode: SimMode;
  contribution: number;
  frequency: SimFrequency;
};

const WIDTH = 1200;
const HEIGHT = 630;
const SCALE = 2;
const TICKET = { left: 56, top: 108, right: 1144, bottom: 532, split: 710, corner: 24, notch: 16 };
const SANS = 'system-ui, "Segoe UI", sans-serif';
const MONO = '"Cascadia Mono", Consolas, monospace';
const money = new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", maximumFractionDigits: 0,
});
const percent = new Intl.NumberFormat("en-US", {
  style: "percent", signDisplay: "exceptZero", minimumFractionDigits: 1, maximumFractionDigits: 1,
});
const cadence: Record<SimFrequency, string> = { weekly: "/wk", biweekly: " every 2 weeks", monthly: "/mo" };

const palettes = {
  light: {
    paper: "#ffffff", stub: "#f6f8ff", border: "#ffffff", ink: "#172347", muted: "#52617d",
    grid: "#dce4f2", pill: "#eaf0ff", perf: "#a6b6d4", emerald: "#047a56", line: "#00a873",
    fill: "rgba(16, 185, 129, .24)", benchmark: "#586b8c",
  },
  dark: {
    paper: "#111e37", stub: "#162543", border: "#6483b2", ink: "#edf4ff", muted: "#a7b9d7",
    grid: "#334765", pill: "#243857", perf: "#6680a8", emerald: "#63efb9", line: "#3ceaa8",
    fill: "rgba(52, 211, 153, .26)", benchmark: "#a2b4d1",
  },
};
type Palette = typeof palettes.light;
type Context = CanvasRenderingContext2D;

function receiptRows(data: TicketData) {
  const { result } = data;
  const benchmarkEnd = result.benchmarkCurve.at(-1);
  const spread = benchmarkEnd !== undefined && Number.isFinite(benchmarkEnd)
    ? (result.finalValue - benchmarkEnd) / result.invested
    : null;
  return {
    headline: spread !== null && spread > 0 ? `Beat ${data.benchmark}` : "Backtest Summary",
    spread,
    rows: [
      ["Invested", money.format(result.invested)],
      ["Total Return", percent.format(result.totalReturn)],
      ["Max Drawdown", percent.format(-result.maxDrawdown)],
      ["vs. Benchmark", spread === null ? "Unavailable" : percent.format(spread).replace("%", " pp")],
    ],
  };
}

export function ticketAlt(data: TicketData) {
  const { result, holdings } = data;
  const { headline, rows } = receiptRows(data);
  const allocation = holdings.map(({ symbol, percent }) => `${percent}% ${symbol}`).join(", ");
  return `FolioScope backtest ticket. ${headline}. ${allocation}. ${result.startDate} to ${result.endDate}. `
    + rows.map(([label, value]) => `${label} ${value}`).join(". ")
    + `. Final value ${money.format(result.finalValue)}.`;
}

export function ticketPostUrl(data: TicketData) {
  const { result } = data;
  const { spread } = receiptRows(data);
  const comparison = spread === null ? "" : ` · ${percent.format(spread).replace("%", " pp")} vs. ${data.benchmark}`;
  const params = new URLSearchParams({
    text: `My FolioScope backtest · ${percent.format(result.totalReturn)} total return${comparison}\n`
      + `${result.startDate} → ${result.endDate}. Historical backtest. Not investment advice.`,
    url: SITE_URL,
  });
  return `https://x.com/intent/tweet?${params}`;
}

function drawTicketOutline() {
  const { left, top, right, bottom, split, corner, notch } = TICKET;
  const path = new Path2D();
  path.moveTo(left + corner, top);
  path.lineTo(split - notch, top);
  path.arc(split, top, notch, Math.PI, 0, true);
  path.arcTo(right, top, right, bottom, corner);
  path.arcTo(right, bottom, left, bottom, corner);
  path.lineTo(split + notch, bottom);
  path.arc(split, bottom, notch, 0, Math.PI, true);
  path.arcTo(left, bottom, left, top, corner);
  path.arcTo(left, top, right, top, corner);
  path.closePath();
  return path;
}

function drawBackdrop(ctx: Context, data: TicketData, logo: HTMLImageElement) {
  const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  gradient.addColorStop(0, "#135deb");
  gradient.addColorStop(.5, "#2548e2");
  gradient.addColorStop(1, "#4030c4");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = "rgba(222, 237, 255, .20)";
  for (let x = 7; x < WIDTH; x += 14) {
    for (let y = 7; y < HEIGHT; y += 14) {
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const { result, mode, contribution, frequency } = data;
  const strategy = mode === "lump" ? "Lump Sum" : `${money.format(contribution)}${cadence[frequency]} DCA`;
  const tag = `${strategy} · ${result.startDate} → ${result.endDate}`;
  ctx.font = `600 18px ${SANS}`;
  const pillWidth = ctx.measureText(tag).width + 72;
  const pillLeft = (WIDTH - pillWidth) / 2;
  ctx.beginPath();
  ctx.roundRect(pillLeft, 33, pillWidth, 48, 24);
  ctx.fillStyle = "rgba(11, 21, 70, .79)";
  ctx.fill();
  ctx.strokeStyle = "rgba(224, 234, 255, .29)";
  ctx.stroke();
  const dot = ctx.createLinearGradient(pillLeft + 19, 48, pillLeft + 33, 65);
  dot.addColorStop(0, "#67f3dc");
  dot.addColorStop(1, "#8b8aff");
  ctx.fillStyle = dot;
  ctx.beginPath();
  ctx.arc(pillLeft + 24, 57, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f1f6ff";
  ctx.fillText(tag, pillLeft + 43, 63);

  const credit = `${SITE_NAME} · ${new URL(SITE_URL).hostname}`;
  ctx.font = `650 19px ${SANS}`;
  const creditLeft = (WIDTH - ctx.measureText(credit).width - 35) / 2;
  ctx.drawImage(logo, creditLeft, 551, 26, 26);
  ctx.fillText(credit, creditLeft + 35, 571);
  ctx.textAlign = "center";
  ctx.fillStyle = "#d2dcff";
  ctx.font = `500 14px ${SANS}`;
  ctx.fillText("Historical backtest · Not investment advice", WIDTH / 2, 603);
  ctx.textAlign = "left";
}

function drawPaper(ctx: Context, colors: Palette) {
  const { left, top, right, bottom, split, notch } = TICKET;
  const outline = drawTicketOutline();
  ctx.save();
  ctx.shadowColor = "rgba(5, 12, 56, .42)";
  ctx.shadowBlur = 36;
  ctx.shadowOffsetY = 18;
  ctx.fillStyle = colors.paper;
  ctx.fill(outline);
  ctx.restore();
  ctx.save();
  ctx.clip(outline);
  ctx.fillStyle = colors.stub;
  ctx.fillRect(split, top, right - split, bottom - top);
  ctx.restore();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = colors.border;
  ctx.stroke(outline);
  ctx.beginPath();
  ctx.moveTo(split, top + notch + 7);
  ctx.lineTo(split, bottom - notch - 7);
  ctx.strokeStyle = colors.perf;
  ctx.setLineDash([4, 6]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineWidth = 1;
  return left + 32;
}

function drawAllocation(ctx: Context, colors: Palette, holdings: TicketData["holdings"], x: number) {
  ctx.fillStyle = colors.ink;
  ctx.font = `750 25px ${SANS}`;
  ctx.fillText("Portfolio allocation", x, 157);
  ctx.textAlign = "right";
  ctx.fillStyle = colors.muted;
  ctx.font = `650 14px ${SANS}`;
  ctx.fillText(SITE_NAME, TICKET.split - 32, 154);
  ctx.textAlign = "left";

  ctx.font = `650 15px ${MONO}`;
  let chipX = x;
  const limit = TICKET.split - 32;
  for (const [index, holding] of holdings.entries()) {
    const label = `${holding.percent}% ${holding.symbol}`;
    const width = ctx.measureText(label).width + 24;
    const more = holdings.length - index - 1;
    const remainderWidth = more > 0 ? ctx.measureText(`+${more} more`).width + 32 : 0;
    const fits = chipX + width + remainderWidth <= limit;
    const chipLabel = fits ? label : `+${more + 1} more`;
    const chipWidth = ctx.measureText(chipLabel).width + 24;
    ctx.beginPath();
    ctx.roundRect(chipX, 172, chipWidth, 32, 9);
    ctx.fillStyle = colors.pill;
    ctx.fill();
    ctx.fillStyle = colors.ink;
    ctx.fillText(chipLabel, chipX + 12, 193);
    if (!fits) break;
    chipX += chipWidth + 8;
  }
}

type Point = { x: number; y: number };

// The harmonic mean of adjacent slopes keeps a cubic between its two samples.
function monotoneCurve(points: Point[]) {
  const path = new Path2D();
  const slopes = points.slice(1).map((point, i) =>
    (point.y - points[i].y) / (point.x - points[i].x));
  const tangents = points.map((_, i) => {
    const before = slopes[i - 1];
    const after = slopes[i];
    if (before === undefined || after === undefined) return before ?? after ?? 0;
    return before * after > 0 ? 2 * before * after / (before + after) : 0;
  });
  path.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) {
    const from = points[i - 1];
    const to = points[i];
    const step = (to.x - from.x) / 3;
    path.bezierCurveTo(
      from.x + step, from.y + tangents[i - 1] * step,
      to.x - step, to.y - tangents[i] * step,
      to.x, to.y,
    );
  }
  return path;
}

function drawChart(ctx: Context, colors: Palette, data: TicketData, x: number) {
  const { result, benchmark } = data;
  const primary = result.curve.map((point) => point.value);
  const secondary = result.benchmarkCurve;
  const hasBenchmark = secondary.some(Number.isFinite);
  const domain = niceValueDomain([...primary, ...secondary]);
  const left = x + 69;
  const right = 577;
  const top = 269;
  const bottom = 467;
  const mapY = (value: number) => bottom - (value - domain.min) / (domain.max - domain.min) * (bottom - top);
  const mapX = (index: number) => left + index / (primary.length - 1) * (right - left);
  const series = [
    { label: "Portfolio", values: primary, line: colors.line, text: colors.emerald, dashed: false },
    { label: benchmark, values: secondary, line: colors.benchmark, text: colors.benchmark, dashed: true },
  ];
  ctx.font = `600 15px ${SANS}`;
  let legendX = x;
  for (const item of series) {
    ctx.beginPath();
    ctx.moveTo(legendX, 236);
    ctx.lineTo(legendX + 24, 236);
    ctx.strokeStyle = item.line;
    ctx.lineWidth = 3;
    ctx.setLineDash(item.dashed ? [5, 4] : []);
    ctx.stroke();
    const label = item.dashed && !hasBenchmark ? `${item.label} unavailable` : item.label;
    ctx.fillStyle = colors.muted;
    ctx.fillText(label, legendX + 33, 241);
    legendX += 53 + ctx.measureText(label).width;
  }
  ctx.setLineDash([]);
  ctx.lineWidth = 1;
  ctx.font = `500 13px ${MONO}`;
  ctx.textAlign = "right";
  for (const tick of domain.ticks) {
    const y = mapY(tick);
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.strokeStyle = colors.grid;
    ctx.stroke();
    ctx.fillStyle = colors.muted;
    ctx.fillText(valueAxisLabel(tick), left - 10, y + 4);
  }
  ctx.textAlign = "left";
  ctx.fillText(result.startDate, left, 495);
  ctx.textAlign = "right";
  ctx.fillText(result.endDate, right, 495);
  ctx.textAlign = "left";

  const endLabels: { y: number; value: number; color: string }[] = [];
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  for (const item of series) {
    // Preserve gaps in the engine series and share the portfolio's trading-day axis.
    let segment: Point[] = [];
    const drawSegment = () => {
      if (segment.length < 2) return;
      const path = monotoneCurve(segment);
      if (!item.dashed) {
        const area = new Path2D(path);
        area.lineTo(segment.at(-1)!.x, bottom);
        area.lineTo(segment[0].x, bottom);
        area.closePath();
        const fill = ctx.createLinearGradient(0, top, 0, bottom);
        fill.addColorStop(0, colors.fill);
        fill.addColorStop(1, "rgba(16, 185, 129, 0)");
        ctx.fillStyle = fill;
        ctx.fill(area);
      }
      ctx.strokeStyle = item.line;
      ctx.lineWidth = item.dashed ? 2.5 : 3.5;
      ctx.setLineDash(item.dashed ? [6, 5] : []);
      ctx.stroke(path);
    };
    for (const [index, value] of item.values.entries()) {
      if (Number.isFinite(value)) {
        segment.push({ x: mapX(index), y: mapY(value) });
      } else {
        drawSegment();
        segment = [];
      }
    }
    drawSegment();
    const last = item.values.at(-1);
    if (last === undefined || !Number.isFinite(last)) continue;
    const y = mapY(last);
    ctx.beginPath();
    ctx.arc(right, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = item.line;
    ctx.fill();
    endLabels.push({ y, value: last, color: item.text });
  }
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  endLabels.sort((a, b) => a.y - b.y);
  const gap = 22;
  if (endLabels.length === 2 && endLabels[1].y - endLabels[0].y < gap) {
    const center = (endLabels[0].y + endLabels[1].y) / 2;
    endLabels[0].y = Math.max(top, Math.min(bottom - gap, center - gap / 2));
    endLabels[1].y = endLabels[0].y + gap;
  }
  ctx.font = `700 15px ${MONO}`;
  for (const label of endLabels) {
    ctx.fillStyle = label.color;
    ctx.fillText(valueAxisLabel(label.value), right + 12, label.y + 5, 86);
  }
}

function drawReceipt(ctx: Context, colors: Palette, data: TicketData) {
  const { headline, spread, rows } = receiptRows(data);
  const left = TICKET.split + 38;
  const right = TICKET.right - 36;
  ctx.fillStyle = spread !== null && spread > 0 ? colors.emerald : colors.ink;
  ctx.font = `800 36px ${SANS}`;
  ctx.fillText(headline, left, 175, right - left);
  rows.forEach(([label, value], index) => {
    const y = 228 + index * 39;
    ctx.font = `550 19px ${SANS}`;
    ctx.fillStyle = colors.muted;
    ctx.fillText(label, left, y);
    ctx.textAlign = "right";
    ctx.font = `700 19px ${MONO}`;
    ctx.fillStyle = index === 3 && spread !== null && spread > 0 ? colors.emerald : colors.ink;
    ctx.fillText(value, right, y);
    ctx.textAlign = "left";
  });
  ctx.beginPath();
  ctx.moveTo(left, 371);
  ctx.lineTo(right, 371);
  ctx.strokeStyle = colors.perf;
  ctx.stroke();
  ctx.fillStyle = colors.muted;
  ctx.font = `650 19px ${SANS}`;
  ctx.fillText("Final Value", left, 413);
  ctx.fillStyle = colors.emerald;
  ctx.font = `800 68px ${SANS}`;
  ctx.fillText(money.format(data.result.finalValue), left, 486, right - left);
}

export async function renderTicketPng(data: TicketData, theme: TicketTheme) {
  const logo = new Image();
  logo.src = "/icon.svg";
  await logo.decode();
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH * SCALE;
  canvas.height = HEIGHT * SCALE;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Canvas 2D unavailable");
  ctx.scale(SCALE, SCALE);
  drawBackdrop(ctx, data, logo);
  const colors = palettes[theme];
  const contentLeft = drawPaper(ctx, colors);
  drawAllocation(ctx, colors, data.holdings, contentLeft);
  drawChart(ctx, colors, data, contentLeft);
  drawReceipt(ctx, colors, data);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("PNG export failed"));
    }, "image/png");
  });
}
