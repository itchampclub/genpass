import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { passRoutes } from "./routes/pass.js";

const app = new Hono();

app.use("*", logger());
app.use("/api/*", cors());

app.get("/health", (c) => c.json({ ok: true }));
app.route("/api", passRoutes);

const port = Number(process.env.PORT ?? 8788);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`genpass server listening on http://localhost:${info.port}`);
});
