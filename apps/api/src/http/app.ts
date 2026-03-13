import Fastify, { type FastifyInstance } from "fastify";
import { InMemoryStore } from "../domain/store.js";
import { auditRoutes } from "./routes/audit.js";
import { bootstrapRoutes } from "./routes/bootstrap.js";
import { departmentRoutes } from "./routes/departments.js";
import { employeeRoutes } from "./routes/employees.js";
import { leaveRequestRoutes } from "./routes/leave-requests.js";
import type { AppServices } from "./types.js";

export function buildApp(services?: Partial<AppServices>): FastifyInstance {
  const app = Fastify({ logger: false });
  const scoped: AppServices = {
    store: services?.store ?? new InMemoryStore(),
  };

  app.get("/healthz", async () => ({ ok: true }));

  void bootstrapRoutes(app, scoped);
  void departmentRoutes(app, scoped);
  void employeeRoutes(app, scoped);
  void leaveRequestRoutes(app, scoped);
  void auditRoutes(app, scoped);

  return app;
}
