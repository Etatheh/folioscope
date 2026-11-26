import { redirect } from "next/navigation";

/** Backward-compatible shorthand for the dashboard entry point. */
export default function DashboardShortcutPage() {
  redirect("/dashboard");
}
