/** Compress / decompose SDP blobs so they fit inside a QR code or paste box. */

const PREFIX = "SG16";

function base64UrlEncode(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(text: string): Uint8Array {
  const normalized = text.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

async function deflateText(text: string) {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  const buffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(buffer);
}

async function inflate(bytes: Uint8Array) {
  const stream = new Blob([bytes as unknown as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));
  return new Response(stream).text();
}

function hasCompression() {
  return typeof CompressionStream !== "undefined";
}

/** Pack a session description into a short transferable token. */
export async function packDescription(desc: { type: string; sdp: string }): Promise<string> {
  const json = JSON.stringify({ t: desc.type, s: desc.sdp });
  if (hasCompression()) {
    try {
      const bytes = await deflateText(json);
      return `${PREFIX}1${base64UrlEncode(bytes)}`;
    } catch {
      /* fall through to plain */
    }
  }
  return `${PREFIX}0${base64UrlEncode(new TextEncoder().encode(json))}`;
}

/** Reverse of packDescription. Returns null when the token is malformed. */
export async function unpackDescription(
  token: string,
): Promise<{ type: "offer" | "answer"; sdp: string } | null> {
  const clean = token.trim().replace(/\s+/g, "");
  if (!clean.startsWith(PREFIX)) return null;
  const flag = clean.charAt(PREFIX.length);
  const payload = clean.slice(PREFIX.length + 1);
  if (!payload) return null;
  try {
    const bytes = base64UrlDecode(payload);
    const json =
      flag === "1" && hasCompression()
        ? await inflate(bytes)
        : new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json) as { t?: string; s?: string };
    if (parsed.t !== "offer" && parsed.t !== "answer") return null;
    if (typeof parsed.s !== "string") return null;
    return { type: parsed.t, sdp: parsed.s };
  } catch {
    return null;
  }
}

/** Human friendly device label + coarse platform detection. */
export function detectDevice(): { label: string; kind: string } {
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  const platform =
    typeof navigator !== "undefined" && "platform" in navigator
      ? String((navigator as unknown as { platform?: string }).platform ?? "")
      : "";
  if (/iPhone/i.test(ua)) return { label: "iPhone", kind: "ios" };
  if (/iPad/i.test(ua) || (platform === "MacIntel" && navigator.maxTouchPoints > 1)) {
    return { label: "iPad", kind: "ios" };
  }
  if (/Android/i.test(ua)) {
    const match = ua.match(/Android [\d.]+; ([^;)]+)/);
    return { label: match ? match[1].trim() : "Android", kind: "android" };
  }
  if (/Windows/i.test(ua)) return { label: "Windows PC", kind: "pc" };
  if (/Mac OS X/i.test(ua)) return { label: "Mac", kind: "pc" };
  if (/CrOS/i.test(ua)) return { label: "Chromebook", kind: "pc" };
  if (/Linux/i.test(ua)) return { label: "Linux PC", kind: "pc" };
  return { label: "Device", kind: "web" };
}

export function deviceEmoji(kind: string) {
  if (kind === "ios") return "📱";
  if (kind === "android") return "🤖";
  if (kind === "pc") return "💻";
  return "🌐";
}
