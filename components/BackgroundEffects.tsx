export default function BackgroundEffects() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      <div className="grid-bg absolute inset-0" />

      <div className="animate-pulse-glow absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-blue-600/20 blur-[120px]" />
      <div className="animate-pulse-glow absolute -right-40 top-1/4 h-[400px] w-[400px] rounded-full bg-purple-600/20 blur-[100px] [animation-delay:2s]" />
      <div className="animate-pulse-glow absolute -bottom-20 left-1/3 h-[350px] w-[350px] rounded-full bg-violet-600/15 blur-[100px] [animation-delay:1s]" />

      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#030712]" />
    </div>
  );
}
