import { loadJsonFile, saveJsonFile } from "../store/json-file";
import { resolveConfigPath } from "../store/paths";

export type UsageSettings = {
  timeoutMs: number;
  ttlMs: number;
  errorTtlMs: number;
  concurrency: number;
};

export type AppSettings = {
  usage: UsageSettings;
};

const SETTING_TO_USAGE_FIELD = {
  "usage.timeoutMs": "timeoutMs",
  "usage.ttlMs": "ttlMs",
  "usage.errorTtlMs": "errorTtlMs",
  "usage.concurrency": "concurrency"
} as const;

export type SettingKey = keyof typeof SETTING_TO_USAGE_FIELD;
export const settingKeys = Object.keys(SETTING_TO_USAGE_FIELD) as SettingKey[];
export type SettingValues = Record<SettingKey, number>;

const DEFAULT_SETTINGS: AppSettings = {
  usage: {
    timeoutMs: 10000,
    ttlMs: 60_000,
    errorTtlMs: 10_000,
    concurrency: 4
  }
};

function numberOrUndefined(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function normalizeNonNegativeInt(value: unknown, fallback: number): number {
  const n = numberOrUndefined(value);
  if (typeof n !== "number") {
    return fallback;
  }
  const int = Math.floor(n);
  return int >= 0 ? int : fallback;
}

function normalizePositiveInt(value: unknown, fallback: number): number {
  const n = numberOrUndefined(value);
  if (typeof n !== "number") {
    return fallback;
  }
  const int = Math.floor(n);
  return int > 0 ? int : fallback;
}

function normalizeUsageSettings(usage: Partial<UsageSettings> | undefined): UsageSettings {
  const source = usage ?? {};
  const defaults = DEFAULT_SETTINGS.usage;

  return {
    timeoutMs: normalizeNonNegativeInt(source.timeoutMs, defaults.timeoutMs),
    ttlMs: normalizeNonNegativeInt(source.ttlMs, defaults.ttlMs),
    errorTtlMs: normalizeNonNegativeInt(source.errorTtlMs, defaults.errorTtlMs),
    concurrency: normalizePositiveInt(source.concurrency, defaults.concurrency)
  };
}

function normalizeUsageFieldValue(field: keyof UsageSettings, value: unknown, fallback: number): number {
  if (field === "concurrency") {
    return normalizePositiveInt(value, fallback);
  }
  return normalizeNonNegativeInt(value, fallback);
}

function readConfigObject(): Record<string, unknown> {
  const raw = loadJsonFile(resolveConfigPath());
  if (!raw || typeof raw !== "object") {
    return {};
  }
  return { ...(raw as Record<string, unknown>) };
}

function readUsageObject(base: Record<string, unknown>): Record<string, unknown> {
  const usage = base.usage;
  if (!usage || typeof usage !== "object") {
    return {};
  }
  return { ...(usage as Record<string, unknown>) };
}

export function readSettings(): AppSettings {
  const base = readConfigObject();
  const usageRaw = base.usage;
  const usage = usageRaw && typeof usageRaw === "object" ? (usageRaw as Partial<UsageSettings>) : undefined;

  return {
    usage: normalizeUsageSettings(usage)
  };
}

export function writeSettings(settings: AppSettings): AppSettings {
  const configPath = resolveConfigPath();
  const base = readConfigObject();
  const normalized: AppSettings = {
    usage: normalizeUsageSettings(settings.usage)
  };

  saveJsonFile(configPath, {
    ...base,
    usage: normalized.usage
  });

  return normalized;
}

function toSettingValues(settings: AppSettings): SettingValues {
  return settingKeys.reduce<SettingValues>((acc, key) => {
    const usageField = SETTING_TO_USAGE_FIELD[key];
    acc[key] = settings.usage[usageField];
    return acc;
  }, {} as SettingValues);
}

export function readSettingValues(): SettingValues {
  return toSettingValues(readSettings());
}

export function getSetting(key: SettingKey): number {
  return readSettingValues()[key];
}

export function setSetting(key: SettingKey, value: number): SettingValues {
  const configPath = resolveConfigPath();
  const base = readConfigObject();
  const usage = readUsageObject(base);

  const usageField = SETTING_TO_USAGE_FIELD[key];
  const current = readSettings().usage[usageField];
  usage[usageField] = normalizeUsageFieldValue(usageField, value, current);

  saveJsonFile(configPath, {
    ...base,
    usage
  });

  return readSettingValues();
}

export function unsetSetting(key: SettingKey): SettingValues {
  const configPath = resolveConfigPath();
  const base = readConfigObject();
  const usage = readUsageObject(base);

  const usageField = SETTING_TO_USAGE_FIELD[key];
  delete usage[usageField];

  if (Object.keys(usage).length === 0) {
    delete base.usage;
  } else {
    base.usage = usage;
  }

  saveJsonFile(configPath, base);
  return readSettingValues();
}
