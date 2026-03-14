import { buildApp } from "./http/app.js";
import { readRuntimeConfig } from "./infrastructure/config.js";

async function start(): Promise<void> {
  const config = readRuntimeConfig();
  const app = buildApp({ config });
  const port = config.port;
  await app.listen({ port, host: "0.0.0.0" });
}

void start();
