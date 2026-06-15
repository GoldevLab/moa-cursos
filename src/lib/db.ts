import { createClient, type Client } from "@libsql/client";
import { isAppBuildContext } from "./build-context";

const globalStore = globalThis as typeof globalThis & {
  __moaDbClient?: Client | null;
  __moaSchemaEnsured?: Set<string>;
};

const isRetryableLibsqlCode = (err: unknown): boolean => {
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code?: unknown }).code || "")
      : "";
  return code === "SQLITE_NOMEM" || code === "SQLITE_BUSY";
};

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

if (!globalStore.__moaDbClient) {
  globalStore.__moaDbClient = null;
}

if (!globalStore.__moaSchemaEnsured) {
  globalStore.__moaSchemaEnsured = new Set();
}

export const isSchemaEnsured = (key: string) =>
  globalStore.__moaSchemaEnsured?.has(key) ?? false;

export const markSchemaAsEnsured = (key: string) => {
  globalStore.__moaSchemaEnsured?.add(key);
};

export const resetMoaSchemaCache = () => {
  globalStore.__moaSchemaEnsured?.clear();
};

export const getDbClient = () => {
  if (globalStore.__moaDbClient) return globalStore.__moaDbClient;

  let url =
    process.env.PRIVATE_TURSO_DATABASE_URL ||
    process.env.TURSO_DATABASE_URL ||
    process.env.TURSO_URL ||
    "";

  const authToken =
    process.env.PRIVATE_TURSO_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;

  if (typeof window === "undefined" && !url) {
    if (isAppBuildContext()) {
      url = "file::memory:?cache=shared";
    } else {
      url = "file:dev.db";
    }
  }

  if (!url) {
    throw new Error("Turso database URL is not configured.");
  }

  if (typeof window === "undefined") {
    const label = url.startsWith("file:") ? url : "Remote Turso";
    console.log(`[MOA DB] Connecting to: ${label}`);
    if (
      !url.startsWith("file:") &&
      !url.startsWith("libsql:") &&
      !authToken
    ) {
      console.warn("[MOA DB] Remote URL without auth token.");
    }
  }

  const normalizeSqlArg = (value: unknown): string | number | Uint8Array | null => {
    if (value === null || value === undefined) return null;
    if (typeof value === "string") return value;
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (typeof value === "boolean") return value ? 1 : 0;
    if (typeof value === "bigint") {
      const numberValue = Number(value);
      return Number.isFinite(numberValue) ? numberValue : value.toString();
    }
    if (value instanceof Date) return value.toISOString();
    if (value instanceof Uint8Array) return value;
    return String(value);
  };

  const normalizeStatementArgs = (statement: unknown): unknown => {
    if (!statement || typeof statement !== "object") return statement;
    if (!("args" in statement)) return statement;

    const statementWithArgs = statement as { args?: unknown };
    if (!Array.isArray(statementWithArgs.args)) return statement;

    return {
      ...(statement as Record<string, unknown>),
      args: statementWithArgs.args.map((arg) => normalizeSqlArg(arg)),
    };
  };

  const rawClient = createClient({
    url,
    authToken: url.startsWith("file:") ? undefined : authToken,
  });

  const wrappedClient = new Proxy(rawClient, {
    get(target, property, receiver) {
      if (property === "execute") {
        return async (statement: unknown) => {
          const stmt = normalizeStatementArgs(statement) as Parameters<
            Client["execute"]
          >[0];
          const backoffMs = isAppBuildContext()
            ? [0, 50, 150, 400, 1000, 2500]
            : [0, 200, 600, 1600, 4000];
          let lastErr: unknown;
          for (const ms of backoffMs) {
            if (ms > 0) await sleep(ms);
            try {
              return await target.execute(stmt);
            } catch (e) {
              lastErr = e;
              if (!isRetryableLibsqlCode(e)) throw e;
            }
          }
          throw lastErr;
        };
      }
      if (property === "batch") {
        return async (
          statements: Parameters<Client["batch"]>[0],
          mode?: Parameters<Client["batch"]>[1],
        ) => {
          const normalized = Array.isArray(statements)
            ? statements.map((s) => normalizeStatementArgs(s))
            : statements;
          const backoffMs = isAppBuildContext()
            ? [0, 50, 150, 400, 1000, 2500]
            : [0, 200, 600, 1600, 4000];
          let lastErr: unknown;
          for (const ms of backoffMs) {
            if (ms > 0) await sleep(ms);
            try {
              return await target.batch(
                normalized as Parameters<Client["batch"]>[0],
                mode,
              );
            } catch (e) {
              lastErr = e;
              if (!isRetryableLibsqlCode(e)) throw e;
            }
          }
          throw lastErr;
        };
      }
      return Reflect.get(target, property, receiver);
    },
  });

  globalStore.__moaDbClient = wrappedClient as Client;
  return globalStore.__moaDbClient;
};

export type MoaRole = "estudiante" | "profesor" | "admin";

export type UsuarioRow = {
  id_usuario: number;
  username: string;
  password: string;
  nombres: string;
  apellidos: string;
  rol: MoaRole;
  fecha_registro: string;
};

export type EstudianteRow = {
  id_estudiante: number;
  id_usuario: number;
  id_escuela: number;
  id_gradoactual: number;
  racha_actual: number;
  mejor_racha: number;
  ultima_actividad: string | null;
  puntos_totales: number;
  trofeo_lapso1: number;
  trofeo_lapso2: number;
  trofeo_lapso3: number;
};

export type CompetenciaRow = {
  id_competencia: number;
  id_grado: number;
  titulo: string;
  orden: number;
  lapso: number;
};

export type LeccionRow = {
  id_leccion: number;
  id_competencia: number;
  titulo: string;
  orden: number;
};

export type ProgresoLeccionRow = {
  id: number;
  id_estudiante: number;
  id_leccion: number;
  presentation_completada: number;
  practice_completada: number;
  use_completada: number;
  puntaje_total: number;
  es_perfecta: number;
  fecha_ultimo_intento: string;
  fecha_completado: string | null;
  completada: number;
  intentos: number;
};

export type ListaBlancaRow = {
  id: number;
  id_escuela: number | null;
  nombres: string;
  apellidos: string;
  rol_asignado: MoaRole;
  id_gradoactual: number | null;
  ya_registrado: number;
};

export const rowInt = (value: unknown, fallback = 0) => {
  if (value === null || value === undefined) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export const rowStr = (value: unknown, fallback = "") =>
  value === null || value === undefined ? fallback : String(value);
