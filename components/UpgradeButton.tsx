"use client";

import Link from "next/link";

import { useSession } from "@/lib/use-session";
import ProUpgradeButton from "./ui/ProUpgradeButton";

export default function UpgradeButton({ planId }: { planId: "free" | "pro" }) {
  const { user, ready } = useSession();

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

  if (user?.isAdmin || user?.plan === "pro") {
    return (
      <span className="mt-8 block rounded-full bg-emerald-400/10 py-3 text-center text-sm text-emerald-400">
        {user.isAdmin ? "Developer access · all unlocked" : "Pro active ✓"}
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
    <ProUpgradeButton
      lang="en"
      label="Upgrade to Pro"
      source="pricing"
      className="mt-8 w-full"
    />
  );
}
