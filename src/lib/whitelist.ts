import { getDbClient, rowInt, rowStr } from "./db";
import { ensureMoaSchema } from "./schema";
import { normalizeUsername, storePassword, usernameFromNames } from "./auth";

export type ActivateAccountInput = {
  nombres: string;
  apellidos: string;
  password: string;
  username?: string;
};

export type ActivateAccountResult =
  | { ok: true; username: string }
  | {
      ok: false;
      reason:
        | "not_found"
        | "already_registered"
        | "weak_password"
        | "username_taken"
        | "invalid_names"
        | "incomplete_profile"
        | "activation_error";
    };

export const findWhitelistEntry = async (
  nombres: string,
  apellidos: string,
) => {
  await ensureMoaSchema();
  const client = getDbClient();
  const res = await client.execute({
    sql: `SELECT id, id_escuela, nombres, apellidos, rol_asignado, id_gradoactual, ya_registrado
          FROM lista_blanca
          WHERE lower(trim(nombres)) = lower(trim(?))
            AND lower(trim(apellidos)) = lower(trim(?))
          ORDER BY ya_registrado ASC, id DESC
          LIMIT 1`,
    args: [nombres, apellidos],
  });
  const row = res.rows[0];
  if (!row) return null;
  return {
    id: rowInt(row.id),
    id_escuela: row.id_escuela == null ? null : rowInt(row.id_escuela),
    nombres: rowStr(row.nombres),
    apellidos: rowStr(row.apellidos),
    rol_asignado: rowStr(row.rol_asignado) as
      | "estudiante"
      | "profesor"
      | "admin",
    id_gradoactual:
      row.id_gradoactual == null ? null : rowInt(row.id_gradoactual),
    ya_registrado: rowInt(row.ya_registrado),
  };
};

export const activateAccountFromWhitelist = async (
  input: ActivateAccountInput,
): Promise<ActivateAccountResult> => {
  const nombres = String(input.nombres || "").trim();
  const apellidos = String(input.apellidos || "").trim();
  const password = String(input.password || "");

  if (!nombres || !apellidos) {
    return { ok: false, reason: "invalid_names" };
  }
  if (password.length < 8) {
    return { ok: false, reason: "weak_password" };
  }

  const entry = await findWhitelistEntry(nombres, apellidos);
  if (!entry) return { ok: false, reason: "not_found" };
  if (entry.ya_registrado) return { ok: false, reason: "already_registered" };

  const client = getDbClient();
  let username =
    normalizeUsername(input.username || "") ||
    usernameFromNames(nombres, apellidos);

  const taken = await client.execute({
    sql: "SELECT id_usuario FROM usuario WHERE lower(username) = ? LIMIT 1",
    args: [username],
  });
  if (taken.rows.length > 0) {
    username = usernameFromNames(nombres, apellidos);
    const retry = await client.execute({
      sql: "SELECT id_usuario FROM usuario WHERE lower(username) = ? LIMIT 1",
      args: [username],
    });
    if (retry.rows.length > 0) {
      return { ok: false, reason: "username_taken" };
    }
  }

  if (entry.rol_asignado === "estudiante") {
    if (!entry.id_escuela || !entry.id_gradoactual) {
      return { ok: false, reason: "incomplete_profile" };
    }
  }

  const passwordHash = storePassword(password);

  // Reclamo atómico de la entrada: solo una activación concurrente puede pasar
  // de ya_registrado = 0 a 1. Evita crear dos cuentas para la misma persona.
  const claim = await client.execute({
    sql: `UPDATE lista_blanca SET ya_registrado = 1
          WHERE lower(trim(nombres)) = lower(trim(?))
            AND lower(trim(apellidos)) = lower(trim(?))
            AND ya_registrado = 0`,
    args: [nombres, apellidos],
  });
  if (Number(claim.rowsAffected ?? 0) === 0) {
    return { ok: false, reason: "already_registered" };
  }

  try {
    const userRes = await client.execute({
      sql: `INSERT INTO usuario (username, password, nombres, apellidos, rol, fecha_registro)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
            RETURNING id_usuario`,
      args: [
        username,
        passwordHash,
        nombres,
        apellidos,
        entry.rol_asignado,
      ],
    });
    const idUsuario =
      rowInt(userRes.rows[0]?.id_usuario) ||
      Number(userRes.lastInsertRowid ?? 0);
    if (!idUsuario) {
      throw new Error("No se obtuvo id_usuario tras la inserción");
    }

    if (entry.rol_asignado === "estudiante") {
      await client.execute({
        sql: `INSERT INTO estudiante
              (id_usuario, id_escuela, id_gradoactual, racha_actual, mejor_racha, puntos_totales)
              VALUES (?, ?, ?, 0, 0, 0)`,
        args: [idUsuario, entry.id_escuela, entry.id_gradoactual],
      });
    } else {
      await client.execute({
        sql: `INSERT INTO administrador (id_usuario, id_escuela, id_gradoactual)
              VALUES (?, ?, ?)`,
        args: [idUsuario, entry.id_escuela, entry.id_gradoactual],
      });
    }

    return { ok: true, username };
  } catch (error) {
    console.error("[whitelist] activateAccountFromWhitelist failed:", error);
    // Revierte: borra el usuario a medio crear y libera el reclamo de la lista.
    await client
      .execute({
        sql: `DELETE FROM usuario WHERE lower(username) = ?`,
        args: [username],
      })
      .catch(() => undefined);
    await client
      .execute({
        sql: `UPDATE lista_blanca SET ya_registrado = 0
              WHERE lower(trim(nombres)) = lower(trim(?))
                AND lower(trim(apellidos)) = lower(trim(?))`,
        args: [nombres, apellidos],
      })
      .catch(() => undefined);
    return { ok: false, reason: "activation_error" };
  }
};

