"use client";

import { useSyncExternalStore } from "react";

import type { ChatDcaContext, ChatSimulatorContext } from "./chat";

/**
 * Minimal external stores for the live dashboard inputs shown to the assistant.
 * Components publish here from effects, and the assistant drawer subscribes —
 * keeping the chat synced without lifting all backtest state.
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

function same(a: unknown, b: unknown): boolean {
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

let currentSimulator: ChatSimulatorContext | null = null;
const simulatorListeners = new Set<() => void>();

function subscribeSimulator(listener: () => void) {
  simulatorListeners.add(listener);
  return () => {
    simulatorListeners.delete(listener);
  };
}

function getSimulatorSnapshot() {
  return currentSimulator;
}

function getSimulatorServerSnapshot(): ChatSimulatorContext | null {
  return null;
}

export function setAiSimulator(next: ChatSimulatorContext | null) {
  if (same(currentSimulator, next)) return;
  currentSimulator = next;
  for (const listener of simulatorListeners) listener();
}

export function useAiSimulator(): ChatSimulatorContext | null {
  return useSyncExternalStore(
    subscribeSimulator,
    getSimulatorSnapshot,
    getSimulatorServerSnapshot
  );
}