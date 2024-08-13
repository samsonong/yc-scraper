import { chalk, ConsoleLevels } from "../chalk/chalk";

export function consoleLog(message: string, type?: ConsoleLevels, dim?: "dim") {
  // * If `type` is not provided, don't chalk it
  const output = type ? chalk(message, type, dim === "dim") : message;

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
