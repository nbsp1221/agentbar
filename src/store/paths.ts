import { homedir } from "node:os";
import path from "node:path";

export function resolveHomeDir(): string {
  const envHome = process.env.HOME || process.env.USERPROFILE;
  if (typeof envHome === "string" && envHome.trim().length > 0) {
    return envHome;
  }
  return homedir();
}

export function resolveStoreDir(): string {
  return path.join(resolveHomeDir(), ".agentbar");
}

export function resolveStorePath(): string {
  return path.join(resolveStoreDir(), "store.json");
}
