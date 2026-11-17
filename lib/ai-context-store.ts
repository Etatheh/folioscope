"use client";

import { useSyncExternalStore } from "react";

import type { ChatDcaContext } from "./chat";

/**
 * Minimal external store for the DCA context currently shown on the dashboard.
 * DcaBacktestCard publishes here from its effects, and the assistant drawer
 * subscribes — keeping the chat synced without lifting all backtest state.
 */

let current: ChatDcaContext | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return current;
}

function getServerSnapshot(): ChatDcaContext | null {
  return null;
}

function same(a: ChatDcaContext | null, b: ChatDcaContext | null): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function setAiDca(next: ChatDcaContext | null) {
  if (same(current, next)) return;
  current = next;
  for (const listener of listeners) listener();
}

export function useAiDca(): ChatDcaContext | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}