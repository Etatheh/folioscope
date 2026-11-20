import type { IconName } from "@/components/ui/Icon";

const panel = "w-full max-w-60 rounded-xl border border-white/10 bg-slate-950/50 p-4 shadow-[0_8px_24px_-16px_#000]";

/** Decorative, static examples; no market data or interactive controls. */
export default function FeatureMicroUI({ kind }: { kind: IconName }) {
  return <div aria-hidden="true" className="my-4 flex h-32 w-full items-center justify-center">
    <div className="flex w-full items-center justify-center transition-all duration-300 group-hover:-translate-y-0.5 group-hover:brightness-125 motion-reduce:transform-none motion-reduce:transition-none">
      {kind === "ai" && <div className={`${panel} relative pt-10`}>
        <span className="absolute right-3 top-3 rounded border border-violet-300/20 bg-violet-400/10 px-1.5 py-0.5 font-mono text-[9px] leading-none text-violet-200">10-Q</span>
        <div className="space-y-2.5">
          <div className="h-1.5 w-4/5 rounded-full bg-slate-500/25" />
          <div className="h-1.5 w-full rounded-full bg-gradient-to-r from-violet-400/50 via-violet-300/35 to-violet-400/10 shadow-[0_0_10px_#a78bfa25]" />
          <div className="h-1.5 w-3/5 rounded-full bg-slate-500/25" />
        </div>
      </div>}
      {kind === "globe" && <div className={`${panel} space-y-3 font-mono text-[10px]`}>
        <div className="flex items-center justify-between gap-2"><span className="whitespace-nowrap text-slate-400">US · S&amp;P</span><span className="rounded-full border border-emerald-400/15 bg-emerald-400/10 px-2 py-1 text-emerald-300">+1.24%</span></div>
        <div className="flex items-center justify-between gap-2 border-t border-white/5 pt-3"><span className="whitespace-nowrap text-slate-400">EU · STOXX</span><span className="rounded-full border border-violet-400/15 bg-violet-400/10 px-2 py-1 text-violet-300">+1.24%</span></div>
      </div>}
      {kind === "indicators" && <div className={`${panel} pb-5 pt-12`}>
        <div className="relative h-2 rounded-full bg-gradient-to-r from-slate-600/40 via-violet-400/30 to-violet-300/70">
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 font-mono text-[10px] text-violet-200">84th</div>
          <div className="absolute inset-x-0 top-3 flex justify-between px-0.5">{[0, 1, 2, 3, 4].map(tick => <span key={tick} className="h-1 w-px bg-white/15" />)}</div>
          <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-violet-100 bg-violet-400 shadow-[0_0_0_4px_#a78bfa15,0_0_14px_#a78bfa55]" />
        </div>
      </div>}
      {kind === "backtest" && <div className={panel}>
        <svg viewBox="0 0 120 40" fill="none" className="h-16 w-full">
          <path d="M2 34 C16 34 18 28 30 30 S48 25 60 26 S80 21 90 22 S108 17 118 18" stroke="white" strokeOpacity=".35" strokeWidth="1.5" strokeDasharray="3 4" />
          <path d="M2 34 C14 33 18 23 30 26 S47 14 60 18 S77 8 90 11 S108 4 118 3" stroke="#34d399" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <div className="mt-2 flex gap-3 text-[9px] text-slate-500"><span className="flex items-center gap-1.5"><i className="h-0.5 w-3 bg-emerald-400" />Portfolio</span><span className="flex items-center gap-1.5"><i className="w-3 border-t border-dashed border-white/40" />S&amp;P 500</span></div>
      </div>}
      {kind === "watchlist" && <div className={`${panel} py-6`}>
        <div className="flex h-3 overflow-hidden rounded-full ring-1 ring-white/10"><span className="w-1/2 bg-violet-400/75" /><span className="w-[30%] bg-emerald-400/75" /><span className="w-1/5 bg-sky-400/75" /></div>
        <div className="mt-4 flex justify-between font-mono text-[9px] text-slate-500">{[["bg-violet-400", "50%"], ["bg-emerald-400", "30%"], ["bg-sky-400", "20%"]].map(([color, weight]) => <span key={weight} className="flex items-center gap-1.5"><i className={`h-1.5 w-1.5 rounded-full ${color}`} />{weight}</span>)}</div>
      </div>}
      {kind === "us" && <div className={panel}>
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/5 px-2 py-1 text-[9px] text-emerald-300"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_7px_#34d39970] motion-reduce:animate-none" />Signal Active</span>
        <svg viewBox="0 0 120 40" fill="none" className="mt-1 h-12 w-full drop-shadow-[0_0_4px_#34d39940]">
          <path d="M2 26 C12 26 14 14 24 14 S36 30 46 26 S56 10 66 13 S80 29 90 21 S106 10 118 14" stroke="#34d399" strokeOpacity=".75" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>}
    </div>
  </div>;
}
