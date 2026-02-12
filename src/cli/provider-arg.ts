import type { Provider } from "../store/types";

export function parseProviderArg(value?: string): Provider | undefined {
  if (value === "codex" || value === "copilot") {
    return value;
  }
  return undefined;
}
