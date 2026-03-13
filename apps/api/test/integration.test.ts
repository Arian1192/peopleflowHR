import { describe, expect, test } from "vitest";
import { buildApp } from "../src/http/app.js";

type BootstrapResult = {
  tenantA: { id: string };
  tenantB: { id: string };
  adminA: { id: string };
  employeeA: { id: string };
  managerA: { id: string };
  adminB: { id: string };
};

async function bootstrap(): Promise<{ app: ReturnType<typeof buildApp>; data: BootstrapResult }> {
  const app = buildApp();

  const tenantA = await app.inject({ method: "POST", url: "/api/v1/bootstrap/tenants", payload: { name: "Tenant A" } });
  const tenantB = await app.inject({ method: "POST", url: "/api/v1/bootstrap/tenants", payload: { name: "Tenant B" } });
  const adminA = await app.inject({ method: "POST", url: "/api/v1/bootstrap/users", payload: { email: "admin-a@pf.dev" } });
  const employeeA = await app.inject({ method: "POST", url: "/api/v1/bootstrap/users", payload: { email: "employee-a@pf.dev" } });
  const managerA = await app.inject({ method: "POST", url: "/api/v1/bootstrap/users", payload: { email: "manager-a@pf.dev" } });
  const adminB = await app.inject({ method: "POST", url: "/api/v1/bootstrap/users", payload: { email: "admin-b@pf.dev" } });

  const tA = tenantA.json<{ id: string }>();
  const tB = tenantB.json<{ id: string }>();
  const aA = adminA.json<{ id: string }>();
  const eA = employeeA.json<{ id: string }>();
  const mA = managerA.json<{ id: string }>();
  const aB = adminB.json<{ id: string }>();

  const memberships = [
    { userId: aA.id, tenantId: tA.id, role: "tenant_admin" },
    { userId: eA.id, tenantId: tA.id, role: "employee" },
    { userId: mA.id, tenantId: tA.id, role: "manager" },
    { userId: aB.id, tenantId: tB.id, role: "tenant_admin" },
  ];

  for (const membership of memberships) {
    await app.inject({ method: "POST", url: "/api/v1/bootstrap/memberships", payload: membership });
  }

  return {
    app,
    data: {
      tenantA: tA,
      tenantB: tB,
      adminA: aA,
      employeeA: eA,
      managerA: mA,
      adminB: aB,
    },
  };
}

describe("tenant isolation", () => {
  test("prevents cross-tenant reads and writes", async () => {
    const { app, data } = await bootstrap();

    const createDepartment = await app.inject({
      method: "POST",
      url: "/api/v1/departments",
      headers: {
        "x-tenant-id": data.tenantA.id,
        "x-user-id": data.adminA.id,
      },
      payload: { name: "Engineering" },
    });
    expect(createDepartment.statusCode).toBe(201);
    const department = createDepartment.json<{ id: string }>();

    const createEmployee = await app.inject({
      method: "POST",
      url: "/api/v1/employees",
      headers: {
        "x-tenant-id": data.tenantA.id,
        "x-user-id": data.adminA.id,
      },
      payload: {
        userId: data.employeeA.id,
        fullName: "Employee A",
        email: "employee-a@pf.dev",
        departmentId: department.id,
      },
    });
    expect(createEmployee.statusCode).toBe(201);
    const employee = createEmployee.json<{ id: string }>();

    const createLeave = await app.inject({
      method: "POST",
      url: "/api/v1/leave-requests",
      headers: {
        "x-tenant-id": data.tenantA.id,
        "x-user-id": data.employeeA.id,
      },
      payload: {
        employeeId: employee.id,
        type: "vacation",
        startsAt: "2026-05-01T00:00:00.000Z",
        endsAt: "2026-05-03T00:00:00.000Z",
        note: "Planned leave",
      },
    });
    expect(createLeave.statusCode).toBe(201);
    const leaveRequest = createLeave.json<{ id: string }>();

    const crossTenantList = await app.inject({
      method: "GET",
      url: "/api/v1/leave-requests",
      headers: {
        "x-tenant-id": data.tenantB.id,
        "x-user-id": data.adminB.id,
      },
    });
    expect(crossTenantList.statusCode).toBe(200);
    expect(crossTenantList.json<{ items: Array<{ id: string }> }>().items).toHaveLength(0);

    const crossTenantDecision = await app.inject({
      method: "POST",
      url: `/api/v1/leave-requests/${leaveRequest.id}/decision`,
      headers: {
        "x-tenant-id": data.tenantB.id,
        "x-user-id": data.adminB.id,
      },
      payload: {
        action: "approved",
        reason: "Not in same tenant",
      },
    });
    expect(crossTenantDecision.statusCode).toBe(404);
  });

  test("keeps employee visibility scoped to own records", async () => {
    const { app, data } = await bootstrap();

    const createDept = await app.inject({
      method: "POST",
      url: "/api/v1/departments",
      headers: {
        "x-tenant-id": data.tenantA.id,
        "x-user-id": data.adminA.id,
      },
      payload: { name: "People" },
    });
    const department = createDept.json<{ id: string }>();

    const createEmployee = await app.inject({
      method: "POST",
      url: "/api/v1/employees",
      headers: {
        "x-tenant-id": data.tenantA.id,
        "x-user-id": data.adminA.id,
      },
      payload: {
        userId: data.employeeA.id,
        fullName: "Employee A",
        email: "employee-a@pf.dev",
        departmentId: department.id,
      },
    });
    expect(createEmployee.statusCode).toBe(201);

    const employeeList = await app.inject({
      method: "GET",
      url: "/api/v1/employees",
      headers: {
        "x-tenant-id": data.tenantA.id,
        "x-user-id": data.employeeA.id,
      },
    });

    expect(employeeList.statusCode).toBe(200);
    expect(employeeList.json<{ items: Array<{ userId: string }> }>().items).toHaveLength(1);
    expect(employeeList.json<{ items: Array<{ userId: string }> }>().items[0]?.userId).toBe(data.employeeA.id);
  });
});
