import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { resolveTenantContext } from "../tenant-context.js";
import type { AppServices } from "../types.js";

const createDepartmentSchema = z.object({ name: z.string().min(2).max(80) });

export async function departmentRoutes(app: FastifyInstance, services: AppServices): Promise<void> {
  app.post("/api/v1/departments", async (request, reply) => {
    const context = resolveTenantContext(request, reply, services);
    if (!context) {
      return;
    }

    if (context.role !== "tenant_admin") {
      return reply.code(403).send({ message: "Only tenant admins can create departments" });
    }

    const parsed = createDepartmentSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid department payload" });
    }

    const department = services.store.createDepartment({
      tenantId: context.tenantId,
      name: parsed.data.name,
    });

    services.store.appendAudit({
      tenantId: context.tenantId,
      actorUserId: context.userId,
      action: "department.created",
      entity: "department",
      entityId: department.id,
      metadata: { departmentName: department.name },
    });

    return reply.code(201).send(department);
  });

  app.get("/api/v1/departments", async (request, reply) => {
    const context = resolveTenantContext(request, reply, services);
    if (!context) {
      return;
    }

    const departments = services.store.listDepartments(context.tenantId);
    return reply.send({ items: departments });
  });
}
