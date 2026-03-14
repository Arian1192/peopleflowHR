import { Socket } from "node:net";
import type { RuntimeConfig, InfraTargetStatus } from "./config.js";

export type ReadinessReport = {
  ok: boolean;
  store: "memory";
  database: InfraTargetStatus;
  redis: InfraTargetStatus;
};

function parseTarget(connectionUrl: string): { host: string; port: number } | null {
  try {
    const url = new URL(connectionUrl);
    const fallbackPort = url.protocol === "redis:" ? 6379 : 5432;
    return {
      host: url.hostname,
      port: Number(url.port || fallbackPort),
    };
  } catch {
    return null;
  }
}

async function canConnect(connectionUrl: string | null): Promise<InfraTargetStatus> {
  if (!connectionUrl) {
    return "not_configured";
  }

  const target = parseTarget(connectionUrl);
  if (!target) {
    return "unreachable";
  }

  return await new Promise<InfraTargetStatus>((resolve) => {
    const socket = new Socket();

    const finish = (status: InfraTargetStatus) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(status);
    };

    socket.setTimeout(1500);
    socket.once("connect", () => finish("reachable"));
    socket.once("timeout", () => finish("unreachable"));
    socket.once("error", () => finish("unreachable"));
    socket.connect(target.port, target.host);
  });
}

export async function getReadinessReport(config: RuntimeConfig): Promise<ReadinessReport> {
  const [database, redis] = await Promise.all([
    canConnect(config.databaseUrl),
    canConnect(config.redisUrl),
  ]);

  return {
    ok: database !== "unreachable" && redis !== "unreachable",
    store: "memory",
    database,
    redis,
  };
}
