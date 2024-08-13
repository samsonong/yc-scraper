import { chalk, ConsoleLevels } from "../chalk/chalk";

export function consoleLog(message: string, type?: ConsoleLevels, dim?: "dim") {
  // * If `type` is not provided, don't chalk it
  if (!type) console.info(message);

  switch (type) {
    case "debug":
      console.debug(chalk(message, type, dim === "dim"));
      return;
    case "info":
    case "success":
      console.info(chalk(message, type, dim === "dim"));
      return;
    case "warn":
      console.warn(chalk(message, type, dim === "dim"));
      return;
    case "error":
      console.error(chalk(message, type, dim === "dim"));
      return;
  }
}
