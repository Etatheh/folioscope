"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/lib/use-session";

export default function AuthGate({
  children,
  lang = "zh",
}: {
  children: React.ReactNode;
  lang?: "zh" | "en";
}) {
  const { user, ready } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (ready && !user) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [ready, user, router, pathname]);

  if (!ready || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-500">
          {lang === "zh" ? "正在检查登录状态…" : "Checking session…"}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
