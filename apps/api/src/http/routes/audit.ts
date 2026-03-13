import type { FastifyInstance } from "fastify";
import { resolveTenantContext } from "../tenant-context.js";
import type { AppServices } from "../types.js";

export async function auditRoutes(app: FastifyInstance, services: AppServices): Promise<void> {
  app.get("/api/v1/audit-events", async (request, reply) => {
    const context = resolveTenantContext(request, reply, services);
    if (!context) {
      return;
    }

    if (context.role !== "tenant_admin") {
      return reply.code(403).send({ message: "Only tenant admins can read audit events" });
    }

    const items = services.store.listAuditEvents(context.tenantId);
    return reply.send({ items });
  });

  app.get("/api/v1/approval-events", async (request, reply) => {
    const context = resolveTenantContext(request, reply, services);
    if (!context) {
      return;
    }

    const items = services.store.listApprovalEvents(context.tenantId);
    return reply.send({ items });
  });
}
