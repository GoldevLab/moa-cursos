import {
  MAX_POINTS_PER_LESSON,
  SEGMENT_POINTS,
  type LessonSegment,
} from "./constants";
import { getDbClient, rowInt, rowStr } from "./db";
import { ensureMoaSchema } from "./schema";

const dateOnly = (value: Date) => {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const diffDays = (from: string | null, to: Date) => {
  if (!from) return Number.POSITIVE_INFINITY;
  const prev = new Date(`${from}T00:00:00`);
  const current = new Date(`${dateOnly(to)}T00:00:00`);
  const ms = current.getTime() - prev.getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
};

export type LessonProgressState = {
  presentation_completada: boolean;
  practice_completada: boolean;
  use_completada: boolean;
  puntaje_total: number;
  completada: boolean;
  es_perfecta: boolean;
};

export const normalizeLessonProgress = (raw: {
  presentation_completada?: unknown;
  practice_completada?: unknown;
  use_completada?: unknown;
  puntaje_total?: unknown;
  completada?: unknown;
  es_perfecta?: unknown;
}): LessonProgressState => {
  const presentation_completada = rowInt(raw.presentation_completada) === 1;
  const practice_completada = rowInt(raw.practice_completada) === 1;
  const use_completada = rowInt(raw.use_completada) === 1;
  const puntaje_total = rowInt(raw.puntaje_total);
  const allSegmentsDone =
    presentation_completada && practice_completada && use_completada;
  const completada =
    allSegmentsDone && puntaje_total >= MAX_POINTS_PER_LESSON;
  const es_perfecta =
    completada && puntaje_total === MAX_POINTS_PER_LESSON;

  return {
    presentation_completada,
    practice_completada,
    use_completada,
    puntaje_total,
    completada,
    es_perfecta,
  };
};

export const reconcileLessonProgressInDb = async (
  idEstudiante: number,
  idLeccion: number,
) => {
  await ensureMoaSchema();
  const client = getDbClient();
  const res = await client.execute({
    sql: `SELECT presentation_completada, practice_completada, use_completada,
                 puntaje_total, completada, es_perfecta
          FROM progreso_leccion
          WHERE id_estudiante = ? AND id_leccion = ? LIMIT 1`,
    args: [idEstudiante, idLeccion],
  });
  const row = res.rows[0];
  if (!row) return null;

  const normalized = normalizeLessonProgress(row);
  const storedCompletada = rowInt(row.completada) === 1;
  const storedPerfecta = rowInt(row.es_perfecta) === 1;

  if (
    storedCompletada === normalized.completada &&
    storedPerfecta === normalized.es_perfecta
  ) {
    return normalized;
  }

  await client.execute({
    sql: `UPDATE progreso_leccion
          SET completada = ?, es_perfecta = ?
          WHERE id_estudiante = ? AND id_leccion = ?`,
    args: [
      normalized.completada ? 1 : 0,
      normalized.es_perfecta ? 1 : 0,
      idEstudiante,
      idLeccion,
    ],
  });

  return normalized;
};

export const getEstudianteByUsuarioId = async (idUsuario: number) => {
  await ensureMoaSchema();
  const client = getDbClient();
  const res = await client.execute({
    sql: `SELECT e.*, g.nombre AS grado_nombre, s.nombre AS escuela_nombre
          FROM estudiante e
          JOIN grado g ON g.id_grado = e.id_gradoactual
          JOIN escuela s ON s.id_escuela = e.id_escuela
          WHERE e.id_usuario = ? LIMIT 1`,
    args: [idUsuario],
  });
  const row = res.rows[0];
  if (!row) return null;
  return {
    id_estudiante: rowInt(row.id_estudiante),
    id_usuario: rowInt(row.id_usuario),
    id_escuela: rowInt(row.id_escuela),
    id_gradoactual: rowInt(row.id_gradoactual),
    racha_actual: rowInt(row.racha_actual),
    mejor_racha: rowInt(row.mejor_racha),
    ultima_actividad: row.ultima_actividad
      ? rowStr(row.ultima_actividad)
      : null,
    puntos_totales: rowInt(row.puntos_totales),
    trofeo_lapso1: rowInt(row.trofeo_lapso1),
    trofeo_lapso2: rowInt(row.trofeo_lapso2),
    trofeo_lapso3: rowInt(row.trofeo_lapso3),
    grado_nombre: rowStr(row.grado_nombre),
    escuela_nombre: rowStr(row.escuela_nombre),
  };
};

export const getStudentDashboard = async (idEstudiante: number) => {
  await ensureMoaSchema();
  const client = getDbClient();

  const estudiante = await client.execute({
    sql: `SELECT id_gradoactual, puntos_totales, racha_actual, mejor_racha
          FROM estudiante WHERE id_estudiante = ? LIMIT 1`,
    args: [idEstudiante],
  });
  const estRow = estudiante.rows[0];
  if (!estRow) return null;

  const idGrado = rowInt(estRow.id_gradoactual);

  const competencias = await client.execute({
    sql: `SELECT c.id_competencia, c.titulo, c.orden, c.lapso,
                 COUNT(l.id_leccion) AS total_lecciones,
                 SUM(CASE WHEN pl.completada = 1 THEN 1 ELSE 0 END) AS lecciones_completadas,
                 SUM(COALESCE(pl.puntaje_total, 0)) AS puntos_competencia
          FROM competencia c
          JOIN leccion l ON l.id_competencia = c.id_competencia
          LEFT JOIN progreso_leccion pl
            ON pl.id_leccion = l.id_leccion AND pl.id_estudiante = ?
          WHERE c.id_grado = ?
          GROUP BY c.id_competencia
          ORDER BY c.orden`,
    args: [idEstudiante, idGrado],
  });

  const competenciaList = competencias.rows.map((row) => {
      const total = rowInt(row.total_lecciones);
      const done = rowInt(row.lecciones_completadas);
      return {
        id_competencia: rowInt(row.id_competencia),
        titulo: rowStr(row.titulo),
        orden: rowInt(row.orden),
        lapso: rowInt(row.lapso),
        total_lecciones: total,
        lecciones_completadas: done,
        completada: total > 0 && done >= total,
        puntos_competencia: rowInt(row.puntos_competencia),
        desbloqueada: false,
      };
    });

  for (let i = 0; i < competenciaList.length; i++) {
    competenciaList[i].desbloqueada =
      i === 0 || competenciaList[i - 1].completada;
  }

  const totalLecciones = competenciaList.reduce(
    (sum, c) => sum + c.total_lecciones,
    0,
  );
  const leccionesCompletadas = competenciaList.reduce(
    (sum, c) => sum + c.lecciones_completadas,
    0,
  );

  return {
    puntos_totales: rowInt(estRow.puntos_totales),
    racha_actual: rowInt(estRow.racha_actual),
    mejor_racha: rowInt(estRow.mejor_racha),
    total_lecciones: totalLecciones,
    lecciones_completadas: leccionesCompletadas,
    competencias: competenciaList,
  };
};

export const getLeccionesForCompetencia = async (
  idEstudiante: number,
  idCompetencia: number,
) => {
  await ensureMoaSchema();
  const client = getDbClient();
  const res = await client.execute({
    sql: `SELECT l.id_leccion, l.titulo, l.orden,
                 COALESCE(pl.puntaje_total, 0) AS puntaje_total,
                 COALESCE(pl.completada, 0) AS completada,
                 COALESCE(pl.presentation_completada, 0) AS presentation_completada,
                 COALESCE(pl.practice_completada, 0) AS practice_completada,
                 COALESCE(pl.use_completada, 0) AS use_completada
          FROM leccion l
          LEFT JOIN progreso_leccion pl
            ON pl.id_leccion = l.id_leccion AND pl.id_estudiante = ?
          WHERE l.id_competencia = ?
          ORDER BY l.orden`,
    args: [idEstudiante, idCompetencia],
  });

  return res.rows.map((row) => ({
    id_leccion: rowInt(row.id_leccion),
    titulo: rowStr(row.titulo),
    orden: rowInt(row.orden),
    puntaje_total: rowInt(row.puntaje_total),
    completada: rowInt(row.completada) === 1,
    presentation_completada: rowInt(row.presentation_completada) === 1,
    practice_completada: rowInt(row.practice_completada) === 1,
    use_completada: rowInt(row.use_completada) === 1,
  }));
};

export const isCompetenciaUnlocked = async (
  idEstudiante: number,
  idCompetencia: number,
) => {
  await ensureMoaSchema();
  const client = getDbClient();

  const compRes = await client.execute({
    sql: `SELECT c.orden, c.id_grado FROM competencia c WHERE c.id_competencia = ? LIMIT 1`,
    args: [idCompetencia],
  });
  const comp = compRes.rows[0];
  if (!comp) return false;

  const orden = rowInt(comp.orden);
  if (orden <= 1) return true;

  const prevRes = await client.execute({
    sql: `SELECT c.id_competencia,
                 COUNT(l.id_leccion) AS total,
                 SUM(CASE WHEN pl.completada = 1 THEN 1 ELSE 0 END) AS done
          FROM competencia c
          JOIN leccion l ON l.id_competencia = c.id_competencia
          LEFT JOIN progreso_leccion pl
            ON pl.id_leccion = l.id_leccion AND pl.id_estudiante = ?
          WHERE c.id_grado = ? AND c.orden = ?
          GROUP BY c.id_competencia`,
    args: [idEstudiante, rowInt(comp.id_grado), orden - 1],
  });
  const prev = prevRes.rows[0];
  if (!prev) return true;

  const total = rowInt(prev.total);
  const done = rowInt(prev.done);
  return total > 0 && done >= total;
};

export const isLessonUnlocked = async (
  idEstudiante: number,
  idLeccion: number,
) => {
  await ensureMoaSchema();
  const client = getDbClient();

  const lessonRes = await client.execute({
    sql: `SELECT l.orden, l.id_competencia FROM leccion l WHERE l.id_leccion = ? LIMIT 1`,
    args: [idLeccion],
  });
  const lesson = lessonRes.rows[0];
  if (!lesson) return false;

  const idCompetencia = rowInt(lesson.id_competencia);
  const compUnlocked = await isCompetenciaUnlocked(idEstudiante, idCompetencia);
  if (!compUnlocked) return false;

  const orden = rowInt(lesson.orden);
  if (orden <= 1) return true;

  const prevRes = await client.execute({
    sql: `SELECT COALESCE(pl.completada, 0) AS completada
          FROM leccion l
          LEFT JOIN progreso_leccion pl
            ON pl.id_leccion = l.id_leccion AND pl.id_estudiante = ?
          WHERE l.id_competencia = ? AND l.orden = ?
          LIMIT 1`,
    args: [idEstudiante, rowInt(lesson.id_competencia), orden - 1],
  });

  return rowInt(prevRes.rows[0]?.completada) === 1;
};

export const getContinueLesson = async (idEstudiante: number) => {
  const dashboard = await getStudentDashboard(idEstudiante);
  if (!dashboard) return null;

  for (const comp of dashboard.competencias) {
    if (!comp.desbloqueada) continue;

    const lecciones = await getLeccionesForCompetencia(
      idEstudiante,
      comp.id_competencia,
    );

    for (let i = 0; i < lecciones.length; i++) {
      const lesson = lecciones[i];
      if (lesson.completada) continue;

      const prevDone = i === 0 || lecciones[i - 1]?.completada;
      if (!prevDone) continue;

      return {
        id_leccion: lesson.id_leccion,
        titulo: lesson.titulo,
        competencia: comp.titulo,
        id_competencia: comp.id_competencia,
        puntaje_total: lesson.puntaje_total,
      };
    }
  }

  return null;
};

const segmentScoreFor = (
  segment: LessonSegment,
  completed: boolean,
  score: number,
) => {
  if (!completed) return 0;
  const max = SEGMENT_POINTS[segment];
  return Math.max(0, Math.min(max, Math.round(score)));
};

export const saveSegmentProgress = async (input: {
  idEstudiante: number;
  idLeccion: number;
  segment: LessonSegment;
  score: number;
}) => {
  await ensureMoaSchema();
  const client = getDbClient();
  const now = new Date();
  const maxSegment = SEGMENT_POINTS[input.segment];
  const segmentScore = Math.max(0, Math.min(maxSegment, Math.round(input.score)));

  const existing = await client.execute({
    sql: `SELECT presentation_completada, practice_completada, use_completada,
                 puntaje_total, intentos, fecha_completado
          FROM progreso_leccion
          WHERE id_estudiante = ? AND id_leccion = ? LIMIT 1`,
    args: [input.idEstudiante, input.idLeccion],
  });

  const row = existing.rows[0];
  const segmentPassed = segmentScore > 0;
  const presentationDone =
    (input.segment === "presentation" && segmentPassed) ||
    rowInt(row?.presentation_completada) === 1;
  const practiceDone =
    (input.segment === "practice" && segmentPassed) ||
    rowInt(row?.practice_completada) === 1;
  const useDone =
    (input.segment === "use" && segmentPassed) ||
    rowInt(row?.use_completada) === 1;

  const pScore =
    input.segment === "presentation"
      ? segmentScore
      : segmentScoreFor(
          "presentation",
          rowInt(row?.presentation_completada) === 1,
          SEGMENT_POINTS.presentation,
        );
  const prScore =
    input.segment === "practice"
      ? segmentScore
      : segmentScoreFor(
          "practice",
          rowInt(row?.practice_completada) === 1,
          SEGMENT_POINTS.practice,
        );
  const uScore =
    input.segment === "use"
      ? segmentScore
      : segmentScoreFor("use", rowInt(row?.use_completada) === 1, SEGMENT_POINTS.use);

  const rawTotal = pScore + prScore + uScore;
  const previousTotal = row ? rowInt(row.puntaje_total) : 0;
  const puntajeTotal = Math.min(
    MAX_POINTS_PER_LESSON,
    Math.max(previousTotal, rawTotal),
  );

  const completada = puntajeTotal >= MAX_POINTS_PER_LESSON ? 1 : 0;
  const esPerfecta = puntajeTotal === MAX_POINTS_PER_LESSON ? 1 : 0;
  const fechaCompletado =
    completada && row?.fecha_completado
      ? rowStr(row.fecha_completado)
      : completada
        ? now.toISOString()
        : null;

  await client.execute({
    sql: `INSERT INTO progreso_leccion
          (id_estudiante, id_leccion, presentation_completada, practice_completada,
           use_completada, puntaje_total, es_perfecta, fecha_ultimo_intento,
           fecha_completado, completada, intentos)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
          ON CONFLICT(id_estudiante, id_leccion) DO UPDATE SET
            presentation_completada = MAX(presentation_completada, excluded.presentation_completada),
            practice_completada = MAX(practice_completada, excluded.practice_completada),
            use_completada = MAX(use_completada, excluded.use_completada),
            puntaje_total = MAX(puntaje_total, excluded.puntaje_total),
            es_perfecta = CASE
              WHEN MAX(puntaje_total, excluded.puntaje_total) = ${MAX_POINTS_PER_LESSON}
                AND MAX(presentation_completada, excluded.presentation_completada) = 1
                AND MAX(practice_completada, excluded.practice_completada) = 1
                AND MAX(use_completada, excluded.use_completada) = 1
              THEN 1
              ELSE 0
            END,
            fecha_ultimo_intento = excluded.fecha_ultimo_intento,
            fecha_completado = CASE
              WHEN MAX(puntaje_total, excluded.puntaje_total) >= ${MAX_POINTS_PER_LESSON}
                AND MAX(presentation_completada, excluded.presentation_completada) = 1
                AND MAX(practice_completada, excluded.practice_completada) = 1
                AND MAX(use_completada, excluded.use_completada) = 1
              THEN COALESCE(fecha_completado, excluded.fecha_completado)
              ELSE NULL
            END,
            completada = CASE
              WHEN MAX(puntaje_total, excluded.puntaje_total) >= ${MAX_POINTS_PER_LESSON}
                AND MAX(presentation_completada, excluded.presentation_completada) = 1
                AND MAX(practice_completada, excluded.practice_completada) = 1
                AND MAX(use_completada, excluded.use_completada) = 1
              THEN 1
              ELSE 0
            END,
            intentos = intentos + 1`,
    args: [
      input.idEstudiante,
      input.idLeccion,
      presentationDone ? 1 : 0,
      practiceDone ? 1 : 0,
      useDone ? 1 : 0,
      puntajeTotal,
      esPerfecta,
      now.toISOString(),
      fechaCompletado,
      completada,
    ],
  });

  await recalculateStudentTotals(input.idEstudiante, now);
  await awardLapsoTrophies(input.idEstudiante);

  return {
    puntaje_total: puntajeTotal,
    completada: completada === 1,
    es_perfecta: esPerfecta === 1,
  };
};

const awardLapsoTrophies = async (idEstudiante: number) => {
  const client = getDbClient();
  const gradoRes = await client.execute({
    sql: "SELECT id_gradoactual FROM estudiante WHERE id_estudiante = ? LIMIT 1",
    args: [idEstudiante],
  });
  const idGrado = rowInt(gradoRes.rows[0]?.id_gradoactual);
  if (!idGrado) return;

  for (const lapso of [1, 2, 3] as const) {
    const res = await client.execute({
      sql: `SELECT COUNT(*) AS total,
                   SUM(done) AS completed
            FROM (
              SELECT CASE
                WHEN COUNT(l.id_leccion) > 0
                  AND COUNT(l.id_leccion) = SUM(CASE WHEN pl.completada = 1 THEN 1 ELSE 0 END)
                THEN 1 ELSE 0
              END AS done
              FROM competencia c
              JOIN leccion l ON l.id_competencia = c.id_competencia
              LEFT JOIN progreso_leccion pl
                ON pl.id_leccion = l.id_leccion AND pl.id_estudiante = ?
              WHERE c.id_grado = ? AND c.lapso = ?
              GROUP BY c.id_competencia
            )`,
      args: [idEstudiante, idGrado, lapso],
    });
    const total = rowInt(res.rows[0]?.total);
    const completed = rowInt(res.rows[0]?.completed);
    if (total > 0 && completed >= total) {
      await client.execute({
        sql: `UPDATE estudiante SET trofeo_lapso${lapso} = 1 WHERE id_estudiante = ?`,
        args: [idEstudiante],
      });
    }
  }
};

const recalculateStudentTotals = async (
  idEstudiante: number,
  now: Date,
) => {
  const client = getDbClient();

  const sumRes = await client.execute({
    sql: `SELECT COALESCE(SUM(puntaje_total), 0) AS total
          FROM progreso_leccion WHERE id_estudiante = ?`,
    args: [idEstudiante],
  });
  const puntosTotales = rowInt(sumRes.rows[0]?.total);

  const streakRes = await client.execute({
    sql: "SELECT racha_actual, mejor_racha, ultima_actividad FROM estudiante WHERE id_estudiante = ? LIMIT 1",
    args: [idEstudiante],
  });
  const streakRow = streakRes.rows[0];
  const ultima = streakRow?.ultima_actividad
    ? rowStr(streakRow.ultima_actividad)
    : null;
  const diff = diffDays(ultima, now);
  let rachaActual = rowInt(streakRow?.racha_actual);
  let mejorRacha = rowInt(streakRow?.mejor_racha);

  if (ultima === dateOnly(now)) {
    // same day, keep streak
  } else if (diff === 1) {
    rachaActual += 1;
  } else {
    rachaActual = 1;
  }
  mejorRacha = Math.max(mejorRacha, rachaActual);

  await client.execute({
    sql: `UPDATE estudiante
          SET puntos_totales = ?, racha_actual = ?, mejor_racha = ?, ultima_actividad = ?
          WHERE id_estudiante = ?`,
    args: [puntosTotales, rachaActual, mejorRacha, dateOnly(now), idEstudiante],
  });
};

export const listUsuarios = async () => {
  await ensureMoaSchema();
  const client = getDbClient();
  const res = await client.execute({
    sql: `SELECT id_usuario, username, nombres, apellidos, rol, fecha_registro
          FROM usuario ORDER BY fecha_registro DESC`,
    args: [],
  });
  return res.rows.map((row) => ({
    id_usuario: rowInt(row.id_usuario),
    username: rowStr(row.username),
    nombres: rowStr(row.nombres),
    apellidos: rowStr(row.apellidos),
    rol: rowStr(row.rol),
    fecha_registro: rowStr(row.fecha_registro),
  }));
};

export const listEscuelas = async () => {
  await ensureMoaSchema();
  const client = getDbClient();
  const res = await client.execute({
    sql: "SELECT id_escuela, nombre, ciudad, direccion FROM escuela ORDER BY nombre",
    args: [],
  });
  return res.rows.map((row) => ({
    id_escuela: rowInt(row.id_escuela),
    nombre: rowStr(row.nombre),
    ciudad: rowStr(row.ciudad),
    direccion: rowStr(row.direccion),
  }));
};

export const createEscuela = async (input: {
  nombre: string;
  ciudad: string;
  direccion: string;
}) => {
  await ensureMoaSchema();
  const client = getDbClient();
  await client.execute({
    sql: "INSERT INTO escuela (nombre, ciudad, direccion) VALUES (?, ?, ?)",
    args: [input.nombre.trim(), input.ciudad.trim(), input.direccion.trim()],
  });
};

export const updateEscuela = async (
  idEscuela: number,
  input: { nombre: string; ciudad: string; direccion: string },
) => {
  await ensureMoaSchema();
  const client = getDbClient();
  await client.execute({
    sql: `UPDATE escuela SET nombre = ?, ciudad = ?, direccion = ?
          WHERE id_escuela = ?`,
    args: [
      input.nombre.trim(),
      input.ciudad.trim(),
      input.direccion.trim(),
      idEscuela,
    ],
  });
};

export const deleteEscuela = async (
  idEscuela: number,
): Promise<{ ok: true } | { ok: false; reason: "in_use" | "not_found" }> => {
  await ensureMoaSchema();
  const client = getDbClient();

  const exists = await client.execute({
    sql: "SELECT id_escuela FROM escuela WHERE id_escuela = ? LIMIT 1",
    args: [idEscuela],
  });
  if (!exists.rows[0]) return { ok: false, reason: "not_found" };

  const usage = await client.execute({
    sql: `SELECT
            (SELECT COUNT(*) FROM estudiante WHERE id_escuela = ?) AS estudiantes,
            (SELECT COUNT(*) FROM lista_blanca WHERE id_escuela = ?) AS invitaciones,
            (SELECT COUNT(*) FROM administrador WHERE id_escuela = ?) AS admins`,
    args: [idEscuela, idEscuela, idEscuela],
  });
  const row = usage.rows[0];
  const total =
    rowInt(row?.estudiantes) + rowInt(row?.invitaciones) + rowInt(row?.admins);
  if (total > 0) return { ok: false, reason: "in_use" };

  await client.execute({
    sql: "DELETE FROM escuela WHERE id_escuela = ?",
    args: [idEscuela],
  });
  return { ok: true };
};

export const getProfessorStats = async () => {
  await ensureMoaSchema();
  const client = getDbClient();

  const overview = await client.execute({
    sql: `SELECT
            (SELECT COUNT(*) FROM estudiante) AS total_estudiantes,
            (SELECT COUNT(*) FROM leccion) AS total_lecciones,
            (SELECT COUNT(*) FROM progreso_leccion WHERE completada = 1) AS lecciones_completadas,
            (SELECT COUNT(DISTINCT id_estudiante) FROM progreso_leccion) AS estudiantes_activos`,
    args: [],
  });
  const ov = overview.rows[0];

  const topStudents = await client.execute({
    sql: `SELECT e.id_estudiante, u.nombres, u.apellidos, u.username,
                 e.puntos_totales, e.racha_actual, g.nombre AS grado
          FROM estudiante e
          JOIN usuario u ON u.id_usuario = e.id_usuario
          JOIN grado g ON g.id_grado = e.id_gradoactual
          ORDER BY e.puntos_totales DESC
          LIMIT 8`,
    args: [],
  });

  const byCompetencia = await client.execute({
    sql: `SELECT c.id_competencia, c.titulo, c.lapso,
                 COUNT(l.id_leccion) AS total_lecciones,
                 SUM(CASE WHEN pl.completada = 1 THEN 1 ELSE 0 END) AS completadas,
                 COUNT(DISTINCT pl.id_estudiante) AS estudiantes_con_progreso
          FROM competencia c
          JOIN leccion l ON l.id_competencia = c.id_competencia
          LEFT JOIN progreso_leccion pl ON pl.id_leccion = l.id_leccion
          GROUP BY c.id_competencia
          ORDER BY c.orden`,
    args: [],
  });

  const recentActivity = await client.execute({
    sql: `SELECT u.nombres, u.apellidos, l.titulo AS leccion,
                 pl.puntaje_total, pl.fecha_ultimo_intento
          FROM progreso_leccion pl
          JOIN estudiante e ON e.id_estudiante = pl.id_estudiante
          JOIN usuario u ON u.id_usuario = e.id_usuario
          JOIN leccion l ON l.id_leccion = pl.id_leccion
          ORDER BY pl.fecha_ultimo_intento DESC
          LIMIT 10`,
    args: [],
  });

  const totalEstudiantes = rowInt(ov?.total_estudiantes);
  const totalLecciones = rowInt(ov?.total_lecciones);
  const leccionesCompletadas = rowInt(ov?.lecciones_completadas);
  const maxPossible = totalLecciones * Math.max(totalEstudiantes, 1);

  return {
    total_estudiantes: totalEstudiantes,
    total_lecciones: totalLecciones,
    lecciones_completadas: leccionesCompletadas,
    estudiantes_activos: rowInt(ov?.estudiantes_activos),
    tasa_completado:
      maxPossible > 0
        ? Math.round((leccionesCompletadas / maxPossible) * 100)
        : 0,
    top_students: topStudents.rows.map((row) => ({
      id_estudiante: rowInt(row.id_estudiante),
      nombres: rowStr(row.nombres),
      apellidos: rowStr(row.apellidos),
      username: rowStr(row.username),
      puntos_totales: rowInt(row.puntos_totales),
      racha_actual: rowInt(row.racha_actual),
      grado: rowStr(row.grado),
    })),
    competencias: byCompetencia.rows.map((row) => {
      const total = rowInt(row.total_lecciones);
      const done = rowInt(row.completadas);
      const estudiantes = rowInt(row.estudiantes_con_progreso);
      const maxComp = total * Math.max(estudiantes, 1);
      return {
        id_competencia: rowInt(row.id_competencia),
        titulo: rowStr(row.titulo),
        lapso: rowInt(row.lapso),
        total_lecciones: total,
        completadas: done,
        tasa: maxComp > 0 ? Math.round((done / maxComp) * 100) : 0,
      };
    }),
    actividad_reciente: recentActivity.rows.map((row) => ({
      nombres: rowStr(row.nombres),
      apellidos: rowStr(row.apellidos),
      leccion: rowStr(row.leccion),
      puntaje: rowInt(row.puntaje_total),
      fecha: rowStr(row.fecha_ultimo_intento),
    })),
  };
};

export const listStudentsForProfessor = async (idGrado?: number) => {
  await ensureMoaSchema();
  const client = getDbClient();
  const res = await client.execute({
    sql: `SELECT e.id_estudiante, e.id_gradoactual, u.nombres, u.apellidos, u.username,
                 g.nombre AS grado, s.nombre AS escuela,
                 e.puntos_totales, e.racha_actual, e.mejor_racha,
                 e.ultima_actividad, e.trofeo_lapso1, e.trofeo_lapso2, e.trofeo_lapso3,
                 (SELECT COUNT(*) FROM progreso_leccion pl
                  WHERE pl.id_estudiante = e.id_estudiante AND pl.completada = 1) AS lecciones_completadas,
                 (SELECT COUNT(*) FROM leccion) AS total_lecciones
          FROM estudiante e
          JOIN usuario u ON u.id_usuario = e.id_usuario
          JOIN grado g ON g.id_grado = e.id_gradoactual
          JOIN escuela s ON s.id_escuela = e.id_escuela
          ${idGrado ? "WHERE e.id_gradoactual = ?" : ""}
          ORDER BY e.puntos_totales DESC`,
    args: idGrado ? [idGrado] : [],
  });

  return res.rows.map((row) => ({
    id_estudiante: rowInt(row.id_estudiante),
    id_grado: rowInt(row.id_gradoactual),
    nombres: rowStr(row.nombres),
    apellidos: rowStr(row.apellidos),
    username: rowStr(row.username),
    grado: rowStr(row.grado),
    escuela: rowStr(row.escuela),
    puntos_totales: rowInt(row.puntos_totales),
    racha_actual: rowInt(row.racha_actual),
    mejor_racha: rowInt(row.mejor_racha),
    ultima_actividad: row.ultima_actividad ? rowStr(row.ultima_actividad) : null,
    lecciones_completadas: rowInt(row.lecciones_completadas),
    total_lecciones: rowInt(row.total_lecciones),
    trofeos:
      rowInt(row.trofeo_lapso1) + rowInt(row.trofeo_lapso2) + rowInt(row.trofeo_lapso3),
  }));
};

export const getStudentProgressDetail = async (idEstudiante: number) => {
  await ensureMoaSchema();
  const client = getDbClient();

  const studentRes = await client.execute({
    sql: `SELECT e.id_estudiante, u.nombres, u.apellidos, u.username,
                 g.nombre AS grado, s.nombre AS escuela,
                 e.puntos_totales, e.racha_actual, e.mejor_racha, e.ultima_actividad,
                 e.trofeo_lapso1, e.trofeo_lapso2, e.trofeo_lapso3, e.id_gradoactual
          FROM estudiante e
          JOIN usuario u ON u.id_usuario = e.id_usuario
          JOIN grado g ON g.id_grado = e.id_gradoactual
          JOIN escuela s ON s.id_escuela = e.id_escuela
          WHERE e.id_estudiante = ? LIMIT 1`,
    args: [idEstudiante],
  });
  const student = studentRes.rows[0];
  if (!student) return null;

  const competencias = await client.execute({
    sql: `SELECT c.id_competencia, c.titulo, c.lapso, c.orden,
                 COUNT(l.id_leccion) AS total,
                 SUM(CASE WHEN pl.completada = 1 THEN 1 ELSE 0 END) AS completadas,
                 SUM(COALESCE(pl.puntaje_total, 0)) AS puntos
          FROM competencia c
          JOIN leccion l ON l.id_competencia = c.id_competencia
          LEFT JOIN progreso_leccion pl
            ON pl.id_leccion = l.id_leccion AND pl.id_estudiante = ?
          WHERE c.id_grado = ?
          GROUP BY c.id_competencia
          ORDER BY c.orden`,
    args: [idEstudiante, rowInt(student.id_gradoactual)],
  });

  const recent = await client.execute({
    sql: `SELECT l.titulo, pl.puntaje_total, pl.completada, pl.fecha_ultimo_intento
          FROM progreso_leccion pl
          JOIN leccion l ON l.id_leccion = pl.id_leccion
          WHERE pl.id_estudiante = ?
          ORDER BY pl.fecha_ultimo_intento DESC
          LIMIT 12`,
    args: [idEstudiante],
  });

  return {
    id_estudiante: idEstudiante,
    nombres: rowStr(student.nombres),
    apellidos: rowStr(student.apellidos),
    username: rowStr(student.username),
    grado: rowStr(student.grado),
    escuela: rowStr(student.escuela),
    puntos_totales: rowInt(student.puntos_totales),
    racha_actual: rowInt(student.racha_actual),
    mejor_racha: rowInt(student.mejor_racha),
    ultima_actividad: student.ultima_actividad
      ? rowStr(student.ultima_actividad)
      : null,
    trofeos: {
      lapso1: rowInt(student.trofeo_lapso1) === 1,
      lapso2: rowInt(student.trofeo_lapso2) === 1,
      lapso3: rowInt(student.trofeo_lapso3) === 1,
    },
    competencias: competencias.rows.map((row) => ({
      id_competencia: rowInt(row.id_competencia),
      titulo: rowStr(row.titulo),
      lapso: rowInt(row.lapso),
      total: rowInt(row.total),
      completadas: rowInt(row.completadas),
      puntos: rowInt(row.puntos),
    })),
    actividad: recent.rows.map((row) => ({
      leccion: rowStr(row.titulo),
      puntaje: rowInt(row.puntaje_total),
      completada: rowInt(row.completada) === 1,
      fecha: rowStr(row.fecha_ultimo_intento),
    })),
  };
};

export const getNextLessonInfo = async (idLeccion: number) => {
  await ensureMoaSchema();
  const client = getDbClient();
  const res = await client.execute({
    sql: `SELECT l2.id_leccion, l2.titulo, c2.titulo AS competencia
          FROM leccion l1
          JOIN leccion l2
            ON l2.id_competencia = l1.id_competencia AND l2.orden = l1.orden + 1
          JOIN competencia c2 ON c2.id_competencia = l2.id_competencia
          WHERE l1.id_leccion = ?
          LIMIT 1`,
    args: [idLeccion],
  });
  const row = res.rows[0];
  if (!row) return null;
  return {
    id_leccion: rowInt(row.id_leccion),
    titulo: rowStr(row.titulo),
    competencia: rowStr(row.competencia),
  };
};

export const buildStudentsCsv = async (idGrado?: number) => {
  const students = await listStudentsForProfessor(idGrado);
  const header =
    "nombre,apellidos,usuario,escuela,grado,puntos,racha,lecciones_completadas,trofeos,ultima_actividad";
  const rows = students.map((s) =>
    [
      csvCell(s.nombres),
      csvCell(s.apellidos),
      csvCell(s.username),
      csvCell(s.escuela),
      csvCell(s.grado),
      s.puntos_totales,
      s.racha_actual,
      s.lecciones_completadas,
      s.trofeos,
      csvCell(s.ultima_actividad ?? ""),
    ].join(","),
  );
  return [header, ...rows].join("\n");
};

const csvCell = (value: string) => `"${value.replace(/"/g, '""')}"`;

export const listGrados = async () => {
  await ensureMoaSchema();
  const client = getDbClient();
  const res = await client.execute({
    sql: "SELECT id_grado, nombre FROM grado ORDER BY id_grado",
    args: [],
  });
  return res.rows.map((row) => ({
    id_grado: rowInt(row.id_grado),
    nombre: rowStr(row.nombre),
  }));
};
