import Link from "next/link";
import BackgroundEffects from "@/components/BackgroundEffects";

const stats = [
  { label: "Portfolio value", value: "$128,420", change: "+12.4%", color: "blue" },
  { label: "AI projects", value: "08", change: "+2 this month", color: "purple" },
  { label: "Learning hours", value: "164h", change: "+18h this week", color: "violet" },
];

const projects = [
  { name: "Market Signal AI", type: "Machine Learning", progress: 82, status: "In progress" },
  { name: "Research Copilot", type: "Generative AI", progress: 64, status: "Building" },
  { name: "Personal Website", type: "Web Development", progress: 100, status: "Live" },
];

const activity = [
  { title: "Deployed Personal Website", time: "2 hours ago", color: "bg-blue-400" },
  { title: "Completed AI Agents course", time: "Yesterday", color: "bg-purple-400" },
  { title: "Portfolio reached a new high", time: "3 days ago", color: "bg-emerald-400" },
];

function Icon({ name }: { name: "grid" | "chart" | "folder" | "book" | "settings" }) {
  const paths = {
    grid: "M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z",
    chart: "M4 19V9m6 10V5m6 14v-7m4 7H2",
    folder: "M3 6h6l2 2h10v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z",
    book: "M4 5a3 3 0 0 1 3-3h5v18H7a3 3 0 0 0-3 3V5Zm8-3h5a3 3 0 0 1 3 3v18a3 3 0 0 0-3-3h-5",
    settings: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.86 2.86-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21H9.5v-.1A1.7 1.7 0 0 0 8.4 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.86-2.86.06-.06A1.7 1.7 0 0 0 4 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H2V9.5h.3A1.7 1.7 0 0 0 4 8.4a1.7 1.7 0 0 0-.34-1.88l-.06-.06L6.46 3.6l.06.06A1.7 1.7 0 0 0 8.4 4a1.7 1.7 0 0 0 1-.6A1.7 1.7 0 0 0 9.8 2H14a1.7 1.7 0 0 0 1.6 2 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.86 2.86-.06.06A1.7 1.7 0 0 0 20 8.4a1.7 1.7 0 0 0 .6 1 1.7 1.7 0 0 0 1.1.4h.3V14h-.3a1.7 1.7 0 0 0-2.3 1Z",
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5"><path d={paths[name]} strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export default function DashboardPage() {
  return (
    <div className="relative min-h-screen">
      <BackgroundEffects />
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-purple-500/10 bg-[#050917]/85 px-5 py-6 backdrop-blur-xl lg:flex lg:flex-col">
        <Link href="/" className="px-3 text-2xl font-bold gradient-text">GUI</Link>
        <nav className="mt-12 space-y-2">
          {[["Overview", "grid"], ["Investments", "chart"], ["Projects", "folder"], ["Learning", "book"]].map(([label, icon], index) => (
            <a key={label} href={`#${label.toLowerCase()}`} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${index === 0 ? "bg-gradient-to-r from-blue-500/15 to-purple-500/15 text-white ring-1 ring-purple-400/20" : "text-slate-500 hover:bg-white/5 hover:text-slate-200"}`}>
              <Icon name={icon as "grid" | "chart" | "folder" | "book"} />{label}
            </a>
          ))}
        </nav>
        <div className="mt-auto border-t border-white/5 pt-5">
          <a href="#settings" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-500 hover:bg-white/5 hover:text-slate-200"><Icon name="settings" />Settings</a>
          <Link href="/" className="mt-3 flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-400 hover:text-white">← Back to website</Link>
        </div>
      </aside>

      <main className="relative z-10 px-5 pb-12 pt-6 sm:px-8 lg:ml-64 lg:px-10">
        <header className="flex items-center justify-between border-b border-white/5 pb-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-purple-400">Personal command center</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Good morning, GUI</h1>
          </div>
          <div className="flex items-center gap-3">
            <button aria-label="Notifications" className="glass flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:text-white">♡</button>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-sm font-bold shadow-lg shadow-purple-500/20">G</div>
          </div>
        </header>

        <section id="overview" className="mt-8 grid gap-4 md:grid-cols-3">
          {stats.map((stat) => (
            <article key={stat.label} className="glass rounded-2xl p-5 transition hover:-translate-y-1 hover:border-purple-400/30">
              <p className="text-sm text-slate-500">{stat.label}</p>
              <div className="mt-3 flex items-end justify-between gap-3"><strong className="text-2xl font-semibold text-white sm:text-3xl">{stat.value}</strong><span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs text-emerald-400">{stat.change}</span></div>
            </article>
          ))}
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1.65fr_1fr]">
          <article id="investments" className="glass rounded-2xl p-5 sm:p-6">
            <div className="flex items-center justify-between"><div><h2 className="font-semibold text-white">Portfolio performance</h2><p className="mt-1 text-xs text-slate-500">January — June 2026</p></div><span className="rounded-lg border border-purple-400/20 bg-purple-500/5 px-3 py-1.5 text-xs text-slate-400">6 months</span></div>
            <div className="mt-8 h-56 w-full">
              <svg viewBox="0 0 700 230" preserveAspectRatio="none" className="h-full w-full overflow-visible" aria-label="Portfolio growth chart">
                <defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8b5cf6" stopOpacity=".35"/><stop offset="1" stopColor="#3b82f6" stopOpacity="0"/></linearGradient><linearGradient id="chartLine" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#3b82f6"/><stop offset="1" stopColor="#c084fc"/></linearGradient></defs>
                {[35, 95, 155, 215].map(y => <line key={y} x1="0" y1={y} x2="700" y2={y} stroke="rgba(148,163,184,.10)" />)}
                <path d="M0 190 C75 183 90 140 150 151 S240 125 300 130 S390 62 455 92 S550 67 610 51 S670 35 700 20 V230 H0Z" fill="url(#chartFill)" />
                <path d="M0 190 C75 183 90 140 150 151 S240 125 300 130 S390 62 455 92 S550 67 610 51 S670 35 700 20" fill="none" stroke="url(#chartLine)" strokeWidth="4" strokeLinecap="round" />
                <circle cx="700" cy="20" r="6" fill="#c084fc" stroke="#030712" strokeWidth="3" />
              </svg>
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-slate-600"><span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span></div>
          </article>

          <article className="glass rounded-2xl p-5 sm:p-6">
            <div className="flex items-center justify-between"><h2 className="font-semibold text-white">Recent activity</h2><button className="text-xs text-purple-400 hover:text-purple-300">View all</button></div>
            <div className="mt-6 space-y-6">
              {activity.map((item) => <div key={item.title} className="flex gap-4"><span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${item.color} shadow-[0_0_12px_currentColor]`} /><div><p className="text-sm text-slate-200">{item.title}</p><p className="mt-1 text-xs text-slate-600">{item.time}</p></div></div>)}
            </div>
            <div className="mt-8 rounded-xl border border-blue-400/10 bg-blue-500/5 p-4"><p className="text-xs uppercase tracking-wider text-blue-400">Weekly focus</p><p className="mt-2 text-sm leading-relaxed text-slate-400">Ship the first working version of Research Copilot.</p></div>
          </article>
        </section>

        <section id="projects" className="glass mt-5 rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between"><div><h2 className="font-semibold text-white">Active projects</h2><p className="mt-1 text-xs text-slate-500">A quick look at what you are building</p></div><button className="btn-primary rounded-lg px-4 py-2 text-xs font-medium">+ New project</button></div>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {projects.map((project) => <article key={project.name} className="rounded-xl border border-white/5 bg-white/[0.025] p-4"><div className="flex items-start justify-between"><div><h3 className="text-sm font-medium text-slate-200">{project.name}</h3><p className="mt-1 text-xs text-slate-600">{project.type}</p></div><span className={`rounded-full px-2 py-1 text-[10px] ${project.progress === 100 ? "bg-emerald-400/10 text-emerald-400" : "bg-purple-400/10 text-purple-400"}`}>{project.status}</span></div><div className="mt-5"><div className="mb-2 flex justify-between text-[11px] text-slate-600"><span>Progress</span><span>{project.progress}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500" style={{ width: `${project.progress}%` }} /></div></div></article>)}
          </div>
        </section>
      </main>
    </div>
  );
}
