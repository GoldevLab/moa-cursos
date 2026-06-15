/**
 * Aplica el schema MOA en Turso leyendo credenciales de `.env`.
 *
 * Uso:
 *   1. Copia .env.example → .env y pega URL + token de Turso
 *   2. yarn db:seed
 */
import "dotenv/config";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";
import { ensureMoaSchema } from "../src/lib/schema";
import { resetMoaSchemaCache } from "../src/lib/db";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env");

const readEnvCredentials = () => {
  const fromProcess = {
    url: process.env.PRIVATE_TURSO_DATABASE_URL?.trim() || "",
    token: process.env.PRIVATE_TURSO_AUTH_TOKEN?.trim() || "",
  };
  if (fromProcess.url.startsWith("libsql://") && fromProcess.token) {
    return fromProcess;
  }

  if (!existsSync(envPath)) return null;

  const raw = readFileSync(envPath, "utf8");
  const url = raw.match(/^PRIVATE_TURSO_DATABASE_URL=(.+)$/m)?.[1]?.trim() || "";
  const token =
    raw.match(/^PRIVATE_TURSO_AUTH_TOKEN=(.+)$/m)?.[1]?.trim() || "";

  if (!url.startsWith("libsql://") || !token) return null;
  return { url, token };
};

const applySchema = async (url: string, token: string) => {
  process.env.PRIVATE_TURSO_DATABASE_URL = url;
  process.env.PRIVATE_TURSO_AUTH_TOKEN = token;

  resetMoaSchemaCache();
  await ensureMoaSchema();

  const client = createClient({ url, authToken: token });
  const counts = await client.batch([
    "SELECT COUNT(*) AS c FROM grado",
    "SELECT COUNT(*) AS c FROM competencia",
    "SELECT COUNT(*) AS c FROM leccion",
    "SELECT COUNT(*) AS c FROM lista_blanca",
    "SELECT COUNT(*) AS c FROM usuario",
  ]);

  console.log("[db:seed] Conectado a Turso remoto.");
  console.log("[db:seed] Schema aplicado:");
  console.log(`  grados: ${counts[0].rows[0]?.c}`);
  console.log(`  competencias: ${counts[1].rows[0]?.c}`);
  console.log(`  lecciones: ${counts[2].rows[0]?.c}`);
  console.log(`  lista_blanca: ${counts[3].rows[0]?.c}`);
  console.log(`  usuarios: ${counts[4].rows[0]?.c}`);
};

const main = async () => {
  const creds = readEnvCredentials();
  if (!creds) {
    console.error(
      [
        "Faltan credenciales Turso.",
        "",
        "1. cp .env.example .env",
        "2. Pega PRIVATE_TURSO_DATABASE_URL y PRIVATE_TURSO_AUTH_TOKEN",
        "3. yarn db:seed",
      ].join("\n"),
    );
    process.exit(1);
  }

  await applySchema(creds.url, creds.token);
  console.log("[db:seed] Listo. Corre: yarn dev");
};

main().catch((err) => {
  console.error("[db:seed] Error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
