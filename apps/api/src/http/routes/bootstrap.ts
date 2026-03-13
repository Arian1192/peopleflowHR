import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppServices } from "../types.js";

const createTenantSchema = z.object({ name: z.string().min(2) });
const createUserSchema = z.object({ email: z.string().email() });
const createMembershipSchema = z.object({
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  role: z.enum(["tenant_admin", "manager", "employee"]),
  status: z.enum(["active", "invited", "disabled"]).optional(),
});

export async function bootstrapRoutes(app: FastifyInstance, services: AppServices): Promise<void> {
  app.post("/api/v1/bootstrap/tenants", async (request, reply) => {
    const parsed = createTenantSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid tenant payload" });
    }
    const tenant = services.store.createTenant(parsed.data.name);
    return reply.code(201).send(tenant);
  });

  app.post("/api/v1/bootstrap/users", async (request, reply) => {
    const parsed = createUserSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid user payload" });
    }
    const user = services.store.createUser(parsed.data.email);
    return reply.code(201).send(user);
  });

  app.post("/api/v1/bootstrap/memberships", async (request, reply) => {
    const parsed = createMembershipSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid membership payload" });
    }
    const membership = services.store.createMembership(parsed.data);
    return reply.code(201).send(membership);
  });
}