export const listWhitelistEntries = async () => {
  await ensureMoaSchema();
  const client = getDbClient();
  const res = await client.execute({
    sql: `SELECT lb.id, lb.nombres, lb.apellidos, lb.rol_asignado, lb.ya_registrado,
                 e.nombre AS escuela, g.nombre AS grado
          FROM lista_blanca lb
          INNER JOIN (
            SELECT MIN(id) AS id
            FROM lista_blanca
            GROUP BY lower(trim(nombres)), lower(trim(apellidos))
          ) uniq ON uniq.id = lb.id
          LEFT JOIN escuela e ON e.id_escuela = lb.id_escuela
          LEFT JOIN grado g ON g.id_grado = lb.id_gradoactual
          ORDER BY lb.id DESC`,
    args: [],
  });
  return res.rows.map((row) => ({
    id: rowInt(row.id),
    nombres: rowStr(row.nombres),
    apellidos: rowStr(row.apellidos),
    rol_asignado: rowStr(row.rol_asignado),
    ya_registrado: rowInt(row.ya_registrado) === 1,
    escuela: rowStr(row.escuela, "—"),
    grado: rowStr(row.grado, "—"),
  }));
};

export type AddWhitelistResult =
  | { ok: true }
  | { ok: false; reason: "duplicate_pending" | "already_registered" | "db_error" };

export const addWhitelistEntry = async (input: {
  nombres: string;
  apellidos: string;
  rol_asignado: "estudiante" | "profesor" | "admin";
  id_escuela?: number | null;
  id_gradoactual?: number | null;
}): Promise<AddWhitelistResult> => {
  const nombres = input.nombres.trim();
  const apellidos = input.apellidos.trim();
  if (!nombres || !apellidos) {
    return { ok: false, reason: "db_error" };
  }

  await ensureMoaSchema();
  const client = getDbClient();

  const existing = await client.execute({
    sql: `SELECT COUNT(*) AS total, MAX(ya_registrado) AS registered
          FROM lista_blanca
          WHERE lower(trim(nombres)) = lower(trim(?))
            AND lower(trim(apellidos)) = lower(trim(?))`,
    args: [nombres, apellidos],
  });
  const total = rowInt(existing.rows[0]?.total);
  if (total > 0) {
    if (rowInt(existing.rows[0]?.registered) > 0) {
      return { ok: false, reason: "already_registered" };
    }
    return { ok: false, reason: "duplicate_pending" };
  }

  try {
    await client.execute({
      sql: `INSERT INTO lista_blanca
            (id_escuela, nombres, apellidos, rol_asignado, id_gradoactual, ya_registrado)
            VALUES (?, ?, ?, ?, ?, 0)`,
      args: [
        input.id_escuela ?? 1,
        nombres,
        apellidos,
        input.rol_asignado,
        input.id_gradoactual ?? null,
      ],
    });
    return { ok: true };
  } catch (error) {
    console.error("[whitelist] addWhitelistEntry failed:", error);
    return { ok: false, reason: "db_error" };
  }
};

export type DeleteWhitelistResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "already_registered" | "db_error" };

export const deleteWhitelistEntry = async (
  id: number,
): Promise<DeleteWhitelistResult> => {
  await ensureMoaSchema();
  const client = getDbClient();
  const row = await client.execute({
    sql: "SELECT id, ya_registrado FROM lista_blanca WHERE id = ? LIMIT 1",
    args: [id],
  });
  if (row.rows.length === 0) return { ok: false, reason: "not_found" };
  if (rowInt(row.rows[0].ya_registrado) === 1) {
    return { ok: false, reason: "already_registered" };
  }

  try {
    await client.execute({
      sql: "DELETE FROM lista_blanca WHERE id = ?",
      args: [id],
    });
    return { ok: true };
  } catch (error) {
    console.error("[whitelist] deleteWhitelistEntry failed:", error);
    return { ok: false, reason: "db_error" };
  }
};
