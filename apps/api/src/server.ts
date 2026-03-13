import { buildApp } from "./http/app.js";

async function start(): Promise<void> {
  const app = buildApp();
  const port = Number(process.env.PORT ?? 4000);
  await app.listen({ port, host: "0.0.0.0" });
}

void start();
