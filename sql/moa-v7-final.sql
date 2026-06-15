-- ============================================
-- BASE DE DATOS MOA V7 - ESTRUCTURA FINAL
-- Actualizada con segmentos (presentation, practice, use)
-- y lógica de mejor puntaje (GREATEST)
-- ============================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

-- ============================================
-- TABLAS PRINCIPALES
-- ============================================

-- Tabla usuario (Login)
CREATE TABLE IF NOT EXISTS `usuario` (
  `id_usuario` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `nombres` varchar(100) NOT NULL,
  `apellidos` varchar(100) NOT NULL,
  `rol` enum('estudiante','profesor','admin') NOT NULL,
  `fecha_registro` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Tabla escuela
CREATE TABLE IF NOT EXISTS `escuela` (
  `id_escuela` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `ciudad` varchar(50) NOT NULL,
  `direccion` varchar(200) NOT NULL,
  PRIMARY KEY (`id_escuela`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Tabla grado
CREATE TABLE IF NOT EXISTS `grado` (
  `id_grado` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(20) NOT NULL,
  PRIMARY KEY (`id_grado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Tabla competencia
CREATE TABLE IF NOT EXISTS `competencia` (
  `id_competencia` int(11) NOT NULL AUTO_INCREMENT,
  `id_grado` int(11) NOT NULL,
  `titulo` varchar(100) NOT NULL,
  `orden` int(11) NOT NULL,
  `lapso` int(11) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_competencia`),
  KEY `id_grado` (`id_grado`),
  CONSTRAINT `competencia_ibfk_1` FOREIGN KEY (`id_grado`) REFERENCES `grado` (`id_grado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Tabla leccion
-- NOTA: puntos_totales eliminado - Siempre es 125 (MAX_POINTS_PER_LESSON), se maneja en código
CREATE TABLE IF NOT EXISTS `leccion` (
  `id_leccion` int(11) NOT NULL AUTO_INCREMENT,
  `id_competencia` int(11) NOT NULL,
  `titulo` varchar(100) NOT NULL,
  `orden` int(11) NOT NULL,
  PRIMARY KEY (`id_leccion`),
  KEY `id_competencia` (`id_competencia`),
  CONSTRAINT `leccion_ibfk_1` FOREIGN KEY (`id_competencia`) REFERENCES `competencia` (`id_competencia`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Tabla estudiante (Perfil de estudiante)
-- IMPORTANTE: Contiene racha_actual, mejor_racha, ultima_actividad, puntos_totales
CREATE TABLE IF NOT EXISTS `estudiante` (
  `id_estudiante` int(11) NOT NULL AUTO_INCREMENT,
  `id_usuario` int(11) NOT NULL,
  `id_escuela` int(11) NOT NULL,
  `id_gradoactual` int(11) NOT NULL,
  `racha_actual` int(11) DEFAULT 0,
  `mejor_racha` int(11) DEFAULT 0,
  `ultima_actividad` date DEFAULT NULL,
  `puntos_totales` int(11) DEFAULT 0,
  `trofeo_lapso1` tinyint(1) DEFAULT 0,
  `trofeo_lapso2` tinyint(1) DEFAULT 0,
  `trofeo_lapso3` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id_estudiante`),
  UNIQUE KEY `id_usuario` (`id_usuario`),
  KEY `id_escuela` (`id_escuela`),
  KEY `id_grado_actual` (`id_gradoactual`),
  CONSTRAINT `estudiante_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`),
  CONSTRAINT `estudiante_ibfk_2` FOREIGN KEY (`id_escuela`) REFERENCES `escuela` (`id_escuela`),
  CONSTRAINT `estudiante_ibfk_3` FOREIGN KEY (`id_gradoactual`) REFERENCES `grado` (`id_grado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Tabla administrador (Perfil de profesor/admin)
-- IMPORTANTE: id_gradoactual permite que profesores vean solo su salón (NULL si es super admin)
CREATE TABLE IF NOT EXISTS `administrador` (
  `id_admin` int(11) NOT NULL AUTO_INCREMENT,
  `id_usuario` int(11) NOT NULL,
  `id_escuela` int(11) DEFAULT NULL,
  `id_gradoactual` int(11) DEFAULT NULL,
  PRIMARY KEY (`id_admin`),
  UNIQUE KEY `id_usuario` (`id_usuario`),
  KEY `id_escuela` (`id_escuela`),
  KEY `id_gradoactual` (`id_gradoactual`),
  CONSTRAINT `administrador_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`),
  CONSTRAINT `administrador_ibfk_2` FOREIGN KEY (`id_escuela`) REFERENCES `escuela` (`id_escuela`),
  CONSTRAINT `administrador_ibfk_3` FOREIGN KEY (`id_gradoactual`) REFERENCES `grado` (`id_grado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Tabla lista_blanca (Invitaciones - Registro controlado)
-- IMPORTANTE: El registro NO es abierto. Se valida contra esta tabla.
-- Flujo: Validar existencia -> Crear usuario -> Crear perfil -> Marcar ya_registrado = true
CREATE TABLE IF NOT EXISTS `lista_blanca` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_escuela` int(11) DEFAULT NULL,
  `nombres` varchar(100) NOT NULL,
  `apellidos` varchar(100) NOT NULL,
  `rol_asignado` enum('estudiante','profesor','admin') NOT NULL,
  `id_gradoactual` int(11) DEFAULT NULL,
  `ya_registrado` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `id_escuela` (`id_escuela`),
  KEY `id_grado_asignado` (`id_gradoactual`),
  CONSTRAINT `lista_blanca_ibfk_1` FOREIGN KEY (`id_escuela`) REFERENCES `escuela` (`id_escuela`),
  CONSTRAINT `lista_blanca_ibfk_2` FOREIGN KEY (`id_gradoactual`) REFERENCES `grado` (`id_grado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Tabla progreso_leccion (Progreso de lecciones con segmentos)
-- IMPORTANTE: 
-- 1. puntaje_total: Máximo 125 puntos por lección (MAX_POINTS_PER_LESSON)
-- 2. completada: Se marca como 1 cuando puntaje_total >= 125
-- 3. Segmentos: presentation_completada, practice_completada, use_completada
-- 4. GREATEST: El backend usa GREATEST(puntaje_total, ?) para mantener el mejor puntaje
-- 5. Clave única: (id_estudiante, id_leccion) - Usa INSERT ... ON DUPLICATE KEY UPDATE
-- NOTA: veces_repasada eliminado (no se usa actualmente, pero puede agregarse en el futuro). intentos se actualiza pero no se lee.
CREATE TABLE IF NOT EXISTS `progreso_leccion` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_estudiante` int(11) NOT NULL,
  `id_leccion` int(11) NOT NULL,
  `presentation_completada` tinyint(1) DEFAULT 0,
  `practice_completada` tinyint(1) DEFAULT 0,
  `use_completada` tinyint(1) DEFAULT 0,
  `puntaje_total` int(11) DEFAULT 0,
  `es_perfecta` tinyint(1) DEFAULT 0,
  `fecha_ultimo_intento` datetime DEFAULT current_timestamp(),
  `fecha_completado` datetime DEFAULT NULL,
  `completada` tinyint(1) DEFAULT 0,
  `intentos` int(11) DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_progreso_leccion` (`id_estudiante`,`id_leccion`),
  KEY `id_leccion` (`id_leccion`),
  CONSTRAINT `progreso_leccion_ibfk_1` FOREIGN KEY (`id_estudiante`) REFERENCES `estudiante` (`id_estudiante`),
  CONSTRAINT `progreso_leccion_ibfk_2` FOREIGN KEY (`id_leccion`) REFERENCES `leccion` (`id_leccion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- NOTA: progreso_competencia eliminada - Se calcula dinámicamente desde progreso_leccion en getDashboardStatus

-- ============================================
-- TABLAS ELIMINADAS (No se usan en el backend actual)
-- ============================================
-- 
-- Las siguientes tablas fueron eliminadas porque NO se usan:
-- 
-- 1. progreso_competencia - Se calcula dinámicamente desde progreso_leccion
-- 2. parte_leccion - No se usa (contenido está en frontend)
-- 3. ejercicio - No se usa (contenido está en frontend)
-- 4. opcion - No se usa (contenido está en frontend)
--
-- Si en el futuro se necesita migrar contenido del frontend a BD,
-- estas tablas pueden ser recreadas.

-- ============================================
-- DATOS INICIALES
-- ============================================

-- Insertar grados
INSERT IGNORE INTO `grado` (`id_grado`, `nombre`) VALUES
(1, 'primero'),
(2, 'segundo'),
(3, 'tercero');

-- Insertar competencias (16 competencias: 5 en lapso 1, 6 en lapso 2, 5 en lapso 3)
INSERT IGNORE INTO `competencia` (`id_competencia`, `id_grado`, `titulo`, `orden`, `lapso`) VALUES
(1, 1, 'Competencia 1', 1, 1),
(2, 1, 'Competencia 2', 2, 1),
(3, 1, 'Competencia 3', 3, 1),
(4, 1, 'Competencia 4', 4, 1),
(5, 1, 'Competencia 5', 5, 1),
(6, 1, 'Competencia 6', 6, 2),
(7, 1, 'Competencia 7', 7, 2),
(8, 1, 'Competencia 8', 8, 2),
(9, 1, 'Competencia 9', 9, 2),
(10, 1, 'Competencia 10', 10, 2),
(11, 1, 'Competencia 11', 11, 2),
(12, 1, 'Competencia 12', 12, 3),
(13, 1, 'Competencia 13', 13, 3),
(14, 1, 'Competencia 14', 14, 3),
(15, 1, 'Competencia 15', 15, 3),
(16, 1, 'Competencia 16', 16, 3);

-- Insertar lecciones (128 lecciones - 8 por competencia)
INSERT IGNORE INTO `leccion` (`id_leccion`, `id_competencia`, `titulo`, `orden`) 
SELECT 
  (c.id_competencia - 1) * 8 + l.orden as id_leccion,
  c.id_competencia,
  CONCAT('Lección ', l.orden) as titulo,
  l.orden
FROM `competencia` c
CROSS JOIN (
  SELECT 1 as orden UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 
  UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8
) l
WHERE NOT EXISTS (
  SELECT 1 FROM `leccion` le 
  WHERE le.id_competencia = c.id_competencia AND le.orden = l.orden
);

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

-- ============================================
-- REGLAS DE NEGOCIO IMPLEMENTADAS
-- ============================================
-- 
-- 1. REGISTRO (Lista Blanca):
--    - Validar existencia en lista_blanca (ya_registrado = false)
--    - Crear usuario con nombres/apellidos de la lista
--    - Crear perfil (estudiante/profesor/admin según rol_asignado)
--    - Marcar ya_registrado = true
--    - Todo en una transacción
--
-- 2. LOGIN:
--    - Devuelve: { token, rol, username }
--    - El rol es vital para redirigir al Frontend
--
-- 3. PROGRESO DE LECCIÓN:
--    - puntaje_total: Máximo 125 puntos (MAX_POINTS_PER_LESSON)
--    - completada: Se marca como 1 cuando puntaje_total >= 125
--    - es_perfecta: Se marca como 1 cuando puntaje_total = 125 (exactamente perfecto)
--    - Segmentos: presentation_completada, practice_completada, use_completada
--    - Mejor puntaje: GREATEST(puntaje_total, ?) - Nunca empeora el record
--    - INSERT ... ON DUPLICATE KEY UPDATE para evitar errores de clave duplicada
--    - NOTA: veces_repasada eliminado (no se usa actualmente, puede agregarse en el futuro)
--
-- 4. PROGRESO DE COMPETENCIA:
--    - Se calcula DINÁMICAMENTE desde progreso_leccion (no hay tabla progreso_competencia)
--    - Una competencia está completada si todas sus 8 lecciones están completadas
--
-- 5. RACHA DE ESTUDIO:
--    - racha_actual: Se incrementa si estudió ayer (diffDays = 1)
--    - mejor_racha: Se actualiza si racha_actual > mejor_racha
--    - Se resetea a 0 si pasó más de 1 día sin estudiar
--    - ultima_actividad: Se actualiza cada vez que guarda progreso
--
-- 6. PUNTOS TOTALES:
--    - puntos_totales en estudiante: Suma de todos los puntaje_total de progreso_leccion
--    - Se recalcula cada vez que se guarda progreso
--
-- 7. PERFECTO (125 puntos):
--    - Frontend: isPerfect = currentScore >= maxScore && isLessonCompleted
--    - Backend: completada = 1 cuando puntaje_total >= 125
--    - Botón "¡PERFECTO!" se deshabilita cuando isPerfect = true
--
-- ============================================
-- ELEMENTOS ELIMINADOS (No se usan en el backend)
-- ============================================
--
-- TABLAS ELIMINADAS:
-- - progreso_competencia: Se calcula dinámicamente desde progreso_leccion
-- - parte_leccion: Contenido está en frontend (src/data/competencyContent.ts)
-- - ejercicio: Contenido está en frontend
-- - opcion: Contenido está en frontend
--
-- CAMPOS ELIMINADOS:
-- - grado.descripcion: Nunca se usa
-- - leccion.puntos_totales: Siempre es 125, se maneja en código (MAX_POINTS_PER_LESSON)
-- - progreso_leccion.veces_repasada: No se usa actualmente (puede agregarse en el futuro para estadísticas)
-- - progreso_leccion.intentos: Se actualiza pero nunca se lee (se mantiene por si se necesita en futuro)
--
-- CAMPOS RESTAURADOS:
-- - progreso_leccion.es_perfecta: ✅ RESTAURADO - Se guarda cuando puntaje_total = 125
--   Razón: Permite queries directas, historial, estadísticas y consistencia entre frontend/backend
--
-- ============================================
