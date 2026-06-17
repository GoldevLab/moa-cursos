import type { RequestEventBase } from "@builder.io/qwik-city";

type Bucket = {
  count: number;
  resetAt: number;
};

/**
 * Limitador de tasa simple en memoria (ventana fija). Suficiente para un único
 * servidor; si se escala a varias instancias habría que mover esto a la BD o a
 * un almacén compartido.
 */
const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

export const checkRateLimit = (
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult => {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
};

/** Libera el contador tras un intento exitoso (p. ej. login correcto). */
export const resetRateLimit = (key: string) => {
  buckets.delete(key);
};

/** Mejor IP disponible del cliente para usar como clave del limitador. */
export const clientKeyFromEvent = (event: RequestEventBase): string => {
  const forwarded = event.request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  if (forwarded) return forwarded;
  try {
    return event.clientConn?.ip ?? "unknown";
  } catch {
    return "unknown";
  }
};

// Limpieza periódica para evitar crecimiento ilimitado del Map.
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
if (typeof setInterval !== "undefined") {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }, CLEANUP_INTERVAL_MS);
  // No mantener vivo el proceso solo por este temporizador.
  (timer as { unref?: () => void }).unref?.();
}
