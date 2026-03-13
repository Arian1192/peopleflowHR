import { randomUUID } from "node:crypto";
import type {
  ApprovalEvent,
  AuditEvent,
  Department,
  Employee,
  LeaveRequest,
  Membership,
  Role,
  Tenant,
  User,
} from "./types.js";

const now = () => new Date().toISOString();

export class InMemoryStore {
  private tenants = new Map<string, Tenant>();
  private users = new Map<string, User>();
  private memberships = new Map<string, Membership>();
  private departments = new Map<string, Department>();
  private employees = new Map<string, Employee>();
  private leaveRequests = new Map<string, LeaveRequest>();
  private approvalEvents = new Map<string, ApprovalEvent>();
  private auditEvents = new Map<string, AuditEvent>();

  createTenant(name: string): Tenant {
    const tenant: Tenant = { id: randomUUID(), name, createdAt: now() };
    this.tenants.set(tenant.id, tenant);
    return tenant;
  }

  createUser(email: string): User {
    const user: User = { id: randomUUID(), email, createdAt: now() };
    this.users.set(user.id, user);
    return user;
  }

  createMembership(input: {
    userId: string;
    tenantId: string;
    role: Role;
    status?: Membership["status"];
  }): Membership {
    const membership: Membership = {
      id: randomUUID(),
      userId: input.userId,
      tenantId: input.tenantId,
      role: input.role,
      status: input.status ?? "active",
      createdAt: now(),
    };
    this.memberships.set(membership.id, membership);
    return membership;
  }

  getMembership(userId: string, tenantId: string): Membership | null {
    for (const membership of this.memberships.values()) {
      if (
        membership.userId === userId &&
        membership.tenantId === tenantId &&
        membership.status === "active"
      ) {
        return membership;
      }
    }
    return null;
  }

  createDepartment(input: { tenantId: string; name: string }): Department {
    const timestamp = now();
    const department: Department = {
      id: randomUUID(),
      tenantId: input.tenantId,
      name: input.name,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.departments.set(department.id, department);
    return department;
  }

  listDepartments(tenantId: string): Department[] {
    return [...this.departments.values()].filter((department) => department.tenantId === tenantId);
  }

  createEmployee(input: {
    tenantId: string;
    userId: string;
    fullName: string;
    email: string;
    departmentId: string | null;
    managerEmployeeId: string | null;
  }): Employee {
    const timestamp = now();
    const employee: Employee = {
      id: randomUUID(),
      tenantId: input.tenantId,
      userId: input.userId,
      fullName: input.fullName,
      email: input.email,
      departmentId: input.departmentId,
      managerEmployeeId: input.managerEmployeeId,
      status: "active",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.employees.set(employee.id, employee);
    return employee;
  }

  listEmployees(tenantId: string): Employee[] {
    return [...this.employees.values()].filter((employee) => employee.tenantId === tenantId);
  }

  findEmployeeByUser(tenantId: string, userId: string): Employee | null {
    return (
      [...this.employees.values()].find(
        (employee) => employee.tenantId === tenantId && employee.userId === userId,
      ) ?? null
    );
  }

  findEmployee(tenantId: string, employeeId: string): Employee | null {
    const employee = this.employees.get(employeeId);
    if (!employee || employee.tenantId !== tenantId) {
      return null;
    }
    return employee;
  }

  createLeaveRequest(input: {
    tenantId: string;
    employeeId: string;
    createdByUserId: string;
    type: LeaveRequest["type"];
    startsAt: string;
    endsAt: string;
    note: string | null;
  }): LeaveRequest {
    const timestamp = now();
    const request: LeaveRequest = {
      id: randomUUID(),
      tenantId: input.tenantId,
      employeeId: input.employeeId,
      createdByUserId: input.createdByUserId,
      type: input.type,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      note: input.note,
      status: "submitted",
      decisionReason: null,
      decidedByUserId: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.leaveRequests.set(request.id, request);
    return request;
  }

  listLeaveRequests(tenantId: string): LeaveRequest[] {
    return [...this.leaveRequests.values()].filter((request) => request.tenantId === tenantId);
  }

  findLeaveRequest(tenantId: string, requestId: string): LeaveRequest | null {
    const request = this.leaveRequests.get(requestId);
    if (!request || request.tenantId !== tenantId) {
      return null;
    }
    return request;
  }

  decideLeaveRequest(input: {
    tenantId: string;
    requestId: string;
    action: "approved" | "rejected";
    actorUserId: string;
    reason: string;
  }): { request: LeaveRequest; event: ApprovalEvent } | null {
    const existing = this.findLeaveRequest(input.tenantId, input.requestId);
    if (!existing) {
      return null;
    }

    const updated: LeaveRequest = {
      ...existing,
      status: input.action,
      decisionReason: input.reason,
      decidedByUserId: input.actorUserId,
      updatedAt: now(),
    };
    this.leaveRequests.set(existing.id, updated);

    const event: ApprovalEvent = {
      id: randomUUID(),
      tenantId: input.tenantId,
      leaveRequestId: existing.id,
      actorUserId: input.actorUserId,
      action: input.action,
      reason: input.reason,
      createdAt: now(),
    };
    this.approvalEvents.set(event.id, event);

    return { request: updated, event };
  }

  listApprovalEvents(tenantId: string): ApprovalEvent[] {
    return [...this.approvalEvents.values()].filter((event) => event.tenantId === tenantId);
  }

  appendAudit(input: Omit<AuditEvent, "id" | "createdAt">): AuditEvent {
    const event: AuditEvent = {
      id: randomUUID(),
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      metadata: input.metadata,
      createdAt: now(),
    };
    this.auditEvents.set(event.id, event);
    return event;
  }

  listAuditEvents(tenantId: string): AuditEvent[] {
    return [...this.auditEvents.values()].filter((event) => event.tenantId === tenantId);
  }
}
