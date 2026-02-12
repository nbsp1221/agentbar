export function normalizeOneLine(value: string): string {
  // Keep output stable for table rendering:
  // - Replace newlines/tabs with spaces
  // - Collapse repeated whitespace
  return value.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
}

export function truncateWithEllipsis(value: string, maxChars: number): string {
  const max = Math.max(0, Math.floor(maxChars));
  if (max === 0) {
    return "";
  }
  if (value.length <= max) {
    return value;
  }
  if (max <= 3) {
    return value.slice(0, max);
  }
  return `${value.slice(0, max - 3)}...`;
}

export function formatNoteCell(note: string | undefined, maxChars: number): string {
  if (!note) {
    return "-";
  }
  const normalized = normalizeOneLine(note);
  if (!normalized) {
    return "-";
  }
  return truncateWithEllipsis(normalized, maxChars);
}

