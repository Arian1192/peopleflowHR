import type { FastifyReply, FastifyRequest } from "fastify";
import type { Role } from "../domain/types.js";
import { tenantHeaderSchema } from "./schemas/common.js";
import type { AppServices } from "./types.js";

export type TenantContext = {
  tenantId: string;
  userId: string;
  role: Role;
};

export function resolveTenantContext(
  request: FastifyRequest,
  reply: FastifyReply,
  services: AppServices,
): TenantContext | null {
  const parsed = tenantHeaderSchema.safeParse(request.headers);
  if (!parsed.success) {
    void reply.code(400).send({ message: "Missing tenant context headers" });
    return null;
  }

  const tenantId = parsed.data["x-tenant-id"];
  const userId = parsed.data["x-user-id"];
  const membership = services.store.getMembership(userId, tenantId);
  if (!membership) {
    void reply.code(403).send({ message: "No active membership for tenant" });
    return null;
  }

  return {
    tenantId,
    userId,
    role: membership.role,
  };
}
