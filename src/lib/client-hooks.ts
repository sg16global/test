"use client";

import { useSyncExternalStore } from "react";
import { detectDevice } from "@/lib/peer/codec";

export type DeviceInfo = { label: string; kind: string };

const SSR_DEVICE: DeviceInfo = { label: "Device", kind: "web" };

/** Stable snapshot — getSnapshot must return the same reference when values are unchanged. */
let cachedDevice: DeviceInfo = SSR_DEVICE;

function getDeviceSnapshot(): DeviceInfo {
  const next = detectDevice();
  if (cachedDevice.label === next.label && cachedDevice.kind === next.kind) {
    return cachedDevice;
  }
  cachedDevice = { label: next.label, kind: next.kind };
  return cachedDevice;
}

function readJoinCode() {
  const join = new URLSearchParams(window.location.search).get("join");
  return join ? join.toUpperCase().replace(/[^A-Z0-9]/g, "") : "";
}

/** Device label/emoji source — safe for SSR hydration. */
export function useDeviceInfo(): DeviceInfo {
  return useSyncExternalStore(
    () => () => {},
    getDeviceSnapshot,
    () => SSR_DEVICE,
  );
}

/** ?join= code from the URL — empty on the server, filled after hydration. */
export function useJoinCodeFromUrl() {
  return useSyncExternalStore(
    () => () => {},
    readJoinCode,
    () => "",
  );
}

export type InstallPlatform = "android" | "ios" | "desktop" | "other";
export type OsHint = "windows" | "mac" | "linux" | "other";

function readInstallPlatform(): InstallPlatform {
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return "android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Windows|Mac|Linux|CrOS/i.test(ua)) return "desktop";
  return "other";
}

function readOsHint(): OsHint {
  const ua = navigator.userAgent;
  if (/Windows/i.test(ua)) return "windows";
  if (/Mac/i.test(ua)) return "mac";
  if (/Linux|CrOS/i.test(ua)) return "linux";
  return "other";
}

function readStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((window.navigator as { standalone?: boolean }).standalone)
  );
}

export function useInstallPlatform() {
  return useSyncExternalStore(
    () => () => {},
    readInstallPlatform,
    (): InstallPlatform => "other",
  );
}

export function useOsHint() {
  return useSyncExternalStore(
    () => () => {},
    readOsHint,
    (): OsHint => "other",
  );
}

export function useStandaloneApp() {
  return useSyncExternalStore(
    () => () => {},
    readStandalone,
    () => false,
  );
}
