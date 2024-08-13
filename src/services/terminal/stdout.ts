import { chalk, ConsoleLevels } from "../chalk/chalk";

export function stdout(
  message: string,
  type?: ConsoleLevels,
  { dim, clearLine }: { dim?: "dim"; clearLine?: "clearLine" } = {},
) {
  const output = type ? chalk(message, type, dim === "dim") : message;

  if (clearLine) process.stdout.clearLine(0);

  process.stdout.write(output);
}
