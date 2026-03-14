import type { Store } from "../domain/store.js";
import type { RuntimeConfig } from "../infrastructure/config.js";

export type AppServices = {
  store: Store;
  config: RuntimeConfig;
};
