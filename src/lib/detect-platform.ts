export type InstallPlatform = "android" | "ios" | "desktop" | "other";

export function detectInstallPlatform(): InstallPlatform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return "android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Windows|Mac|Linux|CrOS/i.test(ua)) return "desktop";
  return "other";
}

export function isStandaloneApp() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((window.navigator as { standalone?: boolean }).standalone)
  );
}
