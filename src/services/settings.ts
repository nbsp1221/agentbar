import {
  getSetting,
  readSettingValues,
  setSetting,
  type SettingKey,
  settingKeys,
  type SettingValues,
  unsetSetting
} from "../config/settings";

function parseNonNegativeInteger(value: string, label: string): number {
  const parsed = Number(value.trim());
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
  return parsed;
}

function parsePositiveInteger(value: string, label: string): number {
  const parsed = Number(value.trim());
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
  return parsed;
}

function parseSettingKey(value: string): SettingKey {
  if ((settingKeys as readonly string[]).includes(value)) {
    return value as SettingKey;
  }
  throw new Error(`Unknown setting key: ${value}`);
}

function parseSettingValue(key: SettingKey, value: string): number {
  if (key === "usage.concurrency") {
    return parsePositiveInteger(value, key);
  }

  return parseNonNegativeInteger(value, key);
}

export function listSettings(): SettingValues {
  return readSettingValues();
}

export function getSettingValue(keyRaw: string): number {
  const key = parseSettingKey(keyRaw);
  return getSetting(key);
}

export function setSettingValue(keyRaw: string, valueRaw: string): SettingValues {
  const key = parseSettingKey(keyRaw);
  const value = parseSettingValue(key, valueRaw);
  return setSetting(key, value);
}

export function unsetSettingValue(keyRaw: string): SettingValues {
  const key = parseSettingKey(keyRaw);
  return unsetSetting(key);
}
