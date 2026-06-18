/** Rutas internas de la app (siempre con slash final, salvo query). */

export const routes = {
  home: "/",
  auth: {
    login: "/auth/?mode=login",
    activar: "/auth/activar/",
  },
  cuenta: "/dashboard/cuenta/",
  estudiante: {
    campus: "/dashboard/estudiante/",
    competencia: (idCompetencia: number) =>
      `/dashboard/estudiante/competencia/${idCompetencia}/`,
    leccion: (idLeccion: number, opts?: { fresh?: boolean }) => {
      const base = `/dashboard/estudiante/leccion/${idLeccion}/`;
      return opts?.fresh ? `${base}?fresh=1` : base;
    },
  },
  profesor: {
    home: "/dashboard/profesor/",
    contenido: "/dashboard/profesor/contenido/",
    competencia: (idCompetencia: number) =>
      `/dashboard/profesor/contenido/${idCompetencia}/`,
    leccion: (idLeccion: number) =>
      `/dashboard/profesor/contenido/leccion/${idLeccion}/`,
    estudiantes: "/dashboard/profesor/estudiantes/",
    estudiante: (idEstudiante: number) =>
      `/dashboard/profesor/estudiantes/${idEstudiante}/`,
    estadisticas: "/dashboard/profesor/estadisticas/",
  },
  admin: {
    home: "/dashboard/admin/",
  },
} as const;
