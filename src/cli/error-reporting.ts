export type ReportedError = {
  message: string;
  exitCode: number;
  stack?: string;
};

export class CliError extends Error {
  readonly exitCode: number;

  constructor(message: string, options?: { exitCode?: number; cause?: unknown }) {
    super(message);
    this.name = "CliError";
    this.exitCode = options?.exitCode ?? 1;
    // Node/Bun supports the standard `cause` option, but keep it explicit for older runtimes.
    (this as any).cause = options?.cause;
  }
}

export function toReportedError(
  err: unknown,
  options?: {
    debugStack?: boolean;
  }
): ReportedError {
  const debugStack = options?.debugStack ?? process.env.AGENTBAR_DEBUG_STACK === "1";

  if (err instanceof CliError) {
    return {
      message: err.message,
      exitCode: err.exitCode,
      stack: debugStack ? err.stack : undefined
    };
  }

  if (err instanceof Error) {
    return {
      message: err.message || "Unknown error",
      exitCode: 1,
      stack: debugStack ? err.stack : undefined
    };
  }

  let msg: string | undefined;
  if (typeof err === "string") {
    msg = err;
  } else {
    try {
      msg = JSON.stringify(err);
    } catch {
      msg = String(err);
    }
  }
  return { message: msg ?? "Unknown error", exitCode: 1, stack: undefined };
}

export function reportError(err: unknown, options?: { debugStack?: boolean }): number {
  const reported = toReportedError(err, options);
  console.error(reported.message);
  if (reported.stack) {
    console.error(reported.stack);
  }
  return reported.exitCode;
}
