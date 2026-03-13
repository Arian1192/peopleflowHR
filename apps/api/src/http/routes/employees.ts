import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { resolveTenantContext } from "../tenant-context.js";
import type { AppServices } from "../types.js";

const createEmployeeSchema = z.object({
  userId: z.string().uuid(),
  fullName: z.string().min(3).max(100),
  email: z.string().email(),
  departmentId: z.string().uuid().nullable().optional(),
  managerEmployeeId: z.string().uuid().nullable().optional(),
});

export async function employeeRoutes(app: FastifyInstance, services: AppServices): Promise<void> {
  app.post("/api/v1/employees", async (request, reply) => {
    const context = resolveTenantContext(request, reply, services);
    if (!context) {
      return;
    }

    if (context.role !== "tenant_admin") {
      return reply.code(403).send({ message: "Only tenant admins can create employees" });
    }

    const parsed = createEmployeeSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid employee payload" });
    }

    const employee = services.store.createEmployee({
      tenantId: context.tenantId,
      userId: parsed.data.userId,
      fullName: parsed.data.fullName,
      email: parsed.data.email,
      departmentId: parsed.data.departmentId ?? null,
      managerEmployeeId: parsed.data.managerEmployeeId ?? null,
    });

    services.store.appendAudit({
      tenantId: context.tenantId,
      actorUserId: context.userId,
      action: "employee.created",
      entity: "employee",
      entityId: employee.id,
      metadata: { employeeEmail: employee.email },
    });

    return reply.code(201).send(employee);
  });

  app.get("/api/v1/employees", async (request, reply) => {
    const context = resolveTenantContext(request, reply, services);
    if (!context) {
      return;
    }

    const allEmployees = services.store.listEmployees(context.tenantId);

    if (context.role === "employee") {
      const self = services.store.findEmployeeByUser(context.tenantId, context.userId);
      return reply.send({ items: self ? [self] : [] });
    }

    return reply.send({ items: allEmployees });
  });
}
