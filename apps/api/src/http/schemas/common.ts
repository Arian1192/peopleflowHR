import { z } from "zod";

export const uuidSchema = z.string().uuid();

export const tenantHeaderSchema = z.object({
  "x-tenant-id": uuidSchema,
  "x-user-id": uuidSchema,
});
