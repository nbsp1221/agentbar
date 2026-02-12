import type { AccountType } from "../store/types";

export function normalizeAccountType(value?: string): AccountType | undefined {
  if (!value) {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  if (normalized === "team") {
    return "business";
  }
  if (normalized === "personal" || normalized === "business") {
    return normalized;
  }
  throw new Error("Invalid --account value (allowed: personal, business, team)");
}
