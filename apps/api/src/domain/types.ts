export type Role = "tenant_admin" | "manager" | "employee";

export type Tenant = {
  id: string;
  name: string;
  createdAt: string;
};

export type User = {
  id: string;
  email: string;
  createdAt: string;
};

export type Membership = {
  id: string;
  userId: string;
  tenantId: string;
  role: Role;
  status: "active" | "invited" | "disabled";
  createdAt: string;
};

export type Department = {
  id: string;
  tenantId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type Employee = {
  id: string;
  tenantId: string;
  userId: string;
  fullName: string;
  email: string;
  departmentId: string | null;
  managerEmployeeId: string | null;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
};

export type LeaveRequest = {
  id: string;
  tenantId: string;
  employeeId: string;
  createdByUserId: string;
  type: "vacation" | "sick" | "personal";
  startsAt: string;
  endsAt: string;
  note: string | null;
  status: "submitted" | "approved" | "rejected" | "cancelled";
  decisionReason: string | null;
  decidedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApprovalEvent = {
  id: string;
  tenantId: string;
  leaveRequestId: string;
  actorUserId: string;
  action: "approved" | "rejected";
  reason: string;
  createdAt: string;
};

export type AuditEvent = {
  id: string;
  tenantId: string;
  actorUserId: string;
  action: string;
  entity: string;
  entityId: string;
  metadata: Record<string, string | number | boolean | null>;
  createdAt: string;
};
