"use client";

import { useState } from "react";
import Link from "next/link";
import { upgradeToPro } from "@/lib/auth";
import { useSession } from "@/lib/use-session";

export default function UpgradeButton({ planId }: { planId: "free" | "pro" }) {
  const { user, ready } = useSession();
  const [done, setDone] = useState(false);

  if (planId === "free") {
    return (
      <Link
        href="/register"
        className="btn-secondary mt-8 block rounded-full py-3 text-center text-sm font-medium text-white"
      >
        Start for free
      </Link>
    );
  }

  if (!ready) {
    return <div className="mt-8 h-11 animate-pulse rounded-full bg-white/5" />;
  }

  if (user?.plan === "pro" || done) {
    return (
      <span className="mt-8 block rounded-full bg-emerald-400/10 py-3 text-center text-sm text-emerald-400">
        Pro active ✓
      </span>
    );
  }

  if (!user) {
    return (
      <Link
        href="/register"
        className="btn-primary mt-8 block rounded-full py-3 text-center text-sm font-medium text-white"
      >
        Sign up, then upgrade
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          const res = await fetch("/api/auth/upgrade", { method: "POST" });
          if (res.status === 503) {
            upgradeToPro();
            setDone(true);
            return;
          }
          const data = (await res.json()) as { ok?: boolean };
          if (data.ok) {
            setDone(true);
            setTimeout(() => window.location.reload(), 800);
          }
        } catch {
          // network error: fall back to local demo upgrade
          upgradeToPro();
          setDone(true);
        }
      }}
      className="btn-primary mt-8 block w-full rounded-full py-3 text-center text-sm font-medium text-white"
    >
      Upgrade to Pro (demo)
    </button>
  );
}
