import { buildProgram } from "./cli/program";
import { reportError } from "./cli/error-reporting";

async function main(): Promise<void> {
  const program = buildProgram();
  await program.parseAsync(process.argv);
}

void (async () => {
  try {
    await main();
  } catch (err) {
    const exitCode = reportError(err);
    process.exitCode = exitCode;
  }
})();
