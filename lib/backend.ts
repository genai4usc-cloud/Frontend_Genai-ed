const DEFAULT_LOCAL_BACKEND_BASE = 'http://127.0.0.1:8000';
const DEFAULT_REMOTE_BACKEND_BASE = 'https://backend-genai-ed.onrender.com';

function isLocalHostname(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function isLocalBackendBase(value: string) {
  try {
    const url = new URL(value);
    return isLocalHostname(url.hostname);
  } catch {
    return value.includes('127.0.0.1') || value.includes('localhost');
  }
}

export function getBackendBase() {
  const localOverride = process.env.NEXT_PUBLIC_BACKEND_BASE_LOCAL?.trim();
  const remoteOverride =
    process.env.NEXT_PUBLIC_BACKEND_BASE_REMOTE?.trim() ||
    process.env.NEXT_PUBLIC_BACKEND_BASE?.trim();

  if (typeof window !== 'undefined') {
    if (isLocalHostname(window.location.hostname)) {
      return localOverride || DEFAULT_LOCAL_BACKEND_BASE;
    }

    if (remoteOverride && !isLocalBackendBase(remoteOverride)) {
      return remoteOverride;
    }

    return DEFAULT_REMOTE_BACKEND_BASE;
  }

  return process.env.NODE_ENV === 'development'
    ? localOverride || DEFAULT_LOCAL_BACKEND_BASE
    : remoteOverride || DEFAULT_REMOTE_BACKEND_BASE;
}
