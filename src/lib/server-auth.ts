import type { RequestEventBase } from "@builder.io/qwik-city";
import { getCurrentUsuario } from "./auth";
import { getEstudianteByUsuarioId } from "./progress";

export class ServerAuthError extends Error {
  constructor(
    public code: "unauthorized" | "forbidden" | "no_profile",
    message: string,
  ) {
    super(message);
  }
}

export const requireAuthenticatedUsuario = async (event: RequestEventBase) => {
  const user = await getCurrentUsuario(event);
  if (!user) throw new ServerAuthError("unauthorized", "Sesión requerida");
  return user;
};

export const requireAdmin = async (event: RequestEventBase) => {
  const user = await requireAuthenticatedUsuario(event);
  if (user.rol !== "admin") {
    throw new ServerAuthError("forbidden", "Solo administradores");
  }
  return user;
};

export const requireProfesorOrAdmin = async (event: RequestEventBase) => {
  const user = await requireAuthenticatedUsuario(event);
  if (user.rol !== "profesor" && user.rol !== "admin") {
    throw new ServerAuthError("forbidden", "Solo docentes o administradores");
  }
  return user;
};

export const requireEstudianteProfile = async (event: RequestEventBase) => {
  const user = await requireAuthenticatedUsuario(event);
  if (user.rol !== "estudiante") {
    throw new ServerAuthError("forbidden", "Solo estudiantes");
  }
  const perfil = await getEstudianteByUsuarioId(user.id_usuario);
  if (!perfil) throw new ServerAuthError("no_profile", "Perfil no encontrado");
  return { user, perfil };
};
