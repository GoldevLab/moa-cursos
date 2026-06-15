import { getDbClient, isSchemaEnsured, markSchemaAsEnsured } from "./db";
import { hashPassword } from "./auth";
import { repairAllLessonContent, seedAllLessonContent } from "./lesson-content";

const TABLE_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS usuario (
    id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    nombres TEXT NOT NULL,
    apellidos TEXT NOT NULL,
    rol TEXT NOT NULL CHECK (rol IN ('estudiante','profesor','admin')),
    fecha_registro TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS escuela (
    id_escuela INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    ciudad TEXT NOT NULL,
    direccion TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS grado (
    id_grado INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS competencia (
    id_competencia INTEGER PRIMARY KEY AUTOINCREMENT,
    id_grado INTEGER NOT NULL,
    titulo TEXT NOT NULL,
    orden INTEGER NOT NULL,
    lapso INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (id_grado) REFERENCES grado(id_grado)
  )`,
  `CREATE TABLE IF NOT EXISTS leccion (
    id_leccion INTEGER PRIMARY KEY AUTOINCREMENT,
    id_competencia INTEGER NOT NULL,
    titulo TEXT NOT NULL,
    orden INTEGER NOT NULL,
    FOREIGN KEY (id_competencia) REFERENCES competencia(id_competencia)
  )`,
  `CREATE TABLE IF NOT EXISTS estudiante (
    id_estudiante INTEGER PRIMARY KEY AUTOINCREMENT,
    id_usuario INTEGER NOT NULL UNIQUE,
    id_escuela INTEGER NOT NULL,
    id_gradoactual INTEGER NOT NULL,
    racha_actual INTEGER NOT NULL DEFAULT 0,
    mejor_racha INTEGER NOT NULL DEFAULT 0,
    ultima_actividad TEXT,
    puntos_totales INTEGER NOT NULL DEFAULT 0,
    trofeo_lapso1 INTEGER NOT NULL DEFAULT 0,
    trofeo_lapso2 INTEGER NOT NULL DEFAULT 0,
    trofeo_lapso3 INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario),
    FOREIGN KEY (id_escuela) REFERENCES escuela(id_escuela),
    FOREIGN KEY (id_gradoactual) REFERENCES grado(id_grado)
  )`,
  `CREATE TABLE IF NOT EXISTS administrador (
    id_admin INTEGER PRIMARY KEY AUTOINCREMENT,
    id_usuario INTEGER NOT NULL UNIQUE,
    id_escuela INTEGER,
    id_gradoactual INTEGER,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario),
    FOREIGN KEY (id_escuela) REFERENCES escuela(id_escuela),
    FOREIGN KEY (id_gradoactual) REFERENCES grado(id_grado)
  )`,
  `CREATE TABLE IF NOT EXISTS lista_blanca (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_escuela INTEGER,
    nombres TEXT NOT NULL,
    apellidos TEXT NOT NULL,
    rol_asignado TEXT NOT NULL CHECK (rol_asignado IN ('estudiante','profesor','admin')),
    id_gradoactual INTEGER,
    ya_registrado INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (id_escuela) REFERENCES escuela(id_escuela),
    FOREIGN KEY (id_gradoactual) REFERENCES grado(id_grado)
  )`,
  `CREATE TABLE IF NOT EXISTS progreso_leccion (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_estudiante INTEGER NOT NULL,
    id_leccion INTEGER NOT NULL,
    presentation_completada INTEGER NOT NULL DEFAULT 0,
    practice_completada INTEGER NOT NULL DEFAULT 0,
    use_completada INTEGER NOT NULL DEFAULT 0,
    puntaje_total INTEGER NOT NULL DEFAULT 0,
    es_perfecta INTEGER NOT NULL DEFAULT 0,
    fecha_ultimo_intento TEXT NOT NULL DEFAULT (datetime('now')),
    fecha_completado TEXT,
    completada INTEGER NOT NULL DEFAULT 0,
    intentos INTEGER NOT NULL DEFAULT 0,
    UNIQUE (id_estudiante, id_leccion),
    FOREIGN KEY (id_estudiante) REFERENCES estudiante(id_estudiante),
    FOREIGN KEY (id_leccion) REFERENCES leccion(id_leccion)
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    last_seen TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS contenido_leccion (
    id_leccion INTEGER PRIMARY KEY,
    summary TEXT NOT NULL,
    vocabulary_json TEXT NOT NULL,
    quiz_prompt TEXT NOT NULL,
    quiz_options_json TEXT NOT NULL,
    quiz_correct_index INTEGER NOT NULL DEFAULT 0,
    practice_prompt TEXT NOT NULL,
    practice_options_json TEXT NOT NULL,
    practice_correct_index INTEGER NOT NULL DEFAULT 0,
    use_prompt TEXT NOT NULL,
    use_options_json TEXT NOT NULL,
    use_correct_index INTEGER NOT NULL DEFAULT 0,
    actualizado_en TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (id_leccion) REFERENCES leccion(id_leccion)
  )`,
];

const seedGrados = async () => {
  const client = getDbClient();
  const grados = ["primero", "segundo", "tercero"];
  for (let i = 0; i < grados.length; i++) {
    await client.execute({
      sql: `INSERT OR IGNORE INTO grado (id_grado, nombre) VALUES (?, ?)`,
      args: [i + 1, grados[i]],
    });
  }
};

const seedCompetencias = async () => {
  const client = getDbClient();
  const lapsos = [
    { start: 1, count: 5, lapso: 1 },
    { start: 6, count: 6, lapso: 2 },
    { start: 12, count: 5, lapso: 3 },
  ];

  for (const block of lapsos) {
    for (let i = 0; i < block.count; i++) {
      const orden = block.start + i;
      await client.execute({
        sql: `INSERT OR IGNORE INTO competencia (id_competencia, id_grado, titulo, orden, lapso)
              VALUES (?, 1, ?, ?, ?)`,
        args: [orden, `Competencia ${orden}`, orden, block.lapso],
      });
    }
  }
};

const seedLecciones = async () => {
  const client = getDbClient();
  const comps = await client.execute(
    "SELECT id_competencia FROM competencia ORDER BY orden",
  );

  for (const row of comps.rows) {
    const idCompetencia = Number(row.id_competencia);
    for (let orden = 1; orden <= 8; orden++) {
      const idLeccion = (idCompetencia - 1) * 8 + orden;
      await client.execute({
        sql: `INSERT OR IGNORE INTO leccion (id_leccion, id_competencia, titulo, orden)
              VALUES (?, ?, ?, ?)`,
        args: [idLeccion, idCompetencia, `Lección ${orden}`, orden],
      });
    }
  }
};

const seedEscuelaYWhitelist = async () => {
  const client = getDbClient();
  await client.execute({
    sql: `INSERT OR IGNORE INTO escuela (id_escuela, nombre, ciudad, direccion)
          VALUES (1, 'MOA Academy Demo', 'Caracas', 'Av. Principal 123')`,
    args: [],
  });

  const whitelist = [
    {
      nombres: "Ana",
      apellidos: "García",
      rol: "estudiante",
      grado: 1,
    },
    {
      nombres: "Carlos",
      apellidos: "Pérez",
      rol: "profesor",
      grado: 1,
    },
    {
      nombres: "María",
      apellidos: "López",
      rol: "admin",
      grado: null,
    },
  ] as const;

  for (const entry of whitelist) {
    const exists = await client.execute({
      sql: `SELECT id FROM lista_blanca
            WHERE lower(nombres) = lower(?) AND lower(apellidos) = lower(?)
            LIMIT 1`,
      args: [entry.nombres, entry.apellidos],
    });
    if (exists.rows.length > 0) continue;

    await client.execute({
      sql: `INSERT INTO lista_blanca
            (id_escuela, nombres, apellidos, rol_asignado, id_gradoactual, ya_registrado)
            VALUES (1, ?, ?, ?, ?, 0)`,
      args: [entry.nombres, entry.apellidos, entry.rol, entry.grado],
    });
  }
};

/** Usuario admin de desarrollo para probar sin activar cuenta. */
const seedDevAdmin = async () => {
  const client = getDbClient();
  const existing = await client.execute({
    sql: "SELECT id_usuario FROM usuario WHERE username = ? LIMIT 1",
    args: ["admin"],
  });
  if (existing.rows.length > 0) return;

  const { salt, hash } = hashPassword("admin123");
  const password = `${salt}:${hash}`;

  const userRes = await client.execute({
    sql: `INSERT INTO usuario (username, password, nombres, apellidos, rol, fecha_registro)
          VALUES (?, ?, 'María', 'López', 'admin', datetime('now'))`,
    args: ["admin", password],
  });

  const idUsuario = Number(userRes.lastInsertRowid);
  await client.execute({
    sql: `INSERT INTO administrador (id_usuario, id_escuela, id_gradoactual)
          VALUES (?, 1, NULL)`,
    args: [idUsuario],
  });

  await client.execute({
    sql: `UPDATE lista_blanca SET ya_registrado = 1
          WHERE lower(nombres) = 'maría' AND lower(apellidos) = 'lópez'`,
    args: [],
  });
};

const dedupeWhitelistEntries = async () => {
  const client = getDbClient();
  await client.execute({
    sql: `DELETE FROM lista_blanca
          WHERE id NOT IN (
            SELECT MIN(id)
            FROM lista_blanca
            GROUP BY lower(trim(nombres)), lower(trim(apellidos))
          )`,
    args: [],
  });
  await client.execute({
    sql: `CREATE UNIQUE INDEX IF NOT EXISTS idx_lista_blanca_persona
          ON lista_blanca (lower(trim(nombres)), lower(trim(apellidos)))`,
    args: [],
  });
};

export const ensureMoaSchema = async () => {
  if (isSchemaEnsured("moa")) return;

  const client = getDbClient();
  for (const sql of TABLE_STATEMENTS) {
    await client.execute(sql);
  }

  await dedupeWhitelistEntries();

  const seeded = await client.execute({
    sql: "SELECT COUNT(*) AS total FROM leccion",
    args: [],
  });
  let lessonCount = Number(seeded.rows[0]?.total ?? 0);

  if (lessonCount === 0) {
    await seedGrados();
    await seedCompetencias();
    await seedLecciones();
    await seedEscuelaYWhitelist();
    if (process.env.NODE_ENV !== "production") {
      await seedDevAdmin();
    }
    const afterSeed = await client.execute({
      sql: "SELECT COUNT(*) AS total FROM leccion",
      args: [],
    });
    lessonCount = Number(afterSeed.rows[0]?.total ?? 0);
  }

  const contentRes = await client.execute({
    sql: "SELECT COUNT(*) AS total FROM contenido_leccion",
    args: [],
  });
  const contentCount = Number(contentRes.rows[0]?.total ?? 0);

  markSchemaAsEnsured("moa");

  if (contentCount === 0 && lessonCount > 0) {
    await seedAllLessonContent();
  }

  if (lessonCount > 0) {
    await repairAllLessonContent();
  }
};
