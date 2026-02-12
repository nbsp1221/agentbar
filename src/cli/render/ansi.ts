function useColor(): boolean {
  if (process.env.NO_COLOR) {
    return false;
  }

  const force = process.env.FORCE_COLOR;
  if (typeof force === "string" && force.trim() !== "" && force !== "0") {
    return true;
  }

  return Boolean(process.stdout.isTTY);
}

export function dim(text: string): string {
  if (!useColor()) {
    return text;
  }
  // ANSI: bright black (gray) + reset to default foreground.
  return `\x1b[90m${text}\x1b[39m`;
}

