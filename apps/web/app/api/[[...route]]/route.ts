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
    title: "Gestão Casa API",
    version: "1.0.0",
  },
});

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
export const OPTIONS = handle(app);
export const PATCH = handle(app);
