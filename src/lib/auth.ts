import type { CookieOptions, RequestEventBase } from "@builder.io/qwik-city";
import {
  createHash,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { getDbClient, rowInt, rowStr, type MoaRole, type UsuarioRow } from "./db";
import { ensureMoaSchema } from "./schema";

export interface SessionInfo {
  userId: number;
  token: string;
}

const SESSION_COOKIE = "moa_session";
const SESSION_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

const getSessionMaxAgeMs = () => SESSION_MAX_AGE_SECONDS * 1000;

const isSecureRequest = (event: RequestEventBase): boolean => {
  if (event.url.protocol === "https:") return true;
  const xf = event.request.headers.get("x-forwarded-proto");
  return xf?.split(",")[0]?.trim().toLowerCase() === "https";
};

const buildSessionCookieSetOptions = (
  event: RequestEventBase,
  expiresAt: Date,
): CookieOptions => ({
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  secure: isSecureRequest(event),
  maxAge: SESSION_MAX_AGE_SECONDS,
  expires: expiresAt,
});

const buildSessionCookieDeleteOptions = (): Pick<
  CookieOptions,
  "path" | "sameSite"
> => ({
  path: "/",
  sameSite: "lax",
});

const normalizePasswordForCrypto = (password: string) =>
  String(password || "").normalize("NFKC");

export const hashPassword = (password: string) => {
  const plain = normalizePasswordForCrypto(password);
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(plain, salt, 64).toString("hex");
  return { salt, hash };
};

export const verifyPassword = (password: string, stored: string) => {
  const [salt, hash] = String(stored || "").split(":");
  if (!salt || !hash) return false;

  const plain = normalizePasswordForCrypto(password);
  const currentHashBuffer = Buffer.from(hash, "hex");
  const nextHash = scryptSync(plain, salt, 64).toString("hex");
  const nextHashBuffer = Buffer.from(nextHash, "hex");
  if (currentHashBuffer.length !== nextHashBuffer.length) return false;
  return timingSafeEqual(currentHashBuffer, nextHashBuffer);
};

export const normalizeUsername = (username: string) =>
  String(username || "").trim().toLowerCase();

export const getUsuarioById = async (
  idUsuario: number,
): Promise<UsuarioRow | null> => {
  await ensureMoaSchema();
  const client = getDbClient();
  const res = await client.execute({
    sql: `SELECT id_usuario, username, password, nombres, apellidos, rol, fecha_registro
          FROM usuario WHERE id_usuario = ? LIMIT 1`,
    args: [idUsuario],
  });
  const row = res.rows[0];
  if (!row) return null;
  return {
    id_usuario: rowInt(row.id_usuario),
    username: rowStr(row.username),
    password: rowStr(row.password),
    nombres: rowStr(row.nombres),
    apellidos: rowStr(row.apellidos),
    rol: rowStr(row.rol) as MoaRole,
    fecha_registro: rowStr(row.fecha_registro),
  };
};

export const getUsuarioByUsername = async (
  username: string,
): Promise<UsuarioRow | null> => {
  await ensureMoaSchema();
  const normalized = normalizeUsername(username);
  if (!normalized) return null;

  const client = getDbClient();
  const res = await client.execute({
    sql: `SELECT id_usuario, username, password, nombres, apellidos, rol, fecha_registro
          FROM usuario WHERE lower(username) = ? LIMIT 1`,
    args: [normalized],
  });
  const row = res.rows[0];
  if (!row) return null;
  return {
    id_usuario: rowInt(row.id_usuario),
    username: rowStr(row.username),
    password: rowStr(row.password),
    nombres: rowStr(row.nombres),
    apellidos: rowStr(row.apellidos),
    rol: rowStr(row.rol) as MoaRole,
    fecha_registro: rowStr(row.fecha_registro),
  };
};

export const authenticateUsuario = async (
  username: string,
  password: string,
): Promise<UsuarioRow | null> => {
  const user = await getUsuarioByUsername(username);
  if (!user) return null;
  if (!verifyPassword(password, user.password)) return null;
  return user;
};

export const createSession = async (
  userId: number,
  event: RequestEventBase,
): Promise<SessionInfo> => {
  await ensureMoaSchema();
  const client = getDbClient();

  const existingToken = event.cookie.get(SESSION_COOKIE)?.value;
  if (existingToken) {
    await client.execute({
      sql: "DELETE FROM sessions WHERE token = ?",
      args: [existingToken],
    });
  }

  const token = `sess_${randomUUID()}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + getSessionMaxAgeMs());

  await client.execute({
    sql: `INSERT INTO sessions (id, user_id, token, expires_at, created_at, last_seen)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      `ses_${randomUUID()}`,
      userId,
      token,
      expiresAt.toISOString(),
      now.toISOString(),
      now.toISOString(),
    ],
  });

  event.cookie.set(
    SESSION_COOKIE,
    token,
    buildSessionCookieSetOptions(event, expiresAt),
  );

  return { token, userId };
};

