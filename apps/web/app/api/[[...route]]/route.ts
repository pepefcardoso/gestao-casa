export const dynamic = "force-dynamic";

import { OpenAPIHono } from "@hono/zod-openapi";
import { handle } from "hono/vercel";
import { authRouter } from "../../../../../libs/backend/src/api/routes/auth";
import { expensesRouter } from "../../../../../libs/backend/src/api/routes/expenses";
import { financingRouter } from "../../../../../libs/backend/src/api/routes/financing";
import { healthRouter } from "../../../../../libs/backend/src/api/routes/health";
import { housesRouter } from "../../../../../libs/backend/src/api/routes/houses";
import { incomesRouter } from "../../../../../libs/backend/src/api/routes/incomes";
import { roomsRouter } from "../../../../../libs/backend/src/api/routes/rooms";

const app = new OpenAPIHono().basePath("/api");

// Catch unhandled errors, such as JSON parse errors from empty bodies in zod-openapi
app.onError((err, c) => {
  if (err instanceof SyntaxError) {
    return c.json({ error: "Invalid or empty JSON body" }, 400);
  }
  console.error("Unhandled Hono Error:", err);
  return c.json({ error: "Internal Server Error" }, 500);
});

app.route("/", roomsRouter);
app.route("/", financingRouter);
app.route("/", expensesRouter);
app.route("/", healthRouter);
app.route("/", housesRouter);
app.route("/", incomesRouter);
app.route("/", authRouter);

app.doc("/doc", {
  openapi: "3.0.0",
  info: {
    title: "Pillar API",
    version: "1.0.0",
  },
});

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
export const OPTIONS = handle(app);
export const PATCH = handle(app);
