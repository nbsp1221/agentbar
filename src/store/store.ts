import fs from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import lockfile from "proper-lockfile";
import { loadJsonFile, saveJsonFile } from "./json-file";
import { resolveStorePath } from "./paths";
import { type AuthProfile, makeEmptyStore, type StoreData } from "./types";

function coerceStore(value: unknown): StoreData {
  if (!value || typeof value !== "object") {
    return makeEmptyStore();
  }

  const raw = value as Partial<StoreData>;
  const profiles = Array.isArray(raw.profiles) ? raw.profiles : [];
  const active =
    raw.active && typeof raw.active === "object" ? raw.active : ({} as StoreData["active"]);

  return {
    version: typeof raw.version === "number" ? raw.version : 1,
    profiles: profiles as AuthProfile[],
    active
  };
}

export function ensureStoreFile(pathname: string): void {
  if (fs.existsSync(pathname)) {
    return;
  }
  saveJsonFile(pathname, makeEmptyStore());
}

export async function readStore(pathname = resolveStorePath()): Promise<StoreData> {
  ensureStoreFile(pathname);
  const raw = loadJsonFile(pathname);
  return coerceStore(raw);
}

export async function updateStoreWithLock(
  pathname: string,
  updater: (store: StoreData) => StoreData | void
): Promise<StoreData> {
  ensureStoreFile(pathname);

  const release = await lockfile.lock(pathname, {
    retries: {
      retries: 5,
      factor: 1.3,
      minTimeout: 20,
      maxTimeout: 300
    }
  });

  try {
    const current = await readStore(pathname);
    const next = updater(current) ?? current;
    saveJsonFile(pathname, next);
    return next;
  } finally {
    await release();
  }
}

export async function upsertProfile(pathname: string, profile: AuthProfile): Promise<StoreData> {
  return updateStoreWithLock(pathname, (store) => {
    const idx = store.profiles.findIndex((p) => p.id === profile.id);
    if (idx >= 0) {
      store.profiles[idx] = profile;
    } else {
      store.profiles.push(profile);
    }
    return store;
  });
}

export async function setActiveProfile(
  pathname: string,
  provider: AuthProfile["provider"],
  profileId: string
): Promise<StoreData> {
  return updateStoreWithLock(pathname, (store) => {
    store.active[provider] = profileId;
    return store;
  });
}

export async function makeTempStore(): Promise<{ dir: string; path: string }> {
  const dir = await mkdtemp(path.join(tmpdir(), "agentbar-store-"));
  const pathname = path.join(dir, "store.json");
  ensureStoreFile(pathname);
  return { dir, path: pathname };
}
