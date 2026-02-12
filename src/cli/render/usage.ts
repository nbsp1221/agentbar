import { formatDurationShort } from "../../utils/duration";
import type { CopilotUsageMetric, CopilotUsageRow, CodexUsageRow, UsageRow } from "../../services/usage/types";
import { renderAsciiTable } from "./ascii-table";
import { dim } from "./ansi";
import { formatNoteCell } from "./text";

export function formatEtaShort(resetAtMs?: number): string {
  if (!resetAtMs) {
    return "-";
  }
  const diffMs = Math.max(0, resetAtMs - Date.now());
  return formatDurationShort(diffMs);
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(100, Math.max(0, value));
}

function formatRemainingPercentFromUsed(usedPercent?: number): string {
  if (typeof usedPercent !== "number") {
    return "-";
  }
  const remaining = clampPercent(100 - usedPercent);
  return `${Math.round(remaining)}%`;
}

function formatRemainingWithEta(usedPercent?: number, resetAtMs?: number): string {
  const remaining = formatRemainingPercentFromUsed(usedPercent);
  if (remaining === "-") {
    return "-";
  }
  const eta = formatEtaShort(resetAtMs);
  if (eta === "-") {
    return remaining;
  }
  return `${remaining} ${dim(`(${eta})`)}`;
}

function formatUsedPercent(value?: number): string {
  if (typeof value !== "number") {
    return "-";
  }
  return `${Math.round(value)}%`;
}

function formatRemainingLimit(metric?: CopilotUsageMetric): string {
  if (!metric) {
    return "-";
  }
  if (metric.unlimited) {
    return "unlimited";
  }
  const remaining =
    typeof metric.remaining === "number" && Number.isFinite(metric.remaining)
      ? Math.round(metric.remaining)
      : undefined;
  const entitlement =
    typeof metric.entitlement === "number" && Number.isFinite(metric.entitlement)
      ? Math.round(metric.entitlement)
      : undefined;

  if (typeof remaining === "number" && typeof entitlement === "number") {
    return `${remaining}/${entitlement}`;
  }
  if (typeof remaining === "number") {
    return `${remaining}`;
  }
  if (typeof entitlement === "number") {
    return `?/${entitlement}`;
  }
  return "-";
}

function formatCodexSection(rows: CodexUsageRow[]): string {
  const header = ["email", "account", "plan", "5h left", "weekly left", "status", "note"];
  const body = rows.map((row) => [
    row.email,
    row.accountType ?? "-",
    row.planType,
    formatRemainingWithEta(row.primaryUsedPercent, row.primaryResetAtMs),
    formatRemainingWithEta(row.secondaryUsedPercent, row.secondaryResetAtMs),
    row.error ?? "ok",
    formatNoteCell(row.note, 24)
  ]);
  return ["Codex Usage", renderAsciiTable({ head: header, rows: body })].join("\n");
}

function pickMetric(row: CopilotUsageRow, label: CopilotUsageMetric["label"]): CopilotUsageMetric | undefined {
  return row.metrics.find((metric) => metric.label === label);
}

function formatCopilotSection(rows: CopilotUsageRow[]): string {
  // References (openclaw/CodexBar) treat Copilot's "premium" quota as the primary surface.
  // Other snapshots (chat/completions/reset) are not consistently present across plans.
  const header = ["email", "plan", "premium left", "premium rem/limit", "status", "note"];
  const body = rows.map((row) => {
    const premium = pickMetric(row, "premium");
    return [
      row.email,
      row.planType,
      formatRemainingPercentFromUsed(premium?.usedPercent),
      formatRemainingLimit(premium),
      row.error ?? "ok",
      formatNoteCell(row.note, 24)
    ];
  });
  return ["Copilot Usage", renderAsciiTable({ head: header, rows: body })].join("\n");
}

export function formatUsageSections(rows: UsageRow[]): string {
  const sections: string[] = [];
  const codexRows = rows.filter((row): row is CodexUsageRow => row.provider === "codex");
  const copilotRows = rows.filter((row): row is CopilotUsageRow => row.provider === "copilot");

  if (codexRows.length > 0) {
    sections.push(formatCodexSection(codexRows));
  }
  if (copilotRows.length > 0) {
    sections.push(formatCopilotSection(copilotRows));
  }

  return sections.join("\n\n");
}
