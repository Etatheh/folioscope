"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { Lang } from "@/lib/i18n";
import { resolveClientLang } from "@/lib/lang-pref";
import AuthModal, { type AuthModalMode } from "./AuthModal";

type OpenOptions = { mode?: AuthModalMode; lang?: Lang };

type AuthModalContextValue = {
  openAuthModal: (options?: OpenOptions | AuthModalMode) => void;
};

const AuthModalContext = createContext<AuthModalContextValue | null>(null);
const NOOP: AuthModalContextValue = { openAuthModal: () => {} };


/**
 * Mounts one AuthModal for the whole app and exposes `openAuthModal()` to any
 * client component (navbar, user menu, locked Pro cards, …).
 */
export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    open: boolean;
    mode: AuthModalMode;
    lang: Lang;
    /** Remount key: guarantees a clean form every time the dialog opens. */
    nonce: number;
  }>({ open: false, mode: "login", lang: "en", nonce: 0 });

  const openAuthModal = useCallback((options?: OpenOptions | AuthModalMode) => {
    const opts = typeof options === "string" ? { mode: options } : options;
    setState((current) => ({
      open: true,
      mode: opts?.mode ?? "login",
      lang: opts?.lang ?? resolveClientLang(),
      nonce: current.nonce + 1,
    }));
  }, []);

  const close = useCallback(() => {
    setState((current) => ({ ...current, open: false }));
  }, []);

  const value = useMemo(() => ({ openAuthModal }), [openAuthModal]);

  return (
    <AuthModalContext.Provider value={value}>
      {children}
      <AuthModal
        key={state.nonce}
        open={state.open}
        onClose={close}
        lang={state.lang}
        initialMode={state.mode}
      />
    </AuthModalContext.Provider>
  );
}

export function useAuthModal(): AuthModalContextValue {
  return useContext(AuthModalContext) ?? NOOP;
}