import { getBackendBase } from '@/lib/backend';
import { supabase } from '@/lib/supabase';

const WARMUP_CACHE_KEY = 'genai:model-warmup:last-success-at';
const WARMUP_TTL_MS = 10 * 60 * 1000;

function shouldWarmNow(force = false) {
  if (force) return true;
  if (typeof window === 'undefined') return true;

  const raw = window.sessionStorage.getItem(WARMUP_CACHE_KEY);
  const last = raw ? Number(raw) : 0;
  return !last || Number.isNaN(last) || Date.now() - last > WARMUP_TTL_MS;
}

function markWarmSuccess() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(WARMUP_CACHE_KEY, String(Date.now()));
}

export function resetWarmupMarker() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(WARMUP_CACHE_KEY);
}

export async function warmAllModels(force = false) {
  const base = getBackendBase();
  if (!base || !shouldWarmNow(force)) return;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return;

  const response = await fetch(`${base}/api/llm-playground/warmup`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || 'Model warmup failed.');
  }

  const payload = (await response.json()) as {
    failed?: Array<{ modelId: string; error: string }>;
  };

  if (payload.failed?.length) {
    const summary = payload.failed.map((item) => `${item.modelId}: ${item.error}`).join('; ');
    throw new Error(summary || 'Model warmup failed.');
  }

  markWarmSuccess();
}
