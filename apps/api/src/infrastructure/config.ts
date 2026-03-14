export type InfraTargetStatus = "not_configured" | "reachable" | "unreachable";

export type RuntimeConfig = {
  nodeEnv: string;
  port: number;
  databaseUrl: string | null;
  redisUrl: string | null;
};

export function readRuntimeConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  return {
    nodeEnv: env.NODE_ENV ?? "development",
    port: Number(env.PORT ?? 4000),
    databaseUrl: env.DATABASE_URL?.trim() || null,
    redisUrl: env.REDIS_URL?.trim() || null,
  };
}
