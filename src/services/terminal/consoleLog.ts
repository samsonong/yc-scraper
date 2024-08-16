import { chalk, ConsoleLevels } from "../chalk/chalk";

type Config = {
  dim?: boolean;
  silent?: boolean;
};

export function consoleLog(
  message: string,
  type?: ConsoleLevels,
  { dim, silent }: Config = {},
): void {
  if (silent) return;

  // * If `type` is not provided, don't chalk it
  const output = type ? chalk(message, type, dim) : message;

  switch (type) {
    case "debug":
      console.debug(output);
      return;
    case "warn":
      console.warn(output);
      return;
    case "error":
      console.error(output);
      return;
    case "info":
    case "success":
    default:
      console.info(output);
      return;
  }
}
