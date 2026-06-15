import {
  createQwikCity,
  type PlatformNode,
} from "@builder.io/qwik-city/middleware/node";
import "dotenv/config";
import qwikCityPlan from "@qwik-city-plan";
import { manifest } from "@qwik-client-manifest";
import render from "./entry.ssr";
import compression from "compression";
import express from "express";
import type { Http2ServerRequest } from "node:http2";
import type { IncomingMessage } from "node:http";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

declare global {
  interface QwikCityPlatform extends PlatformNode {}
}

function requestOrigin(req: IncomingMessage | Http2ServerRequest): string {
  const host = req.headers.host;
  if (!host) {
    const port = process.env.PORT ?? "5173";
    return `http://localhost:${port}`;
  }
  const forwarded = req.headers["x-forwarded-proto"];
  const proto =
    (typeof forwarded === "string" ? forwarded.split(",")[0]?.trim() : null) ??
    ("encrypted" in req.socket && req.socket.encrypted ? "https" : "http");
  return `${proto}://${host}`;
}

const { router, notFound } = createQwikCity({
  render,
  qwikCityPlan,
  manifest,
  getOrigin: requestOrigin,
});

const app = express();
app.disable("x-powered-by");
app.use(compression() as express.RequestHandler);

const distDir = join(fileURLToPath(import.meta.url), "..", "..", "dist");

app.use(
  "/build",
  express.static(join(distDir, "build"), { maxAge: "1y", immutable: true }),
);
app.use(
  "/assets",
  express.static(join(distDir, "assets"), { maxAge: "1y", immutable: true }),
);
app.use(express.static(distDir, { redirect: false }));

app.use(router);
app.use(notFound);

const PORT = process.env.PORT ?? (process.env.NODE_ENV === "production" ? "3000" : "5173");
const HOST = process.env.HOST ?? "0.0.0.0";

app.listen(Number(PORT), HOST, () => {
  console.log(`[moa-app-web] http://${HOST}:${PORT}/`);
});
