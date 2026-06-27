const roles = ["AI Developer", "Investor", "Student"];

export default function Hero() {
  return (
    <section
      id="home"
      className="relative flex min-h-screen items-center justify-center px-6 pt-28 pb-20"
    >
      <div className="relative z-10 mx-auto max-w-4xl text-center">
        <div className="animate-fade-in-up opacity-0-start animation-delay-100 mb-6 inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/5 px-4 py-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
          </span>
          <span className="text-sm text-slate-400">Available for opportunities</span>
        </div>

        <h1 className="animate-fade-in-up opacity-0-start animation-delay-200 text-5xl font-bold leading-tight tracking-tight sm:text-6xl md:text-7xl lg:text-8xl">
          Hi, I&apos;m{" "}
          <span className="gradient-text animate-gradient">GUI</span>
        </h1>

        <div className="animate-fade-in-up opacity-0-start animation-delay-300 mt-6 flex flex-wrap items-center justify-center gap-3">
          {roles.map((role, i) => (
            <span
              key={role}
              className="rounded-full border border-blue-500/20 bg-blue-500/5 px-4 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:border-purple-500/30 hover:bg-purple-500/10"
              style={{ animationDelay: `${300 + i * 100}ms` }}
            >
              {role}
            </span>
          ))}
        </div>

        <p className="animate-fade-in-up opacity-0-start animation-delay-400 mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-slate-400 sm:text-xl">
          Building intelligent systems, exploring markets, and learning at the
          edge of technology. Crafting the future where AI meets ambition.
        </p>

        <div className="animate-fade-in-up opacity-0-start animation-delay-500 mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href="#projects"
            className="btn-primary w-full rounded-full px-8 py-3.5 text-sm font-semibold text-white sm:w-auto"
          >
            View Projects
          </a>
          <a
            href="#contact"
            className="btn-secondary w-full rounded-full px-8 py-3.5 text-sm font-semibold text-slate-200 sm:w-auto"
          >
            Contact Me
          </a>
        </div>

        <div className="animate-fade-in opacity-0-start animation-delay-500 mt-20 flex justify-center">
          <a
            href="#about"
            aria-label="Scroll to about section"
            className="animate-float flex flex-col items-center gap-2 text-slate-500 transition-colors hover:text-purple-400"
          >
            <span className="text-xs uppercase tracking-widest">Scroll</span>
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
