export function normalizePlanSelector(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : undefined;
}

export function normalizePersistedPlanType(value: unknown): string | undefined {
  const normalized = normalizePlanSelector(value);
  if (!normalized || normalized === "unknown") {
    return undefined;
  }
  return normalized;
}
