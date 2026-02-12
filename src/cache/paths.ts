import path from "node:path";
import { resolveStoreDir } from "../store/paths";

export function resolveUsageCachePath(): string {
  return path.join(resolveStoreDir(), "usage-cache.json");
}

