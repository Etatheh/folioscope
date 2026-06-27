import BackgroundEffects from "@/components/BackgroundEffects";
import Hero from "@/components/Hero";
import Navbar from "@/components/Navbar";

export default function Home() {
  return (
    <>
      <BackgroundEffects />
      <Navbar />
      <main>
        <Hero />

        <section
          id="about"
          className="relative z-10 mx-auto max-w-4xl px-6 py-24 text-center"
        >
          <h2 className="text-3xl font-bold gradient-text sm:text-4xl">About</h2>
          <p className="mt-6 text-lg leading-relaxed text-slate-400">
            Passionate about artificial intelligence, financial markets, and
            continuous learning. I build AI-powered solutions, invest with
            conviction, and pursue knowledge across disciplines.
          </p>
        </section>

        <section
          id="projects"
          className="relative z-10 mx-auto max-w-4xl px-6 py-24 text-center"
        >
          <h2 className="text-3xl font-bold gradient-text sm:text-4xl">
            Projects
          </h2>
          <p className="mt-6 text-lg text-slate-400">
            More projects coming soon. Stay tuned.
          </p>
        </section>

        <section
          id="contact"
          className="relative z-10 mx-auto max-w-4xl px-6 py-24 pb-32 text-center"
        >
          <h2 className="text-3xl font-bold gradient-text sm:text-4xl">
            Contact
          </h2>
          <p className="mt-6 text-lg text-slate-400">
            Interested in collaborating? Reach out and let&apos;s build something
            great together.
          </p>
          <a
            href="mailto:hello@example.com"
            className="btn-primary mt-8 inline-block rounded-full px-8 py-3.5 text-sm font-semibold text-white"
          >
            Send a Message
          </a>
        </section>
      </main>

      <footer className="relative z-10 border-t border-purple-500/10 py-8 text-center text-sm text-slate-500">
        <p>&copy; {new Date().getFullYear()} GUI. All rights reserved.</p>
      </footer>
    </>
  );
}
