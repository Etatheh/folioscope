import AuthPage from "@/components/auth/AuthPage";

/** Full-page registration built from the same panel as the global auth dialog. */
export default function RegisterPage() {
  return <AuthPage mode="signup" />;
}