export const clearSession = async (event: RequestEventBase) => {
  const token = event.cookie.get(SESSION_COOKIE)?.value;
  if (token) {
    const client = getDbClient();
    await client.execute({
      sql: "DELETE FROM sessions WHERE token = ?",
      args: [token],
    });
  }
  event.cookie.delete(SESSION_COOKIE, buildSessionCookieDeleteOptions());
};

export const getSessionByToken = async (
  token?: string | null,
  event?: RequestEventBase,
): Promise<SessionInfo | null> => {
  if (!token) return null;

  await ensureMoaSchema();
  const client = getDbClient();
  const now = new Date();
  const result = await client.execute({
    sql: "SELECT user_id, expires_at FROM sessions WHERE token = ? LIMIT 1",
    args: [token],
  });
  const row = result.rows[0];
  if (!row) return null;

  const expiresAt = new Date(rowStr(row.expires_at));
  if (Number.isNaN(expiresAt.getTime()) || expiresAt <= now) {
    await client.execute({
      sql: "DELETE FROM sessions WHERE token = ?",
      args: [token],
    });
    return null;
  }

  const userId = rowInt(row.user_id);
  const newExpiresAt = new Date(now.getTime() + getSessionMaxAgeMs());

  await client.execute({
    sql: "UPDATE sessions SET expires_at = ?, last_seen = ? WHERE token = ?",
    args: [newExpiresAt.toISOString(), now.toISOString(), token],
  });

  if (event) {
    event.cookie.set(
      SESSION_COOKIE,
      token,
      buildSessionCookieSetOptions(event, newExpiresAt),
    );
  }

  return { userId, token };
};

export const getSessionFromEvent = async (
  event: RequestEventBase,
): Promise<SessionInfo | null> => {
  const CACHE_KEY = "_moa_session_cache";
  if (event.sharedMap.has(CACHE_KEY)) {
    return event.sharedMap.get(CACHE_KEY) as SessionInfo | null;
  }
  const token = event.cookie.get(SESSION_COOKIE)?.value;
  const session = await getSessionByToken(token, event);
  event.sharedMap.set(CACHE_KEY, session);
  return session;
};

export const getCurrentUsuario = async (event: RequestEventBase) => {
  const session = await getSessionFromEvent(event);
  if (!session) return null;
  return getUsuarioById(session.userId);
};

export const storePassword = (password: string) => {
  const { salt, hash } = hashPassword(password);
  return `${salt}:${hash}`;
};

export const updateUsuarioPassword = async (
  idUsuario: number,
  password: string,
  options?: { invalidateSessions?: boolean },
): Promise<{ ok: true } | { ok: false; reason: "weak_password" | "not_found" }> => {
  if (password.length < 8) return { ok: false, reason: "weak_password" };
  await ensureMoaSchema();
  const user = await getUsuarioById(idUsuario);
  if (!user) return { ok: false, reason: "not_found" };

  const client = getDbClient();
  await client.execute({
    sql: "UPDATE usuario SET password = ? WHERE id_usuario = ?",
    args: [storePassword(password), idUsuario],
  });

  if (options?.invalidateSessions !== false) {
    await client.execute({
      sql: "DELETE FROM sessions WHERE user_id = ?",
      args: [idUsuario],
    });
  }

  return { ok: true };
};

export const changeOwnPassword = async (
  idUsuario: number,
  currentPassword: string,
  newPassword: string,
): Promise<
  | { ok: true }
  | { ok: false; reason: "weak_password" | "wrong_password" | "not_found" }
> => {
  if (newPassword.length < 8) return { ok: false, reason: "weak_password" };
  const user = await getUsuarioById(idUsuario);
  if (!user) return { ok: false, reason: "not_found" };
  if (!verifyPassword(currentPassword, user.password)) {
    return { ok: false, reason: "wrong_password" };
  }
  return updateUsuarioPassword(idUsuario, newPassword, {
    invalidateSessions: false,
  });
};

export const usernameFromNames = (nombres: string, apellidos: string) => {
  const base = `${nombres}.${apellidos}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9.]/g, "")
    .replace(/\.+/g, ".")
    .replace(/^\.|\.$/g, "");
  const suffix = createHash("sha256")
    .update(`${nombres}:${apellidos}:${Date.now()}`)
    .digest("hex")
    .slice(0, 6);
  return `${base || "usuario"}.${suffix}`;
};
