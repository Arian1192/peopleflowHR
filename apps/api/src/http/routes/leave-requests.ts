import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { resolveTenantContext } from "../tenant-context.js";
import type { AppServices } from "../types.js";

const createLeaveSchema = z
  .object({
    employeeId: z.string().uuid(),
    type: z.enum(["vacation", "sick", "personal"]),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
    note: z.string().max(500).optional(),
  })
  .refine((data) => new Date(data.endsAt).getTime() >= new Date(data.startsAt).getTime(), {
    message: "endsAt must be after startsAt",
  });

const decisionSchema = z.object({
  action: z.enum(["approved", "rejected"]),
  reason: z.string().min(3).max(300),
});

export async function leaveRequestRoutes(app: FastifyInstance, services: AppServices): Promise<void> {
  app.post("/api/v1/leave-requests", async (request, reply) => {
    const context = resolveTenantContext(request, reply, services);
    if (!context) {
      return;
    }

    const parsed = createLeaveSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid leave request payload" });
    }

    const employee = services.store.findEmployee(context.tenantId, parsed.data.employeeId);
    if (!employee) {
      return reply.code(404).send({ message: "Employee not found in tenant" });
    }

    if (context.role === "employee" && employee.userId !== context.userId) {
      return reply.code(403).send({ message: "Employees can only request leave for themselves" });
    }

    const leave = services.store.createLeaveRequest({
      tenantId: context.tenantId,
      employeeId: parsed.data.employeeId,
      createdByUserId: context.userId,
      type: parsed.data.type,
      startsAt: parsed.data.startsAt,
      endsAt: parsed.data.endsAt,
      note: parsed.data.note ?? null,
    });

    services.store.appendAudit({
      tenantId: context.tenantId,
      actorUserId: context.userId,
      action: "leave_request.submitted",
      entity: "leave_request",
      entityId: leave.id,
      metadata: { type: leave.type, status: leave.status },
    });

    return reply.code(201).send(leave);
  });

  app.get("/api/v1/leave-requests", async (request, reply) => {
    const context = resolveTenantContext(request, reply, services);
    if (!context) {
      return;
    }

    const requests = services.store.listLeaveRequests(context.tenantId);
    if (context.role === "employee") {
      return reply.send({ items: requests.filter((item) => item.createdByUserId === context.userId) });
    }

    return reply.send({ items: requests });
  });

  app.post("/api/v1/leave-requests/:id/decision", async (request, reply) => {
    const context = resolveTenantContext(request, reply, services);
    if (!context) {
      return;
    }

    if (context.role === "employee") {
      return reply.code(403).send({ message: "Employees cannot approve leave requests" });
    }

    const parsed = decisionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid decision payload" });
    }

    const requestId = (request.params as { id: string }).id;
    const decision = services.store.decideLeaveRequest({
      tenantId: context.tenantId,
      requestId,
      action: parsed.data.action,
      actorUserId: context.userId,
      reason: parsed.data.reason,
    });

    if (!decision) {
      return reply.code(404).send({ message: "Leave request not found in tenant" });
    }

    services.store.appendAudit({
      tenantId: context.tenantId,
      actorUserId: context.userId,
      action: `leave_request.${parsed.data.action}`,
      entity: "leave_request",
      entityId: decision.request.id,
      metadata: { reason: parsed.data.reason },
    });

    return reply.send(decision);
  });
}
