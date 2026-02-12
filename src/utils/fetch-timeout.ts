export function makeTimeoutFetch(fetchImpl: typeof fetch, timeoutMs: number): typeof fetch {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return fetchImpl;
  }

  const wrapped = (async (input: any, init?: RequestInit): Promise<Response> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const upstream = init?.signal;
    if (upstream) {
      if (upstream.aborted) {
        controller.abort();
      } else {
        upstream.addEventListener("abort", () => controller.abort(), { once: true });
      }
    }

    try {
      return await fetchImpl(input, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }) as unknown as typeof fetch;

  // Bun's fetch includes extra properties (e.g. preconnect). Preserve if present.
  (wrapped as any).preconnect = (fetchImpl as any).preconnect?.bind(fetchImpl);
  return wrapped;
}
