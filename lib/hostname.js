/**
 * Normalize user input into a bare hostname for DNR + permission origins.
 * @param {string} input
 * @returns {{ host: string } | { error: string }}
 */
export function normalizeHostname(input) {
  if (typeof input !== "string") {
    return { error: "Enter a website." };
  }

  let raw = input.trim().toLowerCase();
  if (!raw) {
    return { error: "Enter a website." };
  }

  raw = raw.replace(/\s+/g, "");

  if (raw.includes("://") === false) {
    raw = `https://${raw}`;
  }

  let url;
  try {
    url = new URL(raw);
  } catch {
    return { error: "That does not look like a valid website." };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { error: "Only http and https sites can be blocked." };
  }

  let host = url.hostname.replace(/\.$/, "");
  if (host.startsWith("www.")) {
    host = host.slice(4);
  }

  if (!host || host === "localhost") {
    return { error: "Enter a public domain (e.g. youtube.com)." };
  }

  if (!/^[a-z0-9.-]+$/.test(host) || !host.includes(".")) {
    return { error: "Enter a domain like youtube.com or news.ycombinator.com." };
  }

  if (host.startsWith(".") || host.endsWith(".") || host.includes("..")) {
    return { error: "Enter a valid domain name." };
  }

  return { host };
}

/** Origins needed to redirect a given host (apex + subdomains). */
export function originsForHost(host) {
  return [`*://${host}/*`, `*://*.${host}/*`];
}

/**
 * Stable positive rule id from hostname (1..2^31-1 range for DNR).
 * @param {string} host
 */
export function ruleIdForHost(host) {
  let hash = 2166136261;
  for (let i = 0; i < host.length; i += 1) {
    hash ^= host.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 2000000000 || 1;
}
